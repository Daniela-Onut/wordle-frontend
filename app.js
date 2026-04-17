const CONFIG = {
  backendUrl: "http://localhost:8888",
  apiPrefix: "",
};

const STORAGE_TOKEN_KEY = "wordle_frontend_access_token";
const STORAGE_USERNAME_KEY = "wordle_frontend_username";
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authHeading = document.getElementById("auth-heading");
const authForm = document.getElementById("auth-form");
const toggleAuthButton = document.getElementById("toggle-auth-button");
const authSubmitButton = document.getElementById("auth-submit-button");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const logoutButton = document.getElementById("logout-button");
const userPanel = document.getElementById("user-panel");
const usernameLabel = document.getElementById("username-label");
const profileUsername = document.getElementById("profile-username");
const profileTotalGames = document.getElementById("profile-total-games");
const profileWins = document.getElementById("profile-wins");
const profileLosses = document.getElementById("profile-losses");
const profileWinRate = document.getElementById("profile-win-rate");
const profileBestStreak = document.getElementById("profile-best-streak");
const dailyDate = document.getElementById("daily-date");
const dailyLength = document.getElementById("daily-length");
const dailyStatus = document.getElementById("daily-status");
const startGameForm = document.getElementById("start-game-form");
const wordLengthSelect = document.getElementById("word-length-select");
const gameModeSelect = document.getElementById("game-mode-select");
const currentGameCard = document.getElementById("current-game-card");
const currentGameTitle = document.getElementById("current-game-title");
const currentGameMeta = document.getElementById("current-game-meta");
const currentGameStatus = document.getElementById("current-game-status");
const guessBoard = document.getElementById("guess-board");
const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const guessSubmitButton = document.getElementById("guess-submit-button");
const abandonButton = document.getElementById("abandon-button");
const recentGamesList = document.getElementById("recent-games-list");
const leaderboardList = document.getElementById("leaderboard-list");
const toast = document.getElementById("toast");

let authMode = "login";
let authToken = localStorage.getItem(STORAGE_TOKEN_KEY) || null;
let currentGame = null;
let profile = null;

function apiUrl(path) {
  return `${CONFIG.backendUrl}${CONFIG.apiPrefix}${path}`;
}

function getHeaders(additional = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...additional,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: getHeaders(options.headers),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  if (!response.ok) {
    const detail = data && data.detail ? data.detail : response.statusText;
    throw new Error(detail || "Request failed");
  }

  return data;
}

function showToast(message, duration = 3200) {
  toast.textContent = message;
  toast.classList.add("visible");
  toast.classList.remove("hidden");
  window.clearTimeout(toast.hideTimer);
  toast.hideTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
    toast.classList.add("hidden");
  }, duration);
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";
  authHeading.textContent = isLogin ? "Login to Wordle" : "Register a new account";
  authSubmitButton.textContent = isLogin ? "Login" : "Register";
  toggleAuthButton.textContent = isLogin ? "Switch to Register" : "Switch to Login";
}

function updateLoggedInState() {
  const isLoggedIn = Boolean(authToken);
  authSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  userPanel.classList.toggle("hidden", !isLoggedIn);
  usernameLabel.textContent = profile?.username ? `Signed in as ${profile.username}` : "Signed in";
}

function renderProfileView() {
  profileUsername.textContent = profile?.username || profile?.email || "testuser";
  profileTotalGames.textContent = String(profile?.stats?.total_games ?? 0);
  profileWins.textContent = String(profile?.stats?.wins ?? 0);
  profileLosses.textContent = String(profile?.stats?.losses ?? 0);
  profileWinRate.textContent = `${profile?.stats?.win_rate?.toFixed(1) ?? 0}%`;
  profileBestStreak.textContent = String(profile?.stats?.best_streak ?? 0);
}

function renderDailyNote(daily) {
  dailyDate.textContent = daily.challenge_date;
  dailyLength.textContent = String(daily.word_length);
  dailyStatus.textContent = daily.available ? "Available" : "Not available";
}

function buildGuessRow(guess) {
  const row = document.createElement("div");
  row.className = "guess-row";

  guess.result.forEach((letter) => {
    const tile = document.createElement("span");
    tile.className = `tile ${letter.status}`;
    tile.textContent = letter.letter.toUpperCase();
    row.appendChild(tile);
  });

  return row;
}

function renderCurrentGame() {
  if (!currentGame) {
    currentGameCard.classList.add("hidden");
    return;
  }

  currentGameCard.classList.remove("hidden");
  currentGameTitle.textContent = `${currentGame.mode.toUpperCase()} game`;
  currentGameMeta.textContent = `${currentGame.attempts_used}/${currentGame.max_attempts} attempts used • ${currentGame.word_length}-letter word`;

  currentGameStatus.textContent = `Status: ${currentGame.status.toUpperCase()}`;
  currentGameStatus.style.color = currentGame.status === "won" ? "#a3e635" : currentGame.status === "lost" ? "#f87171" : "#f8fafc";

  guessBoard.innerHTML = "";
  if (currentGame.guesses?.length) {
    currentGame.guesses.forEach((guess) => {
      guessBoard.appendChild(buildGuessRow({ result: guess.result_json }));
    });
  } else {
    const placeholder = document.createElement("div");
    placeholder.textContent = "No guesses yet. Start by entering a guess below.";
    placeholder.style.color = "#94a3b8";
    guessBoard.appendChild(placeholder);
  }

  const canGuess = currentGame.status === "active";
  guessInput.disabled = !canGuess;
  guessSubmitButton.disabled = !canGuess;
  abandonButton.disabled = !canGuess;
  guessInput.placeholder = canGuess ? `Enter a ${currentGame.word_length}-letter guess` : "Game finished";
}

function renderGamesList(games) {
  recentGamesList.innerHTML = "";

  if (!Array.isArray(games) || games.length === 0) {
    recentGamesList.textContent = "No recent games.";
    return;
  }

  games.forEach((game) => {
    const entry = document.createElement("div");
    entry.innerHTML = `
      <div>
        <strong>${game.mode.toUpperCase()}</strong> • ${game.word_length} letters
        <div class="meta-text">${game.status.toUpperCase()} • ${game.attempts_used}/${game.max_attempts} attempts</div>
      </div>
      <div>${game.score} pts</div>
    `;
    recentGamesList.appendChild(entry);
  });
}

function renderLeaderboard(entries) {
  leaderboardList.innerHTML = "";
  if (!Array.isArray(entries) || entries.length === 0) {
    leaderboardList.textContent = "No leaderboard data available.";
    return;
  }

  entries.forEach((entry, index) => {
    const rank = entry.rank ?? index + 1;
    const name = entry.username || entry.user_id || entry.id || "Player";
    const score = entry.total_score ?? entry.score ?? 0;
    const metaParts = [];

    if (entry.total_games !== undefined) {
      metaParts.push(`${entry.total_games} games`);
    }
    if (entry.wins !== undefined) {
      metaParts.push(`${entry.wins} wins`);
    }
    if (entry.average_attempts_on_wins !== null && entry.average_attempts_on_wins !== undefined) {
      metaParts.push(`${entry.average_attempts_on_wins} avg attempts`);
    }
    if (entry.word_length !== undefined) {
      metaParts.push(`${entry.word_length} letters`);
    }

    const item = document.createElement("div");
    const detail = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("div");
    const points = document.createElement("div");

    title.textContent = `#${rank} ${name}`;
    meta.className = "meta-text";
    meta.textContent = metaParts.join(" - ");
    points.textContent = `${score} pts`;

    detail.appendChild(title);
    if (metaParts.length) {
      detail.appendChild(meta);
    }
    item.appendChild(detail);
    item.appendChild(points);
    leaderboardList.appendChild(item);
  });
}

async function loadProfile() {
  profile = await fetchJson("/me");
  renderProfileView();
}

async function loadDaily() {
  const daily = await fetchJson(`/daily/today?word_length=${wordLengthSelect.value}`);
  renderDailyNote(daily);
}

async function loadCurrentGame() {
  if (!currentGame?.id) {
    return;
  }

  currentGame = await fetchJson(`/games/${currentGame.id}`);
  renderCurrentGame();
}

async function loadRecentGames() {
  const response = await fetchJson("/games?limit=5");
  renderGamesList(response.items || []);
}

async function loadLeaderboard() {
  const response = await fetchJson("/leaderboards/global?limit=5");
  const entries = response.items || [];

  renderLeaderboard(entries);

  if (profile && entries.length) {
    const match = entries.find(
      (entry) =>
        entry.username === profile.username ||
        entry.user_id === profile.id ||
        entry.id === profile.id
    );

    if (match && match.username) {
      profile.username = match.username;
      profileUsername.textContent = match.username;
      usernameLabel.textContent = `Signed in as ${match.username}`;
    }
  }
}

async function refreshApp() {
  await Promise.all([loadProfile(), loadDaily(), loadRecentGames(), loadLeaderboard()]);
  renderCurrentGame();
}

async function handleAuth(event) {
  event.preventDefault();

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };

  if (!payload.email || !payload.password) {
    showToast("Email and password are required.");
    return;
  }

  const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";

  try {
    const response = await fetchJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    authToken = response.access_token;
    localStorage.setItem(STORAGE_TOKEN_KEY, authToken);
    showToast("Signed in successfully.");
    await refreshApp();
    updateLoggedInState();
  } catch (error) {
    showToast(error.message);
  }
}

function logout() {
  authToken = null;
  profile = null;
  currentGame = null;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  userPanel.classList.add("hidden");
  showToast("Logged out.");
}

async function handleStartGame(event) {
  event.preventDefault();

  const payload = {
    word_length: Number(wordLengthSelect.value),
    mode: gameModeSelect.value,
  };

  try {
    currentGame = await fetchJson("/games/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    renderCurrentGame();
    await loadRecentGames();
    showToast("Game started.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleSubmitGuess(event) {
  event.preventDefault();

  const guess = guessInput.value.trim().toLowerCase();
  if (!guess) {
    showToast("Enter a guess.");
    return;
  }

  if (!currentGame || !currentGame.id) {
    showToast("No active game.");
    return;
  }

  try {
    const gameId = currentGame.id;
    const response = await fetchJson(`/games/${gameId}/guess`, {
      method: "POST",
      body: JSON.stringify({ guess }),
    });

    currentGame = await fetchJson(`/games/${gameId}`);
    renderCurrentGame();
    await loadRecentGames();
    guessInput.value = "";
    showToast(response.is_correct ? "Correct! Game won." : "Guess submitted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleAbandon() {
  if (!currentGame || !currentGame.id) {
    return;
  }

  try {
    currentGame = await fetchJson(`/games/${currentGame.id}/abandon`, {
      method: "POST",
    });
    renderCurrentGame();
    await loadRecentGames();
    showToast("Game abandoned.");
  } catch (error) {
    showToast(error.message);
  }
}

async function initialize() {
  setAuthMode("login");
  toggleAuthButton.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
  authForm.addEventListener("submit", handleAuth);
  startGameForm.addEventListener("submit", handleStartGame);
  guessForm.addEventListener("submit", handleSubmitGuess);
  abandonButton.addEventListener("click", handleAbandon);
  logoutButton.addEventListener("click", logout);

  if (authToken) {
    try {
      await refreshApp();
      updateLoggedInState();
      showToast("Session restored.");
    } catch (error) {
      logout();
    }
  }
}

initialize().catch((error) => console.error(error));

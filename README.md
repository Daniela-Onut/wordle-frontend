# Wordle Frontend

This is a lightweight frontend for the Wordle backend API in `backend/`.

## What it does

- Login and register via backend `/auth/login` and `/auth/register`
- Show user profile and statistics
- Load the current daily challenge from `/daily/today`
- Start classic or daily games with `/games/start`
- Submit guesses with `/games/{game_id}/guess`
- Abandon active games with `/games/{game_id}/abandon`
- Show recent games and the global leaderboard

## Running locally

1. Open `frontend/app.js` and update the `CONFIG.backendUrl` and `CONFIG.apiPrefix` values.
   - `backendUrl` should be your backend address, for example: `http://localhost:8000`
   - `apiPrefix` should be empty if your backend uses no prefix, or `/api/v1` if it does.

2. Start a local static server from the frontend folder:

```bash
cd /path/to/project/frontend
python3 -m http.server 5173
```

3. Open `http://localhost:5173` in your browser.

## Notes

- The frontend stores the access token in `localStorage`.
- If your backend uses Supabase Auth and the `auth` endpoints are enabled, this frontend will work with the existing API.
- If you change the backend API prefix, update `apiPrefix` in `frontend/app.js`.

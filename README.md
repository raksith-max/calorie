# Plate — photo + text calorie tracker

React + Tailwind frontend, Node/Express + SQLite backend, Claude vision for meal analysis.

## How the accuracy works
1. Claude identifies each food and estimates grams (your typed text overrides the photo for foods/amounts).
2. The backend replaces Claude's calorie guess with per-100 g database values × grams:
   Indian food table (`server/foods.js`) first, then USDA FoodData Central, and only then Claude's own estimate.
3. If the database and Claude disagree by >40%, the item's confidence is lowered and flagged.
4. You can edit any name or weight; weight changes recalculate instantly in the browser.
5. Low-confidence items ask one follow-up question; answer and tap "Recalculate with my answers".

## Setup (Node 20+)
```bash
# backend
cd server
cp .env.example .env      # add ANTHROPIC_API_KEY (and optionally USDA_API_KEY)
npm install
npm run dev               # http://localhost:3001

# frontend (second terminal)
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api to the backend)
```
Open http://localhost:5173 on your computer. To test on your phone, run `npm run dev -- --host` in `client`
and open the Network URL on the same Wi-Fi (camera capture works over HTTPS or localhost only for some browsers; the
"Choose photo" button always works).

## Single-server mode
```bash
cd client && npm run build
cd ../server && npm start   # serves the app and API on http://localhost:3001
```

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/analyze | multipart: `image` (optional), `text` (optional) → items |
| POST | /api/lookup | `{name, grams}` → database-backed item |
| GET/POST | /api/meals | list a day (`?day=YYYY-MM-DD`) / save a meal |
| DELETE | /api/meals/:id | delete a meal |
| GET | /api/stats?from&to | daily totals |
| GET/PUT | /api/settings | calorie and protein goals |

Note: the AI returns an object `{status, message, items:[{name, grams, calories, protein, carbs, fat, confidence, question}]}`
so it can also report blurry or non-food photos.

## Use it on your iPhone (hosted, with password)
1. Push this folder to a GitHub repo.
2. On https://render.com: New + > Blueprint > pick the repo (uses `render.yaml`).
   Set `ANTHROPIC_API_KEY` and `APP_PASSWORD` when asked. The 1 GB disk keeps your history (paid instance).
   Manual setup instead: Build `npm run build`, Start `npm start`, and the same env vars.
3. Open the `https://...onrender.com` URL in Safari on your iPhone and enter your password once.
4. Tap Share > Add to Home Screen. It now opens full-screen like an app, and the camera works over HTTPS.

`APP_PASSWORD` matters: without it anyone with the link could spend your Claude credits.

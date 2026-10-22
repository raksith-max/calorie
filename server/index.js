import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { analyzeMeal, HttpError } from './ai.js';
import { enrichItems, resolvePer100g, scale } from './nutrition.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Password gate: once the app is online, anyone with the URL could spend your Claude credits.
const APP_PASSWORD = process.env.APP_PASSWORD;
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
app.use('/api', (req, res, next) => {
  if (!APP_PASSWORD || same(req.get('x-app-password') || '', APP_PASSWORD)) return next();
  res.status(401).json({ error: 'Wrong or missing password.' });
});

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500 && !(err instanceof HttpError)) console.error(err);
  res.status(status).json({ error: status === 500 && !(err instanceof HttpError) ? 'Something went wrong on the server.' : err.message });
});

// 1. Analyze a photo and/or text description.
app.post('/api/analyze', upload.single('image'), wrap(async (req, res) => {
  const text = (req.body.text || '').trim().slice(0, 1000);
  const file = req.file;
  if (!file && !text) throw new HttpError(400, 'Add a photo or describe your meal.');
  if (file && !IMAGE_TYPES.includes(file.mimetype)) throw new HttpError(400, 'Use a JPEG, PNG, WebP or GIF image.');

  const result = await analyzeMeal({ image: file?.buffer, mediaType: file?.mimetype, text });
  if (result.status !== 'ok') return res.json(result);
  res.json({ ...result, items: await enrichItems(result.items) });
}));

// 2. Look up one item by name and weight (used when the user edits an item).
app.post('/api/lookup', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const grams = Number(req.body.grams);
  if (!name) throw new HttpError(400, 'Enter a food name.');
  if (!Number.isFinite(grams) || grams <= 0) throw new HttpError(400, 'Enter a weight in grams.');
  const hit = await resolvePer100g(name, null);
  if (!hit) throw new HttpError(404, `No nutrition data found for "${name}". Try a simpler name, e.g. "cooked rice".`);
  res.json({
    name, grams, ...scale(hit.per100g, grams), per100g: hit.per100g,
    confidence: 'high', question: null, note: null, source: hit.source, serving: hit.serving || null,
  });
}));

// 3. Meals
const mealRow = (r) => ({ ...r, items: JSON.parse(r.items) });

app.get('/api/meals', wrap(async (req, res) => {
  const day = String(req.query.day || '');
  if (!DAY_RE.test(day)) throw new HttpError(400, 'day must be YYYY-MM-DD');
  const rows = db.prepare('SELECT * FROM meals WHERE day = ? ORDER BY eaten_at').all(day);
  res.json(rows.map(mealRow));
}));

app.post('/api/meals', wrap(async (req, res) => {
  const { day, eaten_at, meal_type, note, thumbnail, items } = req.body;
  if (!DAY_RE.test(day || '')) throw new HttpError(400, 'day must be YYYY-MM-DD');
  if (!MEAL_TYPES.includes(meal_type)) throw new HttpError(400, 'Invalid meal type.');
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Add at least one food item.');
  if (thumbnail && (typeof thumbnail !== 'string' || thumbnail.length > 200_000)) throw new HttpError(400, 'Thumbnail too large.');
  const sum = (k) => items.reduce((s, i) => s + (Number(i[k]) || 0), 0);
  const info = db.prepare(`INSERT INTO meals (day, eaten_at, meal_type, note, thumbnail, items, calories, protein, carbs, fat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    day, eaten_at || new Date().toISOString(), meal_type, (note || '').slice(0, 1000), thumbnail || null,
    JSON.stringify(items), sum('calories'), sum('protein'), sum('carbs'), sum('fat'));
  res.status(201).json({ id: info.lastInsertRowid });
}));

app.delete('/api/meals/:id', wrap(async (req, res) => {
  db.prepare('DELETE FROM meals WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
}));

// 4. Daily totals for a date range (inclusive).
app.get('/api/stats', wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!DAY_RE.test(from || '') || !DAY_RE.test(to || '')) throw new HttpError(400, 'from and to must be YYYY-MM-DD');
  res.json(db.prepare(`SELECT day, SUM(calories) AS calories, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
    FROM meals WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`).all(from, to));
}));

// 5. Settings
const DEFAULTS = { calorieGoal: 2000, proteinGoal: 100 };
const readSettings = () => {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = Number(r.value);
  return out;
};
app.get('/api/settings', (req, res) => res.json(readSettings()));
app.put('/api/settings', wrap(async (req, res) => {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const key of Object.keys(DEFAULTS)) {
    if (req.body[key] === undefined) continue;
    const v = Number(req.body[key]);
    if (!Number.isFinite(v) || v <= 0 || v > 20000) throw new HttpError(400, `${key} must be a positive number.`);
    up.run(key, String(v));
  }
  res.json(readSettings());
}));

// Serve the built frontend in production (npm run build in /client).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

// multer and body-parser errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 8 MB).' : err.message });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong on the server.' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Calorie tracker API on http://localhost:${port}`);
  if (!APP_PASSWORD) console.warn('Warning: APP_PASSWORD is not set. Set it before putting the app online.');
  if (!process.env.ANTHROPIC_API_KEY) console.warn('Warning: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
});

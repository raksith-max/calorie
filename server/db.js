import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(process.env.DB_PATH || path.join(dir, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,            -- local date YYYY-MM-DD, sent by the client
    eaten_at TEXT NOT NULL,       -- ISO timestamp
    meal_type TEXT NOT NULL,
    note TEXT,
    thumbnail TEXT,               -- small JPEG data URL
    items TEXT NOT NULL,          -- JSON array of items
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export default db;

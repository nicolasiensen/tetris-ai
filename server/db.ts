import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(import.meta.dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'leaderboard.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    lines INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at REAL NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  )
`);

export const insertScore = db.prepare<{
  name: string;
  score: number;
  level: number;
  lines: number;
}>(`INSERT INTO scores (name, score, level, lines) VALUES (@name, @score, @level, @lines)`);

export const getTopScores = db.prepare<{ limit: number }>(
  `SELECT id, name, score, level, lines, created_at FROM scores ORDER BY score DESC LIMIT @limit`,
);

export const insertSession = db.prepare<{ token: string; created_at: number }>(
  `INSERT INTO sessions (token, created_at) VALUES (@token, @created_at)`,
);

export const getSession = db.prepare<{ token: string }>(
  `SELECT token, created_at, used FROM sessions WHERE token = @token`,
);

export const markSessionUsed = db.prepare<{ token: string }>(
  `UPDATE sessions SET used = 1 WHERE token = @token`,
);

export default db;

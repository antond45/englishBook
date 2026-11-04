import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// Встроенный в Node 24 SQLite: никаких нативных модулей ставить не нужно.
// Загружается через require, потому что Vite (в тестах) не знает модуль node:sqlite.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
export type Db = DatabaseSyncType;

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    -- В таблице хранится только хеш токена: утечка базы не даёт войти чужими сессиями
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    -- Лучший результат по каждому упражнению; уровни разделены колонкой level
    CREATE TABLE IF NOT EXISTS exercise_results (
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level        TEXT NOT NULL,
      key          TEXT NOT NULL,
      correct      INTEGER NOT NULL,
      total        INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, level, key)
    );

    CREATE TABLE IF NOT EXISTS workbook (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level   TEXT NOT NULL,
      key     TEXT NOT NULL,
      done_at TEXT NOT NULL,
      PRIMARY KEY (user_id, level, key)
    );

    -- Когда урок был пройден впервые (порог проверяет клиент по содержимому урока)
    CREATE TABLE IF NOT EXISTS lesson_completions (
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level        TEXT NOT NULL,
      key          TEXT NOT NULL,
      score        INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, level, key)
    );
  `);
  return db;
}

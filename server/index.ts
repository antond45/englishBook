import express from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { openDb } from './db.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 3001);
const dbFile = process.env.DB_FILE ?? join(root, 'data', 'app.db');
mkdirSync(dirname(dbFile), { recursive: true });

const app = createApp(openDb(dbFile), { secureCookies: process.env.SECURE_COOKIES === '1' });

// В продакшене сервер сам отдаёт собранный фронтенд из dist/
const dist = join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});

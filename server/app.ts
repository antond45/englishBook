import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createRateLimiter, hashPassword, hashToken, newSessionToken, verifyPassword } from './auth.ts';
import type { Db } from './db.ts';

export const SESSION_COOKIE = 'efa_session';
const SESSION_DAYS = 30;
const LEVEL_RE = /^[a-z0-9]{1,8}$/;
const KEY_RE = /^[\w./-]{1,120}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface User {
  id: number;
  email: string;
  name: string;
}

type AuthedRequest = Request & { user: User };

export interface AppOptions {
  secureCookies?: boolean; // true за HTTPS в продакшене
}

export function createApp(db: Db, options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  const loginLimiter = createRateLimiter(10, 15 * 60 * 1000);

  function startSession(res: Response, userId: number) {
    const token = newSessionToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
      hashToken(token),
      userId,
      expires.toISOString(),
    );
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookies ?? false,
      expires,
      path: '/',
    });
  }

  function currentUser(req: Request): User | null {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') return null;
    const row = db
      .prepare(
        `SELECT u.id, u.email, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(hashToken(token)) as (User & { expires_at: string }) | undefined;
    if (!row || row.expires_at < new Date().toISOString()) return null;
    return { id: row.id, email: row.email, name: row.name };
  }

  function requireUser(req: Request, res: Response, next: NextFunction) {
    const user = currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Нужно войти в аккаунт' });
      return;
    }
    (req as AuthedRequest).user = user;
    next();
  }

  function levelParam(req: Request, res: Response): string | null {
    const level = req.params.level;
    if (!LEVEL_RE.test(level)) {
      res.status(400).json({ error: 'Неверный уровень' });
      return null;
    }
    return level;
  }

  // ---------- Аккаунт ----------
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 60) : '';
    if (!EMAIL_RE.test(cleanEmail)) return void res.status(400).json({ error: 'Неверный email' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return void res.status(400).json({ error: 'Пароль должен быть не короче 8 символов' });
    }
    if (!cleanName) return void res.status(400).json({ error: 'Укажи имя' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
      return void res.status(409).json({ error: 'Такой email уже зарегистрирован' });
    }
    const hash = await hashPassword(password);
    const result = db
      .prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(cleanEmail, cleanName, hash, new Date().toISOString());
    const id = Number(result.lastInsertRowid);
    startSession(res, id);
    res.status(201).json({ user: { id, email: cleanEmail, name: cleanName } });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!loginLimiter(`${req.ip}|${cleanEmail}`)) {
      return void res.status(429).json({ error: 'Слишком много попыток. Попробуй через 15 минут.' });
    }
    const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(cleanEmail) as
      | (User & { password_hash: string })
      | undefined;
    if (!row || typeof password !== 'string' || !(await verifyPassword(password, row.password_hash))) {
      return void res.status(401).json({ error: 'Неверный email или пароль' });
    }
    startSession(res, row.id);
    res.json({ user: { id: row.id, email: row.email, name: row.name } });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: currentUser(req) });
  });

  // ---------- Прогресс (отдельно по уровням) ----------
  app.get('/api/progress/:level', requireUser, (req, res) => {
    const level = levelParam(req, res);
    if (!level) return;
    const userId = (req as AuthedRequest).user.id;
    const exercises: Record<string, { correct: number; total: number; completedAt: string }> = {};
    for (const r of db
      .prepare('SELECT key, correct, total, completed_at FROM exercise_results WHERE user_id = ? AND level = ?')
      .all(userId, level) as { key: string; correct: number; total: number; completed_at: string }[]) {
      exercises[r.key] = { correct: r.correct, total: r.total, completedAt: r.completed_at };
    }
    const workbook: Record<string, boolean> = {};
    for (const r of db.prepare('SELECT key FROM workbook WHERE user_id = ? AND level = ?').all(userId, level) as {
      key: string;
    }[]) {
      workbook[r.key] = true;
    }
    const lessons: Record<string, { score: number; completedAt: string }> = {};
    for (const r of db
      .prepare('SELECT key, score, completed_at FROM lesson_completions WHERE user_id = ? AND level = ?')
      .all(userId, level) as { key: string; score: number; completed_at: string }[]) {
      lessons[r.key] = { score: r.score, completedAt: r.completed_at };
    }
    res.json({ exercises, workbook, lessons });
  });

  app.put('/api/progress/:level/exercise', requireUser, (req, res) => {
    const level = levelParam(req, res);
    if (!level) return;
    const { key, correct, total } = req.body ?? {};
    if (!KEY_RE.test(key) || !Number.isInteger(correct) || !Number.isInteger(total) || total < 1 || correct < 0 || correct > total) {
      return void res.status(400).json({ error: 'Неверные данные' });
    }
    // Сохраняем только лучший результат
    db.prepare(
      `INSERT INTO exercise_results (user_id, level, key, correct, total, completed_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, level, key) DO UPDATE SET correct = excluded.correct, total = excluded.total,
         completed_at = excluded.completed_at
       WHERE excluded.correct * 1.0 / excluded.total >= exercise_results.correct * 1.0 / exercise_results.total`,
    ).run((req as AuthedRequest).user.id, level, key, correct, total, new Date().toISOString());
    res.json({ ok: true });
  });

  app.put('/api/progress/:level/workbook', requireUser, (req, res) => {
    const level = levelParam(req, res);
    if (!level) return;
    const { key, done } = req.body ?? {};
    if (!KEY_RE.test(key) || typeof done !== 'boolean') return void res.status(400).json({ error: 'Неверные данные' });
    const userId = (req as AuthedRequest).user.id;
    if (done) {
      db.prepare('INSERT OR IGNORE INTO workbook (user_id, level, key, done_at) VALUES (?, ?, ?, ?)').run(
        userId,
        level,
        key,
        new Date().toISOString(),
      );
    } else {
      db.prepare('DELETE FROM workbook WHERE user_id = ? AND level = ? AND key = ?').run(userId, level, key);
    }
    res.json({ ok: true });
  });

  app.put('/api/progress/:level/lesson', requireUser, (req, res) => {
    const level = levelParam(req, res);
    if (!level) return;
    const { key, score } = req.body ?? {};
    if (!KEY_RE.test(key) || !Number.isInteger(score) || score < 0 || score > 100) {
      return void res.status(400).json({ error: 'Неверные данные' });
    }
    // Дата первого прохождения не перезаписывается
    db.prepare(
      'INSERT OR IGNORE INTO lesson_completions (user_id, level, key, score, completed_at) VALUES (?, ?, ?, ?, ?)',
    ).run((req as AuthedRequest).user.id, level, key, score, new Date().toISOString());
    res.json({ ok: true });
  });

  app.delete('/api/progress/:level', requireUser, (req, res) => {
    const level = levelParam(req, res);
    if (!level) return;
    const userId = (req as AuthedRequest).user.id;
    for (const table of ['exercise_results', 'workbook', 'lesson_completions']) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND level = ?`).run(userId, level);
    }
    res.json({ ok: true });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

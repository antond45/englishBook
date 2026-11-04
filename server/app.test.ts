import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { openDb } from './db.ts';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp(openDb(':memory:')).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => void server.close());

// Мини-клиент с сохранением cookie, как у браузера
function client() {
  let cookie = '';
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { status: res.status, body: (await res.json()) as any };
  };
}

describe('auth', () => {
  it('registers, remembers the session and logs out', async () => {
    const c = client();
    const reg = await c('POST', '/api/auth/register', { email: 'Ann@Mail.com ', password: 'secret123', name: 'Аня' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('ann@mail.com');
    expect((await c('GET', '/api/auth/me')).body.user.name).toBe('Аня');
    await c('POST', '/api/auth/logout');
    expect((await c('GET', '/api/auth/me')).body.user).toBeNull();
  });

  it('rejects a duplicate email, a short password and a wrong password', async () => {
    const c = client();
    await c('POST', '/api/auth/register', { email: 'bob@mail.com', password: 'secret123', name: 'Bob' });
    expect((await c('POST', '/api/auth/register', { email: 'bob@mail.com', password: 'secret123', name: 'B' })).status).toBe(409);
    expect((await c('POST', '/api/auth/register', { email: 'x@mail.com', password: '123', name: 'X' })).status).toBe(400);
    expect((await client()('POST', '/api/auth/login', { email: 'bob@mail.com', password: 'wrong-pass' })).status).toBe(401);
    expect((await client()('POST', '/api/auth/login', { email: 'bob@mail.com', password: 'secret123' })).status).toBe(200);
  });

  it('does not give progress without login', async () => {
    expect((await client()('GET', '/api/progress/a1')).status).toBe(401);
  });
});

describe('progress', () => {
  it('keeps the best result, separate levels and the first completion date', async () => {
    const c = client();
    await c('POST', '/api/auth/register', { email: 'p@mail.com', password: 'secret123', name: 'P' });
    await c('PUT', '/api/progress/a1/exercise', { key: '1/1A/x', correct: 4, total: 5 });
    await c('PUT', '/api/progress/a1/exercise', { key: '1/1A/x', correct: 2, total: 5 });
    await c('PUT', '/api/progress/b1/exercise', { key: '1/1A/x', correct: 1, total: 5 });
    await c('PUT', '/api/progress/a1/workbook', { key: '1/1A', done: true });
    await c('PUT', '/api/progress/a1/lesson', { key: '1/1A', score: 85 });
    await c('PUT', '/api/progress/a1/lesson', { key: '1/1A', score: 100 });

    const a1 = (await c('GET', '/api/progress/a1')).body;
    expect(a1.exercises['1/1A/x'].correct).toBe(4);
    expect(a1.workbook['1/1A']).toBe(true);
    expect(a1.lessons['1/1A'].score).toBe(85);
    expect((await c('GET', '/api/progress/b1')).body.exercises['1/1A/x'].correct).toBe(1);

    await c('DELETE', '/api/progress/a1');
    expect((await c('GET', '/api/progress/a1')).body.exercises).toEqual({});
    expect((await c('GET', '/api/progress/b1')).body.exercises['1/1A/x'].correct).toBe(1);
  });

  it('does not show one user the progress of another', async () => {
    const a = client();
    const b = client();
    await a('POST', '/api/auth/register', { email: 'a2@mail.com', password: 'secret123', name: 'A' });
    await b('POST', '/api/auth/register', { email: 'b2@mail.com', password: 'secret123', name: 'B' });
    await a('PUT', '/api/progress/a1/exercise', { key: '2/2A/y', correct: 3, total: 3 });
    expect((await b('GET', '/api/progress/a1')).body.exercises).toEqual({});
  });

  it('rejects invalid data', async () => {
    const c = client();
    await c('POST', '/api/auth/register', { email: 'v@mail.com', password: 'secret123', name: 'V' });
    expect((await c('PUT', '/api/progress/a1/exercise', { key: 'k', correct: 6, total: 5 })).status).toBe(400);
    expect((await c('PUT', '/api/progress/A1;DROP/exercise', { key: 'k', correct: 1, total: 5 })).status).toBe(400);
  });
});

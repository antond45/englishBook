import { describe, expect, it, vi } from 'vitest';
import { createProgressStore, type ProgressBackend } from './store';

function fakeBackend(data: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const backend: ProgressBackend = {
    load: vi.fn(async (level: string) => ({ exercises: {}, workbook: {}, lessons: {}, ...(data[level] as object) })),
    saveExercise: vi.fn(async (level, key, c, t) => calls.push(`ex ${level} ${key} ${c}/${t}`)),
    setWorkbook: vi.fn(async (level, key, done) => calls.push(`wb ${level} ${key} ${done}`)),
    completeLesson: vi.fn(async (level, key, score) => calls.push(`lesson ${level} ${key} ${score}`)),
    reset: vi.fn(async (level) => calls.push(`reset ${level}`)),
  };
  return { backend, calls };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('progress store', () => {
  it('loads each level separately from the server', async () => {
    const { backend } = fakeBackend({ a1: { exercises: { k: { correct: 1, total: 2, completedAt: '' } } } });
    const store = createProgressStore(backend);
    expect(store.get('a1').loaded).toBe(false);
    await tick();
    expect(store.get('a1').loaded).toBe(true);
    expect(store.get('a1').exercises.k.correct).toBe(1);
    store.get('b1');
    await tick();
    expect(store.get('b1').exercises).toEqual({});
    expect(backend.load).toHaveBeenCalledTimes(2);
  });

  it('keeps the best result locally and sends every attempt', async () => {
    const { backend, calls } = fakeBackend();
    const store = createProgressStore(backend);
    store.get('a1');
    await tick();
    store.saveExercise('a1', 'k', 4, 5);
    store.saveExercise('a1', 'k', 2, 5);
    expect(store.get('a1').exercises.k.correct).toBe(4);
    expect(calls).toEqual(['ex a1 k 4/5', 'ex a1 k 2/5']);
  });

  it('records a lesson only once', async () => {
    const { backend, calls } = fakeBackend();
    const store = createProgressStore(backend);
    store.get('a1');
    await tick();
    store.completeLesson('a1', '1/1A', 90);
    store.completeLesson('a1', '1/1A', 100);
    expect(store.get('a1').lessons['1/1A'].score).toBe(90);
    expect(calls).toEqual(['lesson a1 1/1A 90']);
  });

  it('forgets everything on clear (logout)', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend);
    store.get('a1');
    await tick();
    store.setWorkbook('a1', '1/1A', true);
    store.clear();
    expect(store.get('a1').loaded).toBe(false);
    await tick();
    expect(store.get('a1').workbook).toEqual({});
  });

  it('returns a stable snapshot until something changes', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend);
    store.get('a1');
    await tick();
    const first = store.get('a1');
    expect(store.get('a1')).toBe(first);
    store.setWorkbook('a1', 'x', true);
    expect(store.get('a1')).not.toBe(first);
  });
});

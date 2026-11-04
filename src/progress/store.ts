import { useSyncExternalStore } from 'react';
import { api } from '../api';

// Прогресс хранится на сервере у каждого пользователя, отдельно по уровням.
// Здесь — кеш в памяти: изменения показываются сразу и параллельно отправляются на сервер.

export interface ExerciseResult {
  correct: number;
  total: number;
  completedAt: string;
}

export interface LessonCompletion {
  score: number; // процент
  completedAt: string;
}

export interface LevelProgress {
  loaded: boolean;
  exercises: Record<string, ExerciseResult>; // ключ: fileId/sectionId/exerciseId
  workbook: Record<string, boolean>; // ключ: fileId/sectionId
  lessons: Record<string, LessonCompletion>; // ключ: fileId/sectionId — когда урок пройден
}

export interface ProgressBackend {
  load(levelId: string): Promise<Omit<LevelProgress, 'loaded'>>;
  saveExercise(levelId: string, key: string, correct: number, total: number): Promise<unknown>;
  setWorkbook(levelId: string, key: string, done: boolean): Promise<unknown>;
  completeLesson(levelId: string, key: string, score: number): Promise<unknown>;
  reset(levelId: string): Promise<unknown>;
}

export const serverBackend: ProgressBackend = {
  load: (level) => api('GET', `/progress/${level}`),
  saveExercise: (level, key, correct, total) => api('PUT', `/progress/${level}/exercise`, { key, correct, total }),
  setWorkbook: (level, key, done) => api('PUT', `/progress/${level}/workbook`, { key, done }),
  completeLesson: (level, key, score) => api('PUT', `/progress/${level}/lesson`, { key, score }),
  reset: (level) => api('DELETE', `/progress/${level}`),
};

const EMPTY: LevelProgress = Object.freeze({ loaded: false, exercises: {}, workbook: {}, lessons: {} });

function ratio(r: { correct: number; total: number }) {
  return r.total === 0 ? 0 : r.correct / r.total;
}

export function createProgressStore(backend: ProgressBackend, onError: (e: unknown) => void = console.error) {
  const cache = new Map<string, LevelProgress>();
  const loading = new Set<string>();
  const listeners = new Set<() => void>();
  let generation = 0; // меняется при смене пользователя, чтобы не принять чужой ответ

  const emit = () => listeners.forEach((l) => l());

  function set(levelId: string, value: LevelProgress) {
    cache.set(levelId, value);
    emit();
  }

  function load(levelId: string) {
    if (loading.has(levelId)) return;
    loading.add(levelId);
    const gen = generation;
    backend
      .load(levelId)
      .then((data) => {
        if (gen !== generation) return;
        set(levelId, {
          loaded: true,
          exercises: data.exercises ?? {},
          workbook: data.workbook ?? {},
          lessons: data.lessons ?? {},
        });
      })
      .catch(onError)
      .finally(() => loading.delete(levelId));
  }

  function get(levelId: string): LevelProgress {
    const cached = cache.get(levelId);
    if (cached) return cached;
    load(levelId);
    return EMPTY;
  }

  return {
    get,
    saveExercise(levelId: string, key: string, correct: number, total: number) {
      const cur = get(levelId);
      const best = cur.exercises[key];
      // Сохраняем лучший результат (так же решает и сервер)
      if (!best || ratio({ correct, total }) >= ratio(best)) {
        set(levelId, {
          ...cur,
          exercises: { ...cur.exercises, [key]: { correct, total, completedAt: new Date().toISOString() } },
        });
      }
      backend.saveExercise(levelId, key, correct, total).catch(onError);
    },
    setWorkbook(levelId: string, key: string, done: boolean) {
      const cur = get(levelId);
      const workbook = { ...cur.workbook };
      if (done) workbook[key] = true;
      else delete workbook[key];
      set(levelId, { ...cur, workbook });
      backend.setWorkbook(levelId, key, done).catch(onError);
    },
    completeLesson(levelId: string, key: string, score: number) {
      const cur = get(levelId);
      if (cur.lessons[key]) return;
      set(levelId, { ...cur, lessons: { ...cur.lessons, [key]: { score, completedAt: new Date().toISOString() } } });
      backend.completeLesson(levelId, key, score).catch(onError);
    },
    reset(levelId: string) {
      set(levelId, { loaded: true, exercises: {}, workbook: {}, lessons: {} });
      backend.reset(levelId).catch(onError);
    },
    // Выход или смена пользователя: забываем всё, что было загружено
    clear() {
      generation++;
      cache.clear();
      loading.clear();
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

// Ошибки сохранения обрабатывает слой авторизации (например, сессия истекла → экран входа)
let errorHandler: (e: unknown) => void = console.error;
export function setProgressErrorHandler(handler: (e: unknown) => void) {
  errorHandler = handler;
}

export const progress = createProgressStore(serverBackend, (e) => errorHandler(e));

export function useLevelProgress(levelId: string): LevelProgress {
  return useSyncExternalStore(progress.subscribe, () => progress.get(levelId));
}

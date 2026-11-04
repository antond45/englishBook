import { useSyncExternalStore } from 'react';

// Настройки озвучки хранятся в браузере (на этом устройстве): громкость и скорость
// удобно подбирать под конкретное устройство.

export const BROWSER_VOICE = 'browser'; // голос браузера вместо заранее озвученных файлов
export const SPEEDS = [0.75, 0.9, 1, 1.25] as const;
export const REPEATS = [1, 2, 3] as const;

export interface Settings {
  voice: string; // id набора голосов из public/audio/manifest.json или BROWSER_VOICE
  speed: number; // скорость по умолчанию
  volume: number; // 0…1
  repeat: number; // сколько раз подряд проигрывать аудирование
}

const KEY = 'efa:settings';
export const DEFAULT_SETTINGS: Settings = { voice: 'uk', speed: 1, volume: 1, repeat: 1 };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    return {
      voice: typeof s.voice === 'string' && s.voice ? s.voice : DEFAULT_SETTINGS.voice,
      speed: (SPEEDS as readonly number[]).includes(s.speed) ? s.speed : DEFAULT_SETTINGS.speed,
      volume: Math.min(1, Math.max(0, Number(s.volume) || 0)),
      repeat: (REPEATS as readonly number[]).includes(s.repeat) ? s.repeat : DEFAULT_SETTINGS.repeat,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // хранилище недоступно — настройки действуют до перезагрузки страницы
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
  );
}

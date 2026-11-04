import { useEffect, useState } from 'react';
import { BROWSER_VOICE, getSettings, useSettings } from './settings';
import type { Line } from './speech';

// Заранее сгенерированная озвучка (Kokoro, tools/tts/generate.py) лежит в public/audio.
// В манифесте несколько наборов голосов; набор выбирается в настройках.
// Файл ищется по хешу текста; если файла нет — компоненты озвучивают текст голосом браузера.

// 32-битный FNV-1a по UTF-8 — должен совпадать с fnv1a() в tools/tts/generate.py
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function listeningKey(script: Line[]): string {
  return fnv1a('L|' + script.map((l) => `${l.speaker ?? ''}:${l.text}`).join('\n'));
}

export function phraseKey(text: string): string {
  return fnv1a('P|' + text);
}

interface VoiceSet {
  label: string;
  items: Record<string, string>;
}
interface Manifest {
  default: string;
  sets: Record<string, VoiceSet>;
}

const BASE = `${import.meta.env.BASE_URL}audio/`;
const EMPTY: Manifest = { default: '', sets: {} };
let manifest: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  manifest ??= fetch(`${BASE}manifest.json`)
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((m: Partial<Manifest> & { items?: Record<string, string> }) => {
      // Первая версия манифеста — один набор без названия
      if (m.items) return { default: 'uk', sets: { uk: { label: 'Британский', items: m.items } } };
      return { default: m.default ?? '', sets: m.sets ?? {} };
    })
    .catch(() => EMPTY);
  return manifest;
}

export async function audioUrl(key: string, voice = getSettings().voice): Promise<string | null> {
  if (voice === BROWSER_VOICE) return null;
  const m = await loadManifest();
  // Нет файла в выбранном наборе (например, его ещё не догенерировали) — берём основной набор
  const file = m.sets[voice]?.items[key] ?? m.sets[m.default]?.items[key];
  return file ? BASE + file : null;
}

// undefined — ещё ищем, null — файла нет (или выбран голос браузера), строка — адрес файла
export function useAudioUrl(key: string): string | null | undefined {
  const { voice } = useSettings();
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setUrl(undefined);
    void audioUrl(key, voice).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [key, voice]);
  return url;
}

// Наборы голосов для страницы настроек
export function useVoiceSets(): { id: string; label: string }[] | undefined {
  const [sets, setSets] = useState<{ id: string; label: string }[]>();
  useEffect(() => {
    void loadManifest().then((m) => setSets(Object.entries(m.sets).map(([id, s]) => ({ id, label: s.label }))));
  }, []);
  return sets;
}

// Одновременно звучит только один файл
let current: HTMLAudioElement | null = null;
export function playExclusive(audio: HTMLAudioElement) {
  if (current && current !== audio) current.pause();
  current = audio;
  void audio.play();
}

// Проиграть короткий файл с текущими громкостью и скоростью
export function playFile(url: string) {
  const { volume, speed } = getSettings();
  const audio = new Audio(url);
  audio.volume = volume;
  audio.playbackRate = speed;
  playExclusive(audio);
}

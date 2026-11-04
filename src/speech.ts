import { useEffect, useState } from 'react';

// Озвучка через встроенный в браузер синтез речи (Web Speech API).
// Курс британский, поэтому сначала ищем голоса en-GB, потом любые английские.

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function englishVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  voicesPromise ??= new Promise((resolve) => {
    const pick = () => {
      const all = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      const rank = (v: SpeechSynthesisVoice) => (v.lang === 'en-GB' ? 0 : v.lang === 'en-US' ? 1 : 2);
      return all.sort((a, b) => rank(a) - rank(b));
    };
    const now = pick();
    if (now.length) return resolve(now);
    // В Chrome список голосов приходит асинхронно
    const timer = setTimeout(() => resolve(pick()), 1500);
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(timer);
        resolve(pick());
      },
      { once: true },
    );
  });
  return voicesPromise;
}

// Есть ли в браузере английский голос: null — ещё проверяем
export function useEnglishVoice(enabled = true): boolean | null {
  const [has, setHas] = useState<boolean | null>(speechSupported() ? null : false);
  useEffect(() => {
    if (!enabled || !speechSupported()) return;
    let alive = true;
    void englishVoices().then((v) => alive && setHas(v.length > 0));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return has;
}

export interface Line {
  speaker?: string;
  text: string;
}

export function stopSpeaking() {
  if (speechSupported()) speechSynthesis.cancel();
}

// Читает реплики по очереди; у каждого говорящего свой голос (или своя высота голоса, если голос один)
export async function speak(lines: Line[], opts: { rate?: number; volume?: number; onEnd?: () => void } = {}): Promise<void> {
  if (!speechSupported()) return;
  stopSpeaking();
  const voices = await englishVoices();
  const speakers = [...new Set(lines.map((l) => l.speaker ?? ''))];
  const pitches = [1, 0.75, 1.25, 0.9];

  lines.forEach((line, i) => {
    const u = new SpeechSynthesisUtterance(line.text);
    const who = speakers.indexOf(line.speaker ?? '');
    u.lang = 'en-GB';
    if (voices.length) u.voice = voices[who % voices.length];
    u.pitch = voices.length > who ? 1 : pitches[who % pitches.length];
    u.rate = opts.rate ?? 0.95;
    u.volume = opts.volume ?? 1;
    if (i === lines.length - 1 && opts.onEnd) {
      u.onend = opts.onEnd;
      u.onerror = opts.onEnd;
    }
    speechSynthesis.speak(u);
  });
}

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fnv1a, listeningKey, phraseKey } from './audio';

describe('audio keys', () => {
  // Значения посчитаны tools/tts/generate.py — ключи в браузере и в Python должны совпадать
  it('matches the Python generator', () => {
    expect(phraseKey("I'm Anna.")).toBe('0bbf8378');
    expect(phraseKey('How are you? — Fine, thanks. And you?')).toBe('5cf974c1');
    expect(
      listeningKey([
        { speaker: 'Tom', text: "Hi! I'm Tom." },
        { speaker: 'Lisa', text: "Hello, Tom. I'm Lisa. Nice to meet you." },
        { speaker: 'Tom', text: 'Nice to meet you too. How are you?' },
        { speaker: 'Lisa', text: "I'm fine, thanks. And you?" },
        { speaker: 'Tom', text: "I'm OK. I'm in room fifteen at the hotel." },
        { speaker: 'Lisa', text: "Oh! I'm in room sixteen!" },
      ]),
    ).toBe('5a6c023d');
  });

  it('is a stable 8-digit hex', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('abc')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('points every manifest entry to an existing file', () => {
    const path = 'public/audio/manifest.json';
    if (!existsSync(path)) return; // озвучка ещё не сгенерирована
    const m = JSON.parse(readFileSync(path, 'utf8')) as { default: string; sets: Record<string, { items: Record<string, string> }> };
    expect(m.sets[m.default], 'default set').toBeDefined();
    for (const [name, set] of Object.entries(m.sets)) {
      for (const file of Object.values(set.items)) expect(existsSync(`public/audio/${file}`), `${name}: ${file}`).toBe(true);
    }
  });
});

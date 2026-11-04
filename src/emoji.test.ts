import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getLevel, levelIds } from './content/loader';
import { emojiCode } from './emoji-code.mjs';

// Все картинки из контента должны быть скопированы в public/emoji (npm run emoji)
describe('emoji', () => {
  it('has an OpenMoji icon for every emoji in the content', () => {
    const used = new Set<string>();
    for (const id of levelIds()) {
      const level = getLevel(id)!;
      for (const f of level.meta.files) f.cover?.forEach((e) => used.add(e));
      for (const content of level.files.values()) {
        const sections = [...Object.values(content.lessons), content.practicalEnglish, content.reviseCheck].filter(Boolean);
        for (const s of sections) {
          for (const ex of s!.exercises) {
            if (ex.image) used.add(ex.image);
            if (ex.type === 'picture') ex.items.forEach((i) => used.add(i.emoji));
          }
        }
      }
    }
    expect(used.size).toBeGreaterThan(0);
    const missing = [...used].filter((e) => !existsSync(`public/emoji/${emojiCode(e)}.svg`));
    expect(missing, 'запусти npm run emoji').toEqual([]);
  });
});

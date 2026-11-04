import { describe, expect, it } from 'vitest';
import { isAccepted, normalize, shuffle } from './check';

describe('normalize / isAccepted', () => {
  it('ignores case, extra spaces and final punctuation', () => {
    expect(normalize('  Is  it a Book ? ')).toBe('is it a book');
    expect(isAccepted('is it a book', ['Is it a book?'])).toBe(true);
  });

  it('treats curly apostrophes as straight ones', () => {
    expect(isAccepted('I’m not Spanish.', ["I'm not Spanish."])).toBe(true);
  });

  it('accepts any of several answers', () => {
    const answers = ["It isn't a pencil.", "It's not a pencil."];
    expect(isAccepted("it's not a pencil", answers)).toBe(true);
    expect(isAccepted('It not a pencil', answers)).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isAccepted('   ', [''])).toBe(false);
  });
});

describe('shuffle', () => {
  it('is stable for the same seed and keeps all items', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(shuffle(items, 'x')).toEqual(shuffle(items, 'x'));
    expect([...shuffle(items, 'x')].sort()).toEqual(items);
  });

  it('never returns the original order', () => {
    for (let i = 0; i < 50; i++) {
      expect(shuffle(['a', 'b'], `seed${i}`)).toEqual(['b', 'a']);
    }
  });
});

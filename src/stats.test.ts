import { describe, expect, it } from 'vitest';
import { exerciseKey, getSection } from './content/loader';
import type { LevelProgress } from './progress/store';
import { levelState, PASS_PERCENT } from './stats';

const empty = (): LevelProgress => ({ loaded: true, exercises: {}, workbook: {}, lessons: {} });

// Отмечает все упражнения раздела с заданной долей верных ответов
function doSection(p: LevelProgress, fileId: string, sectionId: string, share: number) {
  for (const ex of getSection('a1', fileId, sectionId).exercises) {
    p.exercises[exerciseKey(fileId, sectionId, ex.id)] = { correct: Math.round(share * 10), total: 10, completedAt: '' };
  }
}

describe('lesson order', () => {
  it('opens only the first lesson at the start', () => {
    const s = levelState('a1', empty());
    expect(s.sections[0].unlocked).toBe(true);
    expect(s.sections[1].unlocked).toBe(false);
    expect(s.next?.sectionId).toBe('1A');
  });

  it(`passes a lesson at ${PASS_PERCENT}% and opens the next one`, () => {
    const p = empty();
    doSection(p, '1', '1A', 0.8);
    const s = levelState('a1', p);
    expect(s.sections[0].passed).toBe(true);
    expect(s.sections[1].unlocked).toBe(true);
    expect(s.next?.sectionId).toBe('1B');
  });

  it('does not pass a lesson below the threshold or with exercises left', () => {
    const low = empty();
    doSection(low, '1', '1A', 0.7);
    expect(levelState('a1', low).sections[0].passed).toBe(false);

    const partial = empty();
    doSection(partial, '1', '1A', 1);
    const first = getSection('a1', '1', '1A').exercises[0];
    delete partial.exercises[exerciseKey('1', '1A', first.id)];
    expect(levelState('a1', partial).sections[0].passed).toBe(false);
  });

  it('keeps a recorded lesson passed', () => {
    const p = empty();
    p.lessons['1/1A'] = { score: 90, completedAt: '2026-10-21T10:00:00Z' };
    expect(levelState('a1', p).sections[1].unlocked).toBe(true);
  });
});

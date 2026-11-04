import { describe, expect, it } from 'vitest';
import { exercisesOfLevel, getLevel, levelIds, loadAll } from './loader';

// npm run validate-content — проверяет весь JSON в content/ по схемам zod
describe('content', () => {
  it('loads and validates every level', () => {
    expect(() => loadAll()).not.toThrow();
  });

  it('has the four levels, each with its own structure', () => {
    expect(levelIds()).toEqual(['a1', 'a2', 'b1', 'b2']);
    for (const id of levelIds()) {
      expect(getLevel(id)?.meta.id).toBe(id);
    }
  });

  it('keeps exercises separate per level', () => {
    for (const id of levelIds()) {
      expect(exercisesOfLevel(id).length).toBeGreaterThan(0);
    }
  });

  // Все уровни заполнены полностью: в каждом уроке теория, минимум 4 упражнения, чтение и аудирование;
  // Practical English и Revise & Check не пустые — иначе на них остановилось бы прохождение по порядку
  for (const id of ['a1', 'a2', 'b1', 'b2']) {
    it(`fills every section of ${id.toUpperCase()}`, () => {
      const level = getLevel(id)!;
      for (const file of level.meta.files) {
        const content = level.files.get(file.id);
        expect(content, `${id} File ${file.id}`).toBeDefined();
        for (const lesson of file.lessons) {
          const section = content!.lessons[lesson.id];
          const where = `${id} ${lesson.id}`;
          expect(section?.theory.length ?? 0, `${where}: theory`).toBeGreaterThan(0);
          expect(section?.exercises.length ?? 0, `${where}: exercises`).toBeGreaterThanOrEqual(4);
          const types = new Set(section!.exercises.map((e) => e.type));
          expect(types.has('reading'), `${where}: reading`).toBe(true);
          expect(types.has('listening'), `${where}: listening`).toBe(true);
        }
        if (file.practicalEnglish) {
          expect(content!.practicalEnglish?.exercises.length ?? 0, `${id} File ${file.id}: Practical English`).toBeGreaterThan(0);
        }
        expect(content!.reviseCheck?.exercises.length ?? 0, `${id} File ${file.id}: Revise & Check`).toBeGreaterThan(0);
      }
    });
  }
});

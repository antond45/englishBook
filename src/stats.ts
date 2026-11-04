import { exerciseKey, getLevel, getSection, sectionsOfFile, type SectionRef } from './content/loader';
import type { LessonCompletion, LevelProgress } from './progress/store';

// Урок считается пройденным, когда сделаны все упражнения и общий результат не ниже порога
export const PASS_PERCENT = 80;

export function sectionKey(fileId: string, sectionId: string): string {
  return `${fileId}/${sectionId}`;
}

export interface SectionState extends SectionRef {
  index: number; // порядковый номер внутри уровня
  isLesson: boolean; // урок A/B/C (у него есть Workbook), а не Practical English / Revise & Check
  total: number; // упражнений в разделе
  attempted: number; // сколько из них уже сделано
  score: number; // процент по лучшим результатам сделанных упражнений
  passed: boolean;
  completion?: LessonCompletion; // когда раздел был пройден впервые
  unlocked: boolean;
  workbookDone: boolean;
}

export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function sectionState(levelId: string, ref: SectionRef, p: LevelProgress, index: number, isLesson: boolean): Omit<SectionState, 'unlocked'> {
  const exercises = getSection(levelId, ref.fileId, ref.sectionId).exercises;
  let attempted = 0;
  let correct = 0;
  let total = 0;
  for (const ex of exercises) {
    const r = p.exercises[exerciseKey(ref.fileId, ref.sectionId, ex.id)];
    if (!r) continue;
    attempted++;
    correct += r.correct;
    total += r.total;
  }
  const key = sectionKey(ref.fileId, ref.sectionId);
  const score = percent(correct, total);
  const completion = p.lessons[key];
  const passed = !!completion || (exercises.length > 0 && attempted === exercises.length && score >= PASS_PERCENT);
  return {
    ...ref,
    index,
    isLesson,
    total: exercises.length,
    attempted,
    score,
    passed,
    completion,
    workbookDone: !!p.workbook[key],
  };
}

export interface LevelState {
  sections: SectionState[];
  passedCount: number;
  next?: SectionState; // куда ведёт «Продолжить»: первый непройденный раздел
  exercisesDone: number;
  exercisesTotal: number;
  workbookDone: number;
  workbookTotal: number;
}

// Все разделы уровня по порядку. Следующий открывается, только когда пройден предыдущий.
export function levelState(levelId: string, p: LevelProgress): LevelState {
  const level = getLevel(levelId);
  const sections: SectionState[] = [];
  for (const file of level?.meta.files ?? []) {
    const lessonIds = new Set(file.lessons.map((l) => l.id));
    for (const ref of sectionsOfFile(levelId, file.id)) {
      const s = sectionState(levelId, ref, p, sections.length, lessonIds.has(ref.sectionId));
      const prev = sections.at(-1);
      sections.push({ ...s, unlocked: !prev || prev.passed });
    }
  }
  const lessons = sections.filter((s) => s.isLesson);
  return {
    sections,
    passedCount: sections.filter((s) => s.passed).length,
    next: sections.find((s) => !s.passed),
    exercisesDone: sections.reduce((n, s) => n + s.attempted, 0),
    exercisesTotal: sections.reduce((n, s) => n + s.total, 0),
    workbookDone: lessons.filter((s) => s.workbookDone).length,
    workbookTotal: lessons.length,
  };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

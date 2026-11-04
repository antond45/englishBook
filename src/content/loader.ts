import {
  FileContentSchema,
  LevelSchema,
  LevelsIndexSchema,
  type FileContent,
  type FileMeta,
  type LessonContent,
  type Level,
} from './schema';

// Весь контент лежит в папке content/ в корне проекта.
// Каждый уровень — отдельная папка со своим level.json и своими file-NN.json.
const levelsIndexRaw = import.meta.glob('../../content/levels.json', { eager: true, import: 'default' });
const levelRaw = import.meta.glob('../../content/*/level.json', { eager: true, import: 'default' });
const fileRaw = import.meta.glob('../../content/*/file-*.json', { eager: true, import: 'default' });

export const PRACTICAL_ENGLISH = 'pe';
export const REVISE_CHECK = 'rc';

function levelIdFromPath(path: string): string {
  return path.split('/').at(-2)!;
}

function fail(path: string, error: { issues: { path: (string | number)[]; message: string }[] }): never {
  const details = error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Ошибка в ${path.replace('../../', '')}:\n${details}`);
}

export interface LoadedLevel {
  meta: Level;
  files: Map<string, FileContent>;
}

export function loadAll(): { order: string[]; levels: Map<string, LoadedLevel> } {
  const indexEntry = Object.entries(levelsIndexRaw)[0];
  if (!indexEntry) throw new Error('Не найден content/levels.json');
  const index = LevelsIndexSchema.safeParse(indexEntry[1]);
  if (!index.success) fail(indexEntry[0], index.error);

  const levels = new Map<string, LoadedLevel>();
  for (const [path, raw] of Object.entries(levelRaw)) {
    const parsed = LevelSchema.safeParse(raw);
    if (!parsed.success) fail(path, parsed.error);
    if (parsed.data.id !== levelIdFromPath(path)) {
      throw new Error(`${path}: id "${parsed.data.id}" не совпадает с папкой`);
    }
    levels.set(parsed.data.id, { meta: parsed.data, files: new Map() });
  }

  for (const [path, raw] of Object.entries(fileRaw)) {
    const parsed = FileContentSchema.safeParse(raw);
    if (!parsed.success) fail(path, parsed.error);
    const level = levels.get(levelIdFromPath(path));
    if (!level) throw new Error(`${path}: нет level.json для этого уровня`);
    const meta = level.meta.files.find((f) => f.id === parsed.data.fileId);
    if (!meta) throw new Error(`${path}: юнита "${parsed.data.fileId}" нет в level.json`);
    for (const lessonId of Object.keys(parsed.data.lessons)) {
      if (!meta.lessons.some((l) => l.id === lessonId)) {
        throw new Error(`${path}: урока "${lessonId}" нет в юните ${meta.id} в level.json`);
      }
    }
    const ids = new Set<string>();
    for (const section of sectionsOf(parsed.data)) {
      for (const ex of section.exercises) {
        if (ids.has(ex.id)) throw new Error(`${path}: повторяется id упражнения "${ex.id}"`);
        ids.add(ex.id);
      }
    }
    level.files.set(parsed.data.fileId, parsed.data);
  }

  for (const id of index.data.levels) {
    if (!levels.has(id)) throw new Error(`content/levels.json: нет папки content/${id}/level.json`);
  }
  return { order: index.data.levels, levels };
}

function sectionsOf(content: FileContent): LessonContent[] {
  return [
    ...Object.values(content.lessons),
    ...(content.practicalEnglish ? [content.practicalEnglish] : []),
    ...(content.reviseCheck ? [content.reviseCheck] : []),
  ];
}

const data = loadAll();

export function levelIds(): string[] {
  return data.order;
}

export function getLevel(levelId: string): LoadedLevel | undefined {
  return data.levels.get(levelId);
}

export function getFileMeta(levelId: string, fileId: string): FileMeta | undefined {
  return getLevel(levelId)?.meta.files.find((f) => f.id === fileId);
}

const EMPTY: LessonContent = { theory: [], exercises: [], videos: [] };

// sectionId — id урока ("1A"), PRACTICAL_ENGLISH или REVISE_CHECK
export function getSection(levelId: string, fileId: string, sectionId: string): LessonContent {
  const content = getLevel(levelId)?.files.get(fileId);
  if (!content) return EMPTY;
  if (sectionId === PRACTICAL_ENGLISH) return content.practicalEnglish ?? EMPTY;
  if (sectionId === REVISE_CHECK) return content.reviseCheck ?? EMPTY;
  return content.lessons[sectionId] ?? EMPTY;
}

export interface SectionRef {
  fileId: string;
  sectionId: string;
  title: string;
}

// Все разделы юнита по порядку: уроки, Practical English, Revise & Check
export function sectionsOfFile(levelId: string, fileId: string): SectionRef[] {
  const meta = getFileMeta(levelId, fileId);
  if (!meta) return [];
  const result: SectionRef[] = meta.lessons.map((l) => ({ fileId, sectionId: l.id, title: `${l.id} · ${l.title}` }));
  if (meta.practicalEnglish) {
    result.push({ fileId, sectionId: PRACTICAL_ENGLISH, title: `Practical English · ${meta.practicalEnglish.title}` });
  }
  result.push({ fileId, sectionId: REVISE_CHECK, title: `Revise & Check ${fileId}` });
  return result;
}

export function exercisesOfLevel(levelId: string): { key: string }[] {
  const level = getLevel(levelId);
  if (!level) return [];
  return level.meta.files.flatMap((f) =>
    sectionsOfFile(levelId, f.id).flatMap((s) =>
      getSection(levelId, f.id, s.sectionId).exercises.map((e) => ({ key: exerciseKey(f.id, s.sectionId, e.id) })),
    ),
  );
}

export function exerciseKey(fileId: string, sectionId: string, exerciseId: string): string {
  return `${fileId}/${sectionId}/${exerciseId}`;
}

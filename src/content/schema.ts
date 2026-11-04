import { z } from 'zod';

// ---- Видео ----
// official-link — кнопка на официальный ресурс Oxford (нужен код из учебника)
// youtube       — встроенный ролик (нужен id) с публичного канала
// youtube-search — ссылка на поиск YouTube по теме, когда конкретный ролик не выбран
export const VideoRefSchema = z.object({
  title: z.string(),
  kind: z.enum(['official-link', 'youtube', 'youtube-search']),
  url: z.string().url(),
  note: z.string().optional(),
});

// ---- Упражнения ----
const base = {
  id: z.string(),
  instruction: z.string(),
  // Необязательный текст для чтения перед заданием (свой, не из учебника)
  text: z.string().optional(),
  // Иллюстрация к заданию — эмодзи, показывается иконкой OpenMoji
  image: z.string().optional(),
  source: z.literal('original').default('original'),
};

// Пустой ответ ввести нельзя (проверка его не засчитает), поэтому в списке верных ответов его быть не должно
const accepted = z.array(z.string().trim().min(1)).min(1);

export const GapFillSchema = z.object({
  ...base,
  type: z.literal('gap-fill'),
  // В строке ровно один пропуск: ___
  items: z
    .array(
      z.object({
        text: z.string().refine((s) => s.split('___').length === 2, 'нужен ровно один пропуск ___'),
        answers: accepted,
        hint: z.string().optional(),
      }),
    )
    .min(1),
});

export const MultipleChoiceSchema = z.object({
  ...base,
  type: z.literal('multiple-choice'),
  items: z
    .array(z.object({ question: z.string(), options: z.array(z.string()).min(2), answer: z.number().int().min(0) }))
    .min(1)
    .refine((items) => items.every((i) => i.answer < i.options.length), 'answer выходит за пределы options'),
});

export const TrueFalseSchema = z.object({
  ...base,
  type: z.literal('true-false'),
  items: z.array(z.object({ statement: z.string(), answer: z.boolean() })).min(1),
});

export const MatchingSchema = z.object({
  ...base,
  type: z.literal('matching'),
  // Правые части показываются в выпадающем списке, поэтому должны быть разными
  pairs: z
    .array(z.object({ left: z.string(), right: z.string() }))
    .min(2)
    .refine((pairs) => new Set(pairs.map((p) => p.right)).size === pairs.length, 'правые части пар повторяются'),
});

export const WordOrderSchema = z.object({
  ...base,
  type: z.literal('word-order'),
  // Слова берутся из answer и перемешиваются; alternatives — другие верные варианты порядка
  items: z.array(z.object({ answer: z.string(), alternatives: z.array(z.string()).optional() })).min(1),
});

export const TransformSchema = z.object({
  ...base,
  type: z.literal('transform'),
  items: z.array(z.object({ prompt: z.string(), answers: accepted })).min(1),
});

export const VideoTaskSchema = z.object({
  ...base,
  type: z.literal('video-task'),
  video: VideoRefSchema,
  // Полезные фразы по теме (свои, общеупотребительные)
  phrases: z.array(z.string()).optional(),
  // Задания для самопроверки: ученик отмечает выполненные
  tasks: z.array(z.string()).min(1),
});

// Вопросы к тексту или аудио: можно смешивать разные виды в одном задании
export const QuestionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), question: z.string(), options: z.array(z.string()).min(2), answer: z.number().int().min(0) }),
  z.object({ kind: z.literal('tf'), statement: z.string(), answer: z.boolean() }),
  z.object({
    kind: z.literal('gap'),
    text: z.string().refine((s) => s.split('___').length === 2, 'нужен ровно один пропуск ___'),
    answers: accepted,
  }),
]);
const questions = z
  .array(QuestionSchema)
  .min(1)
  .refine((qs) => qs.every((q) => q.kind !== 'choice' || q.answer < q.options.length), 'answer выходит за пределы options');

export const ReadingSchema = z.object({
  ...base,
  type: z.literal('reading'),
  title: z.string().optional(),
  text: z.string(),
  questions,
});

// Скрипт озвучивает браузер (Web Speech). Реплики разных speaker читаются разными голосами.
export const ListeningSchema = z.object({
  ...base,
  type: z.literal('listening'),
  title: z.string().optional(),
  script: z.array(z.object({ speaker: z.string().optional(), text: z.string() })).min(1),
  questions,
});

// Картинка → слово: choice — выбрать из вариантов (по умолчанию — ответы других пунктов), type — написать слово
export const PictureSchema = z.object({
  ...base,
  type: z.literal('picture'),
  mode: z.enum(['choice', 'type']).default('choice'),
  items: z
    .array(z.object({ emoji: z.string().min(1), answers: accepted, options: z.array(z.string()).min(2).optional() }))
    .min(2)
    .refine((items) => new Set(items.map((i) => i.answers[0])).size === items.length, 'ответы повторяются'),
});

export const ExerciseSchema = z.discriminatedUnion('type', [
  PictureSchema,
  GapFillSchema,
  MultipleChoiceSchema,
  TrueFalseSchema,
  MatchingSchema,
  WordOrderSchema,
  TransformSchema,
  VideoTaskSchema,
  ReadingSchema,
  ListeningSchema,
]);

// ---- Теория ----
// Строка — короткий абзац; объект — раздел правила с таблицей, примерами и подсказкой
export const TheoryBlockSchema = z.union([
  z.string(),
  z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    table: z.object({ head: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
    examples: z.array(z.object({ en: z.string(), ru: z.string().optional() })).optional(),
    tip: z.string().optional(),
  }),
]);

// ---- Структура уровня (content/<level>/level.json) ----
export const LessonMetaSchema = z.object({
  id: z.string(), // "1A"
  title: z.string(),
  grammar: z.array(z.string()),
  vocabulary: z.array(z.string()),
  pronunciation: z.array(z.string()).optional(),
  // Страницы Workbook, если пользователь их указал
  workbookPages: z.string().optional(),
});

export const FileMetaSchema = z.object({
  id: z.string(), // "1"
  title: z.string(),
  lessons: z.array(LessonMetaSchema).min(1),
  practicalEnglish: z.object({ title: z.string(), functions: z.array(z.string()) }).optional(),
  // Обложка юнита: 1–4 эмодзи
  cover: z.array(z.string()).min(1).max(4).optional(),
});

export const LevelSchema = z.object({
  id: z.string(), // "a1"
  cefr: z.string(), // "A1"
  name: z.string(), // "Beginner"
  book: z.string(),
  workbook: z.string(),
  links: z.array(VideoRefSchema),
  files: z.array(FileMetaSchema).min(1),
});

export const LevelsIndexSchema = z.object({ levels: z.array(z.string()).min(1) });

// ---- Наполнение юнита (content/<level>/file-NN.json) ----
export const LessonContentSchema = z.object({
  theory: z.array(TheoryBlockSchema).default([]), // объяснение правила на русском
  exercises: z.array(ExerciseSchema).default([]),
  videos: z.array(VideoRefSchema).default([]),
});

export const FileContentSchema = z.object({
  fileId: z.string(),
  lessons: z.record(z.string(), LessonContentSchema).default({}),
  practicalEnglish: LessonContentSchema.optional(),
  reviseCheck: LessonContentSchema.optional(),
});

export type VideoRef = z.infer<typeof VideoRefSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseOf<T extends Exercise['type']> = Extract<Exercise, { type: T }>;
export type Question = z.infer<typeof QuestionSchema>;
export type TheoryBlock = z.infer<typeof TheoryBlockSchema>;
export type LessonMeta = z.infer<typeof LessonMetaSchema>;
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type LessonContent = z.infer<typeof LessonContentSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;

import { Emoji } from '../components/Emoji';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { Exercise } from '../content/schema';
import type { ExerciseResult } from '../progress/store';
import { GapFill } from './GapFill';
import { Listening } from './Listening';
import { Matching } from './Matching';
import { MultipleChoice } from './MultipleChoice';
import { Picture } from './Picture';
import { Reading } from './Reading';
import { Transform } from './Transform';
import { TrueFalse } from './TrueFalse';
import { VideoTask } from './VideoTask';
import { WordOrder } from './WordOrder';

const TYPE_LABEL: Record<Exercise['type'], string> = {
  'gap-fill': 'Вставь слово',
  'multiple-choice': 'Выбери ответ',
  'true-false': 'True / False',
  matching: 'Сопоставь',
  'word-order': 'Порядок слов',
  transform: 'Перепиши',
  'video-task': 'Видео',
  reading: '📖 Чтение',
  listening: '🎧 Аудирование',
  picture: '🖼 Картинки',
};

function Body({ exercise, onComplete }: { exercise: Exercise; onComplete: (c: number, t: number) => void }) {
  switch (exercise.type) {
    case 'gap-fill':
      return <GapFill exercise={exercise} onComplete={onComplete} />;
    case 'multiple-choice':
      return <MultipleChoice exercise={exercise} onComplete={onComplete} />;
    case 'true-false':
      return <TrueFalse exercise={exercise} onComplete={onComplete} />;
    case 'matching':
      return <Matching exercise={exercise} onComplete={onComplete} />;
    case 'word-order':
      return <WordOrder exercise={exercise} onComplete={onComplete} />;
    case 'transform':
      return <Transform exercise={exercise} onComplete={onComplete} />;
    case 'video-task':
      return <VideoTask exercise={exercise} onComplete={onComplete} />;
    case 'reading':
      return <Reading exercise={exercise} onComplete={onComplete} />;
    case 'listening':
      return <Listening exercise={exercise} onComplete={onComplete} />;
    case 'picture':
      return <Picture exercise={exercise} onComplete={onComplete} />;
  }
}

export function ExerciseRunner(props: {
  number: number;
  exercise: Exercise;
  result?: ExerciseResult;
  onComplete: (correct: number, total: number) => void;
}) {
  const { number, exercise, result, onComplete } = props;
  return (
    <section className="exercise" id={`ex-${exercise.id}`}>
      <header>
        <span className="num">{number}</span>
        <span className="type">{TYPE_LABEL[exercise.type]}</span>
        {result && (
          <span className={result.correct === result.total ? 'badge done' : 'badge'}>
            лучший результат: {result.correct}/{result.total}
          </span>
        )}
      </header>
      <div className="instruction-row">
        <p className="instruction">{exercise.instruction}</p>
        {exercise.image && <Emoji char={exercise.image} size={64} className="illustration" />}
      </div>
      {exercise.text && exercise.type !== 'reading' && <div className="reading">{exercise.text}</div>}
      <ErrorBoundary>
        <Body exercise={exercise} onComplete={onComplete} />
      </ErrorBoundary>
    </section>
  );
}

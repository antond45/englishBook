import type { ExerciseOf } from '../content/schema';
import type { ExerciseProps } from './common';
import { Questions } from './Questions';

export function Reading({ exercise, onComplete }: ExerciseProps<ExerciseOf<'reading'>>) {
  return (
    <>
      <article className="reading-text">
        {exercise.title && <h3>{exercise.title}</h3>}
        {exercise.text.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </article>
      <Questions questions={exercise.questions} onComplete={onComplete} />
    </>
  );
}

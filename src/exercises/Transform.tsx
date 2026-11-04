import { useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { isAccepted } from './check';
import { Actions, Answer, Mark, type ExerciseProps, type Marks } from './common';

export function Transform({ exercise, onComplete }: ExerciseProps<ExerciseOf<'transform'>>) {
  const [values, setValues] = useState<string[]>(() => exercise.items.map(() => ''));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    const m = exercise.items.map((item, i) => isAccepted(values[i], item.answers));
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  return (
    <>
      <ol className="items">
        {exercise.items.map((item, i) => (
          <li key={i} className="transform">
            <div className="prompt">{item.prompt}</div>
            <div className="row">
              <input
                className={marks ? (marks[i] ? 'line ok' : 'line bad') : 'line'}
                value={values[i]}
                aria-label={`Ответ ${i + 1}`}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  const val = e.target.value;
                  setValues((prev) => prev.map((x, k) => (k === i ? val : x)));
                }}
                onKeyDown={(e) => e.key === 'Enter' && check()}
              />
              <Mark ok={marks?.[i]} />
            </div>
            <Answer show={revealed && !marks?.[i]}>{item.answers[0]}</Answer>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        onCheck={check}
        onReveal={() => setRevealed(true)}
        onReset={() => {
          setValues(exercise.items.map(() => ''));
          setMarks(null);
          setRevealed(false);
        }}
      />
    </>
  );
}

import { useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { Actions, Answer, Mark, type ExerciseProps, type Marks } from './common';

export function TrueFalse({ exercise, onComplete }: ExerciseProps<ExerciseOf<'true-false'>>) {
  const [chosen, setChosen] = useState<(boolean | null)[]>(() => exercise.items.map(() => null));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    const m = exercise.items.map((item, i) => chosen[i] === item.answer);
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  const pick = (i: number, v: boolean) => {
    setChosen((prev) => prev.map((x, k) => (k === i ? v : x)));
  };

  return (
    <>
      <ol className="items">
        {exercise.items.map((item, i) => (
          <li key={i} className="tf">
            <span>{item.statement}</span>
            <span className="options">
              <button className={chosen[i] === true ? 'option selected' : 'option'} onClick={() => pick(i, true)}>
                True
              </button>
              <button className={chosen[i] === false ? 'option selected' : 'option'} onClick={() => pick(i, false)}>
                False
              </button>
              <Mark ok={marks?.[i]} />
              <Answer show={revealed && !marks?.[i]}>{item.answer ? 'True' : 'False'}</Answer>
            </span>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        canCheck={chosen.some((c) => c !== null)}
        onCheck={check}
        onReveal={() => setRevealed(true)}
        onReset={() => {
          setChosen(exercise.items.map(() => null));
          setMarks(null);
          setRevealed(false);
        }}
      />
    </>
  );
}

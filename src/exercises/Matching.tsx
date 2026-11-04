import { useMemo, useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { shuffle } from './check';
import { Actions, Answer, Mark, type ExerciseProps, type Marks } from './common';

export function Matching({ exercise, onComplete }: ExerciseProps<ExerciseOf<'matching'>>) {
  const rights = useMemo(() => shuffle(exercise.pairs.map((p) => p.right), exercise.id), [exercise]);
  const [chosen, setChosen] = useState<string[]>(() => exercise.pairs.map(() => ''));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    const m = exercise.pairs.map((p, i) => chosen[i] === p.right);
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  return (
    <>
      <ol className="items matching">
        {exercise.pairs.map((pair, i) => (
          <li key={i}>
            <span className="left">{pair.left}</span>
            <select
              value={chosen[i]}
              aria-label={`Пара для «${pair.left}»`}
              onChange={(e) => {
                const val = e.target.value;
                setChosen((prev) => prev.map((x, k) => (k === i ? val : x)));
              }}
            >
              <option value="">—</option>
              {rights.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Mark ok={marks?.[i]} />
            <Answer show={revealed && !marks?.[i]}>{pair.right}</Answer>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        canCheck={chosen.some(Boolean)}
        onCheck={check}
        onReveal={() => setRevealed(true)}
        onReset={() => {
          setChosen(exercise.pairs.map(() => ''));
          setMarks(null);
          setRevealed(false);
        }}
      />
    </>
  );
}

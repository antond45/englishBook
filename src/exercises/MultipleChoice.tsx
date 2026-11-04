import { useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { Actions, Mark, type ExerciseProps, type Marks } from './common';

export function MultipleChoice({ exercise, onComplete }: ExerciseProps<ExerciseOf<'multiple-choice'>>) {
  const [chosen, setChosen] = useState<(number | null)[]>(() => exercise.items.map(() => null));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    const m = exercise.items.map((item, i) => chosen[i] === item.answer);
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  return (
    <>
      <ol className="items">
        {exercise.items.map((item, i) => (
          <li key={i}>
            <div>
              {/* Вопрос "1", "2"… — просто номер, его уже показывает список */}
              {/^\d+$/.test(item.question) ? null : item.question} <Mark ok={marks?.[i]} />
            </div>
            <div className="options" role="radiogroup">
              {item.options.map((opt, j) => {
                const cls = ['option'];
                if (chosen[i] === j) cls.push('selected');
                if (revealed && j === item.answer) cls.push('correct');
                return (
                  <button
                    key={j}
                    role="radio"
                    aria-checked={chosen[i] === j}
                    className={cls.join(' ')}
                    onClick={() => setChosen((prev) => prev.map((x, k) => (k === i ? j : x)))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
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

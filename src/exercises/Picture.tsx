import { useMemo, useState } from 'react';
import { Emoji } from '../components/Emoji';
import type { ExerciseOf } from '../content/schema';
import { isAccepted, shuffle } from './check';
import { Actions, Answer, Mark, type ExerciseProps, type Marks } from './common';

// Картинка → слово: выбрать подходящее слово или написать его
export function Picture({ exercise, onComplete }: ExerciseProps<ExerciseOf<'picture'>>) {
  const [values, setValues] = useState<string[]>(() => exercise.items.map(() => ''));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  // Варианты для режима выбора: свои у пункта или ответы всех пунктов, перемешанные
  const options = useMemo(
    () =>
      exercise.items.map((item, i) => {
        if (item.options) return shuffle(item.options, `${exercise.id}-${i}`);
        const all = exercise.items.map((it) => it.answers[0]);
        return shuffle(all, `${exercise.id}-${i}`);
      }),
    [exercise],
  );

  const setValue = (i: number, v: string) => setValues((prev) => prev.map((x, k) => (k === i ? v : x)));

  const check = () => {
    const m = exercise.items.map((item, i) => isAccepted(values[i], item.answers));
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  return (
    <>
      <ol className="picture-grid">
        {exercise.items.map((item, i) => (
          <li key={i} className={marks ? (marks[i] ? 'picture-card ok' : 'picture-card bad') : 'picture-card'}>
            <Emoji char={item.emoji} size={72} className="picture-img" />
            {exercise.mode === 'type' ? (
              <input
                className="line"
                value={values[i]}
                aria-label={`Слово для картинки ${i + 1}`}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setValue(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && check()}
              />
            ) : (
              <select value={values[i]} aria-label={`Слово для картинки ${i + 1}`} onChange={(e) => setValue(i, e.target.value)}>
                <option value="">—</option>
                {options[i].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            <div className="picture-result">
              <Mark ok={marks?.[i]} />
              <Answer show={revealed && !marks?.[i]}>{item.answers[0]}</Answer>
            </div>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        canCheck={values.some(Boolean)}
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

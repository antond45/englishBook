import { useMemo, useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { isAccepted, shuffle, tokens } from './check';
import { Actions, Answer, Mark, type ExerciseProps, type Marks } from './common';

// Слова нажимаются по порядку и собираются в строку; нажатие на собранное слово возвращает его обратно
function Row({ words, picked, onChange }: { words: { w: string }[]; picked: number[]; onChange: (p: number[]) => void }) {
  return (
    <div className="word-order">
      <div className="built" aria-label="Собранное предложение">
        {picked.length === 0 && <span className="placeholder">нажимай на слова по порядку</span>}
        {picked.map((idx, k) => (
          <button key={k} className="chip used" onClick={() => onChange(picked.filter((_, j) => j !== k))}>
            {words[idx].w}
          </button>
        ))}
      </div>
      <div className="pool">
        {words.map((word, idx) =>
          picked.includes(idx) ? null : (
            <button key={idx} className="chip" onClick={() => onChange([...picked, idx])}>
              {word.w}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function WordOrder({ exercise, onComplete }: ExerciseProps<ExerciseOf<'word-order'>>) {
  const [picked, setPicked] = useState<number[][]>(() => exercise.items.map(() => []));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);
  const shuffled = useMemo(
    () =>
      exercise.items.map((item, i) =>
        shuffle(
          tokens(item.answer).map((w, j) => ({ w, j })),
          `${exercise.id}-${i}`,
        ),
      ),
    [exercise],
  );

  const sentence = (i: number) => picked[i].map((idx) => shuffled[i][idx].w).join(' ');

  const check = () => {
    const m = exercise.items.map((item, i) => isAccepted(sentence(i), [item.answer, ...(item.alternatives ?? [])]));
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
  };

  return (
    <>
      <ol className="items">
        {exercise.items.map((item, i) => (
          <li key={i}>
            <Row
              words={shuffled[i]}
              picked={picked[i]}
              onChange={(p) => setPicked((prev) => prev.map((x, k) => (k === i ? p : x)))}
            />
            <Mark ok={marks?.[i]} />
            <Answer show={revealed && !marks?.[i]}>{item.answer}</Answer>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        canCheck={picked.some((p) => p.length > 0)}
        onCheck={check}
        onReveal={() => setRevealed(true)}
        onReset={() => {
          setPicked(exercise.items.map(() => []));
          setMarks(null);
          setRevealed(false);
        }}
      />
    </>
  );
}

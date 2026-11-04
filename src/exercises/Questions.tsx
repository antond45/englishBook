import { useState } from 'react';
import type { Question } from '../content/schema';
import { isAccepted } from './check';
import { Actions, Answer, Mark, type Marks } from './common';

type Value = number | boolean | string | null;

function correctText(q: Question): string {
  if (q.kind === 'choice') return q.options[q.answer];
  if (q.kind === 'tf') return q.answer ? 'True' : 'False';
  return q.answers[0];
}

function isRight(q: Question, v: Value): boolean {
  if (q.kind === 'gap') return typeof v === 'string' && isAccepted(v, q.answers);
  return v === q.answer;
}

// Вопросы к тексту или аудио: выбор ответа, True/False и пропуски вперемешку
export function Questions(props: { questions: Question[]; onComplete: (c: number, t: number) => void; onChecked?: () => void }) {
  const { questions, onComplete, onChecked } = props;
  const [values, setValues] = useState<Value[]>(() => questions.map(() => null));
  const [marks, setMarks] = useState<Marks>(null);
  const [revealed, setRevealed] = useState(false);

  const setValue = (i: number, v: Value) => {
    setValues((prev) => prev.map((x, k) => (k === i ? v : x)));
  };

  const check = () => {
    const m = questions.map((q, i) => isRight(q, values[i]));
    setMarks(m);
    onComplete(m.filter(Boolean).length, m.length);
    onChecked?.();
  };

  return (
    <>
      <ol className="items">
        {questions.map((q, i) => (
          <li key={i}>
            {q.kind === 'choice' && (
              <>
                <div>
                  {q.question} <Mark ok={marks?.[i]} />
                </div>
                <div className="options" role="radiogroup">
                  {q.options.map((opt, j) => (
                    <button
                      key={j}
                      role="radio"
                      aria-checked={values[i] === j}
                      className={['option', values[i] === j ? 'selected' : '', revealed && j === q.answer ? 'correct' : ''].join(' ')}
                      onClick={() => setValue(i, j)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
            {q.kind === 'tf' && (
              <div className="tf">
                <span>{q.statement}</span>
                <span className="options">
                  <button className={values[i] === true ? 'option selected' : 'option'} onClick={() => setValue(i, true)}>
                    True
                  </button>
                  <button className={values[i] === false ? 'option selected' : 'option'} onClick={() => setValue(i, false)}>
                    False
                  </button>
                  <Mark ok={marks?.[i]} />
                </span>
              </div>
            )}
            {q.kind === 'gap' && (
              <div>
                {q.text.split('___')[0]}
                <input
                  className={marks ? (marks[i] ? 'gap ok' : 'gap bad') : 'gap'}
                  value={(values[i] as string) ?? ''}
                  size={Math.max(6, q.answers[0].length + 2)}
                  aria-label={`Ответ ${i + 1}`}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setValue(i, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                />
                {q.text.split('___')[1]}
                <Mark ok={marks?.[i]} />
              </div>
            )}
            <Answer show={revealed && !marks?.[i] && q.kind !== 'choice'}>{correctText(q)}</Answer>
          </li>
        ))}
      </ol>
      <Actions
        marks={marks}
        revealed={revealed}
        onCheck={check}
        onReveal={() => setRevealed(true)}
        onReset={() => {
          setValues(questions.map(() => null));
          setMarks(null);
          setRevealed(false);
        }}
      />
    </>
  );
}

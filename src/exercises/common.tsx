import type { ReactNode } from 'react';

export interface ExerciseProps<E> {
  exercise: E;
  onComplete: (correct: number, total: number) => void;
}

// Состояние проверки: null — ещё не проверяли, массив — результат по каждому пункту
export type Marks = boolean[] | null;

export function Mark({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return null;
  return (
    <span className={ok ? 'mark ok' : 'mark bad'} aria-label={ok ? 'верно' : 'неверно'}>
      {ok ? '✓' : '✗'}
    </span>
  );
}

export function Actions(props: {
  marks: Marks;
  onCheck: () => void;
  onReveal: () => void;
  onReset: () => void;
  revealed: boolean;
  canCheck?: boolean;
}) {
  const { marks, onCheck, onReveal, onReset, revealed, canCheck = true } = props;
  const correct = marks?.filter(Boolean).length ?? 0;
  return (
    <div className="actions">
      <button className="btn primary" onClick={onCheck} disabled={!canCheck}>
        Проверить
      </button>
      {marks && !revealed && (
        <button className="btn" onClick={onReveal}>
          Показать ответы
        </button>
      )}
      {marks && (
        <button className="btn ghost" onClick={onReset}>
          Заново
        </button>
      )}
      {marks && (
        <span className={correct === marks.length ? 'score full' : 'score'}>
          {correct} из {marks.length}
        </span>
      )}
    </div>
  );
}

export function Answer({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <span className="answer">{children}</span>;
}

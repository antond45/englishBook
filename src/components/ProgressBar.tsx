import { percent } from '../stats';

export function ProgressBar({ done, total, label }: { done: number; total: number; label?: string }) {
  const p = percent(done, total);
  return (
    <div className="progress" title={`${done} из ${total}`}>
      <div className="bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="fill" style={{ width: `${p}%` }} />
      </div>
      <span className="pct">{total === 0 ? '—' : `${p}%`}</span>
    </div>
  );
}

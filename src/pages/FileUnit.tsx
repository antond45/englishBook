import { Link, useParams } from 'react-router-dom';
import { Emoji } from '../components/Emoji';
import { ProgressBar } from '../components/ProgressBar';
import { getFileMeta, getLevel } from '../content/loader';
import { useLevelProgress } from '../progress/store';
import { formatDate, levelState, PASS_PERCENT } from '../stats';
import { NotFound } from './NotFound';

export function FileUnit() {
  const { levelId = '', fileId = '' } = useParams();
  const level = getLevel(levelId);
  const meta = getFileMeta(levelId, fileId);
  const p = useLevelProgress(levelId);
  if (!level || !meta) return <NotFound />;
  const state = levelState(levelId, p);
  const sections = state.sections.filter((s) => s.fileId === fileId);

  return (
    <main className="page">
      {meta.cover && (
        <div className="unit-cover" aria-hidden>
          {meta.cover.map((e, i) => (
            <Emoji key={i} char={e} size={72} />
          ))}
        </div>
      )}
      <h1>
        File {meta.id} · {meta.title}
      </h1>
      <ul className="section-list">
        {sections.map((s) => {
          const lesson = meta.lessons.find((l) => l.id === s.sectionId);
          const current = state.next?.index === s.index;
          const inner = (
            <>
              <span className="section-status" aria-hidden>
                {s.passed ? '✓' : s.unlocked ? '▶' : '🔒'}
              </span>
              <span className="section-title">
                {s.title}
                {lesson && <span className="file-topics">{[...lesson.grammar, ...lesson.vocabulary].join(' · ')}</span>}
                {s.passed && s.completion && (
                  <span className="passed-date">
                    Пройден {formatDate(s.completion.completedAt)} · {s.completion.score}%
                  </span>
                )}
                {!s.unlocked && <span className="file-topics">Откроется после предыдущего урока</span>}
              </span>
              <span className="section-meta">
                {s.isLesson && (
                  <span className={s.workbookDone ? 'wb done' : 'wb'} title="Workbook">
                    WB {s.workbookDone ? '✓' : ''}
                  </span>
                )}
                {s.total > 0 ? (
                  <ProgressBar done={s.attempted} total={s.total} />
                ) : (
                  <span className="soon">скоро</span>
                )}
              </span>
            </>
          );
          const cls = ['section-row', s.passed ? 'passed' : '', current ? 'current' : '', s.unlocked ? '' : 'locked'].join(' ');
          return (
            <li key={s.sectionId}>
              {s.unlocked ? (
                <Link to={`/${levelId}/${fileId}/${s.sectionId}`} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="disclaimer">Урок засчитывается, когда сделаны все упражнения и общий результат не ниже {PASS_PERCENT}%.</p>
    </main>
  );
}

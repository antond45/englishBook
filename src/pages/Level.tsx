import { Link, useParams } from 'react-router-dom';
import { Emoji } from '../components/Emoji';
import { ProgressBar } from '../components/ProgressBar';
import { VideoCard } from '../components/VideoCard';
import { getLevel } from '../content/loader';
import { progress, useLevelProgress } from '../progress/store';
import { levelState } from '../stats';
import { NotFound } from './NotFound';

export function Level() {
  const { levelId = '' } = useParams();
  const level = getLevel(levelId);
  const p = useLevelProgress(levelId);
  if (!level) return <NotFound />;
  const meta = level.meta;
  const state = levelState(levelId, p);

  return (
    <main className="page">
      <h1>
        {meta.cefr} · {meta.name}
      </h1>
      <p className="lead">
        {meta.book}
        <br />
        {meta.workbook}
      </p>

      {state.next && p.loaded && (
        <Link to={`/${levelId}/${state.next.fileId}/${state.next.sectionId}`} className="continue-card">
          <span className="label">{state.passedCount === 0 ? 'Начни отсюда' : 'Продолжить'}</span>
          <span className="continue-title">
            File {state.next.fileId} · {state.next.title}
          </span>
          <span className="arrow">→</span>
        </Link>
      )}
      {!state.next && <div className="continue-card done">Все уроки уровня {meta.cefr} пройдены! 🎉</div>}

      <div className="summary">
        <div>
          Уроки: {state.passedCount} из {state.sections.length}
          <ProgressBar done={state.passedCount} total={state.sections.length} />
        </div>
        <div>
          Упражнения: {state.exercisesDone} из {state.exercisesTotal}
          <ProgressBar done={state.exercisesDone} total={state.exercisesTotal} />
        </div>
        <div>
          Workbook: {state.workbookDone} из {state.workbookTotal}
          <ProgressBar done={state.workbookDone} total={state.workbookTotal} />
        </div>
      </div>

      <h2>Юниты</h2>
      <ol className="file-list">
        {meta.files.map((f) => {
          const sections = state.sections.filter((s) => s.fileId === f.id);
          const passed = sections.filter((s) => s.passed).length;
          const locked = !sections[0]?.unlocked;
          const hasContent = sections.some((s) => s.total > 0);
          const inner = (
            <>
              <span className="file-num">{locked ? '🔒' : f.id}</span>
              {f.cover && <Emoji char={f.cover[0]} size={40} className="file-cover" />}
              <span className="file-title">
                {f.title}
                <span className="file-topics">{f.lessons.flatMap((l) => l.grammar).join(' · ')}</span>
              </span>
              <span className="file-progress">
                {hasContent ? <ProgressBar done={passed} total={sections.length} /> : <span className="soon">скоро</span>}
              </span>
            </>
          );
          return (
            <li key={f.id}>
              {locked ? (
                <div className="file-row locked" title="Откроется после прохождения предыдущего юнита">
                  {inner}
                </div>
              ) : (
                <Link to={`/${levelId}/${f.id}`} className="file-row">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <h2>Официальные материалы</h2>
      <div className="video-list">
        {meta.links.map((v) => (
          <VideoCard key={v.url} video={v} />
        ))}
      </div>

      <button
        className="btn ghost danger"
        onClick={() => {
          if (confirm(`Сбросить весь прогресс уровня ${meta.cefr}? Другие уровни не изменятся.`)) progress.reset(levelId);
        }}
      >
        Сбросить прогресс {meta.cefr}
      </button>
    </main>
  );
}

import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { Theory } from '../components/Theory';
import { VideoCard } from '../components/VideoCard';
import { exerciseKey, getFileMeta, getLevel, getSection, PRACTICAL_ENGLISH, REVISE_CHECK } from '../content/loader';
import { ExerciseRunner } from '../exercises/ExerciseRunner';
import { progress, useLevelProgress } from '../progress/store';
import { formatDate, levelState, PASS_PERCENT, sectionKey } from '../stats';
import { NotFound } from './NotFound';

export function Lesson() {
  const { levelId = '', fileId = '', sectionId = '' } = useParams();
  const level = getLevel(levelId);
  const fileMeta = getFileMeta(levelId, fileId);
  const p = useLevelProgress(levelId);
  const state = levelState(levelId, p);
  const section = state.sections.find((s) => s.fileId === fileId && s.sectionId === sectionId);
  const key = sectionKey(fileId, sectionId);

  // Как только порог набран впервые, сохраняем дату прохождения урока на сервере
  const justPassed = !!section && section.passed && !section.completion && p.loaded;
  useEffect(() => {
    if (justPassed) progress.completeLesson(levelId, key, section!.score);
  }, [justPassed, levelId, key, section]);

  if (!level || !fileMeta || !section) return <NotFound />;
  if (!p.loaded) return <main className="page">Загрузка…</main>;

  const prev = state.sections[section.index - 1];
  const next = state.sections[section.index + 1];

  if (!section.unlocked) {
    return (
      <main className="page">
        <h1>🔒 {section.title}</h1>
        <p className="lead">Этот урок откроется, когда ты пройдёшь предыдущий хотя бы на {PASS_PERCENT}%.</p>
        {state.next && (
          <Link className="btn primary" to={`/${levelId}/${state.next.fileId}/${state.next.sectionId}`}>
            Перейти к уроку {state.next.title}
          </Link>
        )}
      </main>
    );
  }

  const lesson = fileMeta.lessons.find((l) => l.id === sectionId);
  const content = getSection(levelId, fileId, sectionId);

  return (
    <main className="page lesson">
      <h1>{section.title}</h1>

      {lesson && (
        <div className="topics">
          {lesson.grammar.length > 0 && (
            <div>
              <span className="label">Grammar</span> {lesson.grammar.join(' · ')}
            </div>
          )}
          {lesson.vocabulary.length > 0 && (
            <div>
              <span className="label">Vocabulary</span> {lesson.vocabulary.join(' · ')}
            </div>
          )}
          {lesson.pronunciation && lesson.pronunciation.length > 0 && (
            <div>
              <span className="label">Pronunciation</span> {lesson.pronunciation.join(' · ')}
            </div>
          )}
        </div>
      )}
      {sectionId === PRACTICAL_ENGLISH && fileMeta.practicalEnglish && (
        <div className="topics">
          <span className="label">Функции</span> {fileMeta.practicalEnglish.functions.join(' · ')}
        </div>
      )}
      {sectionId === REVISE_CHECK && <p className="lead">Повторение всего юнита {fileId}: грамматика и лексика уроков.</p>}

      <Theory blocks={content.theory} />

      {content.videos.length > 0 && (
        <div className="video-list">
          {content.videos.map((v) => (
            <VideoCard key={v.url} video={v} />
          ))}
        </div>
      )}

      {content.exercises.length === 0 && <p className="empty">Упражнения для этого раздела ещё не добавлены.</p>}
      {content.exercises.map((ex, i) => {
        const exKey = exerciseKey(fileId, sectionId, ex.id);
        return (
          <ExerciseRunner
            key={`${levelId}/${exKey}`}
            number={i + 1}
            exercise={ex}
            result={p.exercises[exKey]}
            onComplete={(correct, total) => progress.saveExercise(levelId, exKey, correct, total)}
          />
        );
      })}

      {lesson && (
        <label className="workbook-check">
          <input type="checkbox" checked={section.workbookDone} onChange={(e) => progress.setWorkbook(levelId, key, e.target.checked)} />
          <span>
            Сделал(а) урок {lesson.id} в бумажной рабочей тетради (Workbook)
            {lesson.workbookPages ? `, стр. ${lesson.workbookPages}` : ''}
          </span>
        </label>
      )}

      {content.exercises.length > 0 && (
        <div className={section.passed ? 'lesson-result passed' : 'lesson-result'}>
          {section.passed ? (
            <>
              <div className="result-title">✓ Урок пройден</div>
              <div>
                {section.completion ? `${formatDate(section.completion.completedAt)} · результат ${section.completion.score}%` : `Результат ${section.score}%`}
              </div>
              {next && (
                <Link className="btn primary" to={`/${levelId}/${next.fileId}/${next.sectionId}`}>
                  Следующий урок: {next.title} →
                </Link>
              )}
              {!next && <div>Это был последний урок уровня. Отличная работа!</div>}
            </>
          ) : (
            <>
              <div className="result-title">
                Сделано упражнений: {section.attempted} из {section.total}
                {section.attempted > 0 && ` · результат ${section.score}%`}
              </div>
              <ProgressBar done={section.attempted} total={section.total} />
              <div className="hint">
                Чтобы открыть следующий урок, сделай все упражнения с общим результатом не ниже {PASS_PERCENT}%. Упражнение можно
                пройти заново — засчитывается лучший результат.
              </div>
            </>
          )}
        </div>
      )}

      <nav className="pager">
        {prev ? <Link to={`/${levelId}/${prev.fileId}/${prev.sectionId}`}>← {prev.title}</Link> : <span />}
        {next && (next.unlocked ? <Link to={`/${levelId}/${next.fileId}/${next.sectionId}`}>{next.title} →</Link> : <span className="soon">🔒 {next.title}</span>)}
      </nav>
    </main>
  );
}

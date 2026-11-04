import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { getLevel, levelIds } from '../content/loader';
import { useLevelProgress } from '../progress/store';
import { levelState } from '../stats';

function LevelCard({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!.meta;
  const state = levelState(levelId, useLevelProgress(levelId));
  return (
    <div className={`level-card lv-${levelId}`}>
      <Link to={`/${levelId}`} className="cefr">
        {level.cefr}
      </Link>
      <div className="level-info">
        <Link to={`/${levelId}`} className="level-name">
          {level.name}
        </Link>
        <div className="level-book">{level.book}</div>
        <div className="level-sub">
          Пройдено уроков: {state.passedCount} из {state.sections.length}
        </div>
        <ProgressBar done={state.passedCount} total={state.sections.length} label={`Прогресс ${level.cefr}`} />
        {state.next && (
          <Link to={`/${levelId}/${state.next.fileId}/${state.next.sectionId}`} className="btn primary small continue">
            {state.passedCount === 0 ? 'Начать' : 'Продолжить'}: {state.next.title}
          </Link>
        )}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <main className="page">
      <h1>Выбери уровень</h1>
      <p className="lead">
        Каждый уровень — отдельный курс со своими уроками и прогрессом. Можно начать с любого. Внутри уровня уроки
        открываются по порядку: следующий — после того, как предыдущий пройден хотя бы на 80%.
      </p>
      <div className="level-grid">
        {levelIds().map((id) => (
          <LevelCard key={id} levelId={id} />
        ))}
      </div>
      <p className="disclaimer">
        Приложение повторяет структуру курса Oxford English File 4th edition. Упражнения, тексты и аудио в нём свои; материалы
        учебников открываются только на официальных сайтах Oxford по коду из твоего учебника.
      </p>
    </main>
  );
}

import { useState } from 'react';
import type { ExerciseOf } from '../content/schema';
import { VideoCard } from '../components/VideoCard';
import type { ExerciseProps } from './common';

// Видео нельзя проверить автоматически: ученик смотрит ролик и отмечает выполненные задания
export function VideoTask({ exercise, onComplete }: ExerciseProps<ExerciseOf<'video-task'>>) {
  const [done, setDone] = useState<boolean[]>(() => exercise.tasks.map(() => false));
  const [saved, setSaved] = useState(false);

  return (
    <>
      <VideoCard video={exercise.video} />
      {exercise.phrases && exercise.phrases.length > 0 && (
        <div className="phrases">
          <div className="label">Полезные фразы</div>
          <ul>
            {exercise.phrases.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <ul className="checklist">
        {exercise.tasks.map((task, i) => (
          <li key={i}>
            <label>
              <input
                type="checkbox"
                checked={done[i]}
                onChange={(e) => {
                  const val = e.target.checked;
                  setDone((prev) => prev.map((x, k) => (k === i ? val : x)));
                  setSaved(false);
                }}
              />
              {task}
            </label>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button
          className="btn primary"
          disabled={!done.some(Boolean)}
          onClick={() => {
            onComplete(done.filter(Boolean).length, done.length);
            setSaved(true);
          }}
        >
          Сохранить
        </button>
        {saved && <span className="score">Сохранено</span>}
      </div>
    </>
  );
}

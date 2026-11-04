import { useEffect, useState } from 'react';
import { listeningKey, useAudioUrl } from '../audio';
import { AudioPlayer } from '../components/AudioPlayer';
import type { ExerciseOf } from '../content/schema';
import { useSettings } from '../settings';
import { speak, stopSpeaking, useEnglishVoice } from '../speech';
import type { ExerciseProps } from './common';
import { Questions } from './Questions';

// Голос браузера — запасной вариант, если для задания ещё нет озвученного файла
function SpeechPlayer({ script, onPlay }: { script: ExerciseOf<'listening'>['script']; onPlay: () => void }) {
  const { speed, volume, repeat } = useSettings();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const play = () => {
    setPlaying(true);
    onPlay();
    // Автоповтор: текст читается нужное число раз подряд
    const lines = Array.from({ length: repeat }, () => script).flat();
    void speak(lines, { rate: 0.95 * speed, volume, onEnd: () => setPlaying(false) });
  };
  return (
    <div className="player">
      {playing ? (
        <button
          className="btn primary"
          onClick={() => {
            stopSpeaking();
            setPlaying(false);
          }}
        >
          ■ Стоп
        </button>
      ) : (
        <button className="btn primary" onClick={play}>
          ▶ Слушать
        </button>
      )}
      <span className="plays">голос браузера · {speed}×</span>
    </div>
  );
}

// Аудирование: озвученный файл (Kokoro) или голос браузера; текст открывается только после проверки
export function Listening({ exercise, onComplete }: ExerciseProps<ExerciseOf<'listening'>>) {
  const url = useAudioUrl(listeningKey(exercise.script));
  const browserVoice = useEnglishVoice(url === null);
  const [plays, setPlays] = useState(0);
  const [checked, setChecked] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const noAudio = url === null && browserVoice === false;
  const countPlay = () => setPlays((n) => n + 1);

  return (
    <>
      {exercise.title && <h3 className="listening-title">{exercise.title}</h3>}
      {url && <AudioPlayer src={url} onPlay={countPlay} />}
      {url === null && browserVoice && <SpeechPlayer script={exercise.script} onPlay={countPlay} />}
      {noAudio && (
        <p className="empty">
          Для этого задания ещё нет озвучки, а в браузере нет английского голоса, поэтому вместо аудио показан текст.
        </p>
      )}
      {!noAudio && url !== undefined && (
        <p className="hint">{plays > 0 ? `Прослушано: ${plays}` : 'Послушай 1–2 раза, потом отвечай.'}</p>
      )}

      <Questions questions={exercise.questions} onComplete={onComplete} onChecked={() => setChecked(true)} />

      {!noAudio && (checked || showScript) && (
        <button className="btn ghost small" onClick={() => setShowScript((s) => !s)}>
          {showScript ? 'Скрыть текст' : 'Показать текст аудио'}
        </button>
      )}
      {(showScript || noAudio) && (
        <div className="script">
          {exercise.script.map((line, i) => (
            <p key={i}>
              {line.speaker && <b>{line.speaker}: </b>}
              {line.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

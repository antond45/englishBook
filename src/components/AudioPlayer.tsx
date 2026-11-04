import { useEffect, useRef, useState } from 'react';
import { playExclusive } from '../audio';
import { SPEEDS, useSettings } from '../settings';

function time(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const REPEAT_PAUSE_MS = 1500;

// Плеер для заранее озвученного файла: пауза, перемотка, скорость; громкость и автоповтор — из настроек
export function AudioPlayer({ src, onPlay }: { src: string; onPlay?: () => void }) {
  const settings = useSettings();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.speed);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const round = useRef(0); // какой по счёту повтор идёт сейчас
  const repeatTimer = useRef<number>();

  useEffect(() => setSpeed(settings.speed), [settings.speed]);
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    if (ref.current) ref.current.volume = settings.volume;
  }, [settings.volume]);
  useEffect(() => () => window.clearTimeout(repeatTimer.current), []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(repeatTimer.current);
    if (a.paused) {
      if (a.ended || a.currentTime === 0) {
        round.current = 1;
        onPlay?.();
      }
      playExclusive(a);
    } else a.pause();
  };

  return (
    <div className="player">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(e) => {
          setPlaying(false);
          const a = e.currentTarget;
          // Автоповтор: проигрываем ещё раз после короткой паузы
          if (round.current < settings.repeat) {
            round.current++;
            repeatTimer.current = window.setTimeout(() => {
              a.currentTime = 0;
              onPlay?.();
              playExclusive(a);
            }, REPEAT_PAUSE_MS);
          }
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDur(e.currentTarget.duration);
          e.currentTarget.playbackRate = speed;
          e.currentTarget.volume = settings.volume;
        }}
      />
      <button className="btn primary" onClick={toggle} aria-label={playing ? 'Пауза' : 'Слушать'}>
        {playing ? '❚❚ Пауза' : '▶ Слушать'}
      </button>
      <input
        className="seek"
        type="range"
        min={0}
        max={dur || 0}
        step={0.1}
        value={pos}
        aria-label="Перемотка"
        onChange={(e) => {
          if (ref.current) ref.current.currentTime = Number(e.target.value);
        }}
      />
      <span className="plays">
        {time(pos)} / {time(dur)}
      </span>
      <span className="speeds" role="group" aria-label="Скорость">
        {SPEEDS.map((s) => (
          <button key={s} className={s === speed ? 'chip-speed active' : 'chip-speed'} aria-pressed={s === speed} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </span>
    </div>
  );
}

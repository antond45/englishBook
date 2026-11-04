import type { VideoRef } from '../content/schema';

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Официальная платформа с видео курса English File 4th edition
const OXFORD_VIDEO_HOST = 'englishfile4e.oxfordonlinepractice.com';

function isOxfordVideo(video: VideoRef): boolean {
  try {
    return video.kind === 'official-link' && new URL(video.url).host === OXFORD_VIDEO_HOST;
  } catch {
    return false;
  }
}

export function VideoCard({ video }: { video: VideoRef }) {
  if (isOxfordVideo(video)) {
    // Видео Oxford — главная ссылка урока: крупная заметная кнопка
    return (
      <div className="video-card oxford-video">
        <div className="oxford-badge">🎬 Видео Oxford</div>
        <div className="video-title">{video.title}</div>
        {video.note && <div className="video-note">{video.note}</div>}
        <a className="btn primary watch-btn" href={video.url} target="_blank" rel="noopener noreferrer">
          ▶ Смотреть видео <span aria-hidden>↗</span>
        </a>
        <div className="video-kind">Откроется Oxford Online Practice. Войди по коду из своего учебника.</div>
      </div>
    );
  }

  if (video.kind === 'official-link') {
    return (
      <div className="video-card official-link">
        <div className="video-meta">
          <span className="video-icon" aria-hidden>
            🎓
          </span>
          <div className="video-body">
            <div className="video-title">{video.title}</div>
            {video.note && <div className="video-note">{video.note}</div>}
          </div>
          <a className="btn small open-btn" href={video.url} target="_blank" rel="noopener noreferrer">
            Открыть ↗
          </a>
        </div>
      </div>
    );
  }

  const id = video.kind === 'youtube' ? youtubeId(video.url) : null;
  return (
    <div className={`video-card ${video.kind}`}>
      {id && (
        <div className="frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={video.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="video-meta">
        <span className="video-icon" aria-hidden>
          ▶
        </span>
        <div className="video-body">
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            {video.title}
          </a>
          <div className="video-kind">{video.kind === 'youtube' ? 'YouTube' : 'Поиск видео на YouTube по теме'}</div>
          {video.note && <div className="video-note">{video.note}</div>}
        </div>
      </div>
    </div>
  );
}

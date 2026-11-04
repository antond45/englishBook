import type { ReactNode } from 'react';
import { Link, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { getFileMeta, getLevel } from './content/loader';
import { FileUnit } from './pages/FileUnit';
import { Home } from './pages/Home';
import { Lesson } from './pages/Lesson';
import { Level } from './pages/Level';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Settings } from './pages/Settings';

function TopBar({ children }: { children?: ReactNode }) {
  const { user, logout, error } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          English File <span>практика</span>
        </Link>
        {children}
        {user && (
          <div className="user">
            <Link to="/settings" className="settings-link" title="Настройки озвучки" aria-label="Настройки озвучки">
              ⚙
            </Link>
            <span className="user-name">{user.name}</span>
            <button className="btn ghost small" onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        )}
      </header>
      {error && <div className="banner-error">⚠ {error}. Прогресс может не сохраниться — проверь соединение.</div>}
    </>
  );
}

// Авторство иконок и озвучки — условие лицензии OpenMoji (CC BY-SA 4.0)
function Credits() {
  return (
    <footer className="credits">
      Иконки —{' '}
      <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">
        OpenMoji
      </a>{' '}
      (
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">
        CC BY-SA 4.0
      </a>
      ). Озвучка — модель{' '}
      <a href="https://huggingface.co/hexgrad/Kokoro-82M" target="_blank" rel="noopener noreferrer">
        Kokoro-82M
      </a>{' '}
      (Apache 2.0). Курс — по структуре Oxford English File 4th edition.
    </footer>
  );
}

// Оболочка раздела уровня: своя цветовая тема и навигация только внутри этого уровня
function LevelLayout() {
  const { levelId = '', fileId } = useParams();
  const level = getLevel(levelId);
  if (!level) return <NotFound />;
  const file = fileId ? getFileMeta(levelId, fileId) : undefined;
  return (
    <div className={`app lv-${levelId}`}>
      <TopBar>
        <nav className="crumbs">
          <Link to={`/${levelId}`} className="level-badge">
            {level.meta.cefr} · {level.meta.name}
          </Link>
          {file && (
            <>
              <span className="sep">/</span>
              <Link to={`/${levelId}/${file.id}`}>File {file.id}</Link>
            </>
          )}
        </nav>
      </TopBar>
      <Outlet />
    </div>
  );
}

export function App() {
  const { user, checking } = useAuth();
  if (checking) return <main className="page">Загрузка…</main>;
  if (!user) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }

  return (
    <>
    <Routes>
      <Route
        path="/"
        element={
          <div className="app">
            <TopBar />
            <Home />
          </div>
        }
      />
      <Route
        path="/settings"
        element={
          <div className="app">
            <TopBar />
            <Settings />
          </div>
        }
      />
      <Route path="/:levelId" element={<LevelLayout />}>
        <Route index element={<Level />} />
        <Route path=":fileId" element={<FileUnit />} />
        <Route path=":fileId/:sectionId" element={<Lesson />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Credits />
    </>
  );
}

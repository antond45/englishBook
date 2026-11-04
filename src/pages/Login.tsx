import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page auth-page">
      <h1>English File практика</h1>
      <p className="lead">Войди, чтобы прогресс и пройденные уроки сохранялись на любом устройстве.</p>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
          Вход
        </button>
        <button
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'tab active' : 'tab'}
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <label>
            Имя
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={60} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
          {mode === 'register' && <span className="hint">не короче 8 символов</span>}
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn primary" type="submit" disabled={busy}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
    </main>
  );
}

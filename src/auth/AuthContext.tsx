import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, type User } from '../api';
import { progress, setProgressErrorHandler } from '../progress/store';

interface AuthState {
  user: User | null;
  checking: boolean; // идёт первая проверка сессии
  error: string | null; // ошибка фонового сохранения
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ user: User | null }>('GET', '/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    setProgressErrorHandler((e) => {
      if (e instanceof ApiError && e.status === 401) {
        progress.clear();
        setUser(null);
        return;
      }
      setError(e instanceof Error ? e.message : 'Не удалось сохранить прогресс');
    });
  }, []);

  const signedIn = useCallback((u: User) => {
    progress.clear();
    setError(null);
    setUser(u);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      checking,
      error,
      async login(email, password) {
        const r = await api<{ user: User }>('POST', '/auth/login', { email, password });
        signedIn(r.user);
      },
      async register(name, email, password) {
        const r = await api<{ user: User }>('POST', '/auth/register', { name, email, password });
        signedIn(r.user);
      },
      async logout() {
        await api('POST', '/auth/logout').catch(() => undefined);
        progress.clear();
        setUser(null);
      },
    }),
    [user, checking, error, signedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}

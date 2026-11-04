import { Component, type ReactNode } from 'react';

// Ошибка в одном упражнении не должна ломать всю страницу урока
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <p className="form-error">Не удалось показать это задание. Обнови страницу или попробуй позже.</p>;
    }
    return this.props.children;
  }
}

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="page">
      <h1>Страница не найдена</h1>
      <Link to="/">К выбору уровня</Link>
    </main>
  );
}

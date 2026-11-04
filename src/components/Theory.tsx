import type { TheoryBlock } from '../content/schema';
import { SpeakButton } from './SpeakButton';

function Block({ block }: { block: TheoryBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  return (
    <section className="theory-block">
      {block.title && <h3>{block.title}</h3>}
      {block.text && <p>{block.text}</p>}
      {block.table && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.table.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {block.examples && (
        <ul className="examples">
          {block.examples.map((ex, i) => (
            <li key={i}>
              <SpeakButton text={ex.en} />
              <span className="en">{ex.en}</span>
              {ex.ru && <span className="ru">{ex.ru}</span>}
            </li>
          ))}
        </ul>
      )}
      {block.tip && <div className="tip">💡 {block.tip}</div>}
    </section>
  );
}

export function Theory({ blocks }: { blocks: TheoryBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <details className="theory" open>
      <summary>📘 Теория урока</summary>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </details>
  );
}

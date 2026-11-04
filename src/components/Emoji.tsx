import { useState } from 'react';
import { emojiCode } from '../emoji-code.mjs';

// Иконка OpenMoji (public/emoji, см. npm run emoji). Если файла нет — обычный эмодзи шрифта.
export function Emoji({ char, size = 48, label, className }: { char: string; size?: number; label?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {char}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}emoji/${emojiCode(char)}.svg`}
      width={size}
      height={size}
      alt={label ?? ''}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

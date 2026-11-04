// Имя файла иконки для эмодзи: коды символов через дефис, без вариант-селектора FE0F.
// Общая функция для приложения (src/components/Emoji.tsx) и скрипта tools/emoji/sync.mjs.
/** @param {string} emoji */
export function emojiCode(emoji) {
  return [...emoji]
    .map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    .filter((c) => c !== 'FE0F')
    .join('-');
}

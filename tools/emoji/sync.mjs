// npm run emoji — копирует нужные иконки OpenMoji (CC BY-SA 4.0) в public/emoji.
// Ищет в content/**/*.json эмодзи в полях "emoji" (упражнение «картинка → слово»),
// "image" (иллюстрация к заданию) и "cover" (обложка юнита). Лишние иконки удаляет.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emojiCode } from '../../src/emoji-code.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const content = join(root, 'content');
const out = join(root, 'public', 'emoji');
const source = join(root, 'node_modules', 'openmoji', 'color', 'svg');

if (!existsSync(source)) {
  console.error('Нет пакета openmoji. Выполни npm install.');
  process.exit(1);
}

const found = new Set();
function scan(value) {
  if (Array.isArray(value)) return value.forEach(scan);
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if ((k === 'emoji' || k === 'image') && typeof v === 'string') found.add(v);
      else if (k === 'cover' && Array.isArray(v)) v.forEach((e) => found.add(e));
      else scan(v);
    }
  }
}
for (const level of readdirSync(content)) {
  const dir = join(content, level);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) scan(JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

mkdirSync(out, { recursive: true });
const wanted = new Set();
const missing = [];
for (const e of found) {
  const code = emojiCode(e);
  // В OpenMoji имя файла иногда содержит FE0F (вариант-селектор), иногда нет
  const full = [...e].map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('-');
  const src = [full, code].map((c) => join(source, `${c}.svg`)).find(existsSync);
  if (!src) {
    missing.push(`${e} (${code})`);
    continue;
  }
  copyFileSync(src, join(out, `${code}.svg`));
  wanted.add(`${code}.svg`);
}

let removed = 0;
for (const f of readdirSync(out)) {
  if (f.endsWith('.svg') && !wanted.has(f)) {
    rmSync(join(out, f));
    removed++;
  }
}

console.log(`иконок: ${wanted.size}, удалено лишних: ${removed}`);
if (missing.length) {
  console.error(`Нет в OpenMoji: ${missing.join(', ')}`);
  process.exit(1);
}

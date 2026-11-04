// Нормализация ответа: регистр, «умные» апострофы и кавычки, лишние пробелы,
// точка/вопрос/восклицание в конце не влияют на проверку.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
}

export function isAccepted(input: string, answers: string[]): boolean {
  const n = normalize(input);
  return n.length > 0 && answers.some((a) => normalize(a) === n);
}

// Перемешивание, детерминированное по seed: порядок не меняется при перерисовке
export function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Если случайно получился исходный порядок — сдвигаем, чтобы задание не было решено заранее
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

// Разбивка предложения на слова для word-order: пунктуация в конце остаётся с последним словом
export function tokens(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}

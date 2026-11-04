// npm run audio -- [--limit N] [--dry-run]
// Запускает tools/tts/generate.py в локальном окружении tools/tts/.venv (см. README).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const python = process.platform === 'win32' ? join(dir, '.venv', 'Scripts', 'python.exe') : join(dir, '.venv', 'bin', 'python');

if (!existsSync(python)) {
  console.error('Нет окружения tools/tts/.venv. Установка описана в README, раздел «Озвучка».');
  process.exit(1);
}

const result = spawnSync(python, [join(dir, 'generate.py'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, HF_HOME: process.env.HF_HOME ?? join(dir, 'hf-cache'), PYTHONIOENCODING: 'utf-8' },
});
process.exit(result.status ?? 1);

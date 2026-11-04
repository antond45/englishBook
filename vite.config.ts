import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — чтобы собранное приложение открывалось с любого адреса (GitHub Pages, Netlify, локальная папка)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    // В разработке запросы к /api уходят на Node-сервер
    proxy: { '/api': 'http://localhost:3001' },
    // На некоторых дисках Windows обычное слежение за файлами пропускает изменения
    // tools/ (Python и модель для озвучки) и data/ (база) не нужны фронтенду и содержат десятки тысяч файлов
    watch: { usePolling: true, interval: 300, ignored: ['**/tools/**', '**/data/**'] },
  },
});

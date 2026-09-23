/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署時，資源路徑需要加上 repo 名稱
// 本地開發時 base = '/' 即可，但 build 時必須是 '/<repo>/'
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/k-12-geometry-teaching-tool/' : '/',
  test: {
    environment: 'node',
  },
}));
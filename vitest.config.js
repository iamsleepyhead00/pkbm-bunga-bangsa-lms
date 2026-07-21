import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,mjs}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['js/**/*.js'],
      exclude: ['js/pages/**']
    }
  }
});

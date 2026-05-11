import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: [
      '__tests__/**/*.test.ts',
      'lib/**/*.test.ts',
      'components/**/*.test.{ts,tsx}',
    ],
  },
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

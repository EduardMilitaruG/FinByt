import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret',
    },
    coverage: {
      provider: 'v8',
      include: ['**/*.js'],
      exclude: ['tests/**', 'seed.js', 'server.js', 'vitest.config.js', 'coverage/**'],
    },
  },
});

import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@test': path.resolve(__dirname, 'tests'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    poolOptions: { threads: { singleThread: true } },
    setupFiles: [path.join(__dirname, 'tests/setup.ts')],
    reporters: ['verbose'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

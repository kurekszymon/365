import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '#': resolve(__dirname, './src'),
    },
  },
})

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [tanstackRouter(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    reporters: ['default', 'html', ['allure-vitest', { resultsDir: './allure-results' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/routeTree.gen.ts', 'src/main.tsx'],
    },
  },
})

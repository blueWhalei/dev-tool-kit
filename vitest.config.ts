import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['apps/desktop/src/renderer/**', 'jsdom']],
    include: ['**/*.spec.ts', '**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/shared/src/**/*.ts',
        'apps/desktop/src/**/*.ts',
        'apps/desktop/src/**/*.vue'
      ],
      exclude: ['**/*.d.ts', '**/*.spec.ts', '**/*.test.ts'],
      thresholds: {
        'apps/desktop/src/main/modules/file-renamer/safe-move.ts': { lines: 90, functions: 90 },
        'apps/desktop/src/main/modules/image-tools/compression.ts': { lines: 90, functions: 100 }
      }
    },
    setupFiles: ['./vitest.setup.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './packages/shared/src')
    }
  }
})

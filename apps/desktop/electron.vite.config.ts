import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'modules/regex-tester/regex-worker': resolve(__dirname, 'src/main/modules/regex-tester/regex-worker.js')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/main/../../packages/shared/src')
      }
    }
  },
  preload: {
    // Bundle workspace IPC helpers into preload — sandboxed preload cannot require external deps.
    plugins: [externalizeDepsPlugin({ exclude: ['@dev-tool-kit/shared'] })],
    resolve: {
      alias: {
        // Resolve IPC whitelist from source so new channels work without rebuilding shared dist first.
        '@dev-tool-kit/shared/ipc': resolve(__dirname, '../../packages/shared/src/ipc/index.ts')
      }
    }
  },
  renderer: {
    define: {
      // Avoid vue-i18n runtime message compiler (new Function) under strict CSP
      __INTLIFY_JIT_COMPILATION__: false
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/renderer/src/../../packages/shared/src')
      }
    },
    plugins: [vue()]
  }
})
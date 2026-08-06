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
        '@shared': resolve(__dirname, '../../packages/shared/src')
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
      // vue-i18n AST JIT 编译（无 new Function）。ajv 校验已移入主进程
      // （json-schema:validate IPC），渲染进程无需 eval，CSP 已收紧为 script-src 'self'。
      __INTLIFY_JIT_COMPILATION__: true
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, '../../packages/shared/src')
      }
    },
    plugins: [vue()]
  }
})
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
      // vue-i18n AST JIT 编译。注意：渲染进程的 ajv（JSON Schema 校验）运行时
      // 仍需 new Function 编译 schema，故 CSP 保留 'unsafe-eval'（见 index.html）。
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
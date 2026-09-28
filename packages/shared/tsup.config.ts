import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'types/index': 'src/types/index.ts',
      'utils/index': 'src/utils/index.ts',
      'constants/index': 'src/constants/index.ts',
      'ipc/index': 'src/ipc/index.ts'
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    // Keep initial build artifacts available while desktop starts in watch mode.
    clean: !process.argv.includes('--watch') && !process.argv.includes('-w'),
    external: ['vue'],
    tsconfig: './tsconfig.build.json'
  }
])

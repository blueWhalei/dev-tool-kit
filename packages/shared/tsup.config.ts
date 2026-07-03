import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'types/index': 'src/types/index.ts',
      'utils/index': 'src/utils/index.ts',
      'constants/index': 'src/constants/index.ts',
      'ipc/index': 'src/ipc/index.ts'
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['vue'],
    tsconfig: './tsconfig.build.json'
  }
])

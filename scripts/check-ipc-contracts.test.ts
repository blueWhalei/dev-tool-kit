import { isValidInvokeChannel } from '../packages/shared/src/ipc/channels'
import { expect, it } from 'vitest'
import ts from 'typescript'
import { resolve } from 'path'

it('rejects unknown channels, invalid arguments and incorrect return assignments', () => {
  const filename = resolve('scripts/ipc-contract-fixture.ts')
  const source = `import type { ElectronAPI } from '../packages/shared/src/types'
    import type { IpcInvokeChannel, IpcContracts } from '../packages/shared/src/ipc'
    type AssertNever<T extends never> = T
    type Missing = AssertNever<Exclude<IpcInvokeChannel, keyof IpcContracts>>
    type Unexpected = AssertNever<Exclude<keyof IpcContracts, IpcInvokeChannel>>
    declare const api: ElectronAPI
    const good: Promise<string> = api.invoke('app:getVersion')
    api.invoke('missing:channel')
    api.invoke('port-manager:getPort', '8080')
    const bad: Promise<number> = api.invoke('app:getVersion')
    void good; void bad
  `
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (file, language, onError, shouldCreate) =>
    resolve(file) === filename
      ? ts.createSourceFile(filename, source, language, true)
      : getSourceFile(file, language, onError, shouldCreate)
  const program = ts.createProgram([filename], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  expect(diagnostics.map(diagnostic => diagnostic.code).sort()).toEqual([2322, 2345, 2345])
})

it('does not expose the retired batch endpoint', () => {
  expect(isValidInvokeChannel('image-tools:batchProcess')).toBe(false)
})

import { expect, it } from 'vitest'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { RotatingLog } from './rotating-log'
it('rotates during a session and bounds total files across dates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toolkit-log-test-'))
  try {
    await writeFile(join(directory, 'devtoolkit-2000-01-01.log'), 'old')
    const log = new RotatingLog(join(directory, 'devtoolkit.log'), 32, 3)
    for (let i = 0; i < 10; i++) log.write('x'.repeat(20) + i)
    await log.flush()
    const files = await readdir(directory)
    expect(files).toHaveLength(3)
    for (const name of files)
      expect((await stat(join(directory, name))).size).toBeLessThanOrEqual(32)
    expect(await readFile(log.path, 'utf8')).toContain('9')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

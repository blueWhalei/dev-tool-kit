import { appendFile, mkdir, readdir, rename, stat, unlink } from 'fs/promises'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'

/** Serialized writes close their file handles before rotation, including on Windows. */
export class RotatingLog {
  private pending = Promise.resolve()
  constructor(
    readonly path: string,
    private maxBytes = 5 * 1024 * 1024,
    private maxFiles = 5
  ) {}

  write(message: string): void {
    this.pending = this.pending
      .then(async () => {
        const directory = dirname(this.path)
        await mkdir(directory, { recursive: true })
        let size = 0
        try {
          size = (await stat(this.path)).size
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        // A single diagnostic must not bypass the log size budget.
        const text = Buffer.from(message).subarray(0, Math.min(this.maxBytes, 16 * 1024))
        if (size > 0 && size + text.length > this.maxBytes) {
          await rename(this.path, join(directory, `devtoolkit-${Date.now()}-${randomUUID()}.log`))
        }
        await appendFile(this.path, text)
        const files = await Promise.all(
          (await readdir(directory))
            .filter(name => /^devtoolkit(?:[-.].*)?\.log$/.test(name))
            .map(async name => ({ name, time: (await stat(join(directory, name))).mtimeMs }))
        )
        const archives = files
          .filter(file => join(directory, file.name) !== this.path)
          .sort((a, b) => b.time - a.time)
        for (const file of archives.slice(this.maxFiles - 1))
          await unlink(join(directory, file.name))
      })
      .catch(error => {
        console.error('Log write failed:', error)
      })
  }

  flush(): Promise<void> {
    return this.pending
  }
}

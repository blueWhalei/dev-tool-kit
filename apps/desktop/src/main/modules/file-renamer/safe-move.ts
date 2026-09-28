import { link, lstat, unlink } from 'fs/promises'
import { basename, resolve } from 'path'
import type { RenameResult } from '@dev-tool-kit/shared'

export function isValidFilename(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !/[<>:"|?*\\/]/u.test(name) &&
    ![...name].some(char => char.charCodeAt(0) < 32) &&
    !/[. ]$/.test(name) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  )
}

/** link() creates the destination exclusively; never fall back to overwriting rename(). */
export async function moveWithoutOverwrite(source: string, target: string): Promise<RenameResult> {
  const result = { original: basename(source), renamed: basename(target) }
  try {
    if (!isValidFilename(basename(target)))
      return { ...result, success: false, error: 'invalidFilename' }
    const sourceStat = await lstat(source)
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
      return { ...result, success: false, error: 'regularFilesOnly' }
    }
    if (resolve(source) === resolve(target)) return { ...result, success: true }
    await link(source, target)
    try {
      // If another actor replaced the source, keep both paths for manual recovery.
      const current = await lstat(source)
      if (
        current.dev !== sourceStat.dev ||
        current.ino !== sourceStat.ino ||
        current.isSymbolicLink()
      ) {
        return { ...result, success: false, error: 'sourceRemovalFailed' }
      }
      await unlink(source)
    } catch {
      return { ...result, success: false, error: 'sourceRemovalFailed' }
    }
    return { ...result, success: true, oldPath: source, newPath: target }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    return {
      ...result,
      success: false,
      error:
        code === 'EEXIST' ? 'targetExists' : code === 'ENOENT' ? 'sourceMissing' : 'safeMoveFailed'
    }
  }
}

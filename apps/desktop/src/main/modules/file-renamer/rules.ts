import { isRenameRule } from '@dev-tool-kit/shared/types'
import { basename, extname } from 'path'
import type { FileEntry, RenamePreview, RenameRule } from '@dev-tool-kit/shared'

export function generatePreviews(files: FileEntry[], rules: RenameRule[]): RenamePreview[] {
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return files.map((file, index) => {
    let current = file.name
    try {
      if (!Array.isArray(rules)) throw new Error('invalidRule')
      for (const rule of rules) {
        if (!isRenameRule(rule)) throw new Error('invalidRule')
        const ext = extname(current)
        let name = basename(current, ext)
        switch (rule.type) {
          case 'prefix':
            name = (rule.value || '') + name
            break
          case 'suffix':
            name += rule.value || ''
            break
          case 'replace':
            if (rule.value && rule.replaceWith !== undefined)
              name = name.split(rule.value).join(rule.replaceWith)
            break
          case 'regex':
            try {
              if (rule.pattern)
                name = name.replace(new RegExp(rule.pattern, 'g'), rule.replaceWith ?? '')
            } catch {
              throw new Error('invalidRegex')
            }
            break
          case 'number': {
            const start = rule.startNumber ?? 1
            const padding = rule.padding ?? 3
            if (!Number.isSafeInteger(start + index)) throw new Error('invalidRule')
            name = String(start + index).padStart(padding, '0') + '_' + name
            break
          }
          case 'case':
            if (rule.caseType === 'upper') name = name.toUpperCase()
            else if (rule.caseType === 'lower') name = name.toLowerCase()
            else if (rule.caseType === 'title') name = name.replace(/\b\w/g, c => c.toUpperCase())
            break
          case 'date':
            name = `${dateStr}_${name}`
            break
          default:
            throw new Error('invalidRule')
        }
        current = name + ext
      }
      return { original: file.name, preview: current, path: file.path }
    } catch (error) {
      return {
        original: file.name,
        preview: file.name,
        path: file.path,
        conflict: error instanceof Error ? error.message : 'invalidRule'
      }
    }
  })
}

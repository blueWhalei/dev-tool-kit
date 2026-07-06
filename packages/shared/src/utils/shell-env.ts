export interface ParsedShellVar {
  name: string
  value: string
  line?: number
}

const ASSIGNMENT_LINE_REGEX = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/

/** Parse shell-style KEY=VALUE / export KEY=VALUE assignments from file content */
export function parseShellEnvContent(content: string): ParsedShellVar[] {
  const vars: ParsedShellVar[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].replace(/\r$/, '').trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(ASSIGNMENT_LINE_REGEX)
    if (!match) continue

    const name = match[1]
    const value = unquoteShellValue(match[2])
    if (name) {
      vars.push({ name, value, line: i + 1 })
    }
  }

  return vars
}

function unquoteShellValue(raw: string): string {
  let value = raw.trim()

  const commentIdx = findInlineCommentIndex(value)
  if (commentIdx >= 0) {
    value = value.slice(0, commentIdx).trim()
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function findInlineCommentIndex(value: string): number {
  let inSingle = false
  let inDouble = false

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }
    if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(value[i - 1])) {
        return i
      }
    }
  }

  return -1
}

export function splitUnixPath(pathValue: string): string[] {
  return pathValue.split(':').filter((p) => p.length > 0)
}

export function joinUnixPath(paths: string[]): string {
  return paths.filter((p) => p.trim()).join(':')
}

export function escapeShellDoubleQuoted(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
}

export function formatShellExport(name: string, value: string): string {
  return `export ${name}="${escapeShellDoubleQuoted(value)}"`
}

function matchesEnvAssignmentLine(line: string, name: string): boolean {
  const trimmed = line.replace(/\r$/, '').trim()
  if (!trimmed || trimmed.startsWith('#')) return false
  const match = trimmed.match(ASSIGNMENT_LINE_REGEX)
  return Boolean(match && match[1] === name)
}

/** Update or append export NAME="value" in shell config content */
export function updateShellEnvAssignment(content: string, name: string, value: string): string {
  const lines = content.length > 0 ? content.split('\n') : []
  const newLine = formatShellExport(name, value)
  let found = false

  for (let i = 0; i < lines.length; i++) {
    if (matchesEnvAssignmentLine(lines[i], name)) {
      lines[i] = newLine
      found = true
      break
    }
  }

  if (found) {
    return lines.join('\n')
  }

  const marker = '# Dev Tool Kit'
  const base = content.length === 0 ? '' : content.endsWith('\n') ? content : `${content}\n`
  const block = base.includes(marker) ? '' : `\n${marker}\n`
  return `${base}${block}${newLine}\n`
}

/** Remove assignment lines for the given variable name */
export function removeShellEnvAssignment(content: string, name: string): string {
  return content
    .split('\n')
    .filter((line) => !matchesEnvAssignmentLine(line, name))
    .join('\n')
}

export interface ShellEnvDiffLine {
  type: 'add' | 'remove' | 'unchanged'
  line: string
}

/** Simple line diff for shell config preview */
export function buildShellEnvDiff(before: string, after: string): ShellEnvDiffLine[] {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const result: ShellEnvDiffLine[] = []
  const maxLen = Math.max(beforeLines.length, afterLines.length)

  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i]
    const a = afterLines[i]
    if (b === a) {
      if (b !== undefined) result.push({ type: 'unchanged', line: b })
    } else {
      if (b !== undefined) result.push({ type: 'remove', line: b })
      if (a !== undefined) result.push({ type: 'add', line: a })
    }
  }

  return result
}

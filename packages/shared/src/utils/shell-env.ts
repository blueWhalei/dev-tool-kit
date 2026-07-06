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

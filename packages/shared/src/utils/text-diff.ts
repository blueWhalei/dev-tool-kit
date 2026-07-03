export type DiffLineType = 'equal' | 'insert' | 'delete'

export interface DiffLine {
  type: DiffLineType
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffOptions {
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
}

function normalizeLine(line: string, options: DiffOptions): string {
  let value = line
  if (options.ignoreWhitespace) {
    value = value.trim().replace(/\s+/g, ' ')
  }
  if (options.ignoreCase) {
    value = value.toLowerCase()
  }
  return value
}

function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

export function computeLineDiff(textA: string, textB: string, options: DiffOptions = {}): DiffLine[] {
  const linesA = textA.split('\n')
  const linesB = textB.split('\n')
  const normalizedA = linesA.map(line => normalizeLine(line, options))
  const normalizedB = linesB.map(line => normalizeLine(line, options))
  const dp = lcsTable(normalizedA, normalizedB)
  const result: DiffLine[] = []

  let i = linesA.length
  let j = linesB.length

  const stack: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizedA[i - 1] === normalizedB[j - 1]) {
      stack.push({
        type: 'equal',
        content: linesA[i - 1],
        oldLineNumber: i,
        newLineNumber: j
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'insert',
        content: linesB[j - 1],
        newLineNumber: j
      })
      j--
    } else {
      stack.push({
        type: 'delete',
        content: linesA[i - 1],
        oldLineNumber: i
      })
      i--
    }
  }

  while (stack.length > 0) {
    result.push(stack.pop()!)
  }

  return result
}

export function formatDiffResult(lines: DiffLine[]): string {
  return lines
    .map(line => {
      switch (line.type) {
        case 'equal': return `  ${line.content}`
        case 'insert': return `+ ${line.content}`
        case 'delete': return `- ${line.content}`
      }
    })
    .join('\n')
}

export interface DiffStats {
  equal: number
  insert: number
  delete: number
}

export function getDiffStats(lines: DiffLine[]): DiffStats {
  return lines.reduce(
    (stats, line) => {
      stats[line.type]++
      return stats
    },
    { equal: 0, insert: 0, delete: 0 }
  )
}

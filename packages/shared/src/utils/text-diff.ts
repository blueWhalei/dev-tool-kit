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

export type DiffMode = 'line' | 'word'

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

function normalizeToken(token: string, options: DiffOptions): string {
  let value = token
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

function backtrackDiff(
  itemsA: string[],
  itemsB: string[],
  normalizedA: string[],
  normalizedB: string[],
  withLineNumbers: boolean
): DiffLine[] {
  const dp = lcsTable(normalizedA, normalizedB)
  const stack: DiffLine[] = []

  let i = itemsA.length
  let j = itemsB.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizedA[i - 1] === normalizedB[j - 1]) {
      stack.push({
        type: 'equal',
        content: itemsA[i - 1],
        ...(withLineNumbers ? { oldLineNumber: i, newLineNumber: j } : {})
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'insert',
        content: itemsB[j - 1],
        ...(withLineNumbers ? { newLineNumber: j } : {})
      })
      j--
    } else {
      stack.push({
        type: 'delete',
        content: itemsA[i - 1],
        ...(withLineNumbers ? { oldLineNumber: i } : {})
      })
      i--
    }
  }

  const result: DiffLine[] = []
  while (stack.length > 0) {
    result.push(stack.pop()!)
  }
  return result
}

export function computeLineDiff(textA: string, textB: string, options: DiffOptions = {}): DiffLine[] {
  const linesA = textA.split('\n')
  const linesB = textB.split('\n')
  const normalizedA = linesA.map(line => normalizeLine(line, options))
  const normalizedB = linesB.map(line => normalizeLine(line, options))
  return backtrackDiff(linesA, linesB, normalizedA, normalizedB, true)
}

const WORD_TOKEN_REGEX = /\S+|\s+/g

function tokenizeWords(text: string, options: DiffOptions): string[] {
  const tokens = text.match(WORD_TOKEN_REGEX) ?? []
  if (!options.ignoreWhitespace) {
    return tokens
  }
  return tokens.filter(token => !/^\s+$/.test(token))
}

export function computeWordDiff(textA: string, textB: string, options: DiffOptions = {}): DiffLine[] {
  const tokensA = tokenizeWords(textA, options)
  const tokensB = tokenizeWords(textB, options)
  const normalizedA = tokensA.map(token => normalizeToken(token, options))
  const normalizedB = tokensB.map(token => normalizeToken(token, options))
  return backtrackDiff(tokensA, tokensB, normalizedA, normalizedB, false)
}

export function computeDiff(
  textA: string,
  textB: string,
  mode: DiffMode,
  options: DiffOptions = {}
): DiffLine[] {
  return mode === 'word'
    ? computeWordDiff(textA, textB, options)
    : computeLineDiff(textA, textB, options)
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

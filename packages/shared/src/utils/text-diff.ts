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
  let value = line.replace(/\r$/, '') // 剥离 Windows 行尾 \r，保证 \r\n 与 \n 比较一致
  if (options.ignoreWhitespace) {
    value = value.trim().replace(/\s+/g, ' ')
  }
  if (options.ignoreCase) {
    value = value.toLowerCase()
  }
  return value
}

function normalizeToken(token: string, options: DiffOptions): string {
  let value = token.replace(/\r/g, '') // 归一化 CRLF：空白 token 内的 \r 一并移除
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

/** LCS 单元上限：防止超大输入（如数万行日志）产生 O(n×m) 内存导致卡死/OOM */
const MAX_LCS_CELLS = 4_000_000

function simpleDiff(
  itemsA: string[],
  itemsB: string[],
  normalizedA: string[],
  normalizedB: string[],
  withLineNumbers: boolean
): DiffLine[] {
  const result: DiffLine[] = []
  const max = Math.max(itemsA.length, itemsB.length)
  let oldLine = 1
  let newLine = 1
  for (let i = 0; i < max; i++) {
    const a = i < itemsA.length ? itemsA[i] : undefined
    const b = i < itemsB.length ? itemsB[i] : undefined
    const na = i < normalizedA.length ? normalizedA[i] : undefined
    const nb = i < normalizedB.length ? normalizedB[i] : undefined
    if (na !== undefined && nb !== undefined && na === nb) {
      result.push({
        type: 'equal',
        content: a as string,
        ...(withLineNumbers ? { oldLineNumber: oldLine, newLineNumber: newLine } : {})
      })
      oldLine++
      newLine++
    } else {
      if (na !== undefined) {
        result.push({
          type: 'delete',
          content: a as string,
          ...(withLineNumbers ? { oldLineNumber: oldLine } : {})
        })
        oldLine++
      }
      if (nb !== undefined) {
        result.push({
          type: 'insert',
          content: b as string,
          ...(withLineNumbers ? { newLineNumber: newLine } : {})
        })
        newLine++
      }
    }
  }
  return result
}

function backtrackDiff(
  itemsA: string[],
  itemsB: string[],
  normalizedA: string[],
  normalizedB: string[],
  withLineNumbers: boolean
): DiffLine[] {
  if (itemsA.length * itemsB.length > MAX_LCS_CELLS) {
    // 超大输入退化为逐行比较，避免 O(n×m) 内存/时间开销
    return simpleDiff(itemsA, itemsB, normalizedA, normalizedB, withLineNumbers)
  }
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

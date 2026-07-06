import type { ConverterResult } from './converter'

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

/** Simple XML pretty-printer (tag-based indentation). */
export function xmlFormat(text: string): ConverterResult {
  const trimmed = text.trim()
  if (!trimmed) return fail('请输入 XML 内容')

  try {
    const tokens = trimmed
      .replace(/>\s+</g, '><')
      .replace(/(<[^>]+>)/g, '\n$1\n')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    let indent = 0
    const lines: string[] = []

    for (const token of tokens) {
      const isClosing = /^<\//.test(token)
      const isSelfClosing = /\/>$/.test(token) || /^<\?/.test(token) || /^<!/.test(token)
      const isOpening = /^<[^!?/][^>]*>$/.test(token) && !isSelfClosing

      if (isClosing) indent = Math.max(0, indent - 1)
      lines.push('  '.repeat(indent) + token)
      if (isOpening) indent++
    }

    return { success: true, result: lines.join('\n') }
  } catch (error) {
    return fail(`XML 格式化失败: ${String(error)}`)
  }
}

export function xmlMinify(text: string): ConverterResult {
  const trimmed = text.trim()
  if (!trimmed) return fail('请输入 XML 内容')
  try {
    const result = trimmed
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return { success: true, result }
  } catch (error) {
    return fail(`XML 压缩失败: ${String(error)}`)
  }
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
  'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'UNION', 'ALL', 'DISTINCT', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'BETWEEN', 'LIKE', 'EXISTS'
]

const SQL_KEYWORD_SET = new Set(SQL_KEYWORDS)

/** Basic SQL formatter: uppercase keywords and line breaks before major clauses. */
export function sqlFormat(text: string): ConverterResult {
  const trimmed = text.trim()
  if (!trimmed) return fail('请输入 SQL 内容')

  try {
    let normalized = trimmed.replace(/\s+/g, ' ')

    for (const kw of SQL_KEYWORDS) {
      const re = new RegExp(`\\b${kw}\\b`, 'gi')
      normalized = normalized.replace(re, kw)
    }

    const breakBefore = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM']

    for (const clause of breakBefore) {
      const re = new RegExp(`\\s+(${clause.replace(' ', '\\s+')})\\b`, 'g')
      normalized = normalized.replace(re, `\n$1`)
    }

    const indented = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, i) => (i === 0 ? line : `  ${line}`))
      .join('\n')

    return { success: true, result: indented }
  } catch (error) {
    return fail(`SQL 格式化失败: ${String(error)}`)
  }
}

export function sqlMinify(text: string): ConverterResult {
  const trimmed = text.trim()
  if (!trimmed) return fail('请输入 SQL 内容')
  const result = trimmed.replace(/\s+/g, ' ').trim()
  return { success: true, result }
}

export function isSqlKeyword(word: string): boolean {
  return SQL_KEYWORD_SET.has(word.toUpperCase())
}

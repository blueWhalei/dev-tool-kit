import { ipcMain } from 'electron'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { logger } from '../../logger'
import type { RegexMatch, RegexResult } from '@dev-tool-kit/shared'

export type { RegexMatch, RegexResult }

export interface CommonRegex {
  name: string
  pattern: string
  description: string
}

const COMMON_REGEX: CommonRegex[] = [
  { name: '邮箱', pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$', description: '匹配邮箱地址' },
  { name: '手机号', pattern: '^1[3-9]\\d{9}$', description: '匹配中国手机号' },
  { name: 'URL', pattern: 'https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+[\\w.-]*', description: '匹配 URL' },
  { name: 'IP 地址', pattern: '^(?:\\d{1,3}\\.){3}\\d{1,3}$', description: '匹配 IPv4' },
  { name: '日期', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: '匹配 YYYY-MM-DD' },
  { name: '中文', pattern: '[\\u4e00-\\u9fa5]+', description: '匹配中文字符' },
  { name: '用户名', pattern: '^[a-zA-Z][a-zA-Z0-9_]{2,15}$', description: '匹配用户名' },
  { name: '密码强度', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$', description: '强密码' }
]

const REGEX_TIMEOUT_MS = 3000
const WORKER_PATH = join(__dirname, 'modules/regex-tester/regex-worker.js')

function runRegexInWorker(
  pattern: string,
  flags: string,
  testString: string,
  mode: 'test' | 'replace',
  replacement?: string
): Promise<{ isValid: boolean; matches?: RegexMatch[]; result?: string; error?: string }> {
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { pattern, flags, testString, mode, replacement }
    })

    const timeout = setTimeout(() => {
      worker.terminate()
      resolve({ isValid: false, error: '正则执行超时，可能存在灾难性回溯' })
    }, REGEX_TIMEOUT_MS)

    worker.on('message', (msg) => {
      clearTimeout(timeout)
      worker.terminate()
      resolve(msg)
    })

    worker.on('error', (error) => {
      clearTimeout(timeout)
      worker.terminate()
      resolve({ isValid: false, error: error.message })
    })
  })
}

export function setupRegexTesterIPC(): void {
  logger.info('Setting up Regex Tester IPC handlers')

  ipcMain.handle('regex:test', async (_, pattern: string, flags: string, testString: string) => {
    if (typeof pattern !== 'string' || typeof testString !== 'string') {
      return { isValid: false, matches: [], error: '无效的输入参数' } as RegexResult
    }
    if (typeof flags !== 'string' || !/^[gimsuy]*$/.test(flags)) {
      return { isValid: false, matches: [], error: '无效的正则标志' } as RegexResult
    }

    const result = await runRegexInWorker(pattern, flags, testString, 'test')
    if (result.error) {
      return { isValid: false, matches: [], error: result.error } as RegexResult
    }
    return { isValid: result.isValid, matches: result.matches || [] } as RegexResult
  })

  ipcMain.handle('regex:replace', async (_, pattern: string, flags: string, testString: string, replacement: string) => {
    if (typeof pattern !== 'string' || typeof testString !== 'string') {
      return { success: false, error: '无效的输入参数' }
    }
    if (typeof flags !== 'string' || !/^[gimsuy]*$/.test(flags)) {
      return { success: false, error: '无效的正则标志' }
    }

    const result = await runRegexInWorker(pattern, flags, testString, 'replace', replacement)
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { success: true, result: result.result }
  })

  ipcMain.handle('regex:getCommon', () => COMMON_REGEX)

  logger.info('Regex Tester IPC handlers ready')
}
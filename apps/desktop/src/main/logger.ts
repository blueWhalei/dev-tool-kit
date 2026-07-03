import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, statSync, renameSync, createWriteStream, unlinkSync, WriteStream } from 'fs'

const MAX_LOG_SIZE = 5 * 1024 * 1024
const MAX_LOG_FILES = 5

let logPath: string = ''
let logStream: WriteStream | null = null

function rotateLog(): void {
  if (!logPath) return

  const baseName = logPath.replace(/\.log$/, '')

  for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
    const oldFile = `${baseName}.${i}.log`
    const newFile = `${baseName}.${i + 1}.log`
    if (existsSync(oldFile)) {
      if (i === MAX_LOG_FILES - 1) {
        try {
          unlinkSync(oldFile)
        } catch (error) {
          console.error('Failed to delete old log file:', error)
        }
      } else {
        try {
          renameSync(oldFile, newFile)
        } catch (error) {
          console.error('Failed to rename log file:', error)
        }
      }
    }
  }

  try {
    renameSync(logPath, `${baseName}.1.log`)
  } catch (error) {
    console.error('Failed to rotate current log file:', error)
  }
}

function checkAndRotate(): void {
  if (!logPath || !existsSync(logPath)) return
  
  try {
    const stats = statSync(logPath)
    if (stats.size >= MAX_LOG_SIZE) {
      if (logStream) {
        logStream.end()
        logStream = null
      }
      rotateLog()
    }
  } catch (error) {
    console.error('Failed to check log file size:', error)
  }
}

export function initLogger(): void {
  const userDataPath = app.getPath('userData')
  const logsDir = join(userDataPath, 'logs')
  
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }
  
  const date = new Date().toISOString().split('T')[0]
  logPath = join(logsDir, `devtoolkit-${date}.log`)
  
  checkAndRotate()
  
  logStream = createWriteStream(logPath, { flags: 'a' })
  
  console.log(`[Logger] Log file: ${logPath}`)
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const circularReplacer = (): ((key: string, value: unknown) => unknown) => {
  const seen = new WeakSet()
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, circularReplacer(), 2)
  } catch {
    return String(obj)
  }
}

function formatMessage(level: LogLevel, ...args: unknown[]): string {
  const timestamp = new Date().toISOString()
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`
    }
    return typeof arg === 'object' ? safeStringify(arg) : String(arg)
  }).join(' ')
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
}

function writeLog(level: LogLevel, ...args: unknown[]): void {
  const formatted = formatMessage(level, ...args)
  
  // Console output
  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'debug':
      console.debug(formatted)
      break
    default:
      console.log(formatted)
  }
  
  // File output
  if (logStream) {
    logStream.write(formatted)
  }
}

export const logger = {
  info: (...args: unknown[]): void => writeLog('info', ...args),
  warn: (...args: unknown[]): void => writeLog('warn', ...args),
  error: (...args: unknown[]): void => writeLog('error', ...args),
  debug: (...args: unknown[]): void => writeLog('debug', ...args)
}

export { logPath }

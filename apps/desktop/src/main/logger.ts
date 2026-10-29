import { app } from 'electron'
import { join } from 'path'
import { RotatingLog } from './store/rotating-log'

let logPath = ''
let fileLog: RotatingLog | undefined
export function initLogger(): void {
  logPath = join(app.getPath('userData'), 'logs', 'devtoolkit.log')
  fileLog = new RotatingLog(logPath)
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
  const message = args
    .map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`
      }
      return typeof arg === 'object' ? safeStringify(arg) : String(arg)
    })
    .join(' ')

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
  fileLog?.write(formatted)
}

export const logger = {
  info: (...args: unknown[]): void => writeLog('info', ...args),
  warn: (...args: unknown[]): void => writeLog('warn', ...args),
  error: (...args: unknown[]): void => writeLog('error', ...args),
  debug: (...args: unknown[]): void => writeLog('debug', ...args)
}

export { logPath }

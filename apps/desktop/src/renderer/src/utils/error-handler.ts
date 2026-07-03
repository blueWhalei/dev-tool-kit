import { getMessage } from './discrete'

export interface AppError {
  code?: string
  message: string
  details?: unknown
  userMessage?: string
}

export function createError(
  message: string,
  options?: { code?: string; details?: unknown; userMessage?: string }
): AppError {
  return {
    message,
    code: options?.code,
    details: options?.details,
    userMessage: options?.userMessage,
  }
}

export function parseError(error: unknown): AppError {
  if (typeof error === 'string') {
    return { message: error, userMessage: error }
  }

  if (error instanceof Error) {
    const appError: AppError = {
      message: error.message,
      details: error.stack,
    }

    if (error.message.includes('net::ERR') || error.message.includes('Network')) {
      appError.userMessage = '网络连接失败，请检查网络设置'
    } else if (error.message.includes('ENOENT')) {
      appError.userMessage = '文件或目录不存在'
    } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      appError.userMessage = '权限不足，请以管理员身份运行'
    } else if (error.message.includes('ECONNREFUSED')) {
      appError.userMessage = '连接被拒绝'
    } else if (error.message.includes('ETIMEDOUT')) {
      appError.userMessage = '连接超时'
    } else {
      appError.userMessage = error.message
    }

    return appError
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>
    if (errorObj.message) {
      return {
        message: String(errorObj.message),
        userMessage: String(errorObj.message),
        details: error,
      }
    }
  }

  return { message: '未知错误', userMessage: '操作失败，请重试' }
}

export function showError(error: unknown, fallbackMessage = '操作失败'): void {
  const appError = parseError(error)
  const displayMessage = appError.userMessage || fallbackMessage

  console.error('[Error]', appError.message, appError.details || '')

  getMessage().error(displayMessage)
}

export function showWarning(message: string): void {
  getMessage().warning(message)
}

export function showSuccess(message: string): void {
  getMessage().success(message)
}

export function showInfo(message: string): void {
  getMessage().info(message)
}

export function logError(context: string, error: unknown): void {
  const appError = parseError(error)
  console.error(`[${context}]`, appError.message, appError.details || '')
}

export function handleAsyncError<T>(
  promise: Promise<T>,
  fallbackValue: T,
  errorMessage?: string
): Promise<T> {
  return promise.catch((error) => {
    showError(error, errorMessage)
    return fallbackValue
  })
}

export function setupGlobalErrorHandler() {
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = error?.message || String(message)
    // Benign browser noise from Naive UI / layout observers — not an app error
    if (errorMessage.includes('ResizeObserver loop')) {
      return true
    }
    console.error('[Global Error]', {
      message: errorMessage,
      source,
      lineno,
      colno,
      error,
    })
    showError(error || message, '程序发生错误')
    return true
  }

  window.onunhandledrejection = (event) => {
    console.error('[Unhandled Rejection]', event.reason)
    showError(event.reason, '异步操作失败')
    event.preventDefault()
  }
}

import { vi } from 'vitest'

// Mock window.electronAPI for tests
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}))

// Mock console.error to fail tests on unexpected errors
const originalError = console.error
console.error = (...args: unknown[]) => {
  if (args[0]?.toString().includes('[Vue warn]')) {
    return // Ignore Vue warnings in tests
  }
  originalError.call(console, ...args)
}

// Extend expect
declare global {
  namespace Vi {
    interface Matchers<T> {
      toBeInDocument(): T
      toHaveAttribute(attr: string, value?: string): T
    }
  }
}

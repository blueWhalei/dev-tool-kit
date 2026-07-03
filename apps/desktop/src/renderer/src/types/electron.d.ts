import type { ElectronAPI } from '@dev-tool-kit/shared'

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

import { Menu } from 'electron'
import { logger } from './logger'

export function createAppMenu(): void {
  Menu.setApplicationMenu(null)
  logger.info('Application menu disabled')
}

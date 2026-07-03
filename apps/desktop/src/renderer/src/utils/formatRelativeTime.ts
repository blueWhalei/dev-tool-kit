import type { ComposerTranslation } from 'vue-i18n'

export function formatRelativeRunTimeI18n(
  target: Date,
  t: ComposerTranslation,
  now = new Date()
): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs < 0) return t('tools.cronParser.relative.expired')
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return t('tools.cronParser.relative.seconds', { count: seconds })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('tools.cronParser.relative.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return t('tools.cronParser.relative.hours', { count: hours })
  const days = Math.floor(hours / 24)
  return t('tools.cronParser.relative.days', { count: days })
}

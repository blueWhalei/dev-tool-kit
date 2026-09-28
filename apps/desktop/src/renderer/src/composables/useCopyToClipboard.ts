import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

export function useCopyToClipboard() {
  const message = useMessage()
  const { t } = useI18n()

  async function copy(text: string, successMsg?: string, failMsg?: string): Promise<boolean> {
    const success = successMsg ?? t('common.copied')
    const fail = failMsg ?? t('common.copyFailed')
    if (!text) return false
    try {
      await navigator.clipboard.writeText(text)
      message.success(success)
      return true
    } catch {
      message.error(fail)
      return false
    }
  }

  return { copy }
}

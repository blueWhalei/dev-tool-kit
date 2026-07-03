import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

export function useCopyToClipboard() {
  const message = useMessage()
  const { t } = useI18n()

  function fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  }

  async function copy(
    text: string,
    successMsg?: string,
    failMsg?: string
  ): Promise<boolean> {
    const success = successMsg ?? t('common.copied')
    const fail = failMsg ?? t('common.copyFailed')
    if (!text) return false
    try {
      await navigator.clipboard.writeText(text)
      message.success(success)
      return true
    } catch {
      if (fallbackCopy(text)) {
        message.success(success)
        return true
      }
      message.error(fail)
      return false
    }
  }

  return { copy }
}

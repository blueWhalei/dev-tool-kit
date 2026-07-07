import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export type ToolI18nKey =
  | 'portManager'
  | 'envManager'
  | 'hostsEditor'
  | 'fileRenamer'
  | 'regexTester'
  | 'codeConverter'
  | 'colorConverter'
  | 'uuidGenerator'
  | 'passwordGenerator'
  | 'jwtGenerator'
  | 'hashGenerator'
  | 'textDiff'
  | 'mockData'
  | 'subnetCalculator'
  | 'cronParser'
  | 'chmodCalculator'
  | 'httpStatusCodes'
  | 'certificateParser'
  | 'connectionStringParser'
  | 'keyPairGenerator'
  | 'devReference'
  | 'qrCodeGenerator'

export function useToolI18n(tool: ToolI18nKey) {
  const { t, locale } = useI18n()
  const baseKey = `tools.${tool}`

  const title = computed(() => {
    void locale.value
    return t(`${baseKey}.title`)
  })

  const description = computed(() => {
    void locale.value
    return t(`${baseKey}.description`)
  })

  function tt(suffix: string, params?: Record<string, unknown>) {
    void locale.value
    return t(`${baseKey}.${suffix}`, params ?? {})
  }

  return { title, description, t: tt, locale }
}

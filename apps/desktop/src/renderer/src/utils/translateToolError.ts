import type { ComposerTranslation } from 'vue-i18n'
import type { ToolErrorParams } from '@dev-tool-kit/shared'

export function translateToolError(
  t: ComposerTranslation,
  tool: string,
  error: string | undefined | null,
  params: ToolErrorParams = {}
): string {
  if (!error) return ''
  const key = `tools.${tool}.errors.${error}`
  const translated = t(key, params)
  return translated === key ? error : translated
}

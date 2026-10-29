import { expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from './messages/en-US/tools/codeConverter'
import zh from './messages/zh-CN/tools/codeConverter'

it.each([
  { locale: 'en', messages: en },
  { locale: 'zh', messages: zh }
])(
  'renders literal JSON placeholders without interpreting braces in $locale',
  ({ locale, messages }) => {
    const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages } })
    expect(JSON.parse(i18n.global.t('placeholders.json'))).toEqual({ key: 'value' })
    expect(JSON.parse(i18n.global.t('placeholders.jsonSchema'))).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } }
    })
  }
)

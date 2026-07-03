import { createDiscreteApi, darkTheme, lightTheme } from 'naive-ui'
import type { MessageApiInjection } from 'naive-ui/lib/message/src/MessageProvider'

let currentMessage: MessageApiInjection

function createMessageApi(isDark: boolean) {
  const { message } = createDiscreteApi(['message'], {
    configProviderProps: {
      theme: isDark ? darkTheme : lightTheme,
    },
  })
  return message
}

currentMessage = createMessageApi(false)

export function getMessage(): MessageApiInjection {
  return currentMessage
}

export function updateMessageTheme(isDark: boolean): void {
  currentMessage = createMessageApi(isDark)
}

export { currentMessage as message }

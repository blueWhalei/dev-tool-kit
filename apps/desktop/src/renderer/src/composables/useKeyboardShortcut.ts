import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcut(
  handler: (event: KeyboardEvent) => void,
  options?: { enabled?: () => boolean }
) {
  function onKeydown(event: KeyboardEvent) {
    if (options?.enabled && !options.enabled()) return
    handler(event)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}

export function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey
}

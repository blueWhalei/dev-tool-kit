// Self-contained: Electron serializes this function into the renderer.
function clickReadyControl(text) {
  const control = [...document.querySelectorAll('button, [role="radio"], .n-radio-button')].find(
    element =>
      element.textContent.trim() === text &&
      !element.disabled &&
      element.getAttribute('aria-disabled') !== 'true' &&
      !element.classList.contains('n-button--loading')
  )
  if (!control) return false
  control.click()
  return true
}

module.exports = { clickReadyControl }

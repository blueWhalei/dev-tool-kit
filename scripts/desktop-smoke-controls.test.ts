// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { clickReadyControl } from './desktop-smoke-controls.cjs'

afterEach(() => {
  document.body.replaceChildren()
})

it('waits through a preview refresh before clicking exactly once', async () => {
  document.body.innerHTML = '<button>Execute rename</button>'
  const button = document.querySelector('button')!
  const clicked = vi.fn(() => {
    button.disabled = true
  })
  button.addEventListener('click', clicked)
  // Reproduce the old helper's gap: readiness was true, then a renderer update arrived.
  expect(button.disabled).toBe(false)
  await Promise.resolve().then(() => {
    button.disabled = true
  })
  expect(clickReadyControl('Execute rename')).toBe(false)
  expect(clicked).not.toHaveBeenCalled()
  button.disabled = false
  expect(clickReadyControl('Execute rename')).toBe(true)
  expect(clicked).toHaveBeenCalledTimes(1)
  expect(clickReadyControl('Execute rename')).toBe(false)
})

it('clicks the ready match even when an earlier matching control is disabled', () => {
  document.body.innerHTML =
    '<button disabled>Execute rename</button><button>Execute rename</button>'
  const buttons = document.querySelectorAll('button')
  const first = vi.fn(),
    second = vi.fn()
  buttons[0].addEventListener('click', first)
  buttons[1].addEventListener('click', second)
  expect(clickReadyControl('Execute rename')).toBe(true)
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledOnce()
})

it('does not dispatch clicks to loading or aria-disabled controls', () => {
  document.body.innerHTML =
    '<button class="n-button--loading">Save</button><div role="radio" aria-disabled="true">Mode</div>'
  expect(clickReadyControl('Save')).toBe(false)
  expect(clickReadyControl('Mode')).toBe(false)
  expect(clickReadyControl('Missing')).toBe(false)
})

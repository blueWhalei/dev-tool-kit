import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const PANEL_NAMES = ['base64', 'info', 'compress', 'resize', 'convert', 'dataUrl', 'svg', 'color', 'favicon', 'batch', 'compare', 'preset']

/**
 * 回归测试：naive-ui 的 NTabs 只收集 type.__TAB_PANE__ 的直接子 vnode，
 * NTabPane 不能藏在自定义面板组件内部（否则工具 tab 全部不渲染）。
 * 这里锁定拆分后的结构约束：12 个 NTabPane 外壳保留在父级模板，
 * 面板组件文件内不得再包裹 NTabPane。
 */
describe('ImageToolsView tab structure', () => {
  const viewPath = resolve(process.cwd(), 'apps/desktop/src/renderer/src/views/ImageToolsView.vue')
  const panelDir = resolve(process.cwd(), 'apps/desktop/src/renderer/src/components/image-tools')
  const source = readFileSync(viewPath, 'utf-8')
  const template = source.slice(source.indexOf('<template>'), source.indexOf('</template>'))

  it('keeps one NTabPane shell per tab in the parent view', () => {
    for (const name of PANEL_NAMES) {
      expect(template.match(new RegExp(`name="${name}"`)), `missing NTabPane shell for ${name}`).not.toBeNull()
      const panelName = `Image${name[0].toUpperCase()}${name.slice(1)}Panel`
      expect(template.match(new RegExp(`<${panelName}`)), `missing panel component for ${name}`).not.toBeNull()
    }
  })

  it('panel components never wrap NTabPane themselves', () => {
    for (const file of readdirSync(panelDir).filter(f => f.endsWith('.vue'))) {
      const content = readFileSync(resolve(panelDir, file), 'utf-8')
      expect(content.match(/<NTabPane/g)?.length ?? 0, `${file} must not wrap NTabPane`).toBe(0)
    }
  })

  it('registers every component used in the template', () => {
    const script = source.slice(source.indexOf('<script'), source.indexOf('</script>'))
    const used = [...template.matchAll(/<(N[A-Z]\w*)/g)].map(m => m[1])
    for (const comp of [...new Set(used)]) {
      expect(script.includes(comp), `${comp} is used in template but not imported`).toBe(true)
    }
  })
})

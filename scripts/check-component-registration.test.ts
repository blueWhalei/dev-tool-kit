// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { resolve } from 'path'
describe('component registration lint gate', () => {
  it('rejects undeclared Naive-style tags and accepts local imports', () => {
    const args = [
      resolve('node_modules/eslint/bin/eslint.js'),
      '--stdin',
      '--stdin-filename',
      'apps/desktop/src/renderer/src/views/AuditProbe.vue',
      '--format',
      'json'
    ]
    const missing = spawnSync(process.execPath, args, {
      input: '<template>\n  <NMissingComponent />\n</template>\n',
      encoding: 'utf8'
    })
    expect(missing.status).toBe(1)
    expect(JSON.parse(missing.stdout)[0].messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'vue/no-undef-components' })])
    )
    const valid = spawnSync(process.execPath, args, {
      input:
        '<script setup lang="ts">\nimport { NButton } from \'naive-ui\'\n</script>\n<template>\n  <NButton />\n</template>\n',
      encoding: 'utf8'
    })
    expect(valid.status).toBe(0)
  }, 15000)
})

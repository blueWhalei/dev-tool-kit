import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { expect, it } from 'vitest'
import { createRequire } from 'module'
const { assertReleaseRevision } = createRequire(import.meta.url)('./check-release.cjs') as {
  assertReleaseRevision: (head: string, expected: string, tagged?: string) => void
}

it('accepts only the tag matching the current package versions', () => {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  expect(
    execFileSync(process.execPath, ['scripts/check-release.cjs'], {
      env: { ...process.env, RELEASE_VERSION: `v${version}` },
      encoding: 'utf8'
    })
  ).toContain('Release version verified')
  for (const tag of ['', 'v9999.0.0', version]) {
    expect(() =>
      execFileSync(process.execPath, ['scripts/check-release.cjs'], {
        env: { ...process.env, RELEASE_VERSION: tag },
        stdio: 'pipe'
      })
    ).toThrow()
  }
})
it('rejects a release tag or checkout that differs from the built commit', () => {
  expect(() => assertReleaseRevision('built', 'built', 'older')).toThrow('different commit')
  expect(() => assertReleaseRevision('other', 'built')).toThrow('workflow commit')
  expect(() => assertReleaseRevision('built', 'built', 'built')).not.toThrow()
  expect(() => assertReleaseRevision('built', 'built')).not.toThrow()
})

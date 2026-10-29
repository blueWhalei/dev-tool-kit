const fs = require('fs')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
function assertReleaseRevision(head, expected, tagged) {
  if (head !== expected) throw new Error('Release checkout does not match the workflow commit')
  if (tagged && tagged !== head) throw new Error('Release tag points to a different commit')
}
function main() {
  const root = path.resolve(__dirname, '..')
  const versions = [
    'package.json',
    'apps/desktop/package.json',
    'packages/shared/package.json'
  ].map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).version)
  const tag = process.env.RELEASE_VERSION
  if (!tag || versions.some(version => tag !== `v${version}`)) {
    throw new Error(
      `Release tag must match all package versions: ${versions.join(', ')}; received ${tag || '(empty)'}`
    )
  }
  if (process.env.RELEASE_COMMIT) {
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
    const expected = git(['rev-parse', '--verify', `${process.env.RELEASE_COMMIT}^{commit}`])
    const head = git(['rev-parse', 'HEAD'])
    const exists = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`], {
      cwd: root
    })
    if (exists.status !== 0 && exists.status !== 1) throw new Error('Unable to inspect release tag')
    const tagged = exists.status === 0 ? git(['rev-parse', `refs/tags/${tag}^{commit}`]) : undefined
    assertReleaseRevision(head, expected, tagged)
  }
  console.log(`Release version verified: ${tag}`)
}
module.exports = { assertReleaseRevision }
if (require.main === module) main()

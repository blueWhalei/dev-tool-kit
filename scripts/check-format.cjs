const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const prettier = require('prettier')
async function main() {
  const base = process.env.FORMAT_BASE || 'HEAD'
  const diffArgs = /^0+$/.test(base)
    ? ['ls-files', '-z']
    : ['diff', '--name-only', '-z', '--diff-filter=ACMR', base, '--']
  const files = new Set([
    ...execFileSync('git', diffArgs, {
      encoding: 'utf8'
    }).split('\0'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8'
    }).split('\0')
  ])
  let failed = false
  for (const file of files) {
    if (!file || !fs.existsSync(file) || !/\.(?:ts|js|cjs|mjs|vue|json|ya?ml|md)$/.test(file))
      continue
    const info = await prettier.getFileInfo(file, { ignorePath: '.prettierignore' })
    if (info.ignored || !info.inferredParser) continue
    const options = { ...(await prettier.resolveConfig(file)), filepath: path.resolve(file) }
    const source = fs.readFileSync(file, 'utf8')
    if (process.argv.includes('--write'))
      fs.writeFileSync(file, await prettier.format(source, options))
    else if (!(await prettier.check(source, options))) {
      console.error('Formatting required: ' + file)
      failed = true
    }
  }
  if (failed) process.exitCode = 1
}
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

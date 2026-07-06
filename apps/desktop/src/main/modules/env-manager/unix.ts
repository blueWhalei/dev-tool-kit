import { homedir } from 'os'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import type { EnvVariable, PathEntry } from '@dev-tool-kit/shared'
import { parseShellEnvContent, splitUnixPath } from '@dev-tool-kit/shared'

const IS_DARWIN = process.platform === 'darwin'
const READONLY_ERROR = 'Unix 平台当前为只读模式，请使用导出功能'

function getShellConfigPaths(): string[] {
  const home = homedir()
  if (IS_DARWIN) {
    return [join(home, '.zshrc'), join(home, '.bash_profile'), join(home, '.profile')]
  }
  return [join(home, '.bashrc'), join(home, '.profile')]
}

function getSystemConfigPaths(): string[] {
  if (IS_DARWIN) {
    return ['/etc/profile']
  }
  return ['/etc/environment']
}

async function readFileIfExists(filePath: string): Promise<string> {
  if (!existsSync(filePath)) return ''
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    logger.warn(`[EnvManager] Failed to read ${filePath}:`, error)
    return ''
  }
}

async function parseVarsFromFiles(
  filePaths: string[],
  type: EnvVariable['type']
): Promise<EnvVariable[]> {
  const vars: EnvVariable[] = []
  const seen = new Set<string>()

  for (const filePath of filePaths) {
    const content = await readFileIfExists(filePath)
    if (!content) continue

    for (const parsed of parseShellEnvContent(content)) {
      if (seen.has(parsed.name)) continue
      seen.add(parsed.name)
      vars.push({ name: parsed.name, value: parsed.value, type })
    }
  }

  return vars
}

async function getShellConfigVars(): Promise<EnvVariable[]> {
  return parseVarsFromFiles(getShellConfigPaths(), 'user')
}

async function getSystemFileVars(): Promise<EnvVariable[]> {
  return parseVarsFromFiles(getSystemConfigPaths(), 'system')
}

function getSessionVars(systemNames: Set<string>): EnvVariable[] {
  const vars: EnvVariable[] = []

  for (const [name, value] of Object.entries(process.env)) {
    if (value === undefined || systemNames.has(name)) continue
    vars.push({ name, value, type: 'user' })
  }

  return vars
}

export async function getAllUnixEnv(): Promise<EnvVariable[]> {
  const shellVars = await getShellConfigVars()
  const systemVars = await getSystemFileVars()
  const systemNames = new Set(systemVars.map((v) => v.name))
  const sessionVars = getSessionVars(systemNames)

  const merged = new Map<string, EnvVariable>()

  for (const v of sessionVars) {
    merged.set(v.name, v)
  }
  for (const v of systemVars) {
    const runtime = process.env[v.name]
    merged.set(v.name, {
      name: v.name,
      value: runtime ?? v.value,
      type: 'system'
    })
  }
  for (const v of shellVars) {
    const runtime = process.env[v.name]
    merged.set(v.name, {
      name: v.name,
      value: runtime ?? v.value,
      type: 'user'
    })
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getUnixEnv(name: string): Promise<EnvVariable | null> {
  const all = await getAllUnixEnv()
  return all.find((v) => v.name === name) || null
}

export async function getUnixPath(): Promise<PathEntry[]> {
  const pathValue = process.env.PATH ?? ''
  const paths = splitUnixPath(pathValue)

  return paths.map((p, index) => ({
    path: p,
    exists: existsSync(p),
    index
  }))
}

export function unixReadonlyResult(): { success: false; error: string } {
  return { success: false, error: READONLY_ERROR }
}

export async function getUnixUserVarsForBackup(): Promise<EnvVariable[]> {
  const shellVars = await getShellConfigVars()
  const systemNames = new Set((await getSystemFileVars()).map((v) => v.name))
  const sessionVars = getSessionVars(systemNames)

  const merged = new Map<string, EnvVariable>()
  for (const v of sessionVars) merged.set(v.name, v)
  for (const v of shellVars) {
    merged.set(v.name, {
      name: v.name,
      value: process.env[v.name] ?? v.value,
      type: 'user'
    })
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getUnixSupportInfo() {
  return {
    supported: true,
    platform: process.platform,
    readOnly: true
  }
}

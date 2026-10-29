import { randomUUID } from 'crypto'
import { homedir } from 'os'
import { readFile, writeFile, mkdir, copyFile, readdir, unlink, realpath } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { logger } from '../../logger'
import type { EnvVariable, PathEntry } from '@dev-tool-kit/shared'
import {
  parseShellEnvContent,
  splitUnixPath,
  joinUnixPath,
  updateShellEnvAssignment,
  removeShellEnvAssignment,
  buildShellEnvDiff,
  type ShellEnvDiffLine
} from '@dev-tool-kit/shared'
import { serializeFile, replaceFile } from '../../store/atomic-json'
import { isEnvVariableArray } from '@dev-tool-kit/shared'
import { isValidShellEnvName as isValidEnvName, isValidEnvValue } from '@dev-tool-kit/shared'

const IS_DARWIN = process.platform === 'darwin'
const MAX_SHELL_BACKUPS = 20

export interface UnixEnvPreview {
  configFile: string
  before: string
  after: string
  diff: ShellEnvDiffLine[]
}

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

function resolvePrimaryShellConfigPath(): string {
  for (const filePath of getShellConfigPaths()) {
    if (existsSync(filePath)) return filePath
  }
  return getShellConfigPaths()[0]
}

async function readFileIfExists(filePath: string): Promise<string> {
  if (!existsSync(filePath)) return ''
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

async function getShellBackupDir(): Promise<string> {
  const backupDir = join(app.getPath('userData'), 'backups', 'env-shell')
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true })
  }
  return backupDir
}

async function backupShellConfigFile(configPath: string): Promise<string> {
  const backupDir = await getShellBackupDir()
  const baseName = configPath.replace(/[/\\:]/g, '_')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `${baseName}-${timestamp}-${randomUUID()}.bak`)

  if (existsSync(configPath)) {
    await copyFile(configPath, backupPath)
  } else {
    await writeFile(backupPath, '', 'utf-8')
  }

  try {
    const files = (await readdir(backupDir)).filter(f => f.endsWith('.bak')).sort()
    while (files.length > MAX_SHELL_BACKUPS) {
      const oldest = files.shift()
      if (oldest) await unlink(join(backupDir, oldest))
    }
  } catch (error) {
    logger.warn('[EnvManager] Failed to prune shell config backups:', error)
  }

  logger.info('[EnvManager] Shell config backed up to:', backupPath)
  return backupPath
}

async function readPrimaryShellConfig(): Promise<{ path: string; content: string }> {
  const configPath = resolvePrimaryShellConfigPath()
  const content = await readFileIfExists(configPath)
  return { path: configPath, content }
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
  const systemNames = new Set(systemVars.map(v => v.name))
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
  return all.find(v => v.name === name) || null
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

export async function previewUnixEnvSet(
  name: string,
  value: string
): Promise<{ success: true; preview: UnixEnvPreview } | { success: false; error: string }> {
  if (!isValidEnvName(name) || !isValidEnvValue(value)) {
    return { success: false, error: 'invalidEnv' }
  }
  const { path: configFile, content } = await readPrimaryShellConfig()
  const after = updateShellEnvAssignment(content, name, value)
  return {
    success: true,
    preview: {
      configFile,
      before: content,
      after,
      diff: buildShellEnvDiff(content, after)
    }
  }
}

export async function previewUnixEnvDelete(
  name: string
): Promise<{ success: true; preview: UnixEnvPreview } | { success: false; error: string }> {
  if (!isValidEnvName(name)) {
    return { success: false, error: 'invalidEnv' }
  }
  const { path: configFile, content } = await readPrimaryShellConfig()
  const after = removeShellEnvAssignment(content, name)
  return {
    success: true,
    preview: {
      configFile,
      before: content,
      after,
      diff: buildShellEnvDiff(content, after)
    }
  }
}

export async function previewUnixPath(
  paths: string[]
): Promise<{ success: true; preview: UnixEnvPreview } | { success: false; error: string }> {
  if (
    !Array.isArray(paths) ||
    paths.some(p => !isValidEnvValue(p) || p.includes(':') || !p.trim())
  ) {
    return { success: false, error: 'invalidEnv' }
  }
  const pathValue = joinUnixPath(paths)
  return previewUnixEnvSet('PATH', pathValue)
}

async function editShellConfig(
  transform: (content: string) => string,
  apply: () => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const selected = resolvePrimaryShellConfigPath()
    const configFile = existsSync(selected) ? await realpath(selected) : selected
    return await serializeFile(configFile, async () => {
      const before = await readFileIfExists(configFile)
      const after = transform(before)
      await backupShellConfigFile(configFile)
      if ((await readFileIfExists(configFile)) !== before)
        return { success: false, error: 'configChanged' }
      await replaceFile(configFile, after)
      apply()
      return { success: true }
    })
  } catch (error) {
    logger.error('Shell configuration write failed', error)
    return { success: false, error: 'shellWriteFailed' }
  }
}

export async function setUnixEnv(name: string, value: string) {
  if (!isValidEnvName(name) || !isValidEnvValue(value))
    return { success: false, error: 'invalidEnv' }
  return editShellConfig(
    content => updateShellEnvAssignment(content, name, value),
    () => {
      process.env[name] = value
    }
  )
}
export async function deleteUnixEnv(name: string) {
  if (!isValidEnvName(name)) return { success: false, error: 'invalidEnv' }
  return editShellConfig(
    content => removeShellEnvAssignment(content, name),
    () => {
      delete process.env[name]
    }
  )
}
export async function setUnixPath(paths: string[]) {
  if (!Array.isArray(paths) || paths.some(p => !isValidEnvValue(p) || p.includes(':') || !p.trim()))
    return { success: false, error: 'invalidEnv' }
  return setUnixEnv('PATH', joinUnixPath(paths))
}
export async function restoreUnixBackup(variables: EnvVariable[]) {
  if (
    !isEnvVariableArray(variables) ||
    variables.some(v => v.type !== 'user' || !isValidEnvName(v.name))
  )
    return { success: false, error: 'invalidEnv' }
  return editShellConfig(
    content =>
      variables.reduce((next, v) => updateShellEnvAssignment(next, v.name, v.value), content),
    () => {
      for (const v of variables) process.env[v.name] = v.value
    }
  )
}

export async function getUnixUserVarsForBackup(): Promise<EnvVariable[]> {
  const shellVars = await getShellConfigVars()
  const systemNames = new Set((await getSystemFileVars()).map(v => v.name))
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
    readOnly: false,
    writeMode: 'shell' as const,
    shellConfigFile: resolvePrimaryShellConfigPath()
  }
}

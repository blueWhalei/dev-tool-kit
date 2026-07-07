export interface ParsedConnectionString {
  protocol: string
  host: string
  port: number | null
  user: string | null
  password: string | null
  database: string | null
  queryParams: Record<string, string>
}

export interface ConnectionStringParseResult {
  success: boolean
  result?: ParsedConnectionString
  error?: string
}

const SUPPORTED_PROTOCOLS = new Set([
  'mysql',
  'postgresql',
  'postgres',
  'redis',
  'rediss',
  'mongodb',
  'mongodb+srv'
])

const DEFAULT_PORTS: Record<string, number> = {
  mysql: 3306,
  postgresql: 5432,
  postgres: 5432,
  redis: 6379,
  rediss: 6380,
  mongodb: 27017,
  'mongodb+srv': 27017
}

const PROTOCOL_PREFIX_RE = /^([a-z][a-z0-9+.-]*):\/\//i

function normalizeProtocol(protocol: string): string {
  return protocol.replace(/:$/, '').toLowerCase()
}

function sanitizeConnectionStringInput(input: string): string {
  return input
    .replace(/^\uFEFF/, '')
    .replace(/\uFF1A/g, ':')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

function parseQueryParams(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (!search || search.length <= 1) return params

  const query = search.startsWith('?') ? search.slice(1) : search
  const usp = new URLSearchParams(query)
  usp.forEach((value, key) => {
    params[key] = value
  })
  return params
}

function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function extractProtocol(trimmed: string): string | null {
  const match = trimmed.match(PROTOCOL_PREFIX_RE)
  return match ? normalizeProtocol(match[1]) : null
}

function resolveHostPort(hostPort: string): { host: string; port: number | null } {
  const trimmed = hostPort.trim()
  if (!trimmed) return { host: '', port: null }

  if (trimmed.startsWith('[')) {
    const close = trimmed.indexOf(']')
    if (close < 0) return { host: '', port: null }
    const host = trimmed.slice(1, close)
    const after = trimmed.slice(close + 1)
    if (after.startsWith(':')) {
      const port = Number.parseInt(after.slice(1), 10)
      return { host, port: Number.isFinite(port) ? port : null }
    }
    return { host, port: null }
  }

  const colonIndex = trimmed.lastIndexOf(':')
  if (colonIndex > 0) {
    const maybePort = trimmed.slice(colonIndex + 1)
    if (/^\d+$/.test(maybePort)) {
      const port = Number.parseInt(maybePort, 10)
      return {
        host: trimmed.slice(0, colonIndex),
        port: Number.isFinite(port) ? port : null
      }
    }
  }

  return { host: trimmed, port: null }
}

function parseAuthorityManually(trimmed: string, protocol: string): ParsedConnectionString | null {
  const prefixMatch = trimmed.match(PROTOCOL_PREFIX_RE)
  if (!prefixMatch) return null

  const rest = trimmed.slice(prefixMatch[0].length)
  const queryIndex = rest.indexOf('?')
  const hashIndex = rest.indexOf('#')
  const endIndex = [queryIndex, hashIndex].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? rest.length

  const pathAndAuth = rest.slice(0, endIndex)
  const query = queryIndex >= 0 ? rest.slice(queryIndex, hashIndex >= 0 ? hashIndex : undefined) : ''

  const slashIndex = pathAndAuth.indexOf('/')
  const authority = slashIndex >= 0 ? pathAndAuth.slice(0, slashIndex) : pathAndAuth
  const databaseRaw = slashIndex >= 0 ? pathAndAuth.slice(slashIndex + 1) : ''

  const atIndex = authority.lastIndexOf('@')
  const userInfo = atIndex >= 0 ? authority.slice(0, atIndex) : ''
  const hostPort = atIndex >= 0 ? authority.slice(atIndex + 1) : authority

  let user: string | null = null
  let password: string | null = null
  if (userInfo) {
    const colonIndex = userInfo.indexOf(':')
    if (colonIndex >= 0) {
      user = decodeComponent(userInfo.slice(0, colonIndex)) || null
      password = decodeComponent(userInfo.slice(colonIndex + 1)) || null
    } else {
      user = decodeComponent(userInfo) || null
    }
  }

  const { host, port } = resolveHostPort(hostPort)
  if (!host) return null

  const database = databaseRaw
    ? decodeComponent(databaseRaw.split('/')[0]) || null
    : null

  return {
    protocol,
    host: decodeComponent(host),
    port: port ?? (DEFAULT_PORTS[protocol] ?? null),
    user,
    password,
    database,
    queryParams: parseQueryParams(query)
  }
}

function buildResultFromUrl(url: URL, protocol: string, host: string): ParsedConnectionString {
  const port = url.port
    ? Number.parseInt(url.port, 10)
    : (DEFAULT_PORTS[protocol] ?? null)

  const user = url.username ? decodeComponent(url.username) : null
  const password = url.password ? decodeComponent(url.password) : null

  let database: string | null = null
  const pathname = url.pathname
  if (pathname && pathname !== '/') {
    const path = decodeComponent(pathname.replace(/^\//, ''))
    database = path.split('/')[0] || null
  }

  return {
    protocol,
    host,
    port: Number.isFinite(port) ? port : null,
    user,
    password,
    database,
    queryParams: parseQueryParams(url.search)
  }
}

function parseWithUrl(trimmed: string, protocol: string): ParsedConnectionString | null {
  try {
    const url = new URL(trimmed)
    const urlProtocol = normalizeProtocol(url.protocol)
    if (urlProtocol !== protocol || !SUPPORTED_PROTOCOLS.has(urlProtocol)) {
      return null
    }

    let host = decodeComponent(url.hostname)
    if (!host && url.host) {
      const hostPort = url.host.includes('@') ? url.host.split('@').pop()! : url.host
      host = resolveHostPort(hostPort).host
      if (host) host = decodeComponent(host)
    }

    if (!host) return null
    return buildResultFromUrl(url, protocol, host)
  } catch {
    return null
  }
}

export function parseConnectionString(input: string): ConnectionStringParseResult {
  const trimmed = sanitizeConnectionStringInput(input)
  if (!trimmed) {
    return { success: false, error: 'empty' }
  }

  const protocol = extractProtocol(trimmed)
  if (!protocol) {
    return { success: false, error: 'invalid_format' }
  }

  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    return { success: false, error: 'unsupported_protocol' }
  }

  const parsed = parseWithUrl(trimmed, protocol) ?? parseAuthorityManually(trimmed, protocol)
  if (!parsed?.host) {
    return { success: false, error: 'invalid_format' }
  }

  return { success: true, result: parsed }
}

export function parsedConnectionToJson(result: ParsedConnectionString): string {
  return JSON.stringify(result, null, 2)
}

export interface ConnectionStringBuildInput {
  protocol: string
  host: string
  port?: number | null
  user?: string | null
  password?: string | null
  database?: string | null
  queryParams?: Record<string, string>
}

export interface ConnectionStringBuildResult {
  success: boolean
  result?: string
  error?: string
}

function encodeUriComponent(value: string): string {
  return encodeURIComponent(value)
}

function buildUserInfoAuthority(user: string | null | undefined, password: string | null | undefined): string {
  const trimmedUser = user?.trim()
  const hasUser = Boolean(trimmedUser)
  const hasPassword = password != null && password !== ''

  if (!hasUser && !hasPassword) return ''
  if (hasUser && hasPassword) {
    return `${encodeUriComponent(trimmedUser!)}:${encodeUriComponent(password!)}@`
  }
  if (hasUser) return `${encodeUriComponent(trimmedUser!)}@`
  return `:${encodeUriComponent(password!)}@`
}

function formatAuthorityHost(host: string, port: number | null, protocol: string): string {
  const trimmedHost = host.trim()
  if (!trimmedHost) return ''

  const isIpv6 = trimmedHost.includes(':') && !trimmedHost.startsWith('[')
  const hostPart = isIpv6 ? `[${trimmedHost}]` : trimmedHost
  const defaultPort = DEFAULT_PORTS[protocol] ?? null

  if (protocol === 'mongodb+srv') return hostPart
  if (port != null && port !== defaultPort) return `${hostPart}:${port}`
  return hostPart
}

function buildDatabasePath(protocol: string, database: string | null | undefined): string {
  const db = database?.trim()
  if (!db) return ''

  if (protocol === 'redis' || protocol === 'rediss') {
    return `/${db}`
  }

  return `/${encodeUriComponent(db)}`
}

function buildQueryString(queryParams: Record<string, string> | undefined): string {
  if (!queryParams) return ''
  const entries = Object.entries(queryParams).filter(([, value]) => value !== '')
  if (entries.length === 0) return ''
  return `?${new URLSearchParams(entries).toString()}`
}

export function buildConnectionString(input: ConnectionStringBuildInput): ConnectionStringBuildResult {
  const protocol = normalizeProtocol(input.protocol)
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    return { success: false, error: 'unsupported_protocol' }
  }

  const host = input.host?.trim()
  if (!host) {
    return { success: false, error: 'missing_host' }
  }

  const authority = `${buildUserInfoAuthority(input.user, input.password)}${formatAuthorityHost(host, input.port ?? null, protocol)}`
  const path = buildDatabasePath(protocol, input.database)
  const query = buildQueryString(input.queryParams)

  return {
    success: true,
    result: `${protocol}://${authority}${path}${query}`
  }
}

export const CONNECTION_STRING_FIELD_KEYS = [
  'protocol',
  'host',
  'port',
  'user',
  'password',
  'database'
] as const

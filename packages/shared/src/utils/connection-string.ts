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

function normalizeProtocol(protocol: string): string {
  return protocol.replace(/:$/, '').toLowerCase()
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

export function parseConnectionString(input: string): ConnectionStringParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { success: false, error: 'empty' }
  }

  try {
    const url = new URL(trimmed)
    const protocol = normalizeProtocol(url.protocol)

    if (!SUPPORTED_PROTOCOLS.has(protocol)) {
      return { success: false, error: 'unsupported_protocol' }
    }

    const host = decodeComponent(url.hostname)
    if (!host) {
      return { success: false, error: 'invalid_format' }
    }

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
      success: true,
      result: {
        protocol,
        host,
        port: Number.isFinite(port) ? port : null,
        user,
        password,
        database,
        queryParams: parseQueryParams(url.search)
      }
    }
  } catch {
    return { success: false, error: 'invalid_format' }
  }
}

export function parsedConnectionToJson(result: ParsedConnectionString): string {
  return JSON.stringify(result, null, 2)
}

export const CONNECTION_STRING_FIELD_KEYS = [
  'protocol',
  'host',
  'port',
  'user',
  'password',
  'database'
] as const

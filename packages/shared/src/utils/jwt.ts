import type { ConverterResult } from './converter'

export interface JwtDecodedParts {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

export interface JwtTimeInfo {
  iat?: number
  exp?: number
  iatDate?: string
  expDate?: string
  isExpired: boolean
  expiresInSeconds?: number
}

export interface JwtVerifyResult {
  valid: boolean
  algorithm: string
}

const HMAC_ALGORITHMS: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512'
}

function fail<T = never>(error: string): ConverterResult<T> {
  return { success: false, error }
}

function base64UrlDecode(str: string): ConverterResult<string> {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return { success: true, result: new TextDecoder().decode(bytes) }
  } catch {
    return fail('无效的 Base64URL 编码')
  }
}

function parseJsonPart(part: string, label: string): ConverterResult<Record<string, unknown>> {
  const decoded = base64UrlDecode(part)
  if (!decoded.success || decoded.result === undefined) {
    return fail(decoded.error ?? `无法解码 JWT ${label}`)
  }
  try {
    const parsed = JSON.parse(decoded.result) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fail(`JWT ${label} 必须是 JSON 对象`)
    }
    return { success: true, result: parsed as Record<string, unknown> }
  } catch {
    return fail(`JWT ${label} 不是有效的 JSON`)
  }
}

export function decodeJwt(token: string): ConverterResult<JwtDecodedParts> {
  const trimmed = token.trim()
  if (!trimmed) return fail('请输入 JWT Token')

  const parts = trimmed.split('.')
  if (parts.length !== 3) return fail('JWT 格式无效，应包含 header.payload.signature 三部分')

  const [headerPart, payloadPart, signature] = parts
  const headerResult = parseJsonPart(headerPart, 'Header')
  if (!headerResult.success) return fail(headerResult.error!)

  const payloadResult = parseJsonPart(payloadPart, 'Payload')
  if (!payloadResult.success) return fail(payloadResult.error!)

  return {
    success: true,
    result: {
      header: headerResult.result!,
      payload: payloadResult.result!,
      signature
    }
  }
}

export function formatJwtJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2)
}

export function getJwtTimeInfo(payload: Record<string, unknown>): JwtTimeInfo {
  const now = Math.floor(Date.now() / 1000)
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined

  const info: JwtTimeInfo = {
    isExpired: exp !== undefined ? exp < now : false
  }

  if (iat !== undefined) {
    info.iat = iat
    info.iatDate = new Date(iat * 1000).toLocaleString('zh-CN')
  }

  if (exp !== undefined) {
    info.exp = exp
    info.expDate = new Date(exp * 1000).toLocaleString('zh-CN')
    info.expiresInSeconds = exp - now
    info.isExpired = exp < now
  }

  return info
}

async function importHmacKey(secret: string, hash: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign']
  )
}

function base64UrlEncodeBytes(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function verifyJwtHmac(
  token: string,
  secret: string
): Promise<ConverterResult<JwtVerifyResult>> {
  if (!secret.trim()) return fail('请输入 Secret 以验签')

  const decoded = decodeJwt(token)
  if (!decoded.success || !decoded.result) return fail(decoded.error!)

  const parts = token.trim().split('.')
  const [headerPart, payloadPart, signaturePart] = parts
  const alg = decoded.result.header.alg

  if (typeof alg !== 'string' || !(alg in HMAC_ALGORITHMS)) {
    return fail(`不支持的签名算法: ${String(alg)}，目前仅支持 HS256/HS384/HS512`)
  }

  try {
    const key = await importHmacKey(secret, HMAC_ALGORITHMS[alg])
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const signature = await crypto.subtle.sign('HMAC', key, data)
    const expected = base64UrlEncodeBytes(signature)
    const valid = expected === signaturePart

    return {
      success: true,
      result: { valid, algorithm: alg }
    }
  } catch (error) {
    return fail(`验签失败: ${String(error)}`)
  }
}

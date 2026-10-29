export function isValidIP(ip: string): boolean {
  if (typeof ip !== 'string' || !ip || ip.length > 45 || /\s/.test(ip)) return false
  const v4 = (value: string) =>
    /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
    value.split('.').every(part => Number(part) <= 255)
  if (!ip.includes(':')) return v4(ip)
  let address = ip
  if (address.includes('.')) {
    const index = address.lastIndexOf(':')
    if (!v4(address.slice(index + 1))) return false
    address = address.slice(0, index + 1) + '0:0'
  }
  const halves = address.split('::')
  if (halves.length > 2) return false
  const groups = halves.flatMap(half => (half ? half.split(':') : []))
  if (!groups.every(group => /^[0-9a-fA-F]{1,4}$/.test(group))) return false
  return halves.length === 2 ? groups.length < 8 : groups.length === 8
}

export function isValidHostname(hostname: string): boolean {
  if (typeof hostname !== 'string' || hostname.length > 253 || /\s/.test(hostname)) return false
  const hostnameRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
  return hostnameRegex.test(hostname)
}

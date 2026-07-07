export type DnsFlushPlatform = 'win32' | 'darwin' | 'linux' | 'unknown'

export type DnsFlushMethod = 'ipconfig' | 'dscacheutil' | 'systemd-resolve' | 'resolvectl' | 'nscd'

export interface DnsFlushMethodInfo {
  method: DnsFlushMethod
  command: string
}

export interface DnsFlushPlatformInfo {
  platform: DnsFlushPlatform
  methods: DnsFlushMethodInfo[]
  manualCommands: string[]
}

export type DnsFlushErrorCode = 'unsupported_platform' | 'no_flush_tool' | 'flush_failed'

export interface DnsFlushResult {
  success: boolean
  method?: DnsFlushMethod
  error?: string
  errorCode?: DnsFlushErrorCode
  manualCommands?: string[]
}

export function getDnsFlushPlatformInfo(platform: string): DnsFlushPlatformInfo {
  if (platform === 'win32') {
    return {
      platform: 'win32',
      methods: [{ method: 'ipconfig', command: 'ipconfig /flushdns' }],
      manualCommands: ['ipconfig /flushdns']
    }
  }

  if (platform === 'darwin') {
    const command = 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder'
    return {
      platform: 'darwin',
      methods: [{ method: 'dscacheutil', command }],
      manualCommands: [command]
    }
  }

  if (platform === 'linux') {
    return {
      platform: 'linux',
      methods: [
        { method: 'systemd-resolve', command: 'sudo systemd-resolve --flush-caches' },
        { method: 'resolvectl', command: 'sudo resolvectl flush-caches' },
        { method: 'nscd', command: 'sudo service nscd restart' }
      ],
      manualCommands: [
        'sudo systemd-resolve --flush-caches',
        'sudo resolvectl flush-caches',
        'sudo service nscd restart'
      ]
    }
  }

  return {
    platform: 'unknown',
    methods: [],
    manualCommands: []
  }
}

export default {
    title: 'Port Manager',
    description: 'Inspect processes by port, scan ranges, and kill processes',
    buttons: {
      refresh: 'Refresh',
      scan: 'Scan',
      scanAll: 'Scan all',
      scanCommon: 'Common ports',
      kill: 'Kill',
      confirm: 'Confirm',
      cancel: 'Cancel'
    },
    placeholders: {
      search: 'Search port / PID / process name'
    },
    filters: {
      all: 'All',
      listening: 'Listening',
      established: 'Established',
      allWithCount: 'All ({count})',
      listeningWithCount: 'Listening ({count})',
      establishedWithCount: 'Established ({count})'
    },
    stats: {
      total: '{count} total',
      listening: '{count} listening',
      established: '{count} established'
    },
    columns: {
      port: 'Port',
      service: 'Process',
      pid: 'PID',
      localAddress: 'Local address',
      protocol: 'Protocol',
      state: 'State',
      actions: ''
    },
    labels: {
      platform: 'Platform ({platform})'
    },
    hints: {
      nonWindows: 'On non-Windows platforms only listening ports are shown; process info may be incomplete',
      unixKillHint: 'Kill process is supported on {platform}, but some system processes require sudo. If kill fails, run sudo kill <PID> in terminal.'
    },
    messages: {
      killConfirm: 'Kill process {pid}?',
      processKilled: 'Process {pid} terminated'
    },
    errors: {
      fetchFailed: 'Failed to fetch port list',
      killFailed: 'Failed to kill process',
      needSudo: 'Process {pid} requires sudo. Run sudo kill {pid} in terminal'
    },
    empty: 'No ports in use',
    refresh: 'Refresh',
    scan: 'Scan',
    filterAll: 'All',
    filterListening: 'Listening',
    filterEstablished: 'Established',
    nonWindowsHint: 'On non-Windows platforms only listening ports are shown; process info may be incomplete'
  }

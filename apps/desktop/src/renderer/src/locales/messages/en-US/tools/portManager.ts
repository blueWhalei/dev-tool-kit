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
      cancel: 'Cancel',
      copyCommand: 'Copy command'
    },
    placeholders: {
      searchPort: 'Port',
      searchProcess: 'Process name',
      searchPid: 'PID',
      searchAddress: 'Local address'
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
      partialSupportTitle: 'Partial support',
      unixKillHint: 'On {platform}, user-owned processes can usually be killed. System or other users\' processes may require sudo. If kill fails, use "Copy command" and run it in a terminal.'
    },
    messages: {
      killConfirm: 'Kill process {pid}?',
      killConfirmUnix: 'Kill process {pid}?\n\nSome processes require sudo. If kill fails, copy the kill command and run it in a terminal.',
      processKilled: 'Process {pid} terminated',
      commandCopied: 'Command copied to clipboard'
    },
    dialogs: {
      killFailedTitle: 'Could not kill process',
      killFailedContent: '{message}\n\nRun this command in a terminal:\n{command}',
      protectedPidContent: 'Process {pid} is a protected system process and cannot be killed from the app. Proceed only if you understand the risk and handle it manually in a terminal.'
    },
    errors: {
      fetchFailed: 'Failed to fetch port list',
      killFailed: 'Failed to kill process',
      needSudo: 'Process {pid} requires sudo. Run sudo kill {pid} in terminal',
      invalid_pid: 'Invalid process ID',
      protected_pid: 'Cannot kill a protected system process',
      permission_denied: 'Process {pid} requires elevated permissions (sudo may be needed)',
      process_not_found: 'Process {pid} does not exist or has already exited',
      access_denied: 'Access denied for process {pid}; administrator rights may be required',
      unknown: 'An unknown error occurred while killing the process'
    },
    empty: 'No ports in use',
    refresh: 'Refresh',
    scan: 'Scan',
    filterAll: 'All',
    filterListening: 'Listening',
    filterEstablished: 'Established',
    nonWindowsHint: 'On non-Windows platforms only listening ports are shown; process info may be incomplete'
  }

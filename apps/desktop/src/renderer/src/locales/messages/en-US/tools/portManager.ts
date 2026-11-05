export default {
  title: 'Port Manager',
  description: 'Inspect processes by port, scan ranges, and kill processes',
  diagnosis: {
    title: 'Diagnose port',
    input: 'Paste a TCP listen EADDRINUSE error or enter a port (1–65535)',
    run: 'Check listeners',
    invalid: 'Enter a valid TCP port or an EADDRINUSE error containing one unambiguous port.',
    scanFailed: 'Scan failed. The port status is unknown.',
    occupied: 'Local TCP listeners on port {port} are listed below.',
    absent: 'TCP port {port} could be bound during this check.',
    released:
      'Recheck complete. Two consecutive bind checks succeeded on TCP port {port}. Retry starting your service.',
    stillOccupied: 'The selected process is still listening on port {port}.',
    otherOwner: 'A different process instance now listens on port {port}. Review the updated list.',
    unidentified: 'Port {port} still has a listener whose identity could not be verified.',
    unavailable: 'Could not bind TCP port {port} or identify a matching listener.',
    unconfirmed: 'TCP port {port} changed state during verification. Check again.',
    readOnly: 'Read-only: this process cannot be safely terminated.',
    forceWindows: 'Windows will forcibly terminate it.',
    unknownProcess: 'Unknown process',
    confirm:
      'Terminate {name} (PID {pid}), listening on {address}, port {port}? This stops the entire process.'
  },
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
    nonWindows:
      'On non-Windows platforms only listening ports are shown; process info may be incomplete',
    partialSupportTitle: 'Partial support',
    unixKillHint:
      'On {platform}, termination requires system Python 3, a verified process identity and sufficient permissions.'
  },
  messages: {
    killConfirm: 'Forcibly stop {name} (PID {pid}) listening on {address}, port {port}?',
    killConfirmUnix:
      'Send a termination signal to {name} (PID {pid}) listening on {address}, port {port}?',
    processKilled: 'Termination requested for process {pid}'
  },
  dialogs: {
    killFailedTitle: 'Could not terminate process',
    protectedPidContent:
      'Process {pid} is a protected system process and cannot be killed from the app. Proceed only if you understand the risk and handle it manually in a terminal.'
  },
  errors: {
    termination_pending: 'A termination request for this process is already running.',
    owner_changed: 'The selected process no longer owns this listener.',
    scan_failed: 'Could not verify listener ownership.',
    fetchFailed: 'Failed to fetch port list',
    killFailed: 'Failed to kill process',
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
  nonWindowsHint:
    'On non-Windows platforms only listening ports are shown; process info may be incomplete'
}

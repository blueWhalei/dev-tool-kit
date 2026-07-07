export default {
  title: 'Connection String Parser',
  description: 'Parse and build database URIs for MySQL, PostgreSQL, Redis, and MongoDB',
  tabs: {
    parse: 'Parse',
    build: 'Build'
  },
  labels: {
    input: 'Connection string',
    parsed: 'Parsed fields',
    built: 'Built URI',
    queryParams: 'Query parameters',
    empty: '—'
  },
  placeholders: {
    input: 'Paste a URI, e.g. mysql://user:pass@host:3306/db',
    host: 'e.g. localhost',
    user: 'Optional',
    database: 'Database name or Redis DB index',
    queryParams: 'e.g. charset=utf8mb4&ssl=true'
  },
  fields: {
    protocol: 'Protocol',
    host: 'Host',
    port: 'Port',
    user: 'User',
    password: 'Password',
    database: 'Database',
    queryParam: 'Param {name}'
  },
  columns: {
    field: 'Field',
    value: 'Value',
    actions: ''
  },
  buttons: {
    copy: 'Copy',
    copyJson: 'Copy JSON',
    copyBuilt: 'Copy URI',
    openInMockData: 'Use in Mock Data',
    openInPortManager: 'Check port usage',
    fillBuilder: 'Fill builder form',
    build: 'Build URI',
    parseBuilt: 'Parse built URI'
  },
  messages: {
    copiedField: 'Copied',
    copiedJson: 'JSON copied',
    copiedBuilt: 'URI copied',
    parseFirst: 'Enter a valid connection string first',
    buildFirst: 'Build a connection string first',
    noPort: 'No port in this connection string'
  },
  errors: {
    empty: 'Enter a connection string',
    unsupported_protocol: 'Unsupported protocol; MySQL, PostgreSQL, Redis, and MongoDB are supported',
    invalid_format: 'Invalid connection string format',
    missing_host: 'Host is required',
    unknown: 'Parse failed'
  }
}

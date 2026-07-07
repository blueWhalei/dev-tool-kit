export default {
  title: 'Connection String Parser',
  description: 'Parse common database URIs for MySQL, PostgreSQL, Redis, and MongoDB',
  labels: {
    input: 'Connection string',
    parsed: 'Parsed fields',
    empty: '—'
  },
  placeholders: {
    input: 'Paste a URI, e.g. mysql://user:pass@host:3306/db'
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
    openInMockData: 'Use in Mock Data'
  },
  messages: {
    copiedField: 'Copied',
    copiedJson: 'JSON copied',
    parseFirst: 'Enter a valid connection string first'
  },
  errors: {
    empty: 'Enter a connection string',
    unsupported_protocol: 'Unsupported protocol; MySQL, PostgreSQL, Redis, and MongoDB are supported',
    invalid_format: 'Invalid connection string format',
    unknown: 'Parse failed'
  }
}

export default {
    title: 'Mock Data Generator',
    description: 'Generate test JSON / CSV / SQL from templates',
    labels: {
      count: 'Count',
      fieldConfig: 'Field configuration',
      preview: 'Preview ({count} rows)',
      fieldName: 'Field name',
      enumOptions: 'Enum options',
      tableName: 'Table name'
    },
    placeholders: {
      preset: 'Select preset...',
      fieldName: 'Field name',
      enumOptions: 'pending,paid,shipped',
      tableName: 'mock_data'
    },
    buttons: {
      generate: 'Generate',
      addField: 'Add field',
      delete: 'Delete',
      copyJson: 'Copy JSON',
      exportMenu: 'Export',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV',
      exportSql: 'Export SQL'
    },
    presets: {
      user: {
        label: 'User',
        description: 'Basic user profile fields',
        fields: {
          id: 'ID',
          name: 'Name',
          email: 'Email',
          phone: 'Phone',
          address: 'Address',
          active: 'Active',
          createdAt: 'Created at'
        }
      },
      order: {
        label: 'Order',
        description: 'E-commerce order fields',
        fields: {
          orderId: 'Order ID',
          customer: 'Customer',
          company: 'Company',
          amount: 'Amount',
          status: 'Status',
          orderDate: 'Order date'
        }
      },
      article: {
        label: 'Article',
        description: 'Content article fields',
        fields: {
          id: 'ID',
          title: 'Title',
          summary: 'Summary',
          author: 'Author',
          published: 'Published',
          publishDate: 'Publish date'
        }
      }
    },
    fieldTypes: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      uuid: 'UUID',
      number: 'Number',
      date: 'Date',
      boolean: 'Boolean',
      address: 'Address',
      company: 'Company',
      ip: 'IP address',
      enum: 'Enum',
      increment: 'Auto ID',
      text: 'Short text'
    },
    messages: {
      minFields: 'Keep at least one field',
      validFieldRequired: 'Configure at least one valid field',
      generateFirst: 'Generate data first',
      copiedJson: 'JSON copied',
      exportedJson: 'JSON exported',
      exportedCsv: 'CSV exported',
      exportedSql: 'SQL exported',
      uuidFieldReady: 'Added id (uuid) field — generate mock data when ready',
      connFieldsReady: 'Added connection-string field template — generate mock data when ready'
    },
    hints: {
      previewLimit: 'Showing first 20 rows — export JSON/CSV/SQL for full data',
      enumOptions: 'Comma-separated, e.g. pending,paid,shipped'
    }
  }

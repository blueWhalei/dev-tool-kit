export default {
    title: 'Mock Data Generator',
    description: 'Generate test JSON/CSV from templates',
    labels: {
      count: 'Count',
      fieldConfig: 'Field configuration',
      preview: 'Preview ({count} rows)',
      fieldName: 'Field name'
    },
    placeholders: {
      preset: 'Select preset...',
      fieldName: 'Field name'
    },
    buttons: {
      generate: 'Generate',
      addField: 'Add field',
      delete: 'Delete',
      copyJson: 'Copy JSON',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV'
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
          amount: 'Amount',
          paid: 'Paid',
          orderDate: 'Order date'
        }
      },
      article: {
        label: 'Article',
        description: 'Content article fields',
        fields: {
          id: 'ID',
          title: 'Title',
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
      boolean: 'Boolean'
    },
    messages: {
      minFields: 'Keep at least one field',
      validFieldRequired: 'Configure at least one valid field',
      generateFirst: 'Generate data first',
      copiedJson: 'JSON copied',
      exportedJson: 'JSON exported',
      exportedCsv: 'CSV exported'
    },
    hints: {
      previewLimit: 'Showing first 20 rows — export JSON/CSV for full data'
    }
  }

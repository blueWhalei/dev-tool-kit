export default {
    title: 'Mock 数据生成',
    description: '按模板生成测试用 JSON / CSV / SQL 数据',
    labels: {
      count: '生成数量',
      fieldConfig: '字段配置',
      preview: '预览 ({count} 条)',
      fieldName: '字段名',
      enumOptions: '枚举选项',
      tableName: '表名'
    },
    placeholders: {
      preset: '选择预设模板...',
      fieldName: '字段名',
      enumOptions: 'pending,paid,shipped',
      tableName: 'mock_data'
    },
    buttons: {
      generate: '生成',
      addField: '添加字段',
      delete: '删除',
      copyJson: '复制 JSON',
      exportJson: '导出 JSON',
      exportCsv: '导出 CSV',
      exportSql: '导出 SQL'
    },
    presets: {
      user: {
        label: '用户',
        description: '基础用户信息',
        fields: {
          id: 'ID',
          name: '姓名',
          email: '邮箱',
          phone: '手机号',
          address: '地址',
          active: '启用',
          createdAt: '创建时间'
        }
      },
      order: {
        label: '订单',
        description: '电商订单字段',
        fields: {
          orderId: '订单号',
          customer: '客户',
          company: '公司',
          amount: '金额',
          status: '状态',
          orderDate: '下单日期'
        }
      },
      article: {
        label: '文章',
        description: '内容文章字段',
        fields: {
          id: 'ID',
          title: '标题',
          summary: '摘要',
          author: '作者',
          published: '已发布',
          publishDate: '发布日期'
        }
      }
    },
    fieldTypes: {
      name: '姓名',
      email: '邮箱',
      phone: '手机号',
      uuid: 'UUID',
      number: '数字',
      date: '日期',
      boolean: '布尔值',
      address: '地址',
      company: '公司',
      ip: 'IP 地址',
      enum: '枚举',
      increment: '自增 ID',
      text: '短文本'
    },
    messages: {
      minFields: '至少保留一个字段',
      validFieldRequired: '请至少配置一个有效字段',
      generateFirst: '请先生成数据',
      copiedJson: '已复制 JSON',
      exportedJson: 'JSON 已导出',
      exportedCsv: 'CSV 已导出',
      exportedSql: 'SQL 已导出'
    },
    hints: {
      previewLimit: '仅展示前 20 条，完整数据请导出 JSON / CSV / SQL',
      enumOptions: '逗号分隔，如 pending,paid,shipped'
    }
  }

export default {
  title: '文本对比',
  description: '比较文本或 JSON 结构，查看新增、删除和修改',
  json: {
    hint: '忽略对象键顺序，数组按位置比较；字符串的空白和大小写参与比较。路径从 $ 开始。',
    kind: '变化',
    path: '字段路径',
    added: '新增',
    removed: '删除',
    changed: '修改',
    addedCount: '新增 {count}',
    removedCount: '删除 {count}',
    changedCount: '修改 {count}',
    equal: 'JSON 结构和值相同。',
    empty: '在两侧输入 JSON，或填入示例开始比较。',
    comparing: '正在比较…',
    workerFailed: '比较失败或超时，请缩小输入后重试。',
    truncated: '表格中的长路径和值已省略，复制结果包含完整值。',
    errors: {
      output: '对比结果过大，请缩小输入范围。',
      invalid: '请输入有效的 JSON。',
      duplicate: '同一对象中包含重复字段名，请移除重复字段后比较。',
      size: '单侧 JSON 最多支持 524,288 个字符。',
      depth: 'JSON 嵌套深度超过 128 层。',
      nodes: 'JSON 节点数量超过 100,000 个。',
      precision: '包含超出支持精度的数值，请将高精度数值改为 JSON 字符串后比较。',
      changes: '变化超过 5,000 项，请缩小输入范围。'
    }
  },
  buttons: {
    jsonMode: 'JSON',
    fillSample: '填入示例',
    copyResult: '复制结果',
    copy: '复制',
    unifiedView: '统一视图',
    splitView: '并排视图',
    loadFile: '打开文件',
    lineMode: '行级',
    wordMode: '词级'
  },
  labels: {
    textA: '原文本 A',
    textB: '新文本 B',
    result: '对比结果',
    ignoreWhitespace: '忽略空白',
    ignoreCase: '忽略大小写',
    diffMode: '对比粒度',
    equal: '相同 {count}',
    insert: '新增 {count}',
    delete: '删除 {count}',
    loadedFile: '已加载：{name}'
  },
  placeholders: {
    textA: '粘贴或输入原文本...',
    textB: '粘贴或输入新文本...'
  },
  dialogs: {
    openTextFile: '选择文本文件',
    textFiles: '文本文件',
    allFiles: '所有文件'
  },
  messages: {
    copied: '已复制对比结果',
    noResult: '暂无对比结果',
    loadFileFailed: '无法读取文件'
  }
}

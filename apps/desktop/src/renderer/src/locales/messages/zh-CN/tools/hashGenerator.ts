export default {
    title: 'Hash 生成器',
    description: '计算 MD5、SHA-1、SHA-256、SHA-512 哈希值',
    modes: {
      text: '文本模式',
      file: '文件模式'
    },
    input: '输入',
    output: '输出',
    inputPlaceholder: '输入文本...',
    outputPlaceholder: '哈希结果...',
    hashFailed: 'Hash 计算失败',
    buttons: {
      useInJwt: '用于 JWT 签名',
      useInBase64: '用于 Base64'
    },
    fileArea: {
      selectFile: '选择文件',
      fileName: '文件名',
      fileSize: '文件大小'
    },
    messages: {
      fileHashComplete: '文件 Hash 计算完成',
      fileHashFailed: '文件 Hash 计算失败',
      noFileSelected: '请先选择文件',
      noHash: '请先计算 Hash'
    }
  }

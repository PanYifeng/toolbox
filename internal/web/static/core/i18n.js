// 轻量 i18n：中英文字典 + 语言切换
const dict = {
  zh: {
    'app.title': '🧰 Toolbox',
    'app.search': '搜索工具...',
    'app.tagline': '一站式开发者工具',
    'common.encode': '编码',
    'common.decode': '解码',
    'common.input': '输入',
    'common.output': '输出将显示在此',
    'common.copy': '复制',
    'common.error': '错误',
    'common.generate': '生成',
    'common.clear': '清空',
    'json.placeholder': '{"a":1,"b":[2,3]}',
    'json.fmt': '格式化',
    'json.min': '压缩',
    'json.esc': '转义',
    'json.out': '结果将显示在此',
    'json.errPrefix': '错误: ',
    'ts.now': '当前时间戳: ',
    'ts.ts2date': '时间戳 → 日期',
    'ts.tsPlaceholder': '1700000000 或 1700000000000',
    'ts.date2ts': '日期 → 时间戳',
    'ts.datePlaceholder': '2026-08-16 12:00:00',
    'ts.local': '本地: ',
    'ts.utc': 'UTC:  ',
    'ts.sec': '秒: ',
    'ts.ms': '毫秒: ',
    'ts.invalidNum': '无效数字',
    'ts.invalidDate': '无效日期',
    'vc.desc': '上传视频，服务端 ffmpeg 转码。单并发，文件 ≤ 50MB。',
    'vc.submit': '开始转码',
    'vc.selectFile': '请选择文件',
    'vc.uploading': '上传中...',
    'vc.uploadFail': '上传失败: ',
    'vc.processing': '转码中... (',
    'vc.done': '完成 ✓\n下载: ',
    'vc.fail': '失败: ',
    'vc.unknownErr': '未知错误',
    'vc.waiting': '等待上传...',
    'b64.placeholder': '文本或 Base64 字符串',
    'url.placeholder': 'URL 或文本',
    'hash.placeholder': '要计算哈希的文本',
    'jwt.placeholder': '粘贴 JWT (eyJ...)',
    'jwt.header': 'Header',
    'jwt.payload': 'Payload',
    'jwt.invalid': '无效 JWT',
    'regex.pattern': '正则表达式',
    'regex.flags': 'flags (如 g)',
    'regex.test': '匹配',
    'regex.input': '待匹配文本',
    'regex.noMatch': '无匹配',
    'color.invalid': '无效颜色（需 #RRGGBB）',
    'radix.value': '输入数值',
    'radix.invalid': '无效数值',
  },
  en: {
    'app.title': '🧰 Toolbox',
    'app.search': 'Search tools...',
    'app.tagline': 'All-in-one dev tools',
    'common.encode': 'Encode',
    'common.decode': 'Decode',
    'common.input': 'Input',
    'common.output': 'Output will appear here',
    'common.copy': 'Copy',
    'common.error': 'Error',
    'common.generate': 'Generate',
    'common.clear': 'Clear',
    'json.placeholder': '{"a":1,"b":[2,3]}',
    'json.fmt': 'Format',
    'json.min': 'Minify',
    'json.esc': 'Escape',
    'json.out': 'Result will appear here',
    'json.errPrefix': 'Error: ',
    'ts.now': 'Current timestamp: ',
    'ts.ts2date': 'Timestamp → Date',
    'ts.tsPlaceholder': '1700000000 or 1700000000000',
    'ts.date2ts': 'Date → Timestamp',
    'ts.datePlaceholder': '2026-08-16 12:00:00',
    'ts.local': 'Local: ',
    'ts.utc': 'UTC:  ',
    'ts.sec': 'sec: ',
    'ts.ms': 'ms: ',
    'ts.invalidNum': 'Invalid number',
    'ts.invalidDate': 'Invalid date',
    'vc.desc': 'Upload a video, transcoded by server-side ffmpeg. Single concurrency, file ≤ 50MB.',
    'vc.submit': 'Start',
    'vc.selectFile': 'Please select a file',
    'vc.uploading': 'Uploading...',
    'vc.uploadFail': 'Upload failed: ',
    'vc.processing': 'Transcoding... (',
    'vc.done': 'Done ✓\nDownload: ',
    'vc.fail': 'Failed: ',
    'vc.unknownErr': 'unknown error',
    'vc.waiting': 'Waiting for upload...',
    'b64.placeholder': 'Text or Base64 string',
    'url.placeholder': 'URL or text',
    'hash.placeholder': 'Text to hash',
    'jwt.placeholder': 'Paste JWT (eyJ...)',
    'jwt.header': 'Header',
    'jwt.payload': 'Payload',
    'jwt.invalid': 'Invalid JWT',
    'regex.pattern': 'Regex pattern',
    'regex.flags': 'flags (e.g. g)',
    'regex.test': 'Match',
    'regex.input': 'Text to match',
    'regex.noMatch': 'No match',
    'color.invalid': 'Invalid color (expect #RRGGBB)',
    'radix.value': 'Enter a number',
    'radix.invalid': 'Invalid number',
  },
};

let lang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

// t 取当前语言文案
export function t(key) {
  return (dict[lang] && dict[lang][key]) || key;
}

// tr 取多语言对象字段（用于 manifest name: {zh, en}）
export function tr(obj) {
  if (obj && typeof obj === 'object') return obj[lang] || obj.zh || obj.en || '';
  return obj || '';
}

export function getLang() {
  return lang;
}

// setLang 切换语言并持久化
export function setLang(l) {
  lang = l;
  localStorage.setItem('lang', l);
}

export default {
  id: 'doc_convert',
  name: { zh: '文档转换', en: 'Document Convert' },
  category: { zh: '文档', en: 'Document' },
  icon: '📄',
  keywords: ['doc', 'docx', 'pdf', 'libreoffice', '文档', '转换', 'word', 'odt', 'rtf', 'txt', 'html'],
  desc: '在线文档格式转换工具，支持 Word、PDF、TXT、ODT、RTF、HTML 互转，服务端 LibreOffice 处理。',
  guide: {
    zh: `## 功能

上传文档文件，选择目标格式（PDF / DOCX / TXT / ODT / RTF / HTML），由服务端 LibreOffice 转换后返回下载链接。

## 使用场景

- 把 Word 文档转成 PDF 方便分发和打印
- 将 PDF 或 ODT 文档转成 DOCX 以便编辑
- 把各种格式统一转成 TXT 或 HTML 用于内容提取

## 常见问题

- **处理耗时**：大文件或复杂排版转换需要时间，页面会自动轮询任务状态，完成后自动开始下载
- **支持格式**：输入支持 DOCX、DOC、PDF、ODT、RTF、TXT，输出可选 PDF、DOCX、TXT、ODT、RTF、HTML
- **排版差异**：跨格式转换可能存在字体或排版差异，建议转换后检查关键页面`,
    en: `## Features

Upload a document and pick a target format (PDF / DOCX / TXT / ODT / RTF / HTML); the server-side LibreOffice converts it and returns a download link.

## Use cases

- Turn Word documents into PDF for distribution and printing
- Convert PDF or ODT into DOCX for editing
- Normalize various formats into TXT or HTML for content extraction

## FAQ

- **Processing time**: large or complex files take longer; the page polls the job status and auto-downloads once done
- **Supported formats**: inputs include DOCX, DOC, PDF, ODT, RTF, TXT; outputs include PDF, DOCX, TXT, ODT, RTF, HTML
- **Layout drift**: cross-format conversion may differ in fonts or layout; review key pages afterwards`,
  },
  component: () => import('./component.js'),
};

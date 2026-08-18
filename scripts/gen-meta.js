#!/usr/bin/env node
// 遍历 internal/web/static/tools/*/manifest.js，导出 tools.json 供后端 SEO（sitemap / per-tool meta）使用。
// 只抽取 SEO 需要的静态字段：id / name / category / keywords / icon / desc(可选)。
// component 为动态 import，不触发执行，无副作用。
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = join(here, '..', 'internal', 'web', 'static');
const toolsDir = join(staticDir, 'tools');
const outFile = join(staticDir, 'tools.json');

const dirs = readdirSync(toolsDir)
  .filter((d) => statSync(join(toolsDir, d)).isDirectory())
  .sort();

const meta = [];
for (const d of dirs) {
  const mod = await import(pathToFileURL(join(toolsDir, d, 'manifest.js')).href);
  const m = mod.default;
  if (!m || !m.id) continue;
  meta.push({
    id: m.id,
    name: m.name,       // {zh, en}
    category: m.category, // {zh, en}
    icon: m.icon || '',
    keywords: m.keywords || [],
    desc: m.desc || '',  // 可选 SEO 描述，留空则后端按模板生成
  });
}

writeFileSync(outFile, JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log(`generated ${outFile} (${meta.length} tools)`);

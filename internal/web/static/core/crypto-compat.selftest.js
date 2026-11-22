// crypto-compat 自测：node 直接运行（node crypto-compat.selftest.js）。
// 覆盖：randomUUID 格式/唯一性/位域、randomId 字符集与后端白名单、四种摘要回退实现
// 与 node:crypto 原生结果逐字节一致（空串/短串/跨块边界/长串/二进制数据）。
// 同时验证「无 crypto.subtle 的纯 HTTP 环境」下 digestHex 会自动走回退路径。
import { createHash, randomUUID as nodeUUID } from 'node:crypto';

import { randomUUID, randomId, digestHex, fallbackDigest } from './crypto-compat.js';

let pass = 0;
let fail = 0;
const failures = [];

// ok 断言
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(msg);
}

// section 分组标题
function section(name) { console.log(`—— ${name} ——`); }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

section('randomUUID');
const uuids = new Set();
for (let i = 0; i < 500; i++) {
  const id = randomUUID();
  ok(UUID_RE.test(id), `randomUUID 格式非法: ${id}`);
  uuids.add(id);
}
ok(uuids.size === 500, `randomUUID 出现重复（500 次生成只有 ${uuids.size} 个唯一值）`);

section('randomId');
const CLIENT_RE = /^[A-Za-z0-9_-]{8,64}$/; // 后端 roomClientPattern
const ids = new Set();
for (let i = 0; i < 500; i++) {
  const id = randomId(16);
  ok(CLIENT_RE.test(id), `randomId 未通过后端白名单: ${id}`);
  ids.add(id);
}
ok(ids.size === 500, `randomId 出现重复（500 次生成只有 ${ids.size} 个唯一值）`);
ok(randomId(4).length === 4 && randomId(32).length === 32, 'randomId 长度不等于请求字节数');

section('digestHex 与 node:crypto 一致');
const CASES = [
  '',
  'abc',
  'a'.repeat(55),   // SHA-256 单块边界前
  'a'.repeat(56),   // 触发第二块
  'a'.repeat(64),
  'a'.repeat(119),
  'a'.repeat(120),  // SHA-512 单块边界
  'The quick brown fox jumps over the lazy dog',
  '中文字符串与 emoji 🎲 混合，验证 UTF-8 字节路径',
  'x'.repeat(5000),
];
const BINARY = new Uint8Array(300);
for (let i = 0; i < BINARY.length; i++) BINARY[i] = (i * 37) & 0xff;

for (const algo of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) {
  const norm = algo.toLowerCase().replace('-', '');
  // 正例：字符串（按 UTF-8 编码）
  for (const s of CASES) {
    const want = createHash(norm).update(s, 'utf8').digest('hex');
    ok(toHex(fallbackDigest(algo, new TextEncoder().encode(s))) === want,
      `${algo} 回退结果不匹配（输入长度 ${s.length}）`);
  }
  // 二进制输入
  const wantBin = createHash(norm).update(BINARY).digest('hex');
  ok(toHex(fallbackDigest(algo, BINARY)) === wantBin, `${algo} 二进制输入回退结果不匹配`);
  // 算法名大小写/无连字符写法
  ok(toHex(fallbackDigest(norm, BINARY)) === wantBin, `${algo} 算法名 ${norm} 未被识别`);
}

section('digestHex 在无 crypto.subtle 时回退');
const saved = globalThis.crypto;
// 模拟纯 HTTP 非安全上下文：crypto 存在但 subtle 缺失（真实浏览器的形态）
Object.defineProperty(globalThis, 'crypto', {
  value: { getRandomValues: saved.getRandomValues.bind(saved) },
  configurable: true,
  writable: true,
});
for (const algo of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) {
  const want = createHash(algo.toLowerCase().replace('-', '')).update('fallback path').digest('hex');
  const got = await digestHex(algo, new TextEncoder().encode('fallback path'));
  ok(got === want, `${algo} 无 subtle 时 digestHex 结果不匹配`);
}
// 恢复
Object.defineProperty(globalThis, 'crypto', { value: saved, configurable: true, writable: true });

section('digestHex 在 crypto 完全缺失时仍可用');
Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
ok(await digestHex('SHA-256', new TextEncoder().encode('x')) === createHash('sha256').update('x').digest('hex'),
  'crypto 缺失时 digestHex 失败');
Object.defineProperty(globalThis, 'crypto', { value: saved, configurable: true, writable: true });

section('randomUUID / randomId 在 crypto 完全缺失时不抛错');
Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
ok(UUID_RE.test(randomUUID()), 'crypto 缺失时 randomUUID 未生成合法 UUID');
ok(CLIENT_RE.test(randomId(16)), 'crypto 缺失时 randomId 未通过白名单');
Object.defineProperty(globalThis, 'crypto', { value: saved, configurable: true, writable: true });

section('未支持的算法抛错');
let threw = false;
try { await digestHex('MD5', new Uint8Array(0)); } catch { threw = true; }
ok(threw, 'MD5 应被拒绝');

// toHex 测试辅助
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// 一致性检查：node 原生 randomUUID 与本实现格式应当同构
ok(UUID_RE.test(nodeUUID()), '（对照）node 原生 randomUUID 格式不符预期');

console.log(`\n通过 ${pass} / ${pass + fail}`);
if (fail) {
  console.log('失败项:');
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}

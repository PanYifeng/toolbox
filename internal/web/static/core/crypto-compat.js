// Web Crypto 兼容层：安全上下文（HTTPS / localhost）之外的纯 HTTP 部署提供等价实现。
//
// 浏览器只有在安全上下文中才暴露 crypto.randomUUID 与 crypto.subtle；用普通 IP 访问本站时
// 这两个属性是 undefined，直接调用会抛 TypeError（2026-11-22 实录：「创建联机房间」报
// crypto.randomUUID is not a function）。crypto.getRandomValues 不受此限制，任何上下文都可用，
// 所以随机类回退一律以它为随机源。
//
// 摘要回退（SHA-1/256/384/512）为纯 JS 实现：优先走 crypto.subtle，不可用或抛错时才用它。
// 本模块不 import 任何东西，node 可直接加载（见同目录 crypto-compat.selftest.js）。

// —— 随机 ——

// randomUUID 生成 RFC 4122 v4 UUID。
// 优先原生 crypto.randomUUID；缺失时用 crypto.getRandomValues 拼装（v4 位域按规范置位）。
export function randomUUID() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    try { return c.randomUUID(); } catch { /* 继续回退 */ }
  }
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(b);
  } else {
    // 极端兜底（无 Web Crypto 的老浏览器）：仅用于非安全标识，不用于密钥
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// randomId 生成 n 字节的高熵 id（base64url 字母表，长度 = ceil(n*4/3)，无填充）。
// 用于需要后端白名单字符（[A-Za-z0-9_-]）的短标识。
export function randomId(n = 16) {
  const b = new Uint8Array(n);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (const x of b) out += alphabet[x & 63];
  return out;
}

// —— 摘要 ——

// ALGOS 支持的标准算法名（浏览器 subtle 与回退实现共用同一套名字）
const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

// normalizeAlgo 把 'sha256' / 'SHA-256' 等写法归一成标准名，未知算法抛错
function normalizeAlgo(algo) {
  const key = String(algo).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hit = ALGOS.find((a) => a.replace('-', '') === key);
  if (!hit) throw new Error(`unsupported hash algorithm: ${algo}`);
  return hit;
}

// digestHex 计算摘要的十六进制串。data 为 Uint8Array。
// 优先 crypto.subtle（安全上下文，原生实现），失败或无则回退纯 JS。
export async function digestHex(algo, data) {
  const name = normalizeAlgo(algo);
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const buf = await subtle.digest(name, data);
      return toHex(new Uint8Array(buf));
    } catch { /* 回退纯 JS */ }
  }
  return toHex(fallbackDigest(name, data));
}

// fallbackDigest 纯 JS 摘要分派
export function fallbackDigest(algo, data) {
  switch (normalizeAlgo(algo)) {
    case 'SHA-1': return sha1Bytes(data);
    case 'SHA-256': return wordsToBytes(sha256Words(data));
    case 'SHA-384': return sha512Core(data, SHA384_IV, 48);
    default: return sha512Core(data, SHA512_IV, 64);
  }
}

// toHex Uint8Array → 小写十六进制串
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// wordsToBytes 32 位大字端序列 → 字节序列
function wordsToBytes(words) {
  const out = new Uint8Array(words.length * 4);
  const dv = new DataView(out.buffer);
  words.forEach((w, i) => dv.setUint32(i * 4, w >>> 0, false));
  return out;
}

// pad 按 Merkle–Damgård 规则补位：0x80 + 若干 0 + 8 字节大端位长（32 位算法）
function pad(msg, blockSize) {
  const bitLen = msg.length * 8;
  const zeros = (blockSize - ((msg.length + 1 + 8) % blockSize)) % blockSize;
  const buf = new Uint8Array(msg.length + 1 + zeros + 8);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(buf.length - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(buf.length - 4, bitLen >>> 0, false);
  return buf;
}

// rotr 32 位循环右移
function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
// rotl 32 位循环左移
function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }

// —— SHA-1 ——

function sha1Bytes(msg) {
  const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const buf = pad(msg, 64);
  const dv = new DataView(buf.buffer);
  const W = new Array(80);
  for (let i = 0; i < buf.length; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 80; t++) W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    let [a, b, c, d, e] = H;
    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const tmp = (rotl(a, 5) + f + e + k + W[t]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = tmp;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0;
  }
  return wordsToBytes(H);
}

// —— SHA-256 ——

// SHA256_K SHA-256 常量表
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// sha256Words 纯 JS SHA-256，返回 8 个 32 位字
function sha256Words(msg) {
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const buf = pad(msg, 64);
  const dv = new DataView(buf.buffer);
  const W = new Array(64);
  for (let i = 0; i < buf.length; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H;
}

// —— SHA-512 / SHA-384 ——
// 用 BigInt 实现 64 位运算：回退路径只在无 crypto.subtle 时触发，性能不是瓶颈，
// 可读性与正确性优先。

const MASK64 = (1n << 64n) - 1n;

// SHA512_K SHA-512 常量表（FIPS 180-4）
const SHA512_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
];

const SHA512_IV = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
];

const SHA384_IV = [
  0xcbbb9d5dc1059ed8n, 0x629a292a367cd507n, 0x9159015a3070dd17n, 0x152fecd8f70e5939n,
  0x67332667ffc00b31n, 0x8eb44a8768581511n, 0xdb0c2e0d64f98fa7n, 0x47b5481dbefa4fa4n,
];

// rotr64 64 位循环右移
function rotr64(x, n) { return ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK64; }

// sha512Core SHA-512 主体，iv 决定 512/384，outLen 为输出字节数
function sha512Core(msg, iv, outLen) {
  const H = iv.slice();
  // 补位：0x80 + 0..127 个 0 + 16 字节大端位长（这里只用到低 64 位，高 64 位恒 0）
  const zeros = (128 - ((msg.length + 1 + 16) % 128)) % 128;
  const buf = new Uint8Array(msg.length + 1 + zeros + 16);
  buf.set(msg);
  buf[msg.length] = 0x80;
  let bitLen = BigInt(msg.length) * 8n;
  for (let i = 0; i < 8; i++) { buf[buf.length - 1 - i] = Number(bitLen & 0xffn); bitLen >>= 8n; }
  const W = new Array(80);
  for (let i = 0; i < buf.length; i += 128) {
    for (let t = 0; t < 16; t++) {
      let v = 0n;
      for (let k = 0; k < 8; k++) v = (v << 8n) | BigInt(buf[i + t * 8 + k]);
      W[t] = v;
    }
    for (let t = 16; t < 80; t++) {
      const s0 = rotr64(W[t - 15], 1) ^ rotr64(W[t - 15], 8) ^ (W[t - 15] >> 7n);
      const s1 = rotr64(W[t - 2], 19) ^ rotr64(W[t - 2], 61) ^ (W[t - 2] >> 6n);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) & MASK64;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 80; t++) {
      const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
      const ch = (e & f) ^ (~e & MASK64 & g);
      const t1 = (h + S1 + ch + SHA512_K[t] + W[t]) & MASK64;
      const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & MASK64;
      h = g; g = f; f = e; e = (d + t1) & MASK64; d = c; c = b; b = a; a = (t1 + t2) & MASK64;
    }
    H[0] = (H[0] + a) & MASK64; H[1] = (H[1] + b) & MASK64;
    H[2] = (H[2] + c) & MASK64; H[3] = (H[3] + d) & MASK64;
    H[4] = (H[4] + e) & MASK64; H[5] = (H[5] + f) & MASK64;
    H[6] = (H[6] + g) & MASK64; H[7] = (H[7] + h) & MASK64;
  }
  const out = new Uint8Array(64);
  H.forEach((w, i) => {
    for (let k = 0; k < 8; k++) out[i * 8 + k] = Number((w >> BigInt(56 - k * 8)) & 0xffn);
  });
  return out.slice(0, outLen);
}

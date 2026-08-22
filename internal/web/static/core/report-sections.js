// 人格测试报告段落注册表：三段分层（L1 维度级 / L2 类型级 / L3 通用）+ phase 分期控制。
// 每段 { key, titleKey(i18n), phase, render(snap, data, L) -> string }。
// phase 0=P0, 1=P1, 2=P2；空串跳过。

import { t } from '/core/i18n.js';

// —— 工具函数 ——

// dimKey 取维度中文缩写（供 snapshot 等使用）
function dimKey(d) {
  const map = { EI: 'EI', SN: 'SN', TF: 'TF', JP: 'JP', O: 'O', C: 'C', E: 'E', A: 'A', N: 'N', D: 'D', I: 'I', S: 'S', C: 'C' };
  return map[d] || d;
}

// clarKey MBTI 偏好清晰度带位
function clarKey(pct) {
  if (pct >= 80) return 'VeryHigh';
  if (pct >= 60) return 'High';
  if (pct >= 53) return 'Mid';
  return 'Low';
}

// bandKey 大五/DISC 带位
function bandKey(pct) {
  if (pct >= 75) return 'VeryHigh';
  if (pct >= 55) return 'High';
  if (pct >= 45) return 'Mid';
  if (pct >= 26) return 'Low';
  return 'VeryLow';
}

// discBandKey DISC 份额带位
function discBandKey(pct) {
  if (pct >= 35) return 'VeryHigh';
  if (pct >= 20) return 'High';
  if (pct >= 15) return 'Mid';
  return 'Low';
}

// esc 转义 HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// —— 构建器 ——

// buildFromSections 按 sections 数组 + activePhase 拼装完整报告文本
export function buildFromSections(sections, snap, data, L, activePhase = 0) {
  return sections
    .filter((s) => s.phase <= activePhase)
    .map((s) => {
      const content = s.render(snap, data, L);
      if (!content) return '';
      return `== ${t(s.titleKey)} ==\n${content}`;
    })
    .filter((s) => s !== '')
    .join('\n\n');
}

// ========================================
// MBTI 段落注册表
// ========================================

const MBTI_DIMS = ['EI', 'SN', 'TF', 'JP'];

// computeSubPcts 某 dichotomy 各子面 a 票占比
function mbtiSubPcts(facets, answers) {
  return facets.map((f) => {
    let a = 0;
    f.items.forEach((idx) => { if (answers[idx] === 0) a++; });
    return { pct: Math.round((a / f.items.length) * 100) };
  });
}

export const MBTI_SECTIONS = [
  // L3: 卷首语
  { key: 'intro', titleKey: 'ps.secIntro', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于 MBTI 理论框架，根据你的作答得出四字母类型。报告包含类型画像、维度详解、子维度分析、职业建议、人际关系、压力应对与成长建议等内容。MBTI 为自我报告量表，非临床诊断工具，类型标签是认识自我的入口而非定义。', en: 'This report is based on the MBTI framework, derived from your responses. It includes your type profile, dimension analysis, sub-dimension details, career advice, relationships, stress coping, and growth tips. MBTI is a self-report inventory, not a clinical diagnostic tool — type labels are a doorway to self-understanding, not a definition.' }) },

  // L2: 类型全景快照
  { key: 'snapshot', titleKey: 'ps.secProfile', phase: 0,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      return `${snap.code} · ${L(tp.nick)}\n${L(tp.brief)}`;
    } },

  // L2: 类型深度画像（扩自 full，P0）
  { key: 'deep', titleKey: 'ps.secDeep', phase: 0,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      const deep = tp.deep || {};
      return L(deep) || L(tp.full);
    } },

  // L2: 认知功能栈（MBTI 灵魂，P0）
  { key: 'cogStack', titleKey: 'ps.secCogStack', phase: 0,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      const cs = tp.cogStack;
      if (!cs) return '';
      const order = cs.order || '';
      const dom = cs.dominant ? `${L(cs.dominant.name)}：${L(cs.dominant.desc)}` : '';
      const aux = cs.auxiliary ? `${L(cs.auxiliary.name)}：${L(cs.auxiliary.desc)}` : '';
      const ter = cs.tertiary ? `${L(cs.tertiary.name)}：${L(cs.tertiary.desc)}` : '';
      const inf = cs.inferior ? `${L(cs.inferior.name)}：${L(cs.inferior.desc)}` : '';
      let s = `功能栈顺序：${order}\n`;
      if (dom) s += `\n主导功能：${dom}`;
      if (aux) s += `\n辅助功能：${aux}`;
      if (ter) s += `\n第三功能：${ter}`;
      if (inf) s += `\n第四功能：${inf}`;
      return s;
    } },

  // L1: 四维度详解（P0）
  { key: 'dimDeep', titleKey: 'ps.secDim', phase: 0,
    render: (snap, data, L) => {
      return MBTI_DIMS.map((d) => {
        const dm = data.dims[d];
        const [a, b] = snap.tally[d];
        const total = a + b || 1;
        const winPct = Math.round((Math.max(a, b) / total) * 100);
        const pole = a >= b ? dm.first : dm.second;
        const poleDeep = dm.poleDeep && dm.poleDeep[pole] ? L(dm.poleDeep[pole].deep) : '';
        return `${L(dm.name)}：${dm.first} ${a} / ${dm.second} ${b} [${t('ps.clar' + clarKey(winPct))}]\n${poleDeep}`;
      }).join('\n\n');
    } },

  // L1: 子维度细描（P0，已有 facets 数据即开）
  { key: 'facet', titleKey: 'ps.secSub', phase: 0,
    render: (snap, data, L) => {
      if (!data.facets) return '';
      return MBTI_DIMS.map((d) => {
        const dm = data.dims[d];
        const subs = mbtiSubPcts(data.facets[d], snap.answers);
        return subs.map((sf, i) => {
          const f = data.facets[d][i];
          const aPct = sf.pct;
          const bPct = 100 - sf.pct;
          const aName = f.aPole ? L(f.aPole) : '';
          const bName = f.bPole ? L(f.bPole) : '';
          return `${L(f.name)}：${aName} ${aPct}% / ${bName} ${bPct}%`;
        }).join('\n');
      }).join('\n\n');
    } },

  // L2: 优势 TOP3（P0）
  { key: 'strengths', titleKey: 'ps.secStrength', phase: 0,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.strengths) return '';
      return tp.strengths.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  // L2: 盲点 TOP3（P0）
  { key: 'blindspots', titleKey: 'ps.secBlindspots', phase: 0,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.blindspots) return '';
      return tp.blindspots.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  // L2+L1: 压力与倦怠（P1）
  { key: 'stress', titleKey: 'ps.secStress', phase: 1,
    render: (snap, data, L) => {
      return MBTI_DIMS.map((d) => {
        const dm = data.dims[d];
        return `${L(dm.name)}：${L(dm.stress)}`;
      }).join('\n');
    } },

  // L2: 人际兼容矩阵（P1）
  { key: 'compat', titleKey: 'ps.secRelation', phase: 1,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.compat) return L({ zh: '见各维度人际关系描述。', en: 'See relationship descriptions under each dimension.' });
      let s = '';
      if (tp.compat.high) s += `${L({ zh: '高兼容：', en: 'High compatibility: ' })}${tp.compat.high.join(', ')}\n`;
      if (tp.compat.low) s += `${L({ zh: '低兼容：', en: 'Low compatibility: ' })}${tp.compat.low.join(', ')}\n`;
      if (tp.compat.note) s += `${L(tp.compat.note)}`;
      return s;
    } },

  // L2: 沟通风格（P1）
  { key: 'comm', titleKey: 'ps.secComm', phase: 1,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.comm) return '';
      let s = '';
      if (tp.comm.style) s += `${L({ zh: '风格：', en: 'Style: ' })}${L(tp.comm.style)}\n`;
      if (tp.comm.expression) s += `${L({ zh: '表达方式：', en: 'Expression: ' })}${L(tp.comm.expression)}\n`;
      if (tp.comm.conflict) s += `${L({ zh: '冲突处理：', en: 'Conflict: ' })}${L(tp.comm.conflict)}`;
      return s;
    } },

  // L2: 领导力与团队（P1）
  { key: 'leadership', titleKey: 'ps.secLeadership', phase: 1,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.leadership) return '';
      let s = '';
      if (tp.leadership.style) s += `${L({ zh: '领导风格：', en: 'Leadership style: ' })}${L(tp.leadership.style)}\n`;
      if (tp.leadership.teamRole) s += `${L({ zh: '团队角色：', en: 'Team role: ' })}${L(tp.leadership.teamRole)}\n`;
      if (tp.leadership.delegation) s += `${L({ zh: '授权方式：', en: 'Delegation: ' })}${L(tp.leadership.delegation)}`;
      return s;
    } },

  // L2: 职业深度指南（P1）
  { key: 'careerDeep', titleKey: 'ps.secCareer', phase: 1,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (tp.careerDeep) {
        let s = '';
        if (tp.careerDeep.fit) s += `${L({ zh: '适合领域：', en: 'Best fit: ' })}${L(tp.careerDeep.fit)}\n`;
        if (tp.careerDeep.avoid) s += `${L({ zh: '慎选领域：', en: 'Avoid: ' })}${L(tp.careerDeep.avoid)}\n`;
        if (tp.careerDeep.env) s += `${L({ zh: '理想工作环境：', en: 'Ideal environment: ' })}${L(tp.careerDeep.env)}\n`;
        if (tp.careerDeep.path) s += `${L({ zh: '成长路径建议：', en: 'Growth path: ' })}${L(tp.careerDeep.path)}`;
        return s;
      }
      return L(tp.career);
    } },

  // L2: 学习风格（P2）
  { key: 'learning', titleKey: 'ps.secLearning', phase: 2,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.learning) return '';
      let s = '';
      if (tp.learning.style) s += `${L({ zh: '学习风格：', en: 'Learning style: ' })}${L(tp.learning.style)}\n`;
      if (tp.learning.bestEnv) s += `${L({ zh: '最佳学习环境：', en: 'Best environment: ' })}${L(tp.learning.bestEnv)}`;
      return s;
    } },

  // L2: 成长路径（P2）
  { key: 'growthPath', titleKey: 'ps.secGrowth', phase: 2,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      let s = '';
      // 先取维度级成长建议
      s += MBTI_DIMS.map((d) => {
        const dm = data.dims[d];
        return `${L(dm.name)}：${L(dm.growth)}`;
      }).join('\n');
      // 再取类型级成长路径
      if (tp.growthPath) {
        s += '\n\n' + tp.growthPath.map((g, i) => `${L({ zh: `阶段 ${i + 1}`, en: `Stage ${i + 1}` })}：${L(g.stage)} — ${L(g.practice)}`).join('\n');
      }
      return s;
    } },

  // L2: 每日实践清单（P2）
  { key: 'practices', titleKey: 'ps.secPractices', phase: 2,
    render: (snap, data, L) => {
      const tp = data.types[snap.code] || data.types.INTJ;
      if (!tp.practices) return '';
      return tp.practices.map((p, i) => `${i + 1}. ${L(p)}`).join('\n');
    } },

  // L3: 局限声明
  { key: 'disclaimer', titleKey: 'ps.secDisclaimer', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于 MBTI 自我报告量表，非临床诊断工具。类型标签是认识自我的入口，不是定义或限制。分数为量表相对位置，非人群常模百分位。', en: 'This report is based on the MBTI self-report inventory, not a clinical diagnostic tool. Type labels are a doorway to self-understanding, not a definition or limitation. Scores are scale-relative positions, not population percentiles.' }) },
];

// ========================================
// Big Five 段落注册表
// ========================================

const BIG5_DIMS = ['O', 'C', 'E', 'A', 'N'];

function big5Level(pct) {
  return pct >= 66 ? 'high' : pct <= 33 ? 'low' : 'mid';
}

function big5BandKey(pct) {
  if (pct >= 75) return 'VeryHigh';
  if (pct >= 55) return 'High';
  if (pct >= 45) return 'Mid';
  if (pct >= 26) return 'Low';
  return 'VeryLow';
}

// big5SubPcts 某维度各子面百分比
function big5SubPcts(facets, ratings, data) {
  return facets.map((f) => {
    let sum = 0, n = 0;
    f.items.forEach((k) => {
      const idx = data.KEY2IDX ? data.KEY2IDX[k] : null;
      if (idx == null) return;
      const raw = ratings[idx];
      if (raw <= 0) return;
      sum += data[k].reverse ? 6 - raw : raw;
      n++;
    });
    return { pct: n === 0 ? 0 : Math.round(((sum - n) / (n * 4)) * 100) };
  });
}

export const BIG5_SECTIONS = [
  { key: 'intro', titleKey: 'ps.secIntro', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于大五人格（OCEAN）理论框架，测量你在开放性、尽责性、外向性、宜人性、神经质五个维度上的特质。报告包含主导维度深度画像、五维度详解、子维度分析、优势盲点、职业建议、人际关系、压力应对与成长建议。大五人格为自我报告量表，非临床诊断工具。', en: 'This report is based on the Big Five (OCEAN) framework, measuring your traits across Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism. It includes your dominant profile, dimension analysis, sub-dimension details, strengths and blind spots, career advice, relationships, stress coping, and growth tips. The Big Five is a self-report inventory, not a clinical diagnostic tool.' }) },

  { key: 'snapshot', titleKey: 'ps.secProfile', phase: 0,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const dm = data.dims[top];
      return `${L(dm.name)} · ${t('ps.band' + big5BandKey(pcts[top]))}\n${L(dm[big5Level(pcts[top])])}`;
    } },

  { key: 'deep', titleKey: 'ps.secDeep', phase: 0,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const domProfile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (domProfile && domProfile.deep) return L(domProfile.deep);
      // fallback 到维度 full
      return L(data.dims[top].full);
    } },

  { key: 'dimDeep', titleKey: 'ps.secDim', phase: 0,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      return BIG5_DIMS.map((d) => {
        const dm = data.dims[d];
        const lvl = big5Level(pcts[d]);
        const poleDeep = dm.poleDeep && dm.poleDeep[lvl === 'high' ? 'high' : 'low'] ? L(dm.poleDeep[lvl === 'high' ? 'high' : 'low'].deep) : '';
        return `${L(dm.name)} ${pcts[d]}% [${t('ps.band' + big5BandKey(pcts[d]))}]\n${L(dm.full)}\n${poleDeep}`;
      }).join('\n\n');
    } },

  { key: 'facet', titleKey: 'ps.secSub', phase: 0,
    render: (snap, data, L) => {
      if (!data.facets) return '';
      return BIG5_DIMS.map((d) => {
        const subs = big5SubPcts(data.facets[d], snap.ratings, data);
        return subs.map((sf, i) => {
          const f = data.facets[d][i];
          const direction = sf.pct >= 50 ? 'high' : 'low';
          const dirText = L(f[direction]);
          return `${L(f.name)} ${sf.pct}% — ${dirText}`;
        }).join('\n');
      }).join('\n\n');
    } },

  { key: 'strengths', titleKey: 'ps.secStrength', phase: 0,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.strengths) return '';
      return profile.strengths.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  { key: 'blindspots', titleKey: 'ps.secBlindspots', phase: 0,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.blindspots) return '';
      return profile.blindspots.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  { key: 'stress', titleKey: 'ps.secStress', phase: 1,
    render: (snap, data, L) => {
      return BIG5_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].stress)}`).join('\n');
    } },

  { key: 'compat', titleKey: 'ps.secRelation', phase: 1,
    render: (snap, data, L) => {
      return BIG5_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].relationship)}`).join('\n');
    } },

  { key: 'comm', titleKey: 'ps.secComm', phase: 1,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.comm) return '';
      return L(profile.comm);
    } },

  { key: 'leadership', titleKey: 'ps.secLeadership', phase: 1,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.leadership) return '';
      return L(profile.leadership);
    } },

  { key: 'careerDeep', titleKey: 'ps.secCareer', phase: 1,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.careerDeep) return '';
      return L(profile.careerDeep);
    } },

  { key: 'learning', titleKey: 'ps.secLearning', phase: 2,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.learning) return '';
      return L(profile.learning);
    } },

  { key: 'growthPath', titleKey: 'ps.secGrowth', phase: 2,
    render: (snap, data, L) => {
      let s = BIG5_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].growth)}`).join('\n');
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (profile && profile.growthPath) {
        s += '\n\n' + profile.growthPath.map((g, i) => `${L({ zh: `阶段 ${i + 1}`, en: `Stage ${i + 1}` })}：${L(g.stage)} — ${L(g.practice)}`).join('\n');
      }
      return s;
    } },

  { key: 'practices', titleKey: 'ps.secPractices', phase: 2,
    render: (snap, data, L) => {
      const pcts = snap.pcts;
      const top = [...BIG5_DIMS].sort((a, b) => pcts[b] - pcts[a])[0];
      const lvl = big5Level(pcts[top]);
      const profile = data.domProfile && data.domProfile[top] && data.domProfile[top][lvl];
      if (!profile || !profile.practices) return '';
      return profile.practices.map((p, i) => `${i + 1}. ${L(p)}`).join('\n');
    } },

  { key: 'disclaimer', titleKey: 'ps.secDisclaimer', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于大五人格自我报告量表，非临床诊断工具。分数为量表相对位置，反映你在各维度上与自身相比的倾向程度，非人群常模百分位。', en: 'This report is based on the Big Five self-report inventory, not a clinical diagnostic tool. Scores are scale-relative positions reflecting your tendency compared to yourself, not population percentiles.' }) },
];

// ========================================
// DISC 段落注册表
// ========================================

const DISC_DIMS = ['D', 'I', 'S', 'C'];

function discLevel(pct) {
  return pct >= 35 ? 'high' : pct <= 14 ? 'low' : 'mid';
}

export const DISC_SECTIONS = [
  { key: 'intro', titleKey: 'ps.secIntro', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于 DISC 行为风格理论，通过迫选作答测量你在支配(D)、影响(I)、稳健(S)、严谨(C)四个维度上的风格强度，找出你的主导风格与混合风格解读。报告包含风格画像、维度详解、优势盲点、职业建议、人际关系、压力应对与成长建议。DISC 为自我报告量表，非临床诊断工具。', en: 'This report is based on the DISC behavior style theory, measuring your Dominance (D), Influence (I), Steadiness (S), and Conscientiousness (C) to identify your primary and secondary style blend. It includes your style profile, dimension analysis, strengths and blind spots, career advice, relationships, stress coping, and growth tips. DISC is a self-report inventory, not a clinical diagnostic tool.' }) },

  { key: 'snapshot', titleKey: 'ps.secProfile', phase: 0,
    render: (snap, data, L) => {
      const dm = data.dims[snap.primary];
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      return `${L(dm.name)} · ${L(blend.name)}\n${L(dm.high)}\n${L(blend.desc)}`;
    } },

  { key: 'deep', titleKey: 'ps.secDeep', phase: 0,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.deep) return L(blend.deep);
      return L(blend.desc);
    } },

  { key: 'interplay', titleKey: 'ps.secInterplay', phase: 0,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.interplay) return L(blend.interplay);
      return '';
    } },

  { key: 'dimDeep', titleKey: 'ps.secDim', phase: 0,
    render: (snap, data, L) => {
      return DISC_DIMS.map((d) => {
        const dm = data.dims[d];
        const pct = snap.pcts[d];
        const pole = pct >= 50 ? 'high' : 'low';
        const poleDeep = dm.poleDeep && dm.poleDeep[pole] ? L(dm.poleDeep[pole].deep) : '';
        const bandKey = discLevel(pct) === 'high' ? 'VeryHigh' : discLevel(pct) === 'mid' ? 'Mid' : 'Low';
        return `${L(dm.name)} ${pct}% [${t('ps.band' + bandKey)}]\n${L(dm.full)}\n${poleDeep}`;
      }).join('\n\n');
    } },

  { key: 'strengths', titleKey: 'ps.secStrength', phase: 0,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (!blend.strengths) return '';
      return blend.strengths.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  { key: 'blindspots', titleKey: 'ps.secBlindspots', phase: 0,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (!blend.blindspots) return '';
      return blend.blindspots.map((s, i) => `${i + 1}. ${L(s.title)}：${L(s.desc)}`).join('\n');
    } },

  { key: 'stress', titleKey: 'ps.secStress', phase: 1,
    render: (snap, data, L) => {
      return DISC_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].stress)}`).join('\n');
    } },

  { key: 'compat', titleKey: 'ps.secRelation', phase: 1,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.compat) return L(blend.compat);
      return DISC_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].relationship)}`).join('\n');
    } },

  { key: 'comm', titleKey: 'ps.secComm', phase: 1,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.comm) return L(blend.comm);
      return '';
    } },

  { key: 'leadership', titleKey: 'ps.secLeadership', phase: 1,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.leadership) return L(blend.leadership);
      return '';
    } },

  { key: 'careerDeep', titleKey: 'ps.secCareer', phase: 1,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.careerDeep) return L(blend.careerDeep);
      return '';
    } },

  { key: 'growthPath', titleKey: 'ps.secGrowth', phase: 2,
    render: (snap, data, L) => {
      let s = DISC_DIMS.map((d) => `${L(data.dims[d].name)}：${L(data.dims[d].growth)}`).join('\n');
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (blend.growthPath) {
        s += '\n\n' + blend.growthPath.map((g, i) => `${L({ zh: `阶段 ${i + 1}`, en: `Stage ${i + 1}` })}：${L(g.stage)} — ${L(g.practice)}`).join('\n');
      }
      return s;
    } },

  { key: 'practices', titleKey: 'ps.secPractices', phase: 2,
    render: (snap, data, L) => {
      const blend = data.blends[snap.primary + snap.secondary] || data.blends.DI;
      if (!blend.practices) return '';
      return blend.practices.map((p, i) => `${i + 1}. ${L(p)}`).join('\n');
    } },

  { key: 'disclaimer', titleKey: 'ps.secDisclaimer', phase: 0,
    render: (snap, data, L) => L({ zh: '本报告基于 DISC 自我报告量表，非临床诊断工具。风格标签是认识自我行为倾向的入口，不是定义或限制。分数为量表相对位置，非人群常模百分位。', en: 'This report is based on the DISC self-report inventory, not a clinical diagnostic tool. Style labels are a doorway to understanding your behavioral tendencies, not a definition or limitation. Scores are scale-relative positions, not population percentiles.' }) },
];
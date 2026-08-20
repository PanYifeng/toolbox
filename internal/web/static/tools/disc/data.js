// DISC 行为风格题库与维度描述（中英双语）。
// questions: 李克特 1-5（1 很不符合 → 5 很符合），reverse:true 反向计分（6-raw）。
// 每维度 4 题，共 16 题；维度百分比 = (sum - min)/(max-min)*100，min=4, max=20。
// dims: name + 三档简版(low/mid/high) + full 完整版深度解析（付费项，邮件送达）。
export default {
  // —— D 支配 Dominance ——
  D1: { text: { zh: '我做事果断，喜欢掌控局面', en: 'I act decisively and like to take charge' }, dim: 'D', reverse: false },
  D2: { text: { zh: '我目标导向，追求结果与效率', en: 'I am goal-driven, focused on results and efficiency' }, dim: 'D', reverse: false },
  D3: { text: { zh: '我不回避挑战与竞争', en: 'I do not shy from challenge or competition' }, dim: 'D', reverse: false },
  D4: { text: { zh: '我倾向顺其自然，不爱掌控', en: 'I prefer to go with the flow, not take charge' }, dim: 'D', reverse: true },
  // —— I 影响 Influence ——
  I1: { text: { zh: '我善于交际，喜欢与人互动', en: 'I am sociable and enjoy interacting with people' }, dim: 'I', reverse: false },
  I2: { text: { zh: '我乐观热情，擅长感染他人', en: 'I am upbeat and enthusiastic, good at motivating others' }, dim: 'I', reverse: false },
  I3: { text: { zh: '我有说服力，善于表达想法', en: 'I am persuasive and articulate my ideas well' }, dim: 'I', reverse: false },
  I4: { text: { zh: '我在人群中常保持安静', en: 'I tend to stay quiet in groups' }, dim: 'I', reverse: true },
  // —— S 稳健 Steadiness ——
  S1: { text: { zh: '我稳定耐心，做事有始有终', en: 'I am steady and patient, seeing things through' }, dim: 'S', reverse: false },
  S2: { text: { zh: '我倾向协作，重视团队和谐', en: 'I lean toward cooperation and value team harmony' }, dim: 'S', reverse: false },
  S3: { text: { zh: '我忠诚可靠，是稳定的支持者', en: 'I am loyal and dependable, a steady supporter' }, dim: 'S', reverse: false },
  S4: { text: { zh: '我享受变化与快节奏', en: 'I enjoy change and a fast pace' }, dim: 'S', reverse: true },
  // —— C 严谨 Conscientiousness ——
  C1: { text: { zh: '我注重精确与质量，追求正确', en: 'I value precision and quality, aiming to be correct' }, dim: 'C', reverse: false },
  C2: { text: { zh: '我善于分析，用逻辑解决问题', en: 'I analyze well and solve problems with logic' }, dim: 'C', reverse: false },
  C3: { text: { zh: '我遵循规则与流程，严谨有序', en: 'I follow rules and procedures, meticulous and orderly' }, dim: 'C', reverse: false },
  C4: { text: { zh: '我不拘小节，凭直觉行事', en: 'I am casual about detail and act on intuition' }, dim: 'C', reverse: true },
  scale: {
    zh: ['很不符合', '不太符合', '一般', '比较符合', '很符合'],
    en: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
  },
  dims: {
    D: {
      name: { zh: '支配型 D', en: 'Dominance (D)' },
      low: { zh: '你倾向协作与共识，少主动掌控。', en: 'You prefer consensus and collaboration, rarely taking charge.' },
      mid: { zh: '你在掌控与协作间视情境切换。', en: 'You switch between leading and collaborating by context.' },
      high: { zh: '你果断直接、目标导向、爱掌控。', en: 'You are decisive, direct, goal-driven, take charge.' },
      full: { zh: '支配型（D）以目标与结果为导向，果断直接、敢于挑战。优势是推动力与决断；盲点是强势易压人、忽略感受。沟通：直接说重点、给选择；管理：放权目标、少干预过程；适合销售、管理、创业。', en: 'Dominance (D) is goal- and result-oriented, decisive and direct, embracing challenge. Strengths: drive and decisiveness. Blind spots: forceful, pressing others, overlooking feelings. Communication: get to the point, offer choices. Management: empower by goals, limit process. Suited to sales, management, founding.' },
    },
    I: {
      name: { zh: '影响型 I', en: 'Influence (I)' },
      low: { zh: '你偏沉稳内敛，少主动表达。', en: 'You are reserved, less prone to self-expression.' },
      mid: { zh: '你在表达与倾听间平衡。', en: 'You balance expression with listening.' },
      high: { zh: '你热情善交际，富感染力与说服力。', en: 'You are warm and sociable, infectious and persuasive.' },
      full: { zh: '影响型（I）热情善交际，富感染力与说服力，重视关系与氛围。优势是激励与连接；盲点是易分心、难收尾、回避冲突。沟通：轻松互动、给认可；管理：多给舞台与社交反馈；适合市场、公关、培训。', en: 'Influence (I) is warm and sociable, infectious and persuasive, valuing relationships and atmosphere. Strengths: motivating and connecting. Blind spots: distractible, hard to finish, conflict-averse. Communication: keep it light, give recognition. Management: offer stage and social feedback. Suited to marketing, PR, training.' },
    },
    S: {
      name: { zh: '稳健型 S', en: 'Steadiness (S)' },
      low: { zh: '你爱变化与快节奏，少求稳。', en: 'You enjoy change and pace, less stability-seeking.' },
      mid: { zh: '你在稳定与变化间灵活调适。', en: 'You flex between stability and change.' },
      high: { zh: '你稳定耐心、协作忠诚、可靠支持。', en: 'You are steady, patient, cooperative, a reliable supporter.' },
      full: { zh: '稳健型（S）稳定耐心、协作忠诚，重视和谐与可靠。优势是执行力与凝聚力；盲点是抗拒突变、不善说不、被动。沟通：温和有礼、给缓冲；管理：提前知会、稳定节奏；适合运营、支持、行政、客服。', en: 'Steadiness (S) is stable, patient, cooperative and loyal, valuing harmony and reliability. Strengths: execution and cohesion. Blind spots: resisting sudden change, hard to say no, passive. Communication: warm and polite, give lead time. Management: forewarn, keep a steady pace. Suited to operations, support, administration, service.' },
    },
    C: {
      name: { zh: '严谨型 C', en: 'Conscientiousness (C)' },
      low: { zh: '你凭直觉、不拘小节。', en: 'You act on intuition, casual about detail.' },
      mid: { zh: '你在严谨与灵活间平衡。', en: 'You balance rigor with flexibility.' },
      high: { zh: '你精确分析、遵循规则、注重质量。', en: 'You are precise, analytical, rule-following, quality-focused.' },
      full: { zh: '严谨型（C）精确分析、遵循规则、注重质量与逻辑。优势是准确与严谨；盲点是过度完美、纠结细节、犹豫。沟通：给数据与依据、少情绪；管理：明确标准、容许思考时间；适合研发、财务、质控、合规。', en: 'Conscientiousness (C) is precise and analytical, rule-following, valuing quality and logic. Strengths: accuracy and rigor. Blind spots: perfectionism, fixating on detail, hesitation. Communication: give data and rationale, less emotion. Management: set clear standards, allow thinking time. Suited to R&D, finance, quality, compliance.' },
    },
  },
};

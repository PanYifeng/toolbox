// 大五人格（OCEAN）题库与维度描述（中英双语）。
// questions: 李克特 1-5 分（1 很不符合 → 5 很符合），reverse:true 的题反向计分（6-raw）。
// 每维度 4 题，共 20 题；维度百分比 = (sum - min) / (max - min) * 100，min=4, max=20。
// dims: 每维度 name + 按高低分三档简版 + full 完整版深度解析（付费项，邮件送达）。
export default {
  // —— 开放性 O ——
  O1: { text: { zh: '我喜欢思考新想法和抽象概念', en: 'I enjoy thinking about new ideas and abstract concepts' }, dim: 'O', reverse: false },
  O2: { text: { zh: '我对艺术、音乐或美的事物很敏感', en: 'I am sensitive to art, music, or beauty' }, dim: 'O', reverse: false },
  O3: { text: { zh: '我富有想象力，常做白日梦', en: 'I have a vivid imagination and often daydream' }, dim: 'O', reverse: false },
  O4: { text: { zh: '我倾向循规蹈矩，按既有方式做事', en: 'I prefer routine and doing things the established way' }, dim: 'O', reverse: true },
  // —— 尽责性 C ——
  C1: { text: { zh: '我做事有条理、爱列计划', en: 'I am organized and like to plan' }, dim: 'C', reverse: false },
  C2: { text: { zh: '我按时完成任务，不拖延', en: 'I finish tasks on time without procrastinating' }, dim: 'C', reverse: false },
  C3: { text: { zh: '我注重细节，力求准确', en: 'I pay attention to detail and aim for accuracy' }, dim: 'C', reverse: false },
  C4: { text: { zh: '我常把事情留到最后一刻', en: 'I often leave things to the last minute' }, dim: 'C', reverse: true },
  // —— 外向性 E ——
  E1: { text: { zh: '我乐于与人交谈，是活跃的', en: 'I enjoy talking with people and am talkative' }, dim: 'E', reverse: false },
  E2: { text: { zh: '我充满活力，热情主动', en: 'I am energetic, warm, and proactive' }, dim: 'E', reverse: false },
  E3: { text: { zh: '我喜欢独处和安静的环境', en: 'I prefer solitude and a quiet environment' }, dim: 'E', reverse: true },
  E4: { text: { zh: '我在人群中感到自在，主动社交', en: 'I feel at ease in crowds and initiate socializing' }, dim: 'E', reverse: false },
  // —— 宜人性 A ——
  A1: { text: { zh: '我关心他人的感受与需要', en: 'I care about others\' feelings and needs' }, dim: 'A', reverse: false },
  A2: { text: { zh: '我乐于助人，倾向合作', en: 'I like helping others and tend to cooperate' }, dim: 'A', reverse: false },
  A3: { text: { zh: '我容易信任他人', en: 'I tend to trust people' }, dim: 'A', reverse: false },
  A4: { text: { zh: '我有时对别人的动机心存怀疑', en: 'I am sometimes suspicious of others\' motives' }, dim: 'A', reverse: true },
  // —— 神经质 N ——
  N1: { text: { zh: '我容易感到焦虑或紧张', en: 'I easily feel anxious or tense' }, dim: 'N', reverse: false },
  N2: { text: { zh: '我的情绪起伏较大', en: 'My moods go up and down a lot' }, dim: 'N', reverse: false },
  N3: { text: { zh: '我常为各种事情担忧', en: 'I often worry about things' }, dim: 'N', reverse: false },
  N4: { text: { zh: '我情绪稳定，不易被扰乱', en: 'I am emotionally stable and not easily upset' }, dim: 'N', reverse: true },
  // 李克特选项标签（1-5）
  scale: {
    zh: ['很不符合', '不太符合', '一般', '比较符合', '很符合'],
    en: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
  },
  dims: {
    O: {
      name: { zh: '开放性', en: 'Openness' },
      low: { zh: '你务实、传统，偏好熟悉与既有方式。', en: 'You are practical and traditional, favoring the familiar.' },
      mid: { zh: '你在务实与好奇之间平衡，既守成也愿尝新。', en: 'You balance pragmatism with curiosity, steady yet open to new.' },
      high: { zh: '你富于想象、好奇、爱探索新想法与艺术。', en: 'You are imaginative, curious, drawn to new ideas and art.' },
      full: { zh: '开放性衡量你对新经验、新想法、艺术与抽象的接受度。高分者富创造力与求知欲，适合创意与研究类工作，但易忽视日常琐事；低分者务实稳健、执行力强，适合规则明确的环境，但可能错过创新机会。建议：高分者把灵感落地为具体行动；低分者偶尔跳出舒适区尝试新体验。', en: 'Openness measures your receptiveness to new experiences, ideas, art, and the abstract. High scorers are creative and curious, suited to creative and research work, but may overlook mundane detail. Low scorers are practical and steady, suited to rule-clear settings, but may miss innovation. Tip: high scorers—ground inspiration in action; low scorers—occasionally step out of routine.' },
    },
    C: {
      name: { zh: '尽责性', en: 'Conscientiousness' },
      low: { zh: '你随性灵活，偏好即兴与弹性。', en: 'You are easygoing and flexible, preferring spontaneity.' },
      mid: { zh: '你在自律与弹性间平衡，能按需调整。', en: 'You balance discipline and flexibility, adapting as needed.' },
      high: { zh: '你自律、有条理、注重细节与目标。', en: 'You are self-disciplined, organized, detail- and goal-oriented.' },
      full: { zh: '尽责性衡量你的自律、条理与目标导向。高分者可靠高效，是团队的中坚，但易过度追求完美而焦虑；低分者灵活随性，抗压好，但易拖延散漫。建议：高分者允许"够好即可"；低分者用清单与截止给自己支架。', en: 'Conscientiousness measures self-discipline, order, and goal orientation. High scorers are reliable and efficient—a team\'s backbone—but may burn out chasing perfection. Low scorers are flexible and resilient, but prone to procrastination. Tip: high scorers—allow "good enough"; low scorers—use lists and deadlines as scaffolding.' },
    },
    E: {
      name: { zh: '外向性', en: 'Extraversion' },
      low: { zh: '你内向安静，从独处中获取能量。', en: 'You are introverted and quiet, recharging in solitude.' },
      mid: { zh: '你在独处与社交间灵活切换。', en: 'You move flexibly between solitude and socializing.' },
      high: { zh: '你外向活跃，从社交中获取能量。', en: 'You are outgoing and active, energized by socializing.' },
      full: { zh: '外向性衡量你从外界社交获取能量的程度。高分者热情主动、善交际，适合销售与公共角色，但易冲动分心；低分者深思独立，适合研究与深度工作，但需留意社交孤立。建议：高分者给自己留独处复盘时间；低分者刻意安排少量高质量社交。', en: 'Extraversion measures how much you draw energy from social engagement. High scorers are warm, proactive, sociable—suited to sales and public roles—but may be impulsive or distracted. Low scorers are thoughtful and independent—suited to research and deep work—but risk isolation. Tip: high scorers—schedule solo reflection; low scorers—intentionally plan a few high-quality social moments.' },
    },
    A: {
      name: { zh: '宜人性', en: 'Agreeableness' },
      low: { zh: '你直言直行，倾向竞争与质疑。', en: 'You are blunt and competitive, prone to question.' },
      mid: { zh: '你在合作与坚持间寻求平衡。', en: 'You balance cooperation with firmness.' },
      high: { zh: '你温和体谅，倾向合作与信任。', en: 'You are warm and empathetic, inclined to cooperate and trust.' },
      full: { zh: '宜人性衡量你的合作、信任与体谅倾向。高分者和善助人，利于团队与关系，但易忽视自身边界、难说不；低分者直言求真，利于公正与谈判，但易显冷漠冲突。建议：高分者练习设定边界；低分者在亲密关系里多一份柔软。', en: 'Agreeableness measures your tendency to cooperate, trust, and empathize. High scorers are kind and helpful—good for teams and relationships—but may neglect boundaries and struggle to say no. Low scorers are blunt and truth-seeking—good for fairness and negotiation—but can seem cold. Tip: high scorers—practice boundaries; low scorers—bring more softness to close relationships.' },
    },
    N: {
      name: { zh: '神经质', en: 'Neuroticism' },
      low: { zh: '你情绪稳定，从容面对压力。', en: 'You are emotionally stable, calm under stress.' },
      mid: { zh: '你情绪有起伏但总体可控。', en: 'Your moods fluctuate but stay mostly manageable.' },
      high: { zh: '你对压力敏感，情绪起伏明显。', en: 'You are stress-sensitive with notable mood swings.' },
      full: { zh: '神经质衡量你体验负面情绪的倾向。高分者敏感、共情强、能预警风险，但易焦虑内耗，需主动情绪管理；低分者冷静抗压，但可能低估风险或他人感受。建议：高分者建立稳定作息、正念与求助渠道；低分者留意他人情绪信号，别只看逻辑。', en: 'Neuroticism measures your tendency to experience negative emotion. High scorers are sensitive and empathetic, good at spotting risk, but prone to anxiety and rumination—manage actively. Low scorers are calm and resilient, but may underweight risk or others\' feelings. Tip: high scorers—build stable routines, mindfulness, and a support network; low scorers—attend to others\' emotional signals, not just logic.' },
    },
  },
};

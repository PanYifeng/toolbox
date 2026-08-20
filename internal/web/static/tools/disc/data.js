// DISC 行为风格题库与维度描述（中英双语）。
// 经典迫选格式（ipsative）：28 组，每组含 D/I/S/C 四个行为描述，用户各选一个"最像我"与"最不像我"。
// 计分：most 计入对应维度正向计数，least 计入负向；pct = 该维度 most 计数 / 组数 * 100。
// 免费版取前 14 组；完整版全部 28 组。主导风格 = most 计数最高的维度。
// dims: name + 三档简版(low/mid/high) + full 完整版深度解析（付费项，邮件送达）。
// 题目文案均为原创，仅参考 DISC 四维度结构，不复制任何受版权保护的正式量表题目。
export default {
  groups: [
    { D: { zh: '我喜欢直奔主题', en: 'I like to get straight to the point' }, I: { zh: '我喜欢成为人群焦点', en: 'I enjoy being the center of attention' }, S: { zh: '我做事稳扎稳打', en: 'I move steadily, step by step' }, C: { zh: '我注重细节与精确', en: 'I focus on detail and accuracy' } },
    { D: { zh: '面对挑战我会迎上去', en: 'I step up to challenges' }, I: { zh: '我能和陌生人迅速热络', en: 'I warm up to strangers quickly' }, S: { zh: '我是个忠诚的伙伴', en: 'I am a loyal partner' }, C: { zh: '我用逻辑分析问题', en: 'I analyze problems with logic' } },
    { D: { zh: '我倾向自己做决定', en: 'I prefer to make the call myself' }, I: { zh: '我说话带着感染力', en: 'I speak with contagious energy' }, S: { zh: '我倾向配合而非主导', en: 'I would rather follow than lead' }, C: { zh: '我遵循规则与流程', en: 'I follow rules and procedures' } },
    { D: { zh: '赢对我来说很重要', en: 'Winning matters to me' }, I: { zh: '我看事情多半往好处想', en: 'I mostly look on the bright side' }, S: { zh: '我有耐心听人说完', en: 'I patiently let people finish' }, C: { zh: '我追求质量胜过速度', en: 'Quality beats speed for me' } },
    { D: { zh: '我说话直接不绕弯', en: 'I speak directly, without hedging' }, I: { zh: '我热衷于认识新朋友', en: 'I love meeting new people' }, S: { zh: '我重视团队和谐', en: 'I value team harmony' }, C: { zh: '我做事前先收集依据', en: 'I gather evidence before acting' } },
    { D: { zh: '我享受掌控全局', en: 'I enjoy being in control' }, I: { zh: '我擅长说服别人', en: 'I am good at persuading others' }, S: { zh: '我情绪起伏不大', en: 'My moods do not swing much' }, C: { zh: '我会反复检查直到无误', en: 'I recheck until it is correct' } },
    { D: { zh: '别人慢吞吞我会急', en: 'Slowness in others frustrates me' }, I: { zh: '我表达情绪很外露', en: 'I show my feelings openly' }, S: { zh: '我会默默支持他人', en: 'I support others quietly' }, C: { zh: '我对数据敏感', en: 'I am sensitive to data' } },
    { D: { zh: '我敢冒经过计算的风险', en: 'I take calculated risks' }, I: { zh: '我喜欢被人认可', en: 'I like being recognized' }, S: { zh: '我做事有始有终', en: 'I see things through to the end' }, C: { zh: '我倾向独立完成任务', en: 'I prefer finishing tasks independently' } },
    { D: { zh: '我把结果看得比过程重', en: 'Results matter more to me than process' }, I: { zh: '我能把气氛炒热', en: 'I can liven up a room' }, S: { zh: '我不喜欢突如其来的变化', en: 'Sudden change unsettles me' }, C: { zh: '我制定标准并遵守', en: 'I set standards and abide by them' } },
    { D: { zh: '我不介意当出头的那个人', en: 'I do not mind being the one out front' }, I: { zh: '我宁愿合作也不独干', en: 'I would rather collaborate than go solo' }, S: { zh: '我倾向与人和气相处', en: 'I aim to get along smoothly' }, C: { zh: '我说话谨慎、字斟句酌', en: 'I choose words carefully' } },
    { D: { zh: '争论时我不退缩', en: 'I do not back down in arguments' }, I: { zh: '我说话绘声绘色', en: 'I tell stories vividly' }, S: { zh: '我把承诺看得很重', en: 'I take commitments seriously' }, C: { zh: '我不喜欢含糊其辞', en: 'Vagueness bothers me' } },
    { D: { zh: '我设定高目标并推进', en: 'I set high goals and drive them forward' }, I: { zh: '我记人名很有一套', en: 'I am good with names' }, S: { zh: '我宁可慢一点也要稳', en: 'Slow but steady is my way' }, C: { zh: '我能把复杂事物拆解分析', en: 'I can break down complexity to analyze' } },
    { D: { zh: '我讨厌被微观管理', en: 'I hate being micromanaged' }, I: { zh: '我做事凭热情驱动', en: 'Enthusiasm drives my work' }, S: { zh: '我是可靠的执行者', en: 'I am a reliable executor' }, C: { zh: '我倾向避免出错而非抢快', en: 'I would rather avoid errors than rush' } },
    { D: { zh: '行动比讨论更让我踏实', en: 'Action grounds me more than discussion' }, I: { zh: '我不喜欢沉闷的沉默', en: 'I dislike dull silence' }, S: { zh: '我避免与人正面冲突', en: 'I avoid head-on conflict' }, C: { zh: '我做事井然有序', en: 'I work in an orderly way' } },
    { D: { zh: '我能对人说"不"且不内疚', en: 'I can say no without guilt' }, I: { zh: '我倾向先建立关系再谈事', en: 'I build rapport before business' }, S: { zh: '我习惯于稳定的节奏', en: 'I am used to a steady rhythm' }, C: { zh: '我以客观事实为依据', en: 'I lean on objective facts' } },
    { D: { zh: '拍板定夺对我不是负担', en: 'Making the final call does not weigh on me' }, I: { zh: '我容易被新鲜事物吸引', en: 'Novelty draws me in' }, S: { zh: '我愿意为他人调整自己', en: 'I will adjust myself for others' }, C: { zh: '我对风险持谨慎态度', en: 'I am cautious about risk' } },
    { D: { zh: '我希望别人跟上我的节奏', en: 'I expect others to match my pace' }, I: { zh: '我乐于在众人面前表达', en: 'I am happy to speak to a crowd' }, S: { zh: '我擅长倾听多过表达', en: 'I listen more than I talk' }, C: { zh: '我喜欢把方法文档化', en: 'I like documenting methods' } },
    { D: { zh: '困难面前我先想怎么攻克', en: 'Hard problems make me think how to crack them' }, I: { zh: '我相信乐观能感染团队', en: 'I believe optimism spreads through teams' }, S: { zh: '我喜欢可预测的日常', en: 'I like predictable routines' }, C: { zh: '我坚持用正确的方式做事', en: 'I insist on doing things the right way' } },
    { D: { zh: '我倾向自己掌舵', en: 'I prefer to steer the ship' }, I: { zh: '我喜欢给人留下印象', en: 'I like leaving an impression' }, S: { zh: '我对人不轻易下判断', en: 'I do not judge people quickly' }, C: { zh: '我能看出方案的漏洞', en: 'I can spot flaws in a plan' } },
    { D: { zh: '我会主动争取更多', en: 'I proactively ask for more' }, I: { zh: '我用语言激励他人', en: 'I motivate others with words' }, S: { zh: '我做决定前会反复权衡', en: 'I weigh things a lot before deciding' }, C: { zh: '我倾向先计划再动手', en: 'I plan before I act' } },
    { D: { zh: '我把时间看得很紧', en: 'I treat time as tight' }, I: { zh: '我朋友圈子很大', en: 'I keep a wide circle of friends' }, S: { zh: '我能把纷争化解于温和', en: 'I defuse conflict gently' }, C: { zh: '我对低质量工作难以容忍', en: 'I have low tolerance for sloppy work' } },
    { D: { zh: '"不可能"吓不退我', en: 'The word "impossible" does not scare me off' }, I: { zh: '我很难长时间安静独处', en: 'Long quiet solitude is hard for me' }, S: { zh: '我倾向长期留在熟悉的环境', en: 'I stay long in familiar settings' }, C: { zh: '我把准确看得比人情重', en: 'Accuracy outweighs sentiment for me' } },
    { D: { zh: '我看重效率胜过和谐', en: 'Efficiency beats harmony for me' }, I: { zh: '我常主动开启对话', en: 'I often start conversations' }, S: { zh: '我会记得身边人的需要', en: 'I remember the needs of those around me' }, C: { zh: '我习惯质疑"向来如此"', en: 'I question the phrase "that is how it has always been"' } },
    { D: { zh: '我会先问"什么时候要"', en: 'I first ask "when is it due"' }, I: { zh: '我的直觉感受很重要', en: 'My gut feeling matters a lot to me' }, S: { zh: '我把"在一起"看得很重要', en: 'Being together matters a lot to me' }, C: { zh: '我会优先排好优先级', en: 'I prioritize rigorously first' } },
    { D: { zh: '别人争执时我能镇住场面', en: 'I can calm a heated room' }, I: { zh: '我喜欢有舞台的场合', en: 'I enjoy settings with a stage' }, S: { zh: '我不喜欢被人推着赶', en: 'I dislike being rushed' }, C: { zh: '我对人保持专业距离', en: 'I keep a professional distance' } },
    { D: { zh: '我以目标倒推安排事情', en: 'I plan backward from the goal' }, I: { zh: '我用笑容和肢体语言拉近距离', en: 'I bridge gaps with smiles and gestures' }, S: { zh: '我对重复性工作也不厌烦', en: 'Repetitive work does not bore me' }, C: { zh: '我相信流程能减少失误', en: 'I believe process reduces errors' } },
    { D: { zh: '我相信强势推动能成事', en: 'I believe pushing hard gets things done' }, I: { zh: '我对人感兴趣多过对事', en: 'I am more into people than tasks' }, S: { zh: '我宁愿妥协也不让关系破裂', en: 'I would compromise to save a relationship' }, C: { zh: '我会把任务做到自己满意才交', en: 'I deliver only when it satisfies me' } },
    { D: { zh: '我把底线守得很清楚', en: 'I keep my bottom line clear' }, I: { zh: '我相信氛围好事情就成', en: 'I believe good vibes make things work' }, S: { zh: '我用耐心换取信任', en: 'I earn trust with patience' }, C: { zh: '我宁慢而准，不快而错', en: 'I would rather be slow and right than fast and wrong' } },
  ],
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

// 佛教文化数据：知识内容（基于维基百科及公开权威资料整理）+ 测验题库。
// 内容仅供文化学习参考，非宗教义理权威阐释。

export const meta = {
  themeKey: 'buddhism',
  source: { zh: '内容综合维基百科及公开权威资料整理，仅供文化学习参考。', en: 'Compiled from Wikipedia and public authoritative sources, for cultural learning reference only.' },
};

// sections 知识章节
export const sections = [
  {
    title: { zh: '起源与创立', en: 'Origin and Founding' },
    body: {
      zh: '佛教约公元前 6 至前 5 世纪起源于古印度（今尼泊尔与印度北部一带）。创立者悉达多·乔达摩（Siddhārtha Gautama）为释迦族王子，相传见生老病死之苦后出家修行，约 35 岁时于菩提树下觉悟，被称为"佛陀"（觉者）。其核心教义围绕苦、集、灭、道"四圣谛"与"八正道"，主张通过正见、正思维、正语等八种正当修持断除烦恼、趋向涅槃。',
      en: 'Buddhism arose around the 6th–5th century BCE in ancient India (modern Nepal and northern India). Its founder, Siddhārtha Gautama, was a prince of the Shakya clan who renounced palace life after encountering the sufferings of birth, aging, sickness and death. At about 35 he attained awakening beneath the Bodhi tree and became known as the "Buddha" (the Awakened One). The core teaching centers on the Four Noble Truths and the Eightfold Path, guiding practitioners to eliminate suffering and approach nirvana.',
    },
  },
  {
    title: { zh: '在中国的传播与发展', en: 'Spread and Development in China' },
    body: {
      zh: '佛教约于两汉之际（公元 1 世纪前后）经西域陆上丝绸之路与海上路线传入中国。东汉洛阳白马寺相传为中国最早的佛寺。魏晋南北朝时期译经大兴，鸠摩罗什等译师系统汉译大量经典；隋唐时期形成天台、华严、净土、禅（Chan）、律、密等中国化宗派，佛教与儒道思想深度融合，深刻影响哲学、艺术、文学与民俗。藏传佛教则于 7 世纪起在西藏地区发展，形成独特的修学体系。',
      en: 'Buddhism entered China around the 1st century CE via the overland Silk Road and maritime routes. The White Horse Temple in Luoyang is traditionally regarded as China’s first Buddhist monastery. During the Wei-Jin and Northern-Southern dynasties, translation of scriptures flourished under masters such as Kumarajiva. In the Sui and Tang eras, sinicized schools emerged—Tiantai, Huayan, Pure Land, Chan (Zen), Vinaya, and Esoteric—deeply shaping Chinese philosophy, art, literature and folk culture. Tibetan Buddhism developed from the 7th century onward with its own distinct tradition.',
    },
  },
  {
    title: { zh: '相关故事与文化象征', en: 'Stories and Cultural Symbols' },
    body: {
      zh: '佛教经典与传说中有大量寓意深远的故事。如"舍身饲虎"讲述萨埵太子慈悲舍己；"九色鹿"劝人守信不贪；"盲人摸象"喻指对真理的认知局限。常见象征物包括：法轮（Dharmachakra，象征教法流传）、莲花（出淤泥而不染，喻清净觉悟）、菩提树（觉悟之处）、卐字（吉祥万德之所集）。这些故事与象征在东亚艺术、建筑与文学中长期流传，承载着慈悲、智慧与平和的精神。',
      en: 'Buddhist scriptures and legends contain many allegorical tales: the prince who offered himself to feed a starving tigress teaches compassion; the nine-colored deer urges honesty and gratitude; the blind men and the elephant illustrates the limits of partial understanding. Common symbols include the Dharma wheel (teaching’s continuous flow), the lotus (purity arising from defilement), the Bodhi tree (place of awakening), and the swastika/卍 (auspicious accumulation of virtue). These stories and symbols have shaped East Asian art, architecture and literature, carrying ideals of compassion, wisdom and peace.',
    },
  },
];

// quiz 题库（基于公认史实，可扩充至 300 题）
export const quiz = [
  {
    q: { zh: '佛教的创立者是？', en: 'Who founded Buddhism?' },
    options: [{ zh: '悉达多·乔达摩', en: 'Siddhārtha Gautama' }, { zh: '耶稣', en: 'Jesus' }, { zh: '穆罕默德', en: 'Muhammad' }, { zh: '老子', en: 'Laozi' }],
    answer: 0,
  },
  {
    q: { zh: '佛教起源于哪个地区？', en: 'Where did Buddhism originate?' },
    options: [{ zh: '古印度', en: 'Ancient India' }, { zh: '阿拉伯半岛', en: 'Arabian Peninsula' }, { zh: '罗马帝国', en: 'Roman Empire' }, { zh: '中国', en: 'China' }],
    answer: 0,
  },
  {
    q: { zh: '佛教的核心教义包含"四圣谛"和？', en: 'Core teaching includes the Four Noble Truths and the ___?' },
    options: [{ zh: '八正道', en: 'Eightfold Path' }, { zh: '五功', en: 'Five Pillars' }, { zh: '十诫', en: 'Ten Commandments' }, { zh: '四书', en: 'Four Books' }],
    answer: 0,
  },
  {
    q: { zh: '相传中国最早的佛寺是？', en: 'Traditionally regarded as China’s first Buddhist temple?' },
    options: [{ zh: '洛阳白马寺', en: 'White Horse Temple, Luoyang' }, { zh: '少林寺', en: 'Shaolin Temple' }, { zh: '灵隐寺', en: 'Lingyin Temple' }, { zh: '法门寺', en: 'Famen Temple' }],
    answer: 0,
  },
  {
    q: { zh: '佛教约于何时传入中国？', en: 'Around when did Buddhism enter China?' },
    options: [{ zh: '公元 1 世纪前后', en: 'Around the 1st century CE' }, { zh: '公元 7 世纪', en: '7th century CE' }, { zh: '公元前 6 世纪', en: '6th century BCE' }, { zh: '公元 13 世纪', en: '13th century CE' }],
    answer: 0,
  },
  {
    q: { zh: '以下哪个是中国化佛教宗派？', en: 'Which is a sinicized Buddhist school?' },
    options: [{ zh: '禅宗', en: 'Chan (Zen)' }, { zh: '逊尼派', en: 'Sunni' }, { zh: '天主教', en: 'Catholicism' }, { zh: '道教', en: 'Daoism' }],
    answer: 0,
  },
  {
    q: { zh: '法轮（Dharmachakra）象征什么？', en: 'What does the Dharma wheel symbolize?' },
    options: [{ zh: '教法流传', en: 'The flow of teaching' }, { zh: '财富', en: 'Wealth' }, { zh: '战争', en: 'War' }, { zh: '王权', en: 'Kingship' }],
    answer: 0,
  },
  {
    q: { zh: '莲花在佛教中喻指？', en: 'The lotus symbolizes ___ in Buddhism.' },
    options: [{ zh: '清净觉悟', en: 'Purity and awakening' }, { zh: '贪婪', en: 'Greed' }, { zh: '愤怒', en: 'Anger' }, { zh: '死亡', en: 'Death' }],
    answer: 0,
  },
  {
    q: { zh: '被誉为"觉悟之处"的是？', en: 'Regarded as the place of awakening?' },
    options: [{ zh: '菩提树', en: 'Bodhi tree' }, { zh: '无花果树', en: 'Fig tree' }, { zh: '银杏树', en: 'Ginkgo tree' }, { zh: '松树', en: 'Pine tree' }],
    answer: 0,
  },
  {
    q: { zh: '以下哪位是著名的西域佛经译师？', en: 'Which is a renowned translator of scriptures from the Western Regions?' },
    options: [{ zh: '鸠摩罗什', en: 'Kumarajiva' }, { zh: '利玛窦', en: 'Matteo Ricci' }, { zh: '王羲之', en: 'Wang Xizhi' }, { zh: '孔子', en: 'Confucius' }],
    answer: 0,
  },
  {
    q: { zh: '藏传佛教约于何时在西藏发展？', en: 'Tibetan Buddhism developed from around when?' },
    options: [{ zh: '7 世纪', en: '7th century' }, { zh: '1 世纪', en: '1st century' }, { zh: '15 世纪', en: '15th century' }, { zh: '19 世纪', en: '19th century' }],
    answer: 0,
  },
  {
    q: { zh: '"盲人摸象"的故事喻指？', en: 'The "blind men and the elephant" illustrates?' },
    options: [{ zh: '认知的局限', en: 'Limits of partial understanding' }, { zh: '勇气', en: 'Courage' }, { zh: '财富', en: 'Wealth' }, { zh: '长寿', en: 'Longevity' }],
    answer: 0,
  },
  {
    q: { zh: '佛陀原属哪个氏族？', en: 'The Buddha belonged to which clan?' },
    options: [{ zh: '释迦族', en: 'Shakya clan' }, { zh: '孔氏', en: 'Kong clan' }, { zh: '李氏', en: 'Li clan' }, { zh: '姬氏', en: 'Ji clan' }],
    answer: 0,
  },
  {
    q: { zh: '佛教主张趋向的解脱境界称？', en: 'The state of liberation Buddhism points to is?' },
    options: [{ zh: '涅槃', en: 'Nirvana' }, { zh: '天堂', en: 'Heaven' }, { zh: '轮回', en: 'Samsara' }, { zh: '长生', en: 'Immortality' }],
    answer: 0,
  },
  {
    q: { zh: '卐 字在佛教中寓意？', en: 'The 卍 symbol signifies?' },
    options: [{ zh: '吉祥万德', en: 'Auspicious virtue' }, { zh: '灾祸', en: 'Disaster' }, { zh: '战争', en: 'War' }, { zh: '悔恨', en: 'Regret' }],
    answer: 0,
  },
];

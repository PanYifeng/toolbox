// 佛教文化数据：知识内容（综合维基百科、D.T. 铃木《禅学论文集》Project Gutenberg 公版
// 及公开权威资料整理）+ 测验题库。内容仅供文化学习参考，非宗教义理权威阐释。

export const meta = {
  themeKey: 'buddhism',
  source: {
    zh: '内容综合维基百科、D.T. 铃木《禅学论文集》（Project Gutenberg 公共领域）及公开权威资料整理，仅供文化学习参考。',
    en: 'Compiled from Wikipedia, D.T. Suzuki’s "Essays in Zen Buddhism" (Project Gutenberg, public domain) and public authoritative sources, for cultural learning reference only.',
  },
};

// sections 知识章节
export const sections = [
  {
    title: { zh: '起源与创立', en: 'Origin and Founding' },
    body: {
      zh: '佛教约公元前 6 至前 5 世纪起源于古印度（今尼泊尔与印度北部一带）。创立者悉达多·乔达摩（Siddhārtha Gautama）为释迦族王子，相传见生老病死之苦后出家修行，约 35 岁时于菩提树下觉悟，被称为"佛陀"（觉者）。其核心教义围绕苦、集、灭、道"四圣谛"与"八正道"，主张通过正见、正思维、正语等八种正当修持断除烦恼、趋向涅槃。铃木指出，佛陀在尼连禅河畔菩提树下所证悟的，正是后世禅宗所谓"悟"（satori）的源头。',
      en: 'Buddhism arose around the 6th–5th century BCE in ancient India (modern Nepal and northern India). Its founder, Siddhārtha Gautama, was a prince of the Shakya clan who renounced palace life after encountering the sufferings of birth, aging, sickness and death. At about 35 he attained awakening beneath the Bodhi tree and became known as the "Buddha" (the Awakened One). The core teaching centers on the Four Noble Truths and the Eightfold Path. As Suzuki notes, the realization under the Bodhi-tree by the River Nairañjanā is the very source of what Zen later calls "satori" (enlightenment).',
    },
  },
  {
    title: { zh: '在中国的传播与禅宗的兴起', en: 'Spread in China and the Rise of Zen' },
    body: {
      zh: '佛教约于两汉之际（公元 1 世纪前后）经丝绸之路传入中国，东汉洛阳白马寺相传为最早佛寺。据铃木《禅学论文集》，禅（Zen）之为中国佛教，始于菩提达摩（Bodhi-Dharma，卒于 528 年）入华播下禅的种子，并将《楞伽经》授与首座弟子。约二百年后禅风大成，六祖慧能（637—713）被视为禅宗的"真正中国创立者"——经他及其门下，禅脱去印度外衣，呈现彻底中国化的表达。唐代（618—906）禅宗几乎"凯旋式"遍行中土，高僧辈出、立寺度僧；宋代（960—1279）臻于鼎盛；至元（1280—1367）、明（1368—1661），中国佛教几与禅宗等同。达摩之教主张直探佛心、舍弃外在形式与概念分析，这成为中国禅的根本精神。',
      en: 'Buddhism entered China around the 1st century CE via the Silk Road; the White Horse Temple in Luoyang is traditionally the first monastery. According to Suzuki’s Essays, Zen became the Buddhism of China through Bodhi-Dharma (died 528), who sowed the seeds of Zen and handed the Laṅkāvatāra Sūtra to his first disciple. About two centuries later the seeds bore fruit: Hui-nêng (637–713), the sixth patriarch, is regarded as the real Chinese founder of Zen, through whom Zen cast off its Indian garment into a thoroughly Chinese expression. During the Tang (618–906) Zen had a near-triumphal march through the land; under the Sung (960–1279) it reached its height; by the Yuan (1280–1367) and Ming (1368–1661) Chinese Buddhism was practically identified with Zen. Bodhi-Dharma’s teaching—to look directly into the essence of the Buddha’s teaching, discarding outward forms and conceptual analysis—became the spirit of Chinese Zen.',
    },
  },
  {
    title: { zh: '悟（Satori）：禅的核心体验', en: 'Satori: The Core Experience of Zen' },
    body: {
      zh: '铃木强调："没有悟，就没有禅"——悟是禅的始终。悟（日文 satori，中文"悟" wu）即佛陀与印度弟子所说的"无上正等正觉"（anuttara-samyak-saṁbodhi）的别名。铃木将其界定为"对事物本性的直觉观照"，有别于分析性或逻辑性的理解；它并非获得新知识，而是整个世界以意料之外的角度被重新觉知——山河依旧，却"再不是旧日模样"。禅宗著名的传法故事：五祖弘忍门下五百弟子，唯独不识字的行者慧能得传衣钵为六祖，因其"不解佛法，唯悟大道"。这则公案点明：禅重直悟本心，而非经论记诵。',
      en: 'Suzuki stresses that "there is no Zen without satori"—it is the Alpha and Omega of Zen. Satori (Chinese wu) is another name for Enlightenment (anuttara-samyak-saṁbodhi). He defines it as "an intuitive looking into the nature of things" in contrast to analytical or logical understanding: not new knowledge, but the whole world perceived from an unexpected angle—streams and fires remain, yet "it is never the same one again." A famous transmission story: of the fifth patriarch Hung-jên’s five hundred disciples, only the lay follower Hui-nêng—who could not even read—received the robe of transmission as sixth patriarch, for "he understood the Way only and no other thing." The point: Zen prizes direct awakening of one’s own mind over memorizing scriptures.',
    },
  },
  {
    title: { zh: '相关故事与文化象征', en: 'Stories and Cultural Symbols' },
    body: {
      zh: '《十牛图》（十牛图颂）是禅宗最著名的修行寓言，以牧童寻牛的十幅图画喻修心历程：寻牛、见迹、见牛、得牛、牧牛、骑牛归家、忘牛存人、人牛俱忘、返本还源、入廛垂手——从初发心寻觅自性，到物我两忘、终而入市度人。其他常见象征包括：法轮（Dharmachakra，教法流传）、莲花（出淤泥而不染，喻清净觉悟）、菩提树（觉悟之处）、卐字（吉祥万德）。盲人摸象喻认知局限，舍身饲虎、九色鹿等本生故事则承载慈悲与守信的精神。这些故事与象征长期浸润东亚艺术与文学。',
      en: 'The Ten Ox-herding (Cow-herding) Pictures are Zen’s best-known allegory of practice: ten stages from seeking the ox, seeing its tracks, seeing and catching it, herding it home, to ox-forgotten-self-remains, both ox and self forgotten, returning to the source, and finally entering the marketplace with helping hands—a journey from first seeking one’s true nature to forgetting self and serving the world. Other symbols include the Dharma wheel (teaching’s flow), the lotus (purity from defilement), the Bodhi tree (place of awakening), and the 卍 (auspicious virtue). Parables like the blind men and the elephant, and the jataka tales of selfless compassion, have long shaped East Asian art and literature.',
    },
  },
];

// quiz 题库（基于公认史实与 D.T. 铃木《禅学论文集》，可继续扩充至 300 题）
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
    q: { zh: '佛教主张趋向的解脱境界称？', en: 'The state of liberation Buddhism points to is?' },
    options: [{ zh: '涅槃', en: 'Nirvana' }, { zh: '天堂', en: 'Heaven' }, { zh: '轮回', en: 'Samsara' }, { zh: '长生', en: 'Immortality' }],
    answer: 0,
  },
  {
    q: { zh: '卐 字在佛教中寓意？', en: 'The 卍 symbol signifies?' },
    options: [{ zh: '吉祥万德', en: 'Auspicious virtue' }, { zh: '灾祸', en: 'Disaster' }, { zh: '战争', en: 'War' }, { zh: '悔恨', en: 'Regret' }],
    answer: 0,
  },
  {
    q: { zh: '把禅的种子带入中国、卒于 528 年的是？', en: 'Who brought the seeds of Zen to China and died in 528?' },
    options: [{ zh: '菩提达摩', en: 'Bodhi-Dharma' }, { zh: '慧能', en: 'Hui-nêng' }, { zh: '玄奘', en: 'Xuanzang' }, { zh: '鸠摩罗什', en: 'Kumarajiva' }],
    answer: 0,
  },
  {
    q: { zh: '菩提达摩授与首座弟子的经典是？', en: 'Which sutra did Bodhi-Dharma hand to his first disciple?' },
    options: [{ zh: '《楞伽经》', en: 'Laṅkāvatāra Sūtra' }, { zh: '《金刚经》', en: 'Diamond Sūtra' }, { zh: '《法华经》', en: 'Lotus Sūtra' }, { zh: '《心经》', en: 'Heart Sūtra' }],
    answer: 0,
  },
  {
    q: { zh: '被视为禅宗"真正中国创立者"的是？', en: 'Regarded as the real Chinese founder of Zen?' },
    options: [{ zh: '六祖慧能', en: 'Hui-nêng, the sixth patriarch' }, { zh: '菩提达摩', en: 'Bodhi-Dharma' }, { zh: '神秀', en: 'Shen-hsiu' }, { zh: '弘忍', en: 'Hung-jên' }],
    answer: 0,
  },
  {
    q: { zh: '慧能是禅宗第几祖？', en: 'Hui-nêng was the ___ patriarch of Zen?' },
    options: [{ zh: '第六祖', en: 'Sixth' }, { zh: '第五祖', en: 'Fifth' }, { zh: '第一祖', en: 'First' }, { zh: '第三祖', en: 'Third' }],
    answer: 0,
  },
  {
    q: { zh: '禅宗在唐代几乎"凯旋式"遍行中土，唐代纪年为？', en: 'Zen had a triumphal march in the Tang dynasty, dated?' },
    options: [{ zh: '618—906', en: '618–906' }, { zh: '960—1279', en: '960–1279' }, { zh: '1368—1644', en: '1368–1644' }, { zh: '221—206 BC', en: '221–206 BCE' }],
    answer: 0,
  },
  {
    q: { zh: '禅宗臻于鼎盛是在哪个朝代？', en: 'Zen reached its height under which dynasty?' },
    options: [{ zh: '宋代', en: 'Sung' }, { zh: '汉代', en: 'Han' }, { zh: '清代', en: 'Qing' }, { zh: '商代', en: 'Shang' }],
    answer: 0,
  },
  {
    q: { zh: '禅宗的"悟"（satori）源自佛陀在何处证悟？', en: 'Zen’s "satori" traces back to the Buddha’s awakening where?' },
    options: [{ zh: '菩提树下', en: 'Under the Bodhi tree' }, { zh: '山顶', en: 'On a mountain peak' }, { zh: '河中', en: 'In a river' }, { zh: '宫殿', en: 'In a palace' }],
    answer: 0,
  },
  {
    q: { zh: '铃木对"悟"的界定是？', en: 'Suzuki defines satori as?' },
    options: [{ zh: '对事物本性的直觉观照', en: 'Intuitive looking into the nature of things' }, { zh: '逻辑推理', en: 'Logical reasoning' }, { zh: '背诵经文', en: 'Reciting scriptures' }, { zh: '财富积累', en: 'Accumulating wealth' }],
    answer: 0,
  },
  {
    q: { zh: '"没有悟就没有禅"出自哪位禅学家的强调？', en: '"There is no Zen without satori" was stressed by which Zen scholar?' },
    options: [{ zh: '铃木大拙', en: 'D.T. Suzuki' }, { zh: '达摩', en: 'Bodhi-Dharma' }, { zh: '慧能', en: 'Hui-nêng' }, { zh: '弘忍', en: 'Hung-jên' }],
    answer: 0,
  },
  {
    q: { zh: '相传传衣钵给慧能的禅宗五祖是？', en: 'The fifth patriarch who transmitted the robe to Hui-nêng was?' },
    options: [{ zh: '弘忍', en: 'Hung-jên' }, { zh: '神秀', en: 'Shen-hsiu' }, { zh: '马祖', en: 'Ma-tsu' }, { zh: '临济', en: 'Lin-chi' }],
    answer: 0,
  },
  {
    q: { zh: '慧能得传衣钵，据载因其？', en: 'Hui-nêng received the robe because, as recorded, he?' },
    options: [{ zh: '不解佛法、唯悟大道', en: 'Understood the Way only, not Buddhist lore' }, { zh: '通晓三藏', en: 'Mastered the Tripiṭaka' }, { zh: '擅长辩论', en: 'Excelled at debate' }, { zh: '出身皇族', en: 'Was of royal birth' }],
    answer: 0,
  },
  {
    q: { zh: '《十牛图》共几幅？', en: 'How many pictures are in the Ten Ox-herding series?' },
    options: [{ zh: '十幅', en: 'Ten' }, { zh: '八幅', en: 'Eight' }, { zh: '十二幅', en: 'Twelve' }, { zh: '六幅', en: 'Six' }],
    answer: 0,
  },
  {
    q: { zh: '《十牛图》第一幅（修行初阶）是？', en: 'The first stage of the Ten Ox-herding Pictures is?' },
    options: [{ zh: '寻牛', en: 'Searching for the ox' }, { zh: '忘牛存人', en: 'Ox forgotten, self remains' }, { zh: '返本还源', en: 'Returning to the source' }, { zh: '入廛垂手', en: 'Entering the marketplace' }],
    answer: 0,
  },
  {
    q: { zh: '《十牛图》最后一幅寓意？', en: 'The last ox-herding picture symbolizes?' },
    options: [{ zh: '入市度人', en: 'Entering the marketplace to help others' }, { zh: '隐居避世', en: 'Retreating from the world' }, { zh: '积累财富', en: 'Accumulating wealth' }, { zh: '称王称帝', en: 'Becoming a ruler' }],
    answer: 0,
  },
  {
    q: { zh: '达摩之教的根本主张是？', en: 'Bodhi-Dharma’s fundamental teaching was to?' },
    options: [{ zh: '直探佛心，舍弃外在形式', en: 'Look directly into the Buddha-mind, drop outward forms' }, { zh: '广建佛像', en: 'Build many Buddha images' }, { zh: '严守种姓', en: 'Uphold caste distinctions' }, { zh: '祭祀天神', en: 'Offer sacrifices to gods' }],
    answer: 0,
  },
];

// 伊斯兰文化数据：知识内容（基于维基百科及公开权威资料整理）+ 测验题库。
// 内容仅供文化学习参考，非宗教义理权威阐释。

export const meta = {
  themeKey: 'islam',
  source: { zh: '内容综合维基百科及公开权威资料整理，仅供文化学习参考。', en: 'Compiled from Wikipedia and public authoritative sources, for cultural learning reference only.' },
};

export const sections = [
  {
    title: { zh: '起源与创立', en: 'Origin and Founding' },
    body: {
      zh: '伊斯兰教兴起于公元 7 世纪初的阿拉伯半岛。先知穆罕默德（约 570—632 年）于 40 岁起在麦加接受启示，传播"认主独一"的信仰，其启示后汇编为《古兰经》。622 年他率信众自麦加迁至麦地那（史称"希吉拉"， marking 伊斯兰历元年）。核心信仰为"五功"：念（作证词）、礼（每日五次礼拜）、斋（莱麦丹月斋戒）、课（天课施舍）、朝（有条件者朝觐麦加）。',
      en: 'Islam arose in the early 7th century CE on the Arabian Peninsula. The Prophet Muhammad (c. 570–632) began receiving revelations in Mecca at about age 40, preaching the oneness of God (tawhid); these revelations were later compiled into the Quran. In 622 he led his followers from Mecca to Medina—the Hijra, marking year 1 of the Islamic calendar. Core practice is the Five Pillars: the testimony of faith, five daily prayers, fasting during Ramadan, almsgiving (zakat), and the pilgrimage to Mecca for those able.',
    },
  },
  {
    title: { zh: '在中国的传播与发展', en: 'Spread and Development in China' },
    body: {
      zh: '伊斯兰教约于唐代（公元 7 世纪）经陆海丝绸之路传入中国。相传唐太宗时期有穆斯林商旅来华，广州怀圣寺与光塔、泉州清净寺、扬州仙鹤寺、杭州凤凰寺并称中国沿海四大古清真寺。元代大量中亚、波斯穆斯林东来，称"色目人"，与本地居民长期交融，逐渐形成以汉语为母语、信仰伊斯兰教的"回族"等民族。如今中国有回、维吾尔、哈萨克等 10 个民族普遍信仰伊斯兰教，清真寺建筑亦呈现阿拉伯与中国传统风格交融的特色。',
      en: 'Islam reached China around the 7th century (Tang dynasty) via the Silk Roads. Muslim merchants reportedly arrived during the reign of Emperor Taizong; the Huaisheng Mosque in Guangzhou, the Qingjing Mosque in Quanzhou, the Xianhe Mosque in Yangzhou and the Fenghuang Mosque in Hangzhou are famed ancient coastal mosques. During the Yuan dynasty many Central Asian and Persian Muslims migrated east and intermingled with local populations, gradually forming the Hui people—Chinese-speaking Muslims. Today ten ethnic groups in China, including Hui, Uyghur and Kazakh, predominantly follow Islam, and mosque architecture often blends Arab and Chinese styles.',
    },
  },
  {
    title: { zh: '相关故事与文化象征', en: 'Stories and Cultural Symbols' },
    body: {
      zh: '伊斯兰传统中"夜行登霄"讲述先知自麦加夜行至耶路撒冷、再升霄的传说，耶路撒冷因而成为伊斯兰第三圣地。常见的文化象征包括：新月（信仰的标志，常见于清真寺顶端）、《古兰经》（神圣经典）、阿拉伯书法（以优美的库法体、三一书体抄写经文，被视为神圣艺术）、克尔白（位于麦加禁寺中央的方形建筑，朝觐与礼拜的朝向）。伊斯兰艺术强调几何纹样与植物纹（阿拉伯式花纹），以避免偶像崇拜，体现出对无限与秩序的美的追求。',
      en: 'Islamic tradition recounts the "Isra and Mi‘raj," the Prophet’s night journey from Mecca to Jerusalem and ascension through the heavens, making Jerusalem Islam’s third holiest city. Common symbols include the crescent (a sign of faith often atop mosques), the Quran (the holy scripture), Arabic calligraphy (sacred art in Kufic and Thuluth scripts), and the Kaaba—the cuboid building at the center of the Sacred Mosque in Mecca, toward which Muslims pray and which is the focal point of the Hajj. Islamic art emphasizes geometric and vegetal arabesque patterns, avoiding idolatry and expressing a pursuit of infinity and order.',
    },
  },
];

export const quiz = [
  {
    q: { zh: '伊斯兰教兴起于哪个世纪？', en: 'In which century did Islam arise?' },
    options: [{ zh: '公元 7 世纪', en: '7th century CE' }, { zh: '公元前 6 世纪', en: '6th century BCE' }, { zh: '公元 1 世纪', en: '1st century CE' }, { zh: '公元 15 世纪', en: '15th century CE' }],
    answer: 0,
  },
  {
    q: { zh: '伊斯兰教的先知是？', en: 'Who is the Prophet of Islam?' },
    options: [{ zh: '穆罕默德', en: 'Muhammad' }, { zh: '耶稣', en: 'Jesus' }, { zh: '摩西', en: 'Moses' }, { zh: '佛陀', en: 'Buddha' }],
    answer: 0,
  },
  {
    q: { zh: '伊斯兰教的神圣经典是？', en: 'The holy scripture of Islam is?' },
    options: [{ zh: '《古兰经》', en: 'The Quran' }, { zh: '《圣经》', en: 'The Bible' }, { zh: '《道德经》', en: 'Tao Te Ching' }, { zh: '《奥义书》', en: 'Upanishads' }],
    answer: 0,
  },
  {
    q: { zh: '"希吉拉"指什么？', en: 'What does "Hijra" refer to?' },
    options: [{ zh: '自麦加迁至麦地那', en: 'Migration from Mecca to Medina' }, { zh: '朝觐', en: 'The pilgrimage' }, { zh: '斋戒', en: 'Fasting' }, { zh: '礼拜', en: 'Prayer' }],
    answer: 0,
  },
  {
    q: { zh: '伊斯兰历元年始于？', en: 'Year 1 of the Islamic calendar begins with?' },
    options: [{ zh: '622 年的希吉拉', en: 'The Hijra of 622 CE' }, { zh: '先知诞生', en: 'The Prophet’s birth' }, { zh: '《古兰经》成书', en: 'Compilation of the Quran' }, { zh: '麦加解放', en: 'The conquest of Mecca' }],
    answer: 0,
  },
  {
    q: { zh: '以下哪项属于"五功"？', en: 'Which is one of the Five Pillars?' },
    options: [{ zh: '每日五次礼拜', en: 'Five daily prayers' }, { zh: '十诫', en: 'Ten Commandments' }, { zh: '八正道', en: 'Eightfold Path' }, { zh: '四书五经', en: 'Four Books' }],
    answer: 0,
  },
  {
    q: { zh: '莱麦丹月穆斯林进行？', en: 'During Ramadan Muslims observe?' },
    options: [{ zh: '斋戒', en: 'Fasting' }, { zh: '朝觐', en: 'Pilgrimage' }, { zh: '婚礼', en: 'Wedding' }, { zh: '割礼', en: 'Circumcision' }],
    answer: 0,
  },
  {
    q: { zh: '伊斯兰教约于何时传入中国？', en: 'Around when did Islam reach China?' },
    options: [{ zh: '唐代（7 世纪）', en: 'Tang dynasty (7th c.)' }, { zh: '汉代', en: 'Han dynasty' }, { zh: '明代', en: 'Ming dynasty' }, { zh: '清代', en: 'Qing dynasty' }],
    answer: 0,
  },
  {
    q: { zh: '中国沿海四大古清真寺不包括？', en: 'Which is NOT among the four ancient coastal mosques?' },
    options: [{ zh: '少林寺', en: 'Shaolin Temple' }, { zh: '广州怀圣寺', en: 'Huaisheng Mosque, Guangzhou' }, { zh: '泉州清净寺', en: 'Qingjing Mosque, Quanzhou' }, { zh: '杭州凤凰寺', en: 'Fenghuang Mosque, Hangzhou' }],
    answer: 0,
  },
  {
    q: { zh: '以汉语为母语、信仰伊斯兰教的中国民族是？', en: 'Which Chinese people are Chinese-speaking Muslims?' },
    options: [{ zh: '回族', en: 'Hui' }, { zh: '汉族', en: 'Han' }, { zh: '苗族', en: 'Miao' }, { zh: '壮族', en: 'Zhuang' }],
    answer: 0,
  },
  {
    q: { zh: '穆斯林礼拜朝向的是？', en: 'Muslims pray toward?' },
    options: [{ zh: '麦加克尔白', en: 'The Kaaba in Mecca' }, { zh: '耶路撒冷', en: 'Jerusalem' }, { zh: '麦地那', en: 'Medina' }, { zh: '巴格达', en: 'Baghdad' }],
    answer: 0,
  },
  {
    q: { zh: '伊斯兰艺术常以什么纹样著称？', en: 'Islamic art is famed for which patterns?' },
    options: [{ zh: '几何与植物纹（阿拉伯式花纹）', en: 'Geometric & vegetal arabesque' }, { zh: '人物肖像', en: 'Portraits' }, { zh: '神兽雕塑', en: 'Mythic beasts' }, { zh: '山水写意', en: 'Landscape painting' }],
    answer: 0,
  },
  {
    q: { zh: '新月象征什么？', en: 'The crescent symbolizes?' },
    options: [{ zh: '信仰', en: 'Faith' }, { zh: '战争', en: 'War' }, { zh: '财富', en: 'Wealth' }, { zh: '丰收', en: 'Harvest' }],
    answer: 0,
  },
  {
    q: { zh: '朝觐（哈吉）的目的地是？', en: 'The Hajj destination is?' },
    options: [{ zh: '麦加', en: 'Mecca' }, { zh: '耶路撒冷', en: 'Jerusalem' }, { zh: '伊斯坦布尔', en: 'Istanbul' }, { zh: '开罗', en: 'Cairo' }],
    answer: 0,
  },
  {
    q: { zh: '阿拉伯书法被视为？', en: 'Arabic calligraphy is regarded as?' },
    options: [{ zh: '神圣艺术', en: 'Sacred art' }, { zh: '世俗装饰', en: 'Secular decoration' }, { zh: '军事情报', en: 'Military intelligence' }, { zh: '商业符号', en: 'Commercial symbol' }],
    answer: 0,
  },
];

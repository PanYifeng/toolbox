// 基督文化数据：知识内容（基于维基百科及公开权威资料整理）+ 测验题库。
// 内容仅供文化学习参考，非宗教义理权威阐释。

export const meta = {
  themeKey: 'christianity',
  source: { zh: '内容综合维基百科及公开权威资料整理，仅供文化学习参考。', en: 'Compiled from Wikipedia and public authoritative sources, for cultural learning reference only.' },
};

export const sections = [
  {
    title: { zh: '起源与创立', en: 'Origin and Founding' },
    body: {
      zh: '基督教起源于公元 1 世纪的犹太地（今巴勒斯坦一带），以耶稣基督的生平与教导为核心。耶稣传扬"天国近了"、爱神与爱邻如己的福音，约公元 30 年前后在耶路撒冷被钉十字架而死；信徒相信他第三日复活。其门徒随后向外传教，经典为《圣经》（含《旧约》与《新约》，《新约》记载耶稣生平与使徒教导）。公元 313 年《米兰敕令》后基督教在罗马帝国合法化，380 年成为国教，并逐步分为天主教、东正教与新教（抗议宗）三大传统。',
      en: 'Christianity originated in the 1st century CE in Judea (modern Palestine), centered on the life and teachings of Jesus Christ. Jesus proclaimed the nearness of the Kingdom of God and the call to love God and one’s neighbor; he was crucified in Jerusalem around 30 CE, and his followers believe he rose from the dead on the third day. His disciples spread the faith; the scripture is the Bible (Old and New Testaments, the latter recording Jesus’s life and apostolic teaching). After the Edict of Milan (313 CE) legalized Christianity in the Roman Empire, it became the state religion in 380 and gradually divided into the Catholic, Orthodox and Protestant traditions.',
    },
  },
  {
    title: { zh: '在中国的传播与发展', en: 'Spread and Development in China' },
    body: {
      zh: '基督教曾数度传入中国。唐代贞观九年（635 年）景教（聂斯脱里派）入华，立于长安的《大秦景教流行中国碑》为其重要物证；元代天主教方济各会传教士曾抵大都；明末万历年间（1582 年起）耶稣会士利玛窦来华，以"适应策略"融通儒学，与徐光启等士大夫译介西学，影响深远。清初因"礼仪之争"传教受挫。1807 年马礼逊来华，为新教在华传教之始。近现代以来，基督教在文化、教育、医疗、慈善等领域均有参与，教堂建筑亦呈现哥特式与本土风格并存的样貌。',
      en: 'Christianity entered China in several waves. In 635 CE (Tang dynasty) the Church of the East (Nestorian, "Jingjiao") arrived, commemorated by the Nestorian Stele in Chang’an. During the Yuan dynasty Franciscan missionaries reached Khanbaliq. From 1582 the Jesuit Matteo Ricci adopted an accommodation strategy, engaging Confucian learning and translating Western scholarship with officials such as Xu Guangqi. Early Qing missionary work was set back by the Rites Controversy. In 1807 Robert Morrison became the first Protestant missionary to China. In modern times Christianity has contributed to culture, education, medicine and charity, with church architecture blending Gothic and local styles.',
    },
  },
  {
    title: { zh: '相关故事与文化象征', en: 'Stories and Cultural Symbols' },
    body: {
      zh: '《新约》记载了众多流传深远的比喻与故事：好撒玛利亚人讲跨越界限的怜悯，浪子回头述说宽恕与接纳，登山宝训宣告"使人和睦的人有福了"。常见象征包括：十字架（耶稣受难与救赎的标志）、鸽子与橄榄枝（和平与圣灵）、鱼（希腊文"鱼"IXΘYΣ为"耶稣基督神之子救主"首字母缩写，早期教会暗号）、《圣经》（神圣经典）。教堂建筑中的彩窗、玫瑰窗与管风琴音乐，亦是基督文化的重要艺术表达，承载着信仰、博爱与和平的精神。',
      en: 'The New Testament contains many enduring parables: the Good Samaritan on mercy beyond boundaries, the Prodigal Son on forgiveness and welcome, and the Sermon on the Mount’s "Blessed are the peacemakers." Common symbols include the cross (sign of Jesus’s passion and redemption), the dove and olive branch (peace and the Holy Spirit), the fish (the Greek word for fish, ICHTHYS, formed an acrostic for "Jesus Christ, Son of God, Savior"—an early Christian symbol), and the Bible. Stained glass, rose windows and organ music in churches are major artistic expressions of Christian culture, carrying ideals of faith, love and peace.',
    },
  },
];

export const quiz = [
  {
    q: { zh: '基督教起源于哪个地区？', en: 'Where did Christianity originate?' },
    options: [{ zh: '犹太地（巴勒斯坦一带）', en: 'Judea (Palestine)' }, { zh: '阿拉伯半岛', en: 'Arabian Peninsula' }, { zh: '罗马城', en: 'City of Rome' }, { zh: '印度', en: 'India' }],
    answer: 0,
  },
  {
    q: { zh: '基督教的核心人物是？', en: 'Who is the central figure of Christianity?' },
    options: [{ zh: '耶稣基督', en: 'Jesus Christ' }, { zh: '穆罕默德', en: 'Muhammad' }, { zh: '佛陀', en: 'Buddha' }, { zh: '摩西', en: 'Moses' }],
    answer: 0,
  },
  {
    q: { zh: '基督教的经典是？', en: 'The scripture of Christianity is?' },
    options: [{ zh: '《圣经》', en: 'The Bible' }, { zh: '《古兰经》', en: 'The Quran' }, { zh: '《金刚经》', en: 'Diamond Sutra' }, { zh: '《塔木德》', en: 'Talmud' }],
    answer: 0,
  },
  {
    q: { zh: '《圣经》由哪两部分组成？', en: 'The Bible consists of which two parts?' },
    options: [{ zh: '《旧约》与《新约》', en: 'Old and New Testaments' }, { zh: '上卷与下卷', en: 'Upper and lower volumes' }, { zh: '经与传', en: 'Jing and Zhuan' }, { zh: '律法与诗篇', en: 'Law and Psalms' }],
    answer: 0,
  },
  {
    q: { zh: '公元 313 年使基督教合法化的是？', en: 'What legalized Christianity in 313 CE?' },
    options: [{ zh: '《米兰敕令》', en: 'The Edict of Milan' }, { zh: '《大宪章》', en: 'Magna Carta' }, { zh: '《南京条约》', en: 'Treaty of Nanjing' }, { zh: '《威斯特伐利亚和约》', en: 'Peace of Westphalia' }],
    answer: 0,
  },
  {
    q: { zh: '基督教三大传统不包括？', en: 'Which is NOT one of the three major traditions?' },
    options: [{ zh: '道教', en: 'Daoism' }, { zh: '天主教', en: 'Catholicism' }, { zh: '东正教', en: 'Orthodoxy' }, { zh: '新教', en: 'Protestantism' }],
    answer: 0,
  },
  {
    q: { zh: '唐代入华的基督教派别史称？', en: 'The Tang-era Christian mission is historically called?' },
    options: [{ zh: '景教', en: 'Jingjiao (Church of the East)' }, { zh: '耶稣会', en: 'Jesuits' }, { zh: '方济各会', en: 'Franciscans' }, { zh: '清教徒', en: 'Puritans' }],
    answer: 0,
  },
  {
    q: { zh: '记录唐代景教的重要碑刻是？', en: 'The key stele recording Tang-era Jingjiao is?' },
    options: [{ zh: '《大秦景教流行中国碑》', en: 'Nestorian Stele' }, { zh: '《大雁塔记》', en: 'Wild Goose Pagoda record' }, { zh: '《兰亭序》', en: 'Preface to Orchid Pavilion' }, { zh: '《石鼓文》', en: 'Stone Drum Inscriptions' }],
    answer: 0,
  },
  {
    q: { zh: '明末来华的著名耶稣会士是？', en: 'A famous Ming-era Jesuit in China was?' },
    options: [{ zh: '利玛窦', en: 'Matteo Ricci' }, { zh: '马礼逊', en: 'Robert Morrison' }, { zh: '汤若望', en: 'Johann Adam Schall' }, { zh: '南怀仁', en: 'Ferdinand Verbiest' }],
    answer: 0,
  },
  {
    q: { zh: '与利玛窦合作译介西学的中国士大夫是？', en: 'The Chinese official who translated Western learning with Ricci?' },
    options: [{ zh: '徐光启', en: 'Xu Guangqi' }, { zh: '王阳明', en: 'Wang Yangming' }, { zh: '朱熹', en: 'Zhu Xi' }, { zh: '顾炎武', en: 'Gu Yanwu' }],
    answer: 0,
  },
  {
    q: { zh: '基督教最核心的象征是？', en: 'The most central symbol of Christianity is?' },
    options: [{ zh: '十字架', en: 'The cross' }, { zh: '法轮', en: 'Dharma wheel' }, { zh: '新月', en: 'Crescent' }, { zh: '太极图', en: 'Taiji diagram' }],
    answer: 0,
  },
  {
    q: { zh: '鸽子与橄榄枝象征？', en: 'The dove and olive branch symbolize?' },
    options: [{ zh: '和平', en: 'Peace' }, { zh: '战争', en: 'War' }, { zh: '财富', en: 'Wealth' }, { zh: '权力', en: 'Power' }],
    answer: 0,
  },
  {
    q: { zh: '早期教会以"鱼"为暗号，因希腊文"鱼"是？', en: 'The fish was an early Christian symbol because ICHTHYS is?' },
    options: [{ zh: '一句信仰告白的首字母缩写', en: 'An acrostic of a confession of faith' }, { zh: '耶稣的别号', en: 'A nickname of Jesus' }, { zh: '一种食物', en: 'A kind of food' }, { zh: '一座城名', en: 'A city name' }],
    answer: 0,
  },
  {
    q: { zh: '"好撒玛利亚人"的比喻强调？', en: 'The parable of the Good Samaritan emphasizes?' },
    options: [{ zh: '跨越界限的怜悯', en: 'Mercy beyond boundaries' }, { zh: '复仇', en: 'Revenge' }, { zh: '财富', en: 'Wealth' }, { zh: '律法主义', en: 'Legalism' }],
    answer: 0,
  },
  {
    q: { zh: '新教在华传教始于哪一年？', en: 'Protestant mission in China began in which year?' },
    options: [{ zh: '1807 年', en: '1807' }, { zh: '635 年', en: '635' }, { zh: '1582 年', en: '1582' }, { zh: '1840 年', en: '1840' }],
    answer: 0,
  },
];

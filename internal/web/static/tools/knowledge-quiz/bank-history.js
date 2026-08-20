// 历史学科题库（bank-history.js）：策展静态双语题，含 explanation。
// 项结构：{ q:{zh,en}, options:[{zh,en}×4], answer:0..3, subject:'history', explanation:{zh,en}, myth:false }
// 范围：中外历史事件、人物、年代、朝代、近现代史常识；正确答案在四个选项中按 0,1,2,3 循环轮换。
export default [
  // Q1 中国第一个统一的中央集权封建王朝
  {
    q: { zh: '中国历史上第一个统一的中央集权封建王朝是？', en: 'What was the first unified centralized feudal dynasty in Chinese history?' },
    options: [
      { zh: '秦朝', en: 'Qin Dynasty' },
      { zh: '汉朝', en: 'Han Dynasty' },
      { zh: '周朝', en: 'Zhou Dynasty' },
      { zh: '商朝', en: 'Shang Dynasty' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元前221年秦始皇嬴政统一六国，建立中国历史上第一个中央集权的封建王朝。', en: 'In 221 BC Qin Shi Huang unified the six states and established the first centralized feudal dynasty in Chinese history.' },
    myth: false,
  },
  // Q2 商朝代表性文字
  {
    q: { zh: '中国目前已知的最早成熟文字是？', en: 'What is the earliest mature writing system known in China?' },
    options: [
      { zh: '金文', en: 'Bronze inscription' },
      { zh: '甲骨文', en: 'Oracle bone script' },
      { zh: '小篆', en: 'Small seal script' },
      { zh: '隶书', en: 'Clerical script' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '甲骨文是商朝晚期刻在龟甲兽骨上的文字，是目前已知中国最早的成熟文字体系。', en: 'Oracle bone script, carved on turtle shells and animal bones in the late Shang Dynasty, is the earliest mature writing system known in China.' },
    myth: false,
  },
  // Q3 西周政治制度
  {
    q: { zh: '西周推行的主要政治制度是？', en: 'Which political system was the main institution of the Western Zhou Dynasty?' },
    options: [
      { zh: '郡县制', en: 'Commandery-county system' },
      { zh: '行省制', en: 'Provincial system' },
      { zh: '分封制', en: 'Enfeoffment (fengjian) system' },
      { zh: '三省六部制', en: 'Three Departments and Six Ministries' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '西周实行分封制，周天子将宗室和功臣封为诸侯，以巩固统治。', en: 'The Western Zhou practiced the enfeoffment system, by which the Zhou king enfeoffed royal kin and meritorious ministers as feudal lords to consolidate rule.' },
    myth: false,
  },
  // Q4 春秋五霸最早
  {
    q: { zh: '春秋五霸中最早称霸的是？', en: 'Who was the first of the Five Hegemons of the Spring and Autumn period?' },
    options: [
      { zh: '宋襄公', en: 'Duke Xiang of Song' },
      { zh: '秦穆公', en: 'Duke Mu of Qin' },
      { zh: '楚庄王', en: 'King Zhuang of Chu' },
      { zh: '齐桓公', en: 'Duke Huan of Qi' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '齐桓公任用管仲改革，"九合诸侯，一匡天下"，是春秋五霸之首。', en: 'Duke Huan of Qi, with Guan Zhong\'s reforms, "assembled the feudal lords nine times and rectified the world," making him the first of the Five Hegemons.' },
    myth: false,
  },
  // Q5 战国七雄最北
  {
    q: { zh: '战国七雄中位于最北方的国家是？', en: 'Among the Seven Warring States, which was the northernmost?' },
    options: [
      { zh: '燕国', en: 'State of Yan' },
      { zh: '楚国', en: 'State of Chu' },
      { zh: '齐国', en: 'State of Qi' },
      { zh: '魏国', en: 'State of Wei' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '燕国都城蓟（今北京西南），是战国七雄中最北的诸侯国。', en: 'The State of Yan, with its capital Ji (southwest of modern Beijing), was the northernmost of the Seven Warring States.' },
    myth: false,
  },
  // Q6 商鞅变法
  {
    q: { zh: '商鞅变法发生在哪个诸侯国？', en: 'In which vassal state did Shang Yang\'s reforms take place?' },
    options: [
      { zh: '魏国', en: 'State of Wei' },
      { zh: '秦国', en: 'State of Qin' },
      { zh: '楚国', en: 'State of Chu' },
      { zh: '韩国', en: 'State of Han' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '商鞅在秦孝公支持下于秦国推行变法，使秦国迅速强大。', en: 'Under Duke Xiao of Qin, Shang Yang carried out reforms in the State of Qin, rapidly strengthening it.' },
    myth: false,
  },
  // Q7 都江堰修建时期
  {
    q: { zh: '中国古代水利工程都江堰修建于哪个时期？', en: 'When was the ancient Chinese water project Dujiangyan built?' },
    options: [
      { zh: '商朝', en: 'Shang Dynasty' },
      { zh: '西周', en: 'Western Zhou Dynasty' },
      { zh: '战国时期', en: 'Warring States period' },
      { zh: '西汉', en: 'Western Han Dynasty' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '战国时期秦国蜀郡守李冰父子主持修建都江堰，至今仍发挥作用。', en: 'During the Warring States period, Li Bing and his son, governor of Shu Commandery under Qin, built Dujiangyan, which still functions today.' },
    myth: false,
  },
  // Q8 民贵君轻
  {
    q: { zh: '提出"民为贵，社稷次之，君为轻"的思想家是？', en: 'Who said "The people are the most important, the state comes next, and the ruler is the least important"?' },
    options: [
      { zh: '孔子', en: 'Confucius' },
      { zh: '老子', en: 'Laozi' },
      { zh: '韩非子', en: 'Han Feizi' },
      { zh: '孟子', en: 'Mencius' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '孟子在《孟子·尽心下》提出"民为贵，社稷次之，君为轻"的民本思想。', en: 'Mencius articulated this people-centered thought in the chapter "Jinxin Xia" of the Book of Mencius.' },
    myth: false,
  },
  // Q9 道家创始
  {
    q: { zh: '道家学派的创始人是？', en: 'Who is the founder of Daoism?' },
    options: [
      { zh: '老子', en: 'Laozi' },
      { zh: '孔子', en: 'Confucius' },
      { zh: '墨子', en: 'Mozi' },
      { zh: '庄子', en: 'Zhuangzi' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '老子是道家学派创始人，其代表作《道德经》提出"道法自然"等思想。', en: 'Laozi founded Daoism; his work the Tao Te Ching articulates ideas such as "the Dao follows nature."' },
    myth: false,
  },
  // Q10 墨家
  {
    q: { zh: '提出"兼爱""非攻"主张的学派是？', en: 'Which school advocated "universal love" and "non-aggression"?' },
    options: [
      { zh: '儒家', en: 'Confucianism' },
      { zh: '墨家', en: 'Mohism' },
      { zh: '道家', en: 'Daoism' },
      { zh: '法家', en: 'Legalism' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '墨子创立墨家学派，主张"兼爱""非攻""尚贤"等。', en: 'Mozi founded Mohism, advocating universal love, non-aggression, and elevating the worthy.' },
    myth: false,
  },
  // Q11 第一部诗歌总集
  {
    q: { zh: '中国第一部诗歌总集是？', en: 'What is the first anthology of poetry in China?' },
    options: [
      { zh: '楚辞', en: 'Songs of Chu' },
      { zh: '论语', en: 'Analects' },
      { zh: '诗经', en: 'Classic of Poetry (Shijing)' },
      { zh: '离骚', en: 'The Sorrow of Parting' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '《诗经》收录西周至春秋诗歌305篇，是中国第一部诗歌总集。', en: 'The Classic of Poetry collects 305 poems from the Western Zhou to the Spring and Autumn period, the first poetry anthology in China.' },
    myth: false,
  },
  // Q12 屈原所在国
  {
    q: { zh: '诗人屈原是战国时期哪个诸侯国的贵族大夫？', en: 'Of which Warring States vassal state was the poet Qu Yuan a noble minister?' },
    options: [
      { zh: '齐国', en: 'State of Qi' },
      { zh: '韩国', en: 'State of Han' },
      { zh: '燕国', en: 'State of Yan' },
      { zh: '楚国', en: 'State of Chu' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '屈原是楚国贵族，著有《离骚》《九歌》等，后投汨罗江而死。', en: 'Qu Yuan was a Chu noble who wrote The Sorrow of Parting and Nine Songs, and drowned himself in the Miluo River.' },
    myth: false,
  },
  // Q13 焚书坑儒
  {
    q: { zh: '"焚书坑儒"事件发生在哪个朝代？', en: 'In which dynasty did the "burning of books and burying of scholars" take place?' },
    options: [
      { zh: '秦朝', en: 'Qin Dynasty' },
      { zh: '战国', en: 'Warring States period' },
      { zh: '西汉', en: 'Western Han Dynasty' },
      { zh: '东汉', en: 'Eastern Han Dynasty' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '秦始皇为统一思想，下令焚毁民间所藏诸子百家之书并坑杀方士儒生，史称"焚书坑儒"。', en: 'To unify thought, Qin Shi Huang ordered the burning of non-approved books held by commoners and the execution of dissenting scholars, known as "burning books and burying scholars."' },
    myth: false,
  },
  // Q14 秦朝都城
  {
    q: { zh: '秦朝的都城位于今天的哪座城市？', en: 'The Qin Dynasty capital was located near which modern city?' },
    options: [
      { zh: '洛阳', en: 'Luoyang' },
      { zh: '咸阳', en: 'Xianyang' },
      { zh: '长安', en: 'Chang\'an (Xi\'an)' },
      { zh: '开封', en: 'Kaifeng' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '秦朝定都咸阳，位于今陕西咸阳东北，与长安相邻。', en: 'The Qin capital was Xianyang, located northeast of modern Xianyang, Shaanxi, adjacent to Chang\'an.' },
    myth: false,
  },
  // Q15 第一次农民起义
  {
    q: { zh: '中国历史上第一次大规模农民起义是？', en: 'What was the first large-scale peasant uprising in Chinese history?' },
    options: [
      { zh: '黄巾起义', en: 'Yellow Turban Rebellion' },
      { zh: '红巾军起义', en: 'Red Turban Rebellion' },
      { zh: '陈胜吴广起义', en: 'Chen Sheng and Wu Guang uprising' },
      { zh: '李自成起义', en: 'Li Zicheng rebellion' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '公元前209年陈胜、吴广在大泽乡起义，是中国历史上第一次大规模农民起义。', en: 'In 209 BC, Chen Sheng and Wu Guang rose up at Daze Township, the first large-scale peasant uprising in Chinese history.' },
    myth: false,
  },
  // Q16 楚汉之争主角
  {
    q: { zh: '"楚汉之争"的两位主要对手是？', en: 'Who were the two main rivals in the "Chu-Han Contention"?' },
    options: [
      { zh: '刘邦和韩信', en: 'Liu Bang and Han Xin' },
      { zh: '项羽和范增', en: 'Xiang Yu and Fan Zeng' },
      { zh: '刘邦和彭越', en: 'Liu Bang and Peng Yue' },
      { zh: '刘邦和项羽', en: 'Liu Bang and Xiang Yu' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '秦亡后，刘邦与项羽为争夺天下展开四年楚汉之争，最终刘邦胜出建立汉朝。', en: 'After the fall of Qin, Liu Bang and Xiang Yu fought the four-year Chu-Han Contention; Liu Bang won and founded the Han Dynasty.' },
    myth: false,
  },
  // Q17 西汉建立者
  {
    q: { zh: '西汉的建立者是？', en: 'Who founded the Western Han Dynasty?' },
    options: [
      { zh: '刘邦', en: 'Liu Bang (Emperor Gaozu of Han)' },
      { zh: '刘秀', en: 'Liu Xiu' },
      { zh: '刘彻', en: 'Liu Che' },
      { zh: '刘恒', en: 'Liu Heng' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元前202年刘邦击败项羽，定都长安，建立西汉，是为汉高祖。', en: 'In 202 BC Liu Bang defeated Xiang Yu, established the Western Han with its capital at Chang\'an, and became Emperor Gaozu of Han.' },
    myth: false,
  },
  // Q18 罢黜百家
  {
    q: { zh: '向汉武帝建议"罢黜百家，独尊儒术"的学者是？', en: 'Which scholar advised Emperor Wu of Han to "reject all schools but Confucianism"?' },
    options: [
      { zh: '贾谊', en: 'Jia Yi' },
      { zh: '董仲舒', en: 'Dong Zhongshu' },
      { zh: '司马迁', en: 'Sima Qian' },
      { zh: '班固', en: 'Ban Gu' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '西汉大儒董仲舒向汉武帝建议罢黜百家、独尊儒术，确立了儒学的正统地位。', en: 'The Western Han scholar Dong Zhongshu proposed to Emperor Wu that Confucianism be made the sole orthodox school of thought.' },
    myth: false,
  },
  // Q19 张骞通西域
  {
    q: { zh: '张骞第一次出使西域是在哪位皇帝在位期间？', en: 'Under which emperor did Zhang Qian make his first mission to the Western Regions?' },
    options: [
      { zh: '汉文帝', en: 'Emperor Wen of Han' },
      { zh: '汉景帝', en: 'Emperor Jing of Han' },
      { zh: '汉武帝', en: 'Emperor Wu of Han' },
      { zh: '汉宣帝', en: 'Emperor Xuan of Han' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '公元前138年汉武帝派张骞首次出使西域，开启了中原与西域的正式交流。', en: 'In 138 BC Emperor Wu of Han dispatched Zhang Qian on his first mission to the Western Regions, opening formal exchange between the Central Plains and the West.' },
    myth: false,
  },
  // Q20 丝绸之路开辟
  {
    q: { zh: '陆上丝绸之路开辟于哪个朝代？', en: 'The overland Silk Road was opened during which dynasty?' },
    options: [
      { zh: '秦朝', en: 'Qin Dynasty' },
      { zh: '东汉', en: 'Eastern Han Dynasty' },
      { zh: '唐朝', en: 'Tang Dynasty' },
      { zh: '西汉', en: 'Western Han Dynasty' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '张骞通西域后，西汉逐步形成由长安通往中亚、欧洲的陆上丝绸之路。', en: 'After Zhang Qian\'s missions, the Western Han developed the overland Silk Road from Chang\'an to Central Asia and Europe.' },
    myth: false,
  },
  // Q21 史记作者
  {
    q: { zh: '《史记》的作者是？', en: 'Who is the author of Records of the Grand Historian (Shiji)?' },
    options: [
      { zh: '司马迁', en: 'Sima Qian' },
      { zh: '班固', en: 'Ban Gu' },
      { zh: '司马光', en: 'Sima Guang' },
      { zh: '陈寿', en: 'Chen Shou' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '西汉司马迁著《史记》，是中国第一部纪传体通史，记载黄帝至汉武帝时期约三千年历史。', en: 'Sima Qian of the Western Han wrote Records of the Grand Historian, the first biographical general history of China, covering about three thousand years from the Yellow Emperor to Emperor Wu of Han.' },
    myth: false,
  },
  // Q22 改进造纸术
  {
    q: { zh: '东汉时期改进造纸术、使纸得以广泛使用的是？', en: 'Who, in the Eastern Han Dynasty, improved papermaking so that paper came into wide use?' },
    options: [
      { zh: '张衡', en: 'Zhang Heng' },
      { zh: '蔡伦', en: 'Cai Lun' },
      { zh: '华佗', en: 'Hua Tuo' },
      { zh: '张仲景', en: 'Zhang Zhongjing' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '东汉宦官蔡伦于公元105年改进造纸工艺，以树皮、麻头、破布、渔网为原料造纸，世称"蔡侯纸"。', en: 'In 105 AD the eunuch Cai Lun improved papermaking using bark, hemp, rags, and fishing nets, producing what was called "Marquis Cai paper."' },
    myth: false,
  },
  // Q23 东汉建立者
  {
    q: { zh: '东汉的建立者是？', en: 'Who founded the Eastern Han Dynasty?' },
    options: [
      { zh: '刘协', en: 'Liu Xie' },
      { zh: '刘恒', en: 'Liu Heng' },
      { zh: '刘秀', en: 'Liu Xiu (Emperor Guangwu of Han)' },
      { zh: '刘辩', en: 'Liu Bian' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '公元25年刘秀重建汉室，定都洛阳，史称东汉，刘秀即汉光武帝。', en: 'In 25 AD Liu Xiu restored the Han with its capital at Luoyang, beginning the Eastern Han; he is Emperor Guangwu of Han.' },
    myth: false,
  },
  // Q24 黄巾起义年份
  {
    q: { zh: '黄巾起义爆发于哪一年？', en: 'In what year did the Yellow Turban Rebellion break out?' },
    options: [
      { zh: '公元100年', en: '100 AD' },
      { zh: '公元220年', en: '220 AD' },
      { zh: '公元280年', en: '280 AD' },
      { zh: '公元184年', en: '184 AD' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元184年张角发动黄巾起义，动摇了东汉统治，拉开了汉末乱世的序幕。', en: 'In 184 AD Zhang Jue launched the Yellow Turban Rebellion, shaking Eastern Han rule and ushering in the late-Han chaos.' },
    myth: false,
  },
  // Q25 挟天子以令诸侯
  {
    q: { zh: '东汉末年"挟天子以令诸侯"指的是？', en: 'In the late Eastern Han, who "held the emperor to command the feudal lords"?' },
    options: [
      { zh: '曹操', en: 'Cao Cao' },
      { zh: '董卓', en: 'Dong Zhuo' },
      { zh: '袁绍', en: 'Yuan Shao' },
      { zh: '刘备', en: 'Liu Bei' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '曹操于公元196年迎汉献帝至许县，"奉天子以令不臣"，史称"挟天子以令诸侯"。', en: 'In 196 AD Cao Cao received Emperor Xian at Xu county, "serving the emperor to command the disobedient," known as "holding the emperor to command the feudal lords."' },
    myth: false,
  },
  // Q26 刘备建立的政权
  {
    q: { zh: '三国时期由刘备建立的政权是？', en: 'Which state was founded by Liu Bei during the Three Kingdoms period?' },
    options: [
      { zh: '曹魏', en: 'Cao Wei' },
      { zh: '蜀汉', en: 'Shu Han' },
      { zh: '东吴', en: 'Eastern Wu' },
      { zh: '西晋', en: 'Western Jin' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '公元221年刘备在成都称帝，国号汉，史称蜀汉。', en: 'In 221 AD Liu Bei proclaimed himself emperor at Chengdu with the state name Han, known to history as Shu Han.' },
    myth: false,
  },
  // Q27 赤壁之战
  {
    q: { zh: '"赤壁之战"的交战双方是？', en: 'Who were the combatants at the Battle of Red Cliffs?' },
    options: [
      { zh: '袁绍军与曹操军', en: 'Yuan Shao\'s army vs. Cao Cao\'s army' },
      { zh: '孙权军与刘备军', en: 'Sun Quan\'s army vs. Liu Bei\'s army' },
      { zh: '曹操军与刘备军', en: 'Cao Cao\'s army vs. Liu Bei\'s army' },
      { zh: '孙刘联军与曹操军', en: 'Sun-Liu allied army vs. Cao Cao\'s army' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元208年孙权与刘备联军在赤壁以少胜多击败曹操南下大军，奠定三国鼎立基础。', en: 'In 208 AD the Sun-Liu allied forces defeated Cao Cao\'s southern expedition army at Red Cliffs, laying the groundwork for the Three Kingdoms balance.' },
    myth: false,
  },
  // Q28 西晋建立者
  {
    q: { zh: '西晋的建立者是？', en: 'Who founded the Western Jin Dynasty?' },
    options: [
      { zh: '司马懿', en: 'Sima Yi' },
      { zh: '司马师', en: 'Sima Shi' },
      { zh: '司马昭', en: 'Sima Zhao' },
      { zh: '司马炎', en: 'Sima Yan' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元265年司马炎代魏称帝，国号晋，定都洛阳，是为西晋。', en: 'In 265 AD Sima Yan replaced Wei and proclaimed the Jin Dynasty with its capital at Luoyang, beginning the Western Jin.' },
    myth: false,
  },
  // Q29 八王之乱
  {
    q: { zh: '"八王之乱"发生在哪个朝代？', en: 'In which dynasty did the "Rebellion of the Eight Princes" occur?' },
    options: [
      { zh: '西晋', en: 'Western Jin Dynasty' },
      { zh: '西汉', en: 'Western Han Dynasty' },
      { zh: '东汉', en: 'Eastern Han Dynasty' },
      { zh: '东晋', en: 'Eastern Jin Dynasty' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '西晋时期八个分封宗王为争夺中央权力互相混战，史称"八王之乱"，加速了西晋灭亡。', en: 'During the Western Jin, eight enfeoffed princes fought for central power, called the "Rebellion of the Eight Princes," which hastened the dynasty\'s fall.' },
    myth: false,
  },
  // Q30 兰亭集序
  {
    q: { zh: '东晋书法家王羲之的代表作是？', en: 'What is the masterpiece of the Eastern Jin calligrapher Wang Xizhi?' },
    options: [
      { zh: '多宝塔碑', en: 'Duobao Pagoda Stele' },
      { zh: '兰亭集序', en: 'Preface to the Poems Collected at the Orchid Pavilion' },
      { zh: '九成宫醴泉铭', en: 'Inscription on the Sweet Spring at Jiucheng Palace' },
      { zh: '自叙帖', en: 'Autobiographical Note' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '公元353年王羲之等兰亭修禊，所作《兰亭集序》被誉为"天下第一行书"。', en: 'In 353 AD Wang Xizhi and friends gathered at the Orchid Pavilion; his preface is praised as the finest running-script calligraphy in history.' },
    myth: false,
  },
  // Q31 北魏孝文帝改革
  {
    q: { zh: '北魏孝文帝改革的主要内容是？', en: 'What was the main content of Emperor Xiaowen of Northern Wei\'s reforms?' },
    options: [
      { zh: '设立三省六部', en: 'Establishing the Three Departments and Six Ministries' },
      { zh: '实行均田制、严禁汉化', en: 'Implementing the equal-field system and forbidding sinicization' },
      { zh: '推行科举制', en: 'Instituting the imperial examination' },
      { zh: '迁都洛阳、推行汉化', en: 'Moving the capital to Luoyang and pursuing sinicization' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '北魏孝文帝将都城由平城迁至洛阳，推行改汉姓、穿汉服、说汉话、与汉通婚等汉化改革。', en: 'Emperor Xiaowen of Northern Wei moved the capital from Pingcheng to Luoyang and pushed sinicization: adopting Han surnames, dress, language, and intermarriage.' },
    myth: false,
  },
  // Q32 隋朝建立者
  {
    q: { zh: '隋朝的建立者是？', en: 'Who founded the Sui Dynasty?' },
    options: [
      { zh: '宇文泰', en: 'Yuwen Tai' },
      { zh: '李渊', en: 'Li Yuan' },
      { zh: '杨广', en: 'Yang Guang' },
      { zh: '杨坚', en: 'Yang Jian (Emperor Wen of Sui)' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元581年杨坚代北周建立隋朝，是为隋文帝，589年统一全国。', en: 'In 581 AD Yang Jian replaced the Northern Zhou and founded the Sui Dynasty as Emperor Wen of Sui, unifying China in 589.' },
    myth: false,
  },
  // Q33 大运河
  {
    q: { zh: '隋朝大运河在位下令开凿的皇帝是？', en: 'Which emperor ordered the construction of the Sui Grand Canal?' },
    options: [
      { zh: '隋炀帝', en: 'Emperor Yang of Sui' },
      { zh: '隋文帝', en: 'Emperor Wen of Sui' },
      { zh: '唐太宗', en: 'Emperor Taizong of Tang' },
      { zh: '武则天', en: 'Wu Zetian' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '隋炀帝杨广在位期间大规模开凿以洛阳为中心、贯通海河黄河淮河长江钱塘江的大运河。', en: 'Emperor Yang of Sui ordered large-scale construction of a Grand Canal centered on Luoyang, linking the Hai, Yellow, Huai, Yangtze, and Qiantang rivers.' },
    myth: false,
  },
  // Q34 科举创立
  {
    q: { zh: '中国科举制正式创立于哪个朝代？', en: 'In which dynasty was the Chinese imperial examination formally established?' },
    options: [
      { zh: '汉朝', en: 'Han Dynasty' },
      { zh: '隋朝', en: 'Sui Dynasty' },
      { zh: '唐朝', en: 'Tang Dynasty' },
      { zh: '宋朝', en: 'Song Dynasty' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '隋炀帝设进士科，以考试选拔官员，标志着科举制度的正式创立，唐代进一步完善。', en: 'Emperor Yang of Sui established the jinshi degree, selecting officials by examination, which formally founded the imperial examination system, later refined in the Tang.' },
    myth: false,
  },
  // Q35 唐朝建立者
  {
    q: { zh: '唐朝的建立者是？', en: 'Who founded the Tang Dynasty?' },
    options: [
      { zh: '李世民', en: 'Li Shimin' },
      { zh: '李治', en: 'Li Zhi' },
      { zh: '李渊', en: 'Li Yuan (Emperor Gaozu of Tang)' },
      { zh: '李隆基', en: 'Li Longji' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '公元618年李渊在长安称帝，国号唐，是为唐高祖。', en: 'In 618 AD Li Yuan proclaimed himself emperor at Chang\'an, naming the dynasty Tang, as Emperor Gaozu of Tang.' },
    myth: false,
  },
  // Q36 贞观之治
  {
    q: { zh: '唐太宗李世民开创的盛世局面被称为？', en: 'What is the flourishing age opened by Emperor Taizong of Tang called?' },
    options: [
      { zh: '开元盛世', en: 'Kaiyuan Prosperity' },
      { zh: '文景之治', en: 'Rule of Wen and Jing' },
      { zh: '康乾盛世', en: 'Kang-Qian Prosperity' },
      { zh: '贞观之治', en: 'Zhenguan Reign' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '唐太宗年号贞观，其在位期间政治清明、经济恢复、社会安定，史称"贞观之治"。', en: 'Emperor Taizong\'s reign name was Zhenguan; under his rule politics were clean, the economy recovered, and society was stable, called the "Zhenguan Reign."' },
    myth: false,
  },
  // Q37 唯一女皇帝
  {
    q: { zh: '中国历史上唯一被承认的女皇帝是？', en: 'Who is the only recognized female emperor in Chinese history?' },
    options: [
      { zh: '武则天', en: 'Wu Zetian' },
      { zh: '吕后', en: 'Empress Lü' },
      { zh: '慈禧太后', en: 'Empress Dowager Cixi' },
      { zh: '太平公主', en: 'Princess Taiping' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '武则天于公元690年称帝，改国号为周，是中国历史上唯一的女皇帝。', en: 'Wu Zetian proclaimed herself emperor in 690 AD, renaming the dynasty Zhou, the only female emperor in Chinese history.' },
    myth: false,
  },
  // Q38 开元盛世
  {
    q: { zh: '唐玄宗统治前期出现的盛世局面是？', en: 'What flourishing age appeared in the early reign of Emperor Xuanzong of Tang?' },
    options: [
      { zh: '贞观之治', en: 'Zhenguan Reign' },
      { zh: '开元盛世', en: 'Kaiyuan Prosperity' },
      { zh: '永徽之治', en: 'Yonghui Reign' },
      { zh: '元和中兴', en: 'Yuanhe Revival' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '唐玄宗前期年号"开元"，国力达到鼎盛，史称"开元盛世"。', en: 'Emperor Xuanzong\'s early reign name was "Kaiyuan," during which Tang power reached its zenith, called the "Kaiyuan Prosperity."' },
    myth: false,
  },
  // Q39 安史之乱
  {
    q: { zh: '唐朝由盛转衰的转折点是？', en: 'What event marked the turning point of the Tang Dynasty from prosperity to decline?' },
    options: [
      { zh: '黄巢起义', en: 'Huang Chao Rebellion' },
      { zh: '藩镇割据', en: 'Regional commander separatism' },
      { zh: '牛李党争', en: 'Niu-Li factional strife' },
      { zh: '安史之乱', en: 'An Lushan Rebellion' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元755年至763年的安史之乱使唐朝由盛转衰，自此藩镇割据加剧。', en: 'The An Lushan Rebellion (755-763 AD) turned the Tang from prosperity to decline, intensifying regional separatism.' },
    myth: false,
  },
  // Q40 诗仙
  {
    q: { zh: '被誉为"诗仙"的唐代诗人是？', en: 'Which Tang poet is praised as the "Poet Immortal"?' },
    options: [
      { zh: '杜甫', en: 'Du Fu' },
      { zh: '白居易', en: 'Bai Juyi' },
      { zh: '李白', en: 'Li Bai' },
      { zh: '王维', en: 'Wang Wei' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '李白诗风飘逸豪放，贺知章称之为"谪仙人"，后世尊其为"诗仙"。', en: 'Li Bai\'s verse is lofty and bold; He Zhizhang called him a "banished immortal," and later ages honored him as the "Poet Immortal."' },
    myth: false,
  },
  // Q41 诗圣
  {
    q: { zh: '被誉为"诗圣"的唐代诗人是？', en: 'Which Tang poet is praised as the "Poet Sage"?' },
    options: [
      { zh: '杜甫', en: 'Du Fu' },
      { zh: '李白', en: 'Li Bai' },
      { zh: '王维', en: 'Wang Wei' },
      { zh: '孟浩然', en: 'Meng Haoran' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '杜甫诗作反映社会现实、忧国忧民，被誉为"诗圣"，其诗被称为"诗史"。', en: 'Du Fu\'s poems mirror social reality and concern for the nation; he is honored as the "Poet Sage," and his works the "poetic history."' },
    myth: false,
  },
  // Q42 玄奘
  {
    q: { zh: '唐代前往天竺（印度）取经的著名高僧是？', en: 'Which eminent Tang monk traveled to Tianzhu (India) to obtain scriptures?' },
    options: [
      { zh: '鉴真', en: 'Jianzhen' },
      { zh: '玄奘', en: 'Xuanzang' },
      { zh: '法显', en: 'Faxian' },
      { zh: '义净', en: 'Yijing' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '唐太宗时期玄奘西行求法，归国后口述完成《大唐西域记》，促进了中印文化交流。', en: 'Under Emperor Taizong, Xuanzang traveled west for Buddhist dharma; after returning he dictated Records of the Western Regions of the Great Tang, advancing Sino-Indian exchange.' },
    myth: false,
  },
  // Q43 鉴真
  {
    q: { zh: '唐代六次东渡日本传法的唐代高僧是？', en: 'Which Tang monk crossed to Japan six times to spread Buddhism?' },
    options: [
      { zh: '义净', en: 'Yijing' },
      { zh: '法显', en: 'Faxian' },
      { zh: '鉴真', en: 'Jianzhen' },
      { zh: '玄奘', en: 'Xuanzang' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '唐玄宗时期鉴真六次尝试东渡，最终于公元754年抵达日本，对日本佛教与文化影响深远。', en: 'Under Emperor Xuanzong, Jianzhen attempted six eastward voyages and finally reached Japan in 754 AD, profoundly influencing Japanese Buddhism and culture.' },
    myth: false,
  },
  // Q44 北宋建立者
  {
    q: { zh: '北宋的建立者是？', en: 'Who founded the Northern Song Dynasty?' },
    options: [
      { zh: '赵光义', en: 'Zhao Guangyi' },
      { zh: '赵恒', en: 'Zhao Heng' },
      { zh: '赵佶', en: 'Zhao Ji' },
      { zh: '赵匡胤', en: 'Zhao Kuangyin (Emperor Taizu of Song)' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '公元960年赵匡胤发动陈桥兵变，建立宋朝，定都东京（今开封），是为宋太祖。', en: 'In 960 AD Zhao Kuangyin launched the Chenqiao mutiny, founding the Song Dynasty with its capital at Dongjing (modern Kaifeng), as Emperor Taizu of Song.' },
    myth: false,
  },
  // Q45 北宋建立时间
  {
    q: { zh: '北宋建立于哪一年？', en: 'In what year was the Northern Song Dynasty founded?' },
    options: [
      { zh: '960年', en: '960 AD' },
      { zh: '979年', en: '979 AD' },
      { zh: '1004年', en: '1004 AD' },
      { zh: '1127年', en: '1127 AD' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元960年赵匡胤陈桥兵变建国，979年宋太宗灭北汉，基本完成统一。', en: 'Zhao Kuangyin founded the dynasty in 960 AD; in 979 Emperor Taizong of Song destroyed Northern Han, largely unifying China.' },
    myth: false,
  },
  // Q46 杯酒释兵权
  {
    q: { zh: '"杯酒释兵权"的皇帝是？', en: 'Which emperor "released military power over a cup of wine"?' },
    options: [
      { zh: '宋太宗', en: 'Emperor Taizong of Song' },
      { zh: '宋太祖', en: 'Emperor Taizu of Song' },
      { zh: '宋真宗', en: 'Emperor Zhenzong of Song' },
      { zh: '宋仁宗', en: 'Emperor Renzong of Song' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '宋太祖赵匡胤宴请大将，借酒劝其交出兵权，史称"杯酒释兵权"，加强了中央集权。', en: 'Emperor Taizu of Song invited his senior generals to a banquet and persuaded them to surrender military power, called "releasing military power over a cup of wine," strengthening central control.' },
    myth: false,
  },
  // Q47 王安石变法
  {
    q: { zh: '北宋熙宁年间主持变法改革的是？', en: 'Who led the Xining reforms in the Northern Song Dynasty?' },
    options: [
      { zh: '范仲淹', en: 'Fan Zhongyan' },
      { zh: '司马光', en: 'Sima Guang' },
      { zh: '王安石', en: 'Wang Anshi' },
      { zh: '欧阳修', en: 'Ouyang Xiu' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '宋神宗任用王安石推行新法，史称"熙宁变法"，旨在富国强兵。', en: 'Emperor Shenzong of Song appointed Wang Anshi to carry out reforms aimed at enriching the state and strengthening the army, known as the "Xining Reforms."' },
    myth: false,
  },
  // Q48 岳飞
  {
    q: { zh: '南宋抗金名将、被秦桧陷害致死的是？', en: 'Which Southern Song general fighting the Jurchen Jin was put to death through Qin Hui\'s plot?' },
    options: [
      { zh: '韩世忠', en: 'Han Shizhong' },
      { zh: '张俊', en: 'Zhang Jun' },
      { zh: '刘光世', en: 'Liu Guangshi' },
      { zh: '岳飞', en: 'Yue Fei' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '岳飞率岳家军屡败金军，1142年被宋高宗与秦桧以"莫须有"罪名杀害。', en: 'Yue Fei\'s "Yue Family Army" repeatedly defeated the Jin; in 1142 Emperor Gaozong of Song and Qin Hui had him killed on a groundless charge.' },
    myth: false,
  },
  // Q49 靖康之变
  {
    q: { zh: '北宋灭亡的标志性事件是？', en: 'What event marked the fall of the Northern Song Dynasty?' },
    options: [
      { zh: '靖康之变', en: 'Jingkang Incident' },
      { zh: '靖难之役', en: 'Jingnan Campaign' },
      { zh: '土木堡之变', en: 'Tumu Crisis' },
      { zh: '陈桥兵变', en: 'Chenqiao Mutiny' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1127年金军攻破东京掳走徽钦二帝，北宋灭亡，史称"靖康之变"。', en: 'In 1127 AD Jin forces captured Dongjing and seized Emperors Huizong and Qinzong, ending the Northern Song, called the "Jingkang Incident."' },
    myth: false,
  },
  // Q50 成吉思汗
  {
    q: { zh: '蒙古帝国的奠基者是？', en: 'Who founded the Mongol Empire?' },
    options: [
      { zh: '蒙哥', en: 'Möngke Khan' },
      { zh: '成吉思汗', en: 'Genghis Khan (Temüjin)' },
      { zh: '拖雷', en: 'Tolui' },
      { zh: '窝阔台', en: 'Ögedei Khan' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1206年铁木真统一蒙古各部，在斡难河源召开忽里勒台，被尊为"成吉思汗"。', en: 'In 1206 Temüjin unified the Mongol tribes and was acclaimed "Genghis Khan" at a kurultai by the Onon River.' },
    myth: false,
  },
  // Q51 元朝建立者
  {
    q: { zh: '元朝的建立者是？', en: 'Who founded the Yuan Dynasty?' },
    options: [
      { zh: '成吉思汗', en: 'Genghis Khan' },
      { zh: '蒙哥', en: 'Möngke Khan' },
      { zh: '忽必烈', en: 'Kublai Khan' },
      { zh: '窝阔台', en: 'Ögedei Khan' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1271年忽必烈改国号为"大元"，定都大都（今北京），是为元世祖。', en: 'In 1271 Kublai Khan renamed the state "Great Yuan" with capital at Dadu (modern Beijing), as Emperor Shizu of Yuan.' },
    myth: false,
  },
  // Q52 元大都
  {
    q: { zh: '元朝的都城"大都"位于今天的哪座城市？', en: 'The Yuan capital "Dadu" corresponds to which modern city?' },
    options: [
      { zh: '开封', en: 'Kaifeng' },
      { zh: '南京', en: 'Nanjing' },
      { zh: '杭州', en: 'Hangzhou' },
      { zh: '北京', en: 'Beijing' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '元世祖忽必烈定都大都，其城址即今天的北京城核心区域。', en: 'Kublai Khan set his capital at Dadu, whose site corresponds to the core of modern Beijing.' },
    myth: false,
  },
  // Q53 马可波罗
  {
    q: { zh: '意大利旅行家马可·波罗来华发生在哪个朝代？', en: 'During which dynasty did the Italian traveler Marco Polo come to China?' },
    options: [
      { zh: '元朝', en: 'Yuan Dynasty' },
      { zh: '唐朝', en: 'Tang Dynasty' },
      { zh: '宋朝', en: 'Song Dynasty' },
      { zh: '明朝', en: 'Ming Dynasty' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '马可·波罗于元世祖时期来华，居留十余年，归国后口述《马可·波罗游记》。', en: 'Marco Polo arrived during Kublai Khan\'s reign, stayed over a decade, and on returning dictated The Travels of Marco Polo.' },
    myth: false,
  },
  // Q54 关汉卿
  {
    q: { zh: '元杂剧《窦娥冤》的作者是？', en: 'Who wrote the Yuan zaju play The Injustice to Dou E?' },
    options: [
      { zh: '关汉卿', en: 'Guan Hanqing' },
      { zh: '王实甫', en: 'Wang Shifu' },
      { zh: '马致远', en: 'Ma Zhiyuan' },
      { zh: '白朴', en: 'Bai Pu' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '关汉卿是元杂剧的代表作家，被誉为"曲圣"，代表作《窦娥冤》《单刀会》等。', en: 'Guan Hanqing, the leading playwright of Yuan zaju and called the "Sage of Qu," wrote The Injustice to Dou E and Lord Guan Goes Solo to the Sword Meeting.' },
    myth: false,
  },
  // Q55 明朝建立者
  {
    q: { zh: '明朝的建立者是？', en: 'Who founded the Ming Dynasty?' },
    options: [
      { zh: '朱棣', en: 'Zhu Di' },
      { zh: '朱允炆', en: 'Zhu Yunwen' },
      { zh: '朱元璋', en: 'Zhu Yuanzhang (Emperor Taizu of Ming)' },
      { zh: '朱厚照', en: 'Zhu Houzhao' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1368年朱元璋在应天称帝，国号大明，同年攻克大都，推翻元朝。', en: 'In 1368 Zhu Yuanzhang proclaimed himself emperor at Yingtian with the dynasty name Ming and captured Dadu the same year, ending the Yuan.' },
    myth: false,
  },
  // Q56 靖难之役
  {
    q: { zh: '明初发动"靖难之役"夺取皇位的是？', en: 'Who launched the "Jingnan Campaign" to seize the Ming throne?' },
    options: [
      { zh: '朱标', en: 'Zhu Biao' },
      { zh: '朱允炆', en: 'Zhu Yunwen' },
      { zh: '朱元璋', en: 'Zhu Yuanzhang' },
      { zh: '朱棣', en: 'Zhu Di (the Yongle Emperor)' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1399年燕王朱棣以"清君侧"为名起兵，三年后攻入南京即位，是为明成祖。', en: 'In 1399 the Prince of Yan Zhu Di rose "to clear the emperor\'s side"; three years later he entered Nanjing and ascended as the Yongle Emperor.' },
    myth: false,
  },
  // Q57 郑和下西洋
  {
    q: { zh: '郑和下西洋发生在哪位明朝皇帝在位期间？', en: 'Under which Ming emperor did Zheng He\'s voyages to the Western Seas take place?' },
    options: [
      { zh: '明成祖', en: 'the Yongle Emperor' },
      { zh: '明太祖', en: 'the Hongwu Emperor' },
      { zh: '明世宗', en: 'the Jiajing Emperor' },
      { zh: '明神宗', en: 'the Wanli Emperor' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '明成祖朱棣于1405年至1433年间七次派郑和率船队下西洋，远航至东非。', en: 'Between 1405 and 1433 the Yongle Emperor dispatched Zheng He on seven western voyages reaching as far as East Africa.' },
    myth: false,
  },
  // Q58 明迁都北京
  {
    q: { zh: '明朝正式迁都北京发生在哪个时期？', en: 'When did the Ming Dynasty formally move its capital to Beijing?' },
    options: [
      { zh: '洪武年间', en: 'Hongwu reign' },
      { zh: '永乐年间', en: 'Yongle reign' },
      { zh: '嘉靖年间', en: 'Jiajing reign' },
      { zh: '万历年间', en: 'Wanli reign' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1421年明成祖迁都北京，原京师改称南京，自此北京成为明朝政治中心。', en: 'In 1421 the Yongle Emperor moved the capital to Beijing; the former capital was renamed Nanjing, and Beijing became the Ming political center.' },
    myth: false,
  },
  // Q59 王阳明
  {
    q: { zh: '提出"知行合一"的明代思想家是？', en: 'Which Ming thinker proposed the "unity of knowledge and action"?' },
    options: [
      { zh: '陆九渊', en: 'Lu Jiuyuan' },
      { zh: '朱熹', en: 'Zhu Xi' },
      { zh: '王阳明', en: 'Wang Yangming' },
      { zh: '顾炎武', en: 'Gu Yanwu' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '王阳明在贵州龙场悟道后提出"心即理""知行合一""致良知"，集心学之大成。', en: 'After his enlightenment at Longchang in Guizhou, Wang Yangming proposed that "mind is principle," "unity of knowledge and action," and "extending innate knowledge," synthesizing the School of Mind.' },
    myth: false,
  },
  // Q60 张居正改革
  {
    q: { zh: '明朝中后期推行"一条鞭法"改革的首辅是？', en: 'Which Ming senior grand secretary implemented the Single Whip Method reform?' },
    options: [
      { zh: '张居正', en: 'Zhang Juzheng' },
      { zh: '严嵩', en: 'Yan Song' },
      { zh: '徐阶', en: 'Xu Jie' },
      { zh: '高拱', en: 'Gao Gong' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '万历初年张居正任首辅，推行清丈田亩、一条鞭法等改革，使明朝国力一度恢复。', en: 'In the early Wanli reign Zhang Juzheng as senior grand secretary carried out cadastral surveys and the Single Whip Method, briefly restoring Ming strength.' },
    myth: false,
  },
  // Q61 李自成
  {
    q: { zh: '1644年攻入北京推翻明朝的农民起义领袖是？', en: 'Which peasant rebel leader captured Beijing in 1644, toppling the Ming Dynasty?' },
    options: [
      { zh: '李自成', en: 'Li Zicheng' },
      { zh: '张献忠', en: 'Zhang Xianzhong' },
      { zh: '高迎祥', en: 'Gao Yingxiang' },
      { zh: '黄巢', en: 'Huang Chao' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1644年李自成率大顺军攻入北京，明思宗自缢，明朝灭亡。', en: 'In 1644 Li Zicheng\'s Great Shun army entered Beijing; Emperor Sizong of Ming hanged himself and the Ming fell.' },
    myth: false,
  },
  // Q62 清军入关
  {
    q: { zh: '清军入关发生在哪一年？', en: 'In what year did Qing forces enter the Shanhai Pass?' },
    options: [
      { zh: '1640年', en: '1640 AD' },
      { zh: '1644年', en: '1644 AD' },
      { zh: '1661年', en: '1661 AD' },
      { zh: '1683年', en: '1683 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1644年吴三桂引清军入关，多尔衮率军在山海关击败李自成，清军入主中原。', en: 'In 1644 Wu Sangui led the Qing through the pass; Dorgon\'s army defeated Li Zicheng at Shanhaiguan and the Qing entered the Central Plains.' },
    myth: false,
  },
  // Q63 清朝入关后首位皇帝
  {
    q: { zh: '清朝入关后的第一位皇帝是？', en: 'Who was the first Qing emperor to reign after entering the pass?' },
    options: [
      { zh: '顺治帝', en: 'the Shunzhi Emperor' },
      { zh: '康熙帝', en: 'the Kangxi Emperor' },
      { zh: '雍正帝', en: 'the Yongzheng Emperor' },
      { zh: '乾隆帝', en: 'the Qianlong Emperor' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1644年清军入关后顺治帝福临在北京即位，成为清朝入关后的首位皇帝。', en: 'After the Qing entered the pass in 1644, the Shunzhi Emperor (Fulin) was enthroned in Beijing as the first Qing emperor to rule over China proper.' },
    myth: false,
  },
  // Q64 平三藩
  {
    q: { zh: '平定吴三桂等"三藩之乱"的清朝皇帝是？', en: 'Which Qing emperor suppressed the "Rebellion of the Three Feudatories" led by Wu Sangui?' },
    options: [
      { zh: '顺治帝', en: 'the Shunzhi Emperor' },
      { zh: '雍正帝', en: 'the Yongzheng Emperor' },
      { zh: '乾隆帝', en: 'the Qianlong Emperor' },
      { zh: '康熙帝', en: 'the Kangxi Emperor' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1673年至1681年康熙帝历时八年平定三藩，巩固了清朝对全国的统治。', en: 'From 1673 to 1681 the Kangxi Emperor spent eight years suppressing the Three Feudatories, consolidating Qing rule over China.' },
    myth: false,
  },
  // Q65 四库全书
  {
    q: { zh: '乾隆年间下令编纂的大型丛书是？', en: 'What massive book series was compiled under the Qianlong Emperor\'s order?' },
    options: [
      { zh: '四库全书', en: 'Siku Quanshu (Complete Library in Four Sections)' },
      { zh: '永乐大典', en: 'Yongle Encyclopedia' },
      { zh: '古今图书集成', en: 'Gujin Tushu Jicheng' },
      { zh: '大清律例', en: 'Great Qing Legal Code' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1773年至1782年乾隆帝组织编纂《四库全书》，收录图书三千四百余种，是中国古代最大丛书。', en: 'From 1773 to 1782 the Qianlong Emperor oversaw compilation of the Siku Quanshu, with over 3,400 works, the largest book series in imperial China.' },
    myth: false,
  },
  // Q66 鸦片战争
  {
    q: { zh: '第一次鸦片战争爆发于哪一年？', en: 'In what year did the First Opium War break out?' },
    options: [
      { zh: '1839年', en: '1839 AD' },
      { zh: '1840年', en: '1840 AD' },
      { zh: '1842年', en: '1842 AD' },
      { zh: '1856年', en: '1856 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1840年6月英国舰队封锁珠江口挑起战争，鸦片战争正式爆发，1842年清朝战败。', en: 'In June 1840 a British fleet blockaded the Pearl River estuary and the war began; the Qing was defeated in 1842.' },
    myth: false,
  },
  // Q67 南京条约
  {
    q: { zh: '中国近代史上第一个不平等条约是？', en: 'What was the first unequal treaty in modern Chinese history?' },
    options: [
      { zh: '马关条约', en: 'Treaty of Shimonoseki' },
      { zh: '北京条约', en: 'Convention of Beijing' },
      { zh: '南京条约', en: 'Treaty of Nanjing' },
      { zh: '辛丑条约', en: 'Boxer Protocol' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1842年8月清政府被迫签订《南京条约》，割让香港岛、开放五口通商、赔款2100万银元。', en: 'In August 1842 the Qing was forced to sign the Treaty of Nanjing, ceding Hong Kong Island, opening five treaty ports, and paying 21 million silver dollars.' },
    myth: false,
  },
  // Q68 太平天国
  {
    q: { zh: '太平天国运动的领导者是？', en: 'Who led the Taiping Heavenly Kingdom movement?' },
    options: [
      { zh: '杨秀清', en: 'Yang Xiuqing' },
      { zh: '石达开', en: 'Shi Dakai' },
      { zh: '李秀成', en: 'Li Xiucheng' },
      { zh: '洪秀全', en: 'Hong Xiuquan' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1851年洪秀全在广西金田村起义，建号"太平天国"，运动持续至1864年失败。', en: 'In 1851 Hong Xiuquan rose at Jintian in Guangxi and founded the "Taiping Heavenly Kingdom," which lasted until its defeat in 1864.' },
    myth: false,
  },
  // Q69 洋务运动
  {
    q: { zh: '洋务运动时期以"自强"为口号主要兴办的是？', en: 'What did the "Self-Strengthening" movement of the 1860s-1890s primarily build under the "ziqiang" slogan?' },
    options: [
      { zh: '军事工业', en: 'Military industry' },
      { zh: '民用工业', en: 'Civilian industry' },
      { zh: '现代教育', en: 'Modern education' },
      { zh: '铁路干线', en: 'Railway trunk lines' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '洋务运动前期以"自强"为口号兴办近代军事工业，如安庆内军械所、江南制造总局。', en: 'In its early phase the Self-Strengthening Movement, under the slogan "self-strengthening," built modern military industries such as the Anqing Inner Arsenal and Jiangnan Arsenal.' },
    myth: false,
  },
  // Q70 甲午战争
  {
    q: { zh: '甲午中日战争爆发于哪一年？', en: 'In what year did the First Sino-Japanese War break out?' },
    options: [
      { zh: '1884年', en: '1884 AD' },
      { zh: '1894年', en: '1894 AD' },
      { zh: '1904年', en: '1904 AD' },
      { zh: '1914年', en: '1914 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1894年7月日本挑起甲午战争，1895年北洋水师全军覆没，清朝战败。', en: 'In July 1894 Japan provoked the First Sino-Japanese War; in 1895 the Beiyang Fleet was annihilated and the Qing was defeated.' },
    myth: false,
  },
  // Q71 马关条约
  {
    q: { zh: '甲午战争后清政府被迫签订的条约是？', en: 'Which treaty was the Qing forced to sign after the First Sino-Japanese War?' },
    options: [
      { zh: '南京条约', en: 'Treaty of Nanjing' },
      { zh: '辛丑条约', en: 'Boxer Protocol' },
      { zh: '马关条约', en: 'Treaty of Shimonoseki' },
      { zh: '朴茨茅斯和约', en: 'Treaty of Portsmouth' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1895年4月李鸿章与日本签订《马关条约》，割让辽东半岛、台湾及澎湖列岛，赔款二亿两。', en: 'In April 1895 Li Hongzhang signed the Treaty of Shimonoseki, ceding the Liaodong Peninsula, Taiwan, and the Penghu Islands, and paying 200 million taels.' },
    myth: false,
  },
  // Q72 戊戌变法
  {
    q: { zh: '"戊戌变法"发生在哪一年？', en: 'In what year did the "Wuxu Reform" take place?' },
    options: [
      { zh: '1894年', en: '1894 AD' },
      { zh: '1898年', en: '1898 AD' },
      { zh: '1900年', en: '1900 AD' },
      { zh: '1911年', en: '1911 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1898年6月至9月光绪帝推行变法，因慈禧太后发动政变失败，前后仅103天。', en: 'From June to September 1898 the Guangxu Emperor pushed reforms that ended when Empress Dowager Cixi staged a coup; it lasted only 103 days.' },
    myth: false,
  },
  // Q73 百日维新
  {
    q: { zh: '"戊戌变法"又称？', en: 'The "Wuxu Reform" is also known as?' },
    options: [
      { zh: '百日维新', en: 'Hundred Days\' Reform' },
      { zh: '明治维新', en: 'Meiji Restoration' },
      { zh: '戊戌政变', en: 'Wuxu Coup' },
      { zh: '同治维新', en: 'Tongzhi Restoration' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '因变法仅持续103天，史称"百日维新"。', en: 'Because the reform lasted only 103 days, it is known as the "Hundred Days\' Reform."' },
    myth: false,
  },
  // Q74 辛亥革命
  {
    q: { zh: '1911年在中国爆发的资产阶级民主革命是？', en: 'What bourgeois democratic revolution broke out in China in 1911?' },
    options: [
      { zh: '太平天国运动', en: 'Taiping Movement' },
      { zh: '义和团运动', en: 'Boxer Rebellion' },
      { zh: '北伐战争', en: 'Northern Expedition' },
      { zh: '辛亥革命', en: 'Xinhai Revolution' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1911年10月10日武昌起义爆发，各省纷纷响应，辛亥革命推翻了清朝统治。', en: 'On October 10, 1911, the Wuchang Uprising broke out; provinces responded one after another, and the Xinhai Revolution ended Qing rule.' },
    myth: false,
  },
  // Q75 中华民国成立
  {
    q: { zh: '中华民国成立于哪一年？', en: 'In what year was the Republic of China founded?' },
    options: [
      { zh: '1911年', en: '1911 AD' },
      { zh: '1912年', en: '1912 AD' },
      { zh: '1919年', en: '1919 AD' },
      { zh: '1921年', en: '1921 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1912年1月1日孙中山在南京就任临时大总统，中华民国正式成立。', en: 'On January 1, 1912, Sun Yat-sen took office as Provisional President in Nanjing, and the Republic of China was formally established.' },
    myth: false,
  },
  // Q76 五四运动
  {
    q: { zh: '五四运动爆发于哪一年？', en: 'In what year did the May Fourth Movement break out?' },
    options: [
      { zh: '1911年', en: '1911 AD' },
      { zh: '1912年', en: '1912 AD' },
      { zh: '1921年', en: '1921 AD' },
      { zh: '1919年', en: '1919 AD' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1919年5月4日巴黎和会上中国外交失败引发北京学生游行，五四运动由此爆发。', en: 'On May 4, 1919, the failure of Chinese diplomacy at the Paris Peace Conference sparked Beijing student demonstrations, beginning the May Fourth Movement.' },
    myth: false,
  },
  // Q77 中共一大
  {
    q: { zh: '中国共产党第一次全国代表大会召开于哪一年？', en: 'In what year was the First National Congress of the Chinese Communist Party held?' },
    options: [
      { zh: '1919年', en: '1919 AD' },
      { zh: '1927年', en: '1927 AD' },
      { zh: '1921年', en: '1921 AD' },
      { zh: '1931年', en: '1931 AD' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1921年7月23日中共一大在上海召开，最后一天转移到浙江嘉兴南湖游船上。', en: 'On July 23, 1921, the First Congress opened in Shanghai and was moved to a boat on South Lake in Jiaxing, Zhejiang, for its final day.' },
    myth: false,
  },
  // Q78 中共一大地点
  {
    q: { zh: '中国共产党第一次全国代表大会的召开地点是？', en: 'Where was the First National Congress of the Chinese Communist Party held?' },
    options: [
      { zh: '北京', en: 'Beijing' },
      { zh: '上海（后转至嘉兴南湖）', en: 'Shanghai (later moved to South Lake, Jiaxing)' },
      { zh: '广州', en: 'Guangzhou' },
      { zh: '武汉', en: 'Wuhan' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '中共一大在上海法租界召开，因受巡捕搜查最后一天转移到嘉兴南湖游船。', en: 'The First Congress met in Shanghai\'s French Concession and, after a police search, moved to a boat on South Lake in Jiaxing for the final day.' },
    myth: false,
  },
  // Q79 九一八事变
  {
    q: { zh: '1931年9月18日发生在沈阳、日本侵华开端的事件是？', en: 'What incident near Shenyang on September 18, 1931 marked the start of Japan\'s invasion of China?' },
    options: [
      { zh: '七七事变', en: 'July 7 (Marco Polo Bridge) Incident' },
      { zh: '西安事变', en: 'Xi\'an Incident' },
      { zh: '八一三事变', en: 'August 13 Incident' },
      { zh: '九一八事变', en: 'September 18 (Mukden) Incident' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1931年9月18日日军炸毁柳条湖铁路并嫁祸中国军队，侵占沈阳，史称"九一八事变"。', en: 'On September 18, 1931, Japanese troops blew up the Liutiaohu railway and blamed Chinese forces, then seized Shenyang, called the "Mukden Incident."' },
    myth: false,
  },
  // Q80 长征
  {
    q: { zh: '中国工农红军长征开始于哪一年？', en: 'In what year did the Chinese Red Army\'s Long March begin?' },
    options: [
      { zh: '1931年', en: '1931 AD' },
      { zh: '1934年', en: '1934 AD' },
      { zh: '1937年', en: '1937 AD' },
      { zh: '1945年', en: '1945 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1934年10月中央红军从江西瑞金等地出发开始长征，1936年10月三大主力在会宁会师。', en: 'In October 1934 the Central Red Army set out from Ruijin in Jiangxi, beginning the Long March; the three main forces met at Huining in October 1936.' },
    myth: false,
  },
  // Q81 遵义会议
  {
    q: { zh: '长征途中确立毛泽东在党和红军中领导地位的会议是？', en: 'Which meeting during the Long March established Mao Zedong\'s leadership in the Party and Red Army?' },
    options: [
      { zh: '遵义会议', en: 'Zunyi Conference' },
      { zh: '八七会议', en: 'August 7th Meeting' },
      { zh: '古田会议', en: 'Gutian Congress' },
      { zh: '瓦窑堡会议', en: 'Wayaobao Meeting' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1935年1月在贵州遵义召开的会议确立了毛泽东在党和红军中的领导地位，是党史上生死攸关的转折点。', en: 'The January 1935 meeting in Zunyi, Guizhou, established Mao Zedong\'s leadership in the Party and Red Army, a turning point in Party history.' },
    myth: false,
  },
  // Q82 七七事变
  {
    q: { zh: '1937年7月7日发生在北平（今北京）附近的标志着全面抗战开始的事件是？', en: 'What event near Beiping (Beijing) on July 7, 1937 marked the start of full-scale war between China and Japan?' },
    options: [
      { zh: '九一八事变', en: 'Mukden Incident' },
      { zh: '七七事变', en: 'July 7 (Marco Polo Bridge) Incident' },
      { zh: '西安事变', en: 'Xi\'an Incident' },
      { zh: '一二八事变', en: 'January 28 Incident' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1937年7月7日日军在卢沟桥挑起冲突，中国守军奋起抵抗，标志着中国全面抗战开始。', en: 'On July 7, 1937, Japanese troops provoked a clash at the Marco Polo Bridge; Chinese defenders resisted, marking the start of full-scale Chinese resistance against Japan.' },
    myth: false,
  },
  // Q83 抗战胜利纪念日
  {
    q: { zh: '中国人民抗日战争胜利纪念日是哪一天？', en: 'What date is designated as China\'s Victory Day of the War of Resistance against Japanese Aggression?' },
    options: [
      { zh: '8月15日', en: 'August 15' },
      { zh: '9月2日', en: 'September 2' },
      { zh: '9月3日', en: 'September 3' },
      { zh: '9月9日', en: 'September 9' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1945年9月2日日本签署投降书，9月3日被定为中国人民抗日战争胜利纪念日。', en: 'On September 2, 1945 Japan signed the surrender; September 3 was designated Victory Day of the Chinese War of Resistance against Japanese Aggression.' },
    myth: false,
  },
  // Q84 中华人民共和国成立
  {
    q: { zh: '中华人民共和国成立于哪一年？', en: 'In what year was the People\'s Republic of China founded?' },
    options: [
      { zh: '1945年', en: '1945 AD' },
      { zh: '1949年', en: '1949 AD' },
      { zh: '1950年', en: '1950 AD' },
      { zh: '1953年', en: '1953 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1949年10月1日毛泽东在天安门宣告中华人民共和国中央人民政府成立。', en: 'On October 1, 1949, Mao Zedong proclaimed the founding of the Central People\'s Government of the People\'s Republic of China at Tian\'anmen.' },
    myth: false,
  },
  // Q85 抗美援朝
  {
    q: { zh: '中国人民志愿军抗美援朝出国作战开始于哪一年？', en: 'In what year did the Chinese People\'s Volunteers cross the Yalu to fight in the Korean War?' },
    options: [
      { zh: '1950年', en: '1950 AD' },
      { zh: '1949年', en: '1949 AD' },
      { zh: '1953年', en: '1953 AD' },
      { zh: '1958年', en: '1958 AD' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1950年10月中国人民志愿军入朝作战，1953年7月签订朝鲜停战协定。', en: 'In October 1950 the Chinese People\'s Volunteers entered Korea; in July 1953 the Korean Armistice Agreement was signed.' },
    myth: false,
  },
  // Q86 改革开放
  {
    q: { zh: '中国改革开放政策开始于哪一年？', en: 'In what year did China\'s Reform and Opening-up begin?' },
    options: [
      { zh: '1976年', en: '1976 AD' },
      { zh: '1980年', en: '1980 AD' },
      { zh: '1978年', en: '1978 AD' },
      { zh: '1992年', en: '1992 AD' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1978年12月中共十一届三中全会作出改革开放的决策，开启了改革开放新时期。', en: 'In December 1978 the Third Plenum of the Eleventh Central Committee made the decision on reform and opening-up, opening a new era.' },
    myth: false,
  },
  // Q87 香港回归
  {
    q: { zh: '香港回归祖国的时间是？', en: 'When did Hong Kong return to Chinese sovereignty?' },
    options: [
      { zh: '1984年12月19日', en: 'December 19, 1984' },
      { zh: '2001年7月1日', en: 'July 1, 2001' },
      { zh: '1999年12月20日', en: 'December 20, 1999' },
      { zh: '1997年7月1日', en: 'July 1, 1997' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1997年7月1日中国政府对香港恢复行使主权，香港特别行政区成立。', en: 'On July 1, 1997, China resumed exercise of sovereignty over Hong Kong, and the Hong Kong Special Administrative Region was established.' },
    myth: false,
  },
  // Q88 澳门回归
  {
    q: { zh: '澳门回归祖国的时间是？', en: 'When did Macao return to Chinese sovereignty?' },
    options: [
      { zh: '1987年4月13日', en: 'April 13, 1987' },
      { zh: '1997年7月1日', en: 'July 1, 1997' },
      { zh: '1999年12月20日', en: 'December 20, 1999' },
      { zh: '2002年1月1日', en: 'January 1, 2002' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1999年12月20日中国政府对澳门恢复行使主权，澳门特别行政区成立。', en: 'On December 20, 1999, China resumed exercise of sovereignty over Macao, and the Macao Special Administrative Region was established.' },
    myth: false,
  },
  // Q89 美尼斯
  {
    q: { zh: '相传统一上、下埃及、建立第一王朝的奠基者是？', en: 'Who is traditionally regarded as the unifier of Upper and Lower Egypt and founder of the First Dynasty?' },
    options: [
      { zh: '美尼斯', en: 'Narmer/Menes' },
      { zh: '图特摩斯三世', en: 'Thutmose III' },
      { zh: '拉美西斯二世', en: 'Ramesses II' },
      { zh: '克利奥帕特拉七世', en: 'Cleopatra VII' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '美尼斯（那尔迈）统一上下埃及，被视为古埃及第一王朝的奠基者。', en: 'Menes (Narmer) unified Upper and Lower Egypt and is regarded as the founder of the First Dynasty of Egypt.' },
    myth: false,
  },
  // Q90 胡夫金字塔
  {
    q: { zh: '古埃及金字塔中规模最大的是？', en: 'Which is the largest of the ancient Egyptian pyramids?' },
    options: [
      { zh: '哈夫拉金字塔', en: 'Pyramid of Khafre' },
      { zh: '胡夫金字塔', en: 'Great Pyramid of Khufu (Cheops)' },
      { zh: '门卡拉金字塔', en: 'Pyramid of Menkaure' },
      { zh: '阶梯金字塔', en: 'Step Pyramid of Djoser' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '胡夫金字塔高约146.5米，是吉萨三大金字塔中最大者，古代世界七大奇迹之一。', en: 'The Great Pyramid of Khufu, about 146.5 m tall, is the largest of the Giza pyramids and one of the Seven Wonders of the Ancient World.' },
    myth: false,
  },
  // Q91 汉谟拉比法典
  {
    q: { zh: '古巴比伦国王汉谟拉比颁布的法典是？', en: 'What code was issued by the Babylonian king Hammurabi?' },
    options: [
      { zh: '十二铜表法', en: 'Twelve Tables' },
      { zh: '查士丁尼法典', en: 'Code of Justinian' },
      { zh: '汉谟拉比法典', en: 'Code of Hammurabi' },
      { zh: '大宪章', en: 'Magna Carta' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '《汉谟拉比法典》刻于黑色玄武岩石柱上，是世界上现存最早较完整的成文法典之一。', en: 'The Code of Hammurabi, inscribed on a black basalt stele, is among the earliest and most complete written legal codes surviving from antiquity.' },
    myth: false,
  },
  // Q92 摩亨佐-达罗
  {
    q: { zh: '古代印度河流域文明的代表性城市遗址是？', en: 'Which is a representative city site of the ancient Indus Valley Civilization?' },
    options: [
      { zh: '巴比伦', en: 'Babylon' },
      { zh: '尼尼微', en: 'Nineveh' },
      { zh: '特洛伊', en: 'Troy' },
      { zh: '摩亨佐-达罗', en: 'Mohenjo-daro' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '摩亨佐-达罗与哈拉帕是印度河流域文明的两座代表城市，约公元前2500年至前1900年繁荣。', en: 'Mohenjo-daro and Harappa are the two representative cities of the Indus Valley Civilization, flourishing about 2500-1900 BC.' },
    myth: false,
  },
  // Q93 伯里克利时代
  {
    q: { zh: '古希腊雅典民主政治的极盛时期出现在？', en: 'When did Athenian democracy reach its peak in ancient Greece?' },
    options: [
      { zh: '伯里克利时代', en: 'Age of Pericles' },
      { zh: '梭伦时代', en: 'Age of Solon' },
      { zh: '亚历山大时代', en: 'Age of Alexander' },
      { zh: '屋大维时代', en: 'Age of Augustus' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元前5世纪伯里克利执政时期雅典民主政治达到极盛，所有成年男性公民可参与公民大会。', en: 'In the 5th century BC under Pericles, Athenian democracy reached its peak, with all adult male citizens eligible to attend the assembly.' },
    myth: false,
  },
  // Q94 柏拉图的老师
  {
    q: { zh: '古希腊哲学家柏拉图的老师是？', en: 'Who was the teacher of the Greek philosopher Plato?' },
    options: [
      { zh: '亚里士多德', en: 'Aristotle' },
      { zh: '毕达哥拉斯', en: 'Pythagoras' },
      { zh: '赫拉克利特', en: 'Heraclitus' },
      { zh: '苏格拉底', en: 'Socrates' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '苏格拉底是柏拉图的老师，柏拉图又教出亚里士多德，三人合称"希腊三哲"。', en: 'Socrates taught Plato, who in turn taught Aristotle; the three are known together as the "Three Greek Philosophers."' },
    myth: false,
  },
  // Q95 亚里士多德的老师
  {
    q: { zh: '古希腊哲学家亚里士多德的老师是？', en: 'Who was the teacher of the Greek philosopher Aristotle?' },
    options: [
      { zh: '苏格拉底', en: 'Socrates' },
      { zh: '毕达哥拉斯', en: 'Pythagoras' },
      { zh: '柏拉图', en: 'Plato' },
      { zh: '德谟克利特', en: 'Democritus' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '亚里士多德17岁入柏拉图学园学习约二十年，师从柏拉图。', en: 'Aristotle entered Plato\'s Academy at about 17 and studied under Plato for some twenty years.' },
    myth: false,
  },
  // Q96 亚历山大的老师
  {
    q: { zh: '马其顿国王亚历山大大帝的老师是？', en: 'Who was the tutor of Alexander the Great of Macedon?' },
    options: [
      { zh: '苏格拉底', en: 'Socrates' },
      { zh: '亚里士多德', en: 'Aristotle' },
      { zh: '柏拉图', en: 'Plato' },
      { zh: '第欧根尼', en: 'Diogenes' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '公元前343年亚里士多德受腓力二世之聘担任13岁亚历山大的老师，执教三年。', en: 'In 343 BC Aristotle was engaged by Philip II to tutor the 13-year-old Alexander, teaching him for three years.' },
    myth: false,
  },
  // Q97 凯撒
  {
    q: { zh: '古罗马共和国末期被刺杀的著名独裁官是？', en: 'Which late Roman Republic dictator was famously assassinated?' },
    options: [
      { zh: '凯撒', en: 'Julius Caesar' },
      { zh: '屋大维', en: 'Augustus' },
      { zh: '克拉苏', en: 'Crassus' },
      { zh: '庞培', en: 'Pompey' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元前44年3月15日凯撒在元老院被布鲁图斯等人刺杀，结束其独裁统治。', en: 'On March 15, 44 BC (the Ides of March), Caesar was assassinated in the Senate by Brutus and others, ending his dictatorship.' },
    myth: false,
  },
  // Q98 屋大维
  {
    q: { zh: '罗马帝国的第一位皇帝是？', en: 'Who was the first emperor of the Roman Empire?' },
    options: [
      { zh: '凯撒', en: 'Julius Caesar' },
      { zh: '屋大维', en: 'Augustus (Octavian)' },
      { zh: '尼禄', en: 'Nero' },
      { zh: '图拉真', en: 'Trajan' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '公元前27年元老院授予屋大维"奥古斯都"称号，标志着罗马帝国时代的开始。', en: 'In 27 BC the Senate granted Octavian the title "Augustus," marking the beginning of the Roman Empire.' },
    myth: false,
  },
  // Q99 西罗马灭亡
  {
    q: { zh: '西罗马帝国灭亡于哪一年？', en: 'In what year did the Western Roman Empire fall?' },
    options: [
      { zh: '公元27年', en: '27 AD' },
      { zh: '公元284年', en: '284 AD' },
      { zh: '公元476年', en: '476 AD' },
      { zh: '公元1453年', en: '1453 AD' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '公元476年日耳曼人首领奥多亚塞废黜西罗马末帝罗慕路斯·奥古斯都，西罗马灭亡。', en: 'In 476 AD the Germanic leader Odoacer deposed the last Western Roman emperor, Romulus Augustulus, ending the Western Roman Empire.' },
    myth: false,
  },
  // Q100 黑死病
  {
    q: { zh: '中世纪欧洲大流行的"黑死病"主要是哪种疾病？', en: 'What disease was the medieval European "Black Death" primarily?' },
    options: [
      { zh: '天花', en: 'Smallpox' },
      { zh: '霍乱', en: 'Cholera' },
      { zh: '流感', en: 'Influenza' },
      { zh: '鼠疫', en: 'Bubonic plague' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '黑死病即鼠疫，由鼠蚤传播的鼠疫杆菌引起，14世纪欧洲大流行造成约三分之一人口死亡。', en: 'The Black Death was bubonic plague caused by Yersinia pestis and transmitted by rat fleas; the 14th-century pandemic killed about one third of Europe\'s population.' },
    myth: false,
  },
  // Q101 查理曼大帝
  {
    q: { zh: '中世纪法兰克王国最著名的国王、被加冕为"罗马人皇帝"的是？', en: 'Which Frankish king was crowned "Emperor of the Romans" in the Middle Ages?' },
    options: [
      { zh: '查理曼大帝', en: 'Charlemagne' },
      { zh: '克洛维', en: 'Clovis' },
      { zh: '虔诚者路易', en: 'Louis the Pious' },
      { zh: '秃头查理', en: 'Charles the Bald' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '公元800年圣诞节教皇利奥三世在罗马为查理曼加冕，标志着神圣罗马帝国观念的萌芽。', en: 'On Christmas Day 800, Pope Leo III crowned Charlemagne in Rome, seeding the idea of a Holy Roman Empire.' },
    myth: false,
  },
  // Q102 文艺复兴起源
  {
    q: { zh: '欧洲文艺复兴运动发源于哪个国家？', en: 'In which country did the European Renaissance originate?' },
    options: [
      { zh: '法国', en: 'France' },
      { zh: '意大利', en: 'Italy' },
      { zh: '英国', en: 'England' },
      { zh: '德国', en: 'Germany' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '14世纪文艺复兴运动首先兴起于意大利的佛罗伦萨等城市，后扩展至全欧。', en: 'In the 14th century the Renaissance began in Italian cities such as Florence and then spread across Europe.' },
    myth: false,
  },
  // Q103 但丁
  {
    q: { zh: '文艺复兴先驱、长诗《神曲》的作者是？', en: 'Who is the Renaissance forerunner and author of the long poem Divine Comedy?' },
    options: [
      { zh: '彼特拉克', en: 'Petrarch' },
      { zh: '薄伽丘', en: 'Boccaccio' },
      { zh: '但丁', en: 'Dante Alighieri' },
      { zh: '达·芬奇', en: 'Leonardo da Vinci' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '但丁·阿利吉耶里是意大利文艺复兴先驱，代表作《神曲》分为地狱、炼狱、天堂三部。', en: 'Dante Alighieri, forerunner of the Italian Renaissance, wrote the Divine Comedy, divided into Inferno, Purgatorio, and Paradiso.' },
    myth: false,
  },
  // Q104 哥白尼
  {
    q: { zh: '提出"日心说"的波兰天文学家是？', en: 'Which Polish astronomer proposed the heliocentric model?' },
    options: [
      { zh: '伽利略', en: 'Galileo Galilei' },
      { zh: '托勒密', en: 'Ptolemy' },
      { zh: '开普勒', en: 'Johannes Kepler' },
      { zh: '哥白尼', en: 'Nicolaus Copernicus' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1543年哥白尼出版《天体运行论》，提出日心说，动摇了统治千年的地心说体系。', en: 'In 1543 Copernicus published On the Revolutions of the Celestial Spheres, proposing heliocentrism and shaking the thousand-year geocentric model.' },
    myth: false,
  },
  // Q105 哥伦布
  {
    q: { zh: '1492年率船队抵达美洲的航海家是？', en: 'Which explorer led a fleet to the Americas in 1492?' },
    options: [
      { zh: '哥伦布', en: 'Christopher Columbus' },
      { zh: '麦哲伦', en: 'Ferdinand Magellan' },
      { zh: '达·伽马', en: 'Vasco da Gama' },
      { zh: '迪亚士', en: 'Bartolomeu Dias' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1492年哥伦布率三艘小船从西班牙出发，10月12日抵达巴哈马群岛，开启地理大发现时代。', en: 'In 1492 Columbus set out from Spain with three small ships and on October 12 reached the Bahamas, opening the Age of Discovery.' },
    myth: false,
  },
  // Q106 麦哲伦环球
  {
    q: { zh: '完成人类首次环球航行的是？', en: 'Who completed the first circumnavigation of the globe?' },
    options: [
      { zh: '哥伦布船队', en: 'Columbus\'s fleet' },
      { zh: '麦哲伦船队', en: 'Magellan\'s fleet' },
      { zh: '达·伽马船队', en: 'Da Gama\'s fleet' },
      { zh: '迪亚士船队', en: 'Dias\'s fleet' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1519年至1522年麦哲伦率船队环球航行，麦哲伦本人死于菲律宾，由船员完成航程。', en: 'From 1519 to 1522 Magellan\'s fleet circumnavigated the globe; Magellan himself died in the Philippines and the crew completed the voyage.' },
    myth: false,
  },
  // Q107 马丁路德
  {
    q: { zh: '1517年发表《九十五条论纲》、发起宗教改革的是？', en: 'Who posted the Ninety-five Theses in 1517, sparking the Reformation?' },
    options: [
      { zh: '加尔文', en: 'John Calvin' },
      { zh: '茨温利', en: 'Huldrych Zwingli' },
      { zh: '马丁·路德', en: 'Martin Luther' },
      { zh: '亨利八世', en: 'Henry VIII' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1517年10月31日马丁·路德在维滕贝格教堂门口张贴《九十五条论纲》，开启宗教改革。', en: 'On October 31, 1517, Martin Luther posted the Ninety-five Theses at the church door in Wittenberg, beginning the Reformation.' },
    myth: false,
  },
  // Q108 光荣革命
  {
    q: { zh: '1688年英国未发生大规模流血冲突的政权更迭被称为？', en: 'What is the bloodless change of regime in England in 1688 called?' },
    options: [
      { zh: '玫瑰战争', en: 'Wars of the Roses' },
      { zh: '宪章运动', en: 'Chartist movement' },
      { zh: '清教徒革命', en: 'Puritan Revolution' },
      { zh: '光荣革命', en: 'Glorious Revolution' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1688年议会迎请威廉三世入主英国，詹姆士二世流亡法国，因未发生大规模流血冲突，史称"光荣革命"。', en: 'In 1688 Parliament invited William of Orange to take the throne; James II fled to France. With little bloodshed, it was called the "Glorious Revolution."' },
    myth: false,
  },
  // Q109 美国独立战争爆发
  {
    q: { zh: '美国独立战争爆发于哪一年？', en: 'In what year did the American Revolutionary War break out?' },
    options: [
      { zh: '1773年', en: '1773 AD' },
      { zh: '1775年', en: '1775 AD' },
      { zh: '1776年', en: '1776 AD' },
      { zh: '1783年', en: '1783 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1775年4月19日莱克星顿打响第一枪，美国独立战争爆发。', en: 'On April 19, 1775, the first shots at Lexington marked the start of the American Revolutionary War.' },
    myth: false,
  },
  // Q110 美国独立宣言
  {
    q: { zh: '《美国独立宣言》发表于哪一年？', en: 'In what year was the United States Declaration of Independence issued?' },
    options: [
      { zh: '1775年', en: '1775 AD' },
      { zh: '1781年', en: '1781 AD' },
      { zh: '1776年', en: '1776 AD' },
      { zh: '1783年', en: '1783 AD' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1776年7月4日大陆会议通过《独立宣言》，7月4日成为美国国庆日。', en: 'On July 4, 1776, the Continental Congress adopted the Declaration of Independence; July 4 became U.S. National Day.' },
    myth: false,
  },
  // Q111 法国大革命
  {
    q: { zh: '法国大革命爆发于哪一年？', en: 'In what year did the French Revolution break out?' },
    options: [
      { zh: '1776年', en: '1776 AD' },
      { zh: '1789年', en: '1789 AD' },
      { zh: '1793年', en: '1793 AD' },
      { zh: '1804年', en: '1804 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1789年7月14日巴黎民众攻占巴士底狱，标志法国大革命爆发。', en: 'On July 14, 1789, Parisians stormed the Bastille, marking the start of the French Revolution.' },
    myth: false,
  },
  // Q112 攻占巴士底狱
  {
    q: { zh: '法国大革命中攻占巴士底狱的日期是？', en: 'What is the date of the storming of the Bastille during the French Revolution?' },
    options: [
      { zh: '1789年8月26日', en: 'August 26, 1789' },
      { zh: '1793年1月21日', en: 'January 21, 1793' },
      { zh: '1799年11月9日', en: 'November 9, 1799' },
      { zh: '1789年7月14日', en: 'July 14, 1789' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1789年7月14日巴黎民众攻占象征封建统治的巴士底狱，7月14日成为法国国庆日。', en: 'On July 14, 1789, Parisians seized the Bastille, symbol of feudal rule; July 14 is France\'s National Day.' },
    myth: false,
  },
  // Q113 罗伯斯庇尔
  {
    q: { zh: '法国大革命时期雅各宾派的著名领导人是？', en: 'Who was the prominent leader of the Jacobins during the French Revolution?' },
    options: [
      { zh: '罗伯斯庇尔', en: 'Maximilien Robespierre' },
      { zh: '丹东', en: 'Georges Danton' },
      { zh: '马拉', en: 'Jean-Paul Marat' },
      { zh: '拿破仑', en: 'Napoleon Bonaparte' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '罗伯斯庇尔领导雅各宾派专政，推行恐怖统治，1794年7月被推翻并处死。', en: 'Robespierre led the Jacobin dictatorship and the Reign of Terror; he was overthrown and executed in July 1794.' },
    myth: false,
  },
  // Q114 拿破仑
  {
    q: { zh: '1804年加冕称帝的法国统治者是？', en: 'Which French ruler crowned himself emperor in 1804?' },
    options: [
      { zh: '路易十六', en: 'Louis XVI' },
      { zh: '拿破仑', en: 'Napoleon Bonaparte' },
      { zh: '路易十八', en: 'Louis XVIII' },
      { zh: '查理十世', en: 'Charles X' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1804年12月2日拿破仑在巴黎圣母院加冕称帝，建立法兰西第一帝国。', en: 'On December 2, 1804, Napoleon crowned himself emperor at Notre-Dame in Paris, founding the First French Empire.' },
    myth: false,
  },
  // Q115 瓦特
  {
    q: { zh: '改良蒸汽机、推动工业革命的英国发明家是？', en: 'Which British inventor improved the steam engine and propelled the Industrial Revolution?' },
    options: [
      { zh: '牛顿', en: 'Isaac Newton' },
      { zh: '哈格里夫斯', en: 'James Hargreaves' },
      { zh: '瓦特', en: 'James Watt' },
      { zh: '史蒂芬孙', en: 'George Stephenson' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1769年瓦特获得改良冷凝器蒸汽机的专利，大幅提升蒸汽机效率，成为工业革命象征。', en: 'In 1769 Watt patented his separate-condenser steam engine, greatly improving efficiency and becoming a symbol of the Industrial Revolution.' },
    myth: false,
  },
  // Q116 工业革命起源
  {
    q: { zh: '第一次工业革命起源于哪个国家？', en: 'In which country did the First Industrial Revolution originate?' },
    options: [
      { zh: '法国', en: 'France' },
      { zh: '德国', en: 'Germany' },
      { zh: '美国', en: 'the United States' },
      { zh: '英国', en: 'Britain' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '18世纪60年代工业革命首先在英国棉纺织业兴起，后扩散至欧美。', en: 'From the 1760s the Industrial Revolution began in Britain\'s cotton industry and then spread to Europe and America.' },
    myth: false,
  },
  // Q117 一战爆发
  {
    q: { zh: '第一次世界大战爆发于哪一年？', en: 'In what year did World War I break out?' },
    options: [
      { zh: '1914年', en: '1914 AD' },
      { zh: '1905年', en: '1905 AD' },
      { zh: '1918年', en: '1918 AD' },
      { zh: '1939年', en: '1939 AD' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1914年7月底奥匈帝国对塞尔维亚宣战，第一次世界大战正式爆发。', en: 'At the end of July 1914, Austria-Hungary declared war on Serbia, and World War I formally began.' },
    myth: false,
  },
  // Q118 萨拉热窝事件
  {
    q: { zh: '第一次世界大战的直接导火索是？', en: 'What was the direct trigger of World War I?' },
    options: [
      { zh: '波士顿倾茶事件', en: 'Boston Tea Party' },
      { zh: '萨拉热窝事件', en: 'Assassination at Sarajevo' },
      { zh: '卢沟桥事变', en: 'Marco Polo Bridge Incident' },
      { zh: '普拉西战役', en: 'Battle of Plassey' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1914年6月28日塞尔维亚青年普林西普在萨拉热窝刺杀奥匈皇储斐迪南夫妇，引发一战。', en: 'On June 28, 1914, the Serb nationalist Gavrilo Princip assassinated Archduke Franz Ferdinand and his wife in Sarajevo, triggering World War I.' },
    myth: false,
  },
  // Q119 一战结束
  {
    q: { zh: '第一次世界大战结束于哪一年？', en: 'In what year did World War I end?' },
    options: [
      { zh: '1914年', en: '1914 AD' },
      { zh: '1916年', en: '1916 AD' },
      { zh: '1918年', en: '1918 AD' },
      { zh: '1919年', en: '1919 AD' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1918年11月11日德国在贡比涅森林签署停战协定，第一次世界大战结束。', en: 'On November 11, 1918, Germany signed the armistice at Compiègne, ending World War I.' },
    myth: false,
  },
  // Q120 二战欧洲爆发
  {
    q: { zh: '第二次世界大战在欧洲全面爆发于哪一年？', en: 'In what year did World War II fully erupt in Europe?' },
    options: [
      { zh: '1931年', en: '1931 AD' },
      { zh: '1937年', en: '1937 AD' },
      { zh: '1941年', en: '1941 AD' },
      { zh: '1939年', en: '1939 AD' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1939年9月1日德国入侵波兰，9月3日英法对德宣战，二战在欧洲全面爆发。', en: 'On September 1, 1939, Germany invaded Poland; on September 3 Britain and France declared war, fully launching WWII in Europe.' },
    myth: false,
  },
  // Q121 珍珠港
  {
    q: { zh: '1941年12月7日日本偷袭美国哪个海军基地？', en: 'Which U.S. naval base did Japan attack on December 7, 1941?' },
    options: [
      { zh: '珍珠港', en: 'Pearl Harbor' },
      { zh: '中途岛', en: 'Midway' },
      { zh: '关岛', en: 'Guam' },
      { zh: '圣地亚哥', en: 'San Diego' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1941年12月7日日本偷袭珍珠港，次日美国对日宣战，太平洋战争爆发。', en: 'On December 7, 1941, Japan attacked Pearl Harbor; the United States declared war the next day, beginning the Pacific War.' },
    myth: false,
  },
  // Q122 诺曼底
  {
    q: { zh: '1944年6月6日盟军在法国北部的登陆战役是？', en: 'What was the Allied landing in northern France on June 6, 1944?' },
    options: [
      { zh: '敦刻尔克撤退', en: 'Dunkirk evacuation' },
      { zh: '诺曼底登陆', en: 'Normandy landings (D-Day)' },
      { zh: '西西里岛登陆', en: 'Sicily landings' },
      { zh: '安齐奥登陆', en: 'Anzio landings' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1944年6月6日盟军在诺曼底登陆，开辟欧洲第二战场，加速了纳粹德国的败亡。', en: 'On June 6, 1944, the Allies landed in Normandy, opening the second front in Europe and hastening Nazi Germany\'s defeat.' },
    myth: false,
  },
  // Q123 原子弹
  {
    q: { zh: '1945年8月美国向日本投掷原子弹的两座城市是？', en: 'Which two Japanese cities did the United States drop atomic bombs on in August 1945?' },
    options: [
      { zh: '东京和大阪', en: 'Tokyo and Osaka' },
      { zh: '京都和横滨', en: 'Kyoto and Yokohama' },
      { zh: '广岛和长崎', en: 'Hiroshima and Nagasaki' },
      { zh: '长崎和神户', en: 'Nagasaki and Kobe' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1945年8月6日和9日美国分别在广岛和长崎投下原子弹，加速日本无条件投降。', en: 'On August 6 and 9, 1945, the U.S. dropped atomic bombs on Hiroshima and Nagasaki, hastening Japan\'s unconditional surrender.' },
    myth: false,
  },
  // Q124 联合国
  {
    q: { zh: '联合国正式成立于哪一年？', en: 'In what year was the United Nations formally founded?' },
    options: [
      { zh: '1939年', en: '1939 AD' },
      { zh: '1945年', en: '1945 AD' },
      { zh: '1949年', en: '1949 AD' },
      { zh: '1955年', en: '1955 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1945年10月24日《联合国宪章》生效，联合国正式成立，10月24日为联合国日。', en: 'On October 24, 1945, the UN Charter took effect and the United Nations was formally founded; October 24 is United Nations Day.' },
    myth: false,
  },
  // Q125 杜鲁门主义
  {
    q: { zh: '1947年美国提出、被视为冷战开始标志的政策是？', en: 'What policy did the United States announce in 1947, regarded as the start of the Cold War?' },
    options: [
      { zh: '杜鲁门主义', en: 'Truman Doctrine' },
      { zh: '马歇尔计划', en: 'Marshall Plan' },
      { zh: '北约成立', en: 'Founding of NATO' },
      { zh: '大西洋宪章', en: 'Atlantic Charter' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1947年3月12日杜鲁门在国情咨文提出对受共产主义威胁的国家提供援助，史称"杜鲁门主义"。', en: 'On March 12, 1947, Truman offered U.S. aid to nations threatened by communism, the "Truman Doctrine," marking the Cold War\'s start.' },
    myth: false,
  },
  // Q126 柏林墙
  {
    q: { zh: '1989年11月象征冷战即将结束的事件是？', en: 'What event in November 1989 symbolized the approaching end of the Cold War?' },
    options: [
      { zh: '古巴导弹危机', en: 'Cuban Missile Crisis' },
      { zh: '柏林墙倒塌', en: 'Fall of the Berlin Wall' },
      { zh: '苏联解体', en: 'Dissolution of the Soviet Union' },
      { zh: '匈牙利事件', en: 'Hungarian Revolution of 1956' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1989年11月9日柏林墙开放，标志着东西德关系转折，是冷战结束的象征。', en: 'On November 9, 1989, the Berlin Wall opened, marking a turning point in inter-German relations and a symbol of the Cold War\'s end.' },
    myth: false,
  },
  // Q127 苏联解体
  {
    q: { zh: '苏联正式解体于哪一年？', en: 'In what year did the Soviet Union formally dissolve?' },
    options: [
      { zh: '1989年', en: '1989 AD' },
      { zh: '1991年', en: '1991 AD' },
      { zh: '1993年', en: '1993 AD' },
      { zh: '1998年', en: '1998 AD' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '1991年12月25日戈尔巴乔夫辞去苏联总统职务，次日苏联正式解体。', en: 'On December 25, 1991, Gorbachev resigned as Soviet president; the next day the Soviet Union formally dissolved.' },
    myth: false,
  },
  // Q128 荷马史诗
  {
    q: { zh: '古希腊《荷马史诗》由哪两部分组成？', en: 'The Greek Homeric epics consist of which two parts?' },
    options: [
      { zh: '工作与时日、神谱', en: 'Works and Days; Theogony' },
      { zh: '埃涅阿斯纪、变形记', en: 'Aeneid; Metamorphoses' },
      { zh: '史诗、抒情诗', en: 'Epic poetry; Lyric poetry' },
      { zh: '伊利亚特、奥德赛', en: 'Iliad; Odyssey' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '相传由盲诗人荷马所作的《伊利亚特》《奥德赛》是古希腊两部最伟大的史诗。', en: 'Attributed to the blind poet Homer, the Iliad and the Odyssey are the two greatest epic poems of ancient Greece.' },
    myth: false,
  },
  // Q129 罗马斗兽场
  {
    q: { zh: '罗马斗兽场（竞技场）建于哪个时期？', en: 'When was the Roman Colosseum built?' },
    options: [
      { zh: '罗马帝国', en: 'Roman Empire' },
      { zh: '罗马共和国', en: 'Roman Republic' },
      { zh: '西罗马帝国', en: 'Western Roman Empire' },
      { zh: '拜占庭帝国', en: 'Byzantine Empire' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '弗拉维王朝的韦帕芗下令、提图斯于公元80年正式建成罗马斗兽场。', en: 'Under the Flavian dynasty, Vespasian ordered and Titus formally inaugurated the Colosseum in 80 AD.' },
    myth: false,
  },
  // Q130 古代七大奇迹埃及
  {
    q: { zh: '古代世界七大奇迹中位于埃及的是？', en: 'Which of the Seven Wonders of the Ancient World was in Egypt?' },
    options: [
      { zh: '亚历山大灯塔', en: 'Lighthouse of Alexandria' },
      { zh: '吉萨大金字塔', en: 'Great Pyramid of Giza' },
      { zh: '巴比伦空中花园', en: 'Hanging Gardens of Babylon' },
      { zh: '阿尔忒弥斯神庙', en: 'Temple of Artemis at Ephesus' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '吉萨大金字塔是古代世界七大奇迹中唯一保存至今、位于埃及的奇迹。', en: 'The Great Pyramid of Giza is the only surviving wonder of the Seven Wonders of the Ancient World, located in Egypt.' },
    myth: false,
  },
  // Q131 黑死病大流行世纪
  {
    q: { zh: '欧洲黑死病大流行发生在哪个世纪？', en: 'In which century did the great European Black Death pandemic occur?' },
    options: [
      { zh: '11世纪', en: '11th century' },
      { zh: '13世纪', en: '13th century' },
      { zh: '14世纪', en: '14th century' },
      { zh: '17世纪', en: '17th century' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '1347年至1351年鼠疫席卷欧洲，造成约三分之一人口死亡，史称黑死病大流行。', en: 'From 1347 to 1351 plague swept Europe, killing about a third of the population, called the Black Death pandemic.' },
    myth: false,
  },
  // Q132 百年战争
  {
    q: { zh: '"百年战争"发生在哪两个国家之间？', en: 'The "Hundred Years\' War" was fought between which two countries?' },
    options: [
      { zh: '英法', en: 'England and France' },
      { zh: '英西', en: 'England and Spain' },
      { zh: '法德', en: 'France and Germany' },
      { zh: '法西', en: 'France and Spain' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1337年至1453年英格兰与法兰西之间断续进行的百年战争最终以法国胜利告终。', en: 'The intermittent Hundred Years\' War (1337-1453) between England and France ended in French victory.' },
    myth: false,
  },
  // Q133 君士坦丁堡
  {
    q: { zh: '1453年被奥斯曼帝国攻陷的东罗马帝国都城是？', en: 'What capital of the Eastern Roman Empire did the Ottoman Empire capture in 1453?' },
    options: [
      { zh: '君士坦丁堡', en: 'Constantinople' },
      { zh: '罗马', en: 'Rome' },
      { zh: '雅典', en: 'Athens' },
      { zh: '耶路撒冷', en: 'Jerusalem' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1453年5月29日奥斯曼苏丹穆罕默德二世攻克君士坦丁堡，东罗马帝国灭亡。', en: 'On May 29, 1453, Ottoman Sultan Mehmed II captured Constantinople, ending the Eastern Roman Empire.' },
    myth: false,
  },
  // Q134 日心说
  {
    q: { zh: '哥白尼在《天体运行论》中提出的学说是？', en: 'What theory did Copernicus propose in On the Revolutions of the Celestial Spheres?' },
    options: [
      { zh: '地心说', en: 'Geocentric model' },
      { zh: '日心说', en: 'Heliocentric model' },
      { zh: '月心说', en: 'Selenocentric model' },
      { zh: '神创说', en: 'Creationism' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '哥白尼在1543年出版的《天体运行论》中提出日心说，挑战了托勒密的地心说。', en: 'In his 1543 On the Revolutions of the Celestial Spheres, Copernicus proposed heliocentrism, challenging Ptolemy\'s geocentric model.' },
    myth: false,
  },
  // Q135 蒙娜丽莎
  {
    q: { zh: '文艺复兴时期创作《蒙娜丽莎》的意大利画家是？', en: 'Which Italian Renaissance painter created the Mona Lisa?' },
    options: [
      { zh: '米开朗基罗', en: 'Michelangelo' },
      { zh: '拉斐尔', en: 'Raphael' },
      { zh: '达·芬奇', en: 'Leonardo da Vinci' },
      { zh: '提香', en: 'Titian' },
    ],
    answer: 2,
    subject: 'history',
    explanation: { zh: '达·芬奇约于1503年至1519年间创作《蒙娜丽莎》，现藏于巴黎卢浮宫。', en: 'Leonardo da Vinci painted the Mona Lisa between about 1503 and 1519; it is now in the Louvre in Paris.' },
    myth: false,
  },
  // Q136 华盛顿
  {
    q: { zh: '美国第一任总统是？', en: 'Who was the first President of the United States?' },
    options: [
      { zh: '杰斐逊', en: 'Thomas Jefferson' },
      { zh: '富兰克林', en: 'Benjamin Franklin' },
      { zh: '亚当斯', en: 'John Adams' },
      { zh: '华盛顿', en: 'George Washington' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1789年华盛顿就任美国首任总统，连任两届后于1797年主动卸任，开创任期先例。', en: 'In 1789 Washington took office as the first U.S. president; after two terms he stepped down in 1797, setting a precedent.' },
    myth: false,
  },
  // Q137 林肯
  {
    q: { zh: '美国南北战争时期的总统是？', en: 'Who was the U.S. president during the Civil War?' },
    options: [
      { zh: '林肯', en: 'Abraham Lincoln' },
      { zh: '华盛顿', en: 'George Washington' },
      { zh: '罗斯福', en: 'Franklin Roosevelt' },
      { zh: '肯尼迪', en: 'John F. Kennedy' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1861年至1865年林肯领导北方赢得南北战争，1862年颁布《解放黑人奴隶宣言》。', en: 'From 1861 to 1865 Lincoln led the Union to victory in the Civil War and issued the Emancipation Proclamation in 1862.' },
    myth: false,
  },
  // Q138 南北战争原因
  {
    q: { zh: '美国南北战争爆发的根本原因是？', en: 'What was the fundamental cause of the American Civil War?' },
    options: [
      { zh: '关税争端', en: 'Tariff disputes' },
      { zh: '奴隶制存废之争', en: 'Dispute over the abolition of slavery' },
      { zh: '西部领土争夺', en: 'Struggle over western territories' },
      { zh: '银行制度冲突', en: 'Conflict over banking systems' },
    ],
    answer: 1,
    subject: 'history',
    explanation: { zh: '南北战争根本原因是南方奴隶制存废之争，并集中体现为南方蓄奴州与北方废奴州的对立。', en: 'The fundamental cause was the dispute over slavery\'s abolition, embodied in the conflict between slave-holding southern states and abolitionist northern states.' },
    myth: false,
  },
  // Q139 俄国农奴制改革
  {
    q: { zh: '1861年俄国沙皇亚历山大二世推行的改革是？', en: 'What reform did Russian Tsar Alexander II carry out in 1861?' },
    options: [
      { zh: '农奴制改革', en: 'Emancipation of the serfs' },
      { zh: '大化改新', en: 'Taika Reform' },
      { zh: '明治维新', en: 'Meiji Restoration' },
      { zh: '戊戌变法', en: 'Hundred Days\' Reform' },
    ],
    answer: 0,
    subject: 'history',
    explanation: { zh: '1861年3月3日亚历山大二世颁布法令废除农奴制，使俄国走上资本主义发展道路。', en: 'On March 3, 1861, Alexander II issued the emancipation edict abolishing serfdom, putting Russia on a capitalist path of development.' },
    myth: false,
  },
  // Q140 明治维新
  {
    q: { zh: '1868年开始的日本近代化改革是？', en: 'What modernization reform began in Japan in 1868?' },
    options: [
      { zh: '大化改新', en: 'Taika Reform' },
      { zh: '戊戌变法', en: 'Hundred Days\' Reform' },
      { zh: '农奴制改革', en: 'Emancipation of the serfs' },
      { zh: '明治维新', en: 'Meiji Restoration' },
    ],
    answer: 3,
    subject: 'history',
    explanation: { zh: '1868年明治天皇即位后推行"富国强兵""文明开化"等改革，史称"明治维新"。', en: 'In 1868 Emperor Meiji began reforms under slogans "enrich the country, strengthen the army" and "civilization and enlightenment," known as the Meiji Restoration.' },
    myth: false,
  },
];

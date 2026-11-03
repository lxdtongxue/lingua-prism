import type { Lang } from './content'

export type PageId = 'lang' | 'learner' | 'decision' | 'profile' | 'tools' | 'path'

export type Block =
  | { h: string }
  | { p: string }
  | { cards: [string, string][] }
  | { steps: [string, string][] }
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { abilities: { id: string; name: string; text: string; task: string }[] }
  | { choices: { name: string; tag: string; used?: boolean; points: string[] }[] }
  | { key: string }

export type Page = { kicker: string; title: string; lead: string; blocks: Block[]; more: PageId[] }

const zh: Record<PageId, Page> = {
  lang: {
    kicker: '项目简介 · 框架 · 语言层面',
    title: '从已经掌握的语言出发，理解一门新语言',
    lead: '学习一门新语言，并不总是从零开始。我们可能在陌生词汇中发现熟悉的形式，在新的句子结构中找到已有知识的参照，也可能在看似相近的表达之间遇到意想不到的差异。项目通过跨语言相似性指标 T，考察候选语言与学习者已掌握语言之间的关系，为语言选择提供可解释的语言学参照。',
    blocks: [
      { h: '一门语言，可以从不同角度比较' },
      { p: '语言之间的相似性并不是单一属性。两种语言可能在部分词汇形式上接近，却在语法结构上差异明显；也可能词形相近，但在读音、意义或使用方式上并不一致。因此，我们分别考察不同维度，避免用某一项相似性概括两种语言的全部关系。' },
      {
        cards: [
          ['基础词汇形式', 'ASJP 为不同语言的基础词汇比较提供数据。项目使用其中基于词形的距离信息，这部分占 T 的一半。这类比较提供统一参照，但不覆盖一门语言的全部词汇，也不能单独说明学习者能识别或掌握多少词。'],
          ['语法类型特征', 'Grambank 通过语法特征编码描述语言结构的异同，这部分占 T 的另一半。项目比较两种语言都有编码的题目，并缩放到 0–100。比较时只看共同有效题，避免把缺少记录误当作不存在某种特征。部分语言的编码由 AI 完成，尚未经人工核实。'],
        ],
      },
      { h: '相似性怎样帮助我们理解语言选择？' },
      { p: '如果一位学习者掌握中文和英语，考察另一门语言时，可以分别从这两种语言出发观察它们的联系。例如德语在基础词汇上更接近英语，而不是中文，所以网站会在词汇和语法上分别取更接近的已学语言作为参照。' },
      { p: '同一语言对在同一套数据和方法下的关系，不会因学习者而改变；但学习者掌握哪些语言、熟练程度如何、能否调用相关知识，会影响这些关系的实际意义。前者属于语言比较，后者还需要学习者层面的证据。' },
      { h: '有相似之处，就一定更容易学吗？' },
      { p: '语言相似性可能为识别和记忆提供有利条件，但实际学习还受到既有知识、学习任务、教学方式和练习经历的影响。某种联系是否带来帮助，需要在具体学习情境中检验。' },
      { p: '因此，T 描述语言之间的关系，不直接测量学习者的迁移能力，也不能换算为个人学习难度。它提供比较依据，与能力、目标、资源和偏好信息共同支持判断。' },
      { key: '先看清语言之间有哪些联系，再讨论这些联系对具体学习者意味着什么。' },
    ],
    more: ['learner', 'decision'],
  },
  learner: {
    kicker: '项目简介 · 框架 · 学习者层面',
    title: '理解学习差异，从具体能力与学习经历开始',
    lead: '面对相同的语言材料，有人善于从例句中发现规律，有人更容易辨别陌生声音，也有人能较快记住新词与意义的联系。这些差异值得被看见，却很难被一个笼统的“语言天赋值”充分表达。项目中的 A 指标关注语言学习能力与目标语言适应性，希望提供更具体的自我认识，并研究这些信息如何为语言选择提供参考。',
    blocks: [
      { h: '已经会多少，与如何学习新材料，需要分别了解' },
      { p: '语言熟练程度描述学习者目前能理解和使用一门语言的水平，反映学习经历与已有成果。语言学能则关注一组与新语言学习有关的认知能力，例如分析规律、处理陌生语音和建立词义联系。二者相互关联，却不能相互替代。' },
      { h: 'A1：建立通用的语言学习能力画像' },
      { p: 'A1 是项目内部的模块名称，与 CEFR 的 A1 等级无关。项目正在使用 TALL 的三项任务建立能力画像：' },
      {
        cards: [
          ['语言分析能力（LA）', '从有限的语言材料中识别结构，推断形式与意义之间的规律。'],
          ['语音编码能力（SD）', '通过声音辨别任务，了解学习者辨别和处理陌生语音信息的情况。'],
          ['联想记忆能力（VL）', '通过词汇学习任务，了解学习者建立并记住新形式与意义联系的情况。'],
        ],
      },
      { h: 'A2：研究能力与具体学习任务的关系' },
      { p: 'A1 回答“学习者在这些任务中表现如何”，A2 继续追问：“这些差异与学习目标语言时的哪些具体任务有关？”语音辨别与新词记忆属于不同任务，可能涉及不同能力；即使都属于语法学习，发现规则、记住变化形式和在交流中运用规则，也不是相同的过程。' },
      { p: 'A2 需要把语言特征、具体学习任务和实际学习表现连接起来。目前这种联系仍在研究中，不能仅凭某一项能力分数断言学习者更适合某门语言。' },
      { h: '怎样理解一份能力画像？' },
      { p: '画像首先帮助我们描述差异。例如，一位学习者可能在规则归纳任务中表现较突出，在陌生语音任务中需要更多熟悉时间。这可以成为探索学习支持方式的起点。' },
      { p: '画像中的差异不等于能力的永久边界。测试状态、任务形式、已有经验和测量误差都可能影响结果。某一项分数较低，也不足以成为排除一门感兴趣语言的理由。' },
      { h: '网站上的 A 分是什么？' },
      { p: '网站会根据三项百分位与语言难点计算一个实验性的 A 分，用来展示能力强项和语言需求的匹配关系。它不是语言天赋总分，这种匹配假设也尚未完成验证，所以页面始终标注为实验性指标。' },
      { key: '能力画像的价值，在于帮助学习者理解差异，并为后续研究提供依据。' },
    ],
    more: ['profile', 'tools', 'path'],
  },
  decision: {
    kicker: '项目简介 · 框架 · 决策层面',
    title: '让语言选择回到你的目标、条件与意愿',
    lead: '选择一门外语，往往意味着持续投入时间与精力。语言之间的联系、学习者的能力都值得参考；而一门语言是否值得成为你的下一步，还取决于它能帮你做什么、你能获得怎样的支持，以及你是否愿意与它长期相处。项目通过目标匹配度 G、资源可获得性 R 和个人偏好匹配度 P，从实际决策出发理解不同的选择。',
    blocks: [
      { h: 'G｜目标匹配度：这门语言能帮助你实现什么？' },
      { p: '语言的实际价值与具体目标有关。G 关注候选语言与学习者明确提出的目标之间的关联，目标类别包括就业、留学、旅行和学术。进阶问卷还会细化到行业、研究领域和目标国家，避免用宽泛标签代替具体分析。' },
      { p: '例如，一位明确计划前往德国读研的学习者，即使需要面对较大的语言差异，德语仍可能值得优先考虑。目标匹配说明选择的用途，不承诺录取、就业或其他结果。' },
      { h: 'R｜资源可获得性：你能否获得持续学习的支持？' },
      {
        table: {
          head: ['维度', '需要了解的问题'],
          rows: [
            ['覆盖度', '是否有适合入门和进阶的材料，学习路径能否持续衔接？'],
            ['质量', '来源是否可靠，内容是否准确、系统，并适合相应学习阶段？'],
            ['可及性', '学习者能否实际获取和使用，是否存在费用、访问或材料语言方面的障碍？'],
          ],
        },
      },
      { p: '“网上有很多资源”不等于这些资源都适用于某位学习者。可用于学习的时间属于决策约束，需要单独考虑，不能当作资源数量的一部分。' },
      { h: 'P｜个人偏好匹配度：你是否愿意开始，并接受学习中的挑战？' },
      { p: '有人因为文学、影视或音乐接近一门语言，有人喜欢它的声音或文字，也有人期待与某个地区的人建立联系。P 关注地区与文化兴趣、语言特点偏好，以及学习意愿和挑战接受度。兴趣可能随接触而发展，当前偏好可以成为探索的起点。' },
      { p: '偏好信息以学习者的主动输入为依据，由问卷中的回答产生，不根据语气或行为替学习者作判断。' },
      { h: '当不同维度指向不同选择时' },
      { p: '你可能很喜欢一门语言，但暂时缺少合适课程；也可能有明确的工作需要，却对内容尚不熟悉。这些差异提示我们进一步比较：目标是否有时间要求？资源障碍能否解决？是否需要先体验一段入门学习？' },
      { p: '网站目前把 T、A、G、R、P 放在同一框架中，呈现候选语言的理由与限制：T、A 权重固定，G、R、P 由用户设定或由问卷生成。这套整合和权重方案是当前的研究版本，推荐效果还需要在西外试用中检验。' },
      { key: '有价值的选择，应当同时回应“为什么学”“能否学下去”和“是否愿意学”。' },
    ],
    more: ['lang', 'learner'],
  },
  profile: {
    kicker: '项目简介 · 能力 · 能力画像',
    title: '看见你处理新语言材料的不同方式',
    lead: '语言学习涉及听辨声音、记忆词汇、发现规律和理解表达等多种过程。能力画像希望把这些过程中的个体差异呈现得更具体。项目以 A1 表示通用语言学习能力画像，它是内部模块名称，与欧洲语言共同参考框架的 A1 等级含义不同。',
    blocks: [
      { h: '正在使用的三个维度' },
      {
        abilities: [
          { id: 'LA', name: '语言分析能力', task: 'TALL 语言分析任务', text: '接触一组陌生句子时，能否从重复出现的形式中发现规律，并依据少量样例推断某个结构的作用？它关注识别模式和归纳规则，不等同于记住多少语法术语，也不能由某次语法考试成绩完整代表。' },
          { id: 'SD', name: '语音编码能力', task: 'TALL 声音辨别任务', text: '面对不熟悉的声音，能否注意到其中的差别并再次辨认？它与日常所说的“口音好不好”不是同一个问题，也不能直接判断最终发音水平。' },
          { id: 'VL', name: '联想记忆能力', task: 'TALL 词汇学习任务', text: '接触陌生词后，能否记住它对应的物体或概念，并在后续任务中正确匹配？结果还受材料、学习时间和既有经验影响，不能把一次表现解释为全部词汇学习能力。' },
        ],
      },
      { h: '怎样阅读画像中的差异？' },
      { p: '网站用百分位呈现三项结果，表示你在 TALL 书面版常模中的相对位置。雷达图的面积不能解释为“语言天赋总量”。重点是理解各项表现，而不是给学习者贴上“擅长”或“不擅长外语”的标签。' },
      { h: '从画像到应用，还需要哪些证据？' },
      { p: '项目已经确定使用这三项任务，但这与“结果足以支持推荐”是两个问题。这三项任务并不构成经过独立验证的新量表，也不能直接继承整套 TALL 的全部测量结论。任务结果与目标语言学习表现的关系，还需要进一步检验。' },
      { key: '让每一个分数都有明确含义，让每一种解释都与证据相称。' },
    ],
    more: ['tools', 'path'],
  },
  tools: {
    kicker: '项目简介 · 能力 · 工具比较',
    title: '先了解测量工具，再解释能力分数',
    lead: '要建立可信的能力画像，首先要回答：这些任务实际测量了什么？结果是否稳定？能够支持怎样的解释？项目已确定使用 TALL 的 LA、SD、VL 三项任务。下面说明采用和取舍的理由。',
    blocks: [
      { h: '当前使用的任务' },
      {
        table: {
          head: ['任务', '对应能力', '任务内容'],
          rows: [
            ['Language Analysis（LA）', '语言分析', '根据微型语言材料推断词汇和语法规律'],
            ['Sound Discrimination（SD）', '语音编码', '辨别陌生语音对比'],
            ['Vocabulary Learning（VL）', '联想记忆', '学习新词与熟悉物体的联系，再进行匹配'],
          ],
        },
      },
      { h: '采用与取舍' },
      {
        choices: [
          { name: 'TALL：LA、SD、VL', tag: '正在使用', used: true, points: ['这三项任务对应项目呈现的语言分析、语音编码和联想记忆。', '任务可以在线完成并自动计分，常模来自汉语母语的英语学习者。', '只使用其中三项，结果解释需要重新审查，不能直接继承整套测验的全部结论。'] },
          { name: 'SNWR 非词序列复述', tag: '已弃用', points: ['任务涉及听取并按顺序复述非词序列，对录音环境、语音输出和评分一致性有额外要求。', '表现可能同时受到语音感知、发音输出和已有语音经验影响，解释时需要区分这些因素。', '对本项目的在线实施而言，它会增加施测与评分复杂度，因此不纳入当前方案。'] },
          { name: 'CST 复杂广度任务', tag: '已弃用', points: ['任务要求同时完成信息加工与记忆活动，施测和解释相对复杂。', '句子判断材料可能引入已有语言理解水平的影响，需要与工作记忆表现加以区分。', '它更侧重一般工作记忆执行控制，与当前重点呈现的三项能力相比，增加了实施与解释负担，因此不纳入当前方案。'] },
          { name: 'FLAT-C', tag: '已弃用', points: ['它与当前使用的 TALL 在部分测量内容上存在重叠。', '并行或混合两套工具，需要处理任务、计分方式和分数解释的衔接，结果不能直接拼接。', '采用它还需要额外核查材料使用条件和实施要求。当前方案已确定使用 TALL，因此不再纳入。'] },
        ],
      },
      { p: '这些是本项目在适用性和实施上的取舍，不代表上述工具无效。' },
      { h: '研究背景：LLAMA' },
      { p: 'LLAMA 在语言学能研究中使用广泛，是理解相关测量方法的重要背景，但不是本项目的现用工具。Bokander 与 Bylund（2020）分析 350 名参与者的数据后发现，四个子测验中只有 LLAMA B 的分数足够符合潜在特质模型。这一结论针对该研究和具体子测验，不能笼统说明整套工具无效。' },
      { h: '项目看重哪些方面？' },
      {
        steps: [
          ['构念是否清楚', '任务结果与目标能力之间是否有合理的解释依据？'],
          ['测量是否可靠', '具体版本与目标人群中的分数质量如何，有哪些不确定性？'],
          ['实施是否可行', '时长、设备、评分和材料使用条件能否满足项目需要？'],
          ['用途是否适当', '原研究的结论能否支持本项目的画像解释和推荐用途？'],
        ],
      },
      { h: '正在使用，不等于已经验证' },
      {
        cards: [
          ['工具使用状态', '已确定：能力画像使用 TALL 的 LA、SD、VL 三项任务。'],
          ['后续用途验证', '仍在进行：这三项任务能否准确预测用户适合哪门语言，A2 匹配机制和最终推荐算法是否有效，都尚未完成验证。'],
        ],
      },
      { key: '工具选择的依据，是分数能够支持什么解释，以及这种解释是否适合当前用途。' },
    ],
    more: ['profile', 'path'],
  },
  path: {
    kicker: '项目简介 · 能力 · 从能力到语言',
    title: '把能力画像与语言选择连接起来，需要具体的学习证据',
    lead: '了解自己的能力特点之后，一个自然的问题是：“这些特点对我选择哪门语言有什么帮助？”回答这个问题，需要把能力分数放回实际学习过程。项目通过 A2 研究目标语言适应性，在能力画像与语言选择之间引入语言特征和具体学习任务，逐步检验两者的联系。',
    blocks: [
      { h: '从一项语言特征开始，而不是直接给语言贴标签' },
      { p: '一门语言同时包含音系、词汇、语法等特征，学习它们也涉及不同任务。“某种能力较强，所以适合某门语言”需要拆成可以检验的问题：学习者面对哪一项特征？完成什么任务？表现如何衡量？某项能力与这种表现是否有关？' },
      { h: 'A2 的研究路径' },
      {
        steps: [
          ['明确语言特征', '落实到可描述的内容，例如某种语音对立、词形与意义的联系，或特定语法变化。'],
          ['明确学习任务', '说明学习者要完成什么活动，例如辨别陌生声音、记住新词含义，或根据例句发现并应用规则。'],
          ['观察能力与学习表现', '结合 A1 的三个维度，考察学习准确率、学习速度、延迟保持或新材料迁移等结果。'],
          ['判断结论的适用范围', '比较关系是否受已有语言知识、学习阶段和教学条件影响，再评估能否支持适应性判断。'],
        ],
      },
      { h: '三类正在关注的学习情境' },
      {
        table: {
          head: ['方向', '任务示例', '需要检验的问题'],
          rows: [
            ['音系', '辨别陌生语音对比、学习声音差异', '语音编码与哪些任务表现有关？关系是否随材料和任务改变？'],
            ['词汇', '建立新词与意义的联系、保持和提取词汇', '联想记忆和已有知识分别发挥什么作用？'],
            ['语法', '从例句中归纳规则、处理形态变化', '语言分析与哪些学习结果有关？教学方式是否影响这种关系？'],
          ],
        },
      },
      { p: '这些例子说明研究如何展开，不代表已经建立了能力维度与具体语言的一一对应关系。' },
      { h: '为什么同一种能力，可能带来不同的学习结果？' },
      { p: '教师讲解规则与自行发现规律，可能对能力提出不同要求；材料是否熟悉、练习次数多少、是否考察延迟保持，也会改变观察到的关系。研究发现某项能力与某个任务成绩相关，并不意味着它决定了结果；在一种语言或教学条件下得到的结论，也不能未经检验就推广到全部候选语言。' },
      { h: '当前进展与应用边界' },
      { p: '项目已形成 A2 的研究框架，并梳理了音系、词汇和语法方向的实证文献。网站根据语言需求数据计算实验性的 A 分，它假设“能力强项对上语言难点”会学得更好，这一假设还在用西外数据验证。部分语言的语法数据由 AI 编码，尚未经人工核实。' },
      { p: '在验证完成之前，A 分只作参考，不是确定的适应结论。即使未来获得可靠的适应性信息，语言选择仍需要结合目标、资源与个人偏好。' },
      { key: '从能力到语言的每一步，都需要明确任务、观察表现，并检验结论的适用范围。' },
    ],
    more: ['profile', 'decision'],
  },
}

const en: Record<PageId, Page> = {
  lang: {
    kicker: 'About · Framework · Languages',
    title: 'Start from the languages you know',
    lead: 'Learning a new language rarely starts from zero. You may spot familiar forms in new words, find a reference point in new sentence patterns, or meet unexpected differences between expressions that look alike. The similarity measure T looks at how a candidate language relates to the languages a learner already knows, giving language choice an explainable linguistic reference.',
    blocks: [
      { h: 'Languages can be compared from different angles' },
      { p: 'Similarity is not a single property. Two languages may be close in some word forms yet far apart in grammar, or look alike while differing in sound, meaning or use. We look at each dimension separately so one kind of similarity doesn’t stand in for the whole relationship.' },
      {
        cards: [
          ['Basic vocabulary forms', 'ASJP provides data for comparing basic vocabulary. The project uses its form-based distances, and this makes up half of T. It gives a shared reference, but it doesn’t cover a language’s whole vocabulary or show how many words a learner can recognise.'],
          ['Grammatical features', 'Grambank codes structural features across languages, and this makes up the other half of T. The project compares items coded for both languages and scales the result to 0–100, so a missing record is never read as a missing feature. Some coding was done by AI and has not been checked by hand.'],
        ],
      },
      { h: 'How does similarity help with choosing?' },
      { p: 'If a learner knows Chinese and English, another language can be viewed from each of them. German, for instance, is closer to English than to Chinese in basic vocabulary, so the site uses whichever known language is closer, separately for vocabulary and grammar.' },
      { p: 'With the same data and method, the relation between two languages doesn’t change from learner to learner. What it means in practice depends on which languages they know, how well, and whether they can draw on that knowledge. The first is language comparison. The second needs evidence about the learner.' },
      { h: 'Does similar always mean easier?' },
      { p: 'Similarity may help recognition and memory, but learning also depends on prior knowledge, tasks, teaching and practice. Whether a link helps has to be tested in a specific learning situation.' },
      { p: 'So T describes relations between languages. It doesn’t measure a learner’s ability to transfer knowledge, and it can’t be converted into personal difficulty. It is one reference, read alongside ability, goals, resources and preference.' },
      { key: 'First see how languages connect, then ask what that means for a particular learner.' },
    ],
    more: ['learner', 'decision'],
  },
  learner: {
    kicker: 'About · Framework · Learners',
    title: 'Understand differences through specific abilities and experience',
    lead: 'Given the same material, some people spot patterns quickly, some hear unfamiliar sounds more easily, and some remember new word meanings faster. These differences matter, and a vague “language talent” score can’t capture them. The measure A looks at learning abilities and target-language fit, offering more specific self-knowledge while the project studies how far it can inform language choice.',
    blocks: [
      { h: 'What you know and how you learn are different questions' },
      { p: 'Proficiency describes how well someone can understand and use a language now, reflecting past learning. Aptitude concerns the cognitive abilities involved in learning a new language, such as analysing patterns, handling unfamiliar sounds and linking words to meanings. The two are related, and neither replaces the other.' },
      { h: 'A1: a general ability profile' },
      { p: 'A1 is an internal module name and has nothing to do with the CEFR A1 level. The project uses three TALL tasks to build the profile:' },
      {
        cards: [
          ['Language analysis (LA)', 'Identifying structure in limited material and inferring how form relates to meaning.'],
          ['Phonetic coding (SD)', 'A sound discrimination task shows how a learner tells apart and handles unfamiliar speech sounds.'],
          ['Associative memory (VL)', 'A vocabulary learning task shows how a learner forms and keeps links between new forms and meanings.'],
        ],
      },
      { h: 'A2: how abilities relate to learning tasks' },
      { p: 'A1 asks how a learner performs on these tasks. A2 goes on to ask which tasks in learning a target language those differences relate to. Telling sounds apart and remembering words are different tasks, and even within grammar, finding a rule, remembering forms and using them are not the same process.' },
      { p: 'A2 has to connect language features, learning tasks and real performance. That work is still under way, so a single ability score can’t show that someone suits a particular language.' },
      { h: 'How to read a profile' },
      { p: 'A profile first describes differences. Someone may do well at inducing rules but need more time with unfamiliar sounds. That can be a starting point for finding the right kind of support.' },
      { p: 'Differences in a profile are not permanent limits. Test conditions, task format, experience and measurement error can all affect results, and one low score is no reason to rule out a language you care about.' },
      { h: 'What is the A score on this site?' },
      { p: 'The site combines the three percentiles with each language’s demands into an experimental A score, showing how your strengths line up with what a language asks for. It is not a total talent score, the idea behind it has not been validated, and the page always labels it as experimental.' },
      { key: 'A profile is valuable because it helps learners understand differences and gives later research a basis.' },
    ],
    more: ['profile', 'tools', 'path'],
  },
  decision: {
    kicker: 'About · Framework · Decisions',
    title: 'Bring the choice back to your goals, conditions and wishes',
    lead: 'Choosing a language means committing time and energy. How languages relate and what a learner can do both matter, but whether a language should be your next step also depends on what it can do for you, what support you can get, and whether you want to live with it for a long time. G, R and P look at these practical questions.',
    blocks: [
      { h: 'G | Goal alignment: what will this language help you do?' },
      { p: 'A language’s value depends on your goal. G looks at the link between a language and the goals you state: work, study abroad, travel or research. The advanced questionnaire goes down to industries, fields and target countries, so broad labels don’t replace real analysis.' },
      { p: 'Someone planning graduate study in Germany may find German worth prioritising even though it is far from what they know. Goal alignment describes a use. It promises no admission, job or other outcome.' },
      { h: 'R | Resources: can you get lasting support?' },
      {
        table: {
          head: ['Facet', 'What we need to know'],
          rows: [
            ['Coverage', 'Are there materials for beginners and beyond, with a path that continues?'],
            ['Quality', 'Are sources reliable, accurate, systematic and right for the level?'],
            ['Access', 'Can the learner really get and use them, given cost, availability and language barriers?'],
          ],
        },
      },
      { p: '“Lots of resources online” doesn’t mean they suit a given learner. Available time is a separate constraint, not part of the resource count.' },
      { h: 'P | Preference: do you want to start, and accept the challenge?' },
      { p: 'Some people come to a language through books, film or music. Others like its sounds or script, or hope to connect with people in a region. P covers regional and cultural interest, feelings about language features, and willingness to take on difficulty. Interests can grow, so today’s preference is simply a place to start.' },
      { p: 'Preference comes only from what learners enter in the questionnaire. It is never inferred from tone or behaviour.' },
      { h: 'When the dimensions point different ways' },
      { p: 'You may love a language but have no suitable course, or need one for work and know little about it. These gaps invite better questions: is there a deadline, can the resource problem be solved, would a short trial help?' },
      { p: 'The site now places T, A, G, R and P in one framework to show the reasons and limits for each language. T and A have fixed weights, while G, R and P are set by the user or generated from the questionnaire. This is a research version, and its usefulness still has to be tested in the XISU trial.' },
      { key: 'A good choice answers why you’d learn, whether you can keep going, and whether you want to.' },
    ],
    more: ['lang', 'learner'],
  },
  profile: {
    kicker: 'About · Aptitude · Ability profile',
    title: 'See how you handle new language material',
    lead: 'Language learning involves hearing sounds, remembering words, finding patterns and understanding expression. An ability profile makes individual differences in these processes more concrete. A1 is the project’s internal name for this profile and differs from the CEFR A1 level.',
    blocks: [
      { h: 'The three dimensions in use' },
      {
        abilities: [
          { id: 'LA', name: 'Language analysis', task: 'TALL Language Analysis', text: 'Faced with unfamiliar sentences, can you spot recurring patterns and work out what a structure does from a few examples? This is about finding patterns and rules. It isn’t knowledge of grammar terms or the result of one grammar exam.' },
          { id: 'SD', name: 'Phonetic coding', task: 'TALL Sound Discrimination', text: 'Can you notice differences between unfamiliar sounds and recognise them again? This is not the same as having a good accent, and it can’t predict final pronunciation.' },
          { id: 'VL', name: 'Associative memory', task: 'TALL Vocabulary Learning', text: 'After meeting a new word, can you remember what it refers to and match it later? Results also depend on materials, time and experience, so one performance doesn’t describe all vocabulary learning.' },
        ],
      },
      { h: 'How to read differences in a profile' },
      { p: 'The site reports percentiles against the TALL written-suite norms. The area of the radar chart is not a measure of “total talent”. The point is to understand each result, not to label anyone good or bad at languages.' },
      { h: 'What evidence is still needed?' },
      { p: 'Choosing these three tasks is settled, but whether results can support recommendations is a separate question. The three tasks are not an independently validated new scale, and they don’t inherit every finding about the full TALL battery. Their link to target-language learning still has to be tested.' },
      { key: 'Every score needs a clear meaning, and every interpretation has to match the evidence.' },
    ],
    more: ['tools', 'path'],
  },
  tools: {
    kicker: 'About · Aptitude · Comparing tools',
    title: 'Understand the tools before reading the scores',
    lead: 'A credible profile starts with three questions: what do these tasks measure, are the results stable, and what interpretations can they support? The project has settled on three TALL tasks: LA, SD and VL. Here is why, and what was left out.',
    blocks: [
      { h: 'Tasks in use' },
      {
        table: {
          head: ['Task', 'Ability', 'What it involves'],
          rows: [
            ['Language Analysis (LA)', 'Language analysis', 'Inferring vocabulary and grammar rules from a miniature language'],
            ['Sound Discrimination (SD)', 'Phonetic coding', 'Telling apart unfamiliar speech sounds'],
            ['Vocabulary Learning (VL)', 'Associative memory', 'Learning links between new words and familiar objects, then matching them'],
          ],
        },
      },
      { h: 'What we use and what we left out' },
      {
        choices: [
          { name: 'TALL: LA, SD and VL', tag: 'In use', used: true, points: ['These tasks match the three abilities the project reports.', 'They run online with automatic scoring, and the norms come from Chinese-speaking learners of English.', 'Using only three tasks means interpretations need fresh review and can’t simply inherit every finding about the full battery.'] },
          { name: 'SNWR (Serial Nonword Recall)', tag: 'Dropped', points: ['Repeating nonword sequences places extra demands on recording conditions, speech output and scoring consistency.', 'Performance may reflect speech perception, articulation and prior sound experience, which would need separating.', 'For online delivery it adds testing and scoring complexity, so it is not part of the current plan.'] },
          { name: 'CST (Complex Span Task)', tag: 'Dropped', points: ['It combines processing and remembering, which makes delivery and interpretation more complex.', 'Sentence judgements may bring in existing language comprehension, which would need separating from working memory.', 'It leans towards general executive control of working memory and adds burden beyond the three abilities in focus, so it is not part of the current plan.'] },
          { name: 'FLAT-C', tag: 'Dropped', points: ['It partly overlaps with what TALL already measures.', 'Running or mixing two tools would mean reconciling tasks, scoring and interpretation, since results can’t simply be joined.', 'It would also need separate checks on material use and delivery. The plan has settled on TALL, so FLAT-C is no longer included.'] },
        ],
      },
      { p: 'These are choices about fit and delivery for this project. They don’t mean these tools are invalid.' },
      { h: 'Background: LLAMA' },
      { p: 'LLAMA is widely used in aptitude research and is useful background, but it is not a tool in this project. Bokander and Bylund (2020) analysed data from 350 participants and found that only LLAMA B of the four subtests fit the latent trait model well enough. That finding applies to that study and those subtests, not to the battery as a whole.' },
      { h: 'What the project looks at' },
      {
        steps: [
          ['Clear construct', 'Is there a sound basis for linking task results to the target ability?'],
          ['Reliable measurement', 'How good are the scores for this version and population, and what is uncertain?'],
          ['Practical delivery', 'Do time, equipment, scoring and terms of use fit the project?'],
          ['Appropriate use', 'Can the original findings support this project’s profile and recommendations?'],
        ],
      },
      { h: 'In use does not mean validated' },
      {
        cards: [
          ['Tool status', 'Settled: the profile uses the TALL tasks LA, SD and VL.'],
          ['Validation for later use', 'Still under way: whether these tasks can predict which language suits a user, and whether the A2 matching and final recommendation work, has not been shown.'],
        ],
      },
      { key: 'Choose a tool for what its scores can support, and whether that suits the purpose.' },
    ],
    more: ['profile', 'path'],
  },
  path: {
    kicker: 'About · Aptitude · Ability to language',
    title: 'Linking abilities to language choice takes learning evidence',
    lead: 'Once you know your abilities, the natural question is how they help you choose a language. Answering it means putting scores back into real learning. Through A2, the project studies target-language fit by placing language features and learning tasks between the profile and the choice, and testing the link step by step.',
    blocks: [
      { h: 'Start from a feature, not a label' },
      { p: 'A language has phonological, lexical and grammatical features, and learning them involves different tasks. “Strong at this, so suited to that language” has to become testable questions: which feature, what task, how is performance measured, and is an ability related to it?' },
      { h: 'The A2 research path' },
      {
        steps: [
          ['Define the feature', 'Pin it down, such as a sound contrast, a form–meaning link or a grammatical change.'],
          ['Define the task', 'State what learners do, such as telling sounds apart, remembering meanings or applying rules from examples.'],
          ['Relate ability to performance', 'Use the three A1 dimensions to look at accuracy, learning rate, delayed retention and transfer to new material.'],
          ['Judge how far it applies', 'Check the effects of prior language knowledge, stage and teaching before using it to judge fit.'],
        ],
      },
      { h: 'Three learning situations in focus' },
      {
        table: {
          head: ['Area', 'Example tasks', 'What needs testing'],
          rows: [
            ['Phonology', 'Telling apart unfamiliar contrasts, learning sound differences', 'Which performance relates to phonetic coding, and does it change with materials and tasks?'],
            ['Vocabulary', 'Linking words to meanings, keeping and retrieving them', 'What do associative memory and prior knowledge each contribute?'],
            ['Grammar', 'Inducing rules from examples, handling word forms', 'Which outcomes relate to language analysis, and does teaching change that?'],
          ],
        },
      },
      { p: 'These examples show how research proceeds. They don’t mean abilities map one-to-one onto languages.' },
      { h: 'Why can one ability lead to different results?' },
      { p: 'Being taught a rule and finding it yourself may call on different abilities. Familiar materials, amount of practice and delayed testing can also change what is observed. A correlation doesn’t mean an ability decides the outcome, and a finding from one language or setting can’t be extended to all candidates without testing.' },
      { h: 'Progress and limits' },
      { p: 'The project has an A2 research framework and has reviewed empirical work on phonology, vocabulary and grammar. The site calculates an experimental A score from language demand data. It assumes that strengths matching a language’s hard parts help learning, which is still being tested with XISU data. Some grammar data was coded by AI and has not been checked by hand.' },
      { p: 'Until validation is done, A is only a reference, not a firm verdict on fit. Even reliable fit information would still need weighing with goals, resources and preference.' },
      { key: 'Each step from ability to language needs a clear task, observed performance and a tested scope.' },
    ],
    more: ['profile', 'decision'],
  },
}

export const details: Record<Lang, Record<PageId, Page>> = { zh, en }

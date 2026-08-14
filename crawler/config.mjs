// DS安甲网 · 抓取器配置
// 关键词策略：核心词（DeepSeek Harness / dsh 插件）+ 扩展词（DeepSeek 生态工具）
// weight 越大代表该关键词命中与本站主题越相关

export const SITE = {
  name: 'DS安甲网',
  domain: 'ds.ajw.cn',
  home: 'https://github.com/',
}

export const KEYWORDS = [
  { q: 'deepseek-harness',         label: 'DeepSeek Harness',        weight: 4 },
  { q: 'topic:dsh-plugin',         label: 'dsh-plugin 主题',         weight: 4 },
  { q: '"deepseek harness"',       label: 'DeepSeek Harness 短语',   weight: 4 },
  { q: 'dsh plugin',               label: 'DSH 插件',                weight: 3 },
  { q: 'deepseek dsh',             label: 'DeepSeek + DSH',          weight: 3 },
  { q: 'awesome deepseek',         label: 'Awesome 列表',            weight: 2 },
  { q: 'deepseek harness plugin',  label: 'Harness 插件组合',        weight: 3 },
  { q: 'deepseek skill',           label: 'DeepSeek Skill',          weight: 1 },
  { q: 'deepseek plugin',          label: 'DeepSeek 插件',           weight: 1 },
]

// 精选种子：即使搜索未命中也会单独拉取详情收录
// 注: dsh-external/hub 等部分组织仓库需访问权限(404)，抓取器会优雅跳过
export const CURATED = [
  'deepseek-ai/deepseek-harness',
  '0xsline/awesome-deepseek-harness',
  'AdamPlatin123/awesome-dsh-plugins',
  'awesome-dsh-plugin/awesome-dsh-plugin',
  'Alex-Yanggg/awesome-DSH-plugin',
  'vibeinging/dsh-tool-search',
  'NanmiCoder/dsh-agent-teams',
  'hust-open-atom-club/oh-dsh-desktop',
  'liustack/modlens',
  'zhu1090093659/dsh-web-ui',
  'Zhenyu98/dsh-context-doctor',
  'cendaifeng/dsh-learn-everything',
  'Nwflower/dsh-chat-import',
  'CanglongCl/dsh-web-review',
  'moeblack/dsh-payload-capture',
]

// 官方组织/用户：打「官方」标
export const OFFICIAL_ORGS = ['deepseek-ai', 'dsh-external']

export const MIN_STARS = 1          // 低于此星数不收录（精选种子除外）
export const MIN_SCORE = 5          // 相关度得分低于此值不收录（精选种子除外）
export const SEARCH_PER_PAGE = 100
export const SEARCH_SLEEP_MS = 7000 // 未认证搜索限 10 次/分钟

// 需求导向分类：按「用户想解决什么问题」组织货架（个性化名称 + 专业介绍 + 检索提示）
// 按顺序匹配第一个命中
export const CATEGORY_RULES = [
  { id: 'core',   name: '原厂核心',   icon: 'badge',   desc: 'DeepSeek 官方出品的框架本体与官方工具集 —— 机器人的骨架与大脑。',   search: '检索词：官方 / deepseek-ai / 官方工具',
    test: (r) => OFFICIAL_ORGS.includes(r.full_name.split('/')[0]) && !/^awesome-/.test(r.name) },
  { id: 'agent',  name: '编队协作',   icon: 'users',   desc: '多智能体编排、子代理与团队协作插件，让机器人学会组团作战。',             search: '检索词：agent / team / 子代理',
    test: (r) => /agent|team|subagent|多智能体|团队/i.test(catText(r)) },
  { id: 'ui',     name: '驾驶舱与涂装', icon: 'palette', desc: 'Web UI 皮肤、侧边栏、面板与终端 TUI，把驾驶舱装修成你喜欢的样子。',   search: '检索词：皮肤 / 主题 / sidebar / TUI',
    test: (r) => /theme|skin|皮肤|主题|sidebar|panel|web-ui|web ui|progress|split|thumb|whale|\bui\b/i.test(catText(r)) },
  { id: 'context',name: '记忆与检索', icon: 'book',   desc: '会话搜索、跨会话长期记忆与知识库，让机器人记住一切、随问随调。',         search: '检索词：记忆 / 搜索 / session / 知识库',
    test: (r) => /search|session|context|memory|记忆|engram|ctx|zotero|knowledge|\bkb\b/i.test(catText(r)) },
  { id: 'input',  name: '操控与装填', icon: 'pen',    desc: '消息编辑、文件拖放、Office 读写等输入体验强化部件。',                    search: '检索词：编辑 / 输入 / office / 粘贴',
    test: (r) => /edit|input|paste|drag|office|prompt|message|notebook/i.test(catText(r)) },
  { id: 'browser',name: '感知与遥控', icon: 'globe',  desc: '内嵌浏览器、SSH 远程与跨端桥接，给机器人装上眼睛与远程手柄。',         search: '检索词：浏览器 / 远程 / ssh',
    test: (r) => /browser|remote|ssh|webbridge|web bridge/i.test(catText(r)) },
  { id: 'model',  name: '动力与感知核心', icon: 'cpu', desc: '视觉桥接、多模型路由与故障回退，升级机器人的引擎与传感器。',           search: '检索词：视觉 / vision / 多模型',
    test: (r) => /vision|model|llm|inference|fallback|adapter|a2a|acp|推理|视觉/i.test(catText(r)) },
  { id: 'git',    name: '工程与检修', icon: 'git',    desc: 'Git 身份、插件体检与工作流引擎 —— 工程化的检修工具。',                 search: '检索词：git / 工作流 / 体检',
    test: (r) => /\bgit\b|blame|workflow|inspect|plugin-check|spur|involute|engineering/i.test(catText(r)) },
  { id: 'notify', name: '通讯与广播', icon: 'bell',   desc: '飞书、微信、QQ、Telegram 机器人与语音频道，让机器人主动向你汇报。',      search: '检索词：飞书 / 通知 / bot / 语音',
    test: (r) => /feishu|飞书|wecom|wechat|weixin|微信|telegram|qq|notify|voice|bot|频道|通知/i.test(catText(r)) },
  { id: 'fun',    name: '个性化改装', icon: 'game',   desc: '桌面宠物、小游戏与整活皮肤 —— 机器人也要有生活情趣。',                  search: '检索词：宠物 / 游戏 / 皮肤',
    test: (r) => /pet|sticker|gomoku|game|tavern|sfw|qq2006|fun|lifestyle|摸鱼|lazyfish/i.test(catText(r)) },
  { id: 'client', name: '机体与座舱', icon: 'monitor', desc: '桌面端、终端 TUI 与移动适配，不同座舱任你挑选。',                      search: '检索词：桌面 / 终端 / 移动',
    test: (r) => /\bdesktop\b|\btui\b|terminal|客户端|\bmobile\b/i.test(catText(r)) },
  { id: 'infra',  name: '兵工厂车间', icon: 'wrench', desc: '插件管理器、注册表与开发脚手架 —— 自己造装甲的车间。',                search: '检索词：管理器 / 开发 / 注册表',
    test: (r) => /registry|marisa|plugin manager|hub|update|injector|开发|基建/i.test(catText(r)) },
  { id: 'tool',   name: '通用工具架', icon: 'box',    desc: 'CLI 与沙箱等周边工具，随手可得。',                                     search: '检索词：cli / 工具 / 沙箱',
    test: (r) => /cli|\btool\b|sandbox|工具|workbench/i.test(catText(r)) },
  { id: 'awesome',name: '装甲图鉴',   icon: 'list',   desc: '社区精选列表与完整目录，逛图鉴发现更多装甲。',                           search: '检索词：awesome / 列表 / 图鉴',
    test: (r) => /^awesome-|awesome/i.test(r.name) && /deepseek|dsh|harness/i.test(catText(r)) },
  { id: 'ecosystem', name: '外挂武器库', icon: 'globe', desc: 'DeepSeek 生态相关的开源项目 —— 兼容的外挂与弹药。',                  search: '检索词：deepseek / 生态',
    test: () => true },
]

// awesome-deepseek-harness 精选列表的章节 -> 本站分类映射（用户需求来源的权威分类）
export const AWESOME_SECTION_CATEGORY = {
  'core--official': 'core',
  'context--search': 'context',
  'input--editing': 'input',
  'ui--experience': 'ui',
  'browser--remote': 'browser',
  'models--inference': 'model',
  'git--engineering': 'git',
  'notifications--channels': 'notify',
  'fun--lifestyle': 'fun',
  'infrastructure--development': 'infra',
  related: 'ecosystem',
}

// 生成可复制的一键安装命令（粘贴给 Agent 即可安装）
export function installFor(p) {
  const full = p.fullName
  if (full === 'deepseek-ai/deepseek-harness') return { kind: 'npx', cmd: 'npx @deepseek-ai/dsh web', hint: '官方运行时' }
  if (['awesome', 'ecosystem', 'tool', 'client', 'infra'].includes(p.category.id)) {
    return { kind: 'clone', cmd: `git clone https://github.com/${full}.git`, hint: '克隆到本地' }
  }
  return { kind: 'dsh-plugin', cmd: `dsh plugin add "github:${full}"`, hint: '粘贴给 Agent 即可安装' }
}

function catText(r) {
  return [r.name, r.description || '', (r.topics || []).join(' ')].join(' ')
}

// 相关度评分：主题契合度 + 关键词权重 + 星数贡献
export function relevanceScore(repo, kwWeight = 0) {
  const text = [repo.full_name, repo.description || '', (repo.topics || []).join(' ')].join(' ').toLowerCase()
  let s = kwWeight
  if (/\bdsh\b/.test(text)) s += 4
  if (/deepseek/.test(text)) s += 4
  if (/harness/.test(text)) s += 3
  if (/plugin/.test(text)) s += 2
  if (/cordis/.test(text)) s += 2
  if (/skill/.test(text)) s += 1
  if (/theme|skin/.test(text)) s += 1
  s += Math.min(repo.stargazers_count || 0, 10000) / 2500 // 最高 +4
  return Math.round(s * 10) / 10
}

// 判定是否与本站主题相关（防止噪音收录，如名为 dsh 的其他项目）
export function isRelevant(repo) {
  const text = [repo.full_name, repo.description || '', (repo.topics || []).join(' ')].join(' ').toLowerCase()
  const hasDeepSeek = /deepseek/.test(text)
  const hasDsh = /\bdsh\b/.test(text)
  const hasHarnessish = /harness|plugin|skill|cordis/.test(text)
  return (hasDeepSeek || hasDsh) && (hasDeepSeek || hasHarnessish || /\bdsh\b.*plugin/i.test(text))
}

// 严查: 只有作者在仓库中明确声明兼容 DSH 才算数。
// "dsh" 缩写与 "DeepSeek Harness" 全称是判定关键, 且必须出现在作者自述的兼容语境
// (名称/描述中的插件、皮肤、主题、工具、兼容等表述); 仅蹭话题、仅"支持 DeepSeek"的独立项目一律剔除。
export function isDshQualified(r) {
  const full = (r.fullName || '').toLowerCase()
  const name = (r.name || '').toLowerCase()
  const desc = (r.description || '').toLowerCase()
  const topics = (r.topics || []).map((t) => String(t).toLowerCase())
  // 作者自述文本（名称 + 描述, 不含话题标签 —— 话题可被蹭）
  const authorText = (name + ' ' + desc)
  // 明确排除同名的其他项目
  if (/dshell/.test(full)) return false
  // 0. 官方生态组织仓库直接算数
  if (full.startsWith('dsh-external/')) return true
  // 1. 作者自述出现 "DeepSeek Harness" 全称写法
  if (/deepseek[\s-]*harness/.test(authorText)) return true
  // 2. 作者自述中 "dsh" 缩写 + 兼容语境表述
  if (/\bdsh\b/.test(authorText) && /plugin|harness|skin|theme|bundle|cordis|compatib|extension|工具|插件|皮肤|主题|侧边栏|兼容|适配|支持/.test(authorText)) return true
  // 3. 作者声明 dsh-plugin 话题 + 自述含正确写法（防蹭话题）
  if (topics.includes('dsh-plugin') && /\bdsh\b|deepseek[\s-]*harness/.test(authorText)) return true
  // 4. 官方 deepseek-ai 组织的 harness 仓库
  if (full.startsWith('deepseek-ai/') && /harness|\bdsh\b/.test(authorText)) return true
  return false
}

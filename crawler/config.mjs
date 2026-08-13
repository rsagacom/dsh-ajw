// dsh 安家网 · 抓取器配置
// 关键词策略：核心词（DeepSeek Harness / dsh 插件）+ 扩展词（DeepSeek 生态工具）
// weight 越大代表该关键词命中与本站主题越相关

export const SITE = {
  name: 'dsh 安家网',
  domain: 'dsh.ajw.cn',
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

// 需求导向分类：按「用户想解决什么问题」组织货架（全部中文分类）
// 按顺序匹配第一个命中
export const CATEGORY_RULES = [
  { id: 'core',   name: '官方核心',   icon: 'badge',   test: (r) => OFFICIAL_ORGS.includes(r.full_name.split('/')[0]) && !/^awesome-/.test(r.name) },
  { id: 'awesome',name: '精选列表',   icon: 'list',    test: (r) => /^awesome-|awesome/i.test(r.name) && /deepseek|dsh|harness/i.test(catText(r)) },
  { id: 'client', name: '客户端与终端', icon: 'monitor', test: (r) => /\bdesktop\b|\btui\b|terminal|客户端|\bmobile\b/i.test(catText(r)) },
  { id: 'agent',  name: 'Agent 与团队', icon: 'users',  test: (r) => /agent|team|subagent|多智能体|团队/i.test(catText(r)) },
  { id: 'ui',     name: '界面与体验', icon: 'palette', test: (r) => /theme|skin|皮肤|主题|sidebar|panel|web-ui|web ui|progress|split|thumb|whale|\bui\b/i.test(catText(r)) },
  { id: 'context',name: '上下文与记忆', icon: 'book',   test: (r) => /search|session|context|memory|记忆|engram|ctx|zotero|knowledge|\bkb\b/i.test(catText(r)) },
  { id: 'input',  name: '输入与编辑', icon: 'pen',     test: (r) => /edit|input|paste|drag|office|prompt|message|notebook/i.test(catText(r)) },
  { id: 'browser',name: '浏览器与远程', icon: 'globe',  test: (r) => /browser|remote|ssh|webbridge|web bridge/i.test(catText(r)) },
  { id: 'model',  name: '模型与推理', icon: 'cpu',     test: (r) => /vision|model|llm|inference|fallback|adapter|a2a|acp|推理|视觉/i.test(catText(r)) },
  { id: 'git',    name: 'Git 与工程', icon: 'git',     test: (r) => /\bgit\b|blame|workflow|inspect|plugin-check|spur|involute|engineering/i.test(catText(r)) },
  { id: 'notify', name: '通知与渠道', icon: 'bell',    test: (r) => /feishu|飞书|wecom|wechat|weixin|微信|telegram|qq|notify|voice|bot|频道|通知/i.test(catText(r)) },
  { id: 'fun',    name: '趣味与生活', icon: 'game',    test: (r) => /pet|sticker|gomoku|game|tavern|sfw|qq2006|fun|lifestyle|摸鱼|lazyfish/i.test(catText(r)) },
  { id: 'infra',  name: '基建与开发', icon: 'wrench',  test: (r) => /registry|marisa|plugin manager|hub|update|injector|开发|基建/i.test(catText(r)) },
  { id: 'tool',   name: '工具周边',   icon: 'box',     test: (r) => /cli|\btool\b|sandbox|工具|workbench/i.test(catText(r)) },
  { id: 'ecosystem', name: 'DeepSeek 生态', icon: 'globe', test: () => true },
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

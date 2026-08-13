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

// 分类规则：按顺序匹配第一个命中
export const CATEGORY_RULES = [
  { id: 'official', name: '官方核心', icon: 'badge',      test: (r) => OFFICIAL_ORGS.includes(r.full_name.split('/')[0]) },
  { id: 'curated',  name: '精选列表', icon: 'star',       test: (r) => r.curated },
  { id: 'plugin',   name: '插件',     icon: 'puzzle',     test: (r) => /plugin|插件|dsh-plugin/i.test(catText(r)) },
  { id: 'theme',    name: '主题皮肤', icon: 'palette',    test: (r) => /theme|skin|皮肤|主题|web-ui|web ui/i.test(catText(r)) },
  { id: 'skill',    name: 'Skill',    icon: 'spark',      test: (r) => /\bskill(s)?\b/i.test(catText(r)) },
  { id: 'tool',     name: '工具',     icon: 'wrench',     test: (r) => /cli|tool|工具|desktop|app|client|workbench|bridge|search/i.test(catText(r)) },
  { id: 'awesome',  name: 'Awesome',  icon: 'list',       test: (r) => /^awesome-|awesome/i.test(r.name) },
  { id: 'other',    name: '其他',     icon: 'box',        test: () => true },
]

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

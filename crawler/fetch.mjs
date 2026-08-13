// DS安甲网 · 每日聚合抓取器
// 用法: node crawler/fetch.mjs [--dry-run]
// 环境变量: GITHUB_TOKEN (可选, 提高限额), DRY_RUN=1 跳过写盘
import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  KEYWORDS, CURATED, CATEGORY_RULES, OFFICIAL_ORGS,
  relevanceScore, isRelevant, MIN_STARS, MIN_SCORE, SEARCH_PER_PAGE, SEARCH_SLEEP_MS,
  AWESOME_SECTION_CATEGORY, installFor,
} from './config.mjs'
import { translateDescriptions } from './translate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'site', 'data')
const HISTORY_DIR = join(OUT_DIR, 'history')
const TOKEN = process.env.GITHUB_TOKEN || ''
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'
const API = 'https://api.github.com'
const RAW = 'https://raw.githubusercontent.com'

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'ds-ajw-crawler/1.0 (+https://ds.ajw.cn)',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
}

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Java: '#b07219',
  Swift: '#F05138', Kotlin: '#A97BFF', Vue: '#41b883', HTML: '#e34c26', CSS: '#563d7c',
  Shell: '#89e051', Ruby: '#701516', PHP: '#4F5D95', Dart: '#00B4AB', Zig: '#ec915c',
  MDX: '#fcb32c', Astro: '#ff5a03', Svelte: '#ff3e00', Lua: '#000080', Elixir: '#6e4a7e',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('[dsh-ajw]', ...a)

async function gh(path, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    let res
    try {
      res = await fetch(API + path, { headers })
    } catch (e) {
      if (i === retries) throw new Error(`网络错误: ${e.message}`)
      await sleep(1500 * (i + 1))
      continue
    }
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset') || 0)
      const waitMs = reset ? Math.min(reset * 1000 - Date.now() + 2000, 15 * 60 * 1000) : 30000
      if (waitMs > 0 && i < retries) {
        log(`  GitHub 限流, ${Math.round(waitMs / 1000)}s 后自动重试`)
        await sleep(waitMs)
        continue
      }
      throw new Error(`GitHub API 限流 (${res.status})`)
    }
    if (!res.ok) {
      if (res.status >= 500 && i < retries) { await sleep(1500 * (i + 1)); continue }
      throw new Error(`GET ${path} -> HTTP ${res.status}`)
    }
    return res.json()
  }
}

async function searchKeyword(kw) {
  const q = encodeURIComponent(kw.q)
  const items = []
  for (let page = 1; page <= 2; page++) {
    const d = await gh(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=${SEARCH_PER_PAGE}&page=${page}`)
    items.push(...(d.items || []))
    if ((d.items || []).length < SEARCH_PER_PAGE) break
    await sleep(TOKEN ? 2600 : SEARCH_SLEEP_MS)
  }
  return { kw, items }
}

async function fetchCurated(map) {
  const out = []
  for (const full of CURATED) {
    const key = full.toLowerCase()
    if (map.has(key)) { map.get(key).curatedSeed = true; continue } // 搜索已命中, 省一次核心 API
    try {
      const d = await gh(`/repos/${full}`)
      if (d.full_name) { d.curatedSeed = true; out.push(d) }
    } catch (e) {
      log(`  精选种子 ${full} 拉取失败: ${e.message}`)
    }
    await sleep(TOKEN ? 500 : 1200)
  }
  return out
}

// 尽力解析 awesome-deepseek-harness 等列表的 README，提取仓库链接及其所属章节（章节=用户需求分类）
function slugify(s) {
  return s.toLowerCase().replace(/&/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
async function parseAwesomeReadme(repo) {
  const links = new Set()
  const sectionByLink = {}
  let section = ''
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(`${RAW}/${repo.full_name}/${branch}/README.md`, { headers })
      if (!res.ok) continue
      const text = await res.text()
      for (const line of text.split('\n')) {
        const h = line.match(/^##\s+(.+)$/)
        if (h) { section = slugify(h[1]); continue }
        const m = line.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)
        if (!m) continue
        const full = m[1].toLowerCase()
        if (full.endsWith('.md') || /\.(png|jpg|svg|gif|webp)$/.test(full)) continue
        links.add(full)
        if (!sectionByLink[full] && section) sectionByLink[full] = section
      }
      if (links.size) return { branch, links: [...links].slice(0, 80), sectionByLink }
    } catch { /* 尝试下一个分支 */ }
  }
  return { branch: null, links: [], sectionByLink: {} }
}

// 抓取后清理 Cloudflare 边缘缓存，让访客立即看到新数据
// 环境变量: CF_API_TOKEN (需要 Zone.Cache Purge 权限), CF_ZONE_ID
async function purgeCloudflare() {
  const token = process.env.CF_API_TOKEN || ''
  const zone = process.env.CF_ZONE_ID || ''
  if (!token || !zone || DRY_RUN) return
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: ['https://ds.ajw.cn/', 'https://ds.ajw.cn/data/projects.data.js', 'https://ds.ajw.cn/data/projects.json'] }),
    })
    const d = await res.json()
    log(`  Cloudflare 缓存清理: ${d.success ? '成功' : '失败 ' + JSON.stringify(d.errors || [])}`)
  } catch (e) {
    log(`  Cloudflare 缓存清理失败: ${e.message}`)
  }
}

function normalize(r, kwLabel = null, curatedNames = new Set()) {
  const text = [r.name, r.description || '', (r.topics || []).join(' ')].join(' ')
  const official = OFFICIAL_ORGS.includes(r.full_name.split('/')[0])
  const curated = curatedNames.has(r.full_name.toLowerCase())
  const score = relevanceScore(r, 0)
  const category = CATEGORY_RULES.find((c) => c.test({ ...r, curated }))
  return {
    id: r.id,
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login || r.full_name.split('/')[0],
    avatar: r.owner?.avatar_url || '',
    htmlUrl: r.html_url,
    homepage: r.homepage || '',
    description: (r.description || '').trim(),
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    language: r.language || '',
    languageColor: LANG_COLORS[r.language] || '#8b949e',
    topics: r.topics || [],
    license: r.license?.spdx_id || '',
    createdAt: (r.created_at || '').slice(0, 10),
    pushedAt: (r.pushed_at || '').slice(0, 10),
    archived: !!r.archived,
    fork: !!r.fork,
    official,
    curated,
    curatedSeed: !!r.curatedSeed,
    score,
    category: { id: category.id, name: category.name, icon: category.icon },
    matchedBy: kwLabel ? [kwLabel] : [],
  }
}

function buildStats(projects) {
  const byCat = {}
  const byLang = {}
  let stars = 0
  for (const p of projects) {
    byCat[p.category.id] = (byCat[p.category.id] || 0) + 1
    if (p.language) byLang[p.language] = (byLang[p.language] || 0) + 1
    stars += p.stars
  }
  return {
    totalProjects: projects.length,
    totalStars: stars,
    topLanguages: Object.entries(byLang).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: k, count: v })),
    byCategory: Object.fromEntries(Object.entries(byCat).sort((a, b) => b[1] - a[1])),
  }
}

async function main() {
  const t0 = Date.now()
  log(`开始抓取 · 关键词 ${KEYWORDS.length} 个 · 精选种子 ${CURATED.length} 个${TOKEN ? ' · 已带 Token' : ' · 未认证模式'}`)

  // 1) 关键词搜索
  const map = new Map()
  for (const kw of KEYWORDS) {
    try {
      const { items } = await searchKeyword(kw)
      log(`  [${kw.label}] 命中 ${items.length}`)
      for (const r of items) {
        if (map.has(r.full_name.toLowerCase())) {
          map.get(r.full_name.toLowerCase()).matchedBy.push(kw.label)
        } else {
          map.set(r.full_name.toLowerCase(), normalize(r, kw.label))
        }
      }
    } catch (e) {
      log(`  [${kw.label}] 失败: ${e.message}`)
    }
    await sleep(TOKEN ? 2600 : SEARCH_SLEEP_MS)
  }

  // 2) 精选种子 + awesome 列表解析
  const curatedSet = new Set(CURATED.map((c) => c.toLowerCase()))
  const curatedDetails = await fetchCurated(map)
  for (const r of curatedDetails) map.set(r.full_name.toLowerCase(), normalize(r, '精选种子', curatedSet))

  // awesome 列表解析（即使精选种子 API 拉取失败也直接从 raw 读取）
  const awesomeSrc = curatedDetails.find((r) => r.full_name.toLowerCase() === '0xsline/awesome-deepseek-harness')
    || { full_name: '0xsline/awesome-deepseek-harness' }
  let awesomeLinks = []
  const { links, sectionByLink } = await parseAwesomeReadme(awesomeSrc)
  awesomeLinks = links
  log(`  awesome 列表解析到 ${links.length} 个仓库链接`)
  const missing = links.filter((l) => !map.has(l))
  const budget = TOKEN ? 100 : 12
  for (const full of missing.slice(0, budget)) {
    try {
      const d = await gh(`/repos/${full}`)
      map.set(full, normalize(d, 'awesome 列表', curatedSet))
    } catch { /* 跳过 */ }
    await sleep(TOKEN ? 400 : 900)
  }
  for (const l of links) {
    const p = map.get(l)
    if (p) {
      p.curated = true
      if (!p.matchedBy.includes('awesome 列表')) p.matchedBy.push('awesome 列表')
      // 应用精选列表章节 -> 需求分类
      const catId = AWESOME_SECTION_CATEGORY[sectionByLink[l]]
      if (catId) {
        const cat = CATEGORY_RULES.find((c) => c.id === catId)
        if (cat) p.category = { id: cat.id, name: cat.name, icon: cat.icon }
      }
    }
  }

  // 3) 过滤 + 评分 + 分类 + 排序
  let projects = [...map.values()]
  const curatedNames = new Set([...curatedSet, ...awesomeLinks])
  projects = projects.filter((p) => {
    if (p.archived) return false
    if (p.fork) return false
    const name = p.fullName.toLowerCase()
    if (curatedNames.has(name)) return true
    return isRelevant(p) && p.stars >= MIN_STARS && p.score >= MIN_SCORE
  })
  projects = projects.map((p) => ({ ...p, score: relevanceScore(p, 0) }))
  projects.sort((a, b) => b.stars - a.stars)

  // 3.4) 生成一键安装命令
  projects = projects.map((p) => ({ ...p, install: installFor(p) }))

  // 3.5) 外文介绍自动翻译为中文
  const translation = await translateDescriptions(projects)

  const today = new Date().toISOString().slice(0, 10)
  const payload = {
    site: { name: 'DS安甲网', domain: 'ds.ajw.cn', slogan: '为你的 DeepSeek Harness 机器人 安装上所需功能的装甲吧' },
    generatedAt: new Date().toISOString(),
    date: today,
    count: projects.length,
    stats: buildStats(projects),
    translation,
    projects,
  }

  // 4) 写盘
  if (!DRY_RUN) {
    await mkdir(OUT_DIR, { recursive: true })
    await mkdir(HISTORY_DIR, { recursive: true })
    await writeFile(join(OUT_DIR, 'projects.json'), JSON.stringify(payload, null, 2))
    await writeFile(join(OUT_DIR, 'projects.data.js'), `window.DSH_PROJECTS = ${JSON.stringify(payload)};`)
    await writeFile(join(HISTORY_DIR, `${today}.json`), JSON.stringify(payload))
    // 仅保留最近 30 天历史
    const hist = (await readdir(HISTORY_DIR)).filter((f) => f.endsWith('.json')).sort()
    for (const f of hist.slice(0, -30)) await unlink(join(HISTORY_DIR, f)).catch(() => {})
  }

  // 5) Cloudflare 缓存清理（域名由 Cloudflare 管理时可配 CF_API_TOKEN + CF_ZONE_ID）
  await purgeCloudflare()

  const secs = ((Date.now() - t0) / 1000).toFixed(0)
  log(`完成 · 收录 ${projects.length} 个项目 · 总星数 ${payload.stats.totalStars} · 耗时 ${secs}s${DRY_RUN ? ' (dry-run, 未写盘)' : ''}`)
  log(`分类分布: ${Object.entries(payload.stats.byCategory).map(([k, v]) => `${k}×${v}`).join(' ')}`)
}

main().catch((e) => {
  console.error('[dsh-ajw] 抓取失败:', e.message)
  process.exit(1)
})

// DS安甲网 · 外文介绍自动翻译模块
// 规则: 简介中 CJK 字符占比 < 0.3 视为需要翻译 -> 译为简体中文
// 策略: Google 免费翻译接口 (gtx) 为主, MyMemory 兜底; 译文缓存到 crawler/cache/translations.json
//       翻译失败时保留原文, 下次运行自动重试
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = join(__dirname, 'cache', 'translations.json')
const log = (...a) => console.log('[dsh-ajw:翻译]', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function needsTranslation(text) {
  if (!text || !text.trim()) return false
  const cjk = (text.match(/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/g) || []).length
  return cjk / text.length < 0.3
}

function hash(text) {
  return createHash('sha1').update(text.trim()).digest('hex').slice(0, 16)
}

let cache = {}
async function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  } catch { cache = {} }
}
async function saveCache() {
  try {
    await mkdir(dirname(CACHE_FILE), { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify(cache))
  } catch { /* 缓存写失败不影响主流程 */ }
}

async function translateGoogle(text) {
  const res = await fetch(
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(text),
    { headers: { 'User-Agent': 'Mozilla/5.0 (ds-ajw-crawler)' }, signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error(`google ${res.status}`)
  const d = await res.json()
  const zh = (d[0] || []).map((seg) => seg && seg[0]).filter(Boolean).join('')
  if (!zh) throw new Error('google 空结果')
  return zh.trim()
}

// 品牌词保护: 翻译前替换为占位符, 翻译后还原, 避免专有名词被乱译
const PROTECT = [
  ['DeepSeek Harness', 'PROTECT_A'], ['DeepSeek-Harness', 'PROTECT_A'],
  ['deepseek-harness', 'PROTECT_B'], ['DeepSeek', 'PROTECT_C'],
  ['GitHub', 'PROTECT_D'], ['VS Code', 'PROTECT_E'], ['VSCode', 'PROTECT_E'],
  ['Codex', 'PROTECT_F'], ['Claude', 'PROTECT_G'], ['OpenClaw', 'PROTECT_H'],
  ['MCP', 'PROTECT_I'], ['LLM', 'PROTECT_J'], ['API', 'PROTECT_K'],
  ['WebUI', 'PROTECT_L'], ['Web UI', 'PROTECT_L'], ['TUI', 'PROTECT_M'],
]
function protect(text) {
  let t = text
  PROTECT.forEach(([term, ph], i) => { t = t.split(term).join(ph) })
  return t
}
function restore(text) {
  let t = text
  PROTECT.forEach(([term, ph]) => {
    // 还原占位符（大小写可能被翻译器改变, 统一按原词还原）
    t = t.replace(new RegExp(ph, 'gi'), term)
  })
  return t
}

async function translateMyMemory(text) {
  const res = await fetch(
    'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=autodetect|zh-CN',
    { headers: { 'User-Agent': 'Mozilla/5.0 (ds-ajw-crawler)' }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) throw new Error(`mymemory ${res.status}`)
  const d = await res.json()
  const zh = d?.responseData?.translatedText
  if (!zh || d?.responseStatus !== 200) throw new Error('mymemory 无结果')
  return zh.trim()
}

// Google 连续失败降级: 本机网络下 Google 接口不通, 快速跳过避免每条挂满超时
let googleFails = 0
async function translateOne(text) {
  const key = hash(text)
  if (cache[key]) return { zh: cache[key], cached: true }
  const guarded = protect(text)
  if (googleFails < 2) {
    try {
      const zh = await translateGoogle(guarded)
      googleFails = 0
      cache[key] = restore(zh)
      return { zh: cache[key], cached: false }
    } catch {
      googleFails++
    }
  }
  await sleep(200)
  try {
    const zh = await translateMyMemory(guarded)
    cache[key] = restore(zh)
    return { zh: cache[key], cached: false }
  } catch {
    return { zh: null, cached: false } // 失败保留原文，下次运行自动重试
  }
}

// 批量翻译项目简介（原地修改 projects）
// TRANSLATE_MAX: 单次运行最多调用翻译接口的次数(0=不限)。本地网络翻译接口稀缺时可设小值,
// 未翻译条目保留原文待下次运行或人工补缓存; GitHub Actions 里接口通畅, 不设限制。
export async function translateDescriptions(projects) {
  await loadCache()
  const maxCalls = Number(process.env.TRANSLATE_MAX || 0)
  let done = 0
  let cached = 0
  let failed = 0
  let apiCalls = 0
  const usedKeys = new Set()
  const todo = projects.filter((p) => p.description && needsTranslation(p.description))
  log(`待翻译简介 ${todo.length} 条${maxCalls ? `（本次最多调用接口 ${maxCalls} 次）` : ''}`)
  for (const p of todo) {
    const key = hash(p.description)
    usedKeys.add(key)
    if (cache[key]) {
      p.descriptionOriginal = p.description
      p.description = cache[key]
      p.translated = true
      cached++
      done++
      continue
    }
    if (maxCalls && apiCalls >= maxCalls) continue // 达到单次上限, 保留原文
    apiCalls++
    const { zh } = await translateOne(p.description)
    if (zh) {
      p.descriptionOriginal = p.description
      p.description = zh
      p.translated = true
      done++
    } else {
      failed++
    }
    await sleep(250) // 温和限速
  }
  // 缓存瘦身: 仅保留仍被使用的译文
  cache = Object.fromEntries([...usedKeys].filter((k) => cache[k]).map((k) => [k, cache[k]]))
  await saveCache()
  log(`翻译完成: ${done} 条（缓存命中 ${cached}, 接口调用 ${apiCalls}, 失败 ${failed}）`)
  return { translated: done, cached, failed, apiCalls }
}

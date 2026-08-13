// DS安甲网 · manual.js 导览渲染冒烟测试
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

const data = readFileSync(here('../site/data/projects.data.js'), 'utf8')
const manualSrc = readFileSync(here('../site/assets/js/manual.js'), 'utf8')

function makeEl(sel) {
  return {
    innerHTML: '', textContent: '', _sel: sel,
    addEventListener() {}, classList: { add() {}, remove() {} },
    setAttribute() {}, getAttribute() { return null }, appendChild() {}, select() {},
  }
}
const els = new Map()
const qs = (sel) => { if (!els.has(sel)) els.set(sel, makeEl(sel)); return els.get(sel) }
const document = { readyState: 'complete', querySelector: qs, createElement: () => makeEl('created'), addEventListener() {} }
const window = { location: { search: '' }, addEventListener() {} }
global.document = document
global.window = window
Object.defineProperty(global, 'navigator', { value: { clipboard: null }, configurable: true })
global.Set = Set
global.URLSearchParams = URLSearchParams

window.DSH_PROJECTS = JSON.parse(data.replace(/^window\.DSH_PROJECTS = /, '').replace(/;$/, ''))
eval(manualSrc)

const guide = qs('#guideGrid').innerHTML
const checks = [
  ['导览卡片渲染', guide.includes('guide-card')],
  ['导览 15 类', (guide.match(/guide-card/g) || []).length === 15],
  ['含个性化分类名', guide.includes('原厂核心') && guide.includes('兵工厂车间') && guide.includes('装甲图鉴')],
  ['含介绍与检索词', guide.includes('guide-search')],
  ['计数标签', guide.includes('件</span>')],
  ['跳转参数链接', guide.includes('index.html?cat=agent')],
  ['导览计数显示', /^\d+$/.test(qs('#guideCount').textContent)],
]
let fail = 0
for (const [name, ok] of checks) { console.log((ok ? '✓' : '✗ FAIL'), name); if (!ok) fail++ }
console.log(fail === 0 ? '\n手册导览冒烟测试全部通过' : `\n${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)

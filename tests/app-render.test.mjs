// DS安甲网 · app.js 渲染冒烟测试（Node DOM 桩, 验证前端渲染逻辑无运行时错误）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

const data = readFileSync(here('../site/data/projects.data.js'), 'utf8')
const appSrc = readFileSync(here('../site/assets/js/app.js'), 'utf8')

function makeEl(sel) {
  return {
    innerHTML: '', textContent: '', value: '', hidden: false,
    dataset: {}, _sel: sel,
    addEventListener() {},
    classList: { add() {}, remove() {} },
    setAttribute() {}, getAttribute() { return null },
    appendChild() {}, select() {},
    scrollIntoView() {},
  }
}
const els = new Map()
function qs(sel) {
  if (!els.has(sel)) els.set(sel, makeEl(sel))
  return els.get(sel)
}
const document = {
  readyState: 'complete',
  querySelector: qs,
  createElement: () => makeEl('created'),
  body: makeEl('body'),
  addEventListener() {},
  execCommand: () => true,
}
const window = {
  location: { search: '' },
  addEventListener() {},
}
global.document = document
global.window = window
Object.defineProperty(global, 'navigator', { value: { clipboard: null }, configurable: true })
global.Image = class { set src(v) { this._src = v } }
global.Set = Set
global.URLSearchParams = URLSearchParams

// 先定义数据, 再执行 app.js（IIFE 会立即注册但 boot 在 readyState complete 时直接跑）
window.DSH_PROJECTS = JSON.parse(data.replace(/^window\.DSH_PROJECTS = /, '').replace(/;$/, ''))
eval(appSrc)

// 断言
const checks = []
const grid = qs('#grid').innerHTML
checks.push(['卡片渲染', grid.includes('<article class="card"')])
checks.push(['卡片数 > 700', (grid.match(/class="card"/g) || []).length > 700])
checks.push(['安装命令行', grid.includes('class="install-cmd"')])
checks.push(['复制按钮', grid.includes('class="copy-btn"')])
checks.push(['新增角标结构', grid.includes('badge-cat')])
const chips = qs('#catChips').innerHTML
checks.push(['分类 chips 含新命名', chips.includes('原厂核心') || chips.includes('编队协作')])
checks.push(['社区卡渲染', qs('#communityGrid').innerHTML.includes('comm-card')])
checks.push(['BBS 频道', qs('#communityGrid').innerHTML.includes('CH-01')])
checks.push(['二维码张贴位', qs('#communityGrid').innerHTML.includes('二维码张贴位')])
checks.push(['hero 项目数', /^\d+$/.test(qs('#statProjects').textContent)])
checks.push(['机库榜渲染', qs('#rankStrip').innerHTML.includes('rank-card')])
checks.push(['语言下拉', qs('#langFilter').innerHTML.includes('TypeScript')])
checks.push(['结果计数', qs('#resultCount').textContent.includes('/ 共')])

let fail = 0
for (const [name, ok] of checks) {
  console.log((ok ? '✓' : '✗ FAIL'), name)
  if (!ok) fail++
}
console.log(fail === 0 ? '\n渲染冒烟测试全部通过' : `\n${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)

/* DS安甲网 · 机库控制台前端逻辑
   数据来自 crawler 每日产出的 data/projects.data.js（window.DSH_PROJECTS），不在此烘焙。 */
(function () {
  'use strict'

  var DATA = window.DSH_PROJECTS
  var $ = function (sel) { return document.querySelector(sel) }

  var PAGE = 18
  var CN_PROXY = 'https://ghfast.top/'
  var CN_INSTEAD_OF = 'git config --global url."https://ghfast.top/https://github.com/".insteadOf "https://github.com/"'
  var HOT = ['dsh', 'ui', '记忆', 'mcp', '飞书', 'rust', '沙箱', '成本']
  var INST_NAME = { 'dsh-plugin': 'dsh plugin add', clone: 'git clone', npx: 'npx' }

  var state = { q: '', cat: '', lang: '', sort: 'rel', newOnly: false, shown: PAGE }
  var PROJ = []
  var IDX = {}
  var CATS = []
  var CATMAP = {}
  var newSet = {}
  var histOK = false
  var live = $('#live')

  /* ============================================================
     工具
     ============================================================ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n) }
  function num(n) {
    if (n == null) return '—'
    return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n)
  }
  function days(from, to) {
    return Math.round((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 86400000)
  }
  function ago(d) {
    if (d <= 0) return '今天'
    if (d < 30) return d + ' 天前'
    if (d < 365) return Math.round(d / 30) + ' 个月前'
    return (d / 365).toFixed(1) + ' 年前'
  }
  function pct(a, b) { return b > 0 ? Math.max(2, Math.round(a / b * 100)) : 0 }
  function hl(text, q) {
    var out = esc(text)
    if (!q || q.length > 24) return out
    q.toLowerCase().split(/\s+/).filter(Boolean).forEach(function (t) {
      var i = out.toLowerCase().indexOf(t)
      if (i < 0) return
      out = out.slice(0, i) + '<mark>' + out.slice(i, i + t.length) + '</mark>' + out.slice(i + t.length)
    })
    return out
  }
  /* ---- 作者标识：真实头像叠在字母章上，头像挂了自动露出字母章 ---- */
  var AVA_TONE = ['#f5a524', '#5ec269', '#4ecdc4', '#e0a33e', '#8a9080', '#d2694a', '#9c8ad6']
  function avaOf(owner) {
    var h = 0
    for (var i = 0; i < owner.length; i++) h = (h * 31 + owner.charCodeAt(i)) >>> 0
    var ch = (owner.replace(/^[^a-z0-9]+/i, '').charAt(0) || owner.charAt(0) || '?').toUpperCase()
    return { ch: ch, bg: AVA_TONE[h % AVA_TONE.length] }
  }
  function avaHTML(p) {
    var a = avaOf(p.owner)
    return '<span class="ava" style="background:' + a.bg + '" aria-hidden="true">' + esc(a.ch) +
      (p.avatar
        ? '<img class="ava__img" src="' + esc(p.avatar) + '" alt="" width="26" height="26" loading="lazy" decoding="async" onerror="this.remove()">'
        : '') +
      '</span>'
  }

  /* ---- 安装命令一律以数据为准：优先 install.cn / install.cmd，缺 cn 时回退到同一条海外源命令 ---- */
  function cardCmd(p) {
    return p.inst ? (p.inst.cn || p.inst.cmd) : null
  }
  // 详情页命令行：第一行永远是抓取器给出的权威命令；第二行按需补一条 git clone
  function cmdRows(p) {
    var rows = []
    if (p.inst && p.inst.cmd) {
      rows.push({ k: p.inst.kind, g: p.inst.cmd, c: p.inst.cn || p.inst.cmd, mirrored: !!p.inst.cn })
    }
    if (rows.length < 2 && p.inst && p.inst.kind !== 'npx') {
      rows.push({ k: 'clone', g: 'git clone ' + p.url + '.git', c: 'git clone ' + CN_PROXY + p.url + '.git', mirrored: true })
    }
    return rows
  }
  function termBlock(text, label) {
    return '<div class="term"><span class="term__txt"><b aria-hidden="true">$</b><code>' + esc(text) + '</code></span>' +
      '<button class="copy" type="button" data-copy="' + esc(text) + '">' + esc(label || '复制') + '</button></div>'
  }

  /* ---- 复制（document 级委托，覆盖卡片、终端块与国内加速配置） ---- */
  function say(t) { if (live) live.textContent = t }
  function legacy(text) {
    var ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch (_) { say('复制失败，请手动选择命令文本') }
    document.body.removeChild(ta)
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-copy]') : null
    if (!b) return
    var text = b.getAttribute('data-copy')
    var old = b.textContent
    var ok = function () {
      b.textContent = '已复制 ✓'
      b.classList.add('is-done')
      say('已复制命令：' + text)
      setTimeout(function () { b.textContent = old; b.classList.remove('is-done') }, 1800)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { legacy(text); ok() })
    } else { legacy(text); ok() }
  })

  /* ============================================================
     归一化：把 crawler 的快照摊平成机库读数
     ============================================================ */
  function normalize(raw, i) {
    var snap = DATA.date
    var upd = Math.max(0, days(raw.pushedAt, snap))
    var age = Math.max(0, days(raw.createdAt, snap))
    return {
      full: raw.fullName,
      n: raw.name,
      owner: raw.owner,
      url: raw.htmlUrl,
      avatar: raw.avatar || '',
      cat: raw.category ? raw.category.id : 'ecosystem',
      lang: raw.language || '—',
      langColor: raw.languageColor || '#8a9080',
      stars: raw.stars || 0,
      forks: raw.forks || 0,
      upd: upd,
      recent: age <= 30,
      age: age,
      score: raw.score || 0,
      first: raw.createdAt,
      pushed: raw.pushedAt,
      hasCat: !!raw.category,
      hasCn: !!raw.description,
      cn: raw.description || '（该仓库没有提供简介）',
      en: raw.descriptionOriginal || raw.description || '（该仓库没有提供英文简介）',
      license: raw.license || '未声明',
      topics: raw.topics || [],
      matched: raw.matchedBy || [],
      official: !!raw.official,
      curated: !!raw.curated,
      inst: raw.install || null,
      idx: i
    }
  }

  function loadCrawl() {
    PROJ = DATA.projects.map(normalize)
    PROJ.forEach(function (p) { IDX[p.full.toLowerCase()] = p })
    CATS = (DATA.categories || []).map(function (c, i) {
      var o = { id: c.id, name: c.name, desc: c.desc || '', search: c.search || '', code: 'C-' + pad2(i + 1) }
      CATMAP[c.id] = o
      return o
    })
    // 数据里出现但分类表没有的分类，补一个占位，保证筛选不漏
    PROJ.forEach(function (p) {
      if (!CATMAP[p.cat]) {
        CATMAP[p.cat] = { id: p.cat, name: p.cat, desc: '', search: '', code: 'C-' + pad2(CATS.length + 1) }
        CATS.push(CATMAP[p.cat])
      }
    })
  }

  /* ============================================================
     机库 HUD 读数（全部来自真实快照，不写死）
     ============================================================ */
  function renderHUD() {
    var s = DATA.stats || {}
    var total = PROJ.length
    var todayNew = 0
    PROJ.forEach(function (p) { if (newSet[p.full]) todayNew++ })
    var monthNew = PROJ.filter(function (p) { return p.recent }).length
    var withCmd = PROJ.filter(function (p) { return p.inst && p.inst.cmd }).length
    var usedCats = CATS.filter(function (c) {
      return PROJ.some(function (p) { return p.cat === c.id })
    }).length
    var stamp = '快照 ' + DATA.date + ' · 星标总量 ' + num(s.totalStars) + ' · 30 天窗口'
    var stampEl = $('#stamp')
    if (stampEl) stampEl.textContent = stamp

    var cells = [
      { lab: '收录总数', val: total, unit: '台', cls: 'is-accent', w: 100 },
      { lab: '今日新增', val: todayNew, unit: '台', w: pct(todayNew, total) },
      { lab: '30 天新增', val: monthNew, unit: '台', w: pct(monthNew, total) },
      { lab: '分类货架', val: usedCats, unit: '/ ' + CATS.length + ' 类', w: pct(usedCats, CATS.length) },
      { lab: '一键命令', val: pct(withCmd, total), unit: '%', w: pct(withCmd, total), cyan: true }
    ]
    var hud = $('#hud')
    if (!hud) return
    // 数据链路状态灯：每盏灯都对应一个可核对的信号
    var noCat = PROJ.filter(function (p) { return !p.hasCat }).length
    var described = PROJ.filter(function (p) { return p.hasCn }).length
    var lamps = [
      { st: 'ok', t: 'GitHub 快照 · ' + DATA.date },
      { st: noCat ? 'stale' : 'ok', t: '分类映射 ' + (total - noCat) + '/' + total },
      { st: pct(described, total) >= 90 ? 'ok' : 'stale', t: '中文简介 ' + pct(described, total) + '%' },
      { st: histOK ? 'ok' : 'stale', t: histOK ? '昨日快照已比对' : '昨日快照缺失' },
      { st: pct(withCmd, total) >= 90 ? 'ok' : 'stale', t: '安装命令 ' + withCmd + '/' + total }
    ]
    var okCount = lamps.filter(function (l) { return l.st === 'ok' }).length

    hud.innerHTML = cells.map(function (c) {
      return '<div class="hud__cell"><div class="hud__lab">' + c.lab + '</div>' +
        '<div class="hud__val' + (c.cyan ? ' is-cyan' : c.cls ? ' ' + c.cls : '') + '">' + c.val +
        '<span class="hud__unit">' + esc(c.unit) + '</span></div>' +
        '<div class="meter' + (c.cyan ? ' is-cyan' : '') + '"><i style="width:' + c.w + '%"></i></div></div>'
    }).join('') +
      '<div class="hud__cell hud__cell--wide">' +
        '<div class="hud__lab">数据链路 · ' + okCount + '/' + lamps.length + ' 在线</div>' +
        '<div class="lamps">' + lamps.map(function (l) {
          return '<span class="lamp lamp--' + l.st + '"><i class="lamp__d" aria-hidden="true"></i><span class="lamp__t">' + esc(l.t) + '</span></span>'
        }).join('') + '</div></div>'

    var foot = $('#consoleFoot')
    if (foot) {
      foot.innerHTML =
        '<span>收录阈值 <b>score ≥ 5</b></span><span class="sep">|</span>' +
        '<span>抓取口径 <b>9 组关键词 + 14 个精选种子 + awesome 章节映射</b></span><span class="sep">|</span>' +
        '<span>快照保留 <b>30 天</b></span>'
    }
  }

  /* ============================================================
     扫描台：模糊匹配（子串 + 分类 + 语言 + 标签）
     ============================================================ */
  function scoreOf(p, q) {
    var s = 0
    q.toLowerCase().split(/\s+/).filter(Boolean).forEach(function (t) {
      var hit = 0
      var nl = p.n.toLowerCase()
      if (nl.indexOf(t) >= 0) { hit += 100; if (nl.indexOf(t) === 0) hit += 60 }
      if (p.full.toLowerCase().indexOf(t) >= 0) hit += 45
      if (p.cn.toLowerCase().indexOf(t) >= 0) hit += 40
      if (p.en.toLowerCase().indexOf(t) >= 0) hit += 10
      var c = CATMAP[p.cat] || { name: '', id: '', desc: '', code: '' }
      if (c.name.indexOf(t) >= 0) hit += 35
      else if (c.desc.toLowerCase().indexOf(t) >= 0) hit += 22
      else if ((c.search || '').toLowerCase().indexOf(t) >= 0) hit += 20
      else if (c.id.indexOf(t) >= 0) hit += 30
      if (p.lang.toLowerCase().indexOf(t) >= 0) hit += 30
      if (p.license.toLowerCase().indexOf(t) >= 0) hit += 16
      if (p.topics.join(' ').toLowerCase().indexOf(t) >= 0) hit += 28
      if (p.matched.join(' ').toLowerCase().indexOf(t) >= 0) hit += 12
      if (hit > 0) s += hit
    })
    return s
  }

  function compute() {
    var q = state.q.trim()
    var list = PROJ.filter(function (p) {
      if (state.cat && p.cat !== state.cat) return false
      if (state.lang && p.lang !== state.lang) return false
      if (state.newOnly && !p.recent) return false
      if (q && scoreOf(p, q) <= 0) return false
      return true
    })
    if (q) list.forEach(function (p) { p._s = scoreOf(p, q) })
    if (state.sort === 'star') list.sort(function (a, b) { return b.stars - a.stars || a.n.localeCompare(b.n) })
    else if (state.sort === 'upd') list.sort(function (a, b) { return a.upd - b.upd || b.stars - a.stars })
    else if (state.sort === 'new') list.sort(function (a, b) { return (b.recent - a.recent) || (a.upd - b.upd) || (b.stars - a.stars) })
    else list.sort(function (a, b) { return (b._s - a._s) || (b.stars - a.stars) })
    return list
  }

  /* ============================================================
     渲染：分类 / 语言 / 货架 / 榜
     ============================================================ */
  function catCounts() {
    var m = {}
    PROJ.forEach(function (p) { m[p.cat] = (m[p.cat] || 0) + 1 })
    return m
  }

  function renderCats() {
    var el = $('#cats')
    if (!el) return
    var counts = catCounts()
    var h = '<button class="chip" type="button" data-cat="" aria-pressed="' + (state.cat === '') + '">全部' +
      '<span class="chip__n">' + PROJ.length + '</span></button>'
    CATS.forEach(function (c) {
      h += '<button class="chip" type="button" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.cat === c.id) + '" title="' +
        esc(c.name + (c.desc ? ' · ' + c.desc : '')) + '">' + esc(c.name) +
        '<span class="chip__n">' + (counts[c.id] || 0) + '</span></button>'
    })
    el.innerHTML = h
    var lab = $('#catLab')
    if (lab) lab.textContent = '机甲分类 · ' + CATS.length + ' 类'
  }

  function renderLangs() {
    var sel = $('#fLang')
    if (!sel) return
    var seen = {}
    var out = []
    PROJ.forEach(function (p) { if (p.lang && !seen[p.lang]) { seen[p.lang] = 1; out.push(p.lang) } })
    out.sort()
    sel.innerHTML = '<option value="">全部语言</option>' + out.map(function (l) {
      return '<option value="' + esc(l) + '">' + esc(l) + '</option>'
    }).join('')
    sel.value = state.lang
  }

  function flags(p) {
    var h = ''
    if (newSet[p.full]) h += '<span class="flag flag--ok">今日新增</span>'
    else if (p.recent) h += '<span class="flag">30 天新增</span>'
    if (p.official) h += '<span class="flag flag--cyan">官方</span>'
    if (p.curated) h += '<span class="flag flag--gold">精选</span>'
    return h
  }

  function cardHTML(p) {
    var c = CATMAP[p.cat] || { code: 'C-??', name: p.cat }
    var cmd = cardCmd(p)
    var ts = p.topics
    var shown = ts.slice(0, 4)
    var rest = ts.length - shown.length
    return '<article class="card">' +
      '<div class="card__l">' +
        '<div class="card__top"><span class="plate">' + esc(c.code) +
          '<span class="plate__sep" aria-hidden="true">·</span><span class="plate__c">' + esc(c.name) + '</span></span>' +
          flags(p) + '</div>' +
        '<div class="card__top" style="margin-top:10px">' +
          avaHTML(p) +
          '<a class="card__nm" href="#/p/' + esc(p.owner) + '/' + esc(p.n) + '">' + hl(p.n, state.q) + '</a>' +
          '<span class="card__own">' + hl(p.owner, state.q) + '</span>' +
        '</div>' +
        '<p class="card__cn" title="' + esc(p.en) + '">' + hl(p.cn, state.q) + '</p>' +
        (shown.length ? '<div class="card__topics">' + shown.map(function (t) {
          return '<span class="tag">#' + hl(t, state.q) + '</span>'
        }).join('') + (rest > 0 ? '<span class="card__more">+' + rest + ' 个标签</span>' : '') + '</div>' : '') +
      '</div>' +
      '<div class="card__side">' +
        '<div class="stats">' +
          '<span class="stat"><span class="stat__v">' + num(p.stars) + '</span><span class="stat__k">STAR</span></span>' +
          '<span class="stat"><span class="stat__v">' + num(p.forks) + '</span><span class="stat__k">FORK</span></span>' +
          '<span class="stat"><span class="stat__v">' + p.score.toFixed(1) + '</span><span class="stat__k">相关度</span></span>' +
        '</div>' +
        '<span class="lang"><i style="background:' + esc(p.langColor) + '" aria-hidden="true"></i>' + hl(p.lang, state.q) + '</span>' +
        '<span class="stat__k">' + ago(p.upd) + '更新 · ' + esc(p.license) + '</span>' +
      '</div>' +
      '<div class="card__row">' +
        (cmd ? termBlock(cmd) : '<span class="term"><span class="term__txt">该仓库未提供一键安装命令，请前往 GitHub 自行克隆</span></span>') +
        '<a class="card__link" href="#/p/' + esc(p.owner) + '/' + esc(p.n) + '">查看详情 →</a>' +
      '</div>' +
    '</article>'
  }

  function nearMiss(q) {
    if (q.length < 2) return []
    return PROJ.map(function (p) { return { p: p, d: dist(p, q) } })
      .filter(function (x) { return x.d >= 1 && x.d <= Math.max(2, Math.ceil(q.length * 0.5)) })
      .sort(function (a, b) { return a.d - b.d })
      .slice(0, 3)
      .map(function (x) { return x.p })
  }
  function dist(p, q) {
    q = q.toLowerCase()
    var best = 99
    ;[p.n, p.full, p.cn, (CATMAP[p.cat] || {}).name || ''].forEach(function (f) {
      var a = String(f).toLowerCase()
      var i = a.indexOf(q)
      if (i >= 0) best = Math.min(best, i === 0 ? 0 : 1)
    })
    return best
  }

  function emptyHTML() {
    var q = state.q.trim()
    var near = nearMiss(q)
    return '<div class="empty">' +
      '<div class="empty__icon" aria-hidden="true">⌕</div>' +
      '<p class="empty__ttl">机库扫描无匹配 · 0 台</p>' +
      '<p class="empty__q">检索词 ' + esc(q || '（空）') + ' 在 ' + PROJ.length + ' 台收录中未命中</p>' +
      '<p class="empty__tip">搜索支持项目名、分类名、语言与标签的子串匹配，命中处会高亮。如果只是想找某个方向，用下面的分类或语言筛选更快。</p>' +
      '<div class="empty__tips">' +
        '<div class="empty__tipitem"><span aria-hidden="true">01</span><span><b>放宽关键词</b>只输入 1–2 个字，例如「记」「盾」</span></div>' +
        '<div class="empty__tipitem"><span aria-hidden="true">02</span><span><b>按分类找</b>' + CATS.length + ' 类机甲分类覆盖了插件的全部常见位置</span></div>' +
        '<div class="empty__tipitem"><span aria-hidden="true">03</span><span><b>按语言筛</b>' + ((DATA.stats && DATA.stats.topLanguages) || []).slice(0, 4).map(function (l) { return esc(l.name) }).join(' / ') + '</span></div>' +
        '<div class="empty__tipitem"><span aria-hidden="true">04</span><span><b>清空条件</b>重置为全库 ' + PROJ.length + ' 台</span></div>' +
      '</div>' +
      (near.length ? '<div class="empty__hot"><span class="empty__hotlab">形近项目 · 可能是你要找的</span><div class="cats__row">' +
        near.map(function (p) { return '<a class="chip" href="#/p/' + esc(p.owner) + '/' + esc(p.n) + '">' + esc(p.full) + '</a>' }).join('') +
        '</div></div>' : '') +
      '<div class="empty__hot"><span class="empty__hotlab">热门检索</span><div class="cats__row">' +
        HOT.map(function (h) { return '<button class="chip chip--ghost" type="button" data-hot="' + esc(h) + '">' + esc(h) + '</button>' }).join('') +
        '</div></div>' +
      '<div class="cats__row" style="justify-content:center;margin-top:22px">' +
        '<button class="btn btn--ghost" type="button" id="resetAll">清空全部筛选条件</button></div>' +
    '</div>'
  }

  // 当前生效的筛选条件摘要（货架计数行用）
  function catChipText() {
    var c = CATMAP[state.cat]
    var parts = [c ? '分类 ' + c.code + ' ' + c.name : '全部分类']
    if (state.lang) parts.push('语言 ' + state.lang)
    if (state.newOnly) parts.push('仅 30 天新增')
    return parts.join(' · ')
  }

  function renderShelf() {
    var shelf = $('#shelf')
    var res = $('#resCount')
    if (!shelf) return
    var list = compute()
    if (res) {
      res.textContent = list.length + ' 台命中' + (state.q.trim() ? ' · 「' + state.q.trim() + '」' : '') +
        ' · ' + catChipText() + ' · 已显示 ' + Math.min(state.shown, list.length) + ' / ' + list.length
    }
    if (!list.length) { shelf.innerHTML = emptyHTML(); return }
    var slice = list.slice(0, state.shown)
    shelf.innerHTML = '<div class="shelf__list" role="list">' + slice.map(cardHTML).join('') + '</div>' +
      (slice.length < list.length
        ? '<div class="more"><button class="btn" type="button" id="moreBtn">加载更多补给</button>' +
          '<span class="more__t">已显示 ' + slice.length + ' / ' + list.length + ' 台 · 每次 ' + PAGE + ' 台</span></div>'
        : '<div class="more"><span class="more__t">已载入全部 ' + list.length + ' 台 · 全库快照 ' + PROJ.length + ' 台</span></div>')
  }

  function renderRank() {
    var el = $('#rank')
    if (!el) return
    var top = PROJ.slice().sort(function (a, b) { return b.stars - a.stars }).slice(0, 10)
    if (!top.length) return
    var max = top[0].stars
    el.innerHTML = top.map(function (p, i) {
      var c = CATMAP[p.cat] || { name: p.cat }
      return '<li><a class="rank__a" href="#/p/' + esc(p.owner) + '/' + esc(p.n) + '">' +
        '<span class="rank__no" aria-hidden="true">' + pad2(i + 1) + '</span>' +
        '<span style="min-width:0"><span class="rank__nm">' + esc(p.n) + '</span>' +
        '<span class="rank__ct">' + esc(c.name) + ' · ' + esc(p.lang) + '</span></span>' +
        '<span class="rank__st">' + num(p.stars) + '</span>' +
        '<span class="rank__bar"><i style="width:' + Math.round(p.stars / max * 100) + '%"></i></span>' +
      '</a></li>'
    }).join('')
    var note = $('#rankNote')
    if (note) note.textContent = '全库星标 Top 10 · 不受筛选影响 · 数据截至快照 ' + DATA.date
  }

  /* ============================================================
     项目详情
     ============================================================ */
  function meta(k, v) {
    return '<div class="meta__i"><span class="meta__k">' + esc(k) + '</span><span class="meta__v">' + esc(v) + '</span></div>'
  }

  function renderDetail(full) {
    var box = $('#detail')
    if (!box) return
    var p = IDX[full.toLowerCase()]
    if (!p) {
      box.innerHTML = '<div class="empty"><p class="empty__ttl">未找到该补给</p>' +
        '<p class="empty__tip">链接指向的 ' + esc(full) + ' 不在当前快照的 ' + PROJ.length + ' 台收录里，可能是 30 天窗口外被清理。</p>' +
        '<div class="cats__row" style="justify-content:center;margin-top:20px"><a class="btn" href="#/hangar">返回机库</a></div></div>'
      return
    }
    var c = CATMAP[p.cat] || { code: 'C-??', name: p.cat, desc: '' }
    var h = '<nav class="crumb" aria-label="面包屑"><a href="#/hangar">机库</a><span class="crumb__sep" aria-hidden="true">/</span>' +
      '<a href="#/hangar" data-catlink="' + esc(c.id) + '">' + esc(c.code) + ' ' + esc(c.name) + '</a>' +
      '<span class="crumb__sep" aria-hidden="true">/</span><span>' + esc(p.full) + '</span></nav>'

    h += '<section class="detail__hd">' +
      '<div class="card__top"><span class="plate">' + esc(c.code) +
        '<span class="plate__sep" aria-hidden="true">·</span><span class="plate__c">' + esc(c.name) + '</span></span>' + flags(p) + '</div>' +
      '<h1 class="detail__name">' + avaHTML(p) + '<span class="detail__repo">' + esc(p.n) + '<small> · ' + esc(p.owner) + '</small></span></h1>' +
      '<p class="detail__cn">' + esc(p.cn) + '</p>' +
      '<div class="detail__kpis">' +
        '<div class="kpi"><div class="kpi__k">Star</div><div class="kpi__v">' + p.stars.toLocaleString('zh-CN') + '</div></div>' +
        '<div class="kpi"><div class="kpi__k">Fork</div><div class="kpi__v">' + p.forks.toLocaleString('zh-CN') + '</div></div>' +
        '<div class="kpi"><div class="kpi__k">相关度</div><div class="kpi__v">' + p.score.toFixed(1) + '</div></div>' +
        '<div class="kpi"><div class="kpi__k">最近更新</div><div class="kpi__v">' + ago(p.upd) + '</div></div>' +
      '</div></section>'

    h += '<section class="blk" aria-labelledby="instT">' +
      '<div class="blk__h"><h2 class="blk__t" id="instT">安装命令</h2>' +
        '<div class="srcbar"><span class="srcbar__lab">下载源</span>' +
        '<div class="seg" role="group" aria-label="下载源切换">' +
          '<button type="button" data-src="cn" aria-pressed="true">国内源</button>' +
          '<button type="button" data-src="global" aria-pressed="false">海外源</button>' +
        '</div><span class="blk__n" id="srcNote"></span></div></div>' +
      '<div class="cmd" id="cmdBox"></div>' +
      '<p class="cmd__note">国内源只改写下载域名（经 ghfast.top 镜像），不改变安装语义；如需回退，切到「海外源」后再执行即可。' +
        '想一次性给所有项目配镜像，用首页的「国内加速一键配置」。</p></section>'

    h += '<div class="split">' +
      '<section class="blk" style="margin-top:0" aria-labelledby="cnT">' +
        '<div class="blk__h"><h2 class="blk__t" id="cnT">简介 · 中文</h2><span class="blk__n">自动译中</span></div>' +
        '<div class="readme"><h4>它解决什么</h4><p>' + esc(p.cn) + '</p>' +
          '<h4>上架要点</h4><ul>' +
            '<li>相关度评分 ' + p.score.toFixed(1) + '，收录阈值 5</li>' +
            '<li>首次收录 ' + esc(p.first) + '，最近推送 ' + esc(p.pushed) + '</li>' +
            '<li>推荐安装方式 ' + esc(p.inst ? (INST_NAME[p.inst.kind] || p.inst.kind) : '无') + '</li>' +
          '</ul></div>' +
      '</section>' +
      '<section class="blk" style="margin-top:0" aria-labelledby="enT">' +
        '<div class="blk__h"><h2 class="blk__t" id="enT">简介 · 原文</h2><span class="blk__n">upstream · GitHub</span></div>' +
        '<div class="readme readme--en"><h4>' + esc(p.n) + '</h4><p>' + esc(p.en) + '</p>' +
          '<h4>Topics</h4><p>' + (p.topics.length ? esc(p.topics.join(' · ')) : '（无）') + '</p></div>' +
      '</section></div>'

    h += '<section class="blk" aria-labelledby="metaT">' +
      '<div class="blk__h"><h2 class="blk__t" id="metaT">全量元数据</h2><span class="blk__n">来自每日快照，非实时</span></div>' +
      '<div class="meta">' +
        meta('完整名称', p.full) +
        meta('机甲分类', c.code + ' · ' + c.name) +
        meta('分类释义', c.desc || '—') +
        meta('主语言', p.lang) +
        meta('许可证', p.license) +
        meta('Star / Fork', p.stars.toLocaleString('zh-CN') + ' / ' + p.forks.toLocaleString('zh-CN')) +
        meta('建库时间', p.first) +
        meta('最近推送', p.pushed + '（' + ago(p.upd) + '）') +
        meta('相关度评分', p.score.toFixed(1) + '（阈值 5）') +
        meta('收录状态', newSet[p.full] ? '今日新增' : p.recent ? '30 天新增' : '在库 · 稳定') +
        meta('抓取时间', new Date(DATA.generatedAt).toLocaleString('zh-CN', { hour12: false })) +
        meta('命中的标签', p.topics.length ? p.topics.map(function (t) { return '#' + t }).join('  ') : '（无）') +
      '</div></section>'

    h += '<section class="blk" aria-labelledby="mtxT">' +
      '<div class="blk__h"><h2 class="blk__t" id="mtxT">命中来源 · 关键词组</h2>' +
        '<span class="blk__n">' + (p.matched.length ? p.matched.length + ' 组' : '精选种子直收') + '</span></div>' +
      (p.matched.length
        ? '<div class="tblwrap"><table><caption>该仓库被下列检索命中；多组命中说明它在生态里出现的位置比较核心</caption>' +
          '<thead><tr><th scope="col">#</th><th scope="col">命中关键词组</th></tr></thead><tbody>' +
          p.matched.map(function (m, i) {
            return '<tr><th scope="row" class="num">' + pad2(i + 1) + '</th><td>' + esc(m) + '</td></tr>'
          }).join('') + '</tbody></table></div>'
        : '<div class="readme"><p>该仓库由<strong>精选种子</strong>直接收录，不依赖关键词检索 —— 通常是官方项目或社区维护的 awesome 索引。</p></div>') +
      '<p class="scrollhint">左右滑动查看完整列表</p></section>'

    h += '<section class="sec" style="padding-bottom:8px"><div class="cats__row">' +
      '<a class="btn btn--ghost" href="#/hangar">← 返回机库</a>' +
      '<a class="btn" href="manual.html">新手机师手册 →</a></div></section>'

    box.innerHTML = h
    bindSrc(p)
  }

  function bindSrc(p) {
    var box = $('#cmdBox')
    var note = $('#srcNote')
    var rows = cmdRows(p)
    // 命令里没有国内/海外之分（官方运行时的 npx），切换开关没有意义
    var same = rows.every(function (r) { return r.c === r.g })
    var seg = document.querySelector('.srcbar .seg')
    var lab = document.querySelector('.srcbar__lab')
    if (same) {
      if (seg) seg.hidden = true
      if (lab) lab.hidden = true
    }
    var src = 'cn'
    function paint() {
      box.innerHTML = rows.map(function (r) {
        return '<div class="cmd__row"><span class="cmd__k">' + esc(INST_NAME[r.k] || r.k) + '</span>' +
          termBlock(src === 'cn' ? r.c : r.g) + '</div>'
      }).join('')
      var unmirrored = rows.filter(function (r) { return !r.mirrored }).length
      note.textContent = same
        ? '该命令无镜像改写'
        : src === 'cn'
          ? '国内源 · 经 ghfast.top 镜像拉取' + (unmirrored ? '（' + unmirrored + ' 条本站未提供镜像命令，回退到海外源）' : '')
          : '海外源 · github.com 直连'
    }
    var btns = document.querySelectorAll('[data-src]')
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        src = this.getAttribute('data-src')
        var all = document.querySelectorAll('[data-src]')
        for (var j = 0; j < all.length; j++) {
          all[j].setAttribute('aria-pressed', all[j] === this ? 'true' : 'false')
        }
        paint()
      })
    }
    paint()
  }

  /* ============================================================
     机师社群（配置来自 community-config.js，留空 = 筹备中）
     ============================================================ */
  function renderCommunity() {
    var C = window.DSH_COMMUNITY || {}
    var title = $('#communityTitle')
    if (title && C.title) title.textContent = C.title
    var note = $('#communityNote')
    if (note && C.note) note.textContent = C.note
    if (window.DSHChannels) window.DSHChannels.render($('#communityGrid'))
  }

  /* ============================================================
     昨日快照：算「今日新增」
     ============================================================ */
  function loadHistory() {
    var d = new Date(DATA.date + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    var y = d.toISOString().slice(0, 10)
    fetch('data/history/' + y + '.json')
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (prev) {
        if (!prev || !Array.isArray(prev.projects)) return
        var old = {}
        prev.projects.forEach(function (p) { old[p.fullName] = true })
        PROJ.forEach(function (p) { if (!old[p.full]) newSet[p.full] = true })
        histOK = true
        renderHUD()
        renderShelf()
      })
      .catch(function () { /* 无历史或本地 file:// 打开时静默降级 */ })
  }

  /* ============================================================
     路由：#/p/<owner>/<name> → 详情；其余 → 机库
     ============================================================ */
  var views = { hangar: $('#v-hangar'), detail: $('#v-detail') }
  function route() {
    var h = String(window.location.hash || '').replace(/^#\/?/, '')
    var parts = h.split('/')
    var name = parts[0] === 'p' && parts.length >= 3 ? 'detail' : 'hangar'
    if (views.hangar) views.hangar.classList.toggle('is-on', name === 'hangar')
    if (views.detail) views.detail.classList.toggle('is-on', name === 'detail')
    var navs = document.querySelectorAll('[data-nav]')
    for (var i = 0; i < navs.length; i++) {
      if (navs[i].getAttribute('data-nav') === name) navs[i].setAttribute('aria-current', 'page')
      else navs[i].removeAttribute('aria-current')
    }
    if (name === 'detail') {
      try { renderDetail(decodeURIComponent(parts[1]) + '/' + decodeURIComponent(parts[2])) } catch (_) { renderDetail(h) }
    }
    if (views.hangar) views.hangar.setAttribute('aria-hidden', name === 'hangar' ? 'false' : 'true')
    if (views.detail) views.detail.setAttribute('aria-hidden', name === 'detail' ? 'false' : 'true')
    window.scrollTo(0, 0)
  }

  /* ============================================================
     交互绑定
     ============================================================ */
  function onFilter() { state.shown = PAGE; renderShelf() }
  function resetAll() {
    state.q = ''; state.cat = ''; state.lang = ''; state.sort = 'rel'; state.newOnly = false
    var q = $('#q'); if (q) q.value = ''
    var lang = $('#fLang'); if (lang) lang.value = ''
    var sort = $('#fSort'); if (sort) sort.value = 'rel'
    var nw = $('#fNew'); if (nw) nw.checked = false
    renderCats()
    onFilter()
  }

  function bind() {
    var q = $('#q')
    if (q) {
      q.addEventListener('input', function () { state.q = q.value; onFilter() })
    }
    var qClear = $('#qClear')
    if (qClear) {
      qClear.addEventListener('click', function () { state.q = ''; if (q) q.value = ''; onFilter(); q.focus() })
    }
    var lang = $('#fLang')
    if (lang) lang.addEventListener('change', function () { state.lang = lang.value; onFilter() })
    var sort = $('#fSort')
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; onFilter() })
    var nw = $('#fNew')
    if (nw) nw.addEventListener('change', function () { state.newOnly = nw.checked; onFilter() })

    var cats = $('#cats')
    if (cats) {
      cats.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cat]')
        if (!b) return
        state.cat = b.getAttribute('data-cat')
        state.shown = PAGE
        renderCats()
        renderShelf()
      })
    }
    var shelf = $('#shelf')
    if (shelf) {
      shelf.addEventListener('click', function (e) {
        if (e.target.closest('#moreBtn')) { state.shown += PAGE; renderShelf(); return }
        if (e.target.closest('#resetAll')) { resetAll(); return }
        var hot = e.target.closest('[data-hot]')
        if (hot && q) {
          q.value = hot.getAttribute('data-hot')
          state.q = q.value
          onFilter()
          q.focus()
        }
      })
    }
    var detail = $('#detail')
    if (detail) {
      detail.addEventListener('click', function (e) {
        var cl = e.target.closest('[data-catlink]')
        if (!cl) return
        e.preventDefault()
        state.cat = cl.getAttribute('data-catlink')
        state.q = ''
        if (q) q.value = ''
        state.shown = PAGE
        if (window.location.hash !== '#/hangar') {
          window.location.hash = '#/hangar'
          return
        }
        renderCats()
        renderShelf()
        var t = $('#scan')
        if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    window.addEventListener('hashchange', route)
  }

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    if (!DATA || !Array.isArray(DATA.projects)) {
      var shelf = $('#shelf')
      if (shelf) {
        shelf.innerHTML = '<div class="empty"><p class="empty__ttl">数据加载失败</p>' +
          '<p class="empty__tip">请通过 HTTP 服务访问本站（nginx / GitHub Pages），或先运行 crawler/fetch.mjs 生成数据。</p></div>'
      }
      return
    }
    loadCrawl()

    // 手册页可带分类参数跳回来：index.html?cat=<id>
    try {
      var pre = new URLSearchParams(window.location.search).get('cat')
      if (pre && CATMAP[pre]) state.cat = pre
    } catch (_) { /* 老浏览器忽略 */ }

    var mirror = $('#cnMirrorCmd')
    if (mirror) mirror.innerHTML = termBlock(CN_INSTEAD_OF, '复制命令')

    renderCats()
    renderLangs()
    renderRank()
    renderCommunity()
    renderHUD()
    renderShelf()
    bind()
    route()
    loadHistory()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()

/* DS安甲网 · 前端逻辑：渲染、搜索、筛选、排序（无构建依赖，纯原生 JS） */
(function () {
  'use strict'

  var DATA = window.DSH_PROJECTS
  var $ = function (sel) { return document.querySelector(sel) }

  var CAT_ICONS = { core: 'badge', awesome: 'list', client: 'monitor', agent: 'users', ui: 'palette', context: 'book', input: 'pen', browser: 'globe', model: 'cpu', git: 'git', notify: 'bell', fun: 'game', infra: 'wrench', tool: 'box', ecosystem: 'globe' }
  var CAT_ORDER = ['core', 'agent', 'ui', 'context', 'input', 'browser', 'model', 'git', 'notify', 'fun', 'client', 'infra', 'tool', 'awesome', 'ecosystem']
  var state = { q: '', cat: 'all', lang: '', sort: 'stars' }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function compact(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
    return String(n)
  }
  function icon(id, cls, filled) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + (filled ? ' fill' : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'
  }
  function daysAgo(dateStr) {
    var d = (Date.now() - new Date(dateStr + 'T00:00:00Z').getTime()) / 86400000
    if (d < 1) return '今天更新'
    if (d < 30) return Math.floor(d) + ' 天前更新'
    if (d < 365) return Math.floor(d / 30) + ' 个月前更新'
    return dateStr
  }

  function badge(official, curated, isNew, cat) {
    var out = ''
    if (official) out += '<span class="badge badge-official">' + icon('badge') + '官方</span>'
    if (curated) out += '<span class="badge badge-curated">' + icon('star', null, true) + '精选</span>'
    if (isNew) out += '<span class="badge badge-new">' + icon('new') + '新增</span>'
    out += '<span class="badge badge-cat">' + icon(cat.icon || 'box') + esc(cat.name) + '</span>'
    return out
  }

  function cardHTML(p, isNew) {
    var topics = (p.topics || []).slice(0, 4).map(function (t) { return '<span class="topic">' + esc(t) + '</span>' }).join('')
    return (
      '<article class="card" role="listitem">' +
        '<div class="card-top">' +
          (p.avatar ? '<img class="avatar" src="' + esc(p.avatar) + '" alt="" loading="lazy" width="40" height="40">' : '') +
          '<div class="card-title">' +
            '<div class="card-name"><a href="' + esc(p.htmlUrl) + '" target="_blank" rel="noopener">' + esc(p.fullName) + '</a></div>' +
            '<div class="card-owner">@' + esc(p.owner) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="badges">' + badge(p.official, p.curated, isNew, p.category) + '</div>' +
        (p.description ? '<p class="card-desc"' + (p.descriptionOriginal ? ' title="原文: ' + esc(p.descriptionOriginal) + '"' : '') + '>' + esc(p.description) + '</p>' : '') +
        '<div class="card-meta">' +
          '<span class="m stars" title="' + p.stars.toLocaleString('zh-CN') + ' 星">' + icon('star', null, true) + compact(p.stars) + '</span>' +
          '<span class="m">' + icon('fork') + compact(p.forks) + '</span>' +
          (p.language ? '<span class="m"><span class="lang-dot" style="background:' + esc(p.languageColor) + '" aria-hidden="true"></span>' + esc(p.language) + '</span>' : '') +
          (p.license ? '<span class="m">' + esc(p.license) + '</span>' : '') +
          '<span class="m updated">' + icon('refresh') + daysAgo(p.pushedAt) + '</span>' +
        '</div>' +
        (topics ? '<div class="topics" aria-label="标签">' + topics + '</div>' : '') +
        (p.install && p.install.cmd ? (
          '<div class="card-install">' +
            '<span class="install-label">' + esc(p.install.hint || '一键安装') + '</span>' +
            (p.install.cn ? (
              '<div class="install-tabs" role="tablist">' +
                '<button class="install-tab active" type="button" role="tab" aria-selected="true">国内源</button>' +
                '<button class="install-tab" type="button" role="tab" aria-selected="false">海外源</button>' +
              '</div>'
            ) : '') +
            (p.install.cn
              ? '<div class="install-row" data-cn="' + esc(p.install.cn) + '" data-global="' + esc(p.install.cmd) + '">' +
                  '<code class="install-cmd">' + esc(p.install.cn) + '</code>' +
                  '<button class="copy-btn" type="button" data-cmd="' + esc(p.install.cn) + '" aria-label="复制国内源安装命令">' + icon('copy') + '</button>' +
                '</div>'
              : '<div class="install-row">' +
                  '<code class="install-cmd">' + esc(p.install.cmd) + '</code>' +
                  '<button class="copy-btn" type="button" data-cmd="' + esc(p.install.cmd) + '" aria-label="复制安装命令">' + icon('copy') + '</button>' +
                '</div>'
            ) +
          '</div>'
        ) : '') +
        '<div class="card-actions">' +
          '<a class="btn" href="' + esc(p.htmlUrl) + '" target="_blank" rel="noopener">' + icon('github', null, true) + 'GitHub</a>' +
          (p.homepage ? '<a class="btn btn-ghost" href="' + esc(p.homepage) + '" target="_blank" rel="noopener" aria-label="项目主页">' + icon('ext') + '</a>' : '') +
        '</div>' +
      '</article>'
    )
  }

  function filtered() {
    var q = state.q.trim().toLowerCase()
    return DATA.projects.filter(function (p) {
      if (state.cat !== 'all' && p.category.id !== state.cat) return false
      if (state.lang && p.language !== state.lang) return false
      if (q) {
        // 名称完全匹配（项目名或 所有者/项目名, 不区分大小写）
        if (p.name.toLowerCase() !== q && p.fullName.toLowerCase() !== q) return false
      }
      return true
    })
  }
  function sortList(list) {
    var key = { stars: 'stars', pushed: 'pushedAt', created: 'createdAt' }[state.sort]
    return list.slice().sort(function (a, b) {
      if (key === 'stars') return b.stars - a.stars
      return b[key].localeCompare(a[key])
    })
  }

  function renderChips() {
    var el = $('#catChips')
    var counts = {}
    DATA.projects.forEach(function (p) { counts[p.category.id] = (counts[p.category.id] || 0) + 1 })
    var cats = CAT_ORDER.filter(function (id) { return counts[id] })
    var chips = [{ id: 'all', name: '全部', icon: 'box', count: DATA.projects.length }]
      .concat(cats.map(function (id) {
        var p = DATA.projects.find(function (x) { return x.category.id === id })
        return { id: id, name: p.category.name, icon: p.category.icon, count: counts[id] }
      }))
    el.innerHTML = chips.map(function (c) {
      return '<button class="chip" type="button" role="button" aria-pressed="' + (state.cat === c.id) + '" data-cat="' + c.id + '">' +
        esc(c.name) + '<span class="chip-count">' + c.count + '</span></button>'
    }).join('')
  }

  function renderLangs() {
    var sel = $('#langFilter')
    var opts = DATA.stats.topLanguages.map(function (l) {
      return '<option value="' + esc(l.name) + '">' + esc(l.name) + ' (' + l.count + ')</option>'
    }).join('')
    sel.innerHTML = '<option value="">全部语言</option>' + opts
  }

  function renderHero() {
    var s = DATA.stats
    $('#statProjects').textContent = s.totalProjects
    $('#statStars').textContent = compact(s.totalStars)
    $('#statCats').textContent = Object.keys(s.byCategory).length
    $('#statDate').textContent = DATA.date
    $('#statDate').title = '数据快照时间: ' + new Date(DATA.generatedAt).toLocaleString('zh-CN')
    $('#footerTime').textContent = '最近抓取: ' + new Date(DATA.generatedAt).toLocaleString('zh-CN', { hour12: false })
  }

  function renderRank() {
    var top = sortList(DATA.projects.slice()).slice(0, 10)
    $('#rankStrip').innerHTML = top.map(function (p, i) {
      return (
        '<a class="rank-card" role="listitem" href="' + esc(p.htmlUrl) + '" target="_blank" rel="noopener">' +
          '<span class="rank-num" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div class="rank-head">' +
            (p.avatar ? '<img class="avatar" src="' + esc(p.avatar) + '" alt="" loading="lazy" width="34" height="34">' : '') +
            '<span class="rank-name">' + esc(p.fullName) + '</span>' +
          '</div>' +
          (p.description ? '<p class="rank-desc"' + (p.descriptionOriginal ? ' title="原文: ' + esc(p.descriptionOriginal) + '"' : '') + '>' + esc(p.description) + '</p>' : '') +
          '<div class="rank-meta">' +
            '<span class="m">' + icon('star', null, true) + p.stars.toLocaleString('zh-CN') + '</span>' +
            '<span class="m">' + icon('fork') + compact(p.forks) + '</span>' +
            (p.language ? '<span class="m">' + esc(p.language) + '</span>' : '') +
          '</div>' +
        '</a>'
      )
    }).join('')
  }

  function renderGrid() {
    var list = sortList(filtered())
    var grid = $('#grid')
    grid.innerHTML = list.map(function (p) { return cardHTML(p, newSet.has(p.fullName)) }).join('')
    $('#resultCount').textContent = '显示 ' + list.length + ' / 共 ' + DATA.projects.length + ' 个'
    $('#empty').hidden = list.length > 0
  }

  function bindEvents() {
    var timer = null
    $('#search').addEventListener('input', function (e) {
      clearTimeout(timer)
      timer = setTimeout(function () {
        state.q = e.target.value
        renderGrid()
      }, 180)
    })
    $('#catChips').addEventListener('click', function (e) {
      var btn = e.target.closest('.chip')
      if (!btn) return
      state.cat = btn.dataset.cat
      renderChips()
      renderGrid()
    })
    $('#langFilter').addEventListener('change', function (e) { state.lang = e.target.value; renderGrid() })
    $('#sortBy').addEventListener('change', function (e) { state.sort = e.target.value; renderGrid() })
    $('#resetFilters').addEventListener('click', function () {
      state = { q: '', cat: 'all', lang: '', sort: state.sort }
      $('#search').value = ''
      $('#langFilter').value = ''
      renderChips()
      renderGrid()
    })
    // 国内源/海外源命令切换
    $('#grid').addEventListener('click', function (e) {
      var tab = e.target.closest('.install-tab')
      if (!tab) return
      var box = tab.closest('.card-install')
      var tabs = box.querySelectorAll('.install-tab')
      tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false') })
      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')
      var row = box.querySelector('.install-row')
      var useCn = tabs[0] === tab
      var cmd = useCn ? row.dataset.cn : row.dataset.global
      row.querySelector('.install-cmd').textContent = cmd
      var copyBtn = row.querySelector('.copy-btn')
      copyBtn.dataset.cmd = cmd
      copyBtn.setAttribute('aria-label', useCn ? '复制国内源安装命令' : '复制海外源安装命令')
    })
    // 一键复制安装命令
    $('#grid').addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn')
      if (!btn) return
      var done = function () {
        btn.classList.add('copied')
        btn.setAttribute('aria-label', '已复制')
        setTimeout(function () { btn.classList.remove('copied'); btn.setAttribute('aria-label', '复制安装命令') }, 1600)
      }
      var fallbackCopy = function (text) {
        var ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch (_) { /* 忽略 */ }
        document.body.removeChild(ta)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.dataset.cmd).then(done).catch(function () { fallbackCopy(btn.dataset.cmd); done() })
      } else { fallbackCopy(btn.dataset.cmd); done() }
    })
    // 顶部搜索框失焦时滚动到列表
    $('#search').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        var t = $('#all')
        if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  function loadHistory() {
    var d = new Date(DATA.date + 'T00:00:00Z')
    d.setDate(d.getDate() - 1)
    var y = d.toISOString().slice(0, 10)
    fetch('data/history/' + y + '.json')
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (prev) {
        if (!prev) return
        var old = {}
        prev.projects.forEach(function (p) { old[p.fullName] = true })
        newSet = new Set(DATA.projects.filter(function (p) { return !old[p.fullName] }).map(function (p) { return p.fullName }))
        renderGrid()
      })
      .catch(function () { /* 无历史或本地 file:// 打开时静默降级 */ })
  }

  var newSet = new Set()

  function renderCommunity() {
    var el = $('#communityGrid')
    if (!el) return
    var C = window.DSH_COMMUNITY || {}
    var bbs = C.bbs || {}
    var wechat = C.wechat || {}
    var bbsOn = !!bbs.url
    var html =
      '<article class="comm-card">' +
        '<div class="comm-bar"><span class="led ' + (bbsOn ? 'on' : 'amber') + '"></span>CH-01 · BBS UPLINK<span class="ch">COM ' + (bbsOn ? 'ONLINE' : 'STANDBY') + '</span></div>' +
        '<div class="comm-body">' +
          '<span class="comm-ico">' + icon('chat') + '</span>' +
          '<div class="comm-info">' +
            '<h3>' + esc(bbs.name || '在线社区 BBS') + '</h3>' +
            '<p>' + esc(bbs.desc || '机师论坛：插件讨论、装机分享、问题互助') + '</p>' +
            '<span class="comm-status' + (bbsOn ? ' on' : '') + '">' + icon(bbsOn ? 'check' : 'warn') + esc(bbsOn ? '频道已开通' : (bbs.status || '筹备中 · 敬请期待')) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="comm-foot">' + (bbsOn
          ? '<a class="btn" href="' + esc(bbs.url) + '" target="_blank" rel="noopener">进入论坛' + icon('ext') + '</a>'
          : '<button class="btn disabled" type="button" disabled>入口筹备中</button>') +
        '</div>' +
      '</article>' +
      '<article class="comm-card">' +
        '<div class="comm-bar"><span class="led amber"></span>CH-02 · WECHAT CHANNEL<span class="ch">QR ' + (wechat.qr ? 'READY' : 'PENDING') + '</span></div>' +
        '<div class="comm-body">' +
          '<div class="qr-frame" id="qrFrame">' + icon('qr') + '<span>二维码张贴位</span><span class="qr-stamp">筹备中</span></div>' +
          '<div class="comm-info">' +
            '<h3>' + esc(wechat.name || '微信交流群') + '</h3>' +
            '<p>' + esc(wechat.desc || '扫码加入机师群，第一时间收到每日补给情报') + '</p>' +
            '<span class="comm-status" id="wechatStatus">' + icon('warn') + esc(wechat.status || '筹备中 · 敬请期待') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="comm-foot"><span class="section-note">二维码就位后频道自动点亮</span></div>' +
      '</article>'
    el.innerHTML = html
    if (wechat.qr) {
      var img = new Image()
      img.onload = function () {
        var f = document.getElementById('qrFrame')
        if (f) { f.innerHTML = ''; f.appendChild(img) }
        var st = document.getElementById('wechatStatus')
        if (st) { st.classList.add('on'); st.innerHTML = icon('check') + '扫码进群' }
        var led = document.querySelector('#communityGrid .comm-card:last-child .led')
        if (led) led.classList.add('on')
      }
      img.alt = (wechat.name || '微信群') + ' 二维码'
      img.src = wechat.qr
    }
  }

  function boot() {
    if (!DATA || !Array.isArray(DATA.projects)) {
      $('#grid').innerHTML = '<div class="empty"><p>数据加载失败：请通过 HTTP 服务访问本站（nginx / GitHub Pages），或先运行 crawler/fetch.mjs 生成数据。</p></div>'
      return
    }
    // 支持从手册跳转带分类参数: index.html?cat=<id>
    var preCat = null
    try {
      preCat = new URLSearchParams(window.location.search).get('cat')
      if (preCat && !DATA.projects.some(function (p) { return p.category.id === preCat })) preCat = null
    } catch (_) { preCat = null }
    if (preCat) state.cat = preCat
    renderHero()
    renderChips()
    renderLangs()
    renderRank()
    renderGrid()
    renderCommunity()
    bindEvents()
    loadHistory()
    if (preCat) {
      var t = $('#all')
      if (t && t.scrollIntoView) setTimeout(function () { t.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 300)
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()

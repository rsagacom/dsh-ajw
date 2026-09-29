/* DS安甲网 · 新手机师手册逻辑：货架导览渲染 + 命令复制 + 频道卡 */
(function () {
  'use strict'
  var DATA = window.DSH_PROJECTS
  var $ = function (sel) { return document.querySelector(sel) }

  function esc (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function icon (id) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + id + '"/></svg>' }

  /* ---- 终端命令复制（document 级委托） ---- */
  function copyFallback (text) {
    var ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch (_) { /* 忽略 */ }
    document.body.removeChild(ta)
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-copy]') : null
    if (!btn) return
    var text = btn.getAttribute('data-copy')
    var old = btn.textContent
    var done = function () {
      btn.textContent = '已复制 ✓'
      btn.classList.add('is-done')
      var live = $('#live')
      if (live) live.textContent = '已复制命令：' + text
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done') }, 1800)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { copyFallback(text); done() })
    } else { copyFallback(text); done() }
  })

  /* ---- 货架导览：按「用户需求」分类陈列，直达首页对应货架 ---- */
  function renderGuide () {
    var grid = $('#guideGrid')
    if (!DATA || !Array.isArray(DATA.categories) || !Array.isArray(DATA.projects)) {
      if (grid) grid.innerHTML = '<p class="doc__lede">导览数据加载失败：请通过 HTTP 服务访问，或先运行 crawler/fetch.mjs 生成数据。</p>'
      return
    }
    var counts = {}
    DATA.projects.forEach(function (p) { counts[p.category.id] = (counts[p.category.id] || 0) + 1 })
    var used = DATA.categories.filter(function (c) { return counts[c.id] })
    var el = $('#guideCount')
    if (el) el.textContent = String(used.length)
    if (!grid) return
    grid.innerHTML = used.map(function (c) {
      return (
        '<a class="guide-card" role="listitem" href="index.html?cat=' + encodeURIComponent(c.id) + '">' +
          '<div class="guide-head">' + icon(c.icon || 'box') +
            '<h3>' + esc(c.name) + '</h3>' +
            '<span class="guide-count">' + counts[c.id] + ' 件</span>' +
          '</div>' +
          '<p>' + esc(c.desc || '') + '</p>' +
          '<span class="guide-search">' + esc(c.search || '') + '</span>' +
        '</a>'
      )
    }).join('')
  }

  /* ---- 机师频道卡（与首页同源，数据来自 community-config.js） ---- */
  function renderChannels () {
    if (!window.DSHChannels) return
    var list = window.DSHChannels.render($('#communityChannels'))
    var count = $('#communityCount')
    if (count && list) count.textContent = String(list.filter(function (c) { return c.url }).length)
  }

  function boot () {
    renderGuide()
    renderChannels()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()

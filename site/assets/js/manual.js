/* DS安甲网 · 新手机师手册逻辑：货架导览渲染 + 命令复制 */
(function () {
  'use strict'
  var DATA = window.DSH_PROJECTS
  var $ = function (sel) { return document.querySelector(sel) }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function icon(id) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + id + '"/></svg>' }

  function copyFallback(text) {
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
    var btn = e.target.closest('.copy-btn')
    if (!btn) return
    var done = function () {
      btn.classList.add('copied')
      btn.setAttribute('aria-label', '已复制')
      setTimeout(function () { btn.classList.remove('copied'); btn.setAttribute('aria-label', '复制命令') }, 1600)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(btn.dataset.cmd).then(done).catch(function () { copyFallback(btn.dataset.cmd); done() })
    } else { copyFallback(btn.dataset.cmd); done() }
  })

  function renderGuide() {
    if (!DATA || !Array.isArray(DATA.categories) || !Array.isArray(DATA.projects)) {
      var grid = $('#guideGrid')
      if (grid) grid.innerHTML = '<p style="color:var(--text-3)">导览数据加载失败：请通过 HTTP 服务访问，或先运行 crawler/fetch.mjs 生成数据。</p>'
      return
    }
    var counts = {}
    DATA.projects.forEach(function (p) { counts[p.category.id] = (counts[p.category.id] || 0) + 1 })
    var total = 0
    DATA.categories.forEach(function (c) { if (counts[c.id]) total++ })
    var el = $('#guideCount')
    if (el) el.textContent = String(total)
    var grid = $('#guideGrid')
    if (!grid) return
    grid.innerHTML = DATA.categories
      .filter(function (c) { return counts[c.id] })
      .map(function (c) {
        return (
          '<a class="guide-card" role="listitem" href="index.html?cat=' + encodeURIComponent(c.id) + '#all">' +
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

  function boot() { renderGuide() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()

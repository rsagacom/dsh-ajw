/* DS安甲网 · 机师频道卡渲染（首页与手册页共用）
   数据来自 community-config.js：url 留空 = 显示「筹备中」；qr 留空 = 不显示二维码。 */
(function () {
  'use strict'

  function esc (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function term (text, label) {
    return '<div class="term"><span class="term__txt"><b aria-hidden="true">$</b><code>' + esc(text) + '</code></span>' +
      '<button class="copy" type="button" data-copy="' + esc(text) + '">' + esc(label) + '</button></div>'
  }

  function card (c) {
    var online = !!c.url
    var hasQr = !!c.qr
    return '<div class="chan' + (hasQr ? ' chan--qr' : '') + '">' +
      '<div class="chan__t">' +
        '<span class="lamp lamp--' + (online ? 'ok' : 'stale') + '"><i class="lamp__d" aria-hidden="true"></i></span>' +
        '<span class="chan__n">' + esc(c.name) + '</span>' +
        '<span class="flag' + (online ? ' flag--ok' : '') + '">' + esc(online ? '已开通' : (c.status || '筹备中 · 敬请期待')) + '</span>' +
      '</div>' +
      '<p class="chan__d">' + esc(c.desc) + '</p>' +
      (hasQr
        ? '<figure class="qr"><img src="' + esc(c.qr) + '" alt="' + esc(c.name) + '二维码" width="120" height="120" loading="lazy">' +
          '<figcaption>扫码进群</figcaption></figure>'
        : '') +
      '<div class="chan__m">' +
        (online
          ? term(c.url, '复制链接') + '<a class="card__link" href="' + esc(c.url) + '" target="_blank" rel="noopener">前往 →</a>'
          : '<span class="term"><span class="term__txt">入口尚未开通，配置 community-config.js 后自动点亮</span></span>') +
      '</div></div>'
  }

  function render (el) {
    if (!el) return
    var C = window.DSH_COMMUNITY || {}
    var list = Array.isArray(C.channels) ? C.channels : []
    el.innerHTML = list.length ? list.map(card).join('') : ''
    return list
  }

  window.DSHChannels = { render: render }
})()

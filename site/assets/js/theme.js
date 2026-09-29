/* DS安甲网 · 双模主题（控制台 / 文档）与设计说明条折叠 —— 两页共用 */
(function () {
  'use strict'

  var KEY = 'dsh-mode'
  var body = document.body
  var btn = {
    hangar: document.getElementById('modeHangar'),
    doc: document.getElementById('modeDoc')
  }
  var live = document.getElementById('live')
  var fallback = body.classList.contains('theme-doc') ? 'doc' : 'hangar'

  function read() {
    try { return localStorage.getItem(KEY) } catch (_) { return null }
  }
  function write(m) {
    try { localStorage.setItem(KEY, m) } catch (_) { /* 隐私模式下静默降级 */ }
  }

  function setMode(m) {
    body.classList.toggle('theme-doc', m === 'doc')
    body.classList.toggle('theme-hangar', m !== 'doc')
    if (btn.hangar) btn.hangar.setAttribute('aria-pressed', String(m !== 'doc'))
    if (btn.doc) btn.doc.setAttribute('aria-pressed', String(m === 'doc'))
  }

  // 只有用户亲手切过才记住；没切过时各页用各自的默认模式
  function pick(m) {
    setMode(m)
    write(m)
    if (live) live.textContent = m === 'doc' ? '已切换到明亮文档模式' : '已切换到机库控制台模式'
  }

  if (btn.hangar) btn.hangar.addEventListener('click', function () { pick('hangar') })
  if (btn.doc) btn.doc.addEventListener('click', function () { pick('doc') })
  var saved = read()
  setMode(saved === 'doc' || saved === 'hangar' ? saved : fallback)

  var note = document.getElementById('dnote')
  var noteBtn = document.getElementById('dnoteBar')
  if (note && noteBtn) {
    noteBtn.addEventListener('click', function () {
      var open = note.getAttribute('data-open') === '1'
      note.setAttribute('data-open', open ? '0' : '1')
      noteBtn.setAttribute('aria-expanded', open ? 'false' : 'true')
    })
  }
})()

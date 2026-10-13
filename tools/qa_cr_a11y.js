// --eval: buttons / inputs with no accessible name (text, aria-label, aria-labelledby, title, <label for>),
// in Live, Buy, Build, Options and Nova família, plus modal focus containment (does Tab leave the dialog?).
const M = window.__morada.M;
const ok = document.getElementById('help-ok'); if (ok) ok.click();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nameOf = (el) => {
  const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
  const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim(); if (t) return t; }
  if (el.id) { const l = document.querySelector('label[for="' + el.id + '"]'); if (l && l.textContent.trim()) return l.textContent.trim(); }
  const wrapLabel = el.closest('label'); if (wrapLabel && wrapLabel.textContent.trim()) return wrapLabel.textContent.trim();
  // visible text only (exclude aria-hidden descendants)
  let txt = '';
  const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) txt += c.textContent; else if (c.nodeType === 1 && c.getAttribute('aria-hidden') !== 'true' && getComputedStyle(c).display !== 'none') walk(c); } };
  walk(el); txt = txt.trim();
  if (txt) return txt;
  const t = el.getAttribute('title'); if (t && t.trim()) return '(title only) ' + t.trim();
  return '';
};
const audit = (label) => {
  const out = [];
  for (const el of document.querySelectorAll('button, input, select, textarea, [role="switch"], [role="tab"]')) {
    if (el.closest('[hidden]') || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
    const n = nameOf(el);
    if (!n || /^\(title only\)/.test(n) || /^[^\p{L}\p{N}]+$/u.test(n)) out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, cls: el.className || null, name: n || null, html: el.outerHTML.slice(0, 120) });
  }
  return { label, count: out.length, items: out.slice(0, 25) };
};
const res = [];
res.push(audit('live'));
M.ui.setMode('buy'); await wait(400); res.push(audit('buy'));
const card = document.querySelector('.card'); if (card) { card.click(); await wait(300); res.push(audit('buy placing')); }
M.ui.setMode('build'); await wait(300); res.push(audit('build'));
M.ui.setMode('live'); await wait(200);
M.ui.setMode('options'); await wait(300); res.push(audit('options modal'));
// focus containment: press Tab 40 times from the first focusable element in the modal
const modal = document.querySelector('.modal');
let escaped = null;
if (modal) {
  const first = modal.querySelector('button, input'); first.focus();
  const focusables = Array.from(document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((e) => !e.disabled && e.offsetParent !== null);
  // emulate sequential focus navigation order (DOM order, tabindex 0)
  let idx = focusables.indexOf(document.activeElement);
  for (let i = 0; i < 40; i++) { idx = (idx + 1) % focusables.length; if (!modal.contains(focusables[idx])) { escaped = focusables[idx].outerHTML.slice(0, 100); break; } }
}
document.getElementById('opt-newfamily').click(); await wait(400); res.push(audit('nova familia'));
return { res, modalHasFocusTrap: !escaped, firstFocusableOutsideModalReachedByTab: escaped };

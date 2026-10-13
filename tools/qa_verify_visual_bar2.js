document.getElementById('help-ok') && document.getElementById('help-ok').click();
await new Promise(r => setTimeout(r, 300));
const b = document.getElementById('bar'); const cs = getComputedStyle(b);
const kids = Array.from(b.children).map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [e.className || e.id, Math.round(r.top), Math.round(r.bottom), c.position, c.marginTop, c.marginBottom]; });
const mb = b.querySelector('.moneybox'); const mbk = Array.from(mb.children).map(e => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.top), Math.round(r.bottom), getComputedStyle(e).lineHeight, e.textContent]; });
// test: what if save-chip absolute? measure height
const h0 = b.getBoundingClientRect().height;
const sc = mb.querySelector('.save-chip'); const old = sc.style.cssText; sc.style.position = 'absolute'; sc.style.top = '100%'; sc.style.right = '0';
const h1 = b.getBoundingClientRect().height; sc.style.cssText = old;
return { pad: [cs.paddingTop, cs.paddingBottom, cs.borderTopWidth, cs.boxSizing, cs.minHeight, cs.height, cs.display, cs.alignItems], rect: b.getBoundingClientRect().toJSON(), kids, mbk, h0, h1withChipAbs: h1 };

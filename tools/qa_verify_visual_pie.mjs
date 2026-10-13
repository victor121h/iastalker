// VIS-9: phone pie: title pill vs item column; truncated labels.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'pie-' + ctx.W + 'x' + ctx.H);
  await L.dismissHelp();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.money = 99999; s.time.minute = 600; M.engine.buyObject('computer', 8, 8, 0); M.ui.selectSim(s.sims[0].id); });
  const audit = () => L.ev(() => {
    const t = document.querySelector('#pie .pie-title'); const tr = t.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('#pie .pie-item')).map(e => { const r = e.getBoundingClientRect(); const l = e.querySelector('.p-label'); return { label: l.textContent, trunc: l.scrollWidth > l.clientWidth + 1, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }; });
    const over = items.filter(i => i.r[0] < tr.right && tr.left < i.r[2] && i.r[1] < tr.bottom && tr.top < i.r[3]).map(i => i.label);
    const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2; const hit = document.elementFromPoint(cx, cy);
    const tog = document.getElementById('needs-toggle'); const tgr = tog && tog.getBoundingClientRect();
    const overToggle = tgr && tgr.width ? (tr.left < tgr.right && tgr.left < tr.right && tr.top < tgr.bottom && tgr.top < tr.bottom) : false;
    return { title: t.textContent, titleRect: [tr.left, tr.top, tr.right, tr.bottom].map(Math.round), titleCoveredBy: over, titleCentreHit: hit ? (hit.className || hit.tagName) : null, overToggle, items };
  });
  const out = {};
  const openOn = async (type, where) => L.ev(([type, where]) => { const M = window.__morada.M, s = window.__morada.state; const o = s.objects.find(q => q.type === type); const p = M.render.project(o.x + 0.5, 0.6, o.y + 0.5); const cx = where === 'tl' ? 60 : where === 'c' ? innerWidth / 2 : p.clientX; const cy = where === 'tl' ? 120 : where === 'c' ? innerHeight / 2 : p.clientY; M.ui.openPie(cx, cy, { kind: 'object', id: o.id }); return [cx, cy]; }, [type, where]);
  for (const [type, where] of [['computer', 'tl'], ['computer', 'c'], ['phone', 'c'], ['phone', 'proj']]) {
    out[type + '-' + where + '-at'] = await openOn(type, where); await L.wait(500);
    out[type + '-' + where] = await audit();
    out[type + '-' + where + '-shot'] = await L.shot(type + '-' + where);
    await L.ev(() => window.__morada.M.ui.closePie()); await L.wait(200);
  }
  // phone submenu "Ligar para…"
  await openOn('phone', 'c'); await L.wait(500);
  const clicked = await L.ev(() => { const it = Array.from(document.querySelectorAll('#pie .pie-item.cat'))[0]; if (!it) return null; const t = it.textContent; it.dispatchEvent(new MouseEvent('click', { bubbles: true })); return t; });
  await L.wait(400);
  await L.ev(() => { if (window.__morada.M.ui.debug.ui.pie) window.__morada.M.ui.debug.ui.pie.openedAt = 0; });
  const clicked2 = await L.ev(() => { const it = Array.from(document.querySelectorAll('#pie .pie-item.cat'))[0]; if (!it) return null; const t = it.textContent; it.click(); return t; });
  await L.wait(500);
  out.sub = { clicked, clicked2, a: await audit() }; out.subShot = await L.shot('phone-sub');
  return out;
}

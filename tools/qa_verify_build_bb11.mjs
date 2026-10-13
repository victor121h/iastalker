// BB-11 (phone): placement tip vs camera toolbar, ghost size; desktop: drawer vs bar, truncated category labels.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb11'); await v.help();
  const R = {};
  const tap = async (x, y) => { if (ctx.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await v.wait(300); };
  const center = (sel) => v.ev((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  let c = await center('#mode-buy'); await tap(c.x, c.y); await v.wait(500);
  R.cats = await v.ev(() => Array.from(document.querySelectorAll('#drawer [role=tab], #drawer .cat-btn, #drawer .tab')).map((b) => ({ t: b.textContent.trim(), trunc: Array.from(b.querySelectorAll('*')).concat([b]).some((q) => q.scrollWidth > q.clientWidth + 1) })).slice(0, 12));
  R.rects = await v.ev(() => { const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }; return { drawer: g('#drawer'), cam: g('#cam'), bar: g('#bar') || g('.bar') || g('#bottombar'), pills: Array.from(document.querySelectorAll('.paused-pill')).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), getComputedStyle(e).display]; }) }; });
  await v.ev(() => { const c = document.querySelector('#drawer .card[data-type="lamp_floor"]'); if (c) c.scrollIntoView({ block: 'center' }); });
  await v.wait(200);
  c = await center('#drawer .card[data-type="lamp_floor"]');
  if (c) await tap(c.x, c.y);
  await v.wait(400);
  const T = await v.proj(19.5, 0, 15.5);
  await tap(T.x, T.y); await v.wait(400);
  R.tip = await v.ev(() => { const t = document.getElementById('tip'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { text: t.textContent, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }; });
  R.camRect = await v.ev(() => { const r = document.getElementById('cam').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
  const ov = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  R.tipOverlapsCam = ov(R.tip && R.tip.rect, R.camRect);
  R.ghostPx = await v.ev(() => { const M = window.__morada.M; const a = M.render.project(19.5, 0, 15.5), b = M.render.project(19.5, 1.6, 15.5), l = M.render.project(19, 0, 16), r = M.render.project(20, 0, 15); return { heightPx: Math.round(a.y - b.y), tileWidthPx: Math.round(Math.abs(r.x - l.x)) }; });
  R.shot = await v.shot('1-buy-lamp-ghost');
  return R;
}

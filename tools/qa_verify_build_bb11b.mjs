// BB-11 (phone): placement tip near the right edge vs the camera toolbar; ghost size.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb11b'); await v.help();
  const R = {};
  const tap = async (x, y) => { await page.touchscreen.tap(x, y); await v.wait(350); };
  const center = (sel) => v.ev((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  let c = await center('#mode-buy'); await tap(c.x, c.y); await v.wait(500);
  await v.ev(() => { const c = document.querySelector('#drawer .card[data-type="lamp_floor"]'); if (c) c.scrollIntoView({ block: 'center' }); });
  await v.wait(200);
  c = await center('#drawer .card[data-type="lamp_floor"]'); await tap(c.x, c.y); await v.wait(500);
  R.drawerAfterPick = await v.ev(() => { const r = document.getElementById('drawer').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; });
  // find a tile that projects near (290, 450)
  const tile = await v.ev(() => { const M = window.__morada.M; let best = null; for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) { const p = M.render.project(x + 0.5, 0, y + 0.5); const d = Math.hypot(p.clientX - 290, p.clientY - 450); if (!best || d < best.d) best = { x, y, d, sx: p.clientX, sy: p.clientY }; } return best; });
  R.tile = tile;
  await tap(tile.sx, tile.sy); await v.wait(400);
  R.placing = await v.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, ok: p.ok }; });
  R.tip = await v.ev(() => { const t = document.getElementById('tip'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { text: t.textContent, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }; });
  R.camRect = await v.ev(() => { const r = document.getElementById('cam').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
  const a = R.tip && R.tip.rect, b = R.camRect;
  R.tipOverlapsCam = !!(a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
  R.ghostPx = await v.ev(([x, y]) => { const M = window.__morada.M; const a = M.render.project(x + 0.5, 0, y + 0.5), b = M.render.project(x + 0.5, 1.6, y + 0.5), l = M.render.project(x, 0, y + 1), r = M.render.project(x + 1, 0, y); return { lampHeightPx: Math.round(a.clientY - b.clientY), tileWidthPx: Math.round(Math.abs(r.clientX - l.clientX)) }; }, [tile.x, tile.y]);
  R.shot = await v.shot('1-phone-placing-tip');
  return R;
}

// VIS-11: truncated catalog category labels and wallpaper swatch names. VIS-16: needs panel empty band. VIS-15 helper.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'labels-' + ctx.W + (ctx.args.includes('--nofonts') ? '-nofonts' : ''));
  await L.dismissHelp();
  const trunc = (sel) => L.ev((sel) => Array.from(document.querySelectorAll(sel)).filter(e => e.getBoundingClientRect().width > 0).map(e => ({ t: e.textContent.trim(), sw: e.scrollWidth, cw: e.clientWidth, trunc: e.scrollWidth > e.clientWidth + 1 })).filter(x => x.trunc), sel);
  const out = {};
  // live: needs panel geometry
  out.needs = await L.ev(() => { const tb = document.querySelector('.tab-body'); const r = tb.getBoundingClientRect(); const kids = Array.from(tb.querySelectorAll('*')).filter(e => e.getBoundingClientRect().height > 0); const maxB = Math.max(...kids.map(e => e.getBoundingClientRect().bottom)); return { tabBody: [r.top, r.bottom].map(Math.round), height: Math.round(r.height), contentBottom: Math.round(maxB), emptyBand: Math.round(r.bottom - maxB), cssH: getComputedStyle(tb).height }; });
  out.liveClip = await L.ev(() => { const res = []; const dock = document.getElementById('dock'); const dr = dock.getBoundingClientRect(); for (const e of dock.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width) continue; const own = Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()); if (own && (r.right > dr.right + 1 || e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')) res.push({ t: e.textContent.trim().slice(0, 20), cls: e.className, right: Math.round(r.right), dockRight: Math.round(dr.right), sw: e.scrollWidth, cw: e.clientWidth }); } return res; });
  out.liveShot = await L.shot('live', { x: 0, y: 380, width: 420, height: 340 });
  await L.ev(() => window.__morada.M.ui.setMode('buy')); await L.wait(600);
  out.cats = await trunc('.cat-btn .c-label, .cat-btn span');
  await L.ev(() => window.__morada.M.ui.setMode('build')); await L.wait(600);
  await L.ev(() => { const M = window.__morada.M; try { M.ui.debug.setBuildTool('paper'); } catch (e) {} }); await L.wait(500);
  out.swatch = await trunc('.sw-name, .swatch span, .swatch .name');
  out.buildShot = await L.shot('build');
  return out;
}

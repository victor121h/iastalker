// VIS-4: measure #bar vs --bar-h and overlap of #dock/#drawer/#toolbar with the bar, in live/buy/build modes.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'bar-' + ctx.W + 'x' + ctx.H + (ctx.touch ? 't' : ''));
  await L.dismissHelp();
  const measure = () => L.ev(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const b = e.getBoundingClientRect(); return b.width ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null; };
    const barH = getComputedStyle(document.documentElement).getPropertyValue('--bar-h').trim();
    const bar = r('#bar');
    const kids = Array.from(document.querySelectorAll('#bar > *')).map(e => [e.className || e.id, Math.round(e.getBoundingClientRect().height)]);
    const mb = document.querySelector('.moneybox'); const mbk = mb ? Array.from(mb.children).map(e => [e.className, Math.round(e.getBoundingClientRect().height), getComputedStyle(e).display]) : null;
    const o = { barH, bar, barHeight: bar && bar[3] - bar[1], kids, mbk };
    for (const s of ['#dock', '#drawer', '#toolbar', '.portraits', '.tab-body']) { const q = r(s); o[s] = q; if (q && bar) o[s + '_overlapBar'] = q[3] - bar[1]; }
    return o;
  });
  const out = {};
  out.live = await measure(); out.liveShot = await L.shot('live');
  if (ctx.H) { const b = out.live.bar; if (b) out.liveCrop = await L.shot('live-crop', { x: 0, y: Math.max(0, b[1] - 160), width: Math.min(ctx.W, 520), height: Math.min(ctx.H - Math.max(0, b[1] - 160), 260) }); }
  await L.ev(() => window.__morada.M.ui.setMode('buy')); await L.wait(700);
  out.buy = await measure(); out.buyShot = await L.shot('buy');
  await L.ev(() => window.__morada.M.ui.setMode('build')); await L.wait(700);
  out.build = await measure(); out.buildShot = await L.shot('build');
  return out;
}

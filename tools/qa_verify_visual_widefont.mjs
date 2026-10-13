// VIS-15 stress: force a wide fallback font (DejaVu Sans, wider than Segoe UI/Trebuchet) and check the needs panel for clipping.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const fam = (ctx.args[ctx.args.indexOf('--fam') + 1] || 'DejaVu Sans');
  const L = mk(page, ctx, 'widefont-' + fam.replace(/\s/g, ''));
  await L.dismissHelp();
  await L.ev((fam) => { const st = document.createElement('style'); st.textContent = `:root{--font-display:'${fam}';--font-body:'${fam}'} body, button { font-family: '${fam}' !important; }`; document.head.appendChild(st); }, fam);
  await L.wait(600);
  const out = {};
  out.clip = await L.ev(() => { const res = []; const dock = document.getElementById('dock'); const panel = document.getElementById('needs-panel') || dock; const dr = panel.getBoundingClientRect(); for (const e of dock.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width) continue; const own = Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue; if (r.right > dr.right - 2 || (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')) res.push({ t: e.textContent.trim().slice(0, 20), cls: String(e.className).slice(0, 30), right: Math.round(r.right), panelRight: Math.round(dr.right), sw: e.scrollWidth, cw: e.clientWidth }); } return res; });
  out.shot = await L.shot('live', { x: 0, y: 380, width: 420, height: 340 });
  return out;
}

// VIS-5: #cam cluster vs #drawer and #log-btn at tablet widths, Buy mode. Also checks hit-testing of each cam button.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'cam-' + ctx.W + 'x' + ctx.H);
  await L.dismissHelp();
  const measure = () => L.ev(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const cam = document.getElementById('cam'), dr = document.getElementById('drawer'), lb = document.getElementById('log-btn');
    const vis = (e) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    const btns = Array.from(cam.querySelectorAll('button')).filter(vis).map(b => { const q = b.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2; const hit = document.elementFromPoint(cx, cy); return { label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24), r: r(b), clickable: !!(hit && (hit === b || b.contains(hit))), hitBy: hit && !(hit === b || b.contains(hit)) ? (hit.id || hit.className || hit.tagName).toString().slice(0, 30) : null }; });
    const wl = cam.querySelector('.wb-label');
    return { cam: r(cam), drawer: vis(dr) ? r(dr) : null, logBtn: vis(lb) ? r(lb) : null, btns, wallLabel: wl ? { text: wl.textContent, sw: wl.scrollWidth, cw: wl.clientWidth } : null };
  });
  const out = {};
  out.live = await measure();
  await L.ev(() => window.__morada.M.ui.setMode('buy')); await L.wait(700);
  out.buy = await measure();
  out.shot = await L.shot('buy');
  out.crop = await L.shot('buy-crop', { x: 0, y: 0, width: Math.min(ctx.W, 520), height: 80 });
  return out;
}

// Verify LIVE-4: empty parts of the dock rows (.queue / .portraits) swallow clicks meant for the 3D view.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_4.mjs [--touch --w 390 --h 844]
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l4');
  const out = {};
  await V.speed(0);
  await V.ev(() => window.__morada.M.engine.setFreeWill(false));
  // one queued action so the queue row has an item (typical state)
  await V.ev(() => { const M = window.__morada.M, E = M.engine; const s = E.simById(window.__morada.state.settings.selectedSimId); const f = E.state.objects.find((o) => /^fridge/.test(o.type)); E.queueInteraction(s.id, f.id, 'snack', 'player'); });
  await V.speed(1); await V.wait(500); await V.speed(0);
  out.geom = await V.ev(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const q = document.querySelector('#dock .queue'), p = document.querySelector('#dock .portraits');
    const kids = (el) => Array.from(el.children).map((c) => ({ cls: c.className, r: r(c) }));
    return { dock: r(document.getElementById('dock')), queue: r(q), queueKids: q && kids(q), portraits: r(p), portraitKids: p && kids(p), dockChildren: Array.from(document.getElementById('dock').children).map((c) => (c.id || c.className) + ' pe=' + getComputedStyle(c).pointerEvents) };
  });
  // scan the dock area in 4px steps: which points are swallowed by an empty row container?
  out.scan = await V.ev(() => {
    const dock = document.getElementById('dock').getBoundingClientRect();
    let swallowed = 0; const byEl = {}; const samples = [];
    for (let y = Math.floor(dock.top); y < dock.bottom; y += 4) for (let x = Math.floor(dock.left); x < dock.right; x += 4) {
      const el = document.elementFromPoint(x, y);
      if (!el) continue;
      const isRowBg = el.matches('.queue, .portraits, .dock-row, #dock');
      if (isRowBg) { swallowed += 16; const k = el.tagName + '.' + (el.className || el.id); byEl[k] = (byEl[k] || 0) + 16; if (samples.length < 6 && samples.every((s) => Math.abs(s[1] - y) > 20 || Math.abs(s[0] - x) > 60)) samples.push([x, y, k]); }
    }
    return { swallowedPx2: swallowed, byEl, samples };
  });
  // real click on a swallowed point: does anything happen in the world?
  if (out.scan.samples.length) {
    const res = [];
    for (const [x, y, k] of out.scan.samples.slice(0, 4)) {
      const before = await V.ev(() => { const M = window.__morada.M; const s = M.engine.simById(window.__morada.state.settings.selectedSimId); return s.queue.length; });
      const under = await V.ev(([x, y]) => { const p = window.__morada.M.render.pick(x, y); return p && (p.kind === 'object' ? 'object:' + window.__morada.M.engine.objectById(p.id).type : p.kind); }, [x, y]);
      await V.ev(() => { window.__vpd = 0; const c = document.querySelector('#view canvas'); c.addEventListener('pointerdown', () => window.__vpd++, { once: false }); });
      await V.tap(x, y); await V.wait(450);
      const after = await V.ev(() => { const M = window.__morada.M; const s = M.engine.simById(window.__morada.state.settings.selectedSimId); return { q: s.queue.length, pie: !!document.getElementById('pie'), canvasDown: window.__vpd }; });
      res.push({ x, y, el: k, worldUnder: under, queueBefore: before, ...after });
      await V.closePie();
    }
    out.clicks = res;
  }
  await V.shot('dock');
  return out;
}

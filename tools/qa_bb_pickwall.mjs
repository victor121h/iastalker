// Characters are picked through full-height walls (live + buy).
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'pickwall');
  await L.install(); await L.dismissHelp();
  const setup = await L.ev(() => {
    const M = window.__morada.M, E = M.engine;
    const [rita, caio] = E.household();
    E.setFreeWill(false);
    for (const s of [rita, caio]) for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    E.queueWalk(caio.id, 14, 13);
    for (let i = 0; i < 300; i++) { E.update(0.5); if (Math.round(caio.x) === 14 && Math.round(caio.y) === 13 && !caio.queue.length) break; }
    M.render.setWallMode('up');
    M.main.setSpeed(0);
    return { caio: [caio.x, caio.y], id: caio.id, sel: E.state.settings.selectedSimId, rita: rita.id };
  });
  await L.cam({ k: 0, dist: 20, x: 13, z: 12 });
  await L.wait(2500);
  const probe = await L.ev((id) => {
    const M = window.__morada.M; const s = M.engine.simById(id);
    const res = [];
    for (const hgt of [0.6, 1.0, 1.4]) {
      const p = M.render.project(s.x + 0.5, hgt, s.y + 0.5);
      res.push({ hgt, x: p.clientX, y: p.clientY, pick: M.render.pick(p.clientX, p.clientY), el: (document.elementFromPoint(p.clientX, p.clientY) || {}).tagName });
    }
    return res;
  }, setup.id);
  await L.shot('1-caio-behind-wall');
  const pt = probe.find((p) => p.pick && p.pick.kind === 'sim' && p.el === 'CANVAS');
  let pie = null;
  if (pt) {
    await page.mouse.click(pt.x, pt.y); await L.wait(600);
    pie = await L.ev(() => { const el = document.getElementById('pie'); return el ? { title: (el.querySelector('.pie-title') || {}).textContent, items: Array.from(el.querySelectorAll('.pie-item')).map((b) => b.textContent).slice(0, 8) } : null; });
    await L.shot('2-click-wall-opens-pie');
  }
  return { setup, probe, pie, errs: await L.errs() };
}

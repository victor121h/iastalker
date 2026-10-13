// QA live: tap objects near the screen edges (pie placement) — instrumented.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_edge.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'edge');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  await L.ev(() => {
    const U = window.__morada.M.ui; window.__log = [];
    const op = U.debug.liveClick;
    const view = document.getElementById('view');
    ['pointerdown', 'pointerup', 'click'].forEach((t) => view.addEventListener(t, (e) => window.__log.push(t + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' ' + (e.pointerType || '')), true));
  });
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'phone').id);
  const targets = ctx.touch ? [['left', 0.12, 0.45], ['top', 0.5, 0.12], ['right', 0.8, 0.3], ['bottom', 0.5, 0.66], ['center', 0.5, 0.45]] : [['left', 0.4, 0.45], ['top', 0.5, 0.06], ['right', 0.97, 0.5], ['bottom', 0.6, 0.84], ['topright', 0.95, 0.08]];
  for (const [name, dx, dy] of targets) {
    await L.ev(() => { const o = window.__morada.state.objects.find((q) => q.type === 'phone'); window.__morada.M.render.focus(o.x + 0.5, o.y + 0.5, true); });
    await L.wait(500);
    const p = await L.objFind(fr);
    const tx = ctx.W * dx, ty = ctx.H * dy;
    await L.ev(([dx, dy]) => window.__morada.M.render.pan(dx, dy), [tx - p.x, ty - p.y]);
    let p2 = null;
    for (let k = 0; k < 10; k++) { await L.wait(300); const a = await L.objFind(fr); if (a && p2 && Math.abs(a.x - p2.x) < 1 && Math.abs(a.y - p2.y) < 1) { p2 = a; break; } p2 = a; }
    if (!p2) { out[name] = 'not found'; continue; }
    const hit = await L.ev(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className : null; }, [p2.x, p2.y]);
    const pk = await L.ev(([x, y]) => window.__morada.M.render.pick(x, y), [p2.x, p2.y]);
    await L.ev(() => { window.__log.length = 0; });
    await L.tap(p2.x, p2.y); await L.wait(500);
    await L.settle();
    const pie = await L.pie();
    out[name] = { at: [Math.round(p2.x), Math.round(p2.y)], hit, pk, log: await L.ev(() => window.__log.slice()), tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }), items: pie && pie.items.map((i) => i.t + ' [' + Math.round(i.l) + ',' + Math.round(i.top) + ',' + Math.round(i.r) + ',' + Math.round(i.b) + ']') };
    await L.shot('pie-' + name);
    if (pie) {
      // open the submenu too
      await L.clickPie(/^Ligar/); await L.wait(100); await L.settle();
      const sub = await L.pie();
      out[name].sub = sub && sub.items.map((i) => i.t + ' [' + Math.round(i.l) + ',' + Math.round(i.top) + ',' + Math.round(i.r) + ',' + Math.round(i.b) + ']');
      await L.shot('pie-' + name + '-sub');
      await L.tap(2, 2); await L.wait(300);
      out[name].closedByCornerTap = !(await L.pie());
      if (await L.pie()) { await L.ev(() => window.__morada.M.ui.closePie()); }
    }
  }
  out.errs = await L.errs();
  return out;
}

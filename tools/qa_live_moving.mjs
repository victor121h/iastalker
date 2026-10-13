// QA live: click a character while it walks (real time), and click during own walk.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_moving.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'moving');
  const out = { tries: [] };
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const other = await L.ev((sel) => window.__morada.M.engine.household().find((s) => s.id !== sel).id, sel);
  await L.ev(([sid, oid]) => { const E = window.__morada.M.engine; E.setFreeWill(false); const o = E.simById(oid); o.queue.slice().forEach((a) => E.cancelAction(oid, a.id)); E.queueWalk(oid, 2, 16); E.queueWalk(oid, 21, 16); E.queueWalk(oid, 2, 16); const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); }, [sel, other]);
  await L.ev(() => { window.__pl = []; const v = document.getElementById('view'); v.addEventListener('pointerup', (e) => { const M = window.__morada.M; window.__pl.push({ pick: M.render.pick(e.clientX, e.clientY), xy: [e.clientX, e.clientY], pie: !!document.getElementById('pie') }); }, true); v.addEventListener('pointerdown', (e) => { window.__pl.push({ down: [e.clientX, e.clientY], pie: !!document.getElementById('pie') }); }, true); });
  await L.speed(1);
  await L.wait(1500);
  for (let k = 0; k < 5; k++) {
    const o = await L.ev((oid) => { const s = window.__morada.M.engine.simById(oid); return { x: s.x, y: s.y, hidden: s.hidden, anim: s.anim, q: s.queue.length }; }, other);
    await L.focus(o.x, o.y); await L.wait(250);
    // aim where the RENDERED rig is (the renderer eases toward the engine position)
    const sp = await L.simScreen(other, 1.0);
    await L.tap(sp.x, sp.y); await L.wait(350);
    const pie = await L.pie();
    out.tries.push({ ev: await L.ev(() => window.__pl.splice(0)), pick: sp.pick && sp.pick.kind, pie: !!pie, items: pie && pie.items.length, tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }), o });
    if (pie) {
      if (k === 0) await L.shot('pie-on-walker');
      // the pie stays anchored where we clicked while the target walks away?
      await L.wait(1500);
      const pos = await L.ev((oid) => { const M = window.__morada.M; const s = M.engine.simById(oid); const p = M.render.project(s.x + 0.5, 1, s.y + 0.5); const w = document.querySelector('#pie .pie-wrap'); const r = w ? { x: parseFloat(w.style.left), y: parseFloat(w.style.top) } : null; return { sim: [Math.round(p.clientX), Math.round(p.clientY)], pie: r }; }, other);
      out.tries[out.tries.length - 1].drift = pos;
      if (k === 0) await L.shot('pie-on-walker-later');
      // choose Conversar: does the selected sim follow the moving target?
      if (k === 0) {
        await L.clickPie(/^Conversar/);
        await L.wait(4000);
        out.followQueue = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
        const d = await L.ev(([sid, oid]) => { const E = window.__morada.M.engine; const a = E.simById(sid), b = E.simById(oid); return { dist: Math.hypot(a.x - b.x, a.y - b.y), bq: b.queue.map((q) => q.label + '|' + q.phase) }; }, [sel, other]);
        out.followDist = d;
        await L.wait(6000);
        out.followQueue2 = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
        out.followNotes = await L.notes();
        await L.shot('follow');
      } else await L.ev(() => window.__morada.M.ui.closePie());
    }
    await L.wait(400);
  }
  out.errs = await L.errs();
  return out;
}

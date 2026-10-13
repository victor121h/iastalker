// QA live: how clickable is a meal / dirty plate sitting on a counter or table? Sample its tile's screen area.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_meal.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'meal');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  // setup: put a meal on a counter and a dirty plate on the dining table (engine buy is not allowed for system types; push objects)
  const ids = await L.ev(() => {
    const M = window.__morada.M, st = M.engine.state;
    const c = st.objects.find((o) => o.type === 'counter' && o.x === 16 && o.y === 11);
    const t = st.objects.find((o) => o.type === 'table_dining');
    const abs = st.time.day * 1440 + st.time.minute;
    const meal = { id: M.util.nextId(st), type: 'meal', x: c.x, y: c.y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0, servings: 3, quality: 60, food: 'home', spoilAt: abs + 480 };
    const plate = { id: M.util.nextId(st), type: 'dirty_plate', x: t.x, y: t.y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0, spoilAt: abs + 480 };
    st.objects.push(meal, plate);
    M.util.bus.emit('objects');
    return { meal: meal.id, plate: plate.id, counter: c.id, table: t.id };
  });
  await L.speed(1); await L.wait(500); await L.speed(0);
  for (const [name, oid, tx, ty] of [['meal', ids.meal, 16, 11], ['plate', ids.plate, 13, 11]]) {
    await L.focus(tx + 0.5, ty + 0.5); await L.wait(500);
    const s = await L.ev(([oid, tx, ty]) => {
      const M = window.__morada.M;
      // sample a 9x9 grid over the screen-space bbox of the tile volume (0..1.2 height)
      const corners = [];
      for (const dx of [0, 1]) for (const dy of [0, 1]) for (const h of [0, 1.2]) { const p = M.render.project(tx + dx, h, ty + dy); corners.push([p.clientX, p.clientY]); }
      const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const count = {};
      for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
        const x = x0 + (x1 - x0) * i / 12, y = y0 + (y1 - y0) * j / 12;
        const pk = M.render.pick(x, y);
        const k = pk ? (pk.kind === 'object' ? (pk.id === oid ? 'TARGET' : M.engine.objectById(pk.id).type) : pk.kind) : 'null';
        count[k] = (count[k] || 0) + 1;
      }
      const c = M.render.project(tx + 0.5, 0.95, ty + 0.5);
      return { bboxPx: [Math.round(x1 - x0), Math.round(y1 - y0)], count, centerPick: M.render.pick(c.clientX, c.clientY), center: [c.clientX, c.clientY] };
    }, [oid, tx, ty]);
    out[name] = s;
    // real click at the visual center of the item
    await L.tap(s.center[0], s.center[1]); await L.wait(420);
    const pie = await L.pie();
    out[name].clickCenter = { pie: pie && pie.title + ': ' + pie.items.map((i) => i.t).join(', '), tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }) };
    await L.shot(name + '-click');
    await L.ev(() => window.__morada.M.ui.closePie());
    await L.wait(200);
  }
  // zoomed-in screenshot of the counter with meal
  await L.ev(() => { const M = window.__morada.M; M.render.setCamera({ dist: 12 }); M.render.focus(16.5, 11.5, true); });
  await L.wait(800);
  await L.shot('meal-zoom');
  // recolher prato: the exact plate disappears?
  {
    const sp = await L.objFind(ids.plate);
    await L.ev(() => { const M = window.__morada.M; M.render.setCamera({ dist: 30 }); M.render.focus(13.5, 11.5, true); });
    await L.wait(600);
    const sp2 = await L.objFind(ids.plate);
    await L.tap(sp2.x, sp2.y); await L.wait(420);
    await L.clickPie(/Recolher/);
    out.plateRun = await L.ev(([sid, pid]) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 200 && s.queue.length; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase + ':' + (a.objId) : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); } return { seen, plateStill: !!E.objectById(pid), plates: E.state.objects.filter((o) => o.type === 'dirty_plate').map((o) => o.id + '@' + o.x + ',' + o.y) }; }, [sel, ids.plate]);
    out.plateNotes = await L.notes();
  }
  out.errs = await L.errs();
  return out;
}

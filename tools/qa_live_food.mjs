// QA live: cook → click the served meal on the counter → eat → click dirty plate → clean; pizza delivery; broken object.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_food.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'food');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  const clearQ = (sid) => L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 10; i++) E.update(0.5); }, sid);
  await clearQ(sel);
  const openOn = async (oid) => {
    const o = await L.ev((i) => { const q = window.__morada.M.engine.objectById(i); return q ? { x: q.x, y: q.y } : null; }, oid);
    if (!o) return { err: 'gone' };
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(450);
    const sp = await L.objFind(oid);
    if (!sp) return { err: 'not clickable', center: await L.objScreen(oid, 0.9) };
    await L.tap(sp.x, sp.y); await L.wait(420);
    const p = await L.pie();
    return { pie: p && p.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : '')), title: p && p.title, tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }) };
  };
  // cook
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  await openOn(fr);
  await L.clickPie(/Preparar/);
  const cooked = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 300 && s.queue.length; i++) E.update(0.5); const m = E.state.objects.find((o) => o.type === 'meal'); return m ? { id: m.id, x: m.x, y: m.y, servings: m.servings, under: window.__morada.M.world.objectsAt(m.x, m.y).map((q) => q.type) } : null; }, sel);
  out.cooked = cooked; out.cookNotes = await L.notes();
  if (cooked) {
    await L.speed(1); await L.wait(300); await L.speed(0);
    out.mealPie = await openOn(cooked.id);
    await L.shot('meal-pie');
    // what does clicking the centre of the counter tile under the meal give?
    out.mealTileCenterPick = await L.ev((m) => { const M = window.__morada.M; const pts = []; for (const h of [0.5, 0.9, 1.0]) { const p = M.render.project(m.x + 0.5, h, m.y + 0.5); pts.push(h + ':' + JSON.stringify(M.render.pick(p.clientX, p.clientY))); } return pts; }, cooked);
    const eat = await L.clickPie(/comer|Comer|prato/);
    out.eatClicked = eat && eat.t;
    const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 200 && s.queue.length; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase + ':' + s.anim + (s.seated ? ':seated' : '') : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); } const pl = E.state.objects.find((o) => o.type === 'dirty_plate'); return { seen: seen.slice(0, 14), plate: pl ? { id: pl.id, x: pl.x, y: pl.y, under: window.__morada.M.world.objectsAt(pl.x, pl.y).map((q) => q.type) } : null }; }, sel);
    out.eatRun = r; out.eatNotes = await L.notes();
    if (r.plate) {
      await L.speed(1); await L.wait(300); await L.speed(0);
      out.platePie = await openOn(r.plate.id);
      await L.shot('plate-pie');
      const c = await L.clickPie(/Limpar|Lavar|Recolher/);
      out.cleanClicked = c && c.t;
      out.cleanRun = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 200 && s.queue.length; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); } return { seen, plateLeft: !!E.state.objects.find((o) => o.type === 'dirty_plate') }; }, sel);
    }
  }
  // pizza
  await clearQ(sel);
  const ph = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'phone').id);
  await openOn(ph);
  await L.clickPie(/pizza/i);
  const pz = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 300 && s.queue.length; i++) E.update(0.5); let v = null; for (let i = 0; i < 200; i++) { E.update(0.5); v = E.visitors().find((q) => q.role === 'pizza'); if (v) break; } return v ? { id: v.id, name: v.name, x: v.x, y: v.y, q: v.queue.map((a) => a.label) } : null; }, sel);
  out.pizzaGuy = pz; out.pizzaNotes = await L.notes();
  if (pz) {
    await L.step(3);
    const p = await L.ev((i) => { const s = window.__morada.M.engine.simById(i); return s ? { x: s.x, y: s.y } : null; }, pz.id);
    if (p) {
      await L.focus(p.x, p.y); await L.wait(400);
      const sp = await L.simScreen(pz.id, 1.0);
      await L.tap(sp.x, sp.y); await L.wait(420);
      out.pizzaGuyPie = { pie: (await L.pie()) && (await L.pie()).items.map((i) => i.t), tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }) };
      if (!L.touch) { await page.mouse.move(sp.x, sp.y + 2); await L.wait(300); out.pizzaHover = await L.ev(() => { const l = document.getElementById('hover-label'); return l && !l.hidden ? l.textContent : null; }); }
      await L.ev(() => window.__morada.M.ui.closePie());
    }
    const r = await L.ev(() => { const E = window.__morada.M.engine; let m = null; for (let i = 0; i < 300; i++) { E.update(0.5); m = E.state.objects.find((o) => o.type === 'meal' && o.food === 'pizza'); if (m) break; } return m ? { id: m.id, x: m.x, y: m.y, servings: m.servings, under: window.__morada.M.world.objectsAt(m.x, m.y).map((q) => q.type) } : null; });
    out.pizzaMeal = r; out.pizzaNotes2 = await L.notes();
    if (r) { await L.speed(1); await L.wait(300); await L.speed(0); out.pizzaPie = await openOn(r.id); await L.shot('pizza-pie'); await L.ev(() => window.__morada.M.ui.closePie()); }
  }
  // broken object: break the toilet (setup), check pies on toilet and phone
  {
    await clearQ(sel);
    const t = await L.ev(() => { const o = window.__morada.state.objects.find((q) => q.type === 'toilet'); o.broken = true; window.__morada.M.util.bus.emit('objects'); return o.id; });
    await L.wait(300);
    out.brokenToiletPie = await openOn(t);
    await L.shot('broken-toilet');
    if (!L.touch) { const sp = await L.objFind(t); await L.ev(() => window.__morada.M.ui.closePie()); await page.mouse.move(sp.x, sp.y); await L.wait(300); out.brokenHover = await L.ev(() => { const l = document.getElementById('hover-label'); return l && !l.hidden ? l.textContent : null; }); }
    await L.ev(() => window.__morada.M.ui.closePie());
    out.brokenPhonePie = await openOn(ph);
    await L.ev(() => window.__morada.M.ui.closePie());
    // the other household member tries to use the broken toilet
    out.brokenUse = await L.ev(([sid, t]) => { const E = window.__morada.M.engine; window.__notes.length = 0; const r = E.queueInteraction(sid, t, 'use', 'player'); return { r, notes: window.__notes.slice() }; }, [sel, t]);
  }
  out.errs = await L.errs();
  return out;
}

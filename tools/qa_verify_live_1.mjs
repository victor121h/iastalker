// Verify LIVE-1: meal / dirty plate on a surface clickability, with a REAL cooked meal and a REAL eaten plate.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_1.mjs [--touch --w 390 --h 844]
import path from 'node:path';
import fs from 'node:fs';
const SHOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/verify_live');

export default async function (page, ctx) {
  fs.mkdirSync(SHOT, { recursive: true });
  const tag = ctx.touch ? 'phone' : 'desk';
  const tap = async (x, y) => { if (ctx.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const out = {};
  await page.evaluate(() => { const M = window.__morada.M; M.main.setSpeed(0); M.engine.setFreeWill(false); });
  // Rita cooks a real meal
  const r = await page.evaluate(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const rita = E.household().find((s) => s.name.startsWith('Rita'));
    const caio = E.household().find((s) => s.name.startsWith('Caio'));
    rita.motives.hunger = 95; // so she does not auto-eat
    const fridge = st.objects.find((o) => /^fridge/.test(o.type));
    const ok = E.queueInteraction(rita.id, fridge.id, 'cook', 'player');
    let meal = null;
    for (let i = 0; i < 400 && !meal; i++) { E.update(0.5); meal = st.objects.find((o) => o.type === 'meal'); }
    for (let i = 0; i < 20; i++) E.update(0.5);
    E.selectSim(rita.id);
    const under = meal ? M.world.objectsAt(meal.x, meal.y).map((o) => o.type) : null;
    return { ok, meal: meal && { id: meal.id, x: meal.x, y: meal.y, servings: meal.servings }, under, rita: rita.id, caio: caio.id, caioAtWork: caio.hidden };
  });
  out.cook = r;
  if (!r.meal) return out;
  await page.evaluate(() => window.__morada.M.main.setSpeed(1)); await page.waitForTimeout(600);
  await page.evaluate(() => window.__morada.M.main.setSpeed(0));
  // default camera (focus on meal at default distance)
  await page.evaluate(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [r.meal.x, r.meal.y]);
  await page.waitForTimeout(600);
  const sample = async (oid, tx, ty) => page.evaluate(([oid, tx, ty]) => {
    const M = window.__morada.M;
    const corners = [];
    for (const dx of [0, 1]) for (const dy of [0, 1]) for (const h of [0, 1.0]) { const p = M.render.project(tx + dx, h, ty + dy); corners.push([p.clientX, p.clientY]); }
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const count = {};
    for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
      const pk = M.render.pick(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * j / 12);
      const k = pk ? (pk.kind === 'object' ? (pk.id === oid ? 'TARGET' : M.engine.objectById(pk.id).type) : pk.kind) : 'null';
      count[k] = (count[k] || 0) + 1;
    }
    // top face of the tile only (surface height ~0.8-0.9): sample a 9x9 grid of points on the tile top
    const def = M.world.objectsAt(tx, ty).find((o) => M.data.CATALOG[o.type] && M.data.CATALOG[o.type].surface);
    const sh = def ? (M.data.CATALOG[def.type].surfaceHeight || 0.8) : 0;
    const top = {};
    for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++) {
      const p = M.render.project(tx + i / 10, sh + 0.02, ty + j / 10);
      const pk = M.render.pick(p.clientX, p.clientY);
      const k = pk ? (pk.kind === 'object' ? (pk.id === oid ? 'TARGET' : M.engine.objectById(pk.id).type) : pk.kind) : 'null';
      top[k] = (top[k] || 0) + 1;
    }
    const c = M.render.project(tx + 0.5, sh + 0.05, ty + 0.5);
    const pk = M.render.pick(c.clientX, c.clientY);
    return { bboxPx: [Math.round(x1 - x0), Math.round(y1 - y0)], count, topFace81: top, center: [c.clientX, c.clientY], centerPick: pk && (pk.kind === 'object' ? M.engine.objectById(pk.id).type : pk.kind) };
  }, [oid, tx, ty]);
  out.mealSample = await sample(r.meal.id, r.meal.x, r.meal.y);
  await page.screenshot({ path: path.join(SHOT, `l1-${tag}-meal.png`) });
  await tap(out.mealSample.center[0], out.mealSample.center[1]); await page.waitForTimeout(450);
  out.mealCenterClick = await page.evaluate(() => {
    const pie = document.getElementById('pie'); const tip = document.getElementById('tip');
    return { pie: pie ? Array.from(pie.querySelectorAll('.p-label')).map((e) => e.textContent) : null, tip: tip && !tip.hidden ? tip.textContent : null };
  });
  await page.screenshot({ path: path.join(SHOT, `l1-${tag}-meal-click.png`) });
  await page.evaluate(() => window.__morada.M.ui.closePie());
  // zoomed shot
  await page.evaluate(([x, y]) => { const M = window.__morada.M; M.render.setCamera({ dist: 10 }); M.render.focus(x + 0.5, y + 0.5, true); }, [r.meal.x, r.meal.y]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOT, `l1-${tag}-meal-zoom.png`) });
  out.mealSampleZoom = await sample(r.meal.id, r.meal.x, r.meal.y);
  // Caio eats -> dirty plate on table
  const p2 = await page.evaluate(([cid, mid]) => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const caio = E.simById(cid);
    if (caio.hidden) return { hidden: true };
    caio.motives.hunger = -20;
    for (const a of caio.queue.slice()) E.cancelAction(caio.id, a.id);
    for (let i = 0; i < 20; i++) E.update(0.5);
    const ok = E.queueInteraction(caio.id, mid, 'eat', 'player');
    let plate = null;
    for (let i = 0; i < 400 && !plate; i++) { E.update(0.5); plate = st.objects.find((o) => o.type === 'dirty_plate'); }
    return { ok, plate: plate && { id: plate.id, x: plate.x, y: plate.y, under: M.world.objectsAt(plate.x, plate.y).map((o) => o.type) } };
  }, [r.rita, r.meal.id]);
  out.plate = p2;
  if (p2.plate) {
    await page.evaluate(() => { const M = window.__morada.M; M.render.setCamera({ dist: 30 }); });
    await page.evaluate(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [p2.plate.x, p2.plate.y]);
    await page.evaluate(() => window.__morada.M.main.setSpeed(1)); await page.waitForTimeout(600);
    await page.evaluate(() => window.__morada.M.main.setSpeed(0));
    out.plateSample = await sample(p2.plate.id, p2.plate.x, p2.plate.y);
    await tap(out.plateSample.center[0], out.plateSample.center[1]); await page.waitForTimeout(450);
    out.plateCenterClick = await page.evaluate(() => {
      const pie = document.getElementById('pie'); const tip = document.getElementById('tip');
      return { pie: pie ? Array.from(pie.querySelectorAll('.p-label')).map((e) => e.textContent) : null, tip: tip && !tip.hidden ? tip.textContent : null };
    });
    await page.screenshot({ path: path.join(SHOT, `l1-${tag}-plate-click.png`) });
  }
  out.cam = await page.evaluate(() => window.__morada.M.render.getCamera());
  return out;
}

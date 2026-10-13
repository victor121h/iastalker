// Playwright script: screenshots of dynamic situations (carpool, meal on table, walk-by, night, wall modes,
// rotations). node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_scenes.mjs
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const tag = ctx.W < 600 ? 'phone' : 'desk';
  const out = {};
  const shot = async (name) => { const f = path.join(dir, `scene-${tag}-${name}.png`); await page.screenshot({ path: f }); out[name] = f; return f; };
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); window.__morada.M.main.setSpeed(0); });
  // carpool: advance to 08:40 day 1 when Caio walks to the car
  out.carpool = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    for (let i = 0; i < 80; i++) { E.update(0.5); const c = E.state.objects.find((o) => o.type === 'carpool'); const caio = E.household().find((s) => s.career); if (c && caio && caio.queue[0] && /trabalho/i.test(caio.queue[0].label || '')) break; }
    const c = E.state.objects.find((o) => o.type === 'carpool');
    const caio = E.household().find((s) => s.career);
    M.render.setCamera({ k: 0, x: c ? c.x + 1 : 12, z: c ? c.y : 18, dist: 14 });
    return { car: c && [c.x, c.y, c.rot, c.car], caio: caio && [caio.x, caio.y, caio.anim, caio.queue[0] && caio.queue[0].label], t: M.util.fmtTime(E.state.time.minute) };
  });
  await page.waitForTimeout(900);
  await shot('1-carpool');
  // meal on the dining table: force a cook
  out.meal = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    const rita = E.household()[0];
    const fr = E.state.objects.find((o) => /^fridge/.test(o.type));
    E.queueInteraction(rita.id, fr.id, 'cook', 'player');
    let meal = null;
    for (let i = 0; i < 240; i++) { E.update(0.5); meal = E.state.objects.find((o) => o.type === 'meal'); if (meal) break; }
    for (let i = 0; i < 6; i++) E.update(0.5);
    M.render.setCamera({ k: 0, x: meal ? meal.x + 0.5 : 12, z: meal ? meal.y + 0.5 : 10, dist: 9 });
    const surf = meal && M.world.objectsAt(meal.x, meal.y).map((o) => o.type);
    return { meal: meal && [meal.x, meal.y, meal.servings], under: surf, t: M.util.fmtTime(E.state.time.minute) };
  });
  await page.waitForTimeout(900);
  await shot('2-meal');
  // let them eat: plates on table
  out.eat = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    const seen = new Set();
    for (let i = 0; i < 120; i++) { E.update(0.5); for (const s of E.household()) if (s.anim === 'eat') seen.add(s.name + (s.seated ? ' seated' : ' standing')); if (seen.size && E.household().some((s) => s.anim === 'eat' && s.seated)) break; }
    const s = E.household().find((q) => q.anim === 'eat') || E.household()[0];
    M.render.setCamera({ k: 1, x: s.x + 0.5, z: s.y + 0.5, dist: 8 });
    return { seen: Array.from(seen), plates: E.state.objects.filter((o) => o.type === 'dirty_plate').length };
  });
  await page.waitForTimeout(900);
  await shot('3-eating');
  // walk-by: force one if the engine supports it via debug, else wait until a walkby appears
  out.walkby = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    let w = null;
    for (let i = 0; i < 1440 && !w; i++) { E.update(1); w = E.state.sims.find((s) => s.visitor && !s.hidden); }
    if (!w) return null;
    for (let i = 0; i < 10; i++) E.update(0.5);
    M.render.setCamera({ k: 0, x: w.x + 0.5, z: w.y + 0.5, dist: 10 });
    M.render.setSelected(w.id);
    return { name: w.name, role: w.role, at: [w.x, w.y], anim: w.anim, t: M.util.fmtTime(E.state.time.minute) };
  });
  await page.waitForTimeout(900);
  await shot('4-visitor');
  await ev(() => { const M = window.__morada.M; M.render.setSelected(M.engine.state.settings.selectedSimId); });
  // night overview
  out.night = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    let guard = 0;
    while (!(E.state.time.minute >= 21 * 60 + 30 || E.state.time.minute < 60) && guard++ < 3000) E.update(1);
    M.render.setCamera({ k: 0, x: 11.5, z: 10, dist: 26 });
    return M.util.fmtTime(E.state.time.minute);
  });
  await page.waitForTimeout(1200);
  await shot('5-night');
  // day: wall modes + rotations
  await ev(() => { const M = window.__morada.M, E = M.engine; let g = 0; while (!(E.state.time.minute >= 10 * 60 && E.state.time.minute < 11 * 60) && g++ < 3000) E.update(1); });
  for (const mode of ['up', 'down']) {
    await ev((m) => { const M = window.__morada.M; M.render.setWallMode(m); M.render.setCamera({ k: 0, x: 11.5, z: 10, dist: 26 }); }, mode);
    await page.waitForTimeout(1300);
    await shot('6-walls-' + mode);
  }
  await ev(() => window.__morada.M.render.setWallMode('cutaway'));
  for (const k of [1, 2, 3]) {
    await ev((k) => window.__morada.M.render.setCamera({ k, x: 11.5, z: 10, dist: 26 }), k);
    await page.waitForTimeout(1300);
    await shot('7-rot' + k);
  }
  return out;
}

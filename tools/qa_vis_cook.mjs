import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'cook');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M, E = M.engine, st = E.state; M.main.setSpeed(0); E.setFreeWill(false); st.time.minute = 1080; const [r, c] = E.household(); for (const s of [r, c]) { s.queue.length = 0; for (const k of Object.keys(s.motives)) s.motives[k] = 30; } c.x = 3; c.y = 16; r.x = 13; r.y = 12; const f = st.objects.find(o => o.type === 'fridge_cheap'); window.__ok = E.queueInteraction(r.id, f.id, 'cook', 'player'); E.selectSim(r.id); });
  const out = []; const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => { const M = window.__morada.M, E = M.engine; const r = E.household()[0]; for (let k = 0; k < 4; k++) E.update(0.5); const a = r.queue[0]; return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), f: +r.facing.toFixed(2), anim: r.anim, ph: a ? a.interaction + ':' + a.phase + ':' + (a.stage != null ? a.stage : '') : 'none', meal: E.state.objects.filter(o => o.type === 'meal').map(o => [o.x, o.y]) }; });
    const key = s.anim + s.ph;
    if (!seen.has(key) && s.ph.includes(':do')) {
      seen.add(key);
      await page.evaluate(([x, y]) => { const M = window.__morada.M; M.render.setCamera({ k: 0, x: x + 0.5, z: y + 0.5, dist: 9 }); M.main.setSpeed(1); }, [s.x, s.y]);
      await L.wait(1500);
      s.shot = await L.shot('s' + seen.size, { x: 390, y: 150, width: 500, height: 500 });
      await page.evaluate(() => window.__morada.M.main.setSpeed(0));
      out.push(s);
    }
    if (s.ph === 'none' || s.meal.length) { s.end = true; out.push(s); break; }
  }
  return out;
}

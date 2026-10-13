// Walk through doors: frames while Rita walks living room -> kitchen -> bathroom (toilet); Caio goes to the front door/carpool.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'walk');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M, E = M.engine; M.main.setSpeed(0); E.setFreeWill(false); const st = E.state; st.time.minute = 600; const [r, c] = E.household(); r.queue.length = 0; c.queue.length = 0; r.x = 8; r.y = 12; c.x = 3; c.y = 3; r.motives.bladder = -40; const t = st.objects.find(o => o.type === 'toilet'); E.queueInteraction(r.id, t.id, 'use', 'player'); E.selectSim(r.id); M.main.setSpeed(1); });
  const out = [];
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => { const M = window.__morada.M; const r = M.engine.household()[0]; M.render.focus(r.x, r.y, true); M.render.setCamera({ dist: 9, k: 0 }); const a = r.queue[0]; return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), anim: r.anim, ph: a ? a.phase : 'none' }; });
    if (i % 2 === 0) { s.shot = await L.shot('f' + String(i).padStart(2, '0'), { x: 390, y: 150, width: 500, height: 500 }); }
    out.push(s);
    if (s.ph === 'do') break;
    await L.wait(250);
  }
  return out;
}

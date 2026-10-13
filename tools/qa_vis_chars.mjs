// Character close-ups (faces, hair, proportions), plus a few social anims and the mood orb.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'char');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M, E = M.engine; M.main.setSpeed(0); E.setFreeWill(false); const st = E.state; st.time.minute = 660; const [r, c] = E.household(); for (const s of [r, c]) { s.queue.length = 0; s.anim = 'idle'; } r.x = 3; r.y = 3; r.facing = Math.PI / 4; c.x = 5; c.y = 3; c.facing = Math.PI / 4; E.selectSim(r.id); M.main.setSpeed(1); });
  const out = {};
  await L.cam({ k: 0, x: 4, z: 3.3, dist: 5, pitch: 0.55 }); await L.wait(1200);
  out.pair = await L.shot('pair', { x: 240, y: 100, width: 800, height: 600 });
  await L.cam({ k: 0, x: 3, z: 3.3, dist: 3.2, pitch: 0.35 }); await L.wait(800);
  out.rita = await L.shot('rita-face', { x: 340, y: 100, width: 600, height: 600 });
  await L.cam({ k: 0, x: 5, z: 3.3, dist: 3.2, pitch: 0.35 }); await L.wait(800);
  out.caio = await L.shot('caio-face', { x: 340, y: 100, width: 600, height: 600 });
  // socials
  for (const key of ['talk', 'hug', 'kiss', 'dance_together', 'joke']) {
    const ok = await page.evaluate((key) => { const M = window.__morada.M, E = M.engine; const [r, c] = E.household(); for (const s of [r, c]) { s.queue.length = 0; s.anim = 'idle'; s.bubble = null; } r.x = 3; r.y = 3; c.x = 4; c.y = 3; for (const s of [r, c]) { s.motives.social = -30; s.motives.fun = -20; } const soc = E.getSocials(r.id, c.id); const it = soc.find(i => i.key === key || i.key.indexOf(key.split('_')[0]) === 0); if (!it) return 'none: ' + soc.map(i => i.key).join(','); M.main.setSpeed(0); const q = E.queueSocial(r.id, c.id, it.key, 'player'); for (let i = 0; i < 200; i++) { E.update(0.25); if (r.queue[0] && r.queue[0].phase === 'do' && r.anim !== 'idle') break; } M.main.setSpeed(1); return it.key + ':' + q + ':' + r.anim + '/' + c.anim + ' d=' + Math.hypot(r.x - c.x, r.y - c.y).toFixed(2); }, key);
    out['soc-' + key] = ok;
    await L.cam({ k: 0, x: 3.5, z: 3.3, dist: 6, pitch: 0.6 }); await L.wait(1200);
    out['soc-' + key + '-shot'] = await L.shot('soc-' + key, { x: 340, y: 150, width: 600, height: 500 });
  }
  return out;
}

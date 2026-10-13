import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'face');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M, E = M.engine; M.main.setSpeed(0); E.setFreeWill(false); const st = E.state; st.time.minute = 660; const [r, c] = E.household(); for (const s of [r, c]) { s.queue.length = 0; s.anim = 'idle'; } r.x = 3; r.y = 3; r.facing = Math.PI / 4; c.x = 4.2; c.y = 3; c.facing = Math.PI / 4; E.selectSim(null); M.render.setSelected(null); M.main.setSpeed(1); });
  const out = {};
  for (const k of [0, 2]) {
    await L.cam({ k, x: 3.6, z: 3.5, dist: 6, pitch: 0.12 }); await L.wait(1200);
    out['k' + k] = await L.shot('pair-k' + k, { x: 440, y: 200, width: 400, height: 300 });
  }
  return out;
}

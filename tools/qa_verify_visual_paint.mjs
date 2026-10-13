// VIS-2: one wallpaper colour per edge -> both faces. Paint the bathroom's east wall v,17,7 with stripes (6).
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'paint');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); const s = window.__morada.state; s.time.minute = 720; s.sims.forEach((x, i) => { x.queue = []; x.x = 20 + i; x.y = 2; }); });
  const out = {};
  // starter house as is, walls up, from two opposite corners
  await L.walls('up');
  for (const k of [0, 2]) { await L.cam({ k, x: 12, z: 10, dist: 22 }); await L.wait(700); out['starter-k' + k] = await L.shot('starter-up-k' + k); }
  out.money0 = await L.ev(() => window.__morada.state.money);
  out.r = await L.ev(() => window.__morada.M.engine.paintWall('v,17,7', 6));
  out.wall = await L.ev(() => window.__morada.state.lot.walls['v,17,7']);
  out.money1 = await L.ev(() => window.__morada.state.money);
  await L.wait(700);
  // outside view of the east facade: camera k0 (south-east)
  await L.cam({ k: 0, x: 17, z: 8, dist: 12 }); await L.wait(700); out.outside = await L.shot('east-outside-k0');
  // inside view (bathroom) from k2 (north-west), walls up so we see the inner face of v,17,7
  await L.cam({ k: 2, x: 15, z: 7.5, dist: 12 }); await L.wait(700); out.inside = await L.shot('east-inside-k2');
  // material colours of instanced wall pieces? report how many distinct colours each edge has
  return out;
}

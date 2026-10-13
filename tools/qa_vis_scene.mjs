// Scene sweep: times of day, rotations, zoom, wall modes.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const tag = `scene-${ctx.W}x${ctx.H}`;
  const L = mk(page, ctx, tag);
  const out = {};
  await L.dismissHelp();
  await page.evaluate(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); });
  // hide HUD for clean scene shots
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; });
  const only = (ctx.args[ctx.args.indexOf('--only') + 1] || 'all');
  if (only === 'all' || only === 'time') {
    for (const [nm, m] of [['0600', 360], ['0700', 420], ['1200', 720], ['1730', 1050], ['1830', 1110], ['1930', 1170], ['2200', 1320], ['0300', 180]]) {
      await L.setTime(m); await L.wait(600);
      out['t' + nm] = await L.shot('time-' + nm);
    }
  }
  if (only === 'all' || only === 'rot') {
    await L.setTime(720);
    for (let k = 0; k < 4; k++) {
      await L.cam({ k, x: 12, z: 10, dist: 30 });
      await L.wait(900);
      out['rot' + k] = await L.shot('rot' + k);
    }
  }
  if (only === 'all' || only === 'zoom') {
    await L.setTime(720);
    await L.cam({ k: 0, x: 12, z: 10, dist: 9 }); await L.wait(900); out.zmin = await L.shot('zoom-min');
    await L.cam({ k: 0, x: 14, z: 11, dist: 9 }); await L.wait(900); out.zminK = await L.shot('zoom-min-kitchen');
    await L.cam({ k: 0, x: 9, z: 8, dist: 9 }); await L.wait(900); out.zminB = await L.shot('zoom-min-bed');
    await L.cam({ k: 0, x: 14, z: 7, dist: 9 }); await L.wait(900); out.zminBa = await L.shot('zoom-min-bath');
    await L.cam({ k: 0, x: 9, z: 12, dist: 9 }); await L.wait(900); out.zminL = await L.shot('zoom-min-living');
    await L.cam({ k: 0, x: 12, z: 10, dist: 70 }); await L.wait(900); out.zmax = await L.shot('zoom-max');
    await L.cam({ k: 2, x: 12, z: 10, dist: 70 }); await L.wait(900); out.zmax2 = await L.shot('zoom-max-k2');
  }
  if (only === 'all' || only === 'walls') {
    await L.setTime(720);
    for (const k of [0, 2]) {
      await L.cam({ k, x: 12, z: 10, dist: 24 });
      for (const m of ['up', 'cutaway', 'down']) { await L.walls(m); await L.wait(600); out['w' + k + m] = await L.shot(`walls-k${k}-${m}`); }
    }
    await L.walls('cutaway');
  }
  return out;
}

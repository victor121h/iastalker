// Night close-ups: lamp light, light leaking through walls, shadow acne at night/dusk, window glow.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'night');
  await L.dismissHelp();
  await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); });
  const out = {};
  const shots = [
    ['bedroom-2230', 1350, { k: 0, x: 9, z: 7.5, dist: 10 }],
    ['bedroom-2230-k2', 1350, { k: 2, x: 9, z: 7.5, dist: 10 }],
    ['westwall-2230', 1350, { k: 0, x: 6.5, z: 12.5, dist: 10 }],
    ['westwall-2230-k1', 1350, { k: 1, x: 6.5, z: 12.5, dist: 10 }],
    ['eastwall-2230-k3', 1350, { k: 3, x: 17, z: 7, dist: 10 }],
    ['street-2230', 1350, { k: 0, x: 10, z: 19, dist: 18 }],
    ['street-2230-k2', 1350, { k: 2, x: 12, z: 21, dist: 22 }],
    ['grass-0300', 180, { k: 2, x: 18, z: 4, dist: 10 }],
    ['grass-1800', 1080, { k: 2, x: 18, z: 4, dist: 10 }],
    ['grass-0630', 390, { k: 2, x: 18, z: 4, dist: 10 }],
    ['house-0630-k2', 390, { k: 2, x: 12, z: 10, dist: 24 }],
    ['house-1800-k1', 1080, { k: 1, x: 12, z: 10, dist: 24 }],
    ['house-1900-k3', 1140, { k: 3, x: 12, z: 10, dist: 24 }],
    ['house-2230-up', 1350, { k: 0, x: 12, z: 10, dist: 24, walls: 'up' }],
  ];
  for (const [name, minute, cam] of shots) {
    await L.setTime(minute);
    if (cam.walls) await L.walls(cam.walls);
    await L.cam(cam);
    await L.wait(900);
    out[name] = await L.shot(name);
    if (cam.walls) await L.walls('cutaway');
  }
  out.lamps = await page.evaluate(() => { const M = window.__morada.M; const pl = M.render.scene.getObjectByName('lights').children.map(l => [+(l.intensity).toFixed(2), +l.distance.toFixed(1), l.position.x.toFixed(1), l.position.y.toFixed(1), l.position.z.toFixed(1)]); return pl; });
  return out;
}

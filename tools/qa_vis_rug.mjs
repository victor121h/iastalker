import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'rug');
  await L.dismissHelp();
  const r = await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; const M = window.__morada.M, E = M.engine; M.main.setSpeed(1); E.setFreeWill(false); E.state.money = 1e5; const a = E.buyObject('rug', 9, 11, 0); const b = E.buyObject('rug', 2, 2, 0); return [a.ok || a.reason, b.ok || b.reason]; });
  const out = { r };
  for (const [nm, cam] of [['near', { k: 0, x: 10, z: 12, dist: 10 }], ['mid', { k: 1, x: 10, z: 12, dist: 30 }], ['far', { k: 0, x: 10, z: 12, dist: 70 }], ['lawn-far', { k: 0, x: 3, z: 3, dist: 70 }]]) {
    await L.cam(cam); await L.wait(900);
    out[nm] = await L.shot(nm, nm.includes('far') ? { x: 440, y: 250, width: 400, height: 300 } : undefined);
  }
  return out;
}

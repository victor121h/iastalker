// VIS-3: wall decor on interior walls in cutaway. Check painting 124 visibility for k=0..3 in cutaway and up,
// and buy a painting_lux on interior wall v,12,* (kitchen/living room) facing the living room.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'decor');
  await L.dismissHelp();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); const s = window.__morada.state; s.time.minute = 720; s.sims.forEach((x, i) => { x.queue = []; x.x = 20 + i; x.y = 2; }); });
  const out = {};
  // buy oil painting on the living-room side of interior wall: rot 3 = faces +X? wall-mounted placement helper
  out.buy = await L.ev(() => { const M = window.__morada.M; const tries = []; for (const [x, y, r] of [[11, 11, 1], [12, 11, 3], [11, 12, 1], [12, 12, 3], [8, 13, 2], [9, 13, 2]]) { const res = M.engine.buyObject('painting_lux', x, y, r); tries.push([x, y, r, res && res.ok, res && res.reason]); if (res && res.ok) break; } return tries; });
  out.decor = await L.ev(() => window.__morada.state.objects.filter(o => /painting|mirror/.test(o.type)).map(o => [o.id, o.type, o.x, o.y, o.rot]));
  const visState = () => L.ev(() => { const R = window.__morada.M.render; const lights = []; const res = {}; R.scene.getObjectByName('objects').children.forEach(g => { const id = g.userData && (g.userData.objId ?? g.userData.id); if (id != null) res[id] = g.visible; }); return res; });
  out.views = {};
  for (const mode of ['cutaway', 'up']) {
    await L.walls(mode);
    for (const k of [0, 1, 2, 3]) {
      await L.cam({ k, x: 11, z: 10.5, dist: 16 }); await L.wait(900);
      const v = await visState();
      const ids = out.decor.map(d => d[0]);
      out.views[mode + k] = Object.fromEntries(ids.map(id => [id, v[id]]));
      out[mode + k] = await L.shot(`${mode}-k${k}`);
    }
  }
  // buy mode: does the wall come up for placement?
  await L.walls('cutaway');
  await L.ev(() => window.__morada.M.ui.setMode('buy')); await L.wait(900);
  await L.cam({ k: 0, x: 11, z: 10.5, dist: 16 }); await L.wait(900);
  out.buyMode = Object.fromEntries(out.decor.map(d => [d[0], null]));
  const v2 = await visState(); for (const d of out.decor) out.buyMode[d[0]] = v2[d[0]];
  out.buyShot = await L.shot('buymode-k0');
  out.wallMode = await L.ev(() => window.__morada.M.render.wallMode);
  return out;
}

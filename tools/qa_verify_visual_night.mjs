// VIS-1: lamp point light leak. Same camera at 22:30, lamp 121 on vs off, plus all lamps off. Diff later with PIL.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'night');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(1); });
  const out = {};
  const setLamps = (ids, on) => L.ev(([ids, on]) => { const s = window.__morada.state; for (const o of s.objects) if (ids.includes(o.id)) { if (on) delete o.on; else o.on = false; } window.__morada.M.util.bus.emit('objects', {}); }, [ids, on]);
  // park sims away so they don't intrude
  await L.ev(() => { const s = window.__morada.state; s.sims.forEach((x, i) => { x.queue = []; x.x = 20 + i; x.y = 2; }); });
  const views = [
    ['west', { k: 0, x: 6.5, z: 12.5, dist: 10 }],
    ['westk1', { k: 1, x: 6.5, z: 12.5, dist: 10 }],
    ['house', { k: 0, x: 12, z: 10, dist: 24 }],
  ];
  await L.setTime(1350);
  for (const mode of ['cutaway', 'up']) {
    await L.walls(mode);
    for (const [n, c] of views) {
      await L.cam(c);
      await setLamps([103, 107, 118, 121], true); await L.wait(900);
      out[`${n}-${mode}-on`] = await L.shot(`${n}-${mode}-on`);
      await setLamps([121], false); await L.wait(900);
      out[`${n}-${mode}-121off`] = await L.shot(`${n}-${mode}-121off`);
      await setLamps([103, 107, 118, 121], false); await L.wait(900);
      out[`${n}-${mode}-alloff`] = await L.shot(`${n}-${mode}-alloff`);
      await setLamps([103, 107, 118, 121], true);
    }
  }
  out.lights = await L.ev(() => window.__morada.M.render.scene.getObjectByName('lights').children.map(l => [+l.intensity.toFixed(2), l.distance, +l.position.x.toFixed(2), +l.position.y.toFixed(2), +l.position.z.toFixed(2)]));
  out.night = await L.ev(() => window.__morada.state.time.minute);
  // project lamp 121 position and an outside grass point to screen for west view
  await L.walls('cutaway'); await L.cam(views[0][1]); await L.wait(400);
  out.proj = await L.ev(() => { const R = window.__morada.M.render; return { lamp: R.project(7.5, 0, 13.5), grass5: R.project(5.5, 0, 13.5), grass4: R.project(4.5, 0, 13.0), wallOut: R.project(6.95, 1.0, 13.5) }; });
  return out;
}

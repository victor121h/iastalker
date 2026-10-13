// VIS-8: carpool placement relative to sidewalk/road.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'car');
  await L.dismissHelp();
  const out = {};
  out.cars = await L.ev(() => { const s = window.__morada.state; const M = window.__morada.M; return { minute: s.time.minute, cars: s.objects.filter(o => o.type === 'carpool').map(o => [o.id, o.x, o.y, o.rot, o.car]), row19: Array.from({ length: s.lot.w }, (_, x) => s.lot.floors[19 * s.lot.w + x]), row18: Array.from({ length: s.lot.w }, (_, x) => s.lot.floors[18 * s.lot.w + x]), FL: M.data.FLOORS.map((f, i) => i + ':' + f.key) }; });
  if (!out.cars.cars.length) {
    // advance until the carpool spawns
    out.adv = await L.ev(() => { const M = window.__morada.M, s = window.__morada.state; let n = 0; while (n++ < 2000 && !s.objects.some(o => o.type === 'carpool')) M.engine.update(0.5); return [n, s.time.minute]; });
    out.cars2 = await L.ev(() => window.__morada.state.objects.filter(o => o.type === 'carpool').map(o => [o.id, o.x, o.y, o.rot, o.car]));
  }
  await L.ev(() => window.__morada.M.main.setSpeed(0));
  const c = await L.ev(() => { const o = window.__morada.state.objects.find(o => o.type === 'carpool'); return o ? [o.x + 1, o.y + 0.5] : [10, 19]; });
  await L.cam({ k: 0, x: c[0], z: c[1] + 1, dist: 12 }); await L.wait(700); out.shot = await L.shot('k0');
  await L.cam({ k: 3, x: c[0], z: c[1] + 1, dist: 12 }); await L.wait(700); out.shot3 = await L.shot('k3');
  out.mesh = await L.ev(() => { const M = window.__morada.M; const o = window.__morada.state.objects.find(o => o.type === 'carpool'); let g = null; M.render.scene.getObjectByName('objects').children.forEach(ch => { if (ch.userData.objId === o.id) g = ch; }); const b = new THREE.Box3().setFromObject(g); return { min: [b.min.x, b.min.z].map(v => +v.toFixed(2)), max: [b.max.x, b.max.z].map(v => +v.toFixed(2)) }; });
  return out;
}

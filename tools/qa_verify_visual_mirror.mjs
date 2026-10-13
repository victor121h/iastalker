// VIS-14: mirror speech: do the hands cross the wall plane (z = 6 + 0.05)? Also admire distance.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'mirror');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.time.minute = 600; s.sims[1].x = 22; s.sims[1].y = 17; s.sims[1].queue = []; const sim = s.sims[0]; for (const k in sim.motives) sim.motives[k] = 50; sim.queue = []; M.engine.queueInteraction(sim.id, 106, 'speech', 'player'); let n = 0; while (n++ < 800 && !(sim.queue[0] && sim.queue[0].phase === 'do')) M.engine.update(0.25); M.engine.update(1); M.main.setSpeed(1); });
  await L.walls('cutaway');
  const samples = [];
  for (let i = 0; i < 25; i++) {
    samples.push(await L.ev(() => { const M = window.__morada.M, s = window.__morada.state; const sim = s.sims[0]; const chars = M.render.scene.getObjectByName('chars'); const root = chars.children.find(c => c.userData && c.userData.simId === sim.id); let minZ = 99, nm = ''; root.traverse(nd => { if (nd.isMesh && nd.visible && /hand|arm|fore|wrist/i.test((nd.parent && nd.parent.name) + nd.name)) { const b = new THREE.Box3().setFromObject(nd); if (b.min.z < minZ) { minZ = b.min.z; nm = nd.parent.name; } } }); let minAll = 99; root.traverse(nd => { if (nd.isMesh && nd.visible) { const b = new THREE.Box3().setFromObject(nd); if (b.max.y > 0.9) minAll = Math.min(minAll, b.min.z); } }); return { anim: sim.anim, minZ: +minZ.toFixed(3), part: nm, minAllUpper: +minAll.toFixed(3) }; }));
    await L.wait(160);
  }
  const names = await L.ev(() => { const M = window.__morada.M, s = window.__morada.state; const chars = M.render.scene.getObjectByName('chars'); const root = chars.children.find(c => c.userData && c.userData.simId === s.sims[0].id); const n = new Set(); root.traverse(nd => n.add(nd.name)); return Array.from(n).filter(Boolean).slice(0, 60); });
  await L.ev(() => window.__morada.M.main.setSpeed(0));
  await L.cam({ k: 3, x: 14.5, z: 6.5, dist: 4.5 }); await L.wait(400);
  const shot = await L.shot('speech-k3');
  await L.cam({ k: 0, x: 14.5, z: 6.5, dist: 4.5 }); await L.wait(400);
  const shot0 = await L.shot('speech-k0');
  const wallInner = 6 + 0.05;
  return { wallInner, minHandZ: Math.min(...samples.map(s => s.minZ)), minUpperBodyZ: Math.min(...samples.map(s => s.minAllUpper)), anim: samples[0].anim, part: samples.map(s => s.part)[0], names, shot, shot0 };
}

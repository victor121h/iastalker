// VIS-6: character ground blob vs body when using computer/piano/chess (pose shifts body forward).
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'blob');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.time.minute = 600; s.money = 99999; });
  const out = {};
  const cases = [['computer', 'play', 19, 9, 0], ['piano', 'play', 19, 3, 0], ['chess', 'play', 3, 3, 0]];
  out.buy = await L.ev((cases) => { const M = window.__morada.M; return cases.map(([t, k, x, y, r]) => { const res = M.engine.buyObject(t, x, y, r); return [t, res && res.ok, res && res.reason, res && res.id]; }); }, cases);
  out.objs = await L.ev(() => window.__morada.state.objects.filter(o => ['computer', 'piano', 'chess'].includes(o.type)).map(o => [o.id, o.type, o.x, o.y]));
  out.inter = await L.ev(() => { const M = window.__morada.M; return window.__morada.state.objects.filter(o => ['computer', 'piano', 'chess'].includes(o.type)).map(o => [o.type, (M.engine.getInteractions(window.__morada.state.sims[0].id, o.id) || []).map(i => i.key)]); });
  out.res = [];
  for (const [type, key] of cases) {
    const r = await L.ev(async ([type, key]) => {
      const M = window.__morada.M, s = window.__morada.state;
      const o = s.objects.find(q => q.type === type); const sim = s.sims[0];
      sim.queue = []; s.sims[1].queue = [];
      const keys = (M.engine.getInteractions(sim.id, o.id) || []).map(i => i.key);
      const k = keys.includes(key) ? key : keys[0];
      const ok = M.engine.queueInteraction(sim.id, o.id, k, 'player');
      let n = 0; while (n++ < 400 && !(sim.queue[0] && sim.queue[0].phase === 'do')) M.engine.update(0.5);
      M.engine.update(3);
      M.main.setSpeed(1);
      await new Promise(r => setTimeout(r, 1500));
      M.render.setCamera({ k: 0, x: o.x + 1, z: o.y + 1, dist: 7 });
      await new Promise(r => setTimeout(r, 600));
      M.main.setSpeed(0);
      const rec = M.render.scene.getObjectByName('chars');
      // find blob & hips: blob is a Mesh with CircleGeometry in chars group; root has userData.simId
      const root = rec.children.find(c => c.userData && c.userData.simId === sim.id);
      const idx = rec.children.indexOf(root); const blob = rec.children[idx - 1];
      let hips = null; root.traverse(n => { if (!hips && /hip/i.test(n.name || '')) hips = n; });
      const hv = new THREE.Vector3(); (hips || root).getWorldPosition(hv);
      return { type, key: k, ok, anim: sim.anim, phase: sim.queue[0] && sim.queue[0].phase, blob: [blob.position.x, blob.position.z].map(v => +v.toFixed(2)), hips: [hv.x, hv.z].map(v => +v.toFixed(2)), hipsName: hips && hips.name, off: +Math.hypot(hv.x - blob.position.x, hv.z - blob.position.z).toFixed(2) };
    }, [type, key]);
    r.shot = await L.shot(type);
    out.res.push(r);
  }
  return out;
}

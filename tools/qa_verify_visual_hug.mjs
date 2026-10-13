// VIS-7: hug/kiss interpenetration. Put Rita and Caio on adjacent tiles outdoors, queue hug then kiss, measure torso/head distance.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'hug');
  await L.dismissHelp(); await L.hideHud();
  await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.time.minute = 600;
    const [a, b] = s.sims; a.queue = []; b.queue = []; a.x = 19; a.y = 15; b.x = 20; b.y = 15; a.facing = Math.PI / 2; b.facing = -Math.PI / 2;
    a.relationships[b.id] = { daily: 80, lifetime: 80 }; b.relationships[a.id] = { daily: 80, lifetime: 80 };
    for (const sim of [a, b]) for (const k in sim.motives) sim.motives[k] = 60; });
  const out = { socials: await L.ev(() => { const M = window.__morada.M, s = window.__morada.state; return (M.engine.getSocials(s.sims[0].id, s.sims[1].id) || []).map(x => x.key + (x.disabled ? '(x)' : '')); }) };
  out.res = [];
  for (const key of ['hug', 'kiss']) {
    const r = await L.ev(async (key) => {
      const M = window.__morada.M, s = window.__morada.state; const [a, b] = s.sims;
      a.queue = []; b.queue = []; a.x = 19; a.y = 15; b.x = 20; b.y = 15; a.anim = 'idle'; b.anim = 'idle';
      const ok = M.engine.queueSocial(a.id, b.id, key, 'player');
      let n = 0, seen = null; while (n++ < 400) { M.engine.update(0.25); if (a.anim === key || b.anim === key) { seen = n; break; } }
      M.main.setSpeed(1); await new Promise(r => setTimeout(r, 900)); M.main.setSpeed(0);
      M.render.setCamera({ k: 0, x: 20, z: 15.5, dist: 6 });
      await new Promise(r => setTimeout(r, 400));
      const chars = M.render.scene.getObjectByName('chars');
      const pos = (sim, part) => { const root = chars.children.find(c => c.userData && c.userData.simId === sim.id); let p = null; root.traverse(n => { if (!p && n.name === part) p = n; }); const v = new THREE.Vector3(); (p || root).getWorldPosition(v); return v; };
      const ha = pos(a, 'head'), hb = pos(b, 'head'), ta = pos(a, 'hips'), tb = pos(b, 'hips');
      const hc = (sim) => { const root = chars.children.find(c => c.userData && c.userData.simId === sim.id); let p = null; root.traverse(n => { if (!p && n.name === 'head') p = n; }); return p.localToWorld(new THREE.Vector3(0, 0.13, 0)); };
      const chestBox = (sim) => { const root = chars.children.find(c => c.userData && c.userData.simId === sim.id); let sp = null; root.traverse(n => { if (!sp && n.name === 'spine') sp = n; }); const bx = new THREE.Box3(); sp.children.forEach(ch => { if (ch.isMesh) bx.expandByObject(ch); }); return bx; };
      const ca = chestBox(a), cb = chestBox(b);
      const inter = ca.clone().intersect(cb); const iv = inter.isEmpty() ? 0 : (inter.max.x - inter.min.x) * (inter.max.y - inter.min.y) * (inter.max.z - inter.min.z);
      const headCentreDist = +hc(a).distanceTo(hc(b)).toFixed(3);
      return { headCentreDist, headOverlap: +(0.31 - headCentreDist).toFixed(3), chestBoxA: [ca.min.x, ca.max.x, ca.min.z, ca.max.z].map(v => +v.toFixed(2)), chestBoxB: [cb.min.x, cb.max.x, cb.min.z, cb.max.z].map(v => +v.toFixed(2)), chestAabbIntersectX: inter.isEmpty() ? 0 : +(inter.max.x - inter.min.x).toFixed(3), key, ok, seen, animA: a.anim, animB: b.anim, simDist: +Math.hypot(a.x - b.x, a.y - b.y).toFixed(2), headDist: +ha.distanceTo(hb).toFixed(2), hipsDist: +Math.hypot(ta.x - tb.x, ta.z - tb.z).toFixed(2), a: [a.x, a.y].map(v => +v.toFixed(2)), b: [b.x, b.y].map(v => +v.toFixed(2)) };
    }, key);
    r.shot = await L.shot(key);
    await L.cam({ k: 1, x: 20, z: 15.5, dist: 6 }); await L.wait(400); r.shot2 = await L.shot(key + '-k1');
    out.res.push(r);
  }
  return out;
}

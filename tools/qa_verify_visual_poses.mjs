// VIS-12: bed relax vs sleep, armchair sit vs nap. VIS-13: phone call prop, cook stages. VIS-14: painting admire / mirror speech distance.
import { mk } from './qa_verify_visual_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'pose');
  await L.dismissHelp(); await L.hideHud();
  const buys = await L.ev(() => { const M = window.__morada.M; M.engine.setFreeWill(false); M.main.setSpeed(0); const s = window.__morada.state; s.money = 99999; s.time.minute = 600;
    const r = [];
    for (const [t, x, y, rot] of [['armchair', 19, 12, 0], ['bed_single', 20, 4, 0], ['bed_single', 19, 8, 0], ['bed_single', 3, 8, 0], ['painting_lux', 9, 13, 2], ['painting_lux', 8, 13, 2]]) { if (s.objects.some(o => o.type === t)) continue; const q = M.engine.buyObject(t, x, y, rot); r.push([t, x, y, rot, q && q.ok, q && q.reason]); }
    s.sims[1].x = 22; s.sims[1].y = 17; s.sims[1].queue = []; return r; });
  console.log('buys', JSON.stringify(buys));
  const run = (type, key, cam, tag, extraMin) => L.ev(async ([type, key, cam, extraMin]) => {
    const M = window.__morada.M, s = window.__morada.state; const sim = s.sims[0];
    for (const k in sim.motives) sim.motives[k] = 20; sim.motives.energy = -30; sim.motives.bladder = 90; sim.motives.hunger = 80;
    sim.queue = []; sim.anim = 'idle'; sim.asleep = false; sim.seated = false; sim.x = 18; sim.y = 15;
    const o = s.objects.filter(q => q.type === type).pop();
    const keys = (M.engine.getInteractions(sim.id, o.id) || []).map(i => i.key + (i.enabled === false ? '(x)' : ''));
    const ok = M.engine.queueInteraction(sim.id, o.id, key, 'player');
    let n = 0; while (n++ < 600 && !(sim.queue[0] && sim.queue[0].phase === 'do')) M.engine.update(0.5);
    M.engine.update(extraMin || 2);
    M.main.setSpeed(1); await new Promise(r => setTimeout(r, 1300)); M.main.setSpeed(0);
    M.render.setCamera(cam); await new Promise(r => setTimeout(r, 500));
    const chars = M.render.scene.getObjectByName('chars'); const root = chars.children.find(c => c.userData && c.userData.simId === sim.id);
    let head = null, hips = null; root.traverse(nd => { if (nd.name === 'head' && !head) head = nd; if (nd.name === 'hips' && !hips) hips = nd; });
    const hc = head.localToWorld(new THREE.Vector3(0, 0.13, 0)); const hp = new THREE.Vector3(); hips.getWorldPosition(hp);
    let blanket = false; root.traverse(nd => { if (/blanket/i.test(nd.name || '') && nd.visible) blanket = true; });
    return { type, key, keys, ok, anim: sim.anim, asleep: sim.asleep, phase: sim.queue[0] && sim.queue[0].phase, slot: sim.queue[0] && sim.queue[0].slot, pos: [sim.x, sim.y].map(v => +v.toFixed(2)), facing: +(+sim.facing).toFixed(2), headC: [hc.x, hc.y, hc.z].map(v => +v.toFixed(2)), hips: [hp.x, hp.y, hp.z].map(v => +v.toFixed(2)), blanket };
  }, [type, key, cam, extraMin]);
  const out = [];
  const cases = [
    ['bed_single', 'sleep', { k: 0, x: 20.5, z: 5, dist: 6 }, 'bed-sleep'],
    ['bed_single', 'relax', { k: 0, x: 20.5, z: 5, dist: 6 }, 'bed-relax'],
    ['armchair', 'sit', { k: 0, x: 19.5, z: 12.5, dist: 5 }, 'arm-sit'],
    ['armchair', 'nap', { k: 0, x: 19.5, z: 12.5, dist: 5 }, 'arm-nap'],
    ['phone', 'call_friend', { k: 0, x: 11.5, z: 13, dist: 5 }, 'phone-call'],
    ['painting_lux', 'admire', { k: 1, x: 9.5, z: 12.5, dist: 6 }, 'paint-admire'],
    ['mirror', 'speech', { k: 3, x: 14.5, z: 6.5, dist: 5 }, 'mirror-speech'],
  ];
  await L.walls('up');
  for (const [type, key, cam, tag] of cases) {
    const r = await run(type, key, cam, tag);
    r.shot = await L.shot(tag);
    out.push(r);
  }
  return out;
}

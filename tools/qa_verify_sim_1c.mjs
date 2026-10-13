// SIM-1 player-facing check: buy an arcade + stereo in the default house; over 6 days, how many hours do
// Rita/Caio spend on fun objects vs socials? Compare with Caio removed (Rita alone).
import { load } from './qa_verify_sim_lib.mjs';

function run(alone, seed) {
  const c = load({ seed });
  const { E, S, D } = c;
  if (alone) E.removeSim(S.sims.find((s) => s.name.startsWith('Caio')).id);
  // find free spots for an arcade and a stereo inside the house
  const bought = [];
  for (const type of ['arcade', 'stereo']) {
    let ok = false;
    for (let y = 6; y < 15 && !ok; y++) for (let x = 5; x < 19 && !ok; x++) for (let r = 0; r < 4 && !ok; r++) {
      const res = E.buyObject(type, x, y, r);
      if (res.ok) {
        // keep only if indoors (room has walls)
        const room = c.M.world.roomAt(x, y);
        const rr = c.M.world.rooms().find((q) => q.id === room);
        if (rr && rr.indoor) { ok = true; bought.push(type + '@' + x + ',' + y); } else E.sellObject(res.obj.id);
      }
    }
  }
  const t = {};
  for (let i = 0; i < 6 * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      if (s.visitor || s.hidden) continue;
      const n = s.name.split(' ')[0];
      const x = t[n] = t[n] || {};
      const a = s.queue[0];
      if (!a) continue;
      if (a.kind === 'social') { x.social = (x.social || 0) + 0.5; continue; }
      if (a.phase !== 'do') continue;
      const o = E.objectById(a.objId);
      if (o && ['arcade', 'stereo', 'tv_cheap', 'bookshelf'].includes(o.type)) x[o.type + ':' + a.interaction] = (x[o.type + ':' + a.interaction] || 0) + 0.5;
    }
  }
  console.log(`${alone ? 'Rita alone ' : 'Rita + Caio'} seed ${seed} bought ${bought.join(' ')}:`);
  for (const n in t) console.log('   ' + n.padEnd(5), Object.entries(t[n]).map(([k, v]) => k + ' ' + (v / 60 / 6).toFixed(2) + 'h/d').join(', '));
}
for (const seed of [1, 2]) { run(false, seed); run(true, seed); }

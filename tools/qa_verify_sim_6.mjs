// SIM-6 verify: a character standing on a blocked (furniture) tile while doing a social / idle,
// i.e. not seated in a real 'do' phase of an on-slot action. Natural runs over several seeds.
import { load, stamp } from './qa_verify_sim_lib.mjs';

const seeds = (process.argv[2] || '1,2,3,4,5,6').split(',').map(Number);
const days = +(process.argv[3] || 8);
for (const seed of seeds) {
  const c = load({ seed });
  const { E, M, S } = c;
  const W = M.world;
  let samples = 0;
  const episodes = [];
  const open = new Map();
  const prevHead = new Map();
  for (let i = 0; i < days * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      if (s.hidden) continue;
      const a = s.queue[0];
      const tx = Math.round(s.x), ty = Math.round(s.y);
      const blocked = !W.isWalkable(tx, ty);
      const legit = a && a.kind === 'object' && (a.phase === 'do' || a.phase === 'enter' || a.phase === 'exit' || (a.phase === 'walk' && a.slot && a.slot.on));
      const bad = blocked && !legit && !(a && a.effect === 'faint');
      if (bad) {
        samples++;
        const o = W.objectAt(tx, ty);
        let ep = open.get(s.id);
        if (!ep) { ep = { name: s.name.split(' ')[0], at: stamp(S), pos: s.x.toFixed(2) + ',' + s.y.toFixed(2), obj: o && o.type, what: a ? (a.kind === 'social' ? 's:' + a.interaction + (a.data && a.data.respond ? '(R)' : '') + '/' + a.phase : a.interaction + '/' + a.phase) : 'idle', prev: prevHead.get(s.id), len: 0 }; open.set(s.id, ep); episodes.push(ep); }
        ep.len += 0.5;
      } else open.delete(s.id);
      if (a) prevHead.set(s.id, (a.kind === 'social' ? 's:' + a.interaction : a.interaction) + '/' + a.phase);
    }
  }
  const long = episodes.filter((e) => e.len >= 2);
  console.log(`seed ${seed}: ${samples} half-min samples on furniture outside an on-slot action; ${episodes.length} episodes (${long.length} >= 2 min)`);
  for (const e of long.slice(0, 5)) console.log(`   ${e.at} ${e.name} @${e.pos} on ${e.obj} doing ${e.what} for ${e.len} min`);
}

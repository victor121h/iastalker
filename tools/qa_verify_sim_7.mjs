// SIM-7 verify: two visible characters (household or visitors) standing on the same spot (< 0.35 tiles apart),
// both not walking, for >= 2 sim-minutes. Natural runs, default family, several seeds.
// Also SIM-15: minutes per day a social initiator waits in 'enter' (partner busy).
import { load, stamp } from './qa_verify_sim_lib.mjs';

const seeds = (process.argv[2] || '1,2,3,4').split(',').map(Number);
const days = +(process.argv[3] || 8);
const desc = (s) => { const a = s.queue[0]; if (!a) return 'idle'; return (a.kind === 'social' ? 's:' + a.interaction + (a.data && a.data.respond ? '(R)' : '') : (a.effect || a.interaction)) + '/' + a.phase; };
for (const seed of seeds) {
  const c = load({ seed });
  const { E, S } = c;
  const open = new Map(); const eps = [];
  const wait = {};
  for (let i = 0; i < days * 1440 * 2; i++) {
    E.update(0.5);
    const vis = S.sims.filter((s) => !s.hidden);
    const seen = new Set();
    for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
      const p = vis[a], q = vis[b];
      const moving = (s) => s.queue[0] && s.queue[0].phase === 'walk';
      if (Math.hypot(p.x - q.x, p.y - q.y) < 0.35 && !moving(p) && !moving(q)) {
        const k = p.id + '-' + q.id; seen.add(k);
        let e = open.get(k);
        if (!e) { e = { at: stamp(S), pos: p.x.toFixed(2) + ',' + p.y.toFixed(2), p: p.name.split(' ')[0] + ':' + desc(p), q: q.name.split(' ')[0] + ':' + desc(q), len: 0 }; open.set(k, e); eps.push(e); }
        e.len += 0.5;
      }
    }
    for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
    for (const s of S.sims) {
      if (s.visitor || s.hidden) continue;
      const a = s.queue[0];
      if (a && a.kind === 'social' && !(a.data && a.data.respond) && a.phase === 'enter') wait[s.name] = (wait[s.name] || 0) + 0.5;
    }
  }
  const long = eps.filter((e) => e.len >= 2);
  const total = long.reduce((t, e) => t + e.len, 0);
  console.log(`seed ${seed}: ${long.length} stationary overlaps >= 2 min, total ${total} min over ${days} days`);
  for (const e of long.sort((a, b) => b.len - a.len).slice(0, 4)) console.log(`   ${e.at} @${e.pos} ${e.len} min  ${e.p}  |  ${e.q}`);
  console.log('   social-initiator waiting in enter (min/day):', Object.entries(wait).map(([n, v]) => n.split(' ')[0] + ' ' + (v / days).toFixed(1)).join(', '));
}

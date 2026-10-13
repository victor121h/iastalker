// SIM-14 verify: JSON save -> load (fresh engine) while a character is on a blocked tile mid-action.
// Scans a natural run; at every state where a visible sim stands on a non-walkable tile, round-trips the state
// through JSON into a new engine and reports position jumps > 0.3 tiles.
import { load, stamp, head } from './qa_verify_sim_lib.mjs';

const c = load({ seed: +(process.argv[2] || 1) });
const { E, M, S } = c;
const W = M.world;
let checks = 0; const jumps = []; const kinds = {};
for (let i = 0; i < 8 * 1440 * 2; i++) {
  E.update(0.5);
  for (const s of S.sims) {
    if (s.hidden) continue;
    const tx = Math.round(s.x), ty = Math.round(s.y);
    if (W.isWalkable(tx, ty)) continue;
    const a = s.queue[0];
    const k = a ? (a.kind === 'social' ? 'social' + (a.data && a.data.respond ? '(R)' : '') : 'object') + '/' + a.phase + (a.slot && a.slot.on ? '/on' : '') : 'idle';
    if (kinds[k] && kinds[k] > 30) continue;   // sample a few of each kind
    kinds[k] = (kinds[k] || 0) + 1;
    checks++;
    const json = JSON.stringify(S);
    const c2 = load(null);
    c2.E.init(JSON.parse(json));
    const s2 = c2.E.state.sims.find((x) => x.id === s.id);
    const d = Math.hypot(s2.x - s.x, s2.y - s.y);
    if (d > 0.3) jumps.push(`${stamp(S)} ${s.name.split(' ')[0]} ${k} [${head(s)}] from (${s.x.toFixed(2)},${s.y.toFixed(2)}) to (${s2.x},${s2.y})`);
  }
}
console.log('round-trips on blocked tiles:', checks, 'by state:', JSON.stringify(kinds));
console.log('position jumps:', jumps.length);
const seen = new Set();
for (const j of jumps) { const k = j.split(' ').slice(3, 4).join(); if (seen.has(k)) continue; seen.add(k); console.log('  ' + j); }

// SIM-12 verify: free will OFF, default family, 6 days, no player input.
// Logs sleep sessions (count, short ones), faints, hospital trips and work-return motives.
import { load, stamp, abs } from './qa_verify_sim_lib.mjs';

for (const seed of [7, 3]) {
  const c = load({ seed });
  const { E, S, notes } = c;
  E.setFreeWill(false);
  const st = {};
  const was = new Map();
  for (let i = 0; i < 6 * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      if (s.visitor) continue;
      const n = s.name.split(' ')[0];
      const t = st[n] = st[n] || { sleeps: [], cur: null, returns: [] };
      const a = s.queue[0];
      const sl = a && a.effect === 'sleep' && a.phase === 'do';
      if (sl && (!t.cur || t.cur.id !== a.id)) t.cur = { id: a.id, at: stamp(S), start: abs(S), h0: Math.round(s.motives.hunger), b0: Math.round(s.motives.bladder) };
      if (!sl && t.cur) { t.cur.len = abs(S) - t.cur.start; t.cur.h1 = Math.round(s.motives.hunger); t.cur.b1 = Math.round(s.motives.bladder); t.sleeps.push(t.cur); t.cur = null; }
      if (was.get(s.id) && !s.hidden && s.career !== undefined) t.returns.push(`${stamp(S)} hunger ${Math.round(s.motives.hunger)} energy ${Math.round(s.motives.energy)}`);
      was.set(s.id, s.hidden && s.atWork);
    }
  }
  console.log(`== seed ${seed} (free will off)`);
  for (const n in st) {
    const t = st[n];
    const short = t.sleeps.filter((x) => x.len < 15);
    console.log(`  ${n}: ${t.sleeps.length} sleeps, ${short.length} shorter than 15 min, total ${(t.sleeps.reduce((a, x) => a + x.len, 0) / 60).toFixed(1)} h`);
    for (const x of short.slice(0, 6)) console.log(`     short sleep ${x.at} ${x.len} min hunger ${x.h0}->${x.h1} bladder ${x.b0}->${x.b1}`);
    if (t.returns.length) console.log('     work returns: ' + t.returns.join(' | '));
  }
  for (const nt of notes) if (/desmai|emergência|demit|faltou|perdeu/.test(nt.text)) console.log('  ' + nt.t + ' ' + nt.text);
}

// SIM-11 natural frequency: household with money pinned at 0 (no food possible after the starting meal), 5 days.
// Counts social initiator waits in 'enter' >= 10 min whose target had a critical motive, and respond re-pushes.
import { load, stamp } from './qa_verify_sim_lib.mjs';
for (const seed of [1, 2, 3]) {
  const c = load({ seed });
  const { E, S } = c;
  const waits = new Map(); const long = [];
  for (let i = 0; i < 5 * 1440 * 2; i++) {
    S.money = 0;
    E.update(0.5);
    for (const s of S.sims) {
      if (s.hidden) continue;
      const a = s.queue[0];
      if (a && a.kind === 'social' && !(a.data && a.data.respond) && a.phase === 'enter') {
        const t = S.sims.find((x) => x.id === a.targetSimId);
        const crit = t && (t.motives.hunger <= -85 || t.motives.bladder <= -85 || t.motives.energy <= -90);
        let w = waits.get(a.id); if (!w) { w = { at: stamp(S), who: s.name.split(' ')[0], tgt: t && t.name.split(' ')[0], key: a.interaction, len: 0, crit: false }; waits.set(a.id, w); }
        w.len += 0.5; w.crit = w.crit || crit;
      }
    }
  }
  for (const w of waits.values()) if (w.len >= 10) long.push(w);
  console.log(`seed ${seed}: waits >= 10 min: ${long.length}, of which target critical: ${long.filter((w) => w.crit).length}  ${long.filter((w) => w.crit).slice(0, 4).map((w) => w.at + ' ' + w.who + '->' + w.tgt + ' ' + w.key + ' ' + w.len + 'm').join('; ')}`);
}

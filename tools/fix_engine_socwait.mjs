// Fix check (engine, SIM-15): length of each social 'enter' phase (initiator standing and waiting for the partner).
// Reports the longest streaks and how many exceed 3 sim-minutes. Usage: node tools/fix_engine_socwait.mjs
import { boot } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
let bad = 0;
for (const sc of ['default', 'four_empty']) {
  const ctx = sc === 'default' ? boot({ seed: 1 }) : makeScenario(sc, 7);
  const { E } = ctx;
  const cur = new Map(), streaks = [];
  for (let i = 0; i < 7 * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of E.state.sims) {
      if (s.visitor || s.hidden) continue;
      const a = s.queue[0];
      const inEnter = a && a.kind === 'social' && !a.data.respond && a.phase === 'enter' && a.source === 'auto';
      const c = cur.get(s.id);
      if (inEnter) { if (c && c.id === a.id) c.len += 0.5; else cur.set(s.id, { id: a.id, len: 0.5, name: s.name, key: a.interaction }); }
      else if (c) { streaks.push(c); cur.delete(s.id); }
    }
  }
  streaks.sort((a, b) => b.len - a.len);
  const over = streaks.filter((x) => x.len > 3).length;
  if (streaks.length && streaks[0].len > 6) bad++;
  console.log(sc, 'attempts', streaks.length, '| >3 min:', over, '| longest:', streaks.slice(0, 4).map((x) => x.name.split(' ')[0] + ' ' + x.key + ' ' + x.len + 'm').join(', '));
}
console.log(bad ? 'FAILURES: ' + bad : 'ALL OK');

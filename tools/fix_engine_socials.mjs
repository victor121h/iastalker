// Fix check (engine, SIM-1 + social fatigue): socials INITIATED per person per week (reached 'do'), by key,
// plus hours/day on fun objects. Usage: node tools/fix_engine_socials.mjs
import { boot, category } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
let bad = 0;
for (const sc of ['default', 'four_empty']) {
  const ctx = sc === 'default' ? boot({ seed: 1 }) : makeScenario(sc, 7);
  const { E, M } = ctx;
  const seen = new Set(), per = {}, funH = {};
  const days = 7;
  for (let i = 0; i < days * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of E.state.sims) {
      if (s.visitor || s.hidden) continue;
      const a = s.queue[0];
      if (a && a.kind === 'social' && !(a.data && a.data.respond) && a.phase === 'do' && !seen.has(a.id)) {
        seen.add(a.id);
        const p = per[s.name] = per[s.name] || {};
        p[a.interaction] = (p[a.interaction] || 0) + 1;
      }
      if (category(s, M) === 'fun') funH[s.name] = (funH[s.name] || 0) + 0.5 / 60;
    }
  }
  for (const n in per) {
    const p = per[n];
    const tot = Object.values(p).reduce((a, b) => a + b, 0);
    const dance = p.dance || 0;
    // default family: a few dances a week; four_empty (4 adults, almost no fun objects): still bounded
    if (dance > (sc === 'default' ? 10 : 25)) bad++;
    console.log(sc, n.padEnd(12), 'initiated/week', tot, JSON.stringify(p), '| fun objects h/day', ((funH[n] || 0) / days).toFixed(1));
  }
}
console.log(bad ? 'FAILURES: ' + bad : 'ALL OK');

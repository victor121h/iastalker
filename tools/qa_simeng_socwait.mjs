// QA: minutes per character spent standing in a social's 'enter' phase (waiting for a busy partner) and
// social attempts that end without the social starting.
import { boot } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
for (const sc of ['default', 'four_empty']) {
  const ctx = sc === 'default' ? boot({ seed: 1 }) : makeScenario(sc, 7);
  const { E } = ctx;
  const wait = {}, total = {};
  for (let i = 0; i < 7 * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of E.state.sims) {
      if (s.visitor || s.hidden) continue;
      const a = s.queue[0];
      if (a && a.kind === 'social' && !a.data.respond && a.phase === 'enter') wait[s.name] = (wait[s.name] || 0) + 0.5;
      if (a && a.kind === 'social' && !a.data.respond) total[s.name] = (total[s.name] || 0) + 0.5;
    }
  }
  console.log(sc, Object.keys(wait).map((k) => `${k}: ${(wait[k] / 7).toFixed(0)} min/day waiting in social 'enter' (of ${(total[k] / 7).toFixed(0)} min/day initiating socials)`).join('; '));
}

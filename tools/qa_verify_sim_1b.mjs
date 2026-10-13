// SIM-1 verify part B2: in natural play (default + 4-member empty lot w/ furniture), how often are
// comfort / fun / energy low while awake & at home, and what is the character doing at those moments?
import { load } from './qa_verify_sim_lib.mjs';

function run(label, c, days) {
  const { E, S, D } = c;
  const st = {};
  for (let i = 0; i < days * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      if (s.visitor || s.hidden || s.asleep) continue;
      const t = st[s.name] = st[s.name] || { awake: 0, comfLow: 0, funLow: 0, enLow: 0, doing: {} };
      t.awake += 0.5;
      const a = s.queue[0];
      const what = !a ? 'idle' : a.kind === 'social' ? 'social' : a.kind === 'walk' ? 'walk' : a.interaction;
      for (const [k, thr, key] of [['comfort', -50, 'comfLow'], ['fun', -50, 'funLow'], ['energy', -70, 'enLow']]) {
        if (s.motives[k] <= thr) {
          t[key] += 0.5;
          const dk = key + ':' + what;
          t.doing[dk] = (t.doing[dk] || 0) + 0.5;
        }
      }
    }
  }
  console.log('==', label);
  for (const n in st) {
    const t = st[n];
    const top = Object.entries(t.doing).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + v + 'm').join(', ');
    console.log(`  ${n.padEnd(14)} awake ${(t.awake / 60).toFixed(0)}h  comfort<=-50 ${(t.comfLow / 60).toFixed(1)}h  fun<=-50 ${(t.funLow / 60).toFixed(1)}h  energy<=-70 ${(t.enLow / 60).toFixed(1)}h`);
    console.log('     ' + top);
  }
}
for (const seed of [1, 2]) run('default seed ' + seed, load({ seed }), 7);
import { makeScenario } from './qa_simeng_scenarios.mjs';
for (const sc of ['four_empty', 'four_starter']) {
  const ctx = makeScenario(sc, 7);
  run(sc + ' seed 7', { E: ctx.E, S: ctx.E.state, D: ctx.M.data }, 7);
}

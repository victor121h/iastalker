// QA: print the action log of one character for a scenario. Usage: node tools/qa_simeng_log.mjs <scen> <seed> <days> <namePrefix> [keyFilter]
import { monitor, fmt } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
const [scen, seed, days, name, filt] = process.argv.slice(2);
const ctx = makeScenario(scen, +seed);
const R = monitor(ctx, { days: +days });
const nm = Object.keys(R.actions).find((n) => n.startsWith(name));
for (const e of R.actions[nm].__log) {
  if (filt && !new RegExp(filt).test(e.key)) continue;
  console.log(fmt(ctx.E, e.t), '->', fmt(ctx.E, e.end), (e.end - e.t).toFixed(1).padStart(6), e.key, e.src, e.failed ? 'FAILED' : '', e.didDo ? 'did' : 'nodo', e.phase);
}

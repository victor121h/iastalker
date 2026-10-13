// QA scenarios for simulation correctness. Usage: node tools/qa_simeng_scen.mjs <scenario> [--days 8] [--seed 7] [--verbose] [--saveload N]
// scenarios: single, single_job, four_empty, four_starter, nofreewill, noneeds, nobed, nofridge, notoilet
import { monitor, summarize } from './qa_simeng_lib.mjs';
import { makeScenario } from './qa_simeng_scenarios.mjs';
const args = process.argv.slice(2);
const scen = args[0] || 'single';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const days = +opt('days', '8');
const seed = +opt('seed', '7');
const sl = +opt('saveload', '0');

const ctx = makeScenario(scen, seed);
const R = monitor(ctx, { days, saveLoadEvery: sl, label: `${scen} seed ${seed}, ${days} days${sl ? ', save/load every ' + sl : ''}` });
console.log(summarize(ctx, R, { verbose: args.includes('--verbose') }));

// QA: default family, N days, several seeds. Usage: node tools/qa_simeng_default.mjs [--days 8] [--seeds 1,2,3] [--saveload 0] [--verbose]
import { boot, monitor, summarize } from './qa_simeng_lib.mjs';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const days = +opt('days', '8');
const seeds = opt('seeds', '1,2,3').split(',').map(Number);
const sl = +opt('saveload', '0');
for (const seed of seeds) {
  const ctx = boot({ seed });
  const R = monitor(ctx, { days, saveLoadEvery: sl, label: `default family seed ${seed}, ${days} days${sl ? ', save/load every ' + sl + ' min' : ''}` });
  console.log(summarize(ctx, R, { verbose: args.includes('--verbose') }));
}

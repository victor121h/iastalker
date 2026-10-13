// QA: average hours per day by activity (days 2..8) for the default family, seeds 1-5.
import { boot, monitor } from './qa_simeng_lib.mjs';
const acc = {};
let n = 0;
for (const seed of [1, 2, 3, 4, 5]) {
  const ctx = boot({ seed });
  const R = monitor(ctx, { days: 8 });
  for (let d = 2; d <= 8; d++) for (const name in R.budget[d]) {
    acc[name] = acc[name] || {};
    for (const k in R.budget[d][name]) acc[name][k] = (acc[name][k] || 0) + R.budget[d][name][k];
  }
  n += 7;
}
for (const name in acc) console.log(name.padEnd(12), Object.entries(acc[name]).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (v / 60 / n).toFixed(1)).join(' | '));

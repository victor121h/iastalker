// Engine cost vs number of objects: starter house + N extra purchased objects scattered on the lot,
// 4 household members. Measures ms per sim-day, worst single 0.5-min step, and world.ensure() signature cost.
import { load } from './qa_cr_lib.mjs';
const types = ['plant_small', 'lamp_floor', 'chair_wood', 'end_table', 'sculpture', 'table_small', 'bookshelf', 'counter', 'tv_cheap', 'armchair'];
for (const extra of [0, 60, 150, 250]) {
  const { M } = load({ quiet: true });
  const E = M.engine, W = M.world;
  const st = E.newGame({ seed: 9 });
  st.money = 1e7;
  E.addSim({}); E.addSim({});
  let placed = 0;
  for (let y = 0; y < 19 && placed < extra; y++) for (let x = 0; x < 24 && placed < extra; x++) {
    if ((x + y) % 2) continue;
    if (E.buyObject(types[placed % types.length], x, y, (x + y) % 4).ok) placed++;
  }
  // count ensure() work: wrap isWalkable to count calls during one sim-hour
  let walkCalls = 0; const iw = W.isWalkable; W.isWalkable = function () { walkCalls++; return iw.apply(this, arguments); };
  const t0 = performance.now(); let worst = 0;
  for (let i = 0; i < 1440 * 2; i++) { const a = performance.now(); E.update(0.5); const d = performance.now() - a; if (d > worst) worst = d; }
  const ms = performance.now() - t0;
  W.isWalkable = iw;
  console.log(JSON.stringify({ extraObjects: placed, totalObjects: st.objects.length, msPerSimDay: Math.round(ms), worstStepMs: +worst.toFixed(1), isWalkableCallsPerSimDay: walkCalls, realSecondsPerSimDayAtUltra30: +(1440 / 30).toFixed(0), engineShareOfFrameBudgetAt30x: +((ms / (1440 / 30)) / 1000 * 100).toFixed(1) + '%' }));
}

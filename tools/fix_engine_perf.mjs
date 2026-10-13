// Fix check (engine, CR-6): engine CPU per sim-day and the slowest 0.5-min steps with ~240 objects, measured with
// process.cpuUsage (so other processes on the machine do not inflate it). Also lists the 3 slowest steps' clock time.
// Usage: node tools/fix_engine_perf.mjs [extraObjects=207]
import { load } from './qa_cr_lib.mjs';
const extra = +(process.argv[2] || 207);
const types = ['plant_small', 'lamp_floor', 'chair_wood', 'end_table', 'sculpture', 'table_small', 'bookshelf', 'counter', 'tv_cheap', 'armchair'];
const { M } = load({ quiet: true });
const E = M.engine;
const st = E.newGame({ seed: 9 });
st.money = 1e7;
E.addSim({}); E.addSim({});
let placed = 0;
for (let y = 0; y < 19 && placed < extra; y++) for (let x = 0; x < 24 && placed < extra; x++) {
  if ((x + y) % 2) continue;
  if (E.buyObject(types[placed % types.length], x, y, (x + y) % 4).ok) placed++;
}
const steps = [];
const c0 = process.cpuUsage();
for (let i = 0; i < 1440 * 2; i++) {
  const a = process.cpuUsage();
  E.update(0.5);
  const d = process.cpuUsage(a);
  steps.push({ ms: (d.user + d.system) / 1000, t: M.util.fmtTime(st.time.minute) });
}
const c = process.cpuUsage(c0);
steps.sort((a, b) => b.ms - a.ms);
const p99 = steps[Math.floor(steps.length * 0.01)].ms;
console.log(JSON.stringify({ objects: st.objects.length, cpuMsPerSimDay: Math.round((c.user + c.system) / 1000), p99StepMs: +p99.toFixed(1), worst: steps.slice(0, 3).map((s) => s.t + ' ' + s.ms.toFixed(1) + 'ms') }));

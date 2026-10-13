// Long autonomous run: state JSON audit (NaN/undefined/non-plain), size growth per day, engine time per sim-day,
// exceptions (debug.throwErrors), counts of objects by type. Usage: node tools/qa_cr_longrun.mjs [days] [seed] [empty]
import { load, auditJSON } from './qa_cr_lib.mjs';
const DAYS = +(process.argv[2] || 10), SEED = +(process.argv[3] || 3), EMPTY = process.argv[4] === 'empty';
const { M } = load({ quiet: true });
const E = M.engine;
let errors = 0;
const st = EMPTY ? E.newGame({ empty: true, seed: SEED, members: [{ name: 'A B' }, { name: 'C B' }] }) : E.newGame({ seed: SEED });
E.debug.throwErrors = true;
const sizes = [];
const t0 = Date.now();
let maxStepMs = 0;
for (let d = 0; d < DAYS; d++) {
  const ts = Date.now();
  for (let i = 0; i < 1440 * 2; i++) {
    const a = performance.now();
    try { E.update(0.5); } catch (e) { errors++; if (errors < 5) console.log('EXC day', st.time.day, e.stack.split('\n').slice(0, 4).join(' | ')); E.debug.throwErrors = false; E.update(0.5); E.debug.throwErrors = true; }
    const b = performance.now() - a; if (b > maxStepMs) maxStepMs = b;
  }
  const json = JSON.stringify(st);
  const bytes = Buffer.byteLength(json, 'utf8');
  sizes.push({ day: st.time.day, chars: json.length, bytes, ms: Date.now() - ts, objs: st.objects.length, sims: st.sims.length, money: st.money, bills: st.bills.length });
}
const audit = auditJSON(st);
const round = JSON.parse(JSON.stringify(st));
const byType = {};
for (const o of st.objects) byType[o.type] = (byType[o.type] || 0) + 1;
const biggest = Object.entries(st).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 6);
const simData = st.sims.map(s => ({ name: s.name, dataKeys: Object.keys(s.data || {}).length, dataLen: JSON.stringify(s.data).length, lockouts: Object.keys(s.lockouts || {}).length, rels: Object.keys(s.relationships || {}).length, q: s.queue.length, careers: s.career && s.career.level }));
console.log(JSON.stringify({ days: DAYS, totalMs: Date.now() - t0, maxStepMs: +maxStepMs.toFixed(2), errors, lastError: E.debug.lastError && String(E.debug.lastError), auditIssues: audit.slice(0, 20), auditCount: audit.length, sizes, byType, biggest, simData }, null, 1));

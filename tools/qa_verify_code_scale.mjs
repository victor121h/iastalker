// qa_verify_code: CR-6. Engine CPU per sim day vs object count (starter house + N purchased objects spread over the lot,
// 4 residents, free will on). Variant "cheapEnsure" loads an IN-MEMORY copy of world.js whose ensure() skips objSig
// (game files are not modified) to quantify how much of the cost objSig is.
// Usage: node tools/qa_verify_code_scale.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './qa_verify_code_lib.mjs';

function load(cheap) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, setTimeout, clearTimeout, Promise, performance };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) {
    let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (cheap && f === 'js/world.js') {
      const before = src;
      src = src.replace('objs.length !== cObjLen || objSig(objs) !== cObjSig', 'objs.length !== cObjLen');
      if (src === before) throw new Error('patch point not found');
    }
    vm.runInContext(src, ctx, { filename: f });
  }
  return ctx.M;
}

const TYPES = ['plant_small', 'lamp_floor', 'chair_wood', 'table_small', 'end_table', 'plant_big', 'bookshelf', 'sofa_cheap', 'tv_cheap', 'lamp_fancy', 'sculpture', 'counter'];
function run(extra, cheap) {
  const M = load(cheap);
  const E = M.engine;
  const st = E.newGame({ seed: 21 });
  st.money = 10_000_000;
  E.addSim({ name: 'Ana Alves', gender: 'f' }); E.addSim({ name: 'Beto Alves', gender: 'm' });
  let placed = 0, tries = 0;
  const rnd = M.util.rng(99);
  while (placed < extra && tries < extra * 60) {
    tries++;
    const t = TYPES[placed % TYPES.length];
    const x = Math.floor(rnd() * st.lot.w), y = Math.floor(rnd() * (st.lot.h - 2)), rot = Math.floor(rnd() * 4);
    const r = E.buyObject(t, x, y, rot);
    if (r && r.ok) placed++;
  }
  const n = st.objects.length;
  st.time.minute = 6 * 60;
  let worst = 0, total = 0;
  const steps = 1440 * 2;
  for (let i = 0; i < steps; i++) {
    const t0 = performance.now();
    E.update(0.5);
    const dt = performance.now() - t0;
    total += dt; if (dt > worst) worst = dt;
  }
  return { objects: n, residents: E.household().length, msPerSimDay: Math.round(total), worstStepMs: +worst.toFixed(1), cpuShareAt30x: (total / 48000 * 100).toFixed(1) + '%', cpuShareAt10x: (total / 144000 * 100).toFixed(1) + '%' };
}

const rows = [];
for (const extra of [0, 60, 120, 180]) {
  rows.push(Object.assign({ variant: 'real' }, run(extra, false)));
  rows.push(Object.assign({ variant: 'cheapEnsure(in-memory)' }, run(extra, true)));
}
console.table(rows);

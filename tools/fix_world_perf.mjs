// CR-6 (world side) benchmark: a large 48x48 house (20 rooms) with ~150 objects and 4 residents.
// Compares the original world.js (tools/fix_world_snap/world_orig.js) with the current js/world.js,
// both running against the SAME engine/data/util (snapshot in tools/fix_world_snap/, or --live for js/).
// Usage: node tools/fix_world_perf.mjs [--live] [--only orig|new] [--days 1] [--objects 150] [--scenario big|starter]
//   big     (default): 48x48 lot, 20-room house, ~150 objects, 4 residents
//   starter: the QA CR-6 setup (tools/qa_cr_scale.mjs): starter house + N extra objects, 4 residents
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LIVE = args.includes('--live');
const ONLY = arg('--only', null);
const DAYS = +arg('--days', 1);
const NOBJ = +arg('--objects', 150);
const SCEN = arg('--scenario', 'big');

function load(worldVariant) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, setTimeout, clearTimeout, Promise, performance };
  ctx.window = ctx;
  vm.createContext(ctx);
  const snap = (f) => path.join(ROOT, 'tools/fix_world_snap', f);
  const files = [
    LIVE ? path.join(ROOT, 'js/util.js') : snap('util.js'),
    LIVE ? path.join(ROOT, 'js/data.js') : snap('data.js'),
    worldVariant === 'orig' ? snap('world_orig.js') : path.join(ROOT, 'js/world.js'),
    LIVE ? path.join(ROOT, 'js/engine.js') : snap('engine.js'),
  ];
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.M;
}

function buildBigHouse(M) {
  const E = M.engine, W = M.world;
  const st = E.newGame({ seed: 5, empty: true, members: [{ name: 'Ana Souza', gender: 'f' }] });
  // replace the lot with a 48x48 one
  const LW = 48, LH = 48;
  st.lot = { w: LW, h: LH, floors: new Array(LW * LH).fill(0), walls: {} };
  st.objects = [];
  for (let x = 0; x < LW; x++) st.lot.floors[(LH - 1) * LW + x] = 3;   // sidewalk
  st.sims.forEach((s) => { s.x = 24; s.y = 45; s.queue = []; });
  E.init(st);
  st.money = 1e8;
  E.buyObject('mailbox', 24, 46, 2);
  if (!st.objects.some((o) => o.type === 'mailbox')) st.objects.push({ id: 9999, type: 'mailbox', x: 24, y: 46, rot: 2, dirty: 0, broken: false, price: 0, uses: 0, boughtDay: 1 });
  // house: x 4..43, y 4..39 split into 5 x 4 rooms (8 x 9 tiles), doors between neighbours
  const X0 = 4, Y0 = 4, RW = 8, RH = 9, NX = 5, NY = 4;
  const set = (k, t) => { st.lot.walls[k] = { t, c: 0 }; };
  for (let ry = 0; ry < NY; ry++) {
    for (let rx = 0; rx < NX; rx++) {
      const x0 = X0 + rx * RW, y0 = Y0 + ry * RH;
      for (const k of W.edgesOfRect(x0, y0, x0 + RW - 1, y0 + RH - 1)) set(k, 1);
    }
  }
  for (let ry = 0; ry < NY; ry++) {
    for (let rx = 0; rx < NX; rx++) {
      const x0 = X0 + rx * RW, y0 = Y0 + ry * RH;
      if (rx < NX - 1) set('v,' + (x0 + RW) + ',' + (y0 + 4), 2);
      if (ry < NY - 1) set('h,' + (x0 + 3) + ',' + (y0 + RH), 2);
      if (ry === 0) set('h,' + (x0 + 5) + ',' + y0, 3);
      if (rx === 0) set('v,' + x0 + ',' + (y0 + 2), 3);
    }
  }
  set('h,' + (X0 + 2 * RW + 3) + ',' + (Y0 + NY * RH), 2);   // front door (south)
  for (let y = Y0; y < Y0 + NY * RH; y++) for (let x = X0; x < X0 + NX * RW; x++) st.lot.floors[y * LW + x] = 1;
  W.rebuild();
  const types = ['bed_single', 'fridge_cheap', 'stove', 'counter', 'toilet', 'shower', 'sink', 'sofa_cheap', 'chair_wood',
    'lamp_floor', 'plant_small', 'tv_cheap', 'bookshelf', 'table_small', 'end_table', 'armchair', 'computer', 'plant_big',
    'counter', 'chair_wood', 'lamp_floor', 'easel', 'stereo', 'trash_can', 'bed_double'];
  const rnd = M.util.rng(1234);
  let tries = 0;
  while (st.objects.length < NOBJ && tries++ < NOBJ * 200) {
    const t = types[st.objects.length % types.length];
    const x = X0 + Math.floor(rnd() * NX * RW), y = Y0 + Math.floor(rnd() * NY * RH), r = Math.floor(rnd() * 4);
    E.buyObject(t, x, y, r);
  }
  while (E.household().length < 4) E.addSim({});
  for (const s of E.household()) { s.x = 22; s.y = 30; s.queue = []; }
  st.time.minute = 7 * 60;
  return st;
}

function buildStarter(M) {
  const E = M.engine;
  const types = ['plant_small', 'lamp_floor', 'chair_wood', 'end_table', 'sculpture', 'table_small', 'bookshelf', 'counter', 'tv_cheap', 'armchair'];
  const st = E.newGame({ seed: 9 });
  st.money = 1e7;
  E.addSim({}); E.addSim({});
  let placed = 0;
  for (let y = 0; y < 19 && placed < NOBJ; y++) for (let x = 0; x < 24 && placed < NOBJ; x++) {
    if ((x + y) % 2) continue;
    if (E.buyObject(types[placed % types.length], x, y, (x + y) % 4).ok) placed++;
  }
  return st;
}

function bench(variant) {
  const M = load(variant);
  const E = M.engine, W = M.world;
  const tb = performance.now();
  const st = SCEN === 'starter' ? buildStarter(M) : buildBigHouse(M);
  const tBuild = performance.now() - tb;
  // micro: world queries
  const rnd = M.util.rng(7);
  const pts = []; for (let i = 0; i < 4096; i++) pts.push([Math.floor(rnd() * st.lot.w), Math.floor(rnd() * st.lot.h)]);
  let acc = 0;
  let t0 = performance.now();
  for (let i = 0; i < 300000; i++) { const p = pts[i & 4095]; if (W.isWalkable(p[0], p[1])) acc++; }
  const isWalkableUs = (performance.now() - t0) / 300000 * 1000;
  t0 = performance.now();
  for (let i = 0; i < 300000; i++) { const p = pts[i & 4095]; acc += W.roomAt(p[0], p[1]); }
  const roomAtUs = (performance.now() - t0) / 300000 * 1000;
  t0 = performance.now();
  for (let i = 0; i < 200; i++) W.rebuild();
  const rebuildMs = (performance.now() - t0) / 200;
  t0 = performance.now();
  for (let i = 0; i < 200; i++) { W.rebuild(); W.roomAt(10, 10); }
  const rebuildRoomsMs = (performance.now() - t0) / 200;
  // engine: DAYS sim days
  let worst = 0; const steps = 2880 * DAYS;
  t0 = performance.now();
  for (let i = 0; i < steps; i++) { const a = performance.now(); E.update(0.5); const d = performance.now() - a; if (d > worst) worst = d; }
  const total = performance.now() - t0;
  return {
    world: variant, scenario: SCEN, objects: st.objects.length, residents: E.household().length, rooms: W.rooms().length,
    buildMs: Math.round(tBuild), isWalkableUs: +isWalkableUs.toFixed(3), roomAtUs: +roomAtUs.toFixed(3),
    rebuildMs: +rebuildMs.toFixed(3), rebuildPlusRoomsMs: +rebuildRoomsMs.toFixed(3),
    msPerSimDay: Math.round(total / DAYS), worstStepMs: +worst.toFixed(1), cpuAt30x: (total / DAYS / 48000 * 100).toFixed(1) + '%',
  };
}

const rows = [];
for (const v of ['orig', 'new']) if (!ONLY || ONLY === v) rows.push(bench(v));
console.table(rows);
console.log(JSON.stringify(rows));

// Re-runs the QA repro cases for the world findings (BB-3, BB-7/VIS-2, BB-8) against the live
// js/ files and prints a verdict per case. Usage: node tools/fix_world_repro.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load() {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, setTimeout, clearTimeout, Promise };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.M;
}
let fails = 0;
const near = (a, b) => Math.abs(a - b) < 1e-9;
function verdict(name, ok, detail) {
  if (!ok) fails++;
  console.log((ok ? 'FIXED ' : 'FAIL  ') + name + '  ' + JSON.stringify(detail));
}

// ---------------- BB-3 (qa_bb_logic.mjs / qa_bb_logic2.mjs cases)
{
  const M = load(); const E = M.engine, W = M.world;
  E.newGame({ seed: 7 });
  const st = E.state;
  const w1 = W.placementWarnings('plant_small', 9, 14, 0);
  verdict('BB-3 plant outside the only exterior door', w1.includes('Bloqueia a única saída da casa'), w1);
  const w2 = W.placementWarnings('plant_small', 9, 13, 0);
  verdict('BB-3 plant inside the only exterior door', w2.includes('Bloqueia a única saída da casa'), w2);
  const w3 = W.placementWarnings('plant_small', 15, 9, 0);
  verdict('BB-3 plant on the fridge slot', w3.some((m) => /Geladeira/.test(m)), w3);
  const w4 = W.placementWarnings('plant_small', 12, 7, 0);
  verdict('BB-3 plant next to the toilet', w4.some((m) => /Vaso sanitário/.test(m)), w4);
  const w5 = W.wallWarnings(['v,16,9']);
  verdict('BB-3 wall between fridge and its slot', w5.some((m) => /Geladeira/.test(m)), w5);
  const w6 = W.placementWarnings('plant_small', 20, 4, 0);
  verdict('BB-3 harmless placement has no warnings', w6.length === 0, w6);
  // bedroom door h,9,10 (between living room 9,10 and bedroom 9,9): block it from the bedroom side
  const w7 = W.placementWarnings('plant_small', 9, 9, 0);
  verdict('BB-3 blocking the bedroom door', w7.includes('Bloqueia a única porta do cômodo'), w7);
  const w8 = W.wallWarnings(['h,9,10'], 1);
  verdict('BB-3 wall over the bedroom door', w8.includes('Bloqueia a única porta do cômodo'), w8);
  // a resident inside the bedroom gets sealed in
  const rita = E.household()[0];
  rita.x = 10; rita.y = 8;
  const w9 = W.wallWarnings(['h,9,10'], 1);
  verdict('BB-3 wall seals a resident in (gendered)', w9.includes('Deixa ' + rita.name.split(' ')[0] + (rita.gender === 'f' ? ' presa' : ' preso')), w9);
}

// ---------------- BB-7 / VIS-2 world side: per-side wallpaper
{
  const M = load(); const E = M.engine, W = M.world;
  E.newGame({ seed: 7 });
  const st = E.state;
  st.time.minute = 600;
  const key = 'v,17,7';   // bathroom outer wall: side A faces the bathroom (16,7), side B the yard (17,7)
  const sideIn = W.edgeSideFacing(key, 16, 7), sideOut = W.edgeSideFacing(key, 17, 7);
  const outsideBefore = W.wallColor(key, sideOut);
  const scoreBefore = W.roomScore(16, 7);
  W.setWallColor(key, 9, sideIn);   // bathroom tiles on the inner face only
  verdict('BB-7 painting one side keeps the other', W.wallColor(key, sideIn) === 9 && W.wallColor(key, sideOut) === outsideBefore,
    { sideIn, sideOut, inner: W.wallColor(key, sideIn), outer: W.wallColor(key, sideOut), entry: W.getWall(key) });
  const edges = W.roomEdges(16, 7);
  verdict('VIS-2 roomEdges lists the bathroom walls with inward sides', edges.length > 0 && edges.some((e) => e.key === key && e.side === sideIn), edges.length);
  // bedroom/bathroom wall v,12,7: paint every inward bathroom side green-mint (3); the bedroom side must keep its colour
  const bedSide = W.edgeSideFacing('v,12,7', 11, 7), bathSide = W.edgeSideFacing('v,12,7', 12, 7);
  const bedBefore = W.wallColor('v,12,7', bedSide);
  const outsideFacade = W.wallColor(key, sideOut);
  for (const e of edges) W.setWallColor(e.key, 3, e.side);
  verdict('VIS-2 painting the bathroom does not paint the bedroom side nor the facade',
    W.wallColor('v,12,7', bedSide) === bedBefore && W.wallColor('v,12,7', bathSide) === 3 && W.wallColor(key, sideOut) === outsideFacade,
    { bedSide: W.wallColor('v,12,7', bedSide), bedBefore, bathSide: W.wallColor('v,12,7', bathSide), facade: W.wallColor(key, sideOut) });
  for (const e of edges) W.setWallColor(e.key, 9, e.side);   // bathroom tiles (room tier 1) on every inward side
  const bd = W.roomBreakdown(16, 7);
  verdict('VIS-2 room score uses the inward side', near(bd.wallBonus, 2) && W.roomScore(16, 7) >= scoreBefore, { before: scoreBefore, after: W.roomScore(16, 7), wallBonus: bd.wallBonus });
  // old save entries {t,c} fall back to c on both sides
  st.lot.walls['h,3,3'] = { t: 1, c: 4 };
  W.rebuild();
  verdict('BB-7 old saves {t,c} fall back to c', W.wallColor('h,3,3', 'A') === 4 && W.wallColor('h,3,3', 'B') === 4, W.getWall('h,3,3'));
}

// ---------------- BB-8: enclosed room without floor is indoor
{
  const M = load(); const E = M.engine, W = M.world;
  E.newGame({ seed: 7 });
  for (const k of ['h,19,2', 'h,20,2', 'h,21,2', 'h,19,5', 'h,20,5', 'h,21,5', 'v,19,2', 'v,19,3', 'v,19,4', 'v,22,2', 'v,22,3', 'v,22,4']) E.buildWall(k, 1, 0);
  const id = W.roomAt(20, 3); const r = W.rooms().find((q) => q.id === id);
  verdict('BB-8 freshly walled 3x3 room without floor is indoor', r.area === 9 && r.indoor && r.enclosed, { area: r.area, indoor: r.indoor, score: W.roomScore(20, 3) });
  const wq = W.wallWarnings(['h,20,5'], 1);
}

// ---------------- CR-6 (quick): ensure() is O(1)
{
  const M = load(); const E = M.engine, W = M.world;
  E.newGame({ seed: 9 });
  const st = E.state; st.money = 1e7;
  const types = ['plant_small', 'lamp_floor', 'chair_wood', 'end_table', 'sculpture', 'table_small'];
  let placed = 0;
  for (let y = 0; y < 19; y++) for (let x = 0; x < 24; x++) { if ((x + y) % 2) continue; if (E.buyObject(types[placed % types.length], x, y, 0).ok) placed++; }
  let t = performance.now();
  for (let i = 0; i < 200000; i++) W.isWalkable(i % 24, (i >> 5) % 20);
  const us = (performance.now() - t) / 200000 * 1000;
  verdict('CR-6 isWalkable with ' + st.objects.length + ' objects < 0.5 us', us < 0.5, { us: +us.toFixed(3) });
}
console.log(fails ? fails + ' FAILED' : 'all repro cases fixed');
process.exit(fails ? 1 : 0);

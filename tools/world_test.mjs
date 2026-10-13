// Node unit tests for js/world.js (M.world).  Run: node tools/world_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeContext() {
  const ctx = { console, Math, Date, performance };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/world.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

const PI = Math.PI;
const FAKE_CATALOG = {
  chair: { type: 'chair', name: 'Cadeira', cat: 'seating', price: 80, w: 1, h: 1,
    slots: [{ dx: 0, dy: 0, facing: 0, on: true }], interactions: [{ key: 'sit' }], ratings: { comfort: 2 } },
  bed: { type: 'bed', name: 'Cama', cat: 'beds', price: 450, w: 2, h: 2,
    slots: [{ dx: 0, dy: 0, facing: 0, on: true }, { dx: 1, dy: 0, facing: 0, on: true }],
    interactions: [{ key: 'sleep' }], ratings: { energy: 3 } },
  sofa: { type: 'sofa', name: 'Sofá', cat: 'seating', price: 300, w: 2, h: 1,
    slots: [{ dx: 0, dy: 0, facing: 0, on: true }, { dx: 1, dy: 0, facing: 0, on: true }],
    interactions: [{ key: 'sit' }], ratings: { comfort: 3 } },
  // asymmetric slots to check rotation: front-left and back-right
  desk: { type: 'desk', name: 'Mesa teste', cat: 'surfaces', price: 100, w: 2, h: 1,
    slots: [{ dx: 0, dy: 1, facing: PI, on: false }, { dx: 1, dy: -1, facing: 0, on: false }],
    interactions: [{ key: 'use' }] },
  painting: { type: 'painting', name: 'Quadro', cat: 'decor', price: 1500, w: 1, h: 1,
    wall: true, noBlock: true, ratings: { room: 6 }, slots: [], interactions: [] },
  rug: { type: 'rug', name: 'Tapete', cat: 'decor', price: 120, w: 2, h: 2, noBlock: true, ratings: { room: 2 } },
  lamp: { type: 'lamp', name: 'Luminária', cat: 'lighting', price: 50, w: 1, h: 1, light: true, ratings: {} },
  counter: { type: 'counter', name: 'Balcão', cat: 'surfaces', price: 150, w: 1, h: 1, surface: true, surfaceHeight: 0.8,
    slots: [{ dx: 0, dy: 1, facing: PI, on: false }], interactions: [{ key: 'prep' }] },
  fridge: { type: 'fridge', name: 'Geladeira', cat: 'appliances', price: 600, w: 1, h: 1,
    slots: [{ dx: 0, dy: 1, facing: PI, on: false }], interactions: [{ key: 'snack' }] },
  toilet: { type: 'toilet', name: 'Vaso', cat: 'plumbing', price: 300, w: 1, h: 1, dirties: 100,
    slots: [{ dx: 0, dy: 0, facing: 0, on: true }], interactions: [{ key: 'use' }] },
  noslot: { type: 'noslot', name: 'Sem slots', cat: 'electronics', price: 50, w: 1, h: 1, interactions: [{ key: 'call' }] },
  meal: { type: 'meal', cat: 'system', w: 1, h: 1, noBlock: true, buyable: false, interactions: [{ key: 'eat' }] },
  dirty_plate: { type: 'dirty_plate', cat: 'system', w: 1, h: 1, noBlock: true, buyable: false, room: -1, interactions: [{ key: 'clean' }] },
  puddle: { type: 'puddle', cat: 'system', w: 1, h: 1, noBlock: true, buyable: false },
};
const FLOORS = [
  { key: 'grass', name: 'Grama', price: 0 },
  { key: 'wood', name: 'Madeira', price: 10 },
  { key: 'tile', name: 'Cerâmica', price: 20 },
  { key: 'marble', name: 'Mármore', price: 80 },
];
const WALLPAPERS = [{ key: 'plain', price: 0 }, { key: 'paint', price: 10 }, { key: 'lux', price: 80 }];

function makeState(w = 24, h = 20) {
  return {
    version: 1, nextId: 100, time: { day: 1, minute: 720 },
    lot: { w, h, floors: new Array(w * h).fill(0), walls: {} },
    objects: [],
  };
}

// ---------------------------------------------------------------- mini test lib
let passed = 0, failed = 0;
const failures = [];
function check(cond, msg) {
  if (cond) passed++;
  else { failed++; failures.push(msg); console.log('  FAIL:', msg); }
}
function eq(a, b, msg) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  check(ja === jb, `${msg}: expected ${jb}, got ${ja}`);
}
function near(a, b, msg, eps = 1e-9) { check(Math.abs(a - b) < eps, `${msg}: expected ${b}, got ${a}`); }
function section(name) { console.log('--', name); }

const ctx = makeContext();
const M = ctx.M;
M.data = { CATALOG: FAKE_CATALOG, FLOORS, WALLPAPERS };
const Wd = M.world;
let idc = 1;
function add(state, type, x, y, rot = 0, extra = {}) {
  const o = Object.assign({ id: idc++, type, x, y, rot, dirty: 0, broken: false }, extra);
  state.objects.push(o);
  return o;
}
function wallLine(st, keys, t = 1) { for (const k of keys) st.lot.walls[k] = { t, c: 0 }; }
function ascii(st, path) {
  const W = st.lot.w, H = st.lot.h, set = new Set((path || []).map(p => p.x + ',' + p.y));
  const lines = [];
  for (let y = 0; y < H; y++) {
    let s = '';
    for (let x = 0; x < W; x++) s += set.has(x + ',' + y) ? '*' : Wd.isWalkable(x, y) ? '.' : '#';
    lines.push(s);
  }
  return lines.join('\n');
}

// ================================================================ rotation
section('rotatedSize / footprint / slots for every rot');
{
  const st = makeState();
  Wd.init(st);
  eq(Wd.rotatedSize('desk', 0), { w: 2, h: 1 }, 'size rot0');
  eq(Wd.rotatedSize('desk', 1), { w: 1, h: 2 }, 'size rot1');
  eq(Wd.rotatedSize('desk', 2), { w: 2, h: 1 }, 'size rot2');
  eq(Wd.rotatedSize('desk', 3), { w: 1, h: 2 }, 'size rot3');
  eq(Wd.rotatedSize('desk', -1), { w: 1, h: 2 }, 'size rot -1 normalised');
  eq(Wd.rotatedSize('desk', 5), { w: 1, h: 2 }, 'size rot 5 normalised');
  eq(Wd.rotatedSize('nope', 1), { w: 1, h: 1 }, 'unknown type size 1x1');
  eq(Wd.footprint('desk', 10, 10, 0), [{ x: 10, y: 10 }, { x: 11, y: 10 }], 'footprint rot0');
  eq(Wd.footprint('desk', 10, 10, 1), [{ x: 10, y: 10 }, { x: 10, y: 11 }], 'footprint rot1');
  eq(Wd.footprint('bed', 3, 4, 3).length, 4, 'bed footprint 4 tiles');

  // expected world slots for the asymmetric desk at (10,10)
  const expect = {
    0: [{ x: 10, y: 11, f: PI }, { x: 11, y: 9, f: 0 }],
    1: [{ x: 9, y: 10, f: PI / 2 }, { x: 11, y: 11, f: 3 * PI / 2 }],
    2: [{ x: 11, y: 9, f: 0 }, { x: 10, y: 11, f: PI }],
    3: [{ x: 11, y: 11, f: 3 * PI / 2 }, { x: 9, y: 10, f: PI / 2 }],
  };
  for (let rot = 0; rot < 4; rot++) {
    const slots = Wd.slotsFor({ id: 1, type: 'desk', x: 10, y: 10, rot });
    eq(slots.length, 2, `desk slots rot${rot}`);
    for (let i = 0; i < 2; i++) {
      near(slots[i].x, expect[rot][i].x, `desk rot${rot} slot${i} x`);
      near(slots[i].y, expect[rot][i].y, `desk rot${rot} slot${i} y`);
      near(slots[i].facing, expect[rot][i].f, `desk rot${rot} slot${i} facing`, 1e-6);
      eq(slots[i].index, i, `desk rot${rot} slot${i} index`);
      // the facing must point from the slot toward the object's footprint
      const fp = Wd.footprint('desk', 10, 10, rot);
      const cx = fp.reduce((a, t) => a + t.x, 0) / fp.length, cy = fp.reduce((a, t) => a + t.y, 0) / fp.length;
      const dir = { x: Math.sin(slots[i].facing), y: Math.cos(slots[i].facing) };
      const dot = dir.x * (cx - slots[i].x) + dir.y * (cy - slots[i].y);
      check(dot > 0, `desk rot${rot} slot${i} faces the object`);
      // outside slots never land inside the footprint
      check(!fp.some(t => t.x === slots[i].x && t.y === slots[i].y), `desk rot${rot} slot${i} outside footprint`);
    }
  }
  // the type-overload gives the same result
  eq(Wd.slotsFor('desk', 10, 10, 1).map(s => [s.x, s.y]), [[9, 10], [11, 11]], 'slotsFor(type,x,y,rot)');

  // bed 2x2 on-slots stay inside the rotated footprint for every rot; sofa seats too
  for (let rot = 0; rot < 4; rot++) {
    for (const type of ['bed', 'sofa', 'chair']) {
      const o = { id: 2, type, x: 5, y: 5, rot };
      const fp = Wd.footprint(o);
      const sl = Wd.slotsFor(o);
      check(sl.every(s => s.on && fp.some(t => t.x === s.x && t.y === s.y)), `${type} rot${rot} on-slots inside footprint`);
      near(sl[0].facing, Wd.frontFacing(rot), `${type} rot${rot} seat faces object front`, 1e-6);
      check(new Set(sl.map(s => s.x + ',' + s.y)).size === sl.length, `${type} rot${rot} distinct seats`);
    }
  }
  // bed rot1: footprint (5..6, 5..6), slots from (0,0),(1,0): rot1 tile -> (h-1-dy, dx) = (1,0),(1,1)
  eq(Wd.slotsFor({ type: 'bed', x: 5, y: 5, rot: 1 }).map(s => [s.x, s.y]), [[6, 5], [6, 6]], 'bed rot1 slots');
  eq(Wd.slotsFor({ type: 'bed', x: 5, y: 5, rot: 2 }).map(s => [s.x, s.y]), [[6, 6], [5, 6]], 'bed rot2 slots');
  eq(Wd.slotsFor({ type: 'bed', x: 5, y: 5, rot: 3 }).map(s => [s.x, s.y]), [[5, 6], [5, 5]], 'bed rot3 slots');

  // front facings
  near(Wd.frontFacing(0), 0, 'front rot0'); near(Wd.frontFacing(1), 3 * PI / 2, 'front rot1');
  near(Wd.frontFacing(2), PI, 'front rot2'); near(Wd.frontFacing(3), PI / 2, 'front rot3');
  // rot1 front faces -X
  near(Math.sin(Wd.frontFacing(1)), -1, 'rot1 front dir x = -1', 1e-9);

  // modelTransform agrees with the THREE rotation convention: rotation.y = θ maps (x,z) ->
  // (x cosθ + z sinθ, -x sinθ + z cosθ); rot-0 model box [0,w]x[0,h] must land on the footprint rect
  for (const type of ['desk', 'bed', 'chair', 'sofa']) {
    for (let rot = 0; rot < 4; rot++) {
      const tr = Wd.modelTransform(type, 7, 3, rot);
      const d = FAKE_CATALOG[type];
      const c = Math.cos(tr.rotY), s = Math.sin(tr.rotY);
      const pts = [[0, 0], [d.w, 0], [0, d.h], [d.w, d.h]].map(([x, z]) => [tr.x + x * c + z * s, tr.z - x * s + z * c]);
      const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
      const sz = Wd.rotatedSize(type, rot);
      near(Math.min(...xs), 7, `${type} rot${rot} model minX`, 1e-9); near(Math.max(...xs), 7 + sz.w, `${type} rot${rot} model maxX`, 1e-9);
      near(Math.min(...zs), 3, `${type} rot${rot} model minZ`, 1e-9); near(Math.max(...zs), 3 + sz.h, `${type} rot${rot} model maxZ`, 1e-9);
      // model front (+Z local) after rotation equals frontFacing dir
      const fx = 0 * c + 1 * s, fz = -0 * s + 1 * c;
      near(fx, Math.sin(Wd.frontFacing(rot)), `${type} rot${rot} model front x`, 1e-9);
      near(fz, Math.cos(Wd.frontFacing(rot)), `${type} rot${rot} model front z`, 1e-9);
      // a slot tile centre maps consistently: local slot point (dx+.5, dy+.5) through the transform
      for (const sl of (d.slots || [])) {
        const lx = sl.dx + 0.5, lz = sl.dy + 0.5;
        const wx = tr.x + lx * c + lz * s - 0.5, wz = tr.z - lx * s + lz * c - 0.5;
        const ws = Wd.slotsFor(type, 7, 3, rot)[d.slots.indexOf(sl)];
        near(ws.x, wx, `${type} rot${rot} slot x == model transform`, 1e-9);
        near(ws.y, wz, `${type} rot${rot} slot y == model transform`, 1e-9);
      }
    }
  }
  // default slots synthesized when interactions exist but slots are missing
  const ds = Wd.slotsFor({ id: 9, type: 'noslot', x: 4, y: 4, rot: 0 });
  eq(ds.map(s => [s.x, s.y, s.on]), [[4, 5, false]], 'default front slot');
  eq(Wd.slotsFor({ type: 'painting', x: 1, y: 1, rot: 0 }), [], 'no slots for no-interaction decor');
  eq(Wd.slotsFor(null), [], 'slotsFor(null)');
  // degrees tolerated
  M.data.CATALOG.degchair = { w: 1, h: 1, slots: [{ dx: 0, dy: 1, facing: 180 }] };
  near(Wd.slotsFor({ type: 'degchair', x: 0, y: 0, rot: 0 })[0].facing, PI, 'degrees facing tolerated', 1e-9);
  delete M.data.CATALOG.degchair;
  eq(Wd.wallEdgeBehind(3, 3, 0), 'h,3,3', 'wall behind rot0');
  eq(Wd.wallEdgeBehind(3, 3, 1), 'v,4,3', 'wall behind rot1');
  eq(Wd.wallEdgeBehind(3, 3, 2), 'h,3,4', 'wall behind rot2');
  eq(Wd.wallEdgeBehind(3, 3, 3), 'v,3,3', 'wall behind rot3');
}

// ================================================================ slot extras
section('slot offsets, usable flag, approach adjacent');
{
  const st = makeState(12, 10);
  Wd.init(st);
  M.data.CATALOG.bedx = { w: 2, h: 2, slots: [{ dx: 0, dy: 0, facing: 0, on: true, oy: 0.5 }, { dx: 1, dy: 0, facing: 0, on: true, ox: 0.25, oy: 0.5 }], interactions: [{ key: 'sleep' }] };
  M.data.CATALOG.plant = { w: 1, h: 1, approach: 'adjacent', interactions: [{ key: 'water' }] };
  M.data.CATALOG.statue2 = { w: 2, h: 1, approach: 'adjacent', interactions: [{ key: 'admire' }] };
  // exact pose: local offset rotates with the object; check against the rotated local point
  for (let rot = 0; rot < 4; rot++) {
    const sl = Wd.slotsFor({ type: 'bedx', x: 4, y: 4, rot });
    const want0 = Wd.rotatePoint(0 + 0.5, 0 + 0.5 + 0.5, 2, 2, rot), want1 = Wd.rotatePoint(1 + 0.5 + 0.25, 0 + 0.5 + 0.5, 2, 2, rot);
    near(sl[0].px, 4 + want0.x - 0.5, `bedx rot${rot} px0`); near(sl[0].py, 4 + want0.y - 0.5, `bedx rot${rot} py0`);
    near(sl[1].px, 4 + want1.x - 0.5, `bedx rot${rot} px1`); near(sl[1].py, 4 + want1.y - 0.5, `bedx rot${rot} py1`);
  }
  const plain = Wd.slotsFor({ type: 'chair', x: 2, y: 2, rot: 1 })[0];
  check(plain.px === plain.x && plain.py === plain.y, 'no offset -> px,py = x,y');
  // approach adjacent: every orthogonal neighbour of the footprint, facing it
  let ps = Wd.slotsFor({ type: 'plant', x: 5, y: 5, rot: 0 });
  eq(ps.map(s => [s.x, s.y]).sort(), [[4, 5], [5, 4], [5, 6], [6, 5]].sort(), 'adjacent slots of a 1x1');
  check(ps.every(s => { const dx = 5 - s.x, dy = 5 - s.y; return Math.abs(Math.sin(s.facing) - dx) < 1e-9 && Math.abs(Math.cos(s.facing) - dy) < 1e-9; }), 'adjacent slots face the object');
  ps = Wd.slotsFor({ type: 'statue2', x: 5, y: 5, rot: 1 });
  eq(ps.length, 6, 'adjacent slots of a 2x1 (rotated)');
  check(ps.every(s => !(s.x === 5 && (s.y === 5 || s.y === 6))), 'adjacent slots outside rotated footprint');
  // usable: slot behind a wall / in another room / off the lot
  const fr = add(st, 'fridge', 2, 2, 0);
  Wd.rebuild();
  check(Wd.slotsFor(fr)[0].usable === true, 'fridge front usable');
  st.lot.walls['h,2,3'] = { t: 1, c: 0 };
  Wd.rebuild();
  check(Wd.slotsFor(fr)[0].usable === false, 'fridge front behind a wall unusable');
  eq(Wd.nearestReachable(5, 5, Wd.slotsFor(fr)), null, 'nearestReachable skips unusable slot');
  delete st.lot.walls['h,2,3'];
  for (const k of Wd.edgesOfRect(0, 0, 3, 2)) st.lot.walls[k] = { t: 1, c: 0 };   // fridge room, front tile outside
  Wd.rebuild();
  check(Wd.slotsFor(fr)[0].usable === false, 'slot in another room unusable');
  st.lot.walls = {};
  Wd.rebuild();
  check(Wd.slotsFor({ type: 'fridge', x: 0, y: 9, rot: 0 })[0].usable === false, 'slot off the lot unusable');
  check(Wd.slotsFor({ type: 'chair', x: 0, y: 9, rot: 0 })[0].usable === true, 'on-slot usable');
  delete M.data.CATALOG.bedx; delete M.data.CATALOG.plant; delete M.data.CATALOG.statue2;
}

// ================================================================ walls / edges
section('walls, edges, helpers');
{
  const st = makeState(10, 8);
  Wd.init(st);
  eq(Wd.edgeBetween(2, 2, 2, 3), 'h,2,3', 'edgeBetween down');
  eq(Wd.edgeBetween(2, 3, 2, 2), 'h,2,3', 'edgeBetween up');
  eq(Wd.edgeBetween(2, 2, 3, 2), 'v,3,2', 'edgeBetween right');
  eq(Wd.edgeBetween(3, 2, 2, 2), 'v,3,2', 'edgeBetween left');
  eq(Wd.edgeBetween(2, 2, 3, 3), null, 'edgeBetween diagonal null');
  eq(Wd.edgeBetween(2, 2, 2, 2), null, 'edgeBetween same null');
  eq(Wd.edgeBetween(0, 0, -1, 0), 'v,0,0', 'edgeBetween lot border');
  eq(Wd.edgeBetween(0, 0, -2, 0), null, 'edgeBetween far null');
  eq(Wd.edgeTiles('h,2,3'), [{ x: 2, y: 2 }, { x: 2, y: 3 }], 'edgeTiles h');
  eq(Wd.edgeTiles('v,3,2'), [{ x: 2, y: 2 }, { x: 3, y: 2 }], 'edgeTiles v');
  check(Wd.isValidEdge('h,9,8') && !Wd.isValidEdge('h,10,0') && Wd.isValidEdge('v,10,7') && !Wd.isValidEdge('v,10,8') && !Wd.isValidEdge('x,1,1') && !Wd.isValidEdge('h,1'), 'isValidEdge ranges');

  check(Wd.setWall('v,3,2', 1, 2), 'setWall ok');
  eq(Wd.getWall('v,3,2'), { t: 1, c: 2 }, 'getWall after set');
  check(Wd.edgeBlocked(2, 2, 3, 2) && Wd.edgeBlocked(3, 2, 2, 2), 'wall blocks both ways');
  Wd.setWall('v,3,2', 2);
  eq(Wd.getWall('v,3,2'), { t: 2, c: 2 }, 'door keeps wallpaper');
  check(!Wd.edgeBlocked(2, 2, 3, 2), 'door passes');
  Wd.setWall('v,3,2', 3);
  check(Wd.edgeBlocked(2, 2, 3, 2), 'window blocks');
  Wd.setWall('v,3,2', 0);
  eq(Wd.getWall('v,3,2'), null, 'removed');
  check(!('v,3,2' in st.lot.walls), 'removed from state');
  check(!Wd.setWall('v,30,2', 1) && !Wd.setWall('bogus', 1), 'setWall rejects invalid edges');
  check(Wd.edgeBlocked(0, 0, -1, 0), 'out of bounds blocked');
  check(Wd.edgeBlocked(0, 0, 2, 0), 'non adjacent blocked');
  // diagonal edgeBlocked uses corner rule
  Wd.setWall('h,5,5', 1);
  check(Wd.edgeBlocked(4, 4, 5, 5), 'diagonal blocked by wall touching corner (5,5)');
  check(Wd.edgeBlocked(5, 4, 4, 5), 'other diagonal through same corner blocked');
  check(!Wd.edgeBlocked(6, 4, 7, 5), 'diagonal away from wall ok');
  Wd.setWall('h,5,5', 0);

  eq(Wd.edgesOfRect(2, 2, 4, 3).length, 2 * (3 + 2), 'edgesOfRect perimeter count');
  eq(Wd.edgesOfRect(4, 3, 2, 2), Wd.edgesOfRect(2, 2, 4, 3), 'edgesOfRect order-independent');
  eq(Wd.edgesOfRect(1, 1, 1, 1), ['h,1,1', 'v,2,1', 'h,1,2', 'v,1,1'], 'edgesOfRect single tile');
  eq(Wd.tilesInRect(8, 6, 12, 9).length, 2 * 2, 'tilesInRect clamps to lot');
  eq(Wd.tilesInRect(1, 1, 0, 0), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], 'tilesInRect any order');
  eq(Wd.wallSegmentsForDrag(1, 2, 4, 2), ['h,1,2', 'h,2,2', 'h,3,2'], 'drag horizontal');
  eq(Wd.wallSegmentsForDrag(4, 2, 1, 2), ['h,3,2', 'h,2,2', 'h,1,2'], 'drag horizontal reversed');
  eq(Wd.wallSegmentsForDrag(3, 1, 3, 4), ['v,3,1', 'v,3,2', 'v,3,3'], 'drag vertical');
  eq(Wd.wallSegmentsForDrag(3, 4, 3.4, 1.2), ['v,3,3', 'v,3,2', 'v,3,1'], 'drag vertical reversed + rounding');
  eq(Wd.wallSegmentsForDrag(0, 0, 5, 2), ['h,0,0', 'h,1,0', 'h,2,0', 'h,3,0', 'h,4,0'], 'drag snaps to dominant axis');
  eq(Wd.wallSegmentsForDrag(8, 8, 14, 8), ['h,8,8', 'h,9,8'], 'drag clamps to lot (bottom border)');
  eq(Wd.wallSegmentsForDrag(2, 2, 2, 2), [], 'drag zero length');
  check(Wd.setFloor(1, 1, 2) && Wd.getFloor(1, 1) === 2, 'setFloor/getFloor');
  check(!Wd.setFloor(1, 1, 99) && !Wd.setFloor(-1, 0, 1), 'setFloor rejects bad input');
}

// ================================================================ canPlace
section('canPlace');
{
  const st = makeState(12, 10);
  Wd.init(st);
  check(Wd.canPlace('chair', 5, 5, 0).ok, 'chair on empty tile');
  const ch = add(st, 'chair', 5, 5, 0);
  Wd.rebuild();
  eq(Wd.canPlace('chair', 5, 5, 0).code, 'overlap', 'overlap with chair');
  check(Wd.canPlace('chair', 5, 5, 1, ch.id).ok, 'moving the chair onto itself (ignoreId)');
  eq(Wd.canPlace('bed', 11, 0, 0).code, 'bounds', 'bed out of bounds right');
  eq(Wd.canPlace('bed', 10, 8, 0).ok, true, 'bed fits at the corner (2x2)');
  eq(Wd.canPlace('chair', -1, 0, 0).code, 'bounds', 'negative bounds');
  eq(Wd.canPlace('bed', 4, 4, 0).code, 'overlap', 'bed overlapping chair');
  eq(Wd.canPlace('unknown_type', 1, 1, 0).code, 'unknown', 'unknown type');
  // straddling walls
  Wd.setWall('v,2,1', 1);
  eq(Wd.canPlace('sofa', 1, 1, 0).code, 'wall', 'sofa straddling vertical wall');
  check(Wd.canPlace('sofa', 2, 1, 0).ok, 'sofa next to wall ok');
  Wd.setWall('h,8,3', 2);
  eq(Wd.canPlace('sofa', 8, 2, 1).code, 'wall', 'rotated sofa straddling a door edge');
  eq(Wd.canPlace('bed', 7, 2, 0).code, 'wall', 'bed straddling horizontal door');
  Wd.setWall('h,8,3', 0);
  // wall-mounted
  eq(Wd.canPlace('painting', 3, 3, 0).code, 'needWall', 'painting without wall');
  Wd.setWall('h,3,3', 1);
  check(Wd.canPlace('painting', 3, 3, 0).ok, 'painting with wall behind (rot0)');
  eq(Wd.canPlace('painting', 3, 3, 2).code, 'needWall', 'painting rot2 needs h,3,4');
  eq(Wd.canPlace('painting', 3, 2, 2).ok, true, 'painting on the other side of the same wall (rot2 from tile above)');
  Wd.setWall('h,3,3', 3);
  eq(Wd.canPlace('painting', 3, 3, 0).code, 'needWall', 'painting on window refused');
  Wd.setWall('h,3,3', 1);
  for (const [rot, key] of [[1, 'v,4,3'], [3, 'v,3,3']]) {
    eq(Wd.canPlace('painting', 3, 3, rot).code, 'needWall', `painting rot${rot} without ${key}`);
    Wd.setWall(key, 1);
    check(Wd.canPlace('painting', 3, 3, rot).ok, `painting rot${rot} with ${key}`);
    Wd.setWall(key, 0);
  }
  const p1 = add(st, 'painting', 3, 3, 0);
  Wd.rebuild();
  eq(Wd.canPlace('painting', 3, 3, 0).code, 'wallTaken', 'second painting on same wall spot');
  check(Wd.canPlace('painting', 3, 3, 0, p1.id).ok, 'moving painting in place');
  Wd.setWall('v,3,3', 1);
  check(Wd.canPlace('painting', 3, 3, 3).ok, 'corner tile: painting on the other wall');
  check(Wd.canPlace('chair', 3, 3, 0).ok, 'chair under a painting (noBlock wall item)');
  // rugs
  check(Wd.canPlace('rug', 4, 5, 0).ok, 'rug under chair');
  add(st, 'rug', 4, 5, 0);
  Wd.rebuild();
  eq(Wd.canPlace('rug', 5, 6, 0).code, 'overlap', 'rug over rug');
  check(Wd.canPlace('bed', 4, 6, 0).ok, 'bed over rug');
  check(Wd.isWalkable(4, 6), 'rug does not block');
  // noBlock items
  const ctr = add(st, 'counter', 8, 5, 0);
  Wd.rebuild();
  check(Wd.canPlace('meal', 8, 5, 0).ok, 'meal on counter');
  eq(Wd.canPlace('meal', 5, 5, 0).code, 'surface', 'meal on chair refused');
  check(Wd.canPlace('meal', 9, 9, 0).ok, 'meal on floor');
  const meal = add(st, 'meal', 8, 5, 0);
  Wd.rebuild();
  eq(Wd.canPlace('dirty_plate', 8, 5, 0).code, 'overlap', 'second item on same counter');
  check(Wd.objectAt(8, 5) === ctr, 'objectAt returns blocker first');
  check(Wd.itemAt(8, 5) === meal, 'itemAt returns the meal');
  eq(Wd.objectsAt(8, 5).map(o => o.type), ['meal', 'counter'], 'objectsAt top-down');
  add(st, 'puddle', 1, 8, 0);
  Wd.rebuild();
  eq(Wd.canPlace('chair', 1, 8, 0).code, 'floorItem', 'chair over a puddle refused');
  check(Wd.canPlace('counter', 1, 8, 0).ok, 'counter (surface) over floor item ok');
  check(Wd.isWalkable(1, 8), 'puddle does not block');
  // access: counter facing a wall / facing out of the lot
  Wd.setWall('h,6,8', 1);
  eq(Wd.canPlace('counter', 6, 7, 0).code, 'access', 'counter facing a wall');
  check(Wd.canPlace('counter', 6, 7, 2).ok, 'counter turned around is fine');
  eq(Wd.canPlace('fridge', 0, 9, 0).code, 'access', 'fridge facing outside the lot');
  eq(Wd.canPlace('fridge', 5, 4, 0).code, 'access', 'fridge whose front is blocked by the chair');
  check(Wd.canPlace('fridge', 5, 4, 0, ch.id).ok, 'ignoring the chair (moving it) frees the front');
  // chair boxed in on all sides cannot be used
  const st2 = makeState(5, 5);
  Wd.init(st2);
  wallLine(st2, Wd.edgesOfRect(2, 2, 2, 2));
  Wd.rebuild();
  eq(Wd.canPlace('chair', 2, 2, 0).code, 'access', 'walled-in chair has no access');
  st2.lot.walls['h,2,3'] = { t: 2, c: 0 };
  Wd.rebuild();
  check(Wd.canPlace('chair', 2, 2, 0).ok, 'door gives access');

  // canBuildWall
  Wd.init(st);
  eq(Wd.canBuildWall('v,10,1', 1).code, 'ok', 'wall between free tiles');
  eq(Wd.canBuildWall('v,5,6', 1).code, 'object', 'wall through the rug refused');
  add(st, 'bed', 6, 1, 0);
  Wd.rebuild();
  eq(Wd.canBuildWall('v,7,1', 1).code, 'object', 'wall through bed refused');
  eq(Wd.canBuildWall('h,6,2', 1).code, 'object', 'horizontal wall through bed refused');
  eq(Wd.canBuildWall('h,6,1', 1).code, 'ok', 'wall along bed edge ok');
  eq(Wd.canBuildWall('h,3,3', 0).code, 'mounted', 'cannot demolish wall with painting');
  eq(Wd.canBuildWall('h,3,3', 2).code, 'mounted', 'cannot make door where painting hangs');
  eq(Wd.objectsOnEdge('h,3,3').length, 1, 'objectsOnEdge');
  eq(Wd.canBuildWall('h,99,3', 1).code, 'bounds', 'canBuildWall bounds');
}

// ================================================================ pathfinding
section('findPath');
{
  const st = makeState(12, 10);
  Wd.init(st);
  let p = Wd.findPath(0, 0, 5, 0);
  eq(p.length, 5, 'straight path length');
  near(p.cost, 5, 'straight path cost');
  eq(p[p.length - 1], { x: 5, y: 0 }, 'ends at destination');
  check(!p.some(q => q.x === 0 && q.y === 0), 'excludes start');
  p = Wd.findPath(0, 0, 4, 4);
  eq(p.length, 4, 'pure diagonal path');
  near(p.cost, 4 * Math.SQRT2, 'diagonal cost', 1e-9);
  p = Wd.findPath(2, 3, 2, 3);
  check(Array.isArray(p) && p.length === 0, '[] when already there');
  p = Wd.findPath(2.4, 3.3, 1.6, 3.4);
  eq(p, [{ x: 2, y: 3 }].slice(0, 0), 'float coords rounding to same tile -> []');
  p = Wd.findPath(2.6, 3.3, 0, 3);
  eq(p.length, 3, 'float start rounds to tile 3');

  // wall with a gap: path must go through the gap
  for (let y = 0; y < 10; y++) if (y !== 7) st.lot.walls['v,6,' + y] = { t: 1, c: 0 };
  Wd.rebuild();
  p = Wd.findPath(3, 2, 9, 2);
  check(p && p.some(q => q.x === 6 && q.y === 7) && p.some(q => q.x === 5 && q.y === 7), 'path goes through the gap at y=7');
  const steps = [{ x: 3, y: 2 }].concat(p);
  let legal = true;
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1], b = steps[i];
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) legal = false;
    if (Wd.edgeBlocked(a.x, a.y, b.x, b.y)) legal = false;
  }
  check(legal, 'every step adjacent and not edge-blocked');
  // close the gap with a window -> unreachable; door -> passes
  st.lot.walls['v,6,7'] = { t: 3, c: 0 };
  Wd.rebuild();
  eq(Wd.findPath(3, 2, 9, 2), null, 'window blocks -> unreachable');
  st.lot.walls['v,6,7'] = { t: 2, c: 0 };
  Wd.rebuild();
  p = Wd.findPath(3, 2, 9, 2);
  check(p && p.some(q => q.x === 6 && q.y === 7), 'door passes');
  // door is crossed orthogonally: tile before door is (5,7)
  const i6 = p.findIndex(q => q.x === 6 && q.y === 7);
  eq(i6 > 0 ? p[i6 - 1] : null, { x: 5, y: 7 }, 'door crossed orthogonally (from 5,7)');
  // performance-ish sanity: maxNodes
  eq(Wd.findPath(3, 2, 9, 2, { maxNodes: 5 }), null, 'maxNodes limit -> null');
}
section('corner cutting rules');
{
  const st = makeState(10, 10);
  Wd.init(st);
  // object at (5,4): diagonal (4,4)->(5,5) is not allowed (orthogonal neighbour blocked)
  add(st, 'counter', 5, 4, 0);
  Wd.rebuild();
  let p = Wd.findPath(4, 4, 5, 5);
  eq(p, [{ x: 4, y: 5 }, { x: 5, y: 5 }], 'no corner cutting past an object');
  near(p.cost, 2, 'cost 2 around object corner');
  // wall end: wall on v,5,7 (between (4,7) and (5,7)). Diagonal (4,8)->(5,7) crosses corner (5,8) which the wall touches
  st.lot.walls['v,5,7'] = { t: 1, c: 0 };
  Wd.rebuild();
  p = Wd.findPath(4, 8, 5, 7);
  eq(p, [{ x: 5, y: 8 }, { x: 5, y: 7 }], 'no diagonal squeezing past a wall end');
  // door corner: door on h,2,2; (1,1)->(2,2) diagonal touches the door edge -> must step orthogonally
  st.lot.walls['h,2,2'] = { t: 2, c: 0 };
  Wd.rebuild();
  p = Wd.findPath(1, 1, 2, 2);
  eq(p.length, 2, 'diagonal through door corner not allowed (2 steps)');
  near(p.cost, 2, 'door corner cost 2');
  // diagonal fine in open space
  p = Wd.findPath(7, 1, 8, 2);
  eq(p, [{ x: 8, y: 2 }], 'open diagonal is one step');
}
section('blocked start/destination, allowObjId, allowTiles, blockTiles');
{
  const st = makeState(10, 10);
  Wd.init(st);
  const chair = add(st, 'chair', 4, 4, 0);
  const bed = add(st, 'bed', 7, 7, 0);
  Wd.rebuild();
  eq(Wd.findPath(0, 4, 4, 4), null, 'blocked destination -> null');
  let p = Wd.findPath(0, 4, 4, 4, { allowObjId: chair.id });
  check(p && p.length === 4 && p[3].x === 4, 'allowObjId lets path end on the chair');
  p = Wd.findPath(0, 4, 4, 4, { allowObjId: [999, chair.id] });
  check(p && p.length === 4, 'allowObjId array');
  p = Wd.findPath(0, 4, 4, 4, { allowTiles: [{ x: 4, y: 4 }] });
  check(p && p.length === 4, 'allowTiles');
  // last step into an allowed blocked tile is orthogonal
  p = Wd.findPath(2, 2, 4, 4, { allowObjId: chair.id });
  const last = p[p.length - 1], prev = p.length > 1 ? p[p.length - 2] : { x: 2, y: 2 };
  check(Math.abs(last.x - prev.x) + Math.abs(last.y - prev.y) === 1, 'enter allowed blocked tile orthogonally');
  // start on a blocked tile (getting up from chair) is fine, and leaves orthogonally
  p = Wd.findPath(4, 4, 6, 2);
  check(p && p.length >= 2, 'start tile blocked is allowed');
  check(Math.abs(p[0].x - 4) + Math.abs(p[0].y - 4) === 1, 'leaves blocked start tile orthogonally');
  // blockTiles
  p = Wd.findPath(0, 0, 2, 0, { blockTiles: [{ x: 1, y: 0 }] });
  check(p && !p.some(q => q.x === 1 && q.y === 0), 'blockTiles avoided');
  // unreachable: walled-in room without door
  for (const k of Wd.edgesOfRect(1, 7, 3, 8)) st.lot.walls[k] = { t: 1, c: 0 };
  Wd.rebuild();
  eq(Wd.findPath(0, 0, 2, 8), null, 'walled room unreachable');
  eq(Wd.findPath(2, 8, 0, 0), null, 'cannot leave walled room');
  check(Wd.findPath(1, 7, 3, 8) !== null, 'path inside the room');
  // through the bed via allowObjId vs around
  p = Wd.findPath(6, 7, 9, 7);
  check(p && !p.some(q => q.x >= 7 && q.x <= 8 && q.y >= 7 && q.y <= 8), 'path goes around the bed');
  // auto-rebuild when objects array changes without rebuild()
  st.objects.push({ id: 555, type: 'counter', x: 5, y: 0, rot: 0 });
  check(!Wd.isWalkable(5, 0), 'auto-detects pushed object');
  st.objects.pop();
  check(Wd.isWalkable(5, 0), 'auto-detects removed object');
  const c2 = st.objects[0]; c2.x = 0; c2.y = 9;
  check(!Wd.isWalkable(0, 9) && Wd.isWalkable(4, 4), 'auto-detects moved object');
  c2.x = 4; c2.y = 4;
  // smoothing
  st.lot.walls = {};
  st.objects = [];
  Wd.rebuild();
  p = Wd.findPath(0, 0, 9, 3, { smooth: true });
  eq(p, [{ x: 9, y: 3 }], 'smooth path in open field is a straight line');
  for (let y = 0; y < 8; y++) st.lot.walls['v,5,' + y] = { t: 1, c: 0 };
  Wd.rebuild();
  const raw = Wd.findPath(1, 1, 8, 1);
  p = Wd.findPath(1, 1, 8, 1, { smooth: true });
  check(p.length < raw.length && p.length >= 2, `smoothing reduces points (${raw.length} -> ${p.length})`);
  check(p.some(q => q.y >= 8), 'smoothed path still goes around the wall');
  near(p.cost, raw.cost, 'smoothed path keeps grid cost', 1e-9);
}
section('nearestReachable');
{
  const st = makeState(12, 10);
  Wd.init(st);
  const sofa = add(st, 'sofa', 5, 5, 0);
  const fridge = add(st, 'fridge', 1, 1, 0);
  Wd.rebuild();
  // sofa seats (on slots): entered as goals even though blocked
  let r = Wd.nearestReachable(9, 5, Wd.slotsFor(sofa));
  check(r && r.candidate.index === 1 && r.x === 6 && r.y === 5, 'nearest sofa seat from the east is the right one');
  check(r.path.length > 0 && r.path[r.path.length - 1].x === 6, 'path ends on the seat');
  r = Wd.nearestReachable(0, 5, Wd.slotsFor(sofa));
  check(r && r.candidate.index === 0, 'nearest sofa seat from the west');
  // the path never crosses the other seat
  r = Wd.nearestReachable(9, 5, [Wd.slotsFor(sofa)[0]]);
  check(r && !r.path.some(q => q.x === 6 && q.y === 5), 'path to far seat does not walk over the near seat');
  // penalties: prefer the cheaper total
  const slots = Wd.slotsFor(sofa).map((s, i) => Object.assign({}, s, { penalty: i === 1 ? 10 : 0 }));
  r = Wd.nearestReachable(9, 5, slots);
  check(r && r.candidate.index === 0, 'penalty makes the farther seat win');
  // outside slots must be walkable
  const blockerCands = [{ x: 1, y: 1 }, { x: 3, y: 3 }];
  r = Wd.nearestReachable(0, 0, blockerCands);
  check(r && r.x === 3 && r.y === 3, 'blocked non-on candidate skipped');
  // standing on a candidate
  r = Wd.nearestReachable(1, 2, Wd.slotsFor(fridge));
  check(r && r.path.length === 0 && r.cost === 0, 'already on the slot');
  // unreachable
  for (const k of Wd.edgesOfRect(9, 0, 11, 2)) st.lot.walls[k] = { t: 1, c: 0 };
  Wd.rebuild();
  eq(Wd.nearestReachable(0, 9, [{ x: 10, y: 1 }]), null, 'unreachable candidate -> null');
  r = Wd.nearestReachable(0, 9, [{ x: 10, y: 1 }, { x: 0, y: 0 }]);
  check(r && r.index === 1, 'falls back to reachable candidate');
  eq(Wd.nearestReachable(0, 0, []), null, 'empty candidates');
  // nearestWalkable
  eq(Wd.nearestWalkable(5, 5), { x: 5, y: 4 }, 'nearest walkable from a sofa tile');
  eq(Wd.nearestWalkable(3, 3), { x: 3, y: 3 }, 'nearest walkable of a free tile is itself');
}

// ================================================================ rooms
section('rooms');
{
  const st = makeState(20, 16);
  Wd.init(st);
  // house 4x3 (12 tiles) at (2..5, 2..4) with a door on the bottom wall, plus a 6x4 (24 tiles) room at (8..13, 2..5)
  const roomA = Wd.edgesOfRect(2, 2, 5, 4);
  const roomB = Wd.edgesOfRect(8, 2, 13, 5);
  for (const k of roomA.concat(roomB)) st.lot.walls[k] = { t: 1, c: 1 };
  st.lot.walls['h,3,5'] = { t: 2, c: 1 };   // door (bottom of room A)
  st.lot.walls['h,9,6'] = { t: 2, c: 1 };   // door room B
  Wd.rebuild();
  // floors grass -> outdoor by grass majority
  check(!Wd.isIndoor(3, 3), 'enclosed grass room is outdoor');
  for (const t of Wd.tilesInRect(2, 2, 5, 4).concat(Wd.tilesInRect(8, 2, 13, 5))) Wd.setFloor(t.x, t.y, 1);
  check(Wd.isIndoor(3, 3) && Wd.isIndoor(9, 3), 'floored rooms are indoor');
  check(!Wd.isIndoor(0, 0) && !Wd.isIndoor(7, 3), 'outside is outdoor');
  check(Wd.roomAt(2, 2) === Wd.roomAt(5, 4) && Wd.roomAt(2, 2) !== Wd.roomAt(2, 5), 'door separates rooms');
  eq(Wd.roomAt(-1, 0), -1, 'roomAt out of bounds');
  const list = Wd.rooms();
  eq(list.length, 3, 'three regions (outside, A, B)');
  eq(list.filter(r => r.indoor).map(r => r.area).sort((a, b) => a - b), [12, 24], 'room areas');
  // half grass, half floor: grass must be a strict majority to be outdoor
  Wd.setFloor(2, 2, 0); Wd.setFloor(3, 2, 0); Wd.setFloor(4, 2, 0); Wd.setFloor(5, 2, 0); Wd.setFloor(2, 3, 0); Wd.setFloor(3, 3, 0);
  check(Wd.isIndoor(3, 3), '6/12 grass still indoor');
  Wd.setFloor(4, 3, 0);
  check(!Wd.isIndoor(3, 3), '7/12 grass -> outdoor');
  for (const t of Wd.tilesInRect(2, 2, 5, 4)) Wd.setFloor(t.x, t.y, 1);
  // room built against the lot border with walls on the border edges counts as indoor
  for (const k of Wd.edgesOfRect(0, 12, 2, 15)) st.lot.walls[k] = { t: 1, c: 0 };
  for (const t of Wd.tilesInRect(0, 12, 2, 15)) st.lot.floors[t.y * 20 + t.x] = 1;
  Wd.rebuild();
  check(Wd.isIndoor(1, 13), 'room walled along the lot border is indoor');
  delete st.lot.walls['h,1,12'];   // open a hole to the outside
  Wd.rebuild();
  check(!Wd.isIndoor(1, 13) && Wd.roomAt(1, 13) === Wd.roomAt(1, 10), 'hole merges with outside');
  st.lot.walls['h,1,12'] = { t: 1, c: 0 };
  delete st.lot.walls['v,0,13'];   // open onto the lot border (off-lot)
  Wd.rebuild();
  check(!Wd.isIndoor(1, 13), 'region leaking off the lot border is outdoor');
  st.lot.walls['v,0,13'] = { t: 1, c: 0 };
  Wd.rebuild();

  // ---- roomScore
  const NOON = 720, NIGHT = 22 * 60;
  eq(Wd.roomScore(3, 3, NOON), -10, 'empty 12-tile room by day = -10');
  eq(Wd.roomScore(3, 3, NIGHT), -30, 'empty room at night: dark -20 -> -30');
  // add a window (on room A boundary): +5 by day
  st.lot.walls['v,2,3'] = { t: 3, c: 1 };
  Wd.rebuild();
  eq(Wd.roomScore(3, 3, NOON), -5, 'window by day +5');
  eq(Wd.roomScore(3, 3, NIGHT), -30, 'window gives nothing at night');
  // painting room 6 (+30), two lamps
  st.lot.walls['h,4,2'] = { t: 1, c: 1 };
  const painting = add(st, 'painting', 4, 2, 0);
  const l1 = add(st, 'lamp', 2, 2, 0);
  const l2 = add(st, 'lamp', 5, 2, 0);
  Wd.rebuild();
  eq(Wd.roomScore(3, 3, NOON), 30 + 5 - 10, 'day: painting 30 + window 5 - 10 = 25');
  eq(Wd.roomScore(3, 3, NIGHT), 30 + 20 - 10, 'night: painting 30 + 2 lamps 20 - 10 = 40');
  const l3 = add(st, 'lamp', 2, 4, 0), l4 = add(st, 'lamp', 5, 4, 0);
  Wd.rebuild();
  eq(Wd.roomScore(3, 3, NIGHT), 30 + 30 - 10, 'lamp bonus capped at +30');
  l3.broken = true; l4.on = false;
  eq(Wd.roomScore(3, 3, NIGHT), 30 + 20 - 10 - 10, 'broken lamp: no light and -10; switched-off lamp no light');
  l3.broken = false;
  st.objects.splice(st.objects.indexOf(l4), 1);
  // 06:00 boundary
  eq(Wd.roomScore(3, 3, 359), Wd.roomScore(3, 3, NIGHT), '05:59 is night');
  eq(Wd.roomScore(3, 3, 360), 25, '06:00 is day');
  eq(Wd.roomScore(3, 3, 1079), 25, '17:59 is day');
  eq(Wd.roomScore(3, 3, 1080), Wd.roomScore(3, 3, NIGHT), '18:00 is night');
  // mess
  add(st, 'dirty_plate', 3, 3, 0);
  eq(Wd.roomScore(3, 3, NOON), 20, 'dirty plate -5 (its catalog room value is not double counted)');
  const puddle = add(st, 'puddle', 4, 3, 0);
  eq(Wd.roomScore(3, 3, NOON), 5, 'puddle -15');
  const meal = add(st, 'meal', 3, 4, 0);
  eq(Wd.roomScore(3, 3, NOON), 5, 'fresh meal 0');
  meal.spoiled = true;
  eq(Wd.roomScore(3, 3, NOON), -10, 'spoiled meal -15');
  const toilet = add(st, 'toilet', 4, 4, 0, { dirty: 499 });
  eq(Wd.roomScore(3, 3, NOON), -10, 'toilet dirty 499: no penalty');
  toilet.dirty = 500;
  eq(Wd.roomScore(3, 3, NOON), -15, 'dirty plumbing >= 500: -5');
  toilet.broken = true;
  eq(Wd.roomScore(3, 3, NOON), -25, 'broken object -10');
  const bd = Wd.roomBreakdown(3, 3, NOON);
  check(bd && bd.indoor && bd.area === 12 && bd.score === -25 && bd.parts.some(p => p.key === 'problems' && p.value === -50) &&
    bd.parts.some(p => p.key === 'decor' && p.value === 30) && bd.parts.some(p => p.key === 'windows' && p.value === 5), 'roomBreakdown parts');
  // the 24-tile room B: painting-equivalent decor is halved
  st.lot.walls['h,10,2'] = { t: 1, c: 1 };
  add(st, 'painting', 10, 2, 0);
  add(st, 'rug', 10, 3, 0);   // room 2 -> +10
  eq(Wd.roomScore(9, 3, NOON), Math.round((30 + 10) / 2) - 10, '24-tile room divides by 2');
  // outdoors: divide by 30, -15
  add(st, 'painting', 15, 10, 0); // no wall: still counted as decor where it stands (data from old saves)
  eq(Wd.roomScore(16, 12, NOON), Math.round(30 / 30) - 15, 'outdoor: sum/30 - 15');
  eq(Wd.roomScore(16, 12, NIGHT), Math.round(30 / 30) - 15, 'outdoor: no dark-room penalty');
  // rooms() returns scores consistent with roomScore
  const rl = Wd.rooms(NOON);
  check(rl.every(r => r.score === Wd.roomScore(r.tiles[0].x, r.tiles[0].y, NOON)), 'rooms() scores == roomScore');
  // time source: state.time when no engine; engine state overrides
  st.time.minute = NIGHT;
  eq(Wd.roomScore(3, 3), Wd.roomScore(3, 3, NIGHT), 'uses state.time by default');
  M.engine = { state: { time: { day: 1, minute: NOON } } };
  eq(Wd.roomScore(3, 3), Wd.roomScore(3, 3, NOON), 'prefers M.engine.state.time');
  delete M.engine;
  // floor / wallpaper quality bonus
  for (const t of Wd.tilesInRect(8, 2, 13, 5)) Wd.setFloor(t.x, t.y, 3);  // marble tier 3 -> +6
  eq(Wd.roomScore(9, 3, NOON), Math.round((30 + 10) / 2 + 6) - 10, 'marble floor +6');
  for (const k of roomB) st.lot.walls[k].c = 2;  // lux wallpaper tier 3 -> up to +4.5 (door side keeps c=1 tier 0)
  Wd.rebuild();
  const bonus = Wd.roomBreakdown(9, 3, NOON);
  check(bonus.wallBonus > 5 && bonus.wallBonus <= 6, `wallpaper bonus ${bonus.wallBonus}`);
  // FLOORS/WALLPAPERS `room` field takes precedence over price tiers
  M.data.FLOORS = FLOORS.map((f, i) => Object.assign({}, f, { room: i === 3 ? 1 : 0 }));
  Wd.rebuild();
  near(Wd.roomBreakdown(9, 3, NOON).floorBonus, 2, 'floor room value 1 -> +2');
  M.data.FLOORS = FLOORS;
  Wd.rebuild();
  // M.data.ROOM_IMPACT constants and M.data.roomImpact helper are honoured when present
  M.data.ROOM_IMPACT = { perRating: 5, lampLit: 15, lampCap: 60, windowDay: 5, darkNight: -20 };
  const nightA = Wd.roomScore(3, 3, NIGHT);
  M.data.roomImpact = (o) => (o.type === 'painting' ? 100 : 0);
  check(Wd.roomScore(3, 3, NOON) !== -25, 'M.data.roomImpact used when present');
  delete M.data.roomImpact; delete M.data.ROOM_IMPACT;
  check(nightA !== Wd.roomScore(3, 3, NIGHT), 'ROOM_IMPACT.lampLit honoured');
  // removing a wall merges rooms; caches invalidated by setWall
  const before = Wd.rooms().length;
  Wd.setWall('h,3,5', 0);
  check(Wd.rooms().length === before - 1 && !Wd.isIndoor(3, 3), 'setWall invalidates rooms (door removed -> merged with outside)');
}

// ================================================================ robustness
section('robustness');
{
  const st = { lot: { w: 6, h: 5 } };   // missing floors/walls/objects
  Wd.init(st);
  check(Array.isArray(st.lot.floors) && st.lot.floors.length === 30 && st.objects.length === 0, 'repairs missing fields');
  st.objects.push({ id: 1, type: 'ghost_type', x: 2, y: 2, rot: 0 }, null, { id: 2, type: 'chair', x: 99, y: 99 }, { id: 3, type: 'chair', x: 'a', y: 1 });
  st.lot.walls['nonsense'] = { t: 1 };
  st.lot.walls['h,1,1'] = null;
  st.lot.walls['h,2,1'] = { t: 9 };
  Wd.rebuild();
  check(!Wd.isWalkable(2, 2), 'unknown type blocks as 1x1');
  check(Wd.findPath(0, 0, 5, 4) !== null, 'garbage walls ignored');
  eq(Wd.getWall('h,2,1'), null, 'invalid wall type ignored');
  check(Wd.rooms().length === 1, 'rooms with garbage');
  Wd.init(null);
  eq(Wd.findPath(0, 0, 1, 1), null, 'no state -> null path');
  eq(Wd.roomScore(0, 0), 0, 'no state -> roomScore 0');
  eq(Wd.canPlace('chair', 0, 0, 0).ok, false, 'no state -> canPlace false');
  eq(Wd.objectAt(0, 0), null, 'no state -> objectAt null');
  // catalog missing entirely
  const saved = M.data; M.data = undefined;
  const st3 = makeState(5, 5);
  st3.objects.push({ id: 1, type: 'chair', x: 1, y: 1, rot: 0 });
  Wd.init(st3);
  check(!Wd.isWalkable(1, 1) && Wd.findPath(0, 0, 4, 4) !== null, 'works without catalog');
  M.data = saved;
  // lot resize via new state
  const big = makeState(30, 25);
  Wd.init(big);
  eq(Wd.size(), { w: 30, h: 25 }, 'resize');
  check(Wd.findPath(0, 0, 29, 24).length === 29, 'path on resized lot');
}

// ================================================================ fuzz vs reference Dijkstra
section('fuzz: findPath / nearestReachable vs reference Dijkstra');
{
  // Independent reference built only on the public API (isWalkable / edgeBlocked).
  function refSearch(Wn, Hn, sx, sy, goals, allowSet) {
    const key = (x, y) => x + ',' + y;
    const goalMap = new Map(goals.map(g => [key(g.x, g.y), g]));
    const free = (x, y) => Wd.isWalkable(x, y);
    const enterable = (x, y) => free(x, y) || allowSet.has(key(x, y)) || !!(goalMap.get(key(x, y)) || {}).enter;
    const dist = new Map([[key(sx, sy), 0]]);
    const done = new Set();
    const res = new Map();
    for (;;) {
      let best = null, bd = Infinity;
      for (const [k, d] of dist) if (!done.has(k) && d < bd) { bd = d; best = k; }
      if (best === null) break;
      done.add(best);
      const [cx, cy] = best.split(',').map(Number);
      if (goalMap.has(best)) res.set(best, bd);
      const isStart = cx === sx && cy === sy;
      if (!isStart && !free(cx, cy) && !allowSet.has(best)) continue; // enter-only goal: no expansion
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= Wn || ny >= Hn) continue;
        if (Wd.edgeBlocked(cx, cy, nx, ny)) continue;
        let c;
        if (dx && dy) {
          if (!free(cx, cy) || !free(nx, ny) || !free(nx, cy) || !free(cx, ny)) continue;
          c = Math.SQRT2;
        } else {
          if (!enterable(nx, ny)) continue;
          c = 1;
        }
        const k = key(nx, ny), nd = bd + c;
        if (!done.has(k) && nd < (dist.has(k) ? dist.get(k) : Infinity) - 1e-12) dist.set(k, nd);
      }
    }
    return res;
  }
  function stepsLegal(sx, sy, path, allowSet) {
    let prev = { x: sx, y: sy }, cost = 0;
    for (let i = 0; i < path.length; i++) {
      const q = path[i];
      const dx = q.x - prev.x, dy = q.y - prev.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (!dx && !dy)) return -1;
      if (Wd.edgeBlocked(prev.x, prev.y, q.x, q.y)) return -2;
      const last = i === path.length - 1;
      if (!Wd.isWalkable(q.x, q.y) && !allowSet.has(q.x + ',' + q.y) && !last) return -3;
      cost += dx && dy ? Math.SQRT2 : 1;
      prev = q;
    }
    return cost;
  }
  const rnd = M.util.rng(7);
  const ri = (n) => Math.floor(rnd() * n);
  let cmpPath = 0, cmpNear = 0, mismatches = 0, illegal = 0, reachableCount = 0;
  for (let scen = 0; scen < 90; scen++) {
    const Wn = 10 + ri(8), Hn = 8 + ri(8);
    const st = makeState(Wn, Hn);
    const nWalls = ri(Wn * Hn * [0.5, 1.6, 3][scen % 3]);
    for (let i = 0; i < nWalls; i++) {
      const k = rnd() < 0.5 ? `h,${ri(Wn)},${ri(Hn + 1)}` : `v,${ri(Wn + 1)},${ri(Hn)}`;
      st.lot.walls[k] = { t: [1, 1, 2, 3][ri(4)], c: 0 };
    }
    const types = ['chair', 'counter', 'sofa', 'bed', 'fridge'];
    for (let i = 0; i < ri(Wn * Hn / 5); i++) st.objects.push({ id: 1000 + i, type: types[ri(types.length)], x: ri(Wn), y: ri(Hn), rot: ri(4) });
    Wd.init(st);
    for (let q = 0; q < 40; q++) {
      const sx = ri(Wn), sy = ri(Hn), tx = ri(Wn), ty = ri(Hn);
      let opts, allowSet = new Set();
      if (st.objects.length && rnd() < 0.4) {
        const o = st.objects[ri(st.objects.length)];
        opts = { allowObjId: o.id };
        for (const t of Wd.footprint(o)) allowSet.add(t.x + ',' + t.y);
      }
      const p = Wd.findPath(sx, sy, tx, ty, opts);
      const goalOk = Wd.isWalkable(tx, ty) || allowSet.has(tx + ',' + ty);
      const ref = goalOk ? refSearch(Wn, Hn, sx, sy, [{ x: tx, y: ty }], allowSet).get(tx + ',' + ty) : undefined;
      cmpPath++;
      if (sx === tx && sy === ty) { if (!p || p.length !== 0) mismatches++; continue; }
      if (ref === undefined) { if (p !== null) { mismatches++; console.log('  expected null', scen, sx, sy, tx, ty); } continue; }
      reachableCount++;
      if (!p || Math.abs(p.cost - ref) > 1e-6) { mismatches++; console.log('  cost mismatch', scen, sx, sy, tx, ty, p && p.cost, ref); continue; }
      const c = stepsLegal(sx, sy, p, allowSet);
      if (c < 0 || Math.abs(c - ref) > 1e-6) { illegal++; console.log('  illegal path', scen, c); }
    }
    for (let q = 0; q < 25; q++) {
      const sx = ri(Wn), sy = ri(Hn);
      const cands = [];
      for (let i = 0, n = 1 + ri(6); i < n; i++) cands.push({ x: ri(Wn), y: ri(Hn), on: rnd() < 0.4, penalty: rnd() < 0.3 ? ri(6) : 0 });
      const r = Wd.nearestReachable(sx, sy, cands);
      // reference: total = dist + penalty over usable candidates (dedupe by tile, lowest penalty wins)
      const usable = cands.filter(c => (c.x === sx && c.y === sy) || Wd.isWalkable(c.x, c.y) || c.on);
      const goals = usable.map(c => ({ x: c.x, y: c.y, enter: !!c.on }));
      const dist = refSearch(Wn, Hn, sx, sy, goals, new Set());
      let best = Infinity;
      for (const c of usable) { const d = dist.get(c.x + ',' + c.y); if (d !== undefined) best = Math.min(best, d + c.penalty); }
      cmpNear++;
      if (best === Infinity) { if (r !== null) { mismatches++; console.log('  near expected null', scen); } continue; }
      if (!r || Math.abs(r.cost - best) > 1e-6) { mismatches++; console.log('  near mismatch', scen, sx, sy, JSON.stringify(cands), r && r.cost, best); continue; }
      const pc = stepsLegal(sx, sy, r.path, new Set());
      if (pc < 0 || Math.abs(pc + r.candidate.penalty - r.cost) > 1e-6) { illegal++; console.log('  near illegal', scen, pc); }
      if (r.path.length && (r.path[r.path.length - 1].x !== r.candidate.x || r.path[r.path.length - 1].y !== r.candidate.y)) illegal++;
    }
  }
  console.log(`  compared ${cmpPath} paths (${reachableCount} reachable) and ${cmpNear} multi-goal queries`);
  check(mismatches === 0, `fuzz: optimal costs and reachability match reference (${mismatches} mismatches)`);
  check(illegal === 0, `fuzz: all returned paths legal (${illegal} illegal)`);
}

// ================================================================ integration with the real data.js
section('integration with js/data.js (if loadable)');
{
  let D = null;
  try {
    const c2 = { console, Math, Date, performance };
    c2.window = c2;
    vm.createContext(c2);
    for (const f of ['js/util.js', 'js/data.js', 'js/world.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c2, { filename: f });
    D = c2.M;
  } catch (e) { console.log('  (skipped: data.js not loadable yet: ' + e.message + ')'); }
  if (D && D.data && D.data.CATALOG) {
    const Wr = D.world, C = D.data.CATALOG;
    const types = Object.keys(C);
    const st = makeState(24, 20);
    Wr.init(st);
    let bad = [];
    for (const t of types) {
      const d = C[t];
      for (let rot = 0; rot < 4; rot++) {
        const sz = Wr.rotatedSize(t, rot);
        if (sz.w * sz.h !== (d.w || 1) * (d.h || 1)) bad.push(t + ' size');
        const sl = Wr.slotsFor({ id: 1, type: t, x: 10, y: 10, rot });
        const fp = Wr.footprint(t, 10, 10, rot);
        for (const s of sl) {
          const inFp = fp.some(q => q.x === Math.round(s.x) && q.y === Math.round(s.y));
          if (s.on && !inFp) bad.push(`${t} rot${rot} on-slot outside footprint`);
          if (!s.on && inFp && !d.noBlock) bad.push(`${t} rot${rot} standing slot inside a blocking footprint`);
          if (!isFinite(s.facing) || !isFinite(s.px) || !isFinite(s.py)) bad.push(`${t} bad slot numbers`);
        }
        if (d.interactions && d.interactions.length && !sl.length) bad.push(`${t} has interactions but no slots`);
      }
    }
    check(bad.length === 0, 'real catalog: footprints/slots consistent for every rot' + (bad.length ? ': ' + [...new Set(bad)].slice(0, 8).join('; ') : ''));
    console.log(`  checked ${types.length} catalog types x 4 rotations`);
    // wall-mounted catalog objects need the wall
    const wallTypes = types.filter(t => C[t].wall);
    check(wallTypes.length > 0 && wallTypes.every(t => Wr.canPlace(t, 5, 5, 0).code === 'needWall'), 'real wall objects need a wall');
    st.lot.walls['h,5,5'] = { t: 1, c: 0 };
    Wr.rebuild();
    check(wallTypes.every(t => Wr.canPlace(t, 5, 5, 0).ok), 'real wall objects placeable on a wall');
    // rug under a bed, meal on a counter, meal not on a bed
    if (C.rug && C.bed_double && C.counter && C.meal) {
      st.objects.push({ id: 1, type: 'rug', x: 10, y: 10, rot: 0 }, { id: 2, type: 'counter', x: 15, y: 10, rot: 0 });
      Wr.rebuild();
      check(Wr.canPlace('bed_double', 10, 10, 0).ok, 'real: bed over rug');
      check(Wr.canPlace('meal', 15, 10, 0).ok, 'real: meal on counter');
      check(Wr.isWalkable(10, 10), 'real: rug walkable');
      st.objects.push({ id: 3, type: 'bed_double', x: 10, y: 10, rot: 0 });
      Wr.rebuild();
      eq(Wr.canPlace('meal', 10, 10, 0).code, 'surface', 'real: meal on bed refused');
      // room score through data.roomImpact: lamp light at night only, puddle negative
      const r0 = Wr.roomScore(0, 0, 720);
      st.objects.push({ id: 4, type: 'puddle', x: 1, y: 1, rot: 0 });
      Wr.rebuild();
      check(Wr.roomScore(0, 0, 720) <= r0, 'real: puddle lowers outdoor score');
    }
    // house: 12-tile room with a lux painting (room 5 -> +25) and a lamp
    if (C.painting_lux && C.lamp_floor) {
      const h = makeState(24, 20);
      Wr.init(h);
      for (const k of Wr.edgesOfRect(2, 2, 5, 4)) h.lot.walls[k] = { t: 1, c: 0 };
      for (const t of Wr.tilesInRect(2, 2, 5, 4)) h.lot.floors[t.y * 24 + t.x] = 1;
      h.objects.push({ id: 1, type: 'painting_lux', x: 3, y: 2, rot: 0 }, { id: 2, type: 'lamp_floor', x: 2, y: 4, rot: 0 });
      Wr.rebuild();
      const day = Wr.roomBreakdown(3, 3, 720), night = Wr.roomBreakdown(3, 3, 1320);
      console.log(`  real 12-tile room: day ${day.score} (${JSON.stringify(day.parts)}), night ${night.score}`);
      check(night.score - day.score === 10, 'real: one lit lamp at night adds +10 vs day (no windows)');
      h.objects[1].lightOff = true;
      check(Wr.roomScore(3, 3, 1320) === day.score - 20, 'real: lamp switched off (lightOff) -> dark room -20');
    }
  }
}

// ================================================================ performance
section('performance (64x64)');
{
  const Wn = 64, Hn = 64;
  const st = makeState(Wn, Hn);
  const rnd = ctx.M.util.rng(42);
  // a grid of walled rooms with doors + random furniture
  for (let ry = 0; ry < 8; ry++) {
    for (let rx = 0; rx < 8; rx++) {
      const x0 = rx * 8, y0 = ry * 8;
      for (let i = 0; i < 8; i++) {
        st.lot.walls['h,' + (x0 + i) + ',' + y0] = { t: 1, c: 0 };
        st.lot.walls['v,' + x0 + ',' + (y0 + i)] = { t: 1, c: 0 };
      }
      st.lot.walls['h,' + (x0 + 3) + ',' + y0] = { t: 2, c: 0 };
      st.lot.walls['v,' + x0 + ',' + (y0 + 4)] = { t: 2, c: 0 };
    }
  }
  Wd.init(st);
  let placed = 0;
  for (let n = 0; n < 1200; n++) {
    const x = Math.floor(rnd() * Wn), y = Math.floor(rnd() * Hn);
    if (Wd.canPlace('counter', x, y, Math.floor(rnd() * 4)).ok) { add(st, 'chair', x, y, 0); Wd.rebuild(); placed++; }
  }
  const t0 = performance.now();
  Wd.rebuild();
  const tRebuild = performance.now() - t0;
  const t1 = performance.now();
  const nRooms = Wd.rooms().length;
  const tRooms = performance.now() - t1;
  const times = [];
  let found = 0, nulls = 0;
  const free = [];
  for (let y = 0; y < Hn; y++) for (let x = 0; x < Wn; x++) if (Wd.isWalkable(x, y)) free.push({ x, y });
  // warm up
  for (let i = 0; i < 200; i++) { const a = free[i % free.length], b = free[(i * 7919) % free.length]; Wd.findPath(a.x, a.y, b.x, b.y); }
  for (let i = 0; i < 2000; i++) {
    const a = free[Math.floor(rnd() * free.length)], b = free[Math.floor(rnd() * free.length)];
    const t = performance.now();
    const p = Wd.findPath(a.x, a.y, b.x, b.y);
    times.push(performance.now() - t);
    if (p) found++; else nulls++;
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)], p95 = times[Math.floor(times.length * 0.95)], mx = times[times.length - 1];
  console.log(`  objects placed ${placed}, rebuild ${tRebuild.toFixed(3)} ms, rooms ${nRooms} in ${tRooms.toFixed(3)} ms`);
  console.log(`  findPath x2000: avg ${avg.toFixed(3)} ms, p50 ${p50.toFixed(3)}, p95 ${p95.toFixed(3)}, max ${mx.toFixed(3)} ms; found ${found}, unreachable ${nulls}`);
  check(avg < 2, `64x64 average findPath < 2 ms (${avg.toFixed(3)})`);
  check(p95 < 2, `64x64 p95 findPath < 2 ms (${p95.toFixed(3)})`);
  // worst case: open 64x64 field corner to corner + an unreachable target (explores everything)
  const open = makeState(64, 64);
  Wd.init(open);
  for (let i = 0; i < 50; i++) Wd.findPath(0, 0, 63, 63);
  let t = performance.now();
  for (let i = 0; i < 200; i++) Wd.findPath(0, 0, 63, 63);
  const tOpen = (performance.now() - t) / 200;
  for (const k of Wd.edgesOfRect(60, 60, 63, 63)) open.lot.walls[k] = { t: 1, c: 0 };
  Wd.rebuild();
  for (let i = 0; i < 20; i++) Wd.findPath(0, 0, 62, 62);
  t = performance.now();
  for (let i = 0; i < 200; i++) Wd.findPath(0, 0, 62, 62);
  const tFail = (performance.now() - t) / 200;
  // 24x20 default lot
  const small = makeState(24, 20);
  Wd.init(small);
  t = performance.now();
  for (let i = 0; i < 2000; i++) Wd.findPath(0, 0, 23, 19);
  const tSmall = (performance.now() - t) / 2000;
  // roomScore cost with 300 objects
  t = performance.now();
  Wd.init(st);
  for (let i = 0; i < 2000; i++) Wd.roomScore(3, 3, 720);
  const tScore = (performance.now() - t) / 2000;
  console.log(`  open corner-to-corner ${tOpen.toFixed(3)} ms; unreachable (full flood) ${tFail.toFixed(3)} ms; 24x20 ${tSmall.toFixed(4)} ms; roomScore (${st.objects.length} objs) ${tScore.toFixed(4)} ms`);
  check(tOpen < 2 && tFail < 4 && tSmall < 0.5, 'worst cases fast');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log(failures.join('\n')); process.exit(1); }

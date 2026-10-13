// Pure Node test for M.models: builds every model + variant, every character style, every animation.
// Run: node tools/models_test.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const ctx = { console: { log: console.log, warn: () => {}, error: (...a) => errors.push(a.map(String).join(' ')) } };
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ['vendor/three.min.js', 'js/util.js', 'js/data.js', 'js/models.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const { M, THREE } = ctx;
let checks = 0, fails = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('FAIL', msg); } }
function tris(g) { let n = 0; g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count / 3; }); return n; }
function finiteGroup(g) { let good = true; g.updateMatrixWorld(true); g.traverse(o => { for (const v of o.matrixWorld.elements) if (!Number.isFinite(v)) good = false; }); return good; }

// 1. every catalog type has a dedicated model and builds without falling back
const cat = M.data.CATALOG;
const sizes = [];
for (const t of Object.keys(cat)) {
  const key = cat[t].model || t;
  ok(M.models.has(key), 'model exists for ' + t);
  const before = errors.length;
  const g = M.models.build(key, { servings: 4 });
  ok(errors.length === before, 'no build error for ' + t + ' ' + errors.slice(before).join(';'));
  ok(g.children.length > 0, 'meshes for ' + t);
  const meta = g.userData.meta;
  ok(meta && typeof meta === 'object', 'meta for ' + t);
  // footprint containment (allow small overhangs, and the documented chair-of-computer edge)
  const box = new THREE.Box3().setFromObject(g);
  const w = cat[t].w || 1, h = cat[t].h || 1;
  ok(box.min.x > -0.06 && box.min.z > -0.06 && box.max.x < w + 0.06 && box.max.z < h + 0.08, `${t} fits footprint ${w}x${h}: ${box.min.x.toFixed(2)},${box.min.z.toFixed(2)} .. ${box.max.x.toFixed(2)},${box.max.z.toFixed(2)}`);
  if (cat[t].surface) ok(Math.abs((meta.surfaceH || 0) - (cat[t].surfaceHeight || 0)) < 0.011, `${t} surfaceH ${meta.surfaceH} matches data ${cat[t].surfaceHeight}`);
  if (cat[t].light) ok(Array.isArray(meta.lightPos), t + ' has lightPos');
  if (cat[t].wall) ok(box.min.z >= 0.05 - 1e-6, t + ' hangs in front of the wall plane');
  sizes.push([t, Math.round(tris(g))]);
}
// 2. variants
const variants = [
  ['bed_double', { unmade: true }], ['bed_single', { unmade: true }], ['bed_lux', { unmade: true }], ['plant_small', { dead: true }], ['plant_small', { wilting: true }],
  ['plant_big', { dead: true }], ['plant_big', { wilting: true }], ['meal', { servings: 1 }], ['meal', { servings: 2, spoiled: true }], ['meal', { servings: 0 }],
  ['meal', { servings: 9 }], ['meal', { food: 'pizza', servings: 3 }], ['meal', { burnt: true, servings: 2 }], ['spoiled_meal', {}], ['dirty_plate', { spoiled: true }],
  ['puddle', { variant: 3 }], ['puddle', { variant: -7 }], ['easel', { progress: 0 }], ['easel', { progress: 99 }], ['carpool', { car: 'limo' }], ['carpool', { car: 'police' }],
  ['carpool', { car: 'spaceship' }], ['env_tree', { variant: 2 }], ['env_pine', {}], ['env_bush', { variant: 5 }], ['env_streetlamp', {}], ['env_house', { variant: 4 }],
  ['no_such_model', { w: 2, h: 3 }], ['no_such_model', {}],
];
for (const [k, o] of variants) {
  const before = errors.length;
  const g = M.models.build(k, o);
  ok(errors.length === before && g.children.length > 0, 'variant ' + k + ' ' + JSON.stringify(o) + ' ' + errors.slice(before).join(';'));
}
ok(M.models.build('meal', { servings: 1 }).children[0].geometry !== M.models.build('meal', { servings: 4 }).children[0].geometry, 'meal servings change geometry');
ok(M.models.build('chair_wood').children[0].geometry === M.models.build('chair_wood').children[0].geometry, 'geometry is cached/shared');
// 3. characters: all styles, colors, all anims, contexts
const anims = ['idle', 'walk', 'sit', 'sleep', 'eat', 'cook', 'shower', 'bath', 'toilet', 'wash', 'read', 'tv', 'computer', 'talk', 'dance', 'exercise', 'paint', 'chess',
  'clean', 'phone', 'piano', 'cry', 'wave', 'joke', 'hug', 'kiss', 'angry', 'laugh', 'stretch', 'use', 'nonsense', undefined];
const ctxs = [undefined, {}, { seated: true }, { seated: true, support: 'chair', seatH: 0.46, off: { x: 0, z: 0 } }, { support: 'bed', seatH: 0.5, off: { x: 0.2, z: -0.5 } },
  { support: 'sofa', seatH: 0.45, off: { x: 0.5, z: 0 } }, { support: 'tub', seatH: 0.18, off: { x: 0, z: 0 } }, { support: 'hottub', seatH: 0.22 }, { support: 'bench', seatH: 0.5 },
  { support: 'shower', seatH: 0.09 }, { support: 'toilet', seatH: 0.43 }, { phase: 1.3 }, { seated: true, seatH: NaN }];
for (let i = 0; i < 16; i++) {
  const sim = { id: i, name: 'N' + i, gender: i % 2 ? 'm' : 'f', colors: i === 3 ? { skin: 'banana' } : i === 4 ? null : { skin: '#c68e63', hair: '#222', shirt: '#3f8b88', pants: '#5a4a3a' } };
  const rig = M.models.character(sim);
  ok(rig && rig.root && rig.parts.head && rig.parts.body && rig.parts.armL && rig.parts.armR && rig.parts.legL && rig.parts.legR && typeof rig.setColors === 'function', 'rig shape ' + i);
  let t = 0;
  for (const a of anims) for (const c of ctxs) {
    for (let k = 0; k < 3; k++) { t += 0.37; M.models.animate(rig, a, t, c); }
    if (!finiteGroup(rig.root)) { ok(false, `non-finite pose ${a} ${JSON.stringify(c)}`); }
  }
  rig.setColors({ skin: '#ffddcc', hair: '#ff0000', shirt: 'nope', pants: '#00f' });
  rig.setBlanket('#123456'); rig.setBlanket(null);
  rig.dispose();
}
checks++;
// animate robustness against bad input
try { M.models.animate(null, 'walk', 1); M.models.animate({}, 'walk', 1); M.models.animate(M.models.character({}), 'walk', 'x'); ok(true, 'animate tolerates bad input'); } catch (e) { ok(false, 'animate threw ' + e.message); }
// 4. sitting pose sanity: hips at seat height, lying pose horizontal
{
  const rig = M.models.character({ id: 'a', gender: 'f' });
  for (let k = 0; k < 30; k++) M.models.animate(rig, 'sit', k * 0.05, { seated: true, support: 'chair', seatH: 0.46 });
  const hp = new THREE.Vector3(); rig.root.updateMatrixWorld(true); rig.parts.hips.getWorldPosition(hp);
  ok(Math.abs(hp.y - 0.535) < 0.02, 'sit hips at seat height (' + hp.y.toFixed(3) + ')');
  const fl = new THREE.Vector3(); rig.parts.footL.getWorldPosition(fl);
  ok(fl.y > 0 && fl.y < 0.09, 'sit feet on the floor (' + fl.y.toFixed(3) + ')');
  for (let k = 0; k < 30; k++) M.models.animate(rig, 'sleep', 2 + k * 0.05, { seated: true, support: 'bed', seatH: 0.5, off: { x: 0, z: 0 } });
  rig.root.updateMatrixWorld(true);
  const head = new THREE.Vector3(); rig.parts.head.getWorldPosition(head); rig.parts.hips.getWorldPosition(hp);
  ok(Math.abs(head.y - hp.y) < 0.2 && head.z < hp.z - 0.4, 'sleep lies along -Z with the head toward the headboard');
  ok(rig.props.blanket.visible === false, 'blanket hidden without setBlanket');
  rig.setBlanket('#ff0000'); M.models.animate(rig, 'sleep', 5, { seated: true, support: 'bed', seatH: 0.5 });
  ok(rig.props.blanket.visible === true, 'blanket shown on a bed with setBlanket');
  M.models.animate(rig, 'read', 6, {}); ok(rig.props.book.visible, 'book prop for read');
  M.models.animate(rig, 'phone', 7, {}); ok(rig.props.phone.visible && !rig.props.book.visible, 'phone prop swaps');
}
// 5. orb
{ const o = M.models.orb(); ok(o && typeof o.userData.setColor === 'function', 'orb'); o.userData.setColor('#ff0000'); o.userData.setColor('garbage'); }
console.log('largest models (triangles):', sizes.sort((a, b) => b[1] - a[1]).slice(0, 6).map(s => s.join(' ')).join(', '));
console.log('total catalog triangles:', sizes.reduce((a, s) => a + s[1], 0));
const rig = M.models.character({ id: 1, gender: 'f' }); console.log('character triangles:', Math.round(tris(rig.root)));
console.log(errors.length ? 'console.error calls: ' + errors.length + '\n' + errors.slice(0, 5).join('\n') : 'no console errors');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails || errors.length ? 1 : 0);

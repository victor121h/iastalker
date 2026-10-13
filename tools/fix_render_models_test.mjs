// Render fix round (QA round 2): pure Node checks for the new M.models features.
// Run: node tools/fix_render_models_test.mjs
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
const kinds = (g) => g.children.map((c) => c.userData.kind);
const bbox = (g) => { const b = new THREE.Box3(); g.updateMatrixWorld(true); g.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); return b; };
function finite(rig) { let good = true; rig.root.updateMatrixWorld(true); rig.root.traverse((o) => { for (const v of o.matrixWorld.elements) if (!Number.isFinite(v)) good = false; }); return good; }

// mailbox flag + pivot
{ const g = M.models.build('mailbox'); ok(kinds(g).indexOf('flag') >= 0, 'mailbox has a flag mesh'); ok(Array.isArray(g.userData.meta.flagPivot), 'mailbox flagPivot meta'); }
// counter: props per variant, backsplash kind, all inside the footprint
{
  const seen = new Set();
  for (let v = 0; v < 5; v++) {
    const g = M.models.build('counter', { variant: v });
    const b = bbox(g);
    ok(b.min.x >= -0.01 && b.max.x <= 1.01 && b.min.z >= -0.01 && b.max.z <= 1.01, 'counter v' + v + ' fits its footprint');
    seen.add(g.children.find((c) => c.userData.kind === 'solid').geometry.uuid);
    ok(kinds(g).indexOf('splash') < 0, 'no backsplash without opts.backsplash');
  }
  ok(seen.size === 5, 'five different counter prop variants (' + seen.size + ')');
  const k = M.models.build('counter', { variant: 1, backsplash: true });
  ok(kinds(k).indexOf('splash') >= 0, 'counter backsplash mesh kind');
  const d = M.models.build('dishwasher', { backsplash: true });
  ok(kinds(d).indexOf('splash') >= 0, 'dishwasher backsplash mesh kind');
}
// puddle material
{ const g = M.models.build('puddle', { variant: 2 }); ok(kinds(g).indexOf('puddle') >= 0 && M.models.materials.puddle, 'puddle uses the puddle material'); ok(g.children.find((c) => c.userData.kind === 'puddle').material === M.models.materials.puddle, 'puddle mesh material'); }
ok(!!M.models.materials.glassDirty, 'glassDirty material');
// armchair recline meta
ok(M.models.meta('armchair').recline === true, 'armchair meta.recline');
// env models
for (const k of ['env_hedge', 'env_hydrant', 'env_manhole', 'env_drain']) { const before = errors.length; const g = M.models.build(k, { variant: 3 }); ok(M.models.has(k) && g.children.length && errors.length === before, 'env model ' + k); }

// character: new ctx fields
const rig = M.models.character({ id: 7, name: 'Teste', gender: 'f' });
const hp = new THREE.Vector3(), head = new THREE.Vector3();
// relax (awake) on a bed: eyes open, no blanket, arms up behind the head
rig.setBlanket('#ff0000');
for (let i = 0; i < 30; i++) M.models.animate(rig, 'sleep', 3 + i * 0.05, { seated: true, support: 'bed', seatH: 0.5, awake: true });
ok(rig.props.blanket.visible === false, 'relax (awake) on a bed: no blanket');
ok(rig.parts.eyes.scale.y > 0.5, 'relax (awake): eyes open');
rig.root.updateMatrixWorld(true);
const hand = new THREE.Vector3(); rig.parts.handL.getWorldPosition(hand); rig.parts.head.getWorldPosition(head);
ok(hand.distanceTo(head) < 0.35, 'relax: hand behind the head (' + hand.distanceTo(head).toFixed(2) + ')');
for (let i = 0; i < 30; i++) M.models.animate(rig, 'sleep', 6 + i * 0.05, { seated: true, support: 'bed', seatH: 0.5 });
ok(rig.props.blanket.visible === true && rig.parts.eyes.scale.y < 0.2, 'asleep on a bed: blanket + eyes closed');
// recliner nap: torso tipped back compared with a plain chair doze
rig.setBlanket(null);
for (let i = 0; i < 30; i++) M.models.animate(rig, 'sleep', 9 + i * 0.05, { seated: true, support: 'chair', seatH: 0.46, recline: true });
rig.root.updateMatrixWorld(true); rig.parts.head.getWorldPosition(head); rig.parts.hips.getWorldPosition(hp);
const reclineDz = head.z - hp.z;
for (let i = 0; i < 30; i++) M.models.animate(rig, 'sleep', 12 + i * 0.05, { seated: true, support: 'chair', seatH: 0.46 });
rig.root.updateMatrixWorld(true); rig.parts.head.getWorldPosition(head); rig.parts.hips.getWorldPosition(hp);
ok(reclineDz < head.z - hp.z - 0.1, 'recliner nap leans back (' + reclineDz.toFixed(2) + ' vs ' + (head.z - hp.z).toFixed(2) + ')');
// hug/kiss partner distance
const pz = (anim, d) => { for (let i = 0; i < 30; i++) M.models.animate(rig, anim, 20 + i * 0.05, { partnerDist: d }); return rig.parts.pose.position.z; };
ok(Math.abs(pz('hug', 1.0) - 0.27) < 0.02, 'hug steps ~0.27 at 1 tile');
ok(pz('hug', 0.5) < 0.05, 'hug does not step when already close');
ok(Math.abs(pz('kiss', 1.0) - 0.235) < 0.02, 'kiss steps ~0.235 at 1 tile');
// cook prep vs stir, landline handset vs mobile
M.models.animate(rig, 'cook', 30, { prep: true });
ok(rig.props.knife.visible && rig.props.board.visible && !rig.props.spoon.visible, 'counter prep: knife + board');
for (let i = 0; i < 10; i++) M.models.animate(rig, 'cook', 31 + i * 0.05, {});
ok(rig.props.spoon.visible && !rig.props.knife.visible, 'stove: spoon');
M.models.animate(rig, 'phone', 33, { prop: 'handset' });
ok(rig.props.handset.visible && !rig.props.phone.visible, 'landline: red handset');
M.models.animate(rig, 'phone', 34, {});
ok(rig.props.phone.visible && !rig.props.handset.visible, 'other phone: mobile');
// idle fidgets: finite, and the pose actually varies over time
const r2 = M.models.character({ id: 9, name: 'Fidget', gender: 'm' });
let minY = Infinity, maxY = -Infinity, good = true;
for (let i = 0; i < 400; i++) {
  M.models.animate(r2, 'idle', i * 0.1, {});
  if (!finite(r2)) good = false;
  r2.root.updateMatrixWorld(true);
  const h2 = new THREE.Vector3(); r2.parts.handR.getWorldPosition(h2);
  minY = Math.min(minY, h2.y); maxY = Math.max(maxY, h2.y);
}
ok(good, 'idle fidgets keep transforms finite');
ok(maxY - minY > 0.3, 'idle fidgets move the hands (' + (maxY - minY).toFixed(2) + ')');
// every style still builds (rounded hair) without errors
for (let i = 0; i < 12; i++) { const before = errors.length; const r = M.models.character({ id: i, name: 'S' + i, gender: i % 2 ? 'm' : 'f' }); ok(errors.length === before && finite(r), 'character style ' + i); r.dispose(); }

console.log(errors.length ? 'console errors: ' + errors.join(' | ') : 'no console errors');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails || errors.length ? 1 : 0);

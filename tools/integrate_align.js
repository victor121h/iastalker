// --eval: checks that every rendered object mesh lands on its world footprint (rotation/footprint math
// shared by world.js and render.js), and that every character stands on a walkable tile or on its slot.
// Also places every buyable type in all 4 rotations on an empty area and checks the same.
const M = window.__morada.M;
const okBtn = document.getElementById('help-ok'); if (okBtn) okBtn.click();
const E = M.engine, W = M.world, R = M.render;
await new Promise((r) => setTimeout(r, 300));
const objGroup = R.scene.children.find((c) => c.name === 'objects');
function boxOf(id) {
  const g = objGroup.children.find((c) => c.userData.objId === id);
  if (!g) return null;
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g);
  return b;
}
function check(o) {
  const def = M.data.CATALOG[o.type] || {};
  const fp = W.footprint(o.type, o.x, o.y, o.rot);
  if (!fp || !fp.length) return { id: o.id, type: o.type, err: 'no footprint' };
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const t of fp) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x + 1); z0 = Math.min(z0, t.y); z1 = Math.max(z1, t.y + 1); }
  const b = boxOf(o.id);
  if (!b) return { id: o.id, type: o.type, err: 'no mesh' };
  const over = Math.max(x0 - b.min.x, b.max.x - x1, z0 - b.min.z, b.max.z - z1);
  const ccx = (b.min.x + b.max.x) / 2 - (x0 + x1) / 2, ccz = (b.min.z + b.max.z) / 2 - (z0 + z1) / 2;
  const cover = Math.min((b.max.x - b.min.x) / (x1 - x0), (b.max.z - b.min.z) / (z1 - z0));
  const res = { id: o.id, type: o.type, rot: o.rot, at: [o.x, o.y], over: +over.toFixed(2), off: [+ccx.toFixed(2), +ccz.toFixed(2)], cover: +cover.toFixed(2), wall: !!def.wall, minY: +b.min.y.toFixed(2) };
  // generous limits: wall-mounted items hug one side, small decor does not fill the tile
  const lim = def.wall ? 0.6 : 0.5;
  res.bad = over > 0.2 || Math.abs(ccx) > lim || Math.abs(ccz) > lim;
  return res;
}
const starter = E.state.objects.map(check);
const badStarter = starter.filter((r) => r.err || r.bad);
// characters on valid tiles
const chars = E.state.sims.filter((s) => !s.hidden).map((s) => {
  const tx = Math.round(s.x), ty = Math.round(s.y);
  const walk = W.isWalkable(tx, ty);
  const a = s.queue && s.queue[0];
  return { name: s.name, x: s.x, y: s.y, walk, on: a && a.slot && a.slot.on, anim: s.anim };
});

// place every buyable type in 4 rotations on a scratch empty lot copy
const saved = JSON.stringify(E.state);
const results = [];
const types = Object.keys(M.data.CATALOG).filter((t) => M.data.CATALOG[t].buyable !== false);
const empty = E.newGame({ empty: true, members: [{ name: 'Teste A' }] });
E.state.money = 1e7;
// a long wall for wall-mounted items: horizontal wall at y=6 from x=2..20 (objects at row 6 face +Z rot0)
for (let x = 2; x < 21; x++) E.buildWall('h,' + x + ',6', 1, 0);
for (let y = 2; y < 6; y++) E.buildWall('v,22,' + y, 1, 0);
let px = 2;
const fails = [];
for (const t of types) {
  const def = M.data.CATALOG[t];
  for (let rot = 0; rot < 4; rot++) {
    let res;
    if (def.wall) {
      // rot0 hangs on h,x,y (wall above the tile) -> tile row 6 under the wall h,x,6
      const pos = { 0: [px % 18 + 2, 6], 2: [px % 18 + 2, 5] }[rot];
      if (!pos) continue;
      res = E.buyObject(t, pos[0], pos[1], rot);
    } else {
      // free spot search in the south half
      res = null;
      for (let y = 8; y < 18 && !(res && res.ok); y += 1) for (let x = 1; x < 22 && !(res && res.ok); x += 1) {
        if (W.canPlace(t, x, y, rot).ok) res = E.buyObject(t, x, y, rot);
      }
    }
    px += 1;
    if (!res || !res.ok) { fails.push(t + ' r' + rot + ': ' + (res && res.reason)); continue; }
  }
}
await new Promise((r) => setTimeout(r, 1200));
const all = E.state.objects.map(check);
const badAll = all.filter((r) => r.err || r.bad);
const out = {
  starterChecked: starter.length, badStarter, chars,
  placedChecked: all.length, badPlaced: badAll.slice(0, 30), placeFails: fails.slice(0, 20),
  sample: all.filter((r) => ['sofa_cheap', 'bed_double', 'computer', 'exercise', 'piano', 'mirror'].includes(r.type)).slice(0, 24),
};
// restore the starter game
window.__morada.M.main.loadState(JSON.parse(saved), { kind: 'load' });
return out;

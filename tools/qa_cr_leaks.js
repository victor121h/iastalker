// --eval: resource / listener leak probe. Ghost type switching, repeated new games / loads, buy-sell cycles.
const M = window.__morada.M, R = M.render, E = M.engine;
const ok = document.getElementById('help-ok'); if (ok) ok.click();
const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const countScene = () => { let n = 0; R.scene.traverse(() => n++); return n; };
const ghostKids = () => R.scene.getObjectByName('ghost').children.length;
const snap = (label) => { const s = R.stats(); return { label, geometries: s.geometries, textures: s.textures, sceneNodes: countScene(), ghostKids: ghostKids(), dom: document.getElementsByTagName('*').length, canvases: document.querySelectorAll('canvas').length, toasts: document.querySelectorAll('.toast').length }; };
const out = [];
await frames(5);
out.push(snap('start'));
// 1) ghost type switching (what the buy catalog does when the player clicks different items)
const types = Object.keys(M.data.CATALOG).filter((t) => M.data.CATALOG[t].buyable !== false).slice(0, 30);
for (let rep = 0; rep < 2; rep++) for (const t of types) { R.showGhost(t, 5, 5, 0, true); await frames(1); }
R.hideGhost();
await frames(2);
out.push(snap('after 60 ghost type switches'));
// 2) toast count for ONE notify emit (duplicated bus handlers would show >1)
const before = document.querySelectorAll('.toast').length;
M.util.bus.emit('notify', { text: 'QA probe toast', kind: 'info' });
await frames(2);
const toastsPerNotify = document.querySelectorAll('.toast').length - before;
// 3) repeated new games (empty + starter) through M.main (same path as "Nova família")
for (let i = 0; i < 4; i++) {
  M.main.newGame({ lot: i % 2 ? 'starter' : 'empty', householdName: 'Família QA' + i, members: [{ name: 'Ana QA' + i, gender: 'f' }, { name: 'Beto QA' + i, gender: 'm' }] });
  await frames(6);
}
out.push(snap('after 4 newGame cycles'));
const b2 = document.querySelectorAll('.toast').length;
M.util.bus.emit('notify', { text: 'QA probe toast 2', kind: 'info' });
await frames(2);
const toastsPerNotifyAfter = document.querySelectorAll('.toast').length - b2;
// 4) buy/sell cycles of every buyable type
const st = E.state; st.money = 1e7;
let bought = 0;
for (let rep = 0; rep < 3; rep++) {
  for (const t of types) {
    for (let y = 1; y < 18 && true; y++) {
      const r = E.buyObject(t, 2 + (bought % 5) * 4, y, 0);
      if (r.ok) { bought++; await frames(1); E.sellObject(r.obj.id); await frames(1); break; }
    }
  }
}
await frames(4);
out.push(snap('after ' + bought + ' buy/sell cycles'));
// 5) visitors coming and going (walk-by spawn + removal)
for (let i = 0; i < 10; i++) {
  E.state.walkbyAt = 1; E.update(0.5);
  await frames(2);
  for (const v of E.visitors()) E.removeSim(v.id);
  await frames(2);
}
out.push(snap('after 10 visitor spawns/removals'));
return { out, toastsPerNotify, toastsPerNotifyAfter };

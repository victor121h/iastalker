// --eval for render_check.mjs (demo page): feed malformed / legacy data and make sure nothing throws.
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const st = window.__demo.state;
const errors = [];
const origErr = console.error;
console.error = function () { errors.push(Array.from(arguments).map(String).join(' ')); origErr.apply(console, arguments); };
function step(name, fn) { try { fn(); } catch (e) { errors.push(name + ': ' + e.message + '\n' + e.stack); } }
const out = {};
// 1. weird objects
step('objects', () => {
  st.objects.push({ id: 9001, type: 'xyz_unknown', x: 2, y: 2, rot: 7 });
  st.objects.push({ id: 9002, type: 'chair_wood', x: 3, y: 2, rot: -1 });
  st.objects.push({ id: 9003, type: 'meal' });                 // no x/y
  st.objects.push(null);
  st.objects.push({ id: 9001, type: 'sofa_lux', x: 4, y: 2 });   // duplicate id
  st.objects.push({ type: 'rug', x: 1, y: 1 });                 // no id
  st.objects.push({ id: 'str-7', type: 'plant_big', x: 20, y: 1, rot: 2, water: 5 });
  st.objects.push({ id: 9004, type: 'lamp_floor', x: 22, y: 1, broken: true });
  st.objects.push({ id: 9005, type: 'meal', x: 12, y: 8, servings: 0 });   // meal on a counter, 0 servings
  st.objects.push({ id: 9006, type: 'painting_cheap', x: 30, y: 30, rot: 0 });  // off-lot wall item
  M.util.bus.emit('objects');
});
await wait(300);
// 2. weird walls / floors
step('lot', () => {
  st.lot.walls['q,1,2'] = { t: 1, c: 0 };
  st.lot.walls['h,a,b'] = { t: 1, c: 0 };
  st.lot.walls['h,99,2'] = { t: 1, c: 0 };
  st.lot.walls['v,2,2'] = 1;                  // legacy numeric entry
  st.lot.walls['v,3,2'] = { t: 0, c: 0 };     // removed wall
  st.lot.walls['h,2,2'] = { t: 3, c: 999 };   // bad wallpaper index
  st.lot.floors[5] = 999; st.lot.floors[6] = NaN; st.lot.floors[7] = -3;
  M.util.bus.emit('lot');
});
await wait(300);
// 3. weird sims
step('sims', () => {
  st.sims.push({ id: 7001, name: 'Sem cor', gender: 'x', x: 3, y: 15, anim: 'flyingAround' });
  st.sims.push({ id: 7002, name: 'Sem posição', gender: 'f', colors: { skin: 'banana' } });
  st.sims.push({ id: 7003, name: 'Escondido', gender: 'm', x: 5, y: 5, hidden: true, anim: 'walk' });
  st.sims.push({ id: 7004, name: 'NaN', gender: 'm', x: 4, y: 16, facing: NaN, anim: 'sleep', seated: true });
  st.sims.push(null);
  M.util.bus.emit('sims');
});
await wait(400);
step('select', () => { M.render.setSelected(7001); M.render.setSelected('nope'); M.render.setSelected(null); M.render.setSelected(st.sims[0].id); });
// 4. modes + camera
step('modes', () => { ['up', 'down', 'cutaway', 'bogus'].forEach(m => M.render.setWallMode(m)); M.render.rotate(1); M.render.rotate(-1); M.render.rotate(1); M.render.zoom(500); M.render.zoom(-9999); M.render.pan(5000, -5000); M.render.focus(5, 5); });
await wait(400);
// 5. ghosts with odd inputs
step('ghosts', () => {
  M.render.showGhost('unknown_thing', 3, 3, 1, true); M.render.showGhost('bed_lux', 2, 2, 3, false); M.render.showGhost(null, 0, 0, 0, true);
  M.render.showEdgeGhost(null, true); M.render.showEdgeGhost(['h,1,1', 'bad', 'v,x,y'], true); M.render.showTileGhost([{ x: 1, y: 1 }, null, { x: 'a' }], false);
  M.render.hideGhost(); M.render.hideEdgeGhost(); M.render.hideTileGhost();
});
// 6. lot resize + missing time
step('resize lot', () => { st.lot.w = 30; st.lot.h = 24; const f = st.lot.floors; while (f.length < 30 * 24) f.push(0); delete st.time; M.render.syncAll(); });
await wait(400);
step('restore time', () => { st.time = { day: 2, minute: 1200 }; });
// 7. state swap through a fake engine
step('engine swap', () => {
  const s2 = window.RENDER_FIXTURE(); s2.time.minute = 800; s2.objects.splice(0, 10);
  M.engine = { get state() { return s2; }, moodColor: () => '#ff5050' };
});
await wait(500);
step('re-init', () => { M.render.init(document.getElementById('view'), M.engine.state); });
await wait(300);
// 8. picking everywhere
step('picks', () => {
  let n = 0;
  for (let x = 0; x < 1280; x += 160) for (let y = 0; y < 800; y += 160) { M.render.pick(x, y); M.render.pickEdge(x, y); M.render.pickTile(x, y); M.render.pickGround(x, y); n++; }
  out.picks = n;
  out.proj = M.render.project(1, 1, 1); out.simPos = M.render.simScreenPos(M.engine.state.sims[0].id); out.simPosMissing = M.render.simScreenPos('none');
});
// 9. container resize
step('container', () => { const v = document.getElementById('view'); v.style.right = '300px'; });
await wait(500);
out.stats = M.render.stats();
out.size = [M.render.canvas.width, M.render.canvas.height];
await window.__shot('/tmp/claude-0/-home-user-iastalker/022ed161-997d-54de-8293-6b75c8c0dc6f/scratchpad/shots/robust.png');
out.errors = errors;
return out;

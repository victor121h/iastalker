// --eval: state swaps and damaged saves in the real page; render must keep drawing without exceptions.
const M = window.__morada.M, E = M.engine, R = M.render;
const b = document.getElementById('help-ok'); if (b) b.click();
const errs = [];
const of = R.frame;
R.frame = function (dt) { try { return of.call(R, dt); } catch (e) { errs.push(step + ': ' + e.message); throw e; } };
const oe = console.error;
console.error = function () { errs.push(step + ' console: ' + Array.from(arguments).map(String).join(' ').slice(0, 200)); return oe.apply(console, arguments); };
let step = 'start';
const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const out = {};
// 1. raw engine newGame on an empty lot (no main involvement)
step = 'engine.newGame(empty)';
E.newGame({ empty: true, members: [{ name: 'Ana B' }] });
await frames(6);
out.emptyRaw = { sims: E.state.sims.length, objs: E.state.objects.length, chars: R.stats().characters };
// 2. back to the starter house through main
step = 'main.newGame(starter)';
M.main.newGame({});
await frames(6);
out.starter = { sims: E.household().map((s) => s.name), objs: E.state.objects.length, chars: R.stats().characters, objects: R.stats().objects };
// 3. damaged save: missing fields, unknown object types, numeric walls, NaN motives, bad sim position
step = 'damaged';
const st = JSON.parse(JSON.stringify(E.state));
delete st.time.minute; st.money = 'abc';
st.objects.push({ id: 9999, type: 'nave_espacial', x: 3, y: 3, rot: 0 });
st.objects.push({ type: 'chair_wood', x: 2, y: 2 });
st.objects[0].rot = 7;
const wk = Object.keys(st.lot.walls)[0]; st.lot.walls[wk] = 1;
st.sims[0].motives.hunger = NaN; st.sims[0].x = undefined; delete st.sims[1].colors; st.sims[1].queue = [{ kind: 'bogus' }, null];
delete st.settings; delete st.npcs; delete st.bills;
const ok = M.main.loadState(st, { kind: 'load' });
for (let i = 0; i < 60; i++) E.update(2);
await frames(8);
out.damaged = { ok, money: E.state.money, minute: E.state.time.minute, objs: E.state.objects.length, sim0: [E.state.sims[0].x, E.state.sims[0].y, E.state.sims[0].motives.hunger], selected: E.state.settings && E.state.settings.selectedSimId };
// 4. minimal state
step = 'minimal';
const ok2 = M.main.loadState({ version: 1, householdName: 'Mínima', lot: { w: 24, h: 20 }, sims: [{ name: 'Zé' }] }, { kind: 'load' });
for (let i = 0; i < 60; i++) E.update(2);
await frames(8);
out.minimal = { ok: ok2, sims: E.state.sims.map((s) => s.name + '@' + s.x + ',' + s.y), objs: E.state.objects.map((o) => o.type), money: E.state.money };
// 5. export/import round trip through M.save
step = 'export';
M.main.newGame({});
await frames(4);
const json = M.save.exportJSON(E.state);
const imp = M.save.importJSON(json);
out.exportImport = { bytes: json.length, ok: !!imp, sameObjs: imp && imp.objects.length === E.state.objects.length };
const bad = M.save.importJSON('{"lixo": true}');
out.badImport = bad === null;
// 6. resize to phone and back
step = 'resize';
out.errors = errs.slice(0, 10);
return out;

// Verifier (build angle): pure logic checks in node vm for BB-3, BB-7, BB-8, BB-10.
import vm from 'node:vm'; import fs from 'node:fs';
function load() {
  const ctx = { console, Math, Date, JSON }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.M;
}
const M = load(); const E = M.engine, W = M.world, D = M.data;
E.newGame({ seed: 11 });
const st = E.state;
const out = {};
// map: walls + objects
const L = st.lot;
let rows = [];
for (let y = 0; y < L.h; y++) {
  let r = '';
  for (let x = 0; x < L.w; x++) {
    const o = W.objectAt(x, y);
    r += o ? (o.type[0]) : (L.floors[y * L.w + x] ? '.' : ',');
  }
  rows.push(String(y).padStart(2) + ' ' + r);
}
out.map = rows;
out.doors = Object.entries(L.walls).filter(([k, w]) => w.t === 2).map(([k]) => k);
out.windows = Object.entries(L.walls).filter(([k, w]) => w.t === 3).length;
out.objects = st.objects.map((o) => `${o.type}@${o.x},${o.y},r${o.rot}`);
// BB-10 starter resale on day 1
out.day = st.time.day;
let resale = 0, full = 0;
for (const o of st.objects) { resale += E.sellValue(o.id); const d = D.CATALOG[o.type]; if (d && d.buyable !== false) full += o.price || 0; }
out.starterResaleDay1 = resale; out.starterFull = full; out.sellToday = D.MONEY.sellToday;
out.money = st.money;
// BB-3: find exterior door(s); try placing a plant on the outside tile of each
const ext = [];
for (const k of out.doors) {
  const t = W.edgeTiles(k);
  ext.push({ k, tiles: t, indoor: t.map((q) => W.isIndoor(q.x, q.y)) });
}
out.doorInfo = ext;
console.log(JSON.stringify(out, null, 1));

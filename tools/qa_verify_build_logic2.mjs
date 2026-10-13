// Verifier: BB-3 (blocking door / slots), BB-7 (wallpaper per edge), BB-8 (grass room outdoor), BB-10 (sell later day)
import vm from 'node:vm'; import fs from 'node:fs';
function load() {
  const ctx = { console, Math, Date, JSON }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.M;
}
const M = load(); const E = M.engine, W = M.world, D = M.data;
E.newGame({ seed: 11 });
const st = E.state; const out = {};
// BB-3a: door blocker outside the only exterior door h,9,14
out.cpOutside = W.canPlace('plant_small', 9, 14, 0);
out.pathBefore = !!W.findPath(10, 12, 9, 17);
const p = E.buyObject('plant_small', 9, 14, 0);
out.buy = p.ok;
out.pathAfter = !!W.findPath(10, 12, 9, 17);
// let the game run 12 h: does anyone leave? route failures? (Caio has a job; carpool at 08:00 near mailbox)
const caio = E.household().find((s) => /Caio/.test(s.name));
const notes = []; M.util.bus.on('notify', (n) => notes.push(n.kind + ':' + n.text.slice(0, 90)));
for (let i = 0; i < 6 * 60; i++) E.update(1);
out.caioAfter6h = { atWork: caio.atWork, hidden: caio.hidden, x: caio.x, y: caio.y, career: caio.career && caio.career.missedDays };
out.notes6h = notes.slice(0, 12);
E.sellObject(p.obj.id);
// BB-3b: fridge slot block
const fr = st.objects.find((o) => o.type === 'fridge_cheap');
out.fridgeSlots = W.slotsFor(fr).map((s) => [s.x, s.y, s.usable]);
out.cpFridgeSlot = W.canPlace('plant_small', fr.x - 1, fr.y, 0);
out.wallFridgeSlot = W.canBuildWall('v,' + fr.x + ',' + fr.y, 1);
// BB-7: one colour per edge
const k = 'h,12,9'; // interior wall? check
const anyInterior = Object.keys(st.lot.walls).find((key) => { const t = W.edgeTiles(key); return st.lot.walls[key].t === 1 && t.every((q) => W.inBounds(q.x, q.y) && W.isIndoor(q.x, q.y)); });
out.interiorEdge = anyInterior; out.interiorEdgeVal = JSON.stringify(st.lot.walls[anyInterior]);
const m0 = st.money;
const r = E.paintWall(anyInterior, 4);
out.paint = r; out.paintedVal = JSON.stringify(st.lot.walls[anyInterior]); out.moneyDelta = st.money - m0;
out.wallpaperPrice = D.WALLPAPERS[4].price;
// BB-8: new walled grass room
E.update(0);
for (const kk of ['h,19,2','h,20,2','h,21,2','v,22,2','v,22,3','v,22,4','h,19,5','h,20,5','h,21,5','v,19,2','v,19,3','v,19,4']) E.buildWall(kk, 1, 0);
const id = W.roomAt(20, 3); const rm = W.rooms().find((q) => q.id === id);
out.grassRoom = { area: rm.area, indoor: rm.indoor, isIndoor: W.isIndoor(20, 3) };
for (let y = 2; y < 5; y++) for (let x = 19; x < 22; x++) { if (x === 21 && y >= 3) continue; if (y===4) continue; E.paintFloor(x, y, 1); }
const rm2 = W.rooms().find((q) => q.id === W.roomAt(20, 3));
out.partlyFloored = { floored: 5, area: rm2.area, indoor: rm2.indoor };
// BB-10: resale day 2
const ch = st.objects.find((o) => o.type === 'chair_wood');
out.day = st.time.day; out.chairPrice = ch.price; out.chairSellNow = E.sellValue(ch.id);
console.log(JSON.stringify(out, null, 1));

import vm from 'node:vm'; import fs from 'node:fs';
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const M = ctx.M, E = M.engine, W = M.world;
E.newGame({ seed: 7 });
const st = E.state; const out = {};
// room score with decor / wallpaper / floor changes (living room tile 9,12 at 10:00)
st.time.minute = 600;
const s0 = W.roomScore(9, 12);
const r = E.buyObject('plant_big', 10, 12, 0); out.buyPlant = r.ok;
const s1 = W.roomScore(9, 12);
const lr = W.rooms().find((q) => q.id === W.roomAt(9, 12));
// repaint all walls of living room with wood paneling (idx 8)
let painted = 0; for (const k in st.lot.walls) { const t = W.edgeTiles(k); if (t.some((q) => q && W.roomAt(q.x, q.y) === lr.id)) { if (E.paintWall(k, 8).ok) painted++; } }
const s2 = W.roomScore(9, 12);
for (const t of lr.tiles) E.paintFloor(t.x, t.y, 8);
const s3 = W.roomScore(9, 12);
out.livingRoom = { area: lr.area, base: s0, withPalm: s1, withWoodWalls: s2, withMarble: s3, painted };
// sim room motive follows
const rita = E.household()[0];
rita.x = 9; rita.y = 12; E.update(1);
out.ritaRoomMotive = Math.round(rita.motives.room);
// sell values over days
const ch = st.objects.find((o) => o.type === 'sofa_cheap');
const vals = [];
for (let d = 0; d < 15; d += 2) { st.time.day = 1 + d; vals.push(d + ':' + E.sellValue(ch.id)); }
out.sofaSellByDay = vals.join(' ');
st.time.day = 1;
// starter furniture total full refund on day 1
out.starterResale = st.objects.reduce((a, o) => a + E.sellValue(o.id), 0);
// wall in front of the fridge slot (fridge 16,9 r1 faces -X; slot 15,9): edge v,16,9
out.wallBetweenFridgeAndSlot = W.canBuildWall('v,16,9', 1);
console.log(JSON.stringify(out, null, 1));

// Pure-logic placement checks (node vm): blocking doors / slots, buy edge cases.
import vm from 'node:vm'; import fs from 'node:fs';
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const M = ctx.M, E = M.engine, W = M.world;
E.newGame({ seed: 7 });
const st = E.state;
const out = {};
// 1. plant just outside the only exterior door (door h,9,14 between (9,13) and (9,14))
out.plantOutsideDoor = W.canPlace('plant_small', 9, 14, 0);
out.plantInsideDoor = W.canPlace('plant_small', 9, 13, 0);
// buy it and check the house is sealed
const r1 = E.buyObject('plant_small', 9, 14, 0);
const rita = E.household()[0];
out.buyOutside = r1.ok;
out.pathInToOut = !!W.findPath(10, 12, 9, 17);
E.sellObject(r1.obj.id);
// 2. block the fridge front slot (fridge 16,9 r1 faces -X -> slot 15,9)
const fr = st.objects.find((o) => o.type === 'fridge_cheap');
out.fridgeSlots = W.slotsFor(fr).map((s) => [s.x, s.y, s.usable]);
out.blockFridge = W.canPlace('plant_small', 15, 9, 0);
// 3. block toilet access: toilet (12,6) r0 on-slot; neighbours
const to = st.objects.find((o) => o.type === 'toilet');
out.toiletNeighbourBlock = W.canPlace('plant_small', 12, 7, 0);
// 4. insufficient funds
st.money = 10;
out.buyPoor = E.buyObject('chair_wood', 20, 4, 0);
out.wallPoor = E.buildWall('h,20,4', 1, 0);
out.floorPoor = E.paintFloor(20, 4, 8);
out.paperPoor = E.paintWall('h,12,6', 4);
st.money = 6500;
// 5. wall through an object
out.wallThroughBed = W.canBuildWall('v,8,6', 1);
// 6. demolish wall with painting
const pt = st.objects.find((o) => o.type === 'painting_cheap');
out.paintingEdge = W.wallEdgeBehind(pt.x, pt.y, pt.rot);
out.demolishUnderPainting = E.buildWall(W.wallEdgeBehind(pt.x, pt.y, pt.rot), 0);
// 7. door costs
out.doorCost = E.wallCost('h,10,14', 2); out.windowCost = E.wallCost('h,10,14', 3); out.doorToWindow = E.wallCost('h,9,14', 3);
out.demolishDoorRefund = E.wallCost('h,9,14', 0);
// 8. sell value same day vs later
const ch = st.objects.find((o) => o.type === 'chair_wood');
out.sellChairDay1 = E.sellValue(ch.id) + ' / price ' + ch.price;
// 9. place object on top of a sim's tile
out.simTile = [rita.x, rita.y];
const r9 = E.buyObject('plant_small', Math.round(rita.x), Math.round(rita.y), 0);
out.buyOnSim = r9.ok; out.simAfter = [rita.x, rita.y];
// 10. room score of new walled grass room vs floored
for (const k of ['h,19,2','h,20,2','v,22,2','v,22,3','h,19,4','h,20,4','v,19,2','v,19,3']) E.buildWall(k, 1, 0);
const id = W.roomAt(20, 2); const rm = W.rooms().find((r) => r.id === id);
out.grassRoom = { area: rm.area, indoor: rm.indoor, score: W.roomScore(20, 2) };
for (let y = 2; y < 4; y++) for (let x = 19; x < 22; x++) E.paintFloor(x, y, 1);
const rm2 = W.rooms().find((r) => r.id === W.roomAt(20, 2));
out.flooredRoom = { area: rm2.area, indoor: rm2.indoor, score: W.roomScore(20, 2) };
// 11. half-floored room (3 of 6)
console.log(JSON.stringify(out, null, 1));

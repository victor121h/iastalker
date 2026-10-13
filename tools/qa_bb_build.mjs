// Build mode via real mouse: wall drags in 4 directions + diagonal, closed room, floor, door/window, wallpaper, demolish.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'build');
  await L.install(); await L.dismissHelp();
  const R = {};
  const fails = [];
  const expect = (name, cond, data) => { R[name] = { ok: !!cond, data }; if (!cond) fails.push(name); };
  await L.modeBtn('build');
  await L.tool('Parede');
  await L.cam({ k: 0, dist: 24, x: 20.5, z: 6 });
  await L.wait(700);
  await L.shot('0');
  const keysOf = async () => Object.keys(await L.walls());
  const dragWall = async (a, b, label) => {
    const A = await L.cornerScreen(a[0], a[1]), B = await L.cornerScreen(b[0], b[1]);
    const before = await keysOf(); const m0 = await L.money();
    await page.mouse.move(A.x, A.y); await page.mouse.down();
    const steps = 10;
    for (let i = 1; i <= steps; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / steps, A.y + (B.y - A.y) * i / steps); await L.wait(10); }
    await L.wait(150);
    const tipDuring = await L.tip();
    const dragKeys = await L.ev(() => { const d = window.__morada.M.ui.debug.ui.build.drag; return d && { keys: d.keys, cost: d.cost }; });
    if (label) await L.shot(label);
    await page.mouse.up(); await L.wait(250);
    const after = await keysOf(); const m1 = await L.money();
    const added = after.filter((k) => !before.includes(k)); const removed = before.filter((k) => !after.includes(k));
    return { A: [Math.round(A.x), Math.round(A.y), A.el], B: [Math.round(B.x), Math.round(B.y), B.el], tipDuring, dragKeys, added, removed, charged: m0 - m1, tipAfter: await L.tip() };
  };
  // 4 directions
  const e = await dragWall([19, 2], [22, 2], '1-drag-east');
  expect('wall.east', JSON.stringify(e.added.sort()) === JSON.stringify(['h,19,2', 'h,20,2', 'h,21,2']) && e.charged === 210, e);
  const s = await dragWall([22, 2], [22, 5]);
  expect('wall.south', JSON.stringify(s.added.sort()) === JSON.stringify(['v,22,2', 'v,22,3', 'v,22,4']) && s.charged === 210, s);
  const w = await dragWall([22, 5], [19, 5]);
  expect('wall.west', JSON.stringify(w.added.sort()) === JSON.stringify(['h,19,5', 'h,20,5', 'h,21,5']) && w.charged === 210, w);
  const n = await dragWall([19, 5], [19, 2]);
  expect('wall.north', JSON.stringify(n.added.sort()) === JSON.stringify(['v,19,2', 'v,19,3', 'v,19,4']) && n.charged === 210, n);
  await L.shot('2-room');
  const room1 = await L.ev(() => { const W = window.__morada.M.world; const id = W.roomAt(20, 3); const r = W.rooms().find((q) => q.id === id); return { id, area: r && r.area, indoor: r && r.indoor, score: W.roomScore(20, 3), breakdown: W.roomBreakdown ? W.roomBreakdown(20, 3) : null }; });
  expect('room.detected', room1.area === 9, room1);
  // diagonal drags -> straight only
  const d1 = await dragWall([18, 8], [22, 10], '3-diag');
  expect('wall.diagonal.straight', d1.added.length > 0 && d1.added.every((k) => k.startsWith('h,') && k.endsWith(',8')), d1);
  const d2 = await dragWall([19, 11], [22, 14]);
  expect('wall.diagonal45.straight', d2.added.length === 3 && (d2.added.every((k) => k.startsWith('h,')) || d2.added.every((k) => k.startsWith('v,'))), d2);
  const d3 = await dragWall([20, 16], [21, 19]);
  expect('wall.diagonal.steep', d3.added.length === 3 && d3.added.every((k) => k.startsWith('v,20,')), d3);
  // floor paint by drag over the room (wood idx 1)
  await L.tool('Piso');
  const fl = await L.ev(() => window.__morada.M.ui.debug.ui.build.floor);
  const A = await L.tileScreen(19, 2), B = await L.tileScreen(21, 4);
  const m0 = await L.money();
  await page.mouse.move(A.x, A.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 8, A.y + (B.y - A.y) * i / 8); await L.wait(10); }
  await L.wait(150);
  const floorTip = await L.tip();
  await L.shot('4-floor-drag');
  await page.mouse.up(); await L.wait(250);
  const m1 = await L.money();
  const floors = await L.ev(() => { const st = window.__morada.state; const out = []; for (let y = 2; y <= 4; y++) for (let x = 19; x <= 21; x++) out.push(st.lot.floors[y * st.lot.w + x]); return out; });
  const fprice = await L.ev((i) => window.__morada.M.data.FLOORS[i].price, fl);
  expect('floor.drag', floors.every((f) => f === fl) && m0 - m1 === 9 * fprice, { floorTip, charged: m0 - m1, fl, floors });
  const room2 = await L.ev(() => { const W = window.__morada.M.world; const id = W.roomAt(20, 3); const r = W.rooms().find((q) => q.id === id); return { id, area: r && r.area, indoor: r && r.indoor, score: W.roomScore(20, 3), breakdown: W.roomBreakdown ? W.roomBreakdown(20, 3) : null }; });
  expect('room.indoorAfterFloor', room2.indoor, { before: room1, after: room2 });
  // door on room south wall
  await L.tool('Porta');
  const doorEdgeScreen = await L.proj(20.5, 0.6, 5);
  await L.hover(doorEdgeScreen.x, doorEdgeScreen.y);
  const doorTip = await L.tip();
  const doorCostEng = await L.ev(() => window.__morada.M.engine.wallCost('h,20,5', 2));
  await L.shot('5-door-hover');
  let mm0 = await L.money();
  await page.mouse.click(doorEdgeScreen.x, doorEdgeScreen.y); await L.wait(250);
  let mm1 = await L.money();
  const dw = (await L.walls())['h,20,5'];
  expect('door.place', dw && dw.t === 2 && mm0 - mm1 === doorCostEng, { doorTip, doorCostEng, charged: mm0 - mm1, wall: dw });
  // door on a door
  await L.hover(doorEdgeScreen.x + 1, doorEdgeScreen.y);
  const doorTip2 = await L.tip();
  expect('door.onDoor.tip', /porta/i.test(doorTip2 || ''), doorTip2);
  // door on no wall (open yard)
  const nw = await L.proj(15.5, 0, 17);
  await L.hover(nw.x, nw.y);
  const noWallTip = await L.tip();
  mm0 = await L.money();
  await page.mouse.click(nw.x, nw.y); await L.wait(250);
  mm1 = await L.money();
  expect('door.noWall', mm0 === mm1 && /parede/i.test(noWallTip || ''), { noWallTip, after: await L.tip() });
  // window on east wall of room
  await L.tool('Janela');
  const winScreen = await L.proj(22, 1.2, 3.5);
  await L.hover(winScreen.x, winScreen.y);
  const winTip = await L.tip();
  const winCostEng = await L.ev(() => window.__morada.M.engine.wallCost('v,22,3', 3));
  mm0 = await L.money();
  await page.mouse.click(winScreen.x, winScreen.y); await L.wait(250);
  mm1 = await L.money();
  const ww = await L.walls();
  const winKey = Object.keys(ww).find((k) => ww[k].t === 3 && (k === 'v,22,3' || k.startsWith('v,22,')));
  expect('window.place', !!winKey && mm0 - mm1 === winCostEng, { winTip, winCostEng, charged: mm0 - mm1, winKey });
  await L.shot('6-door-window');
  // wallpaper drag over room south wall (from outside) -- h,19,5 / h,21,5 (h,20,5 is a door)
  await L.tool('Papel de parede');
  const paperIdx = await L.ev(() => window.__morada.M.ui.debug.ui.build.paper);
  // choose a different swatch (index 4 terracotta) via click
  const sw = await L.ev(() => { const b = Array.from(document.querySelectorAll('#drawer .swatch'))[4]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.textContent }; });
  await L.tap(sw.x, sw.y); await L.wait(200);
  const paperIdx2 = await L.ev(() => window.__morada.M.ui.debug.ui.build.paper);
  const P1 = await L.proj(19.5, 0.6, 5), P2 = await L.proj(22, 0.6, 4.5);
  await L.hover(P1.x, P1.y);
  const paperHoverTip = await L.tip();
  mm0 = await L.money();
  await page.mouse.move(P1.x, P1.y); await page.mouse.down();
  const P3 = await L.proj(21.5, 0.6, 5);
  for (let i = 1; i <= 10; i++) { await page.mouse.move(P1.x + (P3.x - P1.x) * i / 10, P1.y + (P3.y - P1.y) * i / 10); await L.wait(15); }
  for (let i = 1; i <= 6; i++) { await page.mouse.move(P3.x + (P2.x - P3.x) * i / 6, P3.y + (P2.y - P3.y) * i / 6); await L.wait(15); }
  const paperTip = await L.tip();
  await page.mouse.up(); await L.wait(300);
  mm1 = await L.money();
  const wl = await L.walls();
  const painted = Object.keys(wl).filter((k) => wl[k].c === paperIdx2 && /^(h,(19|20|21),5|v,22,[234])$/.test(k));
  expect('paper.drag', painted.length >= 2 && (mm0 - mm1) === painted.length * (await L.ev((i) => window.__morada.M.data.WALLPAPERS[i].price, paperIdx2)), { paperIdx, paperIdx2, swatch: sw.t, paperHoverTip, paperTip, charged: mm0 - mm1, painted });
  await L.shot('7-paper');
  // demolish drag over the diagonal-test wall
  await L.tool('Demolir');
  const dd = await dragWall([18, 8], [23, 8], '8-demolish-drag');
  expect('demolish.drag', dd.removed.length === d1.added.length && dd.charged === -35 * dd.removed.length, dd);
  // demolish click on the door: refund 75
  const dsc = await L.proj(20.5, 1.0, 5);
  mm0 = await L.money();
  await page.mouse.click(dsc.x, dsc.y); await L.wait(250);
  mm1 = await L.money();
  const afterDoor = (await L.walls())['h,20,5'];
  expect('demolish.clickDoor', !afterDoor && mm1 - mm0 === 75, { refund: mm1 - mm0, afterDoor, tip: await L.tip() });
  // floor back to grass refund
  await L.tool('Piso');
  const grassSw = await L.ev(() => { const b = Array.from(document.querySelectorAll('#drawer .swatch'))[0]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.textContent }; });
  await L.tap(grassSw.x, grassSw.y); await L.wait(150);
  const G = await L.tileScreen(20, 3);
  await L.hover(G.x, G.y);
  const grassTip = await L.tip();
  mm0 = await L.money();
  await page.mouse.click(G.x, G.y); await L.wait(250);
  mm1 = await L.money();
  expect('floor.grassRefund', mm1 - mm0 === Math.round(fprice * 0.5), { grassTip, refund: mm1 - mm0 });
  // demolish object (2 clicks): place a plant via engine first
  await L.ev(() => window.__morada.M.engine.buyObject('plant_big', 20, 9, 0));
  await L.tool('Demolir');
  const pid = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'plant_big' && o.x === 20 && o.y === 9).id);
  const pp = await L.proj(20.5, 0.6, 9.5);
  mm0 = await L.money();
  await page.mouse.click(pp.x, pp.y); await L.wait(250);
  const t1 = await L.tip(); const tb1 = await L.toolbar();
  await L.shot('9-demolish-obj-1');
  await page.mouse.click(pp.x, pp.y); await L.wait(250);
  mm1 = await L.money();
  const stillPlant = await L.ev((id) => !!window.__morada.M.engine.objectById(id), pid);
  expect('demolish.object2clicks', !stillPlant && mm1 - mm0 === 150, { t1, tb1, refund: mm1 - mm0, stillPlant });
  return { fails, R, errs: await L.errs(), notes: await L.notes() };
}

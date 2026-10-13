// Small desktop checks: door success tip, shift multi-place, Esc during move, R on wall items, blocked wall drag.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'misc2');
  await L.install(); await L.dismissHelp();
  const R = {};
  const placing = () => L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { type: p.type, x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason, moveId: p.moveId }; });
  // (a) door tip sequence
  await L.ev(() => { const E = window.__morada.M.engine; for (const k of ['h,19,4', 'h,20,4', 'h,21,4']) E.buildWall(k, 1, 0); });
  await L.modeBtn('build');
  await L.cam({ k: 0, dist: 22, x: 20.5, z: 5 });
  await L.wait(1500);
  await L.tool('Porta');
  const P = await L.proj(20.5, 0.6, 4);   // free-standing wall is full height
  await L.hover(P.x, P.y);
  R.doorHover = await L.tip();
  await page.mouse.click(P.x, P.y);
  const seq = [];
  for (const ms of [0, 60, 250, 800]) { if (ms) await L.wait(ms); seq.push({ ms, tip: await L.tip(), bad: await L.ev(() => document.getElementById('tip').classList.contains('bad')) }); }
  R.doorTipSeq = seq;
  await L.shot('1-door-after-click');
  // (f) wall drag through an object (bed at 7..8, 6..7): corners (8,5)->(8,9) vertical v,8,5..8 crosses bed
  await L.tool('Parede');
  await L.cam({ k: 0, dist: 22, x: 9, z: 8 });
  await L.wait(1500);
  { const A = await L.cornerScreen(8, 4), B = await L.cornerScreen(8, 9); await page.mouse.move(A.x, A.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 10, A.y + (B.y - A.y) * i / 10); await L.wait(10); } await L.wait(100); R.blockedTip = await L.tip(); R.blockedDrag = await L.ev(() => { const d = window.__morada.M.ui.debug.ui.build.drag; return d && { keys: d.keys, blocked: d.blocked, cost: d.cost }; }); await L.shot('2-wall-blocked'); await page.keyboard.press('Escape'); await page.mouse.up(); await L.wait(200); }
  R.afterEscWalls = Object.keys(await L.walls()).filter((k) => k.startsWith('v,8,'));
  // (b) shift-click multi place in buy
  await L.modeBtn('buy');
  await L.cam({ k: 0, dist: 24, x: 20.5, z: 8 });
  await L.wait(1500);
  await L.clickCard('plant_small');
  const n0 = await L.ev(() => window.__morada.state.objects.length);
  await page.keyboard.down('Shift');
  for (const [x, y] of [[19, 7], [20, 7], [21, 7]]) { const t = await L.tileScreen(x, y); await L.hover(t.x, t.y); await page.mouse.click(t.x, t.y); await L.wait(200); }
  await page.keyboard.up('Shift');
  R.shiftPlaced = (await L.ev(() => window.__morada.state.objects.length)) - n0;
  R.stillPlacingAfterShift = !!(await placing());
  await page.keyboard.press('Escape'); await L.wait(150);
  // (c) Esc during move -> stays
  const pl = await L.ev(() => window.__morada.state.objects.filter((o) => o.type === 'plant_small').slice(-1)[0]);
  const pp = await L.ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); for (const hgt of [0.3, 0.5, 0.15]) { const p = M.render.project(o.x + 0.5, hgt, o.y + 0.5); const pk = M.render.pick(p.clientX, p.clientY); if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY }; } return null; }, pl.id);
  if (pp) {
    await page.mouse.click(pp.x, pp.y); await L.wait(200);
    await L.clickToolbar(/Mover/);
    const t = await L.tileScreen(20, 10); await L.hover(t.x, t.y);
    R.moveGhost = await placing();
    await page.keyboard.press('Escape'); await L.wait(200);
    R.afterEscMove = await L.ev((id) => { const o = window.__morada.M.engine.objectById(id); return [o.x, o.y]; }, pl.id);
    R.afterEscMoveOrig = [pl.x, pl.y];
    R.afterEscSel = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    R.modeAfterEsc = await L.ev(() => window.__morada.M.ui.mode);
  }
  // (d) R on wall item over a wall: interior back wall of the bedroom h,8,6 -> tile (8,6)? bed there; use living room west wall v,7,9 interior tile (7,9) rot 3
  await L.cam({ k: 0, dist: 20, x: 9, z: 10 });
  await L.wait(1500);
  await L.clickCard('painting_cheap');
  { const t = await L.tileScreen(7, 9); await L.hover(t.x, t.y); }
  const r0 = await placing();
  await page.keyboard.press('r'); await L.wait(120);
  const r1 = await placing();
  await page.keyboard.press('r'); await L.wait(120);
  const r2 = await placing();
  R.wallItemRotate = { r0, r1, r2, tip: await L.tip() };
  await L.shot('3-painting-ghost');
  await page.keyboard.press('Escape');
  // (e) rotate near lot edge: sofa at the east edge
  await L.cam({ k: 0, dist: 24, x: 20.5, z: 8 });
  await L.wait(1500);
  await L.clickCard('sofa_cheap');
  { let p = await placing(); let n = 0; while (p.rot !== 0 && n++ < 4) { await page.keyboard.press('r'); p = await placing(); } }
  { const t = await L.tileScreen(23, 9); await L.hover(t.x, t.y); }
  const s0 = await placing();
  await page.keyboard.press('r'); await L.wait(120);
  const s1 = await placing();
  R.edgeRotate = { s0, s1 };
  await page.keyboard.press('Escape');
  return { R, errs: await L.errs() };
}

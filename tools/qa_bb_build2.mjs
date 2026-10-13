// Door / window / wallpaper / demolish-click on cut-away walls via real mouse; pickEdge tolerance survey.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'build2');
  await L.install(); await L.dismissHelp();
  const R = {}; const fails = [];
  const expect = (name, cond, data) => { R[name] = { ok: !!cond, data }; if (!cond) fails.push(name); };
  // setup room 19..21 x 2..4 with floor (engine)
  await L.ev(() => {
    const E = window.__morada.M.engine;
    for (const k of ['h,19,2','h,20,2','h,21,2','h,19,5','h,20,5','h,21,5','v,19,2','v,19,3','v,19,4','v,22,2','v,22,3','v,22,4']) E.buildWall(k, 1, 0);
    for (let y = 2; y <= 4; y++) for (let x = 19; x <= 21; x++) E.paintFloor(x, y, 1);
  });
  await L.modeBtn('build');
  await L.cam({ k: 0, dist: 24, x: 20.5, z: 6 });
  await L.wait(800);
  // survey pickEdge along the front (south) wall h,20,5 at several heights
  const survey = await L.ev(() => {
    const M = window.__morada.M; const out = {};
    for (const hgt of [0, 0.1, 0.2, 0.3, 0.38, 0.45, 0.6, 0.9, 1.5]) {
      const p = M.render.project(20.5, hgt, 5);
      const e = M.render.pickEdge(p.clientX, p.clientY);
      out[hgt] = e ? e.key : null;
    }
    // east wall v,22,3
    const out2 = {};
    for (const hgt of [0, 0.2, 0.38, 0.6, 1.2]) { const p = M.render.project(22, hgt, 3.5); const e = M.render.pickEdge(p.clientX, p.clientY); out2[hgt] = e ? e.key : null; }
    // pixel distance between height 0 and 0.4 on the front wall
    const a = M.render.project(20.5, 0, 5), b = M.render.project(20.5, 0.4, 5);
    return { southWall_h20_5: out, eastWall_v22_3: out2, stubPx: Math.round(a.clientY - b.clientY) };
  });
  R.survey = survey;
  await L.tool('Porta');
  const P = await L.proj(20.5, 0.15, 5);
  await L.hover(P.x, P.y);
  const doorTip = await L.tip();
  await L.shot('1-door-hover-stub');
  let m0 = await L.money();
  await page.mouse.click(P.x, P.y); await L.wait(250);
  let m1 = await L.money();
  const dw = (await L.walls())['h,20,5'];
  expect('door.place', dw && dw.t === 2 && m0 - m1 === 115, { doorTip, charged: m0 - m1, dw });
  await L.hover(P.x + 2, P.y);
  R.doorOnDoorTip = await L.tip();
  // door on empty edge
  const nw = await L.proj(15.5, 0, 17);
  await L.hover(nw.x, nw.y);
  const noWallTip = await L.tip();
  m0 = await L.money(); await page.mouse.click(nw.x, nw.y); await L.wait(250); m1 = await L.money();
  expect('door.noWall', m0 === m1 && /parede/i.test(noWallTip || ''), { noWallTip, after: await L.tip() });
  // window on east wall stub
  await L.tool('Janela');
  const Wp = await L.proj(22, 0.15, 3.5);
  await L.hover(Wp.x, Wp.y);
  const winTip = await L.tip();
  m0 = await L.money(); await page.mouse.click(Wp.x, Wp.y); await L.wait(250); m1 = await L.money();
  const ww = (await L.walls())['v,22,3'];
  expect('window.place', ww && ww.t === 3 && m0 - m1 === 75, { winTip, charged: m0 - m1, ww });
  // window on a door -> replaces? (door->window)
  await L.hover(P.x, P.y);
  R.windowOverDoorTip = await L.tip();
  await L.shot('2-door-window');
  // wallpaper: click back wall interior faces (full height) h,20,2 and v,19,3 and the front stub h,19,5
  await L.tool('Papel de parede');
  const sw = await L.ev(() => { const b = Array.from(document.querySelectorAll('#drawer .swatch'))[4]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await L.tap(sw.x, sw.y); await L.wait(200);
  const paintAt = async (wx, wy, wz) => { const p = await L.proj(wx, wy, wz); await L.hover(p.x, p.y); const tip = await L.tip(); const key = await L.ev(([x, y]) => { const e = window.__morada.M.render.pickEdge(x, y); return e && e.key; }, [p.x, p.y]); const a = await L.money(); await page.mouse.click(p.x, p.y); await L.wait(250); return { key, tip, charged: a - (await L.money()) }; };
  R.paperBack = await paintAt(20.5, 1.3, 2);   // back wall interior face
  R.paperLeft = await paintAt(19, 1.3, 3.5);   // left wall interior face
  R.paperFront = await paintAt(19.5, 0.15, 5); // front stub
  const wl = await L.walls();
  R.paperState = { 'h,20,2': wl['h,20,2'], 'v,19,3': wl['v,19,3'], 'h,19,5': wl['h,19,5'] };
  expect('paper.click', wl['h,20,2'].c === 4 && wl['v,19,3'].c === 4 && wl['h,19,5'].c === 4, R.paperState);
  // drag across back wall
  { const A = await L.proj(19.3, 1.3, 2), B = await L.proj(21.7, 1.3, 2); const a = await L.money(); await page.mouse.move(A.x, A.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 10, A.y + (B.y - A.y) * i / 10); await L.wait(15); } const tip = await L.tip(); await page.mouse.up(); await L.wait(250); const w2 = await L.walls(); R.paperDrag = { tip, charged: a - (await L.money()), c: ['h,19,2', 'h,20,2', 'h,21,2'].map((k) => w2[k].c) }; }
  await L.shot('3-paper');
  // is the outside of the room also repainted? screenshot from the north
  await L.cam({ k: 2, dist: 18, x: 20.5, z: 2 });
  await L.wait(700);
  await L.shot('4-paper-outside-north');
  await L.cam({ k: 0, dist: 24, x: 20.5, z: 6 });
  await L.wait(600);
  // demolish click on the door stub
  await L.tool('Demolir');
  m0 = await L.money(); await page.mouse.click(P.x, P.y); await L.wait(250); m1 = await L.money();
  expect('demolish.clickDoor', !(await L.walls())['h,20,5'] && m1 - m0 === 75, { refund: m1 - m0, tip: await L.tip() });
  // demolish a wall segment carrying a painting from the other side? hang painting on back wall interior via engine and try to demolish it
  await L.ev(() => window.__morada.M.engine.buyObject('painting_cheap', 20, 2, 0));
  const bk = await L.proj(20.5, 1.0, 2);
  m0 = await L.money(); await page.mouse.click(bk.x, bk.y); await L.wait(250); m1 = await L.money();
  R.demolishPaintedWall = { refund: m1 - m0, tip: await L.tip(), wall: (await L.walls())['h,20,2'], tb: await L.toolbar(), sel: await L.ev(() => window.__morada.M.ui.debug.ui.build.sel) };
  await L.shot('5-demolish-painting-wall');
  // demolish drag over the room perimeter including the painted wall
  return { fails, R, errs: await L.errs() };
}

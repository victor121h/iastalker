// Buy-mode feedback + edge cases via real mouse: invalid placement, funds, move, sell in use, Delete, catalog wheel.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'misc');
  await L.install(); await L.dismissHelp();
  const R = {}; const fails = [];
  const expect = (name, cond, data) => { R[name] = { ok: !!cond, data }; if (!cond) fails.push(name); };
  const placing = () => L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { type: p.type, x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason, moveId: p.moveId }; });
  const ghostVis = () => L.ev(() => { const g = window.__morada.M.render.scene.children.find((c) => c.name === 'ghost'); return g ? g.children.filter((c) => c.visible).length : 'nogroup'; });
  // ---- set up: Rita uses the sofa (seated), Caio showers
  const ids = await L.ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const [rita, caio] = E.household();
    const sofa = st.objects.find((o) => o.type === 'sofa_cheap');
    const shower = st.objects.find((o) => o.type === 'shower');
    rita.motives.comfort = -30; caio.motives.hygiene = -40;
    for (const s of [rita, caio]) for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    const ki = E.getInteractions(rita.id, sofa.id).find((i) => i.enabled);
    const ks = E.getInteractions(caio.id, shower.id).find((i) => i.enabled);
    E.queueInteraction(rita.id, sofa.id, ki.key, 'player');
    E.queueInteraction(caio.id, shower.id, ks.key, 'player');
    for (let i = 0; i < 400; i++) { E.update(0.5); const a = rita.queue[0], b = caio.queue[0]; if (a && a.phase === 'do' && b && b.phase === 'do') break; }
    return { rita: rita.id, caio: caio.id, sofa: sofa.id, shower: shower.id, rq: rita.queue.map((a) => a.label + ':' + a.phase), cq: caio.queue.map((a) => a.label + ':' + a.phase), rpos: [rita.x, rita.y], cpos: [caio.x, caio.y], ki: ki.label, ks: ks.label };
  });
  R.setup = ids;
  await L.ev(() => window.__morada.M.main.setSpeed(1));
  await L.wait(800);
  await L.modeBtn('buy');
  await L.cam({ k: 0, dist: 26, x: 11, z: 10 });
  await L.wait(600);
  await L.shot('0-buy-inuse');
  // ---- move the sofa Rita sits on via toolbar 'Mover'
  const sofaPt = await L.ev((id) => {
    const M = window.__morada.M; const o = M.engine.objectById(id); const s = M.world.rotatedSize(o.type, o.rot);
    for (const hgt of [0.4, 0.6, 0.25]) for (const fx of [0.2, 0.8, 0.5]) for (const fy of [0.5, 0.3, 0.7]) { const p = M.render.project(o.x + s.w * fx, hgt, o.y + s.h * fy); const pk = M.render.pick(p.clientX, p.clientY); if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY }; }
    return null;
  }, ids.sofa);
  R.sofaPt = sofaPt;
  if (sofaPt) {
    await page.mouse.click(sofaPt.x, sofaPt.y); await L.wait(250);
    R.sofaSelTb = await L.toolbar();
    await L.clickToolbar(/Mover/);
    R.movePlacing = await placing();
    const t = await L.tileScreen(10, 16);
    await L.hover(t.x, t.y);
    R.moveGhost = await placing(); R.moveTip = await L.tip();
    const m0 = await L.money();
    await page.mouse.click(t.x, t.y); await L.wait(300);
    const after = await L.ev(([sid, rid]) => { const E = window.__morada.M.engine; const o = E.objectById(sid); const r = E.simById(rid); return { sofa: [o.x, o.y, o.rot], rita: [r.x, r.y], anim: r.anim, seated: r.seated, q: r.queue.map((a) => a.label + ':' + a.phase + (a.cancel ? ':cancel' : '')) }; }, [ids.sofa, ids.rita]);
    expect('move.sofaInUse', after.sofa[0] === 10 && after.sofa[1] === 16 && (await L.money()) === m0, after);
    await L.shot('1-sofa-moved-paused');
  }
  // ---- sell the shower Caio is in, with confirm
  await L.cam({ k: 0, dist: 20, x: 15, z: 7 });
  await L.ev(() => window.__morada.M.render.setWallMode('up'));
  await L.wait(500);
  const shPt = await L.ev((id) => {
    const M = window.__morada.M; const o = M.engine.objectById(id);
    for (const hgt of [1.0, 1.5, 0.5, 2.0]) for (const fx of [0.5, 0.2, 0.8]) for (const fy of [0.5, 0.8, 0.2]) { const p = M.render.project(o.x + fx, hgt, o.y + fy); const pk = M.render.pick(p.clientX, p.clientY); if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY }; }
    return null;
  }, ids.shower);
  R.shPt = shPt;
  if (shPt) {
    await page.mouse.click(shPt.x, shPt.y); await L.wait(250);
    R.showerSel = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    await L.clickToolbar(/Vender/); R.showerConfirmTb = await L.toolbar();
    await L.clickToolbar(/Confirmar/);
  }
  const caioAfterSell = await L.ev(([cid, shid]) => { const E = window.__morada.M.engine; const c = E.simById(cid); return { gone: !E.objectById(shid), caio: [c.x, c.y], anim: c.anim, q: c.queue.map((a) => a.label + ':' + a.phase + (a.cancel ? ':cancel' : '')) }; }, [ids.caio, ids.shower]);
  expect('sell.showerInUse', caioAfterSell.gone, caioAfterSell);
  await L.ev(() => window.__morada.M.render.setWallMode('cutaway'));
  // ---- back to live, let time run and look at both
  await L.modeBtn('live');
  await L.ev(() => { const E = window.__morada.M.engine; for (let i = 0; i < 20; i++) E.update(0.5); });
  await L.wait(1500);
  const afterLive = await L.ev(([rid, cid]) => { const E = window.__morada.M.engine; const r = E.simById(rid), c = E.simById(cid); const f = (s) => ({ pos: [+s.x.toFixed(2), +s.y.toFixed(2)], anim: s.anim, seated: s.seated, q: s.queue.map((a) => a.label + ':' + a.phase) }); return { rita: f(r), caio: f(c) }; }, [ids.rita, ids.caio]);
  R.afterLive = afterLive;
  expect('inuse.recovered', afterLive.rita.anim !== 'sit' && afterLive.caio.anim !== 'shower', afterLive);
  await L.cam({ k: 0, dist: 26, x: 11, z: 10 });
  await L.wait(400);
  await L.shot('2-after-live');
  // ---- invalid placement feedback
  await L.modeBtn('buy');
  await L.cam({ k: 0, dist: 26, x: 11, z: 10 });
  await L.wait(500);
  // overlap: chair over the dining table
  await L.clickCard('chair_wood');
  { const t = await L.tileScreen(13, 11); await L.hover(t.x, t.y); }
  R.overlap = { p: await placing(), tip: await L.tip() };
  await L.shot('3-overlap');
  { const m0 = await L.money(); const t = await L.tileScreen(13, 11); await page.mouse.click(t.x, t.y); await L.wait(200); R.overlapClick = { charged: m0 - (await L.money()), tip: await L.tip() }; }
  expect('feedback.overlap', R.overlap.p && !R.overlap.p.ok && /objeto/.test(R.overlap.tip || '') && R.overlapClick.charged === 0, R.overlap);
  // off lot: hover beyond the north edge
  { const p = await L.proj(11, 0, -3); await L.hover(p.x, p.y); R.offLot = { p: await placing(), tip: await L.tip(), ghost: await ghostVis() }; }
  await L.shot('4-offlot');
  // crossing a wall: 2x1 sofa straddling a wall (house west wall v,7,9 between (6,9),(7,9))
  await page.keyboard.press('Escape');
  await L.clickCard('sofa_cheap');
  { const t = await L.tileScreen(6, 9); await L.hover(t.x, t.y); R.straddle = { p: await placing(), tip: await L.tip() }; }
  // wall item in the open yard
  await page.keyboard.press('Escape');
  await L.clickCard('mirror');
  { const t = await L.tileScreen(4, 16); await L.hover(t.x, t.y); R.mirrorYard = { p: await placing(), tip: await L.tip() }; }
  await L.shot('5-mirror-yard');
  expect('feedback.wallItemNoWall', R.mirrorYard.p && !R.mirrorYard.p.ok, R.mirrorYard);
  // mirror on an interior wall: bathroom inner face of north wall? tile (13,7)? -> try living room south side h,9,14 is door; use kitchen
  // access blocked: fridge facing a wall (rot 0 at y=13 south wall inside kitchen) — tile (15,13) front slot (15,14) is outside the wall
  await page.keyboard.press('Escape');
  await L.clickCard('fridge_cheap');
  { let r = await placing(); let n = 0; while (r.rot !== 0 && n++ < 4) { await page.keyboard.press('r'); r = await placing(); } }
  { const t = await L.tileScreen(15, 13); await L.hover(t.x, t.y); R.fridgeFacingWall = { p: await placing(), tip: await L.tip() }; }
  await L.shot('6-fridge-facing-wall');
  // blocking the only exterior door with a plant: allowed?
  await page.keyboard.press('Escape');
  await L.clickCard('plant_big');
  { const t = await L.tileScreen(9, 14); await L.hover(t.x, t.y); R.blockDoor = { p: await placing(), tip: await L.tip() }; }
  await L.shot('7-block-door');
  await page.keyboard.press('Escape');
  // ---- insufficient funds
  await L.ev(() => { window.__morada.M.engine.state.money = 100; });
  await L.wait(300);
  const poorCard = await L.card('sofa_cheap');
  await L.clickCard('sofa_cheap');
  { const t = await L.tileScreen(4, 16); await L.hover(t.x, t.y); R.poor = { card: poorCard, p: await placing(), tip: await L.tip() }; const m0 = await L.money(); await page.mouse.click(t.x, t.y); await L.wait(200); R.poor.charged = m0 - (await L.money()); R.poor.after = await L.tip(); R.poor.tb = await L.toolbar(); }
  await L.shot('8-poor');
  expect('feedback.poor', R.poor.p && !R.poor.p.ok && /insuficiente/.test(R.poor.tip || '') && R.poor.charged === 0, R.poor);
  await page.keyboard.press('Escape');
  // poor in build: wall drag of 3 = 210 > 100
  await L.modeBtn('build'); await L.tool('Parede');
  { const A = await L.cornerScreen(2, 16), B = await L.cornerScreen(5, 16); await page.mouse.move(A.x, A.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 8, A.y + (B.y - A.y) * i / 8); await L.wait(10); } await L.wait(100); const tip = await L.tip(); await L.shot('9-poor-wall'); await page.mouse.up(); await L.wait(200); R.poorWall = { tip, after: await L.tip(), money: await L.money(), walls: Object.keys(await L.walls()).filter((k) => /^h,[2-4],16$/.test(k)) }; }
  expect('feedback.poorWall', R.poorWall.money === 100 && R.poorWall.walls.length === 0, R.poorWall);
  // floor 3x3 drag of stone (18) = 162 > 100
  await L.tool('Piso');
  { const A = await L.tileScreen(2, 15), B = await L.tileScreen(4, 17); await page.mouse.move(A.x, A.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 8, A.y + (B.y - A.y) * i / 8); await L.wait(10); } await L.wait(100); const tip = await L.tip(); await page.mouse.up(); await L.wait(200); R.poorFloor = { tip, money: await L.money() }; }
  await L.ev(() => { window.__morada.M.engine.state.money = 6500; });
  // ---- Delete key sells selected object directly
  await L.modeBtn('buy');
  await L.cam({ k: 0, dist: 26, x: 11, z: 10 });
  await L.wait(400);
  const plant = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'plant_small'));
  const pp = await L.ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); for (const hgt of [0.3, 0.5, 0.15, 0.7]) { const p = M.render.project(o.x + 0.5, hgt, o.y + 0.5); const pk = M.render.pick(p.clientX, p.clientY); if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY }; } return null; }, plant.id);
  if (pp) {
    await page.mouse.click(pp.x, pp.y); await L.wait(200);
    const m0 = await L.money();
    await page.keyboard.press('Delete'); await L.wait(250);
    R.del = { sel: plant.id, gone: await L.ev((id) => !window.__morada.M.engine.objectById(id), plant.id), refund: (await L.money()) - m0 };
  } else R.del = 'plant not pickable';
  // ---- catalog mouse wheel scroll (should scroll list, not zoom camera)
  const camBefore = await L.ev(() => window.__morada.M.render.getCamera().dist);
  const sc0 = await L.ev(() => { const g = document.querySelector('#drawer .catalog'); g.scrollTop = 0; return { st: g.scrollTop, sh: g.scrollHeight, ch: g.clientHeight }; });
  const gr = await L.ev(() => { const r = document.querySelector('#drawer .catalog').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(gr.x, gr.y);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 400); await L.wait(60); }
  await L.wait(400);
  const sc1 = await L.ev(() => document.querySelector('#drawer .catalog').scrollTop);
  const camAfter = await L.ev(() => window.__morada.M.render.getCamera().dist);
  R.wheel = { sc0, sc1, camBefore, camAfter };
  expect('catalog.wheelScroll', sc1 > sc0.st && Math.abs(camAfter - camBefore) < 0.01, R.wheel);
  await L.shot('10-catalog-scrolled');
  // ---- Esc during move restores
  return { fails, R, errs: await L.errs(), notes: await L.notes() };
}

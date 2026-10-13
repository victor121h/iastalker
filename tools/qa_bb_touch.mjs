// Phone 390x844 touch spot-check of Buy and Build.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'touch');
  await L.install(); await L.dismissHelp();
  const R = {}; const fails = [];
  const expect = (name, cond, data) => { R[name] = { ok: !!cond, data }; if (!cond) fails.push(name); };
  const placing = () => L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { type: p.type, x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason }; });
  await L.shot('0-live');
  await L.modeBtn('buy');
  await L.shot('1-buy');
  R.drawer = await L.ev(() => { const d = document.getElementById('drawer').getBoundingClientRect(); return { top: d.top, h: d.height, collapsed: document.getElementById('drawer').classList.contains('collapsed') }; });
  const c = await L.clickCard('lamp_floor');
  await L.wait(400);
  R.afterCard = { p: await placing(), drawer: await L.ev(() => document.getElementById('drawer').classList.contains('collapsed')), tb: await L.toolbar() };
  await L.shot('2-placing');
  await L.cam({ k: 0, dist: 30, x: 20, z: 5 });
  await L.wait(500);
  const t = await L.tileScreen(20, 4);
  R.tile = t;
  await L.tap(t.x, t.y); await L.wait(300);
  R.afterTap = { p: await placing(), tip: await L.tip(), n: await L.ev(() => window.__morada.state.objects.length) };
  await L.clickToolbar(/Girar/);
  R.afterRot = await placing();
  await L.shot('3-ghost');
  const m0 = await L.money();
  await L.clickToolbar(/Comprar aqui/);
  const m1 = await L.money();
  const lamp = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'lamp_floor' && o.x === 20 && o.y === 4));
  expect('touch.buy', lamp && m0 - m1 === 50 && lamp.rot === 1, { lamp, cost: m0 - m1, R: R.afterTap });
  await L.shot('4-bought');
  // select by tap, sell with confirm
  if (lamp) {
    await L.ev(() => { const d = document.getElementById('drawer'); if (!d.classList.contains('collapsed')) document.querySelector('#drawer .drawer-grip').click(); });
    await L.wait(300);
    const pt = await L.ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); for (const hgt of [0.8, 1.2, 0.4, 1.5]) { const p = M.render.project(o.x + 0.5, hgt, o.y + 0.5); const el = document.elementFromPoint(p.clientX, p.clientY); const pk = M.render.pick(p.clientX, p.clientY); if (el && el.tagName === 'CANVAS' && pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY }; } return null; }, lamp.id);
    R.lampPt = pt;
    if (pt) {
      await L.tap(pt.x, pt.y); await L.wait(300);
      R.selTb = await L.toolbar();
      await L.shot('5-selected');
      await L.clickToolbar(/Vender/);
      R.confTb = await L.toolbar();
      await L.clickToolbar(/Confirmar/);
      expect('touch.sell', await L.ev((id) => !window.__morada.M.engine.objectById(id), lamp.id), R.selTb);
    }
  }
  // build: wall by touch drag
  await L.modeBtn('build');
  await L.tool('Parede');
  await L.ev(() => { const d = document.getElementById('drawer'); if (!d.classList.contains('collapsed')) document.querySelector('#drawer .drawer-grip').click(); });
  await L.wait(300);
  await L.shot('6-build');
  const A = await L.cornerScreen(19, 7), B = await L.cornerScreen(22, 7);
  R.wallPts = { A, B };
  const w0 = Object.keys(await L.walls()).length;
  await L.drag(A, B, 12);
  const w1 = Object.keys(await L.walls()).length;
  expect('touch.wallDrag', w1 - w0 === 3, { w0, w1, tip: await L.tip() });
  await L.shot('7-wall');
  // door by tap
  await L.ev(() => { const d = document.getElementById('drawer'); if (d.classList.contains('collapsed')) document.querySelector('#drawer .drawer-grip').click(); });
  await L.wait(300);
  await L.tool('Porta');
  await L.ev(() => { const d = document.getElementById('drawer'); if (!d.classList.contains('collapsed')) document.querySelector('#drawer .drawer-grip').click(); });
  await L.wait(300);
  const dp = await L.proj(20.5, 0.4, 7);
  await L.tap(dp.x, dp.y); await L.wait(300);
  const dw = (await L.walls())['h,20,7'];
  expect('touch.door', dw && dw.t === 2, { dw, tip: await L.tip() });
  await L.shot('8-door');
  // one-finger drag in build mode with no tool effect: try pan with floor tool? record camera change on 'Piso' drag (should paint, not pan)
  return { fails, R, errs: await L.errs() };
}

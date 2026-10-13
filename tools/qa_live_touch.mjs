// QA live (touch only): one-finger drag pan, two-finger pinch, long press, double tap portrait, tap-then-drag on object.
// node tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_live_touch.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'touch');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const cdp = await page.context().newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const cam = () => L.ev(() => window.__morada.M.render.getCamera());
  await L.ev(() => { window.__pa = []; const v = document.getElementById('view'); ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => v.addEventListener(t, (e) => window.__pa.push(t + '#' + e.pointerId), true)); });
  const psize = () => L.ev(() => ({ n: window.__morada.M.ui.debug.ui.pointers.size, g: window.__morada.M.ui.debug.ui.gesture && window.__morada.M.ui.debug.ui.gesture.kind, ev: window.__pa.splice(0).join(' ') }));
  await L.ev(() => { window.__pm = []; const t0 = performance.now(); new MutationObserver((ms) => { for (const m of ms) { m.addedNodes.forEach((n) => { if (n.id === 'pie') window.__pm.push('+pie ' + Math.round(performance.now() - t0)); }); m.removedNodes.forEach((n) => { if (n.id === 'pie') window.__pm.push('-pie ' + Math.round(performance.now() - t0) + ' ' + (new Error().stack.split('\n').slice(2, 6).join(' | '))); }); } }).observe(document.body, { childList: true }); });
  const sel = await L.sel();
  const q0 = (await L.queue(sel)).length;
  // one-finger drag on empty ground
  const c0 = await cam();
  await touch('touchStart', [[200, 250]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[200 + i * 8, 250 + i * 5]]); await L.wait(16); }
  await touch('touchEnd', []);
  await L.wait(300);
  const c1 = await cam();
  out.afterDrag = await psize();
  out.drag = { moved: Math.hypot(c1.x - c0.x, c1.z - c0.z), queueGrew: (await L.queue(sel)).length > q0, pie: !!(await L.pie()) };
  // pinch out (zoom in)
  await touch('touchStart', [[150, 400], [240, 400]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[150 - i * 6, 400], [240 + i * 6, 400]]); await L.wait(16); }
  await touch('touchEnd', []);
  await L.wait(400);
  const c2 = await cam();
  out.afterPinch = await psize();
  out.pinch = { dist0: c1.dist, dist1: c2.dist, queueGrew: (await L.queue(sel)).length > q0, pie: !!(await L.pie()) };
  // long press on the floor (should be ignored)
  const t = await L.tileScreen(5, 15);
  await touch('touchStart', [[t.x, t.y]]); await L.wait(1100); await touch('touchEnd', []); await L.wait(300);
  out.afterLong = await psize();
  out.longPress = { queueGrew: (await L.queue(sel)).length > q0, pie: !!(await L.pie()) };
  // plain CDP tap on the fridge first
  {
    const fr0 = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
    await L.focus(15, 10); await L.wait(600);
    const p0 = await L.objFind(fr0);
    await L.ev(() => { const R = window.__morada.M.render; if (!R.__wrapped) { const op = R.pick; window.__picks = []; R.pick = function (x, y) { const r = op.apply(this, arguments); window.__picks.push(Math.round(x) + ',' + Math.round(y) + '=' + JSON.stringify(r)); return r; }; R.__wrapped = true; } const U = window.__morada.M.ui.debug.ui; window.__uist = () => ({ g: U.gesture, pie: !!U.pie, modals: U.modals.length, mode: U.mode, narrow: U.narrow }); });
    out.plainAt = { p0, hit: await L.ev(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.tagName + '.' + e.className); }, [p0.x, p0.y]), pick: await L.ev(([x, y]) => window.__morada.M.render.pick(x, y), [p0.x, p0.y]) };
    await touch('touchStart', [[p0.x, p0.y]]); await L.wait(60); await touch('touchEnd', []); await L.wait(150);
    out.plainPicks = await L.ev(() => window.__picks.splice(0));
    out.plainUi = await L.ev(() => window.__uist());
    out.plainTip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
    out.plainSim = await L.ev(() => { const s = window.__morada.M.engine.simById(window.__morada.state.settings.selectedSimId); return { id: s.id, hidden: s.hidden, q: s.queue.map((a) => a.label) }; });
    await L.wait(300);
    out.plainTapPie = !!(await L.pie());
    out.afterPlain = await psize();
    if (out.plainTapPie) { await L.settle(); await L.tap(3, 300); await L.wait(250); }
    out.afterScrimTap = { pie: !!(await L.pie()), ui: await L.ev(() => window.__uist()), picks: await L.ev(() => window.__picks.splice(0)) };
    await L.ev(() => { window.__pe = []; const v = document.getElementById('view'); ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((t) => v.addEventListener(t, (e) => window.__pe.push(t + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true)); });
  }
  // small jitter tap (finger moves 8px) on an object: should still open the pie
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  await L.focus(15, 10); await L.wait(500);
  const p = await L.objFind(fr);
  await touch('touchStart', [[p.x, p.y]]); await touch('touchMove', [[p.x + 5, p.y + 6]]); await L.wait(60); await touch('touchEnd', []); await L.wait(450);
  out.jitterTapPie = !!(await L.pie());
  out.jitterPicks = await L.ev(() => window.__picks.splice(0));
  out.jitterUi = await L.ev(() => window.__uist());
  out.pieMut = await L.ev(() => window.__pm.slice());
  out.jitterEvents = await L.ev(() => window.__pe.splice(0));
  out.jitterTip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
  if (out.jitterTapPie) { await L.settle(); await L.tap(3, 300); await L.wait(250); }
  // double tap portrait focuses
  const por = await L.ev(() => { const b = document.querySelectorAll('.portrait')[1]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const c3 = await cam();
  await L.ev(() => { window.__pc = []; document.querySelectorAll('.portrait').forEach((b) => ['click', 'dblclick'].forEach((t) => b.addEventListener(t, () => window.__pc.push(t)))); });
  await L.tap(por.x, por.y); await L.wait(80); await L.tap(por.x, por.y); await L.wait(900);
  const c4 = await cam();
  out.doubleTapPortrait = { camMoved: Math.hypot(c4.x - c3.x, c4.z - c3.z), sel: await L.sel(), events: await L.ev(() => window.__pc.slice()) };
  // double tap on a sim in the world
  out.errs = await L.errs();
  return out;
}

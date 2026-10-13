// Scripted UI walkthrough for tools/ui_check.mjs:
//   node tools/ui_check.mjs --nohelp --clear --script tools/ui_scenario.mjs [--w 390 --h 844 --touch]
// Writes screenshots to $UI_SHOTS (default: tools/../shots-ui) and returns a summary of checks.
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, { W, H }) {
  const dir = process.env.UI_SHOTS || path.resolve('shots-ui');
  fs.mkdirSync(dir, { recursive: true });
  const tag = W < 600 ? 'phone' : 'desk';
  const shot = async (name) => { const f = path.join(dir, `${tag}-${name}.png`); await page.screenshot({ path: f }); return f; };
  const out = { shots: [], checks: {} };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const isTouch = await ev(() => matchMedia('(pointer: coarse)').matches);
  const tap = async (x, y) => { if (isTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  // record which phase a render-frame error happens in
  await ev(() => {
    window.__step = 'start'; window.__uiErrors = [];
    const R = window.M.render; const f = R.frame;
    R.frame = function (dt) { try { return f.call(R, dt); } catch (e) { if (window.__uiErrors.length < 5) window.__uiErrors.push(window.__step + ': ' + e.message); throw e; } };
  });
  const phase = (name) => ev((n) => { window.__step = n; }, name);

  await phase('pie-sim');
  // ---------- live: pie menu on the second household member
  const pos = await ev((W) => {
    const M = window.M; const st = M.engine.state;
    const hh = st.sims.filter((s) => !s.visitor);
    const sel = st.settings.selectedSimId;
    const other = hh.find((s) => s.id !== sel) || hh[0];
    // make sure the two are not stacked on top of each other for the tap
    if (W < 600) { M.render.focus(other.x, other.y, true); }
    return Object.assign({ id: other.id }, M.render.project(other.x + 0.5, 0.95, other.y + 0.5));
  }, W);
  if (W < 600) {
    await page.waitForTimeout(800);
    Object.assign(pos, await ev((id) => { const s = window.M.engine.simById(id); return window.M.render.project(s.x + 0.5, 0.95, s.y + 0.5); }, pos.id));
  }
  out.checks.simPos = pos;
  if (pos && pos.visible) {
    await tap(pos.clientX, pos.clientY);
    await page.waitForTimeout(400);
    out.checks.pieItems = await ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => b.textContent));
    out.shots.push(await shot('1-pie-sim'));
    await page.keyboard.press('Escape');
  }
  await phase('pie-object');
  // ---------- pie on the fridge (object)
  const fr = await ev(() => {
    const M = window.M; const st = M.engine.state;
    const o = st.objects.find((q) => q.type === 'bed_double') || st.objects.find((q) => q.type === 'fridge_cheap');
    if (!o) return null;
    const p = M.render.project(o.x + 0.5, 1.0, o.y + 0.5);
    return Object.assign({ id: o.id }, p);
  });
  if (fr && fr.visible) {
    await tap(fr.x, fr.y);
    await page.waitForTimeout(400);
    out.checks.pieObj = await ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => b.textContent));
    out.shots.push(await shot('2-pie-object'));
    // choose the first enabled item
    const clicked = await ev(() => { const b = Array.from(document.querySelectorAll('#pie .pie-item')).find((x) => x.getAttribute('aria-disabled') !== 'true'); if (b) { b.click(); return b.textContent; } return null; });
    out.checks.pieClicked = clicked;
    await page.waitForTimeout(300);
    out.checks.queueAfter = await ev(() => Array.from(document.querySelectorAll('.queue .q-item')).map((b) => b.title));
  }
  await phase('walk');
  // ---------- walk on the floor
  const before = await ev(() => { const s = window.M.engine.state.sims.find((q) => q.id === window.M.engine.state.settings.selectedSimId); return s.queue.length; });
  await tap(W * 0.5, H * 0.18);
  await page.waitForTimeout(200);
  out.checks.walkQueued = await ev((b) => { const s = window.M.engine.state.sims.find((q) => q.id === window.M.engine.state.settings.selectedSimId); return s.queue.length - b; }, before);
  await page.waitForTimeout(1200);
  out.shots.push(await shot('3-live'));

  await phase('tabs');
  // ---------- needs tabs
  for (const t of ['skills', 'career', 'rel', 'pers']) {
    await ev((k) => window.M.ui.setTab(k), t);
    if (W < 600) await ev(() => { const d = document.getElementById('dock'); if (!d.classList.contains('needs-open')) document.getElementById('needs-toggle').click(); });
    await page.waitForTimeout(250);
    if (t === 'career' || t === 'rel') out.shots.push(await shot('4-tab-' + t));
  }
  await ev(() => window.M.ui.setTab('needs'));
  if (W < 600) out.shots.push(await shot('4-needs-drawer'));
  if (W < 600) await ev(() => document.getElementById('needs-toggle').click());

  await phase('buy');
  // ---------- buy mode
  await ev(() => window.M.ui.setMode('buy'));
  await page.waitForTimeout(300);
  out.checks.pausedInBuy = await ev(() => window.M.main.pauseReasons());
  const t0 = await ev(() => window.M.engine.state.time.minute);
  await page.waitForTimeout(600);
  out.checks.timeFrozen = (await ev(() => window.M.engine.state.time.minute)) === t0;
  out.checks.cards = await ev(() => document.querySelectorAll('#drawer .card').length);
  out.shots.push(await shot('5-buy'));
  // start placing a sofa and move the ghost
  await phase('buy-place');
  await ev(() => { const c = document.querySelector('#drawer .card[data-type="sofa_cheap"]') || document.querySelector('#drawer .card'); c.click(); });
  // the camera re-frames beside the drawer when Buy opens (UI fix VIS-10): aim at a free tile that is visible
  const spot = await ev(() => {
    const M = window.M;
    for (let y = 2; y < 19; y++) for (let x = 1; x < 22; x++) {
      if (!M.world.canPlace('sofa_cheap', x, y, 0).ok) continue;
      const p = M.render.project(x + 0.5, 0, y + 0.5);
      const el = document.elementFromPoint(p.clientX, p.clientY);
      if (!el || el.tagName !== 'CANVAS' || p.clientY < 70) continue;
      const t = M.render.pickTile(p.clientX, p.clientY);
      if (t && t.x === x && t.y === y) return { x: p.clientX, y: p.clientY };
    }
    return { x: W * 0.32, y: H * 0.3 };
  });
  if (isTouch) await tap(spot.x, spot.y); else await page.mouse.move(spot.x, spot.y, { steps: 4 });
  await page.waitForTimeout(400);
  out.checks.placing = await ev(() => window.M.ui.debug.ui.buy.placing);
  out.shots.push(await shot('6-buy-placing'));
  const money0 = await ev(() => window.M.engine.state.money);
  if (isTouch) await ev(() => { const b = Array.from(document.querySelectorAll('#toolbar .btn.primary'))[0]; if (b && !b.disabled) b.click(); });
  else await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(300);
  out.checks.bought = money0 - (await ev(() => window.M.engine.state.money));
  // select an existing object and arm the sell confirm
  const sel = await ev(() => {
    const M = window.M; const st = M.engine.state;
    const o = st.objects.find((q) => q.type === 'sofa_cheap') || st.objects[0];
    const p = M.render.project(o.x + 0.5, 0.5, o.y + 0.5);
    return p;
  });
  await phase('buy-select');
  await tap(sel.clientX || sel.x, sel.clientY || sel.y);
  await page.waitForTimeout(250);
  await ev(() => { const b = Array.from(document.querySelectorAll('#toolbar .btn.danger'))[0]; if (b) b.click(); });
  await page.waitForTimeout(200);
  out.checks.sellToolbar = await ev(() => document.getElementById('toolbar').textContent);
  out.shots.push(await shot('7-buy-sell-confirm'));
  await page.keyboard.press('Escape');

  await phase('build');
  // ---------- build mode: wall drag preview + floor swatches
  await ev(() => window.M.ui.setMode('build'));
  await page.waitForTimeout(300);
  // wall corners in the yard that are visible beside the drawer (the camera re-frames when Build opens)
  const ab = await ev(() => {
    const M = window.M;
    const ok = (p) => { const el = document.elementFromPoint(p.clientX, p.clientY); return el && el.tagName === 'CANVAS' && p.clientY > 70; };
    for (const [x1, y1, x2] of [[3, 3, 7], [3, 15, 7], [16, 15, 20], [2, 9, 6], [16, 3, 20]]) {
      const a = M.render.project(x1, 0, y1), b = M.render.project(x2, 0, y1);
      if (ok(a) && ok(b)) return { a: { x: a.clientX, y: a.clientY }, b: { x: b.clientX, y: b.clientY } };
    }
    const a = M.render.project(3, 0, 3), b = M.render.project(7, 0, 3);
    return { a: { x: a.clientX, y: a.clientY }, b: { x: b.clientX, y: b.clientY } };
  });
  const a = ab.a, b = ab.b;
  if (isTouch) {
    // touch drag with a single finger (tool drag)
    await ev(({ a, b }) => {
      const v = document.getElementById('view');
      const fire = (type, x, y) => v.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      fire('pointerdown', a.x, a.y);
      for (let i = 1; i <= 5; i++) fire('pointermove', a.x + (b.x - a.x) * i / 5, a.y + (b.y - a.y) * i / 5);
    }, { a, b });
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 });
  }
  await page.waitForTimeout(250);
  out.checks.wallDrag = await ev(() => { const d = window.M.ui.debug.ui.build.drag; return d ? { keys: d.keys.length, cost: d.cost } : null; });
  out.shots.push(await shot('8-build-wall-drag'));
  const m0 = await ev(() => window.M.engine.state.money);
  if (isTouch) {
    await ev((b) => { const v = document.getElementById('view'); v.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: b.x, clientY: b.y, isPrimary: true, bubbles: true, button: 0 })); }, b);
  } else await page.mouse.up();
  await page.waitForTimeout(250);
  out.checks.wallBuilt = m0 - (await ev(() => window.M.engine.state.money));
  await ev(() => window.M.ui.debug.setBuildTool('floor'));
  await page.waitForTimeout(250);
  out.shots.push(await shot('9-build-floor'));
  await ev(() => window.M.ui.setMode('live'));
  out.checks.unpausedAfter = await ev(() => window.M.main.pauseReasons());

  await phase('options');
  // ---------- options + create family
  await ev(() => window.M.ui.setMode('options'));
  await page.waitForTimeout(300);
  out.shots.push(await shot('10-options'));
  await ev(() => document.getElementById('opt-newfamily').click());
  await page.waitForTimeout(300);
  out.shots.push(await shot('11-family'));
  await ev(() => document.getElementById('cf-next').click());
  await page.waitForTimeout(200);
  out.shots.push(await shot('12-family-lot'));
  await phase('new-family');
  await ev(() => { document.getElementById('cf-lot-empty').click(); document.getElementById('cf-go').click(); });
  await page.waitForTimeout(800);
  out.checks.newFamily = await ev(() => { const st = window.M.engine.state; return { name: st.householdName, money: st.money, members: st.sims.filter((s) => !s.visitor).map((s) => s.name), objects: st.objects.length }; });
  out.shots.push(await shot('13-new-family'));
  out.checks.modalsOpen = await ev(() => window.M.ui.debug.ui.modals.length);
  out.checks.errors = await ev(() => (window.__uiErrors || []).slice(0, 5));
  return out;
}

// End-to-end flows on the real index.html, driven with real mouse/touch input where possible.
//   node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_flows.mjs [--w 390 --h 844 --touch]
// Returns a JSON summary of checks (each check: true/false or data) and writes screenshots to ctx.shotDir.
// QA fix round: the CONTRACT_V2 flows (tools/integrate_flows_v2.mjs) run first on a fresh game, then the page is
// reloaded with cleared saves and the original flows run. FLOWS=v1 or FLOWS=v2 runs only one part.
import path from 'node:path';
import fs from 'node:fs';
import flowsV2 from './integrate_flows_v2.mjs';

export default async function (page, ctx) {
  const which = process.env.FLOWS || 'all';
  let v2 = null;
  if (which !== 'v1') {
    v2 = await flowsV2(page, ctx);
    if (which === 'v2') return v2;
    // fresh game for the original flows: drop the saves and the UI prefs (build tool, tab, catalog category…)
    await page.evaluate(() => { try { Object.keys(localStorage).filter((k) => k.startsWith('morada')).forEach((k) => localStorage.removeItem(k)); localStorage.setItem('morada.prefs', JSON.stringify({ helpSeen: true })); } catch (e) { /* ignore */ } });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__morada && window.__morada.M.ui && window.__morada.M.ui.ready, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const res = await flowsV1(page, ctx);
  if (v2) { res.fail = v2.fail.map((f) => 'v2.' + f).concat(res.fail); res.v2 = v2.checks; res.shots = v2.shots.concat(res.shots); }
  return res;
}

async function flowsV1(page, ctx) {
  const { W, H } = ctx;
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const tag = W < 600 ? 'phone' : 'desk';
  const shots = [];
  const shot = async (name) => { const f = path.join(dir, `flow-${tag}-${name}.png`); await page.screenshot({ path: f }); shots.push(f); return f; };
  const ev = (fn, a) => page.evaluate(fn, a);
  const wait = (ms) => page.waitForTimeout(ms);
  const touch = ctx.touch;
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const C = {};      // checks
  const fail = [];
  const pieSettled = () => page.waitForFunction(() => { const el = document.getElementById('pie'); return !el || el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); }, null, { timeout: 4000 }).catch(() => {});
  const expect = (name, cond, data) => { C[name] = data === undefined ? !!cond : { ok: !!cond, data }; if (!cond) fail.push(name); };

  await ev(() => {
    window.__errs = [];
    const oe = console.error;
    console.error = function () { window.__errs.push(Array.from(arguments).map(String).join(' ').slice(0, 300)); return oe.apply(console, arguments); };
    const b = document.getElementById('help-ok'); if (b) b.click();
  });
  await wait(300);
  // snap the camera onto the house
  await ev((touch) => { const M = window.__morada.M; M.render.setCamera({ k: 0, dist: touch ? 34 : 30, x: 11.5, z: 10 }); }, touch);
  await wait(500);
  await shot('0-live');

  // ------------------------------------------------------------------ LIVE: pie on the other sim
  const sel0 = await ev(() => window.__morada.state.settings.selectedSimId);
  const other = await ev(() => {
    const M = window.__morada.M, st = M.engine.state;
    const hh = M.engine.household();
    const sel = st.settings.selectedSimId;
    const o = hh.find((s) => s.id !== sel);
    // freeze both in place so the click lands: pause and focus the camera on the other sim
    M.main.setSpeed(0);
    M.render.focus(o.x, o.y, true);
    return { id: o.id, name: o.name };
  });
  await wait(700);
  const op = await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); return M.render.project(s.x + 0.5, 1.0, s.y + 0.5); }, other.id);
  await tap(op.clientX, op.clientY);
  await wait(450);
  const pieSim = await ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => ({ t: b.textContent, dis: b.getAttribute('aria-disabled') })));
  expect('live.pieOnSim', pieSim.length > 2, pieSim.map((p) => p.t));
  await shot('1-pie-sim');
  // choose "Conversar" (or first enabled social)
  await pieSettled();
  const chosen = await ev(() => {
    const items = Array.from(document.querySelectorAll('#pie .pie-item'));
    const b = items.find((x) => /Conversar/.test(x.textContent) && x.getAttribute('aria-disabled') !== 'true') || items.find((x) => x.getAttribute('aria-disabled') !== 'true' && !/Controlar/.test(x.textContent));
    return b ? (b.getBoundingClientRect().left + 10) + ',' + (b.getBoundingClientRect().top + 10) + ',' + b.textContent : null;
  });
  if (chosen) { const [x, y] = chosen.split(','); await tap(+x, +y); }
  await wait(300);
  const q1 = await ev((sel) => { const s = window.__morada.M.engine.simById(sel); return s.queue.map((a) => a.label + '|' + a.source); }, sel0);
  expect('live.socialQueued', q1.some((l) => /player/.test(l)), { chosen: chosen && chosen.split(',')[2], queue: q1 });

  // ------------------------------------------------------------------ LIVE: pie on the fridge → snack
  const fr = await ev(() => {
    const M = window.__morada.M, st = M.engine.state;
    const o = st.objects.find((q) => q.type === 'fridge_cheap');
    M.render.focus(o.x, o.y, true);
    return { id: o.id };
  });
  await wait(700);
  const fp = await ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); return M.render.project(o.x + 0.5, 1.2, o.y + 0.5); }, fr.id);
  const pk = await ev((p) => window.__morada.M.render.pick(p.clientX, p.clientY), fp);
  await tap(fp.clientX, fp.clientY);
  await wait(450);
  const pieObj = await ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => b.textContent));
  expect('live.pieOnFridge', pieObj.length > 0, { pick: pk, items: pieObj });
  await shot('2-pie-fridge');
  await pieSettled();
  const snack = await ev(() => {
    const b = Array.from(document.querySelectorAll('#pie .pie-item')).find((x) => /lanche/i.test(x.textContent));
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (snack) await tap(snack.x, snack.y);
  await wait(300);
  const q2 = await ev((sel) => window.__morada.M.engine.simById(sel).queue.map((a) => a.label + '|' + a.source), sel0);
  expect('live.snackQueued', q2.some((l) => /lanche/i.test(l)), q2);

  // ------------------------------------------------------------------ LIVE: run the queue (engine) and verify it completes
  const run = await ev((sel) => {
    const M = window.__morada.M, E = M.engine;
    const s = E.simById(sel);
    const h0 = s.motives.hunger;
    const seen = new Set();
    for (let i = 0; i < 240; i++) { E.update(0.5); const a = s.queue[0]; if (a) seen.add(a.label + ':' + a.phase); }
    return { hunger: [Math.round(h0), Math.round(s.motives.hunger)], seen: Array.from(seen).slice(0, 20) };
  }, sel0);
  expect('live.queueRan', run.seen.some((x) => /lanche:do/i.test(x)) && run.seen.some((x) => /:do/.test(x)), run);

  // ------------------------------------------------------------------ LIVE: walk by clicking the floor
  const walkTarget = await ev(() => {
    const M = window.__morada.M, W = M.world, st = M.engine.state;
    // a free outdoor tile in front of the house
    for (const [x, y] of [[11, 16], [9, 16], [14, 16], [12, 15], [8, 15]]) {
      if (W.isWalkable(x, y) && !W.objectAt(x, y)) { M.render.focus(x, y, true); return { x, y }; }
    }
    return null;
  });
  await wait(700);
  const wp = await ev((t) => window.__morada.M.render.project(t.x + 0.5, 0, t.y + 0.5), walkTarget);
  const wpick = await ev((p) => window.__morada.M.render.pick(p.clientX, p.clientY), wp);
  await ev((sel) => { const E = window.__morada.M.engine; const s = E.simById(sel); E.cancelAction(s.id, s.queue[0] && s.queue[0].id); for (const a of s.queue.slice(1)) E.cancelAction(s.id, a.id); }, sel0);
  await tap(wp.clientX, wp.clientY);
  await wait(250);
  const walkQ = await ev((sel) => window.__morada.M.engine.simById(sel).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), sel0);
  const walked = await ev(([sel, t]) => {
    const E = window.__morada.M.engine; const s = E.simById(sel);
    for (let i = 0; i < 120; i++) { E.update(0.5); if (Math.round(s.x) === t.x && Math.round(s.y) === t.y) break; }
    return { at: [s.x, s.y] };
  }, [sel0, walkTarget]);
  expect('live.walkByClick', walkQ.some((q) => q.startsWith('walk')) && Math.round(walked.at[0]) === walkTarget.x && Math.round(walked.at[1]) === walkTarget.y, { pick: wpick, walkQ, target: walkTarget, walked });

  // ------------------------------------------------------------------ LIVE: engine-level player interaction (TV)
  const tv = await ev((sel) => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const o = st.objects.find((q) => /^tv/.test(q.type));
    const its = E.getInteractions(sel, o.id);
    const it = its.find((q) => q.enabled);
    const s = E.simById(sel);
    s.motives.fun = -20;           // below the cheap TV's cap so the gain is visible
    const ok = E.queueInteraction(sel, o.id, it.key, 'player');
    let reached = false;
    for (let i = 0; i < 200; i++) { E.update(0.5); if (s.queue[0] && s.queue[0].objId === o.id && s.queue[0].phase === 'do') { reached = true; break; } }
    const f0 = s.motives.fun;
    for (let i = 0; i < 40; i++) E.update(0.5);
    return { key: it.key, ok, reached, fun: [Math.round(f0), Math.round(s.motives.fun)], anim: s.anim, seated: s.seated };
  }, sel0);
  expect('live.engineQueueTV', tv.ok && tv.reached && tv.fun[1] >= tv.fun[0], tv);

  // ------------------------------------------------------------------ SPEED buttons + keyboard
  await ev(() => window.__morada.M.render.setCamera({ k: 0, dist: 30, x: 11.5, z: 10 }));
  const speedBtns = await ev(() => Array.from(document.querySelectorAll('.speed-btn')).map((b) => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; }));
  const speeds = {};
  for (const i of [1, 2, 3]) {
    if (!speedBtns[i] || !speedBtns[i].vis) continue;
    await tap(speedBtns[i].x, speedBtns[i].y);
    await wait(120);
    const t0 = await ev(() => { const s = window.__morada.state.time; return s.day * 1440 + s.minute; });
    const r0 = Date.now();
    await wait(1500);
    const t1 = await ev(() => { const s = window.__morada.state.time; return s.day * 1440 + s.minute; });
    speeds[i] = { speed: await ev(() => window.__morada.M.main.getSpeed()), simPerSec: +((t1 - t0) / ((Date.now() - r0) / 1000)).toFixed(2), factor: await ev(() => window.__morada.M.main.speedFactor()) };
  }
  await tap(speedBtns[0].x, speedBtns[0].y);
  await wait(100);
  speeds.pause = await ev(() => ({ speed: window.__morada.M.main.getSpeed(), paused: window.__morada.M.main.isPaused() }));
  if (!touch) {
    await page.mouse.click(W / 2, 30); // focus page (top area, camera toolbar is left)
    await page.keyboard.press('Escape');
    await page.keyboard.press('2'); await wait(80);
    speeds.key2 = await ev(() => window.__morada.M.main.getSpeed());
    await page.keyboard.press('p'); await wait(80);
    speeds.keyP = await ev(() => window.__morada.M.main.getSpeed());
  }
  expect('speed.buttons', speeds[1] && speeds[1].speed === 1 && speeds[2].speed === 2 && speeds[3].speed === 3 && speeds.pause.speed === 0 && speeds[1].simPerSec > 0 && speeds[2].simPerSec > speeds[1].simPerSec, speeds);

  // ------------------------------------------------------------------ BUY: place an object through the UI
  const modeBtn = async (key) => {
    const r = await ev((k) => { const b = document.getElementById('mode-' + k); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, key);
    await tap(r.x, r.y); await wait(400);
  };
  await modeBtn('buy');
  expect('buy.paused', (await ev(() => window.__morada.M.main.pauseReasons())).includes('buy'));
  await shot('3-buy');
  // pick the "Vaso de planta" card
  const card = await ev(() => {
    const c = document.querySelector('#drawer .card[data-type="plant_small"]');
    if (!c) return null;
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (card) await tap(card.x, card.y);
  await wait(300);
  // find a free tile visible on screen (not under panels) where the plant fits
  const spot = await ev(([W, H]) => {
    const M = window.__morada.M, Wd = M.world;
    const drawer = document.getElementById('drawer').getBoundingClientRect();
    const bar = document.getElementById('bar').getBoundingClientRect();
    const tb = document.getElementById('toolbar').getBoundingClientRect();
    const cands = [];
    for (let y = 2; y < 19; y++) for (let x = 1; x < 23; x++) {
      if (!Wd.canPlace('plant_small', x, y, 0).ok) continue;
      if (Wd.objectsAt(x, y).length) continue;
      const p = M.render.project(x + 0.5, 0, y + 0.5);
      if (!p.visible) continue;
      const el = document.elementFromPoint(p.clientX, p.clientY);
      if (!el || el.tagName !== 'CANVAS' || p.clientY < 60 || p.clientX < 20 || p.clientX > W - 20) continue;
      const el2 = document.elementFromPoint(p.clientX, p.clientY + 40);
      if (!el2 || el2.tagName !== 'CANVAS') continue;
      const pk = M.render.pickTile(p.clientX, p.clientY);
      if (!pk || pk.x !== x || pk.y !== y) continue;
      cands.push({ x, y, cx: p.clientX, cy: p.clientY, d: Math.abs(x - 11) + Math.abs(y - 15) });
    }
    cands.sort((a, b) => a.d - b.d);
    return cands[0] || null;
  }, [W, H]);
  const money0 = await ev(() => window.__morada.state.money);
  const nObj0 = await ev(() => window.__morada.state.objects.length);
  if (spot) {
    if (touch) { await tap(spot.cx, spot.cy); await wait(300); }
    else { await page.mouse.move(spot.cx - 20, spot.cy - 20); await page.mouse.move(spot.cx, spot.cy, { steps: 3 }); await wait(250); }
  }
  const placing = await ev(() => window.__morada.M.ui.debug && window.__morada.M.ui.debug.ui.buy.placing);
  await shot('4-buy-ghost');
  if (spot) {
    if (touch) {
      const b = await ev(() => { const x = Array.from(document.querySelectorAll('#toolbar .btn.primary'))[0]; if (!x || x.disabled) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (b) await tap(b.x, b.y);
    } else await page.mouse.click(spot.cx, spot.cy);
  }
  await wait(400);
  const bought = await ev(([spot, nObj0]) => {
    const M = window.__morada.M, st = M.engine.state;
    const o = st.objects.find((q) => q.type === 'plant_small' && spot && q.x === spot.x && q.y === spot.y);
    const g = o && M.render.scene.children.find((c) => c.name === 'objects').children.find((c) => c.userData.objId === o.id);
    return { found: !!o, id: o && o.id, mesh: !!g, meshPos: g ? [+g.position.x.toFixed(2), +g.position.z.toFixed(2)] : null, n: st.objects.length - nObj0 };
  }, [spot, nObj0]);
  const money1 = await ev(() => window.__morada.state.money);
  expect('buy.placedViaUI', bought.found && bought.mesh && money0 - money1 === 40, { spot, placing, bought, cost: money0 - money1 });
  // stop placing (if still placing; Esc with nothing selected would leave Buy mode)
  if (await ev(() => !!window.__morada.M.ui.debug.ui.buy.placing)) { await page.keyboard.press('Escape'); await wait(200); }

  // ------------------------------------------------------------------ BUY: select an object and sell it with the toolbar
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && !document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  const sellTarget = await ev((id) => {
    const M = window.__morada.M; const o = M.engine.objectById(id);
    if (!o) return null;
    const p = M.render.project(o.x + 0.5, 0.35, o.y + 0.5);
    return { id: o.id, cx: p.clientX, cy: p.clientY, pick: M.render.pick(p.clientX, p.clientY) };
  }, bought.id);
  let sold = null;
  if (sellTarget) {
    await tap(sellTarget.cx, sellTarget.cy);
    await wait(300);
    const selId = await ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    await shot('5-buy-selected');
    const clickBtn = async (re) => {
      const b = await ev((src) => { const re = new RegExp(src); const x = Array.from(document.querySelectorAll('#toolbar button')).find((q) => re.test(q.textContent) && !q.disabled); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: x.textContent }; }, re);
      if (b) { await tap(b.x, b.y); await wait(250); }
      return b && b.t;
    };
    const b1 = await clickBtn('Vender');
    const toolbarText = await ev(() => document.getElementById('toolbar').textContent);
    await shot('6-buy-sell-confirm');
    const b2 = await clickBtn('Confirmar');
    const m2 = await ev(() => window.__morada.state.money);
    const still = await ev((id) => !!window.__morada.M.engine.objectById(id), bought.id);
    sold = { selId, b1, b2, toolbarText, refund: m2 - money1, still };
  }
  expect('buy.sellViaUI', sold && !sold.still && sold.refund === 40, sold);

  // move an existing object via engine (moveObject) and check render follows
  const moved = await ev(() => {
    const M = window.__morada.M, E = M.engine, Wd = M.world, st = E.state;
    const o = st.objects.find((q) => q.type === 'plant_small') || st.objects.find((q) => q.type === 'lamp_floor');
    if (!o) return null;
    const from = [o.x, o.y];
    for (let y = 14; y < 19; y++) for (let x = 2; x < 22; x++) {
      if (Wd.canPlace(o.type, x, y, 0, o.id).ok && !Wd.objectsAt(x, y).length) { const r = E.moveObject(o.id, x, y, 0); return { id: o.id, from, to: [x, y], r }; }
    }
    return null;
  });
  await wait(600);
  const movedMesh = moved && await ev((m) => { const M = window.__morada.M; const g = M.render.scene.children.find((c) => c.name === 'objects').children.find((c) => c.userData.objId === m.id); return g ? [+g.position.x.toFixed(2), +g.position.z.toFixed(2)] : null; }, moved);
  expect('buy.moveObject', moved && moved.r.ok && movedMesh && Math.abs(movedMesh[0] - moved.to[0]) < 1.01 && Math.abs(movedMesh[1] - moved.to[1]) < 1.01, { moved, movedMesh });

  // ------------------------------------------------------------------ BUILD: wall drag + floor paint through the UI
  await modeBtn('build');
  expect('build.paused', (await ev(() => window.__morada.M.main.pauseReasons())).includes('build'));
  await shot('7-build');
  const clickTool = async (label) => {
    const b = await ev((label) => { const x = Array.from(document.querySelectorAll('#drawer .tool-btn')).find((q) => q.title === label); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, label);
    if (b) { await tap(b.x, b.y); await wait(250); }
    return !!b;
  };
  await clickTool('Parede');
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && !document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  // corners: a free outdoor run in front of the house, visible on screen
  const run2 = await ev(([W]) => {
    const M = window.__morada.M, Wd = M.world, st = M.engine.state;
    const drawer = document.getElementById('drawer').getBoundingClientRect();
    const bar = document.getElementById('bar').getBoundingClientRect();
    const onCanvas = (x, y) => { const el = document.elementFromPoint(x, y); return !!el && el.tagName === 'CANVAS'; };
    const vis = (x, y) => { const p = M.render.project(x, 0, y); return p.visible && p.clientY > 60 && p.clientX > 20 && p.clientX < W - 20 && onCanvas(p.clientX, p.clientY) && onCanvas(p.clientX, p.clientY - 40) ? p : null; };
    for (const y of [16, 17, 15, 18]) for (let x0 = 2; x0 < 18; x0++) {
      const keys = [];
      let ok = true;
      for (let x = x0; x < x0 + 3; x++) { const k = 'h,' + x + ',' + y; if (Wd.getWall(k) || (Wd.canBuildWall && !Wd.canBuildWall(k, 1).ok)) { ok = false; break; } keys.push(k); }
      if (!ok) continue;
      const a = vis(x0, y), b = vis(x0 + 3, y);
      if (!a || !b) continue;
      const pa = M.render.pickTile(a.clientX, a.clientY), pb = M.render.pickTile(b.clientX, b.clientY);
      if (!pa || !pb || Math.round(pa.fx) !== x0 || Math.round(pa.fy) !== y || Math.round(pb.fx) !== x0 + 3 || Math.round(pb.fy) !== y) continue;
      return { keys, a: [a.clientX, a.clientY], b: [b.clientX, b.clientY], x0, y };
    }
    return null;
  }, [W]);
  const m3 = await ev(() => window.__morada.state.money);
  if (run2) {
    if (touch) {
      await ev(({ a, b }) => {
        const v = document.getElementById('view');
        const fire = (type, x, y) => v.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
        fire('pointerdown', a[0], a[1]);
        for (let i = 1; i <= 6; i++) fire('pointermove', a[0] + (b[0] - a[0]) * i / 6, a[1] + (b[1] - a[1]) * i / 6);
      }, run2);
    } else {
      await page.mouse.move(run2.a[0], run2.a[1]); await page.mouse.down();
      await page.mouse.move(run2.b[0], run2.b[1], { steps: 8 });
    }
    await wait(250);
    await shot('8-build-wall-drag');
    if (touch) await ev(({ b }) => { document.getElementById('view').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: b[0], clientY: b[1], isPrimary: true, bubbles: true, button: 0 })); }, run2);
    else await page.mouse.up();
    await wait(400);
  }
  const wallsBuilt = run2 && await ev((keys) => keys.map((k) => !!window.__morada.M.world.getWall(k)), run2.keys);
  const m4 = await ev(() => window.__morada.state.money);
  const wallStats = await ev(() => window.__morada.M.render.stats());
  expect('build.wallViaUI', run2 && wallsBuilt.every(Boolean) && m3 - m4 === 70 * run2.keys.length, { run2, wallsBuilt, cost: m3 - m4, renderWalls: wallStats.walls });
  await shot('9-build-wall-done');

  // door on the middle segment
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  await clickTool('Porta');
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && !document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  if (run2) {
    const mid = await ev((r) => { const M = window.__morada.M; const p = M.render.project(r.x0 + 1.5, 1.0, r.y); return p; }, run2);
    if (!touch) { await page.mouse.move(mid.clientX, mid.clientY); await wait(150); }
    await tap(mid.clientX, mid.clientY);
    await wait(300);
  }
  const door = run2 && await ev((k) => window.__morada.M.world.getWall(k), run2.keys[1]);
  expect('build.doorViaUI', door && door.t === 2, { door });

  // floor: paint a 2x2 square of tiles next to the new wall
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  await clickTool('Piso');
  const floorPick = await ev(() => {
    const sw = Array.from(document.querySelectorAll('#drawer .swatch'));
    const b = sw[3] || sw[1];
    if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, name: b.title, idx: sw.indexOf(b) };
  });
  if (floorPick) await tap(floorPick.x, floorPick.y);
  await wait(250);
  if (touch) { await ev(() => { const g = document.querySelector('#drawer .drawer-grip'); if (g && !document.getElementById('drawer').classList.contains('collapsed')) g.click(); }); await wait(300); }
  const ftiles = await ev((r) => {
    const M = window.__morada.M;
    const y = r ? r.y : 16, x = r ? r.x0 : 4;
    const a = M.render.project(x + 0.5, 0, y + 0.5), b = M.render.project(x + 1.5, 0, y + 1.5);
    return { a: [a.clientX, a.clientY], b: [b.clientX, b.clientY], tiles: [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], before: [[x, y], [x + 1, y + 1]].map(([tx, ty]) => M.world.getFloor(tx, ty)) };
  }, run2);
  const m5 = await ev(() => window.__morada.state.money);
  if (touch) {
    await ev(({ a, b }) => {
      const v = document.getElementById('view');
      const fire = (type, x, y) => v.dispatchEvent(new PointerEvent(type, { pointerId: 8, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true, bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      fire('pointerdown', a[0], a[1]);
      for (let i = 1; i <= 5; i++) fire('pointermove', a[0] + (b[0] - a[0]) * i / 5, a[1] + (b[1] - a[1]) * i / 5);
      fire('pointerup', b[0], b[1]);
    }, ftiles);
  } else {
    await page.mouse.move(ftiles.a[0], ftiles.a[1]); await page.mouse.down();
    await page.mouse.move(ftiles.b[0], ftiles.b[1], { steps: 5 }); await wait(150);
    await shot('10-build-floor-drag');
    await page.mouse.up();
  }
  await wait(400);
  const after = await ev((t) => t.tiles.map(([x, y]) => window.__morada.M.world.getFloor(x, y)), ftiles);
  const m6 = await ev(() => window.__morada.state.money);
  expect('build.floorViaUI', floorPick && after.every((f) => f === floorPick.idx) && m5 - m6 > 0, { floor: floorPick, before: ftiles.before, after, cost: m5 - m6 });
  await shot('11-build-floor-done');

  // wallpaper on one of the new walls (engine API) and demolish refund (engine API)
  // CONTRACT_V2 §1: paint one side (A) only, then the other side keeps its colour
  const paint = run2 && await ev((k) => { const M = window.__morada.M; const r = M.engine.paintWall(k, 2, 'A'); return { r, A: M.world.wallColor(k, 'A'), B: M.world.wallColor(k, 'B') }; }, run2.keys[0]);
  const demo = run2 && await ev((k) => window.__morada.M.engine.buildWall(k, 0), run2.keys[2]);
  expect('build.paintAndDemolish', paint && paint.r.ok && paint.A === 2 && paint.B !== 2 && demo && demo.ok && !(await ev((k) => window.__morada.M.world.getWall(k), run2.keys[2])), { paint, demo });

  await modeBtn('live');
  expect('live.unpaused', (await ev(() => window.__morada.M.main.pauseReasons())).length === 0);

  // ------------------------------------------------------------------ SAVE (local fallback) + LOAD
  const saveRes = await ev(async () => { const r = await window.__morada.M.main.saveNow('slot2'); return r; });
  const local = await ev(() => { try { const v = localStorage.getItem('morada:slot2'); return v ? v.length : 0; } catch (e) { return -1; } });
  const snap = await ev(() => { const s = window.__morada.state; return { money: s.money, objects: s.objects.length, walls: Object.keys(s.lot.walls).length, day: s.time.day, minute: Math.round(s.time.minute) }; });
  // mutate and then load
  await ev(() => { const E = window.__morada.M.engine; E.state.money += 12345; const o = E.state.objects.find((q) => q.type === 'lamp_floor'); if (o) E.sellObject(o.id); E.update(30); });
  const loadRes = await ev(async () => window.__morada.M.main.loadSlot('slot2'));
  await wait(600);
  const snap2 = await ev(() => { const s = window.__morada.state; return { money: s.money, objects: s.objects.length, walls: Object.keys(s.lot.walls).length, day: s.time.day, minute: Math.round(s.time.minute) }; });
  expect('save.localRoundTrip', saveRes && saveRes.ok && local > 1000 && loadRes.ok && JSON.stringify(snap) === JSON.stringify(snap2), { saveRes, local, loadRes, snap, snap2 });
  // the save slot UI (Options → Salvar)
  await modeBtn('options');
  await wait(200);
  await shot('12-options');
  const optSave = await ev(async () => {
    const b = document.getElementById("opt-save");
    if (!b) return { found: false, buttons: Array.from(document.querySelectorAll('#modal-root button')).map((x) => x.textContent).slice(0, 12) };
    b.click();
    await new Promise((r) => setTimeout(r, 500));
    let v = null; try { v = localStorage.getItem('morada:' + window.__morada.M.main.slot); } catch (e) { /* ignore */ }
    return { found: true, text: b.textContent, saved: !!v };
  });
  expect('save.optionsButton', optSave.found && optSave.saved, optSave);
  await page.keyboard.press('Escape');
  await wait(200);
  await ev(() => { try { window.__morada.M.ui.debug && window.__morada.M.ui.debug.closeAllModals && window.__morada.M.ui.debug.closeAllModals(); } catch (e) { /* ignore */ } });

  // ------------------------------------------------------------------ NEW FAMILY on an empty lot (UI)
  await modeBtn('options');
  const nf = await ev(async () => {
    const q = (id) => document.getElementById(id);
    if (!q('opt-newfamily')) return 'no opt-newfamily';
    q('opt-newfamily').click();
    await new Promise((r) => setTimeout(r, 300));
    const name = document.querySelector('#modal-root input[type=text], #modal-root input:not([type])');
    if (name) { name.value = 'Família Teste'; name.dispatchEvent(new Event('input', { bubbles: true })); }
    return 'ok';
  });
  await shot('13-family');
  await ev(async () => { const n = document.getElementById('cf-next'); if (n) n.click(); await new Promise((r) => setTimeout(r, 300)); });
  await shot('14-family-lot');
  await ev(() => { const a = document.getElementById('cf-lot-empty'); if (a) a.click(); const g = document.getElementById('cf-go'); if (g) g.click(); });
  await wait(1500);
  const fam = await ev(() => { const M = window.__morada.M, st = M.engine.state; const cam = M.render.getCamera(); const hh = M.engine.household(); return { name: st.householdName, money: st.money, members: hh.map((s) => s.name + '@' + s.x.toFixed(1) + ',' + s.y.toFixed(1)), objects: st.objects.map((o) => o.type), cam: [+cam.x.toFixed(1), +cam.z.toFixed(1)], modals: M.ui.debug.ui.modals.length }; });
  expect('newFamily.emptyLot', fam.money === 20000 && fam.members.length >= 1 && fam.modals === 0, { nf, fam });
  await shot('15-new-family');
  // play the new family for a while via engine and check nothing breaks
  const nfRun = await ev(() => { const E = window.__morada.M.engine; for (let i = 0; i < 240; i++) E.update(1); return { t: E.state.time, sims: E.household().map((s) => ({ n: s.name, mood: Math.round(E.mood(s)), anim: s.anim })) }; });
  await wait(800);
  C.newFamilyRun = nfRun;
  C.errors = await ev(() => window.__errs.slice(0, 10));
  expect('noConsoleErrors', C.errors.length === 0, C.errors);
  return { fail, checks: C, shots };
}

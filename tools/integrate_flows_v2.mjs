// End-to-end flows for the CONTRACT_V2 features on the real index.html, driven with real mouse/touch/keyboard input.
//   node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_flows_v2.mjs [--w 390 --h 844 --touch]
// Also run first by tools/integrate_flows.mjs (FLOWS=v1 skips it). Screenshots: ctx.shotDir/flow2-<tag>-*.png.
// Covers: Live (food on a counter, self menu, walk redirect/append, refusal toast), Buy (catalog search, painting with
// the walls-up override, Ambiente tip, undo), Build (room tool, door on a cut wall, wallpaper one side vs whole room,
// floor fill, undo), Options (save to Espaço 2 + chip, slot list, export), New family on an empty lot + checklist,
// day/night screenshots.
import path from 'node:path';
import fs from 'node:fs';

export default async function flowsV2(page, ctx) {
  const { W, H } = ctx;
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const tag = W < 600 ? 'phone' : 'desk';
  const touch = !!ctx.touch;
  const shots = [];
  const C = {};
  const fail = [];
  const ev = (fn, a) => page.evaluate(fn, a);
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => { const f = path.join(dir, `flow2-${tag}-${name}.png`); await page.screenshot({ path: f }); shots.push(f); return f; };
  const tap = async (x, y, opts) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y, opts); };
  const expect = (name, cond, data) => { C[name] = { ok: !!cond, data }; if (!cond) fail.push(name); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { expect(name + '.exception', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
  const settlePie = () => page.waitForFunction(() => { const el = document.getElementById('pie'); return !el || el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); }, null, { timeout: 4000 }).catch(() => {});
  const pieItems = () => ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, dis: b.getAttribute('aria-disabled') === 'true', x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
  const tipText = () => ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent));
  const focusTile = async (x, y) => { await ev(([x, y]) => window.__morada.M.render.focus(x, y, true), [x, y]); await wait(500); };
  const proj = (x, y, z) => ev(([x, y, z]) => { const p = window.__morada.M.render.project(x, y, z); return { x: p.clientX, y: p.clientY, vis: p.visible }; }, [x, y, z]);
  const modeBtn = async (key) => {
    const r = await ev((k) => { const b = document.getElementById('mode-' + k); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, key);
    await tap(r.x, r.y); await wait(500);
  };
  const collapseDrawer = async (collapsed) => {
    if (!touch) return;
    await ev((c) => { const d = document.getElementById('drawer'); const g = d && d.querySelector('.drawer-grip'); if (g && d.classList.contains('collapsed') !== c) g.click(); }, collapsed);
    await wait(350);
  };
  const clearQueues = () => ev(() => { const M = window.__morada.M; for (const s of M.engine.household()) { s.queue.slice().forEach((a) => M.engine.cancelAction(s.id, a.id)); } for (let i = 0; i < 8; i++) M.engine.update(0.5); });
  // pointer drag on the 3D view; touch uses synthetic pointer events (Playwright has no touch drag)
  const drag = async (a, b, steps = 6, beforeUp) => {
    if (touch) {
      await ev(([a, b, steps]) => {
        const v = document.getElementById('view');
        const mk = (type, p) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', clientX: p.x, clientY: p.y, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true });
        v.dispatchEvent(mk('pointerdown', a));
        for (let i = 1; i <= steps; i++) v.dispatchEvent(mk('pointermove', { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }));
      }, [a, b, steps]);
      await wait(200);
      const r = beforeUp ? await beforeUp() : null;
      await ev((b) => { document.getElementById('view').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', clientX: b.x, clientY: b.y, button: 0, isPrimary: true })); }, b);
      await wait(300);
      return r;
    }
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps }); await wait(200);
    const r = beforeUp ? await beforeUp() : null;
    await page.mouse.up(); await wait(300);
    return r;
  };

  await ev(() => {
    window.__errs2 = [];
    const oe = console.error;
    console.error = function () { window.__errs2.push(Array.from(arguments).map(String).join(' ').slice(0, 300)); return oe.apply(console, arguments); };
    const b = document.getElementById('help-ok'); if (b) b.click();
  });
  await wait(300);
  const ids = await ev(() => { const hh = window.__morada.M.engine.household(); return { rita: hh[0].id, caio: hh[1] && hh[1].id }; });
  await ev((id) => { const M = window.__morada.M; M.ui.selectSim(id); M.main.setSpeed(0); }, ids.rita);

  // ================================================================== day + night views of the starter house
  await step('views', async () => {
    await ev((touch) => { const M = window.__morada.M; M.render.setCamera({ k: 0, dist: touch ? 34 : 30, x: 11.5, z: 10 }); }, touch);
    await ev(() => { const st = window.__morada.M.engine.state; st.time.minute = 12 * 60; window.__morada.M.main.setSpeed(1); });
    await wait(1500);
    await shot('0-day');
    await ev(() => { const st = window.__morada.M.engine.state; st.time.minute = 21 * 60 + 30; });
    await wait(2500);
    await shot('0-night');
    await ev(() => { const M = window.__morada.M; M.engine.state.time.minute = 10 * 60; M.main.setSpeed(0); });
    await wait(600);
  });

  // ================================================================== LIVE: food on a counter (LIVE-1 / §4 pick order)
  await step('live.food', async () => {
    const meal = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      const c = st.objects.find((o) => o.type === 'counter');
      const abs = st.time.day * 1440 + st.time.minute;
      const meal = { id: M.util.nextId(st), type: 'meal', x: c.x, y: c.y, rot: 0, dirty: 0, broken: false, boughtDay: st.time.day, price: 0, uses: 0, servings: 3, quality: 60, food: 'home', spoilAt: abs + 480 };
      st.objects.push(meal); M.world.rebuild(); M.util.bus.emit('objects');
      // characters next to the counter would win the tap (characters are picked first): move them away
      M.engine.household().forEach((s, i) => { s.queue.slice().forEach((a) => M.engine.cancelAction(s.id, a.id)); s.x = 3 + i; s.y = 17; s.seated = false; s.asleep = false; s.anim = 'idle'; });
      const it = M.world.itemAt(c.x, c.y);   // world.itemAt → the object (render.itemAt → its id)
      return { meal: meal.id, counter: c.id, x: c.x, y: c.y, itemAt: it && it.id, renderItemAt: M.render.itemAt ? M.render.itemAt(c.x, c.y) : null };
    });
    await clearQueues();
    await focusTile(meal.x, meal.y);
    await wait(500);
    const p = await proj(meal.x + 0.55, 0.92, meal.y + 0.45);
    const pk = await ev((p) => window.__morada.M.render.pick(p.x, p.y), p);
    await tap(p.x, p.y);
    await wait(500); await settlePie();
    const items = await pieItems();
    const title = await ev(() => { const t = document.querySelector('#pie .pie-title'); return t ? t.textContent : null; });
    await shot('1-live-food-pie');
    const eat = items.find((i) => /prato|comer/i.test(i.t) && !i.dis);
    if (eat) { await tap(eat.x, eat.y); await wait(300); }
    const q = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.label + '|' + a.objId), ids.rita);
    expect('live.foodOnCounterPie', meal.itemAt === meal.meal && (meal.renderItemAt == null || meal.renderItemAt === meal.meal) && !!eat && q.some((l) => l.endsWith('|' + meal.meal)), { itemAt: meal.itemAt, renderItemAt: meal.renderItemAt, pick: pk, title, items: items.map((i) => i.t), queue: q });
    await ev(() => window.__morada.M.ui.closePie());
    await clearQueues();
    await ev((id) => { const M = window.__morada.M; const st = M.engine.state; st.objects = st.objects.filter((o) => o.id !== id); M.world.rebuild(); M.util.bus.emit('objects'); }, meal.meal);
  });

  // ================================================================== LIVE: self menu (homeTile, Ver necessidades)
  await step('live.self', async () => {
    const s = await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); s.x = 10; s.y = 16; return { x: s.x, y: s.y }; }, ids.rita);
    await focusTile(s.x, s.y);
    await wait(400);
    const p = await proj(s.x + 0.5, 1.0, s.y + 0.5);
    await tap(p.x, p.y);
    await wait(500); await settlePie();
    const items = await pieItems();
    await shot('2-live-self-menu');
    const home = items.find((i) => /dentro de casa/.test(i.t) && !i.dis);
    let q = null, homeTile = null, indoor = null;
    if (home) {
      await tap(home.x, home.y); await wait(300);
      q = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), ids.rita);
      homeTile = await ev((id) => window.__morada.M.engine.homeTile(id), ids.rita);
      indoor = homeTile ? await ev((t) => window.__morada.M.world.isIndoor(t.x, t.y), homeTile) : null;
    }
    // (an autonomous greeting may sit in front of the walk while time runs; the walk must be there exactly once)
    expect('live.selfMenu', items.some((i) => /Cancelar tudo/.test(i.t)) && items.some((i) => /necessidades/i.test(i.t)) && !!home && q && q.filter((x) => homeTile && x === 'walk:' + homeTile.x + ',' + homeTile.y).length === 1 && indoor === true, { items: items.map((i) => i.t), q, homeTile, indoor });
    await clearQueues();
  });

  // ================================================================== LIVE: walk redirect (LIVE-11) and Shift+click append
  await step('live.walk', async () => {
    await ev(() => window.__morada.M.main.setSpeed(1));
    await focusTile(7, 16);
    // four free floor tiles in front of the house whose screen point is on the 3D view (not under a HUD panel)
    const pts = await ev(() => {
      const M = window.__morada.M, out = [];
      for (const [x, y] of [[4, 16], [6, 17], [9, 17], [3, 17], [5, 15], [8, 16], [10, 16], [2, 16], [11, 17], [7, 17]]) {
        if (!M.world.isWalkable(x, y) || M.world.objectAt(x, y)) continue;
        const p = M.render.project(x + 0.5, 0, y + 0.5);
        const el = document.elementFromPoint(p.clientX, p.clientY);
        const pk = M.render.pick(p.clientX, p.clientY);
        if (el && el.tagName === 'CANVAS' && pk && pk.kind === 'tile' && pk.x === x && pk.y === y) out.push({ x: p.clientX, y: p.clientY, tx: x, ty: y });
        if (out.length === 4) break;
      }
      return out;
    });
    for (const p of pts.slice(0, 3)) { await tap(p.x, p.y); await wait(250); }
    const q1 = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), ids.rita);
    let q2 = null;
    if (!touch) { await page.keyboard.down('Shift'); await page.mouse.click(pts[3].x, pts[3].y); await page.keyboard.up('Shift'); await wait(250); q2 = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), ids.rita); }
    await ev(() => window.__morada.M.main.setSpeed(0));
    const w3 = pts[2] ? 'walk:' + pts[2].tx + ',' + pts[2].ty : '?', w4 = pts[3] ? 'walk:' + pts[3].tx + ',' + pts[3].ty : '?';
    expect('live.walkRedirect', pts.length === 4 && q1.length === 1 && q1[0] === w3 && (touch || (q2 && q2.length === 2 && q2[1] === w4)), { pts: pts.map((p) => p.tx + ',' + p.ty), q1, q2 });
    await clearQueues();
  });

  // ================================================================== LIVE: refused command → lastReason toast (LIVE-8)
  await step('live.refusal', async () => {
    const r = await ev((id) => {
      const M = window.__morada.M, E = M.engine, s = E.simById(id);
      const fridge = E.state.objects.find((o) => /^fridge/.test(o.type));
      let n = 0; for (let i = 0; i < 9; i++) if (E.queueInteraction(id, fridge.id, 'snack', 'player')) n++;
      return { queued: n, len: s.queue.length, fridge: fridge.id, x: fridge.x, y: fridge.y, reason: E.lastReason };
    }, ids.rita);
    await focusTile(r.x, r.y);
    await ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));   // nothing over the fridge
    // a point of the fridge that is on the 3D view and picks the fridge
    const p = await ev((r) => {
      const M = window.__morada.M;
      for (const h of [1.0, 1.3, 0.7, 1.6]) for (const f of [0.5, 0.3, 0.7]) {
        const q = M.render.project(r.x + f, h, r.y + 0.5);
        const el = document.elementFromPoint(q.clientX, q.clientY);
        const pk = M.render.pick(q.clientX, q.clientY);
        if (el && el.tagName === 'CANVAS' && pk && pk.kind === 'object' && pk.id === r.fridge) return { x: q.clientX, y: q.clientY };
      }
      const q = M.render.project(r.x + 0.5, 1.0, r.y + 0.5); return { x: q.clientX, y: q.clientY };
    }, r);
    await tap(p.x, p.y); await wait(500); await settlePie();
    const items = await pieItems();
    const it = items.find((i) => /lanche/i.test(i.t) && !i.dis);
    if (it) { await tap(it.x, it.y); await wait(400); }
    const t = await toasts();
    await shot('3-live-refusal-toast');
    expect('live.refusalToast', r.queued === 8 && t.some((x) => /fila/i.test(x)), { queued: r.queued, reason: r.reason, pie: items.map((i) => i.t), toasts: t });
    await ev(() => window.__morada.M.ui.closePie());
    await clearQueues();
  });

  // ================================================================== BUY: search, painting with walls-up override, Ambiente tip, undo
  await modeBtn('buy');
  await step('buy.search', async () => {
    const inp = await page.$('#cat-search');
    if (touch) await inp.tap(); else await inp.click();
    await page.keyboard.type('quadro');
    await wait(400);
    const cards = await ev(() => Array.from(document.querySelectorAll('#drawer .card')).map((c) => c.getAttribute('data-type')));
    await shot('4-buy-search');
    expect('buy.search', cards.length >= 1 && cards.every((t) => /^painting/.test(t)), cards);
  });
  await step('buy.painting', async () => {
    // an interior wall face that faces the camera where a painting fits
    const spot = await ev(() => {
      const M = window.__morada.M, Wd = M.world;
      const out = [];
      for (let y = 1; y < 19; y++) for (let x = 1; x < 23; x++) for (let rot = 0; rot < 4; rot++) {
        if (!Wd.isIndoor(x, y)) continue;
        const c = Wd.canPlace('painting_cheap', x, y, rot);
        if (c.ok) out.push({ x, y, rot, d: Math.abs(x - 11) + Math.abs(y - 10) });
      }
      out.sort((a, b) => a.d - b.d);
      return out.slice(0, 40);
    });
    const card = await ev(() => { const c = document.querySelector('#drawer .card[data-type="painting_cheap"]'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (card) await tap(card.x, card.y);
    await wait(400);
    const override = await ev(() => window.__morada.M.render.wallsUpOverride);
    await collapseDrawer(true);
    // hover (tap on touch) the candidate tiles until the ghost is valid there, like a player looking for a wall
    const money0 = await ev(() => window.__morada.M.engine.state.money);
    const n0 = await ev(() => window.__morada.M.engine.state.objects.filter((o) => o.type === 'painting_cheap').length);
    let target = null, placing = null, p = null;
    await focusTile(spot[0].x, spot[0].y);
    for (const s of spot.slice(0, 16)) {
      const q = await ev(([x, y]) => { const M = window.__morada.M; const pr = M.render.project(x + 0.5, 0, y + 0.5); const el = document.elementFromPoint(pr.clientX, pr.clientY); return { x: pr.clientX, y: pr.clientY, canvas: !!el && el.tagName === 'CANVAS' }; }, [s.x, s.y]);
      if (!q.canvas) continue;
      if (touch) await tap(q.x, q.y); else { await page.mouse.move(q.x - 12, q.y - 8); await page.mouse.move(q.x, q.y, { steps: 3 }); }
      await wait(350);
      placing = await ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason }; });
      if (placing && placing.ok) { target = s; p = q; break; }
    }
    if (target) {
      await shot('5-buy-painting-ghost');
      if (touch) {
        const b = await ev(() => { const x = Array.from(document.querySelectorAll('#toolbar .btn.primary'))[0]; if (!x || x.disabled) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        if (b) await tap(b.x, b.y);
      } else await page.mouse.click(p.x, p.y);
      await wait(500);
    }
    const bought = await ev(() => { const st = window.__morada.M.engine.state; return st.objects.filter((o) => o.type === 'painting_cheap').slice(-1)[0] || null; });
    const n1 = await ev(() => window.__morada.M.engine.state.objects.filter((o) => o.type === 'painting_cheap').length);
    // the new painting is drawn (visible) right after the purchase (BB-5)
    const vis = bought && await ev((id) => { const M = window.__morada.M; const g = M.render.scene.children.find((c) => c.name === 'objects').children.find((c) => c.userData.objId === id); let v = !!g && g.visible; let p = g; while (v && p) { v = p.visible; p = p.parent; } return v; }, bought.id);
    if (await ev(() => !!window.__morada.M.ui.debug.ui.buy.placing)) { await page.keyboard.press('Escape'); await wait(200); }
    const overrideAfter = await ev(() => window.__morada.M.render.wallsUpOverride);
    await shot('6-buy-painting-placed');
    const money1 = await ev(() => window.__morada.M.engine.state.money);
    expect('buy.paintingOverride', override === true && n1 === n0 + 1 && vis === true && money0 - money1 > 0, { override, overrideAfter, target, placing, bought: bought && [bought.x, bought.y, bought.rot], visible: vis, cost: money0 - money1 });
    // undo (Ctrl+Z on desktop, the Desfazer button on touch)
    if (touch) {
      await collapseDrawer(false);
      const u = await ev(() => { const b = document.querySelector('#drawer .undo-btn'); if (!b || b.disabled) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (u) await tap(u.x, u.y);
    } else { await page.mouse.move(W / 2, 40); await page.keyboard.press('Control+z'); }
    await wait(500);
    const n2 = await ev(() => window.__morada.M.engine.state.objects.filter((o) => o.type === 'painting_cheap').length);
    const money2 = await ev(() => window.__morada.M.engine.state.money);
    expect('buy.undo', n2 === n0 && money2 === money0, { n0, n1, n2, money0, money1, money2 });
    await ev(() => { const i = document.getElementById('cat-search'); if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  });
  await step('buy.ambiente', async () => {
    const spot = await ev(() => {
      const M = window.__morada.M;
      for (let y = 4; y < 16; y++) for (let x = 4; x < 20; x++) { if (!M.world.isIndoor(x, y)) continue; if (!M.world.canPlace('plant_big', x, y, 0).ok) continue; const r = M.world.roomScoreWith('plant_big', x, y, 0); if (r && r.delta > 0) return { x, y, d: r.delta }; }
      return null;
    });
    await collapseDrawer(false);
    const card = await ev(() => { const c = document.querySelector('#drawer .card[data-type="plant_big"]'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (card) await tap(card.x, card.y);
    await wait(300);
    await collapseDrawer(true);
    await focusTile(spot.x, spot.y);
    const p = await proj(spot.x + 0.5, 0, spot.y + 0.5);
    if (touch) await tap(p.x, p.y); else { await page.mouse.move(p.x - 10, p.y); await page.mouse.move(p.x, p.y, { steps: 2 }); }
    await wait(500);
    const tip = await tipText();
    await shot('7-buy-ambiente-tip');
    expect('buy.ambienteTip', /Ambiente \+\d+/.test(tip || ''), { spot, tip });
    if (await ev(() => !!window.__morada.M.ui.debug.ui.buy.placing)) { await page.keyboard.press('Escape'); await wait(200); }
  });

  // ================================================================== BUILD: room tool, door on a cut wall, wallpaper, floor fill, undo
  await modeBtn('build');
  await collapseDrawer(false);
  const clickTool = async (key) => {
    await collapseDrawer(false);
    const b = await ev((k) => { const x = document.getElementById('tool-' + k); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, key);
    if (b) { await tap(b.x, b.y); await wait(250); }
    await collapseDrawer(true);
    return !!b;
  };
  let room = null;
  await step('build.room', async () => {
    await clickTool('room');
    // pick "Sem piso" so the room starts without a floor (BB-8: still indoor) when that option exists
    const rr = await ev(() => {
      const M = window.__morada.M;
      for (const [x, y] of [[2, 14], [18, 14], [2, 2], [19, 2], [2, 8], [19, 8], [17, 15]]) { const e = M.engine.estimateRoom(x, y, x + 3, y + 2, null); if (e.ok && e.walls === 14) return { x, y }; }
      return null;
    });
    await focusTile(rr.x + 2, rr.y + 1);
    const a = await proj(rr.x + 0.5, 0, rr.y + 0.5), b = await proj(rr.x + 3.5, 0, rr.y + 2.5);
    const m0 = await ev(() => window.__morada.M.engine.state.money);
    const w0 = await ev(() => Object.keys(window.__morada.M.engine.state.lot.walls).length);
    const tipDrag = await drag(a, b, 6, async () => { await shot('8-build-room-drag'); return tipText(); });
    await wait(300);
    const after = await ev(([rr]) => { const M = window.__morada.M; return { walls: Object.keys(M.engine.state.lot.walls).length, money: M.engine.state.money, indoor: M.world.isIndoor(rr.x + 1, rr.y + 1), floor: M.world.getFloor(rr.x + 1, rr.y + 1) }; }, [rr]);
    room = rr;
    expect('build.roomTool', /M\$/.test(tipDrag || '') && after.walls - w0 === 14 && after.money < m0 && after.indoor === true, { rr, tipDrag, added: after.walls - w0, cost: m0 - after.money, indoor: after.indoor, floor: after.floor });
    await wait(800);
    await shot('9-build-room-done');
  });
  await step('build.doorOnCutWall', async () => {
    if (!room) return;
    await clickTool('door');
    // the room wall nearest to the camera is cut down in cutaway: aim a little above the stub (BB-1)
    const cand = await ev((rr) => {
      const M = window.__morada.M;
      const keys = M.world.edgesOfRect(rr.x, rr.y, rr.x + 3, rr.y + 2);
      const out = [];
      for (const k of keys) {
        const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5;
        if (kind === 'h' && (+x === rr.x || +x === rr.x + 3)) continue;   // no corner segments
        if (kind === 'v' && (+y === rr.y || +y === rr.y + 2)) continue;
        const p = M.render.project(px, 0.75, pz);
        const el = document.elementFromPoint(p.clientX, p.clientY);
        if (!el || el.tagName !== 'CANVAS') continue;
        const e = M.render.pickEdge(p.clientX, p.clientY);
        if (e && e.key === k) out.push({ k, x: p.clientX, y: p.clientY, how: e.how });
      }
      // the camera-facing walls of the new room (south and east at the default yaw k=0) are cut down in cutaway;
      // aiming 0.75 above the floor (above the 0.4 stub, inside the BB-1 tolerance) must still target them
      const front = (k) => { const [kind, x, y] = k.split(','); return (kind === 'h' && +y === rr.y + 3) || (kind === 'v' && +x === rr.x + 4); };
      for (const c of out) c.front = front(c.k);
      out.sort((a, b) => (a.front ? 0 : 1) - (b.front ? 0 : 1));
      return out;
    }, room);
    const c = cand[0];
    if (c) { if (!touch) { await page.mouse.move(c.x, c.y); await wait(200); } await tap(c.x, c.y); await wait(500); }
    const door = c ? await ev((k) => window.__morada.M.world.getWall(k), c.k) : null;
    const tip = await tipText();
    await shot('10-build-door-cut');
    expect('build.doorOnCutWall', !!c && c.front && door && door.t === 2, { cand: cand.slice(0, 4), door, tip });
  });
  await step('build.wallpaper', async () => {
    if (!room) return;
    await clickTool('paper');
    await ev(() => { const U = window.__morada.M.ui.debug.ui; U.build.paper = 5; U.build.wholeRoom = false; });
    // a solid room wall whose face is under the cursor
    const w = await ev((rr) => {
      const M = window.__morada.M;
      const keys = M.world.edgesOfRect(rr.x, rr.y, rr.x + 3, rr.y + 2);
      for (const k of keys) {
        const wl = M.world.getWall(k); if (!wl || wl.t !== 1) continue;
        const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5;
        for (const hgt of [1.6, 1.2, 0.3]) {
          const p = M.render.project(px, hgt, pz);
          const el = document.elementFromPoint(p.clientX, p.clientY);
          if (!el || el.tagName !== 'CANVAS') continue;
          const e = M.render.pickEdge(p.clientX, p.clientY);
          if (e && e.key === k && (e.side === 'A' || e.side === 'B')) return { k, x: p.clientX, y: p.clientY, side: e.side };
        }
      }
      return null;
    }, room);
    const before = w && await ev((k) => ({ A: window.__morada.M.world.wallColor(k, 'A'), B: window.__morada.M.world.wallColor(k, 'B') }), w.k);
    const m0 = await ev(() => window.__morada.M.engine.state.money);
    if (w) { if (!touch) { await page.mouse.move(w.x, w.y); await wait(150); } await tap(w.x, w.y); await wait(400); }
    const after = w && await ev((k) => ({ A: window.__morada.M.world.wallColor(k, 'A'), B: window.__morada.M.world.wallColor(k, 'B') }), w.k);
    const m1 = await ev(() => window.__morada.M.engine.state.money);
    const other = w && (w.side === 'A' ? 'B' : 'A');
    expect('build.wallpaperOneSide', !!w && after[w.side] === 5 && after[other] === before[other] && m0 - m1 > 0, { w, before, after, cost: m0 - m1 });
    // whole room: the inside of the new room (toggle on touch, Shift+click on desktop)
    await ev(() => { window.__morada.M.ui.debug.ui.build.paper = 7; });
    const inner = await ev((rr) => {
      const M = window.__morada.M;
      const edges = M.world.roomEdges(rr.x + 1, rr.y + 1);
      for (const e of edges) {
        const wl = M.world.getWall(e.key); if (!wl || wl.t !== 1) continue;
        const [kind, x, y] = e.key.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5;
        for (const hgt of [1.6, 1.0, 0.3]) {
          const p = M.render.project(px, hgt, pz);
          const el = document.elementFromPoint(p.clientX, p.clientY);
          if (!el || el.tagName !== 'CANVAS') continue;
          const pe = M.render.pickEdge(p.clientX, p.clientY);
          if (pe && pe.key === e.key && pe.side === e.side) return { k: e.key, side: e.side, x: p.clientX, y: p.clientY, n: edges.length };
        }
      }
      return null;
    }, room);
    if (inner) {
      if (touch) { await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = true; }); await tap(inner.x, inner.y); }
      else { await page.mouse.move(inner.x, inner.y); await page.keyboard.down('Shift'); await page.mouse.click(inner.x, inner.y); await page.keyboard.up('Shift'); }
      await wait(500);
    }
    const res = await ev((rr) => { const M = window.__morada.M; const edges = M.world.roomEdges(rr.x + 1, rr.y + 1); return { n: edges.length, painted: edges.filter((e) => M.world.wallColor(e.key, e.side) === 7).length }; }, room);
    await shot('11-build-wallpaper');
    await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = false; });
    expect('build.wallpaperWholeRoom', !!inner && res.n >= 10 && res.painted === res.n, { inner, res });
  });
  await step('build.floorFill', async () => {
    if (!room) return;
    await clickTool('floor');
    const sw = await ev(() => { const s = Array.from(document.querySelectorAll('#drawer .swatch')); return s.length; });
    await ev(() => { window.__morada.M.ui.debug.ui.build.floor = 3; });
    const p = await proj(room.x + 1.5, 0, room.y + 1.5);
    const m0 = await ev(() => window.__morada.M.engine.state.money);
    if (touch) { await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = true; }); await tap(p.x, p.y); }
    else { await page.mouse.move(p.x, p.y); await page.keyboard.down('Shift'); await page.mouse.click(p.x, p.y); await page.keyboard.up('Shift'); }
    await wait(500);
    const fl = await ev((rr) => { const M = window.__morada.M; const t = M.world.roomTiles(rr.x + 1, rr.y + 1); return { n: t.length, floored: t.filter((q) => M.world.getFloor(q.x, q.y) === 3).length }; }, room);
    const m1 = await ev(() => window.__morada.M.engine.state.money);
    await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = false; });
    await shot('12-build-floor-fill');
    expect('build.floorFill', fl.n === 12 && fl.floored === 12 && m0 - m1 > 0, { swatches: sw, fl, cost: m0 - m1 });
  });
  await step('build.undoChain', async () => {
    const m0 = await ev(() => window.__morada.M.engine.state.money);
    const n = await ev(() => window.__morada.M.ui.debug.ui.undo.length);
    if (!touch) await page.mouse.move(W / 2, 40);
    for (let i = 0; i < n; i++) {
      if (touch) { await collapseDrawer(false); const u = await ev(() => { const b = document.querySelector('#drawer .undo-btn'); if (!b || b.disabled) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); if (u) await tap(u.x, u.y); }
      else await page.keyboard.press('Control+z');
      await wait(250);
    }
    const after = await ev((rr) => { const M = window.__morada.M; return { money: M.engine.state.money, walls: rr ? M.world.edgesOfRect(rr.x, rr.y, rr.x + 3, rr.y + 2).filter((k) => M.world.getWall(k)).length : -1, left: M.ui.debug.ui.undo.length }; }, room);
    expect('build.undoChain', n >= 4 && after.walls === 0 && after.left === 0 && after.money > m0, { steps: n, after, m0 });
  });
  await modeBtn('live');

  // ================================================================== OPTIONS: save to Espaço 2 (chip), slot list, export
  await step('options', async () => {
    await modeBtn('options');
    await shot('13-options');
    const slots = await ev(() => { const b = document.getElementById('opt-load'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tap(slots.x, slots.y); await wait(800);
    const list0 = await ev(() => Array.from(document.querySelectorAll('.slot-list .slot')).map((s) => s.textContent));
    const sv = await ev(() => { const b = document.getElementById('slot-save-1'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (sv) { await tap(sv.x, sv.y); await wait(1200); }
    const list1 = await ev(() => Array.from(document.querySelectorAll('.slot-list .slot')).map((s) => s.textContent));
    const chip = await ev(() => document.querySelector('.save-chip') ? document.querySelector('.save-chip').textContent : null);
    const active = await ev(() => { try { return localStorage.getItem('morada:activeSlot'); } catch (e) { return null; } });
    await shot('14-options-slots');
    expect('options.saveSlot2', /Espaço 2/.test(chip || '') && active && /slot2/.test(active) && list1.some((t) => /Espaço 2/.test(t) && /Dia/.test(t)), { list0, list1, chip, active });
    // close the slot list, export
    await ev(() => { const U = window.__morada.M.ui.debug.ui; while (U.modals.length > 1) window.__morada.M.ui.debug.closeModal(U.modals[U.modals.length - 1]); });
    await wait(200);
    const ex = await ev(() => { const b = document.getElementById('opt-export'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (ex) { await tap(ex.x, ex.y); await wait(1200); }
    const exp = await ev(() => { const ta = document.getElementById('export-text'); let parsed = null; try { parsed = ta ? JSON.parse(ta.value) : null; } catch (e) { parsed = 'bad'; } return { textarea: !!ta, format: parsed && parsed.format, toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent) }; });
    await shot('15-options-export');
    expect('options.export', exp.format === 'morada-save' || exp.toasts.some((t) => /download/i.test(t)), exp);
    await ev(() => { const U = window.__morada.M.ui.debug.ui; while (U.modals.length) window.__morada.M.ui.debug.closeModal(U.modals[U.modals.length - 1]); });
    await wait(200);
    if (await ev(() => window.__morada.M.ui.mode !== 'live')) await modeBtn('live');
  });

  // ================================================================== NEW FAMILY on an empty lot + move-in checklist
  await step('newFamily', async () => {
    await modeBtn('options');
    await ev(() => document.getElementById('opt-newfamily').click());
    await wait(400);
    await ev(() => { const n = document.getElementById('cf-household') || document.querySelector('.modal input[type=text]'); if (n) { n.value = 'Família Teste'; n.dispatchEvent(new Event('input', { bubbles: true })); } });
    await shot('16-family');
    const fill = await ev(() => { const b = document.getElementById('cf-fill-0'); if (b) b.click(); return !!b; });
    await ev(() => document.getElementById('cf-next').click());
    await wait(400);
    await ev(() => document.getElementById('cf-lot-empty').click());
    await shot('17-family-lot');
    await ev(() => document.getElementById('cf-go').click());
    await wait(2000);
    const fam = await ev(() => { const M = window.__morada.M, st = M.engine.state; const c = document.getElementById('checklist'); return { name: st.householdName, money: st.money, members: M.engine.household().length, objects: st.objects.map((o) => o.type), modals: M.ui.debug.ui.modals.length, checklist: c && !c.hidden ? { n: c.querySelectorAll('li').length, ok: c.querySelectorAll('li.ok').length } : null }; });
    await shot('18-family-empty-lot');
    // buy a bed through the engine: the checklist ticks it
    await ev(() => { const M = window.__morada.M; for (let y = 2; y < 15; y++) for (let x = 2; x < 20; x++) { if (M.world.canPlace('bed_single', x, y, 0).ok) { M.engine.buyObject('bed_single', x, y, 0); return; } } });
    await wait(1500);
    const cl2 = await ev(() => { const c = document.getElementById('checklist'); return c && !c.hidden ? c.querySelectorAll('li.ok').length : null; });
    expect('newFamily.checklist', fill && fam.modals === 0 && fam.members >= 1 && fam.checklist && fam.checklist.n === 7 && cl2 === fam.checklist.ok + 1, { fam, afterBed: cl2 });
    await ev(() => { const st = window.__morada.M.engine.state; st.time.minute = 21 * 60 + 30; window.__morada.M.main.setSpeed(1); });
    await wait(2000);
    await shot('19-family-night');
  });

  const errs = await ev(() => (window.__errs2 || []).slice(0, 10));
  expect('noConsoleErrors', errs.length === 0, errs);
  return { fail, checks: C, shots };
}

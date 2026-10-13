// New family on an EMPTY lot through the Options UI, build a small house with real mouse input, then Live checks.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'family');
  await L.install(); await L.dismissHelp();
  const R = {}; const fails = [];
  const expect = (name, cond, data) => { R[name] = { ok: !!cond, data }; if (!cond) fails.push(name); };
  const click = async (sel) => { const b = await page.$(sel); if (!b) return false; const r = await b.boundingBox(); await L.tap(r.x + r.width / 2, r.y + r.height / 2); await L.wait(300); return true; };
  // ---- Options -> Nova família
  await L.modeBtn('options');
  await L.shot('0-options');
  expect('opt.newfamilyBtn', await click('#opt-newfamily'));
  await L.shot('1-family-step1');
  await page.fill('#cf-household', 'Família Teste');
  await page.fill('#cf-name-0', 'Ana');
  await page.fill('#cf-name-1', 'Beto');
  expect('cf.next', await click('#cf-next'));
  expect('cf.empty', await click('#cf-lot-empty'));
  await L.shot('2-family-step2');
  expect('cf.go', await click('#cf-go'));
  await L.wait(1500);
  await L.install();
  const st0 = await L.ev(() => { const s = window.__morada.state; return { money: s.money, name: s.householdName, sims: s.sims.map((q) => q.name + '@' + q.x + ',' + q.y), objs: s.objects.map((o) => o.type + '@' + o.x + ',' + o.y), walls: Object.keys(s.lot.walls).length, speed: s.speed, paused: window.__morada.M.main.isPaused() }; });
  expect('newfamily.state', st0.money === 20000 && st0.sims.length === 2 && st0.walls === 0, st0);
  await L.shot('3-empty-lot');
  // ---- Build: outer walls 6x6 (x 8..13, y 9..14) + bathroom partition
  await L.modeBtn('build');
  await L.tool('Parede');
  await L.cam({ k: 0, dist: 24, x: 11, z: 12 });
  await L.wait(700);
  const dragW = async (a, b) => {
    const A = await L.cornerScreen(a[0], a[1]), B = await L.cornerScreen(b[0], b[1]);
    await page.mouse.move(A.x, A.y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 10, A.y + (B.y - A.y) * i / 10); await L.wait(10); }
    await L.wait(100); const tip = await L.tip(); await page.mouse.up(); await L.wait(250); return tip;
  };
  const m0 = await L.money();
  const tips = [];
  tips.push(await dragW([8, 9], [14, 9]));
  tips.push(await dragW([14, 9], [14, 15]));
  tips.push(await dragW([14, 15], [8, 15]));
  tips.push(await dragW([8, 15], [8, 9]));
  tips.push(await dragW([11, 9], [11, 12]));
  tips.push(await dragW([8, 12], [11, 12]));
  const m1 = await L.money();
  const nWalls = await L.ev(() => Object.keys(window.__morada.state.lot.walls).length);
  expect('house.walls', nWalls === 30 && m0 - m1 === 30 * 70, { nWalls, cost: m0 - m1, tips });
  await L.shot('4-walls');
  // floor: wood over whole interior
  await L.tool('Piso');
  const A = await L.tileScreen(8, 9), B = await L.tileScreen(13, 14);
  await page.mouse.move(A.x, A.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(A.x + (B.x - A.x) * i / 10, A.y + (B.y - A.y) * i / 10); await L.wait(10); }
  await L.wait(100); const ftip = await L.tip(); await page.mouse.up(); await L.wait(300);
  const m2 = await L.money();
  expect('house.floor', m1 - m2 === 36 * 10, { ftip, cost: m1 - m2 });
  // doors: front h,12,15 and bathroom h,9,12
  await L.tool('Porta');
  for (const [ex, ey, key] of [[12.5, 15, 'h,12,15'], [9.5, 12, 'h,9,12']]) {
    const p = await L.proj(ex, 0.15, ey);
    await L.hover(p.x, p.y);
    const tip = await L.tip();
    const mm0 = await L.money();
    await page.mouse.click(p.x, p.y); await L.wait(250);
    const w = (await L.walls())[key];
    expect('door.' + key, w && w.t === 2, { tip, cost: mm0 - (await L.money()), w, pickEdge: await L.ev(([x, y]) => window.__morada.M.render.pickEdge(x, y), [p.x, p.y]) });
  }
  // window on the east wall
  await L.tool('Janela');
  { const p = await L.proj(14, 0.15, 12.5); await page.mouse.click(p.x, p.y); await L.wait(250); }
  await L.shot('5-doors');
  const rooms = await L.ev(() => window.__morada.M.world.rooms().map((r) => ({ id: r.id, area: r.area, indoor: r.indoor, score: r.score })));
  expect('house.rooms', rooms.filter((r) => r.indoor).length === 2, rooms);
  // ---- Buy furniture through the UI
  await L.modeBtn('buy');
  const place = async (type, x, y, rot) => {
    const c = await L.clickCard(type);
    if (!c) return { type, err: 'no card' };
    let pl = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && p.rot; });
    let n = 0; while (pl !== rot && n++ < 4) { await page.keyboard.press('r'); await L.wait(50); pl = await L.ev(() => window.__morada.M.ui.debug.ui.buy.placing.rot); }
    const t = await L.tileScreen(x, y);
    await L.hover(t.x, t.y);
    const g = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason }; });
    const n0 = await L.ev(() => window.__morada.state.objects.length);
    await page.mouse.click(t.x, t.y); await L.wait(250);
    const o = await L.ev((n0) => { const s = window.__morada.state; return s.objects.length > n0 ? s.objects[s.objects.length - 1] : null; }, n0);
    if (await L.ev(() => !!window.__morada.M.ui.debug.ui.buy.placing)) { await page.keyboard.press('Escape'); await L.wait(100); }
    return { type, want: [x, y, rot], ghost: g, got: o && [o.x, o.y, o.rot], id: o && o.id, el: t.el };
  };
  const plan = [
    ['bed_double', 12, 9, 0], ['fridge_cheap', 8, 14, 2], ['counter', 9, 14, 2], ['stove', 10, 14, 2],
    ['toilet', 8, 9, 0], ['sink', 9, 9, 0], ['shower', 10, 9, 0], ['table_small', 13, 12, 0], ['chair_wood', 13, 13, 2],
  ];
  const placed = [];
  for (const p of plan) placed.push(await place(...p));
  const bad = placed.filter((p) => !p.got || p.got.join() !== p.want.join());
  expect('house.buy', bad.length === 0, { placed, bad });
  await L.shot('6-furnished');
  await L.ev(() => window.__morada.M.render.setWallMode('up'));
  await L.wait(500);
  await L.shot('6b-furnished-wallsup');
  await L.ev(() => window.__morada.M.render.setWallMode('cutaway'));
  // ---- Live: check reachability of every object for every sim
  await L.modeBtn('live');
  const reach = await L.ev(() => {
    const M = window.__morada.M, E = M.engine, W = M.world;
    const out = [];
    for (const s of E.household()) for (const o of E.state.objects) {
      if (o.type === 'mailbox' || o.type === 'newspaper' || o.type === 'table_small') continue;
      const slots = W.slotsFor(o);
      const r = W.nearestReachable(s.x, s.y, slots, {});
      out.push({ sim: s.name.split(' ')[0], type: o.type, slots: slots.map((q) => q.x + ',' + q.y + (q.on ? 'on' : '') + (q.usable ? '' : '!')).join(' '), reach: !!r, via: r && r.path ? r.path.map((q) => q.x + ',' + q.y).join(' ') : null });
    }
    return out;
  });
  expect('live.reach', reach.every((r) => r.reach), reach.filter((r) => !r.reach));
  // player commands for each object (engine API), run until 'do' reached
  const runs = await L.ev(() => {
    const M = window.__morada.M, E = M.engine;
    const res = [];
    const sim = E.household()[0];
    E.setFreeWill(false);
    for (const o of E.state.objects.slice()) {
      if (['mailbox', 'newspaper', 'table_small', 'counter', 'puddle', 'dirty_plate', 'meal'].includes(o.type)) continue;
      const its = E.getInteractions(sim.id, o.id).filter((i) => i.enabled);
      if (!its.length) { res.push({ type: o.type, err: 'no enabled interactions', all: E.getInteractions(sim.id, o.id).map((i) => i.label + ':' + i.reason) }); continue; }
      const it = its[0];
      // put needs low so the action does something
      for (const k in sim.motives) sim.motives[k] = Math.min(sim.motives[k], 0);
      for (const a of sim.queue.slice()) E.cancelAction(sim.id, a.id);
      for (let i = 0; i < 40; i++) E.update(0.5);
      const ok = E.queueInteraction(sim.id, o.id, it.key, 'player');
      let reached = false, steps = 0, phases = new Set(), pos0 = [sim.x, sim.y];
      for (; steps < 600; steps++) { E.update(0.5); const a = sim.queue[0]; if (a) phases.add(a.phase); if (a && (a.objId === o.id || a.useObjId === o.id) && a.phase === 'do') { reached = true; break; } if (!sim.queue.length && steps > 5) break; }
      res.push({ type: o.type, it: it.label, ok, reached, mins: steps / 2, phases: Array.from(phases).join(','), at: [+sim.x.toFixed(1), +sim.y.toFixed(1)], anim: sim.anim, from: pos0.map((v) => +v.toFixed(1)) });
      // finish it
      for (let i = 0; i < 120; i++) E.update(0.5);
    }
    E.setFreeWill(true);
    return res;
  });
  expect('live.useAll', runs.every((r) => r.reached), runs);
  await L.shot('7-live');
  // 24h autonomy with both sims, record uses per object and min motives
  const auto = await L.ev(() => {
    const M = window.__morada.M, E = M.engine;
    const used = {}; const mins = {}; const fails = [];
    for (const s of E.household()) { for (const k in s.motives) s.motives[k] = 50; }
    const notes = []; const h = (n) => notes.push(n.text); M.util.bus.on('notify', h);
    for (let i = 0; i < 24 * 60 * 2; i++) {
      E.update(0.5);
      for (const s of E.household()) {
        const a = s.queue[0];
        if (a && a.phase === 'do' && (a.objId || a.useObjId)) { const o = E.objectById(a.useObjId || a.objId) || E.objectById(a.objId); if (o) used[o.type + ':' + a.interaction] = (used[o.type + ':' + a.interaction] || 0) + 1; }
        for (const k in s.motives) { const key = s.name.split(' ')[0] + '.' + k; mins[key] = Math.min(mins[key] == null ? 999 : mins[key], Math.round(s.motives[k])); }
      }
    }
    M.util.bus.off('notify', h);
    return { used, mins, notes: notes.filter((t) => /acidente|desmai|emerg|não consegue|bloque|caminho/i.test(t)).slice(0, 20), money: E.state.money, time: E.state.time };
  });
  R.auto = auto;
  await L.shot('8-after24h');
  return { fails, R, errs: await L.errs() };
}

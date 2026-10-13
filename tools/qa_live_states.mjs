// QA live: dead zones over the world, painting picking per wall mode, moving-target clicks, sleeping/low-mood
// commands, auto-action preemption, cancel during 'do', hover labels.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_states.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'states');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const other = await L.ev((sel) => window.__morada.M.engine.household().find((s) => s.id !== sel).id, sel);
  // ---- dead zones: what DOM element is on top across the dock rows
  out.deadZones = await L.ev(() => {
    const res = [];
    for (const elSel of ['#dock', '#dock .dock-row', '#dock .queue', '#dock .portraits', '#bar', '#cam']) {
      const el = document.querySelector(elSel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      res.push(elSel + ' ' + [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)].join(','));
    }
    // sample the queue row to the right of the last item
    const q = document.querySelector('#dock .queue');
    const items = q.querySelectorAll('.q-item, .queue-empty');
    const last = items.length ? items[items.length - 1].getBoundingClientRect() : q.getBoundingClientRect();
    const qr = q.getBoundingClientRect();
    const x = Math.min(qr.right - 10, last.right + 60), y = (qr.top + qr.bottom) / 2;
    const e = document.elementFromPoint(x, y);
    res.push('emptyQueueArea @' + Math.round(x) + ',' + Math.round(y) + ' -> ' + (e ? e.tagName + '.' + e.className : null));
    const dr = document.querySelector('#dock .dock-row').getBoundingClientRect();
    const pr = document.querySelector('#dock .portraits').getBoundingClientRect();
    const x2 = Math.min(dr.right - 10, pr.right + 40), y2 = (dr.top + dr.bottom) / 2;
    const e2 = document.elementFromPoint(x2, y2);
    res.push('emptyPortraitRow @' + Math.round(x2) + ',' + Math.round(y2) + ' -> ' + (e2 ? e2.tagName + '.' + e2.className + '#' + e2.id : null));
    return res;
  });
  // ---- painting per wall mode / rotation
  const painting = await L.ev(() => (window.__morada.state.objects.find((o) => o.type === 'painting_cheap') || {}).id);
  out.painting = {};
  for (const [mode, rot] of [['cutaway', 0], ['up', 0], ['down', 0], ['cutaway', 2], ['cutaway', 1]]) {
    await L.ev(([mode, rot]) => { const M = window.__morada.M; M.render.setWallMode(mode); const c = M.render.getCamera(); M.render.setCamera({ k: rot }); const o = window.__morada.state.objects.find((q) => q.type === 'painting_cheap'); M.render.focus(o.x + 0.5, o.y + 0.5, true); }, [mode, rot]);
    await L.wait(1500);
    const f = await L.objFind(painting);
    out.painting[mode + '/k' + rot] = f ? 'clickable' : 'NOT clickable';
    await L.shot('painting-' + mode + '-k' + rot);
  }
  await L.ev(() => { const M = window.__morada.M; M.render.setWallMode('cutaway'); M.render.setCamera({ k: 0 }); });
  await L.wait(800);
  // ---- hover labels (desktop)
  if (!L.touch) {
    const tv = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'tv_cheap').id);
    await L.focus(8, 11); await L.wait(500);
    const p = await L.objFind(tv);
    await page.mouse.move(p.x, p.y); await L.wait(400);
    out.hoverTv = await L.ev(() => { const l = document.getElementById('hover-label'); return l && !l.hidden ? l.textContent : null; });
    out.cursorTv = await L.ev(() => document.getElementById('view').style.cursor);
    const t = await L.tileScreen(5, 16);
    await page.mouse.move(t.x, t.y); await L.wait(400);
    out.hoverGrass = await L.ev(() => { const l = document.getElementById('hover-label'); return l && !l.hidden ? l.textContent : null; });
  }
  // ---- auto action preempted by player command?
  {
    await L.ev(() => window.__morada.M.engine.setFreeWill(true));
    const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 400; i++) { E.update(0.5); if (s.queue[0] && s.queue[0].source === 'auto' && s.queue[0].phase === 'do') break; } return s.queue.map((a) => a.label + '|' + a.source + '|' + a.phase); }, sel);
    out.autoBefore = r;
    const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
    const s = await L.ev((sid) => { const q = window.__morada.M.engine.simById(sid); return { x: q.x, y: q.y }; }, sel);
    await L.focus(15, 10); await L.wait(400);
    const p = await L.objFind(fr);
    await L.tap(p.x, p.y); await L.wait(400);
    await L.clickPie(/lanche/i); await L.wait(200);
    out.autoAfterCmd = (await L.queue(sel)).map((a) => a.label + '|' + a.src + '|' + a.phase + (a.cancel ? '|CANCEL' : ''));
    out.autoAfterCmdDom = (await L.queueDom()).map((q) => q.cls);
    await L.step(1);
    out.autoAfterStep = (await L.queue(sel)).map((a) => a.label + '|' + a.src + '|' + a.phase + (a.cancel ? '|CANCEL' : ''));
  }
  // ---- cancel during 'do': shower
  {
    const sh = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'shower').id);
    await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 10; i++) E.update(0.5); s.motives.hygiene = -40; }, sel);
    await L.focus(16, 7); await L.wait(400);
    const p = await L.objFind(sh);
    await L.tap(p.x, p.y); await L.wait(400);
    await L.clickPie(/banho/i); await L.wait(150);
    const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 200; i++) { E.update(0.5); if (s.queue[0] && s.queue[0].phase === 'do' && s.queue[0].elapsed > 3) break; } return { q: s.queue.map((a) => a.label + '|' + a.phase), anim: s.anim, pos: [s.x, s.y] }; }, sel);
    out.showerDo = r;
    await L.speed(1); await L.wait(300);
    await L.shot('shower-do');
    const qd = await L.queueDom();
    await L.tap(qd[0].x, qd[0].y); await L.wait(200);
    out.showerCancelDom = (await L.queueDom()).map((q) => q.cls + ' ' + q.title);
    await L.speed(0);
    const r2 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 40; i++) { E.update(0.5); const k = (s.queue[0] ? s.queue[0].label + ':' + s.queue[0].phase : 'none') + ':' + s.anim; if (seen[seen.length - 1] !== k) seen.push(k); } return { seen, pos: [s.x, s.y] }; }, sel);
    out.showerAfterCancel = r2;
    // clicking the cancelled (still exiting) item again
  }
  // ---- click a moving sim (real time, speed 3)
  {
    await L.ev(([sid, oid]) => { const E = window.__morada.M.engine; const o = E.simById(oid); o.queue.slice().forEach((a) => E.cancelAction(oid, a.id)); E.queueWalk(oid, 3, 16); E.queueWalk(oid, 20, 16); }, [sel, other]);
    await L.speed(3);
    let opened = 0, tries = 0, picks = [];
    for (let k = 0; k < 4; k++) {
      await L.wait(600);
      const o = await L.ev((oid) => { const s = window.__morada.M.engine.simById(oid); return { x: s.x, y: s.y, hidden: s.hidden }; }, other);
      if (o.hidden) break;
      await L.focus(o.x, o.y); await L.wait(150);
      const sp = await L.simScreen(other, 1.0);
      tries++;
      await L.tap(sp.x, sp.y); await L.wait(400);
      const pie = await L.pie();
      picks.push(sp.pick && sp.pick.kind);
      if (pie) { opened++; await L.ev(() => window.__morada.M.ui.closePie()); }
    }
    out.movingSim = { tries, opened, picks, otherHidden: await L.ev((oid) => window.__morada.M.engine.simById(oid).hidden, other) };
    // does the game keep running while the pie is open?
    const t0 = await L.ev(() => window.__morada.state.time.minute);
    const hs = await L.ev(() => { const s = window.__morada.M.engine.household()[0]; return { x: s.x, y: s.y }; });
    await L.focus(hs.x, hs.y); await L.wait(200);
    const sp = await L.simScreen(await L.ev(() => window.__morada.M.engine.household()[0].id), 1.0);
    await L.tap(sp.x, sp.y); await L.wait(1500);
    const t1 = await L.ev(() => window.__morada.state.time.minute);
    out.timeWhilePieOpen = { t0, t1, pieOpen: !!(await L.pie()) };
    await L.ev(() => window.__morada.M.ui.closePie());
    await L.speed(0);
  }
  // ---- low mood: commands refused
  {
    await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (const k in s.motives) s.motives[k] = -75; }, sel);
    await L.step(1);
    const tv = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'tv_cheap').id);
    await L.focus(8, 11); await L.wait(400);
    const p = await L.objFind(tv);
    await L.tap(p.x, p.y); await L.wait(400);
    const pie = await L.pie();
    out.lowMoodTvPie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.shot('lowmood-pie');
    const it = await L.clickPie(/Assistir/);
    await L.wait(200);
    out.lowMoodQueue = (await L.queue(sel)).map((a) => a.label + '|' + a.src);
    out.lowMoodNotes = await L.notes();
    out.lowMoodTip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
    // social on other with low mood
    const o = await L.ev((oid) => { const s = window.__morada.M.engine.simById(oid); return { x: s.x, y: s.y, hidden: s.hidden }; }, other);
    if (!o.hidden) {
      await L.focus(o.x, o.y); await L.wait(400);
      const sp = await L.simScreen(other, 1.0);
      await L.tap(sp.x, sp.y); await L.wait(420);
      const pie2 = await L.pie();
      out.lowMoodSocialPie = pie2 && pie2.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
      await L.shot('lowmood-social');
      await L.ev(() => window.__morada.M.ui.closePie());
    }
  }
  // ---- sleeping sim commanded
  {
    const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (const k in s.motives) s.motives[k] = 40; s.motives.energy = -20; s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); const bed = E.state.objects.find((o) => o.type === 'bed_double'); E.queueInteraction(sid, bed.id, 'sleep', 'player'); for (let i = 0; i < 200; i++) { E.update(0.5); if (s.asleep) break; } return { asleep: s.asleep, t: E.state.time }; }, sel);
    out.sleepSetup = r;
    const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
    await L.focus(15, 10); await L.wait(400);
    const p = await L.objFind(fr);
    await L.tap(p.x, p.y); await L.wait(400);
    const pie = await L.pie();
    out.sleepingFridgePie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.clickPie(/lanche/i); await L.wait(200);
    out.sleepingQueue = (await L.queue(sel)).map((a) => a.label + '|' + a.src + '|' + a.phase + (a.cancel ? '|X' : ''));
    out.sleepingNotes = await L.notes();
    const r2 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 60; i++) { E.update(0.5); const k = (s.queue[0] ? s.queue[0].label + ':' + s.queue[0].phase : 'none') + ':' + s.anim + (s.asleep ? ':zz' : ''); if (seen[seen.length - 1] !== k) seen.push(k); } return seen; }, sel);
    out.sleepingRun = r2;
  }
  out.errs = await L.errs();
  return out;
}

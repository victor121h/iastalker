// Verify LIVE-8 (queue cap / silent refusal / hidden overflow), LIVE-11 (floor click appends walks),
// LIVE-17 (log panel stays open and click walks), LIVE-12 (pizza double order).
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_8.mjs
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l8');
  const out = {};
  await V.installNotes();
  await V.speed(0);
  const ids = await V.ev(() => {
    const M = window.__morada.M, E = M.engine; E.setFreeWill(false);
    const rita = E.household().find((s) => s.name.startsWith('Rita'));
    E.selectSim(rita.id);
    for (const a of rita.queue.slice()) E.cancelAction(rita.id, a.id);
    for (let i = 0; i < 6; i++) E.update(0.5);
    return { rita: rita.id };
  });
  // find a set of lawn tiles that are on screen and pick as 'tile'
  const pts = await V.ev(() => {
    const M = window.__morada.M; const res = [];
    for (let y = 2; y < 19 && res.length < 14; y += 1) for (let x = 1; x < 23 && res.length < 14; x += 3) {
      const p = M.render.project(x + 0.5, 0, y + 0.5);
      if (p.clientX < 420 || p.clientX > 1200 || p.clientY < 80 || p.clientY > 680) continue;
      const el = document.elementFromPoint(p.clientX, p.clientY);
      if (!el || el.tagName !== 'CANVAS') continue;
      const pk = M.render.pick(p.clientX, p.clientY);
      if (pk && pk.kind === 'tile') res.push([p.clientX, p.clientY]);
    }
    return res;
  });
  out.nPts = pts.length;
  // LIVE-11 at speed 1: three floor clicks 0.6 s apart
  await V.speed(1);
  const q11 = [];
  for (const [x, y] of pts.slice(0, 3)) { await V.tap(x, y); await V.wait(600); q11.push((await V.ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.label + '|' + a.phase), ids.rita))); }
  out.live11 = q11;
  await V.speed(0);
  // LIVE-8: 14 floor clicks while paused
  for (const [x, y] of pts) { await V.tap(x, y); await V.wait(120); }
  out.walkQueueLen = await V.ev((id) => window.__morada.M.engine.simById(id).queue.length, ids.rita);
  out.walkQueueDom = await V.ev(() => document.querySelectorAll('#dock .queue .q-item').length);
  out.overflowBadge = await V.ev(() => { const q = document.querySelector('#dock .queue'); return q ? q.textContent.trim() : ''; });
  await V.notes();
  // now try a pie command (fridge snack)
  const fr = await V.ev(() => { const o = window.__morada.M.engine.state.objects.find((o) => /^fridge/.test(o.type)); return o.id; });
  const fp = await V.objFind(fr);
  if (fp) {
    await V.tap(fp.x, fp.y); await V.settle();
    out.fridgePie = (await V.pie() || []).map((i) => i.t);
    await V.clickPie(/lanche/i);
    await V.wait(300);
    out.afterSnackLen = await V.ev((id) => window.__morada.M.engine.simById(id).queue.length, ids.rita);
    out.afterSnackNotes = await V.notes();
    out.afterSnackTip = await V.tip();
    out.afterSnackToasts = (await V.toasts()).map((t) => t.text);
  }
  // pure engine: 8 snacks then a 9th
  out.engineCap = await V.ev((id) => {
    const E = window.__morada.M.engine; const s = E.simById(id);
    for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    for (let i = 0; i < 6; i++) E.update(0.5);
    s.queue.length = 0;
    const f = E.state.objects.find((o) => /^fridge/.test(o.type));
    const r = []; for (let i = 0; i < 9; i++) r.push(E.queueInteraction(s.id, f.id, 'snack', 'player'));
    const w = []; for (let i = 0; i < 5; i++) w.push(E.queueWalk(s.id, 3 + i, 17));
    return { snacks: r, walksAfterCap: w, qlen: s.queue.length };
  }, ids.rita);
  out.engineCapNotes = await V.notes();
  await V.shot('queue-full');
  // reset queue
  await V.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.length = 0; E.update(0.5); }, ids.rita);
  // LIVE-17: open log via bell, click the world
  const bell = await V.ev(() => { const b = document.getElementById('log-btn'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (bell) {
    await V.tap(bell[0], bell[1]); await V.wait(400);
    const open1 = await V.ev(() => { const p = document.getElementById('log-panel'); return p && !p.hidden; });
    const q0 = await V.ev((id) => window.__morada.M.engine.simById(id).queue.length, ids.rita);
    await V.tap(pts[2][0], pts[2][1]); await V.wait(400);
    const open2 = await V.ev(() => { const p = document.getElementById('log-panel'); return p && !p.hidden; });
    const q1 = await V.ev((id) => window.__morada.M.engine.simById(id).queue.length, ids.rita);
    out.live17 = { logOpenAfterBell: open1, logOpenAfterWorldClick: open2, queueGrew: q1 > q0, clickPt: pts[2] };
    await V.shot('log-open');
  }
  // LIVE-12: pizza twice through the phone pie
  await V.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.length = 0; }, ids.rita);
  const ph = await V.ev(() => { const o = window.__morada.M.engine.state.objects.find((o) => o.type === 'phone'); return { id: o.id, x: o.x, y: o.y }; });
  const m0 = await V.ev(() => window.__morada.M.engine.state.money);
  const pizzaRes = [];
  for (let i = 0; i < 2; i++) {
    await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [ph.x, ph.y]);
    await V.speed(1); await V.wait(400); await V.speed(0);
    const pp = await V.objFind(ph.id);
    if (!pp) { pizzaRes.push('phone not found'); continue; }
    await V.tap(pp.x, pp.y); await V.settle();
    const pie = (await V.pie() || []).map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? '[' + i.why + ']' : ''));
    const it = await V.clickPie(/pizza/i);
    await V.step(15);
    pizzaRes.push({ pie, clicked: !!it, money: await V.ev(() => window.__morada.M.engine.state.money), events: await V.ev(() => (window.__morada.M.engine.state.events || []).map((e) => e.kind)) });
  }
  out.live12 = { moneyStart: m0, pizzaRes, notes: (await V.notes()).filter((n) => /pizza/i.test(n)) };
  return out;
}

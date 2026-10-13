// QA live: commanding a sleeping character; low-mood refusal advice vs. disabled fun/social; moving target click.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_sleep.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'sleep');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const other = await L.ev((sel) => window.__morada.M.engine.household().find((s) => s.id !== sel).id, sel);
  const tipNow = () => L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
  // ---- sleeping
  const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (const k in s.motives) s.motives[k] = 40; s.motives.energy = -20; s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); const bed = E.state.objects.find((o) => o.type === 'bed_double'); E.queueInteraction(sid, bed.id, 'sleep', 'player'); for (let i = 0; i < 200; i++) { E.update(0.5); if (s.asleep) break; } return { asleep: s.asleep, t: E.state.time, q: s.queue.map((a) => a.label) }; }, sel);
  out.sleepSetup = r;
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  await L.focus(15, 10); await L.wait(500);
  const p = await L.objFind(fr);
  out.fridgeAt = p;
  await L.tap(p.x, p.y); await L.wait(300);
  out.tip = await tipNow();
  const pie = await L.pie();
  out.sleepingFridgePie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
  if (pie) {
    await L.clickPie(/lanche/i); await L.wait(200);
    out.sleepingQueue = (await L.queue(sel)).map((a) => a.label + '|' + a.src + '|' + a.phase + (a.cancel ? '|X' : ''));
    out.sleepingNotes = await L.notes();
    out.sleepingRun = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 60; i++) { E.update(0.5); const k = (s.queue[0] ? s.queue[0].label + ':' + s.queue[0].phase : 'none') + ':' + s.anim + (s.asleep ? ':zz' : ''); if (seen[seen.length - 1] !== k) seen.push(k); } return seen; }, sel);
  }
  await L.shot('sleeping');
  // clicking on the sleeping (selected) character's queue to cancel sleep
  // ---- low mood with fun lowest
  await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 30; i++) E.update(0.5); Object.assign(s.motives, { hunger: -40, energy: -40, bladder: -40, hygiene: -40, comfort: -60, fun: -100, social: -95, room: -100 }); }, sel);
  await L.notes();
  const tv = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'tv_cheap').id);
  await L.focus(8, 11); await L.wait(400);
  const pt = await L.objFind(tv);
  await L.tap(pt.x, pt.y); await L.wait(400);
  const pie2 = await L.pie();
  out.lowFunTvPie = pie2 && pie2.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
  out.mood = await L.ev((sid) => window.__morada.M.engine.mood(window.__morada.M.engine.simById(sid)), sel);
  // force-queue via engine to read the refusal advice text (what the player sees when they try)
  out.refusalText = await L.ev(([sid, tv]) => { const E = window.__morada.M.engine; window.__notes.length = 0; E.queueInteraction(sid, tv, 'watch', 'player'); return window.__notes.slice(); }, [sel, tv]);
  await L.ev(() => window.__morada.M.ui.closePie());
  // social on the other sim
  const o = await L.ev((oid) => { const s = window.__morada.M.engine.simById(oid); return { x: s.x, y: s.y, hidden: s.hidden }; }, other);
  out.otherHidden = o.hidden;
  if (!o.hidden) {
    await L.focus(o.x, o.y); await L.wait(400);
    const sp = await L.simScreen(other, 1.0);
    await L.tap(sp.x, sp.y); await L.wait(420);
    const p3 = await L.pie();
    out.lowSocialPie = p3 && p3.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.shot('lowmood-social');
    await L.ev(() => window.__morada.M.ui.closePie());
  }
  out.errs = await L.errs();
  return out;
}

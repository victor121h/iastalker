// QA live: spam floor clicks (walk queue cap), walls-down unreachable click, click same tile, rug click.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_walkspam.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'walkspam');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 10; i++) E.update(0.5); }, sel);
  await L.focus(11, 15); await L.wait(500);
  const tiles = [[4, 15], [6, 16], [8, 15], [10, 16], [12, 15], [14, 16], [16, 15], [18, 16], [20, 15], [5, 17], [7, 17], [9, 17], [11, 17], [13, 17]];
  for (const [x, y] of tiles) { const sp = await L.tileScreen(x, y); await L.tap(sp.x, sp.y); await L.wait(120); }
  out.walkQueueLen = (await L.queue(sel)).length;
  out.walkQueueDom = (await L.queueDom()).length;
  out.notes = await L.notes();
  await L.shot('spam');
  // now try a pie action with 14 walks queued
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  await L.focus(15, 10); await L.wait(400);
  const p = await L.objFind(fr);
  await L.tap(p.x, p.y); await L.wait(400);
  await L.clickPie(/lanche/i); await L.wait(200);
  out.afterSnack = (await L.queue(sel)).map((a) => a.label).slice(-3);
  out.afterSnackLen = (await L.queue(sel)).length;
  out.snackNotes = await L.notes();
  // time to finish all walks
  out.minutesToFinish = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); let n = 0; while (s.queue.length && n < 4000) { E.update(0.5); n++; } return n / 2; }, sel);
  // walls down: enclosed tile
  await L.ev(() => { const M = window.__morada.M, W = M.world; for (const k of W.edgesOfRect(2, 2, 2, 2)) W.setWall(k, 1, 0); M.util.bus.emit('lot'); });
  const wb = await L.ev(() => { const b = document.querySelector('.wall-btn'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  // cycle to "down"
  for (let i = 0; i < 3; i++) { const m = await L.ev(() => window.__morada.state.settings.wallMode); if (m === 'down') break; await L.tap(wb.x, wb.y); await L.wait(400); }
  out.wallMode = await L.ev(() => window.__morada.state.settings.wallMode);
  await L.focus(2, 2); await L.wait(600);
  const sp = await L.tileScreen(2, 2);
  out.enclosedPick = sp.pick;
  await L.tap(sp.x, sp.y); await L.wait(200);
  out.enclosedQueued = (await L.queue(sel)).map((a) => a.label);
  out.enclosedTip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
  const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 120 && s.queue.length; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); } return { seen, at: [s.x, s.y], bubble: s.bubble && s.bubble.icon }; }, sel);
  out.enclosedRun = r; out.enclosedNotes = await L.notes();
  out.errs = await L.errs();
  return out;
}

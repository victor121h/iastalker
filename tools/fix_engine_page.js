// In-page smoke test for the engine fix round (run with integrate_check --eval): advances the real game a few
// sim-hours at the page level and exercises the CONTRACT_V2 engine API. Returns a JSON summary.
const M = window.__morada ? window.__morada.M : window.M;
const E = M.engine;
const S = E.state;
const out = { errors: [] };
try {
  const t0 = performance.now();
  for (let i = 0; i < 6 * 60 * 2; i++) E.update(0.5);
  out.ms6h = Math.round(performance.now() - t0);
  out.time = M.util.fmtTime(S.time.minute) + ' d' + S.time.day;
  const rita = E.household()[0];
  out.home = E.homeTile(rita.id);
  out.deliveries = E.pendingDeliveries();
  out.queueWalk = E.queueWalk(rita.id, 3, 16);
  out.redirect = E.queueWalk(rita.id, 4, 16) && rita.queue.filter((a) => a.kind === 'walk').length;
  const snap = E.snapshotBuild();
  out.estimate = E.estimateRoom(2, 2, 4, 4, 1);
  out.build = E.buildRoom(2, 2, 4, 4, 1);
  out.restore = E.restoreBuild(snap);
  out.paintSide = E.paintWall('h,8,10', 6, 'A');
  out.lastReason = E.paintRoomFloor(1, 1, 8).reason;
  out.notifications = S.notifications.slice(-5).map((n) => n.text + (n.count ? ' ×' + n.count : '') + (n.focus ? ' [focus]' : ''));
} catch (e) { out.errors.push(String(e && e.stack || e)); }
return out;

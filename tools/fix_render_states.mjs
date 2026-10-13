// Render fix round: close-up screenshots of object states, wall details and props.
// Usage: node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_states.mjs
import path from 'node:path';
import fs from 'node:fs';
export default async function (page, ctx) {
  const dir = path.join(ctx.shotDir, 'fix_render');
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  const shot = async (name) => { const f = path.join(dir, 'state-' + name + '.png'); await page.screenshot({ path: f }); out.push(path.basename(f)); };
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); document.getElementById('hud').style.visibility = 'hidden'; });
  await ev(() => { window.__morada.M.main.setSpeed(1); window.__morada.state.time.minute = 11 * 60; });
  // dirty shower + broken TV + puddle + per-side wallpaper on the bathroom wall
  const info = await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const find = (t) => S.objects.find((o) => o.type === t);
    const sh = find('shower'), tv = find('tv_cheap') || find('tv_lux'), toilet = find('toilet');
    if (sh) sh.dirty = 900;
    if (toilet) toilet.dirty = 900;
    if (tv) tv.broken = true;
    S.objects.push({ id: 990001, type: 'puddle', x: 13, y: 12, rot: 0, dirty: 0, broken: false });
    // freeze the household away from the bathroom
    for (const s of S.sims) { s.queue = []; s.anim = 'idle'; }
    M.util.bus.emit('objects');
    return { sh: sh && [sh.x, sh.y], tv: tv && [tv.x, tv.y], toilet: toilet && [toilet.x, toilet.y] };
  });
  await page.waitForTimeout(800);
  const cam = async (o) => { await ev((o) => { const R = window.__morada.M.render; R.setCamera({ k: o.k || 0, dist: o.dist || 12, x: o.x, z: o.z }); }, o); await page.waitForTimeout(o.wait || 900); };
  if (info.sh) { await cam({ x: info.sh[0] + 0.5, z: info.sh[1] + 0.5, dist: 9 }); await shot('dirty-shower'); }
  if (info.tv) { await cam({ x: info.tv[0] + 0.5, z: info.tv[1] + 0.5, dist: 9 }); await shot('broken-tv'); }
  await cam({ x: 13.5, z: 12.5, dist: 8 }); await shot('puddle');
  // doors cut: threshold + short trim
  await cam({ x: 9.5, z: 13.5, dist: 9 }); await shot('door-cut');
  await cam({ x: 9.5, z: 11, dist: 11, k: 1 }); await shot('door-cut-k1');
  // phone call with the red handset; standing idle fidgets
  const ph = await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const phone = S.objects.find((o) => o.type === 'phone');
    const s = S.sims.find((x) => !x.visitor && !x.hidden);
    if (!phone || !s) return null;
    const sl = M.world.slotsFor(phone)[0];
    s.x = sl.px != null ? sl.px : sl.x; s.y = sl.py != null ? sl.py : sl.y; s.facing = sl.facing; s.anim = 'phone';
    s.queue = [{ id: 1, kind: 'object', objId: phone.id, interaction: 'call_friend', phase: 'do', source: 'player', label: 'x', icon: 'x', elapsed: 0 }];
    return [s.x, s.y];
  });
  if (ph) { await cam({ x: ph[0] + 0.5, z: ph[1] + 0.5, dist: 6 }); await shot('phone-handset'); }
  const idl = await ev(() => {
    const S = window.__morada.state;
    const s = S.sims.find((x) => !x.visitor && !x.hidden);
    s.queue = []; s.anim = 'idle'; s.x = 18; s.y = 3; s.facing = 0.6;
    return [s.x, s.y];
  });
  for (let i = 0; i < 3; i++) { await cam({ x: idl[0] + 0.5, z: idl[1] + 0.5, dist: 6, wait: 2600 }); await shot('idle-' + i); }
  // per-side wallpaper: paint only the inside (side A) of the front wall, look from inside and outside
  await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const w = S.lot.walls['h,13,14']; w.cA = 4; w.cB = 0;
    M.util.bus.emit('lot');
    M.render.setWallMode('up');
  });
  await cam({ x: 13.5, z: 15, dist: 11, k: 0 }); await shot('wall-sideB-outside');
  await cam({ x: 13.5, z: 12, dist: 11, k: 2 }); await shot('wall-sideA-inside');
  await ev(() => window.__morada.M.render.setWallMode('cutaway'));
  // night: street lamp pools and lit windows from the street
  await ev(() => { window.__morada.state.time.minute = 22 * 60 + 30; });
  await cam({ x: 12, z: 24, dist: 26, k: 0, wait: 1500 }); await shot('night-street');
  await cam({ x: 8, z: 11, dist: 16, k: 0, wait: 1200 }); await shot('night-living');
  return { info, out };
}

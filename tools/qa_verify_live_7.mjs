// Verify LIVE-7: how clickable is a moving character? Static hit width vs. walking vs. running.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_7.mjs [--touch --w 390 --h 844]
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l7');
  const out = {};
  await V.speed(0);
  const ids = await V.ev(() => {
    const M = window.__morada.M, E = M.engine; E.setFreeWill(false);
    const rita = E.household().find((s) => s.name.startsWith('Rita')), caio = E.household().find((s) => s.name.startsWith('Caio'));
    E.selectSim(rita.id);
    for (const s of [rita, caio]) for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    for (let i = 0; i < 10; i++) E.update(0.5);
    if (caio.career) caio.career = null; // keep him home
    return { rita: rita.id, caio: caio.id };
  });
  // instrument pointerup picks
  await V.ev(() => {
    window.__ups = [];
    document.querySelector('#view').addEventListener('pointerup', (e) => { const p = window.__morada.M.render.pick(e.clientX, e.clientY); window.__ups.push(p ? p.kind + (p.id != null ? ':' + p.id : '') : 'null'); }, true);
  });
  const fps = await V.ev(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
  out.fps = fps;
  const chestPt = () => V.ev((cid) => {
    const M = window.__morada.M; let root = null;
    // find the rig root via the selected/char records: project the rendered head/feet midpoint
    const sim = M.engine.simById(cid);
    M.render.scene.traverse((n) => { if (!root && n.userData && n.userData.simId === cid) root = n; });
    let wx, wz;
    if (root) { const v = new THREE.Vector3(); root.getWorldPosition(v); wx = v.x; wz = v.z; } else { wx = sim.x + 0.5; wz = sim.y + 0.5; }
    const p = M.render.project(wx, 1.05, wz);
    return { x: p.clientX, y: p.clientY, viaRig: !!root };
  }, ids.caio);
  // static hit width (paused, mid-walk)
  await V.ev(([cid]) => { const E = window.__morada.M.engine; E.queueWalk(cid, 3, 17); }, [ids.caio]);
  await V.speed(1); await V.wait(1500); await V.speed(0); await V.wait(200);
  const c0 = await chestPt();
  out.rigFound = c0.viaRig;
  out.staticHit = await V.ev(([cid, cx, cy]) => {
    const M = window.__morada.M; let hit = 0, first = null, last = null;
    for (let dx = -60; dx <= 60; dx++) { const p = M.render.pick(cx + dx, cy); if (p && p.kind === 'sim' && p.id === cid) { hit++; if (first === null) first = dx; last = dx; } }
    const a = M.render.project(0, 0, 0), b = M.render.project(1, 0, 0);
    return { hitPx: hit, range: [first, last], tilePx: Math.round(Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)) };
  }, [ids.caio, c0.x, c0.y]);
  await V.shot('static');
  // moving: walk (short path < 10 tiles) and run (long path)
  for (const [name, tx, ty] of [['walkShort', null, null], ['runLong', null, null]]) {
    const res = [];
    for (let i = 0; i < 6; i++) {
      await V.speed(0);
      await V.ev(([cid, rid, long]) => {
        const M = window.__morada.M, E = M.engine; const s = E.simById(cid);
        for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
        for (let k = 0; k < 6; k++) E.update(0.5);
        // pick a target ~6 tiles away (walk) or ~14 tiles (run) on the same open lawn area
        const fromX = Math.round(s.x), fromY = Math.round(s.y);
        const cands = [];
        for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) { const p = M.world.findPath(fromX, fromY, x, y); if (p && (long ? p.length >= 14 && p.length <= 20 : p.length >= 6 && p.length <= 8)) cands.push([x, y]); }
        const c = cands[Math.floor(Math.random() * cands.length)];
        E.queueWalk(cid, c[0], c[1]);
        E.selectSim(rid);
      }, [ids.caio, ids.rita, name === 'runLong']);
      await V.speed(1); await V.wait(900);
      const before = await V.ev(() => window.__ups.length);
      const pt = await chestPt();
      await V.tap(pt.x, pt.y); await V.wait(350);
      const r = await V.ev(([rid]) => ({ pie: !!document.getElementById('pie'), up: window.__ups[window.__ups.length - 1], running: (() => { const s = window.__morada.M.engine.simById(+Object.keys({})[0] || 0); return null; })(), ritaQ: window.__morada.M.engine.simById(rid).queue.map((a) => a.label) }), [ids.rita]);
      const run = await V.ev((cid) => { const a = window.__morada.M.engine.simById(cid).queue[0]; return a ? !!(a.data && a.data.run) : null; }, ids.caio);
      res.push({ pie: r.pie, pickAtUp: r.up, caioRunning: run, ritaWalkQueued: r.ritaQ.includes('Andar até aqui') });
      await V.closePie();
      await V.ev((rid) => { const E = window.__morada.M.engine; const s = E.simById(rid); for (const a of s.queue.slice()) E.cancelAction(s.id, a.id); }, ids.rita);
    }
    out[name] = { hits: res.filter((x) => x.pie).length + '/6', res };
  }
  return out;
}

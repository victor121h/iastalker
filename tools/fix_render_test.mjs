// Render fix round — functional checks for the render/models findings (QA round 2).
// Usage: node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_test.mjs [--w 390 --h 844 --touch]
// Prints { pass, fail, results: [ { name, ok, info } ] }.
export default async function (page, ctx) {
  const results = [];
  const ok = (name, cond, info) => results.push({ name, ok: !!cond, info });
  const ev = (fn, a) => page.evaluate(fn, a);
  const wait = (ms) => page.waitForTimeout(ms);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  await ev(() => { const M = window.__morada.M; M.main.setSpeed && M.main.setSpeed(0); });
  await wait(300);
  // helpers in page
  await ev(() => {
    const M = window.__morada.M;
    window.__fx = {
      frames(n) { for (let i = 0; i < (n || 30); i++) M.render.frame(0.05); },
      visible(id) { let vis = null; M.render.scene.traverse((n) => { if (vis === null && n.userData && n.userData.objId === id && n.isMesh) { let p = n, v = true; while (p) { if (p.visible === false) v = false; p = p.parent; } vis = v; } }); return vis; },
      // sample a grid over the projected footprint of a tile region and count picks of `id`
      pickCount(id, x, y, w, h, yLo, yHi, opts) {
        const R = M.render; let n = 0, tot = 0; const counts = {};
        for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) for (const hh of [yLo, yHi]) {
          const p = R.project(x + 0.1 + (w - 0.2) * i / 5, hh, y + 0.1 + (h - 0.2) * j / 5);
          if (!p.visible) continue;
          const pk = R.pick(p.clientX, p.clientY, opts); tot++;
          const key = pk ? (pk.kind === 'object' ? (pk.id === id ? 'TARGET' : 'obj' + pk.id) : pk.kind) : 'null';
          counts[key] = (counts[key] || 0) + 1;
          if (pk && pk.kind === 'object' && pk.id === id) n++;
        }
        return { n, tot, counts };
      },
    };
  });

  // ---------- LIVE-5 / VIS-3: starter painting visible + clickable in cutaway when it faces the camera
  const decor = await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const out = {};
    const items = S.objects.filter((o) => (M.data.CATALOG[o.type] || {}).wall);
    M.render.setWallMode('cutaway');
    for (const k of [0, 1, 2, 3]) {
      M.render.setCamera({ k, dist: 24 });
      for (const o of items) {
        M.render.focus(o.x, o.y, true);
        window.__fx.frames(8);
        const yaw = Math.PI / 4 + k * Math.PI / 2, d = { x: Math.sin(yaw), z: Math.cos(yaw) };
        const f = o.rot === 0 ? { x: 0, z: 1 } : o.rot === 1 ? { x: -1, z: 0 } : o.rot === 2 ? { x: 0, z: -1 } : { x: 1, z: 0 };
        const facing = f.x * d.x + f.z * d.z > 0;
        const vis = window.__fx.visible(o.id);
        const pc = window.__fx.pickCount(o.id, o.x, o.y, 1, 1, 1.1, 1.8);
        const pc2 = window.__fx.pickCount(o.id, o.x, o.y, 1, 1, 0.42, 0.62);
        out[o.type + '#' + o.id + '/k' + k] = { facing, vis, picks: pc.n + pc2.n };
      }
    }
    return out;
  });
  let decorBad = Object.entries(decor).filter(([k, v]) => v.facing && (!v.vis || v.picks === 0));
  ok('LIVE-5/VIS-3 camera-facing wall decor visible+clickable in cutaway (all rotations)', decorBad.length === 0, decorBad.length ? decorBad : Object.keys(decor).length + ' cases');

  // ---------- 'down' mode: decor shown as a plaque on the cut wall, still clickable
  const down = await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const p = S.objects.find((o) => o.type === 'painting_cheap');
    M.render.setWallMode('down'); M.render.setCamera({ k: 0, dist: 24 }); M.render.focus(p.x, p.y, true);
    window.__fx.frames(8);
    const pc = window.__fx.pickCount(p.id, p.x, p.y, 1, 1, 0.42, 0.75);
    M.render.setWallMode('cutaway'); window.__fx.frames(8);
    return { vis: window.__fx.visible(p.id), picks: pc.n };
  });
  ok('decor plaque on cut-down walls (Paredes baixas) is clickable', down.picks > 0, down);

  // ---------- BB-5: buy a painting on the outside of the front wall -> visible + selectable
  const bb5 = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    E.state.money = 50000;
    const r = E.buyObject('painting_lux', 13, 14, 0);
    M.render.setCamera({ k: 0, dist: 24 }); M.render.focus(13, 14, true);
    window.__fx.frames(8);
    if (!r || !r.ok) return { buy: r };
    const pc = window.__fx.pickCount(r.obj.id, 13, 14, 1, 1, 1.0, 1.9, { objectsOnly: true });
    return { buy: r.ok, id: r.obj.id, vis: window.__fx.visible(r.obj.id), picks: pc.n };
  });
  ok('BB-5 painting bought on the front wall stays visible and selectable', bb5.vis && bb5.picks > 0, bb5);

  // ---------- setWallsUpOverride
  const ovr = await ev(() => {
    const M = window.__morada.M;
    M.render.setWallsUpOverride(true); window.__fx.frames(8);
    const mesh = M.render.scene.getObjectByName('wallsH');
    let minH = 99; const m4 = new window.THREE.Matrix4(), p = new window.THREE.Vector3(), q = new window.THREE.Quaternion(), s = new window.THREE.Vector3();
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m4); m4.decompose(p, q, s); const top = p.y + s.y / 2; if (s.y > 0.001 && p.y - s.y / 2 < 0.01) minH = Math.min(minH, top); }
    const on = M.render.wallsUpOverride;
    M.render.setWallsUpOverride(false); window.__fx.frames(8);
    let minH2 = 99;
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m4); m4.decompose(p, q, s); const top = p.y + s.y / 2; if (s.y > 0.001 && p.y - s.y / 2 < 0.01) minH2 = Math.min(minH2, top); }
    return { on, minTopUp: +minH.toFixed(2), minTopAfter: +minH2.toFixed(2) };
  });
  ok('setWallsUpOverride raises every wall and restores the cutaway', ovr.on && ovr.minTopUp >= 0.85 && ovr.minTopAfter < 0.5, ovr);

  // ---------- hideObject
  const hid = await ev(() => {
    const M = window.__morada.M, S = window.__morada.state;
    const sofa = S.objects.find((o) => o.type === 'sofa_cheap' || o.type === 'sofa_lux');
    M.render.focus(sofa.x, sofa.y, true); window.__fx.frames(8);
    const before = window.__fx.pickCount(sofa.id, sofa.x, sofa.y, 2, 1, 0.3, 0.6, { objectsOnly: true }).n;
    M.render.hideObject(sofa.id, true); window.__fx.frames(5);
    const vis = window.__fx.visible(sofa.id), after = window.__fx.pickCount(sofa.id, sofa.x, sofa.y, 2, 1, 0.3, 0.6, { objectsOnly: true }).n;
    M.render.hideObject(sofa.id, false); window.__fx.frames(5);
    return { before, vis, after, back: window.__fx.visible(sofa.id) };
  });
  ok('hideObject hides the object and makes it unpickable, and restores it', hid.before > 0 && hid.vis === false && hid.after === 0 && hid.back === true, hid);

  // ---------- BB-1: pickEdge on and above the cut front-wall stub
  const bb1 = await ev(() => {
    const M = window.__morada.M, R = M.render;
    R.setWallMode('cutaway'); R.setCamera({ k: 0, dist: 30 }); R.focus(13, 12, true); window.__fx.frames(8);
    const rows = {};
    let good = 0, n = 0;
    for (const h of [0.05, 0.2, 0.35, 0.5, 0.7, 0.9]) for (const fx of [13.2, 13.5, 13.8]) {
      const p = R.project(fx, h, 14.06); const e = R.pickEdge(p.clientX, p.clientY);
      rows[fx + '@' + h] = e ? e.key + ':' + e.side : '-';
      n++; if (e && e.key === 'h,13,14') good++;
    }
    return { good, n, rows };
  });
  ok('BB-1 pickEdge hits the cut wall on the stub and up to ~0.9 above it', bb1.good === bb1.n, bb1);

  // ---------- pickEdge side (CONTRACT_V2 §1)
  const side = await ev(() => {
    const M = window.__morada.M, R = M.render;
    R.setWallMode('up'); window.__fx.frames(8);
    const out = {};
    // front wall outer face (south) at k0 -> side B; at k2 we look from the north at its inner face -> side A
    R.setCamera({ k: 0, dist: 30 }); R.focus(13, 12, true); window.__fx.frames(8);
    let p = R.project(13.5, 1.2, 14.06); out.k0 = R.pickEdge(p.clientX, p.clientY);
    R.setCamera({ k: 2, dist: 30 }); R.focus(13, 16, true); window.__fx.frames(8);
    p = R.project(13.5, 1.2, 13.94); out.k2 = R.pickEdge(p.clientX, p.clientY);
    R.setCamera({ k: 0, dist: 30 }); R.setWallMode('cutaway'); window.__fx.frames(8);
    return { k0: out.k0 && out.k0.key + ':' + out.k0.side, k2: out.k2 && out.k2.key + ':' + out.k2.side };
  });
  ok('pickEdge reports the face under the cursor (side B from the street, side A from inside)', side.k0 === 'h,13,14:B' && side.k2 === 'h,13,14:A', side);

  // ---------- BB-2: walls occlude characters
  const bb2 = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const caio = S.sims.find((s) => !s.visitor && !s.hidden && s.name && s.name.indexOf('Caio') === 0) || S.sims.find((s) => !s.visitor && !s.hidden);
    caio.queue = []; caio.x = 14; caio.y = 13; caio.anim = 'idle'; caio.seated = false; caio.asleep = false;
    R.setWallMode('up'); R.setCamera({ k: 0, dist: 30 }); R.focus(14, 13, true); window.__fx.frames(8);
    let simHits = 0, n = 0;
    for (const h of [0.6, 1.0, 1.3]) for (const dx of [-0.1, 0, 0.1]) {
      // points on the front wall in front of Caio
      const p = R.project(14.5 + dx, h, 14.06); const pk = R.pick(p.clientX, p.clientY); n++;
      if (pk && pk.kind === 'sim') simHits++;
    }
    R.setWallMode('cutaway'); window.__fx.frames(8);
    const hp = R.simScreenPos(caio.id);
    const pk2 = R.pick(hp.clientX, hp.clientY + 30);
    return { simHits, n, cutPick: pk2 && pk2.kind + ':' + pk2.id, caio: caio.id };
  });
  ok('BB-2 a character behind a standing wall is not picked through it', bb2.simHits === 0, bb2);
  ok('BB-2 the same character is picked when the wall is cut', bb2.cutPick === 'sim:' + bb2.caio, bb2);

  // ---------- Buy mode: objectsOnly picks furniture under a character
  const occl = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const sofa = S.objects.find((o) => o.type === 'sofa_cheap' || o.type === 'sofa_lux');
    const rita = S.sims.find((s) => !s.visitor && !s.hidden);
    rita.queue = []; rita.x = sofa.x; rita.y = sofa.y; rita.seated = true; rita.anim = 'sit';
    R.focus(sofa.x, sofa.y, true); window.__fx.frames(8);
    const hp = R.simScreenPos(rita.id);
    const head = R.project(rita.x + 0.5, 0.9, rita.y + 0.5);
    const live = R.pick(head.clientX, head.clientY);
    const buy = R.pick(head.clientX, head.clientY, { objectsOnly: true });
    rita.seated = false; rita.anim = 'idle';
    return { live: live && live.kind, buy: buy && buy.kind + ':' + buy.id, sofa: sofa.id, hp: !!hp };
  });
  ok('Buy/Build pick (objectsOnly) selects the sofa under a seated character; Live picks the character', occl.live === 'sim' && occl.buy === 'object:' + occl.sofa, occl);

  // ---------- LIVE-1: meal on a counter wins over the counter
  const meal = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const counter = S.objects.find((o) => o.type === 'counter');
    const id = 900000 + Math.floor(Math.random() * 90000);
    S.objects.push({ id, type: 'meal', x: counter.x, y: counter.y, rot: 0, servings: 3, dirty: 0, broken: false });
    M.world.rebuild && M.world.rebuild();
    M.util.bus.emit('objects');
    R.focus(counter.x, counter.y, true); window.__fx.frames(8);
    const pc = window.__fx.pickCount(id, counter.x, counter.y, 1, 1, 0.9, 0.95);
    const cp = R.project(counter.x + 0.5, 0.92, counter.y + 0.5);
    pc.centre = R.pick(cp.clientX, cp.clientY);
    pc.mode = M.ui && M.ui.mode; pc.counter = counter.id; pc.id = id; pc.itemAt = R.itemAt(counter.x, counter.y); pc.dbg = R._dbgItem && R._dbgItem(counter.x, counter.y); pc.onTile = S.objects.filter((o) => o.x === counter.x && o.y === counter.y).map((o) => o.type + '#' + o.id);
    S.objects = S.objects.filter((o) => o.id !== id); M.world.rebuild && M.world.rebuild(); M.util.bus.emit('objects'); window.__fx.frames(5);
    return { hits: pc.n, tot: pc.tot, counts: pc.counts, centre: pc.centre, mode: pc.mode, counter: pc.counter, id: pc.id, itemAt: pc.itemAt, onTile: pc.onTile, dbg: pc.dbg };
  });
  ok('LIVE-1 clicks on a counter tile holding a meal pick the meal (>70%)', meal.hits / Math.max(1, meal.tot) > 0.7, meal);

  // ---------- LIVE-7: enlarged capsule + snap radius
  const snap = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const s1 = S.sims.find((s) => !s.visitor && !s.hidden);
    s1.queue = []; s1.x = 18; s1.y = 3; s1.anim = 'idle'; s1.seated = false;
    R.setCamera({ k: 0, dist: 30 }); R.focus(18, 3, true); window.__fx.frames(8);
    const c = R.project(18.5, 0.9, 3.5);
    const res = {};
    for (const dx of [0, 10, 16, 22, 40]) { const pk = R.pick(c.clientX + dx, c.clientY); res['+' + dx + 'px'] = pk && (pk.kind === 'sim' ? 'sim' : pk.kind); }
    return res;
  });
  ok('LIVE-7 a click within ~16 px of a character selects it; 40 px away does not', snap['+0px'] === 'sim' && snap['+16px'] === 'sim' && snap['+40px'] !== 'sim', snap);

  // ---------- per-side wall colours (CONTRACT_V2 §1)
  const sides = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const key = 'h,13,14';
    const w = S.lot.walls[key];
    const prev = JSON.stringify(w);
    w.cA = 2; w.cB = 5;
    M.util.bus.emit('lot'); window.__fx.frames(3);
    const mesh = R.scene.getObjectByName('wallsH');
    const cols = [];
    const c = new window.THREE.Color();
    for (let i = 0; i < mesh.count; i++) if (mesh.userData.instEdge[i] === key) { mesh.getColorAt(i, c); cols.push(c.getHexString()); }
    const WP = M.data.WALLPAPERS;
    const want = [M.models.color(WP[2].color).getHexString(), M.models.color(WP[5].color).getHexString()];
    Object.assign(w, JSON.parse(prev)); delete w.cA; delete w.cB; if (JSON.parse(prev).cA != null) w.cA = JSON.parse(prev).cA; if (JSON.parse(prev).cB != null) w.cB = JSON.parse(prev).cB;
    M.util.bus.emit('lot'); window.__fx.frames(3);
    return { cols, want };
  });
  ok('each wall face uses its own side colour (A north, B south)', sides.cols.length >= 2 && sides.cols[0] === sides.want[0] && sides.cols[1] === sides.want[1], sides);

  // ---------- BB-8: an enclosed room without floor is cut like a room
  const bb8 = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const keys = ['h,19,2', 'h,20,2', 'h,19,4', 'h,20,4', 'v,19,2', 'v,19,3', 'v,21,2', 'v,21,3'];
    const before = {};
    for (const k of keys) { before[k] = S.lot.walls[k] || null; S.lot.walls[k] = { t: 1, c: 0 }; }
    M.world.rebuild && M.world.rebuild(); M.util.bus.emit('lot');
    R.setWallMode('cutaway'); R.setCamera({ k: 0, dist: 30 }); R.focus(20, 3, true); window.__fx.frames(8);
    // south wall h,19,4 and east wall v,21,* face the camera at k0 -> must be cut
    const cutH = (key) => { const W = R.scene.getObjectByName('wallsH'), V = R.scene.getObjectByName('wallsV'); const m4 = new window.THREE.Matrix4(), p = new window.THREE.Vector3(), q = new window.THREE.Quaternion(), s = new window.THREE.Vector3(); let top = null; for (const mesh of [W, V]) for (let i = 0; i < mesh.count; i++) if (mesh.userData.instEdge[i] === key) { mesh.getMatrixAt(i, m4); m4.decompose(p, q, s); top = Math.max(top || 0, p.y + s.y / 2); } return top; };
    const res = { south: cutH('h,19,4'), east: cutH('v,21,2'), north: cutH('h,19,2') };
    for (const k of keys) { if (before[k]) S.lot.walls[k] = before[k]; else delete S.lot.walls[k]; }
    M.world.rebuild && M.world.rebuild(); M.util.bus.emit('lot'); window.__fx.frames(5);
    return res;
  });
  ok('BB-8 enclosed unfloored room: near walls are cut, far wall stays up', bb8.south < 0.5 && bb8.east < 0.5 && bb8.north > 2.4, bb8);

  // ---------- CR-9: ghost type switches do not leak meshes
  const cr9 = await ev(() => {
    const M = window.__morada.M, R = M.render;
    const g = R.scene.getObjectByName('ghost');
    const types = Object.keys(M.data.CATALOG).filter((t) => M.data.CATALOG[t].buyable !== false);
    R.showGhost(types[0], 5, 5, 0, true);
    const n0 = g.children.length;
    for (let i = 0; i < 60; i++) R.showGhost(types[i % types.length], 5, 5, 0, i % 2 === 0);
    const n1 = g.children.length;
    R.hideGhost();
    return { n0, n1 };
  });
  ok('CR-9 switching the ghost type 60x keeps the ghost group size constant', cr9.n1 === cr9.n0, cr9);

  // ---------- VIS-8: carpool in the road lane, drives in
  const car = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const id = 900000 + Math.floor(Math.random() * 90000);
    S.objects.push({ id, type: 'carpool', x: 4, y: S.lot.h - 1, rot: 2, car: 'sedan', dirty: 0, broken: false, shift: 540, simIds: [], leaveAt: 99999 });
    M.util.bus.emit('objects'); window.__fx.frames(2);
    let g = null; R.scene.traverse((n) => { if (!g && n.userData && n.userData.objId === id && n.isGroup) g = n; });
    const p0 = new window.THREE.Vector3(); g.updateMatrixWorld(true); p0.setFromMatrixPosition(g.matrixWorld);
    window.__fx.frames(8);
    const p1 = new window.THREE.Vector3(); g.updateMatrixWorld(true); p1.setFromMatrixPosition(g.matrixWorld);
    S.objects = S.objects.filter((o) => o.id !== id); M.util.bus.emit('objects'); window.__fx.frames(2);
    return { startX: +p0.x.toFixed(2), endX: +p1.x.toFixed(2), endZcentre: +(p1.z - 0.5).toFixed(2), h: S.lot.h };
  });
  ok('VIS-8 carpool parks in the road lane (z ≈ h+2.75) and drives in', Math.abs(car.endZcentre - (car.h + 2.75)) < 0.2 && Math.abs(car.startX - car.endX) > 5, car);

  // ---------- markers
  const mk = await ev(() => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    const paper = S.objects.find((o) => o.type === 'newspaper');
    const fx = R.scene.getObjectByName('fx');
    const sprites = () => fx.children.filter((c) => c.isSprite && c.userData.kind).map((c) => c.userData.kind + (c.visible ? '' : '(hidden)'));
    const out = {};
    if (paper) { paper.offer = paper.offer || Object.keys(M.data.CAREERS)[0]; paper.read = false; window.__fx.frames(3); out.paper = sprites(); }
    const bills0 = S.bills.slice();
    S.bills = [{ id: 999, amount: 100, dueDay: S.time.day }]; window.__fx.frames(3);
    out.withBill = sprites();
    let flagAng = null; R.scene.traverse((n) => { if (n.isMesh && n.userData.kind === 'flag' && n.matrixAutoUpdate === false) { const e = new window.THREE.Euler().setFromRotationMatrix(n.matrix); flagAng = +e.x.toFixed(2); } });
    out.flagWithBill = flagAng;
    S.bills = []; window.__fx.frames(3);
    R.scene.traverse((n) => { if (n.isMesh && n.userData.kind === 'flag' && n.matrixAutoUpdate === false) { const e = new window.THREE.Euler().setFromRotationMatrix(n.matrix); flagAng = +e.x.toFixed(2); } });
    out.flagNoBill = flagAng;
    S.bills = bills0;
    return out;
  });
  ok('markers: newspaper offer badge, bill badge, mailbox flag raised with bills and lowered without', (mk.paper || []).indexOf('job') >= 0 && mk.withBill.indexOf('bill') >= 0 && mk.flagWithBill === 0 && Math.abs(mk.flagNoBill - 1.57) < 0.05, mk);

  // ---------- VIS-1: lamps do not light the lawn at night
  const night = await ev(async () => {
    const M = window.__morada.M, R = M.render, S = window.__morada.state;
    S.time.minute = 22 * 60;
    R.setWallMode('cutaway'); R.setCamera({ k: 0, dist: 30 }); R.focus(12, 10, true);
    for (let i = 0; i < 10; i++) R.frame(0.05);
    const gl = R.renderer.getContext();
    const lamps = S.objects.filter((o) => o.type === 'lamp_floor' || o.type === 'lamp_fancy');
    // sample the lawn just outside the house next to each lamp (2 tiles out from the nearest exterior wall)
    const seen = (x, z) => { const p = R.project(x, 0, z); const pk = R.pick(p.clientX, p.clientY, { objectsOnly: true }); return pk && pk.kind === 'tile' && !pk.wall && pk.x === Math.floor(x) && pk.y === Math.floor(z); };
    const px = (x, z) => { const p = R.project(x, 0, z); const buf = new Uint8Array(4); R.renderer.render(R.scene, R.camera); gl.readPixels(Math.round(p.x * devicePixelRatio), Math.round((R.canvas.height / devicePixelRatio - p.y) * devicePixelRatio), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf); return buf[0] + buf[1] + buf[2]; };
    const far = px(2, 2), samples = {};
    for (const o of lamps) { for (const [dx, dz] of [[-2, 0], [2, 0], [0, 2], [0, -2], [-1, 0], [1, 0], [0, 1], [0, -1]]) { const x = o.x + 0.5 + dx, z = o.y + 0.5 + dz; if (!M.world.isIndoor(Math.floor(x), Math.floor(z)) && x > 0 && z > 0 && x < S.lot.w && z < S.lot.h && seen(x, z)) samples[o.id + ':' + dx + ',' + dz] = px(x, z); } }
    S.time.minute = 10 * 60;
    return { far, samples };
  });
  const lawnVals = Object.values(night.samples);
  ok('VIS-1 lawn next to lit lamps is as dark as the far lawn at night', lawnVals.length > 0 && Math.max(...lawnVals) < night.far * 1.6 + 25, night);

  const pass = results.filter((r) => r.ok).length;
  return { pass, fail: results.length - pass, results: results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + JSON.stringify(r.info))) };
}

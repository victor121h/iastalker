// Place EVERY buyable type in all 4 rotations through real mouse input, then sell each via toolbar confirm.
// env QA_TYPES=comma list to restrict; QA_ROTS=0123
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'buyall');
  await L.install(); await L.dismissHelp();
  await L.ev(() => { window.__morada.M.engine.state.money = 200000; });
  await L.modeBtn('buy');
  let types = await L.ev(() => Array.from(document.querySelectorAll('#drawer .card')).map((c) => c.getAttribute('data-type')));
  if (process.env.QA_MOD) { const [a, b] = process.env.QA_MOD.split('/').map(Number); types = types.filter((t, i) => i % b === a); }
  const only = process.env.QA_TYPES ? process.env.QA_TYPES.split(',') : null;
  const rots = (process.env.QA_ROTS || '0123').split('').map(Number);
  const results = [];
  const fails = [];
  // work area in the east yard
  await L.cam({ k: 0, dist: 26, x: 20.5, z: 5 });
  await L.wait(500);
  for (const type of types) {
    if (only && !only.includes(type)) continue;
    const def = await L.ev((t) => { const d = window.__morada.M.data.CATALOG[t]; return { price: d.price, wall: !!d.wall, w: d.w, h: d.h, name: d.name }; }, type);
    for (const rot of rots) {
      const rec = { type, rot };
      // choose target tile
      let tx = 20, ty = 4;
      if (def.wall) {
        // wall items: east exterior wall (rot 3) / south exterior wall (rot 0); other rots: interior walls
        if (rot === 3) { tx = 17; ty = 7; }
        else if (rot === 0) { tx = 13; ty = 14; }
        else if (rot === 1) { tx = 6; ty = 7; }   // west exterior: front -X needs v,x+1,y = v,7,7
        else { tx = 12; ty = 5; }                // north exterior: front -Z needs h,x,y+1 = h,12,6
        const cam = { 3: { x: 18, z: 8 }, 0: { x: 13, z: 15 }, 1: { x: 6, z: 8 }, 2: { x: 12, z: 5 } }[rot];
        // rotate camera so the wall face is visible
        const k = { 3: 0, 0: 0, 1: 3, 2: 2 }[rot];
        await L.cam({ k, dist: 22, x: cam.x, z: cam.z });
        await L.wait(600);
      }
      const c = await L.clickCard(type);
      if (!c) { rec.err = 'no card'; fails.push(rec); results.push(rec); continue; }
      let pl = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { type: p.type, rot: p.rot }; });
      if (!pl || pl.type !== type) { rec.err = 'not placing ' + JSON.stringify(pl); fails.push(rec); results.push(rec); continue; }
      // rotate with R until rot matches (max 4 presses), alternate with toolbar button for odd rots
      let presses = 0;
      while (pl.rot !== rot && presses < 4) {
        if (rot % 2 === 1 && presses === 0) { await L.clickToolbar(/Girar/); }
        else { await page.keyboard.press('r'); await L.wait(60); }
        presses++;
        pl = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { type: p.type, rot: p.rot }; });
      }
      const tsc = await L.tileScreen(tx, ty);
      await L.hover(tsc.x, tsc.y);
      const st = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason }; });
      rec.ghost = st; rec.tip = await L.tip();
      if (!st || st.rot !== rot) rec.rotMismatch = st && st.rot;
      const m0 = await L.money();
      const n0 = await L.ev(() => window.__morada.state.objects.length);
      await page.mouse.click(tsc.x, tsc.y);
      await L.wait(250);
      const placed = await L.ev(([type, n0]) => {
        const M = window.__morada.M, st = M.engine.state;
        if (st.objects.length <= n0) return null;
        const o = st.objects[st.objects.length - 1];
        if (o.type !== type) return { wrong: o.type };
        const g = M.render.scene.children.find((c) => c.name === 'objects');
        const mesh = g && g.children.find((c) => c.userData.objId === o.id);
        const mt = M.world.modelTransform(o);
        return { id: o.id, x: o.x, y: o.y, rot: o.rot, mesh: !!mesh, meshOk: mesh ? Math.abs(mesh.position.x - mt.x) < 0.05 && Math.abs(mesh.position.z - mt.z) < 0.05 && Math.abs(((mesh.rotation.y - mt.rotY) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) < 0.05 : null };
      }, [type, n0]);
      const m1 = await L.money();
      rec.placed = placed; rec.cost = m0 - m1;
      if (!placed || placed.wrong) { rec.err = 'not placed'; if (rot === 0 || def.wall) await L.shot('fail-' + type + '-r' + rot); await page.keyboard.press('Escape'); fails.push(rec); results.push(rec); continue; }
      if (rec.cost !== def.price) { rec.err = 'cost ' + rec.cost + ' != ' + def.price; fails.push(rec); }
      if (placed.rot !== rot) { rec.err = (rec.err || '') + ' rot ' + placed.rot; if (!fails.includes(rec)) fails.push(rec); }
      if (!placed.mesh || !placed.meshOk) { rec.err = (rec.err || '') + ' mesh'; if (!fails.includes(rec)) fails.push(rec); }
      const stillPlacing = await L.ev(() => !!window.__morada.M.ui.debug.ui.buy.placing);
      if (stillPlacing) { rec.stillPlacing = true; await page.keyboard.press('Escape'); await L.wait(100); }
      // select by clicking on the mesh
      const fp = await L.ev((id) => {
        const M = window.__morada.M; const o = M.engine.objectById(id);
        const s = M.world.rotatedSize(o.type, o.rot);
        for (const hgt of [0.5, 0.9, 1.4, 0.2, 0.05, 1.8, 1.6, 1.2]) for (const fx of [0.5, 0.3, 0.7, 0.05, 0.95]) for (const fy of [0.5, 0.3, 0.7, 0.05, 0.95]) {
          const p = M.render.project(o.x + s.w * fx, hgt, o.y + s.h * fy);
          if (!p.visible) continue;
          const el = document.elementFromPoint(p.clientX, p.clientY);
          if (!el || el.tagName !== 'CANVAS') continue;
          const pk = M.render.pick(p.clientX, p.clientY);
          if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY };
        }
        return null;
      }, placed.id);
      if (!fp) { rec.err = (rec.err || '') + ' unpickable'; if (!fails.includes(rec)) fails.push(rec); await L.shot('unpick-' + type + '-r' + rot); await L.ev((id) => window.__morada.M.engine.sellObject(id), placed.id); results.push(rec); continue; }
      await page.mouse.click(fp.x, fp.y);
      await L.wait(200);
      rec.selTb = await L.toolbar();
      const sel = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
      if (sel !== placed.id) { rec.err = (rec.err || '') + ' selected ' + sel; if (!fails.includes(rec)) fails.push(rec); }
      const mA = await L.money();
      await L.clickToolbar(/Vender/);
      rec.confirmTb = await L.toolbar();
      await L.clickToolbar(/Confirmar/);
      const gone = await L.ev((id) => !window.__morada.M.engine.objectById(id), placed.id);
      const mB = await L.money();
      rec.refund = mB - mA;
      if (!gone || rec.refund !== def.price) { rec.err = (rec.err || '') + ' sell gone=' + gone + ' refund=' + rec.refund; if (!fails.includes(rec)) fails.push(rec); }
      results.push(rec);
    }
    if (def.wall) { await L.cam({ k: 0, dist: 26, x: 20.5, z: 5 }); await L.wait(400); }
  }
  return { n: results.length, fails, errs: await L.errs(), sample: results.slice(0, 3) };
}

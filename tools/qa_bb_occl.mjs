// In Buy mode, can an object that a character is using be clicked/selected? (sim picked first)
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'occl');
  await L.install(); await L.dismissHelp();
  const ids = await L.ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const [rita, caio] = E.household();
    const shower = st.objects.find((o) => o.type === 'shower');
    const toilet = st.objects.find((o) => o.type === 'toilet');
    caio.motives.hygiene = -40; rita.motives.bladder = -40;
    for (const s of [rita, caio]) for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    E.queueInteraction(caio.id, shower.id, E.getInteractions(caio.id, shower.id).find((i) => i.enabled).key, 'player');
    E.queueInteraction(rita.id, toilet.id, E.getInteractions(rita.id, toilet.id).find((i) => i.enabled).key, 'player');
    for (let i = 0; i < 400; i++) { E.update(0.5); const a = rita.queue[0], b = caio.queue[0]; if (a && a.phase === 'do' && b && b.phase === 'do') break; }
    return { shower: shower.id, toilet: toilet.id, caio: caio.id, rita: rita.id, r: rita.queue.map((a) => a.label + ':' + a.phase), c: caio.queue.map((a) => a.label + ':' + a.phase) };
  });
  await L.ev(() => window.__morada.M.main.setSpeed(1));
  await L.wait(600);
  await L.modeBtn('buy');
  await L.ev(() => window.__morada.M.render.setWallMode('up'));
  await L.cam({ k: 2, dist: 16, x: 14, z: 6.5 });
  await L.wait(2500);
  const survey = await L.ev((ids) => {
    const M = window.__morada.M; const out = {};
    for (const key of ['shower', 'toilet']) {
      const o = M.engine.objectById(ids[key]);
      let sim = 0, obj = 0, other = 0, pt = null;
      for (let hgt = 0.05; hgt <= 2.2; hgt += 0.15) for (let fx = 0.05; fx <= 0.95; fx += 0.15) for (let fy = 0.05; fy <= 0.95; fy += 0.15) {
        const p = M.render.project(o.x + fx, hgt, o.y + fy);
        const pk = M.render.pick(p.clientX, p.clientY);
        if (!pk) continue;
        if (pk.kind === 'sim') sim++; else if (pk.kind === 'object' && pk.id === o.id) { obj++; if (!pt) pt = { x: p.clientX, y: p.clientY }; } else other++;
      }
      out[key] = { sim, obj, other, pt };
    }
    return out;
  }, ids);
  await L.shot('1-inuse');
  // click a sim-covered point of the shower: what gets selected?
  const simPt = await L.simScreenPos ? null : await L.ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); const p = M.render.project(s.x + 0.5, 1.0, s.y + 0.5); return { x: p.clientX, y: p.clientY, pick: M.render.pick(p.clientX, p.clientY) }; }, ids.caio);
  await page.mouse.click(simPt.x, simPt.y); await L.wait(300);
  const selAfterSimClick = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
  // click an object-only point
  let selAfterObjClick = null, sold = null;
  if (survey.shower.pt) {
    await page.mouse.click(survey.shower.pt.x, survey.shower.pt.y); await L.wait(300);
    selAfterObjClick = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    if (selAfterObjClick === ids.shower) {
      await L.clickToolbar(/Vender/); await L.clickToolbar(/Confirmar/);
      sold = await L.ev(([sid, cid]) => { const E = window.__morada.M.engine; const c = E.simById(cid); return { gone: !E.objectById(sid), caio: [c.x, c.y], anim: c.anim, q: c.queue.map((a) => a.label + ':' + a.phase + (a.cancel ? ':c' : '')) }; }, [ids.shower, ids.caio]);
      await L.shot('2-shower-sold-paused');
      await L.modeBtn('live');
      await L.wait(3000);
      sold.afterLive = await L.ev((cid) => { const E = window.__morada.M.engine; const c = E.simById(cid); return { caio: [+c.x.toFixed(2), +c.y.toFixed(2)], anim: c.anim, q: c.queue.map((a) => a.label + ':' + a.phase), hyg: Math.round(c.motives.hygiene) }; }, ids.caio);
      await L.shot('3-after-live');
    }
  }
  return { ids, survey, simPt, selAfterSimClick, selAfterObjClick, sold, errs: await L.errs() };
}

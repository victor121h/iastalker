// BB-5 (wall item on cut wall vanishes after purchase) and BB-6 (door success tip overwritten).
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb56'); await v.help();
  const R = {};
  // ---------- BB-6 first: door on the front-wall stub
  await v.mode('build'); await v.tool('Porta'); await v.wait(600);
  const P = await v.proj(13.5, 0.2, 14.05);
  await v.hover(P.x, P.y);
  R.hoverTip = await v.tip();
  await v.ev(() => {
    window.__tipLog = []; const t0 = performance.now(); const el = document.getElementById('tip');
    const rec = () => window.__tipLog.push([Math.round(performance.now() - t0), el.hidden ? null : el.textContent, el.classList.contains('bad')]);
    window.__tipObs = new MutationObserver(rec); window.__tipObs.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
    window.__tipT0 = t0;
  });
  const m0 = await v.money();
  await page.mouse.click(P.x, P.y);
  await v.wait(80); R.tipAt80 = await v.tip(); R.shot80 = await v.shot('1-door-tip-80ms');
  await v.wait(400); R.tipAt480 = await v.tip();
  R.doorCharged = m0 - await v.money(); R.doorWall = (await v.walls())['h,13,14'];
  R.tipLog = await v.ev(() => window.__tipLog.slice(0, 12));
  // window on another stub
  await v.tool('Janela'); await v.wait(200);
  const Q = await v.proj(12.5, 0.2, 14.05);
  await v.hover(Q.x, Q.y);
  await page.mouse.click(Q.x, Q.y); await v.wait(120); R.winTipAt120 = await v.tip(); R.winWall = (await v.walls())['h,12,14'];
  // ---------- BB-5: painting_lux on outside of the front wall (tile 14,14 rot 0 hangs on h,14,14)
  await v.mode('buy'); await v.wait(400);
  await v.ev(() => { const c = document.querySelector('#drawer .card[data-type="painting_lux"]'); c.scrollIntoView({ block: 'center' }); });
  await v.wait(150);
  const card = await v.ev(() => { const r = document.querySelector('#drawer .card[data-type="painting_lux"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(card.x, card.y); await v.wait(300);
  const T = await v.proj(14.5, 0, 14.5);
  await v.hover(T.x, T.y);
  R.ghost = await v.ev(() => { const M = window.__morada.M; const p = M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok }; });
  // rotate until rot 0 if needed
  for (let i = 0; i < 4; i++) { const g = await v.ev(() => window.__morada.M.ui.debug.ui.buy.placing.rot); if (g === 0) break; await page.keyboard.press('r'); await v.wait(100); await v.hover(T.x + 1, T.y); }
  R.ghost2 = await v.ev(() => { const M = window.__morada.M; const p = M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok, reason: p.reason }; });
  R.ghostTip = await v.tip();
  R.shotGhost = await v.shot('2-painting-ghost');
  const mm = await v.money();
  await page.mouse.click(T.x + 1, T.y); await v.wait(500);
  R.bought = await v.ev(() => {
    const M = window.__morada.M; const o = M.engine.state.objects.filter((q) => q.type === 'painting_lux').pop();
    if (!o) return null;
    // is the mesh visible? find in render scene
    let vis = null; M.render.scene.traverse((n) => { if (n.userData && n.userData.objId === o.id && vis === null) { let c = n, ok = true; while (c) { if (!c.visible) ok = false; c = c.parent; } vis = ok; } });
    // try picking across its tile
    let picked = 0; for (let i = 0; i < 5; i++) for (let h = 0.8; h <= 2.0; h += 0.3) { const p = M.render.project(o.x + 0.1 + 0.2 * i, h, o.y + 0.08); const pk = M.render.pick(p.clientX, p.clientY); if (pk && pk.kind === 'object' && pk.id === o.id) picked++; }
    return { o: [o.x, o.y, o.rot], meshVisible: vis, picked, wallH: null };
  });
  R.charged = mm - await v.money();
  R.shotAfter = await v.shot('3-painting-after-buy');
  // starter painting visibility in cutaway
  R.starterPainting = await v.ev(() => { const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === 'painting_cheap'); let vis = null; M.render.scene.traverse((n) => { if (n.userData && n.userData.objId === o.id && vis === null) { let c = n, ok = true; while (c) { if (!c.visible) ok = false; c = c.parent; } vis = ok; } }); return { at: [o.x, o.y, o.rot], visible: vis }; });
  // rotate camera through all 4 views: is the starter painting ever visible in cutaway?
  R.starterPaintingViews = [];
  for (let k = 0; k < 4; k++) {
    await v.ev((k) => window.__morada.M.render.setCamera({ k }), k); await v.wait(1500);
    R.starterPaintingViews.push(await v.ev(() => { const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === 'painting_cheap'); let vis = null; M.render.scene.traverse((n) => { if (n.userData && n.userData.objId === o.id && vis === null) { let c = n, ok = true; while (c) { if (!c.visible) ok = false; c = c.parent; } vis = ok; } }); return vis; }));
  }
  return R;
}

// qa_verify_code: CR-9. In Buy mode click many catalog cards (each starts placing -> R.showGhost with a new type),
// then count ghost-tile InstancedMeshes left in the scene graph. Also cycles through all categories.
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/qa_verify_code_ghost.mjs
export default async function (page) {
  const ev = (f, a) => page.evaluate(f, a);
  const count = () => ev(() => {
    const sc = window.__morada.M.render.scene; let nodes = 0, tiles = 0, vis = 0;
    sc.traverse((o) => { nodes++; if (o.isInstancedMesh && o.renderOrder === 5) { tiles++; if (o.visible) vis++; } });
    const info = window.__morada.M.render.renderer.info.memory;
    return { nodes, ghostTileMeshes: tiles, visible: vis, geometries: info.geometries };
  });
  await ev(() => window.__morada.M.ui.setMode('buy'));
  await page.waitForTimeout(600);
  const before = await count();
  let clicked = 0; const errs = [];
  const catBtns = await page.$$('#drawer .cats button');
  const types = await ev(() => Array.from(document.querySelectorAll('#drawer .card')).map((c) => c.getAttribute('data-type')));
  for (const t of types) {
    try {
      const r = await ev((t) => { const c = document.querySelector('#drawer .card[data-type="' + t + '"]'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, t);
      if (!r) { errs.push(t + ': no card'); continue; }
      await page.mouse.click(r.x, r.y);
      const placing = await ev(() => { const g = window.__morada.M.ui.debug; return document.querySelector('#toolbar') && !document.querySelector('#toolbar').hidden; });
      if (placing) clicked++;
      await page.mouse.move(560 + (clicked % 7) * 12, 380 + (clicked % 3) * 12);
      await page.waitForTimeout(60);
    } catch (e) { errs.push(t + ': ' + e.message.split('\n')[0].slice(0, 120)); }
  }
  await page.keyboard.press('Escape');
  const afterBuy = await count();
  await ev(() => window.__morada.M.ui.setMode('live'));
  await page.waitForTimeout(300);
  const afterLive = await count();
  // new game cycles do not clear it either
  await ev(() => window.__morada.M.main.newGame({}));
  await page.waitForTimeout(800);
  const afterNewGame = await count();
  return { catButtons: catBtns.length, cardsClicked: clicked, firstErrors: errs.slice(0, 3), before, afterBuy, afterLive, afterNewGame };
}

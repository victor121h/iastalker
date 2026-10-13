// qa_verify_code: CR-9 (ghost InstancedMesh leak, via real catalog clicks), CR-10 (remove a puddle in Buy mode via
// real clicks), CR-11 (Tab focus escapes the Options dialog).
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/qa_verify_code_ui.mjs
export default async function (page, ctx) {
  const ev = (f, a) => page.evaluate(f, a);
  const shot = (n) => page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/' + n + '.png' });
  const res = {};
  const countGhost = () => ev(() => {
    const sc = window.__morada.M.render.scene; let nodes = 0, ghostTiles = 0, ghostTilesVisible = 0;
    sc.traverse((o) => { nodes++; if (o.isInstancedMesh && o.renderOrder === 5) { ghostTiles++; if (o.visible) ghostTilesVisible++; } });
    return { nodes, ghostTiles, ghostTilesVisible };
  });

  // ---------------- CR-9: click 12 different catalog cards in Buy mode, then leave Buy mode
  await ev(() => window.__morada.M.ui.setMode('buy'));
  await page.waitForTimeout(600);
  res.cr9_before = await countGhost();
  const cats = await page.$$('[data-cat], .cat-btn, .drawer .cats button');
  let clicked = 0;
  for (let round = 0; round < 3; round++) {
    const cards = await page.$$('.drawer .card');
    for (const c of cards.slice(0, 12)) {
      try { await c.click({ timeout: 1000 }); clicked++; await page.waitForTimeout(60); await page.mouse.move(640, 420); await page.waitForTimeout(60); await page.keyboard.press('Escape'); } catch (e) { /* off-screen */ }
    }
  }
  res.cr9_clicked = clicked;
  res.cr9_after = await countGhost();
  await page.keyboard.press('Escape');
  await ev(() => window.__morada.M.ui.setMode('live'));
  await page.waitForTimeout(300);
  res.cr9_afterLive = await countGhost();

  // ---------------- CR-10: place a puddle near the front of the house and remove it with real clicks in Buy mode
  const pud = await ev(() => {
    const M = window.__morada.M, st = window.__morada.state;
    let spot = null;
    for (let y = st.lot.h - 4; y > 2 && !spot; y--) for (let x = 6; x < st.lot.w - 6 && !spot; x++) if (M.world.isWalkable(x, y) && !M.world.objectAt(x, y) && !M.world.objectsAt(x, y).length) spot = { x, y };
    const o = { id: M.util.nextId(st), type: 'puddle', x: spot.x, y: spot.y, rot: 0, dirty: 0, broken: false, boughtDay: st.time.day, price: 0, uses: 0 };
    st.objects.push(o); M.world.rebuild(); M.util.bus.emit('objects');
    M.render.focus(spot.x, spot.y, true);
    return { id: o.id, x: spot.x, y: spot.y, money: st.money };
  });
  await page.waitForTimeout(500);
  await ev(() => window.__morada.M.ui.setMode('buy'));
  await page.waitForTimeout(500);
  const scr = await ev(({ x, y }) => { const p = window.__morada.M.render.project(x + 0.5, 0.02, y + 0.5); return { x: p.clientX != null ? p.clientX : p.x, y: p.clientY != null ? p.clientY : p.y }; }, pud);
  await page.mouse.click(scr.x, scr.y);
  await page.waitForTimeout(300);
  const tb1 = await ev(() => { const t = document.querySelector('#toolbar, .toolbar'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
  await shot('ui_puddle_selected');
  let removed = null, tb2 = null;
  const btn = await page.$('text=Remover');
  if (btn) {
    await btn.click(); await page.waitForTimeout(200);
    tb2 = await ev(() => { const t = document.querySelector('#toolbar, .toolbar'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
    const c = await page.$('text=Confirmar venda');
    if (c) { await c.click(); await page.waitForTimeout(300); }
    removed = await ev((id) => !window.__morada.state.objects.some((o) => o.id === id), pud.id);
  }
  res.cr10 = { puddle: pud, toolbarAfterClick: tb1, toolbarAfterRemover: tb2, puddleRemoved: removed };
  await ev(() => window.__morada.M.ui.setMode('live'));
  await page.waitForTimeout(300);

  // ---------------- CR-11: Tab through the Options dialog
  await ev(() => window.__morada.M.ui.openOptions());
  await page.waitForTimeout(400);
  const seen = [];
  let escaped = null;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await ev(() => { const a = document.activeElement; const m = document.querySelector('.modal[role=dialog]:not([hidden])'); return { inModal: !!(m && m.contains(a)), label: a ? (a.getAttribute('aria-label') || a.title || a.textContent || a.tagName).replace(/\s+/g, ' ').trim().slice(0, 50) : null }; });
    seen.push(info);
    if (!info.inModal && escaped == null) escaped = { afterTabs: i + 1, focused: info.label };
  }
  // activate the focused HUD control behind the modal
  let speedBefore = await ev(() => window.__morada.M.main.getSpeed());
  res.cr11 = { escaped, firstOutside: seen.filter((s) => !s.inModal).slice(0, 6).map((s) => s.label), speedBefore };
  await shot('ui_modal_focus');
  // tab button accessible names (computed by Chromium's accessibility tree)
  const snap = await page.accessibility.snapshot({ interestingOnly: true }).catch(() => null);
  const tabs = [];
  (function walk(n) { if (!n) return; if (n.role === 'tab') tabs.push({ name: n.name, selected: n.selected }); (n.children || []).forEach(walk); })(snap);
  res.cr11.tabAccessibleNames = tabs;
  return res;
}

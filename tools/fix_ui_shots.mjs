// UI fixer screenshot tour (run through integrate_check.mjs --script). Captures every screen the UI fix
// round touched: live HUD, pie on an object / character / self, career tab, toasts, buy (catalog, placing,
// selection toolbar), build (room tool, wallpaper), options modal, family creator, help card.
// Env: SHOTS (output dir, default ../shots/fixui), TAG (file prefix, default 'after').
// Example: node tools/integrate_check.mjs --clear --nohelp --script tools/fix_ui_shots.mjs --w 390 --h 844 --touch
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const dir = path.resolve(process.env.SHOTS || path.join(path.dirname(new URL(import.meta.url).pathname), '../../shots/fixui'));
  fs.mkdirSync(dir, { recursive: true });
  const vp = page.viewportSize();
  const tag = (process.env.TAG || 'after') + '-' + vp.width + 'x' + vp.height;
  const touch = !!ctx.touch;
  const out = [];
  const shot = async (name) => { const f = path.join(dir, tag + '-' + name + '.png'); await page.screenshot({ path: f }); out.push(path.basename(f)); };
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a).catch((e) => { out.push('ERR ' + String(e.message).split('\n')[0].slice(0, 120)); return null; });
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const tapSel = async (sel) => { const b = await page.$(sel); if (!b) return false; const r = await b.boundingBox(); if (!r) return false; await tap(r.x + r.width / 2, r.y + r.height / 2); await wait(250); return true; };
  await ev(() => { const h = document.getElementById('help-ok'); if (h) h.click(); });
  await wait(400);
  await ev(() => window.__morada.M.main.setSpeed(1));
  await shot('01-live');

  // pie on the fridge
  const fridge = await ev(() => {
    const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === 'fridge_cheap' || q.type === 'fridge_lux');
    if (!o) return null; M.render.focus(o.x, o.y, true); return o.id;
  });
  await wait(300);
  if (fridge != null) {
    const p = await ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); const pr = M.render.project(o.x + 0.5, 1.0, o.y + 0.5); return { x: pr.clientX, y: pr.clientY }; }, fridge);
    await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'object', id }), [p.x, p.y, fridge]);
    await wait(450);
    await shot('02-pie-fridge');
    await ev(() => window.__morada.M.ui.closePie());
  }
  // self menu
  const self = await ev(() => { const M = window.__morada.M; const s = M.engine.household()[0]; M.ui.selectSim(s.id); M.render.focus(s.x, s.y, true); return s.id; });
  await wait(350);
  const sp = await ev((id) => { const p = window.__morada.M.render.simScreenPos(id); return { x: p.clientX, y: p.clientY + 40 }; }, self);
  await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'sim', id }), [sp.x, sp.y, self]);
  await wait(450);
  await shot('03-pie-self');
  await ev(() => window.__morada.M.ui.closePie());

  // newspaper job offer card
  await ev(() => {
    const M = window.__morada.M; const st = M.engine.state;
    let np = st.objects.find((o) => o.type === 'newspaper');
    if (!np) { const mb = st.objects.find((o) => o.type === 'mailbox'); const r = M.engine.debug && null; }
    if (np) { np.offer = np.offer || 'science'; }
  });
  const paper = await ev(() => { const o = window.__morada.M.engine.state.objects.find((q) => q.type === 'newspaper' && q.offer); return o ? o.id : null; });
  if (paper != null) {
    await ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); M.render.focus(o.x, o.y, true); }, paper);
    await wait(300);
    const pp = await ev((id) => { const M = window.__morada.M; const o = M.engine.objectById(id); const pr = M.render.project(o.x + 0.5, 0.1, o.y + 0.5); return { x: pr.clientX, y: pr.clientY }; }, paper);
    await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'object', id }), [pp.x, pp.y, paper]);
    await wait(450);
    await shot('04-pie-newspaper');
    const clicked = await ev(() => { const it = Array.from(document.querySelectorAll('#pie .pie-item')).find((b) => /vaga/i.test(b.textContent)); if (!it) return false; it.dataset.t = '1'; return true; });
    if (clicked) { await wait(350); await tapSel('#pie .pie-item[data-t="1"]'); await wait(400); await shot('05-offer-card'); await ev(() => { const b = document.querySelector('.modal .modal-foot .btn:not(.primary)'); if (b) b.click(); }); await wait(200); }
  }

  // career tab (phone: open the needs drawer)
  if (touch || vp.width <= 760) await ev(() => { const b = document.getElementById('needs-toggle'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await ev(() => window.__morada.M.ui.setTab('career'));
  await wait(300);
  await shot('06-tab-career');
  await ev(() => window.__morada.M.ui.setTab('needs'));
  if (touch || vp.width <= 760) await ev(() => { const b = document.getElementById('needs-toggle'); if (b && b.getAttribute('aria-expanded') === 'true') b.click(); });

  // toasts with Ver + ETA chip
  await ev(() => {
    const M = window.__morada.M; const s = M.engine.household()[0];
    M.util.bus.emit('notify', { text: 'A pizza chegou! Está na porta.', kind: 'good', focus: { simId: s.id } });
    M.util.bus.emit('notify', { text: 'O chuveiro quebrou.', kind: 'bad', focus: { x: 18, y: 8 } });
    M.util.bus.emit('notify', { text: 'Chegou uma conta de M$ 120.', kind: 'money' });
    const st = M.engine.state; st.events = st.events || []; st.events.push({ id: 99999, kind: 'pizza', at: st.time.day * 1440 + st.time.minute + 45 });
  });
  await wait(700);
  await shot('07-toasts');
  await ev(() => { const st = window.__morada.M.engine.state; st.events = st.events.filter((e) => e.id !== 99999); document.querySelectorAll('.toast .t-close').forEach((b) => b.click()); });
  await wait(400);

  // pause chip
  await ev(() => window.__morada.M.main.setSpeed(0));
  await wait(300);
  await shot('08-paused');
  await ev(() => window.__morada.M.main.setSpeed(1));

  // buy mode
  await ev(() => window.__morada.M.ui.setMode('buy'));
  await wait(1500);
  await shot('09-buy');
  await ev(() => window.__morada.M.ui.debug.startPlacing('plant_big'));
  await wait(200);
  const mid = await ev(() => { const M = window.__morada.M; const p = M.render.project(8.5, 0, 6.5); return { x: p.clientX, y: p.clientY }; });
  if (touch) await page.touchscreen.tap(mid.x, mid.y); else await page.mouse.move(mid.x, mid.y);
  await wait(350);
  await shot('10-buy-placing');
  await ev(() => window.__morada.M.ui.debug.stopPlacing && window.__morada.M.ui.debug.stopPlacing());
  await ev(() => { const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === 'sofa_cheap' || q.type === 'tv_cheap'); if (o) M.ui.debug.selectObject(o.id); });
  await wait(300);
  await shot('11-buy-selected');
  await ev(() => window.__morada.M.ui.setMode('live'));
  await wait(300);

  // build mode: room tool + wallpaper
  await ev(() => { window.__morada.M.ui.setMode('build'); window.__morada.M.ui.debug.setBuildTool('room'); });
  await wait(1500);
  // a free yard area: tiles in front of the house, clamped to the visible area clear of the drawer / bar
  const a = await ev(() => {
    const M = window.__morada.M;
    const dr = document.getElementById('drawer').getBoundingClientRect();
    const bar = document.getElementById('bar').getBoundingClientRect();
    const right = dr.left > innerWidth * 0.3 ? dr.left : innerWidth, bottom = dr.left > innerWidth * 0.3 ? bar.top : dr.top;
    const ok = (p) => p.clientX > 60 && p.clientX < right - 40 && p.clientY > 80 && p.clientY < bottom - 40;
    const st = M.engine.state;
    for (const [x1, y1, x2, y2] of [[3, 13, 6, 16], [18, 14, 21, 17], [2, 4, 5, 7], [19, 3, 22, 6], [9, 14, 12, 17]]) {
      const p = M.render.project(x1 + 0.5, 0, y1 + 0.5), q = M.render.project(x2 + 0.5, 0, y2 + 0.5);
      if (ok(p) && ok(q)) return { a: { x: p.clientX, y: p.clientY }, b: { x: q.clientX, y: q.clientY } };
    }
    return { a: { x: right * 0.25, y: bottom * 0.55 }, b: { x: right * 0.45, y: bottom * 0.75 } };
  });
  if (!touch) { await page.mouse.move(a.a.x, a.a.y); await page.mouse.down(); await page.mouse.move(a.b.x, a.b.y, { steps: 6 }); await wait(250); await shot('12-build-room-drag'); await page.mouse.up(); await wait(400); await shot('12b-build-room-done'); }
  else { await page.touchscreen.tap(a.a.x, a.a.y); await wait(300); await shot('12-build-room'); }
  await ev(() => window.__morada.M.ui.debug.setBuildTool('paper'));
  await wait(300);
  // hover the inside face of a house wall
  const wpt = await ev(() => { const M = window.__morada.M; const st = M.engine.state; const keys = Object.keys(st.lot.walls).filter((k) => st.lot.walls[k].t === 1); for (const k of keys) { const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5; const p = M.render.project(px, 1.3, pz); if (p.clientX > 80 && p.clientX < innerWidth * 0.6 && p.clientY > 90 && p.clientY < innerHeight * 0.6) { const e = M.render.pickEdge(p.clientX, p.clientY); if (e && e.key === k) return { x: p.clientX, y: p.clientY, k }; } } return null; });
  if (wpt && !touch) { await page.mouse.move(wpt.x, wpt.y); await wait(300); }
  await shot('13-build-paper');
  if (wpt && !touch) { await page.keyboard.down('Shift'); await page.mouse.move(wpt.x + 1, wpt.y); await wait(300); await shot('13b-build-paper-room'); await page.keyboard.up('Shift'); }
  await ev(() => window.__morada.M.ui.setMode('live'));
  await wait(300);

  // options + family creator
  await ev(() => window.__morada.M.ui.openOptions());
  await wait(300);
  await shot('14-options');
  await ev(() => window.__morada.M.ui.openCreateFamily());
  await wait(400);
  await shot('15-family');
  await ev(() => { while (window.__morada.M.ui.debug.ui.modals.length) { const t = window.__morada.M.ui.debug.ui.modals.slice(-1)[0]; window.__morada.M.ui.debug.closeModal(t); } });
  await wait(200);
  await ev(() => window.__morada.M.ui.showHelp());
  await wait(300);
  await shot('16-help');
  await ev(() => window.__morada.M.ui.debug.hideHelp());
  return { shots: out };
}

// QA live: queue 3+ actions, cancel from the queue strip, click-to-walk (inside, outside, unreachable, off-lot),
// clicking during a walk, speed buttons/keys, camera keys/wheel/drag, wall modes, log, help.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_queue.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'queue');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  const tv = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'tv_cheap').id);
  const sofa = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'sofa_cheap').id);
  const shelf = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'bookshelf').id);
  // clear auto actions first
  await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.slice().forEach((a) => E.cancelAction(id, a.id)); E.setFreeWill(false); }, sel);
  await L.step(3);
  await L.focus(11, 11); await L.wait(500);
  const order = [[fr, /lanche/i], [tv, /Assistir/], [sofa, /^Sentar/], [shelf, /Ler um livro/], [fr, /Preparar/]];
  for (const [id, re] of order) {
    const sp = await L.objFind(id);
    await L.tap(sp.x, sp.y); await L.wait(400);
    const it = await L.clickPie(re);
    if (!it) out['missing_' + re] = true;
    await L.wait(120);
  }
  out.queueAfter5 = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
  out.queueDom = (await L.queueDom()).map((q) => q.title + ' {' + q.cls + '}');
  await L.shot('1-queue5');
  // cancel the middle one (3rd) via the strip
  let qd = await L.queueDom();
  await L.tap(qd[2].x, qd[2].y); await L.wait(250);
  out.afterCancelMiddle = (await L.queue(sel)).map((a) => a.label + '|' + a.phase + (a.cancel ? '|X' : ''));
  out.domAfterCancelMiddle = (await L.queueDom()).map((q) => q.title);
  // cancel the current (1st) via the strip
  qd = await L.queueDom();
  await L.tap(qd[0].x, qd[0].y); await L.wait(250);
  out.afterCancelFirst = (await L.queue(sel)).map((a) => a.label + '|' + a.phase + (a.cancel ? '|X' : ''));
  await L.step(3);
  out.afterCancelFirstStep = (await L.queue(sel)).map((a) => a.label + '|' + a.phase + (a.cancel ? '|X' : ''));
  // queue overflow: try to add 9 items
  for (let i = 0; i < 9; i++) {
    const sp = await L.objFind(fr);
    await L.tap(sp.x, sp.y); await L.wait(380);
    await L.clickPie(/lanche/i); await L.wait(80);
  }
  out.queueOverflow = (await L.queue(sel)).length;
  out.queueOverflowDom = (await L.queueDom()).length;
  out.overflowNotes = await L.notes();
  await L.shot('2-queue-overflow');
  // cancel all
  await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.slice().forEach((a) => E.cancelAction(id, a.id)); }, sel);
  await L.step(5);

  // ---- click-to-walk
  const walkTest = async (name, tx, ty) => {
    const before = await L.ev((id) => { const s = window.__morada.M.engine.simById(id); return [s.x, s.y]; }, sel);
    await L.focus(tx, ty); await L.wait(450);
    const sp = await L.tileScreen(tx, ty);
    await L.tap(sp.x, sp.y); await L.wait(200);
    const q = await L.queue(sel);
    const tipT = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
    const r = await L.ev(([id, tx, ty]) => { const E = window.__morada.M.engine; const s = E.simById(id); for (let i = 0; i < 160; i++) { E.update(0.5); if (!s.queue.length) break; } return { at: [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10], left: s.queue.length }; }, [sel, tx, ty]);
    out['walk_' + name] = { target: [tx, ty], pick: sp.pick, queued: q.map((a) => a.label + '|' + a.kind), tip: tipT, result: r, notes: await L.notes(), before };
  };
  await walkTest('livingFloor', 9, 12);
  await walkTest('outsideGrass', 3, 15);
  await walkTest('sidewalk', 14, 18);
  await walkTest('kitchenFloor', 14, 9);
  // unreachable: under a blocking object (the fridge tile) via tile pick fails (object) -> use a tile occupied by the counter
  // off-lot click (street beyond y=h)
  {
    await L.focus(12, 21); await L.wait(400);
    const sp = await L.ev(() => { const M = window.__morada.M; const p = M.render.project(12.5, 0, 22.5); return { x: p.clientX, y: p.clientY, pick: M.render.pick(p.clientX, p.clientY) }; });
    await L.tap(sp.x, sp.y); await L.wait(200);
    out.walk_offLot = { pick: sp.pick, queued: (await L.queue(sel)).map((a) => a.label), notes: await L.notes() };
    await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.slice().forEach((a) => E.cancelAction(id, a.id)); }, sel);
  }
  // unreachable spot: build a closed fence of walls around (2,2) via engine (setup only), then click inside
  {
    const setup = await L.ev(() => {
      const M = window.__morada.M, W = M.world;
      for (const k of W.edgesOfRect(2, 2, 2, 2)) W.setWall(k, 1, 0);
      M.util.bus.emit('lot');
      return W.edgesOfRect(2, 2, 2, 2);
    });
    await L.wait(300);
    await walkTest('enclosedTile', 2, 2);
    out.walk_enclosedTile.setup = setup;
  }

  // ---- click elsewhere during a walk (re-target)
  {
    await L.speed(1);
    await L.focus(11, 14); await L.wait(400);
    let sp = await L.tileScreen(4, 16);
    await L.tap(sp.x, sp.y); await L.wait(600);
    const q1 = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
    sp = await L.tileScreen(18, 16);
    await L.tap(sp.x, sp.y); await L.wait(300);
    const q2 = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
    sp = await L.tileScreen(12, 16);
    await L.tap(sp.x, sp.y); await L.wait(300);
    const q3 = (await L.queue(sel)).map((a) => a.label + '|' + a.phase);
    out.walkRetarget = { q1, q2, q3 };
    // click an object while walking
    const sp2 = await L.objFind(await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'mailbox').id));
    out.walkRetarget.mailboxPick = sp2;
    await L.speed(0);
    await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.slice().forEach((a) => E.cancelAction(id, a.id)); }, sel);
    await L.step(3);
  }

  // ---- speed buttons & keyboard
  {
    const btns = await L.ev(() => Array.from(document.querySelectorAll('.speed-btn')).map((b) => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.title }; }));
    const sp = {};
    for (let i = 0; i < btns.length; i++) { await L.tap(btns[i].x, btns[i].y); await L.wait(150); sp['btn' + i] = await L.ev(() => ({ speed: window.__morada.M.main.getSpeed(), pressed: Array.from(document.querySelectorAll('.speed-btn')).map((b) => b.getAttribute('aria-pressed')).join('') })); }
    // click pause twice (toggle) -> should restore previous speed
    await L.tap(btns[2].x, btns[2].y); await L.wait(100);
    await L.tap(btns[0].x, btns[0].y); await L.wait(100);
    sp.pauseOnce = await L.ev(() => window.__morada.M.main.getSpeed());
    await L.tap(btns[0].x, btns[0].y); await L.wait(100);
    sp.pauseTwice = await L.ev(() => window.__morada.M.main.getSpeed());
    if (!L.touch) {
      // keyboard: focus is on the pause button now (clicked). Press space.
      sp.focused = await L.ev(() => document.activeElement && (document.activeElement.title || document.activeElement.className));
      await page.keyboard.press('Space'); await L.wait(150);
      sp.afterSpaceWithPauseBtnFocused = await L.ev(() => window.__morada.M.main.getSpeed());
      await L.tap(btns[3].x, btns[3].y); await L.wait(100);
      sp.focused2 = await L.ev(() => document.activeElement && (document.activeElement.title || document.activeElement.className));
      await page.keyboard.press('Space'); await L.wait(150);
      sp.afterSpaceWithUltraFocused = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('Enter'); await L.wait(150);
      sp.afterEnterUltraFocused = await L.ev(() => window.__morada.M.main.getSpeed());
      // click the canvas first (blur buttons)
      await page.mouse.click(640, 200); await L.wait(150);
      await page.keyboard.press('1'); await L.wait(80); sp.k1 = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('2'); await L.wait(80); sp.k2 = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('3'); await L.wait(80); sp.k3 = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('p'); await L.wait(80); sp.kp = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('p'); await L.wait(80); sp.kpp = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('Space'); await L.wait(80); sp.kspace = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('Space'); await L.wait(80); sp.kspace2 = await L.ev(() => window.__morada.M.main.getSpeed());
      // the mode buttons: after clicking "Viver" (focus) then press space
      const viver = await L.ev(() => { const r = document.getElementById('mode-live').getBoundingClientRect(); return { x: r.left + 20, y: r.top + 20 }; });
      await page.mouse.click(viver.x, viver.y); await L.wait(100);
      const s0 = await L.ev(() => window.__morada.M.main.getSpeed());
      await page.keyboard.press('Space'); await L.wait(150);
      sp.spaceAfterViverFocus = [s0, await L.ev(() => window.__morada.M.main.getSpeed())];
      // portrait focused + space
      const por = await L.ev(() => { const b = document.querySelectorAll('.portrait')[1]; const r = b.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 20 }; });
      await page.mouse.click(por.x, por.y); await L.wait(100);
      await page.keyboard.press('Space'); await L.wait(150);
      sp.spaceAfterPortraitFocus = { speed: await L.ev(() => window.__morada.M.main.getSpeed()), sel: await L.sel() };
      const p0 = await L.ev(() => { const b = document.querySelectorAll('.portrait')[0]; const r = b.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 20 }; });
      await page.mouse.click(p0.x, p0.y); await L.wait(100);
    }
    out.speed = sp;
  }
  // ---- camera
  {
    const cam = () => L.ev(() => { const c = window.__morada.M.render.getCamera(); return JSON.stringify(c); });
    const c = {};
    await page.mouse.click(640, 150); await L.wait(100);
    await L.ev(() => window.__morada.M.main.setSpeed(0));
    c.c0 = await cam();
    if (!L.touch) {
      await page.keyboard.press('q'); await L.wait(700); c.q = await cam();
      await page.keyboard.press('e'); await L.wait(700); c.e = await cam();
      await page.keyboard.down('w'); await L.wait(400); await page.keyboard.up('w'); c.w = await cam();
      await page.keyboard.down('d'); await L.wait(400); await page.keyboard.up('d'); c.d = await cam();
      await page.keyboard.down('ArrowLeft'); await L.wait(400); await page.keyboard.up('ArrowLeft'); c.left = await cam();
      await page.mouse.move(640, 400); await page.mouse.wheel(0, -500); await L.wait(500); c.wheelIn = await cam();
      await page.mouse.wheel(0, 1500); await L.wait(500); c.wheelOut = await cam();
      // right-drag pan
      await page.mouse.move(640, 400); await page.mouse.down({ button: 'right' }); await page.mouse.move(500, 300, { steps: 8 }); await page.mouse.up({ button: 'right' }); await L.wait(300); c.rdrag = await cam();
      // left-drag on ground pans
      await page.mouse.move(700, 200); await page.mouse.down(); await page.mouse.move(800, 260, { steps: 8 }); await page.mouse.up(); await L.wait(300); c.ldrag = await cam();
      c.ldragQueue = (await L.queue(sel)).map((a) => a.label);
      c.ldragPie = !!(await L.pie());
      // + and - keys
      await page.keyboard.press('+'); await L.wait(300); c.plus = await cam();
      await page.keyboard.press('-'); await L.wait(300); c.minus = await cam();
      // context menu suppressed?
    }
    // UI buttons
    const camBtns = await L.ev(() => Array.from(document.querySelectorAll('#cam button')).map((b) => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.title, vis: r.width > 0 }; }));
    c.btns = camBtns.map((b) => b.t + (b.vis ? '' : ' (hidden)'));
    const wb = camBtns.find((b) => /paredes/i.test(b.t));
    const modes = [];
    for (let i = 0; i < 3; i++) { await L.tap(wb.x, wb.y); await L.wait(500); modes.push(await L.ev(() => ({ st: window.__morada.state.settings.wallMode, r: window.__morada.M.render.wallMode, label: document.querySelector('.wb-label').textContent }))); await L.shot('3-wall-' + i); }
    c.wallModes = modes;
    out.camera = c;
  }
  // ---- notification log
  {
    await L.ev(() => window.__morada.M.util.bus.emit('notify', { text: 'Teste de notificação bem longa para verificar se o texto quebra corretamente dentro do painel de notificações e não sai da tela.', kind: 'money' }));
    await L.wait(300);
    const lb = await L.ev(() => { const r = document.getElementById('log-btn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, count: document.querySelector('#log-btn .count').textContent, countHidden: document.querySelector('#log-btn .count').hidden }; });
    out.logBtn = lb;
    await L.shot('4-toast');
    await L.tap(lb.x, lb.y); await L.wait(300);
    out.logOpen = await L.ev(() => ({ hidden: document.getElementById('log-panel').hidden, items: Array.from(document.querySelectorAll('#log-panel li')).map((l) => l.textContent.slice(0, 120)) }));
    await L.shot('5-log');
    // click the 3D view while log is open: does it close? does it walk?
    const q0 = (await L.queue(sel)).length;
    await L.tap(640, 380); await L.wait(250);
    out.logAfterViewClick = { hidden: await L.ev(() => document.getElementById('log-panel').hidden), queueGrew: (await L.queue(sel)).length > q0 };
    if (!L.touch) { await page.keyboard.press('Escape'); await L.wait(200); }
    out.logAfterEsc = await L.ev(() => document.getElementById('log-panel').hidden);
  }
  // ---- help card via button / H
  if (!L.touch) {
    await page.keyboard.press('h'); await L.wait(300);
    out.helpByH = await L.ev(() => !!document.getElementById('help-card'));
    out.pausedByHelp = await L.ev(() => window.__morada.M.main.pauseReasons());
    // click the 3D view while help is open
    const q0 = (await L.queue(sel)).length;
    await page.mouse.click(1100, 150); await L.wait(250);
    out.helpAfterViewClick = { open: await L.ev(() => !!document.getElementById('help-card')), queueGrew: (await L.queue(sel)).length > q0 };
    await page.keyboard.press('Escape'); await L.wait(200);
    out.helpAfterEsc = await L.ev(() => !!document.getElementById('help-card'));
    out.pauseAfterHelp = await L.ev(() => window.__morada.M.main.pauseReasons());
  }
  out.errs = await L.errs();
  return out;
}

// UI fix round — verification of every ui/index.html finding and improvement with real input where it matters.
// Desktop: node tools/integrate_check.mjs --clear --nohelp --script tools/fix_ui_test.mjs
// Phone:   node tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/fix_ui_test.mjs
// Tablet:  node tools/integrate_check.mjs --clear --nohelp --w 768 --h 1024 --script tools/fix_ui_test.mjs
// Prints { pass, fail, results: [{ id, ok, info }] }. Env ONLY=LIVE-1,BB-9 runs a subset.
export default async function (page, ctx) {
  const touch = !!ctx.touch;
  const vp = page.viewportSize();
  const results = [];
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const tap = async (x, y, opts) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y, opts); };
  async function check(id, fn) {
    if (only.length && !only.some((o) => id.indexOf(o) === 0)) return;
    try {
      const r = await fn();
      const ok = r && typeof r === 'object' && 'ok' in r ? !!r.ok : !!r;
      results.push({ id, ok, info: r && typeof r === 'object' ? r : undefined });
    } catch (e) { results.push({ id, ok: false, info: 'EXC ' + String(e && e.message || e).split('\n')[0] }); }
    // tidy between checks
    await ev(() => {
      const M = window.__morada.M;
      try { M.ui.closePie(); } catch (e) { /* ignore */ }
      const U = M.ui.debug.ui;
      while (U.modals.length) M.ui.debug.closeModal(U.modals[U.modals.length - 1]);
      if (M.ui.mode !== 'live') M.ui.setMode('live');
      if (U.logOpen) document.getElementById('log-btn').click();
      document.querySelectorAll('.toast').forEach((t) => t.remove());
      U.flashUntil = 0;
    }).catch(() => {});
  }
  const rect = (sel) => ev((s) => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; }, sel);
  const inter = (a, b) => !!(a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b);
  const pieInfo = () => ev(() => {
    const el = document.getElementById('pie');
    if (!el) return null;
    const t = el.querySelector('.pie-title'); const tr = t.getBoundingClientRect();
    return {
      title: t.textContent, titleRect: { l: tr.left, t: tr.top, r: tr.right, b: tr.bottom },
      note: (el.querySelector('.pie-note') || {}).textContent || '',
      items: Array.from(el.querySelectorAll('.pie-item')).map((b) => { const r = b.getBoundingClientRect(); const lab = b.querySelector('.p-label'); return { t: lab.textContent, sub: (b.querySelector('.p-sub') || {}).textContent || '', cls: b.className, dis: b.getAttribute('aria-disabled') === 'true', x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, top: r.top, b: r.bottom, clipped: lab.scrollHeight > lab.clientHeight + 2 || b.scrollWidth > b.clientWidth + 2 }; }),
    };
  });
  const settlePie = async () => { await page.waitForFunction(() => { const el = document.getElementById('pie'); return !el || el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); }, null, { timeout: 4000 }).catch(() => {}); await wait(330); };
  const tipText = () => ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
  const objScreen = (id, hgt) => ev(([id, hgt]) => { const M = window.__morada.M; const o = M.engine.objectById(id); const s = M.world.rotatedSize(o.type, o.rot); const p = M.render.project(o.x + s.w / 2, hgt, o.y + s.h / 2); return { x: p.clientX, y: p.clientY }; }, [id, hgt == null ? 0.5 : hgt]);
  // focus + mark the camera as user-moved (render's autoFrame would otherwise pan toward the selected character
  // a few seconds later, moving targets between measuring and clicking)
  const focusTile = async (x, y) => { await ev(([x, y]) => { const R = window.__morada.M.render; R.focus(x, y, true); R.pan(0, 0); }, [x, y]); await wait(700); await ev(() => window.__morada.M.render.pan(0, 0)); };

  // ---------------------------------------------------------------- setup
  await ev(() => { const h = document.getElementById('help-ok'); if (h) h.click(); });
  await wait(300);
  await ev(() => { const M = window.__morada.M; M.main.setSpeed(0); M.engine.setFreeWill(false); });
  const ids = await ev(() => { const M = window.__morada.M; const hh = M.engine.household(); return { rita: hh.find((s) => !s.career).id, caio: hh.find((s) => s.career).id }; });
  await ev((id) => window.__morada.M.ui.selectSim(id), ids.rita);

  // ---------------------------------------------------------------- LIVE-4 dead strips
  await check('LIVE-4 dock strips pass clicks', async () => ev(() => {
    let blocked = 0;
    for (let y = 0; y < innerHeight; y += 8) for (let x = 0; x < innerWidth; x += 8) {
      const e = document.elementFromPoint(x, y);
      if (e && (e.classList.contains('queue') || e.classList.contains('portraits') || e.classList.contains('dock-row') || e.id === 'dock')) blocked++;
    }
    return { ok: blocked === 0, blockedPx: blocked * 64 };
  }));

  // ---------------------------------------------------------------- VIS-4 bar overlap
  await check('VIS-4 dock clear of the bar', async () => {
    const bar = await rect('#bar'), dock = await rect('#dock'), needs = await rect('#needs-panel');
    const port = await ev(() => Array.from(document.querySelectorAll('.portrait .mood-dot')).map((d) => { const r = d.getBoundingClientRect(); return r.bottom; }));
    const barTop = bar.t;
    return { ok: dock.b <= barTop - 4 && port.every((b) => b <= barTop), barH: bar.h, gap: Math.round(barTop - dock.b), cssBarH: await ev(() => getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) };
  });

  // ---------------------------------------------------------------- VIS-16
  if (!touch) await check('VIS-16 needs panel hugs its content', async () => ev(() => {
    const body = document.getElementById('tab-body'); const kids = Array.from(body.children); const last = kids[kids.length - 1];
    const gap = body.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
    return { ok: gap < 16, emptyBand: Math.round(gap) };
  }));

  // ---------------------------------------------------------------- LIVE-9 + pause chip
  await check('LIVE-9 Space/Enter close the help card, game keeps running', async () => {
    await ev(() => { window.__morada.M.main.setSpeed(1); window.__morada.M.ui.showHelp(); });
    await wait(250);
    await page.keyboard.press('Space');
    await wait(200);
    const a = await ev(() => ({ help: !!document.getElementById('help-card'), speed: window.__morada.M.main.getSpeed(), paused: window.__morada.M.main.isPaused() }));
    await ev(() => window.__morada.M.ui.showHelp()); await wait(200);
    await page.keyboard.press('Enter'); await wait(200);
    const b = await ev(() => ({ help: !!document.getElementById('help-card'), speed: window.__morada.M.main.getSpeed() }));
    await page.keyboard.press('Space'); await wait(300);
    const c = await ev(() => { const n = document.querySelector('.speed-note'); return { speed: window.__morada.M.main.getSpeed(), chip: n && !n.hidden ? n.textContent : null }; });
    await ev(() => window.__morada.M.main.setSpeed(0));
    return { ok: !a.help && a.speed === 1 && !a.paused && !b.help && b.speed === 1 && c.speed === 0 && /pausado/i.test(c.chip || ''), a, b, c };
  });

  // ---------------------------------------------------------------- LIVE-1 meal on counter
  const meal = await ev(() => {
    const M = window.__morada.M, st = M.engine.state;
    const c = st.objects.find((o) => o.type === 'counter');
    const abs = st.time.day * 1440 + st.time.minute;
    const meal = { id: M.util.nextId(st), type: 'meal', x: c.x, y: c.y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0, servings: 3, quality: 60, food: 'home', spoilAt: abs + 480 };
    st.objects.push(meal); M.world.rebuild(); M.util.bus.emit('objects');
    return { meal: meal.id, counter: c.id, x: c.x, y: c.y };
  });
  await check('LIVE-1 a click on the counter under food opens the food menu', async () => {
    // characters standing next to the counter would win the tap (render snaps to characters first): move them away
    await ev(() => { const M = window.__morada.M; M.engine.household().forEach((s, i) => { s.queue.slice().forEach((a) => M.engine.cancelAction(s.id, a.id)); for (let k = 0; k < 6; k++) M.engine.update(0.5); s.x = 3 + i; s.y = 17; s.seated = false; s.asleep = false; s.anim = 'idle'; }); });
    const res = await ev(([cid, x, y]) => window.__morada.M.ui.debug.resolveTarget({ kind: 'object', id: cid, x, y }), [meal.counter, meal.x, meal.y]);
    await focusTile(meal.x, meal.y);
    // sample the counter tile: every point that picks the counter must resolve to the meal; real click at the centre
    const sample = await ev(([cid, mid, x, y]) => {
      const M = window.__morada.M; let counter = 0, resolved = 0;
      for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) {
        const p = M.render.project(x + i / 10, 0.92, y + j / 10);
        const pk = M.render.pick(p.clientX, p.clientY);
        if (pk && pk.kind === 'object' && (pk.id === cid || pk.id === mid)) { counter++; const r = M.ui.debug.resolveTarget(pk); if (r.id === mid) resolved++; }
      }
      return { counter, resolved };
    }, [meal.counter, meal.meal, meal.x, meal.y]);
    const c = await objScreen(meal.counter, 0.92);
    await tap(c.x + 6, c.y + 4);
    await wait(500);
    await settlePie();
    const pie = await pieInfo();
    return { ok: res.id === meal.meal && sample.resolved === sample.counter && sample.counter > 0 && !!pie && /prato|comer/i.test(pie.items.map((i) => i.t).join(' ')), resolved: res.id === meal.meal, sample, pie: pie && pie.title + ': ' + pie.items.map((i) => i.t).join(', ') };
  });
  await ev((id) => { const M = window.__morada.M; const st = M.engine.state; st.objects = st.objects.filter((o) => o.id !== id); M.world.rebuild(); M.util.bus.emit('objects'); }, meal.meal);

  // ---------------------------------------------------------------- LIVE-18 nothing to do
  await check('LIVE-18 objects with nothing to do: no pointer, useful tip', async () => {
    const et = await ev(() => { const o = window.__morada.M.engine.state.objects.find((q) => q.type === 'end_table'); return o ? { id: o.id, x: o.x, y: o.y } : null; });
    const mb = await ev(() => { const st = window.__morada.M.engine.state; st.bills = []; const o = st.objects.find((q) => q.type === 'mailbox'); return { id: o.id, x: o.x, y: o.y }; });
    let cursor = null;
    if (!touch && et) {
      await focusTile(et.x, et.y);
      const p = await objScreen(et.id, 0.55);
      await page.mouse.move(p.x, p.y); await wait(250); await page.mouse.move(p.x + 1, p.y); await wait(400);
      cursor = await ev(() => ({ cur: document.getElementById('view').style.cursor, lab: document.getElementById('hover-label').className }));
    }
    await focusTile(mb.x, mb.y);
    await ev(([id]) => { const M = window.__morada.M; const o = M.engine.objectById(id); const p = M.render.project(o.x + 0.5, 0.9, o.y + 0.5); M.ui.openPie(p.clientX, p.clientY, { kind: 'object', id }); }, [mb.id]);
    await wait(200);
    const tip = await tipText();
    return { ok: (touch || (cursor && cursor.cur !== 'pointer')) && /nenhuma conta/i.test(tip || ''), cursor, tip };
  });

  // ---------------------------------------------------------------- LIVE-11 walk redirect / append
  await check('LIVE-11 plain click redirects the walk, Shift+click appends', async () => {
    const r = await ev((id) => { const s = window.__morada.M.engine.simById(id); return { x: s.x, y: s.y }; }, ids.rita);
    await focusTile(r.x, r.y);
    await ev(() => window.__morada.M.main.setSpeed(1));
    const pts = await ev(() => { const M = window.__morada.M; const out = []; for (const [x, y] of [[4, 15], [6, 16], [8, 17], [3, 17]]) { const p = M.render.project(x + 0.5, 0, y + 0.5); out.push({ x: p.clientX, y: p.clientY }); } return out; });
    for (const p of pts.slice(0, 3)) { await tap(p.x, p.y); await wait(300); }
    const q1 = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), ids.rita);
    if (!touch) { await page.keyboard.down('Shift'); await page.mouse.click(pts[3].x, pts[3].y); await page.keyboard.up('Shift'); await wait(300); }
    const q2 = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind + ':' + a.x + ',' + a.y), ids.rita);
    await ev((id) => { const M = window.__morada.M; M.main.setSpeed(0); const s = M.engine.simById(id); s.queue.slice().forEach((a) => M.engine.cancelAction(id, a.id)); for (let i = 0; i < 6; i++) M.engine.update(0.5); }, ids.rita);
    return { ok: q1.length === 1 && (touch || q2.length === 2), q1, q2 };
  });

  // ---------------------------------------------------------------- LIVE-17 log closes on world click
  await check('LIVE-17 a world click closes the log and does not walk', async () => {
    await ev(() => document.getElementById('log-btn').click());
    await wait(200);
    const before = await ev((id) => window.__morada.M.engine.simById(id).queue.length, ids.rita);
    const p = await ev(() => { const M = window.__morada.M; const pr = M.render.project(5.5, 0, 16.5); return { x: pr.clientX, y: pr.clientY }; });
    await tap(p.x, p.y); await wait(300);
    const after = await ev((id) => ({ q: window.__morada.M.engine.simById(id).queue.length, open: !document.getElementById('log-panel').hidden }), ids.rita);
    return { ok: !after.open && after.q === before, before, after };
  });

  // ---------------------------------------------------------------- LIVE-8 refusals + overflow chip
  await check('LIVE-8 refused command explains why; +N chip', async () => {
    const r = await ev((id) => {
      const M = window.__morada.M, E = M.engine, s = E.simById(id);
      const fridge = E.state.objects.find((o) => /^fridge/.test(o.type));
      let n = 0; for (let i = 0; i < 9; i++) if (E.queueInteraction(id, fridge.id, 'snack', 'player')) n++;
      return { queued: n, fridge: fridge.id, len: s.queue.length };
    }, ids.rita);
    const p = await objScreen(r.fridge, 1.0);
    await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'object', id }), [p.x, p.y, r.fridge]);
    await settlePie();
    const pie = await pieInfo();
    const it = pie && pie.items.find((i) => /lanche/i.test(i.t) && !i.dis);
    if (it) { await tap(it.x, it.y); await wait(300); }
    const toasts = await ev(() => Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent));
    // overflow chip: push extra fake actions into the state queue
    const chip = await ev((id) => {
      const M = window.__morada.M, s = M.engine.simById(id);
      const extra = [];
      for (let i = 0; i < 3; i++) extra.push(Object.assign({}, s.queue[s.queue.length - 1], { id: 900000 + i }));
      s.queue.push(...extra);
      M.ui.debug.ui.sig.queue = '';
      return new Promise((res) => setTimeout(() => { const c = document.querySelector('.q-more'); const n = document.querySelectorAll('#dock .q-item').length; s.queue.splice(s.queue.length - 3, 3); res({ chip: c ? c.textContent : null, icons: n }); }, 600));
    }, ids.rita);
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); s.queue.slice().forEach((a) => M.engine.cancelAction(id, a.id)); for (let i = 0; i < 10; i++) M.engine.update(0.5); }, ids.rita);
    return { ok: toasts.some((t) => /fila/i.test(t)) && chip.chip && chip.icons <= 8, queued: r.queued, toasts, chip };
  });

  // ---------------------------------------------------------------- LIVE-2 / LIVE-3 job offer card
  await check('LIVE-2/LIVE-3 job offer card with compare + confirm (employed)', async () => {
    await ev((id) => { const M = window.__morada.M; M.ui.selectSim(id); const s = M.engine.simById(id); s.career.level = 4; s.career.performance = 60; }, ids.caio);
    const np = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      let o = st.objects.find((q) => q.type === 'newspaper');
      if (!o) { const mb = st.objects.find((q) => q.type === 'mailbox'); o = { id: M.util.nextId(st), type: 'newspaper', x: mb.x + 1, y: mb.y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0, day: st.time.day }; st.objects.push(o); M.world.rebuild(); M.util.bus.emit('objects'); }
      o.offer = Object.keys(M.data.CAREERS).find((t) => t !== M.engine.simById(st.sims.find((s) => s.career).id).career.track);
      o.read = false;
      return { id: o.id, x: o.x, y: o.y };
    });
    await focusTile(np.x, np.y);
    const p = await objScreen(np.id, 0.05);
    await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'object', id }), [p.x, p.y, np.id]);
    await settlePie();
    const pie = await pieInfo();
    const job = pie.items.find((i) => /emprego|vaga/i.test(i.t));
    await tap(job.x, job.y); await wait(400);
    const card = await ev(() => { const m = document.querySelector('.modal'); return m ? { title: m.querySelector('h2').textContent, text: m.textContent, buttons: Array.from(m.querySelectorAll('.modal-foot .btn')).map((b) => b.textContent) } : null; });
    const before = await ev((id) => JSON.stringify(window.__morada.M.engine.simById(id).career), ids.caio);
    // decline with Esc → nothing queued
    await page.keyboard.press('Escape'); await wait(200);
    const q0 = await ev((id) => window.__morada.M.engine.simById(id).queue.filter((a) => String(a.interaction || '').indexOf('job:') === 0).length, ids.caio);
    // accept from the Carreira tab list
    await ev(() => window.__morada.M.ui.setTab('career'));
    if (touch) await ev(() => { const b = document.getElementById('needs-toggle'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); });
    await wait(400);
    const row = await ev(() => { const b = document.querySelector('.offer-row'); if (!b) return null; b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (row) { await tap(row.x, row.y); await wait(400); }
    const card2 = await ev(() => !!document.querySelector('.modal .compare'));
    const acc = await ev(() => { const b = Array.from(document.querySelectorAll('.modal .modal-foot .btn')).find((x) => /Trocar/.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (acc) { await tap(acc.x, acc.y); await wait(300); }
    const q1 = await ev((id) => window.__morada.M.engine.simById(id).queue.filter((a) => String(a.interaction || '').indexOf('job:') === 0).length, ids.caio);
    const after = await ev((id) => JSON.stringify(window.__morada.M.engine.simById(id).career), ids.caio);
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); s.queue.slice().forEach((a) => M.engine.cancelAction(id, a.id)); for (let i = 0; i < 10; i++) M.engine.update(0.5); M.ui.setTab('needs'); }, ids.caio);
    if (touch) await ev(() => { const b = document.getElementById('needs-toggle'); if (b.getAttribute('aria-expanded') === 'true') b.click(); });
    const ok = !!card && /Trocar de emprego/.test(card.title) && /Emprego atual/.test(card.text) && /Salário/.test(card.text) && q0 === 0 && before === after && card2 && q1 === 1 && job && !job.clipped && /M\$/.test(job.sub);
    return { ok, pieJob: job && { t: job.t, sub: job.sub, clipped: job.clipped }, card: card && { title: card.title, buttons: card.buttons }, declinedQueued: q0, fromTab: card2, acceptedQueued: q1 };
  });
  await ev((id) => window.__morada.M.ui.selectSim(id), ids.rita);

  // ---------------------------------------------------------------- LIVE-14 / LIVE-15 career tab
  await check('LIVE-14/15 career tab: offers are buttons; live mood check; countdown', async () => {
    if (touch) await ev(() => { const b = document.getElementById('needs-toggle'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); });
    await ev((id) => { const M = window.__morada.M; M.ui.selectSim(id); M.ui.setTab('career'); }, ids.rita);
    await wait(300);
    const rita = await ev(() => ({ buttons: document.querySelectorAll('#tab-body .offer-row').length, text: document.getElementById('tab-body').textContent }));
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); for (const k in s.motives) s.motives[k] = 90; s.career.level = 1; M.ui.selectSim(id); M.ui.setTab('career'); }, ids.caio);
    await wait(300);
    const caio = await ev(() => ({ ok: Array.from(document.querySelectorAll('#tab-body .req-list li')).map((l) => l.className + ':' + l.textContent), text: document.getElementById('tab-body').textContent }));
    await ev((id) => { const M = window.__morada.M; M.ui.setTab('needs'); M.ui.selectSim(id); }, ids.rita);
    if (touch) await ev(() => { const b = document.getElementById('needs-toggle'); if (b.getAttribute('aria-expanded') === 'true') b.click(); });
    const moodOk = caio.ok.some((l) => /^ok:✓ Ir trabalhar de bom humor/.test(l));
    const word = touch ? /Toque numa vaga/ : /Clique numa vaga/;
    return { ok: (rita.buttons > 0 ? word.test(rita.text) : true) && moodOk && /\(em \d/.test(caio.text), ritaOffers: rita.buttons, moodLine: caio.ok.find((l) => /humor/.test(l)), countdown: (caio.text.match(/\(em [^)]+\)/) || [])[0] };
  });

  // ---------------------------------------------------------------- self menu
  await check('IMP self menu on the selected character', async () => {
    const s = await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); M.render.focus(s.x, s.y, true); return s.id; }, ids.rita);
    await wait(600);
    const p = await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); const pr = M.render.project(s.x + 0.5, 1.0, s.y + 0.5); return { x: pr.clientX, y: pr.clientY, pick: M.render.pick(pr.clientX, pr.clientY) }; }, s);
    await tap(p.x, p.y); await wait(500); await settlePie();
    const pie = await pieInfo();
    let home = null;
    const it = pie && pie.items.find((i) => /dentro de casa/.test(i.t));
    if (it) { await tap(it.x, it.y); await wait(300); home = await ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.kind), s); }
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); s.queue.slice().forEach((a) => M.engine.cancelAction(id, a.id)); for (let i = 0; i < 6; i++) M.engine.update(0.5); }, s);
    return { ok: !!pie && pie.items.some((i) => /Cancelar tudo/.test(i.t)) && pie.items.some((i) => /necessidades/.test(i.t)) && home && home.length === 1, pick: p.pick, items: pie && pie.items.map((i) => i.t), home };
  });

  // ---------------------------------------------------------------- low mood pie
  await check('IMP low-mood pie highlights the allowed need actions', async () => {
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); for (const k in s.motives) s.motives[k] = -85; s.motives.hunger = -95; }, ids.rita);
    const tv = await ev(() => window.__morada.M.engine.state.objects.find((o) => o.type === 'fridge_cheap' || o.type === 'fridge_lux').id);
    const p = await objScreen(tv, 1);
    await ev(([x, y, id]) => window.__morada.M.ui.openPie(x, y, { kind: 'object', id }), [p.x, p.y, tv]);
    await settlePie();
    const pie = await pieInfo();
    await ev((id) => { const M = window.__morada.M; const s = M.engine.simById(id); for (const k in s.motives) s.motives[k] = 60; }, ids.rita);
    return { ok: !!pie && (pie.note ? pie.items.some((i) => /need/.test(i.cls)) : pie.items.every((i) => !i.dis)), note: pie && pie.note, items: pie && pie.items.map((i) => i.t + (i.dis ? '(x)' : '') + (/need/.test(i.cls) ? '(need)' : '')) };
  });

  // ---------------------------------------------------------------- toasts: Ver, limit, ETA
  await check('§3 toast Ver button focuses the event; ETA chip', async () => {
    const cam0 = await ev(() => window.__morada.M.render.getCamera ? window.__morada.M.render.getCamera() : null);
    await ev(() => window.__morada.M.util.bus.emit('notify', { text: 'Teste: algo aconteceu lá fora.', kind: 'info', focus: { x: 2, y: 2 } }));
    await wait(200);
    const b = await ev(() => { const t = Array.from(document.querySelectorAll('.toast')).find((x) => /algo aconteceu/.test(x.textContent)); const v = t && Array.from(t.querySelectorAll('.btn')).find((x) => x.textContent === 'Ver'); if (!v) return null; const r = v.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (b) { await tap(b.x, b.y); await wait(500); }
    const cam1 = await ev(() => window.__morada.M.render.getCamera ? window.__morada.M.render.getCamera() : null);
    await ev(() => { const st = window.__morada.M.engine.state; st.events = st.events || []; st.events.push({ id: 987654, kind: 'pizza', at: st.time.day * 1440 + st.time.minute + 50 }); });
    await wait(500);
    const eta = await ev(() => { const e = document.querySelector('.eta-chip'); return e && !e.hidden ? e.textContent : null; });
    await ev(() => { const st = window.__morada.M.engine.state; st.events = st.events.filter((e) => e.id !== 987654); });
    const moved = cam0 && cam1 ? Math.hypot(cam1.x - cam0.x, cam1.z - cam0.z) : null;
    return { ok: !!b && (moved == null || moved > 1) && /pizza/i.test(eta || '') || (!!b && /🍕/.test(eta || '')), verButton: !!b, camMoved: moved, eta };
  });
  await check('LIVE-13 phone toasts: at most 2, clear of the camera cluster', async () => {
    await ev(() => { for (let i = 0; i < 6; i++) window.__morada.M.util.bus.emit('notify', { text: 'Aviso número ' + (i + 1) + ' para testar a pilha de notificações.', kind: i % 2 ? 'bad' : 'info' }); });
    await wait(500);
    const r = await ev(() => {
      const ts = Array.from(document.querySelectorAll('.toast')).map((t) => t.getBoundingClientRect());
      const cam = document.getElementById('cam').getBoundingClientRect();
      const hit = ts.some((a) => a.left < cam.right && cam.left < a.right && a.top < cam.bottom && cam.top < a.bottom);
      const pe = getComputedStyle(document.querySelector('.toast')).pointerEvents;
      return { n: ts.length, hitCam: hit, bodyPointer: pe };
    });
    return { ok: (vp.width > 760 ? r.n <= 4 : r.n <= 2) && !r.hitCam && r.bodyPointer === 'none', ...r };
  });

  // ---------------------------------------------------------------- selected leaves → offer
  await check('IMP offer to control someone at home when the selected one leaves', async () => {
    await ev((id) => { const M = window.__morada.M; M.ui.selectSim(id); const s = M.engine.simById(id); s.hidden = true; s.atWork = true; s.workReturnAt = M.util.absMinute(M.engine.state) + 300; }, ids.caio);
    await wait(1400);
    const t = await ev(() => Array.from(document.querySelectorAll('.toast')).map((x) => x.textContent).join(' | '));
    await ev(([c, r]) => { const M = window.__morada.M; const s = M.engine.simById(c); s.hidden = false; s.atWork = false; M.ui.selectSim(r); }, [ids.caio, ids.rita]);
    return { ok: /Controlar Rita/.test(t), toasts: t };
  });

  // ---------------------------------------------------------------- LIVE-10 portrait focus (tap again)
  await check('LIVE-10 tapping the selected portrait centres the camera', async () => {
    await ev(() => window.__morada.M.render.focus(2, 2, true));
    await wait(500);
    const cam0 = await ev(() => window.__morada.M.render.getCamera());
    const p = await ev((id) => { const b = document.querySelector('.portrait[data-sim="' + id + '"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, ids.rita);
    await tap(p.x, p.y); await wait(500);
    const cam1 = await ev(() => window.__morada.M.render.getCamera());
    return { ok: Math.hypot(cam1.x - cam0.x, cam1.z - cam0.z) > 2, moved: Math.round(Math.hypot(cam1.x - cam0.x, cam1.z - cam0.z) * 10) / 10 };
  });

  // ---------------------------------------------------------------- VIS-9 phone pie title vs items
  await check('VIS-9 pie title never covered; labels not clipped', async () => {
    const comp = await ev(() => { const o = window.__morada.M.engine.state.objects.find((q) => q.type === 'phone'); return o.id; });
    const o = await ev((id) => { const q = window.__morada.M.engine.objectById(id); return { x: q.x, y: q.y }; }, comp);
    await focusTile(o.x, o.y);
    const res = [];
    for (const fx of [0.12, 0.5, 0.88]) {
      await ev(([fx, id]) => window.__morada.M.ui.openPie(innerWidth * fx, innerHeight * 0.45, { kind: 'object', id }), [fx, comp]);
      await settlePie();
      const pie = await pieInfo();
      const tr = { l: pie.titleRect.l, t: pie.titleRect.t, r: pie.titleRect.r, b: pie.titleRect.b };
      const cover = pie.items.some((i) => inter(tr, { l: i.l, t: i.top, r: i.r, b: i.b }));
      const clipped = pie.items.filter((i) => i.clipped).map((i) => i.t);
      res.push({ fx, cover, clipped, n: pie.items.length });
      await ev(() => window.__morada.M.ui.closePie());
    }
    return { ok: res.every((r) => !r.cover && !r.clipped.length), res };
  });

  // ---------------------------------------------------------------- CR-11 modal focus trap
  await check('CR-11 modal traps focus; HUD inert; tab names', async () => {
    await ev(() => window.__morada.M.ui.openOptions());
    await wait(300);
    let escaped = 0;
    for (let i = 0; i < 24; i++) { await page.keyboard.press('Tab'); const inside = await ev(() => !!document.activeElement.closest('.modal')); if (!inside) escaped++; }
    const inert = await ev(() => document.getElementById('hud').inert === true || document.getElementById('hud').hasAttribute('inert'));
    await page.keyboard.press('Escape'); await wait(200);
    const after = await ev(() => ({ inert: document.getElementById('hud').hasAttribute('inert'), modal: !!document.querySelector('.modal') }));
    const names = await ev(() => Array.from(document.querySelectorAll('.tab')).map((b) => b.getAttribute('aria-label')));
    return { ok: escaped === 0 && inert && !after.inert && !after.modal && names.every(Boolean), escaped, inert, after, names };
  });

  // ---------------------------------------------------------------- §6 choice
  await check('§6 M.ui.choice resolves the clicked value; Esc = last', async () => {
    const r = await ev(async () => {
      const U = window.__morada.M.ui;
      const p1 = U.choice({ title: 'Teste', text: 'Escolha', buttons: [{ label: 'A', value: 'a', primary: true }, { label: 'B', value: 'b' }] });
      await new Promise((r) => setTimeout(r, 50));
      const paused = window.__morada.M.main.pauseReasons().indexOf('modal') >= 0;
      document.querySelector('#choice-0').click();
      const v1 = await p1;
      const p2 = U.choice({ title: 'Teste 2', buttons: [{ label: 'Sim', value: 1 }, { label: 'Não', value: 0 }] });
      await new Promise((r) => setTimeout(r, 50));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const v2 = await p2;
      return { v1, v2, paused, after: window.__morada.M.main.pauseReasons() };
    });
    return { ok: r.v1 === 'a' && r.v2 === 0 && r.paused && r.after.indexOf('modal') < 0, ...r };
  });

  // ---------------------------------------------------------------- Buy mode
  await check('VIS-10 drawer open re-frames the camera, close restores it', async () => {
    const cam0 = await ev(() => { const M = window.__morada.M; M.render.focus(12, 10, true); return null; });
    await wait(600);
    const c0 = await ev(() => window.__morada.M.render.getCamera());
    const house0 = await ev(() => { const p = window.__morada.M.render.project(12.5, 0, 10.5); return { x: p.clientX, y: p.clientY }; });
    await ev(() => window.__morada.M.ui.setMode('buy'));
    await wait(1500);
    const house1 = await ev(() => { const p = window.__morada.M.render.project(12.5, 0, 10.5); return { x: p.clientX, y: p.clientY }; });
    const dr = await rect('#drawer');
    await ev(() => window.__morada.M.ui.setMode('live'));
    await wait(1200);
    const c1 = await ev(() => window.__morada.M.render.getCamera());
    const inFree = dr.l > vp.width * 0.3 ? house1.x < dr.l - 10 : house1.y < dr.t - 10;
    return { ok: inFree && Math.hypot(c1.x - c0.x, c1.z - c0.z) < 0.3, house0, house1, drawer: dr, restored: Math.round(Math.hypot(c1.x - c0.x, c1.z - c0.z) * 100) / 100 };
  });
  await check('VIS-5/VIS-11/BB-11 drawer layout: labels whole, no overlap with camera / bar', async () => {
    await ev(() => window.__morada.M.ui.setMode('buy'));
    await wait(600);
    const r = await ev(() => {
      const trunc = Array.from(document.querySelectorAll('.cat-btn .c-label')).filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent);
      const R = (s) => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      return { trunc, cam: R('#cam'), drawer: R('#drawer'), bell: R('#log-btn'), bar: R('#bar') };
    });
    await ev(() => window.__morada.M.ui.setMode('build'));
    await ev(() => window.__morada.M.ui.debug.setBuildTool('paper'));
    await wait(400);
    const sw = await ev(() => Array.from(document.querySelectorAll('.swatch .sw-name')).filter((e) => e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent));
    const narrow = vp.width <= 760;
    const camHit = !narrow && (inter(r.cam, r.drawer) || inter(r.cam, r.bell));
    const barGap = narrow ? r.drawer.b <= r.bar.t + 1 : r.drawer.b <= r.bar.t - 4;
    return { ok: !r.trunc.length && !sw.length && !camHit && barGap, truncCats: r.trunc, truncSwatches: sw, camHit, barGap, drawerBottom: r.drawer.b, barTop: r.bar.t };
  });
  await check('§2 placement tip shows Ambiente delta and warnings; §4 wall override + hide while moving', async () => {
    await ev(() => {
      const R = window.__morada.M.render; window.__calls = [];
      for (const n of ['setWallsUpOverride', 'hideObject']) { const f = R[n]; R[n] = function () { window.__calls.push(n + ':' + Array.from(arguments).join(',')); return typeof f === 'function' ? f.apply(R, arguments) : undefined; }; }
    });
    await ev(() => window.__morada.M.ui.setMode('buy'));
    await wait(600);
    // plant inside the living room: Ambiente delta
    const spot = await ev(() => {
      const M = window.__morada.M;
      for (let y = 4; y < 16; y++) for (let x = 4; x < 20; x++) { if (!M.world.isIndoor(x, y)) continue; const c = M.world.canPlace('plant_big', x, y, 0); if (!c.ok) continue; const r = M.world.roomScoreWith('plant_big', x, y, 0); if (r && r.delta > 0) return { x, y, d: r.delta }; }
      return null;
    });
    await ev(() => window.__morada.M.ui.debug.startPlacing('plant_big'));
    await focusTile(spot.x, spot.y);
    const sp = await ev(([x, y]) => { const p = window.__morada.M.render.project(x + 0.5, 0, y + 0.5); return { x: p.clientX, y: p.clientY }; }, [spot.x, spot.y]);
    if (touch) await page.touchscreen.tap(sp.x, sp.y); else { await page.mouse.move(sp.x, sp.y); await wait(100); await page.mouse.move(sp.x + 1, sp.y); }
    await wait(400);
    const tip1 = await tipText();
    // sofa across the front door: warning
    const door = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      for (const k in st.lot.walls) { if (st.lot.walls[k].t !== 2) continue; const [kind, x, y] = k.split(','); const tiles = kind === 'h' ? [[+x, +y - 1], [+x, +y]] : [[+x - 1, +y], [+x, +y]]; for (const [tx, ty] of tiles) { for (const t of ['lamp_floor', 'plant_small', 'chair_wood']) { if (M.world.canPlace(t, tx, ty, 0).ok) { const w = M.world.placementWarnings(t, tx, ty, 0); if (w.length) return { x: tx, y: ty, t, w }; } } } }
      return null;
    });
    let tip2 = null;
    if (door) {
      await ev((t) => window.__morada.M.ui.debug.startPlacing(t), door.t);
      await focusTile(door.x, door.y);
      const dp = await ev(([x, y]) => { const p = window.__morada.M.render.project(x + 0.5, 0, y + 0.5); return { x: p.clientX, y: p.clientY }; }, [door.x, door.y]);
      if (touch) await page.touchscreen.tap(dp.x, dp.y); else { await page.mouse.move(dp.x, dp.y); await wait(100); await page.mouse.move(dp.x + 1, dp.y); }
      await wait(400);
      tip2 = await tipText();
    }
    await ev(() => { window.__morada.M.ui.debug.stopPlacing(); window.__morada.M.ui.debug.startPlacing('painting_cheap'); });
    await wait(200);
    const mv = await ev(() => { const o = window.__morada.M.engine.state.objects.find((q) => q.type === 'sofa_cheap'); window.__morada.M.ui.debug.startPlacing(o.type, o.id); return o.id; });
    await wait(200);
    await ev(() => window.__morada.M.ui.debug.stopPlacing());
    const calls = await ev(() => window.__calls.slice());
    return { ok: /Ambiente \+\d+ neste cômodo/.test(tip1 || '') && (!door || /⚠/.test(tip2 || '')) && calls.some((c) => c === 'setWallsUpOverride:true') && calls.some((c) => c === 'hideObject:' + mv + ',true') && calls.some((c) => c === 'hideObject:' + mv + ',false'), tip1, tip2, door: door && door.w, calls };
  });
  await check('IMP rotation pivots around the cursor tile', async () => {
    const r = await ev(() => {
      const U = window.__morada.M.ui; U.setMode('buy');
      U.debug.startPlacing('sofa_cheap');
      const p = U.debug.ui.buy.placing;
      const res = [];
      for (const [tx, ty] of [[10, 15], [23, 15], [0, 19]]) {
        p.tx = tx; p.ty = ty;
        for (let k = 0; k < 4; k++) {
          U.debug.rotatePlacing();
          const fp = window.__morada.M.world.footprint(p.type, p.x, p.y, p.rot);
          res.push(fp.some((t) => t.x === tx && t.y === ty));
        }
      }
      U.debug.stopPlacing();
      return res;
    });
    return { ok: r.every(Boolean), r };
  });
  await check('IMP catalog search / sort / affordable filter', async () => {
    await ev(() => window.__morada.M.ui.setMode('buy'));
    await wait(300);
    const s = await ev(() => document.getElementById('cat-search') ? true : false);
    const inp = await page.$('#cat-search');
    await inp.click(); await page.keyboard.type('cama');
    await wait(300);
    const found = await ev(() => Array.from(document.querySelectorAll('.catalog .card')).map((c) => c.getAttribute('data-type')));
    await ev(() => { const i = document.getElementById('cat-search'); i.value = ''; i.dispatchEvent(new Event('input')); });
    await ev(() => { window.__morada.M.engine.state.money = 100; document.getElementById('cat-afford').click(); });
    await wait(200);
    const cheap = await ev(() => Array.from(document.querySelectorAll('.catalog .card')).map((c) => window.__morada.M.data.CATALOG[c.getAttribute('data-type')].price));
    await ev(() => { document.getElementById('cat-afford').click(); document.getElementById('cat-sort-name').click(); window.__morada.M.engine.state.money = 6500; });
    await wait(200);
    const names = await ev(() => Array.from(document.querySelectorAll('.catalog .card .card-name')).map((c) => c.textContent));
    const sorted = names.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
    await ev(() => document.getElementById('cat-sort-price').click());
    return { ok: s && found.length >= 3 && found.every((t) => /^bed_/.test(t)) && cheap.length > 0 && cheap.every((p) => p <= 100) && JSON.stringify(names) === JSON.stringify(sorted), found, cheapN: cheap.length };
  });
  await check('CR-10 system objects cannot be sold/removed in Buy or Build', async () => {
    const pd = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      const o = { id: M.util.nextId(st), type: 'puddle', x: 5, y: 15, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0 };
      st.objects.push(o); M.world.rebuild(); M.util.bus.emit('objects'); return o.id;
    });
    await ev(() => window.__morada.M.ui.setMode('buy'));
    await focusTile(5, 15);
    const p = await objScreen(pd, 0.02);
    await tap(p.x, p.y); await wait(300);
    const sel = await ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    const tip = await tipText();
    await ev(() => window.__morada.M.ui.setMode('build'));
    await ev(() => window.__morada.M.ui.debug.setBuildTool('demolish'));
    await wait(200);
    await tap(p.x, p.y); await wait(200); await tap(p.x, p.y); await wait(300);
    const still = await ev((id) => !!window.__morada.M.engine.objectById(id), pd);
    await ev((id) => { const M = window.__morada.M; const st = M.engine.state; st.objects = st.objects.filter((o) => o.id !== id); M.world.rebuild(); M.util.bus.emit('objects'); }, pd);
    return { ok: sel == null && still && /limpar|Viver/i.test(tip || ''), sel, still, tip };
  });
  await check('BB-9 Delete arms the confirmation, second Delete sells (Buy and Build)', async () => {
    if (touch) return { ok: true, skipped: 'keyboard' };
    const res = {};
    for (const mode of ['buy', 'build']) {
      const id = await ev((mode) => {
        const M = window.__morada.M; M.ui.setMode(mode);
        if (mode === 'build') M.ui.debug.setBuildTool('demolish');
        const o = M.engine.state.objects.find((q) => q.type === 'plant_small' || q.type === 'lamp_floor');
        if (mode === 'buy') M.ui.debug.selectObject(o.id); else { M.ui.debug.ui.build.sel = o.id; M.ui.debug.ui.build.confirm = false; }
        return o.id;
      }, mode);
      await page.keyboard.press('Delete'); await wait(150);
      const armed = await ev((id) => ({ still: !!window.__morada.M.engine.objectById(id), note: (document.querySelector('#toolbar .tb-note') || {}).textContent || '' }), id);
      await page.keyboard.press('Delete'); await wait(150);
      const gone = await ev((id) => !window.__morada.M.engine.objectById(id), id);
      res[mode] = { armed, gone };
      // undo it (Ctrl+Z)
      await page.keyboard.press('Control+z'); await wait(200);
      res[mode].undone = await ev((id) => !!window.__morada.M.engine.objectById(id), id);
    }
    return { ok: ['buy', 'build'].every((m) => res[m].armed.still && /Vender por|Remover/.test(res[m].armed.note) && res[m].gone && res[m].undone), res };
  });

  // ---------------------------------------------------------------- Build mode
  await check('§2 Room tool: cost preview while dragging, builds 4 walls, Desfazer restores', async () => {
    await ev(() => { const M = window.__morada.M; M.ui.setMode('build'); M.ui.debug.setBuildTool('room'); });
    const rr = await ev(() => {
      const M = window.__morada.M;
      for (const [x, y] of [[2, 14], [18, 14], [2, 2], [19, 2], [2, 8], [19, 8]]) { const e = M.engine.estimateRoom(x, y, x + 3, y + 2, null); if (e.ok && e.walls === 14) return { x, y }; }
      return { x: 2, y: 14 };
    });
    await focusTile(rr.x + 2, rr.y + 1);
    const pts = await ev((rr) => { const M = window.__morada.M; const a = M.render.project(rr.x + 0.5, 0, rr.y + 0.5), b = M.render.project(rr.x + 3.5, 0, rr.y + 2.5); return { a: { x: a.clientX, y: a.clientY }, b: { x: b.clientX, y: b.clientY } }; }, rr);
    const money0 = await ev(() => window.__morada.M.engine.state.money);
    const walls0 = await ev(() => Object.keys(window.__morada.M.engine.state.lot.walls).length);
    let tipDrag;
    if (touch) {
      // touch drag via CDP-less synthetic pointer events on the view
      await ev(([a, b]) => {
        const v = document.getElementById('view');
        const mk = (type, p) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: p.x, clientY: p.y, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true });
        v.dispatchEvent(mk('pointerdown', a));
        for (let i = 1; i <= 6; i++) v.dispatchEvent(mk('pointermove', { x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 }));
      }, [pts.a, pts.b]);
      await wait(200);
      tipDrag = await tipText();
      await ev((b) => { const v = document.getElementById('view'); v.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: b.x, clientY: b.y, button: 0, isPrimary: true })); }, pts.b);
    } else {
      await page.mouse.move(pts.a.x, pts.a.y); await page.mouse.down();
      await page.mouse.move(pts.b.x, pts.b.y, { steps: 6 }); await wait(200);
      tipDrag = await tipText();
      await page.mouse.up();
    }
    await wait(300);
    const built = await ev(() => ({ walls: Object.keys(window.__morada.M.engine.state.lot.walls).length, money: window.__morada.M.engine.state.money }));
    const undoBtn = await ev(() => { const b = document.querySelector('#drawer .undo-btn'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dis: b.disabled }; });
    await tap(undoBtn.x, undoBtn.y); await wait(300);
    const undone = await ev(() => ({ walls: Object.keys(window.__morada.M.engine.state.lot.walls).length, money: window.__morada.M.engine.state.money }));
    return { ok: /M\$/.test(tipDrag || '') && built.walls - walls0 === 14 && built.money < money0 && !undoBtn.dis && undone.walls === walls0 && undone.money === money0, tipDrag, added: built.walls - walls0, cost: money0 - built.money, undone };
  });
  await check('VIS-2/BB-7 wallpaper paints one side; Shift/“Cômodo inteiro” paints the room', async () => {
    await ev(() => { const M = window.__morada.M; M.ui.setMode('build'); M.ui.debug.setBuildTool('paper'); M.ui.debug.ui.build.paper = 5; M.ui.debug.ui.build.wholeRoom = false; });
    // an interior wall between two indoor rooms that is visible from the camera
    const w = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      for (const k of Object.keys(st.lot.walls)) {
        if (st.lot.walls[k].t !== 1) continue;
        const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5;
        M.render.focus(px, pz, true); M.render.pan(0, 0);
        const p = M.render.project(px, 1.2, pz);
        const e = M.render.pickEdge(p.clientX, p.clientY);
        if (e && e.key === k && e.side) return { k, x: p.clientX, y: p.clientY, side: e.side };
      }
      return null;
    });
    await wait(700);
    const w2 = await ev((k) => { const M = window.__morada.M; const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5; const p = M.render.project(px, 1.2, pz); const e = M.render.pickEdge(p.clientX, p.clientY); return { x: p.clientX, y: p.clientY, side: e && e.key === k ? e.side : null }; }, w.k);
    const before = await ev((k) => ({ A: window.__morada.M.world.wallColor(k, 'A'), B: window.__morada.M.world.wallColor(k, 'B') }), w.k);
    await tap(w2.x, w2.y); await wait(400);
    const after = await ev((k) => ({ A: window.__morada.M.world.wallColor(k, 'A'), B: window.__morada.M.world.wallColor(k, 'B') }), w.k);
    const painted = after.A === 5 ? 'A' : after.B === 5 ? 'B' : null;
    const oneSide = painted && (after.A !== after.B || before.A === 5 || before.B === 5);
    // whole room via the toggle
    await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = true; window.__morada.M.ui.debug.ui.build.paper = 7; });
    await tap(w2.x, w2.y + 2); await wait(400);
    const room = await ev(([k, side]) => {
      const M = window.__morada.M; const t = M.world.edgeSideTile(k, side); const edges = M.world.roomEdges(t.x, t.y);
      return { n: edges.length, all: edges.every((e) => M.world.wallColor(e.key, e.side) === 7) };
    }, [w.k, painted || w2.side || 'B']);
    await ev(() => { window.__morada.M.ui.debug.ui.build.wholeRoom = false; });
    return { ok: !!oneSide && room.all && room.n > 3, key: w.k, sideUnderCursor: w2.side, before, after, room };
  });
  await check('BB-6 door confirmation stays up', async () => {
    await ev(() => { const M = window.__morada.M; M.ui.setMode('build'); M.ui.debug.setBuildTool('door'); });
    const w = await ev(() => {
      const M = window.__morada.M, st = M.engine.state;
      for (const k of Object.keys(st.lot.walls)) {
        if (st.lot.walls[k].t !== 1 || !M.world.canBuildWall(k, 2).ok) continue;
        const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5;
        M.render.focus(px, pz, true); M.render.pan(0, 0);
        const p = M.render.project(px, 1.0, pz);
        const e = M.render.pickEdge(p.clientX, p.clientY);
        if (e && e.key === k) return { k };
      }
      return null;
    });
    await wait(700);
    const p = await ev((k) => { const M = window.__morada.M; M.render.pan(0, 0); const [kind, x, y] = k.split(','); const px = kind === 'h' ? +x + 0.5 : +x, pz = kind === 'h' ? +y : +y + 0.5; const q = M.render.project(px, 1.0, pz); const e = M.render.pickEdge(q.clientX, q.clientY); return { x: q.clientX, y: q.clientY, hit: e && e.key }; }, w.k);
    // record every change of the tip with a MutationObserver (frames are slow in software GL, timers fire late)
    await ev(() => {
      const tip = document.getElementById('tip');
      window.__tipLog = [];
      const rec = () => window.__tipLog.push({ t: performance.now(), txt: tip.hidden ? null : tip.textContent, bad: tip.classList.contains('bad') });
      window.__tipObs = new MutationObserver(rec);
      window.__tipObs.observe(tip, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    });
    const flash = await ev(([x, y]) => {
      const v = document.getElementById('view');
      const mk = (type) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse', clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true });
      v.dispatchEvent(mk('pointerdown')); v.dispatchEvent(mk('pointerup'));
      return { t: performance.now(), until: window.__morada.M.ui.debug.ui.flashUntil };
    }, [p.x, p.y]);
    await wait(2500);
    await page.mouse.move(p.x + 2, p.y + 1); await wait(600);
    const log = await ev(() => { window.__tipObs.disconnect(); return window.__tipLog.slice(); });
    const during = log.filter((q) => q.t < flash.until - 5);
    const isDoor = await ev((k) => window.__morada.M.engine.state.lot.walls[k].t === 2, w.k);
    const seq = log.map((q) => Math.round(q.t - flash.t) + ':' + (q.bad ? 'BAD:' : '') + q.txt);
    const early = during;
    const afterBad = log.filter((q) => q.t >= flash.until && q.bad).length;
    return { ok: isDoor && early.length >= 1 && early.every((q) => q.txt && /Porta instalada/.test(q.txt) && !q.bad) && !afterBad, flashMs: Math.round(flash.until - flash.t), seq };
  });
  if (touch) await check('IMP touch: one-finger drag pans with the door tool', async () => {
    await ev(() => { const M = window.__morada.M; M.ui.setMode('build'); M.ui.debug.setBuildTool('door'); });
    await wait(300);
    const c0 = await ev(() => window.__morada.M.render.getCamera());
    const walls0 = await ev(() => JSON.stringify(window.__morada.M.engine.state.lot.walls));
    await ev(() => {
      const v = document.getElementById('view');
      const mk = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true });
      v.dispatchEvent(mk('pointerdown', 150, 300));
      for (let i = 1; i <= 8; i++) v.dispatchEvent(mk('pointermove', 150 + i * 12, 300 + i * 6));
      v.dispatchEvent(mk('pointerup', 246, 348));
    });
    await wait(400);
    const c1 = await ev(() => window.__morada.M.render.getCamera());
    const walls1 = await ev(() => JSON.stringify(window.__morada.M.engine.state.lot.walls));
    return { ok: Math.hypot(c1.x - c0.x, c1.z - c0.z) > 0.5 && walls0 === walls1, moved: Math.hypot(c1.x - c0.x, c1.z - c0.z) };
  });

  // ---------------------------------------------------------------- family creator + checklist
  await check('IMP create family enforces 25 points; checklist after moving to an empty lot', async () => {
    await ev(() => window.__morada.M.ui.openCreateFamily());
    await wait(300);
    // empty one trait so points are left
    await ev(() => { const r = document.getElementById('cf-p-0-neat'); r.value = '0'; r.dispatchEvent(new Event('input')); });
    await ev(() => document.getElementById('cf-next').click());
    await wait(200);
    const err = await ev(() => document.querySelector('.form-error').textContent);
    const step1 = await ev(() => !!document.getElementById('cf-household'));
    await ev(() => document.getElementById('cf-fill-0').click());
    const pts = await ev(() => document.querySelector('.points').textContent);
    await ev(() => document.getElementById('cf-next').click());
    await wait(200);
    await ev(() => document.getElementById('cf-lot-empty').click());
    await ev(() => document.getElementById('cf-go').click());
    await wait(1500);
    const cl = await ev(() => { const c = document.getElementById('checklist'); return c && !c.hidden ? { n: c.querySelectorAll('li').length, ok: c.querySelectorAll('li.ok').length, text: c.textContent } : null; });
    // buy a bed → ticks
    await ev(() => { const M = window.__morada.M; for (let y = 2; y < 15; y++) for (let x = 2; x < 20; x++) { if (M.world.canPlace('bed_single', x, y, 0).ok) { M.engine.buyObject('bed_single', x, y, 0); return; } } });
    await wait(1300);
    const cl2 = await ev(() => { const c = document.getElementById('checklist'); return c && !c.hidden ? c.querySelectorAll('li.ok').length : null; });
    return { ok: /pontos/.test(err) && step1 && /Todos os 25/.test(pts) && cl && cl.n === 7 && cl2 === cl.ok + 1, err, pts, checklist: cl, afterBed: cl2 };
  });

  // ---------------------------------------------------------------- thumbnails + bubbles
  await check('IMP catalog thumbnails pre-rendered after boot; bubbles use transforms', async () => {
    const r = await ev(() => {
      const U = window.__morada.M.ui.debug.ui;
      const n = Object.keys(U.thumbs).filter((k) => U.thumbs[k] && U.thumbs[k] !== 'fail').length;
      const total = window.__morada.M.data.CATALOG_LIST.filter((d) => d.buyable !== false && d.cat !== 'system').length;
      const b = document.querySelector('.bubble');
      return { n, total, bubble: b ? { left: b.style.left, tf: b.style.transform.slice(0, 20) } : null };
    });
    return { ok: r.n >= r.total * 0.8 && (!r.bubble || (!r.bubble.left && /translate3d/.test(r.bubble.tf))), ...r };
  });

  const pass = results.filter((r) => r.ok).length;
  return { viewport: vp.width + 'x' + vp.height + (touch ? ' touch' : ''), pass, fail: results.length - pass, failed: results.filter((r) => !r.ok).map((r) => r.id), results };
}

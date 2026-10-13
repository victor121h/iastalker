// QA live: phone submenus (call/invite specific), pizza arrival + eating, newspaper job accept, mailbox bills,
// socials on household / guest / walk-by, tabs. Real mouse/touch for every UI step.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_social.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'social');
  const out = { problems: [] };
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const id = (type) => L.ev((t) => { const o = window.__morada.state.objects.find((q) => q.type === t); return o ? o.id : null; }, type);
  const clearQ = (sid) => L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); }, sid);
  const openOn = async (oid) => {
    const o = await L.ev((i) => { const q = window.__morada.M.engine.objectById(i); return { x: q.x, y: q.y }; }, oid);
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(400);
    const sp = await L.objFind(oid);
    if (!sp) return null;
    await L.tap(sp.x, sp.y); await L.wait(420);
    return L.pie();
  };
  const closePie = async () => { if (await L.pie()) { if (L.touch) { await L.settle(); await L.tap(4, 200); } else await page.keyboard.press('Escape'); await L.wait(200); } };
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  await clearQ(sel);

  // ---- phone: Ligar para… submenu
  const phone = await id('phone');
  let pie = await openOn(phone);
  out.phoneRoot = pie && pie.items.map((i) => i.t + (i.cat ? ' >' : ''));
  await L.clickPie(/^Ligar para/); await L.wait(300);
  pie = await L.pie();
  out.phoneCallSub = pie && { title: pie.title, items: pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : '')) };
  await L.shot('1-phone-call-sub');
  // back via centre button
  const center = await L.ev(() => { const c = document.querySelector('#pie .pie-center'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: c.getAttribute('aria-label') }; });
  out.phoneCenter = center && center.label;
  if (center) { await L.settle(); await L.tap(center.x, center.y); await L.wait(300); }
  pie = await L.pie();
  out.phoneAfterBack = pie && pie.items.map((i) => i.t);
  // Escape in submenu should go back one level
  if (!L.touch && pie) {
    await L.clickPie(/^Convidar/); await L.wait(250);
    out.inviteSub = (await L.pie()).items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.shot('2-phone-invite-sub');
    await page.keyboard.press('Escape'); await L.wait(200);
    const p2 = await L.pie();
    out.escInSub = p2 && p2.items.map((i) => i.t);
  }
  // choose a specific neighbour to call
  pie = await L.pie(); if (!pie) pie = await openOn(phone);
  await L.clickPie(/^Ligar para/); await L.wait(100); await L.settle();
  pie = await L.pie();
  const named = pie.items.find((i) => !/Qualquer/.test(i.t) && !i.dis);
  out.callNamed = named && named.t;
  await L.tap(named.x, named.y); await L.wait(200);
  out.callQueued = (await L.queue(sel)).map((a) => a.label);
  const r1 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 120; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase + ':' + s.anim : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); if (!a) break; } return seen; }, sel);
  out.callRun = r1; out.callNotes = await L.notes();
  // ---- invite a specific neighbour
  pie = await openOn(phone);
  await L.clickPie(/^Convidar/); await L.wait(100); await L.settle();
  pie = await L.pie();
  const inv = pie.items.find((i) => !/Quem estiver/.test(i.t) && !i.dis);
  out.inviteNamed = inv && inv.t;
  await L.tap(inv.x, inv.y); await L.wait(200);
  out.inviteQueued = (await L.queue(sel)).map((a) => a.label);
  const r2 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 240 && s.queue.length; i++) E.update(0.5); const vis = []; for (let i = 0; i < 200; i++) { E.update(0.5); const v = E.visitors(); if (v.length) { vis.push(v.map((q) => q.name + ':' + q.role)); if (v.some((q) => q.role === 'guest' && Math.hypot(q.x - s.x, q.y - s.y) < 30)) break; } } return { vis: vis.slice(-1), t: E.state.time }; }, sel);
  out.inviteRun = r2; out.inviteNotes = await L.notes();
  // ---- socials on the guest (real click on the guest)
  const guest = await L.ev(() => { const v = window.__morada.M.engine.visitors().find((q) => q.role === 'guest'); return v ? { id: v.id, name: v.name, x: v.x, y: v.y } : null; });
  out.guest = guest;
  if (guest) {
    // let the guest walk in for a while
    await L.step(30);
    const g = await L.ev((gid) => { const s = window.__morada.M.engine.simById(gid); return { x: s.x, y: s.y, q: s.queue.map((a) => a.label) }; }, guest.id);
    out.guestState = g;
    await L.focus(g.x, g.y); await L.wait(500);
    const sp = await L.simScreen(guest.id, 1.0);
    await L.tap(sp.x, sp.y); await L.wait(420);
    pie = await L.pie();
    out.guestPie = pie && { title: pie.title, items: pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : '')) };
    await L.shot('3-guest-pie');
    // hover label on guest (desktop)
    if (!L.touch) { await closePie(); await page.mouse.move(sp.x, sp.y); await L.wait(300); out.guestHover = await L.ev(() => { const l = document.getElementById('hover-label'); return l && !l.hidden ? l.textContent : null; }); await L.tap(sp.x, sp.y); await L.wait(420); }
    const it = await L.clickPie(/^Conversar/);
    out.guestTalk = !!it;
    const r3 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); const seen = []; for (let i = 0; i < 80; i++) { E.update(0.5); const a = s.queue[0]; const k = a ? a.label + ':' + a.phase : 'none'; if (seen[seen.length - 1] !== k) seen.push(k); if (!a) break; } return seen; }, sel);
    out.guestTalkRun = r3; out.guestTalkNotes = await L.notes();
    // goodbye
    const g2 = await L.ev((gid) => { const s = window.__morada.M.engine.simById(gid); return s ? { x: s.x, y: s.y } : null; }, guest.id);
    if (g2) {
      await L.focus(g2.x, g2.y); await L.wait(400);
      const sp2 = await L.simScreen(guest.id, 1.0);
      await L.tap(sp2.x, sp2.y); await L.wait(420);
      pie = await L.pie();
      out.guestPie2 = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t);
      const bye = await L.clickPie(/Despedir|Mandar embora|Tchau/i);
      out.goodbyeClicked = bye && bye.t;
      await L.step(30);
      out.goodbyeNotes = await L.notes();
      out.guestAfterBye = await L.ev((gid) => { const s = window.__morada.M.engine.simById(gid); return s ? { role: s.role, q: s.queue.map((a) => a.label), x: s.x, y: s.y } : 'gone'; }, guest.id);
      await closePie();
    }
  }
  // ---- walk-by
  await clearQ(sel);
  await L.ev(() => { const st = window.__morada.state; st.walkbyAt = st.time.day * 1440 + Math.floor(st.time.minute) + 1; });
  await L.step(3);
  const wb = await L.ev(() => { const v = window.__morada.M.engine.visitors().find((q) => q.role === 'walkby'); return v ? { id: v.id, name: v.name, x: v.x, y: v.y } : null; });
  out.walkby = wb; out.walkbyNotes = await L.notes();
  if (wb) {
    await L.step(4);
    const p = await L.ev((i) => { const s = window.__morada.M.engine.simById(i); return { x: s.x, y: s.y }; }, wb.id);
    await L.focus(p.x, p.y); await L.wait(500);
    const sp = await L.simScreen(wb.id, 1.0);
    out.walkbyPick = sp.pick;
    await L.tap(sp.x, sp.y); await L.wait(420);
    pie = await L.pie();
    out.walkbyPie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.shot('4-walkby-pie');
    const g = await L.clickPie(/Cumprimentar/);
    out.greetClicked = !!g;
    const r = await L.ev(([sid, wid]) => { const E = window.__morada.M.engine; const s = E.simById(sid); const w = E.simById(wid); const seen = []; for (let i = 0; i < 120; i++) { E.update(0.5); const a = s.queue[0]; const k = (a ? a.label + ':' + a.phase : 'none') + ' / ' + (w ? w.role + ':' + Math.round(w.x) + ',' + Math.round(w.y) : 'gone'); if (seen[seen.length - 1] !== k) seen.push(k); if (!a) break; } return seen.slice(0, 15); }, [sel, wb.id]);
    out.greetRun = r; out.greetNotes = await L.notes();
  }
  // ---- newspaper: accept the job offer for the selected (unemployed) sim
  {
    await clearQ(sel);
    const np = await id('newspaper');
    out.newspaperExists = !!np;
    if (np) {
      pie = await openOn(np);
      out.newsPie = pie && pie.items.map((i) => ({ t: i.t, sw: i.sw, cw: i.cw, w: i.w }));
      const offerTitle = await L.ev(() => { const b = Array.from(document.querySelectorAll('#pie .pie-item')).find((x) => /Aceitar vaga/.test(x.textContent)); return b ? { title: b.title, label: b.querySelector('.p-label').textContent, sw: b.querySelector('.p-label').scrollWidth, cw: b.querySelector('.p-label').clientWidth } : null; });
      out.newsOfferLabel = offerTitle;
      const acc = await L.clickPie(/Aceitar vaga/);
      out.acceptClicked = !!acc;
      out.acceptQueue = (await L.queue(sel)).map((a) => a.label);
      const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 120 && s.queue.length; i++) E.update(0.5); return { career: s.career, info: E.careerInfo(sid) && E.careerInfo(sid).title }; }, sel);
      out.acceptResult = r; out.acceptNotes = await L.notes();
    }
  }
  // ---- tabs (real clicks)
  {
    if (L.touch) {
      const t = await L.ev(() => { const b = document.getElementById('needs-toggle'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
      out.needsToggle = t;
      if (t.vis) { await L.tap(t.x, t.y); await L.wait(350); }
    }
    const tabs = await L.ev(() => Array.from(document.querySelectorAll('.tabs .tab')).map((b) => { const r = b.getBoundingClientRect(); return { id: b.id, x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 && r.height > 0 }; }));
    out.tabs = {};
    for (const t of tabs) {
      if (!t.vis) { out.tabs[t.id] = 'invisible'; continue; }
      await L.tap(t.x, t.y); await L.wait(350);
      out.tabs[t.id] = await L.ev(() => { const b = document.getElementById('tab-body'); const kids = Array.from(b.querySelectorAll('*')); const clipped = kids.filter((k) => k.scrollWidth > k.clientWidth + 1 && getComputedStyle(k).overflow !== 'visible' && k.clientWidth > 0).map((k) => k.className + ':' + k.textContent.slice(0, 50)); return { text: b.innerText.slice(0, 700), scrollH: b.scrollHeight, clientH: b.clientHeight, clipped }; });
      await L.shot('5-tab-' + t.id);
    }
  }
  // ---- mailbox with bills: advance to day 4 09:05
  {
    await clearQ(sel);
    await L.ev(() => window.__morada.M.engine.setFreeWill(true));
    const r = await L.ev(() => { const E = window.__morada.M.engine; const st = E.state; let n = 0; while (!(st.bills || []).length && n < 20000) { E.update(0.5); n++; } return { t: st.time, bills: st.bills }; });
    out.billsArrived = r; out.billNotes = (await L.notes()).filter((n) => /conta|cobr/i.test(n));
    const mb = await id('mailbox');
    await L.ev(() => { const E = window.__morada.M.engine; for (let i = 0; i < 2000 && !E.household().some((s) => !s.hidden); i++) E.update(0.5); });
    const home = await L.ev(() => { const h = window.__morada.M.engine.household().find((s) => !s.hidden && !s.asleep) || window.__morada.M.engine.household().find((s) => !s.hidden); return h ? h.id : null; });
    out.billSim = home;
    const ptr = await L.ev((hid) => { const b = document.querySelector('.portrait[data-sim="' + hid + '"]'); if (!b) return { none: Array.from(document.querySelectorAll('.portrait')).map((q) => q.dataset.sim + ':' + q.title).join(';'), mode: window.__morada.M.ui.mode, dock: document.getElementById('dock').hidden, hh: window.__morada.M.engine.household().map((s) => s.id + s.name + (s.hidden ? 'H' : '')) }; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, home);
    out.billPortrait = ptr;
    if (ptr.x != null) { await L.tap(ptr.x, ptr.y); await L.wait(250); }
    await clearQ(home);
    pie = await openOn(mb);
    out.mailboxPie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    await L.shot('6-mailbox-pie');
    const m0 = await L.ev(() => window.__morada.state.money);
    const pay = await L.clickPie(/Pagar/);
    out.payClicked = pay && pay.t;
    out.payQueue = (await L.queue(home)).map((a) => a.label + '|' + a.src);
    const r2 = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 200 && s.queue.some((a) => a.source === 'player'); i++) E.update(0.5); return { bills: E.state.bills, money: E.state.money, q: s.queue.map((a) => a.label) }; }, home);
    out.payResult = Object.assign(r2, { m0 }); out.payNotes = await L.notes();
  }
  out.errs = await L.errs();
  return out;
}

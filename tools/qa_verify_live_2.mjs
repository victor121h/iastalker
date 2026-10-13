// Verify LIVE-2 (job switch without confirmation), LIVE-3 (pie label clipping), LIVE-6 (bad-mood advice).
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_verify_live_2.mjs [--touch --w 390 --h 844]
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l2');
  const out = {};
  await V.installNotes();
  await V.speed(0);
  const setup = await V.ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    E.setFreeWill(false);
    const rita = E.household().find((s) => s.name.startsWith('Rita'));
    E.selectSim(rita.id); M.ui.selectSim && M.ui.selectSim(rita.id);
    rita.career = { track: 'negocios', level: 4, performance: 60, daysWorked: 10, missedDays: 0, hiredAt: 0, lastShift: 0 };
    const paper = st.objects.find((o) => o.type === 'newspaper');
    return { rita: rita.id, paper: paper && { id: paper.id, offer: paper.offer, x: paper.x, y: paper.y }, tracks: Object.keys(M.data.CAREERS) };
  });
  out.setup = setup;
  if (setup.paper && setup.paper.offer === 'negocios') {
    // ensure a different track offer
    await V.ev((pid) => { const o = window.__morada.M.engine.objectById(pid); o.offer = 'artes'; }, setup.paper.id);
  }
  out.careerBefore = await V.ev((id) => { const i = window.__morada.M.engine.careerInfo(id); return i && [i.trackName, i.level, i.title, i.pay]; }, setup.rita);
  await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [setup.paper.x, setup.paper.y]);
  await V.speed(1); await V.wait(500); await V.speed(0);
  const pt = await V.objFind(setup.paper.id);
  out.paperPt = pt;
  if (pt) {
    await V.tap(pt.x, pt.y); await V.settle();
    const pie = await V.pie();
    out.paperPie = pie && pie.map((i) => ({ t: i.t, dis: i.dis, w: i.w, labelScroll: i.lsw, labelClient: i.lcw, clipped: i.lsw > i.lcw + 1, title: i.title }));
    await V.shot('paper-pie');
    const it = await V.clickPie(/Aceitar vaga/);
    out.clickedAccept = !!it;
    await V.wait(400);
    out.confirmModal = await V.ev(() => !!document.querySelector('.modal, [role=dialog]:not([hidden])'));
    out.queueAfterClick = await V.ev((id) => window.__morada.M.engine.simById(id).queue.map((a) => a.label), setup.rita);
    await V.step(30);
    out.careerAfter = await V.ev((id) => { const i = window.__morada.M.engine.careerInfo(id); return i && [i.trackName, i.level, i.title, i.pay]; }, setup.rita);
    out.notes2 = (await V.notes()).filter((n) => /trabalha|vaga/i.test(n));
  }
  // LIVE-3 phone pie labels
  const phone = await V.ev(() => { const o = window.__morada.M.engine.state.objects.find((o) => o.type === 'phone'); return o && { id: o.id, x: o.x, y: o.y }; });
  await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [phone.x, phone.y]);
  await V.speed(1); await V.wait(500); await V.speed(0);
  const pp = await V.objFind(phone.id);
  if (pp) {
    await V.tap(pp.x, pp.y); await V.settle();
    const pie = await V.pie();
    out.phonePie = pie && pie.map((i) => ({ t: i.t, clipped: i.lsw > i.lcw + 1, w: i.w }));
    await V.shot('phone-pie');
    await V.closePie();
  }
  // LIVE-6: bad mood
  await V.ev((id) => {
    const E = window.__morada.M.engine; const s = E.simById(id);
    for (const a of s.queue.slice()) E.cancelAction(s.id, a.id);
    Object.assign(s.motives, { hunger: -40, energy: -40, bladder: -40, hygiene: -40, comfort: -60, fun: -100, social: -95, room: -100 });
  }, setup.rita);
  await V.step(2);
  out.mood = await V.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); return { mood: Math.round(E.mood(s)), motives: Object.fromEntries(Object.entries(s.motives).map(([k, v]) => [k, Math.round(v)])) }; }, setup.rita);
  await V.notes();
  const tv = await V.ev(() => { const o = window.__morada.M.engine.state.objects.find((o) => /^tv/.test(o.type)); return o && { id: o.id, x: o.x, y: o.y }; });
  await V.ev(([x, y]) => window.__morada.M.render.focus(x + 0.5, y + 0.5, true), [tv.x, tv.y]);
  await V.speed(1); await V.wait(400); await V.speed(0);
  await V.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); Object.assign(s.motives, { hunger: -40, energy: -40, bladder: -40, hygiene: -40, comfort: -60, fun: -100, social: -95, room: -100 }); }, setup.rita);
  const tp = await V.objFind(tv.id);
  if (tp) {
    await V.tap(tp.x, tp.y); await V.settle();
    out.tvPie = (await V.pie() || []).map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    const it = await V.clickPie(/Assistir|TV/);
    await V.wait(300);
    out.tvClickTip = await V.tip();
    out.tvClickNotes = await V.notes();
    await V.closePie();
  }
  // what does the bubble say?
  out.bubble = await V.ev((id) => { const s = window.__morada.M.engine.simById(id); return s.bubble; }, setup.rita);
  // engine-level path that the original report used
  out.engineQueue = await V.ev(([sid, tid]) => { const E = window.__morada.M.engine; const r = E.queueInteraction(sid, tid, 'watch', 'player'); return r; }, [setup.rita, tv.id]);
  out.engineQueueNotes = await V.notes();
  // which interactions remain enabled anywhere for fixing fun/social?
  out.enabledFunAnywhere = await V.ev((sid) => {
    const E = window.__morada.M.engine, D = window.__morada.M.data; const res = [];
    for (const o of E.state.objects) for (const it of E.getInteractions(sid, o.id)) {
      const def = D.interaction(o.type, it.key);
      if (it.enabled && def && def.rates && (def.rates.fun > 0 || def.rates.social > 0)) res.push(o.type + ':' + it.key);
    }
    return res;
  }, setup.rita);
  return out;
}

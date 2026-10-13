// QA live: carpool click, accepting a newspaper job while already employed (promoted), quitting.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_job.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'job');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const caio = await L.ev(() => window.__morada.M.engine.household().find((s) => s.career).id);
  // select Caio by portrait
  const p = await L.ev((id) => { const b = document.querySelector('.portrait[data-sim="' + id + '"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, caio);
  await L.tap(p.x, p.y); await L.wait(250);
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); s.queue.slice().forEach((a) => E.cancelAction(id, a.id)); for (let i = 0; i < 20; i++) E.update(0.5); }, caio);
  // carpool
  const cp = await L.ev(() => { const o = window.__morada.state.objects.find((q) => q.type === 'carpool'); return o ? { id: o.id, x: o.x, y: o.y } : null; });
  out.carpool = cp;
  if (cp) {
    await L.focus(cp.x + 1, cp.y + 0.5); await L.wait(500);
    const sp = await L.objFind(cp.id);
    out.carpoolClickable = !!sp;
    if (sp) {
      await L.tap(sp.x, sp.y); await L.wait(420);
      const pie = await L.pie();
      out.carpoolPie = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
      out.carpoolTip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
      await L.shot('carpool-pie');
      await L.ev(() => window.__morada.M.ui.closePie());
    }
    // carpool pie for Rita (unemployed)
  }

  // promote Caio (setup) then accept the newspaper job through the pie
  await L.ev((id) => { const s = window.__morada.M.engine.simById(id); s.career.level = 4; s.career.performance = 60; }, caio);
  const np = await L.ev(() => (window.__morada.state.objects.find((q) => q.type === 'newspaper') || {}).id);
  if (np) {
    const o = await L.ev((i) => { const q = window.__morada.M.engine.objectById(i); return { x: q.x, y: q.y }; }, np);
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(400);
    const sp = await L.objFind(np);
    await L.tap(sp.x, sp.y); await L.wait(420);
    const pie = await L.pie();
    out.newsPieCaio = pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : ''));
    const before = await L.ev((id) => JSON.stringify(window.__morada.M.engine.careerInfo(id) && [window.__morada.M.engine.careerInfo(id).trackName, window.__morada.M.engine.careerInfo(id).level, window.__morada.M.engine.careerInfo(id).title]), caio);
    const acc = await L.clickPie(/Aceitar vaga/);
    out.acceptClicked = acc && acc.t;
    out.confirmShown = await L.ev(() => !!document.querySelector('.modal, [role="dialog"]:not(#help-card)'));
    const r = await L.ev((id) => { const E = window.__morada.M.engine; const s = E.simById(id); for (let i = 0; i < 200 && s.queue.some((a) => a.source === 'player'); i++) E.update(0.5); const ci = E.careerInfo(id); return ci ? [ci.trackName, ci.level, ci.title] : null; }, caio);
    out.careerBefore = before; out.careerAfter = r; out.acceptNotes = await L.notes();
  }
  out.errs = await L.errs();
  return out;
}

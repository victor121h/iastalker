// QA live: order pizza twice, call maid twice, invite while guest present; money deltas & feedback.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_services.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'svc');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  const ph = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'phone').id);
  const usePhone = async (re, sub) => {
    await L.focus(11.5, 13.5); await L.wait(350);
    const p = await L.objFind(ph);
    await L.tap(p.x, p.y); await L.wait(400);
    if (sub) { await L.clickPie(sub); await L.wait(100); }
    const it = await L.clickPie(re);
    const m0 = await L.ev(() => window.__morada.state.money);
    const r = await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); for (let i = 0; i < 200 && s.queue.some((a) => a.source === 'player'); i++) E.update(0.5); return { money: E.state.money, events: (E.state.events || []).map((e) => e.kind) }; }, sel);
    return { clicked: it && it.t, m0, after: r, notes: await L.notes() };
  };
  out.pizza1 = await usePhone(/pizza/i);
  out.pizza2 = await usePhone(/pizza/i);
  out.maid1 = await usePhone(/faxineira/i);
  out.maid2 = await usePhone(/faxineira/i);
  out.invite1 = await usePhone(/Quem estiver/, /^Convidar/);
  out.invite2 = await usePhone(/Quem estiver/, /^Convidar/);
  // run 2 hours and see who arrives
  out.arrivals = await L.ev(() => { const E = window.__morada.M.engine; const seen = new Set(); for (let i = 0; i < 240; i++) { E.update(0.5); E.visitors().forEach((v) => seen.add(v.name + ':' + v.role)); } return Array.from(seen); });
  out.arrivalNotes = await L.notes();
  out.money = await L.ev(() => window.__morada.state.money);
  out.errs = await L.errs();
  return out;
}

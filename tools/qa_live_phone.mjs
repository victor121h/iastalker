// QA live: phone submenu named call / invite — instrumented.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_phone.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'phone');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => {
    const E = window.__morada.M.engine; window.__qi = [];
    const orig = E.queueInteraction;
    E.queueInteraction = function () { const r = orig.apply(this, arguments); window.__qi.push(Array.from(arguments).join(',') + ' => ' + r); return r; };
  });
  const phone = await L.ev(() => window.__morada.state.objects.find((q) => q.type === 'phone').id);
  const o = await L.ev((i) => { const q = window.__morada.M.engine.objectById(i); return { x: q.x, y: q.y }; }, phone);
  for (const which of ['Ligar para', 'Convidar']) {
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(400);
    const sp = await L.objFind(phone);
    await L.tap(sp.x, sp.y); await L.wait(420);
    await L.clickPie(new RegExp('^' + which)); await L.wait(100);
    await L.settle();
    const pie = await L.pie();
    out[which + '_items'] = pie.items.map((i) => i.t + ' @' + Math.round(i.x) + ',' + Math.round(i.y));
    const named = pie.items.find((i) => !/Qualquer|Quem estiver/.test(i.t) && !i.dis);
    const hit = await L.ev(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('.pie-item') ? e.closest('.pie-item').textContent : e.className || e.tagName) : null; }, [named.x, named.y]);
    out[which + '_hit'] = hit;
    await L.tap(named.x, named.y); await L.wait(250);
    out[which + '_pieAfter'] = (await L.pie()) ? 'still open' : 'closed';
    out[which + '_qi'] = await L.ev(() => window.__qi.splice(0));
    out[which + '_queue'] = (await L.queue(sel)).map((a) => a.label + '|' + a.src);
    out[which + '_notes'] = await L.notes();
    await L.shot('after-' + which.replace(' ', '_'));
    await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); }, sel);
    await L.step(2);
  }
  // also the "Qualquer vizinho" generic entry
  {
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(400);
    const sp = await L.objFind(phone);
    await L.tap(sp.x, sp.y); await L.wait(420);
    await L.clickPie(/^Ligar para/); await L.wait(100);
    await L.clickPie(/Qualquer/); await L.wait(250);
    out.any_qi = await L.ev(() => window.__qi.splice(0));
    out.any_queue = (await L.queue(sel)).map((a) => a.label + '|' + a.src);
  }
  out.errs = await L.errs();
  return out;
}

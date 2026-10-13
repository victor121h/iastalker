// QA live: fast mouse click on a pie item right after opening (300 ms guard), and item position during the fly-in.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_fastclick.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'fast');
  const out = {};
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  await L.ev(() => window.__morada.M.engine.setFreeWill(false));
  await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 10; i++) E.update(0.5); }, sel);
  const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'fridge_cheap').id);
  await L.focus(15, 10); await L.wait(500);
  // learn where the final item positions are
  let p = await L.objFind(fr);
  await page.mouse.click(p.x, p.y); await L.wait(100); await L.settle();
  const final = (await L.pie()).items.find((i) => /lanche/i.test(i.t));
  out.final = final;
  await page.keyboard.press('Escape'); await L.wait(300);
  for (const delay of [120, 250, 350]) {
    p = await L.objFind(fr);
    await page.mouse.click(p.x, p.y);
    await L.wait(delay);
    const before = await L.ev(([x, y]) => { const e = document.elementFromPoint(x, y); const pie = document.getElementById('pie'); const items = pie ? Array.from(pie.querySelectorAll('.pie-item')).map((b) => { const r = b.getBoundingClientRect(); return b.textContent + '@' + Math.round(r.left) + ',' + Math.round(r.top) + '-' + Math.round(r.right) + ',' + Math.round(r.bottom); }) : null; return { hit: e && (e.className || e.tagName), items, sinceOpen: window.__morada.M.ui.debug.ui.pie ? Math.round(performance.now() - window.__morada.M.ui.debug.ui.pie.openedAt) : null }; }, [final.x, final.y]);
    out['before' + delay] = before;
    await page.mouse.click(final.x, final.y);
    await L.wait(200);
    const q = (await L.queue(sel)).map((a) => a.label);
    out['delay' + delay] = { queued: q, pieStillOpen: !!(await L.pie()) };
    await L.ev((sid) => { const E = window.__morada.M.engine; const s = E.simById(sid); s.queue.slice().forEach((a) => E.cancelAction(sid, a.id)); for (let i = 0; i < 10; i++) E.update(0.5); window.__morada.M.ui.closePie(); }, sel);
    await L.wait(200);
  }
  out.errs = await L.errs();
  return out;
}

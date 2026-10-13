// Pie menu layout near screen edges, for objects with many interactions and for social menus.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `pie-${ctx.W}x${ctx.H}`);
  await L.dismissHelp();
  await page.evaluate(() => { const M = window.__morada.M; M.main.setSpeed(0); M.engine.setFreeWill(false); M.engine.state.money = 1e5; const r = M.engine.buyObject('computer', 2, 2, 0); window.__pc = r.obj && r.obj.id; });
  const targets = await page.evaluate(() => { const st = window.__morada.state; const f = (t) => st.objects.find(o => o.type === t).id; return { phone: f('phone'), fridge: f('fridge_cheap'), computer: window.__pc, caio: st.sims[1].id, mailbox: f('mailbox') }; });
  const W = ctx.W, H = ctx.H;
  const spots = [['c', W / 2, H / 2], ['tl', 10, 10], ['tr', W - 10, 10], ['bl', 10, H - 10], ['br', W - 10, H - 10], ['l', 5, H / 2], ['r', W - 5, H / 2], ['b', W / 2, H - 5]];
  const out = [];
  for (const [tname, tgt] of [['phone', { kind: 'object', id: targets.phone }], ['computer', { kind: 'object', id: targets.computer }], ['caio', { kind: 'sim', id: targets.caio }], ['fridge', { kind: 'object', id: targets.fridge }]]) {
    for (const [sname, x, y] of spots) {
      if (tname !== 'phone' && !['c', 'br', 'tl'].includes(sname)) continue;
      await page.evaluate(([x, y, t]) => window.__morada.M.ui.openPie(x, y, t), [x, y, tgt]);
      await L.wait(500);
      const m = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#pie .pie-item, #pie .pie-center, #pie .pie-title')).map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 28), l: r.left, t0: r.top, r: r.right, b: r.bottom, clip: e.querySelector('.p-label') ? e.querySelector('.p-label').scrollWidth > e.querySelector('.p-label').clientWidth + 1 : false }; });
        const off = items.filter(i => i.l < 0 || i.t0 < 0 || i.r > innerWidth || i.b > innerHeight).map(i => i.t);
        const ov = [];
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) { const A = items[a], B = items[b]; const ix = Math.min(A.r, B.r) - Math.max(A.l, B.l), iy = Math.min(A.b, B.b) - Math.max(A.t0, B.t0); if (ix > 1 && iy > 1) ov.push(A.t + ' x ' + B.t); }
        return { n: items.length, off, ov, clipped: items.filter(i => i.clip).map(i => i.t) };
      });
      const rec = { tname, sname, ...m };
      if (sname === 'c' || sname === 'br' || m.off.length || m.ov.length) rec.shot = await L.shot(`${tname}-${sname}`);
      out.push(rec);
      await page.evaluate(() => window.__morada.M.ui.closePie());
      await L.wait(150);
    }
  }
  // phone submenu (call a neighbour)
  await page.evaluate(([x, y, t]) => window.__morada.M.ui.openPie(x, y, t), [W * 0.8, H * 0.75, { kind: 'object', id: targets.phone }]);
  await L.wait(700);
  const sub = await page.evaluate(() => { const it = Array.from(document.querySelectorAll('#pie .pie-item.cat'))[0]; if (!it) return null; it.click(); return it.textContent; });
  await L.wait(700);
  out.push({ sub, shot: await L.shot('phone-sub') });
  return out;
}

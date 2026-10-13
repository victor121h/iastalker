// HUD screenshots in all modes at the current viewport + DOM overflow audit.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const tag = `hud-${ctx.W}x${ctx.H}${ctx.touch ? 't' : ''}`;
  const L = mk(page, ctx, tag);
  const res = {};
  res.help = await L.shot('0help');
  res.helpAudit = (await L.audit());
  await L.dismissHelp();
  await L.speed(1);
  await L.wait(1500);
  res.live = await L.shot('1live');
  res.liveAudit = await L.audit();
  // phone: open needs
  if (ctx.W <= 760) {
    await page.evaluate(() => { const b = document.getElementById('needs-toggle'); if (b) b.click(); });
    await L.wait(400);
    res.liveNeeds = await L.shot('1live-needs');
    res.liveNeedsAudit = await L.audit();
  }
  // other tabs of the needs panel
  const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#needs-panel .tab')).map(t => t.title || t.textContent.trim()));
  for (let i = 1; i < tabs.length; i++) {
    await page.evaluate((i) => { const t = document.querySelectorAll('#needs-panel .tab')[i]; if (t) t.click(); }, i);
    await L.wait(300);
    res['tab' + i] = await L.shot('1tab' + i);
    res['tab' + i + 'Audit'] = (await L.audit()).clipAnc;
  }
  await page.evaluate(() => { const t = document.querySelectorAll('#needs-panel .tab')[0]; if (t) t.click(); });
  await L.mode('buy');
  await L.wait(1200);
  res.buy = await L.shot('2buy');
  res.buyAudit = await L.audit();
  await L.mode('build');
  await L.wait(600);
  res.build = await L.shot('3build');
  res.buildAudit = await L.audit();
  await L.mode('live');
  await page.evaluate(() => window.__morada.M.ui.openOptions());
  await L.wait(600);
  res.options = await L.shot('4options');
  await page.evaluate(() => { const m = document.querySelector('#modal-root .modal-body'); if (m) m.scrollTop = 99999; });
  await L.wait(200);
  res.options2 = await L.shot('4options-bottom');
  await page.keyboard.press('Escape');
  await L.wait(300);
  await page.evaluate(() => window.__morada.M.ui.openCreateFamily());
  await L.wait(900);
  res.family = await L.shot('5family');
  await page.evaluate(() => { const m = document.querySelector('#modal-root .modal-body'); if (m) m.scrollTop = 600; });
  await L.wait(200);
  res.family2 = await L.shot('5family-mid');
  await page.evaluate(() => { const m = document.querySelector('#modal-root .modal-body'); if (m) m.scrollTop = 99999; });
  await L.wait(200);
  res.family3 = await L.shot('5family-bottom');
  res.familyAudit = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#modal-root *').forEach((el) => {
      const txt = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!txt) return;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push({ txt: txt.slice(0, 30), cls: el.className, sw: el.scrollWidth, cw: el.clientWidth });
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 1) out.push({ off: txt.slice(0, 30), right: r.right });
    });
    return out;
  });
  await page.keyboard.press('Escape');
  return res;
}

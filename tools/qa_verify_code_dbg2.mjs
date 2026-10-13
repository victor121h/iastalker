export default async function (page, ctx) {
  await page.evaluate(() => window.__morada.M.ui.setMode('buy'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/buy_mode.png' });
  const r = await page.evaluate(() => { const c = document.querySelector('#drawer .card'); const b = c.getBoundingClientRect(); const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { rect: [b.x, b.y, b.width, b.height], topEl: top && (top.className || top.tagName), same: c.contains(top) }; });
  try { await page.click('#drawer .card >> nth=0', { timeout: 1500, trial: true }); r.trial = 'ok'; } catch (e) { r.trial = e.message.split('\n').slice(0, 6).join(' | ').slice(0, 600); }
  return r;
}

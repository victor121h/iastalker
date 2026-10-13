// Buy catalog: every category, scrolled; record thumbnail sources (img vs emoji fallback).
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `cat-${ctx.W}`);
  await L.dismissHelp();
  await L.mode('buy');
  await L.wait(1500);
  const cats = await page.evaluate(() => Array.from(document.querySelectorAll('#drawer .cat-btn')).map(b => b.textContent.trim()));
  const out = { cats, pages: [] };
  for (let i = 0; i < cats.length; i++) {
    await page.evaluate((i) => document.querySelectorAll('#drawer .cat-btn')[i].click(), i);
    await L.wait(900);
    const info = await page.evaluate(() => Array.from(document.querySelectorAll('#drawer .card')).map(c => ({ name: (c.querySelector('.card-name') || {}).textContent, img: !!c.querySelector('.card-thumb img'), emoji: c.querySelector('.card-thumb img') ? '' : (c.querySelector('.card-thumb') || {}).textContent })));
    const r = await page.evaluate(() => { const d = document.getElementById('drawer').getBoundingClientRect(); return { x: d.left, y: d.top, width: d.width, height: d.height }; });
    const shots = [await L.shot(`c${i}-a`, r)];
    const more = await page.evaluate(() => { const c = document.querySelector('#drawer .catalog'); return c.scrollHeight > c.clientHeight + 4; });
    if (more) { await page.evaluate(() => { const c = document.querySelector('#drawer .catalog'); c.scrollTop = c.clientHeight - 40; }); await L.wait(500); shots.push(await L.shot(`c${i}-b`, r)); await page.evaluate(() => { const c = document.querySelector('#drawer .catalog'); c.scrollTop = 99999; }); await L.wait(500); shots.push(await L.shot(`c${i}-c`, r)); }
    out.pages.push({ cat: cats[i], n: info.length, emojiFallback: info.filter(x => !x.img).map(x => x.name + ':' + x.emoji), shots });
  }
  // hover detail on first card
  await page.evaluate(() => document.querySelectorAll('#drawer .cat-btn')[0].click());
  await L.wait(500);
  const card = await page.$('#drawer .card');
  const bb = await card.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await L.wait(400);
  out.hover = await L.shot('hover');
  // start placing the sofa and move the ghost over the lawn and over the house
  await page.evaluate(() => { const M = window.__morada.M; M.ui.debug.startPlacing && M.ui.debug.startPlacing('sofa_lux'); });
  await L.wait(300);
  for (const [nm, x, y] of [['ghost-lawn', 0.3, 0.3], ['ghost-house', 0.45, 0.5]]) {
    await page.mouse.move(ctx.W * x, ctx.H * y);
    await L.wait(400);
    await page.mouse.move(ctx.W * x + 3, ctx.H * y + 2);
    await L.wait(500);
    out[nm] = await L.shot(nm);
  }
  return out;
}

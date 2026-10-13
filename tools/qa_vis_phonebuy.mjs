import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'phonebuy');
  await L.dismissHelp();
  await L.mode('buy'); await L.wait(800);
  const card = await page.$('#drawer .card:nth-child(3)');
  const bb = await card.boundingBox();
  await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + 30);
  await L.wait(700);
  const out = { after: await L.shot('picked') };
  // tap on the lawn in front of the house to place the ghost
  const p = await page.evaluate(() => { const q = window.__morada.M.render.project(4.5, 0, 15.5); return [q.clientX, q.clientY]; });
  await page.touchscreen.tap(p[0], p[1]);
  await L.wait(700);
  out.ghost = await L.shot('ghost');
  out.audit = (await L.audit()).overlaps;
  return out;
}

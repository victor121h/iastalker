import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `fam2-${ctx.W}`);
  await L.dismissHelp();
  await page.evaluate(() => window.__morada.M.ui.openCreateFamily());
  await L.wait(700);
  // add members up to 4 to check grid
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#modal-root button')).find(b => /Adicionar morador/.test(b.textContent)); if (b && !b.disabled) b.click(); }); await L.wait(200); }
  const out = {};
  out.members = await L.shot('members4');
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#modal-root button')).find(b => /Escolher a casa/.test(b.textContent)); if (b) b.click(); });
  await L.wait(700);
  out.lot = await L.shot('lot');
  out.txt = await page.evaluate(() => document.querySelector('#modal-root') && document.querySelector('#modal-root').innerText.slice(0, 600));
  return out;
}

// BB-9: Delete in Build/Demolir does nothing; Backspace in Buy sells at once.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb9'); await v.help();
  const R = {};
  const objScreen = (type) => v.ev((type) => { const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === type); const p = M.render.project(o.x + 0.5, 0.35, o.y + 0.5); return { id: o.id, x: p.clientX, y: p.clientY, pick: M.render.pick(p.clientX, p.clientY) }; }, type);
  // Build > Demolir > click the end table once, press Delete
  await v.mode('build'); await v.tool('Demolir'); await v.wait(300);
  let o = await objScreen('end_table');
  await page.mouse.click(o.x, o.y); await v.wait(300);
  R.buildSel = await v.ev(() => ({ sel: window.__morada.M.ui.debug.ui.build.sel, tb: (document.getElementById('toolbar') || {}).textContent }));
  let m0 = await v.money();
  await page.keyboard.press('Delete'); await v.wait(300);
  R.buildAfterDelete = { exists: await v.ev((id) => !!window.__morada.M.engine.objectById(id), o.id), refund: await v.money() - m0, sel: await v.ev(() => window.__morada.M.ui.debug.ui.build.sel) };
  await page.keyboard.press('Escape'); await v.wait(200);
  // Buy > click the TV, press Backspace
  await v.mode('buy'); await v.wait(300);
  o = await objScreen('tv_cheap');
  await page.mouse.click(o.x, o.y); await v.wait(300);
  R.buySel = await v.ev(() => ({ sel: window.__morada.M.ui.debug.ui.buy.sel, tb: (document.getElementById('toolbar') || {}).textContent }));
  m0 = await v.money();
  await page.keyboard.press('Backspace'); await v.wait(300);
  R.buyAfterBackspace = { exists: await v.ev((id) => !!window.__morada.M.engine.objectById(id), o.id), refund: await v.money() - m0 };
  return R;
}

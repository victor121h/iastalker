// Wall item on a cut-away wall: ghost visible, bought item vanishes and cannot be selected.
import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'wallitem');
  await L.install(); await L.dismissHelp();
  await L.modeBtn('buy');
  await L.cam({ k: 0, dist: 18, x: 13, z: 13 });
  await L.wait(2000);
  await L.clickCard('painting_lux');
  const t = await L.tileScreen(13, 14);
  await L.hover(t.x, t.y);
  const ghost = await L.ev(() => { const p = window.__morada.M.ui.debug.ui.buy.placing; return p && { x: p.x, y: p.y, rot: p.rot, ok: p.ok }; });
  const tip = await L.tip();
  await L.shot('1-ghost-on-cut-wall');
  const m0 = await L.money();
  await page.mouse.click(t.x, t.y); await L.wait(500);
  const m1 = await L.money();
  const obj = await L.ev(() => window.__morada.state.objects.slice(-1)[0]);
  await page.mouse.move(t.x + 200, t.y - 200); await L.wait(800);
  await L.shot('2-after-buy');
  // try to select it by clicking where the ghost was (several points)
  let selected = null;
  for (const hgt of [1.2, 1.5, 0.3, 0.1]) {
    const p = await L.proj(13.5, hgt, 14.05);
    await page.mouse.click(p.x, p.y); await L.wait(250);
    const s = await L.ev(() => window.__morada.M.ui.debug.ui.buy.sel);
    if (s != null) { selected = { hgt, s }; break; }
  }
  const vis = await L.ev((id) => { const g = window.__morada.M.render.scene.children.find((c) => c.name === 'objects'); const m = g.children.find((c) => c.userData.objId === id); return m ? m.visible : 'nomesh'; }, obj.id);
  return { ghost, tip, cost: m0 - m1, obj: { id: obj.id, type: obj.type, x: obj.x, y: obj.y, rot: obj.rot }, meshVisible: vis, selected, errs: await L.errs() };
}

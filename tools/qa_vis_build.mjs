// Build mode visuals: wall drag ghost (mouse held), door hover on a wall, floor drag ghost, demolish preview.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `build-${ctx.W}`);
  await L.dismissHelp();
  await L.mode('build');
  await L.wait(500);
  const scr = (x, y) => page.evaluate(([x, y]) => { const p = window.__morada.M.render.project(x, 0, y); return [p.clientX, p.clientY]; }, [x, y]);
  const tool = (name) => page.evaluate((name) => { const b = Array.from(document.querySelectorAll('#drawer .tool-btn')).find(b => b.textContent.includes(name)); if (b) b.click(); return !!b; }, name);
  const out = {};
  await tool('Parede');
  let a = await scr(2, 2), b = await scr(6, 2), c = await scr(6, 5);
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 6 }); await page.mouse.move(c[0], c[1], { steps: 6 }); await L.wait(400);
  out.wallDrag = await L.shot('wall-drag');
  await page.mouse.up(); await L.wait(500);
  out.wallBuilt = await L.shot('wall-built');
  await tool('Porta');
  const d = await scr(4, 2.02);
  await page.mouse.move(d[0], d[1] - 30); await L.wait(150); await page.mouse.move(d[0], d[1] - 32); await L.wait(400);
  out.doorHover = await L.shot('door-hover');
  await tool('Piso');
  a = await scr(2.5, 6.5); b = await scr(5.5, 8.5);
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 6 }); await L.wait(400);
  out.floorDrag = await L.shot('floor-drag');
  await page.mouse.up(); await L.wait(500);
  await tool('Demolir');
  a = await scr(2, 2); b = await scr(6, 2);
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 6 }); await L.wait(400);
  out.demolish = await L.shot('demolish');
  await page.mouse.up();
  return out;
}

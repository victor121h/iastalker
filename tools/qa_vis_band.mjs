import { mk } from './qa_vis_lib.mjs';
import fs from 'node:fs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'band');
  const out = await page.evaluate(`(async () => { ${fs.readFileSync(new URL('./qa_vis_band.js', import.meta.url), 'utf8')} })()`);
  out.shot = await L.shot('minimal', { x: 0, y: 0, width: 600, height: 400 });
  return out;
}

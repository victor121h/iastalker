import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `w${ctx.W}x${ctx.H}`);
  await L.dismissHelp();
  const out = {};
  out.live = (await L.audit()).overlaps;
  await L.mode('buy'); await L.wait(600);
  out.buy = (await L.audit()).overlaps;
  out.shot = await L.shot('buy');
  return out;
}

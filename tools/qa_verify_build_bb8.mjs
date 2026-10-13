// BB-8: a freshly walled room without floor stays full height in cutaway.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb8'); await v.help();
  const R = {};
  await v.ev(() => {
    const E = window.__morada.M.engine;
    for (const k of ['h,19,2','h,20,2','h,21,2','h,19,5','h,20,5','h,21,5','v,19,2','v,19,3','v,19,4','v,22,2','v,22,3','v,22,4']) E.buildWall(k, 1, 0);
  });
  await v.mode('build'); await v.tool('Piso');
  await v.ev(() => window.__morada.M.render.setCamera({ k: 0, dist: 24, x: 20.5, z: 5 }));
  await v.wait(1500);
  const hts = () => v.ev(() => { const M = window.__morada.M; const out = {}; for (const k of ['h,20,5', 'v,22,3', 'h,20,2']) { const p = M.render.project(k[0] === 'h' ? +k.split(',')[1] + 0.5 : +k.split(',')[1], 0, k[0] === 'h' ? +k.split(',')[2] : +k.split(',')[2] + 0.5); out[k] = 'x'; } return out; });
  R.edgeHeightsFn = await v.ev(() => typeof window.__morada.M.render.edgeHeight);
  // centre tile pick through the wall
  const C = await v.proj(20.5, 0, 3.5);
  await v.hover(C.x, C.y);
  R.floorHoverTip = await v.tip();
  R.pickTileCentre = await v.ev(([x, y]) => window.__morada.M.render.pickTile(x, y), [C.x, C.y]);
  R.shotNoFloor = await v.shot('1-room-no-floor');
  await v.ev(() => { const E = window.__morada.M.engine; for (let y = 2; y <= 4; y++) for (let x = 19; x <= 21; x++) E.paintFloor(x, y, 1); });
  await v.wait(1500);
  R.shotFloor = await v.shot('2-room-floored');
  return R;
}

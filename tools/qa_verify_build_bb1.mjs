// BB-1: pickEdge tolerance on cut-down walls at the DEFAULT camera, starter house front wall.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb1'); await v.help();
  const R = {};
  await v.mode('build'); await v.tool('Porta'); await v.wait(800);
  R.cam = await v.ev(() => window.__morada.M.render.getCamera());
  R.wallMode = await v.ev(() => window.__morada.M.render.wallMode);
  // survey on edges h,13,14 (solid) and v,17,9 (solid east wall) at several heights on the outer face
  R.survey = await v.ev(() => {
    const M = window.__morada.M; const out = {};
    const run = (label, fn) => {
      const rows = [];
      for (let h = 0; h <= 1.6001; h += 0.1) { const p = fn(h); const e = M.render.pickEdge(p.clientX, p.clientY); rows.push(h.toFixed(1) + ':' + (e ? e.key : '-') + '@' + Math.round(p.clientY)); }
      out[label] = rows;
    };
    run('h13_14_mid', (h) => M.render.project(13.5, h, 14.05));
    run('h13_14_q1', (h) => M.render.project(13.2, h, 14.05));
    run('h13_14_q3', (h) => M.render.project(13.8, h, 14.05));
    run('v17_9_mid', (h) => M.render.project(17.05, h, 9.5));
    // stub height in px
    const a = M.render.project(13.5, 0, 14.05), b = M.render.project(13.5, 0.4, 14.05);
    out.stubPx = Math.round(a.clientY - b.clientY);
    const c = M.render.project(13.5, 2.6, 14.05); out.fullWallPx = Math.round(a.clientY - c.clientY);
    return out;
  });
  // Hover on the stub, then just above it (inside the ghost slab) and record tip + screenshot
  const P1 = await v.proj(13.5, 0.2, 14.05);
  await v.hover(P1.x, P1.y); R.tipOnStub = await v.tip(); R.shotStub = await v.shot('1-hover-stub');
  const P2 = await v.proj(13.5, 0.8, 14.05);
  await v.hover(P2.x, P2.y); R.tipAbove = await v.tip(); R.shotAbove = await v.shot('2-hover-above-stub');
  R.edgeAbove = await v.ev(([x, y]) => { const e = window.__morada.M.render.pickEdge(x, y); return e && e.key; }, [P2.x, P2.y]);
  // click above the stub
  const m0 = await v.money(); await page.mouse.click(P2.x, P2.y); await v.wait(250);
  R.clickAbove = { charged: m0 - await v.money(), wall: (await v.walls())['h,13,14'], tip: await v.tip() };
  // click on the stub
  const m1 = await v.money(); await page.mouse.click(P1.x, P1.y); await v.wait(250);
  R.clickStub = { charged: m1 - await v.money(), wall: (await v.walls())['h,13,14'] };
  // Walls up: same click works higher?
  await v.ev(() => window.__morada.M.render.setWallMode('up')); await v.wait(1200);
  R.upSurvey = await v.ev(() => { const M = window.__morada.M; const rows = []; for (let h = 0; h <= 2.5; h += 0.3) { const p = M.render.project(12.5, h, 14.05); const e = M.render.pickEdge(p.clientX, p.clientY); rows.push(h.toFixed(1) + ':' + (e ? e.key : '-')); } return rows; });
  return R;
}

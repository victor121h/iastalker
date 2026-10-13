// BB-2: characters picked through walls; in-use objects unselectable in Buy mode.
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb2'); await v.help();
  const R = {};
  // Pause, put Caio behind the south wall, walls up
  await v.ev(() => {
    const M = window.__morada.M; M.main.setSpeed(0);
    const caio = M.engine.household().find((s) => /Caio/.test(s.name));
    caio.queue.length = 0; caio.x = 14; caio.y = 13; caio.anim = 'idle'; caio.facing = 0;
    M.render.setWallMode('up');
    M.engine.selectSim(M.engine.household().find((s) => /Rita/.test(s.name)).id);
  });
  await v.wait(1500);
  R.occl = await v.ev(() => {
    const M = window.__morada.M; const out = [];
    for (const hgt of [0.5, 0.9, 1.2, 1.5]) {
      const p = M.render.project(14.5, hgt, 13.5);
      const pk = M.render.pick(p.clientX, p.clientY);
      out.push({ hgt, pick: pk, px: [Math.round(p.clientX), Math.round(p.clientY)] });
    }
    return out;
  });
  R.shotWall = await v.shot('1-caio-behind-wall-up');
  const P = await v.proj(14.5, 1.2, 13.5);
  await page.mouse.click(P.x, P.y); await v.wait(400);
  R.pieAfterWallClick = await v.ev(() => { const p = window.__morada.M.ui.debug && window.__morada.M.ui.debug.ui && window.__morada.M.ui.debug.ui.pie; const el = document.getElementById('pie'); return { pie: p ? { title: p.title, simTarget: p.targetSim && p.targetSim.name } : null, pieText: el && !el.hidden ? el.textContent.slice(0, 120) : null }; });
  R.shotPie = await v.shot('2-click-wall-pie');
  await page.keyboard.press('Escape'); await v.wait(200);
  // ---- Buy mode: Rita on the toilet
  await v.ev(() => {
    const M = window.__morada.M; M.render.setWallMode('cutaway');
    const caio = M.engine.household().find((s) => /Caio/.test(s.name)); caio.x = 10; caio.y = 8;
    const rita = M.engine.household().find((s) => /Rita/.test(s.name));
    const toilet = M.engine.state.objects.find((o) => o.type === 'toilet');
    rita.queue.length = 0; rita.x = 12; rita.y = 8; rita.motives.bladder = -50;
    M.engine.queueInteraction(rita.id, toilet.id, 'use', 'player');
    for (let i = 0; i < 80 && rita.anim !== 'toilet'; i++) M.engine.update(0.5);
  });
  await v.ev(() => window.__morada.M.main.setSpeed(1)); await v.wait(300); await v.ev(() => window.__morada.M.main.setSpeed(0));
  R.rita = await v.ev(() => { const r = window.__morada.M.engine.household().find((s) => /Rita/.test(s.name)); return { anim: r.anim, x: r.x, y: r.y, seated: r.seated }; });
  await v.mode('buy'); await v.wait(800);
  R.toiletSurvey = await v.ev(() => {
    const M = window.__morada.M; const toilet = M.engine.state.objects.find((o) => o.type === 'toilet');
    let sim = 0, obj = 0, other = 0; const W = 9;
    for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) for (const hgt of [0.1, 0.3, 0.5, 0.7]) {
      const p = M.render.project(toilet.x + 0.1 + 0.8 * i / (W - 1), hgt, toilet.y + 0.1 + 0.8 * j / (W - 1));
      const pk = M.render.pick(p.clientX, p.clientY);
      if (pk && pk.kind === 'sim') sim++; else if (pk && pk.kind === 'object' && pk.id === toilet.id) obj++; else other++;
    }
    return { sim, obj, other };
  });
  // Try a real click on the toilet's visible base front
  const T = await v.ev(() => { const M = window.__morada.M; const t = M.engine.state.objects.find((o) => o.type === 'toilet'); const p = M.render.project(t.x + 0.5, 0.2, t.y + 0.85); return { x: p.clientX, y: p.clientY, pick: M.render.pick(p.clientX, p.clientY) }; });
  await page.mouse.click(T.x, T.y); await v.wait(300);
  R.toiletClick = { pick: T.pick, sel: await v.ev(() => window.__morada.M.ui.debug.ui.buy.sel) };
  R.shotBuy = await v.shot('3-buy-toilet-in-use');
  return R;
}

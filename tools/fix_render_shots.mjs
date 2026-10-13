// Render fix round: before/after screenshots of the default game (day + night, default camera + close-ups).
// Usage: TAG=before node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_shots.mjs [--w 390 --h 844 --touch]
// Output: ../shots/fix_render/<TAG>-<W>x<H>-<name>.png
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const tag = process.env.TAG || 'shot';
  const dir = path.join(ctx.shotDir, 'fix_render');
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  const shot = async (name) => { const f = path.join(dir, `${tag}-${ctx.W}x${ctx.H}-${name}.png`); await page.screenshot({ path: f }); out.push(path.basename(f)); };
  await page.evaluate(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const setTime = async (m) => {
    await page.evaluate((m) => { const s = window.__morada.state; s.time.minute = m; }, m);
    await page.waitForTimeout(900);
  };
  await page.evaluate(() => { window.__morada.M.main.setSpeed && window.__morada.M.main.setSpeed(1); });
  await page.waitForTimeout(600);
  await shot('start');
  await setTime(12 * 60);
  await shot('noon');
  await setTime(22 * 60);
  await shot('night');
  // wider look at the lot at night and day
  const cam0 = await page.evaluate(() => window.__morada.M.render.getCamera());
  await page.evaluate(() => window.__morada.M.render.setCamera({ dist: 44 }));
  await page.waitForTimeout(500);
  await shot('night-wide');
  await setTime(12 * 60);
  await shot('noon-wide');
  await page.evaluate((c) => window.__morada.M.render.setCamera({ dist: c.dist, x: c.x, z: c.z }), cam0);
  await page.waitForTimeout(300);
  // rotate 180 to see the back
  await page.evaluate(() => window.__morada.M.render.setCamera({ k: 2 }));
  await page.waitForTimeout(600);
  await shot('noon-k2');
  await setTime(21 * 60 + 30);
  await shot('night-k2');
  await page.evaluate(() => window.__morada.M.render.setCamera({ k: 0 }));
  await setTime(10 * 60);
  // buy mode ghost
  const ghost = await page.evaluate(() => {
    const M = window.__morada.M;
    try { M.ui.setMode && M.ui.setMode('buy'); } catch (e) { /* ignore */ }
    return true;
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const M = window.__morada.M; M.render.showGhost('sofa_cheap', 8, 12, 0, true); });
  await page.waitForTimeout(400);
  await shot('buy-ghost');
  await page.evaluate(() => { const M = window.__morada.M; M.render.showGhost('armchair', 13, 9, 2, false); });
  await page.waitForTimeout(400);
  await shot('buy-ghost-bad');
  await page.evaluate(() => { const M = window.__morada.M; M.render.hideGhost(); try { M.ui.setMode('live'); } catch (e) { /* ignore */ } });
  await page.waitForTimeout(400);
  return { out, ghost };
}

// Render fix round: character close-ups (hair silhouettes, rounded torso, idle fidgets).
// Usage: node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_chars.mjs
import path from 'node:path';
import fs from 'node:fs';
export default async function (page, ctx) {
  const dir = path.join(ctx.shotDir, 'fix_render');
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  await page.evaluate(() => { const b = document.getElementById('help-ok'); if (b) b.click(); document.getElementById('hud').style.visibility = 'hidden'; });
  // add two more characters so every hair style shows up
  await page.evaluate(() => {
    const M = window.__morada.M, E = M.engine, S = E.state;
    E.setFreeWill && E.setFreeWill(false);
    const extra = [{ name: 'Lia Souza', gender: 'f' }, { name: 'Davi Souza', gender: 'm' }, { name: 'Bia Rocha', gender: 'f' }, { name: 'Téo Rocha', gender: 'm' }];
    for (const x of extra) { try { E.addSim && E.addSim(x); } catch (e) { /* ignore */ } }
    const hh = S.sims.filter((s) => !s.visitor);
    hh.forEach((s, i) => { s.hidden = false; s.atWork = false; s.queue = []; s.anim = 'idle'; s.seated = false; s.asleep = false; s.x = 3 + i * 1.2; s.y = 2; s.facing = 0.5; });
    M.render.setSelected(null);
    M.render.setCamera({ k: 0, dist: 9, x: 3 + (hh.length - 1) * 0.6 + 0.5, z: 2.8 });
    M.main.setSpeed(1);
  });
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(i ? 2200 : 900);
    await page.evaluate(() => { const S = window.__morada.state; S.sims.filter((s) => !s.visitor).forEach((s, i) => { s.queue = []; s.anim = 'idle'; s.x = 3 + i * 1.2; s.y = 2; }); });
    const f = path.join(dir, 'chars-' + i + '.png'); await page.screenshot({ path: f }); out.push(path.basename(f));
  }
  return out;
}

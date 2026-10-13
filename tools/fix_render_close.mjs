// Render fix round: close-up shots. Usage: CLOSE='[{"name":"k","x":15,"z":13,"dist":12,"k":0,"min":1320}]' node tools/integrate_check.mjs --clear --nohelp --script tools/fix_render_close.mjs
import path from 'node:path';
import fs from 'node:fs';
export default async function (page, ctx) {
  const dir = path.join(ctx.shotDir, 'fix_render');
  fs.mkdirSync(dir, { recursive: true });
  const list = JSON.parse(process.env.CLOSE || '[]');
  await page.evaluate(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  await page.evaluate(() => { const h = document.getElementById('hud'); if (h && process_hide()) h.style.visibility = 'hidden'; function process_hide() { return true; } });
  const out = [];
  for (const c of list) {
    await page.evaluate((c) => {
      const R = window.__morada.M.render, s = window.__morada.state;
      if (c.min != null) s.time.minute = c.min;
      if (c.walls) R.setWallMode(c.walls);
      R.setCamera({ k: c.k || 0, dist: c.dist || 14, x: c.x, z: c.z });
      if (c.eval) (new Function('M', 's', c.eval))(window.__morada.M, s);
    }, c);
    await page.waitForTimeout(c.wait || 1200);
    const f = path.join(dir, 'close-' + c.name + '.png');
    await page.screenshot({ path: f });
    out.push(path.basename(f));
  }
  return out;
}

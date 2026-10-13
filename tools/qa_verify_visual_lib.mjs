// verify_visual helpers
import path from 'node:path';
import fs from 'node:fs';
export const SHOTDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/verify_visual');
fs.mkdirSync(SHOTDIR, { recursive: true });
export function mk(page, ctx, tag) {
  return {
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name, clip) { const f = path.join(SHOTDIR, `${tag}-${name}.png`); await page.screenshot(clip ? { path: f, clip } : { path: f }); return path.basename(f); },
    async dismissHelp() { await page.evaluate(() => { const b = document.getElementById('help-ok'); if (b) b.click(); }); await page.waitForTimeout(150); },
    async setTime(minute) { await page.evaluate((m) => { window.__morada.state.time.minute = m; }, minute); await page.waitForTimeout(400); },
    async cam(o) { await page.evaluate((o) => window.__morada.M.render.setCamera(o), o); await page.waitForTimeout(250); },
    async walls(m) { await page.evaluate((m) => window.__morada.M.render.setWallMode(m), m); await page.waitForTimeout(800); },
    async hideHud() { await page.evaluate(() => { document.getElementById('hud').style.visibility = 'hidden'; }); },
  };
}

// Verifier (build angle) helpers.
import path from 'node:path'; import fs from 'node:fs';
export const SHOTDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/verify_build');
export function V(page, ctx, prefix) {
  fs.mkdirSync(SHOTDIR, { recursive: true });
  const tag = prefix + (ctx.touch ? '-phone' : '-desk');
  const o = {
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name) { const f = path.join(SHOTDIR, `${tag}-${name}.png`); await page.screenshot({ path: f }); return path.basename(f); },
    async help() { const b = await page.$('#help-ok'); if (b && await b.isVisible()) { await b.click(); await page.waitForTimeout(200); } },
    async mode(k) { await page.click('#mode-' + k); await page.waitForTimeout(400); },
    async tool(label) { const b = await page.$(`#drawer .tool-btn[title="${label}"]`); if (b) { await b.click(); await page.waitForTimeout(200); } return !!b; },
    proj: (x, y, z) => page.evaluate(([x, y, z]) => { const p = window.__morada.M.render.project(x, y, z); return { x: p.clientX, y: p.clientY }; }, [x, y, z]),
    tip: () => page.evaluate(() => { const t = document.getElementById('tip'); return t && !t.hidden ? { text: t.textContent, bad: t.classList.contains('bad') } : null; }),
    async hover(x, y) { await page.mouse.move(x - 6, y - 6); await page.mouse.move(x, y, { steps: 3 }); await page.waitForTimeout(120); },
    money: () => page.evaluate(() => window.__morada.state.money),
    walls: () => page.evaluate(() => JSON.parse(JSON.stringify(window.__morada.state.lot.walls))),
  };
  return o;
}

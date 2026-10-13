// QA visual helpers
import path from 'node:path';
import fs from 'node:fs';
export const SHOTDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/vis');
fs.mkdirSync(SHOTDIR, { recursive: true });

export function mk(page, ctx, tag) {
  const L = {
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name, clip) { const f = path.join(SHOTDIR, `${tag}-${name}.png`); await page.screenshot(clip ? { path: f, clip } : { path: f }); return path.basename(f); },
    async dismissHelp() { await page.evaluate(() => { const b = document.getElementById('help-ok'); if (b) b.click(); }); await page.waitForTimeout(150); },
    // run engine to a given minute (keeps sims sane), then set speed
    async setTime(minute) {
      await page.evaluate((m) => { const s = window.__morada.state; s.time.minute = m; }, minute);
      await page.waitForTimeout(400);
    },
    async cam(o) { await page.evaluate((o) => window.__morada.M.render.setCamera(o), o); await page.waitForTimeout(250); },
    async walls(m) { await page.evaluate((m) => window.__morada.M.render.setWallMode(m), m); await page.waitForTimeout(700); },
    async speed(s) { await page.evaluate((s) => window.__morada.M.main.setSpeed(s), s); },
    async mode(m) { await page.evaluate((m) => window.__morada.M.ui.setMode(m), m); await page.waitForTimeout(400); },
    // DOM overflow audit: elements whose text is clipped or that extend past the viewport
    async audit() {
      return page.evaluate(() => {
        const out = { clipped: [], offscreen: [], overlaps: [] };
        const vw = innerWidth, vh = innerHeight;
        const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const all = Array.from(document.querySelectorAll('#hud *'));
        for (const el of all) {
          if (!vis(el)) continue;
          let p = el, hidden = false; while (p && p !== document.body) { if (!vis(p)) { hidden = true; break; } p = p.parentElement; }
          if (hidden) continue;
          const r = el.getBoundingClientRect();
          const txt = (el.childNodes.length && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim().slice(0, 40) : '';
          if (txt && (el.scrollWidth > el.clientWidth + 1) && getComputedStyle(el).overflow !== 'visible') out.clipped.push({ sel: el.tagName.toLowerCase() + '.' + el.className, txt, sw: el.scrollWidth, cw: el.clientWidth });
          if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1) { if (el.closest('#bubbles') || el.closest('.catalog') || el.closest('.tab-body')) continue; out.offscreen.push({ sel: el.tagName.toLowerCase() + '#' + el.id + '.' + String(el.className).slice(0, 40), txt: (el.textContent || '').trim().slice(0, 30), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }); }
        }
        // ancestor-clipped text: text node rect exceeds a clipping ancestor
        const clipAnc = [];
        for (const el of all) {
          if (!vis(el)) continue;
          const txt = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
          if (!txt) continue;
          const r = el.getBoundingClientRect();
          let p = el.parentElement;
          while (p && p !== document.body) {
            const cs = getComputedStyle(p);
            if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') {
              const pr = p.getBoundingClientRect();
              if (r.right > pr.right + 1 || r.left < pr.left - 1) { clipAnc.push({ txt: txt.slice(0, 30), el: el.className, anc: p.id || p.className, er: [Math.round(r.left), Math.round(r.right)], pr: [Math.round(pr.left), Math.round(pr.right)] }); }
              break;
            }
            p = p.parentElement;
          }
        }
        out.clipAnc = clipAnc;
        // top-level panel overlaps
        const panels = ['#bar', '#dock', '#cam', '#drawer', '#toolbar', '#log-btn', '#toasts', '#log-panel'].map(s => [s, document.querySelector(s)]).filter(([s, e]) => e && vis(e));
        const rects = panels.map(([s, e]) => [s, e.getBoundingClientRect()]);
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const [a, ra] = rects[i], [b, rb] = rects[j];
          const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ix > 2 && iy > 2) out.overlaps.push({ a, b, ix: Math.round(ix), iy: Math.round(iy) });
        }
        out.panels = Object.fromEntries(rects.map(([s, r]) => [s, [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]]));
        return out;
      });
    },
  };
  return L;
}

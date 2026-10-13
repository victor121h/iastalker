// Shared helpers for the verify_live QA scripts (run through tools/integrate_check.mjs --script).
import path from 'node:path';
import fs from 'node:fs';
export const SHOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/verify_live');

export function lib(page, ctx, prefix) {
  fs.mkdirSync(SHOT, { recursive: true });
  const tag = prefix + (ctx.touch ? '-phone' : '-desk');
  const V = {
    touch: !!ctx.touch,
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name) { const f = path.join(SHOT, `${tag}-${name}.png`); await page.screenshot({ path: f }); return f; },
    async tap(x, y) { if (ctx.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
    async installNotes() {
      await page.evaluate(() => { window.__vn = []; window.__morada.M.util.bus.on('notify', (n) => window.__vn.push(n.kind + ': ' + n.text)); });
    },
    notes: () => page.evaluate(() => { const n = (window.__vn || []).slice(); if (window.__vn) window.__vn.length = 0; return n; }),
    pie: () => page.evaluate(() => {
      const el = document.getElementById('pie');
      if (!el) return null;
      return Array.from(el.querySelectorAll('.pie-item')).map((b) => {
        const r = b.getBoundingClientRect(); const l = b.querySelector('.p-label');
        return { t: l ? l.textContent : b.textContent, dis: b.getAttribute('aria-disabled') === 'true', why: (b.querySelector('.p-why') || {}).textContent || '', x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), lsw: l ? l.scrollWidth : 0, lcw: l ? l.clientWidth : 0, title: b.title || '' };
      });
    }),
    tip: () => page.evaluate(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }),
    toasts: () => page.evaluate(() => Array.from(document.querySelectorAll('#toasts .toast')).map((t) => { const r = t.getBoundingClientRect(); return { text: t.textContent.slice(0, 90), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), pe: getComputedStyle(t).pointerEvents }; })),
    closePie: () => page.evaluate(() => window.__morada.M.ui.closePie()),
    async settle() { await page.waitForTimeout(450); },
    async clickPie(re) {
      await V.settle();
      const p = await V.pie();
      if (!p) return null;
      const it = p.find((i) => re.test(i.t));
      if (!it) return null;
      await V.tap(it.x, it.y);
      await page.waitForTimeout(200);
      return it;
    },
    // screen point where pick() returns this object
    objFind: (id) => page.evaluate((id) => {
      const M = window.__morada.M; const o = M.engine.objectById(id); if (!o) return null;
      const s = M.world.rotatedSize ? M.world.rotatedSize(o.type, o.rot) : { w: 1, h: 1 };
      for (const hgt of [0.5, 0.9, 1.4, 0.2, 0.05, 1.8]) for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85]) {
        const p = M.render.project(o.x + s.w * fx, hgt, o.y + s.h * fy);
        if (!p.visible || p.clientX < 0 || p.clientY < 0 || p.clientX > innerWidth || p.clientY > innerHeight) continue;
        const el = document.elementFromPoint(p.clientX, p.clientY);
        if (!el || el.tagName !== 'CANVAS') continue;
        const pk = M.render.pick(p.clientX, p.clientY);
        if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY };
      }
      return null;
    }, id),
    sel: () => page.evaluate(() => window.__morada.state.settings.selectedSimId),
    speed: (s) => page.evaluate((s) => window.__morada.M.main.setSpeed(s), s),
    step: (min) => page.evaluate((min) => { const E = window.__morada.M.engine; for (let i = 0; i < min * 2; i++) E.update(0.5); }, min),
  };
  return V;
}

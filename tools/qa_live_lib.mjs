// QA (live angle) shared helpers for Playwright scripts run through tools/integrate_check.mjs --script.
import path from 'node:path';
import fs from 'node:fs';

export const SHOTDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/live');

export function mk(page, ctx, prefix) {
  fs.mkdirSync(SHOTDIR, { recursive: true });
  const touch = !!ctx.touch;
  const tag = prefix + (touch ? '-phone' : '-desk');
  const L = {
    touch,
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name) { const f = path.join(SHOTDIR, `${tag}-${name}.png`); await page.screenshot({ path: f }); return f; },
    async tap(x, y) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
    async install() {
      await page.evaluate(() => {
        window.__errs = []; window.__notes = [];
        const oe = console.error, ow = console.warn;
        console.error = function () { window.__errs.push('E ' + Array.from(arguments).map(String).join(' ').slice(0, 300)); return oe.apply(console, arguments); };
        console.warn = function () { window.__errs.push('W ' + Array.from(arguments).map(String).join(' ').slice(0, 300)); return ow.apply(console, arguments); };
        window.addEventListener('error', (e) => window.__errs.push('X ' + e.message));
        window.__morada.M.util.bus.on('notify', (n) => window.__notes.push(n.kind + ': ' + n.text));
      });
    },
    notes: () => page.evaluate(() => { const n = window.__notes.slice(); window.__notes.length = 0; return n; }),
    errs: () => page.evaluate(() => window.__errs.slice()),
    async dismissHelp() {
      const b = await page.$('#help-ok');
      if (b) { const r = await b.boundingBox(); await L.tap(r.x + r.width / 2, r.y + r.height / 2); await L.wait(200); }
    },
    async pie() {
      return page.evaluate(() => {
        const el = document.getElementById('pie');
        if (!el) return null;
        const t = el.querySelector('.pie-title');
        return {
          title: t ? t.textContent : '',
          items: Array.from(el.querySelectorAll('.pie-item')).map((b) => {
            const r = b.getBoundingClientRect();
            return { t: b.querySelector('.p-label') ? b.querySelector('.p-label').textContent : b.textContent, why: (b.querySelector('.p-why') || {}).textContent || '', dis: b.getAttribute('aria-disabled') === 'true', cat: b.classList.contains('cat'), x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, top: r.top, b: r.bottom, w: r.width, sw: b.scrollWidth, cw: b.clientWidth };
          }),
        };
      });
    },
    async settle() { await page.waitForFunction(() => { const el = document.getElementById('pie'); return !el || el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); }, null, { timeout: 4000 }).catch(() => {}); await L.wait(320); },
    async clickPie(re) {
      await L.settle();
      const p = await L.pie();
      if (!p) return null;
      const it = p.items.find((i) => re.test(i.t));
      if (!it) return null;
      await L.tap(it.x, it.y);
      await L.wait(150);
      return it;
    },
    focus: (x, y) => page.evaluate(([x, y]) => window.__morada.M.render.focus(x, y, true), [x, y]),
    objScreen: (id, hgt) => page.evaluate(([id, hgt]) => { const M = window.__morada.M; const o = M.engine.objectById(id); const s = M.world.rotatedSize ? M.world.rotatedSize(o.type, o.rot) : { w: 1, h: 1 }; const p = M.render.project(o.x + s.w / 2, hgt, o.y + s.h / 2); const pk = M.render.pick(p.clientX, p.clientY); return { x: p.clientX, y: p.clientY, vis: p.visible, pick: pk }; }, [id, hgt]),
    // find a screen point where pick() returns this object (scan around its projected footprint)
    objFind: (id) => page.evaluate((id) => {
      const M = window.__morada.M; const o = M.engine.objectById(id); if (!o) return null;
      const s = M.world.rotatedSize ? M.world.rotatedSize(o.type, o.rot) : { w: 1, h: 1 };
      const pts = [];
      for (const hgt of [0.5, 0.9, 1.4, 0.15, 0.03, 1.8]) for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) for (const fy of [0.5, 0.25, 0.75, 0.1, 0.9]) pts.push([o.x + s.w * fx, hgt, o.y + s.h * fy]);
      for (const [x, y, z] of pts) {
        const p = M.render.project(x, y, z);
        if (!p.visible) continue;
        if (p.clientX < 0 || p.clientY < 0 || p.clientX > innerWidth || p.clientY > innerHeight) continue;
        const pk = M.render.pick(p.clientX, p.clientY);
        if (pk && pk.kind === 'object' && pk.id === id) return { x: p.clientX, y: p.clientY, at: [x, y, z] };
      }
      return null;
    }, id),
    simScreen: (id, hgt) => page.evaluate(([id, hgt]) => { const M = window.__morada.M; const s = M.engine.simById(id); const p = M.render.project(s.x + 0.5, hgt, s.y + 0.5); return { x: p.clientX, y: p.clientY, vis: p.visible, pick: M.render.pick(p.clientX, p.clientY) }; }, [id, hgt == null ? 1.0 : hgt]),
    tileScreen: (x, y) => page.evaluate(([x, y]) => { const M = window.__morada.M; const p = M.render.project(x + 0.5, 0, y + 0.5); return { x: p.clientX, y: p.clientY, vis: p.visible, pick: M.render.pick(p.clientX, p.clientY) }; }, [x, y]),
    queue: (id) => page.evaluate((id) => { const s = window.__morada.M.engine.simById(id); return s.queue.map((a) => ({ id: a.id, label: a.label, src: a.source, phase: a.phase, icon: a.icon, cancel: !!a.cancel })); }, id),
    queueDom: () => page.evaluate(() => Array.from(document.querySelectorAll('#dock .queue .q-item')).map((b) => { const r = b.getBoundingClientRect(); return { title: b.title, cls: b.className, x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; })),
    sel: () => page.evaluate(() => window.__morada.state.settings.selectedSimId),
    step: (min) => page.evaluate((min) => { const E = window.__morada.M.engine; for (let i = 0; i < min * 2; i++) E.update(0.5); }, min),
    speed: (s) => page.evaluate((s) => window.__morada.M.main.setSpeed(s), s),
  };
  return L;
}

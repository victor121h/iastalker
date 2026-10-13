// QA (buy/build angle) shared helpers for Playwright scripts run through tools/integrate_check.mjs --script.
import path from 'node:path';
import fs from 'node:fs';
export const SHOTDIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shots/qa/bb');
export function mk(page, ctx, prefix) {
  fs.mkdirSync(SHOTDIR, { recursive: true });
  const touch = !!ctx.touch;
  const tag = prefix + (touch ? '-phone' : '-desk');
  const L = {
    touch, page,
    ev: (fn, a) => page.evaluate(fn, a),
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name) { const f = path.join(SHOTDIR, `${tag}-${name}.png`); await page.screenshot({ path: f }); return f; },
    async tap(x, y) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
    async install() {
      await page.evaluate(() => {
        window.__errs = []; window.__notes = []; window.__money = [];
        const oe = console.error, ow = console.warn;
        console.error = function () { window.__errs.push('E ' + Array.from(arguments).map(String).join(' ').slice(0, 300)); return oe.apply(console, arguments); };
        console.warn = function () { window.__errs.push('W ' + Array.from(arguments).map(String).join(' ').slice(0, 300)); return ow.apply(console, arguments); };
        window.addEventListener('error', (e) => window.__errs.push('X ' + e.message));
        window.__morada.M.util.bus.on('notify', (n) => window.__notes.push(n.kind + ': ' + n.text));
        window.__morada.M.util.bus.on('money', (n) => window.__money.push(n.delta + ':' + (n.reason || '')));
      });
    },
    notes: () => page.evaluate(() => { const n = window.__notes.slice(); window.__notes.length = 0; return n; }),
    moneyLog: () => page.evaluate(() => { const n = window.__money.slice(); window.__money.length = 0; return n; }),
    errs: () => page.evaluate(() => window.__errs.slice()),
    async dismissHelp() {
      const b = await page.$('#help-ok');
      if (b && await b.isVisible()) { const r = await b.boundingBox(); await L.tap(r.x + r.width / 2, r.y + r.height / 2); await L.wait(200); }
    },
    async modeBtn(key) {
      const r = await page.evaluate((k) => { const b = document.getElementById('mode-' + k); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, key);
      await L.tap(r.x, r.y); await L.wait(400);
    },
    money: () => page.evaluate(() => window.__morada.state.money),
    tip: () => page.evaluate(() => { const t = document.getElementById('tip') || document.querySelector('.tip'); return t && !t.hidden ? t.textContent : null; }),
    toolbar: () => page.evaluate(() => { const t = document.getElementById('toolbar'); return t && !t.hidden ? t.textContent : null; }),
    toolbarBtns: () => page.evaluate(() => Array.from(document.querySelectorAll('#toolbar button')).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, dis: b.disabled, x: r.left + r.width / 2, y: r.top + r.height / 2 }; })),
    async clickToolbar(re) {
      const bs = await L.toolbarBtns();
      const b = bs.find((q) => re.test(q.t) && !q.dis);
      if (!b) return null;
      await L.tap(b.x, b.y); await L.wait(200);
      return b.t;
    },
    async card(type) {
      return page.evaluate((type) => {
        const c = document.querySelector('#drawer .card[data-type="' + type + '"]');
        if (!c) return null;
        c.scrollIntoView({ block: 'center' });
        const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, poor: c.classList.contains('poor') };
      }, type);
    },
    async clickCard(type) { const c = await L.card(type); if (!c) return null; await L.wait(50); const c2 = await L.card(type); await L.tap(c2.x, c2.y); await L.wait(200); return c2; },
    async tool(label) {
      const b = await page.evaluate((label) => { const x = Array.from(document.querySelectorAll('#drawer .tool-btn')).find((q) => q.title === label); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, label);
      if (b) { await L.tap(b.x, b.y); await L.wait(200); }
      return !!b;
    },
    cam: (o) => page.evaluate((o) => window.__morada.M.render.setCamera(o), o),
    proj: (x, y, z) => page.evaluate(([x, y, z]) => { const p = window.__morada.M.render.project(x, y, z); return { x: p.clientX, y: p.clientY, vis: p.visible }; }, [x, y, z]),
    tileScreen: (x, y) => page.evaluate(([x, y]) => { const M = window.__morada.M; const p = M.render.project(x + 0.5, 0, y + 0.5); return { x: p.clientX, y: p.clientY, vis: p.visible, pick: M.render.pickTile(p.clientX, p.clientY), el: (document.elementFromPoint(p.clientX, p.clientY) || {}).tagName }; }, [x, y]),
    cornerScreen: (x, y) => page.evaluate(([x, y]) => { const M = window.__morada.M; const p = M.render.project(x, 0, y); return { x: p.clientX, y: p.clientY, vis: p.visible, el: (document.elementFromPoint(p.clientX, p.clientY) || {}).tagName }; }, [x, y]),
    async hover(x, y) { await page.mouse.move(x - 8, y - 8); await page.mouse.move(x, y, { steps: 3 }); await L.wait(120); },
    async drag(a, b, steps = 12) {
      if (touch) {
        // emulate via CDP touch
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
        for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }] }); await L.wait(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        for (let i = 1; i <= steps; i++) { await page.mouse.move(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps); await L.wait(10); }
        await L.wait(60);
        await page.mouse.up();
      }
      await L.wait(200);
    },
    walls: () => page.evaluate(() => JSON.parse(JSON.stringify(window.__morada.state.lot.walls))),
    objs: () => page.evaluate(() => window.__morada.state.objects.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y, rot: o.rot }))),
  };
  return L;
}

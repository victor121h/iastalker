// Verify LIVE-10: double-tap on a portrait (touch) should centre the camera.
// node tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_verify_live_10.mjs
// (also run without --touch as the desktop control: mouse dblclick)
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l10');
  const out = {};
  await V.speed(0);
  await V.ev(() => {
    window.__pev = [];
    for (const b of document.querySelectorAll('#dock .portrait')) {
      for (const t of ['click', 'dblclick', 'touchend', 'pointerup']) b.addEventListener(t, (e) => window.__pev.push(t + (t === 'click' || t === 'dblclick' ? '(detail=' + e.detail + ')' : '')), true);
    }
  });
  const portraits = await V.ev(() => Array.from(document.querySelectorAll('#dock .portrait')).map((b) => { const r = b.getBoundingClientRect(); return { id: +b.getAttribute('data-sim'), x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
  const sel = await V.sel();
  const other = portraits.find((p) => p.id !== sel) || portraits[0];
  for (const gap of [80, 200]) {
    // move the camera far away first
    await V.ev(() => { const M = window.__morada.M; M.render.focus(1, 1, true); });
    await V.speed(1); await V.wait(300); await V.speed(0);
    const cam0 = await V.ev(() => window.__morada.M.render.getCamera());
    await V.ev(() => { window.__pev.length = 0; });
    if (ctx.touch) { await page.touchscreen.tap(other.x, other.y); await V.wait(gap); await page.touchscreen.tap(other.x, other.y); }
    else { await page.mouse.dblclick(other.x, other.y, { delay: 20 }); }
    await V.speed(1); await V.wait(1200); await V.speed(0);
    const cam1 = await V.ev(() => window.__morada.M.render.getCamera());
    out['gap' + gap] = { events: await V.ev(() => window.__pev.slice()), camMoved: +Math.hypot(cam1.x - cam0.x, cam1.z - cam0.z).toFixed(2), selected: (await V.sel()) === other.id };
    if (!ctx.touch) break;
  }
  return out;
}

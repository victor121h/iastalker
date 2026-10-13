// QA live: portraits, clicking characters, pie on every object type, choose each interaction.
// node tools/integrate_check.mjs --clear --script tools/qa_live_pies.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'pies');
  const out = { portraits: {}, simClicks: {}, objects: [], problems: [] };
  await L.install();
  await L.shot('0-help');
  await L.dismissHelp();
  const helpGone = await L.ev(() => !document.getElementById('help-card'));
  out.helpGone = helpGone;
  await L.speed(0);

  // ---- portraits: click each
  const portraits = await L.ev(() => Array.from(document.querySelectorAll('.portrait')).map((b) => { const r = b.getBoundingClientRect(); return { id: +b.dataset.sim, x: r.left + r.width / 2, y: r.top + r.height / 2, title: b.title }; }));
  out.portraits.list = portraits;
  for (const p of portraits) {
    await L.tap(p.x, p.y); await L.wait(250);
    out.portraits['sel_' + p.id] = await L.sel();
    out.portraits['name_' + p.id] = await L.ev(() => document.querySelector('.needs-name') && document.querySelector('.needs-name').textContent);
  }
  // double click portrait focuses camera
  if (!L.touch) {
    const cam0 = await L.ev(() => window.__morada.M.render.getCamera());
    await page.mouse.dblclick(portraits[1].x, portraits[1].y); await L.wait(900);
    const cam1 = await L.ev(() => window.__morada.M.render.getCamera());
    out.portraits.dblclickMovedCam = JSON.stringify(cam0) !== JSON.stringify(cam1);
  }
  await L.tap(portraits[0].x, portraits[0].y); await L.wait(200);
  const sel = await L.sel();
  const other = portraits.find((p) => p.id !== sel).id;

  // ---- click the other character in the 3D view
  const os = await L.ev((id) => { const s = window.__morada.M.engine.simById(id); return { x: s.x, y: s.y }; }, other);
  await L.focus(os.x, os.y); await L.wait(600);
  for (const hgt of [1.0, 1.5, 0.3]) {
    const sp = await L.simScreen(other, hgt);
    await L.tap(sp.x, sp.y); await L.wait(450);
    const pie = await L.pie();
    out.simClicks['h' + hgt] = { pick: sp.pick, pie: pie && pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : '')) };
    if (hgt === 1.0) await L.shot('1-pie-sim');
    // close with Escape (desktop) or scrim tap
    if (pie) { if (L.touch) { await L.settle(); await L.tap(5, 300); } else await page.keyboard.press('Escape'); await L.wait(200); }
    out.simClicks['h' + hgt].closed = !(await L.pie());
  }
  // "Controlar" item switches selection
  {
    const sp = await L.simScreen(other, 1.0);
    await L.tap(sp.x, sp.y); await L.wait(450);
    const it = await L.clickPie(/^Controlar/);
    out.simClicks.controlItem = !!it;
    out.simClicks.selAfterControl = await L.sel();
    await L.wait(200);
    // switch back via portrait
    await L.tap(portraits[0].x, portraits[0].y); await L.wait(200);
  }
  // clicking the selected sim itself
  {
    const ss = await L.ev((id) => { const s = window.__morada.M.engine.simById(id); return { x: s.x, y: s.y }; }, sel);
    await L.focus(ss.x, ss.y); await L.wait(600);
    const sp = await L.simScreen(sel, 1.0);
    await L.tap(sp.x, sp.y); await L.wait(300);
    out.simClicks.self = { pick: sp.pick, pie: !!(await L.pie()), tip: await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; }) };
    await L.wait(1900);
  }

  // ---- every object type
  const objs = await L.ev(() => window.__morada.state.objects.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y, rot: o.rot })));
  const seen = new Set();
  for (const o of objs) {
    if (seen.has(o.type)) continue;
    seen.add(o.type);
    const rec = { type: o.type, id: o.id };
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(500);
    const sp = await L.objFind(o.id);
    if (!sp) rec.firstPick = (await L.objScreen(o.id, 0.5)).pick; else rec.at = sp.at;
    if (!sp) { rec.unclickable = true; out.objects.push(rec); continue; }
    await L.tap(sp.x, sp.y); await L.wait(450);
    const pie = await L.pie();
    rec.tip = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
    rec.pie = pie ? { title: pie.title, items: pie.items.map((i) => (i.dis ? '-' : '+') + i.t + (i.why ? ' [' + i.why + ']' : '') + (i.cat ? ' >' : '')) } : null;
    if (pie) {
      // overflow / off-screen check
      for (const i of pie.items) {
        if (i.l < 0 || i.r > ctx.W || i.top < 0 || i.b > ctx.H) out.problems.push(o.type + ': pie item off-screen ' + i.t);
        if (i.sw > i.cw + 1) out.problems.push(o.type + ': pie item text clipped ' + i.t);
      }
      await L.shot('2-pie-' + o.type);
      if (L.touch) { await L.settle(); await L.tap(5, 300); } else await page.keyboard.press('Escape');
      await L.wait(200);
    }
    out.objects.push(rec);
  }
  out.errs = await L.errs();
  out.notes = await L.notes();
  return out;
}

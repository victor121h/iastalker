// QA live: choose every enabled interaction through the real pie (mouse/touch), check it runs, cancel via queue strip.
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_acts.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'acts');
  const out = { acts: [], problems: [] };
  await L.install();
  await L.dismissHelp();
  await L.speed(0);
  const sel = await L.sel();
  const objs = await L.ev(() => window.__morada.state.objects.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y })));
  const seen = new Set();
  const cancelAllViaStrip = async () => {
    for (let k = 0; k < 10; k++) {
      const q = await L.queueDom();
      const live = q.filter((i) => !/cancel/.test(i.cls));
      if (!live.length) break;
      await L.tap(live[live.length - 1].x, live[live.length - 1].y); await L.wait(120);
    }
    await L.step(10);
  };
  for (const o of objs) {
    if (seen.has(o.type)) continue;
    seen.add(o.type);
    // what does the menu offer?
    await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(400);
    const sp = await L.objFind(o.id);
    if (!sp) { out.acts.push({ type: o.type, unclickable: true }); continue; }
    await L.tap(sp.x, sp.y); await L.wait(400);
    const pie = await L.pie();
    if (!pie) continue;
    const labels = pie.items.filter((i) => !i.dis && !i.cat).map((i) => i.t);
    if (L.touch) { await L.settle(); await L.tap(4, 200); } else await page.keyboard.press('Escape');
    await L.wait(150);
    for (const lab of labels) {
      if (/Aceitar vaga/.test(lab)) continue; // job tested separately
      const rec = { type: o.type, label: lab };
      await L.focus(o.x + 0.5, o.y + 0.5); await L.wait(350);
      const sp2 = await L.objFind(o.id);
      if (!sp2) { rec.err = 'unclickable now'; out.acts.push(rec); continue; }
      await L.tap(sp2.x, sp2.y); await L.wait(400);
      const esc = lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const it = await L.clickPie(new RegExp('^' + esc + '$'));
      if (!it) { rec.err = 'item missing'; out.acts.push(rec); continue; }
      await L.wait(150);
      const q = await L.queue(sel);
      rec.queued = q.map((a) => a.label + '|' + a.src);
      const sim0 = await L.ev((id) => { const s = window.__morada.M.engine.simById(id); return Object.assign({}, s.motives); }, sel);
      // run up to 90 sim-min, watch the phase
      const r = await L.ev(([id, lab]) => {
        const E = window.__morada.M.engine; const s = E.simById(id);
        const phases = []; let doAt = null; let done = false;
        for (let i = 0; i < 180; i++) {
          E.update(0.5);
          const a = s.queue.find((x) => x.source === 'player');
          const ph = a ? a.label + ':' + a.phase : 'none';
          if (phases[phases.length - 1] !== ph) phases.push(ph);
          if (a && a.phase === 'do' && doAt == null) doAt = i / 2;
          if (!a) { done = true; break; }
        }
        return { phases: phases.slice(0, 12), doAt, done, anim: s.anim, bubble: s.bubble && s.bubble.icon, pos: [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10] };
      }, [sel, lab]);
      Object.assign(rec, r);
      rec.notes = await L.notes();
      if (rec.doAt == null) out.problems.push(o.type + ' / ' + lab + ' never reached do: ' + JSON.stringify(r.phases) + ' ' + rec.notes.join(' | '));
      await cancelAllViaStrip();
      out.acts.push(rec);
    }
  }
  out.errs = await L.errs();
  return out;
}

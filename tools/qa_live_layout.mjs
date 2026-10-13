// QA live: HUD layout / tabs / text clipping / bubbles / toasts / log at the current viewport (desktop or phone).
// node tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_layout.mjs [--touch --w 390 --h 844]
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'layout');
  const out = { clipped: {}, overlaps: [] };
  await L.install();
  await L.dismissHelp();
  await L.speed(1);
  await L.wait(1500);
  // generic text-clipping scanner over visible HUD elements
  const scan = (label) => L.ev((label) => {
    const res = [];
    for (const el of document.querySelectorAll('#hud *, #pie *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const txt = (el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim() : '';
      if (!txt) continue;
      if (el.scrollWidth > el.clientWidth + 1 && (cs.overflow !== 'visible' || cs.textOverflow === 'ellipsis')) res.push('clip: ' + txt.slice(0, 60) + ' [' + el.className + '] ' + el.scrollWidth + '>' + el.clientWidth);
      if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1) res.push('offscreen: ' + txt.slice(0, 60) + ' [' + el.className + '] ' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom));
    }
    return res;
  }, label);
  out.clipped.base = await scan('base');
  await L.shot('0-base');
  // needs drawer (phone)
  if (L.touch) {
    const t = await L.ev(() => { const b = document.getElementById('needs-toggle'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
    await L.tap(t.x, t.y); await L.wait(400);
    out.drawerOpen = await L.ev(() => document.getElementById('dock').classList.contains('needs-open'));
    out.drawerRect = await L.ev(() => { const r = document.getElementById('needs-panel').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
  }
  const tabIds = ['tab-needs', 'tab-skills', 'tab-career', 'tab-rel', 'tab-pers'];
  out.tabs = {};
  for (const tid of tabIds) {
    const t = await L.ev((tid) => { const b = document.getElementById(tid); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; }, tid);
    if (!t.vis) { out.tabs[tid] = 'invisible'; continue; }
    await L.tap(t.x, t.y); await L.wait(350);
    out.tabs[tid] = await L.ev(() => { const b = document.getElementById('tab-body'); const sel = document.querySelector('.tab[aria-selected="true"]'); return { selected: sel && sel.id, text: b.innerText.replace(/\n+/g, ' | ').slice(0, 400), scrollH: b.scrollHeight, clientH: b.clientHeight }; });
    out.clipped[tid] = await scan(tid);
    await L.shot('1-' + tid);
  }
  // back to needs tab
  {
    const t = await L.ev(() => { const b = document.getElementById('tab-needs'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await L.tap(t.x, t.y); await L.wait(200);
  }
  // other sim's tabs: career for Caio (employed)
  {
    const p = await L.ev(() => { const b = document.querySelectorAll('.portrait')[1]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await L.tap(p.x, p.y); await L.wait(300);
    const t = await L.ev(() => { const b = document.getElementById('tab-career'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
    if (t.vis) { await L.tap(t.x, t.y); await L.wait(350); }
    out.caioCareer = await L.ev(() => document.getElementById('tab-body').innerText.replace(/\n+/g, ' | '));
    await L.shot('2-caio-career');
    // while Caio is at work
    await L.ev(() => { const E = window.__morada.M.engine; for (let i = 0; i < 400; i++) { E.update(0.5); if (E.simById(128).hidden) break; } });
    await L.wait(500);
    out.caioAtWork = await L.ev(() => ({ career: document.getElementById('tab-body').innerText.replace(/\n+/g, ' | '), sub: document.querySelector('.needs-sub').textContent, queue: document.querySelector('#dock .queue').innerText, portrait: document.querySelectorAll('.portrait')[1].title }));
    await L.shot('3-caio-atwork');
    // click on a floor tile while the selected sim is at work
    const tp = await L.tileScreen(11, 15);
    await L.tap(tp.x, tp.y); await L.wait(200);
    out.clickWhileAtWork = await L.ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : null; });
    // relations tab while at work
    const tr = await L.ev(() => { const b = document.getElementById('tab-rel'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
    if (tr.vis) { await L.tap(tr.x, tr.y); await L.wait(350); }
    out.caioRel = await L.ev(() => document.getElementById('tab-body').innerText.replace(/\n+/g, ' | ').slice(0, 300));
    const tn = await L.ev(() => { const b = document.getElementById('tab-needs'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
    if (tn.vis) { await L.tap(tn.x, tn.y); await L.wait(200); }
    // back to Rita
    const p0 = await L.ev(() => { const b = document.querySelectorAll('.portrait')[0]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await L.tap(p0.x, p0.y); await L.wait(300);
  }
  if (L.touch) {
    const t = await L.ev(() => { const b = document.getElementById('needs-toggle'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 }; });
    if (await L.ev(() => document.getElementById('dock').classList.contains('needs-open'))) { await L.tap(t.x, t.y); await L.wait(300); }
  }
  // bubbles: make both sims talk and check bubble placement relative to head
  {
    await L.speed(1);
    const r = await L.ev(() => {
      const M = window.__morada.M, E = M.engine; const hh = E.household().filter((s) => !s.hidden);
      const abs = E.state.time.day * 1440 + E.state.time.minute;
      hh.forEach((s, i) => { s.bubble = { kind: i ? 'talk' : 'think', icon: i ? '💬' : '🍔', until: abs + 30 }; });
      M.render.focus(hh[0].x, hh[0].y, true);
      return hh.map((s) => s.id);
    });
    await L.wait(800);
    out.bubbles = await L.ev((ids) => {
      const M = window.__morada.M;
      return ids.map((id) => {
        const s = M.engine.simById(id);
        const head = M.render.project(s.x + 0.5, 1.75, s.y + 0.5);
        const el = Array.from(document.querySelectorAll('#bubbles .bubble'));
        return { id, head: [Math.round(head.clientX), Math.round(head.clientY)], bubbles: el.map((b) => { const r = b.getBoundingClientRect(); return [b.className, Math.round(r.left + r.width / 2), Math.round(r.bottom), b.textContent]; }) };
      });
    }, r);
    await L.shot('4-bubbles');
  }
  // toasts: push 6 notifications; check stacking and overlap with log button / cam
  {
    await L.ev(() => { const B = window.__morada.M.util.bus; const t = ['Chegou uma conta de M$ 105 na caixa de correio. Vence em 3 dias.', 'Promoção! Caio agora é Assistente executivo (M$ 180/dia, 9h–16h). Recebeu M$ 120 hoje.', 'Rita desmaiou de fome e foi levado(a) para o atendimento de emergência. Conta de M$ 500.', 'Classificados: vaga de Voluntário de testes (Ciência), M$ 155/dia, 9h–15h. Clique no jornal para aceitar.', 'O vaso sanitário entupiu!', 'good: Vocês conheceram Bruno Lima! Agora dá para ligar e convidar.']; const k = ['money', 'career', 'bad', 'career', 'bad', 'good']; t.forEach((x, i) => B.emit('notify', { text: x, kind: k[i] })); });
    await L.wait(500);
    out.toasts = await L.ev(() => Array.from(document.querySelectorAll('#toasts .toast')).map((t) => { const r = t.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }));
    out.toastCam = await L.ev(() => { const r = document.getElementById('cam').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
    await L.shot('5-toasts');
  }
  // pie near screen edges
  {
    await L.speed(0);
    const fr = await L.ev(() => window.__morada.state.objects.find((o) => o.type === 'phone').id);
    for (const [name, dx, dy] of [['edge-left', 0.08, 0.5], ['edge-bottom', 0.5, 0.86], ['edge-top', 0.5, 0.08], ['edge-right', 0.95, 0.5]]) {
      // move camera so the phone sits near that screen position: pan by the difference
      await L.ev(() => { const o = window.__morada.state.objects.find((q) => q.type === 'phone'); window.__morada.M.render.focus(o.x + 0.5, o.y + 0.5, true); });
      await L.wait(300);
      const p = await L.objFind(fr);
      const tx = ctx.W * dx, ty = ctx.H * dy;
      await L.ev(([dx, dy]) => window.__morada.M.render.pan(dx, dy), [tx - p.x, ty - p.y]);
      await L.wait(400);
      const p2 = await L.objFind(fr);
      if (!p2) { out['pie_' + name] = 'not found'; continue; }
      const hit = await L.ev(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className + '#' + e.id : null; }, [p2.x, p2.y]);
      await L.tap(p2.x, p2.y); await L.wait(450);
      await L.settle();
      const pie = await L.pie();
      out['pie_' + name] = { at: [Math.round(p2.x), Math.round(p2.y)], hit, items: pie && pie.items.map((i) => [i.t, Math.round(i.l), Math.round(i.top), Math.round(i.r), Math.round(i.b)]) };
      await L.shot('6-pie-' + name);
      if (pie) { await L.tap(3, ctx.H / 2); await L.wait(250); }
    }
  }
  out.errs = await L.errs();
  return out;
}

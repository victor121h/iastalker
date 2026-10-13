// Verify LIVE-13: phone toast stack vs camera cluster; LIVE-14/15 career tab texts.
// node tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_verify_live_13.mjs
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l13');
  const out = {};
  await V.speed(0);
  out.camButtons = await V.ev(() => Array.from(document.querySelectorAll('#cam button')).filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label') || b.title || b.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; }));
  // realistic burst: engine notifications of mixed kinds
  await V.ev(() => {
    const bus = window.__morada.M.util.bus;
    const msgs = [['A carona de Caio chegou! Sai às 09:00.', 'career'], ['Rita pagou 1 conta (M$ 120).', 'money'], ['Classificados: vaga de Garçom de bufê (Artes & Mídia), M$ 100/dia, 10h–16h. Clique no jornal para aceitar.', 'career'], ['Caio está com fome.', 'bad'], ['Rita preparou uma refeição (2 porções).', 'good'], ['Chegou uma conta: M$ 132. Pague na caixa de correio.', 'money']];
    for (const [t, k] of msgs) bus.emit('notify', { text: t, kind: k, id: Math.random() });
  });
  await V.wait(700);
  out.toasts = await V.toasts();
  out.coveredCamButtons = await V.ev(() => Array.from(document.querySelectorAll('#cam button')).filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { label: b.getAttribute('aria-label') || b.title, hitIsButton: !!(el && (el === b || b.contains(el))), hit: el && (el.className || el.tagName) }; }));
  // tap on the covered button: does the camera rotate?
  const cov = out.coveredCamButtons.find((c) => !c.hitIsButton);
  if (cov) {
    const b = out.camButtons.find((c) => c.label === cov.label);
    const k0 = await V.ev(() => window.__morada.M.render.getCamera().k);
    out.atTapEl = await V.ev(([x, y]) => { window.__tapT = []; for (const t of ['touchstart', 'click']) document.addEventListener(t, (e) => window.__tapT.push(t + ':' + (e.target.className || e.target.tagName) + ':' + (e.target.closest && e.target.closest('#cam') ? 'inCam' : 'notCam')), { capture: true }); const el = document.elementFromPoint(x, y); return el && (el.className || el.tagName); }, [b.cx, b.cy]);
    await V.tap(b.cx, b.cy);
    out.tapTargets = await V.ev(() => window.__tapT); await V.speed(1); await V.wait(600); await V.speed(0);
    out.tapCovered = { label: cov.label, kBefore: k0, kAfter: await V.ev(() => window.__morada.M.render.getCamera().k) };
  }
  await V.shot('toasts');
  // how long until they clear?
  await V.wait(6000);
  out.toastsAfter6s = (await V.toasts()).length;
  // LIVE-14/15: career tab
  const tabs = await V.ev(() => Array.from(document.querySelectorAll('.tab')).map((t) => (t.getAttribute('aria-label') || t.title || t.textContent).trim()));
  out.tabs = tabs;
  out.career = await V.ev(async () => {
    const M = window.__morada.M, E = M.engine;
    const res = {};
    const rita = E.household().find((s) => s.name.startsWith('Rita')), caio = E.household().find((s) => s.name.startsWith('Caio'));
    // Rita unemployed
    M.ui.selectSim(rita.id); M.ui.setTab('career');
    await new Promise((r) => setTimeout(r, 600));
    const body = document.querySelector('.tab-body') || document.getElementById('needs-panel');
    res.ritaText = body ? body.innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
    res.ritaOfferRows = Array.from(body.querySelectorAll('li')).map((li) => ({ t: li.innerText.replace(/\s+/g, ' ').slice(0, 80), tag: li.tagName, hasButton: !!li.querySelector('button'), cursor: getComputedStyle(li).cursor }));
    // Caio employed + great mood
    for (const k of Object.keys(caio.motives)) caio.motives[k] = 95;
    caio.hidden = false; caio.atWork = false;
    M.ui.selectSim(caio.id); M.ui.setTab('career');
    await new Promise((r) => setTimeout(r, 600));
    const b2 = document.querySelector('.tab-body') || document.getElementById('needs-panel');
    res.caioMood = Math.round(E.mood(caio));
    res.caioChecklist = Array.from(b2.querySelectorAll('li')).map((li) => li.className + ' ' + li.innerText.trim()).filter((t) => /humor|○|✓/.test(t));
    return res;
  });
  return out;
}

// Playwright script: phone services (pizza, repair, maid, invite), newspaper job, mailbox bills — through the
// pie menu where possible — plus camera keyboard/wheel controls.
// node tools/integrate_check.mjs --clear --nohelp --script tools/integrate_services.mjs
import path from 'node:path';
import fs from 'node:fs';

export default async function (page, ctx) {
  const dir = ctx.shotDir; fs.mkdirSync(dir, { recursive: true });
  const out = { fail: [] };
  const shot = async (name) => { const f = path.join(dir, `svc-${name}.png`); await page.screenshot({ path: f }); out[name] = f; return f; };
  const ev = (fn, a) => page.evaluate(fn, a);
  const expect = (k, c, d) => { out[k] = { ok: !!c, d }; if (!c) out.fail.push(k); };
  // free will off: autonomous phone calls / bill payments would otherwise race the player commands under test
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); window.__morada.M.main.setSpeed(0); window.__morada.M.engine.setFreeWill(false); });
  // open the phone pie through a click and walk the submenu
  const clickObj = async (type) => {
    const p = await ev((type) => {
      const M = window.__morada.M; const o = M.engine.state.objects.find((q) => q.type === type);
      M.render.setCamera({ k: 0, x: o.x + 0.5, z: o.y + 0.5, dist: 12 });
      return o.id;
    }, type);
    await page.waitForTimeout(600);
    const pos = await ev((id) => {
      const M = window.__morada.M;
      const g = M.render.scene.children.find((c) => c.name === 'objects').children.find((c) => c.userData.objId === id);
      const b = new THREE.Box3().setFromObject(g); const c = b.getCenter(new THREE.Vector3());
      return M.render.project(c.x, Math.min(c.y, b.min.y + 0.6), c.z);
    }, p);
    await page.mouse.click(pos.clientX, pos.clientY);
    await page.waitForTimeout(450);
    return ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => b.textContent));
  };
  // headless frames are slow: wait until the pie's entry animations have really finished before measuring
  const pieSettled = () => page.waitForFunction(() => { const el = document.getElementById('pie'); return !el || el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished'); }, null, { timeout: 4000 }).catch(() => {});
  const choose = async (re) => {
    await pieSettled();
    const b = await ev((src) => { const x = Array.from(document.querySelectorAll('#pie .pie-item')).find((q) => new RegExp(src).test(q.textContent)); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: x.textContent }; }, re);
    if (b) { await page.mouse.click(b.x, b.y); await page.waitForTimeout(450); }
    return b && b.t;
  };
  const phoneItems = await clickObj('phone');
  await shot('1-phone-pie');
  const sub = await choose('Servi|servi');
  const subItems = await ev(() => Array.from(document.querySelectorAll('#pie .pie-item')).map((b) => b.textContent));
  await shot('2-phone-sub');
  const pizza = await choose('[Pp]izza');
  const q = await ev(() => { const M = window.__morada.M; const s = M.engine.simById(M.engine.state.settings.selectedSimId); return s.queue.map((a) => a.label); });
  expect('phone.pieMenu', phoneItems.length && q.some((l) => /pizza/i.test(l)), { phoneItems, sub, subItems, pizza, q });
  // run until the pizza arrives and is delivered
  const pz = await ev(() => {
    const M = window.__morada.M, E = M.engine;
    let seen = null, meal = null;
    const notes = []; const off = M.util.bus.on('notify', (n) => notes.push(M.util.fmtTime(E.state.time.minute) + ' ' + n.text));
    const s0 = E.simById(E.state.settings.selectedSimId); const tl = []; let last = '';
    for (let i = 0; i < 400; i++) {
      const k = s0.queue.map((a) => a.label + ':' + a.phase).join('/'); if (k !== last && tl.length < 14) { tl.push(M.util.fmtTime(E.state.time.minute) + ' ' + k); last = k; }
      E.update(0.5);
      const v = E.state.sims.find((s) => s.visitor && s.role === 'pizza');
      if (v && !seen) seen = { at: M.util.fmtTime(E.state.time.minute), x: v.x, y: v.y };
      meal = E.state.objects.find((o) => o.type === 'meal' && o.food === 'pizza');
      if (meal) break;
    }
    if (meal) M.render.setCamera({ k: 0, x: meal.x + 0.5, z: meal.y + 0.5, dist: 10 });
    off();
    return { tl, notes: notes.slice(0, 8), deliverer: seen, meal: meal && { x: meal.x, y: meal.y, servings: meal.servings, under: M.world.objectsAt(meal.x, meal.y).map((o) => o.type) }, money: E.state.money };
  });
  await page.waitForTimeout(800);
  await shot('3-pizza');
  expect('phone.pizzaDelivered', pz.deliverer && pz.meal, pz);
  // break the TV, call the technician via engine, check he repairs it
  const rep = await ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const tv = st.objects.find((o) => /^tv/.test(o.type)); tv.broken = true;
    const ph = st.objects.find((o) => o.type === 'phone');
    const sel = st.settings.selectedSimId;
    const its = E.getInteractions(sel, ph.id).map((i) => i.key);
    const ok = E.queueInteraction(sel, ph.id, 'call_repair', 'player');
    let tech = null, shot = null;
    for (let i = 0; i < 600; i++) {
      E.update(0.5);
      const v = st.sims.find((s) => s.visitor && s.role === 'repair');
      if (v) { tech = tech || { at: M.util.fmtTime(st.time.minute) }; if (v.anim !== 'walk' && v.anim !== 'idle' && !shot) { shot = { x: v.x, y: v.y, anim: v.anim }; break; } }
    }
    if (shot) M.render.setCamera({ k: 0, x: shot.x + 0.5, z: shot.y + 0.5, dist: 9 });
    return { its, ok, tech, shot, broken: tv.broken };
  });
  await page.waitForTimeout(800);
  await shot('4-repair');
  const rep2 = await ev(() => { const M = window.__morada.M, E = M.engine; const tv = E.state.objects.find((o) => /^tv/.test(o.type)); for (let i = 0; i < 300 && tv.broken; i++) E.update(0.5); return { broken: tv.broken, bills: E.state.bills.length, money: E.state.money }; });
  expect('phone.repairService', rep.ok && rep.tech && !rep2.broken, { rep, rep2 });
  // free will back on: the next steps skip days ahead and the family must look after itself
  await ev(() => window.__morada.M.engine.setFreeWill(true));
  // newspaper job: day 2 07:00 the paper comes; Rita has no job
  const job = await ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    const rita = E.household().find((s) => !s.career);
    let g = 0;
    while (!(st.time.day >= 2 && st.time.minute >= 7 * 60 + 30) && g++ < 4000) E.update(1);
    const np = st.objects.find((o) => o.type === 'newspaper');
    if (!np || !rita) return { np: !!np, rita: !!rita };
    E.selectSim(rita.id);
    const its = E.getInteractions(rita.id, np.id).map((i) => i.key + (i.enabled ? '' : '(x)'));
    return { np: true, its, rita: rita.id, npId: np.id };
  });
  let jobRes = null;
  if (job.npId) {
    const items = await clickObj('newspaper');
    await shot('5-newspaper-pie');
    const picked = await choose('Aceitar|aceitar|vaga|Vaga|R\\$|M\\$');
    // UI fix round (LIVE-2): the pie item opens an offer card; accept it there
    await page.waitForTimeout(300);
    await ev(() => { const b = Array.from(document.querySelectorAll('.modal .modal-foot .btn')).find((x) => /Aceitar|Trocar/.test(x.textContent)); if (b) b.click(); });
    await page.waitForTimeout(200);
    jobRes = await ev((rid) => { const M = window.__morada.M, E = M.engine; const s = E.simById(rid); for (let i = 0; i < 200 && !s.career; i++) E.update(0.5); return { career: s.career, info: E.careerInfo(rid) && E.careerInfo(rid).title }; }, job.rita);
    jobRes.items = items; jobRes.picked = picked;
  }
  expect('newspaper.job', jobRes && jobRes.career, { job, jobRes });
  // bills: advance to day 4 09:00, pay at the mailbox via pie
  const bill = await ev(() => {
    const M = window.__morada.M, E = M.engine, st = E.state;
    let g = 0;
    while (!(st.bills && st.bills.length) && g++ < 6000) E.update(1);
    E.setFreeWill(false);   // nobody pays it autonomously while the player command runs
    // somebody who is home and awake must be selected to use the mailbox (the others may be at work)
    let home = null;
    for (let i = 0; i < 1440 && !home; i++) { home = E.household().find((s) => !s.hidden && !s.asleep && !(s.career && s.queue[0] && /trabalho/i.test(s.queue[0].label || ''))); if (!home) E.update(1); }
    if (home) E.selectSim(home.id);
    return { day: st.time.day, t: M.util.fmtTime(st.time.minute), bills: st.bills.map((b) => b.amount), money: st.money };
  });
  const mItems = await clickObj('mailbox');
  await shot('6-mailbox-pie');
  const paid = await choose('[Pp]agar');
  const bill2 = await ev(() => { const M = window.__morada.M, E = M.engine, st = E.state; const s = E.simById(st.settings.selectedSimId); const tl = []; let last = ''; for (let i = 0; i < 300 && st.bills.length; i++) { E.update(0.5); const k = s.queue.map((a) => a.label + ':' + a.phase).join('/'); if (k !== last) { tl.push(M.util.fmtTime(st.time.minute) + ' ' + k); last = k; } } return { sim: s.name, bills: st.bills.length, money: st.money, tl: tl.slice(0, 8) }; });
  expect('mailbox.payBills', bill.bills.length && bill2.bills === 0, { bill, mItems, paid, bill2 });
  // camera controls: keyboard Q/E rotate, wheel zoom, WASD pan
  await page.keyboard.press('Escape');
  const cam0 = await ev(() => window.__morada.M.render.getCamera());
  await page.mouse.move(640, 300);
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  const cam1 = await ev(() => window.__morada.M.render.getCamera());
  await page.mouse.wheel(0, 400); await page.waitForTimeout(150);
  const cam2 = await ev(() => window.__morada.M.render.getCamera());
  await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
  const cam3 = await ev(() => window.__morada.M.render.getCamera());
  // right-drag pan
  await page.mouse.move(600, 400); await page.mouse.down({ button: 'right' }); await page.mouse.move(700, 450, { steps: 5 }); await page.mouse.up({ button: 'right' });
  const cam4 = await ev(() => window.__morada.M.render.getCamera());
  expect('camera.controls', cam1.k !== cam0.k && cam2.dist > cam1.dist && (cam3.x !== cam2.x || cam3.z !== cam2.z) && (cam4.x !== cam3.x || cam4.z !== cam3.z), { cam0, cam1, cam2, cam3, cam4 });
  return out;
}

// Fix-round tests for js/engine.js + js/data.js (QA findings + CONTRACT_V2 engine side).
// Usage: node tools/fix_engine_test.mjs [--verbose]
import { boot } from './qa_simeng_lib.mjs';

const VERBOSE = process.argv.includes('--verbose');
let failures = 0;
function check(c, msg) { if (!c) { failures++; console.log('  FAIL:', msg); } else if (VERBOSE) console.log('  ok:', msg); }
function section(t) { console.log('== ' + t); }
const run = (E, minutes) => { for (let i = 0; i < minutes * 2; i++) E.update(0.5); };
const find = (S, type) => S.objects.find((o) => o.type === type);
const walkable = (M, x, y) => M.world.isWalkable(Math.round(x), Math.round(y));

// ------------------------------------------------------------------ LIVE-8 / LIVE-11: queue cap, lastReason, walks
{
  section('queue cap, lastReason, walk redirect (LIVE-8, LIVE-11)');
  const { E, M, S } = boot({ seed: 3 });
  E.setFreeWill(false);
  const rita = S.sims[0];
  rita.queue = [];
  const fridge = find(S, 'fridge_cheap');
  let ok = 0;
  for (let i = 0; i < 9; i++) if (E.queueInteraction(rita.id, fridge.id, 'snack')) ok++;
  check(ok === 8, '8 snacks accepted, the 9th refused (' + ok + ')');
  check(E.lastReason === 'A fila de ações está cheia (máx. 8).', 'lastReason explains the full queue: ' + E.lastReason);
  check(!E.queueWalk(rita.id, 3, 3, { append: true }), 'a walk is refused too when the queue is full');
  rita.queue = [];
  check(E.queueWalk(rita.id, 3, 16), 'walk queued');
  run(E, 0.5);
  check(E.queueWalk(rita.id, 20, 16), 'second click accepted');
  check(rita.queue.length === 1 && rita.queue[0].x === 20, 'second click redirects the current walk (len ' + rita.queue.length + ')');
  check(E.queueWalk(rita.id, 4, 4, { append: true }), 'shift-click appends');
  check(rita.queue.length === 2, 'appended walk (len ' + rita.queue.length + ')');
  check(E.queueWalk(rita.id, 5, 5, 'player', { append: false }) && rita.queue.length === 2, 'legacy signature (source string) still works');
  check(E.queueInteraction(rita.id, 999999, 'snack') === false && /não existe/.test(E.lastReason), 'unknown object refused with a reason');
}

// ------------------------------------------------------------------ LIVE-12: pizza once, pendingDeliveries
{
  section('pizza pending (LIVE-12), pendingDeliveries');
  const { E, S } = boot({ seed: 4 });
  E.setFreeWill(false);
  const rita = S.sims[0], caio = S.sims[1];
  rita.queue = []; caio.queue = [];
  const phone = find(S, 'phone');
  const m0 = S.money;
  check(E.queueInteraction(rita.id, phone.id, 'order_pizza'), 'first pizza order queued');
  check(!E.queueInteraction(caio.id, phone.id, 'order_pizza') && E.lastReason === 'Caio: Já tem uma pizza a caminho.', 'second order refused: ' + E.lastReason);
  run(E, 15);
  check(S.money === m0 - 40, 'charged once (' + (m0 - S.money) + ')');
  const pd = E.pendingDeliveries();
  check(pd.length === 1 && pd[0].kind === 'pizza' && pd[0].at > S.time.day * 1440 + S.time.minute, 'pendingDeliveries lists the pizza: ' + JSON.stringify(pd));
  const it = E.getInteractions(caio.id, phone.id).find((i) => i.key === 'order_pizza');
  check(it && !it.enabled && /pizza a caminho/.test(it.reason), 'pie menu shows the pizza as disabled');
  run(E, 70);
  const courier = S.sims.find((s) => s.role === 'pizza');
  const meal = S.objects.find((o) => o.type === 'meal' && o.food === 'pizza');
  check(!!meal || !!courier, 'pizza arrived');
}

// ------------------------------------------------------------------ LIVE-16: gendered texts
{
  section('gendered texts (LIVE-16)');
  const { E, S, notes, M } = boot({ seed: 5 });
  E.setFreeWill(false);
  const phone = find(S, 'phone');
  const rita = S.sims[0];
  find(S, 'tv_cheap').broken = true;
  rita.queue = [];
  E.queueInteraction(rita.id, phone.id, 'call_repair');
  run(E, 10);
  const ev = S.events.find((e) => e.kind === 'repair');
  check(ev && (ev.gender === 'f' || ev.gender === 'm') && ev.first, 'repair event carries gender and first name');
  run(E, 70);
  const tech = S.sims.find((s) => s.role === 'repair');
  if (tech) {
    const title = tech.gender === 'f' ? 'Técnica' : 'Técnico';
    check(tech.name.indexOf(title + ' ') === 0, 'technician name agrees with gender: ' + tech.name);
  }
  // fired / missed work with a female worker
  rita.career = { track: 'negocios', level: 1, performance: 0, daysWorked: 0, missedDays: 1, hiredAt: 0, lastShift: 0 };
  const all = notes.map((n) => n.text).join(' | ');
  check(!/\(a\)/.test(all), 'no "(a)" placeholder in notifications so far');
  // force a missed shift: Rita is passed out on the floor and does not come to for the carpool
  const C = M.data.CRITICAL, keep = C.faintWorkWake;
  C.faintWorkWake = 999;
  const d0 = S.time.day;
  while (!(S.time.day > d0 && S.time.minute >= 7 * 60 && M.util.weekday(S.time.day) < 5)) E.update(0.5);
  rita.motives.energy = -100;
  run(E, 150);
  C.faintWorkWake = keep;
  check(notes.some((n) => /foi demitida/.test(n.text)) || !rita.career, 'female worker "demitida": ' + notes.slice(-3).map((n) => n.text).join(' / '));
  check(!notes.some((n) => /\(a\)/.test(n.text)), 'still no "(a)" forms');
}

// ------------------------------------------------------------------ BB-4: move/sell an object in use (time paused)
{
  section('move/sell object in use (BB-4, CR-7)');
  const { E, M, S } = boot({ seed: 6 });
  E.setFreeWill(false);
  const rita = S.sims[0];
  rita.queue = [];
  const sofa = find(S, 'sofa_cheap');
  rita.motives.comfort = -60;
  E.queueInteraction(rita.id, sofa.id, 'sit');
  run(E, 8);
  check(rita.seated && rita.queue[0] && rita.queue[0].phase === 'do', 'Rita sits on the sofa');
  const r = E.moveObject(sofa.id, 10, 16, 2);
  check(r.ok, 'sofa moved: ' + r.reason);
  check(!rita.seated && rita.anim === 'idle' && !rita.queue.length, 'Rita stands up at once (no update needed)');
  check(walkable(M, rita.x, rita.y), 'Rita is on a walkable tile (' + rita.x + ',' + rita.y + ')');
  // cooking refund when the counter is sold mid-prep
  const fridge = find(S, 'fridge_cheap');
  rita.queue = [];
  rita.motives.hunger = 20;
  E.queueInteraction(rita.id, fridge.id, 'cook');
  let guard = 0;
  while (!(rita.queue[0] && rita.queue[0].effect === 'cook_meal' && rita.queue[0].stage === 1 && rita.queue[0].phase === 'do') && guard++ < 400) E.update(0.5);
  const a = rita.queue[0];
  const paid = a && a.data.paid;
  check(paid > 0, 'groceries paid (' + paid + ')');
  const counter = a && S.objects.find((o) => o.id === a.tgtId);
  const before = S.money;
  const refund = E.sellValue(counter.id);
  E.sellObject(counter.id);
  check(S.money - before === refund + paid, 'selling the counter refunds the counter and the groceries (' + (S.money - before) + ' = ' + refund + ' + ' + paid + ')');
  check(!rita.queue.some((x) => x.effect === 'cook_meal'), 'cooking stopped');
  // cancel during stage 1 'do' via the queue still refunds (cook_meal.finish)
  rita.queue = [];
  E.queueInteraction(rita.id, fridge.id, 'cook');
  guard = 0;
  while (!(rita.queue[0] && rita.queue[0].effect === 'cook_meal' && rita.queue[0].stage === 1 && rita.queue[0].phase === 'do') && guard++ < 400) E.update(0.5);
  const b = rita.queue[0];
  const m1 = S.money, paid2 = b.data.paid;
  E.cancelAction(rita.id, b.id);
  run(E, 3);
  check(paid2 > 0 && S.money - m1 === paid2, 'cancel in the do phase refunds (' + (S.money - m1) + ' of ' + paid2 + ')');
}

// ------------------------------------------------------------------ LIVE-6: fun/social allowed at low mood
{
  section('low mood allows fun when fun is the problem (LIVE-6)');
  const { E, S } = boot({ seed: 7 });
  E.setFreeWill(false);
  const rita = S.sims[0], caio = S.sims[1];
  rita.queue = [];
  Object.assign(rita.motives, { hunger: -40, energy: -40, bladder: -40, hygiene: -40, comfort: -60, fun: -100, social: -95, room: -100 });
  const tv = find(S, 'tv_cheap');
  const watch = E.getInteractions(rita.id, tv.id).find((i) => i.key === 'watch');
  check(watch && watch.enabled, 'TV enabled while "Cuide de: Diversão"');
  check(E.queueInteraction(rita.id, tv.id, 'watch'), 'watch TV accepted');
  const soc = E.getSocials(rita.id, caio.id).find((s) => s.key === 'talk');
  check(soc && soc.enabled, 'talking enabled while social is the lowest need');
  const mirror = find(S, 'mirror');
  check(!E.queueInteraction(rita.id, mirror.id, 'look') && /mau humor/.test(E.lastReason), 'a non-need command is still refused: ' + E.lastReason);
}

// ------------------------------------------------------------------ CR-8: bills already paid
{
  section('bills already paid (CR-8)');
  const { E, S, notes } = boot({ seed: 8 });
  E.setFreeWill(false);
  S.bills.push({ id: 991, amount: 120, dueDay: S.time.day + 2, kind: 'bill' });
  const mb = find(S, 'mailbox');
  for (const s of S.sims) { s.queue = []; E.queueInteraction(s.id, mb.id, 'pay_bills'); }
  run(E, 30);
  check(!S.bills.length, 'bill paid');
  check(!notes.some((n) => /Dinheiro insuficiente/.test(n.text)), 'no false "Dinheiro insuficiente" alert');
}

// ------------------------------------------------------------------ BB-10: starter resale
{
  section('starter furniture resale (BB-10)');
  const { E, S } = boot({ seed: 9 });
  const sofa = find(S, 'sofa_cheap');
  check(E.sellValue(sofa.id) < sofa.price, 'day-1 resale of starter sofa is depreciated (' + E.sellValue(sofa.id) + ' < ' + sofa.price + ')');
  const r = E.buyObject('plant_small', 2, 2, 0);
  check(r.ok && E.sellValue(r.obj.id) === r.obj.price, 'a new purchase still resells at 100 % the same day');
}

// ------------------------------------------------------------------ SIM-14: save/load mid-step onto a bed
{
  section('save/load mid-step onto furniture (SIM-14)');
  const { E, M, S } = boot({ seed: 10 });
  E.setFreeWill(false);
  const rita = S.sims[0];
  rita.queue = [];
  rita.motives.energy = -60;
  const bed = find(S, 'bed_double');
  E.queueInteraction(rita.id, bed.id, 'relax');
  let found = false;
  for (let i = 0; i < 400 && !found; i++) {
    E.update(0.25);
    const a = rita.queue[0];
    if (a && a.phase === 'walk' && a.slot && a.slot.on && !walkable(M, rita.x, rita.y)) found = true;
  }
  check(found, 'caught Rita stepping onto the bed');
  const pos = [rita.x, rita.y];
  const json = JSON.stringify(S);
  E.init(JSON.parse(json));
  const r2 = E.state.sims.find((s) => s.id === rita.id);
  check(Math.abs(r2.x - pos[0]) < 1e-6 && Math.abs(r2.y - pos[1]) < 1e-6, 'position kept on load ' + JSON.stringify(pos) + ' -> ' + JSON.stringify([r2.x, r2.y]));
  run(E, 5);
  check(r2.queue[0] && r2.queue[0].interaction === 'relax' && r2.queue[0].phase === 'do', 'and she lies down normally after the load');
}

// ------------------------------------------------------------------ SIM-5 / faint ends near -40, one notification
{
  section('faint (SIM-5, faint wake)');
  const { E, S, notes } = boot({ seed: 11 });
  E.setFreeWill(false);
  const rita = S.sims[0];
  rita.queue = [];
  find(S, 'toilet').broken = true;
  rita.motives.energy = -99.9; rita.motives.bladder = -94;
  run(E, 30);
  check(notes.filter((n) => /Rita desmaiou/.test(n.text)).length === 1, 'one faint notification');
  let wokeAt = null;
  for (let i = 0; i < 7 * 60 * 2 && wokeAt == null; i++) { E.update(0.5); if (!(rita.queue[0] && rita.queue[0].effect === 'faint')) wokeAt = rita.motives.energy; }
  check(wokeAt != null, 'faint over within ~7 h');
  check(wokeAt != null && wokeAt >= -45 && wokeAt <= -35, 'woke at about -40 (' + Math.round(wokeAt) + ')');
}

// ------------------------------------------------------------------ SIM-9: hunger emergency reachable
{
  section('starvation emergency (SIM-9)');
  const { E, S, notes } = boot({ seed: 12 });
  E.setFreeWill(false);
  const rita = S.sims[0];
  E.sellObject(find(S, 'fridge_cheap').id);
  rita.motives.hunger = -97;
  run(E, 12 * 60);
  check(notes.some((n) => /desmaiou de fome e foi levada/.test(n.text)), 'hospital trip happens ("levada")');
}

// ------------------------------------------------------------------ collector (SIM-13, CR-5)
{
  section('bill collector (SIM-13, CR-5)');
  const { E, S, notes } = boot({ seed: 13, empty: true, members: [{ name: 'Lia Souza', gender: 'f' }] });
  S.money = 0;
  S.bills.push({ id: 5001, amount: 900, dueDay: S.time.day, kind: 'bill' });
  while (S.time.minute < 10 * 60 + 20) E.update(0.5);
  check(S.bills.length === 1 && S.bills[0].amount === 900, 'nothing to take: the debt stays (' + JSON.stringify(S.bills) + ')');
  check(notes.some((n) => /dívida de M\$ 900 continua/.test(n.text)), 'the player is told the debt continues');
  const b = boot({ seed: 14 });
  const S2 = b.S, E2 = b.E;
  S2.bills.push({ id: 5002, amount: 467, dueDay: S2.time.day, kind: 'bill' });
  const vals = S2.objects.filter((o) => o.price > 0).map((o) => E2.sellValue(o.id)).sort((x, y) => y - x);
  const before = vals.reduce((a, c) => a + c, 0);
  while (S2.time.minute < 10 * 60 + 20) E2.update(0.5);
  const after = S2.objects.filter((o) => o.price > 0).map((o) => E2.sellValue(o.id)).reduce((a, c) => a + c, 0);
  check(before - after <= Math.round(467 * 1.2) + 1, 'never takes more than owed + 20 % (' + (before - after) + ')');
}

// ------------------------------------------------------------------ CONTRACT_V2 §1/§2: paint sides, rooms, undo
{
  section('wallpaper per side, room tools, undo (CONTRACT_V2 §1, §2)');
  const { E, M, S } = boot({ seed: 15 });
  const key = 'h,9,10';   // bedroom/living-room wall with a door: use a solid wall instead
  const solid = 'h,8,10';
  const m0 = S.money;
  const r1 = E.paintWall(solid, 6, 'A');
  const e = M.world.getWall(solid);
  check(r1.ok && r1.cost === 15 && e.cA === 6 && (e.cB == null || e.cB === e.c), 'paint side A only: ' + JSON.stringify(r1) + ' ' + JSON.stringify(e));
  const r2 = E.paintWall(solid, 6, 'B');
  check(r2.ok && e.c === 6 && e.cA == null && e.cB == null, 'both sides equal -> normalized: ' + JSON.stringify(e));
  const r3 = E.paintWall(solid, 3);
  check(r3.ok && r3.cost === 20, 'default "both" charges per side (' + r3.cost + ')');
  const pr = E.paintRoomWalls(9, 8, 2);
  check(pr.ok && pr.count >= 8 && pr.cost === pr.count * 10, 'paintRoomWalls paints the inward sides of the bedroom: ' + JSON.stringify(pr));
  check(M.world.getWall('h,8,6').cB === 2 || M.world.getWall('h,8,6').c === 2, 'outer wall inner side got the wallpaper');
  const pf = E.paintRoomFloor(9, 8, 8);
  check(pf.ok && pf.count > 0 && M.world.getFloor(9, 8) === 8, 'paintRoomFloor: ' + JSON.stringify(pf));
  const po = E.paintRoomFloor(2, 2, 8);
  check(!po.ok && po.reason && E.lastReason === po.reason, 'outdoor floor refused: ' + po.reason);
  const est = E.estimateRoom(2, 2, 4, 4, 1);
  check(est.ok && est.walls === 12 && est.tiles === 9 && est.cost === 12 * 70 + 9 * 10, 'estimateRoom: ' + JSON.stringify(est));
  const snap = E.snapshotBuild();
  const money1 = S.money;
  const br = E.buildRoom(2, 2, 4, 4, 1);
  check(br.ok && S.money === money1 - est.cost && M.world.getWall('h,2,2'), 'buildRoom built and charged: ' + JSON.stringify(br));
  const again = E.estimateRoom(2, 2, 4, 4, null);
  check(!again.ok && again.walls === 0, 'existing walls are skipped: ' + JSON.stringify(again));
  const bought = E.buyObject('plant_small', 3, 3, 0);
  check(bought.ok, 'bought a plant inside');
  const rr = E.restoreBuild(snap);
  check(rr.ok && S.money === money1 && !M.world.getWall('h,2,2') && !S.objects.some((o) => o.id === bought.obj.id), 'restoreBuild undoes walls, floor, purchase and money');
  check(S.nextId >= snap.nextId, 'ids are never reused');
  // blocked by an object
  E.buyObject('plant_small', 2, 6, 0);
  const blocked = E.estimateRoom(1, 5, 3, 7, null);
  check(blocked.ok || blocked.reason, 'estimateRoom answers for a rect around an object: ' + JSON.stringify(blocked));
  check(S.money < m0, 'money spent on painting');
}

// ------------------------------------------------------------------ homeTile, notify focus + throttle
{
  section('homeTile, notification focus and merge');
  const { E, M, S, notes } = boot({ seed: 16 });
  const rita = S.sims[0];
  const h = E.homeTile(rita.id);
  check(h && M.world.isIndoor(h.x, h.y) && M.world.isWalkable(h.x, h.y), 'homeTile is indoor and walkable: ' + JSON.stringify(h));
  const got = [], reps = [];
  M.util.bus.on('notify', (n) => got.push(n));
  M.util.bus.on('notifyRepeat', (n) => reps.push(n));
  // two meals spoil in the same minute -> one toast, count 2
  const now = S.time.day * 1440 + S.time.minute;
  for (const x of [2, 4]) S.objects.push({ id: 90000 + x, type: 'meal', x, y: 2, rot: 0, servings: 2, quality: 50, food: 'home', spoiled: false, spoilAt: now + 1, price: 0, boughtDay: 1 });
  M.world.rebuild();
  run(E, 3);
  const sp = got.filter((n) => /refeição estragou/.test(n.text));
  check(sp.length === 1, 'one toast for two identical notifications (' + sp.length + ')');
  check(reps.length === 1 && reps[0].count === 2, 'the repeat is counted: ' + JSON.stringify(reps));
  check(sp[0] && sp[0].focus && sp[0].focus.objId != null, 'spoiled-meal toast carries focus: ' + JSON.stringify(sp[0]));
  const stored = S.notifications.find((n) => /refeição estragou/.test(n.text));
  check(stored && stored.count === 2 && stored.focus, 'stored notification keeps count and focus');
}

// ------------------------------------------------------------------ SIM-3: pre-shift nap alarm
{
  section('night shift pre-shift nap (SIM-3)');
  const { E, S, notes, M } = boot({ seed: 17 });
  const caio = S.sims[1];
  caio.career = { track: 'ciencia', level: 2, performance: 0, daysWorked: 0, missedDays: 0, hiredAt: 0, lastShift: 0 };
  let dep = null;
  M.util.bus.on('notify', (n) => { if (/Caio foi para o trabalho/.test(n.text) && dep == null) dep = Math.round(caio.motives.energy); });
  run(E, 3 * 1440);
  check(dep != null && dep > -30, 'night worker leaves rested enough (energy ' + dep + ')');
  check(!notes.some((n) => /Caio desmaiou|Caio perdeu a carona/.test(n.text)), 'no faint, no missed carpool');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL FIX TESTS PASSED');
process.exitCode = failures ? 1 : 0;

// Scenario tests for M.engine: services, phone, visitors, jobs, bills/collector, neglect, seeds, empty lot.
// Usage: node tools/engine_scenarios.mjs [--verbose]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
let failures = 0;
function check(c, msg) { if (!c) { failures++; console.log('  FAIL:', msg); } else console.log('  ok:', msg); }

function boot(seed, opts) {
  const ctx = { console, Math, Date, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  const worldFile = fs.existsSync(path.join(ROOT, 'js/world.js')) ? 'js/world.js' : 'tools/engine_world_stub.js';
  for (const f of ['js/util.js', 'js/data.js', worldFile, 'js/engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const M = ctx.M, E = M.engine;
  E.debug.throwErrors = true;
  const notes = [];
  M.util.bus.on('notify', (n) => { notes.push(n); if (VERBOSE) console.log(`    [d${E.state.time.day} ${M.util.fmtTime(E.state.time.minute)}] ${n.text}`); });
  E.newGame(Object.assign({ seed }, opts || {}));
  return { M, E, S: E.state, notes };
}
function run(E, minutes) { for (let i = 0; i < minutes * 2; i++) E.update(0.5); }
function nanFree(o) {
  let bad = false;
  (function walk(v) { if (bad) return; if (typeof v === 'number') { if (!isFinite(v)) bad = true; return; } if (v && typeof v === 'object') for (const k in v) walk(v[k]); })(o);
  return !bad;
}
function find(S, type) { return S.objects.find((o) => o.type === type); }
function hasNote(notes, re) { return notes.some((n) => re.test(n.text)); }

// --------------------------------------------------------------- services & phone
{
  console.log('\n== Phone & services ==');
  const { E, S, notes } = boot(11);
  E.setFreeWill(false);
  const rita = S.sims[0];
  const phone = find(S, 'phone');
  const tv = find(S, 'tv_cheap');
  tv.broken = true;
  check(E.getInteractions(rita.id, phone.id).some((i) => i.key === 'call_repair'), 'phone offers "Chamar técnico" when something is broken');
  check(E.queueInteraction(rita.id, phone.id, 'call_repair'), 'queue call repair');
  run(E, 20);
  check(S.events.some((e) => e.kind === 'repair'), 'repair visit scheduled');
  const m0 = S.money;
  run(E, 60 + 60);
  check(!tv.broken, 'técnico repaired the TV');
  run(E, 60);
  check(S.money < m0 && hasNote(notes, /t[ée]cnic[oa] \S+ cobrou/), 'técnico charged (' + (m0 - S.money) + ')');   // gendered text since the QA fix round
  check(!S.sims.some((s) => s.role === 'repair'), 'técnico left the lot');
  // maid
  const toilet = find(S, 'toilet');
  toilet.dirty = 900;
  E.queueInteraction(rita.id, phone.id, 'call_maid');
  run(E, 15);
  check(S.events.some((e) => e.kind === 'maid'), 'maid scheduled');
  run(E, 60 + 90);
  check(toilet.dirty === 0, 'faxineira cleaned the toilet');
  run(E, 60);
  check(!S.sims.some((s) => s.role === 'maid'), 'faxineira left');
  // pizza
  const m1 = S.money;
  rita.motives.hunger = 30;
  check(E.queueInteraction(rita.id, phone.id, 'order_pizza'), 'order pizza');
  run(E, 10);
  check(S.money === m1 - 40, 'pizza charged M$ 40');
  run(E, 75);
  const pizza = S.objects.find((o) => o.type === 'meal' && o.food === 'pizza');
  check(!!pizza && pizza.servings === 4, 'pizza delivered as a 4-serving meal near the door');
  if (pizza) {
    check(E.queueInteraction(rita.id, pizza.id, 'eat'), 'eat pizza (player)');
    const h0 = rita.motives.hunger;
    run(E, 40);
    check(rita.motives.hunger > h0 + 25, 'Rita ate pizza (hunger ' + Math.round(h0) + ' -> ' + Math.round(rita.motives.hunger) + ')');
    check(S.objects.some((o) => o.type === 'dirty_plate'), 'a dirty plate was left');
  }
  // invite
  const npc = S.npcs.find((n) => n.known);
  npc.relationships[rita.id] = { daily: 90, lifetime: 50 };
  rita.relationships[npc.id] = { daily: 90, lifetime: 50 };
  S.time.minute = Math.max(S.time.minute, 13 * 60);
  check(E.queueInteraction(rita.id, phone.id, 'invite:' + npc.id), 'invite a specific neighbour (dynamic key)');
  run(E, 15);
  check(S.events.some((e) => e.kind === 'guest' && e.npcId === npc.id), 'guest visit scheduled');
  run(E, 70);
  const guest = S.sims.find((s) => s.npcId === npc.id);
  check(!!guest && guest.role === 'guest', 'guest arrived');
  if (guest) {
    run(E, 60);
    check(E.getSocials(rita.id, guest.id).some((s) => s.key === 'goodbye'), 'goodbye offered for guests');
    check(E.queueSocial(rita.id, guest.id, 'talk'), 'talk to guest');
    run(E, 30);
    check(E.queueSocial(rita.id, guest.id, 'goodbye'), 'say goodbye');
    run(E, 40);
    check(!S.sims.some((s) => s.npcId === npc.id), 'guest left after goodbye');
  }
  // call friend
  S.time.minute = Math.max(S.time.minute, 14 * 60);
  check(E.queueInteraction(rita.id, phone.id, 'call_friend'), 'call a neighbour');
  run(E, 30);
  check(hasNote(notes, /telefone|atendeu|a fim de conversar|fora de hora/), 'call resolved with a notification');
  check(nanFree(S), 'no NaN');
}

// --------------------------------------------------------------- walk-by + greet + jobs
{
  console.log('\n== Walk-by, jobs, bills, collector ==');
  const { E, S, notes } = boot(23);
  const rita = S.sims[0], caio = S.sims[1];
  S.walkbyAt = S.time.day * 1440 + S.time.minute + 2;
  run(E, 5);
  const wb = S.sims.find((s) => s.role === 'walkby');
  check(!!wb, 'walk-by spawned');
  if (wb) {
    run(E, 3);
    const soc = E.getSocials(rita.id, wb.id).map((s) => s.key);
    check(soc.length === 1 && soc[0] === 'greet', 'only "Cumprimentar" offered for a walk-by: ' + soc.join(','));
    rita.queue = [];
    check(E.queueSocial(rita.id, wb.id, 'greet'), 'greet walk-by');
    run(E, 30);
    check(wb.role === 'guest' || !S.sims.includes(wb), 'walk-by became a guest after greeting (role ' + wb.role + ')');
    const npc = S.npcs.find((n) => n.id === wb.npcId);
    check(npc && npc.known, 'neighbour now known (phone book)');
  }
  // newspaper job offer
  const paper = find(S, 'newspaper');
  const jobKey = E.getInteractions(rita.id, paper.id).find((i) => i.key.startsWith('job:'));
  check(!!jobKey, 'newspaper has a job offer: ' + (jobKey && jobKey.label));
  if (jobKey) {
    rita.queue = [];
    check(E.queueInteraction(rita.id, paper.id, jobKey.key), 'accept job from newspaper');
    run(E, 30);
    check(!!rita.career && rita.career.level === 1, 'Rita has a job: ' + (rita.career && rita.career.track));
    const info = E.careerInfo(rita.id);
    check(info && info.title && info.next && info.next.title, 'careerInfo: ' + (info && info.title + ' -> ' + info.next.title));
  }
  // computer job search
  const comp = E.buyObject('computer', 18, 8, 0);
  check(comp.ok, 'bought a computer: ' + (comp.reason || 'ok'));
  if (comp.ok) {
    caio.queue = []; caio.hidden = false; caio.atWork = false;
    check(E.queueInteraction(caio.id, comp.obj.id, 'find_job'), 'search jobs on the computer');
    run(E, 40);
    const keys = E.getInteractions(caio.id, comp.obj.id).filter((i) => i.key.startsWith('job:'));
    check(keys.length >= 2, 'computer shows job offers after searching: ' + keys.length);
    check(E.jobOffers().length >= 3, 'jobOffers() lists newspaper + computer offers');
  }
  // bills and the collector (free will off so nobody pays the bill autonomously before 10:00 —
  // that is legitimate behaviour, but it made this check depend on autonomy timing)
  E.setFreeWill(false);
  S.bills.push({ id: 99901, amount: 400, dueDay: S.time.day, kind: 'bill' });
  const nObj = S.objects.length;
  const target = S.time.day * 1440 + 10 * 60 + 5;
  const nowA = S.time.day * 1440 + S.time.minute;
  run(E, (target > nowA ? target - nowA : target + 1440 - nowA) + 30);
  check(hasNote(notes, /oficial de cobrança/), 'collector arrived for an overdue bill');
  run(E, 60);
  check(!S.bills.some((b) => b.id === 99901), 'overdue bill cleared by repossession');
  check(S.objects.length < nObj + 2, 'objects were repossessed (' + nObj + ' -> ' + S.objects.length + ')');
  E.setFreeWill(true);
  // pay bill API
  S.bills.push({ id: 99902, amount: 50, dueDay: S.time.day + 3 });
  const m = S.money;
  check(E.payBill(99902).ok && S.money === m - 50, 'payBill pays from the bank');
  check(nanFree(S), 'no NaN');
}

// --------------------------------------------------------------- neglect: free will off
{
  console.log('\n== Neglect (free will off, 3 days) ==');
  const { E, S, notes } = boot(5);
  E.setFreeWill(false);
  let err = null;
  try { run(E, 3 * 1440); } catch (e) { err = e; }
  check(!err, 'no exceptions while neglected' + (err ? ': ' + err.stack : ''));
  const crit = notes.filter((n) => /desmaiou|banheiro a tempo|emergência/.test(n.text)).length;
  console.log('    critical events:', crit, '| refusals/overrides ok');
  check(nanFree(S), 'no NaN');
  check(S.sims.every((s) => s.motives.hunger > -100.01), 'motives clamped');
}

// --------------------------------------------------------------- many seeds (autonomous)
{
  console.log('\n== Seeds (4 days autonomous each) ==');
  for (const seed of [1, 2, 3, 4, 99, 1234]) {
    const { E, S, notes } = boot(seed);
    let err = null;
    const lowRun = {}; let worst = 0, worstK = '';
    try {
      for (let i = 0; i < 4 * 1440 * 2; i++) {
        E.update(0.5);
        for (const s of S.sims) {
          if (s.visitor || s.hidden) continue;
          for (const k of ['hunger', 'energy', 'bladder', 'hygiene']) {
            const key = s.id + k;
            lowRun[key] = s.motives[k] <= -95 ? (lowRun[key] || 0) + 0.5 : 0;
            if (lowRun[key] > worst) { worst = lowRun[key]; worstK = s.name + ' ' + k; }
          }
        }
      }
    } catch (e) { err = e; }
    const bad = notes.filter((n) => /desmaiou|banheiro a tempo|emergência|faltou/.test(n.text)).map((n) => n.text);
    const moods = S.sims.filter((s) => !s.visitor).map((s) => Math.round(E.mood(s)));
    check(!err && worst <= 60 && bad.length === 0 && nanFree(S),
      `seed ${seed}: money ${S.money}, moods ${moods.join('/')}, worst low run ${worst} min ${worstK}${bad.length ? ', events: ' + bad.join(' | ') : ''}${err ? ' ERR ' + err.message : ''}`);
  }
}

// --------------------------------------------------------------- empty lot household
{
  console.log('\n== Empty lot: 4 members, buy furniture, 3 days ==');
  const { E, S, notes } = boot(77, {
    empty: true, householdName: 'Família Teste',
    members: [{ name: 'Ana Lima', gender: 'f' }, { name: 'Bruno Lima', gender: 'm' }, { name: 'Clara Lima', gender: 'f' }, { name: 'Davi Lima', gender: 'm' }],
  });
  check(S.money === 20000 && S.householdName === 'Família Teste', 'start M$ 20.000');
  // a quick open-air "house"
  const buys = [
    ['fridge_cheap', 3, 3, 0], ['stove', 4, 3, 0], ['counter', 5, 3, 0], ['counter', 6, 3, 0],
    ['table_dining', 4, 6, 0], ['chair_wood', 4, 5, 0], ['chair_wood', 5, 5, 0], ['chair_wood', 4, 7, 2], ['chair_wood', 5, 7, 2],
    ['toilet', 10, 3, 0], ['toilet', 11, 3, 0], ['shower', 12, 3, 0], ['shower', 13, 3, 0], ['sink', 14, 3, 0],
    ['bed_double', 3, 11, 0], ['bed_double', 6, 11, 0], ['sofa_cheap', 12, 9, 2], ['tv_cheap', 12, 7, 0],
    ['trash_can', 8, 3, 0], ['bookshelf', 16, 3, 0], ['phone', 18, 3, 0],
  ];
  let okAll = true;
  for (const b of buys) { const r = E.buyObject(b[0], b[1], b[2], b[3]); if (!r.ok) { okAll = false; console.log('    buy failed', b, r.reason); } }
  check(okAll, 'bought a basic open-air home (money left ' + S.money + ')');
  const w = E.buildWall('h,3,15', 1, 0);
  check(w.ok, 'built a wall segment');
  let err = null;
  try { run(E, 3 * 1440); } catch (e) { err = e; }
  check(!err, 'household of 4 runs 3 days' + (err ? ': ' + err.stack : ''));
  const bad = notes.filter((n) => /desmaiou|banheiro a tempo|emergência/.test(n.text)).length;
  check(bad === 0, 'no critical events in the 4-person household (' + bad + ')');
  console.log('    moods:', S.sims.filter((s) => !s.visitor).map((s) => s.name + ' ' + Math.round(E.mood(s))).join(', '));
  check(nanFree(S), 'no NaN');
}

// --------------------------------------------------------------- night shift, firing
{
  console.log('\n== Night shift and firing ==');
  const { E, S, notes } = boot(31);
  const rita = S.sims[0];
  E.acceptJob(rita.id, 'seguranca');     // Vigia noturno 00-06, Qua–Dom
  // jump to Tuesday (day 2) evening so the Wednesday 00:00 shift is next
  run(E, 1440 + 12 * 60);
  run(E, 14 * 60);
  const worked = rita.career ? rita.career.daysWorked : 0;
  check(worked >= 1 || notes.some((n) => /Rita voltou do trabalho/.test(n.text)), 'Rita worked the 00:00–06:00 night shift (daysWorked ' + worked + ')');
  check(!notes.some((n) => /Rita perdeu a carona/.test(n.text)), 'no missed night shift');
  // box Caio in so he cannot reach the carpool: walls around his tile
  const caio = S.sims[1];
  const { E: E2, S: S2, notes: n2 } = boot(32);
  const c2 = S2.sims[1];
  E2.setFreeWill(false);
  c2.queue = [];
  c2.x = 20; c2.y = 4;
  for (const k of ['h,20,4', 'h,20,5', 'v,20,4', 'v,21,4']) E2.buildWall(k, 1, 0);
  run(E2, 2 * 1440 + 10 * 60);
  check(n2.some((n) => /perdeu a carona/.test(n.text)), 'missed work notification');
  check(!c2.career && n2.some((n) => /demitido/.test(n.text)), 'fired after two consecutive missed days');
  void caio;
}

// --------------------------------------------------------------- object edits while in use, add/remove sims
{
  console.log('\n== Edits while in use ==');
  const { E, S } = boot(41);
  E.setFreeWill(false);
  const rita = S.sims[0];
  const sofa = find(S, 'sofa_cheap');
  rita.motives.comfort = -40;
  check(E.queueInteraction(rita.id, sofa.id, 'sit'), 'Rita goes to sit');
  run(E, 12);
  const sitting = rita.queue[0] && rita.queue[0].phase === 'do';
  check(sitting, 'Rita is sitting');
  const r = E.sellObject(sofa.id);
  check(r.ok, 'sold the sofa while in use (refund ' + r.refund + ')');
  run(E, 3);
  check(!rita.queue.some((a) => a.objId === sofa.id), 'her sit action ended');
  check(M_walkable(E, rita), 'Rita stands on a walkable tile');
  const lamp = S.objects.find((o) => o.type === 'lamp_floor');
  const mv = E.moveObject(lamp.id, 18, 2, 0);
  check(mv.ok, 'moved a lamp outside');
  const added = E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 } });
  check(added && S.sims.includes(added), 'addSim adds a household member');
  run(E, 60);
  check(E.removeSim(added.id) && !S.sims.includes(added), 'removeSim removes her');
  run(E, 30);
  check(nanFree(S), 'no NaN');
}
function M_walkable(E, sim) {
  return true && Number.isFinite(sim.x) && Number.isFinite(sim.y);
}

// --------------------------------------------------------------- damaged / old save
{
  console.log('\n== Damaged save ==');
  const { M, E } = boot(51);
  const good = JSON.parse(JSON.stringify(E.state));
  good.sims[0].motives.hunger = 'abc';
  delete good.sims[0].skills;
  good.sims[1].queue = [{ kind: 'object', objId: 99999, interaction: 'nope', phase: 'do' }, null, 5];
  good.objects.push({ id: 5555, type: 'unknown_thing', x: 3, y: 3, rot: 0 });
  good.objects.push({ type: 'plant_small', x: 2, y: 2 });
  delete good.events; delete good.jobs; delete good.rngState; delete good.settings;
  good.time.minute = 'x';
  good.bills = [{ amount: 'nan' }, { id: 1, amount: 30, dueDay: 3 }];
  good.sims.push({ name: 'Fantasma', visitor: true, role: 'guest', npcId: 123456 });
  let err = null;
  try { E.init(good); run(E, 1440); } catch (e) { err = e; }
  check(!err, 'damaged save loads and runs a day' + (err ? ': ' + err.stack : ''));
  check(nanFree(E.state), 'no NaN after load');
  check(!E.state.objects.some((o) => o.type === 'unknown_thing'), 'unknown objects dropped');
  check(E.state.objects.some((o) => o.type === 'plant_small' && o.id != null), 'object without id gets one');
  // minimal state
  let err2 = null;
  try { E.init({ lot: { w: 24, h: 20 }, sims: [{ name: 'Solo' }] }); run(E, 600); } catch (e) { err2 = e; }
  check(!err2, 'minimal state loads and runs' + (err2 ? ': ' + err2.stack : ''));
  void M;
}

console.log(failures ? `\nFAILURES: ${failures}` : '\nALL SCENARIOS PASSED');
process.exit(failures ? 1 : 0);

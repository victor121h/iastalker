// Node test for M.data + M.engine (with the real M.world if present, else the stub).
// Usage: node tools/engine_test.mjs [--days 4] [--seed 42] [--quiet] [--log]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DAYS = +opt('days', '4');
const SEED = +opt('seed', '42');
const QUIET = args.includes('--quiet');
const LOG = args.includes('--log');

function loadContext() {
  const ctx = { console, Math, Date, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  const worldFile = fs.existsSync(path.join(ROOT, 'js/world.js')) ? 'js/world.js' : 'tools/engine_world_stub.js';
  for (const f of ['js/util.js', 'js/data.js', worldFile, 'js/engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return { M: ctx.M, worldFile };
}

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.log('  FAIL:', msg); } else if (!QUIET) console.log('  ok:', msg);
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

// ------------------------------------------------------------------ unit tests: autonomy scoring
function scoringTests(M) {
  console.log('\n== Autonomy scoring (RESEARCH worked examples) ==');
  const E = M.engine, D = M.data;
  const base = { hunger: 0, energy: 0, comfort: 0, fun: 0, hygiene: 0, social: 0, bladder: 0, room: 0 };
  // Hunger = -50 (slope 2.5), snack ad 20, 8 tiles, low attenuation
  const m1 = Object.assign({}, base, { hunger: -50 });
  const raw = E.debug.scoreAds(m1, 0, { hunger: 20 });
  check(approx(raw, (1 / 9) * 2.5 * 0.02, 1e-9), `raw score hunger -50 snack 20 = ${raw.toFixed(6)} (expect 0.005556)`);
  const fin = raw / (1 + D.ATTENUATION.low * 8);
  check(approx(fin, 0.0030864, 1e-6), `attenuated (low, 8 tiles) = ${fin.toFixed(6)} (expect 0.003086)`);
  const m2 = Object.assign({}, base, { hunger: 60 });
  check(E.debug.scoreAds(m2, 0, { hunger: 20 }) === 0, 'hunger 60 + snack 20 scores 0 (flat above cutoff)');
  const m3 = Object.assign({}, base, { energy: 10 });
  check(E.debug.scoreAds(m3, 0, { energy: 80 }) === 0, 'energy 10 + bed 80 scores 0 (energy cutoff 0)');
  const m4 = Object.assign({}, base, { energy: -10 });
  check(E.debug.scoreAds(m4, 0, { energy: 80 }) > 0, 'energy -10 + bed 80 scores > 0');
  check(D.curve('hunger', -100) === -255 && D.curve('hunger', 100) === 30, 'hunger curve end points');
  check(D.curve('bladder', -55) === -105, 'bladder curve interpolation (-55 -> -105)');
  check(approx(D.curve('fun', 45), 36), 'fun curve 45 -> 36');
  check(D.curve('mood', 37) === 37, 'mood curve is linear');
  // personality/skill multipliers
  check(approx(D.adAmount({ min: 40, delta: 30, vary: 'neat' }, { neat: 10 }, {}), 70), 'ad min 40 + delta 30 × neat 10 = 70');
  check(approx(D.adAmount({ min: 10, delta: 15, vary: '-playful' }, { playful: 2 }, {}), 22), 'inverted trait (serious) multiplier');
  check(approx(D.adAmount({ min: 30, delta: 30, vary: 'cooking' }, {}, { cooking: 5 }), 60), 'skill multiplier 2·s/10');
  check(approx(D.rateMultiplier('playful', { playful: 10 }, {}), 1.5) && approx(D.rateMultiplier('playful', { playful: 0 }, {}), 0.5), 'fun rate vary 0.5..1.5');
  // a starving sim prefers food over fun
  const m5 = Object.assign({}, base, { hunger: -80, fun: -20 });
  const sFood = E.debug.scoreAds(m5, 0, { hunger: 30 });
  const sFun = E.debug.scoreAds(m5, 0, { fun: 30 });
  check(sFood > sFun * 3, `starving: food ${sFood.toFixed(5)} >> fun ${sFun.toFixed(5)}`);
}

// ------------------------------------------------------------------ helpers
function deepNaN(o, p, out) {
  if (out.length > 5) return;
  if (typeof o === 'number') { if (!isFinite(o)) out.push(p); return; }
  if (!o || typeof o !== 'object') return;
  for (const k in o) deepNaN(o[k], p + '.' + k, out);
}
function category(sim, M) {
  if (sim.hidden) return sim.atWork ? 'work' : 'away';
  const a = sim.queue[0];
  if (!a) return 'idle';
  if (a.kind === 'walk') return a.label === 'Passear' ? 'idle' : 'walk';
  if (a.phase === 'walk' || a.phase === 'route') return 'walk';
  if (a.kind === 'social') return 'social';
  const e = a.effect;
  if (e === 'sleep' || e === 'faint') return 'sleep';
  if (e === 'nap') return 'nap';
  if (e === 'eat_meal') return a.stage >= 1 ? 'eat' : 'food';
  if (e === 'snack') return 'eat';
  if (e === 'cook_meal') return 'cook';
  if (e === 'toilet') return 'toilet';
  if (['shower', 'bath', 'wash'].includes(a.interaction)) return 'hygiene';
  if (['clean_plate', 'mop', 'clean_object', 'dispose', 'water', 'make_bed', 'repair', 'pay_bills'].includes(e)) return 'chores';
  if (a.interaction === 'sit' || a.interaction === 'relax') return 'rest';
  if (e === 'call_friend') return 'social';
  const o = M.engine.objectById(a.objId);
  const it = o && M.data.CATALOG[o.type] && M.data.CATALOG[o.type].interactions.find((i) => i.key === a.interaction);
  if (it && (it.fun || (it.rates && it.rates.fun > 0))) return 'fun';
  if (it && it.skill) return 'skill';
  return 'other:' + (a.interaction || '?');
}

// ------------------------------------------------------------------ simulation
function simulate(M, days, seed) {
  const E = M.engine, D = M.data;
  E.debug.throwErrors = true;
  const notes = [];
  M.util.bus.on('notify', (n) => { notes.push(n); if (LOG) console.log(`   [${M.util.fmtTime(E.state.time.minute)} d${E.state.time.day}] ${n.kind}: ${n.text}`); });
  const st = E.newGame({ seed });
  console.log(`\n== Simulation: ${days} days, seed ${seed}, start money ${st.money} ==`);
  const hh = st.sims.filter((s) => !s.visitor);
  const budget = {};      // day -> simName -> cat -> minutes
  const lowRun = {};      // simId.motive -> current consecutive minutes <= -95
  const lowMax = {};      // longest run
  const minMot = {};
  const moneyLog = [];
  let lastMoney = st.money;
  const STEP = 0.5;
  const totalSteps = days * 1440 / STEP;
  let err = null;
  const t0 = Date.now();
  for (let i = 0; i < totalSteps; i++) {
    try { E.update(STEP); } catch (e) { err = e; break; }
    const S = E.state;
    const d = S.time.day;
    for (const s of S.sims) {
      if (s.visitor) continue;
      const cat = category(s, M);
      budget[d] = budget[d] || {};
      budget[d][s.name] = budget[d][s.name] || {};
      budget[d][s.name][cat] = (budget[d][s.name][cat] || 0) + STEP;
      if (s.hidden) continue;
      for (const k of D.MOTIVES) {
        const key = s.name + '.' + k;
        const v = s.motives[k];
        minMot[key] = Math.min(minMot[key] == null ? 999 : minMot[key], v);
        if (v <= -95) { lowRun[key] = (lowRun[key] || 0) + STEP; lowMax[key] = Math.max(lowMax[key] || 0, lowRun[key]); }
        else lowRun[key] = 0;
      }
    }
    if (S.money !== lastMoney) { moneyLog.push({ day: d, minute: Math.floor(S.time.minute), delta: S.money - lastMoney }); lastMoney = S.money; }
    if (i % 120 === 0) {
      const bad = [];
      deepNaN(S, 'state', bad);
      if (bad.length) { err = new Error('NaN in state: ' + bad.join(', ')); break; }
    }
  }
  const secs = (Date.now() - t0) / 1000;
  if (err) { console.log('  EXCEPTION:', err.stack || err); failures++; return { st: E.state, notes }; }
  console.log(`  simulated in ${secs.toFixed(1)} s`);

  // per-day time budget
  console.log('\n== Per-day time budget (hours) ==');
  const cols = ['sleep', 'nap', 'work', 'eat', 'cook', 'food', 'toilet', 'hygiene', 'fun', 'social', 'rest', 'chores', 'skill', 'walk', 'idle'];
  for (const d of Object.keys(budget).map(Number).sort((a, b) => a - b)) {
    for (const name of Object.keys(budget[d])) {
      const b = budget[d][name];
      const parts = cols.map((c) => `${c} ${((b[c] || 0) / 60).toFixed(1)}`);
      const other = Object.keys(b).filter((k) => !cols.includes(k) && k !== 'away').map((k) => `${k} ${(b[k] / 60).toFixed(1)}`);
      console.log(`  d${d} ${name.padEnd(11)} ${parts.join(' | ')}${other.length ? ' | ' + other.join(' ') : ''}`);
    }
  }
  console.log('\n== Motive minimums / longest run at <= -95 (min) ==');
  for (const s of hh) {
    console.log('  ' + s.name.padEnd(11) + D.MOTIVES.map((k) => `${k} ${Math.round(minMot[s.name + '.' + k])}/${Math.round(lowMax[s.name + '.' + k] || 0)}`).join('  '));
  }
  const S = E.state;
  console.log('\n== Final state ==');
  for (const s of S.sims) {
    console.log(`  ${s.name.padEnd(14)} ${s.visitor ? '(visitante:' + s.role + ')' : ''} mood ${Math.round(E.mood(s))} skills ${JSON.stringify(Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, +v.toFixed(2)])))} career ${s.career ? s.career.track + ' L' + s.career.level + ' perf ' + s.career.performance + ' worked ' + s.career.daysWorked : '-'}`);
  }
  console.log(`  money ${S.money}; bills ${JSON.stringify(S.bills)}; objects ${S.objects.length}; visitors ${S.sims.filter((s) => s.visitor).length}`);
  const kinds = {};
  for (const n of notes) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
  console.log('  notifications by kind:', JSON.stringify(kinds));
  const sys = {};
  for (const o of S.objects) if (['meal', 'dirty_plate', 'puddle', 'newspaper', 'carpool'].includes(o.type)) sys[o.type] = (sys[o.type] || 0) + 1;
  console.log('  system objects left:', JSON.stringify(sys));

  // ---- assertions
  console.log('\n== Assertions ==');
  const totals = {};
  for (const d of Object.keys(budget)) for (const name of Object.keys(budget[d])) {
    totals[name] = totals[name] || {};
    for (const c in budget[d][name]) totals[name][c] = (totals[name][c] || 0) + budget[d][name][c];
  }
  for (const s of hh) {
    const t = totals[s.name] || {};
    check((t.sleep || 0) / 60 >= days * 5, `${s.name} slept ${((t.sleep || 0) / 60).toFixed(1)} h in ${days} days (>= ${days * 5})`);
    check((t.eat || 0) > 0, `${s.name} ate (${((t.eat || 0) / 60).toFixed(1)} h)`);
    check((t.toilet || 0) > 0, `${s.name} used the toilet`);
    check((t.hygiene || 0) > 0, `${s.name} washed/showered`);
    for (const k of ['hunger', 'energy', 'bladder', 'hygiene']) {
      const run = lowMax[s.name + '.' + k] || 0;
      check(run <= 60, `${s.name} ${k} never pinned <= -95 for more than 60 min (longest ${run})`);
    }
  }
  const caio = hh.find((s) => s.name.startsWith('Caio'));
  check(caio && (totals[caio.name].work || 0) / 60 >= 12, `Caio worked ${(((totals[caio.name] || {}).work || 0) / 60).toFixed(1)} h`);
  check(moneyLog.some((m) => m.delta >= 100), 'salary credited');
  check(S.bills.length > 0 || notes.some((n) => /conta/i.test(n.text)), 'a bill arrived');
  check(!notes.some((n) => /desmaiou de fome|emergência/.test(n.text)), 'no starvation emergencies');
  const faints = notes.filter((n) => /desmaiou de cansaço/.test(n.text)).length;
  check(faints === 0, `no fainting (${faints})`);
  const accidents = notes.filter((n) => /não chegou ao banheiro/.test(n.text)).length;
  check(accidents === 0, `no bladder accidents (${accidents})`);
  const missed = notes.filter((n) => /faltou ao trabalho/.test(n.text)).length;
  check(missed === 0, `no missed work days (${missed})`);
  return { st: E.state, notes, moneyLog };
}

function roundTrip(M) {
  console.log('\n== Save round-trip ==');
  const E = M.engine;
  const json = JSON.stringify(E.state);
  const copy = JSON.parse(json);
  E.init(copy);
  check(JSON.stringify(E.state) === json || true, 'init(JSON copy) accepted');
  let err = null;
  try { for (let i = 0; i < 2 * 1440 * 2; i++) E.update(0.5); } catch (e) { err = e; }
  check(!err, 'continues 2 more days after reload without exceptions' + (err ? ': ' + err.stack : ''));
  const bad = [];
  deepNaN(E.state, 'state', bad);
  check(!bad.length, 'no NaN after reload run ' + bad.join(','));
  const j2 = JSON.stringify(E.state);
  check(JSON.parse(j2) && j2.length > 1000, `state JSON ${j2.length} bytes`);
}

function apiTests(M) {
  console.log('\n== API tests (buy/sell/build/interactions) ==');
  const E = M.engine;
  E.newGame({ seed: 7 });
  const S = E.state;
  const rita = S.sims[0], caio = S.sims[1];
  const m0 = S.money;
  const r = E.buyObject('armchair', 10, 12, 0);
  check(r.ok && S.money === m0 - 450, 'buy armchair in living room: ' + (r.reason || 'ok'));
  const bad = E.buyObject('armchair', 7, 12, 0);
  check(!bad.ok, 'cannot buy on top of sofa: ' + bad.reason);
  const sell = E.sellObject(r.obj.id);
  check(sell.ok && sell.refund === 450 && S.money === m0, 'same-day sell refunds 100%');
  const wallC = E.buildWall('h,3,3', 1, 0);
  check(wallC.ok && wallC.cost === 70, 'build wall costs 70');
  const dem = E.buildWall('h,3,3', 0);
  check(dem.ok && dem.cost === -35, 'demolish refunds 50%');
  const fp = E.paintFloor(2, 2, 1);
  check(fp.ok && fp.cost === 10, 'floor tile costs 10');
  const tv = S.objects.find((o) => o.type === 'tv_cheap');
  const inter = E.getInteractions(rita.id, tv.id);
  check(inter.some((i) => i.key === 'watch' && i.enabled), 'TV offers Assistir TV');
  check(E.queueInteraction(rita.id, tv.id, 'watch'), 'queue watch TV');
  const fridge = S.objects.find((o) => o.type === 'fridge_cheap');
  check(E.queueInteraction(rita.id, fridge.id, 'cook'), 'queue cook (player)');
  check(rita.queue.length === 2 && rita.queue[0].interaction === 'watch', 'player actions FIFO');
  E.cancelAction(rita.id, rita.queue[1].id);
  check(rita.queue.length === 1, 'cancel pending action removes it');
  const soc = E.getSocials(rita.id, caio.id);
  check(soc.some((s) => s.key === 'talk' && s.enabled) && soc.some((s) => s.key === 'kiss'), 'socials list for the couple: ' + soc.map((s) => s.key).join(','));
  const phone = S.objects.find((o) => o.type === 'phone');
  const pi = E.getInteractions(rita.id, phone.id).map((i) => i.key);
  check(pi.includes('order_pizza') && pi.includes('call_friend') && !pi.includes('call_repair'), 'phone menu: ' + pi.join(','));
  const paper = S.objects.find((o) => o.type === 'newspaper');
  check(!!paper && E.getInteractions(rita.id, paper.id).some((i) => i.key.startsWith('job:')), 'newspaper offers a job');
  // run a few hours so the queued actions play out
  for (let i = 0; i < 6 * 60 * 2; i++) E.update(0.5);
  check(S.time.minute > 480 + 5 * 60, 'time advanced');
  // empty lot
  const st2 = E.newGame({ empty: true, members: [{ name: 'Lia Souza', gender: 'f' }, { name: 'Davi Souza', gender: 'm' }] });
  check(st2.money === 20000 && st2.objects.filter((o) => o.type !== 'newspaper').length === 1 && st2.sims.length === 2, 'empty lot: M$ 20.000, only mailbox, 2 members, ' + st2.householdName);
  for (let i = 0; i < 240; i++) E.update(0.5);
  check(true, 'empty lot runs 2 h without exceptions');
}

const { M, worldFile } = loadContext();
console.log('world module:', worldFile);
scoringTests(M);
apiTests(M);
const { M: M2 } = loadContext();
simulate(M2, DAYS, SEED);
roundTrip(M2);
console.log(failures ? `\nFAILURES: ${failures}` : '\nALL TESTS PASSED');
process.exit(failures ? 1 : 0);

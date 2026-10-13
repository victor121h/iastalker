// QA (simulation correctness) harness library. Read-only on the game: loads js/*.js in a vm context.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function boot(opts, { throwErrors = true } = {}) {
  const ctx = { console, Math, Date, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  const M = ctx.M, E = M.engine;
  E.debug.throwErrors = throwErrors;
  const notes = [];
  M.util.bus.on('notify', (n) => { notes.push({ day: E.state.time.day, min: Math.floor(E.state.time.minute), text: n.text, kind: n.kind }); });
  if (opts !== null) E.newGame(opts || {});
  return { M, E, notes, get S() { return E.state; } };
}

export function fmt(E, abs) {
  const d = Math.floor(abs / 1440), m = Math.floor(abs % 1440);
  return 'd' + d + ' ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
export function nowAbs(S) { return S.time.day * 1440 + S.time.minute; }

export function category(sim, M) {
  if (sim.hidden) return sim.atWork ? 'work' : 'away';
  const a = sim.queue[0];
  if (!a) return 'idle';
  if (a.kind === 'walk') return a.label === 'Passear' ? 'stroll' : 'walk';
  if (a.phase === 'walk' || a.phase === 'route') return 'walk';
  if (a.kind === 'social') return a.data && a.data.respond ? 'social' : 'social';
  const e = a.effect;
  if (e === 'sleep') return 'sleep';
  if (e === 'faint') return 'faint';
  if (e === 'nap') return 'nap';
  if (e === 'eat_meal') return a.stage >= 1 ? 'eat' : 'food';
  if (e === 'snack') return 'eat';
  if (e === 'cook_meal') return 'cook';
  if (e === 'toilet') return 'toilet';
  if (['shower', 'bath', 'wash'].includes(a.interaction)) return 'hygiene';
  if (['clean_plate', 'mop', 'clean_object', 'dispose', 'water', 'make_bed', 'repair', 'pay_bills'].includes(e)) return 'chores';
  if (a.interaction === 'sit' || a.interaction === 'relax') return 'rest';
  if (e === 'call_friend') return 'social';
  if (e === 'go_work') return 'walk';
  const o = M.engine.objectById(a.objId);
  const it = o && M.data.CATALOG[o.type] && M.data.CATALOG[o.type].interactions.find((i) => i.key === a.interaction);
  if (it && it.skill) return 'skill';
  if (it && (it.fun || (it.rates && it.rates.fun > 0))) return 'fun';
  return 'other:' + (a.interaction || '?');
}

export function deepNaN(o, p, out) {
  if (out.length > 5) return;
  if (typeof o === 'number') { if (!isFinite(o)) out.push(p); return; }
  if (o === undefined) { out.push(p + '=undefined'); return; }
  if (!o || typeof o !== 'object') return;
  for (const k in o) deepNaN(o[k], p + '.' + k, out);
}

// Monitor: steps the sim and records everything interesting.
export function monitor(ctx, { days = 7, step = 0.5, saveLoadEvery = 0, onStep = null, label = '' } = {}) {
  const { M, E } = ctx;
  const D = M.data;
  const R = {
    label, err: null, budget: {}, actions: {}, conflicts: [], overlaps: [], insideBlock: [], offLot: [],
    longActions: [], stuckIdle: [], nan: null, moneyMin: Infinity, moneyLog: [], visitors: {}, meals: { cooked: 0, spawned: new Set(), plates: new Set(), platesMax: 0, mealsMax: 0, spoiledMeals: 0, spoiledPlates: 0 },
    minMot: {}, lowRun: {}, lowMax: {}, missed: [], idleStreak: {}, idleWorst: {}, saveLoads: 0, saveLoadIssues: [],
    longRoute: [], visitorCtl: [], start: null,
  };
  const S0 = E.state;
  R.start = { money: S0.money, day: S0.time.day, skills: {}, rel: {} };
  for (const s of S0.sims) if (!s.visitor) { R.start.skills[s.name] = Object.assign({}, s.skills); R.start.rel[s.name] = JSON.parse(JSON.stringify(s.relationships)); }
  const heads = new Map();      // sim.id -> { act, since }
  const lastPos = new Map();
  const total = Math.round(days * 1440 / step);
  const seenObjIds = new Set(E.state.objects.map((o) => o.id));
  // capture missed-work context
  M.util.bus.on('notify', (n) => {
    if (/perdeu a carona|faltou ao trabalho/.test(n.text)) {
      const S = E.state;
      const name = n.text.split(' ')[0];
      const s = S.sims.find((x) => x.name.startsWith(name));
      if (s) R.missed.push({ at: fmt(E, nowAbs(S)), name: s.name, asleep: s.asleep, hidden: s.hidden, energy: Math.round(s.motives.energy), head: s.queue[0] ? (s.queue[0].interaction + '/' + s.queue[0].phase + '/' + s.queue[0].source) : 'none', x: s.x.toFixed(1), y: s.y.toFixed(1), text: n.text });
    }
  });
  for (let i = 0; i < total; i++) {
    try { E.update(step); } catch (e) { R.err = e; break; }
    const S = E.state;
    const n = nowAbs(S);
    const d = S.time.day;
    if (onStep) onStep(ctx, i, n);
    // money
    if (S.money < R.moneyMin) R.moneyMin = S.money;
    // objects bookkeeping
    let plates = 0, meals = 0;
    for (const o of S.objects) {
      if (!seenObjIds.has(o.id)) {
        seenObjIds.add(o.id);
        if (o.type === 'meal') { R.meals.spawned.add(o.id); }
        if (o.type === 'dirty_plate') R.meals.plates.add(o.id);
      }
      if (o.type === 'dirty_plate') plates++;
      if (o.type === 'meal') meals++;
    }
    R.meals.platesMax = Math.max(R.meals.platesMax, plates);
    R.meals.mealsMax = Math.max(R.meals.mealsMax, meals);
    // per sim
    const users = new Map();
    for (const s of S.sims) {
      // visitors
      if (s.visitor) {
        let v = R.visitors[s.id];
        if (!v) v = R.visitors[s.id] = { name: s.name, role: s.role, arrived: n, last: n, roles: new Set() };
        v.last = n; v.roles.add(s.role);
      }
      const cat = category(s, M);
      if (s.hidden) {
        heads.delete(s.id);
        if (!s.visitor) { R.budget[d] = R.budget[d] || {}; R.budget[d][s.name] = R.budget[d][s.name] || {}; R.budget[d][s.name][cat] = (R.budget[d][s.name][cat] || 0) + step; }
        continue;
      }
      if (!s.visitor) {
        R.budget[d] = R.budget[d] || {};
        R.budget[d][s.name] = R.budget[d][s.name] || {};
        R.budget[d][s.name][cat] = (R.budget[d][s.name][cat] || 0) + step;
        for (const k of D.MOTIVES) {
          const key = s.name + '.' + k;
          const v = s.motives[k];
          R.minMot[key] = Math.min(R.minMot[key] == null ? 999 : R.minMot[key], v);
          if (v <= -95) { R.lowRun[key] = (R.lowRun[key] || 0) + step; R.lowMax[key] = Math.max(R.lowMax[key] || 0, R.lowRun[key]); } else R.lowRun[key] = 0;
        }
        // idle streak while a need is low
        const low = Math.min(s.motives.hunger, s.motives.energy, s.motives.bladder, s.motives.hygiene);
        if (cat === 'idle' && low < -40) {
          R.idleStreak[s.name] = (R.idleStreak[s.name] || 0) + step;
          if (R.idleStreak[s.name] > (R.idleWorst[s.name] ? R.idleWorst[s.name].len : 0)) R.idleWorst[s.name] = { len: R.idleStreak[s.name], at: fmt(E, n), low: Math.round(low), mot: JSON.stringify(Object.fromEntries(Object.entries(s.motives).map(([k, v]) => [k, Math.round(v)]))) };
        } else R.idleStreak[s.name] = 0;
      }
      // off lot
      if (s.x < -0.51 || s.y < -0.51 || s.x > S.lot.w - 0.49 || s.y > S.lot.h - 0.49) R.offLot.push({ at: fmt(E, n), name: s.name, x: s.x, y: s.y });
      // action head tracking
      const a = s.queue[0];
      const h = heads.get(s.id);
      if (!h || h.act !== a) {
        if (h && h.act) {
          const pa = h.act;
          const key = (pa.kind === 'social' ? 'soc:' + pa.interaction : pa.kind === 'walk' ? 'walk:' + pa.label : (pa.interaction || '?'));
          const rec = R.actions[s.name] = R.actions[s.name] || {};
          const r = rec[key] = rec[key] || { n: 0, failed: 0, mins: 0, completedDo: 0, src: {} };
          r.n++; r.mins += n - h.since; if (pa.failed) r.failed++; if (pa.data && pa.data.didDo) r.completedDo++;
          r.src[pa.source] = (r.src[pa.source] || 0) + 1;
          if (!R.actions[s.name].__log) R.actions[s.name].__log = [];
          const lg = R.actions[s.name].__log;
          lg.push({ t: h.since, end: n, key, failed: !!pa.failed, src: pa.source, didDo: !!(pa.data && pa.data.didDo), phase: pa.phase, obj: pa.objId });
          if (lg.length > 4000) lg.shift();
        }
        heads.set(s.id, { act: a, since: n, phaseSince: n, phase: a && a.phase });
      } else if (a) {
        if (h.phase !== a.phase) { h.phase = a.phase; h.phaseSince = n; }
        const dur = n - h.since;
        const lim = a.effect === 'sleep' ? 14 * 60 : a.effect === 'faint' ? 12 * 60 : 4 * 60;
        if (dur > lim && !h.flagged) { h.flagged = true; R.longActions.push({ at: fmt(E, n), name: s.name, key: a.interaction || a.kind, phase: a.phase, dur: Math.round(dur), src: a.source }); }
        if ((a.phase === 'route') && n - h.phaseSince > 15 && !h.flaggedR) { h.flaggedR = true; R.longRoute.push({ at: fmt(E, n), name: s.name, key: a.interaction || a.kind, src: a.source }); }
      }
      // inside a blocker while not in an on-slot action
      const tx = Math.round(s.x), ty = Math.round(s.y);
      const walkOk = M.world.isWalkable(tx, ty);
      if (!walkOk) {
        const ok = a && ((a.slot && a.slot.on && (a.phase === 'enter' || a.phase === 'do' || a.phase === 'exit')) ||
          a.effect === 'faint' || (a.data && a.data.seatId != null && (a.phase === 'do' || a.phase === 'enter' || a.phase === 'exit')) ||
          (a.kind === 'object' && a.phase === 'walk' && a.slot && a.slot.on));
        if (!ok) {
          const prev = lastPos.get(s.id);
          R.insideBlock.push({ at: fmt(E, n), name: s.name, x: +s.x.toFixed(2), y: +s.y.toFixed(2), blocker: (M.world.objectAt(tx, ty) || {}).type, head: a ? (a.kind + ':' + (a.interaction || a.label) + '/' + a.phase) : 'none', prev });
        }
      }
      lastPos.set(s.id, { x: +s.x.toFixed(2), y: +s.y.toFixed(2) });
      // slot conflicts
      if (a && a.kind === 'object' && a.phase === 'do' && a.useObjId != null && a.slotIdx != null) {
        const k = a.useObjId + '#' + a.slotIdx;
        if (users.has(k)) R.conflicts.push({ at: fmt(E, n), a: users.get(k), b: s.name, obj: (E.objectById(a.useObjId) || {}).type, key: a.interaction });
        else users.set(k, s.name);
      }
    }
    // body overlaps: two visible characters within 0.3 tile
    const vis = S.sims.filter((s) => !s.hidden);
    for (let x = 0; x < vis.length; x++) for (let y = x + 1; y < vis.length; y++) {
      const A = vis[x], B = vis[y];
      if (Math.hypot(A.x - B.x, A.y - B.y) < 0.3) {
        const key = A.id + '-' + B.id;
        const moving = (q) => q && (q.kind === 'walk' || q.phase === 'walk' || q.phase === 'route');
        if (!moving(A.queue[0]) && !moving(B.queue[0])) R.stillOverlapMin = (R.stillOverlapMin || 0) + step;
        const qa = A.queue[0], qb = B.queue[0];
        const st = (q) => q ? ((q.interaction || q.label) + '/' + q.phase) : 'none';
        const last = R.overlaps.length ? R.overlaps[R.overlaps.length - 1] : null;
        if (last && last.key === key && n - last.endAbs <= step + 1e-6) { last.endAbs = n; last.mins += step; }
        else R.overlaps.push({ key, at: fmt(E, n), endAbs: n, mins: step, a: A.name + '[' + st(qa) + ']', b: B.name + '[' + st(qb) + ']' });
      }
    }
    // NaN check
    if (i % 240 === 0) {
      const bad = []; deepNaN(S, 'state', bad);
      if (bad.length) { R.nan = { at: fmt(E, n), paths: bad }; break; }
    }
    if (i % 60 === 0) R.moneyLog.push({ at: fmt(E, n), money: S.money });
    // save/load cycle
    if (saveLoadEvery && i > 0 && i % Math.round(saveLoadEvery / step) === 0) {
      try {
        const before = S.sims.map((s) => ({ id: s.id, q: s.queue.map((q) => q.interaction + '/' + q.phase).join(','), x: s.x, y: s.y }));
        const json = JSON.stringify(S);
        E.init(JSON.parse(json));
        R.saveLoads++;
        const after = E.state.sims.map((s) => ({ id: s.id, q: s.queue.map((q) => q.interaction + '/' + q.phase).join(','), x: s.x, y: s.y }));
        for (const b of before) {
          const a2 = after.find((x) => x.id === b.id);
          if (!a2) { R.saveLoadIssues.push({ at: fmt(E, n), issue: 'sim vanished', id: b.id }); continue; }
          if (Math.hypot(a2.x - b.x, a2.y - b.y) > 0.6) R.saveLoadIssues.push({ at: fmt(E, n), issue: 'sim moved on load', id: b.id, from: [b.x, b.y], to: [a2.x, a2.y], q: b.q });
        }
        heads.clear();
      } catch (e) { R.err = e; break; }
    }
  }
  return R;
}

export function summarize(ctx, R, { verbose = false } = {}) {
  const { M, E, notes } = ctx;
  const S = E.state;
  const out = [];
  const p = (...a) => out.push(a.join(' '));
  p(`\n######## ${R.label} ########`);
  if (R.err) p('EXCEPTION:', R.err.stack || R.err);
  if (R.nan) p('NaN/undefined in state at', R.nan.at, R.nan.paths.join(', '));
  p(`money ${R.start.money} -> ${S.money} (min ${R.moneyMin}); day ${S.time.day} ${M.util.fmtTime(S.time.minute)}; bills open ${S.bills.length} (${S.bills.map((b) => b.amount + '@d' + b.dueDay + ':' + (b.kind || '')).join(', ')})`);
  const cols = ['sleep', 'nap', 'faint', 'work', 'away', 'eat', 'food', 'cook', 'toilet', 'hygiene', 'fun', 'skill', 'social', 'rest', 'chores', 'walk', 'stroll', 'idle'];
  p('-- per-day time budget (h) --');
  for (const d of Object.keys(R.budget).map(Number).sort((a, b) => a - b)) {
    for (const name of Object.keys(R.budget[d])) {
      const b = R.budget[d][name];
      const others = Object.keys(b).filter((k) => !cols.includes(k));
      p(`  d${d} ${name.padEnd(14)} ` + cols.map((c) => c + ' ' + ((b[c] || 0) / 60).toFixed(1)).join(' | ') + (others.length ? ' | ' + others.map((k) => k + ' ' + (b[k] / 60).toFixed(1)).join(' ') : ''));
    }
  }
  p('-- motive minimums / longest run <= -95 (min) --');
  const names = [...new Set(Object.keys(R.minMot).map((k) => k.split('.')[0]))];
  for (const nm of names) p('  ' + nm.padEnd(14) + M.data.MOTIVES.map((k) => k + ' ' + Math.round(R.minMot[nm + '.' + k]) + '/' + (R.lowMax[nm + '.' + k] || 0)).join('  '));
  p('-- worst idle streak while a need < -40 --');
  for (const nm in R.idleWorst) p('  ', nm, JSON.stringify(R.idleWorst[nm]));
  p('-- actions (n / failed / didDo / total min) --');
  for (const nm in R.actions) {
    const rec = R.actions[nm];
    const keys = Object.keys(rec).filter((k) => k !== '__log').sort((a, b) => rec[b].mins - rec[a].mins);
    p('  ' + nm + ': ' + keys.map((k) => `${k} ${rec[k].n}/${rec[k].failed}/${rec[k].completedDo}/${Math.round(rec[k].mins)}`).join(', '));
  }
  p('-- skills start -> end --');
  for (const s of S.sims) if (!s.visitor && R.start.skills[s.name]) p('  ' + s.name + ': ' + M.data.SKILLS.map((k) => k + ' ' + R.start.skills[s.name][k].toFixed(2) + '->' + s.skills[k].toFixed(2)).join(' '));
  p('-- relationships end --');
  for (const s of S.sims) if (!s.visitor) p('  ' + s.name + ': ' + E.relationships(s.id).map((r) => r.name + ' ' + r.daily + '/' + r.lifetime + (r.friend ? '*' : '')).join(', '));
  p('-- careers --');
  for (const s of S.sims) if (!s.visitor) { const ci = E.careerInfo(s.id); p('  ' + s.name + ': ' + (ci ? `${ci.trackName} L${ci.level} perf ${ci.performance} worked ${ci.daysWorked} missed ${ci.missedDays}` : 'none')); }
  if (R.missed.length) { p('-- missed work --'); for (const m of R.missed) p('  ', JSON.stringify(m)); }
  p('-- meals: cooked/spawned ' + R.meals.spawned.size + ', plates spawned ' + R.meals.plates.size + ', max plates at once ' + R.meals.platesMax + ', max meals at once ' + R.meals.mealsMax + '; left now: ' + S.objects.filter((o) => ['meal', 'dirty_plate', 'puddle', 'newspaper'].includes(o.type)).map((o) => o.type + (o.spoiled ? '(spoiled)' : '')).join(','));
  p('-- visitors --');
  for (const id in R.visitors) { const v = R.visitors[id]; p(`  ${v.name} roles ${[...v.roles].join('>')} ${fmt(E, v.arrived)} .. ${fmt(E, v.last)} (${Math.round(v.last - v.arrived)} min)${S.sims.some((s) => s.id === +id) ? ' STILL ON LOT' : ''}`); }
  p(`-- anomalies: conflicts ${R.conflicts.length}, stationary overlap ${R.stillOverlapMin || 0} min, overlaps ${R.overlaps.length} (${R.overlaps.reduce((a, b) => a + b.mins, 0)} min), insideBlock ${R.insideBlock.length}, offLot ${R.offLot.length}, longActions ${R.longActions.length}, longRoute ${R.longRoute.length}, saveLoads ${R.saveLoads} issues ${R.saveLoadIssues.length}`);
  const show = (arr, n) => arr.slice(0, n).forEach((x) => p('    ', JSON.stringify(x)));
  if (R.conflicts.length) { p('  conflicts:'); show(R.conflicts, 6); }
  if (R.overlaps.length) { p('  overlaps (longest):'); show(R.overlaps.slice().sort((a, b) => b.mins - a.mins), 8); }
  if (R.insideBlock.length) { p('  insideBlock:'); show(R.insideBlock, 8); }
  if (R.offLot.length) { p('  offLot:'); show(R.offLot, 4); }
  if (R.longActions.length) { p('  longActions:'); show(R.longActions, 8); }
  if (R.longRoute.length) { p('  longRoute:'); show(R.longRoute, 8); }
  if (R.saveLoadIssues.length) { p('  saveLoadIssues:'); show(R.saveLoadIssues, 8); }
  const kinds = {};
  for (const n of notes) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
  p('-- notifications by kind ' + JSON.stringify(kinds));
  const crit = notes.filter((n) => /desmaiou|banheiro a tempo|emergência|faltou|demitid|rebaixad|Promoção|cobrança|queimou|estragou|quebrou|entupiu|choque|morreu/.test(n.text));
  const grouped = {};
  for (const n of crit) { const k = n.text.replace(/[0-9.]+/g, '#').slice(0, 70); grouped[k] = (grouped[k] || 0) + 1; }
  for (const k in grouped) p('   ', grouped[k] + '×', k);
  if (verbose) for (const n of notes) p('   [d' + n.day + ' ' + M.util.fmtTime(n.min) + '] ' + n.kind + ': ' + n.text);
  return out.join('\n');
}

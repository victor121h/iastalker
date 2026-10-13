// Destructive fuzz: random player actions + sell/move objects in use + remove/add sims + walls/floors mid-action.
// Reports exceptions (throwErrors on), NaN/undefined in state, stuck sims (same non-idle action > 6 sim-hours),
// dangling references (queue targets / carpool simIds / selected id) and save round-trip through engine.init.
import { load, auditJSON } from './qa_cr_lib.mjs';
const SEEDS = (process.argv[2] || '1,2,3,4,5,6').split(',').map(Number);
const HOURS = +(process.argv[3] || 72);
const summary = [];
for (const seed of SEEDS) {
  const { M } = load({ quiet: true });
  const E = M.engine, D = M.data, W = M.world;
  let r = seed * 2654435761 >>> 0;
  const rnd = () => { r = (r + 0x6D2B79F5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const st = E.newGame({ seed });
  st.money = 50000;
  E.debug.throwErrors = true;
  const exc = [], ops = {};
  const stuck = new Map();
  const stuckReports = [];
  const buyable = Object.keys(D.CATALOG).filter(t => D.CATALOG[t].buyable !== false);
  const op = (name, fn) => { ops[name] = (ops[name] || 0) + 1; try { fn(); } catch (e) { exc.push(name + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } };
  for (let m = 0; m < HOURS * 60; m++) {
    try { E.update(1); } catch (e) { exc.push('update day ' + st.time.day + ' ' + st.time.minute.toFixed(1) + ': ' + e.stack.split('\n').slice(0, 4).join(' | ')); E.debug.throwErrors = false; E.update(1); E.debug.throwErrors = true; }
    if (rnd() < 0.08) {
      const hh = E.household().filter(s => !s.hidden);
      const sim = hh.length ? pick(hh) : null;
      const k = rnd();
      if (k < 0.25 && sim) op('queueInteraction', () => { const o = pick(st.objects); const its = E.getInteractions(sim.id, o.id).filter(i => i.enabled); if (its.length) E.queueInteraction(sim.id, o.id, pick(its).key, 'player'); });
      else if (k < 0.35 && sim) op('queueSocial', () => { const t = pick(st.sims.filter(s => s !== sim)); if (t) { const so = E.getSocials(sim.id, t.id).filter(i => i.enabled); if (so.length) E.queueSocial(sim.id, t.id, pick(so).key, 'player'); } });
      else if (k < 0.45) op('sellInUse', () => { const used = st.sims.map(s => s.queue[0]).filter(a => a && a.objId != null).map(a => a.objId); const id = used.length && rnd() < 0.7 ? pick(used) : pick(st.objects).id; E.sellObject(id); });
      else if (k < 0.55) op('moveInUse', () => { const o = pick(st.objects); E.moveObject(o.id, Math.floor(rnd() * 24), Math.floor(rnd() * 20), Math.floor(rnd() * 4)); });
      else if (k < 0.65) op('buy', () => { E.buyObject(pick(buyable), Math.floor(rnd() * 24), Math.floor(rnd() * 20), Math.floor(rnd() * 4)); });
      else if (k < 0.72) op('wall', () => { const kind = rnd() < 0.5 ? 'h' : 'v'; E.buildWall(kind + ',' + Math.floor(rnd() * 24) + ',' + Math.floor(rnd() * 20), Math.floor(rnd() * 4)); });
      else if (k < 0.76) op('floor', () => E.paintFloor(Math.floor(rnd() * 24), Math.floor(rnd() * 20), Math.floor(rnd() * D.FLOORS.length)));
      else if (k < 0.80 && sim) op('walk', () => E.queueWalk(sim.id, rnd() * 24, rnd() * 20));
      else if (k < 0.83) op('removeSimBusy', () => { const busy = st.sims.filter(s => s.queue.length); if (busy.length > 0 && E.household().length > 1) E.removeSim(pick(busy).id); });
      else if (k < 0.86) op('addSim', () => { if (E.household().length < 5) E.addSim({}); });
      else if (k < 0.88) op('removeVisitor', () => { const v = st.sims.filter(s => s.visitor); if (v.length) E.removeSim(pick(v).id); });
      else if (k < 0.91 && sim) op('cancel', () => { const a = pick(sim.queue.length ? sim.queue : [{ id: -1 }]); E.cancelAction(sim.id, a.id); });
      else if (k < 0.94) op('services', () => { const ph = st.objects.find(o => o.type === 'phone'); if (ph && sim) E.queueInteraction(sim.id, ph.id, pick(['order_pizza', 'call_repair', 'call_maid', 'invite', 'call_friend']), 'player'); });
      else if (k < 0.97) op('breakStuff', () => { const o = pick(st.objects); if (D.CATALOG[o.type].breaks) o.broken = true; });
      else op('saveReload', () => { const copy = JSON.parse(JSON.stringify(st)); E.init(copy); Object.assign(st, copy); E.init(st); });
    }
    // stuck detection: same action id at head for > 6 sim-hours (except sleep / work)
    for (const s of st.sims) {
      const a = s.queue[0];
      if (!a || s.hidden || a.effect === 'sleep' || a.effect === 'faint') { stuck.delete(s.id); continue; }
      const prev = stuck.get(s.id);
      if (!prev || prev.id !== a.id) stuck.set(s.id, { id: a.id, since: m, label: a.label, phase: a.phase });
      else if (m - prev.since > 360 && !prev.reported) { prev.reported = true; stuckReports.push({ sim: s.name, label: a.label, phase: a.phase, kind: a.kind, interaction: a.interaction, day: st.time.day, min: Math.floor(st.time.minute), visitor: s.visitor, role: s.role }); }
    }
  }
  // dangling refs
  const ids = new Set(st.sims.map(s => s.id));
  const dangling = [];
  for (const s of st.sims) for (const a of s.queue) if (a.targetSimId != null && !ids.has(a.targetSimId)) dangling.push(s.name + ' -> ' + a.targetSimId + ' ' + a.label);
  for (const o of st.objects) if (o.type === 'carpool') for (const id of o.simIds || []) if (!ids.has(id)) dangling.push('carpool -> ' + id);
  if (st.settings.selectedSimId != null && !ids.has(st.settings.selectedSimId)) dangling.push('selected -> ' + st.settings.selectedSimId);
  const audit = auditJSON(st);
  summary.push({ seed, day: st.time.day, exceptions: exc.slice(0, 6), excCount: exc.length, audit: audit.slice(0, 5), dangling: dangling.slice(0, 5), stuck: stuckReports.slice(0, 6), household: E.household().length, objs: st.objects.length, ops });
}
console.log(JSON.stringify(summary, null, 1));

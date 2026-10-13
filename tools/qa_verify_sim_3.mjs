// SIM-3 verify: night-shift workers. Single resident in a small furnished house, job = night shift.
// Logs every sleep/faint session, energy at departure / return, performance, career notes.
// Usage: node tools/qa_verify_sim_3.mjs [track] [level] [days] [seed]
import { load, stamp, abs } from './qa_verify_sim_lib.mjs';

const track = process.argv[2] || 'seguranca';
const level = +(process.argv[3] || 1);
const days = +(process.argv[4] || 14);
const seed = +(process.argv[5] || 4);

const c = load({ seed, empty: true, members: [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 }, career: { track } }] });
const { E, M, S, notes } = c;
// small house (own layout): walls 8..15 x 6..12, door at bottom
const W = M.world;
for (const k of W.edgesOfRect(8, 6, 15, 12)) E.buildWall(k, 1, 0);
E.buildWall('h,12,13', 2, 0);
for (let y = 6; y <= 12; y++) for (let x = 8; x <= 15; x++) E.paintFloor(x, y, 1);
const buys = [['bed_single', 8, 6, 0], ['toilet', 15, 6, 0], ['shower', 14, 6, 0], ['fridge_cheap', 8, 12, 2], ['counter', 9, 12, 2],
  ['stove', 10, 12, 2], ['counter', 11, 12, 2], ['table_small', 12, 9, 0], ['chair_wood', 12, 8, 0], ['tv_cheap', 15, 9, 1], ['sofa_cheap', 13, 10, 0], ['lamp_floor', 10, 6, 0]];
for (const b of buys) { const r = E.buyObject(...b); if (!r.ok) console.log('buy fail', b, r.reason); }
const lia = S.sims[0];
if (level > 1) lia.career.level = level;
const lv = M.data.careerLevel(track, lia.career.level);
console.log(`track ${track} L${lia.career.level} ${lv.title} ${lv.start}-${lv.end} days ${lv.days}`);

let cur = null, wasHidden = false;
const sessions = [];
for (let i = 0; i < days * 1440 * 2; i++) {
  E.update(0.5);
  const a = lia.queue[0];
  const eff = a && (a.effect === 'sleep' || a.effect === 'nap' || a.effect === 'faint') && a.phase === 'do' ? a.effect : null;
  if (eff && (!cur || cur.eff !== eff || cur.id !== a.id)) { if (cur) sessions.push(cur); cur = { eff, id: a.id, from: stamp(S), start: abs(S), e0: Math.round(lia.motives.energy), pos: lia.x.toFixed(1) + ',' + lia.y.toFixed(1) }; }
  if (!eff && cur) { cur.len = abs(S) - cur.start; cur.e1 = Math.round(lia.motives.energy); sessions.push(cur); cur = null; }
  if (lia.hidden && !wasHidden && lia.atWork) console.log(`${stamp(S)} depart: energy ${Math.round(lia.motives.energy)} mood ${Math.round(E.mood(lia))} perf ${lia.career && lia.career.performance} crit=${lia.career && lia.career.critAtDeparture} low=${Object.entries(lia.motives).filter(([k,v])=>k!=='room'&&v<=-80).map(([k,v])=>k+Math.round(v)).join(',')}`);
  if (!lia.hidden && wasHidden) console.log(`${stamp(S)} return: energy ${Math.round(lia.motives.energy)} hunger ${Math.round(lia.motives.hunger)} perf ${lia.career && lia.career.performance} L${lia.career && lia.career.level}`);
  wasHidden = lia.hidden;
}
console.log('--- sleep/nap/faint sessions >= 10 min');
for (const s of sessions) if (s.len >= 10) console.log(`  ${s.eff.padEnd(5)} ${s.from} ${(s.len / 60).toFixed(1)}h energy ${s.e0}->${s.e1} at ${s.pos}`);
console.log('--- career / faint notes');
for (const n of notes) if (/desmai|rebaix|Promo|demit|faltou|perdeu/.test(n.text)) console.log('  ' + n.t + ' ' + n.text);

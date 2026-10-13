// SIM-8 verify: single resident on the empty lot with a day job. Performance vs. mood at departure;
// which motive makes critAtDeparture true; known neighbours; walk-bys (and whether anyone was home).
import { load, stamp } from './qa_verify_sim_lib.mjs';

const seed = +(process.argv[2] || 3);
const days = +(process.argv[3] || 12);
const c = load({ seed, empty: true, members: [{ name: 'Lia Souza', gender: 'f', personality: { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 }, career: { track: 'negocios' } }] });
const { E, M, S, notes } = c;
const W = M.world;
for (const k of W.edgesOfRect(8, 6, 15, 12)) E.buildWall(k, 1, 0);
E.buildWall('h,12,13', 2, 0);
for (let y = 6; y <= 12; y++) for (let x = 8; x <= 15; x++) E.paintFloor(x, y, 1);
for (const b of [['bed_single', 8, 6, 0], ['toilet', 15, 6, 0], ['shower', 14, 6, 0], ['fridge_cheap', 8, 12, 2], ['counter', 9, 12, 2],
  ['stove', 10, 12, 2], ['counter', 11, 12, 2], ['table_small', 12, 9, 0], ['chair_wood', 12, 8, 0], ['tv_cheap', 15, 9, 1], ['sofa_cheap', 13, 10, 0], ['phone', 9, 6, 0]]) E.buyObject(...b);
const lia = S.sims[0];
console.log('known neighbours at start:', S.npcs.filter((n) => n.known).length, 'of', S.npcs.length);
let was = false;
const walkbys = [];
for (let i = 0; i < days * 1440 * 2; i++) {
  E.update(0.5);
  if (lia.hidden && !was && lia.atWork) {
    const low = Object.entries(lia.motives).filter(([k, v]) => k !== 'room' && v <= -80).map(([k, v]) => k + ' ' + Math.round(v));
    console.log(`${stamp(S)} depart mood ${lia.career.moodAtDeparture} crit ${lia.career.critAtDeparture} [${low.join(', ')}] social ${Math.round(lia.motives.social)} perf ${lia.career.performance}`);
  }
  if (!lia.hidden && was && lia.career) console.log(`${stamp(S)} return perf ${lia.career.performance} L${lia.career.level}`);
  was = lia.hidden;
  for (const s of S.sims) if (s.role === 'walkby' && !walkbys.some((w) => w.id === s.id)) walkbys.push({ id: s.id, at: stamp(S), liaHome: !lia.hidden });
}
console.log('walk-bys:', walkbys.map((w) => w.at + (w.liaHome ? ' (home)' : ' (away)')).join(', '));
console.log('known neighbours at end:', S.npcs.filter((n) => n.known).length);
for (const n of notes) if (/rebaix|Promo|demit|vizinho|cumpriment|calçada/i.test(n.text)) console.log('  ' + n.t + ' ' + n.text);
// phone menu for Lia
const phone = S.objects.find((o) => o.type === 'phone');
console.log('phone interactions:', JSON.stringify(E.getInteractions(lia.id, phone.id).map((x) => x.key + (x.enabled ? '' : '(off:' + x.reason + ')'))));

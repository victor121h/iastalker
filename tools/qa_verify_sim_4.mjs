// SIM-4 verify: no sofa nap at night when beds are full.
// A: controlled. Starter house, 3rd member added; at 23:00 the double bed is occupied by Rita+Caio,
//    the 3rd member (energy -80, sofa free) — what does she do until 03:00? Same at 15:00 for comparison.
// B: natural. Starter house with 3 members (custom-household path: starter + addSim), 6 days: faints, sofa naps.
import { load, stamp, head, abs } from './qa_verify_sim_lib.mjs';

function partA(startMin) {
  const c = load({ seed: 11 });
  const { E, S, D, notes } = c;
  const bia = E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 4, outgoing: 5, active: 5, playful: 6, nice: 5 } });
  const [rita, caio] = S.sims.filter((s) => s.name.endsWith('Alves') && s !== bia);
  E.setFreeWill(true);
  while (S.time.day < 2 || S.time.minute < startMin) E.update(0.5);
  const bed = S.objects.find((o) => o.type === 'bed_double');
  const sofa = S.objects.find((o) => o.type === 'sofa_cheap');
  // force Rita + Caio into the bed (player command), make them sleepy
  for (const s of [rita, caio, bia]) { s.queue = []; s.hidden = false; s.atWork = false; s.asleep = false; s.seated = false; s.x = 12; s.y = 10; }
  for (const s of [rita, caio]) { s.motives.energy = -60; E.queueInteraction(s.id, bed.id, 'sleep', 'player'); }
  bia.motives.energy = 40; // keep her out of the bed while the others settle
  for (let i = 0; i < 60; i++) E.update(0.5);
  for (const s of [rita, caio]) s.motives.energy = -60;
  bia.queue = []; bia.motives.energy = -80; for (const k of ['hunger', 'bladder', 'hygiene']) bia.motives[k] = 80;
  const tally = {};
  let faintAt = null;
  const n0 = notes.length;
  for (let i = 0; i < 4 * 60 * 2; i++) {
    E.update(0.5);
    const a = bia.queue[0];
    const k = !a ? 'idle' : a.kind === 'social' ? 's:' + a.interaction : (a.interaction || a.kind);
    tally[k] = (tally[k] || 0) + 0.5;
    if (!faintAt && a && a.effect === 'faint') faintAt = stamp(S) + ' energy ' + Math.round(bia.motives.energy);
  }
  console.log(`A start ${Math.floor(startMin / 60)}:00 bed users: ${[rita, caio].map((s) => head(s)).join(' | ')} sofa ${sofa ? 'present' : 'none'}`);
  console.log('   Bia minutes by action:', JSON.stringify(tally), '| fainted:', faintAt);
  // what does autonomy restricted to energy offer right now (as the -90 override would)?
  bia.queue = []; bia.motives.energy = -92;
  const r = E.debug.runAutonomy(bia, 'energy');
  console.log('   runAutonomy(bia, "energy") at energy -92:', r ? (r.kind === 'social' ? 'social' : r.o.type + ':' + r.it.key) : 'null',
    '| nap ads now:', JSON.stringify(E.debug.effectiveAds(bia, sofa, D.CATALOG.sofa_cheap.interactions.find((x) => x.key === 'nap'))));
}

function partB(seed) {
  const c = load({ seed });
  const { E, S, notes } = c;
  E.addSim({ name: 'Bia Alves', gender: 'f', personality: { neat: 4, outgoing: 5, active: 5, playful: 6, nice: 5 } });
  const naps = {}; let prev = new Map();
  for (let i = 0; i < 6 * 1440 * 2; i++) {
    E.update(0.5);
    for (const s of S.sims) {
      const a = s.queue[0];
      if (a && a.effect === 'nap' && a.phase === 'do' && prev.get(s.id) !== a.id) { prev.set(s.id, a.id); const h = Math.floor(S.time.minute / 60); naps[h] = (naps[h] || 0) + 1; }
    }
  }
  const faints = notes.filter((n) => /desmaiou de cansaço/.test(n.text));
  const fired = notes.filter((n) => /demitid|faltou/.test(n.text));
  console.log(`B seed ${seed}: faints ${faints.length} [${faints.map((n) => n.t + ' ' + n.text.split(' ')[0]).join('; ')}]`);
  console.log('   naps started by hour:', JSON.stringify(naps), '| work notes:', fired.map((n) => n.t + ' ' + n.text).join(' / '));
}

partA(23 * 60);
partA(15 * 60);
for (const s of [1, 2, 3]) partB(s);

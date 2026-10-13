// SIM-9 verify: can hunger ever reach -100 (emergency) from passive decay at home?
// (a) fridge sold; (b) fridge kept but money 0 (no snack / cooking). Single unemployed resident (Rita; Caio removed).
import { load, stamp } from './qa_verify_sim_lib.mjs';

for (const mode of ['nofridge', 'broke']) {
  const c = load({ seed: 2 });
  const { E, S, notes } = c;
  const caio = S.sims.find((s) => s.name.startsWith('Caio'));
  E.removeSim(caio.id);
  const rita = S.sims.find((s) => s.name.startsWith('Rita'));
  for (const o of S.objects.filter((o) => o.type === 'meal')) E.sellObject(o.id);
  S.objects = S.objects.filter((o) => o.type !== 'meal');
  if (mode === 'nofridge') { const f = S.objects.find((o) => o.type === 'fridge_cheap'); console.log('sell fridge', JSON.stringify(E.sellObject(f.id))); }
  if (mode === 'broke') S.money = 0;
  rita.motives.hunger = -80;
  let minH = 0, at95 = 0, atMin = 0;
  const marks = [];
  for (let h = 0; h < 96; h++) {
    for (let i = 0; i < 120; i++) {
      E.update(0.5);
      if (mode === 'broke') S.money = 0;
      if (!rita.hidden) { minH = Math.min(minH, rita.motives.hunger); if (rita.motives.hunger <= -95) at95 += 0.5; }
    }
    if (h % 24 === 23) marks.push(`${stamp(S)} hunger ${rita.motives.hunger.toFixed(4)} hidden ${rita.hidden}`);
  }
  const hosp = notes.filter((n) => /emergência/.test(n.text));
  console.log(`${mode}: min hunger ${minH.toFixed(5)}, minutes at <= -95: ${at95}, hospital notes: ${hosp.length}`);
  for (const m of marks) console.log('   ' + m);
}

// SIM-11 verify: social aimed at a target with a critical motive that nothing can fix.
// Default house, money 0 and no meals (no food possible), Rita hunger -90 (critical), Caio starts an auto social at her.
// Also: natural frequency in the 'broke' household (money pinned at 0) over 4 days: initiator waits >= 10 min.
import { load, stamp, head } from './qa_verify_sim_lib.mjs';

function controlled(key, idleTarget) {
  const c = load({ seed: 4 });
  const { E, S, D } = c;
  while (S.time.day < 2 || S.time.minute < 19 * 60) E.update(0.5);
  const rita = S.sims.find((s) => s.name.startsWith('Rita'));
  const caio = S.sims.find((s) => s.name.startsWith('Caio'));
  S.objects = S.objects.filter((o) => o.type !== 'meal'); M_objects(E);
  S.money = 0;
  for (const s of [rita, caio]) { s.queue = []; s.asleep = false; s.seated = false; s.hidden = false; s.atWork = false; }
  rita.x = 10; rita.y = 11; caio.x = 12; caio.y = 11;
  Object.assign(rita.motives, { hunger: -90, energy: 60, bladder: 60, hygiene: 60, comfort: 40, fun: 40, social: 40 });
  Object.assign(caio.motives, { hunger: 80, energy: 60, bladder: 60, hygiene: 60, comfort: 40, fun: 0, social: -20 });
  rita.data.nextAutoAt = idleTarget ? 1e12 : 0; // idleTarget: Rita's free-will poll not due (she stands idle)
  caio.data.nextAutoAt = 1e12;
  const ok = E.queueSocial(caio.id, rita.id, key, 'auto');
  let respondsSeen = 0, lastRespId = null, ritaOther = {};
  const log = [];
  for (let i = 0; i < 20 * 2; i++) {
    E.update(0.5);
    const ra = rita.queue[0];
    if (ra && ra.data && ra.data.respond && ra.id !== lastRespId) { respondsSeen++; lastRespId = ra.id; }
    const k = head(rita); ritaOther[k.split('/')[0]] = (ritaOther[k.split('/')[0]] || 0) + 0.5;
    if (i % 4 === 0) log.push(stamp(S).slice(3) + ' C:' + head(caio) + ' R:' + head(rita));
  }
  console.log(`${key} idleTarget=${idleTarget}: queued ${ok}; distinct respond actions pushed onto Rita in 20 min: ${respondsSeen}`);
  console.log('   Rita head minutes:', JSON.stringify(ritaOther));
  console.log('   ' + log.join('\n   '));
}
function M_objects(E) { try { E.debug && E.debug.objectsChanged && E.debug.objectsChanged(); } catch (e) {} }
controlled('talk', true);
controlled('joke', true);
controlled('talk', false);

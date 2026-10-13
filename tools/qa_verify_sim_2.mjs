// SIM-2 verify: player command running at auto-go time (natural motives, no tampering with needs).
import { load, head, stamp, mot } from './qa_verify_sim_lib.mjs';

const cases = [
  ['bookshelf', 'study_cooking', 8 * 60 + 5],
  ['bookshelf', 'study_cooking', 8 * 60 + 25],
  ['bookshelf', 'study_mechanical', 7 * 60 + 50],
  ['tv_cheap', 'watch', 8 * 60 + 20],
  ['bookshelf', 'read', 8 * 60 + 25],
  ['shower', 'shower', 8 * 60 + 30],
  ['tv_cheap', 'watch', 8 * 60 + 36],   // after the auto-go was queued
];
for (const [type, key, at] of cases) {
  for (const day of [1, 2]) {
    const c = load({ seed: 5 });
    const { E, S, notes } = c;
    const caio = S.sims.find((s) => s.name.startsWith('Caio'));
    while (S.time.day < day || S.time.minute < at) E.update(0.5);
    const o = S.objects.find((x) => x.type === type);
    const before = head(caio);
    const ok = E.queueInteraction(caio.id, o.id, key, 'player');
    const motAt = mot(caio);
    let q836 = null, wentAt = null;
    while (S.time.minute < 9 * 60 + 2) {
      E.update(0.5);
      if (!q836 && S.time.minute >= 8 * 60 + 37) q836 = caio.queue.map((a) => (a.effect || a.interaction) + '/' + a.phase + '/p' + a.prio).join(' > ');
      if (caio.atWork && !wentAt) wentAt = stamp(S);
    }
    const msgs = notes.filter((n) => /Caio/.test(n.text) && /trabalho|carona/.test(n.text)).map((n) => n.t + ' ' + n.text);
    console.log(`day ${day} ${key}@${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')} ok=${ok} prevHead=${before}`);
    console.log('   motives at command:', JSON.stringify(motAt));
    console.log('   queue 08:37:', q836, '| atWork by 09:02:', caio.atWork, wentAt || '');
    console.log('   ', msgs.join(' / '));
  }
}

// QA: a player command queued before the carpool time (e.g. study at the bookshelf, prio 50) outranks the
// automatic "go to work" (prio 40): the character keeps studying at home and misses work while awake.
import { boot } from './qa_simeng_lib.mjs';
for (const [type, key] of [['tv_cheap', 'watch'], ['bookshelf', 'read'], ['shower', 'shower']]) {
  const ctx = boot({ seed: 21 });
  const { E } = ctx;
  const S = E.state;
  const caio = S.sims.find((s) => s.name.startsWith('Caio'));
  // day 2 07:50
  while (S.time.day < 2 || S.time.minute < 8 * 60 + 20) E.update(0.5);
  caio.motives.hunger = 90; caio.motives.bladder = 90; caio.motives.energy = 90; caio.motives.hygiene = 90; caio.motives.fun = -80; if (key === 'shower') caio.motives.hygiene = -100; caio.motives.social = 90; caio.motives.comfort = 60;
  const shelf = S.objects.find((o) => o.type === type);
  caio.queue = [];
  const ok = E.queueInteraction(caio.id, shelf.id, key, 'player');
  let at835 = null;
  while (S.time.minute < 9 * 60 + 5) {
    E.update(0.5);
    if (!at835 && S.time.minute >= 8 * 60 + 36) at835 = caio.queue.map((a) => a.interaction + '/' + a.phase + '/p' + a.prio).join(' > ');
  }
  console.log(key, 'queued', ok, '| queue at 08:36:', at835, '| at 09:05 hidden(atWork)=', caio.hidden, '| notes:', ctx.notes.filter((n) => /Caio/.test(n.text) && /trabalho|carona/.test(n.text)).map((n) => n.text).join(' / '));
}

// QA debug for carpool vs player study
import { boot } from './qa_simeng_lib.mjs';
const ctx = boot({ seed: 21 });
const { E } = ctx;
const S = E.state;
const caio = S.sims.find((s) => s.name.startsWith('Caio'));
while (S.time.day < 2 || S.time.minute < 7 * 60 + 50) E.update(0.5);
console.log('caio hidden?', caio.hidden, 'queue', caio.queue.map((a) => a.interaction + '/' + a.phase));
const shelf = S.objects.find((o) => o.type === 'bookshelf');
caio.queue = [];
console.log(E.queueInteraction(caio.id, shelf.id, 'study_mechanical', 'player'));
for (let i = 0; i < 100; i++) { E.update(0.5); if (i % 6 === 0) console.log((S.time.minute / 60).toFixed(2), caio.queue.map((a) => a.interaction + '/' + a.phase + '/p' + a.prio + (a.cancel ? '/C' : '')).join(' > '), 'mood', E.mood(caio).toFixed(0)); }
console.log(ctx.notes.slice(-5).map((n) => n.text));

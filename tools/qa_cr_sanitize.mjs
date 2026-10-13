// Engine.init on saves that pass M.save.validateState but contain a null / non-object entry in an array.
import { load, memStorage } from './qa_cr_lib.mjs';
const cases = {
  'npcs:[null]': (s) => { s.npcs.push(null); },
  'notifications:[null]': (s) => { s.notifications.push(null); },
  'events:[null]': (s) => { s.events.push(null); },
  'bills:[null]': (s) => { s.bills.push(null); },
  'sims[0].queue:[null]': (s) => { s.sims[0].queue.push(null); },
  'objects:[null]': (s) => { s.objects.push(null); },
  'sims:[null]': (s) => { s.sims.push(null); },
  'npcs[0].relationships:null entry': (s) => { s.npcs[0].relationships['5'] = null; },
  'sims[0].relationships: number': (s) => { s.sims[0].relationships['7'] = 3; },
  'lot.walls entry string': (s) => { s.lot.walls['h,3,3'] = 'x'; },
  'sim.career.track ok, level 99': (s) => { const h = s.sims.find((x) => x.career); h.career.level = 99; },
  'time.minute string': (s) => { s.time.minute = 'abc'; },
  'object rot NaN->null': (s) => { s.objects[0].rot = null; },
  'npc missing personality+colors': (s) => { delete s.npcs[0].personality; delete s.npcs[0].colors; },
  'sims[0].data null': (s) => { s.sims[0].data = null; },
  'jobs: string': (s) => { s.jobs = 'x'; },
  'stats null': (s) => { s.stats = null; },
};
const out = {};
for (const [name, mut] of Object.entries(cases)) {
  const { M } = load({ quiet: true, save: true, localStorage: memStorage() });
  const base = JSON.parse(JSON.stringify(M.engine.newGame({ seed: 5 })));
  mut(base);
  const valid = !!M.save.validateState(JSON.parse(JSON.stringify(base)));
  let initErr = null, updErr = null;
  try { M.engine.init(base); } catch (e) { initErr = e.message; }
  if (!initErr) { M.engine.debug.throwErrors = true; try { for (let i = 0; i < 600; i++) M.engine.update(1); } catch (e) { updErr = e.message; } }
  out[name] = { passesValidate: valid, initThrows: initErr, updateThrows: updErr };
}
console.log(JSON.stringify(out, null, 1));

// qa_verify_code: CR-4 (null entries in arrays of a save). Does M.save.validateState accept it and does
// M.engine.init (sanitizeState) throw? Usage: node tools/qa_verify_code_sanitize.mjs
import { loadGame } from './qa_verify_code_lib.mjs';

const results = [];
for (const field of ['npcs', 'notifications', 'events', 'bills', 'objects', 'sims']) {
  const { M } = loadGame({ quiet: true, save: true });
  const st = JSON.parse(JSON.stringify(M.engine.newGame({ seed: 7 })));
  st[field] = (st[field] || []).concat([null]);
  const valid = !!M.save.validateState(JSON.parse(JSON.stringify(st)));
  let initErr = null;
  try { M.engine.init(st); } catch (e) { initErr = e.message; }
  results.push({ field, passesValidate: valid, initThrows: initErr });
}
// a save from a "newer" build
{
  const { M } = loadGame({ quiet: true, save: true });
  const st = JSON.parse(JSON.stringify(M.engine.newGame({ seed: 7 })));
  st.version = 2;
  results.push({ field: 'version=2', passesValidate: !!M.save.validateState(st), initThrows: null });
}
// can the game itself produce a null entry? JSON.stringify of a sparse/undefined slot
results.push({ note: 'JSON.stringify([undefined]) = ' + JSON.stringify([undefined]) });
console.log(JSON.stringify(results, null, 1));

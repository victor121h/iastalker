// QA verify (sim findings) — independent loader. Read-only on the game.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function load(opts, throwErrors = true) {
  const ctx = { console, Math, Date, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  const M = ctx.M, E = M.engine;
  E.debug.throwErrors = throwErrors;
  const notes = [];
  M.util.bus.on('notify', (n) => notes.push({ t: stamp(E.state), text: n.text, kind: n.kind }));
  if (opts !== null) E.newGame(opts || {});
  return { M, E, D: M.data, notes, get S() { return E.state; } };
}
export function abs(S) { return S.time.day * 1440 + S.time.minute; }
export function stamp(S) {
  const m = Math.floor(S.time.minute);
  return 'd' + S.time.day + ' ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
export function runUntil(E, day, minute, step = 0.5, each) {
  const S = E.state;
  let guard = 0;
  while ((S.time.day < day || (S.time.day === day && S.time.minute < minute)) && guard++ < 1e7) {
    E.update(step);
    if (each) each();
  }
}
export function head(s) {
  const a = s.queue[0];
  if (!a) return 'none';
  return (a.kind === 'social' ? 's:' + a.interaction : a.interaction) + '/' + a.phase + '/p' + a.prio + (a.data && a.data.respond ? '(R)' : '');
}
export function mot(s) {
  return Object.fromEntries(Object.entries(s.motives).map(([k, v]) => [k, Math.round(v)]));
}

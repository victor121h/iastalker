// qa_verify_code harness: loads util/data/world/engine (+ optional save) into a Node vm context.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadGame(opts = {}) {
  const ctx = { console: opts.quiet ? { log() {}, warn() {}, error() {} } : console, Math, Date, JSON, setTimeout, clearTimeout, Promise, performance };
  ctx.window = ctx;
  vm.createContext(ctx);
  const files = ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js'].concat(opts.save ? ['js/save.js'] : []);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const M = ctx.M;
  const notes = [];
  M.util.bus.on('notify', (n) => notes.push({ t: M.util.fmtTime(M.engine.state.time.minute), day: M.engine.state.time.day, kind: n.kind, text: n.text }));
  return { M, ctx, notes };
}

export function step(M, minutes, dt = 0.5) {
  let left = minutes;
  while (left > 1e-9) { const d = Math.min(dt, left); M.engine.update(d); left -= d; }
}

export function stepUntil(M, cond, maxMinutes, dt = 0.5) {
  let t = 0;
  while (t < maxMinutes) { if (cond()) return t; M.engine.update(dt); t += dt; }
  return cond() ? t : -1;
}

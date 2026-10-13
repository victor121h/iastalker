// Timeline trace for tuning: prints each action a household member starts, with motives.
// Usage: node tools/engine_trace.mjs [--days 2] [--seed 42] [--sim Rita] [--hourly]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DAYS = +opt('days', '2');
const SEED = +opt('seed', '42');
const ONLY = opt('sim', null);
const HOURLY = args.includes('--hourly');

const ctx = { console, Math, Date, JSON };
ctx.window = ctx;
vm.createContext(ctx);
const worldFile = fs.existsSync(path.join(ROOT, 'js/world.js')) ? 'js/world.js' : 'tools/engine_world_stub.js';
for (const f of ['js/util.js', 'js/data.js', worldFile, 'js/engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const M = ctx.M, E = M.engine;
E.debug.throwErrors = true;
M.util.bus.on('notify', (n) => console.log(`        ** ${n.kind}: ${n.text}`));
E.newGame({ seed: SEED });
const last = {};
const mot = (s) => ['hunger', 'energy', 'comfort', 'fun', 'hygiene', 'social', 'bladder', 'room']
  .map((k) => k.slice(0, 3) + ' ' + String(Math.round(s.motives[k])).padStart(4)).join(' ');
for (let i = 0; i < DAYS * 1440 * 2; i++) {
  E.update(0.5);
  const S = E.state;
  for (const s of S.sims) {
    if (ONLY && !s.name.startsWith(ONLY)) continue;
    const a = s.queue[0];
    const key = s.hidden ? 'hidden' : a ? a.id + ':' + (a.phase === 'do' ? 'do' : 'x') + ':' + (a.stage || 0) : 'idle';
    const shown = a && a.phase === 'do' ? key : (a ? a.id + ':x:' + (a.stage || 0) : key);
    if (last[s.id] !== shown && (s.hidden || !a || a.phase === 'do')) {
      last[s.id] = shown;
      const t = `d${S.time.day} ${M.util.fmtTime(S.time.minute)}`;
      const what = s.hidden ? (s.atWork ? 'TRABALHO' : 'fora') : a ? `${a.label}${a.stage ? ' [etapa ' + a.stage + ']' : ''}${a.source === 'player' ? ' (P)' : ''}` : '-- ocioso';
      console.log(`${t} ${s.name.split(' ')[0].padEnd(8)} ${what.padEnd(42).slice(0, 42)} ${mot(s)} humor ${Math.round(E.mood(s))}`);
    }
  }
  if (HOURLY && E.state.time.minute % 60 === 0) {
    for (const s of E.state.sims) console.log(`   ~ ${M.util.fmtTime(E.state.time.minute)} ${s.name.split(' ')[0].padEnd(8)} ${mot(s)}`);
  }
}

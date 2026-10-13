// QA code-review harness (key "cr"): loads util/data/world/engine (+ optional save) into a Node vm context.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function load(opts = {}) {
  const ctx = { console: opts.quiet ? { log() {}, warn() {}, error() {} } : console, Math, Date, JSON, setTimeout, clearTimeout, Promise };
  ctx.window = ctx;
  if (opts.localStorage) ctx.localStorage = opts.localStorage;
  if (opts.claude) ctx.claude = opts.claude;
  vm.createContext(ctx);
  const files = ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js'].concat(opts.save ? ['js/save.js'] : []);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { M: ctx.M, ctx };
}

export function memStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    _map: m,
  };
}

// walk a JSON-ish value and report non-finite numbers / undefined / functions / non-plain objects
export function auditJSON(v, p = '$', out = []) {
  if (v === null) return out;
  const t = typeof v;
  if (t === 'number') { if (!isFinite(v)) out.push(p + ' = ' + v); return out; }
  if (t === 'undefined') { out.push(p + ' = undefined'); return out; }
  if (t === 'function') { out.push(p + ' = function'); return out; }
  if (t !== 'object') return out;
  if (Array.isArray(v)) { v.forEach((x, i) => auditJSON(x, p + '[' + i + ']', out)); for (const k of Object.keys(v)) if (!/^\d+$/.test(k)) out.push(p + '.' + k + ' (extra array prop)'); return out; }
  const proto = Object.getPrototypeOf(v);
  if (proto !== null && proto.constructor && proto.constructor.name !== 'Object') out.push(p + ' non-plain ' + proto.constructor.name);
  for (const k of Object.keys(v)) auditJSON(v[k], p + '.' + k, out);
  return out;
}

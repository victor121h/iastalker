// verify_visual harness (copy of the visual QA harness): serves real Google Fonts from scratchpad/fontcache.
// Usage: node tools/qa_verify_visual_check.mjs --script tools/qa_verify_visual_x.mjs [--w --h] [--touch] [--nohelp] [--clear] [--nofonts]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync, execFileSync } from 'node:child_process';
const requireG = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
const { chromium } = requireG('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.resolve(ROOT, '../fontcache');
fs.mkdirSync(CACHE, { recursive: true });
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);
const wait = +opt('wait', '3000');
const scriptFile = opt('script', null);
const evalFile = opt('eval', null);
const W = +opt('w', '1280'), H = +opt('h', '800');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function cached(url, binary) {
  const f = path.join(CACHE, crypto.createHash('md5').update(url).digest('hex'));
  if (!fs.existsSync(f)) {
    try { execFileSync('curl', ['-sS', '-m', '20', '-A', UA, '-o', f, url]); } catch (e) { return null; }
  }
  return fs.readFileSync(f);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const launchArgs = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: launchArgs }).catch(async () => chromium.launch({ args: launchArgs }));
const ctxOpts = { viewport: { width: W, height: H } };
if (flag('touch')) Object.assign(ctxOpts, { hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const context = await browser.newContext(ctxOpts);
if (flag('clear')) await context.addInitScript(() => { try { if (!sessionStorage.getItem('cleared')) { Object.keys(localStorage).filter(k => k.startsWith('morada')).forEach(k => localStorage.removeItem(k)); sessionStorage.setItem('cleared', '1'); } } catch (e) {} });
if (flag('nohelp')) await context.addInitScript(() => { try { const p = JSON.parse(localStorage.getItem('morada.prefs') || '{}'); p.helpSeen = true; localStorage.setItem('morada.prefs', JSON.stringify(p)); } catch (e) {} });
const page = await context.newPage();
await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, route =>
  route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'vendor/three.min.js')) }));
await page.route(/fonts\.googleapis\.com/, route => {
  if (flag('nofonts')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  const b = cached(route.request().url());
  route.fulfill({ status: 200, contentType: 'text/css', body: b || '' });
});
await page.route(/fonts\.gstatic\.com/, route => {
  const b = cached(route.request().url(), true);
  if (!b) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, contentType: 'font/woff2', body: b, headers: { 'access-control-allow-origin': '*' } });
});

let pageErrors = 0; let consoleErrors = 0;
page.on('console', m => {
  const t = m.text();
  if (/GL Driver Message|GPU stall|WebGL-0x/.test(t)) return;
  if (m.type() === 'error') consoleErrors++;
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, t.slice(0, 400));
});
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); });

const url = `http://127.0.0.1:${port}/index.html`;
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(wait);
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
const ctx = { W, H, url, ROOT, touch: flag('touch'), args };
if (evalFile) {
  const body = fs.readFileSync(evalFile, 'utf8');
  try { const out = await page.evaluate(`(async () => { ${body} })()`); console.log('[eval]', JSON.stringify(out, null, 1)); }
  catch (e) { pageErrors++; console.log('[eval error]', e.message); }
}
if (scriptFile) {
  const mod = await import(path.resolve(scriptFile));
  try { const out = await mod.default(page, ctx); if (out !== undefined) console.log('[script]', JSON.stringify(out, null, 1)); }
  catch (e) { pageErrors++; console.log('[script error]', e.stack || e.message); }
}
await browser.close();
server.close();
console.log(`console errors: ${consoleErrors}`);
console.log(pageErrors ? `FAIL: ${pageErrors} page error(s)` : 'OK: no page errors');
process.exit(pageErrors ? 1 : 0);

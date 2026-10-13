// Integration check for the real game page (index.html).
// Usage: node tools/integrate_check.mjs [--shot out.png] [--wait 3000] [--eval file.js] [--script file.mjs]
//        [--w 1280 --h 800] [--touch] [--nohelp] [--clear] [--page index.html] [--reload]
// - Serves the game dir; routes cdnjs three.js to vendor/, Google Fonts to an empty stylesheet.
// - Logs every request that leaves 127.0.0.1 (should only be cdnjs three.js and Google Fonts).
// - Prints console errors (GL driver chatter filtered) and page errors; exits 1 on any page error.
// - --eval: JS file run in the page as an async function body; prints its JSON result.
// - --script: ES module exporting default async (page, ctx) => result (Playwright-level interactions).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const requireG = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
const { chromium } = requireG('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);
const shot = opt('shot', null);
const wait = +opt('wait', '3000');
const evalFile = opt('eval', null);
const scriptFile = opt('script', null);
const W = +opt('w', '1280'), H = +opt('h', '800');
const pageName = opt('page', 'index.html');

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
const external = new Map();
page.on('request', (r) => {
  const u = r.url();
  if (u.startsWith('http://127.0.0.1:' + port) || u.startsWith('data:') || u.startsWith('blob:')) return;
  const key = u.replace(/\?.*$/, '');
  external.set(key, (external.get(key) || 0) + 1);
});
await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, route =>
  route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'vendor/three.min.js')) }));
await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

let pageErrors = 0; let consoleErrors = 0;
page.on('console', m => {
  const t = m.text();
  if (/GL Driver Message|GPU stall|WebGL-0x/.test(t)) return;
  if (m.type() === 'error') consoleErrors++;
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, t);
});
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); });

const url = `http://127.0.0.1:${port}/${pageName}`;
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(wait);
const ctx = { W, H, url, ROOT, touch: flag('touch'), shotDir: process.env.SHOTS || path.resolve(ROOT, '../shots') };
if (evalFile) {
  const body = fs.readFileSync(evalFile, 'utf8');
  try {
    const out = await page.evaluate(`(async () => { ${body} })()`);
    console.log('[eval]', JSON.stringify(out, null, 1));
  } catch (e) { pageErrors++; console.log('[eval error]', e.message); }
}
if (scriptFile) {
  const mod = await import(path.resolve(scriptFile));
  try { const out = await mod.default(page, ctx); if (out !== undefined) console.log('[script]', JSON.stringify(out, null, 1)); }
  catch (e) { pageErrors++; console.log('[script error]', e.stack || e.message); }
}
if (shot) { await page.screenshot({ path: shot }); console.log('[shot]', shot); }
console.log('[network external]', JSON.stringify(Object.fromEntries(external)));
await browser.close();
server.close();
console.log(`console errors: ${consoleErrors}`);
console.log(pageErrors ? `FAIL: ${pageErrors} page error(s)` : 'OK: no page errors');
process.exit(pageErrors ? 1 : 0);

// Headless browser check for Morada.
// Usage: node tools/check.mjs [--shot out.png] [--wait 3000] [--eval file.js] [--w 1280 --h 800]
// - Serves the game directory over a local HTTP server
// - Routes the cdnjs three.js URL to vendor/three.min.js (the container cannot reach cdnjs)
// - Prints console errors/warnings and page errors; exits 1 if any page error occurred
// - --eval runs the given JS file's contents in the page (as an async function body) after --wait ms,
//   and prints its JSON-serialized return value.
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
const shot = opt('shot', null);
const wait = +opt('wait', '3000');
const evalFile = opt('eval', null);
const W = +opt('w', '1280'), H = +opt('h', '800');

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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }).catch(async () => chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }));
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, route =>
  route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'vendor/three.min.js')) }));
await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

let pageErrors = 0;
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text()); });
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n')); });

await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(wait);
if (evalFile) {
  const body = fs.readFileSync(evalFile, 'utf8');
  try {
    const out = await page.evaluate(`(async () => { ${body} })()`);
    console.log('[eval]', JSON.stringify(out, null, 1));
  } catch (e) { pageErrors++; console.log('[eval error]', e.message); }
}
if (shot) { await page.screenshot({ path: shot }); console.log('[shot]', shot); }
await browser.close();
server.close();
console.log(pageErrors ? `FAIL: ${pageErrors} page error(s)` : 'OK: no page errors');
process.exit(pageErrors ? 1 : 0);

// QA live: keyboard on the first-run help card (Space / Enter), and log panel outside clicks.
// node tools/integrate_check.mjs --clear --script tools/qa_live_helpkeys.mjs
import { mk } from './qa_live_lib.mjs';

export default async function (page, ctx) {
  const L = mk(page, ctx, 'helpkeys');
  const out = {};
  await L.install();
  out.helpOpen0 = await L.ev(() => !!document.getElementById('help-card'));
  out.focus0 = await L.ev(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
  out.speed0 = await L.ev(() => ({ s: window.__morada.M.main.getSpeed(), r: window.__morada.M.main.pauseReasons() }));
  await page.keyboard.press('Space'); await L.wait(300);
  out.afterSpace = await L.ev(() => ({ help: !!document.getElementById('help-card'), s: window.__morada.M.main.getSpeed(), r: window.__morada.M.main.pauseReasons() }));
  await page.keyboard.press('Enter'); await L.wait(300);
  out.afterEnter = await L.ev(() => ({ help: !!document.getElementById('help-card'), s: window.__morada.M.main.getSpeed(), r: window.__morada.M.main.pauseReasons(), note: document.querySelector('.speed-note').hidden ? '' : document.querySelector('.speed-note').textContent }));
  const t0 = await L.ev(() => window.__morada.state.time.minute);
  await L.wait(2000);
  out.timeAdvancedAfterDismiss = (await L.ev(() => window.__morada.state.time.minute)) - t0;
  await L.shot('after-help');
  out.errs = await L.errs();
  return out;
}

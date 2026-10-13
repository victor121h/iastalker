// Verify LIVE-9: Space on the welcome/help card.
// node tools/integrate_check.mjs --clear --script tools/qa_verify_live_9.mjs   (no --nohelp: the card must show)
import { lib } from './qa_verify_live_lib.mjs';

export default async function (page, ctx) {
  const V = lib(page, ctx, 'l9');
  const st = () => V.ev(() => {
    const M = window.__morada.M; const h = document.getElementById('help-card');
    return { helpOpen: !!(h && !h.hidden), speed: M.main.getSpeed(), paused: M.main.isPaused(), reasons: M.main.pauseReasons ? M.main.pauseReasons() : null, minute: M.engine.state.time.minute, focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName), speedNote: (() => { const n = document.querySelector('.speed-note'); return n && !n.hidden && getComputedStyle(n).display !== 'none' ? n.textContent : null; })() };
  });
  const out = { initial: await st() };
  await page.keyboard.press('Space'); await V.wait(300);
  out.afterSpace = await st();
  await V.shot('after-space');
  await page.keyboard.press('Enter'); await V.wait(400);
  out.afterEnter = await st();
  await V.wait(3000);
  out.after3s = await st();
  await V.shot('after-enter');
  // control: fresh reload, click the button with the mouse instead
  return out;
}

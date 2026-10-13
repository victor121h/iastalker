// BB-6: timeline of the cursor tip after placing a door / window (no screenshots in between).
import { V } from './qa_verify_build_lib.mjs';
export default async function (page, ctx) {
  const v = V(page, ctx, 'bb6'); await v.help();
  const R = {};
  await v.mode('build');
  const run = async (tool, wx) => {
    await v.tool(tool); await v.wait(300);
    const P = await v.proj(wx, 0.2, 14.05);
    await v.hover(P.x, P.y);
    await v.ev(() => {
      const el = document.getElementById('tip'); window.__tipLog = [];
      window.__tipObs && window.__tipObs.disconnect();
      window.__tipObs = new MutationObserver(() => window.__tipLog.push([Math.round(performance.now() - (window.__clickT || 0)), el.hidden ? '(hidden)' : el.textContent, el.classList.contains('bad')]));
      window.__tipObs.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
      document.getElementById('view').addEventListener('pointerup', () => { window.__clickT = performance.now(); window.__tipLog.push(['click']); }, { once: true, capture: true });
    });
    await page.mouse.click(P.x, P.y);
    await v.wait(2500);
    return v.ev(() => window.__tipLog.filter((r, i, a) => i === 0 || JSON.stringify(r) !== JSON.stringify(a[i - 1])).slice(0, 10));
  };
  R.door = await run('Porta', 13.5);
  R.window = await run('Janela', 12.5);
  R.walls = await v.ev(() => { const w = window.__morada.state.lot.walls; return { d: w['h,13,14'], w: w['h,12,14'] }; });
  return R;
}

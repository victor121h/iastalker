// Playwright script: save through Options, reload the page, and check the game resumes from the save.
export default async function (page) {
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  const before = await ev(async () => {
    const M = window.__morada.M, E = M.engine;
    M.main.setSpeed(0);
    for (let i = 0; i < 300; i++) E.update(1);
    E.buyObject('plant_big', 3, 3, 0);
    M.ui.setMode('options');
    await new Promise((r) => setTimeout(r, 300));
    document.getElementById('opt-save').click();
    await new Promise((r) => setTimeout(r, 600));
    const s = E.state;
    return { day: s.time.day, minute: Math.round(s.time.minute), money: s.money, objs: s.objects.length, slot: M.main.slot };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const after = await ev(() => { const s = window.__morada.state; return { day: s.time.day, minute: Math.round(s.time.minute), money: s.money, objs: s.objects.length, toast: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent) }; });
  return { before, after, ok: before.day === after.day && Math.abs(before.minute - after.minute) <= 2 && before.money === after.money && before.objs === after.objs };
}

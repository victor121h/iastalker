// --script: the player switches to save slot 2 (Options > Jogos salvos > "Salvar aqui" on Espaço 2), keeps playing
// (autosave goes to slot 2), then reloads the page. Which game comes back?
export default async function (page) {
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const b = document.getElementById('help-ok'); if (b) b.click(); });
  const before = await ev(async () => {
    const M = window.__morada.M, E = M.engine;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    M.main.setSpeed(0);
    // slot1 gets the initial game
    await M.main.saveNow('slot1');
    const slot1Money = E.state.money;
    // real UI flow: Options -> Jogos salvos -> "Salvar aqui" on Espaço 2
    M.ui.setMode('options'); await wait(200);
    document.getElementById('opt-load').click(); await wait(800);
    document.getElementById('slot-save-1').click(); await wait(800);
    const slotAfterUi = M.main.slot;
    document.querySelectorAll('.modal .icon-btn').forEach((b) => b.click()); await wait(200);
    // keep playing: earn money + an autosave (same path as the new-day / tab-hidden autosave)
    E.state.money += 1234; M.main.markDirty();
    M.main.autosave('test'); await wait(800);
    return { slot1Money, playingMoney: E.state.money, slotAfterUi, ls: Object.keys(localStorage).filter((k) => k.startsWith('morada:')) };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const after = await ev(() => ({ money: window.__morada.state.money, slot: window.__morada.M.main.slot }));
  return { before, after, resumedLatestGame: after.money === before.playingMoney };
}

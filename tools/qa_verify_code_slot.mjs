// qa_verify_code: independent repro of CR-2 (active save slot not persisted across reload).
// Real UI: Opções -> Jogos salvos -> "Salvar aqui" on Espaço 2, keep playing (money changes), autosave via pagehide, reload.
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/qa_verify_code_slot.mjs
export default async function (page, ctx) {
  const ev = (f, a) => page.evaluate(f, a);
  // make slot1 exist with the starting game
  await ev(async () => { await window.__morada.M.main.saveNow(); });
  const slot1Money = await ev(() => JSON.parse(localStorage.getItem('morada:slot1')).meta.money);
  // open Options via the UI and go to the save slots
  await ev(() => window.__morada.M.ui.openOptions());
  await page.waitForTimeout(300);
  await page.click('#opt-load');
  await page.waitForTimeout(800);
  await page.click('#slot-save-1'); // Espaço 2 (empty -> saves directly)
  await page.waitForTimeout(800);
  const slotAfterUi = await ev(() => window.__morada.M.main.slot);
  await page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/slot_modal.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // keep playing: the family earns money (simulate a paycheck through the engine money path), time passes
  await ev(() => { const st = window.__morada.state; st.money += 1234; window.__morada.M.util.bus.emit('money', { money: st.money, delta: 1234 }); window.__morada.M.main.setSpeed(3); });
  await page.waitForTimeout(1500);
  const playingMoney = await ev(() => window.__morada.state.money);
  // tab hidden / page closed -> autosave
  await ev(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(800);
  const stored = await ev(() => ({ slot1: JSON.parse(localStorage.getItem('morada:slot1')).meta.money, slot2: JSON.parse(localStorage.getItem('morada:slot2')).meta.money }));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const after = await ev(() => ({ money: window.__morada.state.money, slot: window.__morada.M.main.slot, toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent.replace(/\s+/g, ' ').trim()) }));
  await page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/slot_after_reload.png' });
  return { slot1Money, slotAfterUi, playingMoney, storedBeforeReload: stored, after, resumedLatestGame: after.money === playingMoney };
}

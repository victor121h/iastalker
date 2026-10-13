// qa_verify_code: CR-4 in the browser. Seed localStorage morada:slot1 with (a) a save whose npcs array holds a null,
// (b) a save with version 2. Reload; record what boots, toasts, console; then trigger the pagehide autosave and check
// whether the original save is still in storage.
// Usage: node tools/integrate_check.mjs --clear --nohelp --wait 2500 --script tools/qa_verify_code_badsave.mjs
export default async function (page, ctx) {
  const logs = [];
  page.on('console', (m) => { if (/save inválido|sanitize/i.test(m.text())) logs.push(m.text().slice(0, 160)); });
  const out = [];
  for (const variant of ['nullNpc', 'version2']) {
    await page.evaluate(async () => { const M = window.__morada.M; M.main.setSpeed(0); await M.main.saveNow(); });
    await page.evaluate((variant) => {
      const st = JSON.parse(JSON.stringify(window.__morada.M.engine.state));
      st.householdName = 'Família Teste'; st.money = 4321; st.time.day = 12; st.speed = 1;
      if (variant === 'nullNpc') st.npcs.push(null);
      if (variant === 'version2') st.version = 2;
      localStorage.setItem('morada:slot1', JSON.stringify({ v: 1, savedAt: Date.now(), meta: { householdName: st.householdName, day: 12, money: 4321, members: 2 }, json: JSON.stringify(st) }));
    }, variant);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const booted = await page.evaluate(() => ({ household: window.__morada.state.householdName, money: window.__morada.state.money, day: window.__morada.state.time.day,
      toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent.replace(/\s+/g, ' ').trim()) }));
    await page.screenshot({ path: ctx.ROOT + '/../shots/qa/verify_code/badsave_' + variant + '.png' });
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(800);
    const stored = await page.evaluate(() => { const b = JSON.parse(localStorage.getItem('morada:slot1')); return { household: b.meta.householdName, money: b.meta.money, day: b.meta.day }; });
    out.push({ variant, booted, storedAfterAutosave: stored, originalSurvived: stored.household === 'Família Teste' });
  }
  return { out, consoleLogs: logs };
}

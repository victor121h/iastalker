// --script: put an unreadable save in slot1 (a) one null in notifications, (b) state.version 2 from a newer build),
// reload, and check whether the game warns and whether the original save survives the next autosave.
export default async function (page) {
  const ev = (fn, a) => page.evaluate(fn, a);
  const res = {};
  const logs = [];
  page.on('console', (m) => { if (/Morada|inválido/.test(m.text())) logs.push(m.text().slice(0, 160)); });
  for (const kind of ['nullEntry', 'newerVersion']) {
    await ev(async () => { const M = window.__morada.M; M.main.setSpeed(0); await M.main.saveNow(); });
    await ev((kind) => {
      const M = window.__morada.M;
      const st = JSON.parse(JSON.stringify(M.engine.state));
      st.householdName = 'Família Preciosa';
      st.money = 98765;
      if (kind === 'nullEntry') st.notifications.push(null);
      else st.version = 2;
      const body = { v: 1, savedAt: Date.now() + 60000, meta: { householdName: st.householdName, day: st.time.day, money: st.money, members: 2 }, json: JSON.stringify(st) };
      localStorage.setItem('morada:slot1', JSON.stringify(body));
    }, kind);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const r = await ev(async () => {
      const M = window.__morada.M;
      const toasts = Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent);
      const booted = { household: M.engine.state.householdName, money: M.engine.state.money, dirty: M.main.dirty };
      // the autosave that runs when the tab is hidden / a new sim day starts
      M.main.autosave('hidden');
      await new Promise((r) => setTimeout(r, 800));
      const raw = JSON.parse(localStorage.getItem('morada:slot1'));
      const kept = raw && raw.json && raw.json.indexOf('Família Preciosa') >= 0;
      return { booted, toasts, slot1AfterAutosave: raw && raw.meta, originalSaveSurvived: kept, backups: Object.keys(localStorage).filter((k) => k.startsWith('morada')) };
    });
    res[kind] = r;
  }
  res.bootConsole = logs;
  return res;
}

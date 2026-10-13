// --script (variant: NO local save + SLOW capability handshake (1.4 s) but FAST cloud read, e.g. a second device): mock the artifact `db` capability. The cloud holds a NEWER save (another device, money 2222) than this
// device's local mirror (money 1111). The cloud read takes 2.5 s (> the 1.5 s boot wait). Boot picks the local save
// and shows the "newer save in the cloud" toast. If the player does not click it, what happens on the next autosave?
export default async function (page) {
  await page.addInitScript(() => {
    const store = (window.__cloudStore = window.__cloudStore || JSON.parse(sessionStorage.getItem('qa_cloud') || '{}'));
    const persist = () => sessionStorage.setItem('qa_cloud', JSON.stringify(store));
    window.__cloudWrites = [];
    window.claude = {
      use: async (name) => {
        await new Promise((r) => setTimeout(r, 1400));
        if (name === 'user') return { id: async () => 'qa-user' };
        if (name === 'db') return {
          collection: (path) => ({
            doc: (id) => ({
              get: () => new Promise((r) => setTimeout(() => { const k = path + '/' + id; r({ exists: !!store[k], data: () => store[k] }); }, 50)),
              set: async (body) => { store[path + '/' + id] = body; persist(); window.__cloudWrites.push({ id, money: body.meta && body.meta.money, at: Date.now() }); },
              delete: async () => { delete store[path + '/' + id]; persist(); },
            }),
            limit: () => ({ get: async () => ({ docs: [] }) }),
          }),
        };
        return null;
      },
    };
  });
  // seed: local mirror (older) + cloud doc (newer); pause + clean save first so the pagehide autosave does not run
  await page.evaluate(async () => { const M = window.__morada.M; M.main.setSpeed(0); await M.main.saveNow(); });
  await page.evaluate(() => {
    const st = JSON.parse(JSON.stringify(window.__morada.M.engine.state));
    const mk = (money, savedAt) => { const s = JSON.parse(JSON.stringify(st)); s.money = money; return { v: 1, savedAt, meta: { householdName: s.householdName, day: 1, money, members: 2 }, json: JSON.stringify(s) }; };
    const now = Date.now();
    localStorage.removeItem('morada:slot1');
    sessionStorage.setItem('qa_cloud', JSON.stringify({ 'data/users/qa-user/slot1': mk(2222, now) }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const booted = await page.evaluate(() => ({ money: window.__morada.state.money, toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent) }));
  // the player keeps playing and does not click the toast; then a new sim day starts (autosave)
  const after = await page.evaluate(async () => {
    const M = window.__morada.M;
    await new Promise((r) => setTimeout(r, 4000)); // give the slow cloud read time to answer
    M.main.autosave('hidden'); // the player closes the tab / switches apps
    await new Promise((r) => setTimeout(r, 1500));
    const doc = window.__cloudStore['data/users/qa-user/slot1'];
    return { cloudMoneyNow: doc && doc.meta.money, writes: window.__cloudWrites };
  });
  return { booted, after, newerCloudSaveLost: after.cloudMoneyNow !== 2222 };
}

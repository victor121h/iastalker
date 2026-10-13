// Toast stack + notification log + money floats at the current viewport; in Live and Buy.
import { mk } from './qa_vis_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, `toast-${ctx.W}x${ctx.H}`);
  await L.dismissHelp();
  const out = {};
  const fire = async () => page.evaluate(() => {
    const bus = window.__morada.M.util.bus;
    bus.emit('notify', { text: 'Caio Alves foi promovido a Assistente Administrativo! Novo salário: M$ 180 por dia.', kind: 'career' });
    bus.emit('notify', { text: 'Chegou uma conta de M$ 152. Pague na caixa de correio em até 3 dias.', kind: 'money' });
    bus.emit('notify', { text: 'Rita Alves está morrendo de fome!', kind: 'bad' });
    bus.emit('notify', { text: 'A carona de Caio chegou! Sai às 09:00.', kind: 'info' });
    window.__morada.M.engine.state.money -= 152; bus.emit('money', { money: window.__morada.M.engine.state.money, delta: -152 });
  });
  await fire();
  await L.wait(700);
  out.live = await L.shot('live');
  out.liveAudit = (await L.audit()).overlaps;
  await page.evaluate(() => { const b = document.getElementById('log-btn'); if (b) b.click(); });
  await L.wait(500);
  out.log = await L.shot('log');
  out.logAudit = (await L.audit()).overlaps;
  await page.evaluate(() => { const b = document.getElementById('log-btn'); if (b) b.click(); });
  await L.mode('buy');
  await fire();
  await L.wait(700);
  out.buy = await L.shot('buy');
  out.buyAudit = (await L.audit()).overlaps;
  return out;
}

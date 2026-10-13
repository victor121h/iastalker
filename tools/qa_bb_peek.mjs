import { mk } from './qa_bb_lib.mjs';
export default async function (page, ctx) {
  const L = mk(page, ctx, 'peek');
  await L.install(); await L.dismissHelp();
  await L.shot('0-live');
  await L.modeBtn('buy');
  await L.wait(1500);
  await L.shot('1-buy');
  await L.modeBtn('build');
  await L.wait(500);
  await L.shot('2-build');
  const info = await L.ev(() => { const M = window.__morada.M; return { cam: M.render.getCamera(), money: M.engine.state.money, lot: [M.engine.state.lot.w, M.engine.state.lot.h], drawer: document.getElementById('drawer').getBoundingClientRect().toJSON(), bar: document.getElementById('bar').getBoundingClientRect().toJSON() }; });
  return { info, errs: await L.errs() };
}

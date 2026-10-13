const M = window.__morada.M, E = M.engine, st = E.state;
const sel = st.settings.selectedSimId;
const hh = E.household().map(s => ({ id: s.id, name: s.name, x: s.x, y: s.y, career: s.career, q: s.queue.map(a => a.label + '|' + a.source + '|' + a.phase) }));
const objs = st.objects.map(o => {
  const its = E.getInteractions(sel, o.id) || [];
  return { id: o.id, type: o.type, x: o.x, y: o.y, rot: o.rot, its: its.map(i => (i.enabled ? '+' : '-') + i.key + ':' + i.label + (i.reason ? ' [' + i.reason + ']' : '')) };
});
return { sel, hh, time: st.time, money: st.money, bills: st.bills, npcs: st.npcs.map(n => n.name + (n.known ? '*' : '')), objs, phoneBook: E.phoneBook(), offers: E.jobOffers() };

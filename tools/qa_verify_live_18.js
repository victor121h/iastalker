// Verify LIVE-18: which starter objects return no interactions (dead-end clicks) while hover shows a pointer cursor.
// node tools/integrate_check.mjs --clear --nohelp --eval tools/qa_verify_live_18.js
const M = window.__morada.M, E = M.engine, st = E.state;
M.main.setSpeed(0);
const sid = st.settings.selectedSimId;
const empty = {};
for (const o of st.objects) { const n = E.getInteractions(sid, o.id).length; if (!n) empty[o.type] = (empty[o.type] || 0) + 1; }
return { selected: sid, objectsWithNoInteractions: empty };

import { load } from './qa_cr_lib.mjs';
const types = ['plant_small', 'lamp_floor', 'chair_wood', 'end_table', 'sculpture', 'table_small', 'bookshelf', 'counter', 'tv_cheap', 'armchair'];
const { M } = load({ quiet: true });
const E = M.engine;
const st = E.newGame({ seed: 9 }); st.money = 1e7; E.addSim({}); E.addSim({});
let placed = 0;
for (let y = 0; y < 19 && placed < 150; y++) for (let x = 0; x < 24 && placed < 150; x++) { if ((x + y) % 2) continue; if (E.buyObject(types[placed % types.length], x, y, (x + y) % 4).ok) placed++; }
for (let i = 0; i < 1440; i++) E.update(0.5);

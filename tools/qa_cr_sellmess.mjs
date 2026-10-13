// Buy mode lets the player select ANY object and "Remover" it: puddles, dirty plates, spoiled meals, the newspaper.
import { load } from './qa_cr_lib.mjs';
const { M } = load({ quiet: true });
const E = M.engine;
const st = E.newGame({ seed: 2 });
const add = (type, x, y, extra) => { const o = Object.assign({ id: M.util.nextId(st), type, x, y, rot: 0, dirty: 0, broken: false, boughtDay: 1, price: 0, uses: 0 }, extra); st.objects = st.objects.concat([o]); M.world.rebuild(); return o; };
const p = add('puddle', 3, 3, {}), d = add('dirty_plate', 4, 3, { spoiled: true }), m = add('meal', 5, 3, { spoiled: true, servings: 2, quality: 60 });
const news = st.objects.find((o) => o.type === 'newspaper');
console.log(JSON.stringify(['puddle', p, 'dirty_plate', d, 'meal', m, 'newspaper', news].filter((x, i) => i % 2).map((o) => ({ type: o.type, sellValue: E.sellValue(o.id), sold: E.sellObject(o.id) }))));

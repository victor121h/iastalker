import vm from 'node:vm'; import fs from 'node:fs';
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/util.js', 'js/data.js', 'js/world.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const M = ctx.M, E = M.engine, W = M.world;
E.newGame({ seed: 7 });
const out = {};
out.fridgeFacingWall = W.canPlace('fridge_cheap', 15, 13, 0);
out.fridgeFacingRoom = W.canPlace('fridge_cheap', 15, 13, 2);
// toilet boxed in: toilet at corner with all neighbours blocked?
out.paintingOnWindow = W.canPlace('painting_cheap', 6, 8, 1);
// chair against wall facing wall is fine (on-slot)
// bed with only one free side
console.log(JSON.stringify(out));

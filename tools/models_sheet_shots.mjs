// node tools/models_sheet_shots.mjs [set] [t]  -> screenshots of every page of the contact sheet
import { execSync } from 'node:child_process';
const set = process.argv[2] || 'objects';
const t = process.argv[3] || '1.3';
const extra = process.argv[4] || '';
const OUT = '/tmp/claude-0/-home-user-iastalker/022ed161-997d-54de-8293-6b75c8c0dc6f/scratchpad/shots/';
const pages = { objects: 4, anims: 3, variants: 2 }[set] || 1;
for (let p = 0; p < pages; p++) {
  const out = OUT + 'sheet_' + set + '_' + p + (extra ? '_x' : '') + '.png';
  const r = execSync(`node tools/render_check.mjs --page "tools/models_sheet.html?set=${set}&page=${p}&t=${t}${extra}" --wait 1500 --shot ${out} --w 1500 --h 900 2>&1 | grep -v "GPU stall" | tail -3`, { cwd: process.cwd() }).toString();
  console.log(r.trim());
}

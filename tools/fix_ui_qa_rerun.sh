#!/bin/sh
# Re-runs the QA repro scripts of the UI findings against the test mirror (../ui_fix/mirror), output in ../ui_fix/qa/.
# Usage: sh tools/fix_ui_qa_rerun.sh   (run tools/fix_ui_mirror.sh first)
M="$(cd "$(dirname "$0")/.." && pwd)/../ui_fix/mirror"
O="$(cd "$(dirname "$0")/.." && pwd)/../ui_fix/qa"
mkdir -p "$O"
cd "$M" || exit 1
run() { name="$1"; shift; node "$@" > "$O/$name.log" 2>&1; echo "$name done"; }
run live_dead_desk tools/integrate_check.mjs --clear --eval tools/qa_live_dead.js &
run live_dead_phone tools/integrate_check.mjs --clear --touch --w 390 --h 844 --eval tools/qa_live_dead.js
wait
run live_helpkeys tools/integrate_check.mjs --clear --script tools/qa_live_helpkeys.mjs &
run live_job tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_job.mjs
wait
run live_queue tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_queue.mjs &
run live_walkspam tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_walkspam.mjs
wait
run live_touch tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_live_touch.mjs &
run cr_a11y tools/integrate_check.mjs --clear --nohelp --wait 2500 --eval tools/qa_cr_a11y.js
wait
run bb_misc2 tools/integrate_check.mjs --clear --nohelp --script tools/qa_bb_misc2.mjs &
run live_meal tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_meal.mjs
wait
run live_social tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_social.mjs &
run live_social_phone tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_live_social.mjs
wait
run live_layout_desk tools/integrate_check.mjs --clear --nohelp --script tools/qa_live_layout.mjs &
run live_layout_phone tools/integrate_check.mjs --clear --nohelp --touch --w 390 --h 844 --script tools/qa_live_layout.mjs
wait
run vis_hud_desk tools/qa_vis_check.mjs --clear --script tools/qa_vis_hud.mjs --w 1280 --h 800 &
run vis_hud_phone tools/qa_vis_check.mjs --clear --script tools/qa_vis_hud.mjs --touch --w 390 --h 844
wait
run vis_widths_768 tools/qa_vis_check.mjs --clear --nohelp --script tools/qa_vis_widths.mjs --w 768 --h 1024 &
run vis_widths_761 tools/qa_vis_check.mjs --clear --nohelp --script tools/qa_vis_widths.mjs --w 761 --h 900
wait
run vis_pie_phone tools/qa_vis_check.mjs --clear --nohelp --touch --script tools/qa_vis_pie.mjs --w 390 --h 844 &
run bb_misc tools/integrate_check.mjs --clear --nohelp --script tools/qa_bb_misc.mjs
wait
echo ALL_DONE

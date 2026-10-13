#!/bin/sh
# Builds a private test mirror of the game for the UI fixer while other modules are mid-edit.
# Usage: sh tools/fix_ui_mirror.sh [render-source-dir]
# Copies game/ to ../ui_fix/mirror. If js/render.js from game/ fails to boot, pass a directory holding a
# known-good render.js (e.g. ../game_base/js) as $1 and it replaces the copy.
set -e
G="$(cd "$(dirname "$0")/.." && pwd)"
D="$G/../ui_fix/mirror"
rm -rf "$D"
mkdir -p "$D"
cp -r "$G/index.html" "$G/js" "$G/vendor" "$G/tools" "$G/notes" "$D/"
if [ -n "$1" ] && [ -f "$1/render.js" ]; then cp "$1/render.js" "$D/js/render.js"; echo "render.js from $1"; fi
echo "mirror at $D"

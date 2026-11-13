#!/usr/bin/env bash
# Long Haul smoke test. Run from anywhere: bash tests/smoke.sh   (exit code 1 if anything fails)
#   1. node --check on every src file
#   2. load index.html, index.html#space, index.html#surface in headless Chrome, fail on a console error,
#      save a screenshot of each to tests/out/ (gitignored)
#   3. tests/loop.mjs: scripted rescue from station to payout, asserts +500 credits
# Needs Google Chrome and Node 22+. Uses throwaway Chrome profiles, never your own. No GNU timeout on this Mac,
# so a small watchdog kills a Chrome that hangs.
set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"
OUT="$ROOT/tests/out"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"
fail=0

echo "== 1. node --check"
for f in src/*.js tests/*.mjs; do
  if node --check "$f"; then echo "  ok  $f"; else echo "  FAIL $f"; fail=1; fi
done

FLAGS=(--headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader
  --allow-file-access-from-files --virtual-time-budget=5000 --enable-logging=stderr
  --window-size=1280,720 --hide-scrollbars --no-first-run --no-default-browser-check)

shoot() { # shoot <name> <url hash>
  local name="$1" hash="$2" prof log png pid dog
  prof="$(mktemp -d)"; log="$OUT/$name.log"; png="$OUT/$name.png"; rm -f "$png"
  "$CHROME" "${FLAGS[@]}" --user-data-dir="$prof" --screenshot="$png" "file://$ROOT/index.html$hash" >"$log" 2>&1 &
  pid=$!
  ( sleep 90; kill "$pid" 2>/dev/null ) & dog=$!
  wait "$pid" 2>/dev/null
  kill "$dog" 2>/dev/null; wait "$dog" 2>/dev/null
  rm -rf "$prof"
  if [ ! -s "$png" ] || [ "$(wc -c <"$png")" -lt 10000 ]; then echo "  FAIL $name: no screenshot, or it is blank (see $log)"; fail=1; return; fi
  if grep -E 'CONSOLE.*(Uncaught|Error|error)|:ERROR:CONSOLE' "$log" | grep -v -i 'GPU stall\|swiftshader' >"$OUT/$name.errors"; [ -s "$OUT/$name.errors" ]; then
    echo "  FAIL $name: console error:"; sed 's/^/       /' "$OUT/$name.errors" | head -n 5; fail=1; return
  fi
  echo "  ok  $name  ($(wc -c <"$png" | tr -d ' ') bytes) -> tests/out/$name.png"
}

echo "== 2. headless Chrome, one screenshot per scene"
shoot scene-station ""
shoot scene-space "#space"
shoot scene-surface "#surface"

echo "== 3. scripted rescue loop"
if node tests/loop.mjs; then :; else fail=1; fi

echo
if [ "$fail" = 0 ]; then echo "SMOKE PASS"; else echo "SMOKE FAIL"; fi
exit "$fail"

#!/usr/bin/env bash
# Long Haul smoke test. Run from anywhere: bash tests/smoke.sh   (exit code 1 if anything fails)
#   1. node --check on every src file
#   2. tests/scenes.mjs: load index.html, index.html#space, index.html#surface in headless Chrome, fail on a console
#      error, save a screenshot of each to tests/out/ (gitignored)
#   3. tests/loop.mjs: scripted rescue from station to payout, asserts +500 credits
#   4. tests/fixes.mjs: one check per playtest bug fixed (colonist, prompt box, toasts, ramming, insurance fee)
#   4b. tests/outpostmap.mjs: the Tab map shows Kestrel Outpost and its legend row
#   4c. tests/audiolevels.mjs and tests/surface.mjs: the planet wind sits under the effects; the surface controls panel, aim line
#       and cursor (card space-game-planet-audio-hints)
#   4d. tests/bounty.mjs: pirate bounty per type, the BOUNTY +N text, the HUD glow, the dock summary
#   4e. tests/credits.mjs: the gold coin and CR readout in the HUD strip and on the board, shop, map and pause panels, +N / -N floats
#   4f. tests/shipmode.mjs: boarding opens the Ship bay instead of launching; Enter launches, Esc goes back, Tab opens the map over it
#   5. tests/missions.mjs (only with FULL=1, about 2 minutes): the mission board, Rescue, Escort, Police patrol and
#      their failure paths, with the game clock stepped by hand
# Needs Google Chrome and Node 22+. Uses throwaway Chrome profiles, never your own. Chrome runs with
# --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files.
# (The plain chrome --screenshot route hung at random when the Mac was busy, so the scenes go over DevTools too.)
set -u
cd "$(dirname "$0")/.." || exit 1
fail=0

echo "== 1. node --check"
for f in src/*.js tests/*.mjs; do
  if node --check "$f"; then echo "  ok  $f"; else echo "  FAIL $f"; fail=1; fi
done

echo "== 2. headless Chrome, one screenshot per scene"
if node tests/scenes.mjs; then :; else fail=1; fi

echo "== 3. scripted rescue loop"
if node tests/loop.mjs; then :; else fail=1; fi

echo "== 4. one check per fixed bug"
if node tests/fixes.mjs; then :; else fail=1; fi

echo "== 4b. Kestrel Outpost on the Tab map (tests/outpostmap.mjs)"
if node tests/outpostmap.mjs; then :; else fail=1; fi

echo "== 4c. planet wind level and surface controls (tests/audiolevels.mjs, tests/surface.mjs)"
if node tests/audiolevels.mjs; then :; else fail=1; fi
if node tests/surface.mjs; then :; else fail=1; fi

echo "== 4d. pirate bounty you can see (tests/bounty.mjs)"
if node tests/bounty.mjs; then :; else fail=1; fi

echo "== 4e. credits unmistakable (tests/credits.mjs)"
if node tests/credits.mjs; then :; else fail=1; fi

echo "== 4f. ship bay between boarding and launch (tests/shipmode.mjs)"
if node tests/shipmode.mjs; then :; else fail=1; fi

echo "== 5. mission flow (board, Rescue, Escort, Police patrol, failures; about 2 minutes)"
if [ "${FULL:-0}" = 1 ]; then
  if node tests/missions.mjs; then :; else fail=1; fi
else
  echo "  skipped: run FULL=1 bash tests/smoke.sh to include tests/missions.mjs"
fi

echo
if [ "$fail" = 0 ]; then echo "SMOKE PASS"; else echo "SMOKE FAIL"; fi
exit "$fail"

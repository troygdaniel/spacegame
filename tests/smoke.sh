#!/usr/bin/env bash
# Long Haul smoke test. Run from anywhere: bash tests/smoke.sh   (exit code 1 if anything fails)
#   FULL=1 bash tests/smoke.sh   also runs the tests marked "// smoke FULL=1:" (the mission flow, about 2 minutes more)
#   ALL=1 bash tests/smoke.sh    runs every step even after one fails and lists every failure (the gate). Without it the run
#                                stops at the first failed step: the cheap steps run first, so a break shows in seconds, not
#                                after the Chrome tests. ALL=1 FULL=1 is the whole gate.
#   bash tests/smoke.sh --list   prints the steps and the skipped files and runs nothing
#
# Which tests run is not written here (docs/SMOKE.md). Every tests/*.mjs declares itself on its first comment lines:
#   // smoke: <what it checks, one line>      runs every time
#   // smoke FULL=1: <one line>               runs only with FULL=1
#   // not in the smoke: <why>                libraries the tests import, the playtest walks, the picture tools
# A test file with none of the three fails the smoke by name, so a new test cannot be forgotten, and adding one touches no
# shared file. The node-only tests (no import of tests/cdp.mjs) run first in name order, then the Chrome tests in name order.
# The fixed steps are not tests: node --check on every file, the generated content files are what a build makes
# (node tools/build-content.mjs --check), and the economy simulator still finds the code lines it pins.
# Order, cheapest first: a test file with no marker (named before anything runs), node --check, the content check, the node-only
# tests, the economy simulator, and last the Chrome tests. The run stops at the first failed step (exit 1) unless ALL=1.
#
# Only one headless Chrome runs at a time on this Mac, whatever the worktree: cdp.mjs takes a lock in tests/lock.mjs, so a second
# run prints "waiting for another Long Haul test run" and goes on when its turn comes (LONGHAUL_NO_LOCK=1 skips it).
# Every test it runs adds one line to the run ledger (suite, seconds, seconds waited for the lock, result, who; counts and times only): node tools/test-ledger.mjs reads it.
# Needs Google Chrome and Node 22+. Uses throwaway Chrome profiles, never your own. Chrome runs with
# --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files --mute-audio.
set -u
cd "$(dirname "$0")/.." || exit 1
export LONGHAUL_VIA=smoke   # the run ledger (tests/ledger.mjs) marks these lines as smoke runs, not hand runs
fail=0
list=0; [ "${1:-}" = "--list" ] && list=1
all=0; [ "${ALL:-0}" = 1 ] && all=1

# find the tests: "file|when|what", node-only first, then Chrome, each in name order
steps=(); skipped=(); unmarked=()
for phase in node chrome; do
  for f in tests/*.mjs; do
    if grep -q 'cdp\.mjs' "$f"; then kind=chrome; else kind=node; fi
    [ "$kind" = "$phase" ] || continue
    m=$(grep -m1 -E '^// (smoke|smoke FULL=1|not in the smoke): ' "$f" || true)
    case "$m" in
      "// smoke FULL=1: "*) steps+=("$f|full|${m#// smoke FULL=1: }") ;;
      "// smoke: "*) steps+=("$f|always|${m#// smoke: }") ;;
      "// not in the smoke: "*) skipped+=("$f: ${m#// not in the smoke: }") ;;
      *) unmarked+=("$f") ;;
    esac
  done
done
total=$(( ${#steps[@]} + 3 )); i=0
step() { i=$((i+1)); echo "== $i/$total $1"; }
# the first failed step ends the run (ALL=1 goes on); i is 0 when no step has started yet
stop() { local at="step $i/$total"; [ "$i" = 0 ] && at="the file check, before step 1"; echo; echo "SMOKE FAIL: stopped at the first failure ($at); ALL=1 bash tests/smoke.sh goes on and lists every failure"; exit 1; }
run() { if [ "$list" = 1 ]; then return 0; fi; if "$@"; then :; else fail=1; [ "$all" = 1 ] || stop; fi; }
# a test file with none of the three markers is the cheapest failure to see: name it before anything runs
# (the ${a[@]+"${a[@]}"} form: the Mac's bash 3.2 calls an empty array unbound under set -u)
for f in ${unmarked[@]+"${unmarked[@]}"}; do echo "  FAIL $f has no // smoke: line: say what it checks, or // not in the smoke: and why (docs/SMOKE.md)"; fail=1; done
if [ "$fail" = 1 ] && [ "$list" = 0 ] && [ "$all" = 0 ]; then stop; fi
# the tests of one phase (node or chrome), in the order found
tests() {
  for s in "${steps[@]}"; do
    IFS='|' read -r file when what <<< "$s"
    if grep -q 'cdp\.mjs' "$file"; then kind=chrome; else kind=node; fi
    [ "$kind" = "$1" ] || continue
    step "$file: $what"
    if [ "$when" = full ] && [ "${FULL:-0}" != 1 ]; then echo "  skipped: run FULL=1 bash tests/smoke.sh to include it"; continue; fi
    run node --import ./tests/ledger-on.mjs "$file"   # ledger-on.mjs: one line in the run ledger when the test ends (docs/TESTING.md "The run ledger")
  done
}

step "node --check on every file"
if [ "$list" = 0 ]; then
  for f in src/*.js tests/*.mjs tools/*.mjs; do
    if node --check "$f"; then echo "  ok  $f"; else echo "  FAIL $f"; fail=1; [ "$all" = 1 ] || stop; fi
  done
fi
step "content.generated.js and mods.generated.js are what a build makes (node tools/build-content.mjs --check; after a change to content/ run it with --seal)"
run node tools/build-content.mjs --check
tests node
step "economy simulator: real data loads, pinned code lines still there (node tools/economy-sim.mjs check)"
run node tools/economy-sim.mjs check
tests chrome

echo
[ "${#skipped[@]}" = 0 ] || { echo "not in the smoke:"; for s in ${skipped[@]+"${skipped[@]}"}; do echo "  $s"; done; }
if [ "$list" = 1 ]; then if [ "$fail" = 0 ]; then echo "LIST OK: ${#steps[@]} tests, $total steps"; else echo "LIST FAIL"; fi; exit "$fail"; fi
if [ "$fail" = 0 ]; then echo "SMOKE PASS"; else echo "SMOKE FAIL"; fi
exit "$fail"

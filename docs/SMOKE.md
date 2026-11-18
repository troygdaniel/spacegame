# The smoke test: how tests are found, and how the content seal stays merge-free

Card `space-game-smoke-autodiscover` (Troy, 2026-11-14). Before it, almost every merge conflicted in `tests/smoke.sh` (each card appended a numbered step: 4zd, 4ze, 4zf... renumbered in merge commits) or in `content.generated.js` (its header line `hash: ..., core: ..., files: ...` is rewritten by every content change, so two branches that both touched `content/` always clashed on it, and the merger had to rebuild and re-seal by hand). This page is the plan and the rule.

## 1. The smoke finds its tests: a test declares itself

`bash tests/smoke.sh` no longer lists tests. It runs every `tests/*.mjs` whose first comment lines carry one of three markers, and nothing else:

```
// smoke: the hangar terminal in the Ship bay: fleet, yard and controls tabs, buy and sell with a second press, board, move, rename
// smoke FULL=1: mission flow (board, Rescue, Escort, Police patrol, failures; about 2 minutes)
// not in the smoke: a library the tests import (no checks of its own)
```

- `// smoke:` runs every time. `// smoke FULL=1:` runs only with `FULL=1 bash tests/smoke.sh` (the old step 5 behaviour). `// not in the smoke:` is for libraries (`cdp.mjs`, `lock.mjs`, `gamecopy.mjs`), the playtest walks, and the picture tools (`hudshots.mjs`, `stationshots.mjs`, `ships.mjs`, `world.mjs`, `probe.mjs`).
- A test file with none of the three **fails the smoke by name**. So a new test cannot be forgotten, and the only edit a card makes is inside its own new file: nothing two branches both touch.
- The one line after the marker is the step name in the output, so `== 17/41 tests/hangar.mjs: the hangar terminal...` reads as before; the number is counted at run time, never written in a file.
- Order: the node-only tests first (a file that does not import `tests/cdp.mjs`), alphabetical; then the Chrome tests, alphabetical. Node-only tests take seconds and fail fast; Chrome tests take the one-Chrome lock.
- Fixed steps stay in `smoke.sh` because they are not tests: `node --check` on every file, `node tools/build-content.mjs --check` (the generated files are what a build makes; section 2), and `node tools/economy-sim.mjs check`.
- `bash tests/smoke.sh --list` prints the steps it would run and the files it skips, and runs nothing. Use it to see a new test was picked up.
- Every test it runs adds one line to the run ledger (suite, seconds, seconds waited for the lock, result, who): `smoke.sh` sets `LONGHAUL_VIA=smoke` and runs each test as `node --import ./tests/ledger-on.mjs <file>`. Counts and times only; `node tools/test-ledger.mjs` reads it (`docs/TESTING.md`, "The run ledger").
- `SMOKE PASS` / `SMOKE FAIL` and the exit code are unchanged; the files skipped are listed at the end so an accidental `// not in the smoke:` is visible. A run now stops at the first failed step (section 5); `ALL=1` keeps the old run-to-the-end.

A branch made before this change that added a step to `smoke.sh`: drop its `smoke.sh` lines in the merge and put the `// smoke:` line at the top of its test.

## 2. The seal is a word, not a hash

`content.generated.js` is still committed (the game opens from `file://`, so the content must be in a script the page can load; a player who downloads the game runs no build). What changes is its header. Before:

```
var CONTENT = {
  version: 1, hash: "e577d06a", core: "e577d06a", files: 43,
```

After:

```
var CONTENT = {
  version: 1, core: "sealed",
```

- `core: "sealed"` means: this file is the shipped core pack, as committed. Every sealed build writes the same header, so two branches that both changed `content/` differ only in the entry lines they changed, one entry a line in path order. Two files that add entries in different places merge clean; two that change the same entry conflict on that entry, like code, and that is a real conflict.
- `hash` and `files` are gone from the header. The browser already hashes the entries itself (`ContentLib.apply` computes `actual`), and that is what the Title panel shows.
- A normal build (`node tools/build-content.mjs`, or the dev server) of **edited** content keeps the MODDED behaviour: it reads the file it is about to replace, and if that file was sealed and the new entries differ, it writes `core: "<hash of the old entries>"`, the shipped pack's hash; the browser compares `actual` to it and says MODDED. If the file already carried a hash, it keeps it (as before). A build whose result equals the sealed file writes `sealed` again (no change).
- `node tools/build-content.mjs --seal` writes `core: "sealed"`: "this is the core pack now". Maintainers run it after changing `content/`; a modder does not (docs/MODS.md 10).
- `--check` (the smoke's fixed step) fails when the committed `content.generated.js` or `mods.generated.js` is not what a build would write, so a merge that needs a rebuild is caught; the fix is `node tools/build-content.mjs --seal`. `tests/contentapply.mjs` checks the committed file says `sealed` and equals a build.
- `mods.generated.js` is unchanged (its per-pack `hash` stays: the Mods screen uses it for picked packs, and two branches rarely change the one tracked pack).
- Lost on purpose: a hand edit of a sealed `content.generated.js` is no longer told apart from the shipped file (there is no hash line to disagree with). The second look still checks every field, so a hand edit cannot break the game, and the Mods screen is the supported way to change content.

Tests that need "the shipped pack's hash" (`contentui`, `contentadd`, `contentproof` build a game copy that must read as MODDED against the real core) get it from `shippedCore()` in `tools/build-content.mjs`: the hash of the committed file's entries.

## 3. The proof: a mock two-branch merge

`tests/mergeproof.mjs` (node-only, in the smoke) makes a throwaway git repo with the build script, the parser and a small `content/`, commits a sealed build, then on two branches adds one content file and one `// smoke:` test each, rebuilds with `--seal` on each, and merges: no conflict, `--check` is clean, `smoke.sh --list` shows both tests. As a control it repeats the merge with the old header (a hash per branch) and checks that one does conflict.

## 4. Landing

Land only after the branches in review at the time (B5 systems, E2 pullout, perf) have merged, because this touches the top of every test file and the header of the generated file: rebase, `node tools/build-content.mjs --seal`, run `bash tests/smoke.sh --list` and the touched tests, then review. DreamBot's one full smoke on the merged batch is the first full run of the new runner.

## 5. It stops at the first failed step (card `retro-smoke-fail-fast`, retro rec 7, Troy 2026-11-15)

Before, `smoke.sh` set `fail=1` on a failed step and ran on to the end, so a typo found in the first second still cost the whole run, Chrome tests included. Now:

- **The first failed step ends the run**: it prints `SMOKE FAIL: stopped at the first failure (step N/M); ALL=1 bash tests/smoke.sh goes on and lists every failure` and exits 1. This holds for every step: a `node --check` file, the content check, a node test, the economy simulator, a Chrome test.
- **The cheap steps run first**, so the stop comes early: a test file with no `// smoke:` marker is named before anything runs (the run ends there, before step 1), then `node --check`, the content check, the node-only tests, the economy simulator, and last the Chrome tests (one headless Chrome at a time through the lock). Nothing that needs a browser runs before a step that does not.
- **`ALL=1 bash tests/smoke.sh` runs everything**: every step after a failure, every failure listed, still exit 1 and `SMOKE FAIL` at the end. It is the gate's switch: DreamBot's one full pass on the merged batch is `ALL=1 FULL=1 bash tests/smoke.sh`. `FULL=1` is a separate switch (it adds the mission flow); `ALL=1` does not add it.
- `bash tests/smoke.sh --list` is unchanged: it lists everything and runs nothing, and still ends `LIST FAIL` for a file with no marker.
- A card's own pass before review is the touched suites (docs/TESTING.md), not the whole smoke, so fail-fast mostly saves the gate and a branch that runs the whole smoke by hand.
- `tests/smokefail.mjs` (node-only, in the smoke) runs the real `smoke.sh` in a temp folder with stand-in tools and tests: a failing node test stops it before the next test, the economy step and the Chrome test; `ALL=1` runs them all; the order is node, economy, Chrome; a syntax error and an unmarked file stop it before any test.

## 6. The gate's smoke goes to the front of the Chrome line (card `space-game-lock-gate-first`)

The batch smoke is some forty Chrome runs one after another, and each one queued behind every builder's run already in the line: on 2026-11-17 it would have taken over an hour, and main went out before it finished. Now:

- **`ALL=1 bash tests/smoke.sh` sets `LONGHAUL_GATE=1`**, and a run with that set takes the next free slot of the test lock (`tests/lock.mjs`) ahead of every ordinary waiter. `ALL=1` is the gate's switch (section 5): a builder's own run does not set it, and must not set `LONGHAUL_GATE` to jump the line.
- **Ordinary runs keep their order** among themselves, and none is passed twice in a row: after a gate run, the oldest ordinary waiter goes before the next gate run. A builder's Chrome test waits for one gate run at most; the gate waits for one builder at most between two of its runs.
- **Nothing to update in a worktree on an older `lock.mjs`**: the line is tickets sorted by name, and a gate ticket is only named to sort first, so an older copy gives way by itself.
- `node tests/lock.mjs status` marks the gate's runs `[gate]`. `tests/locktest.mjs` proves the rule with stand-in waiters in plain Node (no Chrome).

## 7. Chrome draws on the Mac's GPU (card `space-game-chrome-throughput`, 2026-11-17)

The run ledger for 15 to 17 Nov said 77 percent of all test time was spent waiting for the one Chrome. Chrome was drawing in software (SwiftShader), so every stepped frame was rasterised on the CPU that seven agents were already using.

`tests/cdp.mjs` now starts Chrome with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`. Measured in one hold of the lock, each test in software and then on the GPU, load average 19, an M4:

| test | software | GPU | checks |
|---|---|---|---|
| `surface` (short, stepped) | 16.5 s | 5.1 s | 21 pass both |
| `autotarget` (long, stepped) | 150.9 s | 8.2 s | 39 pass both |
| `scenes` (screenshots, real time) | 18.0 s | 12.7 s | 4 pass both |
| all three | 185.4 s | 26.0 s | 7.1 times faster |

- Pictures of a stepped test are the same to the eye: 0.6 to 0.7 of 255 per channel on average. A picture is not byte-for-byte the same as a software one, so do not compare a new picture with an old one by its bytes.
- A test that runs in real time (`scenes`, anything that sleeps instead of stepping) reaches a later frame in the same wall time: the game is the same, the moment is not.
- `LONGHAUL_GL=software node tests/<name>.mjs` puts SwiftShader back: for a machine with no GPU, or to tell a drawing difference from a game bug.
- Numbers in `docs/PERF.md` and the playtest pages that say "software GL" were measured before this and are not comparable with a run after it.
- Not done on that card, by ORCH's word, unless the overnight smoke is still slow: a second Chrome slot, and moving logic-only Chrome tests to plain Node.

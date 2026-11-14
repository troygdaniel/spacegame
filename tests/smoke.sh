#!/usr/bin/env bash
# Long Haul smoke test. Run from anywhere: bash tests/smoke.sh   (exit code 1 if anything fails)
#   1. node --check on every src file
#   1b. tests/content.mjs: the markdown content parser, schema, validator and build script (no browser; docs/MODDING.md)
#   1b2. tests/contentapply.mjs: the second look at content.generated.js and the merge by id over the built-in tables (no browser)
#   1c. tests/hygiene.mjs: fails on a key, token, email address, phone number or /Users path in a tracked file or in content/
#   1d. tests/locktest.mjs: the one-Chrome-at-a-time lock and the orphan Chrome profile cleanup (tests/lock.mjs; no browser)
#   2. tests/scenes.mjs: load index.html, index.html#space, index.html#surface in headless Chrome, fail on a console
#      error, save a screenshot of each to tests/out/ (gitignored)
#   3. tests/loop.mjs: scripted rescue from station to payout, asserts +500 credits
#   4. tests/fixes.mjs: one check per playtest bug fixed (colonist, prompt box, toasts, ramming, insurance fee)
#   4b. tests/outpostmap.mjs: the Tab map shows Kestrel Outpost and its legend row
#   4c. tests/audiolevels.mjs and tests/surface.mjs: the planet wind sits under the effects; the surface controls panel, aim line
#       and cursor (card space-game-planet-audio-hints)
#   4d. tests/bounty.mjs: pirate bounty per type, the BOUNTY +N text, the HUD glow, the dock summary
#   4e. tests/credits.mjs: the gold coin and CR readout in the HUD strip and on the board, shop, map and pause panels, +N / -N floats
#   4f. tests/hyper.mjs: the hyperspace tunnel demo (#hyper), its timing, readout and colour; no save written
#   4g. tests/shipmode.mjs: boarding opens the Ship bay instead of launching; Enter launches, Esc goes back, Tab opens the map over it
#   4i. tests/launch.mjs: pirates fair at launch (20 s grace, one-at-a-time first wave, spawns kept out, hit invulnerability)
#   4j. tests/contentboot.mjs: a bad, missing, broken or hand-edited content.generated.js never stops the game reaching Title and playing
#   4l. tests/npcs.mjs: the six bar characters (persona cards, lines, reactions), IDA only after the first rescue is paid, a talk with each new one
#   4m. tests/systemart.mjs: planet kinds, star types and the four station looks for other systems (not used by the game yet)
#   4n. tests/savemig.mjs: save v2 and the v1 migration; G.hull, G.maxHull, G.ore and G.upgrades over the active ship; unknown ids fall back
#   4p. tests/contentui.mjs: the Title screen's content chip, problems panel and MODDED tag (nothing shows when all is well)
#   4q. tests/shipsheet.mjs: the six player ships (silhouettes, every upgrade slot, nozzles, physics circle, hangar, flight, Ship bay)
#   4r. tests/cruise.mjs: Halcyon at 36000 px, the nav list (N) and cruise (C): speed profile, locks, cancel, nudge, frame cost
#   4v. tests/interdict.mjs: pirates pull you out of cruise (forced roll, gates: 4000 px from a station, 90 s cooldown, two jumps) and the pirate tables per system
#   4x. tests/contentproof.mjs: the proof set in markdown (raider, drone, rescue, JUNO, nine part tiers) over the code's tables changes nothing; edited files change exactly what they say; wrong files are refused
#   4s. tests/journal.mjs: J opens the Journal in the station (people met, notes, facts, no key needed), Forget everything needs a second press, the Pause row
#   5. tests/missions.mjs (only with FULL=1, about 2 minutes): the mission board, Rescue, Escort, Police patrol and
#   4o. tests/chat.mjs: the NPC chat adapter and the chat box in the bar with a mocked fetch: no key means no call; OpenAI and Anthropic get the right URL,
#   4u. tests/fuel.mjs: the tank per ship, jump cost, the fuel pump terminal in the station, the HUD FUEL chip, the fuel ranger
#   4t. tests/shipmodels.mjs: the six ship models against docs/UNIVERSE.md 6.1, and the Wren's speed, thrust, turn, boost and hull in the real Space scene
#   4u. tests/parts.mjs: the five ship parts (shields, weapons, engine, tank, cargo): tables, every effect, shields in flight, shot rate and damage, the shop's five cards with fit and stock rules, the save
#   4w. tests/fleet.mjs: buy, sell, switch, rename and transfer ships, the yard and the prices, per-ship state through a save, and dying (docs/UNIVERSE.md 6.3)
#   4zb. tests/modsdoc.mjs: docs/MODS.md, the modder guide, stays true: its field tables are written from the schema, its example files are valid, the ids and messages it names are in the code (no browser)
#   4y. tools/economy-sim.mjs check: the economy simulator still loads the real game data and every code line it pins (repair, insurance, MULE speed...) is still there (docs/ECONOMY.md; no browser)
#   4z. tests/hangar.mjs: the hangar terminal in the Ship bay: fleet, yard and controls tabs, buy and sell with a second press, board, move, rename, what the stage shows
#   4zb. tests/galaxymap.mjs: the galaxy map overlay (opens only from #galaxy): the eight systems, ranges, the card, out of range and short of fuel, keys and clicks, onJump
#       header and body shape; the key is only ever in its header; 401 switches chat off; 429 waits; the setup panel saves a key
#      their failure paths, with the game clock stepped by hand
# Only one headless Chrome runs at a time on this Mac, whatever the worktree: cdp.mjs takes a lock in tests/lock.mjs, so a second
# run prints "waiting for another Long Haul test run" and goes on when its turn comes (LONGHAUL_NO_LOCK=1 skips it).
# Needs Google Chrome and Node 22+. Uses throwaway Chrome profiles, never your own. Chrome runs with
# --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files.
# (The plain chrome --screenshot route hung at random when the Mac was busy, so the scenes go over DevTools too.)
set -u
cd "$(dirname "$0")/.." || exit 1
fail=0

echo "== 1. node --check"
for f in src/*.js tests/*.mjs tools/*.mjs; do
  if node --check "$f"; then echo "  ok  $f"; else echo "  FAIL $f"; fail=1; fi
done

echo "== 1b. markdown content parser and build script (tests/content.mjs)"
if node tests/content.mjs; then :; else fail=1; fi
echo "== 1b2. content merge by id and the second look at content.generated.js (tests/contentapply.mjs)"
if node tests/contentapply.mjs; then :; else fail=1; fi
echo "== 1c. hygiene: no keys, emails, phone numbers or personal paths in anything we publish (tests/hygiene.mjs)"
if node tests/hygiene.mjs; then :; else fail=1; fi
echo "== 1d. test lock and orphan profile cleanup (tests/locktest.mjs)"
if node tests/locktest.mjs; then :; else fail=1; fi

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

echo "== 4f. hyperspace tunnel demo (tests/hyper.mjs: #hyper, #hyper24, #hyper2)"
if node tests/hyper.mjs; then :; else fail=1; fi

echo "== 4g. ship bay between boarding and launch (tests/shipmode.mjs)"
if node tests/shipmode.mjs; then :; else fail=1; fi
echo "== 4h. ship voice with a mocked fetch: no key, no call; nothing ever reaches Deepgram (tests/voice.mjs)"
if node tests/voice.mjs; then :; else fail=1; fi

echo "== 4i. fair launch: 20 s pirate grace, first-wave cap, distant spawns, hit invulnerability (tests/launch.mjs)"
if node tests/launch.mjs; then :; else fail=1; fi
echo "== 4j. content loader: a bad, missing or broken content.generated.js never blanks the game (tests/contentboot.mjs)"
if node tests/contentboot.mjs; then :; else fail=1; fi

echo "== 4k. dev server: serves, refuses, rebuilds on change, R reloads (tests/serve.mjs)"
if node tests/serve.mjs; then :; else fail=1; fi
echo "== 4l. the Drift's six characters (tests/npcs.mjs)"
if node tests/npcs.mjs; then :; else fail=1; fi
echo "== 4m. art for other star systems (tests/systemart.mjs)"
if node tests/systemart.mjs; then :; else fail=1; fi
echo "== 4n. save v2, the v1 migration and the fleet accessors (tests/savemig.mjs)"
if node tests/savemig.mjs; then :; else fail=1; fi
echo "== 4o. NPC chat adapter with a mocked fetch: no key, no call; the right host and header per provider; 401 and 429 (tests/chat.mjs)"
if node tests/chat.mjs; then :; else fail=1; fi
echo "== 4p. content on the Title screen: problems chip, panel, MODDED tag (tests/contentui.mjs)"
if node tests/contentui.mjs; then :; else fail=1; fi

echo "== 4q. the six player ships (tests/shipsheet.mjs)"
if node tests/shipsheet.mjs; then :; else fail=1; fi

echo "== 4r. cruise: N nav list, C cruise, a 36000 px Halcyon (tests/cruise.mjs)"
if node tests/cruise.mjs; then :; else fail=1; fi
echo "== 4s. the Journal: who you have met (tests/journal.mjs)"
if node tests/journal.mjs; then :; else fail=1; fi
echo "== 4t. ship models and shipStat: the table pinned to the design, the Wren flies as before (tests/shipmodels.mjs)"
if node tests/shipmodels.mjs; then :; else fail=1; fi
echo "== 4v. interdiction in cruise and the pirate tables per system (tests/interdict.mjs)"
if node tests/interdict.mjs; then :; else fail=1; fi
echo "== 4u. ship parts: shields, weapons, engine, tank, cargo (tests/parts.mjs)"
if node tests/parts.mjs; then :; else fail=1; fi
echo "== 4w. the fleet: buy, sell, switch, rename, transfer (tests/fleet.mjs)"
if node tests/fleet.mjs; then :; else fail=1; fi
echo "== 4x. the proof set in markdown: files over their defaults change nothing, edits change exactly what they say (tests/contentproof.mjs)"
if node tests/contentproof.mjs; then :; else fail=1; fi
echo "== 4y. economy simulator: real data loads, pinned code lines still there (tools/economy-sim.mjs check)"
if node tools/economy-sim.mjs check; then :; else fail=1; fi
echo "== 4z. the hangar terminal in the Ship bay (tests/hangar.mjs)"
if node tests/hangar.mjs; then :; else fail=1; fi
echo "== 4za. fuel: tank, jump cost, the pump terminal, the FUEL chip, the ranger (tests/fuel.mjs)"
if node tests/fuel.mjs; then :; else fail=1; fi
echo "== 4zb. the modder guide stays true (tests/modsdoc.mjs)"
if node tests/modsdoc.mjs; then :; else fail=1; fi
echo "== 4zc. the galaxy map overlay (tests/galaxymap.mjs)"
if node tests/galaxymap.mjs; then :; else fail=1; fi

echo "== 5. mission flow (board, Rescue, Escort, Police patrol, failures; about 2 minutes)"
if [ "${FULL:-0}" = 1 ]; then
  if node tests/missions.mjs; then :; else fail=1; fi
else
  echo "  skipped: run FULL=1 bash tests/smoke.sh to include tests/missions.mjs"
fi

echo
if [ "$fail" = 0 ]; then echo "SMOKE PASS"; else echo "SMOKE FAIL"; fi
exit "$fail"

# Roadmap

**Updated: 21 Nov 2026.** What comes next, what is parked, and what is out. For where things stand *now* read `PROJECT_STATUS.md`; for how it is built, `ARCHITECTURE.md`. Only Troy (the owner) moves something from one list to another.

**The rule of the moment: feature freeze** (since 20 Nov 2026). No new features; bug fixes and the fleet-command batch only. New ideas land on the bench below and wait. The identity the work protects: *a Homeworld-style commander game with X-Wing's scripted mission structure, and the Earth and colony story.*

## Now (near term, in this order)

1. **Finish the fleet-command batch.** The goal Troy gave on 21 Nov 2026: *fights were not interactive and escorts were boring; he wants to direct the fleet more.* Most of the batch is on main (panels, convoy orders, scouting a route, torpedo boats, a rival ship, fighter repair, power gauges). Still open: the panel keys moving to Z X C, and the last tests that press the old keys.
2. **Make mission 1.1 the one finished example.** Mission 1.1 (escort a transport from the Moon to Ceres) carries every new system in a beat about each minute. Nothing is spread to levels 2 and 3 until Troy has played 1.1 with the whole batch and says it works.
3. **Retune all nine missions** after the new systems: the plain bot wins all nine at all three paces with losses in the hard ones; an idle player never wins; a player who answers calls and uses convoy orders does clearly better; level 1 missions about five to eight minutes. 1.1 is tuned; the rest follow.
4. **Troy plays 1.1, then the cut list** (below) is decided.

## The cut list (decided after Troy plays 1.1)

Nothing is cut until he has played mission 1.1 with the fleet-command batch and says so. The test for every idea, in or out: **what does the player decide, and what does it cost?** A mission is a sequence of questions. Candidates:

1. The **stances page** on the FLEET panel: (it is still there: page 2, and `E` steps through the stances).
2. ~~The **pace key P** (Calm, Normal, Brisk)~~: cut by card `space-game-two-hands-keys` (the Campaign flies at Normal).
3. **Holding Space to fire the turrets**: in a commander game the turrets could fire by themselves, the player's job being power and orders.
4. **Scout-ahead routes**: content for one mission; keep only if it earns its place.
5. **The distress call in 1.1**: same.

Raised again when Troy reports on 1.1, or says the game asks too much attention.

## The bench (parked ideas, not scheduled)

Each says when to raise it. None starts without Troy's yes.

1. **Fleet groups (numbered).** Name groups of small ships (A, B, C...), assign ships, give an order to a group instead of the whole wing. The fighters' three squads (Red, Green, Yellow: card `space-game-fighter-squads`, Troy, 22 Nov 2026) are the first part of this and are built, with Fighters, Escorts and All; numbered ones wait until ranks give a bigger wing. *Raise when:* orders, fleet code, ranks. *Open:* how ships join a group (key, strip, automatic by type), how many.
2. **Command the fleet from the map.** Select a group or ships on the Tab map and send them to a place or at a target: an order menu on click, right-click for the smart order, group selectors, order lines. The sim side (orders with explicit targets and groups) is built; the map screen is parked with its work in progress kept on a branch. *Depends on:* idea 1 for groups.
3. **A second carrier** at a high rank, long term: a second carrier you command, small ships split between them. *Raise when:* ranks, fleet groups or the ready room are touched.
4. **The call-in supply ship** for other systems: dock anywhere, shielded, it withdraws instead of dying. About two thirds built, parked. It is the first step of the colonisation supply chain in the Dying Earth chapter (below).
5. **Mine-to-fleet**: panels with more pages (combat, work, stance). Partly in: Mine ore moved to the FLEET panel; the rest is parked.
6. **The Campaign as a moddable pack.** Troy wants campaigns configurable again and again, and others able to make their own: a campaign is data anyone can swap, and a second sample campaign proves it. The mod machinery for Long Haul exists (`docs/MODS.md`); the Campaign's levels are already rows of one table (`CAMP`), so this is mostly a loader and a second sample.
7. **The Dying Earth** (story chapter, timing open: "a slow push, not now"). Earth falls victim to a radiological shift from solar radiation and stellar events (natural, not politics or population). At first the ancients' and aliens' technology helps and humanity thrives; then it crescendos into Earth facing armageddon while the fleet struggles to colonise the galaxy. Seeding ideas, all optional: faint "unusual flux" lines in chatter and briefings; a quiet solar-activity gauge on the Sol map that rises across missions; colony outposts as a growing count; the ancients' relic showing they fled the same fate (and the aliens too: were the raids a migration?). *Open:* does it start inside the Campaign (a slow thread from level 1) or is it a second chapter after the outpost reveal? Is Earth's fate the player's choice (colonies built, tech chosen) or fixed? *Raise when:* story lines, the level 3 reveal, the Sol map, outposts, the ending.
8. **Jump into a ship yourself** and fly it for a while (deferred).
9. **Long Haul keyboard panels.** Do for Long Haul what the Campaign did: merge its two keys B (ships) and N (places) into one list, which Troy dislikes having as two keys. *Raise when:* Long Haul is touched again.
10. **A key layout for two hands.** Panels on Z X C under the left hand is agreed (in progress); the rest of the layout is a draft.

## Out (deliberately, today)

- New features while the freeze holds (the bench above is where ideas go).
- Changes to Long Haul. It is finished; the Campaign shares its engine and must not break it.
- A hosted deploy, accounts, multiplayer, or any network call in the game. The game runs from a folder or `node tools/serve.mjs` on one computer.
- Image or sound files, new libraries, or a build step. Everything is drawn and synthesized in code.
- Spending, secrets, or anything personal in the repository (it is public; `tests/hygiene.mjs` fails on keys, emails, phone numbers and home paths).
- Deciding an open design question in a pull request or an issue comment. Those are Troy's (see `PROJECT_STATUS.md`).

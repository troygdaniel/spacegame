# Long Haul: how the work went (retrospective, 14 Nov 2026)

Facts and numbers from the board, its chat, the git history and the test logs. No blame: a number says how a step went, not who did it.
Every figure below comes from `tools/retro-stats.py` (the full output is in `docs/RETRO-NUMBERS.md`); a figure that is an estimate says so and gives its assumption.
Times are wall-clock hours on the board's clock, nights included.

## What the window was

- 12 Nov 21:48 to 14 Nov 13:48: **40 hours**, **95 cards done** (107 `space-game-*` cards in all: 7 doing, 5 todo), 2.4 an hour. 25, 46 and 24 cards closed on the three days.
- Seven agents (TaskMaster-1 to 5, BuildBot, DreamBot) plus ORCH. At any hour an average of **2.6 agents held a card** and at most 7; in 6 of the 41 hours none did.
- 296 commits, **100 merges** (52 branch into main by ORCH, 48 main into a branch by its agent), 547 chat lines (ORCH 279).
- Models, from the `Co-Authored-By` trailer of the merged branches: Claude Sonnet 5.5 on 219 commits and Claude Fable 5.1 on 22; the 18 Fable commits on cards are all BuildBot's.

## What worked

- **Cards were small and moved fast.** Median build (claim to first review) **34 minutes**; 62% of cards took under an hour. Review to done: median **2 minutes** (p90 42 min). Review to the merge commit on main: median **5 minutes**, 28 of 50 within 10 minutes. Review and merge were never the bottleneck.
- **Hand-out was quick.** From a card's review to ORCH's next line to that agent that hands out work: median **5 minutes** (82 cards; p90 2.7 h).
- **Subtasks gave progress a shape.** 89 of 95 done cards had subtasks (median 4); the board showed real percentages instead of a fixed checklist.
- **Rework on the board was rare.** 5 cards reviewed twice, 2 reopened, 5 "Be simpler" replies (2 cards), 13 cards with an edited title or description. The board kept one card when an agent announced work again (9 times) instead of making twins.
- **One Chrome at a time held.** Seven agents shared one Mac; the lock (`tests/lock.mjs`) turned load-induced DevTools timeouts into queueing, at a price (below).
- **Tests that fail first.** The last two agentboard cards (the Esc fix, talk-it-through) reproduced the problem in a test before fixing it; each reproduction failed on the old code and passed on the new (the Esc check fails 5 of 21 on main, the talk check 8 of 12).

## What cost the most

| # | cost | measured |
|---|---|---|
| 1 | **A full smoke on every card.** 36 full runs with a start and an end in their logs: median **1.34 h** (mean 1.37 h), about **49 h** in all; the tests themselves take about 0.78 h, the rest is waiting for the lock. 9 of the 36 failed. | `tests` |
| 2 | **Waiting for the one Chrome lock.** 106 logs recorded 3,692 wait lines at 30 s = **30.8 hours of runs queued** (per log: median 8 min, p90 48 min, max 1.6 h). The longest-running tests hold it most: `parts.mjs` 5.7 h, `jump.mjs` 2.6 h, `cruise.mjs` 2.1 h, `launch.mjs` 1.9 h. | `tests` |
| 3 | **Merge conflicts.** **59 of 100 merges conflicted** when replayed (52% of branch-into-main, 67% of main-into-branch). **`tests/smoke.sh` is in 37 of the 59 (63%)**; then `src/main.js` 10, `src/space.js` 8, `README.md` 7, `index.html` 6, `content.generated.js` 5. 15 of 28 re-synced branches were synced more than once (settings-screen and u-b1-fuel four times each). | `merges`, `conflicts` |
| 4 | **Nights.** Between-card gaps of half an hour to eight hours: 17 gaps, 42.5 h, of which **27.4 h fall between midnight and 08:00**. | `agents` |
| 5 | **A few big cards.** 10 cards over 3 hours are 11% of the cards and **48% of the build hours** (v2-station-interior 13.4 h, settings-screen 8.5 h, systems-schema-gaps 6.0 h, u-b1-fuel 5.4 h, u-b4-jump 4.3 h). Median build by size of change: under 100 lines 0.13 h, 100 to 499 lines 0.40 h, 500 to 1,999 lines 1.31 h. | `timing`, `big`, `size` |
| 6 | **Blocker chains.** 31 of 107 cards named a blocker; waiting for it (card made to blocker done): median **3.1 h**, p90 9.6 h, 118 card-hours in all. Once the blocker was done the card was claimed at once (median 0 min). Five cards waited on `u-a1-systems-data`. | `blocked` |
| 7 | **Pinned numbers in tests.** Of the 14 failing steps in the 9 failed smokes, 9 were content tests that pin a count (`CONTENT BOOT` 3, `CONTENT UI` 2, `CONTENT PROOF` 2, `MODSDOC` 1, `CONTENT` 1): every card that adds content moves a number another card's test holds. | `tests` |
| 8 | **Premise wrong.** 2 of the 4 bug cards were not game bugs (a tan square "not reproduced"; a freeze that was headless Chrome). 3 cards in all closed with a result that corrects the card's premise. | `waste` |

Smaller: 21 status checks from the owner relayed by ORCH (each one asks every agent for a line and a subtask update); 13 cards with a spec edited after they were made; 4 numbered twins or follow-ups.

## Which agent and model fit which kind of card

Only a rough picture: the board does not record the model, and most agents did a mix. Median build, in hours (cards):

| kind | BuildBot | DreamBot | TM-1 | TM-2 | TM-3 | TM-4 | TM-5 |
|---|---|---|---|---|---|---|---|
| other feature | 0.50 (7) | 0.22 (8) | 0.64 (6) | 0.23 (11) | 0.10 (14) | 1.43 (1) | 1.89 (2) |
| universe | | 1.69 (4) | 4.26 (3) | 1.50 (3) | | 1.38 (4) | 1.83 (2) |
| markdown content | | | 1.91 (2) | 2.32 (2) | 1.88 (3) | | 0.38 (3) |

- Small, well-bounded feature cards (a panel, a HUD element, an NPC) took 6 to 38 minutes at the median for five agents. "Universe" cards (jump, fuel, systems) are 1.4 to 4.3 hours at the median for everyone: the kind, not the agent, sets the time.
- Model: BuildBot's merged commits carry the Claude Fable 5.1 trailer; every other agent's carry Claude Sonnet 5.5. BuildBot's 12 cards have a median build of 0.50 h, in line with the others on the same kind of card (other feature: 0.10 to 0.64 h for five agents). With 1 to 14 cards per cell there is no evidence either way on which model is faster at which kind of card; what the data does show is that the kind and the size of a card predict its build time far better than who held it.
- Agents on the board hold a card 26% to 85% of the time between their first claim and last review (TM-5 85%, TM-3 76%, TM-4 64%, TM-1 49%, TM-2 46%, DreamBot 41%, BuildBot 26%). The board cannot see work that has no card (design notes, playtests, chat), so BuildBot's and DreamBot's lower share is not idle time.

## Ten changes, ranked by hours saved

Hours are agent wall-clock hours over a window like this one. **Measured** means the baseline is in the numbers; the saving is an **estimate** with its assumption.

| # | change | baseline (measured) | estimated saving |
|---|---|---|---|
| 1 | **Run only the suites the card touched, one full smoke per merged batch** (adopted by the owner on 14 Nov 13:47, so not yet in the numbers). | 36 full runs, about 49 h | about **42 h**: 36 x (1.37 h - about 0.2 h for the touched suites, assumed); the batch smoke runs beside the others' work |
| 2 | **A night queue.** Before the owner leaves, ORCH fills Todo with specified, unblocked cards and agents take the next one on their own (no auto-assign while the owner is awake stays). | 27.4 h of between-card gaps at night; 6 of 41 hours with no card held | up to **27 h** if cards are ready; fewer if blockers remain |
| 3 | **Tests count, they do not pin.** `contentboot`, `contentui`, `contentproof`, `modsdoc`, `content` compute the expected numbers from `content/` (or the build's own manifest) instead of literals. | 9 of 14 failing steps; each failed smoke is 1.3 h | up to **12 h** (9 reruns x 1.3 h, if each failure cost a full rerun) |
| 4 | **Smoke stops at the first failure and runs the cheap, no-browser checks first.** The content steps that fail most run after about 20 Chrome tests today. | 9 failed runs, each ran to the end | about **9 h**: 9 failed runs x about 1 h that need not run |
| 5 | **Smoke steps found by a glob, not listed by hand.** Each `tests/*.mjs` carries its own step name and order in a header; `smoke.sh` and its header comment are generated. | `smoke.sh` in 37 of 100 merges (63% of conflicts); 32 commit subjects name a smoke step by its letter, one renumbers them (`4zf`) | **6 to 10 h**: 37 conflicts x 10 to 15 min (assumed), plus the reruns after |
| 6 | **Cut a blocker into a contract and the fill.** The blocker merges its interface (data shape, stub, test) in the first half hour; dependents start then and the blocker's rest follows. | 118 card-hours blocked; median 3.1 h per blocked card | about **half** of the 118 card-hours, as calendar time; agent hours only where an agent would otherwise have waited |
| 7 | **Cap a card at about two hours and merge in slices.** A card past 2 h is split at its first natural seam; each slice reaches main on its own. | 10 cards over 3 h = 48% of build hours; they hold the repeated re-syncs (4 each) | **4 to 8 h**: 48 main-into-branch merges at 10 min (assumed), halved |
| 8 | **Registries generated, not hand-merged.** `index.html` script tags, the `src/main.js` scene list, the README file list and `content.generated.js` (merge driver or rebuild on merge). | 28 conflict-file hits in `main.js` 10, `README.md` 7, `index.html` 6, `content.generated.js` 5 | about **4 h** at 10 min a conflict (assumed) |
| 9 | **A bug card starts with a failing test.** If the test cannot fail, the card closes as "not reproduced" in minutes. | 2 of 4 bug cards were not game bugs (3.3 h on the tan square alone) | **4 to 5 h** |
| 10 | **ORCH answers a status check from `agentboard rollup`, not by asking each agent.** Agents are asked only about a card the rollup cannot explain. | 21 status checks, each asking up to 7 agents for a line and a subtask update | **3 to 5 h** at 1 to 2 min a reply (assumed) |

Not on the list because the numbers do not support it: faster review or merge (5 minutes), more ORCH hand-out speed (5 minutes), fewer subtasks (no measure of their cost), changing models (no evidence either way).

## How the numbers were made, and where they are weak

- `python3 tools/retro-stats.py --logs <folder of test logs>` reads the board's `tasks.json`, its hourly `backups/` (the live chat keeps only 500 lines; the snapshots hold all 547 since the start, none missing), the git history and the logs. It is read-only.
- **Build** is claim to the first "Ready for review" event; **idle** is the gap between one card's review and the same agent's next claim, so it includes the owner's night, the test queue and waiting for an assignment, which the board cannot tell apart (the clock split above is how nights were separated).
- **Conflicts** are replays of every merge commit with `git merge-tree`; a merge that was resolved without conflict, or a branch that fast-forwarded, is not counted as a conflict (cards that fast-forwarded have no merge commit, which is why the size table covers 50 cards).
- **Test-lock waits** come from the 106 logs still on disk; a log that was deleted is missing, so 30.8 hours is a floor. One wait line is printed per 30 s.
- **Kinds of card** are guessed from the card id (`u-` universe, `m<n>` content, `bug`, `npc-chat`, `playtest`).
- **Not measured:** time spent resolving a conflict (the commit history cannot separate it from the work around it), time inside one agent's thinking, and work with no card.

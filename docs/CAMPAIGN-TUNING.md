# Tuning the Campaign

Card `space-game-campaign-tune`. Troy plays the Campaign to feel out how it plays and where the story goes, so it has a kit: start at any level, debug keys, one table of numbers, and a play log of what he did. None of it touches Long Haul. Plain Node tests: `tests/campaigntune.mjs`, `tests/campaignaddr.mjs`, `tests/playlog.mjs`.

## Start at any level: the address

    index.html?campaign=2                       the Campaign at level 2 (a bare ?campaign is level 1)
    http://127.0.0.1:8787/?campaign=3&tech=beam,plating     level 3, with these techs

You start with the techs a player would have by then (the first one each earlier level offers); `&tech=a,b` names them instead (ids from `CAMP.tech`: shield, beam, blink, plating, bay2, repair). A wrong level (`?campaign=9`) or a tech that is not there is answered with a plain line and the game starts as it always does. The parser is `src/campaignaddr.js` (`campaignAddr`, `campAddrPlan`); the number of levels is the level table's, so a level added to `CAMP.levels` can be asked for at once.

## Debug keys (in the Campaign only)

| Key | Does |
|---|---|
| `]` | skip to the next level (the tech this level would have given is picked for you, the first it offers) |
| `\` | win this level: the story and the tech pick that follow a win are shown |
| `[` | lose this level |
| `` ` `` | god mode on and off: the carrier takes no damage and Earth's shield does not fall |

They are listed in one small line on the pause screen (`campDebugLine`). The rows are the data table `CAMP_DEBUG` at the top of `src/campdebug.js`: change a key there, one line.

## The numbers: one table

`CAMP` at the top of `src/campaign.js`, one line a number, a comment on each. Units: px, px/s, seconds for the times written in a level, milliseconds for a delay.

| To make it | Change |
|---|---|
| easier on the carrier | `carrier.hull` up, `carrier.speed` up, the `shield` tech's `taken` down (0.6 is 40 percent less damage) |
| easier on Earth | `earth.shield` up, `alien.earthDamage` down |
| a bigger wing | `bay.fighters`, `bay.escorts`; `fighter.damage` up, `fighter.hp` up |
| weaker or stronger aliens | `alien.hpScale` and `alien.damageScale` for all of them; `mother.hp` for the mothership |
| a bigger wave | `levels[n].waves[i].ships` (`raider`, `drone`, `gunship`) |
| stronger or weaker missiles | `missile.big` (the mothership, towers, gunships), `missile.small` (the rest), `missile.blast` |
| more or fewer missiles | `missile.magazine` (the start and the reload's full), `missile.reload` (ms for one to come back), `missile.max` (the most ore can fill it to) |
| easier or harder to aim | `missile.turn`, `missile.speed`, `missile.lock` (how far it can pick a target), `missile.fuze` |
| the turrets reach further | `carrier.pdRange` (px), `carrier.pd` (damage), `carrier.pdDelay` |
| a faster or slower level | `waves[i].at` (seconds into the level), `early` (seconds after the wave before is dead), `convoys[i].at` |
| the map | `places` (px from Earth); the Sol distances are `docs/SOL.md` at 1 to 12 |

A reload shows a change. A few small numbers still live in the code (a ship's radius, the freighter's turn): if you want one, move it into the table.

## The play log

Every level is in the play log (`docs/PLAYLOG.md`, the `campaign` event): the level, how it began (menu, address, next, retry or skip), the waves, each order and how it was given (key, strip, voice, click) and whether it worked, each ship lost, the tech picked, each debug key, and the end (win, lose, quit or skip, why, the wave reached, the ships lost, the hull left, the seconds). `node tools/playlog-summary.mjs` prints a **Campaign** block, one line a level. A level the tab closes on is ended as quit.

## For the scene

What the Campaign scene calls (none of it draws, all of it is plain data and functions):

- `campNew(level, techs, { via })`: `via` is `'menu' | 'address' | 'next' | 'retry' | 'skip'`, for the log. `campOrder(C, name, arg, how)`: `how` is `'key' | 'strip' | 'voice' | 'click'`, for the log.
- Title: `const plan = campAddrPlanPage()`; a plan with a `level` starts the Campaign scene with it (`{ level, techs, via }`); a plan with only `say` shows that line and the title goes on.
- Every key: `const id = campDebugKey(e.code); if (id) { const r = campDebugRun(this.C, this.P, id); show(r.say); if (r.go) start r.go.level with r.go.techs }`.
- Pause screen: `campDebugLine(C)`.
- The play log needs nothing else: it watches `campNew`, `campStep`, `campOrder` and `campPick` from outside (`playlogWrap`) and `campDebugRun` says its own steps (`campaignNote`).

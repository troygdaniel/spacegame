// ---------- Controls: every key of the game in one table (card space-game-settings-screen) ----------
// Three places show keys and all three are built from this table, so they cannot drift apart:
//   the Settings screen (src/settings.js)   lists every group, one tab each
//   the H help page (HELP in src/meta.js)   the lines of the scene you are in, from controlsHelp()
//   the Ship bay's key panel (BAY_CONTROLS in src/shipmode.js)   the rows marked bay, in the order they stand here
//   the Campaign's H page (src/campkeys.js, card space-game-campaign-keys-help)   the CAMPAIGN group, grouped by each row's sub, with the debug keys of src/campdebug.js added after them
// A group:  { id, title, scene, rows }   scene is the name of the scene whose H page lists it (null: not an H page)
// A row:    { k: ['W'], t: 'Thrust' }    k is the key caps (one or more), t says what the keys do
//           bay: 1    also in the Ship bay's list (twelve fit: eight of flight, then four of everywhere); bt is the short text it uses there
//           help: 0   left out of the H page (it is long enough)
//           sub: 'ORDERS'   the CAMPAIGN group only: the heading its page puts the row under (rows of one sub stand together; the Settings tab lists them flat)
// When a key changes in the game, change its row here and nothing else. tests/settings.mjs checks the table's shape and that the three views agree.
// A line of the H page is the caps, three spaces and the text: keep it to 43 characters and a scene to 20 lines, which is what the page holds
// (20 px type, 520 px wide, 580 px high). tests/controlshelp.mjs checks that, that every key named here is bound, and that every key the
// Space scene binds is named here.
// ---------- the Campaign's lists (cards one-list-keys and list-shortcuts; Troy, 22 and 23 Nov 2026: "one list per hand", then "shortcut keys that take you straight to the sub-list") ----------
// LEFT HAND, the fleet: Q PICKS ALL THREE PILOTS now (card space-game-q-selects-all, Troy, 23 Nov 2026) and the FLEET list it used to open is switched off (CAMP_FLEET_LIST below; its rows and code are kept). The list was a row for each part of the wing and nothing else (card space-game-squad-tint; Troy, 22 Nov 2026: nothing listed twice): W ALL SQUADS (launch, mine and the rest of the wing's orders; the three pilots are Red, Green and Yellow: card space-game-three-pilots), and E R T are NOT lists any more (card space-game-bracket-select-orders; Troy, 23 Nov 2026, like X-Wing): the order keys, E attack, R guard, T recall, which act on the two selections,
// and CONVOY, which has no key (a row of the Q list: Enter or Right on it opens that part; there is no escort ship: card space-game-cut-escorts, Troy, 22 Nov 2026). The first row of that list is LAUNCH THE WING, so W, Enter launches everything (Q, Enter, Enter did, with the list on).
// RIGHT HAND, the ship, mirrored: P OPENS THE POWER LIST DIRECTLY now (card space-game-p-opens-power, Troy, 23 Nov 2026: "P should just open the power list") and the SHIP list it used to open is switched off (CAMP_SHIP_LIST below; its rows and code are kept). O still opens power too. The ship list was a row for each part: POWER (shields first: P, Enter adds a shield pip; card space-game-ship-shortcuts-o-power, Troy, 22 Nov 2026), I AUTOPILOT, U DOCK AND REPAIR, and the warp blink (that row lives in the POWER list while the ship list is off).
// A part's key opens its list directly, at any time (W, Enter: launch the wing); Enter or a click on the part's row in Q or P opens it too. Nothing is on the screen until a key is pressed, and only one list is open at a time.
// In an open list Up and Down move the highlight, Enter gives the order (the list closes when the order is taken; a power row leaves it open, to be given again), Left goes back to the list it is a part of, the list's own key closes it.
// Esc goes back ONE STEP, to where you came from (card space-game-order-target-pick): a target sub-list to its list, a list a row of Q or P opened back to Q or P, a list its own key opened (Q W P O U, and I with the ship list on) is closed; with nothing open, Esc pauses.
// The battle runs at its own speed while a list is open (card space-game-no-command-slowdown). NO KEY IS REUSED IN FLIGHT: each of Q W and P O U (and I with the ship list on) opens one list and means nothing else. The direct keys are only:
//   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   Enter a missile at the target (only while no list is open)   R queues a missile to build, 20 ore each (also a row of the S list)   Q W WHO takes the order (all three pilots, the default, then Wedge, Kara, Apollo)   [ ] the last or next ENEMY (the target), \ the nearest threat   O P the last or next FRIENDLY (a ship you protect; a click on an outpost or planet of the map holds that place; only ONE target is held, the friendly or the enemy)   S the view back to the cruiser   X clears the enemy and the friendly and puts WHO back on all three   E the pilots attack the selected enemy   R guard the selected friendly   T recall (a selected pilot takes the order alone, else all three do)
//   J K L a pip of power to the shields, the engines, the weapons (the POWER list has Balance as a row)   Tab the map   - = zoom, S resets it   H keys   M mute   Esc pause (when no list is open)   / types an order   (hold to speak is OFF: CAMP_VOICE)
// The arrows and Enter belong to whatever list is open: a list of these first, else the ship (fly, missile). (No pop-up takes them: card space-game-no-pilot-popups, Troy, 23 Nov 2026.)
// A row that can never be used in this mission (the blink without its tech, the dock where there is no outpost, the CONVOY part's row in Q with no convoy) is left out (its `when`). A row that cannot be used NOW stays, greyed, with the reason beside it.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key reads it from here (campKeyVar below: {fleetkey} {fighterskey} {keymissile} {rowlaunch} {vialaunch} ... in the texts), and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO.
//   list:   { id, side, key, code, title, tab, name, parent, rows }   side 'left' or 'right'; key and code (a KeyboardEvent.code) open and close the list ('' for a list with no key of its own); tab is its word on the bottom key line; name is what a hint calls it;
//           parent is the list it is a part of (Left goes back there); start: 'usable' opens the list on its first row that can be given now, not on the first (card space-game-squad-tint: All squads starts on Launch, then, with the wing out, on Attack)
//   row:    { id, order, arg, wing, fly, burn, blink, open, stay, when, label, help }   order is a campOrder name (src/campaign.js: the words the strip and the voice use; arg goes with it); wing: [group, verb] is an order to one part of the wing
//           (campWingOrder, src/campwing.js: a squad or 'fighters'; Attack goes at the target); fly: 'objective' or 'target' is the autopilot (src/campnav.js), burn: 1 makes it a fast burn; blink: 1 is the warp blink; open: '<list id>' opens that part's list;
//           pick: 'enemy' | 'escort' | 'field' | 'guard' | 'ward' makes it a row that needs a target: one candidate is taken at once, several open a sub-list of them, Esc goes back (src/camppick.js, card space-game-order-target-pick);
//           sel: 'hostile' | 'friend' makes it a row that acts on what is SELECTED already ([ ] S the hostile, O P the friend: src/camptarget.js campSelOrder, the rule of E R T): it names it ("Attack Raider 3"), gives the order at once, and is grey with a hint while none is picked (card space-game-w-uses-selection);
//           stay: 1 leaves the list open after the order (a pip of power: it is given again and again); when: 'convoy' | 'blink' | 'outpost' leaves the row out of a mission that can never use it (campPanelWhen, src/camppanel.js);
//           label is the row's words in the list, help its line for a hint. A row's id is its own in the whole table (a hint finds the row, and the list it is in, by it)
// the rows of the DOCK AND REPAIR list (U), from a table (card space-game-ship-shortcuts-o-power made it one; card space-game-repair-with-ore, Troy, 22 Nov 2026, swapped the Build rows for Repair rows: nothing builds ships any more).
// The list, its notes (src/camppanel.js reads `cost`), the H page and the hints follow this ONE place.
//   { id, label, help, when, cost, pick, does }   id: the row's own in the whole table;  label and help: its words in the list and for a hint;  when: when it shows ('' always, 'convoy' only where there are ships you protect, 'outpost' only
//                                           in a level with an outpost to dock at: campPanelWhen);  cost: what its state says, live ('hull': what mending the hull costs now; 'ward': what mending the nearest hurt ship you protect costs), '' for none;
//                                           pick: 'ward' makes it a row that picks a target (src/camppick.js); does: the order it gives, { order, arg } (campOrder, src/campaign.js)
const CAMP_YARD = [
  { id: 'dock', label: 'Dock at the outpost', help: 'Dock at a friendly outpost', when: 'outpost', cost: '', does: { order: 'dock' } }, // an outpost buys the ore, sells the refit and mends the hull at half price; docking opens the ready room
  { id: 'repairhull', label: 'Repair the hull', help: 'Mend the hull for ore, anywhere', when: '', cost: 'hull', does: { order: 'repair' } }, // anywhere in space: the ore is paid now and the hull mends over a few seconds (src/campmend.js)
  { id: 'repairward', label: 'Repair a ship we protect', help: 'Mend a ship you protect, near you (costs ore)', when: 'convoy', cost: 'ward', pick: 'ward', does: { order: 'mendship' } } // the transport, a hauler or a miner, when it is near the cruiser: one hurt ship is taken at once, several open a list
];
const campYardRows = () => CAMP_YARD.map(r => { const o = { id: r.id, order: r.does.order }; if (r.does.arg) o.arg = r.does.arg; if (r.when) o.when = r.when; o.label = r.label; o.help = r.help; if (r.cost) o.cost = r.cost; if (r.pick) o.pick = r.pick; return o; }); // the table as the list's rows

// THE SWITCH FOR Q'S POP-UP (card space-game-q-selects-all; Troy, 23 Nov 2026: "Q selects all three pilots as the friendly selection, no pop-up"). false: Q is the key that picks ALL THREE PILOTS (CAMP_KEYS.all; the next E R T order goes to all three) and the FLEET list is off: no key opens it, nothing goes back to it, and the key line, the H page and the hints do not name it (its rows stay below, ready).
// true: Q opens the FLEET list as before and Q picks nothing. campFleetListSet(on) is the one place that moves both (the key of the list, the key of All pilots, and the list's `off` mark that campPanelGo reads); the tests of the list's code call it with true.
const CAMP_FLEET_LIST = false;
// THE SWITCH FOR P'S SHIP LIST (card space-game-p-opens-power; Troy, 23 Nov 2026: "P should just open the power list"). false: the SHIP list is off and so, by key, are the POWER and AUTOPILOT lists (card space-game-keys2-select, Troy, 23 Nov 2026: O and P are the friendlies' keys now; other cards remove the two lists): no key opens any of them, nothing goes back to it (Left from a part does nothing, the foot does not offer it), and the key line, the H page and the hints do not name it. The warp blink row, which only the ship list had, is the last row of the POWER list meanwhile.
// true: P opens the SHIP list as before, O opens power, I the autopilot (these keys shadow the friendlies' O and P), and the blink row is the ship list's last row again. campShipListSet(on) is the one place that moves all of it (the keys, the `off` mark, the parts' `parent`, the blink row); the tests of the list's code call it with true.
const CAMP_SHIP_LIST = false;
// THE SWITCH FOR POWER MANAGEMENT (card space-game-power-removed; Troy, 23 Nov 2026: "he never uses it"). false: no power list (no key opens it), no J K L, no pips on the gauges, no "power to shields" or "balance" words, and every system runs at the balanced 2 / 2 / 2
// (CAMP.power.on is false: src/campaign.js). true: all of it as it was. campPowerSet(on) is the one place that moves all of it; the tests of the pips switch it on first and say so.
const CAMP_POWER = false;
// THE SWITCH FOR HOLD TO SPEAK (card space-game-keys-select; Troy, 23 Nov 2026, through ORCH: "disable voice orders for now"). false: no key is bound to it (the period is the friendlies' now), the floating key cap is not drawn, the key line, the H page and the hints do not name it. Typing an order (/) is untouched, and the code (src/listen.js) stays.
// true: the voice has a key again. campVoiceSet(on, key) is the one place that moves it; the card that brings the voice back says which key (a { k, codes } like the other entries of CAMP_KEYS): nothing picks one here.
const CAMP_VOICE = false;
const CAMP_PANELS = {
  show: 11,                                // how many rows of a list are on the screen at once: a longer list scrolls with the highlight (the fleet list has eleven: the squads came in, card space-game-fighter-squads)
  anim: { flash: 160, idle: 4000, out: 500 }, // ms: a row lights up (two pulses) when Enter gives it; a list marked `fades` (the cruiser's) closes after idle ms with no key and no click, and dims over its last out ms (card space-game-keys2-cruiser)
  panels: [
    { id: 'fleet', side: 'left', key: 'Q', code: 'KeyQ', title: 'FLEET ORDERS', tab: 'Fleet', name: 'the fleet list', rows: [
      { id: 'gsquads', open: 'squads', label: 'All squads', help: 'Orders for all three squads of fighters' },
      { id: 'gconvoy', open: 'convoy', when: 'convoy', label: 'Convoy', help: 'Orders for the ships you escort' }
    ] },
    { id: 'cruiser', side: 'left', corner: 'tl', key: 'S', code: 'KeyS', fades: 1, title: 'CRUISER ORDERS', tab: 'Cruiser', name: 'the cruiser list', rows: [ // card space-game-keys2-cruiser (Troy, 23 Nov 2026): S puts the view on the cruiser AND opens its list (it was Q's); the list fades after CAMP_PANELS.anim.idle ms untouched (fades: 1). Its rows in the game, top to bottom: Fly to the goal, Fly to the target, Mine ore, Dock and repair, Emergency shields, and the Warp blink with its tech: campCruiserWire moves the first two in from the autopilot list and the last two in from the power or ship list (the old lists are switched off, not removed). Card space-game-keys-orders: the Mine row comes from the all-squads list (campSquadsListSet)
      { id: 'srepair', order: 'repair', cost: 'hull', off: 1, label: 'Repair hull', help: 'Mend the hull for ore, anywhere' }, // card space-game-keys3-repair (Troy, 23 Nov 2026): the S list's own repair, the ore repair of the dock list's Repair the hull (60 ore for a whole hull, mended over 8 s: CAMP.mend), a row only in the game (campCruiserWire: `off` otherwise)
      { id: 'sreload', order: 'reload', cap: 'reload', cost: 'missiles', label: 'Reload missiles', help: 'Queue one missile to build, for ore (R)' }, // card space-game-missiles-cost-ore: the S list's row of the R key; `cap` is the CAMP_KEYS id whose key cap the row shows, `cost` what the rack would cost now (campPanelCost)
      { id: 'gdock', open: 'yard', label: 'Dock and repair', help: 'Dock, mend the hull and the ships you protect' } // the row that opens the dock list: switched off in the game (`off`, campCruiserWire), not deleted: Dock at the outpost is a row of the S list and Repair hull its own, the dock list has no way in
    ] },
    { id: 'convoy', parent: 'fleet', side: 'left', key: '', code: '', title: 'CONVOY ORDERS', tab: '', name: 'the convoy list', rows: [ // orders for the escorted ships (src/campconvoy.js). Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { id: 'ctuck', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy flies in the cruiser\'s shield' },
      { id: 'crun', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy runs ahead, with no cover' },
      { id: 'chold', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy stops and waits' },
      { id: 'ccarry', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy goes its own way again' }
    ] },
    { id: 'squads', parent: 'fleet', side: 'left', key: 'W', code: 'KeyW', title: 'ALL SQUADS', tab: 'All', name: 'the all-squads list', start: 'usable', rows: [ // all the fighters at once: the bay's Launch first (so Q, Enter, Enter launches everything), then the three squads' orders (cards space-game-fighter-squads, space-game-squad-tint)
      { id: 'launch', order: 'launch', label: 'Launch the wing', help: 'Launch the ships in the bay' },
      { id: 'attack', order: 'attack', sel: 'hostile', label: 'Attack the target', help: 'All squads attack the selected hostile' }, // the hostile [ ] S picked (card space-game-w-uses-selection: no second list to choose from; the row names it, and is grey, with a hint, while none is picked)
      { id: 'escort', order: 'escort', pick: 'escort', label: 'Escort the convoy', help: 'All squads go to the convoy' }, // the squads' own order (it was the escorts'): a convoy ship or a miner is picked (src/camppick.js); none in the level: the squads stay by the cruiser
      { id: 'fguard', wing: ['fighters', 'guard'], label: 'Guard the cruiser', help: 'All squads guard the cruiser' },
            { id: 'fguardt', wing: ['fighters', 'guard'], sel: 'friend', label: 'Guard the target', help: 'All squads guard the selected friend' }, // the ship you protect that A D picked (card space-game-w-uses-selection, Troy, 23 Nov 2026; it was a pick list of ships and outposts, card space-game-guard-the-target): the row names it, and is grey, with a hint, while none is picked
      { id: 'frecall', wing: ['fighters', 'recall'], label: 'Recall', help: 'All squads fly home to the bay' },
      { id: 'fmine', wing: ['fighters', 'mine'], pick: 'field', label: 'Mine ore', help: 'All squads mine ore' }
    ] },
    { id: 'ship', side: 'right', key: 'P', code: 'KeyP', title: 'SHIP ORDERS', tab: 'Ship', name: 'the ship list', rows: [
      { id: 'gpower', open: 'power', label: 'Power', help: 'Shields, engines, weapons' },
      { id: 'gnav', open: 'nav', label: 'Autopilot', help: 'Fly to the goal or the target' },
      { id: 'gyard', open: 'yard', label: 'Dock and repair', help: 'Dock, mend the hull and the ships you protect' },
      { id: 'blink', blink: 1, when: 'blink', label: 'Warp blink ahead', help: 'Warp blink hop (needs that tech)' }
    ] },
    { id: 'power', parent: 'ship', side: 'right', key: 'O', code: 'KeyO', title: 'POWER', tab: 'Power', name: 'the power list', rows: [ // the ship's power (docs/CAMPAIGN.md "Ship systems"), the dials' order; J K L ; do the first four directly, and each row shows that key
      { id: 'shields', order: 'power', arg: 'shields', stay: 1, pip: 1, label: 'Shields: one more pip', help: 'A pip of power to the shields' }, // pip: the index of the system in C.power.p (weapons, shields, engines): the row draws that system's pip bar, the same as its gauge's, and lights its gauge when it is the highlighted row (src/campanelsdraw.js; card space-game-power-presets)
      { id: 'engines', order: 'power', arg: 'engines', stay: 1, pip: 2, label: 'Engines: one more pip', help: 'A pip of power to the engines' },
      { id: 'weapons', order: 'power', arg: 'weapons', stay: 1, pip: 0, label: 'Weapons: one more pip', help: 'A pip of power to the weapons' },
      { id: 'balance', order: 'balance', stay: 1, label: 'Balance the power', help: 'Back to 2 / 2 / 2' },
      { id: 'emergency', order: 'emergency', label: 'Emergency shields', help: 'Fill the shields at once, for ore' } // card space-game-keys2-cruiser: it is a row of the cruiser list now (campCruiserWire); the power list keeps it only with the old lists on
    ] },
    { id: 'nav', parent: 'ship', side: 'right', key: 'I', code: 'KeyI', title: 'AUTOPILOT', tab: 'Autopilot', name: 'the autopilot list', rows: [
      { id: 'goal', fly: 'objective', label: 'Fly to the goal', help: 'Autopilot to the objective' },
      { id: 'target', fly: 'target', label: 'Fly to the target', help: 'Autopilot to the target' },
      { id: 'burn', fly: 'objective', burn: 1, label: 'Fast burn to the goal', help: 'A fast burn to the objective' }, // a burn tows the wing (card space-game-burn-with-wing-out)
      { id: 'burntarget', fly: 'target', burn: 1, label: 'Fast burn to the target', help: 'A fast burn to the target' }
    ] },
    { id: 'yard', parent: 'ship', side: 'right', key: 'U', code: 'KeyU', title: 'DOCK AND REPAIR', tab: 'Dock', name: 'the dock list', rows: campYardRows() } // the rows are the table CAMP_YARD above: what to put here is that table's business
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words beside the row's name; {need} is ore, {s} seconds
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', nosquad: 'no ships in the squad', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', what: 'cannot do that now', mending: 'already being mended', farward: 'too far from the cruiser', noward: 'no ship of ours is hurt', nobuild: 'nothing is built now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', noguard: 'nothing to guard', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', shieldfull: 'the shield is full', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s',
    notarget: 'pick a target first', nofoe: 'no hostiles in sight', nomissiles: 'no missiles left', missilewait: 'the launcher is reloading', range: 'out of missile range', nobig: 'nothing in reach', noblink: 'needs the warp tech', rackfull: 'the rack is full', reloading: 'already building' },
  // the same, a word or two, beside a row of the list
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'leaving', baydry: 'all out', nofighters: 'none out', nosquad: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', what: 'not now', mending: 'mending', farward: 'too far', noward: 'none hurt', nobuild: 'no building',
    nogoal: 'no goal', nofoe: 'none seen', nohostile: 'pick one', nofriend: 'pick one', there: 'there', noguard: 'none to guard', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', shieldfull: 'shield full', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s',
    notarget: 'no target', nomissiles: 'none left', missilewait: 'reloading', range: 'too far', nobig: 'none near', noblink: 'no tech', rackfull: 'rack full', reloading: 'building' }
};
// the direct keys of the Campaign (the scene reads the codes here; a hint names the cap): { k: the cap or caps a hint prints, codes: the KeyboardEvent.codes that do it }. One key, one meaning, everywhere in flight
const CAMP_KEYS = {
  fly: { k: 'Arrows', codes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },    // thrust, brake, turn (while a list or a call has the arrows, the ship coasts)
  fire: { k: 'Space', codes: ['Space'] },                                              // hold: the turrets fire at ships in reach
  missile: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] },                            // a homing missile at the target, only while no list and no call has Enter
  reload: { k: 'R', codes: ['KeyR'] },                                                 // queue one missile to build, for ore (cards space-game-missiles-cost-ore and space-game-missile-queue, Troy, 24 Nov 2026): 20 ore each, each press adds one; the ship builds one by itself only at 0. Also a row of the S list (id sreload). In flight plain R is free (the recall key is gone); Shift+R is the dev reload
  up: { k: 'Up', codes: ['ArrowUp'] }, down: { k: 'Down', codes: ['ArrowDown'] }, pick: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] }, // in an open list (Q, P, a pilot's call): move the highlight, give the order
  map: { k: 'Tab', codes: ['Tab'] },                                                   // open and close the map (src/campmap.js CAMPMAP.key says the same)
  hostiles: { k: ']', codes: ['BracketRight'] },                                       // the next HOSTILE (the target, C.tgt), one direction: nearest the cruiser first, round at the end; after CAMP.target.restart ms with no press the next press starts again from the nearest (card space-game-keys4-onekey, Troy, 24 Nov 2026: one key each). Only ONE target is held: a hostile replaces the friendly and the other way round
  friendlies: { k: '[', codes: ['BracketLeft'] },                                      // the next FRIENDLY, one direction: the SHIPS you protect (the transport, a miner, a hauler: no planet or outpost is in this cycle; a click on one on the map holds it) (C.fsel), nearest the cruiser first, round at the end. While the ship list is ON (the old world, CAMP_SHIP_LIST) P and O open its lists, as they did
  who: { k: 'Q', codes: ['KeyQ'] },                                                    // WHO takes the order (C.sel), the one key that steps it: all three pilots first (the default), then Wedge, Kara, Apollo, round (W no longer steps it). With the old fleet list ON (CAMP_FLEET_LIST) Q opens its list first
  all: { k: '', codes: [] },                                                          // Q picked all three pilots (card space-game-q-selects-all); Q's first stop is that now (the default). No key: campSelAll stays for the code and the tests
  near: { k: '\\', codes: ['Backslash'] }, clear: { k: 'X', codes: ['KeyX'] },         // the nearest threat (the tune kit's win moved off the backslash); clear the enemy and the friendly and put WHO back on all pilots (in the map: clear the trip)
  order: { k: 'W', codes: ['KeyW'] },                                                 // the one order key (cards space-game-keys2-orders, then space-game-keys4-onekey, Troy, 24 Nov 2026: it was E): WHO does the fitting thing for what is picked (src/camptarget.js campSelOrder 'engage'): an enemy picked, attack it; a friendly, guard it; nothing, form up on the cruiser. E, G and R are free: there is no recall (the pilots stay out; a badly hurt one returns by itself: src/camprepair.js). An order to a pilot in the bay launches it. With the old fleet list ON (CAMP_FLEET_LIST) W opens the all-squads list first
  attack: { k: 'W', codes: [] }, guard: { k: 'W', codes: [] },                       // only the letter the two target boxes' key lines read (src/camptdisp.js campTdispOrder reads CAMP_KEYS.order.k): no code, so they take no key
  shields: { k: '', codes: [], sys: 'shields' }, engines: { k: '', codes: [], sys: 'engines' }, weapons: { k: '', codes: [], sys: 'weapons' }, // OFF (card space-game-power-removed, Troy, 23 Nov 2026: "he never uses it"): J K L gave a pip to the shields, the engines, the weapons; no key now (CAMP.power.on is false). The ship's power (docs/CAMPAIGN.md "Ship systems"): a pip to a system, in the dials' order; the semicolon (balance, 2 / 2 / 2) is gone: Balance is a row of the POWER list and an order for the strip (card space-game-keys-select)
  zoomin: { k: '=', codes: ['Equal', 'NumpadAdd'] }, zoomout: { k: '-', codes: ['Minus', 'NumpadSubtract'] }, zoomreset: { k: 'S', codes: ['KeyS'] }, // src/campzoom.js reads these codes; S resets the zoom AND brings the view back to the cruiser (it was Backspace; card space-game-keys-select)
  strip: { k: '/', codes: ['Slash'] }, voice: { k: '', codes: [] },                    // type an order; hold to speak one is OFF (CAMP_VOICE: no key; campVoiceSet gives it one when it comes back). src/cmdstrip.js, src/shipcomputer.js, src/listen.js read these in the Campaign
  help: { k: 'H', codes: ['KeyH'] }, mute: { k: 'M', codes: ['KeyM'] }, pause: { k: 'Esc', codes: ['Escape'] },
  focus: { k: 'F', codes: ['KeyF'] },                                                // look at the selected ship: the camera glides to it and follows (src/campfocus.js); S comes back
  tune: { k: 'N', codes: ['KeyN'] }                                                  // the tuning panel (card space-game-tuning-panel, src/camptunedraw.js): in flight and in the ready room; numbers and switches, changed live. Nothing else uses N
};
let campFleetOn = CAMP_FLEET_LIST, campShipOn = CAMP_SHIP_LIST; // the two switches' state (the setters below move them), read by campListsWire
function campFleetListSet(on) { // the switch (CAMP_FLEET_LIST): who has Q. On: the old FLEET list (its parts: the all-squads list on W, the convoy), the all-squads list is on and U opens the dock list. Off (the game): Q opens the CRUISER list (Mine, Dock and repair), W and U open nothing (card space-game-keys-orders)
  campFleetOn = !!on; const L = CAMP_PANELS.panels, p = L.find(x => x.id === 'fleet'), cr = L.find(x => x.id === 'cruiser'); if (!p || !cr) return on;
  p.key = on ? 'Q' : ''; p.code = on ? 'KeyQ' : ''; p.off = !on;
  cr.key = on ? '' : 'S'; cr.code = on ? '' : 'KeyS'; cr.off = !!on; // the cruiser list is S's (card space-game-keys2-cruiser: it was Q's; Q opens nothing now and, with the fleet list on, the fleet list)
  campSquadsListSet(on); // the all-squads list is part of the old fleet world
  return on;
}
function campSquadsListSet(on) { // the switch for the W list (the all-squads list; card space-game-keys-orders: "the W list is switched off, not removed"). Off: W opens nothing and the Mine row, the one row the game still gives from a list, is the cruiser list's first row. On: W opens it and Mine is its last row again
  const L = CAMP_PANELS.panels, sq = L.find(x => x.id === 'squads'), cr = L.find(x => x.id === 'cruiser'); if (!sq || !cr) return on;
  sq.key = on ? 'W' : ''; sq.code = on ? 'KeyW' : ''; sq.off = !on;
  const from = on ? cr : sq, to = on ? sq : cr, i = from.rows.findIndex(r => r.id === 'fmine');
  if (i >= 0) { const r = from.rows.splice(i, 1)[0]; if (on) to.rows.push(r); else to.rows.unshift(r); }
  campListsWire();
  return on;
}
// the rows the cruiser list takes from the old lists (card space-game-keys2-cruiser; Troy, 23 Nov 2026): while BOTH old lists are off (the game) the autopilot list's Fly to the goal and Fly to the target, the power list's Emergency shields and the warp blink are the cruiser list's, and its Fly to the goal burns by itself on a long clear leg (`fast: 'auto'`, src/campnav.js campNavAuto).
// With either old list on every row goes back where it was (the autopilot list's first two, the power list's emergency row, the warp blink to the ship list with the ship list on, else the power list), so the suites that turn the old lists on see the old layout. A row is one object that moves, so a table that lacks a list (a later card removes the power list) just leaves the row where it is.
function campCruiserWire() {
  const L = CAMP_PANELS.panels, cr = L.find(x => x.id === 'cruiser'), nv = L.find(x => x.id === 'nav'), pw = L.find(x => x.id === 'power'), sh = L.find(x => x.id === 'ship'); if (!cr) return;
  const mine = !campFleetOn && !campShipOn, take = id => { for (const p of L) { const i = p.rows.findIndex(r => r.id === id); if (i >= 0) return p.rows.splice(i, 1)[0]; } return null; };
  const goal = take('goal'), target = take('target'), emer = take('emergency'), blink = take('blink'), dock = take('dock'), yard = L.find(x => x.id === 'yard'); // the dock row of the dock list is the cruiser list's too, in the game (card space-game-keys3-repair: Dock and repair is switched off, Repair hull and Dock at the outpost are the S list's rows)
  { const sr = cr.rows.find(r => r.id === 'srepair'), gd = cr.rows.find(r => r.id === 'gdock'); if (sr) { if (mine) delete sr.off; else sr.off = 1; } if (gd) { if (mine) gd.off = 1; else delete gd.off; } if (dock) { if (mine) cr.rows.splice(Math.max(0, cr.rows.findIndex(r => r.id === 'srepair')), 0, dock); else if (yard) yard.rows.unshift(dock); } }
  if (goal) { if (mine) goal.fast = 'auto'; else delete goal.fast; }
  const at = mine ? cr : nv; if (at) { if (target) at.rows.unshift(target); if (goal) at.rows.unshift(goal); } else { if (goal) cr.rows.unshift(goal); if (target) cr.rows.splice(goal ? 1 : 0, 0, target); }
  const eto = mine ? cr : pw || cr; if (emer) eto.rows.push(emer);
  const bto = mine ? cr : campShipOn ? sh || pw || cr : pw || cr; if (blink) bto.rows.push(blink);
}
function campListsWire() { // what follows from the switches: the dock list's key (U with an old list on, none in the game) and its parent (the ship list, the cruiser list, or none), and the H page's lines for the lists
  const L = CAMP_PANELS.panels, yd = L.find(x => x.id === 'yard'); if (!yd) return;
  yd.key = campFleetOn || campShipOn ? 'U' : ''; yd.code = yd.key ? 'KeyU' : '';
  yd.parent = campShipOn ? 'ship' : campFleetOn ? '' : 'cruiser';
  campCruiserWire();
  let C = null; try { C = CONTROLS; } catch (e) { C = null; } // the H page's tables: not made yet when this first runs
  if (C) { const l = C.find(x => x.id === 'panels'); if (l) l.rows.splice(0, l.rows.length, ...campPanelKeyRows()); }
}
const CAMP_VOICEROW = { t: 'Hold to speak (needs a chat key)', sub: 'THE STRIP', voice: 1 }; // the H page's row for the voice: on the page only while the voice has a key (campVoiceSet)
function campVoiceSet(on, key) { // the switch (CAMP_VOICE): hold to speak. Off: no key and no row. On: the key given ({ k, codes }, e.g. from the card that brings the voice back) and its row after the strip's
  const K = CAMP_KEYS.voice, has = !!(on && key && key.codes && key.codes.length);
  K.k = has ? key.k : ''; K.codes = has ? key.codes.slice() : [];
  let C = null; try { C = CONTROLS; } catch (e) { C = null; } // the H page's tables: not made yet when this first runs
  const g = C ? C.find(x => x.id === 'campaign') : null; if (g) {
    const i = g.rows.findIndex(x => x.voice); if (i >= 0) g.rows.splice(i, 1);
    if (has) g.rows.splice(g.rows.findIndex(x => x.k.join() === '/') + 1, 0, Object.assign({}, CAMP_VOICEROW, { k: [key.k] }));
  }
  return on;
}
function campShipListSet(on) { // the switch (CAMP_SHIP_LIST): who has P. The ship list's key and `off` mark, the power list's key (O with the ship list on, none otherwise), the autopilot list's key (I with it on, none otherwise), the parts' `parent` (Left goes back to a list that is on, to none otherwise) and the blink row move together
  const L = CAMP_PANELS.panels, ship = L.find(x => x.id === 'ship'), pw = L.find(x => x.id === 'power'); if (!ship || !pw) return on;
  ship.key = on ? 'P' : ''; ship.code = on ? 'KeyP' : ''; ship.off = !on;
  pw.key = on ? 'O' : ''; pw.code = on ? 'KeyO' : ''; // while the ship list is off the power list has no key (O and P are the friendlies' since card space-game-keys2-select; J K L give the pips and the strip says Balance); with it on the keys are the old ones: P the ship list, O power, I the autopilot
  const nv = L.find(x => x.id === 'nav'); if (nv) { nv.key = on ? 'I' : ''; nv.code = on ? 'KeyI' : ''; } // the autopilot's list: no key while the ship list is off (it was O), I with it on
  campShipOn = !!on; ['power', 'nav'].forEach(id => { const x = L.find(y => y.id === id); if (x) x.parent = on ? 'ship' : ''; }); // the dock list's parent and key: campListsWire
  campListsWire(); // the warp blink's row too (campCruiserWire): the ship list's last row with the ship list on, else the cruiser list's, else the power list's
  return on;
}
const CAMP_POWER_KEYS = { shields: { k: 'J', codes: ['KeyJ'] }, engines: { k: 'K', codes: ['KeyK'] }, weapons: { k: 'L', codes: ['KeyL'] } }; // the direct keys of the pips, kept for the switch
const CAMP_POWER_ROW = { k: ['J', 'K', 'L'], t: 'Power to shields, engines, weapons', sub: 'POWER' };   // and their row on the H page
let campPowerOn = CAMP_POWER;
function campPowerSet(on) { // the switch (CAMP_POWER): the power list and its key, J K L, their row on the H page, the gauges' bars and keys, and CAMP.power.on (the rules: pips moved by nothing while it is false) move together
  campPowerOn = !!on; if (typeof CAMP === 'object' && CAMP && CAMP.power) CAMP.power.on = campPowerOn;
  Object.keys(CAMP_POWER_KEYS).forEach(id => { const K = CAMP_KEYS[id]; if (K) { K.k = campPowerOn ? CAMP_POWER_KEYS[id].k : ''; K.codes = campPowerOn ? CAMP_POWER_KEYS[id].codes.slice() : []; } });
  if (typeof CAMP_GAUGE === 'object' && CAMP_GAUGE && typeof campPowerKeys === 'function') CAMP_GAUGE.keys = campPowerKeys(); // the gauges' direct keys follow
  const pw = CAMP_PANELS.panels.find(x => x.id === 'power'); if (pw) { pw.off = !campPowerOn; campShipListSet(campShipOn); if (!campPowerOn) { pw.key = ''; pw.code = ''; } } // the power list: its key is the ship switch's (campShipListSet), none while it is off
  let C = null; try { C = CONTROLS; } catch (e) { C = null; } // the H page's tables: not made yet when this first runs
  const g = C ? C.find(x => x.id === 'campaign') : null; if (g) {
    const i = g.rows.findIndex(x => x.sub === 'POWER' && x.k.join() === 'J,K,L'); if (i >= 0) g.rows.splice(i, 1);
    if (campPowerOn) { const t = g.rows.findIndex(x => x.k.join() === 'Tab'); g.rows.splice(t < 0 ? g.rows.length : t, 0, Object.assign({}, CAMP_POWER_ROW)); }
  }
  return on;
}
campFleetListSet(CAMP_FLEET_LIST);
campShipListSet(CAMP_SHIP_LIST);
campPowerSet(CAMP_POWER);
campVoiceSet(CAMP_VOICE);
const campKeyCodes = id => (CAMP_KEYS[id] || { codes: [] }).codes;
const campKeyIs = (id, code) => campKeyCodes(id).indexOf(code) >= 0;
// the rows the H page and Settings list for the lists: each list's key and what it is, then the keys every open list shares
function campPanelKeyRows() {
  const sub = 'THE ORDER LISTS', what = { fleet: 'Fleet orders, and the lists below', cruiser: 'Cruiser: fly, mine, repair, shields', convoy: 'Convoy: tuck in, run, hold, carry on', squads: 'All squads: launch, attack, recall', ship: 'Ship orders, and the lists below', nav: 'Autopilot: the two fast burns', power: 'Power: pips and balance', yard: 'Dock, repair the hull and our ships' };
  return CAMP_PANELS.panels.filter(p => p.key).map(p => ({ k: [p.key], t: what[p.id] || p.title, sub })).concat([
    { k: [CAMP_KEYS.up.k, CAMP_KEYS.down.k], t: 'In a list: move the highlight', sub }, { k: [CAMP_KEYS.pick.k], t: 'In a list: give the order', sub }, { k: ['Left', 'Right'], t: 'In a list: back, or into a part', sub }, { k: [CAMP_KEYS.pause.k], t: 'Back a step, or close the list', sub }]);
}

// the keys as the hints say them, ALL read from the tables above: a remap is one change here and every text follows.
//   campKeyVar(name)   a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know):
//                      {fleetkey} {fighterskey} {convoykey} {shipkey} {navkey} {powerkey} {yardkey} the key that opens a list (its id + "key");
//                      {keymap} {keyfly} {keymissile} {keyshields} ... a direct key of CAMP_KEYS ("key" + its id);
//                      {rowlaunch} {rowdock} ... the words of a row ("row" + its id);   {vialaunch} {viaattack} ... the way to the list that row is in ("via" + its id: its key, or 'Q, Convoy' when the list has none), for "Press {viaattack}, pick {rowattack}";
//                      {panels} what Q and P are;   '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(list)  the key cap of a list as the briefing's boxes draw it: ['Q'] for 'fleet'; [] when there is no such list or it has no key
//   campKeyVia(row)    the list a row is in, or null;   campKeyOpens(list)  the key that reaches a list: its own, else its parent's;   campKeyPath(list)  the way there in words: 'E', or 'Q, Convoy' for a list with no key
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) { const r = p.rows.find(x => x.id === id); if (r) return r; }
  return null;
}
const campKeyVia = id => CAMP_PANELS.panels.find(p => p.rows.some(x => x.id === id)) || null;
const campKeyList = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campKeyOpens = id => { let p = campKeyList(id); while (p && !p.key && p.parent) p = campKeyList(p.parent); return p ? p.key : ''; };
// the way to a list as a hint says it: the list's own key ('E'), or for a list with no key (Convoy) the key of the list it is a part of and the words of its row there ('Q, Convoy')
function campKeyPath(id) {
  const p = campKeyList(id); if (!p) return '';
  if (p.key) return p.key;
  const up = campKeyList(p.parent), row = up ? up.rows.find(r => r.open === id) : null;
  if (up && up.off) return ''; // its list is switched off (the fleet list: CAMP_FLEET_LIST): no way there by keys
  return up ? (campKeyPath(up.id) + (row ? ', ' + row.label : '')).replace(/^, /, '') : '';
}
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return CAMP_PANELS.panels.filter(p => !p.parent && p.key).map(p => p.key + ' opens ' + p.name).join(', ');
  let m = /^([a-z]+)key$/.exec(name);
  if (m) { const p = campKeyList(m[1]); return p ? campKeyOpens(p.id) : ''; }
  m = /^row([a-z]+)$/.exec(name);
  if (m) { const r = campKeyRow(m[1]); return r ? r.label : ''; }
  m = /^via([a-z]+)$/.exec(name);
  if (m) { const p = campKeyVia(m[1]); return p ? campKeyPath(p.id) : ''; }
  m = /^key([a-z]+)$/.exec(name);
  if (m) { const k = CAMP_KEYS[m[1]]; return k ? k.k : ''; }
  return '';
}
function campKeyCaps(listId) { const k = campKeyOpens(listId); return k ? [k] : []; }

const CONTROLS = [
  { id: 'station', title: 'STATION', scene: 'Station', rows: [
    { k: ['W', 'A', 'S', 'D'], t: 'Walk (the arrow keys work too)' },
    { k: ['1-6'], t: 'Station menu: go to a row and open it' },
    { k: ['W', 'S', 'Enter'], t: 'Station menu: choose and open' },
    { k: ['N'], t: 'Menu keys off to walk; N again for menu' },
    { k: ['E'], t: 'Use the terminal, repair bay or ship' },
    { k: ['1-6'], t: 'Buy a part, with the shop open' },
    { k: ['T'], t: 'Chat in the bar (needs a chat key)' },
    { k: ['J'], t: 'Journal: who you have met' },
    { k: ['G'], t: 'Galaxy map (look only; jump in flight)' },
    { k: ['Esc'], t: 'Close a terminal, or pause' },
    { k: ['I'], t: 'Ship\'s computer: ask it a question (needs a chat key)', help: 0 },
    { k: ['U'], t: 'Hold to talk to the ship\'s computer' }
  ] },
  { id: 'ship', title: 'SHIP BAY', scene: 'Ship', rows: [
    { k: ['Enter', 'Space'], t: 'Launch or board' },
    { k: ['Enter'], t: 'Press twice to buy a ship' },
    { k: ['F', 'Y', 'C'], t: 'Fleet, yard or controls tab' },
    { k: ['A', 'D'], t: 'Choose a ship (arrow keys too)' },
    { k: ['R'], t: 'Rename the ship' },
    { k: ['S'], t: 'Sell the ship (press twice)' },
    { k: ['Esc'], t: 'Back to the station' }
  ] },
  { id: 'flight', title: 'FLIGHT', scene: 'Space', rows: [
    { k: ['W'], t: 'Thrust', bay: 1 },
    { k: ['A', 'D'], t: 'Turn', bay: 1 },
    { k: ['S'], t: 'Brake', bay: 1 },
    { k: ['Shift'], t: 'Boost with thrust', bay: 1 },
    { k: ['Q', 'E'], t: 'Dash left or right', bay: 1 },
    { k: ['Space'], t: 'Fire (so does a click, assist off)', bay: 1, bt: 'Fire (or click)' },
    { k: ['L'], t: 'Dock or land (slow, close in)', bay: 1, bt: 'Dock or land' },
    { k: ['T'], t: 'Mission panel', bay: 1 },
    { k: ['N', 'X'], t: 'Places. Enter: fly there. X: clear' },
    { k: ['B'], t: 'Overview of ships: Enter flies to one' },
    { k: ['Click'], t: 'Assist on: fly there, or target it' },
    { k: ['C'], t: 'Cruise there (A D nudge, S cancels)' },
    { k: ['P'], t: 'Autopilot there (any key cancels)' },
    { k: ['R'], t: 'Autotarget on or off (needs the part)' },
    { k: ['V'], t: 'Gun lock: the guns fire at your target' },
    { k: ['Z'], t: 'Flight assist on or off' },
    { k: ['1-4'], t: 'Assist orders: go, keep, orbit, match' },
    { k: ['F'], t: 'Call the fuel ranger (tank near empty)' },
    { k: ['G'], t: 'Galaxy map: Enter jumps, Esc cancels' },
    { k: ['Tab'], t: 'Sector map (Z zooms, click to fly)' },
    { k: ['I'], t: 'Ship\'s computer: ask it a question (needs a chat key)', help: 0 },
    { k: ['Wheel'], t: 'Zoom out and in', help: 0 }
  ] },
  { id: 'surface', title: 'SURFACE', scene: 'Surface', rows: [
    { k: ['W', 'A', 'S', 'D'], t: 'Walk (the arrow keys work too)' },
    { k: ['Mouse'], t: 'Aim, and click to fire' },
    { k: ['E'], t: 'Talk to the colonist, board at the pad' },
    { k: ['C'], t: 'Show the controls panel again' }
  ] },
  { id: 'campaign', title: 'CAMPAIGN', scene: 'Campaign', rows: [ // the Campaign's H page (src/campkeys.js) is these rows under their sub headings, the debug keys after them; the LISTS group after it is made from CAMP_PANELS above, the codes of these from CAMP_KEYS. A line is the caps and at most 36 characters (Settings fits four columns). tests/controlshelp.mjs fails when a key the Campaign binds is not here
    { k: ['Arrows'], t: 'Thrust, brake, turn (the ship flies)', sub: 'FLY AND FIRE' },
    { k: ['Space'], t: 'Hold: turrets fire at ships in reach', sub: 'FLY AND FIRE' },
    { k: ['Enter'], t: 'Missile at the target (no list open)', sub: 'FLY AND FIRE' },
    { k: ['R'], t: 'Queue a missile to build (20 ore each)', sub: 'FLY AND FIRE' }, // card space-game-missiles-cost-ore: also the S list's row Reload missiles; each press queues one (card space-game-missile-queue); the ship builds one by itself only at 0
    { k: ['-', '='], t: 'Zoom; S resets; drag pans', sub: 'FLY AND FIRE' }, // - and the wheel go out to the whole system on the map; = and the keypad's + and - too; S is the reset and brings the view back to the cruiser (src/campzoom.js: all three from CAMP_KEYS; it was Backspace) // drag: the left button held and moved pans the view and the Tab map (src/campdrag.js): it stays where it is put; the wheel zooms about the pointer; a RECENTRE mark, Backspace (this reset) or the arrows held bring it back (a row of its own did not fit the H page)
    { k: ['Q'], t: 'Who: all pilots, or one pilot', sub: 'THE TARGET' }, // WHO takes the order (C.sel): all three pilots first (the default), then Wedge, Kara, Apollo; no ship you protect is in it. Q alone steps it, one way (card space-game-keys4-onekey)
    { k: ['['], t: 'Next friendly (one target)', sub: 'THE TARGET' }, // the friendly pick (C.fsel): a SHIP you protect ([ steps through the ships only; a click on an outpost or a planet on the Tab map holds that place as the friendly: card space-game-keys3-select); W sends the pilots to guard it. Only ONE target is held: it replaces the enemy (card space-game-keys2-select)
    { k: [']'], t: 'Next enemy (nearest first)', sub: 'THE TARGET' }, // the enemy pick (C.tgt): Fly to the target flies to it, Enter fires at it, W sends the pilots at it; it replaces the friendly. A pause of CAMP.target.restart ms starts again from the nearest
    { k: ['\\'], t: 'The nearest threat', sub: 'THE TARGET' },
    { k: ['W'], t: 'Order: attack, guard or form up', sub: 'THE TARGET' }, // W does the fitting thing for the pick: who takes the order (Q) does it, and a pilot in the bay is launched by it (card space-game-keys2-orders; it was E)
    { k: ['X', 'F'], t: 'X clears the picks, F looks at it', sub: 'THE TARGET' }, // X: no enemy, no friendly, who is all pilots again. F: the camera glides to the target, a ship a list is on, or a squad's leader, and follows it (src/campfocus.js); S (the zoom row) brings it back
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Up', 'Down'], t: 'Map: last or next mark (Left, Right)', sub: 'THE MAP' },
    { k: ['Enter'], t: 'Map: fly there (Shift+Enter: fast)', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['X'], t: 'Map: X clears the trip', sub: 'THE MAP' },
    { k: ['/'], t: 'Type an order (needs a chat key)', sub: 'THE STRIP' }, // the same words the lists say: the strip answers through the chat key (Settings > Keys); the lists, the map and the calls need none. Hold to speak is off (CAMP_VOICE): its row comes back with campVoiceSet
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Back out of a list or map, else pause', sub: 'ANYWHERE' },
    { k: ['M'], t: 'Mute sound', sub: 'ANYWHERE' },
    { k: ['N'], t: 'Tuning panel: numbers and switches', sub: 'ANYWHERE' }, // src/camptunedraw.js
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ON A CARD' },
    { k: ['R'], t: 'Pause card: restart the mission', sub: 'ON A CARD' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ON A CARD' },
    { k: ['1-3'], t: 'Tech card: pick a technology', sub: 'ON A CARD' }, // after a level, not in flight
    { k: ['4'], t: 'Refit card: buy a fighter', sub: 'ON A CARD' }
  ] },
  { id: 'panels', title: 'LISTS', scene: 'Campaign', rows: campPanelKeyRows() }, // the Campaign's order lists, made from CAMP_PANELS above (the H page puts them first)
  { id: 'readyroom', title: 'READY ROOM', scene: 'CampHub', rows: [ // the ready room between missions (src/camphub.js keys, src/camphubscene.js); the Campaign's H page lists them last, and H opens it in the room
    { k: ['1-4'], t: 'Pick a row: Missions to Launch', sub: 'THE READY ROOM' },
    { k: ['W', 'S'], t: 'Move the row, or move in an open one', sub: 'THE READY ROOM' },
    { k: ['Enter', 'D'], t: 'Open the row; in it, do the thing', sub: 'THE READY ROOM' },
    { k: ['A'], t: 'Close an open row (Left, Esc too)', sub: 'THE READY ROOM' },
    { k: ['L'], t: 'Launch the mission, or the replay', sub: 'THE READY ROOM' },
    { k: ['R'], t: 'Missions: pick it, open briefing', sub: 'THE READY ROOM' },
    { k: ['X'], t: 'Missions: back to the next one', sub: 'THE READY ROOM' },
    { k: ['Click'], t: 'Missions: click picks, again opens', sub: 'THE READY ROOM' }, // the mouse on the Missions list (card space-game-click-mission): one click moves the cursor, a second on the chosen mission is Enter
      { k: ['F'], t: 'Refit: buy a fighter', sub: 'THE READY ROOM' },
    { k: ['Backspace'], t: 'Refit: give the last one back', sub: 'THE READY ROOM' },
    { k: ['H'], t: 'This page of keys', sub: 'THE READY ROOM' },
    { k: ['N'], t: 'Tuning panel: numbers and switches', sub: 'THE READY ROOM' },
    { k: ['Esc'], t: 'Close a row, else the title (T too)', sub: 'THE READY ROOM' },
    { k: ['Enter', 'Right'], t: 'Briefing: next screen, then launch', sub: 'THE BRIEFING' }, // the big briefing (src/campbriefdraw.js), opened from the board: three screens (where and why, what to do, how); Enter on the last one launches
    { k: ['Left'], t: 'Briefing: back a screen', sub: 'THE BRIEFING' },
    { k: ['L'], t: 'Briefing: launch the mission now', sub: 'THE BRIEFING' },
    { k: ['Esc'], t: 'Briefing: back to the missions', sub: 'THE BRIEFING' },
    { k: ['-', '='], t: 'Briefing map: zoom; S resets', sub: 'THE BRIEFING' },
    { k: ['M'], t: 'Briefing map: area, system, route', sub: 'THE BRIEFING' }
  ] },
  { id: 'title', title: 'TITLE', scene: null, rows: [
    { k: ['Enter'], t: 'Start Long Haul (or the choice the arrows picked)' },
    { k: ['Up', 'Down'], t: 'Pick Long Haul or the Campaign (Left, Right too)' },
    { k: ['K'], t: 'Open the Campaign' },
    { k: ['S'], t: 'Open Settings' },
    { k: ['V'], t: 'Ship voice key (Settings, Keys)' },
    { k: ['C'], t: 'NPC chat key (Settings, Keys)' },
    { k: ['O'], t: 'Mods screen (packs you have added)' },
    { k: ['P'], t: 'Content problems or a mod (Settings, Content)' }
  ] },
  { id: 'any', title: 'ANYWHERE', scene: null, rows: [
    { k: ['Tab'], t: 'Sector map', bay: 1 },
    { k: ['H'], t: 'Help page for this scene', bay: 1, bt: 'Help' },
    { k: ['Esc'], t: 'Pause: saves, volume, Settings', bay: 1, bt: 'Pause' },
    { k: ['M'], t: 'Mute sound', bay: 1 },
    { k: ['U'], t: 'Hold, in space or a station, to talk to the ship\'s computer', help: 0 }
  ] }
];
campFleetListSet(CAMP_FLEET_LIST); // the switch's state again, now that the H page's tables are made too (the Q row)
campShipListSet(CAMP_SHIP_LIST); // and the ship list's (the LISTS group's rows)
campPowerSet(CAMP_POWER); // and the power's (the J K L row)
campVoiceSet(CAMP_VOICE); // and the voice's (no row while it is off)

const controlsGroup = id => CONTROLS.find(g => g.id === id) || null;
const controlsLine = r => r.k.join(' ') + '   ' + r.t.charAt(0).toLowerCase() + r.t.slice(1); // 'W A S D   walk (the arrow keys work too)'
// the H page's lines for a scene: HELP.Space and the rest (src/meta.js)
function controlsHelp(scene) {
  const g = CONTROLS.find(x => x.scene === scene);
  return g ? g.rows.filter(r => r.help !== 0).map(controlsLine) : [];
}
// the Ship bay's key panel: [[keys], what] for every row marked bay, in table order (src/shipmode.js)
function controlsBay() {
  const out = [];
  CONTROLS.forEach(g => g.rows.forEach(r => { if (r.bay) out.push([r.k, r.bt || r.t]); }));
  return out;
}

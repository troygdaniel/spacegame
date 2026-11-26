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
// ---------- the Campaign's lists (cards one-list-keys, list-shortcuts, keys2-cruiser, s-list-numbers and delete-off-lists; Troy, 22 to 24 Nov 2026) ----------
// ONE LIST HAS A KEY: S opens the CRUISER list, and its digits 1 to 9 do its rows: fly to the goal and to the target, mine ore, dock, repair the hull, reload, emergency shields, and the warp blink with its tech. The fleet, ship, power, autopilot and all-squads lists, with their keys (Q W P O I U) and their switches (CAMP_FLEET_LIST, CAMP_SHIP_LIST, campSquadsListSet), were switched off in the game and are DELETED for good (card space-game-delete-off-lists, Troy, 24 Nov 2026: "delete"); the git tag lists-before-delete is main as they stood.
// The convoy list (tuck in, run for it, hold here, carry on) and the dock and repair list stay as plain data that no key opens: the strip and the voice give the same orders (src/campconvoy.js, src/campmend.js).
// In an open list that is not numbered Up and Down move the highlight, Enter gives the order (the list closes when the order is taken), Left goes back to the list it is a part of. The Q list (`numbers: 1`) is the exception: its digits do its rows, and Up, Down, Left, Right and Enter are the ship's (see campKeyDigit); it fades when untouched.
// Esc goes back ONE STEP, to where you came from (card space-game-order-target-pick): a target sub-list to its list, a list its own key opened is closed; with nothing open, Esc pauses.
// The battle runs at its own speed while a list is open (card space-game-no-command-slowdown). NO KEY IS REUSED IN FLIGHT. The direct keys are only:
//   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   Enter a missile at the target (an open Q list does not take it)   R queues a missile to build, 20 ore each (also a row of the Q list)   Q WHO takes the order (all three pilots, the default, then Wedge, Kara, Apollo)   ] the next ENEMY (the target, nearest first), \ the nearest threat   [ the next FRIENDLY (a ship you protect; a click on an outpost or planet of the map holds that place; only ONE target is held, the friendly or the enemy)   W the order that fits the pick (attack the enemy, guard the friendly, with none form up on the cruiser)   X clears the enemy and the friendly and puts WHO back on all three   S the view back to the cruiser, and its list   J K L a pip of power (only with the power switch on: CAMP_POWER)   Tab the map   - = zoom, S resets it   H keys   M mute   Esc pause (when no list is open)   / types an order   (hold to speak is OFF: CAMP_VOICE)
// The arrows and Enter belong to whatever list that takes them is open: a list of these first, else the ship (fly, missile). (No pop-up takes them: card space-game-no-pilot-popups, Troy, 23 Nov 2026.)
// A row that can never be used in this mission (the blink without its tech, the dock where there is no outpost, the repair of a ship you protect with no convoy) is left out (its `when`). A row that cannot be used NOW stays, greyed, with the reason beside it.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key reads it from here (campKeyVar below: {cruiserkey} {keymissile} {rowfmine} {viafmine} {keyhostiles} ... in the texts), and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO.
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

// THE SWITCH FOR POWER MANAGEMENT (card space-game-power-removed; Troy, 23 Nov 2026: "he never uses it"; the power LIST itself is deleted: card space-game-delete-off-lists). false: no J K L, no pips on the gauges, no "power to shields" or "balance" words, and every system runs at the balanced 2 / 2 / 2
// (CAMP.power.on is false: src/campaign.js). true: all of it as it was. campPowerSet(on) is the one place that moves all of it; the tests of the pips switch it on first and say so.
const CAMP_POWER = false;
// THE SWITCH FOR THE WARP BLINK (card space-game-keys7-trim; Troy, 24 Nov 2026: removed everywhere the player can see it). false: no Q list row, and the tech is no longer offered after level 1 (campTechChoices). The code (campBlinkWhy, the hop in campStep, CAMP.tech.blink) is switched off, not deleted; true brings the row and the tech back.
const CAMP_BLINK = { on: false }; // campBlinkSet(on) moves it, the row's `off` too; the tests of the blink switch it on first and say so, as the tests of the pips do with campPowerSet
// THE SWITCH FOR HOLD TO SPEAK (card space-game-keys-select; Troy, 23 Nov 2026, through ORCH: "disable voice orders for now"). false: no key is bound to it (the period is the friendlies' now), the floating key cap is not drawn, the key line, the H page and the hints do not name it. Typing an order (/) is untouched, and the code (src/listen.js) stays.
// true: the voice has a key again. campVoiceSet(on, key) is the one place that moves it; the card that brings the voice back says which key (a { k, codes } like the other entries of CAMP_KEYS): nothing picks one here.
const CAMP_VOICE = false;
const CAMP_PANELS = {
  show: 11,                                // how many rows of a list are on the screen at once: a longer list scrolls with the highlight (the fleet list has eleven: the squads came in, card space-game-fighter-squads)
  anim: { flash: 160, idle: 4000, out: 500 }, // ms: a row lights up (two pulses) when Enter gives it; a list marked `fades` (the cruiser's) closes after idle ms with no key and no click, and dims over its last out ms (card space-game-keys2-cruiser)
  panels: [
    { id: 'cruiser', side: 'left', corner: 'tl', numbers: 1, key: 'Q', code: 'KeyQ', fades: 1, title: 'CRUISER ORDERS', tab: 'Cruiser', name: 'the cruiser list', rows: [ // cards space-game-keys2-cruiser (Troy, 23 Nov 2026: S puts the view on the cruiser AND opens its list; it fades after CAMP_PANELS.anim.idle ms untouched) and space-game-s-list-numbers (its digits do its rows, top to bottom). The first row burns by itself on a long clear leg (`fast: 'auto'`, src/campnav.js campNavAuto); Mine ore is the old all-squads list's row, Dock the dock list's, Emergency shields the power list's and the warp blink the ship list's (the five lists are deleted: card space-game-delete-off-lists)
      { id: 'goal', fly: 'objective', fast: 'auto', label: 'Fly to the goal', help: 'Autopilot to the objective' },
      { id: 'target', fly: 'target', label: 'Fly to the target', help: 'Autopilot to the target' },
      { id: 'fmine', wing: ['fighters', 'mine'], label: 'Mine ore', help: 'The pilots mine the nearest ore' }, // card space-game-keys6-enter (Troy, 24 Nov 2026): Q then 3 finds the nearest ore by itself, no field to pick (the pick: 'field' sub-list is still in the engine, camppick.js, for a row that asks for it)
      campYardRows().find(r => r.id === 'dock'), // Dock at the outpost (a row of CAMP_YARD above): an outpost buys the ore, sells the refit and mends the hull at half price; docking opens the ready room
      { id: 'srepair', order: 'repair', cost: 'hull', label: 'Repair hull', help: 'Mend the hull for ore, anywhere' }, // card space-game-keys3-repair (Troy, 23 Nov 2026): the Q list's own repair, the ore repair of the dock list's Repair the hull (60 ore for a whole hull, mended over 8 s: CAMP.mend)
      { id: 'sreload', off: 1, order: 'reload', cap: 'reload', cost: 'missiles', label: 'Reload missiles', help: 'Queue one missile to build, for ore (R)' }, // card space-game-missiles-cost-ore: the Q list's row of the R key; `cap` is the CAMP_KEYS id whose key cap the row shows, `cost` what the rack would cost now (campPanelCost)
      { id: 'gdock', open: 'yard', off: 1, label: 'Dock and repair', help: 'Dock, mend the hull and the ships you protect' }, // the row that opens the dock list: switched off (`off`), not deleted: Dock at the outpost is a row of the Q list and Repair hull its own, the dock list has no way in
      { id: 'emergency', order: 'emergency', label: 'Emergency shields', help: 'Fill the shields at once, for ore' },
      { id: 'blink', blink: 1, off: 1, when: 'blink', label: 'Warp blink ahead', help: 'Warp blink hop (needs that tech)' }, // switched off with CAMP_BLINK (card space-game-keys7-trim)
      { id: 'formup', formup: 1, label: 'Form up on me', help: 'All pilots form up on the cruiser at once' } // the last row, 7 with an outpost (card space-game-keys7-trim, Troy, 24 Nov 2026: it was W then 5): all pilots, whoever is picked; the held target stays held; Enter with nothing held does the same
    ] },
    { id: 'fleet', side: 'left', corner: 'tl', head: 1, numbers: 1, key: 'W', code: 'KeyW', step: 1, fades: 1, title: 'FLEET', tab: 'Fleet', name: 'the fleet pick', rows: [ // card space-game-keys5-qwe (Troy, 24 Nov 2026): W opens the pick, a digit says WHO takes the order (C.sel), and 5 is Form up on me; W alone only opens it. It fades like the cruiser list and opens in the same place, with a heading of its own (`head`). A row with `who` is no order: it sets WHO (src/camptarget.js campSelPick); its label is the pilot's call sign and name (CAMP.pilots: Wedge) and it is marked while it is the pick
      { id: 'whowedge', who: 'pilot:red', label: 'Wedge', help: 'Wedge takes the orders' },
      { id: 'whokara', who: 'pilot:green', label: 'Kara', help: 'Kara takes the orders' },
      { id: 'whoapollo', who: 'pilot:yellow', label: 'Apollo', help: 'Apollo takes the orders' },
      { id: 'whoall', who: 'all', off: 1, label: 'All pilots', help: 'All three pilots take the orders' } // OFF (card space-game-keys8-e-digit item 5, Troy, 25 Nov 2026): the first tap of W picks ALL pilots, so the pick has three digits, 1 Wedge, 2 Kara, 3 Apollo; the row stays in the table (the stop 'all' is still the cycle's and the default)
    ] },
    { id: 'friends', side: 'left', corner: 'bl', head: 1, numbers: 1, key: 'E', code: 'KeyE', step: 'fri', fades: 1, title: 'FRIENDS', tab: 'Friends', name: 'the friends pick', rows: [ // card space-game-keys8-e-digit (Troy, 25 Nov 2026: "a letter says what kind of thing, a digit says which"): E works like W. A tap steps through the ships you protect and keeps the pick open, E then a digit jumps straight to that ship and closes it. A ship's number is fixed for the whole mission (src/camptarget.js campFriNumbered); a row does nothing until its ship has been seen and goes dark when the ship is lost (the nine rows are always there: a digit is the row's place in the list, so a number that has not come yet must still hold its place; the corner draws only the numbers seen). The corner FRIENDLIES draws these rows (list: 'friends'); Enter then guards the one picked
      { id: 'fri1', fri: 1, label: 'Friend 1', help: 'Pick the ship you protect that has number 1' },
      { id: 'fri2', fri: 2, label: 'Friend 2', help: 'Pick the ship you protect that has number 2' },
      { id: 'fri3', fri: 3, label: 'Friend 3', help: 'Pick the ship you protect that has number 3' },
      { id: 'fri4', fri: 4, label: 'Friend 4', help: 'Pick the ship you protect that has number 4' },
      { id: 'fri5', fri: 5, label: 'Friend 5', help: 'Pick the ship you protect that has number 5' },
      { id: 'fri6', fri: 6, label: 'Friend 6', help: 'Pick the ship you protect that has number 6' },
      { id: 'fri7', fri: 7, label: 'Friend 7', help: 'Pick the ship you protect that has number 7' },
      { id: 'fri8', fri: 8, label: 'Friend 8', help: 'Pick the ship you protect that has number 8' },
      { id: 'fri9', fri: 9, label: 'Friend 9', help: 'Pick the ship you protect that has number 9' }
    ] },
    { id: 'convoy', side: 'left', key: '', code: '', title: 'CONVOY ORDERS', tab: '', name: 'the convoy list', rows: [ // orders for the escorted ships (src/campconvoy.js): no key opens this list now (it was a row of the deleted fleet list); the strip and the voice give them: "tuck in", "run for it", "carry on", "haulers hold"
      { id: 'ctuck', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy flies in the cruiser\'s shield' },
      { id: 'crun', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy runs ahead, with no cover' },
      { id: 'chold', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy stops and waits' },
      { id: 'ccarry', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy goes its own way again' }
    ] },
    { id: 'yard', parent: 'cruiser', side: 'right', key: '', code: '', title: 'DOCK AND REPAIR', tab: 'Dock', name: 'the dock list', rows: campYardRows().filter(r => r.id !== 'dock') } // the rows are the table CAMP_YARD above (its dock row is the cruiser list's): no key opens this list now (it was U, a part of the deleted ship list)
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words beside the row's name; {need} is ore, {s} seconds
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', nosquad: 'no ships in the squad', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', what: 'cannot do that now', mending: 'already being mended', farward: 'too far from the cruiser', noward: 'no ship of ours is hurt', nobuild: 'nothing is built now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', shieldfull: 'the shield is full', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s',
    notarget: 'pick a target first', nofoe: 'no hostiles in sight', nomissiles: 'no missiles left', missilewait: 'the launcher is reloading', range: 'out of missile range', nobig: 'nothing in reach', noblink: 'needs the warp tech', nopilot: 'that pilot is not out', nofriend: 'that ship is gone', rackfull: 'the rack is full', reloading: 'already building' },
  // the same, a word or two, beside a row of the list
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'leaving', baydry: 'all out', nofighters: 'none out', nosquad: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', what: 'not now', mending: 'mending', farward: 'too far', noward: 'none hurt', nobuild: 'no building',
    nogoal: 'no goal', nofoe: 'none seen', there: 'there', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', shieldfull: 'shield full', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s',
    notarget: 'no target', nomissiles: 'none left', missilewait: 'reloading', range: 'too far', nobig: 'none near', noblink: 'no tech', nopilot: 'not out', nofriend: 'gone', rackfull: 'rack full', reloading: 'building' }
};
// the direct keys of the Campaign (the scene reads the codes here; a hint names the cap): { k: the cap or caps a hint prints, codes: the KeyboardEvent.codes that do it }. One key, one meaning, everywhere in flight
const CAMP_KEYS = {
  fly: { k: 'Arrows', codes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },    // thrust, brake, turn (while a list or a call has the arrows, the ship coasts)
  fire: { k: 'Space', codes: ['Space'] },                                              // hold: the turrets fire at ships in reach
  missile: { k: 'M', codes: ['KeyM'] },                                               // a homing missile at the target (card space-game-keys6-enter, Troy, 24 Nov 2026: it was Enter; M no longer mutes in a battle, the switch is in Settings, reached from the pause card)
  reload: { k: 'R', codes: ['KeyR'] },                                                 // queue one missile to build, for ore (cards space-game-missiles-cost-ore and space-game-missile-queue, Troy, 24 Nov 2026): 20 ore each, each press adds one; the ship builds one by itself only at 0. Also a row of the Q list (id sreload). In flight plain R is free (the recall key is gone); Shift+R is the dev reload
  up: { k: 'Up', codes: ['ArrowUp'] }, down: { k: 'Down', codes: ['ArrowDown'] }, pick: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] }, // in an open list that takes them, or a pilot's call: move the highlight, give the order
  map: { k: 'Tab', codes: ['Tab'] },                                                   // open and close the map (src/campmap.js CAMPMAP.key says the same)
  hostiles: { k: ']', codes: ['BracketRight'] },                                       // the next HOSTILE (the target, C.tgt), one direction: nearest the cruiser first, round at the end; after CAMP.target.restart ms with no press the next press starts again from the nearest (card space-game-keys4-onekey, Troy, 24 Nov 2026: one key each). Only ONE target is held: a hostile replaces the friendly and the other way round
  friendlies: { k: 'E', codes: ['KeyE'] },                                        // the FRIENDS pick (card space-game-keys8-e-digit: E steps the ships you protect in their mission-long numbers and keeps the pick open, E then 1 to 9 jumps there and closes it; the list 'friends'); it was: the next FRIENDLY, one direction: the SHIPS you protect (the transport, a miner, a hauler: no planet or outpost is in this cycle; a click on one on the map holds it) (C.fsel), nearest the cruiser first, round at the end
  who: { k: 'W', codes: ['KeyW'] },                                                    // the FLEET pick (card space-game-keys5-qwe, Troy, 24 Nov 2026): W opens the pick (the list 'fleet', numbered), then a digit says WHO takes the order (C.sel): 1 Wedge, 2 Kara, 3 Apollo, 4 all pilots (the default). W alone only opens it: no cycling
  near: { k: '\\', codes: ['Backslash'] },                                           // the nearest threat (the tune kit's win moved off the backslash). X (clear the picks) is gone (card space-game-keys5-qwe); the two cycles, ] and E, go round with no empty stop
  order: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] }, // (card space-game-keys6-enter: Enter is the one order, E is the friendlies' key; Enter gives it only when no card, briefing or list that takes Enter is open, and not in the CAMP.card.lock ms after a card closes)                                                 // the one order key (cards space-game-keys2-orders, space-game-keys4-onekey and space-game-keys5-qwe, Troy, 24 Nov 2026: E, then W, now E again: W is the fleet pick): WHO does the fitting thing for what is picked (src/camptarget.js campSelOrder 'engage'): an enemy picked, attack it; a friendly, guard it; nothing, form up on the cruiser. A right click on a ship does what E does (src/campclick.js). G and R are no order: there is no recall (the pilots stay out; a badly hurt one returns by itself: src/camprepair.js). An order to a pilot in the bay launches it.
  attack: { k: 'Enter', codes: [] }, guard: { k: 'Enter', codes: [] },                       // only the letter the two target boxes' key lines read (src/camptdisp.js campTdispOrder reads CAMP_KEYS.order.k): no code, so they take no key
  shields: { k: '', codes: [], sys: 'shields' }, engines: { k: '', codes: [], sys: 'engines' }, weapons: { k: '', codes: [], sys: 'weapons' }, // OFF (card space-game-power-removed, Troy, 23 Nov 2026: "he never uses it"): J K L gave a pip to the shields, the engines, the weapons; no key now (CAMP.power.on is false). The ship's power (docs/CAMPAIGN.md "Ship systems"): a pip to a system, in the dials' order; the semicolon (balance, 2 / 2 / 2) is gone: Balance is a row of the POWER list and an order for the strip (card space-game-keys-select)
  zoomin: { k: '=', codes: ['Equal', 'NumpadAdd'] }, zoomout: { k: '-', codes: ['Minus', 'NumpadSubtract'] }, zoomreset: { k: 'Q', codes: ['KeyQ'] }, // src/campzoom.js reads these codes; Q resets the zoom AND brings the view back to the cruiser (it was S until card space-game-keys5-qwe) (it was Backspace; card space-game-keys-select)
  strip: { k: '/', codes: ['Slash'] }, voice: { k: '', codes: [] },                    // type an order; hold to speak one is OFF (CAMP_VOICE: no key; campVoiceSet gives it one when it comes back). src/cmdstrip.js, src/shipcomputer.js, src/listen.js read these in the Campaign
  help: { k: 'H', codes: ['KeyH'] }, settings: { k: 'S', codes: ['KeyS'] }, restart: { k: 'Backspace', codes: ['Backspace'] }, pause: { k: 'Esc', codes: ['Escape'] }, // restart: the pause card's restart of the mission, a key that means nothing in flight (card space-game-pause-restart-key; it was R, which queues a missile in play, so a stray R after Esc lost the run).  // S: Settings, from the pause card only (card space-game-keys6-enter: mute lives there, M fires a missile in a battle)
  focus: { k: 'F', codes: ['KeyF'] },                                                // look at the selected ship: the camera glides to it and follows (src/campfocus.js); S comes back
  tune: { k: 'N', codes: ['KeyN'] },                                                 // the tuning panel (card space-game-tuning-panel, src/camptunedraw.js): in flight and in the ready room; numbers and switches, changed live. Nothing else uses N
  ready: { k: 'L', codes: ['KeyL'], room: 1 }                                               // the READY ROOM's L (card space-game-ready-l-briefing-first, Troy, 25 Nov 2026): in the hall the first L opens the briefing of the mission Launch flies, the next L (in the briefing) launches it; in a dock L undocks, as ever. Src/camphub.js, src/campbrief.js and src/campbriefwalk.js read the code here, every hint of it the cap ({keyready})
};
// THE KEYS OF THE MENUS AND THE CARDS (card space-game-screens-f-foundation, landing F of the new screens; Troy, 25 Nov 2026: "every key chip is read from the key table"). The title, the ready room, the briefing, the cards and the keys
// page take these keys today with the codes written in the scene's own code (a chip drawn from here must say what the code does): this table says them once, by ROLE, so the new screens' chips (src/screens.js scrKey, scrChip) read them
// from one place. NOTHING reads it to decide what a key does yet: the scenes keep their codes, and tests/screens.mjs holds each entry to the code that handles it (every code is in one of its `src` files), so a key that moves in the
// code and not here fails the test. A role is { k, codes, on, src } (k: the cap a chip shows; codes: KeyboardEvent.code; on: the screens that take it; src: the files whose code names it) or { same: 'id', on, src }, the entry of
// CAMP_KEYS the role is (Enter, H, S, Backspace, Esc, L, the zoom keys: one key, one place).
const CAMP_SCREEN_KEYS = {
  pick: { same: 'pick', on: ['title', 'ready', 'refit', 'earthrefit', 'pick', 'brief', 'story', 'won', 'lvlwon', 'lost', 'tech', 'end'], src: ['src/title.js', 'src/camphub.js', 'src/campaignscene.js', 'src/campbrief.js'] },      // Enter: begin, open, buy, next, launch, retry, go on
  up: { k: 'Up', codes: ['ArrowUp', 'KeyW'], on: ['ready', 'refit', 'pick', 'settings', 'setkeys', 'setlisten', 'setcontrols', 'setflight', 'setcontent', 'setreset'], src: ['src/camphub.js', 'src/settings.js'] },                                                                                     // the ready room's rows and lists
  down: { k: 'Down', codes: ['ArrowDown', 'KeyS'], on: ['ready', 'refit', 'pick', 'settings', 'setkeys', 'setlisten', 'setcontrols', 'setflight', 'setcontent', 'setreset'], src: ['src/camphub.js', 'src/settings.js'] },
  left: { k: 'Left', codes: ['ArrowLeft', 'KeyA'], on: ['ready', 'refit', 'rank', 'pick', 'brief', 'settings', 'setcontrols', 'setflight'], src: ['src/camphub.js', 'src/campbrief.js', 'src/scrbriefdraw.js', 'src/settings.js'] },                                                          // back: closes a row's overlay; the briefing's previous stop
  right: { k: 'Right', codes: ['ArrowRight', 'KeyD'], on: ['ready', 'refit', 'brief', 'settings', 'setcontrols', 'setflight'], src: ['src/camphub.js', 'src/campbrief.js', 'src/settings.js'] },                                                         // does the thing (opens a row, buys); the briefing's next stop
  digit: { k: '1 to 9', codes: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9'], on: ['ready', 'refit', 'earthrefit', 'tech'], src: ['src/camphub.js', 'src/campaignscene.js'] }, // a row of the ready room, a choice of the refit card, a tech
  close: { same: 'pause', on: ['ready', 'refit', 'rank', 'brief', 'keys', 'settings', 'setkeys', 'setlisten', 'setcontrols', 'setflight', 'setcontent', 'setreset', 'pause'], src: ['src/camphub.js', 'src/campbrief.js', 'src/campkeys.js', 'src/campaignscene.js', 'src/settings.js'] },  // Esc: closes the overlay, the briefing, the page; resumes
  title: { k: 'T', codes: ['KeyT'], on: ['ready', 'pause', 'lost', 'end'], src: ['src/camphub.js', 'src/campaignscene.js'] },                                                              // to the title
  help: { same: 'help', on: ['title', 'ready', 'brief', 'pause', 'keys'], src: ['src/title.js', 'src/camphubscene.js', 'src/campaignscene.js', 'src/campkeys.js'] },                              // H: every key on one page
  settings: { same: 'settings', on: ['title', 'pause'], src: ['src/title.js', 'src/campaignscene.js'] },                                                                                       // S: Settings
  launch: { same: 'ready', on: ['ready', 'brief'], src: ['src/camphub.js', 'src/camphubscene.js'] },                                                                                          // L: the first press opens the briefing, the second launches
  restart: { same: 'restart', on: ['pause'], src: ['src/campaignscene.js'] },                                                                                                                 // Backspace: the mission again
  start: { k: 'K', codes: ['KeyK'], on: ['title'], src: ['src/title.js'] },                                                                                                                   // the Campaign's door
  open: { k: 'R', codes: ['KeyR'], on: ['pick'], src: ['src/camphub.js'] },                                                                                                                   // the mission list: open the briefing of the mission under the cursor
  clear: { k: 'X', codes: ['KeyX'], on: ['pick'], src: ['src/camphub.js'] },                                                                                                                  // the mission list: let go of the mission picked to fly again
  buy: { k: 'F', codes: ['KeyF'], on: ['refit'], src: ['src/camphub.js'] },                                                                                                                   // the refit: buy the choice
  giveback: { k: 'Backspace', codes: ['Backspace'], on: ['refit'], src: ['src/camphub.js'] },                                                                                                 // the refit: give the last thing back
  zoomin: { same: 'zoomin', on: ['brief'], src: ['src/campzoom.js'] }, zoomout: { same: 'zoomout', on: ['brief'], src: ['src/campzoom.js'] }, zoomreset: { same: 'zoomreset', on: ['brief'], src: ['src/campzoom.js'] }, // the briefing map's zoom
  // piece a (cards in the Campaign scene, card space-game-screens-a-cards): the digit of a technology's tile and of the fighter on the Earth refit (1 2 3, 4 buys a fighter, 6 7 8 the looted techs) and the tech pick (1 to 6), and the keys the lost card's tip names
  d1: { k: '1', codes: ['Digit1'], on: ['ready', 'earthrefit', 'tech'], src: ['src/campaignscene.js', 'src/camphub.js'] },
  d2: { k: '2', codes: ['Digit2'], on: ['ready', 'earthrefit', 'tech'], src: ['src/campaignscene.js', 'src/camphub.js'] },
  d3: { k: '3', codes: ['Digit3'], on: ['ready', 'earthrefit', 'tech'], src: ['src/campaignscene.js', 'src/camphub.js'] },
  d4: { k: '4', codes: ['Digit4'], on: ['earthrefit', 'tech'], src: ['src/campaignscene.js'] },
  d5: { k: '5', codes: ['Digit5'], on: ['earthrefit', 'tech'], src: ['src/campaignscene.js'] },
  d6: { k: '6', codes: ['Digit6'], on: ['earthrefit', 'tech'], src: ['src/campaignscene.js'] },
  d7: { k: '7', codes: ['Digit7'], on: ['earthrefit', 'tech'], src: ['src/campaignscene.js'] },
  d8: { k: '8', codes: ['Digit8'], on: ['earthrefit', 'tech'], src: ['src/campaignscene.js'] },
  tipfriendlies: { same: 'friendlies', on: ['lost'], src: ['src/camptcorner.js'] }, tiporder: { same: 'order', on: ['lost'], src: ['src/campaignscene.js'] }, tipnear: { same: 'near', on: ['lost'], src: ['src/camppanel.js'] }, tipmissile: { same: 'missile', on: ['lost'], src: ['src/campaignscene.js'] },
  door: { k: 'Arrows', codes: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], on: ['title'], src: ['src/title.js'] }                                                                           // the title: move the light to the other door (Enter does the lit one: the Campaign at first on the new title, Troy, 25 Nov 2026; Long Haul on today's)
};
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
const CAMP_POWER_KEYS = { shields: { k: 'J', codes: ['KeyJ'] }, engines: { k: 'K', codes: ['KeyK'] }, weapons: { k: 'L', codes: ['KeyL'] } }; // the direct keys of the pips, kept for the switch
const CAMP_POWER_ROW = { k: ['J', 'K', 'L'], t: 'Power to shields, engines, weapons', sub: 'POWER' };   // and their row on the H page
let campPowerOn = CAMP_POWER;
function campPowerSet(on) { // the switch (CAMP_POWER): J K L, their row on the H page, the gauges' bars and keys, and CAMP.power.on (the rules: pips moved by nothing while it is false) move together
  campPowerOn = !!on; if (typeof CAMP === 'object' && CAMP && CAMP.power) CAMP.power.on = campPowerOn;
  Object.keys(CAMP_POWER_KEYS).forEach(id => { const K = CAMP_KEYS[id]; if (K) { K.k = campPowerOn ? CAMP_POWER_KEYS[id].k : ''; K.codes = campPowerOn ? CAMP_POWER_KEYS[id].codes.slice() : []; } });
  if (typeof CAMP_GAUGE === 'object' && CAMP_GAUGE && typeof campPowerKeys === 'function') CAMP_GAUGE.keys = campPowerKeys(); // the gauges' direct keys follow
  let C = null; try { C = CONTROLS; } catch (e) { C = null; } // the H page's tables: not made yet when this first runs
  const g = C ? C.find(x => x.id === 'campaign') : null; if (g) {
    const i = g.rows.findIndex(x => x.sub === 'POWER' && x.k.join() === 'J,K,L'); if (i >= 0) g.rows.splice(i, 1);
    if (campPowerOn) { const t = g.rows.findIndex(x => x.k.join() === 'Tab'); g.rows.splice(t < 0 ? g.rows.length : t, 0, Object.assign({}, CAMP_POWER_ROW)); }
  }
  return on;
}
function campBlinkSet(on) { CAMP_BLINK.on = !!on; const r = CAMP_PANELS.panels[0].rows.find(x => x.id === 'blink'); if (r) r.off = on ? 0 : 1; } // the warp blink (card space-game-keys7-trim): its Q list row and its tech after level 1, together
campPowerSet(CAMP_POWER);
campVoiceSet(CAMP_VOICE);
const campKeyCodes = id => (CAMP_KEYS[id] || { codes: [] }).codes;
const campKeyIs = (id, code) => campKeyCodes(id).indexOf(code) >= 0;
// the most rows a list can have (the rows not switched off, whatever the level or the tech; 9 at most: the digits stop there). The H page's chip and the pause card say a numbered list's digits from this, not from a number typed in (card space-game-s-list-eight-rows: they said 1-7 while the Q list had eight rows, the warp blink the eighth). The foot says the live length (the view's `last`: a level with no outpost or no blink tech has fewer).
const campPanelMost = id => { const p = CAMP_PANELS.panels.find(x => x.id === id); return p ? Math.min(9, p.rows.filter(r => !r.off).length) : 0; };
// the rows the H page and Settings list for the lists: each list's key and what it is, then the keys every open list shares
function campPanelKeyRows() {
  const sub = 'THE ORDER LISTS', what = { cruiser: 'Cruiser: fly, mine, repair, shields', fleet: 'Fleet: pick who takes the orders', friends: 'Friends: pick a ship you protect', convoy: 'Convoy: tuck in, run, hold, carry on', yard: 'Dock, repair the hull and our ships' };
  const on = CAMP_PANELS.panels.filter(p => p.key), numd = on.filter(p => p.numbers), plain = on.some(p => !p.numbers); // a numbered list (the Q list and the W pick, cards space-game-s-list-numbers and space-game-keys5-qwe) is driven by its digits and takes neither Up, Down, Left, Right nor Enter: the rows for those are only said while a list that takes them is on
  return on.map(p => ({ k: [p.key], t: what[p.id] || p.title, sub })).concat(numd.map(p => ({ k: ['1-' + campPanelMost(p.id)], t: p.id === 'cruiser' ? 'Cruiser list: its digit does a row' : p.id === 'friends' ? 'Friends pick: its digit holds that ship' : 'Fleet pick: its digit picks who', sub })), plain ? [
    { k: [CAMP_KEYS.up.k, CAMP_KEYS.down.k], t: 'In a list: move the highlight', sub }, { k: [CAMP_KEYS.pick.k], t: 'In a list: give the order', sub }, { k: ['Left', 'Right'], t: 'In a list: back, or into a part', sub }] : [], [{ k: [CAMP_KEYS.pause.k], t: 'Back a step, or close the list', sub }]);
}

// the keys as the hints say them, ALL read from the tables above: a remap is one change here and every text follows.
//   campKeyVar(name)   a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know):
//                      {cruiserkey} {convoykey} {yardkey} the key that opens a list (its id + "key"; '' for a list no key opens);
//                      {keymap} {keyfly} {keymissile} {keyshields} ... a direct key of CAMP_KEYS ("key" + its id);
//                      {rowdock} {rowfmine} ... the words of a row ("row" + its id);   {viadock} {viafmine} ... the way to the list that row is in ("via" + its id: its key, or its parent's key and its row when the list has none), for "Press {viadock}, pick {rowdock}";
//                      {cruiserlast} the last digit of a numbered list (its most rows: 8 for the Q list, campPanelMost), for "1 to {cruiserlast} does a row";
//                      {panels} what the lists' keys open (S opens the cruiser list);   '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(list)  the key cap of a list as the briefing's boxes draw it: ['S'] for 'cruiser'; [] when there is no such list or it has no key
//   campKeyVia(row)    the list a row is in, or null;   campKeyOpens(list)  the key that reaches a list: its own, else its parent's;   campKeyPath(list)  the way there in words: 'S', or 'S, Dock and repair' for a list with no key
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) { const r = p.rows.find(x => x.id === id); if (r) return r; }
  return null;
}
const campKeyVia = id => CAMP_PANELS.panels.find(p => p.rows.some(x => x.id === id)) || null;
// THE NUMBER KEYS OF A NUMBERED LIST (card space-game-s-list-numbers; Troy, 24 Nov 2026: the Q list fought with flying: it used Up, Down and Enter, and the arrows steer and Enter fires a missile): a list marked `numbers: 1` (the cruiser's) shows a number chip on each row and takes the digits 1 to 9 (Digit or Numpad) as its rows, in the order they stand: S, then 1 to its last row (7 rows, 8 with the warp blink tech, 6 in a level with no outpost: campPanelMost says the most, 8) does the row at once. It does NOT take Up, Down, Left, Right or Enter: while it is open the arrows fly and Enter fires a missile. Esc and the fade close it. campKeyDigit gives the number of a digit key code, 0 for any other.
const campKeyDigit = code => { const m = /^(?:Digit|Numpad)([1-9])$/.exec(String(code || '')); return m ? +m[1] : 0; };
const campKeyList = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campKeyOpens = id => { let p = campKeyList(id); while (p && !p.key && p.parent) p = campKeyList(p.parent); return p ? p.key : ''; };
// the way to a list as a hint says it: the list's own key ('S'), or for a list with no key the key of the list it is a part of and the words of its row there ('S, Dock and repair')
function campKeyPath(id) {
  const p = campKeyList(id); if (!p) return '';
  if (p.key) return p.key;
  const up = campKeyList(p.parent), row = up ? up.rows.find(r => r.open === id) : null;
  return up ? (campKeyPath(up.id) + (row ? ', ' + row.label : '')).replace(/^, /, '') : '';
}
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return CAMP_PANELS.panels.filter(p => !p.parent && p.key).map(p => p.key + ' opens ' + p.name).join(', ');
  let m = /^([a-z]+)key$/.exec(name);
  if (m) { const p = campKeyList(m[1]); return p ? campKeyOpens(p.id) : ''; }
  m = /^row([a-z][a-z0-9]*)$/.exec(name); // (a row id may end in a digit: fri1 to fri9, card space-game-keys8-e-digit)
  if (m) { const r = campKeyRow(m[1]); return r ? r.label : ''; }
  m = /^via([a-z][a-z0-9]*)$/.exec(name);
  if (m) { const p = campKeyVia(m[1]); return p ? campKeyPath(p.id) : ''; }
  m = /^key([a-z]+)$/.exec(name);
  if (m) { const k = CAMP_KEYS[m[1]]; return k ? k.k : ''; }
  m = /^([a-z]+)last$/.exec(name);
  if (m) { const p = campKeyList(m[1]); return p && p.numbers ? String(campPanelMost(p.id)) : ''; } // {cruiserlast}: the last digit of a numbered list, 8 for the Q list (its most rows)
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
    { k: ['M'], t: 'Missile at the target', sub: 'FLY AND FIRE' },
    { k: ['R'], t: 'Queue a missile to build (20 ore each)', sub: 'FLY AND FIRE' }, // card space-game-missiles-cost-ore: also the Q list's row Reload missiles; each press queues one (card space-game-missile-queue); the ship builds one by itself only at 0
    { k: ['-', '='], t: 'Zoom; Q resets; drag pans', sub: 'FLY AND FIRE' }, // - and the wheel go out to the whole system on the map; = and the keypad's + and - too; S is the reset and brings the view back to the cruiser (src/campzoom.js: all three from CAMP_KEYS; it was Backspace) // drag: the left button held and moved pans the view and the Tab map (src/campdrag.js): it stays where it is put; the wheel zooms about the pointer; a RECENTRE mark, Backspace (this reset) or the arrows held bring it back (a row of its own did not fit the H page)
    { k: ['W'], t: 'Fleet: W picks all, taps step, 1 to 3 jumps', sub: 'THE TARGET' }, // the fleet pick (card space-game-keys5-qwe): W opens it, a digit picks WHO (C.sel): 1 Wedge, 2 Kara, 3 Apollo, 4 all pilots (the default); W alone only opens it
    { k: ['E'], t: 'Friends: E steps, 1 to 9 jumps', sub: 'THE TARGET' }, // the friendly pick (C.fsel): a SHIP you protect ([ steps through the ships only, then holds nothing for one press (the empty stop: E is then form up); a click on an outpost or a planet on the Tab map holds that place as the friendly: card space-game-keys3-select); W sends the pilots to guard it. Only ONE target is held: it replaces the enemy (card space-game-keys2-select)
    { k: [']'], t: 'Next enemy (nearest first)', sub: 'THE TARGET' }, // the enemy pick (C.tgt): Fly to the target flies to it, Enter fires at it, E sends the pilots at it; one press past the last ship holds nothing (the empty stop); it replaces the friendly. A pause of CAMP.target.restart ms starts again from the nearest
    { k: ['\\'], t: 'The nearest threat', sub: 'THE TARGET' },
    { k: ['Enter'], t: 'Order: attack, guard or form up', sub: 'THE TARGET' }, // E does the fitting thing for the pick: who takes the order (the W pick) does it, and a pilot in the bay is launched by it (cards space-game-keys2-orders, space-game-keys5-qwe; it was W)
    { k: ['Click'], t: 'Click a ship; right click orders', sub: 'THE TARGET' }, // the mouse on the flight view (card space-game-click-target, src/campclick.js): a left click holds an enemy or a ship you protect (or picks a pilot: who), a right click holds it AND gives the order W gives; a drag still pans
    { k: ['F'], t: 'F looks at the picked ship', sub: 'THE TARGET' }, // F: the camera glides to the target, a ship a list is on, or a squad's leader, and follows it (src/campfocus.js); Q (the zoom row) brings it back. X (clear the picks) is gone: card space-game-keys5-qwe
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Up', 'Down'], t: 'Map: last or next mark (Left, Right)', sub: 'THE MAP' },
    { k: ['Enter'], t: 'Map: fly there (Shift+Enter: fast)', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['X'], t: 'Map: X clears the trip', sub: 'THE MAP' },
    { k: ['/'], t: 'Type an order (needs a chat key)', sub: 'THE STRIP' }, // the same words the lists say: the strip answers through the chat key (Settings > Keys); the lists, the map and the calls need none. Hold to speak is off (CAMP_VOICE): its row comes back with campVoiceSet
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Back out of a list or map, else pause', sub: 'ANYWHERE' },
    { k: ['S'], t: 'Pause card: Settings (sound, mute)', sub: 'ANYWHERE' },
    { k: ['N'], t: 'Tuning panel: numbers and switches', sub: 'ANYWHERE' }, // src/camptunedraw.js
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ON A CARD' },
    { k: ['Backspace'], t: 'Pause card: restart the mission', sub: 'ON A CARD' }, // (card space-game-pause-restart-key: it was R; R does nothing on the pause card now)
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
    { k: [CAMP_KEYS.ready.k], t: 'Open the briefing, again to launch', sub: 'THE READY ROOM' }, // (the first press opens the briefing of the mission Launch flies, a second one in it launches; in a dock it undocks)
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
    { k: ['-', '='], t: 'Briefing map: zoom; Q resets', sub: 'THE BRIEFING' },
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

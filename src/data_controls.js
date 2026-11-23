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
// LEFT HAND, the fleet: Q opens the FLEET list, which is a row for each part of the wing and nothing else (card space-game-squad-tint; Troy, 22 Nov 2026: nothing listed twice): W ALL SQUADS, E RED SQUAD, R GREEN SQUAD, T YELLOW SQUAD (the fighters are split into three squads: card space-game-fighter-squads),
// and ESCORTS and CONVOY, which have no key (a row of the Q list: Enter or Right on it opens that part; the scouts are escorts and are in no squad). The first row of Q is All squads and the first row of that list is LAUNCH THE WING, so Q, Enter, Enter launches everything, and so does W, Enter.
// RIGHT HAND, the ship, mirrored: P opens the SHIP list with a row for each part: O POWER (shields first: O, Enter adds a shield pip; card space-game-ship-shortcuts-o-power, Troy, 22 Nov 2026), I AUTOPILOT, U DOCK AND REPAIR.
// A part's key opens its list directly, at any time (E, Enter: the fighters attack the target); Enter or a click on the part's row in Q or P opens it too. Nothing is on the screen until a key is pressed, and only one list is open at a time.
// In an open list Up and Down move the highlight, Enter gives the order (the list closes when the order is taken; a power row leaves it open, to be given again), Left goes back to the list it is a part of, the list's own key closes it.
// Esc goes back ONE STEP, to where you came from (card space-game-order-target-pick): a target sub-list to its list, a list a row of Q or P opened back to Q or P, a list its own key opened (Q W E R T P O I U) is closed; with nothing open, Esc pauses.
// The battle runs at its own speed while a list is open (card space-game-no-command-slowdown). NO KEY IS REUSED IN FLIGHT: each of Q W E R and P O I U opens one list and means nothing else. The direct keys are only:
//   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   Enter a missile at the target (only while no list is open)   A D the last or next target   S the nearest threat   X clears it
//   J K L a pip of power to the shields, the engines, the weapons   ; balance (the POWER list has them as rows too)   Tab the map   - = zoom, Backspace resets it   H keys   M mute   Esc pause (when no list is open)   / types an order   . talks
// The arrows and Enter belong to whatever list is open: a list of these first, else a pilot's call (a small amber list low in the middle, answered with Up, Down and Enter; it waits, dimmed, while a list is open), else the ship (fly, missile).
// A row that can never be used in this mission (the blink without its tech, building where ships are built docked, the CONVOY part's row in Q with no convoy) is left out (its `when`). A row that cannot be used NOW stays, greyed, with the reason beside it.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key reads it from here (campKeyVar below: {fleetkey} {fighterskey} {keymissile} {rowlaunch} {vialaunch} ... in the texts), and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO.
//   list:   { id, side, key, code, title, tab, name, parent, rows }   side 'left' or 'right'; key and code (a KeyboardEvent.code) open and close the list ('' for a list with no key of its own); tab is its word on the bottom key line; name is what a hint calls it;
//           parent is the list it is a part of (Left goes back there); start: 'usable' opens the list on its first row that can be given now, not on the first (card space-game-squad-tint: All squads starts on Launch, then, with the wing out, on Attack)
//   row:    { id, order, arg, wing, fly, burn, blink, open, stay, when, label, help }   order is a campOrder name (src/campaign.js: the words the strip and the voice use; arg goes with it); wing: [group, verb] is an order to one part of the wing
//           (campWingOrder, src/campwing.js: 'fighters' or 'escorts'; Attack goes at the target); fly: 'objective' or 'target' is the autopilot (src/campnav.js), burn: 1 makes it a fast burn; blink: 1 is the warp blink; open: '<list id>' opens that part's list;
//           pick: 'enemy' | 'escort' | 'field' makes it a row that needs a target: one candidate is taken at once, several open a sub-list of them, Esc goes back (src/camppick.js, card space-game-order-target-pick);
//           stay: 1 leaves the list open after the order (a pip of power: it is given again and again); when: 'convoy' | 'blink' | 'aboard' leaves the row out of a mission that can never use it (campPanelWhen, src/camppanel.js);
//           label is the row's words in the list, help its line for a hint. A row's id is its own in the whole table (a hint finds the row, and the list it is in, by it)
// the rows of the DOCK AND REPAIR list (U), from a table (card space-game-ship-shortcuts-o-power; Troy, 22 Nov 2026). PREP for a later feature, NOT built now (the idea bench: repair ships in space with ore, instead of building new ones):
// the Build rows are swapped for Repair rows in this ONE place, and the list, its notes (src/camppanel.js reads `cost`), the H page and the hints follow. Nothing changes in what a row does today.
//   { id, label, help, when, cost, does }   id: the row's own in the whole table;  label and help: its words in the list and for a hint;  when: when it shows ('' always, 'aboard' only in a level where ships are built aboard: campPanelWhen);
//                                           cost: what it takes, the CAMP.build price it reads ('fighter' or 'escort': <kind>Cost ore and <kind>Time s), '' for none;  does: the order it gives, { order, arg } (campOrder, src/campaign.js)
const CAMP_YARD = [
  { id: 'dock', label: 'Dock at the outpost', help: 'Dock at a friendly outpost', when: '', cost: '', does: { order: 'dock' } }, // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room (a level with no outpost mends the hull aboard instead: campPanelAs)
  { id: 'buildf', label: 'Build a fighter', help: 'Build a fighter (costs ore)', when: 'aboard', cost: 'fighter', does: { order: 'build', arg: 'fighter' } }, // only in a level with no outpost: elsewhere ships are built docked, in the ready room
  { id: 'builde', label: 'Build an escort', help: 'Build an escort (costs ore)', when: 'aboard', cost: 'escort', does: { order: 'build', arg: 'escort' } }
];
const campYardRows = () => CAMP_YARD.map(r => { const o = { id: r.id, order: r.does.order }; if (r.does.arg) o.arg = r.does.arg; if (r.when) o.when = r.when; o.label = r.label; o.help = r.help; if (r.cost) o.cost = r.cost; return o; }); // the table as the list's rows

const CAMP_PANELS = {
  show: 11,                                // how many rows of a list are on the screen at once: a longer list scrolls with the highlight (the fleet list has eleven: the squads came in, card space-game-fighter-squads)
  anim: { flash: 160 },                    // ms: a row lights up (two pulses) when Enter gives it
  panels: [
    { id: 'fleet', side: 'left', key: 'Q', code: 'KeyQ', title: 'FLEET ORDERS', tab: 'Fleet', name: 'the fleet list', rows: [
      { id: 'gsquads', open: 'squads', label: 'All squads', help: 'Orders for all three squads of fighters' },
      { id: 'gred', open: 'red', label: 'Red squad', help: 'The red squad\'s orders' },
      { id: 'ggreen', open: 'green', label: 'Green squad', help: 'The green squad\'s orders' },
      { id: 'gyellow', open: 'yellow', label: 'Yellow squad', help: 'The yellow squad\'s orders' },
      { id: 'gescorts', open: 'escorts', label: 'Escorts', help: 'The escorts\' orders' },
      { id: 'gconvoy', open: 'convoy', when: 'convoy', label: 'Convoy', help: 'Orders for the ships you escort' }
    ] },
    { id: 'convoy', parent: 'fleet', side: 'left', key: '', code: '', title: 'CONVOY ORDERS', tab: '', name: 'the convoy list', rows: [ // orders for the escorted ships (src/campconvoy.js). Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { id: 'ctuck', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy flies in the cruiser\'s shield' },
      { id: 'crun', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy runs ahead, with no cover' },
      { id: 'chold', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy stops and waits' },
      { id: 'ccarry', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy goes its own way again' }
    ] },
    { id: 'squads', parent: 'fleet', side: 'left', key: 'W', code: 'KeyW', title: 'ALL SQUADS', tab: 'All', name: 'the all-squads list', start: 'usable', rows: [ // all the fighters at once: the bay's Launch first (so Q, Enter, Enter launches everything), then the three squads' orders (cards space-game-fighter-squads, space-game-squad-tint)
      { id: 'launch', order: 'launch', label: 'Launch the wing', help: 'Launch the ships in the bay' },
      { id: 'attack', order: 'attack', pick: 'enemy', label: 'Attack the target', help: 'All squads attack the target' }, // the target of A D S X; none picked: the one hostile, or a sub-list of them to choose from (pick, src/camppick.js)
      { id: 'fguard', wing: ['fighters', 'guard'], label: 'Guard the cruiser', help: 'All squads guard the cruiser' },
      { id: 'frecall', wing: ['fighters', 'recall'], label: 'Recall', help: 'All squads fly home to the bay' },
      { id: 'fmine', wing: ['fighters', 'mine'], pick: 'field', label: 'Mine ore', help: 'All squads mine ore' }
    ] },
    { id: 'red', parent: 'fleet', side: 'left', key: 'E', code: 'KeyE', title: 'RED SQUAD', tab: 'Red', name: 'the red squad list', rows: [
      { id: 'redattack', wing: ['red', 'attack'], pick: 'enemy', label: 'Attack the target', help: 'The red squad attacks the target' },
      { id: 'redguard', wing: ['red', 'guard'], label: 'Guard the cruiser', help: 'The red squad guards the cruiser' },
      { id: 'redrecall', wing: ['red', 'recall'], label: 'Recall', help: 'The red squad flies home to the bay' }
    ] },
    { id: 'green', parent: 'fleet', side: 'left', key: 'R', code: 'KeyR', title: 'GREEN SQUAD', tab: 'Green', name: 'the green squad list', rows: [
      { id: 'greenattack', wing: ['green', 'attack'], pick: 'enemy', label: 'Attack the target', help: 'The green squad attacks the target' },
      { id: 'greenguard', wing: ['green', 'guard'], label: 'Guard the cruiser', help: 'The green squad guards the cruiser' },
      { id: 'greenrecall', wing: ['green', 'recall'], label: 'Recall', help: 'The green squad flies home to the bay' }
    ] },
    { id: 'yellow', parent: 'fleet', side: 'left', key: 'T', code: 'KeyT', title: 'YELLOW SQUAD', tab: 'Yellow', name: 'the yellow squad list', rows: [
      { id: 'yellowattack', wing: ['yellow', 'attack'], pick: 'enemy', label: 'Attack the target', help: 'The yellow squad attacks the target' },
      { id: 'yellowguard', wing: ['yellow', 'guard'], label: 'Guard the cruiser', help: 'The yellow squad guards the cruiser' },
      { id: 'yellowrecall', wing: ['yellow', 'recall'], label: 'Recall', help: 'The yellow squad flies home to the bay' }
    ] },
    { id: 'escorts', parent: 'fleet', side: 'left', key: '', code: '', title: 'ESCORTS', tab: '', name: 'the escorts list', rows: [
      { id: 'escort', order: 'escort', pick: 'escort', label: 'Escort the convoy', help: 'Escorts go to the convoy' },
      { id: 'eattack', wing: ['escorts', 'attack'], pick: 'enemy', label: 'Attack the target', help: 'Escorts attack the target' },
      { id: 'eguard', wing: ['escorts', 'guard'], label: 'Guard the cruiser', help: 'Escorts guard the cruiser' },
      { id: 'erecall', wing: ['escorts', 'recall'], label: 'Recall the escorts', help: 'Escorts fly home to the bay' }
    ] },
    { id: 'ship', side: 'right', key: 'P', code: 'KeyP', title: 'SHIP ORDERS', tab: 'Ship', name: 'the ship list', rows: [
      { id: 'gpower', open: 'power', label: 'Power', help: 'Shields, engines, weapons' },
      { id: 'gnav', open: 'nav', label: 'Autopilot', help: 'Fly to the goal or the target' },
      { id: 'gyard', open: 'yard', label: 'Dock and repair', help: 'Dock, mend the hull, build ships' },
      { id: 'blink', blink: 1, when: 'blink', label: 'Warp blink ahead', help: 'Warp blink hop (needs that tech)' }
    ] },
    { id: 'power', parent: 'ship', side: 'right', key: 'O', code: 'KeyO', title: 'POWER', tab: 'Power', name: 'the power list', rows: [ // the ship's power (docs/CAMPAIGN.md "Ship systems"), the dials' order; J K L ; do the first four directly, and each row shows that key
      { id: 'shields', order: 'power', arg: 'shields', stay: 1, pip: 1, label: 'Shields: one more pip', help: 'A pip of power to the shields' }, // pip: the index of the system in C.power.p (weapons, shields, engines): the row draws that system's pip bar, the same as its gauge's, and lights its gauge when it is the highlighted row (src/campanelsdraw.js; card space-game-power-presets)
      { id: 'engines', order: 'power', arg: 'engines', stay: 1, pip: 2, label: 'Engines: one more pip', help: 'A pip of power to the engines' },
      { id: 'weapons', order: 'power', arg: 'weapons', stay: 1, pip: 0, label: 'Weapons: one more pip', help: 'A pip of power to the weapons' },
      { id: 'balance', order: 'balance', stay: 1, label: 'Balance the power', help: 'Back to 2 / 2 / 2' },
      { id: 'emergency', order: 'emergency', label: 'Emergency shields', help: 'Shields get 4 pips for 10 s' }
    ] },
    { id: 'nav', parent: 'ship', side: 'right', key: 'I', code: 'KeyI', title: 'AUTOPILOT', tab: 'Autopilot', name: 'the autopilot list', rows: [
      { id: 'goal', fly: 'objective', label: 'Fly to the goal', help: 'Autopilot to the objective' },
      { id: 'target', fly: 'target', label: 'Fly to the target', help: 'Autopilot to the target' },
      { id: 'burn', fly: 'objective', burn: 1, label: 'Fast burn to the goal', help: 'A fast burn to the objective' }, // a burn needs the wing aboard (card space-game-campaign-fast-board)
      { id: 'burntarget', fly: 'target', burn: 1, label: 'Fast burn to the target', help: 'A fast burn to the target' }
    ] },
    { id: 'yard', parent: 'ship', side: 'right', key: 'U', code: 'KeyU', title: 'DOCK AND REPAIR', tab: 'Dock', name: 'the dock list', rows: campYardRows() } // the rows are the table CAMP_YARD above: what to put here is that table's business
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words beside the row's name; {need} is ore, {s} seconds
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', nosquad: 'no ships in the squad', noescorts: 'no escorts out', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', buildfull: 'no room in the bay', what: 'cannot do that now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', nodock: 'Dock at an outpost to build.', norepair: 'Dock at an outpost to repair.', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s',
    notarget: 'pick a target first', nofoe: 'no hostiles in sight', nomissiles: 'no missiles left', missilewait: 'the launcher is reloading', range: 'out of missile range', nobig: 'nothing in reach', noblink: 'needs the warp tech' },
  // the same, a word or two, beside a row of the list
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'leaving', baydry: 'all out', nofighters: 'none out', nosquad: 'none out', noescorts: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', buildfull: 'bay full', what: 'not now',
    nogoal: 'no goal', nofoe: 'none seen', there: 'there', nodock: 'dock first', norepair: 'dock first', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s',
    notarget: 'no target', nomissiles: 'none left', missilewait: 'reloading', range: 'too far', nobig: 'none near', noblink: 'no tech' }
};
// the direct keys of the Campaign (the scene reads the codes here; a hint names the cap): { k: the cap or caps a hint prints, codes: the KeyboardEvent.codes that do it }. One key, one meaning, everywhere in flight
const CAMP_KEYS = {
  fly: { k: 'Arrows', codes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },    // thrust, brake, turn (while a list or a call has the arrows, the ship coasts)
  fire: { k: 'Space', codes: ['Space'] },                                              // hold: the turrets fire at ships in reach
  missile: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] },                            // a homing missile at the target, only while no list and no call has Enter
  up: { k: 'Up', codes: ['ArrowUp'] }, down: { k: 'Down', codes: ['ArrowDown'] }, pick: { k: 'Enter', codes: ['Enter', 'NumpadEnter'] }, // in an open list (Q, P, a pilot's call): move the highlight, give the order
  map: { k: 'Tab', codes: ['Tab'] },                                                   // open and close the map (src/campmap.js CAMPMAP.key says the same)
  next: { k: 'D', codes: ['KeyD'] }, last: { k: 'A', codes: ['KeyA'] },               // the next and the last target
  near: { k: 'S', codes: ['KeyS'] }, clear: { k: 'X', codes: ['KeyX'] },              // the nearest threat; clear the target (in the map: clear the trip)
  shields: { k: 'J', codes: ['KeyJ'], sys: 'shields' }, engines: { k: 'K', codes: ['KeyK'], sys: 'engines' }, weapons: { k: 'L', codes: ['KeyL'], sys: 'weapons' }, balance: { k: ';', codes: ['Semicolon'], sys: 'balance' }, // the ship's power (docs/CAMPAIGN.md "Ship systems"): a pip to a system, in the dials' order; ; is 2 / 2 / 2
  zoomin: { k: '=', codes: ['Equal', 'NumpadAdd'] }, zoomout: { k: '-', codes: ['Minus', 'NumpadSubtract'] }, zoomreset: { k: 'Backspace', codes: ['Backspace'] }, // src/campzoom.js reads these codes
  strip: { k: '/', codes: ['Slash'] }, voice: { k: '.', codes: ['Period'] },          // type an order, hold to speak one (src/cmdstrip.js, src/shipcomputer.js, src/listen.js read these in the Campaign)
  help: { k: 'H', codes: ['KeyH'] }, mute: { k: 'M', codes: ['KeyM'] }, pause: { k: 'Esc', codes: ['Escape'] },
  tune: { k: 'N', codes: ['KeyN'] }                                                  // the tuning panel (card space-game-tuning-panel, src/camptunedraw.js): in flight and in the ready room; numbers and switches, changed live. Nothing else uses N
};
const campKeyCodes = id => (CAMP_KEYS[id] || { codes: [] }).codes;
const campKeyIs = (id, code) => campKeyCodes(id).indexOf(code) >= 0;
// the rows the H page and Settings list for the lists: each list's key and what it is, then the keys every open list shares
function campPanelKeyRows() {
  const sub = 'THE ORDER LISTS', what = { fleet: 'Fleet orders, and the lists below', convoy: 'Convoy: tuck in, run, hold, carry on', squads: 'All squads: launch, attack, recall', red: 'Red squad: attack, guard, recall', green: 'Green squad: attack, guard, recall', yellow: 'Yellow squad: attack, guard, recall', ship: 'Ship orders, and the lists below', nav: 'Autopilot: goal, target, fast burn', power: 'Power: pips, balance, emergency', yard: 'Dock, mend the hull, build ships' };
  return CAMP_PANELS.panels.filter(p => p.key).map(p => ({ k: [p.key], t: what[p.id] || p.title, sub })).concat([
    { k: [CAMP_KEYS.up.k, CAMP_KEYS.down.k], t: 'In a list: move the highlight', sub }, { k: [CAMP_KEYS.pick.k], t: 'In a list: give the order', sub }, { k: ['Left', 'Right'], t: 'In a list: back, or into a part', sub }, { k: [CAMP_KEYS.pause.k], t: 'Back a step, or close the list', sub }]);
}

// the keys as the hints say them, ALL read from the tables above: a remap is one change here and every text follows.
//   campKeyVar(name)   a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know):
//                      {fleetkey} {fighterskey} {convoykey} {escortskey} {shipkey} {navkey} {powerkey} {yardkey} the key that opens a list (its id + "key");
//                      {keymap} {keyfly} {keymissile} {keyshields} ... a direct key of CAMP_KEYS ("key" + its id);
//                      {rowlaunch} {rowdock} ... the words of a row ("row" + its id);   {vialaunch} {viaattack} ... the way to the list that row is in ("via" + its id: its key, or 'Q, Escorts' when the list has none), for "Press {viaattack}, pick {rowattack}";
//                      {panels} what Q and P are;   '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(list)  the key cap of a list as the briefing's boxes draw it: ['Q'] for 'fleet'; [] when there is no such list or it has no key
//   campKeyVia(row)    the list a row is in, or null;   campKeyOpens(list)  the key that reaches a list: its own, else its parent's;   campKeyPath(list)  the way there in words: 'E', or 'Q, Escorts' for a list with no key
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) { const r = p.rows.find(x => x.id === id); if (r) return r; }
  return null;
}
const campKeyVia = id => CAMP_PANELS.panels.find(p => p.rows.some(x => x.id === id)) || null;
const campKeyList = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campKeyOpens = id => { let p = campKeyList(id); while (p && !p.key && p.parent) p = campKeyList(p.parent); return p ? p.key : ''; };
// the way to a list as a hint says it: the list's own key ('E'), or for a list with no key (Escorts, Convoy) the key of the list it is a part of and the words of its row there ('Q, Escorts')
function campKeyPath(id) {
  const p = campKeyList(id); if (!p) return '';
  if (p.key) return p.key;
  const up = campKeyList(p.parent), row = up ? up.rows.find(r => r.open === id) : null;
  return up ? (campKeyPath(up.id) + (row ? ', ' + row.label : '')).replace(/^, /, '') : '';
}
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return CAMP_PANELS.panels.filter(p => !p.parent).map(p => p.key + ' opens ' + p.name).join(', ');
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
    { k: ['-', '='], t: 'Zoom; Backspace resets; drag pans', sub: 'FLY AND FIRE' }, // - and the wheel go out to the whole system on the map; = and the keypad's + and - too; Backspace is the reset (src/campzoom.js: all three from CAMP_KEYS) // drag: the left button held and moved pans the view and the Tab map (src/campdrag.js): it stays where it is put; the wheel zooms about the pointer; a RECENTRE mark, Backspace (this reset) or the arrows held bring it back (a row of its own did not fit the H page)
    { k: ['A', 'D'], t: 'Last or next target (nearest first)', sub: 'THE TARGET' }, // ONE target for everything: Attack goes at it, Fly to the target flies to it, Enter fires at it
    { k: ['S', 'X'], t: 'S the nearest threat, X clears it', sub: 'THE TARGET' },
    { k: ['J', 'K', 'L'], t: 'Power to shields, engines, weapons', sub: 'POWER' },
    { k: [';'], t: 'Balance the power: 2 / 2 / 2', sub: 'POWER' },
    { k: ['Up', 'Down'], t: 'A pilot calls: pick (stops timer); Enter', sub: 'A PILOT\'S CALL' }, // the call's small list has the arrows and Enter while no Q or P list is open; a press of Up or Down stops its 8 s timer, and the call then waits for Enter (src/camporderdraw.js, card space-game-call-timer-stops)
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Up', 'Down'], t: 'Map: last or next mark (Left, Right)', sub: 'THE MAP' },
    { k: ['Enter'], t: 'Map: fly there (Shift+Enter: fast)', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['V'], t: 'Map: V scouts there', sub: 'THE MAP' }, // (T took a lane at the fork of 1.1's road until card space-game-cut-lane-fork; the route system is dormant)
    { k: ['X'], t: 'Map: X clears the trip', sub: 'THE MAP' },
    { k: ['/'], t: 'Type an order (needs a chat key)', sub: 'THE STRIP AND THE VOICE' }, // the same words the lists say: the strip and the voice answer through the chat key (Settings > Keys); the lists, the map and the calls need none
    { k: ['.'], t: 'Hold to speak (needs a chat key)', sub: 'THE STRIP AND THE VOICE' },
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Back out of a list or map, else pause', sub: 'ANYWHERE' },
    { k: ['M'], t: 'Mute sound', sub: 'ANYWHERE' },
    { k: ['N'], t: 'Tuning panel: numbers and switches', sub: 'ANYWHERE' }, // src/camptunedraw.js
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ON A CARD' },
    { k: ['R'], t: 'Pause card: restart the mission', sub: 'ON A CARD' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ON A CARD' },
    { k: ['1-3'], t: 'Tech card: pick a technology', sub: 'ON A CARD' }, // after a level, not in flight
    { k: ['4', '5'], t: 'Refit card: buy a fighter or escort', sub: 'ON A CARD' }
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
    { k: ['F', 'E'], t: 'Refit: buy a fighter or an escort', sub: 'THE READY ROOM' },
    { k: ['U'], t: 'Refit: fit the Fabricator', sub: 'THE READY ROOM' },
    { k: ['Backspace'], t: 'Refit: give the last one back', sub: 'THE READY ROOM' },
    { k: ['H'], t: 'This page of keys', sub: 'THE READY ROOM' },
    { k: ['N'], t: 'Tuning panel: numbers and switches', sub: 'THE READY ROOM' },
    { k: ['Esc'], t: 'Close a row, else the title (T too)', sub: 'THE READY ROOM' },
    { k: ['Enter', 'Right'], t: 'Briefing: next screen, then launch', sub: 'THE BRIEFING' }, // the big briefing (src/campbriefdraw.js), opened from the board: three screens (where and why, what to do, how); Enter on the last one launches
    { k: ['Left'], t: 'Briefing: back a screen', sub: 'THE BRIEFING' },
    { k: ['L'], t: 'Briefing: launch the mission now', sub: 'THE BRIEFING' },
    { k: ['Esc'], t: 'Briefing: back to the missions', sub: 'THE BRIEFING' },
    { k: ['-', '='], t: 'Briefing map: zoom; Backspace resets', sub: 'THE BRIEFING' },
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

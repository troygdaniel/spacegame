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
// LEFT HAND, the fleet: Q opens the FLEET list: the whole wing's orders, and a row for each of its parts with the part's key on it: W CONVOY, E FIGHTERS, R ESCORTS (and STANCE, which has no key).
// RIGHT HAND, the ship, mirrored: P opens the SHIP list with a row for each part: O AUTOPILOT, I POWER, U DOCK AND BUILD.
// A part's key opens its list directly, at any time (E, Enter: the fighters attack the target); Enter or a click on the part's row in Q or P opens it too. Nothing is on the screen until a key is pressed, and only one list is open at a time.
// In an open list Up and Down move the highlight, Enter gives the order (the list closes when the order is taken; a power row leaves it open, to be given again), Left goes back to the list it is a part of, the list's own key or Esc closes it.
// The battle runs at its own speed while a list is open (card space-game-no-command-slowdown). NO KEY IS REUSED IN FLIGHT: each of Q W E R and P O I U opens one list and means nothing else. The direct keys are only:
//   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   Enter a missile at the target (only while no list is open)   A D the last or next target   S the nearest threat   X clears it
//   J K L a pip of power to the shields, the engines, the weapons   ; balance (the POWER list has them as rows too)   Tab the map   - = zoom, Backspace resets it   H keys   M mute   Esc pause (when no list is open)   / types an order   . talks
// The arrows and Enter belong to whatever list is open: a list of these first, else a pilot's call (a small amber list low in the middle, answered with Up, Down and Enter; it waits, dimmed, while a list is open), else the ship (fly, missile).
// A row that can never be used in this mission (the blink without its tech, building where ships are built docked, the CONVOY part's row in Q with no convoy) is left out (its `when`). A row that cannot be used NOW stays, greyed, with the reason beside it.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key reads it from here (campKeyVar below: {fleetkey} {fighterskey} {keymissile} {rowlaunch} {vialaunch} ... in the texts), and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO.
//   list:   { id, side, key, code, title, tab, name, parent, rows }   side 'left' or 'right'; key and code (a KeyboardEvent.code) open and close the list ('' for a list with no key of its own); tab is its word on the bottom key line; name is what a hint calls it;
//           parent is the list it is a part of (Left goes back there)
//   row:    { id, order, arg, wing, fly, burn, blink, open, stay, when, label, help }   order is a campOrder name (src/campaign.js: the words the strip and the voice use; arg goes with it); wing: [group, verb] is an order to one part of the wing
//           (campWingOrder, src/campwing.js: 'fighters' or 'escorts'; Attack goes at the target); fly: 'objective' or 'target' is the autopilot (src/campnav.js), burn: 1 makes it a fast burn; blink: 1 is the warp blink; open: '<list id>' opens that part's list;
//           stay: 1 leaves the list open after the order (a pip of power: it is given again and again); when: 'convoy' | 'blink' | 'aboard' leaves the row out of a mission that can never use it (campPanelWhen, src/camppanel.js);
//           label is the row's words in the list, help its line for a hint. A row's id is its own in the whole table (a hint finds the row, and the list it is in, by it)
const CAMP_PANELS = {
  show: 9,                                 // how many rows of a list are on the screen at once: a longer list scrolls with the highlight
  anim: { flash: 160 },                    // ms: a row lights up (two pulses) when Enter gives it
  panels: [
    { id: 'fleet', side: 'left', key: 'Q', code: 'KeyQ', title: 'FLEET ORDERS', tab: 'Fleet', name: 'the fleet list', rows: [
      { id: 'launch', order: 'launch', label: 'Launch the wing', help: 'Launch the ships in the bay' },
      { id: 'gfighters', open: 'fighters', label: 'Fighters', help: 'The fighters\' orders' },
      { id: 'gescorts', open: 'escorts', label: 'Escorts', help: 'The escorts\' orders' },
      { id: 'gconvoy', open: 'convoy', when: 'convoy', label: 'Convoy', help: 'Orders for the ships you escort' },
      { id: 'guard', order: 'guard', label: 'Guard the cruiser', help: 'The whole wing guards the cruiser' },
      { id: 'mine', order: 'mine', label: 'Mine ore', help: 'The wing goes and mines ore' },
      { id: 'recall', order: 'recall', label: 'Recall the wing', help: 'The wing flies home to the bay' },
      { id: 'gstance', open: 'stance', label: 'Stance', help: 'How the wing fights' }
    ] },
    { id: 'convoy', parent: 'fleet', side: 'left', key: 'W', code: 'KeyW', title: 'CONVOY ORDERS', tab: 'Convoy', name: 'the convoy list', rows: [ // orders for the escorted ships (src/campconvoy.js). Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { id: 'ctuck', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy flies in the cruiser\'s shield' },
      { id: 'crun', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy runs ahead, with no cover' },
      { id: 'chold', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy stops and waits' },
      { id: 'ccarry', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy goes its own way again' }
    ] },
    { id: 'fighters', parent: 'fleet', side: 'left', key: 'E', code: 'KeyE', title: 'FIGHTERS', tab: 'Fighters', name: 'the fighters list', rows: [
      { id: 'attack', order: 'attack', label: 'Attack the target', help: 'Fighters attack the target' }, // the target of A D S; none picked: the nearest enemy, as the order always was
      { id: 'fguard', wing: ['fighters', 'guard'], label: 'Guard the cruiser', help: 'Fighters guard the cruiser' },
      { id: 'fmine', wing: ['fighters', 'mine'], label: 'Mine ore', help: 'Fighters mine ore' },
      { id: 'frecall', wing: ['fighters', 'recall'], label: 'Recall the fighters', help: 'Fighters fly home to the bay' }
    ] },
    { id: 'escorts', parent: 'fleet', side: 'left', key: 'R', code: 'KeyR', title: 'ESCORTS', tab: 'Escorts', name: 'the escorts list', rows: [
      { id: 'escort', order: 'escort', label: 'Escort the convoy', help: 'Escorts go to the convoy' },
      { id: 'eattack', wing: ['escorts', 'attack'], label: 'Attack the target', help: 'Escorts attack the target' },
      { id: 'eguard', wing: ['escorts', 'guard'], label: 'Guard the cruiser', help: 'Escorts guard the cruiser' },
      { id: 'erecall', wing: ['escorts', 'recall'], label: 'Recall the escorts', help: 'Escorts fly home to the bay' }
    ] },
    { id: 'stance', parent: 'fleet', side: 'left', key: '', code: '', title: 'STANCE', tab: '', name: 'the stance list', rows: [ // how Attack and Guard move; the one in force is marked. name: the stance's own word (the HUD, the debrief)
      { id: 'free', order: 'stance', arg: 'free', label: 'Fight freely', name: 'Free', help: 'The wing fights its own way' },
      { id: 'orbit', order: 'stance', arg: 'orbit', label: 'Orbit the target', name: 'Orbit', help: 'Circle the target, firing' },
      { id: 'keep', order: 'stance', arg: 'keep distance', label: 'Keep distance', name: 'Keep distance', help: 'Stand off from the target' },
      { id: 'match', order: 'stance', arg: 'match speed', label: 'Match my speed', name: 'Match speed', help: 'Fly beside the cruiser' },
      { id: 'hold', order: 'stance', arg: 'hold position', label: 'Hold position', name: 'Hold position', help: 'Stay put, fire at what comes' }
    ] },
    { id: 'ship', side: 'right', key: 'P', code: 'KeyP', title: 'SHIP ORDERS', tab: 'Ship', name: 'the ship list', rows: [
      { id: 'gnav', open: 'nav', label: 'Autopilot', help: 'Fly to the goal or the target' },
      { id: 'gpower', open: 'power', label: 'Power', help: 'Shields, engines, weapons' },
      { id: 'gyard', open: 'yard', label: 'Dock and build', help: 'Dock, mend, build ships' },
      { id: 'blink', blink: 1, when: 'blink', label: 'Warp blink ahead', help: 'Warp blink hop (needs that tech)' }
    ] },
    { id: 'nav', parent: 'ship', side: 'right', key: 'O', code: 'KeyO', title: 'AUTOPILOT', tab: 'Autopilot', name: 'the autopilot list', rows: [
      { id: 'goal', fly: 'objective', label: 'Fly to the goal', help: 'Autopilot to the objective' },
      { id: 'target', fly: 'target', label: 'Fly to the target', help: 'Autopilot to the target' },
      { id: 'burn', fly: 'objective', burn: 1, label: 'Fast burn to the goal', help: 'A fast burn to the objective' }, // a burn needs the wing aboard (card space-game-campaign-fast-board)
      { id: 'burntarget', fly: 'target', burn: 1, label: 'Fast burn to the target', help: 'A fast burn to the target' }
    ] },
    { id: 'power', parent: 'ship', side: 'right', key: 'I', code: 'KeyI', title: 'POWER', tab: 'Power', name: 'the power list', rows: [ // the ship's power (docs/CAMPAIGN.md "Ship systems"), the dials' order; J K L ; do the first four directly, and each row shows that key
      { id: 'shields', order: 'power', arg: 'shields', stay: 1, label: 'Shields: one more pip', help: 'A pip of power to the shields' },
      { id: 'engines', order: 'power', arg: 'engines', stay: 1, label: 'Engines: one more pip', help: 'A pip of power to the engines' },
      { id: 'weapons', order: 'power', arg: 'weapons', stay: 1, label: 'Weapons: one more pip', help: 'A pip of power to the weapons' },
      { id: 'balance', order: 'balance', stay: 1, label: 'Balance the power', help: 'Back to 2 / 2 / 2' },
      { id: 'emergency', order: 'emergency', label: 'Emergency shields', help: 'Shields get 4 pips for 10 s' }
    ] },
    { id: 'yard', parent: 'ship', side: 'right', key: 'U', code: 'KeyU', title: 'DOCK AND BUILD', tab: 'Dock', name: 'the dock list', rows: [
      { id: 'dock', order: 'dock', label: 'Dock at the outpost', help: 'Dock at a friendly outpost' }, // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room (a level with no outpost mends the hull aboard instead: campPanelAs)
      { id: 'buildf', order: 'build', arg: 'fighter', when: 'aboard', label: 'Build a fighter', help: 'Build a fighter (costs ore)' }, // only in a level with no outpost: elsewhere ships are built docked, in the ready room
      { id: 'builde', order: 'build', arg: 'escort', when: 'aboard', label: 'Build an escort', help: 'Build an escort (costs ore)' }
    ] }
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words beside the row's name; {need} is ore, {s} seconds
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', noescorts: 'no escorts out', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', buildfull: 'no room in the bay', what: 'cannot do that now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', nodock: 'Dock at an outpost to build.', norepair: 'Dock at an outpost to repair.', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s',
    notarget: 'pick a target first', nomissiles: 'no missiles left', missilewait: 'the launcher is reloading', range: 'out of missile range', nobig: 'nothing in reach', noblink: 'needs the warp tech' },
  // the same, a word or two, beside a row of the list
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'leaving', baydry: 'all out', nofighters: 'none out', noescorts: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', buildfull: 'bay full', what: 'not now',
    nogoal: 'no goal', there: 'there', nodock: 'dock first', norepair: 'dock first', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s',
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
  const sub = 'THE ORDER LISTS', what = { fleet: 'Fleet orders, and the lists below', convoy: 'Convoy: tuck in, run, hold, carry on', fighters: 'Fighters: attack, guard, mine', escorts: 'Escorts: escort, attack, guard', ship: 'Ship orders, and the lists below', nav: 'Autopilot: goal, target, fast burn', power: 'Power: pips, balance, emergency', yard: 'Dock, mend the hull, build ships' };
  return CAMP_PANELS.panels.filter(p => p.key).map(p => ({ k: [p.key], t: what[p.id] || p.title, sub })).concat([
    { k: [CAMP_KEYS.up.k, CAMP_KEYS.down.k], t: 'In a list: move the highlight', sub }, { k: [CAMP_KEYS.pick.k], t: 'In a list: give the order', sub }, { k: ['Left', 'Right'], t: 'In a list: back, or into a part', sub }, { k: [CAMP_KEYS.pause.k], t: 'Close the list (its own key too)', sub }]);
}

// the keys as the hints say them, ALL read from the tables above: a remap is one change here and every text follows.
//   campKeyVar(name)   a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know):
//                      {fleetkey} {fighterskey} {convoykey} {escortskey} {shipkey} {navkey} {powerkey} {yardkey} the key that opens a list (its id + "key");
//                      {keymap} {keyfly} {keymissile} {keyshields} ... a direct key of CAMP_KEYS ("key" + its id);
//                      {rowlaunch} {rowdock} ... the words of a row ("row" + its id);   {vialaunch} {viaattack} ... the key of the list that row is in ("via" + its id), for "Press {viaattack}, pick {rowattack}";
//                      {panels} what Q and P are;   '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(list)  the key cap of a list as the briefing's boxes draw it: ['Q'] for 'fleet'; [] when there is no such list or it has no key
//   campKeyVia(row)    the list a row is in, or null;   campKeyOpens(list)  the key that reaches a list: its own, else its parent's
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) { const r = p.rows.find(x => x.id === id); if (r) return r; }
  return null;
}
const campKeyVia = id => CAMP_PANELS.panels.find(p => p.rows.some(x => x.id === id)) || null;
const campKeyList = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campKeyOpens = id => { let p = campKeyList(id); while (p && !p.key && p.parent) p = campKeyList(p.parent); return p ? p.key : ''; };
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return CAMP_PANELS.panels.filter(p => !p.parent).map(p => p.key + ' opens ' + p.name).join(', ');
  let m = /^([a-z]+)key$/.exec(name);
  if (m) { const p = campKeyList(m[1]); return p ? campKeyOpens(p.id) : ''; }
  m = /^row([a-z]+)$/.exec(name);
  if (m) { const r = campKeyRow(m[1]); return r ? r.label : ''; }
  m = /^via([a-z]+)$/.exec(name);
  if (m) { const p = campKeyVia(m[1]); return p ? campKeyOpens(p.id) : ''; }
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
    { k: ['-', '='], t: 'Zoom out, in; Backspace resets', sub: 'FLY AND FIRE' }, // - and the wheel go out to the whole system on the map; = and the keypad's + and - too; Backspace is the reset (src/campzoom.js: all three from CAMP_KEYS)
    { k: ['A', 'D'], t: 'Last or next target (nearest first)', sub: 'THE TARGET' }, // ONE target for everything: Attack goes at it, Fly to the target flies to it, Enter fires at it
    { k: ['S', 'X'], t: 'S the nearest threat, X clears it', sub: 'THE TARGET' },
    { k: ['J', 'K', 'L'], t: 'Power to shields, engines, weapons', sub: 'POWER' },
    { k: [';'], t: 'Balance the power: 2 / 2 / 2', sub: 'POWER' },
    { k: ['Up', 'Down'], t: 'A pilot calls: pick (stops timer); Enter', sub: 'A PILOT\'S CALL' }, // the call's small list has the arrows and Enter while no Q or P list is open; a press of Up or Down stops its 8 s timer, and the call then waits for Enter (src/camporderdraw.js, card space-game-call-timer-stops)
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Up', 'Down'], t: 'Map: last or next mark (Left, Right)', sub: 'THE MAP' },
    { k: ['Enter'], t: 'Map: fly there (Shift+Enter: fast)', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['V', 'T'], t: 'Map: V scouts there, T takes a lane', sub: 'THE MAP' }, // T is the pick at a fork in the road (card space-game-scout-route)
    { k: ['X'], t: 'Map: X clears the trip', sub: 'THE MAP' },
    { k: ['/'], t: 'Type an order (needs a chat key)', sub: 'THE STRIP AND THE VOICE' }, // the same words the lists say: the strip and the voice answer through the chat key (Settings > Keys); the lists, the map and the calls need none
    { k: ['.'], t: 'Hold to speak (needs a chat key)', sub: 'THE STRIP AND THE VOICE' },
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Close a list or the map, else pause', sub: 'ANYWHERE' },
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

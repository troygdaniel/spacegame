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
// ---------- the Campaign's two lists (card one-list-keys; Troy, 22 Nov 2026: "one list per hand") ----------
// The two always-on panels, their pages and their one-key orders were too much to hold in the head. Now: Q opens ONE list of FLEET orders at the left, P opens ONE list of SHIP orders at the right. Both are hidden until their key is pressed.
// In an open list Up and Down move the highlight, Enter gives the order (the list closes when the order is taken), the list's own key or Esc closes it. The battle runs slow while a list is open. Only one list is open at a time.
// NO KEY IS REUSED IN FLIGHT. The direct keys are only:
//   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   Enter a missile at the target (only while no list is open)   A D the last or next target   S the nearest threat   X clears it
//   J K L a pip of power to the shields, the engines, the weapons   ; balance   Tab the map   - = zoom, Backspace resets it   H keys   M mute   Esc pause (when no list is open)   / types an order   . talks
// The arrows and Enter belong to whatever list is open: a Q or P list first, else a pilot's call (a small amber list low in the middle, answered with Up, Down and Enter; it waits, dimmed, while a Q or P list is open), else the ship (fly, missile).
// A list does not hold every order: what has a direct key (the missile, the power, the target) is not a row, and a row that can never be used in this mission (convoy orders with no convoy, the blink without its tech, building where
// ships are built docked) is left out (its `when`). A row that cannot be used NOW stays, greyed, with the reason beside it. The rows are in the order of how often they are needed; nothing cycles: each stance and each convoy order is a row.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key reads it from here (campKeyVar below: {fleetkey} {shipkey} {keymissile} {rowlaunch} ... in the texts), and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO.
//   panel:  { id, side, key, code, title, name, rows }   side 'left' or 'right'; key and code (a KeyboardEvent.code) open and close the list; name is what a hint calls it ("the fleet list")
//   row:    { id, order, arg, fly, burn, blink, when, label, help }   order is a campOrder name (src/campaign.js: the words the strip and the voice use; arg goes with it); fly: 'objective' or 'target' is the autopilot (src/campnav.js), burn: 1 makes it a fast burn;
//           blink: 1 is the warp blink; when: 'convoy' | 'blink' | 'aboard' leaves the row out of a mission that can never use it (campPanelWhen, src/camppanel.js); label is the row's words in the list, help its line on the H page and in Settings
const CAMP_PANELS = {
  show: 9,                                 // how many rows of a list are on the screen at once: a longer list scrolls with the highlight
  anim: { flash: 160 },                    // ms: a row lights up (two pulses) when Enter gives it
  panels: [
    { id: 'fleet', side: 'left', key: 'Q', code: 'KeyQ', title: 'FLEET ORDERS', name: 'the fleet list', rows: [
      { id: 'attack', order: 'attack', label: 'Attack the target', help: 'Fighters attack the target' }, // the target of A D S; none picked: the nearest enemy, as the order always was
      { id: 'launch', order: 'launch', label: 'Launch the wing', help: 'Launch the ships in the bay' },
      { id: 'escort', order: 'escort', label: 'Escort the convoy', help: 'Escorts go to the convoy' },
      { id: 'guard', order: 'guard', label: 'Guard the cruiser', help: 'The wing guards the cruiser' },
      { id: 'recall', order: 'recall', label: 'Recall the wing', help: 'The wing flies home to the bay' },
      { id: 'mine', order: 'mine', label: 'Mine ore', help: 'The wing goes and mines ore' },
      { id: 'ctuck', order: 'convoy', arg: 'tuck in', when: 'convoy', label: 'Convoy: tuck in', help: 'Convoy flies in the cruiser\'s shield' }, // orders for the escorted ships (src/campconvoy.js). Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { id: 'crun', order: 'convoy', arg: 'run for it', when: 'convoy', label: 'Convoy: run for it', help: 'Convoy runs ahead, with no cover' },
      { id: 'chold', order: 'convoy', arg: 'hold here', when: 'convoy', label: 'Convoy: hold here', help: 'Convoy stops and waits' },
      { id: 'ccarry', order: 'convoy', arg: 'carry on', when: 'convoy', label: 'Convoy: carry on', help: 'Convoy goes its own way again' },
      { id: 'free', order: 'stance', arg: 'free', label: 'Stance: fight freely', name: 'Free', help: 'Stance: the wing fights its own way' }, // how Attack and Guard move; the one in force is marked. name: the stance's own word (the HUD, the debrief)
      { id: 'orbit', order: 'stance', arg: 'orbit', label: 'Stance: orbit the target', name: 'Orbit', help: 'Stance: circle the target, firing' },
      { id: 'keep', order: 'stance', arg: 'keep distance', label: 'Stance: keep distance', name: 'Keep distance', help: 'Stance: stand off from the target' },
      { id: 'match', order: 'stance', arg: 'match speed', label: 'Stance: match my speed', name: 'Match speed', help: 'Stance: fly beside the cruiser' },
      { id: 'hold', order: 'stance', arg: 'hold position', label: 'Stance: hold position', name: 'Hold position', help: 'Stance: stay put, fire at what comes' }
    ] },
    { id: 'ship', side: 'right', key: 'P', code: 'KeyP', title: 'SHIP ORDERS', name: 'the ship list', rows: [
      { id: 'goal', fly: 'objective', label: 'Fly to the goal', help: 'Autopilot to the objective' },
      { id: 'target', fly: 'target', label: 'Fly to the target', help: 'Autopilot to the target' },
      { id: 'burn', fly: 'objective', burn: 1, label: 'Fast burn to the goal', help: 'A fast burn to the objective' }, // a burn needs the wing aboard (card space-game-campaign-fast-board)
      { id: 'burntarget', fly: 'target', burn: 1, label: 'Fast burn to the target', help: 'A fast burn to the target' },
      { id: 'emergency', order: 'emergency', label: 'Emergency shields', help: 'Shields get 4 pips for 10 s' },
      { id: 'dock', order: 'dock', label: 'Dock at the outpost', help: 'Dock at a friendly outpost' }, // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room (a level with no outpost mends the hull aboard instead: campPanelAs)
      { id: 'blink', blink: 1, when: 'blink', label: 'Warp blink ahead', help: 'Warp blink hop (needs that tech)' },
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
  help: { k: 'H', codes: ['KeyH'] }, mute: { k: 'M', codes: ['KeyM'] }, pause: { k: 'Esc', codes: ['Escape'] }
};
const campKeyCodes = id => (CAMP_KEYS[id] || { codes: [] }).codes;
const campKeyIs = (id, code) => campKeyCodes(id).indexOf(code) >= 0;
// the rows the H page and Settings list for the two lists: each list's key and what is in it (the list itself names every row when it is open), then the keys every open list shares
function campPanelKeyRows() {
  const sub = 'THE TWO LISTS', inIt = { fleet: 'launch, attack, convoy', ship: 'autopilot, dock, shield' };
  return CAMP_PANELS.panels.map(p => ({ k: [p.key], t: p.title.charAt(0) + p.title.slice(1).toLowerCase() + ': ' + inIt[p.id], sub })).concat([
    { k: [CAMP_KEYS.up.k, CAMP_KEYS.down.k], t: 'In a list: move the highlight', sub }, { k: [CAMP_KEYS.pick.k], t: 'In a list: give the order', sub }, { k: [CAMP_KEYS.pause.k], t: 'Close the list (its own key too)', sub }]);
}

// the keys as the hints say them, ALL read from the tables above: a remap is one change here and every text follows.
//   campKeyVar(name)   a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know):
//                      {fleetkey} {shipkey} the key that opens a list (its id + "key");   {keymap} {keyfly} {keymissile} {keyshields} ... a direct key of CAMP_KEYS ("key" + its id);
//                      {rowlaunch} {rowdock} ... the words of a row of a list ("row" + its id), for "Press {fleetkey}, pick {rowlaunch}";   {panels} where the two lists are;   '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(panel) the key cap of a list as the briefing's boxes draw it: ['Q'] for 'fleet'; [] when there is no such list
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) { const r = p.rows.find(x => x.id === id); if (r) return r; }
  return null;
}
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return CAMP_PANELS.panels.map(p => p.key + ' opens ' + p.name).join(', ');
  let m = /^([a-z]+)key$/.exec(name);
  if (m) { const p = CAMP_PANELS.panels.find(q => q.id === m[1]); return p ? p.key : ''; }
  m = /^row([a-z]+)$/.exec(name);
  if (m) { const r = campKeyRow(m[1]); return r ? r.label : ''; }
  m = /^key([a-z]+)$/.exec(name);
  if (m) { const k = CAMP_KEYS[m[1]]; return k ? k.k : ''; }
  return '';
}
function campKeyCaps(panelId) { const p = CAMP_PANELS.panels.find(q => q.id === panelId); return p ? [p.key] : []; }

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
    { k: ['Up', 'Down'], t: 'A pilot calls: pick an answer; Enter', sub: 'A PILOT\'S CALL' }, // the call's small list has the arrows and Enter while no Q or P list is open (src/camporderdraw.js)
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
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ON A CARD' },
    { k: ['R'], t: 'Pause card: restart the mission', sub: 'ON A CARD' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ON A CARD' },
    { k: ['1-3'], t: 'Tech card: pick a technology', sub: 'ON A CARD' }, // after a level, not in flight
    { k: ['4', '5'], t: 'Refit card: buy a fighter or escort', sub: 'ON A CARD' }
  ] },
  { id: 'panels', title: 'LISTS', scene: 'Campaign', rows: campPanelKeyRows() }, // the Campaign's two lists, made from CAMP_PANELS above (the H page puts them first)
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

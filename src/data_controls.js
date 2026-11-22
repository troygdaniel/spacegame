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
// ---------- the Campaign's two hands (card space-game-two-hands-keys; Troy, 21 Nov 2026: "just build it") ----------
// LEFT hand and the LEFT panel are the FLEET and its target; RIGHT hand and the RIGHT panel are the SHIP. Both panels are on the screen all the time, small, at the edges, and every row shows its key: one key is one order (nothing is opened, then picked).
//   FLEET (left):  1 launch or recall the wing (a toggle: it launches while ships wait in the bay, else it recalls)   2 attack the target   3 escort the convoy   4 guard the cruiser   W mine ore   E the next stance   R the next convoy order
//                  Q the next page of the panel (the stances, then the convoy orders: on those pages the digits pick a row, and the panel goes back to its first page after CAMP_PANELS.back ms or a pick)   A D the last or next target   S the nearest threat   X clears it
//   SHIP (right):  7 fly to the goal   8 fly to the target   9 a fast burn to the goal   0 dock (build, mend; aboard where the level has no outpost, it mends)   J K L a pip of power to the shields, the engines, the weapons   ; balance   U emergency shields
//                  Enter a missile at the target   I the warp blink   P the next page of the panel (BUILD: 7 a fighter, 8 an escort)   Arrows fly (Up thrust, Left and Right turn, Down brake)   Space the turrets   - and = zoom, Backspace resets it
//   EITHER hand:   1 2 3 answer a pilot's call (the FLEET panel shows the call in place of its rows)   Tab the map (in it A and D step the marks, 7 flies there, 9 burns there, Esc or Tab closes)   / types an order   . talks   H keys   M mute   Esc pause
//   ONE TARGET for everything: A, D and S pick it (the hostiles, nearest first); 2 attacks it, 8 flies to it, Enter fires at it; a bracket marks it on the screen and its name is in the FLEET panel.
// THE LETTERS ARE THIS TABLE'S ONLY. Every hint that names a key (the briefing's key boxes, the nudges, the dock hint, the help lines, the pause card, the H page, the model's prompt) reads it from here (campKeyVar below, the {keylaunch} {fleetkey} ... placeholders of the texts),
// so moving an order to another key is one change in this table, and src/camppanel.js, src/campaignscene.js and src/campanelsdraw.js read the table for what the keys DO. This file is the one source of the panels, their rows, their keys and their words; tests/campanels.mjs and tests/controlshelp.mjs check the game against it.
//   panel:  { id, side, key, code, title, rows, page2, page3 }   side 'left' or 'right'; key and code (a KeyboardEvent.code) are the PAGE key of the panel; page2 and page3 are the lists the page key flips to ({ title, rows })
//   row:    { n, id, k, code, order, arg, fly, label, tag, help }   n is the row's place in its list (1 is at the top); k is the key cap the panel shows and the hints say, code its KeyboardEvent.code (a digit's also answers to the keypad's);
//           order is a campOrder name (src/campaign.js: the words the strip and the voice use; arg goes with it); fly: 'objective' or 'target' is the autopilot (src/campnav.js), not an order; burn: 1 makes it a fast burn; cycle: 'stance' or 'convoy' steps through that page's rows;
//           blink: 1 is the warp blink; label is the row's name, tag its name in one line, help its line on the H page and in Settings
const CAMP_PANELS = {
  pages: 3,                                // how many pages a panel with more than one shows: FLEET has its orders, its stances (page2) and the convoy orders (page3); SHIP has its keys and BUILD (page2). 1 turns the page key off
  back: 6000,                              // ms a panel left on another page goes back to its first one
  anim: { flash: 160 },                    // ms: a row lights up (two pulses) when its key is pressed
  panels: [
    { id: 'fleet', side: 'left', key: 'Q', code: 'KeyQ', title: 'FLEET', rows: [
      { n: 1, id: 'launch', k: '1', code: 'Digit1', order: 'launch', label: 'Launch or recall the wing', tag: 'Launch / recall', help: 'Launch the wing, or recall it' }, // launch while ships wait in the bay, else recall (campPanelAs): the row says which
      { n: 2, id: 'attack', k: '2', code: 'Digit2', order: 'attack', label: 'Attack the target', tag: 'Attack', help: 'Fighters attack the target' }, // the target of A D S; none picked: the nearest enemy, as the order always was
      { n: 3, id: 'escort', k: '3', code: 'Digit3', order: 'escort', label: 'Escort the convoy', tag: 'Escort', help: 'Escorts go to the convoy' },
      { n: 4, id: 'guard', k: '4', code: 'Digit4', order: 'guard', label: 'Guard the cruiser', tag: 'Guard', help: 'The wing guards the cruiser' },
      { n: 5, id: 'mine', k: 'W', code: 'KeyW', order: 'mine', label: 'Mine ore', tag: 'Mine ore', help: 'The wing goes and mines ore' },
      { n: 6, id: 'stance', k: 'E', code: 'KeyE', cycle: 'stance', label: 'Stance', tag: 'Stance', help: 'Next stance: how the wing fights' },
      { n: 7, id: 'convoy', k: 'R', code: 'KeyR', cycle: 'convoy', label: 'Convoy order', tag: 'Convoy', help: 'Next convoy order' }
    ], page2: { title: 'STANCES', rows: [ // the second page (the page key flips to it): how Attack and Guard move; the current one is marked; E steps through them from any page
      { n: 1, id: 'free', k: '1', code: 'Digit1', order: 'stance', arg: 'free', label: 'Free', help: 'The wing fights its own way' },
      { n: 2, id: 'orbit', k: '2', code: 'Digit2', order: 'stance', arg: 'orbit', label: 'Orbit', help: 'Circle the target, firing' },
      { n: 3, id: 'keep', k: '3', code: 'Digit3', order: 'stance', arg: 'keep distance', label: 'Keep distance', help: 'Stand off from the target' },
      { n: 4, id: 'match', k: '4', code: 'Digit4', order: 'stance', arg: 'match speed', label: 'Match speed', help: 'Fly beside the carrier' },
      { n: 5, id: 'hold', k: '5', code: 'Digit5', order: 'stance', arg: 'hold position', label: 'Hold position', help: 'Stay put, fire at what comes' }
    ] }, page3: { title: 'CONVOY', rows: [ // the third page (card space-game-convoy-orders; src/campconvoy.js): orders for the escorted ships; R steps through them from any page. Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { n: 1, id: 'ctuck', k: '1', code: 'Digit1', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy ships fly in the cruiser\'s shield' },
      { n: 2, id: 'chold', k: '2', code: 'Digit2', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy ships stop and wait' },
      { n: 3, id: 'crun', k: '3', code: 'Digit3', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy ships run, with no cover' },
      { n: 4, id: 'ccarry', k: '4', code: 'Digit4', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy ships go their own way' }
    ] } },
    { id: 'ship', side: 'right', key: 'P', code: 'KeyP', title: 'SHIP', rows: [
      { n: 1, id: 'goal', k: '7', code: 'Digit7', fly: 'objective', label: 'Fly to the goal', tag: 'Fly to goal', help: 'Autopilot to the objective' },
      { n: 2, id: 'target', k: '8', code: 'Digit8', fly: 'target', label: 'Fly to the target', tag: 'Fly to target', help: 'Autopilot to the target (Shift: fast)', fast: 'Autopilot to the target (Shift: fast)' }, // Shift with the key is a burn, which needs the wing aboard (card space-game-campaign-fast-board)
      { n: 3, id: 'burn', k: '9', code: 'Digit9', fly: 'objective', burn: 1, label: 'Fast burn to the goal', tag: 'Fast burn', help: 'A fast burn to the objective' },
      { n: 4, id: 'dock', k: '0', code: 'Digit0', order: 'dock', label: 'Dock at an outpost', tag: 'Dock', help: 'Dock at a friendly outpost' }, // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room (a level with no outpost mends the hull aboard instead)
      { n: 5, id: 'shields', k: 'J', code: 'KeyJ', order: 'power', arg: 'shields', label: 'Shields +', help: 'A pip to the shields' }, // the ship's power (card space-game-campaign-systems; docs/CAMPAIGN.md "Ship systems"), the dials' order
      { n: 6, id: 'engines', k: 'K', code: 'KeyK', order: 'power', arg: 'engines', label: 'Engines +', help: 'A pip to the engines' },
      { n: 7, id: 'weapons', k: 'L', code: 'KeyL', order: 'power', arg: 'weapons', label: 'Weapons +', help: 'A pip to the weapons' },
      { n: 8, id: 'balance', k: ';', code: 'Semicolon', order: 'balance', label: 'Balance the power', tag: 'Balance', help: 'Back to 2 / 2 / 2' },
      { n: 9, id: 'emergency', k: 'U', code: 'KeyU', order: 'emergency', label: 'Emergency shields', tag: 'Emergency', help: 'Shields get 4 pips for 10 s' }, // the letter above J, the shields' key
      { n: 10, id: 'missile', k: 'Enter', code: 'Enter', order: 'missiles', label: 'Missile at the target', tag: 'Missile', help: 'Fire a homing missile at the target' }, // Enter also answers the keypad's
      { n: 11, id: 'blink', k: 'I', code: 'KeyI', blink: 1, label: 'Warp blink', tag: 'Blink', help: 'Warp blink hop (needs that tech)' }
    ], page2: { title: 'BUILD', rows: [ // the second page: new ships (they are built docked, or aboard in a level with no outpost: the order says); the digits pick a row here, and the panel goes back to its first page
      { n: 1, id: 'buildf', k: '7', code: 'Digit7', order: 'build', arg: 'fighter', label: 'Build a fighter', tag: 'New fighter', help: 'Build a fighter (costs ore)' },
      { n: 2, id: 'builde', k: '8', code: 'Digit8', order: 'build', arg: 'escort', label: 'Build an escort', tag: 'New escort', help: 'Build an escort (costs ore)' }
    ] } }
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words under the row's name; {need} and {have} are ore
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', noescorts: 'no escorts out', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', buildfull: 'no room in the bay', what: 'cannot do that now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', nodock: 'Dock at an outpost to build.', norepair: 'Dock at an outpost to repair.', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s',
    notarget: 'pick a target first', nomissiles: 'no missiles left', missilewait: 'the launcher is reloading', range: 'out of missile range', nobig: 'nothing in reach', noblink: 'needs the warp tech' },
  // the same, a word or two, for the one-line rows of the panels (card space-game-campaign-panels-ui); tag, on a row, is its name in one line (label when there is none)
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'launching', baydry: 'all out', nofighters: 'none out', noescorts: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', buildfull: 'bay full', what: 'not now',
    nogoal: 'no goal', there: 'there', nodock: 'dock first', norepair: 'dock first', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s',
    notarget: 'no target', nomissiles: 'none left', missilewait: 'reloading', range: 'too far', nobig: 'none near', noblink: 'no tech' }
};
// the keys of the Campaign that are not rows of a panel (the scene reads the codes here; a hint names the cap): { k: the cap or caps a hint prints, codes: the KeyboardEvent.codes that do it }
const CAMP_KEYS = {
  fly: { k: 'Arrows', codes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },    // thrust, brake, turn (the arrows only: W A S D are the fleet's and the targets')
  fire: { k: 'Space', codes: ['Space'] },                                              // hold: the turrets fire at ships in reach
  map: { k: 'Tab', codes: ['Tab'] },                                                   // open and close the map (src/campmap.js CAMPMAP.key says the same)
  next: { k: 'D', codes: ['KeyD'] }, last: { k: 'A', codes: ['KeyA'] },               // the next and the last target (in the map: the next and the last mark)
  near: { k: 'S', codes: ['KeyS'] }, clear: { k: 'X', codes: ['KeyX'] },              // the nearest threat; clear the target
  zoomin: { k: '=', codes: ['Equal', 'NumpadAdd'] }, zoomout: { k: '-', codes: ['Minus', 'NumpadSubtract'] }, zoomreset: { k: 'Backspace', codes: ['Backspace'] }, // src/campzoom.js reads these codes
  strip: { k: '/', codes: ['Slash'] }, voice: { k: '.', codes: ['Period'] },          // type an order, hold to speak one (src/cmdstrip.js, src/shipcomputer.js, src/listen.js read these in the Campaign)
  help: { k: 'H', codes: ['KeyH'] }, mute: { k: 'M', codes: ['KeyM'] }, pause: { k: 'Esc', codes: ['Escape'] }
};
const campKeyCodes = id => (CAMP_KEYS[id] || { codes: [] }).codes;
// the codes of a row (a digit's also answers to the keypad's, and Enter to the keypad's Enter)
const campRowCodes = r => (/^Digit\d$/.test(r.code) ? [r.code, 'Numpad' + r.code.slice(5)] : r.code === 'Enter' ? ['Enter', 'NumpadEnter'] : [r.code]);
// the rows the H page and Settings list for the panels: the panel's page key, then each row's key under the panel's heading, in the table's order
function campPanelKeyRows() {
  const cap = (p, h) => p.title.charAt(0) + p.title.slice(1).toLowerCase() + ': ' + h.charAt(0).toLowerCase() + h.slice(1), sub = p => 'THE ' + p.title + ' PANEL (' + (p.side === 'left' ? 'LEFT' : 'RIGHT') + ' HAND)';
  return CAMP_PANELS.panels.flatMap(p => p.rows.map(r => ({ k: [r.k], t: cap(p, r.fast || r.help), sub: sub(p) })).concat(CAMP_PANELS.pages > 1 && p.page2 ? [{ k: [p.key], t: cap(p, 'next page: ' + [p.page2, CAMP_PANELS.pages > 2 ? p.page3 : null].filter(Boolean).map(x => x.title.toLowerCase()).join(', ')), sub: sub(p) }] : []));
}

// the keys as the hints say them, ALL read from the tables above: a remap (an order on another key) is one change here and every text follows.
//   campKeyVar(name)         a {placeholder} of a text (contentFill, src/contenttables.js, asks for the names it does not know): {keylaunch} {keyattack} {keymine} {keydock} {keyemergency} ... the key cap of a row ("key" + the row's id, any page),
//                            {fleetkey} {shipkey} a panel's page key (its id + "key"), {keymap} {keyfly} {keyfire} {keynext} ... a key of CAMP_KEYS ("key" + its id), {panels} the two panels' words ("FLEET at the left, SHIP at the right"); '' when the name is none of these (the text keeps its braces)
//   campKeyCaps(panel, row)  the key caps of a row as the briefing's boxes draw them: ['1'] for ('fleet', 'launch'); [] when there is no such row
function campKeyRow(id) {
  for (const p of CAMP_PANELS.panels) for (const list of [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows]) { const r = list && list.find(x => x.id === id); if (r) return r; }
  return null;
}
function campKeyVar(name) {
  if (typeof CAMP_PANELS !== 'object' || !CAMP_PANELS) return '';
  if (name === 'panels') return 'FLEET at the left, SHIP at the right';
  let m = /^([a-z]+)key$/.exec(name);
  if (m) { const p = CAMP_PANELS.panels.find(q => q.id === m[1]); return p ? p.key : ''; }
  m = /^key([a-z]+)$/.exec(name);
  if (m) { const r = campKeyRow(m[1]); if (r) return r.k; const k = CAMP_KEYS[m[1]]; return k ? k.k : ''; }
  return '';
}
function campKeyCaps(panelId, rowId) {
  const p = CAMP_PANELS.panels.find(q => q.id === panelId), r = p && [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows].filter(Boolean).flat().find(x => x.id === rowId);
  return p && r ? [r.k] : [];
}

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
  { id: 'campaign', title: 'CAMPAIGN', scene: 'Campaign', rows: [ // the Campaign's H page (src/campkeys.js) is these rows under their sub headings, the debug keys after them; the PANELS group after it is made from CAMP_PANELS above (the two panels' keys), the codes of these from CAMP_KEYS. A line is the caps and at most 36 characters (Settings fits four columns). tests/controlshelp.mjs fails when a key the Campaign binds is not here
    { k: ['Arrows'], t: 'Thrust, brake, turn (the ship flies)', sub: 'FLY AND FIRE' },
    { k: ['Space'], t: 'Hold: turrets fire at ships in reach', sub: 'FLY AND FIRE' },
    { k: ['-', '='], t: 'Zoom out, in; Backspace resets', sub: 'FLY AND FIRE' },
    { k: ['Shift'], t: 'With 8, 7 or Enter: a fast burn', sub: 'FLY AND FIRE' }, // Shift with the target's key (8) is a burn to it; a burn needs the wing aboard (card space-game-campaign-fast-board) // - and the wheel go out to the whole system on the map; = and the keypad's + and - too; Backspace is the reset (src/campzoom.js: all three from CAMP_KEYS)
    { k: ['A', 'D'], t: 'Last or next target (nearest first)', sub: 'THE TARGET' }, // ONE target for everything: 2 attacks it, 8 flies to it, Enter fires at it
    { k: ['S', 'X'], t: 'S the nearest threat, X clears it', sub: 'THE TARGET' },
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['A', 'D'], t: 'Map: last or next mark (arrows too)', sub: 'THE MAP' },
    { k: ['7', '9', 'Enter'], t: 'Map: 7 or Enter flies, 9 burns', sub: 'THE MAP' }, // (Shift+Enter is a burn too)
    { k: ['V', 'T'], t: 'Map: V scouts there, T takes a lane', sub: 'THE MAP' }, // T is the pick at a fork in the road (card space-game-scout-route)
    { k: ['X'], t: 'Map: X clears the goal', sub: 'THE MAP' },
    { k: ['/'], t: 'Type an order to the ship', sub: 'THE STRIP AND THE VOICE' },
    { k: ['.'], t: 'Hold to speak an order', sub: 'THE STRIP AND THE VOICE' },
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Pause; closes the map', sub: 'ANYWHERE' },
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ANYWHERE' },
    { k: ['R'], t: 'Pause: restart the mission', sub: 'ANYWHERE' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ANYWHERE' },
    { k: ['1-3'], t: 'Answer a pilot\'s call; pick a tech', sub: 'ANYWHERE' }, // 1 2 3 answer a pilot's call for orders while one waits (src/camporders.js), and pick the salvaged tech after a level
    { k: ['4', '5'], t: 'Refit card: buy a fighter or escort', sub: 'ANYWHERE' },
    { k: ['M'], t: 'Mute sound', sub: 'ANYWHERE' }
  ] },
  { id: 'panels', title: 'PANELS', scene: 'Campaign', rows: campPanelKeyRows() }, // the Campaign's two panels, made from CAMP_PANELS above (the H page puts them first)
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

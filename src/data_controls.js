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
// ---------- the Campaign's keyboard panels (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// The digits are not orders any more: key 1 opens the FLEET panel at the left, key 2 the SHIP panel at the right, and the digit of a row does it (1 then 3 is "escort"). This table is the one source of the panels,
// their rows, their keys and their words: src/camppanel.js reads it for what a row does and whether it can be done now, src/campkeys.js and the settings tab draw the keys from it (campPanelKeyRows below), the key line
// and the pause card name the panels from it, and tests/campanels.mjs and tests/controlshelp.mjs check the game against it. A later card (ranks, hub, chatter) adds a row, or the centre panel, by data here.
//   panel:  { key, id, side, title, rows }   key is the digit that opens it; side 'left' or 'right'; title is its heading and the word of the key line
//   row:    { n, id, order, arg, fly, label, help }   n is the digit that picks it (1 to 5); order is a campOrder name (src/campaign.js: the same words the strip and the voice use; arg goes with it);
//           fly: 'objective' is the autopilot to the goal (src/campnav.js) and not an order; label is the row's name on the panel, help its line on the H page and in Settings
//   key 3 is RESERVED: a centre panel for a later card. It is bound to nothing now (and no digit from 4 to 9 is), and the panels replace the old direct digit keys of the Campaign.
const CAMP_PANELS = {
  pages: 3,                                // how many pages a panel with more than one shows: 3 (cards space-game-wrapup-stance-page and space-game-convoy-orders): the arrows flip FLEET between its orders, its stances (page2) and the orders for the escorted ships (page3), the page is drawn, the one in force is marked; 2 leaves the convoy page out, 1 turns the flip off
  delay: 0,                                // ms a panel waits before it is drawn: none (it was 250 when a digit opened it; Q and E open it now and it comes up at once). A pick made before the list has dropped in (fadeIn) pulses the tab instead of flashing a row
  anim: { fadeIn: 120, fadeOut: 100, flash: 160, pulse: 240 }, // ms (card space-game-campaign-panels-ui): the list dropping in under its tab, going away, the chosen row's flash (two pulses) before the panel collapses, and the tab's one pulse when the pick came before the list was in
  panels: [
    { key: 'Q', code: 'KeyQ', id: 'fleet', side: 'left', title: 'FLEET', rows: [
      { n: 1, id: 'launch', order: 'launch', label: 'Launch', help: 'Launch the wing' },
      { n: 2, id: 'attack', order: 'attack', label: 'Attack', help: 'Fighters attack the enemy' },
      { n: 3, id: 'escort', order: 'escort', label: 'Escort', help: 'Escorts go to a convoy' }, // the row to be called "Escort / match speed" when the panels are redrawn: that label does not fit the column of the panel as drawn today
      { n: 4, id: 'guard', order: 'guard', label: 'Guard', help: 'The wing guards the carrier' },
      { n: 5, id: 'recall', order: 'recall', label: 'Recall', help: 'The wing flies home' }
    ], page2: { title: 'STANCES', rows: [ // the second page of the FLEET panel (the arrows flip it): how Attack and Guard move; the current one is marked
      { n: 1, id: 'free', order: 'stance', arg: 'free', label: 'Free', help: 'The wing fights its own way' },
      { n: 2, id: 'orbit', order: 'stance', arg: 'orbit', label: 'Orbit', help: 'Circle the target, firing' },
      { n: 3, id: 'keep', order: 'stance', arg: 'keep distance', label: 'Keep distance', help: 'Stand off from the target' },
      { n: 4, id: 'match', order: 'stance', arg: 'match speed', label: 'Match speed', help: 'Fly beside the carrier' },
      { n: 5, id: 'hold', order: 'stance', arg: 'hold position', label: 'Hold position', help: 'Stay put, fire at what comes' }
    ] }, page3: { title: 'CONVOY', rows: [ // the third page (card space-game-convoy-orders; src/campconvoy.js): orders for the escorted ships, the transport, the haulers and the miners; the one in force is marked. Voice and the strip: "tuck in", "run for it", "carry on", "haulers hold"
      { n: 1, id: 'ctuck', order: 'convoy', arg: 'tuck in', label: 'Tuck in', help: 'Convoy ships fly in the cruiser\'s shield' },
      { n: 2, id: 'chold', order: 'convoy', arg: 'hold here', label: 'Hold here', help: 'Convoy ships stop and wait' },
      { n: 3, id: 'crun', order: 'convoy', arg: 'run for it', label: 'Run for it', help: 'Convoy ships run, with no cover' },
      { n: 4, id: 'ccarry', order: 'convoy', arg: 'carry on', label: 'Carry on', help: 'Convoy ships go their own way' }
    ] } },
    { key: 'E', code: 'KeyE', id: 'ship', side: 'right', title: 'SHIP', rows: [
      { n: 1, id: 'mine', order: 'mine', label: 'Mine ore', help: 'The wing goes and mines ore' },
      { n: 2, id: 'buildf', order: 'build', arg: 'fighter', label: 'Build a fighter', tag: 'New fighter', help: 'Build a fighter (costs ore)' },
      { n: 3, id: 'builde', order: 'build', arg: 'escort', label: 'Build an escort', tag: 'New escort', help: 'Build an escort (costs ore)' },
      { n: 4, id: 'goal', fly: 'objective', label: 'Fly to the objective', tag: 'Fly to goal', help: 'Autopilot to the objective', fast: 'Autopilot (Shift: fast)' }, // fast: Shift with the digit is a burn, which needs the wing aboard (card space-game-campaign-fast-board)
      { n: 5, id: 'dock', order: 'dock', label: 'Dock at an outpost', tag: 'Dock', help: 'Dock at a friendly outpost' } // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room (E then 5)
    ] },
    { key: 'C', code: 'KeyC', id: 'systems', side: 'left', slot: 1, title: 'SYSTEMS', rows: [ // the ship's power (card space-game-campaign-systems; docs/CAMPAIGN.md "Ship systems"): a letter key, as the tabs of the panels card; a row's digit moves a pip
      { n: 1, id: 'weapons', order: 'power', arg: 'weapons', label: 'Weapons +', help: 'A pip to the weapons' },
      { n: 2, id: 'shields', order: 'power', arg: 'shields', label: 'Shields +', help: 'A pip to the shields' },
      { n: 3, id: 'engines', order: 'power', arg: 'engines', label: 'Engines +', help: 'A pip to the engines' },
      { n: 4, id: 'balance', order: 'balance', label: 'Balance', help: 'Back to 2 / 2 / 2' },
      { n: 5, id: 'emergency', order: 'emergency', label: 'Emergency shields', tag: 'Emergency', help: 'Shields get 4 pips for 10 s' }
    ] }
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words under the row's name; {need} and {have} are ore
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', noescorts: 'no escorts out', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', noearth: 'no Earth here', buildfull: 'no room in the bay', what: 'cannot do that now',
    cnone: 'no escorted ships', cwhat: 'cannot do that now', nogoal: 'no objective', there: 'you are there', nodock: 'Dock at an outpost to build.', norepair: 'Dock at an outpost to repair.', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound', powermax: 'at full power', powernone: 'no power to take', powerwhat: 'which system?', locked: 'running: the power is held', cooling: 'ready in {s} s' },
  // the same, a word or two, for the one-line rows of the panels (card space-game-campaign-panels-ui); tag, on a row, is its name in one line (label when there is none)
  shortWhy: { over: 'over', bay: 'bay empty', launching: 'launching', baydry: 'all out', nofighters: 'none out', noescorts: 'none out', noconvoy: 'no convoy', nowing: 'none out', cnone: 'no convoy', cwhat: 'not now',
    noore: 'no ore near', noore2: 'needs {need} ore', noearth: 'no Earth', buildfull: 'bay full', what: 'not now',
    nogoal: 'no goal', there: 'there', nodock: 'dock first', norepair: 'dock first', docked: 'docked', noposts: 'no outpost', whichpost: 'no post', farpost: 'too far', hotdock: 'foes near', hullfull: 'hull sound', powermax: 'at full', powernone: 'none free', powerwhat: 'which?', locked: 'held', cooling: '{s} s' }
};
// the rows the H page and Settings list for the panels: the panel's key (Q, E, C), then the row's digit, under the panel's heading, in the table's order
function campPanelKeyRows() {
  const cap = (p, h) => p.title.charAt(0) + p.title.slice(1).toLowerCase() + ': ' + h.charAt(0).toLowerCase() + h.slice(1), sub = p => 'KEY ' + p.key + '  -  THE ' + p.title + ' PANEL';
  return CAMP_PANELS.panels.flatMap(p => [{ k: [p.key], t: cap(p, 'open the panel (again closes it)'), sub: sub(p) }].concat(p.rows.map(r => ({ k: [p.key, String(r.n)], t: cap(p, r.fast || r.help), sub: sub(p) }))).concat(CAMP_PANELS.pages > 1 && p.page2 ? [{ k: [p.key, '\u2190', '\u2192'], t: cap(p, 'flip: ' + [p.page2, CAMP_PANELS.pages > 2 ? p.page3 : null].filter(Boolean).map(x => x.title.toLowerCase()).join(', ') + ' (1-5)'), sub: sub(p) }] : [])); // a panel with a second page lists one more line, in its own group: the arrows flip it (the stances are on the page, not on the keys page: it has no room for five lines more)
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
  { id: 'campaign', title: 'CAMPAIGN', scene: 'Campaign', rows: [ // the Campaign's H page (src/campkeys.js) is these rows under their sub headings, the debug keys after them; the PANELS group after it is made from CAMP_PANELS above. A line is the caps and at most 36 characters (Settings fits four columns). tests/controlshelp.mjs fails when a key the Campaign binds is not here
    { k: ['W', 'A', 'S', 'D'], t: 'Thrust, turn, brake (arrows too)', sub: 'FLY AND FIRE' },
    { k: ['Space'], t: 'Hold: turrets fire at ships in reach', sub: 'FLY AND FIRE' },
    { k: ['F'], t: 'Fire a homing missile', sub: 'FLY AND FIRE' },
    { k: ['B'], t: 'Warp blink hop (needs that tech)', sub: 'FLY AND FIRE' },
    { k: ['J', 'K', 'L'], t: 'A power pip: shields, engines, weapons', sub: 'FLY AND FIRE' }, // direct keys, in the order of the gauges, for the SYSTEMS panel's rows (src/camphud.js campPowerKey; card space-game-systems-gauges)
    { k: ['+', '-', '0'], t: 'Zoom view or map (wheel too); 0 resets', sub: 'FLY AND FIRE' }, // = and the numpad keys too (src/campzoom.js)
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click a mark sets it, again flies', sub: 'THE MAP' },
    { k: ['W', 'S', 'A', 'D'], t: 'Map list: choose; next or last group', sub: 'THE MAP' }, // two rows in one: the page is at the size the controls panel fits (tests/controlsfit.mjs)
    { k: ['Shift', 'Enter'], t: 'Map: Enter flies, Shift+Enter fast', sub: 'THE MAP' }, // (the Enter and Shift+Enter rows were one too many for Settings' four columns once E docked)
    { k: ['V'], t: 'Map: send a scout there', sub: 'THE MAP' },
    { k: ['X', 'Z'], t: 'Map: X clears the goal, Z zooms', sub: 'THE MAP' }, // two rows in one (the Campaign group is at the size Settings > Controls fits: tests/controlsfit.mjs)
    { k: ['I'], t: 'Type an order to the ship', sub: 'THE STRIP AND THE VOICE' },
    { k: ['U'], t: 'Hold to speak an order', sub: 'THE STRIP AND THE VOICE' },
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Pause; closes the map or a panel', sub: 'ANYWHERE' },
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ANYWHERE' },
    { k: ['R'], t: 'Pause: restart the mission', sub: 'ANYWHERE' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ANYWHERE' },
    { k: ['1-3'], t: 'Pick a salvaged tech after a level', sub: 'ANYWHERE' },
    { k: ['4', '5'], t: 'Refit card: buy a fighter or escort', sub: 'ANYWHERE' },
    { k: ['M', 'P'], t: 'Mute sound; P: battle pace', sub: 'ANYWHERE' }
  ] },
  { id: 'panels', title: 'PANELS', scene: 'Campaign', rows: campPanelKeyRows() }, // the Campaign's two panels, made from CAMP_PANELS above (the H page puts them first)
  { id: 'readyroom', title: 'READY ROOM', scene: 'CampHub', rows: [ // the ready room between missions (src/camphub.js keys, src/camphubscene.js); the Campaign's H page lists them last, and H opens it in the room
    { k: ['1-5'], t: 'Pick a row: board, briefing ...', sub: 'THE READY ROOM' },
    { k: ['W', 'S'], t: 'Move between the rows (arrows too)', sub: 'THE READY ROOM' },
    { k: ['Enter'], t: 'On to the next row (Board: briefing)', sub: 'THE READY ROOM' },
    { k: ['L'], t: 'Launch the mission, or the replay', sub: 'THE READY ROOM' },
    { k: ['A', 'D'], t: 'Board: choose a mission', sub: 'THE READY ROOM' },
    { k: ['R'], t: 'Board: pick it, open its briefing', sub: 'THE READY ROOM' },
    { k: ['X'], t: 'Board: back to the next mission', sub: 'THE READY ROOM' },
    { k: ['F', 'E'], t: 'Refit: buy a fighter or an escort', sub: 'THE READY ROOM' },
    { k: ['U'], t: 'Refit: fit the Fabricator', sub: 'THE READY ROOM' },
    { k: ['Backspace'], t: 'Refit: give the last one back', sub: 'THE READY ROOM' },
    { k: ['H'], t: 'This page of keys', sub: 'THE READY ROOM' },
    { k: ['Esc'], t: 'Leave for the title (T too)', sub: 'THE READY ROOM' },
    { k: ['Enter', 'Right'], t: 'Briefing: next screen, then launch', sub: 'THE BRIEFING' }, // the big briefing (src/campbriefdraw.js), opened from the board: three screens (where and why, what to do, how); Enter on the last one launches
    { k: ['Left'], t: 'Briefing: back a screen', sub: 'THE BRIEFING' },
    { k: ['L'], t: 'Briefing: launch the mission now', sub: 'THE BRIEFING' },
    { k: ['Esc'], t: 'Briefing: back to the board', sub: 'THE BRIEFING' },
    { k: ['+', '-', '0'], t: 'Briefing map: zoom (wheel too)', sub: 'THE BRIEFING' },
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

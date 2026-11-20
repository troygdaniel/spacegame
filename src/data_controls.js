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
  delay: 250,                              // ms a panel waits before it is drawn: for a fast typist "1 then 3" never flashes it (the pick works whether or not the panel has been drawn)
  panels: [
    { key: '1', id: 'fleet', side: 'left', title: 'FLEET', rows: [
      { n: 1, id: 'launch', order: 'launch', label: 'Launch', help: 'Launch the wing' },
      { n: 2, id: 'attack', order: 'attack', label: 'Attack', help: 'Fighters attack the aliens' },
      { n: 3, id: 'escort', order: 'escort', label: 'Escort', help: 'Escorts go to a convoy' },
      { n: 4, id: 'guard', order: 'guard', label: 'Guard', help: 'The wing guards the carrier' },
      { n: 5, id: 'recall', order: 'recall', label: 'Recall', help: 'The wing flies home' }
    ] },
    { key: '2', id: 'ship', side: 'right', title: 'SHIP', rows: [
      { n: 1, id: 'mine', order: 'mine', label: 'Mine ore', help: 'The wing goes and mines ore' },
      { n: 2, id: 'recharge', order: 'recharge', label: 'Recharge shields', help: 'Recharge a shield (costs ore)' },
      { n: 3, id: 'buildf', order: 'build', arg: 'fighter', label: 'Build a fighter', help: 'Build a fighter (costs ore)' },
      { n: 4, id: 'builde', order: 'build', arg: 'escort', label: 'Build an escort', help: 'Build an escort (costs ore)' },
      { n: 5, id: 'goal', fly: 'objective', label: 'Fly to the objective', help: 'Autopilot to the objective', fast: 'Autopilot there fast (wing aboard)' }, // fast: Shift with the digit is a burn, which needs the wing aboard (card space-game-campaign-fast-board)
      { n: 6, id: 'dock', order: 'dock', label: 'Dock at an outpost', help: 'Dock at a friendly outpost (E)' } // ships are built and the hull mended only docked (card space-game-campaign-outposts); docking opens the ready room
    ] }
  ],
  // why a row cannot be done now, in a few plain words: the code of the game's own refusal (campNo in src/campaign.js) to the words under the row's name; {need} and {have} are ore
  why: { over: 'the battle is over', bay: 'the bay is empty', launching: 'still launching', baydry: 'all of it is out', nofighters: 'no fighters out', noescorts: 'no escorts out', noconvoy: 'no convoy to escort', nowing: 'no ships out',
    noore: 'no ore in reach', noore2: 'needs {need} ore', shieldfull: 'shield is full', earthfull: "Earth's shield is full", noearth: 'no Earth here', farearth: 'too far from Earth', buildfull: 'no room in the bay', what: 'cannot do that now',
    nogoal: 'no objective', there: 'you are there', nodock: 'Dock at an outpost to build.', norepair: 'Dock at an outpost to repair.', docked: 'already docked', noposts: 'no outpost here', whichpost: 'no such outpost', farpost: 'no outpost in range', hotdock: 'aliens too close', hullfull: 'the hull is sound' }
};
// the rows the H page and Settings list for the panels: the panel's key then the row's digit, under the panel's heading, in the table's order
function campPanelKeyRows() {
  const cap = (p, h) => p.title.charAt(0) + p.title.slice(1).toLowerCase() + ': ' + h.charAt(0).toLowerCase() + h.slice(1), sub = p => 'KEY ' + p.key + '  -  THE ' + p.title + ' PANEL';
  return CAMP_PANELS.panels.flatMap(p => p.rows.flatMap(r => [{ k: [p.key, String(r.n)], t: cap(p, r.help), sub: sub(p) }].concat(r.fast ? [{ k: [p.key, 'Shift', String(r.n)], t: cap(p, r.fast), sub: sub(p) }] : [])));
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
    { k: ['Q'], t: 'Warp blink hop (needs that tech)', sub: 'FLY AND FIRE' },
    { k: ['E'], t: 'Dock at the outpost in range', sub: 'FLY AND FIRE' },
    { k: ['+', '-', '0'], t: 'Zoom view or map (wheel too); 0 resets', sub: 'FLY AND FIRE' }, // = and the numpad keys too (src/campzoom.js)
    { k: ['Tab'], t: 'Open or close the map of the level', sub: 'THE MAP' },
    { k: ['Click'], t: 'Map: click sets a place, again flies', sub: 'THE MAP' },
    { k: ['W', 'S', 'A', 'D'], t: 'Map list: choose; next or last group', sub: 'THE MAP' }, // two rows in one: the page is at the size the controls panel fits (tests/controlsfit.mjs)
    { k: ['Shift', 'Enter'], t: 'Map: Enter flies, Shift+Enter fast', sub: 'THE MAP' }, // (the Enter and Shift+Enter rows were one too many for Settings' four columns once E docked)
    { k: ['X'], t: 'Map: clear the destination', sub: 'THE MAP' },
    { k: ['Z'], t: 'Map: the area, or the whole system', sub: 'THE MAP' },
    { k: ['I'], t: 'Type an order to the ship', sub: 'THE STRIP AND THE VOICE' },
    { k: ['U'], t: 'Hold to speak an order', sub: 'THE STRIP AND THE VOICE' },
    { k: ['H'], t: 'This page of keys', sub: 'ANYWHERE' },
    { k: ['Esc'], t: 'Pause; closes the map or a panel', sub: 'ANYWHERE' },
    { k: ['T'], t: 'Title, from the pause or end card', sub: 'ANYWHERE' },
    { k: ['R'], t: 'Pause: restart the mission', sub: 'ANYWHERE' },
    { k: ['Enter'], t: 'Cards: begin, continue, try again', sub: 'ANYWHERE' },
    { k: ['1-3'], t: 'Pick a salvaged tech after a level', sub: 'ANYWHERE' },
    { k: ['4', '5'], t: 'Refit card: buy a fighter or escort', sub: 'ANYWHERE' },
    { k: ['M'], t: 'Mute sound', sub: 'ANYWHERE' }
  ] },
  { id: 'panels', title: 'PANELS', scene: 'Campaign', rows: campPanelKeyRows() }, // the Campaign's two panels, made from CAMP_PANELS above (the H page puts them first)
  { id: 'title', title: 'TITLE', scene: null, rows: [
    { k: ['Any key'], t: 'Start the game' },
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

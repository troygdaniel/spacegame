// ---------- Controls: every key of the game in one table (card space-game-settings-screen) ----------
// Three places show keys and all three are built from this table, so they cannot drift apart:
//   the Settings screen (src/settings.js)   lists every group, one tab each
//   the H help page (HELP in src/meta.js)   the lines of the scene you are in, from controlsHelp()
//   the Ship bay's key panel (BAY_CONTROLS in src/shipmode.js)   the rows marked bay, in the order they stand here
// A group:  { id, title, scene, rows }   scene is the name of the scene whose H page lists it (null: not an H page)
// A row:    { k: ['W'], t: 'Thrust' }    k is the key caps (one or more), t says what the keys do
//           bay: 1    also in the Ship bay's list (twelve fit: eight of flight, then four of everywhere); bt is the short text it uses there
//           help: 0   left out of the H page (it is long enough)
// When a key changes in the game, change its row here and nothing else. tests/settings.mjs checks the table's shape and that the three views agree.
// A line of the H page is the caps, three spaces and the text: keep it to 43 characters and a scene to 20 lines, which is what the page holds
// (20 px type, 520 px wide, 580 px high). tests/controlshelp.mjs checks that, that every key named here is bound, and that every key the
// Space scene binds is named here.
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
    { k: ['Esc'], t: 'Close a terminal, or pause' }
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
    { k: ['N', 'X'], t: 'Places. Enter: set, then go. X: clear' },
    { k: ['B'], t: 'Overview of ships: Enter targets one' },
    { k: ['Click'], t: 'Assist on: fly there, or target it' },
    { k: ['C'], t: 'Cruise there (A D nudge, S cancels)' },
    { k: ['P'], t: 'Autopilot there (any key cancels)' },
    { k: ['R'], t: 'Autotarget on or off (needs the part)' },
    { k: ['V'], t: 'Gun lock: the guns fire at your target' },
    { k: ['Z'], t: 'Flight assist on or off' },
    { k: ['1-4'], t: 'Assist orders: go, keep, orbit, match' },
    { k: ['F'], t: 'Call the fuel ranger (tank near empty)' },
    { k: ['G'], t: 'Galaxy map: Enter jumps, Esc cancels' },
    { k: ['Tab'], t: 'Sector map (Z zooms)' },
    { k: ['Wheel'], t: 'Zoom out and in', help: 0 }
  ] },
  { id: 'surface', title: 'SURFACE', scene: 'Surface', rows: [
    { k: ['W', 'A', 'S', 'D'], t: 'Walk (the arrow keys work too)' },
    { k: ['Mouse'], t: 'Aim, and click to fire' },
    { k: ['E'], t: 'Talk to the colonist, board at the pad' },
    { k: ['C'], t: 'Show the controls panel again' }
  ] },
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
    { k: ['M'], t: 'Mute sound', bay: 1 }
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

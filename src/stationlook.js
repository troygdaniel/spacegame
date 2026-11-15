// ---------- What a station looks like and has: the Station scene reads this, never a table of its own (docs/UNIVERSE.md 9; card u-e5) ----------
// stationLook(id) gathers one dock from its two homes: the body in SYSTEMS (name, art, dock: fuel, repair, parts, yard) and its file in CONTENT_WORLD.station
// (accent, welcome, services, the Bar lines). A dock the data does not know answers like Halcyon Station, so the scene never has nothing to read.
//   name        the station's name (the sign over the hangar, the titles of the panels)
//   accent      the colour of its desks, trim and lights: the file's accent, else the colour of its art (a nest is red, a foundry amber)
//   accentCss   the same as '#rrggbb'
//   pirate      true for a nest: the dock is drawn in red and the bar sign is not pink
//   terminals   which desks stand in the hall: { missions, repair, shop, pump, bar }; the hangar and the ship are always there
//   barName     the sign over the bar (THE DRIFT at Halcyon, the first word of the name and BAR elsewhere)
//   barLines    what the bar says: the lines of the station file's Bar section (the bartender of a dock without characters of its own reads them in turn)
//   welcome     the file's Welcome text, with {station} filled in, or ''
const SL_NAMES = { cyan: '#38e1ff', amber: '#ffb454', red: '#ff4d6d', green: '#6dff9c', gold: '#ffd24a', white: '#ffffff', pink: '#ff4fd8' };
const SL_ART_ACCENT = { station: '#38e1ff', outpost: '#6dff9c', hub: '#6dff9c', foundry: '#ffb454', nest: '#ff4d6d', derelict: '#9aa7b3' }; // src/stationart.js STATION_LOOKS

function slCss(c, fallback) { // a name from the list, or '#rrggbb' (the file parser has already turned a name into the hex)
  if (typeof c === 'string') { if (SL_NAMES[c]) return SL_NAMES[c]; if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase(); }
  return fallback;
}
function stationLook(id) {
  id = id || G.lastDock;
  const hit = fleetStation(id) || fleetStation(homeDock()), body = hit.body, dock = body.dock || {}; // src/fleet.js
  const file = (typeof CONTENT_WORLD !== 'undefined' && CONTENT_WORLD.station && CONTENT_WORLD.station[body.id]) || {};
  const home = body.id === homeDock(), art = body.art || 'station';
  const accentCss = slCss(file.accent, SL_ART_ACCENT[art] || '#38e1ff');
  const barLines = Array.isArray(file.bar) ? file.bar.filter(l => typeof l === 'string' && l.trim()).map(l => l.trim()) : [];
  const word = String(body.name).split(/\s+/)[0].toUpperCase();
  return {
    id: body.id, name: body.name, art, home,
    accent: parseInt(accentCss.slice(1), 16), accentCss,
    pirate: art === 'nest',
    terminals: {
      missions: true, // every station has a desk; where nothing is posted it says so (station.js openEmptyBoard, until card u-e3 fills it)
      repair: dock.repair === undefined || dock.repair > 0, // Halcyon's dock carries no repair price of its own (REPAIR_PRICE), so a dock that says nothing repairs
      shop: PART_ORDER.some(k => partStockCap(k, dock) > 0), // src/data_parts.js: a dock that sells no part in any slot has no shop
      pump: dock.fuel > 0, // src/fuel.js
      bar: home || barLines.length > 0
    },
    barName: home ? 'THE DRIFT' : word + ' BAR',
    barLines,
    welcome: typeof file.welcome === 'string' ? file.welcome.replace(/\{station\}/g, body.name) : ''
  };
}

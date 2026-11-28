// ---------- The new Long Haul: the switch, and the home system as Earth orbit (PROMPT 23, the cloud session's brief 15; Troy, 28 Nov 2026; the plan is docs/longhaul-earth.html) ----------
// Troy loves flying the Campaign's fighter and wants the regular game to feel like it: Long Haul with the Campaign's look, the Campaign fighter's feel, and its runs around Earth. All of it is behind ONE switch, the address
// ?longhaul=new. Without it nothing here does anything: every function answers "off" first, so today's Long Haul is what it was (and a Node test, which has no address, never sees the new one unless it asks: lhNewSet).
// This file is the switch and the SETTING'S NAMES. Long Haul keeps its home system as it is built (the same bodies at the same places with the same ids, prices, missions and saves: content/systems/halcyon.md); with the
// switch on, the rows of that one system are given the names of places around Earth, and the pieces after this one (src/lhearth.js the backdrop and the worlds, src/lhlook.js the ships, src/lhbridge.js the fighter's aim and
// the effects, src/lhpagehud.js the HUD) draw them. Nothing is added to the galaxy and no other system is touched. Pure, no Phaser: tests/lhnew.mjs runs it in plain Node.
//   lhNewOn()              is the new Long Haul on now: the address says ?longhaul=new (or a test called lhNewSet(true))
//   lhNewAddr(search)      what an address says: true for ?longhaul=new (the value's case and the place among the other parts do not matter); the page's own address when no string is given
//   lhNewSet(on)           the tests' and the tools' way: true or false sets it whatever the address says, null gives it back to the address
//   LHNEW.earth            the names: the system's, and one row for each body of the home system that is named (its id in the file, the name it takes, and for a world the Campaign's disc tone it is drawn in)
//   lhEarthApply(systems)  lays the names over the home system's row (SYSTEMS, or the table a test passes) when the switch is on; called at Boot after worldSync (src/boot.js). Idempotent: the row keeps its old name in
//                          `was`, and the same call with the switch off puts every name back. Returns the ids it named.
//   lhEarthName(id)        the name a body takes while the switch is on ('' when it has none, or the switch is off)
const LHNEW = {
  addr: 'longhaul',                        // the address's name for the switch
  value: 'new',                            // and the one value that turns it on (?longhaul=new)
  memo: { s: null, v: false },             // the page's address, read again only when it changed (the switch is asked many times a frame)
  forced: null,                            // lhNewSet: true or false whatever the address says; null: the address
  earth: {
    system: 'halcyon',                     // the system that is given the names (Long Haul's home: its file is not changed)
    name: 'Earth Orbit',                   // the system's name while the switch is on
    bodies: {                              // id: { name, tone (a world: the key of its three tones in CAMPDISC.tones, src/campworlddisc.js), kind (a world drawn as this kind in place of its own) }
      'halcyon-station': { name: 'Keel Station' },                       // the home dock: the ring station you launch from
      'kepler-4b': { name: 'The Moon', tone: 'luna', kind: 'rock' },       // the landable world of the rescue call
      'kepler-belt': { name: 'Debris Field One' },                        // the near belt: the rocks are what is left of an old yard
      'kestrel-outpost': { name: 'Relay Outpost' },                       // the small outpost by the gate
      'perseus-gate': { name: 'Outbound Gate' },
      'kepler-4c': { name: 'Cruithne', tone: 'eros', kind: 'rock' },       // the far rock: a small body that shares Earth's orbit
      'slag-belt': { name: 'Graveyard Belt' },                            // the far belt: where the dead satellites were parked
      'tern': { name: 'Anchor Rock', tone: 'vesta', kind: 'rock' },        // the gas giant of the old far corner cannot stand beside Earth: a large captured rock
      'tern-wreck': { name: 'Dead Station' }
    }
  }
};

function lhNewAddr(search) {
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = LHNEW.memo;
    if (own && M.s === s) return M.v;
    let v = false;
    s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === LHNEW.addr) v = eq >= 0 && p.slice(eq + 1).trim().toLowerCase() === LHNEW.value; }); // the last one counts
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return false; } // an address nobody can read is today's game
}
function lhNewSet(on) { LHNEW.forced = on === null || on === undefined ? null : !!on; return lhNewOn(); }
function lhNewOn() { return LHNEW.forced !== null ? LHNEW.forced : lhNewAddr(); }

function lhEarthName(id) { const r = lhNewOn() ? LHNEW.earth.bodies[id] : null; return r ? r.name : ''; }
function lhEarthApply(systems) {
  const T = systems || (typeof SYSTEMS !== 'undefined' ? SYSTEMS : null), E = LHNEW.earth, def = T && T[E.system], done = [];
  if (!def || !Array.isArray(def.bodies)) return done;
  const on = lhNewOn(), put = (o, name) => { // the name it takes, with the one it had kept beside it; off: the one it had, back
    if (on) { if (!Object.prototype.hasOwnProperty.call(o, 'was')) Object.defineProperty(o, 'was', { value: { name: o.name }, enumerable: false, configurable: true, writable: true }); o.name = name; return true; }
    if (Object.prototype.hasOwnProperty.call(o, 'was')) { if (o.was.name === undefined) delete o.name; else o.name = o.was.name; delete o.was; }
    return false;
  };
  if (put(def, E.name)) done.push(E.system);
  def.bodies.forEach(b => { const r = E.bodies[b.id]; if (r && put(b, r.name)) done.push(b.id); });
  return done;
}

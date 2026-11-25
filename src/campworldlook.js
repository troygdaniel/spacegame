// ---------- The new world look, the switch (card space-game-world-w5-shield-hit adds it; the pieces W1 to W5 of the report on card space-game-world-look-scope share it) ----------
// Troy approved a new look for the world of the Campaign (25 Nov 2026; the mock is docs/world-look-mock.html, direction 1, flat discs): the backdrop, the planets and moons, the stations and the docking mark, the mission objects and the
// shield hit. All five pieces are behind ONE switch, CAMP.flags.worldlook (src/campaign.js): TRUE in the table, so a player who touched nothing has it; no row of the N panel and nothing remembered; the address ?worldlook=0 (also off,
// false, no) draws today's world, for the tests and a comparison, and ?worldlook=1 is on whatever the flag says. A test of today's world sets the flag false (the node harness does: nodeGame({ worldlook: 'table' }) keeps the table's value).
// The Long Haul's painters (src/art_world.js, src/stationart.js, src/boot.js) are not changed: the new world is Campaign-only code and texture keys in its own files.
//   campWorldOn()      is the new world look on now: the flag or ?worldlook=1, unless ?worldlook=0
//   campWorldAddrOn(s) / campWorldAddrOff(s)   what an address says (s: a search string, else the page's own)
const CAMPWORLD = { addr: 'worldlook', memo: { s: null, v: null } }; // the address's name for the switch, and the page's address as last read (it is asked many times a frame)
function campWorldAddrVal(search) { // the value of ?worldlook in the address, lower case: null when it is not there, '' for a bare ?worldlook (the last one counts)
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = CAMPWORLD.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === CAMPWORLD.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const campWorldAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(campWorldAddrVal(search)) >= 0;   // ?worldlook, =1, =on, =true, =yes: on whatever the flag says
const campWorldAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(campWorldAddrVal(search)) >= 0;      // ?worldlook=0, =off, =false, =no: off whatever the flag says
const campWorldOn = () => !campWorldAddrOff() && ((typeof campFlag === 'function' && campFlag('worldlook')) || campWorldAddrOn());

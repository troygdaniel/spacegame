// ---------- The new world look: the switch (card space-game-world-w1-backdrop; the first piece of the world look, scope report on card space-game-world-look-scope, the mock is docs/world-look-mock.html, direction 1, flat discs) ----------
// Troy approved a new look for the world around the ships (25 Nov 2026, the cloud session's brief 5: all eight decisions yes): the backdrop (W1: near black, white stars, two faint slate clouds), planets and moons (W2), stations and the
// docking mark (W3), mission objects, ore and the mining beam (W4), the shield hit (W5). ONE switch for all five pieces: CAMP.flags.worldlook (src/campaign.js; ON in the table, so every player has the new world as each piece lands; no
// row of the N panel, nothing is remembered), and the address ?worldlook=0 (the tests' and the comparison's way back to today's world, like ?shiplook=0 and ?pagehud=0). Each piece asks campWorldOn() where it draws: with it off the
// Campaign draws what it drew before. It comes out when all five are played and Troy says the old look can go.
// The Campaign only. The Long Haul's painters (src/art_world.js, src/stationart.js, src/boot.js) are never changed by this look and never asked: the new pictures are made in the files of the look, under their own texture keys, and only
// the Campaign's scenes call them. The first piece to land (this one) holds the switch; the pieces after it append their painters below it.
//   campWorldOn()            is the new world look on now: the flag or ?worldlook=1, unless ?worldlook=0
//   campWorldAddrOn(s) / campWorldAddrOff(s)   what an address says (s: a search string, else the page's own);  campWorldAddrVal(s)   the value of ?worldlook, lower case: null when it is not there
const CAMPWORLD = {
  addr: 'worldlook',          // the address's name for the switch: ?worldlook=1 is on whatever the flag says, ?worldlook=0 is off
  memo: { s: null, v: null }  // the page's address, read again only when it changed (the switch is asked many times a frame)
};
function campWorldAddrVal(search) { // the value of ?worldlook in the address, lower case: null when it is not there, '' for a bare ?worldlook (the last one counts); the page's own address is read again only when it changed
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

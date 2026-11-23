// ---------- Campaign: the health bar of a ship you protect (cards space-game-protected-health and space-game-health-bar-quiet; Troy, 22 Nov 2026) ----------
// Troy, after playing: a ship you are escorting should show how hurt it is. Every ship the player protects (the transport of 1.1, the miners of 1.2, the haulers of 1.3, the miner of the distress call, any convoy ship of the
// later levels: campConvoyShips, the same ships the convoy orders and the escort sub-list use) wears a small bar: green, then amber, then red as its hull goes, flashing white when it is hit. A neutral that is not your charge
// (a patrol) has none. The flight view draws it on the ship at a fixed size on the screen (src/campchargescene.js), the Tab map over the ship's mark (src/campmapdraw.js) and the order sub-lists at the right of a ship's row
// (src/campanelsdraw.js). This file is the rule, with no Phaser and no page (tests/campcharge.mjs runs it in Node); the numbers are CAMP.charge in src/campaign.js.
// QUIET (card space-game-health-bar-quiet, Troy: "revise the health bars so they stay out of the way"): a bar is a THIN LINE over the ship, full length at full hull and shortened, in the band's colour, when it is hurt, with no
// number. While the ship is UNDER ATTACK, that is for CAMP.charge.loud ms (4 s) after the last hit it took, it is the FULL bar with its percentage; then it eases back to the line over CAMP.charge.ease ms. `loud` is that
// state as a share, 0 (the thin line) to 1 (the full bar), worked out from the ship's own hurtAt, so it needs no memory: a new hit makes it 1 again at once. It measures the hull (these ships have no shields).
//   campChargeHull(u)         the ship's hull as a share, 0 to 1
//   campChargeBand(f)         'green' | 'amber' | 'red' for a share
//   campChargeShips(C)        the ships that have a bar (alive)
//   campChargeBars(C)         one bar for each of them: { id, kind, x, y, hull, pct, band, color, hit, loud }  (hit: 1 at the hit, easing to 0 over CAMP.charge.flash ms; loud: 0 the thin line to 1 the full bar)
//   campChargeLoud(ago)       the share for a hit that was `ago` ms ago: 1 up to CAMP.charge.loud, then down to 0 over CAMP.charge.ease;  campChargeLook(k, thin, full)   a size between the line's and the bar's for a share
//   campChargeMark(C, id)     the same for one ship, or null when it has none (a ship's row in a list, a mark on the map)
const campChargeLoud = ago => { const K = CAMP.charge; return !(ago >= 0) ? 0 : ago < K.loud ? 1 : ago < K.loud + K.ease ? 1 - (ago - K.loud) / K.ease : 0; }; // 1 while under attack and for `loud` ms after the last hit, then eased down to 0 (no hit yet: 0)
const campChargeLook = (k, thin, full) => thin + (full - thin) * Math.max(0, Math.min(1, k)); // a size between the thin line's and the full bar's
const campChargeHull = u => Math.max(0, Math.min(1, u.hp / (u.maxHp || u.hp || 1)));
const campChargeBand = f => f <= CAMP.charge.red ? 'red' : f <= CAMP.charge.amber ? 'amber' : 'green';
const campChargeShips = C => (typeof campConvoyShips === 'function' && C && C.ships ? campConvoyShips(C) : []);
function campChargeOne(C, u) {
  const f = campChargeHull(u), band = campChargeBand(f), K = CAMP.charge, ago = typeof u.hurtAt === 'number' ? C.t - u.hurtAt : Infinity;
  return { id: u.id, kind: u.kind, x: u.x, y: u.y, hull: f, pct: Math.round(f * 100), band, color: K.color[band], hit: ago >= 0 && ago < K.flash ? 1 - ago / K.flash : 0, loud: campChargeLoud(ago) };
}
const campChargeBars = C => campChargeShips(C).map(u => campChargeOne(C, u));
const campChargeMark = (C, id) => { const u = campChargeShips(C).find(x => x.id === id); return u ? campChargeOne(C, u) : null; };

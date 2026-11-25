// ---------- The new ship look, the table: flat-cut outlines, colours, sides, glyphs (card space-game-ship-look-f-foundation; the mock is docs/ship-look-mock.html, direction 1) ----------
// Troy approved a new look for every ship of the Campaign (25 Nov 2026): one clean outline a ship, filled with its side's colour, one darker facet inside, a thin dark rim. This file is the TABLE only, with no Phaser and no
// page (tests/shiplook.mjs runs it in plain Node): the outlines and colours are the mock's own (its K and C tables; where this file and the mock differ, the mock is right), and the Campaign's rules, sizes and hit circles
// are not touched. Nothing draws from it until the pieces after this one land (A the ships, B the ring and arc, C fire and trails, D the signal shapes, E the panel and briefing), all behind ONE switch:
// CAMP.flags.shiplook (src/campaign.js; false: nothing changes), a row of the N panel (src/camptune.js), and the address ?shiplook=1 / ?shiplook=0 (the tests' and the comparison's way, like ?pagehud).
// The names start with slook / SLOOK (src/shipmodels.js already has shipLook for the Long Haul's hulls: the Long Haul is not changed).
//   slookOn()                 is the new look on now: the flag or ?shiplook=1, unless ?shiplook=0          slookAddrOn(s) / slookAddrOff(s)  what an address says (s: a search string, else the page's own)
//   SLOOK.C                   the colours (hex): friend, friendHi, protect, foe, alien, neutral, own, dark   slookColor(side) / slookInt(hex)  a side's colour as hex, and a hex as a number for Phaser
//   SLOOK.K[kind]             a kind's look: { name, side (its usual one), px (play size, measured on main bc8ad3e), p (the outline: points in units of the length, nose at +x, length 1), d (the facet), g (its signal shape),
//                             s (1: drawn with curves, the aliens'), hot (1: the facet is white, the torpedo boat's warhead) }
//   slookKinds()              the kinds, in the mock's order (the thirteen it draws, then the lancer, the mothership and the towers, which it does not: the proposals of the scope report)
//   slookSide(u, prot)        the side of a UNIT, from the sim: 'friend' (your cruiser and pilots), 'protect' (a ship you protect: prot is true when campConvoyShips has it; a freighter always is, and so is every living neutral miner), 'neutral',
//                             'foe' (the pirates) or 'alien'. slookSideOf(C, u) asks the sim who is protected; slookKindSide(kind) is the usual side where there is no unit (the briefing, the target panel)
//   slookFacet(side, hot)     the facet's colour: the side's colour mixed 55 percent toward SLOOK.C.dark, white for a warhead
//   slookPolygon(kind, L, n)  the outline in px at length L as a flat list of points (nose at +x); a smooth kind is its quadratic curves cut into n steps each (default 6), so a Phaser Graphics can fill it;  slookFacetPolygon: the facet, the same way
//   slookTexKey(kind, side)   the key of a kind's baked texture as a side (default its usual one), 'look-<kind>-<side>' (landing A makes them; a unit whose side is not its kind's usual one, which the sim does not make today, gets its own)
//   slookFireColor(side)      the colour of a shot: your side's mint, pink for hostile fire (amber only ever means a ship you protect), the neutrals' own grey-blue
//   slookArcColor(frac)       the hull arc round a ship that is hurt or picked: green above 60 percent, amber to 30, pink under (the HUD's rings);  slookRingR(L, w) and slookPickR(L, w): the arc's radius and the picked ship's bright ring (w: px a unit is on the screen)
const SLOOK = {
  addr: 'shiplook',                                         // the address's name for the switch: ?shiplook=1 is on whatever the flag says, ?shiplook=0 is off
  memo: { s: null, v: null },                               // the page's address, read again only when it changed (the switch is asked many times a frame)
  C: { friend: '#cfe6ff', friendHi: '#6fd6ff', protect: '#ffc857', foe: '#ff6fa8', alien: '#d58bff', neutral: '#9fb3c8', own: '#7df0c0', dark: '#0b1220' }, // the mock's C table: yours, the glow of your engines, a ship you protect, hostile (pirates), alien, neutral, your fire, the facet's dark
  sides: ['friend', 'protect', 'neutral', 'foe', 'alien'],  // the five sides a ship can be drawn as (each a key of C)
  facet: 0.55,                                              // the facet is the side's colour mixed this far toward C.dark
  rim: { color: 'rgba(5,8,14,.9)', k: 0.03, least: 1 },     // the thin dark rim: its colour, its width as a share of the length, and its least width (px)
  hot: '#ffffff',                                           // the torpedo boat's warhead tip
  arc: { good: '#4fe0a6', warn: '#ffc857', foe: '#ff6fa8', ok: 0.6, crit: 0.3, track: 'rgba(255,255,255,.13)', w: 2 }, // the hull arc: green above `ok`, amber down to `crit`, pink under; a faint full ring behind it; its line width (times w)
  ring: { color: '#e6edf7', k: 0.66, pad: 4, gap: 4.5, w: 1.6 }, // the picked ship's bright ring: the arc's radius is k times the length plus pad (times w); the ring sits gap outside the arc, its line is w wide
  text: { foe: '#ffb3d1' },                                 // the words of a hostile mark, a light pink (the edge arrow's label; its red was #ff9aae)
  glyph: { under: 0.26, over: 0.3 },                         // the far zoom (card space-game-ship-look-d-glyphs): a ship is drawn as its signal shape when the camera zoom is under `under` (two presses of the zoom-out key from the start zoom of 0.335) and goes back to its picture over `over` (the least-size rule applies at the start zoom too: a pilot is drawn 16 px long there, so it is not the rule that says far)
  glyphs: ['chev', 'bar', 'cap', 'capdot', 'tri', 'trinotch', 'tribar', 'hex', 'diamond', 'cres', 'disc', 'ringdot', 'ringring', 'square'], // the signal shapes (direction 4, the mock's glyph function: landing D draws them); the last two are the scope report's, for the mothership and the towers
  K: {
    carrier: { name: 'Cruiser', side: 'friend', px: 58, p: [[.5, 0], [.38, .09], [.1, .11], [.05, .24], [-.3, .24], [-.34, .12], [-.5, .1], [-.5, -.1], [-.34, -.12], [-.3, -.24], [.05, -.24], [.1, -.11], [.38, -.09]], d: [[.36, 0], [.1, .05], [-.44, .05], [-.44, -.05], [.1, -.05]], g: 'bar' },
    fighter: { name: 'Pilot', side: 'friend', px: 19, p: [[.5, 0], [-.1, .28], [-.5, .44], [-.32, .1], [-.42, 0], [-.32, -.1], [-.5, -.44], [-.1, -.28]], d: [[.3, 0], [0, .09], [-.16, 0], [0, -.09]], g: 'chev' },
    freighter: { name: 'Transport, hauler', side: 'protect', px: 42, p: [[.5, 0], [.42, .14], [.3, .16], [.3, .2], [-.38, .2], [-.38, .12], [-.5, .1], [-.5, -.1], [-.38, -.12], [-.38, -.2], [.3, -.2], [.3, -.16], [.42, -.14]], d: [[.26, .13], [-.34, .13], [-.34, -.13], [.26, -.13]], g: 'cap' },
    miner: { name: 'Miner', side: 'protect', px: 27, p: [[.5, .1], [.5, -.1], [.2, -.14], [.1, -.32], [-.3, -.32], [-.5, -.16], [-.5, .16], [-.3, .32], [.1, .32], [.2, .14]], d: [[.06, .2], [-.3, .2], [-.3, -.2], [.06, -.2]], g: 'capdot' },
    patrol: { name: 'Patrol', side: 'neutral', px: 28, p: [[.5, 0], [.2, .14], [-.1, .16], [-.3, .36], [-.5, .36], [-.4, .1], [-.5, 0], [-.4, -.1], [-.5, -.36], [-.3, -.36], [-.1, -.16], [.2, -.14]], d: [[.3, 0], [.05, .08], [-.2, 0], [.05, -.08]], g: 'chev' },
    skiff: { name: 'Skiff', side: 'foe', px: 24, p: [[.5, 0], [-.5, .38], [-.26, 0], [-.5, -.38]], d: [[.2, 0], [-.2, .14], [-.1, 0], [-.2, -.14]], g: 'tri' },
    cutter: { name: 'Cutter', side: 'foe', px: 26, p: [[.5, .13], [.1, .1], [-.2, .42], [-.5, .42], [-.3, .1], [-.5, 0], [-.3, -.1], [-.5, -.42], [-.2, -.42], [.1, -.1], [.5, -.13], [.28, 0]], d: [[.1, 0], [-.2, .1], [-.3, 0], [-.2, -.1]], g: 'trinotch' },
    brute: { name: 'Brute', side: 'foe', px: 32, p: [[.5, .14], [.2, .36], [-.3, .44], [-.5, .26], [-.4, 0], [-.5, -.26], [-.3, -.44], [.2, -.36], [.5, -.14], [.34, 0]], d: [[.2, .16], [-.26, .22], [-.3, 0], [-.26, -.22], [.2, -.16]], g: 'hex' },
    tboat: { name: 'Torpedo boat', side: 'foe', px: 31, p: [[.5, 0], [.34, .1], [-.1, .1], [-.24, .32], [-.5, .32], [-.42, .1], [-.5, 0], [-.42, -.1], [-.5, -.32], [-.24, -.32], [-.1, -.1], [.34, -.1]], d: [[.5, 0], [.34, .1], [.24, 0], [.34, -.1]], hot: 1, g: 'tribar' },
    pirateleader: { name: 'Pirate leader', side: 'foe', px: 56, p: [[.5, 0], [.3, .12], [.12, .12], [0, .32], [-.36, .38], [-.5, .2], [-.4, .08], [-.5, 0], [-.4, -.08], [-.5, -.2], [-.36, -.38], [0, -.32], [.12, -.12], [.3, -.12]], d: [[.28, 0], [.1, .07], [-.34, .2], [-.3, 0], [-.34, -.2], [.1, -.07]], g: 'diamond' },
    raider: { name: 'Alien raider', side: 'alien', px: 25, s: 1, p: [[.5, 0], [.1, .2], [-.3, .46], [-.5, .4], [-.22, .1], [-.3, 0], [-.22, -.1], [-.5, -.4], [-.3, -.46], [.1, -.2]], d: [[.2, 0], [0, .08], [-.14, 0], [0, -.08]], g: 'cres' },
    drone: { name: 'Alien drone', side: 'alien', px: 26, s: 1, p: [[.5, 0], [.3, .3], [0, .42], [-.3, .3], [-.42, 0], [-.3, -.3], [0, -.42], [.3, -.3]], d: [[.16, 0], [0, .16], [-.16, 0], [0, -.16]], g: 'disc' },
    gunship: { name: 'Alien gunship', side: 'alien', px: 34, s: 1, p: [[.5, 0], [.25, .15], [.2, .4], [-.1, .48], [-.3, .3], [-.5, .2], [-.4, 0], [-.5, -.2], [-.3, -.3], [-.1, -.48], [.2, -.4], [.25, -.15]], d: [[.2, 0], [0, .14], [-.2, 0], [0, -.14]], g: 'ringdot' },
    // the kinds the mock does not draw: the scope report's proposals (card space-game-ship-look-scope, section 4). px: the lancer is the torpedo boat's size (CAMP.size gives both 44); the mothership's and the towers' are not measured (null): landing A reads each length off what is drawn today (src/ships.js times CAMP_LOOK)
    lancer: { name: 'Alien torpedo boat', side: 'alien', px: 31, s: 1, p: [[.5, 0], [.3, .08], [-.05, .1], [-.28, .3], [-.5, .3], [-.42, .08], [-.5, 0], [-.42, -.08], [-.5, -.3], [-.28, -.3], [-.05, -.1], [.3, -.08]], d: [[.5, 0], [.3, .08], [.2, 0], [.3, -.08]], hot: 1, g: 'tribar' },
    mother: { name: 'Alien mothership', side: 'alien', px: null, s: 1, p: [[.5, 0], [.2, .14], [.02, .3], [-.1, .48], [-.34, .44], [-.4, .24], [-.5, .18], [-.46, 0], [-.5, -.18], [-.4, -.24], [-.34, -.44], [-.1, -.48], [.02, -.3], [.2, -.14]], d: [[.3, 0], [0, .14], [-.26, .16], [-.38, 0], [-.26, -.16], [0, -.14]], g: 'ringring' },
    tower: { name: 'Alien tower', side: 'alien', px: null, p: [[.5, -.06], [.5, .06], [.3, .06], [.24, .24], [0, .34], [-.24, .24], [-.34, 0], [-.24, -.24], [0, -.34], [.24, -.24], [.3, -.06]], d: [[.22, .06], [.14, .16], [0, .2], [-.14, .16], [-.2, 0], [-.14, -.16], [0, -.2], [.14, -.16], [.22, -.06]], g: 'square' }
  }
};

// ---- the switch ----
function slookAddrVal(search) { // the value of ?shiplook in the address, lower case: null when it is not there, '' for a bare ?shiplook (the last one counts); the page's own address is read again only when it changed
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = SLOOK.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === SLOOK.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const slookAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(slookAddrVal(search)) >= 0;   // ?shiplook, =1, =on, =true, =yes: on whatever the flag says
const slookAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(slookAddrVal(search)) >= 0;      // ?shiplook=0, =off, =false, =no: off whatever the flag says
const slookOn = () => !slookAddrOff() && ((typeof campFlag === 'function' && campFlag('shiplook')) || slookAddrOn());

// ---- the table's functions (pure) ----
const slookKinds = () => Object.keys(SLOOK.K);
const slookColor = side => SLOOK.C[side] || SLOOK.C.neutral;
const slookInt = hex => parseInt(String(hex).replace('#', ''), 16) || 0;
function slookMix(a, b, t) { // two '#rrggbb' colours, a mixed t of the way toward b, as '#rrggbb'
  const p = h => [1, 3, 5].map(i => parseInt(String(h).substr(i, 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const slookFacet = (side, hot) => hot ? SLOOK.hot : slookMix(slookColor(side), SLOOK.C.dark, SLOOK.facet);
const slookKindSide = kind => (SLOOK.K[kind] || SLOOK.K.drone).side;
function slookSide(u, prot) { // the side a unit is drawn as, from the sim's own fields (team, faction, kind); prot: the sim says it is a ship you protect
  if (!u) return 'neutral';
  if (u.team === 'earth') return prot || u.kind === 'freighter' ? 'protect' : 'friend';
  if (u.team === 'neutral') return prot ? 'protect' : 'neutral';
  if (u.team === 'alien') return u.faction === 'pirate' ? 'foe' : 'alien';
  return 'neutral';
}
function slookSideOf(C, u) { // the same, asking the sim who is protected (src/campconvoy.js campConvoyShips, the list the health bars and the convoy orders use)
  const list = typeof campConvoyShips === 'function' && C && C.ships ? campConvoyShips(C) : [];
  return slookSide(u, !!u && list.indexOf(u) >= 0);
}
function slookPoly(P, smooth, L, n) { // points in units of the length (nose at +x) as px at length L: [x0, y0, x1, y1, ...]; smooth: a closed chain of quadratic curves through the midpoints of the points (the mock's path), n steps each
  const m = P.length, out = [], steps = n > 0 ? n | 0 : 6;
  if (!smooth) { P.forEach(q => out.push(q[0] * L, q[1] * L)); return out; }
  const mid = i => { const a = P[i % m], b = P[(i + 1) % m]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  let s = mid(m - 1); out.push(s[0] * L, s[1] * L);
  for (let i = 0; i < m; i++) {
    const e = mid(i), c = P[i];
    for (let j = 1; j <= steps; j++) { const t = j / steps, u = 1 - t; out.push((u * u * s[0] + 2 * u * t * c[0] + t * t * e[0]) * L, (u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]) * L); }
    s = e;
  }
  return out;
}
const slookPolygon = (kind, L, n) => SLOOK.K[kind] ? slookPoly(SLOOK.K[kind].p, !!SLOOK.K[kind].s, L, n) : []; // the outline of a kind at length L px, for a Phaser Graphics to fill (a smooth kind is cut into n steps a curve, default 6)
const slookFacetPolygon = (kind, L, n) => SLOOK.K[kind] ? slookPoly(SLOOK.K[kind].d, !!SLOOK.K[kind].s, L, n) : []; // the facet inside it, the same way
const slookTexKey = (kind, side) => 'look-' + kind + '-' + (side || slookKindSide(kind)); // the key of the baked texture of a kind as a side (landing A makes them; the target panel and the briefing ask for them by this name)
const slookFireColor = side => side === 'foe' || side === 'alien' ? SLOOK.C.foe : side === 'neutral' ? SLOOK.C.neutral : SLOOK.C.own; // hostile fire is pink; amber only ever means a ship you protect
const slookArcColor = frac => frac > SLOOK.arc.ok ? SLOOK.arc.good : frac > SLOOK.arc.crit ? SLOOK.arc.warn : SLOOK.arc.foe;
const slookRingR = (L, w) => L * SLOOK.ring.k + SLOOK.ring.pad * (w > 0 ? w : 1);                  // the hull arc's radius (and the least a ring is)
const slookPickR = (L, w) => slookRingR(L, w) + SLOOK.ring.gap * (w > 0 ? w : 1);                  // the picked ship's bright ring sits just outside it

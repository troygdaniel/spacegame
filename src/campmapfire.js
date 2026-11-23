// ---------- The Campaign's Tab map shows the fight (card space-game-campaign-map-lasers; Troy: the Tab map is great, it would be good to see lasers firing on it as well) ----------
// While the map is open the battle goes on behind it, and the map draws it too, in thin lines: the carrier's turret volleys (a line from the turret to what it hits), the guns' and the
// enemy's bullets (a few pixels of tail, the wing's in its green and the enemy's in red), the mining lasers (a steady line from the ship to the rock), a missile (a dot and a short
// trail), a ring where something blew up, a flash on the mark of a ship that was hit. Nothing here is made for the map alone: it is what the scene's own events and the sim's own lists
// already say (C.events, C.bullets, C.rockets, C.lasers).
// CHEAP, by rule (docs/night/performance.md keeps the Campaign at 60 a second): a POOL of CAMPFIRE.pool marks made once when the map opens and reused, oldest first; the painting loops over the
// pool and over the sim's lists and allocates NOTHING (no array, object, closure or iterator in it: tests/campmapfire.mjs reads the source to prove it); the bullets drawn are capped; and
// the scene gives it events only while the map is open, and campMapPaint (src/campmapdraw.js) is the only one who paints, so a closed map costs nothing.
//   campFireNew()                       the pool: { slots: [ { on, kind, x0, y0, x1, y1, r, color, t0, life } ... ], i }
//   campFireHear(P, C, e, now)          a battle event -> a mark in the next slot (true), or false when it is not one (the steady things are drawn from state)
//   campFireAlpha(age, life, fadeIn)    PURE: 0 at birth, 1 by the end of the fade-in, down to 0 at the end of its life
//   campFirePaint(P, C, g, F, f, now)   draw the marks, the bullets, the missiles and the mining beams on the map's Graphics g (frame F, fit f); the number of things drawn
// Everything drawn is cut to the frame (a line that runs off the map ends at its edge) and is 1 to 2 px: the lines stay thin whatever the zoom (the zoom card changes f.s, not the widths).
const CAMPFIRE = {
  pool: 96,                          // marks alive at once: the most; a new one takes the oldest slot
  bullets: 120, rockets: 24, lasers: 24, // the most of each drawn from the sim's lists in a frame
  fadeIn: 150, ringFadeIn: 60,       // ms: a line fades in over about 150 ms (a ring, a flash: quicker, it is a bang)
  life: { volley: 320, ring: 450, flash: 220 }, // ms
  width: 1.5,                        // px: every line (the map's lines are 1 to 2 px; never fat)
  tail: 0.06, tailMin: 3, tailMax: 12, // a bullet: how many seconds of its flight are drawn behind it, and that length in px at least and at most
  trail: 120, trailMin: 5, trailMax: 14, // a missile's trail: world px, and in px at least and at most
  ring: { min: 7, max: 26, big: 260, small: 70 }, // a ring's size in px (from its world radius), and the world radius of a big and a small ship's explosion
  flash: 6,                          // px: a hit's flash
  color: { volley: 0xffd37a, beam: 0x7fe9ff, missile: 0xffd37a, friend: 0x9fe9ff, foe: 0xff9aa8, ringFriend: 0x9fe9ff, ringFoe: 0xff4d6d, blast: 0xffd37a, shield: 0x7fe9ff,
    wing: CAMPMAP.color.wing, alien: CAMPMAP.color.alien, pirate: CAMPMAP.color.pirate, patrol: CAMPMAP.color.patrol }, // friend and foe as the map's own marks (campDotColor): the wing green, the aliens red, the pirates yellow, a patrol teal
  earth: ['carrier', 'fighter', 'freighter'] // the kinds on Earth's side; anything else that blows up is theirs
};
const CF_TMP = { t0: 0, t1: 1, x0: 0, y0: 0, x1: 0, y1: 0 }; // the scratch the clip writes into: one object for ever
const CF_NONE = [];

function campFireNew() {
  const P = { slots: [], i: 0 };
  for (let k = 0; k < CAMPFIRE.pool; k++) P.slots.push({ on: false, kind: '', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, color: 0, t0: 0, life: 0 });
  return P;
}

// a battle event becomes a mark in the next slot (the oldest goes first); no object is made
function campFireHear(P, C, e, now) {
  if (!P || !e) return false;
  const t = e.type, K = CAMPFIRE.color;
  let kind = '', color = 0, r = 0, life = 0, x1 = 0, y1 = 0;
  if (t === 'turret') { if (!Number.isFinite(e.tx) || !Number.isFinite(e.ty)) return false; kind = 'volley'; color = K.volley; life = CAMPFIRE.life.volley; x1 = e.tx; y1 = e.ty; }
  else if (t === 'boom') { kind = 'ring'; r = e.big ? CAMPFIRE.ring.big : CAMPFIRE.ring.small; life = CAMPFIRE.life.ring; color = CAMPFIRE.earth.indexOf(e.kind) >= 0 ? K.ringFriend : K.ringFoe; }
  else if (t === 'mboom') { kind = 'ring'; r = e.r > 0 ? e.r : 100; life = CAMPFIRE.life.ring; color = K.blast; }
  else if (t === 'hit') { const u = C && C.by ? C.by[e.id] : null; kind = 'flash'; r = CAMPFIRE.flash; life = CAMPFIRE.life.flash; color = u && u.team === 'earth' ? K.friend : K.foe; }
  else if (t === 'shieldhit') { kind = 'flash'; r = CAMPFIRE.flash + 2; life = CAMPFIRE.life.flash; color = K.shield; }
  else return false;
  if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) return false;
  const s = P.slots[P.i]; P.i = (P.i + 1) % P.slots.length;
  s.on = true; s.kind = kind; s.x0 = e.x; s.y0 = e.y; s.x1 = x1; s.y1 = y1; s.r = r; s.color = color; s.t0 = now; s.life = life;
  return true;
}

// 0 at its birth, 1 once it has faded in (fadeIn ms), then down to 0 over the second half of its life
function campFireAlpha(age, life, fadeIn) {
  if (age <= 0 || age >= life) return 0;
  const up = Math.min(1, age / fadeIn), down = Math.min(1, 2 * (1 - age / life));
  return up * down;
}

// world to screen, by the map's fit
function cfX(F, f, x) { return F.x + F.w / 2 + (x - f.cx) * f.s; }
function cfY(F, f, y) { return F.y + F.h / 2 + (y - f.cy) * f.s; }

// Liang-Barsky, one edge at a time, in the scratch CF_TMP: false when the segment is wholly outside that edge
function cfEdge(p, q) {
  if (p === 0) return q >= 0;
  const r = q / p;
  if (p < 0) { if (r > CF_TMP.t1) return false; if (r > CF_TMP.t0) CF_TMP.t0 = r; }
  else { if (r < CF_TMP.t0) return false; if (r < CF_TMP.t1) CF_TMP.t1 = r; }
  return true;
}
// the part of a screen segment inside the frame, into CF_TMP.x0..y1; false when none of it is
function cfClip(F, x0, y0, x1, y1) {
  const T = CF_TMP, dx = x1 - x0, dy = y1 - y0;
  T.t0 = 0; T.t1 = 1;
  if (!cfEdge(-dx, x0 - F.x) || !cfEdge(dx, F.x + F.w - x0) || !cfEdge(-dy, y0 - F.y) || !cfEdge(dy, F.y + F.h - y0)) return false;
  T.x0 = x0 + T.t0 * dx; T.y0 = y0 + T.t0 * dy; T.x1 = x0 + T.t1 * dx; T.y1 = y0 + T.t1 * dy;
  return true;
}
// a line between two screen points, cut to the frame: 1 when it was drawn
function cfLine(g, F, x0, y0, x1, y1, color, a) {
  if (!(a > 0) || !cfClip(F, x0, y0, x1, y1)) return 0;
  g.lineStyle(CAMPFIRE.width, color, a); g.lineBetween(CF_TMP.x0, CF_TMP.y0, CF_TMP.x1, CF_TMP.y1);
  return 1;
}

// the whole fight on the map, once a frame. P: the pool; C: the battle; g: the map's Graphics; F: the frame; f: the fit { s, cx, cy }. Returns how many things it drew
function campFirePaint(P, C, g, F, f, now) {
  if (!P || !C || !g) return 0;
  const K = CAMPFIRE.color, s = f.s;
  let n = 0;
  // the marks: volleys, rings, flashes
  for (let k = 0; k < P.slots.length; k++) {
    const m = P.slots[k]; if (!m.on) continue;
    const age = now - m.t0; if (age >= m.life) { m.on = false; continue; }
    if (m.kind === 'volley') n += cfLine(g, F, cfX(F, f, m.x0), cfY(F, f, m.y0), cfX(F, f, m.x1), cfY(F, f, m.y1), m.color, campFireAlpha(age, m.life, CAMPFIRE.fadeIn));
    else {
      const x = cfX(F, f, m.x0), y = cfY(F, f, m.y0), a = campFireAlpha(age, m.life, CAMPFIRE.ringFadeIn), grow = Math.min(1, age / m.life);
      if (!(a > 0) || x < F.x || x > F.x + F.w || y < F.y || y > F.y + F.h) continue;
      if (m.kind === 'ring') { g.lineStyle(CAMPFIRE.width, m.color, a); g.strokeCircle(x, y, Math.min(CAMPFIRE.ring.max, Math.max(CAMPFIRE.ring.min, m.r * s)) * (0.35 + 0.65 * grow)); n++; }
      else { g.fillStyle(m.color, a * 0.85); g.fillCircle(x, y, m.r * (0.6 + 0.4 * grow)); n++; }
    }
  }
  // the guns' and the enemy's bullets: a few px of tail behind each, the turrets' own shots (pd) are the volleys' and are left out; at most CAMPFIRE.bullets
  const bl = C.bullets || CF_NONE;
  let drawn = 0;
  for (let k = 0; k < bl.length && drawn < CAMPFIRE.bullets; k++) {
    const b = bl[k]; if (!b || b.pd) continue;
    const x0 = cfX(F, f, b.x), y0 = cfY(F, f, b.y); if (x0 < F.x || x0 > F.x + F.w || y0 < F.y || y0 > F.y + F.h) continue;
    const sp = Math.hypot(b.vx, b.vy); if (!(sp > 0)) continue;
    const tl = Math.min(CAMPFIRE.tailMax, Math.max(CAMPFIRE.tailMin, sp * CAMPFIRE.tail * s)); // the tail in px: a few, never a streak
    n += cfLine(g, F, x0, y0, x0 - b.vx / sp * tl, y0 - b.vy / sp * tl, b.team === 'earth' ? (b.beam ? K.beam : K.wing) : b.team === 'neutral' ? K.patrol : b.fac === 'pirate' ? K.pirate : K.alien, 0.9);
    drawn++;
  }
  // the missiles: a dot and a short trail behind it
  const rk = C.rockets || CF_NONE;
  for (let k = 0; k < rk.length && k < CAMPFIRE.rockets; k++) {
    const m = rk[k]; if (!m) continue;
    const x = cfX(F, f, m.x), y = cfY(F, f, m.y); if (x < F.x || x > F.x + F.w || y < F.y || y > F.y + F.h) continue;
    const tl = Math.min(CAMPFIRE.trailMax, Math.max(CAMPFIRE.trailMin, CAMPFIRE.trail * s));
    n += cfLine(g, F, x, y, x - Math.cos(m.rot) * tl, y - Math.sin(m.rot) * tl, K.missile, 0.8);
    g.fillStyle(K.missile, 1); g.fillCircle(x, y, 2); n++;
  }
  // the mining lasers: a steady line from the ship to the rock, fading in as the beam begins; a turret's shot at an alien is a pulse (a volley), not a beam
  const ls = C.lasers || CF_NONE, by = C.by || CF_NONE, rocks = C.rocks || CF_NONE;
  for (let k = 0; k < ls.length && k < CAMPFIRE.lasers; k++) {
    const l = ls[k]; if (!l || l.kind !== 'rock') continue;
    const u = by[l.from]; if (!u) continue;
    let rock = null; for (let j = 0; j < rocks.length; j++) { if (rocks[j].id === l.to) { rock = rocks[j]; break; } }
    if (!rock) continue;
    n += cfLine(g, F, cfX(F, f, u.x), cfY(F, f, u.y), cfX(F, f, rock.x), cfY(F, f, rock.y), K.beam, 0.95 * Math.min(1, Math.max(0, (C.t - l.since) / CAMPFIRE.fadeIn)));
  }
  return n;
}

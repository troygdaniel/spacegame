// ---------- Flight assist, part 2: Orbit and Match speed (card space-game-assist-orbit-match) ----------
// Two more orders for the flight assist of src/assist.js, added to its mode table with assistMode (this file edits neither assist.js nor space.js):
//   3  Orbit        circle the target at a distance, the way it is already going round it (or the way the nose points), nose a little inside the
//                   circle. The distance is the range of the order: assistSet('orbit', target, 600); with none, a little outside the dock or land
//                   range of a body, 400 px round a ship or a point. It follows a target that moves. It has no end: a flight key ends it.
//   4  Match speed  fly alongside: the same heading and speed as the target, abeam of it on the side the ship is already on, `range` px off
//                   (200 with none). This is what an escort needs. A target that stands still: hold `range` px off it, where the ship is.
// Both plans are pure, as assist.js asks: (a, me, tgt, st) in, { face, burn, brake, done, status } out. tests/assistorbit.mjs flies them in plain Node.
const ASSIST_ORBIT = {
  range: 400, bodyGap: 200,          // px: the orbit round a ship or a point; how far outside a body's stop range (autopilotStop) its orbit lies
  minRange: 80,                      // px: the tightest circle the ship flies, whatever the order says
  speed: 0.55, pull: 0.35,           // the orbit speed: this part of the top speed, and never more than the turn this part of the engine can hold
  lead: 1.2,                         // px/s toward the circle per px off it
  ahead: 0.05,                       // s: the tangent it aims along is the one this far ahead on the circle, so the turn does not lag
  band: 0.15, bandMin: 40,           // "on the circle": within this part of the range (at least bandMin px)
  matchRange: 200,                   // px abeam for Match speed when none is given
  matchDead: 30, matchSlow: 20,      // px and px/s: alongside and matched
  matchNear: 90, matchNearV: 90,     // px and px/s: near enough to the spot to stop flying at it and hold the target's velocity instead
  matchHold: 6                       // px: on the spot; nearer than this it does not chase the last pixels
};

// which way round: +1 anticlockwise on the screen's axes (x right, y down: it looks clockwise), -1 the other way. The way the ship already goes
// round the target; with no sideways speed to speak of, the way the nose points; nose on the line, +1.
function assistOrbitDir(me, tgt) {
  const dx = me.x - tgt.x, dy = me.y - tgt.y, d = Math.hypot(dx, dy) || 1e-6, tx = -dy / d, ty = dx / d;
  const vt = (me.vx - (tgt.vx || 0)) * tx + (me.vy - (tgt.vy || 0)) * ty;
  if (Math.abs(vt) > 25) return Math.sign(vt);
  const nt = Math.cos(me.rot) * tx + Math.sin(me.rot) * ty;
  return Math.abs(nt) > 0.05 ? Math.sign(nt) : 1;
}

// the speed of the orbit at radius R: slow enough that the engine holds the turn with room to spare
function assistOrbitSpeed(R, st) { return Math.min(st.vmax * ASSIST_ORBIT.speed, Math.sqrt(ASSIST_ORBIT.pull * st.accel * R)); }

// fly toward the velocity `want` (relative to the target): turn the nose onto the change it needs, burn when on the line, brake when the change
// is mostly "slower". The same rules as assistSeek in assist.js, for a wanted velocity instead of a wanted place.
function assistSteer(me, tgt, wantX, wantY, holdFace) {
  const rvx = me.vx - (tgt.vx || 0), rvy = me.vy - (tgt.vy || 0), ex = wantX - rvx, ey = wantY - rvy, err = Math.hypot(ex, ey);
  const sp = Math.hypot(me.vx, me.vy), want = Math.hypot(wantX, wantY);
  const out = { face: holdFace, burn: false, brake: false, done: false, status: '', err };
  if (sp > 8 && err > want * 0.03 + 3 && ex * me.vx + ey * me.vy < -0.7 * err * sp) { out.brake = true; return out; }
  if (err > 12) out.face = Math.atan2(ey, ex);
  if (out.face === null || out.face === undefined) return out;
  const p = ex * Math.cos(out.face) + ey * Math.sin(out.face), aligned = Math.abs(assistWrap(out.face - me.rot)) < ASSIST.align;
  out.burn = err > 12 && aligned && (p > 14 || (!!me.burning && p > 0));
  return out;
}

function assistOrbitPlan(a, me, tgt, st) {
  const O = ASSIST_ORBIT, R = Math.max(a.range || 0, O.minRange);
  const dx = me.x - tgt.x, dy = me.y - tgt.y, dist = Math.hypot(dx, dy) || 1e-6, dir = assistOrbitDir(me, tgt);
  const off = dist - R, band = Math.max(O.bandMin, R * O.band), vo = assistOrbitSpeed(R, st);
  // the wanted velocity, relative to the target: along the circle (less of it the farther off the circle the ship is) and toward the circle
  const along = vo * Math.max(0.15, 1 - Math.abs(off) / (R + 200));
  const inward = Math.max(-st.vmax, Math.min(st.vmax, O.lead * off));
  const ang = Math.atan2(dy, dx) + dir * (vo / R) * O.ahead; // where the ship will be on the circle a moment from now
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let wx = -uy * dir * along - ux * inward, wy = ux * dir * along - uy * inward;
  const w = Math.hypot(wx, wy); if (w > st.vmax) { wx *= st.vmax / w; wy *= st.vmax / w; }
  const c = assistSteer(me, tgt, wx, wy, Math.atan2(wy, wx));
  c.status = c.brake ? 'brake' : off > band ? 'close in' : off < -band ? 'back off' : 'orbit';
  c.dist = dist; c.dir = dir; c.speed = vo;
  return c;
}

// where "alongside" is: abeam of a moving target on the ship's side of its track, or (a target that stands still) on the line to the ship
function assistMatchSpot(me, tgt, range) {
  const sp = Math.hypot(tgt.vx || 0, tgt.vy || 0), dx = me.x - tgt.x, dy = me.y - tgt.y;
  if (tgt.moving && sp > 1) {
    const hx = tgt.vx / sp, hy = tgt.vy / sp, side = (hx * dy - hy * dx) < -10 ? -1 : 1; // which side of its track the ship is on (dead astern: the right)
    return { x: tgt.x - hy * side * range, y: tgt.y + hx * side * range, heading: Math.atan2(hy, hx) };
  }
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: tgt.x + Math.cos(me.rot + Math.PI) * range, y: tgt.y + Math.sin(me.rot + Math.PI) * range, heading: null };
  return { x: tgt.x + dx / d * range, y: tgt.y + dy / d * range, heading: null };
}

function assistMatchPlan(a, me, tgt, st) {
  const O = ASSIST_ORBIT, spot = assistMatchSpot(me, tgt, a.range || 0);
  const sx = spot.x - me.x, sy = spot.y - me.y, off = Math.hypot(sx, sy), rel = Math.hypot(me.vx - (tgt.vx || 0), me.vy - (tgt.vy || 0));
  let c;
  if (off <= O.matchNear && rel <= O.matchNearV) {
    // nearly alongside: hold the target's velocity with small burns, drifting onto the spot; the nose the way the target flies
    const pull = off > O.matchHold ? O.lead : 0;
    c = assistSteer(me, tgt, sx * pull, sy * pull, spot.heading);
    c.status = off <= O.matchDead && rel <= O.matchSlow ? 'matched' : c.brake ? 'brake' : 'burn';
  } else c = assistSeek(me, { x: spot.x, y: spot.y, vx: tgt.vx, vy: tgt.vy }, st, 0, false); // far off: fly to the spot as Approach flies to a moving ship
  c.done = false; // an escort stays: only a key ends it
  return c;
}

assistMode('orbit', { label: 'Orbit', key: 'THREE', cap: '3', plan: assistOrbitPlan,
  range: t => (t.type ? autopilotStop(t) + ASSIST_ORBIT.bodyGap : ASSIST_ORBIT.range) });
assistMode('match', { label: 'Match speed', key: 'FOUR', cap: '4', range: ASSIST_ORBIT.matchRange, plan: assistMatchPlan });

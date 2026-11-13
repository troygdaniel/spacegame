// ---------- Boost energy and the sideways dodge dash (Space only) ----------
// space.js calls boostInit(this) once in create and boostFrame(...) / boostCap(...) once per frame in update.
// The state lives on the scene so hud.js can draw it: s.en / s.enMax (energy), s.boostLocked, s.boosting, s.dashReady, s.dashCool.
//   Boost: Shift with thrust drains the energy ring; empty locks the boost until a quarter is back. Energy refills after a pause.
//   Dash: Q or E, a short sideways slide with a cooldown. It does not touch drone speeds or bullets, it only moves you.
// The Booster upgrade tiers set the size and refill rate (boostEnergy() in shop.js).

const BOOST = { drain: 25, pause: 1000, back: 0.25, dashMs: 200, dashSpeed: 900, dashCool: 2500, dashDrift: 140, fall: 900 };

function boostInit(s) {
  const e = boostEnergy();
  s.enMax = e.max; s.en = e.max; s.enPause = 0; s.boostLocked = false; s.boosting = false; s.dry = false;
  s.dashReady = 0; s.dashLeft = 0; s.dashDir = 0; s.dashCool = BOOST.dashCool; s.vmax = 480;
  s.lastE = s.k.E.timeDown; s.lastQ = s.k.Q.timeDown; // a press is a new timeDown: read from here, so poi.js eating the E press does not hide it
}

// once per frame; returns true while the boost is on (the old "Shift is down", now with a tank)
function boostFrame(s, time, dt, locked, thrusting) {
  const k = s.k, sec = dt / 1000, e = boostEnergy();
  s.enMax = e.max; if (s.en > s.enMax) s.en = s.enMax; // a tier bought mid-flight is not possible, but a load is
  const shift = k.SHIFT.isDown && !locked;
  const ok = shift && !s.boostLocked && s.en > 0;
  s.boosting = ok && thrusting;
  if (s.boosting) {
    s.en = Math.max(0, s.en - BOOST.drain * sec); s.enPause = time + BOOST.pause;
    if (s.en <= 0) { s.boostLocked = true; sfx('empty'); }
  } else if (time > s.enPause) {
    s.en = Math.min(s.enMax, s.en + e.regen * sec);
  }
  if (s.boostLocked && s.en >= s.enMax * BOOST.back) s.boostLocked = false;
  if (!shift) s.dry = false;
  else if (s.boostLocked && thrusting && !s.dry) { s.dry = true; sfx('empty'); } // one dry click per press, not a buzz

  // dash: a press during the cooldown is lost rather than saved up. E also salvages at a signal (poi.js): while its
  // prompt says E, the press belongs to the salvage and does not dash.
  const pe = k.E.timeDown !== s.lastE, pq = k.Q.timeDown !== s.lastQ;
  s.lastE = k.E.timeDown; s.lastQ = k.Q.timeDown;
  const salvage = typeof POIRUN !== 'undefined' && POIRUN && POIRUN.prompt && /^E\s/.test(POIRUN.prompt.text || '');
  if (((pe && !salvage) || pq) && !locked && !s.leaving) {
    if (time >= s.dashReady) {
      const dir = pe && !salvage ? 1 : -1, a = s.ship.rotation + dir * Math.PI / 2;
      s.dashDir = dir; s.dashLeft = BOOST.dashMs; s.dashReady = time + BOOST.dashCool;
      s.ship.body.velocity.x += Math.cos(a) * BOOST.dashDrift; s.ship.body.velocity.y += Math.sin(a) * BOOST.dashDrift;
      s.trail.emitParticleAt(s.ship.x - Math.cos(a) * 14, s.ship.y - Math.sin(a) * 14, 12); // a puff on the side you pushed off from
      sfx('dash'); fxDash(s, a); // src/art_world.js
    } else sfx('empty');
  }
  if (s.dashLeft > 0) { // counted in frame time, so the slide is the same 180 px at any frame rate
    const used = Math.min(dt, s.dashLeft); s.dashLeft -= used;
    const a = s.ship.rotation + s.dashDir * Math.PI / 2, step = BOOST.dashSpeed * used / 1000;
    s.ship.x += Math.cos(a) * step; s.ship.y += Math.sin(a) * step;
    boostGhost(s);
  }
  return ok;
}

// the top speed: up at once, down at 900 px/s per second, so running dry or letting go is a fade and not a wall
function boostCap(s, boost, dt) {
  const target = boost ? boostMax() : 480;
  s.vmax = target >= s.vmax ? target : Math.max(target, s.vmax - BOOST.fall * dt / 1000);
  return s.vmax;
}

// afterimage: a cyan copy of the ship that fades where the dash began
function boostGhost(s) {
  const sh = s.ship;
  const g = s.add.image(sh.x, sh.y, 'ship').setRotation(sh.rotation).setDepth(4.8).setTint(CYAN).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
  s.tweens.add({ targets: g, alpha: 0, scaleX: 1.12, scaleY: 1.12, duration: 260, onComplete: () => g.destroy() });
}

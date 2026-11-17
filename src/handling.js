// ---------- Handling: how a ship answers the stick (card space-game-ship-weight) ----------
// Two sets of numbers over the ship tables (src/data_ships.js gives each hull its accel, turn and top speed; these scale and shape them):
//   classic   the arcade feel the game shipped with: full turn rate and full thrust the frame the key goes down, quick to settle
//   heavy     a ship with mass: the turn builds up and eases off, the thrust ramps, the ship drifts longer before it settles and
//             the top speed (the same figure) takes about twice as long to reach
// A row of HANDLING:
//   turn       multiplier on the hull's turn rate once the turn has built up
//   turnUp     ms for the turn to build from nothing to full (0: at once)
//   turnDown   ms for it to ease off after the key is let go (0: at once)
//   accel      multiplier on the hull's thrust once it has ramped
//   thrustUp   ms for the thrust to ramp from nothing to full (0: at once)
//   thrustDown ms for the ramp to fall back after the key is let go (the thrust itself stops with the key)
//   drag       how much of its speed a coasting ship keeps each second (Phaser damping): higher drifts longer
//   brake      the same while S is held
// space.js reads three things each frame: handlingTurn, handlingThrust, handlingDrag. The autopilot flies its own curve and is not changed.
// The choice is a preference of this browser (localStorage), like the volume of the ship voice: not in the save, so Reset game keeps it.
// Settings > Controls has the row (src/settings.js). Classic is the default until the player picks Heavy. tests/handling.mjs pins all of it.

const HANDLING = {
  classic: { id: 'classic', name: 'Classic', note: 'Arcade: the ship turns and pushes the moment you press.',
    turn: 1, turnUp: 0, turnDown: 0, accel: 1, thrustUp: 0, thrustDown: 0, drag: 0.55, brake: 0.12 },
  heavy: { id: 'heavy', name: 'Heavy', note: 'A ship with mass: the turn builds and eases off, the thrust ramps, it drifts before it settles.',
    turn: 0.85, turnUp: 380, turnDown: 300, accel: 0.5, thrustUp: 900, thrustDown: 250, drag: 0.78, brake: 0.3 }
};
const HANDLING_STORE = 'longhaul.handling';
let handlingId = 'classic';

function handlingLoad() { // storage is optional: every call is wrapped
  try { const v = localStorage.getItem(HANDLING_STORE); handlingId = HANDLING[v] ? v : 'classic'; } catch (e) { handlingId = 'classic'; }
  return handlingId;
}
function handlingSet(id) {
  handlingId = HANDLING[id] ? id : 'classic';
  try { localStorage.setItem(HANDLING_STORE, handlingId); } catch (e) { /* storage is optional */ }
  return handlingId;
}
const handlingNow = () => HANDLING[handlingId] || HANDLING.classic;
const handlingEase = x => x * x * (3 - 2 * x); // slow in, slow out, 0..1

// the turn this frame, -1..1 times the feel's turn multiplier. dir is -1 (left), 0 or 1 (right); st keeps st.hTurn between frames
function handlingTurn(st, dir, dt) {
  const h = handlingNow();
  if (!h.turnUp && !h.turnDown) { st.hTurn = dir; return dir * h.turn; }
  let r = st.hTurn || 0;
  if (dir && r * dir >= 0) r = h.turnUp ? Math.max(-1, Math.min(1, r + dir * dt / h.turnUp)) : dir;     // building up
  else { const d = h.turnDown ? dt / h.turnDown : 1; r = Math.abs(r) <= d ? 0 : r - Math.sign(r) * d; } // easing off (also first when the stick is reversed)
  st.hTurn = r;
  return Math.sign(r) * handlingEase(Math.abs(r)) * h.turn;
}

// the share of the hull's thrust this frame, 0..the feel's accel multiplier. on: the engine is burning; st keeps st.hThrust
function handlingThrust(st, on, dt) {
  const h = handlingNow();
  if (!h.thrustUp) { st.hThrust = on ? 1 : 0; return h.accel; }
  let r = st.hThrust || 0;
  r = on ? Math.min(1, r + dt / h.thrustUp) : Math.max(0, r - (h.thrustDown ? dt / h.thrustDown : 1));
  st.hThrust = r;
  return on ? handlingEase(r) * h.accel : 0;
}

const handlingDrag = brake => (brake ? handlingNow().brake : handlingNow().drag);

// ---- the same numbers as seconds, for the Settings row and the test (60 steps a second, as the game runs) ----
// from rest with the key held: seconds until the ship reaches vmax (acc: the hull's thrust in px/s2)
function handlingTimeTo(h, acc, vmax) {
  const dt = 1000 / 60; let v = 0, t = 0, r = 0;
  while (v < vmax && t < 60000) {
    r = h.thrustUp ? Math.min(1, r + dt / h.thrustUp) : 1;
    v = (v + acc * h.accel * handlingEase(r) * dt / 1000) * Math.pow(h.drag, dt / 1000); t += dt;
  }
  return t / 1000;
}
// from vmax with the keys let go: seconds until the ship is down to 20 px/s
const handlingCoast = (h, vmax) => Math.log(20 / vmax) / Math.log(h.drag);

handlingLoad();

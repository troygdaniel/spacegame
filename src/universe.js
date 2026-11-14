// ---------- The universe: which star system the Space scene is built from (docs/UNIVERSE.md sections 4.1 and 8.1) ----------
// G.system is the id of the current system, a string so a save can name it. The systems themselves are data in
// src/data_systems.js. Scenes ask here for where things are instead of keeping coordinate tables of their own.
//   sysDef()           the current system object
//   sysBodies('belt')  every body of that type in the current system (no type: all of them)
//   sysBody('planet')  the first body of that type, or null
// An id this build does not know falls back to Halcyon, so an old or newer save never leaves the game without a world.

G.system = 'halcyon';

function sysDef(id) { return SYSTEMS[id || G.system] || SYSTEMS.halcyon; }
function sysBodies(type, id) { const all = sysDef(id).bodies; return type ? all.filter(b => b.type === type) : all.slice(); }
function sysBody(type, id) { return sysBodies(type, id)[0] || null; }

// ---------- Jumping: arriving in another system (docs/UNIVERSE.md 2.3; card u-b4) ----------
// enterSystem(id, from) makes id the current system, marks it known, counts the jump and says where the ship appears: G.arrival is read once
// by the Space scene (src/space.js) and then cleared. The ship appears at the edge of the system that FACES the star it came from (jumping from the
// west puts you at the west edge), flying toward the middle at ARRIVE.speed, and the pirates are held off for ARRIVE.calm ms.
// from: the id of the system left (its galaxy position is where "facing" is taken from), or null for no origin: then the ship is where a launch puts it.
// Returns false, changing nothing, for an id this build has no system for.
const ARRIVE = { speed: 500, calm: 3000, margin: 500 }; // px/s toward the middle, ms without pirates, px kept between the entry point and the wall
G.arrival = null;
function arrivalPoint(id, from) { // { x, y, rot } for a ship entering system id from system `from`, or null
  const dest = SYSTEMS[id], origin = from && SYSTEMS[from];
  if (!dest || !origin || !origin.ly || !dest.ly) return null;
  let dx = origin.ly[0] - dest.ly[0], dy = origin.ly[1] - dest.ly[1];
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const half = dest.size / 2 - ARRIVE.margin, k = half / Math.max(Math.abs(dx), Math.abs(dy)); // out along the heading to the square's edge
  const x = dest.size / 2 + dx * k, y = dest.size / 2 + dy * k;
  return { x, y, rot: Math.atan2(dest.size / 2 - y, dest.size / 2 - x) };
}
function enterSystem(id, from) {
  if (!Object.prototype.hasOwnProperty.call(SYSTEMS, id)) return false;
  const at = arrivalPoint(id, from);
  G.system = id; if (!G.known.includes(id)) G.known.push(id); G.jumps = (G.jumps | 0) + 1;
  G.arrival = at ? Object.assign({ system: id, from: from || null }, at) : null;
  return true;
}

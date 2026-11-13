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

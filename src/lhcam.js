// ---------- The new Long Haul: the Campaign's camera on your ship (PROMPT 23, piece 7 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// Long Haul's view follows the ship with a soft lerp, so at speed the ship sits AHEAD of the middle and the view trails it: you see more of where you have been than of where you are going. The Campaign's view of a
// flown ship leads it while it boosts (card space-game-b7-camera-lead-stick, Troy's decision 7 of brief 7: by about a fifth of the screen in the direction of flight) and pulls back a little (the boost's slight
// zoom-out). With the switch on, Long Haul's camera does the same, by the Campaign's own pure functions and numbers (src/campfeel.js: campFeelCamStep the boost's eased share, campFeelLead where the middle of the view
// should be, campFeelLeadStep its ease, campFeelZoomK the zoom-out, campFeelLerp the follow's lerp; CAMPFEEL.lead and CAMPFEEL.cam). Nothing of them is copied. The follow, the wheel's zoom (src/camzoom.js) and the
// docking and landing moves (src/feel.js) are Long Haul's: this file only sets the follow's OFFSET and, while nothing else has moved it, the base zoom the wheel multiplies. The lead eases to nothing when the boost
// ends, while a docking or landing move plays, and when you are destroyed.
//   lhCamStep(st, v, dt)     PURE: one frame of the camera's state st { z, k, lead: { x, y } } for v { on (the lead may run), boosting, vx, vy, top (px/s), vw, vh (the world px the camera shows) }, dt ms: returns { x, y, k }
//                            (the follow's offset is minus x, minus y; k is the base zoom's multiplier)
//   lhCamFrame(scene, dt)    once a frame from the scene's update: the step, then the offset and the base zoom on the camera. true when it ran (the switch is on)
function lhCamStep(st, v, dt) {
  st.z = campFeelCamStep(st.z || 0, !!(v.on && v.boosting), dt);
  const L = st.lead || (st.lead = { x: 0, y: 0 }), t = v.on ? campFeelLead(v.vx, v.vy, v.top, st.z, v.vw, v.vh, campFeelLerp(st.z)) : { x: 0, y: 0 };
  campFeelLeadStep(L, t.x, t.y, dt);
  return { x: L.x, y: L.y, k: campFeelZoomK(st.z) };
}
function lhCamFrame(scene, dt) {
  if (typeof lhNewOn !== 'function' || !lhNewOn() || typeof campFeelLead !== 'function' || !scene || !scene.ship || !scene.ship.body) return false;
  const cam = scene.cameras && scene.cameras.main; if (!cam || typeof cam.setFollowOffset !== 'function') return false;
  const st = scene.lhCam || (scene.lhCam = { z: 0, k: 1, lead: { x: 0, y: 0 } }), b = scene.ship.body, z = cam.zoom > 0 ? cam.zoom : 1;
  const r = lhCamStep(st, { on: !scene.dead && !scene.leaving && cam._follow === scene.ship, boosting: !!scene.boosting, vx: b.velocity.x, vy: b.velocity.y, top: b.maxSpeed > 0 ? b.maxSpeed : 800, vw: cam.width / z, vh: cam.height / z }, dt > 0 ? dt : 16.7);
  const o = cam.followOffset; if (!o || o.x !== -r.x || o.y !== -r.y) cam.setFollowOffset(-r.x, -r.y);
  const c = scene._cz; // the wheel's zoom multiplies a base (src/camzoom.js); it is written only while nothing else is moving the zoom (the camera's zoom is what camzoom last wrote)
  if (c && c.out !== null && cam.zoom === c.out) { const game = c.base === st.wrote && st.k > 0 ? c.base / st.k : c.base; st.k = r.k; st.wrote = c.base = game * r.k; } // ours is a multiplier of the game's own base (Long Haul's arrival zoom leaves it a little off 1): what we last wrote has ours in it, anything else is the game's
  return true;
}

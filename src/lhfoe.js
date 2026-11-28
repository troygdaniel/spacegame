// ---------- The new Long Haul: pirates lead their shots (PROMPT 23, piece 5 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// In the Campaign a hostile fighter aims at where the fighter you fly WILL be when its shot gets there (card space-game-b10-c1-lead-shots: CAMP.cockpit.leadK, 1 is the whole lead), so you can really be hit; before
// that it aimed at where you were and a ship flying straight was never touched. Long Haul's pirates fire along the nose at where you are. With the switch on, a pirate's shot at YOUR ship leaves along the Campaign's
// lead (campDogLead, src/campdogfight.js: its own maths, called here, not copied), with the Campaign's share of it, when that line is inside the pirate's own aim (the angle its gun already had off the nose: PIRATES
// `aim`); otherwise along the nose as before. Its steering, its rate, its damage and its shot's speed are not touched, and a shot at a freighter it hunts is as it was. Pure: tests/lhfoe.mjs.
//   lhFoeAim(scene, d, tgt, def)   the angle a pirate d's shot leaves along, at its target tgt (a sprite with a body), def its PIRATES row: d.rotation unless the switch is on, tgt is your ship and the lead is in its aim
//   lhFoeLead(d, tgt, bullet)      PURE: the Campaign's lead bearing from a pirate to a moving target for a shot of `bullet` px/s (plain rows: x, y, and the target's vx, vy)
function lhFoeLead(d, tgt, bullet) {
  const share = typeof CAMP === 'object' && CAMP.cockpit ? Math.max(0, Math.min(1, +CAMP.cockpit.leadK || 0)) : 0;
  return campDogLead({ x: d.x, y: d.y, vx: 0, vy: 0 }, { x: tgt.x, y: tgt.y, vx: tgt.vx || 0, vy: tgt.vy || 0 }, bullet, share); // (a pirate's shot keeps none of the pirate's own speed in Long Haul: src/space.js shoot)
}
function lhFoeAim(scene, d, tgt, def) {
  if (typeof lhNewOn !== 'function' || !lhNewOn() || typeof campDogLead !== 'function' || !scene || !tgt || tgt !== scene.ship || !def || !(def.bullet > 0)) return d.rotation;
  const v = tgt.body && tgt.body.velocity ? tgt.body.velocity : { x: 0, y: 0 }, lead = lhFoeLead(d, { x: tgt.x, y: tgt.y, vx: v.x, vy: v.y }, def.bullet);
  const off = Math.atan2(Math.sin(lead - d.rotation), Math.cos(lead - d.rotation));
  return Math.abs(off) <= (def.aim || 0) ? d.rotation + off : d.rotation;
}

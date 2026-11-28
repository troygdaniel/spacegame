// ---------- The new Long Haul: the Campaign's kill effect (PROMPT 23, piece 6 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// A ship's end in the Campaign is a white ring, a faint pink ring, a bright core and five pink shards for under half a second (src/shiplookfx.js slookKill: the mock's `boom`). Long Haul's is a burst of sparks, smoke,
// embers and a shockwave (fxBoom, src/art_world.js). With the switch on, a pirate's end and your own are the Campaign's effect, drawn by the Campaign's own functions through the bridge's view (src/lhbridge.js): slookKill
// takes a pooled record and slookFxFrame animates it. The bridge's game is shown to slookFxFrame with NO ships, so it animates the kills and draws no engine trail: Long Haul's own flames and ribbons stay (the Campaign's
// were modelled on them), in the side's colour (src/lhlook.js). The salvage, the bounty, the sound and the count of a kill are Long Haul's and are not touched. If the Campaign's ship look is off (?shiplook=0), slookKill
// answers false and Long Haul's burst is drawn as before.
//   lhKill(scene, x, y, big)   the Campaign's kill effect at a point of the world (big: your own ship's end, three times the size); true when it was drawn (the caller then leaves its own burst out)
//   lhFxFrame(scene)           once a frame after the scene's update (installed by the first kill, taken off when the scene shuts down): the kills' animation
function lhFxFrame(scene) {
  const S = scene && scene.lhB; if (!S || !S.view || !S.C || typeof slookFxFrame !== 'function') return;
  const v = S.fxView || (S.fxView = Object.create(S.view)); v.camp = { t: scene.time ? scene.time.now : S.C.t, ships: [] }; // the same pooled sprites (the view's hud), the scene's own clock, and no ship to draw a trail for
  slookFxFrame(v);
}
function lhKill(scene, x, y, big) {
  if (typeof lhBridge !== 'function' || typeof slookKill !== 'function' || !scene || !scene.time) return false;
  const S = lhBridge(scene, scene.time.now); if (!S) return false;
  S.C.t = scene.time.now;
  if (!slookKill(S.view, x, y, big ? SLOOKFX.kill.big : 1)) return false;
  if (!S.fxOn && scene.events && scene.events.on) { S.fxOn = true; const frame = () => lhFxFrame(scene); scene.events.on('postupdate', frame); scene.events.once('shutdown', () => { scene.events.off('postupdate', frame); }); }
  return true;
}

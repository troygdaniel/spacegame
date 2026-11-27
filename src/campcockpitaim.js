// ---------- The flown fighter's AUTO-TARGET and its lead marker (card space-game-fly-fighter-aim-help; Troy, 26 Nov 2026 evening: "flying the small ship is fun, firing is tough") ----------
// While a fighter is flown (src/campcockpit.js, behind CAMP.flags.cockpit) its gun finds a hostile for itself: one within CAMP.cockpit.aimCone degrees (20) either side of the nose and in the guns' reach, the one the ] key
// picked if it is in the cone, else the one the guns already track while it stays in the cone, else the nearest. Each shot then leaves along the LEAD POINT to it: where shot and ship meet, from the fighter's own place and
// speed and the shot's own (the maths of the turrets' campLead, src/campaign.js, written again here because the turrets' read the cruiser's numbers). A shot the help sent does CAMP.cockpit.aimK of the damage (it hits
// more of its shots); a shot with no help (the cone 0, nothing in the cone) is the plain damageK, so the cone 0 is exactly the gun of before. Outside the cone the shot goes straight along the nose.
// The same rule serves the player's keys and the ace bot (tools/campaign-bot.mjs): the bot gets no help a human would not. The pilots' guns, the cruiser's turrets and the Long Haul's autotarget (src/autotarget.js) are not touched.
//   campCockpitAimReach(C)         px the guns look out to: the shot's flight (speed times its life) times CAMP.cockpit.aimReach
//   campCockpitLead(C, f, u)       { rot, t, x, y }: the angle to shoot a ship u from the fighter f so the shot and it meet, the time that takes (s), and where (world); where u is now if no shot gets there
//   campCockpitAimPick(C, f, cone, hold)   { u, d, off } or null: the hostile in the cone (radians) and in reach: the picked one, else `hold` (the id the guns had), else the nearest
//   campCockpitAim(C)              once a tick from campCockpitStep: sets C.cockpit.aim = { id, rot (the shot's angle), x, y (the lead point), off (the nose off the bearing), steer (the help sends the shot), on (the nose is on the lead point) } or null
//   campCockpitAimSync(scene)      the scene half: the thin mint ring at the lead point, lit while the nose is on it; called by campaignscene every frame
const campAimRad = d => Math.max(0, +d || 0) * Math.PI / 180;
const campAimWrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const CAMP_COCKPIT_AIMDRAW = { r: 10, line: 1.5, dim: 0.45, depth: 9 }; // the ring's radius and line on the SCREEN (px), its alpha while the nose is off the lead point, the depth over the ships (4 and 5), the wing tag (6) and the target's square (8)

const campCockpitAimReach = C => (CAMP.fighter.bullet * (C.shot || 1)) * (CAMP_COCKPIT_LIFE / 1000) * (+CAMP.cockpit.aimReach || 0);

// where to point so the shot and a moving ship meet: in the frame of the shot, which keeps campDrift of the fighter's own speed, the ship is at p and moves at v; the shot, at speed s, reaches it at the time t where |p + v t| = s t
// (the smaller positive root). No such time, or one too far for the shot's flight: where the ship is now.
function campCockpitLead(C, f, u) {
  const s = CAMP.fighter.bullet * (C.shot || 1), px = u.x - f.x, py = u.y - f.y, out = { rot: Math.atan2(py, px), t: 0, x: u.x, y: u.y }, k = +CAMP.cockpit.aimLead;
  if (!(k > 0)) return out;
  const vx = (u.vx || 0) - (f.vx || 0) * campDrift, vy = (u.vy || 0) - (f.vy || 0) * campDrift;
  const a = vx * vx + vy * vy - s * s, b = 2 * (px * vx + py * vy), cc = px * px + py * py;
  let t = -1;
  if (Math.abs(a) < 1e-6) t = b < 0 ? -cc / b : -1;
  else { const d = b * b - 4 * a * cc; if (d >= 0) { const q = Math.sqrt(d), t1 = (-b - q) / (2 * a), t2 = (-b + q) / (2 * a), lo = Math.min(t1, t2), hi = Math.max(t1, t2); t = lo > 0 ? lo : hi; } }
  if (!(t > 0) || t * s > s * CAMP_COCKPIT_LIFE / 1000 + (u.r || 0) + 200) return out; // it is gone before the shot gets there
  t *= k;
  out.rot = Math.atan2(py + vy * t, px + vx * t); out.t = t; out.x = u.x + (u.vx || 0) * t; out.y = u.y + (u.vy || 0) * t;
  return out;
}

function campCockpitAimPick(C, f, cone, hold) {
  const reach = campCockpitAimReach(C), seen = typeof campSeen === 'function', list = [];
  campAliens(C).forEach(u => {
    if (u.docked || (seen && !campSeen(C, u))) return; // a hostile the sensors have not seen is not one the guns can know
    const d = campDist(f, u); if (d - (u.r || 0) > reach) return;
    const off = Math.abs(campAimWrap(Math.atan2(u.y - f.y, u.x - f.x) - f.rot)); if (off > cone) return;
    list.push({ u, d, off });
  });
  if (!list.length) return null;
  const picked = typeof campTgtNow === 'function' ? campTgtNow(C) : null;
  return list.find(e => picked && e.u === picked) || list.find(e => hold && e.u.id === hold) || list.sort((p, q) => p.d - q.d)[0];
}

function campCockpitAim(C) {
  const S = C && C.cockpit; if (!S) return null;
  const f = C.by && C.by[S.id], K = CAMP.cockpit;
  if (!f || f.hp <= 0) { S.aim = null; return null; }
  const cone = campAimRad(K.aimCone), e = campCockpitAimPick(C, f, cone > 0 ? cone : campAimRad(K.aimMark), S.aim && S.aim.id); // with the cone 0 the marker still looks about (aimMark) but nothing steers
  if (!e) { S.aim = null; return null; }
  const L = campCockpitLead(C, f, e.u);
  S.aim = { id: e.u.id, rot: L.rot, x: L.x, y: L.y, off: e.off, steer: cone > 0, on: Math.abs(campAimWrap(L.rot - f.rot)) <= campAimRad(K.aimOn) };
  return S.aim;
}

// the scene's half: one thin mint ring at the lead point of the hostile the guns track, in the colour of the player's fire (never gold, amber or pink), dim until the nose is within aimOn degrees of it, then bright. Only while a fighter is flown.
function campCockpitAimSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, V = scene.hud; if (!C || !cam || !V) return;
  const A = scene.mode === 'play' && !scene.mp && C.cockpit && C.cockpit.aim ? C.cockpit.aim : null;
  let g = V.aimMark; if (!A) { if (g && g.visible) { g.clear(); g.setVisible(false); } return; }
  if (!g || (g.active === false && !g.scene)) g = V.aimMark = scene.add.graphics().setDepth(CAMP_COCKPIT_AIMDRAW.depth);
  const K = CAMP_COCKPIT_AIMDRAW, z = cam.zoom > 0 ? cam.zoom : 1, col = typeof campMomentsFireColor === 'function' ? campMomentsFireColor('own') : 0x7df0c0;
  g.clear(); g.setVisible(true);
  g.lineStyle(K.line / z, col, A.on ? 1 : K.dim).strokeCircle(A.x, A.y, K.r / z);
  if (A.on) g.fillStyle(col, 1).fillCircle(A.x, A.y, 1.5 / z); // lit: the ring has a dot in it
}

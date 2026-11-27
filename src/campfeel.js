// ---------- The cruiser flies with the Long Haul ship's feel: ribbon trails, flickering flames, a soft camera (card space-game-cruiser-long-haul-feel; Troy, 26 Nov 2026: "bring the Long Haul ship's flight feel to the Campaign cruiser") ----------
// The Long Haul's ship has three things the Campaign's cruiser lacked: a curved ribbon behind each engine (src/ships.js shipsOne: the last 420 ms of each nozzle's positions, fading and thinning toward the tail), a layered
// flame that flickers every frame (shipsFlame: a soft glow, the coloured plume, a white core), and a camera that follows with a lag (space.js startFollow, lerp 0.12) and zooms with the speed. This file gives the CRUISER the same
// three, in the flat cut: pale blue and white (never gold or amber: colour meanings hold), ADD blend. NEW Campaign functions only: the Long Haul's files (src/ships.js, src/feel.js, src/camzoom.js, src/space.js) are read for the
// idea and never changed, and nothing the Long Haul draws moves. Only the picture and the camera: no rule, number, speed or hit circle of the flight is read or written (the boost's own state, campFlameState and C.boost.on,
// is only read). Behind CAMP.flags.feel (ON in the table) and the address ?feel=0 (the tests' and the comparison's way back to the steady streaks and the plain camera); the ship look (CAMP.flags.shiplook) draws the flames, so it
// must be on too.
// THE FIGHTER HE FLIES (card space-game-fly-fighter-l2; Troy, 26 Nov 2026: the Long Haul's feel on a pilot's fighter, the cruiser left heavy): every effect here and in src/campfeelfx.js attaches to campFeelShip, the ship the camera is on (campEye: the cruiser, or the fighter whose stick he
// holds, src/campcockpit.js). The fighter has its own nozzles (CAMPFEEL.nozzles.fighter, read from its picture), its own flame and ribbon proportions (CAMPFEEL.look: a 22 px ship needs a bigger flame than the cruiser's share of its length to read), its
// own boost store and stick (campBoostHolder, campFeelInput) and a closer camera while he holds it (CAMPZOOM.view.cockpit, eased in and out: campFeelCockpitK).
//   RIBBONS   campFeelRibbonNew / campFeelRibbonPush / campFeelRibbonSegs: one list of points for each engine (pure: tests/campfeel.mjs), with the Long Haul's guards (a jump is a teleport: the ribbon is cut; the clock
//             never runs backwards). A point is { x, y, t, w, b } (b: how hard the boost was then, 0 to 1, for the colour).
//   FLAMES    campFeelFlick (the same flicker every frame from the clock, no Math.random: pure) and campFeelFlameParts (the layers: glow, plume, core, the disc at the nozzle).
//   DRAWING   campFeelDraw(scene, S, u, sp, C): once a frame from src/shiplookfx.js slookFxFrame, for the cruiser only: ribbons first, then flames, on one Graphics (ADD blend, under the cruiser). true when it drew.
//   CAMERA    campFeelCamStep (pure: the ease of the boost's share) and campFeelCamera(scene) (once a frame, BEFORE camzoomFrame: the zoom-out is the camera's base zoom, which camzoom multiplies by the player's own zoom, so
//             clicks, the drag, the far-zoom marks, the Tab map and the window's fill all read one zoom; the follow's lerp drops while boosting so the cruiser pulls ahead).
const CAMPFEEL = {
  addr: 'feel',                  // the address's name for the switch: ?feel=0 is off whatever the flag says, ?feel (=1) on
  memo: { s: null, v: null },    // the page's address, read again only when it changed
  ribbon: { ms: 600, jump: 240, speedK: 1800, min: 25, thr: 0.05, w: 0.02, wTh: 0.015, wBoost: 0.5, minPx: 1.4, a: 0.32, aBoost: 0.5, cap: 72, color: 0x6fd6ff, hot: 0xb4e8ff }, // ms of history (420 in the Long Haul; the cruiser is slower, so a little more); jump: px a nozzle may move between two frames before it is a teleport (speedK px/s times the frame's time, at least jump); min: px/s under which a ship with no thrust leaves none; w: the ribbon's width as a share of the cruiser's drawn length, plus wTh for full thrust and wBoost more on boost; minPx: never thinner than this on the screen; a, aBoost: the opacity at the head; cap: points kept at most; color, hot: the pale blue, and the white it goes to on boost
  nozzles: { carrier: [[-0.5, 0.07], [-0.5, -0.07]], fighter: [[-0.38, 0.07], [-0.38, -0.07]], default: [[-0.5, 0]] },   // where the engines are, by the kind of ship, as shares of its drawn length (back, side): the cruiser's two; the pilot's fighter has two, on the shoulders of the notch in its tail (src/shiplook.js: the tail's points are (-0.32, 0.1), (-0.42, 0), (-0.32, -0.1)); any other ship the player may fly has one in the middle of its tail until its own are written here
  flame: { min: 0.04, thrust: 0.5, boost: 0.6, flare: 0.35, wid: 0.1, boostWid: 0.01, flareWid: 0.006, flick: [0.85, 0.3], glow: [1.6, 1.25, 0.14], plume: 0.65, core: [0.45, 0.55, 0.85], disc: [0.7, 0.45], color: 0x6fd6ff, hot: 0x9fe4ff, depth: 4.4 }, // the lengths and widths are the steady streaks' (src/shiplookfx.js SLOOKFX.flame, as a share of the cruiser's length); the Long Haul's layers: glow (width x1.6, length x1.25, opacity 0.16), plume (width x1, length x1, 0.8), core (width x0.45, length x0.55, 0.9), a disc at the nozzle (radius x0.7, 0.5); the flicker is 0.85 to 1.15 each frame
  look: { fighter: { len: 2, wid: 2.5 }, default: { len: 1, wid: 1 } },       // how big a ship's flame, ribbon and puffs are against the cruiser's share of its length (above): the Long Haul's Wren has a 54 px flame at full thrust on a 36 px hull (1.5 lengths) and the cruiser's is half a length, so a 22 px fighter flown with the Wren's feel needs a flame about twice the cruiser's proportion (len: times the flame's length, wid: times its width, the ribbon's and the puffs')
  cam: { lag: 0.12, boostLag: 0.12, boostZoom: 0.9, rateIn: 2.2, rateOut: 1.4, cockpitRate: 5 },  // the follow's lerp (the Long Haul's 0.12; the scene's own), the lerp at full boost (0.07 made the ship pull ahead of the middle, the view trailing; brief 7 decision 7 leads it instead, so it is the same 0.12 now), the zoom's multiplier at full boost (a slight zoom-out), and how fast the boost's share comes (per second: about half a second) and goes (a little under a second); cockpitRate: how fast the closer view of a flown fighter comes and goes (per second: about 0.6 s to be nearly there, so the closer view arrives as the camera's glide to the fighter does, CAMPCAM.glide)
  lead: { frac: 0.2, rate: 4, min: 20, fps: 60 }          // THE VIEW LEADS A BOOSTING SHIP (card space-game-b7-camera-lead-stick; Troy's decision 7 of brief 7: "the view leads a boosting ship by about a fifth of the screen in the direction of flight; today it trails"): frac: the share of the screen's width (height) the middle of the view is ahead of the ship at full boost, along the flight; rate: how fast the lead follows its target (per second); min: px/s under which a ship has no direction; fps: the frames a second the follow's lerp is per (Phaser's lerp is a share of the way each frame: the steady lag at speed v is v (1 - lerp) / (lerp fps))
};

// ---- the switch ----
function campFeelAddrVal(search) { // the value of ?feel in the address, lower case: null when it is not there, '' for a bare ?feel (the last one counts); the page's own address is read again only when it changed
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = CAMPFEEL.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === CAMPFEEL.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const campFeelAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(campFeelAddrVal(search)) >= 0;
const campFeelAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(campFeelAddrVal(search)) >= 0;
const campFeelOn = () => !campFeelAddrOff() && ((typeof campFlag === 'function' && campFlag('feel')) || campFeelAddrOn());

// ---- the flicker and the flame's layers (pure) ----
function campFeelFlick(t, i) { // 0.85 to 1.15, a new value every frame (the Long Haul's Math.random, from the clock instead, so a test can read it): t in ms, i the engine
  const F = CAMPFEEL.flame.flick, x = Math.sin((+t || 0) * 0.0731 + (i | 0) * 78.233) * 43758.5453;
  return F[0] + F[1] * (x - Math.floor(x));
}
const campFeelMix = (a, b, k) => { k = Math.max(0, Math.min(1, +k || 0)); const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k); return (m(16) << 16) | (m(8) << 8) | m(0); }; // a colour part of the way to another
// the layers of one flame at the nozzle (x, y), pointing along rot (the flame trails behind): len and wid are the steady streak's length and height (wid is the full height); flick the frame's flicker; boost 0 to 1 (whiter)
// -> [{ kind: 'tri', pts: [x0, y0, x1, y1, x2, y2], color, a } or { kind: 'disc', x, y, r, color, a }], from the back layer to the front
function campFeelFlameParts(x, y, rot, len, wid, flick, boost) {
  const F = CAMPFEEL.flame, c = Math.cos(rot), n = Math.sin(rot), L = len * (flick > 0 ? flick : 1), hw = wid / 2, plume = campFeelMix(F.color, F.hot, boost);
  const tri = (half, long, color, a) => ({ kind: 'tri', pts: [x - n * half, y + c * half, x + n * half, y - c * half, x - c * L * long, y - n * L * long], color, a });
  return [
    tri(hw * F.glow[0], F.glow[1], plume, F.glow[2]),
    tri(hw, 1, plume, F.plume),
    tri(hw * F.core[0], F.core[1], 0xffffff, F.core[2]),
    { kind: 'disc', x, y, r: hw * F.disc[0], color: 0xffffff, a: F.disc[1] }
  ];
}
// THE SHIP THE PLAYER FLIES (Troy, 26 Nov 2026, through ORCH: he may fly a pilot's fighter instead of a faster cruiser): every effect of the feel (this file and src/campfeelfx.js) attaches to the unit this answers, by its drawn size and its engines, never to
// the cruiser by name. The cruiser today; the one place that changes when the player flies another ship. Its top speed is campFeelTop.
const campFeelShip = C => (typeof campEye === 'function' ? campEye(C) : C && C.carrier) || null; // the cruiser, or the fighter whose stick he holds (card space-game-fly-fighter-l1: campEye, src/campcockpit.js)
const campFeelTop = (C, u) => !u ? 0 : u.cockpit ? CAMP.cockpit.boost : u.kind === 'carrier' || u === (C && C.carrier) ? CAMP.carrier.speed * (CAMP.boost && CAMP.boost.speed > 1 ? CAMP.boost.speed : 1) : (u.vmax > 0 ? u.vmax : 0); // the fastest it goes: the cruiser's boost top, else the ship's own vmax
const campFeelEngines = u => (u && CAMPFEEL.nozzles[u.kind]) || CAMPFEEL.nozzles.default;   // the engines of this ship, as shares of its drawn length
const campFeelLook = u => (u && CAMPFEEL.look[u.kind]) || CAMPFEEL.look.default;              // how big its flame, ribbon and puffs are against the cruiser's share: { len, wid } multipliers (1 and 1 for the cruiser)
const campFeelInput = C => (C && C.cockpit && C.cockpit.input) || (C && C.input) || {};     // the stick of the ship he flies: the fighter's while he holds it (src/campcockpit.js), else the cruiser's (the turn puffs and the braking jets read it)
// where the nozzles are (pure): the ship u, drawn dw px long
function campFeelNozzles(u, dw) {
  const c = Math.cos(u.rot || 0), s = Math.sin(u.rot || 0);
  return campFeelEngines(u).map(e => ({ x: u.x + c * e[0] * dw - s * e[1] * dw, y: u.y + s * e[0] * dw + c * e[1] * dw }));
}
// the flame's size from the boost's own state f = { th, boost, flare } (src/campboost.js campFlameState), as a share of the ship's drawn length dw: { len, wid } in px, or null when the engines are off (the steady streak's own rule); look: the ship's own
// proportions (campFeelLook), 1 and 1 for the cruiser. The engines are off by the cruiser's share, whatever the look: the look only makes a lit flame bigger
function campFeelFlameSize(dw, f, look) {
  const F = CAMPFEEL.flame, cl = v => Math.max(0, Math.min(1, +v || 0)), lk = look || CAMPFEEL.look.default; if (!(dw > 0) || !f) return null;
  const th = cl(f.th), b = cl(f.boost), fl = cl(f.flare), len = dw * (th * F.thrust + b * F.boost + fl * F.flare); if (!(len >= dw * F.min)) return null;
  return { len: len * (lk.len > 0 ? lk.len : 1), wid: dw * (F.wid + b * F.boostWid + fl * F.flareWid) * (lk.wid > 0 ? lk.wid : 1) };
}

// ---- the ribbons (pure) ----
const campFeelRibbonNew = (n = 2) => ({ rib: Array.from({ length: n }, () => []), cut: 0 }); // cut: how many times a ribbon was cut by a guard (a test reads it)
// one nozzle's new position this frame: the guards, then the point (when the engine is on), then the old points go. th the thrust 0 to 1, b the boost 0 to 1, speed the ship's own px/s, dw its drawn length, t the clock in ms
function campFeelRibbonPush(R, i, x, y, t, th, b, speed, dw) {
  const K = CAMPFEEL.ribbon, rib = R.rib[i] || (R.rib[i] = []);
  if (!isFinite(x) || !isFinite(y) || !isFinite(t)) { rib.length = 0; R.cut++; return rib; }
  const last = rib[rib.length - 1];
  if (last && Math.hypot(x - last.x, y - last.y) > Math.max(K.jump, K.speedK * Math.max(0, t - last.t) / 1000)) { rib.length = 0; R.cut++; } // a teleport (the scene started again, a launch, a setPosition), not flight: a ribbon across the gap would be a bar through the screen
  while (rib.length && rib[rib.length - 1].t > t) { rib.pop(); R.cut++; } // the clock never runs backwards for a ribbon
  if (th > K.thr || speed > K.min) {
    const w = dw * (K.w + K.wTh * Math.max(0, Math.min(1, th)) + K.wBoost * K.w * Math.max(0, Math.min(1, b)));
    rib.push({ x, y, t, w, b: Math.max(0, Math.min(1, b)) });
    if (rib.length > K.cap) rib.shift();
  }
  while (rib.length && t - rib[0].t > K.ms) rib.shift();
  return rib;
}
// the segments to draw for one ribbon at clock t, zoom z: [{ x0, y0, x1, y1, w, a, color }]: older points fade and thin toward the tail (k above 0 and at most 1), never thinner than minPx on the screen
function campFeelRibbonSegs(rib, t, z) {
  const K = CAMPFEEL.ribbon, out = [], zz = z > 0 ? z : 1;
  for (let j = 1; j < rib.length; j++) {
    const p = rib[j], k = 1 - (t - p.t) / K.ms; if (!(k > 0 && k <= 1)) continue;
    out.push({ x0: rib[j - 1].x, y0: rib[j - 1].y, x1: p.x, y1: p.y, w: Math.max(p.w * k, K.minPx / zz * k), a: (K.a + (K.aBoost - K.a) * p.b) * k, color: campFeelMix(K.color, K.hot, p.b) });
  }
  return out;
}

// ---- drawing (Phaser) ----
// once a frame for the cruiser u (its sprite sp), from slookFxFrame; true when the ribbons and the layered flames were drawn here (the scene's steady streaks stay hidden), false when the feel is off (they are drawn as before)
function campFeelDraw(scene, S, u, sp, C) {
  if (!campFeelOn() || !scene || !scene.add || !S || !u || !sp) return false;
  const g = S.feelG || (S.feelG = scene.add.graphics().setDepth(CAMPFEEL.flame.depth).setBlendMode(Phaser.BlendModes.ADD)), map = !!scene.mp, dw = sp.displayWidth;
  g.clear(); g.setVisible(!map);
  if (!(u.hp > 0) || sp.visible === false || !(dw > 0)) { if (S.feelR) S.feelR.rib.forEach(r => { r.length = 0; }); if (typeof campFxHide === 'function') campFxHide(S); return true; }
  const eng = campFeelEngines(u), look = campFeelLook(u); if (!S.feelR || S.feelId !== u.id || S.feelR.rib.length !== eng.length) { S.feelR = campFeelRibbonNew(eng.length); S.feelId = u.id; S.fxs = null; } // (another ship, or another number of engines: a new history, and the effects of the ship he left go with it: the sparks, the puffs, the glow and the streaks begin again)
  const R = S.feelR, f = typeof campFlameState === 'function' ? campFlameState(C) : { th: 0, boost: 0, flare: 0 };
  const t = C.t || 0, z = scene.cameras && scene.cameras.main && scene.cameras.main.zoom > 0 ? scene.cameras.main.zoom : 1, speed = Math.hypot(u.vx || 0, u.vy || 0), noz = campFeelNozzles(u, dw), size = campFeelFlameSize(dw, f, look);
  noz.forEach((p, i) => campFeelRibbonPush(R, i, p.x, p.y, t, f.th, f.boost, speed, dw * look.wid)); // (the width is a share of the length given: the ship's own look makes a small ship's ribbon thicker)
  R.rib.forEach(rib => campFeelRibbonSegs(rib, t, z).forEach(s => { g.lineStyle(s.w, s.color, s.a); g.lineBetween(s.x0, s.y0, s.x1, s.y1); }));
  if (size) noz.forEach((p, i) => campFeelFlameParts(p.x, p.y, u.rot || 0, size.len, size.wid, campFeelFlick(t, i), f.boost).forEach(o => {
    g.fillStyle(o.color, o.a);
    if (o.kind === 'disc') g.fillCircle(o.x, o.y, o.r); else g.fillTriangle(o.pts[0], o.pts[1], o.pts[2], o.pts[3], o.pts[4], o.pts[5]);
  }));
  if (typeof campFxDraw === 'function') campFxDraw(scene, S, u, noz, f, dw, z, t, scene.game && scene.game.loop ? Math.min(250, scene.game.loop.delta) : 16.7, C, look); // the rest of the Long Haul's flight effects (src/campfeelfx.js): sparks, puffs, the engine glow, the line ahead, the streaks
  return true;
}
function campFeelHide(S) { if (S && S.feelG) S.feelG.setVisible(false); if (S && S.feelR) S.feelR.rib.forEach(r => { r.length = 0; }); if (typeof campFxHide === 'function') campFxHide(S); } // the switch went off (or the look): the picture goes and the history with it

// ---- the camera ----
// the boost's share of the camera's change, eased: z 0 to 1, in at rateIn and out at rateOut per second (dt in ms); never overshoots
function campFeelEase(z, target, rate, dt) { // z eased toward target at `rate` a second (dt in ms); never overshoots, and lands when it is within a hundredth (a hundredth of the zoom-out is a tenth of a percent of the zoom: nobody sees it)
  const k = 1 - Math.exp(-Math.max(0, dt) / 1000 * rate), v = z + (target - z) * k;
  return Math.abs(target - v) < 0.01 ? target : v;
}
function campFeelCamStep(z, boosting, dt) { const K = CAMPFEEL.cam, target = boosting ? 1 : 0; return campFeelEase(z, target, target > z ? K.rateIn : K.rateOut, dt); }
// the closer view while he flies a fighter (card space-game-fly-fighter-l2: a 22 px ship is a speck at the start zoom, 0.335): the multiplier of the base zoom at the share z of the way in, CAMPZOOM.view.cockpit times closer at 1, in the log of the zoom so
// the middle of the way is the middle of what is seen (3 gives the Long Haul's own 1.0 from the start zoom; a live slider, src/camptune.js)
const campFeelCockpitK = z => { const k = typeof CAMPZOOM === 'object' && CAMPZOOM.view && CAMPZOOM.view.cockpit > 0 ? CAMPZOOM.view.cockpit : 1; return Math.pow(k, Math.max(0, Math.min(1, +z || 0))); };
const campFeelZoomK = z => 1 + (CAMPFEEL.cam.boostZoom - 1) * Math.max(0, Math.min(1, z));   // the multiplier of the camera's base zoom at the share z of the boost
const campFeelLerp = z => CAMPFEEL.cam.lag + (CAMPFEEL.cam.boostLag - CAMPFEEL.cam.lag) * Math.max(0, Math.min(1, z)); // the follow's lerp at the share z of the boost
// THE VIEW LEADS A BOOSTING SHIP (card space-game-b7-camera-lead-stick). Where the follow point sits against the ship, as an offset in world px, the way the ship flies positive (the camera follows ship + offset): at full boost the middle of the view is ahead of
// the ship by CAMPFEEL.lead.frac of the screen (a fifth of the width along x, of the height along y: the camera's own size, so a window that fills the screen and the far zoom are counted: it is what is seen), and with no boost the soft follow is as it was (the ship
// ahead of the middle by its steady lag, v (1 - lerp) / (lerp fps)). In between it is a blend by the share s (the boost's share, eased, times the speed's share of the top): the view's middle is ship + s L - (1 - s) lag along the flight; the offset adds the
// lag s times over, so the follow's own lag is not left in the lead. vx, vy the ship's velocity, top its fastest, share the boost's share 0 to 1, vw and vh the world px the camera shows, l the follow's lerp now. Pure.
function campFeelLead(vx, vy, top, share, vw, vh, l) {
  const K = CAMPFEEL.lead, sp = Math.hypot(vx || 0, vy || 0), sh = Math.max(0, Math.min(1, +share || 0)); if (!(sp > K.min) || !(sh > 0) || !(top > 0) || !(l > 0)) return { x: 0, y: 0 };
  const s = sh * Math.min(1, sp / top), dx = vx / sp, dy = vy / sp, lag = sp * (1 - l) / (l * K.fps);
  return { x: s * (dx * K.frac * (vw > 0 ? vw : 0) + dx * lag), y: s * (dy * K.frac * (vh > 0 ? vh : 0) + dy * lag) };
}
// one frame of the lead's own ease toward a target (dt in ms): the lead never jumps when the heading turns; it lands on the target within half a pixel (and on 0 for a target of 0)
function campFeelLeadStep(L, tx, ty, dt) {
  const k = 1 - Math.exp(-Math.max(0, dt) / 1000 * CAMPFEEL.lead.rate); L.x += (tx - L.x) * k; L.y += (ty - L.y) * k;
  if (Math.abs(tx - L.x) < 0.5) L.x = tx; if (Math.abs(ty - L.y) < 0.5) L.y = ty;
  return L;
}
// the lead on the camera: scene.camLead = { x, y } (world px, ahead positive) and the follow's offset (the other way: Phaser follows the ship minus it): with 5-GEN's frame there (src/campmoments.js campMomentsOffset) the offset is its sum of the kill's nudge and the lead, else the lead alone
function campFeelLeadApply(scene, cam, L) {
  scene.camLead = { x: L.x, y: L.y };
  if (typeof cam.setFollowOffset !== 'function') return;
  const want = typeof campMomentsOffset === 'function' ? campMomentsOffset(scene) : { x: -L.x, y: -L.y }, o = cam.followOffset; // with the moments' frame there (src/campmoments.js) the offset is its sum of the kill's nudge and this lead, which it sets itself only while a nudge is live: the lead is put on every frame here, by its own sum
  if (!o || o.x !== want.x || o.y !== want.y) cam.setFollowOffset(want.x, want.y);
}
// once a frame, on the scene's postupdate event BEFORE camzoomFrame (src/camzoom.js; the scene installs this first): the boost's share eases, the base zoom (camzoom's c.base, 1 unless something else moves the zoom) takes the multiplier
// that camzoomFrame then multiplies by the player's zoom, and the follow's lerp drops while boosting. Nothing happens with the feel off, the cruiser gone, or the camera not on the cruiser's follow: the share goes back to 0
function campFeelCamera(scene) {
  const c = scene && scene._cz, cam = scene && scene.cameras && scene.cameras.main, C = scene && scene.camp; if (!c || !cam || !C) return;
  const st = scene.feel || (scene.feel = { z: 0, k: 1, punch: 0, launched: false, cz: 0, lead: { x: 0, y: 0 } }), live = campFeelOn() && !scene.dead && !scene.leaving && !c.anchor, dt = scene.game && scene.game.loop ? scene.game.loop.delta : 16.7;
  st.z = campFeelCamStep(st.z, live && !!(campBoostHolder(C) && campBoostHolder(C).on), dt); // (the boost of the ship he flies: the fighter's while he holds its stick)
  if (live && !st.launched && scene.mode === 'play' && C.t < 1500) { st.launched = true; st.punch = 1; } // the launch punch (src/campfeelfx.js campFxPunchK; the Long Haul's feelLaunch): the first frames of the flight, once for a scene start
  if (st.punch > 0) st.punch = live && typeof CAMPFX === 'object' ? Math.max(0, st.punch - dt / CAMPFX.punch.ms) : 0;
  if (!scene.dead && !scene.leaving && !c.anchor) { const tc = C.cockpit && typeof campCockpitOn === 'function' && campCockpitOn() ? 1 : 0; st.cz = typeof campCamReduced === 'function' && campCamReduced() ? tc : campFeelEase(st.cz || 0, tc, CAMPFEEL.cam.cockpitRate, dt); } // (under reduced motion the closer view is there at once: src/campcockpitcam.js) // the closer view of a flown fighter: in while he holds the stick, out when it is handed back or lost (with the feel off as well: it is the cockpit's, not the feel's)
  const k = campFeelZoomK(st.z) * (st.punch > 0 && typeof campFxPunchK === 'function' ? campFxPunchK(st.punch) : 1) * campFeelCockpitK(st.cz);
  if (c.base === st.k && c.out !== null && cam.zoom === c.out) { c.base = k; st.k = k; } // the base is ours while it is what we last wrote and nothing else has moved the zoom; if a zoom effect or a setZoom of the scene has made it something else, ours waits (it never writes over another's value)
  { // the lead: only while the camera follows the ship he flies (not a glide, a focus on another ship, the hand's drag), only with the feel on; it eases to nothing otherwise
    const eye = typeof campEye === 'function' ? campEye(C) : null, esp = typeof campEyeSprite === 'function' ? campEyeSprite(scene) : null, L = st.lead || (st.lead = { x: 0, y: 0 });
    const t = live && eye && esp && cam._follow === esp && cam.zoom > 0 ? campFeelLead(eye.vx, eye.vy, campFeelTop(C, eye), st.z, cam.width / cam.zoom, cam.height / cam.zoom, campFeelLerp(st.z)) : { x: 0, y: 0 };
    if (L.x !== t.x || L.y !== t.y || scene.camLead) { campFeelLeadStep(L, t.x, t.y, dt); if (scene.camLead || L.x !== 0 || L.y !== 0) campFeelLeadApply(scene, cam, L); }
  }
  if (cam._follow && cam.lerp && typeof cam.lerp.set === 'function') { const l = live || st.z > 0 ? campFeelLerp(st.z) : CAMPFEEL.cam.lag; if (cam.lerp.x !== l) cam.lerp.set(l, l); } // (the scene's own is CAMPFEEL.cam.lag, 0.12: the drag and the focus put it back to the same)
}
function campFeelInstall(scene) { // from the Campaign scene's create(), BEFORE camzoomSetup: the frame on the postupdate event (the order of listeners is the order they were added), taken off when the scene shuts down
  if (!scene || !scene.events || typeof scene.events.on !== 'function') return;
  const frame = () => campFeelCamera(scene), off = () => { scene.events.off('postupdate', frame); scene.feel = null; };
  scene.events.on('postupdate', frame); scene.events.once('shutdown', off);
}

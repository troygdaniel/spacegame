// ---------- Fill the window: the flight's view takes the window's shape, no dark bands, nothing stretched, nothing cut (landing A; card space-game-fill-window-a-flight) ----------
// Troy, 25 Nov 2026: "stretch to fit the window's full height and width". The game was a fixed 1280 by 720 picture scaled to fit (Phaser.Scale.FIT, src/main.js), so a window of another shape had dark bands.
// The plan is the scope report on card space-game-fill-window-scope, with Troy's correction of the same day: "get extra room because i open up the window.. not scale". FIT is kept and the GAME'S OWN SIZE is
// the window's size divided by a FIXED scale (FILL.k, the size things have on Troy's own window today), so a game pixel is always the same size on the glass and a bigger window is more game px both ways: more
// room, nothing drawn bigger. A window too small to show 1280 by 720 at that scale scales down to fit, as the game always did. The world and the stars are drawn on the whole size (the cruiser in the middle); everything still drawn on the canvas HUD
// stays where its numbers put it, in a 1280 by 720 SAFE AREA in the middle (the HUD camera's viewport); the page HUD goes to the window's true corners. The Campaign's other screens do it too (landing B: the
// title, the ready room with its pick and briefing, the warp, Settings over them, the Tab map): each keeps its 1280 by 720 layout in the safe area at the same fixed scale, with sky round it where it has a
// backdrop. The Long Haul's scenes never ask, so the game is 1280 by 720 for them, as it was.
// Behind one switch, OFF at first: CAMP.flags.fill (src/campaign.js), a row of Settings > CONTENT (kept in the browser), and the address ?fill=1 / ?fill=0 (the tests' way).
// The one idea the other files need: the old maths of "where is this world point on the screen" are all written for a 1280 by 720 view, and they stay TRUE in the safe area if the camera's scroll is read
// through fillSX / fillSY (the scroll the view would have at 1280 by 720: the real one plus the safe area's offset) and a pointer through fillPX / fillPY (its place in the safe area). With the switch off the
// offsets are 0 and all four give back what they were given.
//   fillOn()                      is it on: the flag or ?fill=1, unless ?fill=0;   fillSet(on): the Settings row's (the flag and the browser's memory);   fillLoad(): the memory read back when the page starts
//   fillSize(winW, winH)          PURE: the game's size for a window: { w, h, ox, oy, k } (k: screen px for a game px, FILL.k unless the window is too small for 1280 by 720 at it, then the scale that fits;
//                                 w by h: the window divided by k, to an even pixel, never less than 1280 by 720; ox, oy: where the 1280 by 720 safe area starts). The tests' 1280 by 720 window gives exactly 1280 by 720 and 0, 0
//   fillW(), fillH()              the size now (1280 and 720 unless the flight has taken the window);   fillOx(), fillOy(): the safe area's offset now (0 unless it has)
//   fillSX(cam), fillSY(cam)      a camera's scroll as the 1280 by 720 maths want it;   fillPX(p), fillPY(p): a pointer in the safe area;   fillPutX(x), fillPutY(y): a scroll worked out the old way, as the camera wants it
//   fillSync(scene, o)            a filling scene calls it every frame: takes the window when the switch is on, again when the window changes, and sets its cameras (the flight's three and the star layers; another
//                                 screen's one camera on the safe area and its backdrop on the whole window). o.keep: only keeps what a scene under it took (Settings)
//   fillDrop(game)                the game is 1280 by 720 again and every scene's cameras are back (the watch on the game's loop does it when no scene has asked for FILL.idle frames);   fillRelease(scene): the same, at once
//   fillSafeRect(canvas)          the safe area as a rectangle of the page { left, top, width, height, k }: what is laid over the canvas in 1280 by 720 numbers goes there
const FILL = {
  W: 1280, H: 720,               // the game's size as it always was: the least it ever is, and the safe area's
  k: 1.23,                       // THE FIXED SCALE (Troy, 25 Nov 2026): screen px for a game px, the size the game has today on his own window (1578 by 1000: 1578 / 1280 is 1.233). Nothing on the glass is bigger or smaller than he sees now; a bigger window adds room
  cap: 0,                        // NO CAP (card space-game-fill-window-scale-bug; Troy, 26 Nov 2026, playing: "more visible space WITHOUT scaling"). A cap of 1.5 (1920 by 1080 game px) was here for a day, and past it the picture scaled up: on his 2000 px wide window that began at 2362 px, and he felt it as the scale changing. 0: above the least window nothing ever scales; a number here (a multiple of 1280 by 720 each way) would bring the scale-up back
  addr: 'fill', store: 'longhaul.fill',
  memo: { s: null, v: null },    // the page's address, read again only when it changed
  now: { on: false, w: 1280, h: 720, ox: 0, oy: 0 }, // what the game is now
  stamp: -1, idle: 2, live: [], watch: null          // the frame a scene last asked for the window; the frames with no asking after which it is given back; the scenes whose cameras are set for it; the game whose loop is watched
};
function fillAddrVal(search) { // the value of ?fill in the address, lower case: null when it is not there, '' for a bare ?fill (the last one counts)
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = FILL.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === FILL.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const fillAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(fillAddrVal(search)) >= 0;
const fillAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(fillAddrVal(search)) >= 0;
const fillOn = () => !fillAddrOff() && ((typeof campFlag === 'function' && campFlag('fill')) || fillAddrOn());
function fillSet(on) {
  if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.fill = !!on;
  try { if (typeof localStorage !== 'undefined' && localStorage) localStorage.setItem(FILL.store, on ? '1' : '0'); } catch (e) { /* no storage: the flag still moved */ }
  return !!on;
}
function fillLoad() {
  try { const v = typeof localStorage !== 'undefined' && localStorage ? localStorage.getItem(FILL.store) : null; if (v === '1' || v === '0') { if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.fill = v === '1'; return v === '1'; } } catch (e) { /* no storage */ }
  return typeof CAMP === 'object' && CAMP && CAMP.flags ? !!CAMP.flags.fill : false;
}
function fillSize(winW, winH) {
  const W0 = FILL.W, H0 = FILL.H, ww = +winW, wh = +winH;
  if (!(ww > 0) || !(wh > 0)) return { w: W0, h: H0, ox: 0, oy: 0, k: 1 };
  let k = Math.min(FILL.k, ww / W0, wh / H0);                                  // the fixed scale, or less where the window is too small to show 1280 by 720 at it (it scales down to fit, as today)
  if (FILL.cap >= 1) k = Math.max(k, ww / (W0 * FILL.cap), wh / (H0 * FILL.cap)); // a cap on the room: past it the picture scales up
  const even = v => 2 * Math.round(v / 2), w = Math.max(W0, even(ww / k)), h = Math.max(H0, even(wh / k)); // to an even number of px: the safe area then starts on a whole pixel and the middle of the view is the middle of the safe area exactly
  return { w, h, ox: (w - W0) / 2, oy: (h - H0) / 2, k };
}
const fillW = () => FILL.now.w, fillH = () => FILL.now.h, fillOx = () => FILL.now.ox, fillOy = () => FILL.now.oy;
const fillSX = cam => ((cam && cam.scrollX) || 0) + FILL.now.ox, fillSY = cam => ((cam && cam.scrollY) || 0) + FILL.now.oy;
const fillPX = p => ((p && p.x) || 0) - FILL.now.ox, fillPY = p => ((p && p.y) || 0) - FILL.now.oy;
const fillPutX = x => x - FILL.now.ox, fillPutY = y => y - FILL.now.oy;
// the whole view in the safe area's numbers: it reaches from fillX0 to fillX1 across and fillY0 to fillY1 down (0 to 1280 and 0 to 720 unless a scene has taken the window)
const fillX0 = () => -FILL.now.ox, fillX1 = () => FILL.W + FILL.now.ox, fillY0 = () => -FILL.now.oy, fillY1 = () => FILL.H + FILL.now.oy;
// A rule written for a w by h screen (campNavArrow, campSightArrows, campSightFriends: fn(C, view, w, h, ...)) asked for the WHOLE view: it is given the camera's own scroll and the game's size, and what it
// answers (a point, or a list of points; each may carry the point it aims at, tx and ty) is moved back into the safe area's numbers. With nothing taken it is fn(C, view, 1280, 720, ...) as it was.
function fillAsk(fn, C, cam, ...rest) {
  const N = FILL.now, r = fn(C, { x: (cam && cam.scrollX) || 0, y: (cam && cam.scrollY) || 0 }, N.w, N.h, ...rest);
  if (!r || (!N.ox && !N.oy)) return r;
  const mv = a => { if (!a || typeof a !== 'object') return a; const b = Object.assign({}, a, { x: a.x - N.ox, y: a.y - N.oy }); if (a.tx != null) b.tx = a.tx - N.ox; if (a.ty != null) b.ty = a.ty - N.oy; return b; };
  return Array.isArray(r) ? r.map(mv) : mv(r);
}
// campEdgeSpread (src/campedgespread.js) for the whole view: the labels at the window's edge keep clear of each other and of the places the HUD keeps (o.keep, o.boxes: in the safe area's numbers, as the answer is)
function fillSpread(items, o) {
  const N = FILL.now; if (!N.ox && !N.oy) return campEdgeSpread(items, o);
  const rect = b => Array.isArray(b) ? [b[0] + N.ox, b[1] + N.oy, b[2] + N.ox, b[3] + N.oy] : Object.assign({}, b, { x: b.x + N.ox, y: b.y + N.oy });
  const its = items.map(it => { const q = Object.assign({}, it, { x: it.x + N.ox, y: it.y + N.oy }); if (it.tx != null) q.tx = it.tx + N.ox; if (it.ty != null) q.ty = it.ty + N.oy; if (typeof it.want === 'function') q.want = (px, py, an) => it.want(px, py, an); return q; });
  const out = campEdgeSpread(its, Object.assign({}, o, { W: N.w, H: N.h, keep: (o.keep || []).map(rect), boxes: (o.boxes || []).map(rect) }));
  return out.map(p => Object.assign({}, p, { x: p.x - N.ox, y: p.y - N.oy, lx: p.lx - N.ox, ly: p.ly - N.oy, boxes: (p.boxes || []).map(b => Object.assign({}, b, { x: b.x - N.ox, y: b.y - N.oy })) }));
}
function fillCams(s) { // the three cameras of a flight scene (src/camzoom.js) and the star layers, for the size the game has now
  const N = FILL.now, cz = s && s._cz; if (!cz) return false;
  cz.main.setViewport(0, 0, N.w, N.h); cz.bg.setViewport(0, 0, N.w, N.h); // the world and the stars: the whole window
  cz.ui.setViewport(0, 0, N.w, N.h); if (typeof cz.ui.setScroll === 'function') cz.ui.setScroll(-N.ox, -N.oy); // the canvas HUD: the whole window too, its 1280 by 720 numbers moved to the safe area by the camera's SCROLL (src/camzoom.js gives a HUD object of a filling scene a scroll factor of 1 for this). Nothing of it is cut at the safe area's border: a list that opens under a page panel in the window's corner, a ring on a ship out in the extra room, are drawn (card space-game-fill-window-clipping: Troy's Q list showed its last row only)
  (s.bgLayers || []).forEach(t => { if (t && t.setSize && (t.width !== N.w || t.height !== N.h)) t.setSize(N.w, N.h); });
  return true;
}
// a screen that is not the flight (the title, the ready room with its pick and briefing, the warp, Settings; landing B, card space-game-fill-window-b-screens): everything it draws was laid out for 1280 by 720, so its one
// camera becomes the safe area in the middle, at the same fixed scale, and nothing of it moves or scales. What the scene names as its backdrop (scene.fillBack: star layers, a planet) goes on a camera of its own
// under it that covers the whole window: a tile layer is made the window's size, anything else moves with the safe area, so the room round the safe area is sky, not a dark band.
function fillMenuCams(s) {
  const N = FILL.now, main = s && s.cameras && s.cameras.main; if (!main || typeof main.setViewport !== 'function') return false;
  main.setViewport(N.ox, N.oy, FILL.W, FILL.H);
  const back = s.fillBack;
  if (back && back.length && typeof s.cameras.add === 'function') {
    let bg = s.fillBg;
    if (!bg) {
      bg = s.fillBg = s.cameras.add(0, 0, N.w, N.h).setName('fill-bg'); bg.inputEnabled = false;
      const list = s.cameras.cameras; if (list && list.indexOf(bg) > 0) { list.splice(list.indexOf(bg), 1); list.unshift(bg); } // drawn first: under everything else
      back.forEach(o => { o.cameraFilter = main.id; o.fillOn = 1; if (o.tilePositionX === undefined) o.fill0 = { x: o.x, y: o.y }; }); // the backdrop is the back camera's alone
      if (s.events && s.events.once) s.events.once('shutdown', () => { s.fillBg = null; s.fillSig = null; }); // the scene object is used again on the next start
    }
    bg.setViewport(0, 0, N.w, N.h);
    back.forEach(o => { if (o.fill0) o.setPosition(o.fill0.x + N.ox, o.fill0.y + N.oy); else if (o.setSize && (o.width !== N.w || o.height !== N.h)) o.setSize(N.w, N.h); });
  }
  return true;
}
function fillMenuSort(s) { // everything that is not the backdrop is the main camera's alone: looked at once, the first frame after it is made (as src/camzoom.js sorts a flight scene's objects)
  const bg = s.fillBg, list = bg && s.children && s.children.list; if (!list) return;
  for (let i = 0; i < list.length; i++) { const o = list[i]; if (o.fillOn) continue; o.cameraFilter = (o.cameraFilter || 0) | bg.id; o.fillOn = 2; }
}
const fillCamsOf = s => (s && s._cz ? fillCams(s) : fillMenuCams(s));
function fillParent(game) { // the room FIT has for the canvas: the size of the game's parent element, read now (Phaser reads it itself only every half second: a size worked out from the window while FIT still fitted to the old parent left the canvas larger than the window for a moment, its panels cut at the edges); the window's inner size where there is no parent to ask
  const sc = game && game.scale;
  try { if (sc && typeof sc.getParentBounds === 'function' && sc.parentSize) { sc.getParentBounds(); if (sc.parentSize.width > 0 && sc.parentSize.height > 0) return { w: sc.parentSize.width, h: sc.parentSize.height }; } } catch (e) { /* the window's size then */ }
  return { w: window.innerWidth, h: window.innerHeight };
}
function fillGame(game, w, h) { // the game's own size (FIT then fits it to the window); nothing is asked when it is that size already
  const sc = game && game.scale; if (!sc || typeof sc.setGameSize !== 'function') return false;
  if (sc.width !== w || sc.height !== h) sc.setGameSize(w, h);
  return true;
}
// Who holds the window. A scene that fills calls fillSync every frame of its own; that is its word that it still wants the window (FILL.stamp, the game loop's frame). A watch on the game's own loop gives the
// window back when no scene has said so for FILL.idle frames: a scene of the Long Haul has started, or the switch went off while the scene that asked is paused. So nothing is given back between two filling
// scenes (the title to the ready room, the flight to Settings and back): no frame at the old size, no flicker.
function fillStamp(s) {
  const g = s.game; FILL.stamp = g.loop && typeof g.loop.frame === 'number' ? g.loop.frame : FILL.stamp;
  if (FILL.live.indexOf(s) < 0) FILL.live.push(s);
  if (FILL.watch !== g && g.events && typeof g.events.on === 'function') { FILL.watch = g; g.events.on('poststep', () => fillTick(g)); }
}
function fillTick(g) { if (!FILL.now.on) return false; const f = g.loop && typeof g.loop.frame === 'number' ? g.loop.frame : 0; if (f - FILL.stamp <= FILL.idle) return false; return fillDrop(g); }
function fillDrop(game) { // the game is 1280 by 720 again, and every scene that had taken the window has its cameras back as they were
  if (!FILL.now.on && FILL.now.w === FILL.W && FILL.now.h === FILL.H && !FILL.live.length) return false;
  FILL.now = { on: false, w: FILL.W, h: FILL.H, ox: 0, oy: 0 };
  fillGame(game, FILL.W, FILL.H);
  FILL.live.forEach(s => { s.fillSig = null; fillCamsOf(s); }); FILL.live.length = 0;
  return true;
}
// a scene's frame. o.keep (Settings, which the Long Haul opens too): it never takes the window, it keeps it while a scene under it had it
function fillSync(s, o) {
  if (!s || !s.game || typeof window === 'undefined') return false;
  const keep = !!(o && o.keep), want = fillOn() && (!keep || FILL.now.on);
  if (!want) { if (!keep && (FILL.now.on || s.fillSig)) fillDrop(s.game); if (s.fillSig) { s.fillSig = null; fillCamsOf(s); } return false; }
  fillStamp(s);
  const cam0 = s._cz ? s._cz.main : s.cameras && s.cameras.main; if (s.fillCam !== cam0) { s.fillCam = cam0; s.fillSig = null; s.fillBg = null; } // the scene has started again (its cameras are new ones): what was set on the old ones is forgotten
  const P = fillParent(s.game), ww = P.w, wh = P.h, z = fillSize(ww, wh), sig = z.w + 'x' + z.h + (s._cz ? 'f' : s.fillBack && s.fillBack.length ? 'b' : 'm'); // (the scene's kind is in it: a scene asks once before its flight cameras or its backdrop are made, and again after)
  if (FILL.now.w !== z.w || FILL.now.h !== z.h || !FILL.now.on) { FILL.now = { on: true, w: z.w, h: z.h, ox: z.ox, oy: z.oy }; fillGame(s.game, z.w, z.h); }
  if (s.fillSig !== sig) { s.fillSig = sig; fillCamsOf(s); }
  if (!s._cz) fillMenuSort(s);
  return true;
}
function fillRelease(s) { return fillDrop(s && s.game); } // at once (the watch does it by itself when no scene asks any more)
// the 1280 by 720 safe area as a rectangle of the page, for what is laid over the canvas in its numbers (the screens' panels, the Tab map's panels, the typed-order strip, Settings' boxes): { left, top, width, height, k }
function fillSafeRect(canvas) {
  const r = canvas && typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null; if (!r) return { left: 0, top: 0, width: 0, height: 0, k: 0 };
  const N = FILL.now, k = r.width / (N.w > 0 ? N.w : FILL.W);
  return { left: r.left + N.ox * k, top: r.top + N.oy * k, width: FILL.W * k, height: FILL.H * k, k };
}
fillLoad(); // the Settings row's memory, read when the page starts

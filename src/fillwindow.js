// ---------- Fill the window: the flight's view takes the window's shape, no dark bands, nothing stretched, nothing cut (landing A; card space-game-fill-window-a-flight) ----------
// Troy, 25 Nov 2026: "stretch to fit the window's full height and width". The game was a fixed 1280 by 720 picture scaled to fit (Phaser.Scale.FIT, src/main.js), so a window of another shape had dark bands.
// The plan is the scope report on card space-game-fill-window-scope, with Troy's correction of the same day: "get extra room because i open up the window.. not scale". FIT is kept and the GAME'S OWN SIZE is
// the window's size divided by a FIXED scale (FILL.k, the size things have on Troy's own window today), so a game pixel is always the same size on the glass and a bigger window is more game px both ways: more
// room, nothing drawn bigger. A window too small to show 1280 by 720 at that scale scales down to fit, as the game always did. The world and the stars are drawn on the whole size (the cruiser in the middle); everything still drawn on the canvas HUD
// stays where its numbers put it, in a 1280 by 720 SAFE AREA in the middle (the HUD camera's viewport); the page HUD goes to the window's true corners. Only the Campaign's flight scene does this: when it
// pauses (the ready room at a dock, Settings) or ends, and while its Tab map is open (the map covers the view and is laid out for 1280 by 720), the game is 1280 by 720 again, so the Long Haul and every
// other screen are as they were.
// Behind one switch, OFF at first: CAMP.flags.fill (src/campaign.js), a row of Settings > CONTENT (kept in the browser), and the address ?fill=1 / ?fill=0 (the tests' way).
// The one idea the other files need: the old maths of "where is this world point on the screen" are all written for a 1280 by 720 view, and they stay TRUE in the safe area if the camera's scroll is read
// through fillSX / fillSY (the scroll the view would have at 1280 by 720: the real one plus the safe area's offset) and a pointer through fillPX / fillPY (its place in the safe area). With the switch off the
// offsets are 0 and all four give back what they were given.
//   fillOn()                      is it on: the flag or ?fill=1, unless ?fill=0;   fillSet(on): the Settings row's (the flag and the browser's memory);   fillLoad(): the memory read back when the page starts
//   fillSize(winW, winH)          PURE: the game's size for a window: { w, h, ox, oy, k } (k: screen px for a game px, FILL.k unless the window is too small for 1280 by 720 at it, then the scale that fits;
//                                 w by h: the window divided by k, to an even pixel, never less than 1280 by 720; ox, oy: where the 1280 by 720 safe area starts). The tests' 1280 by 720 window gives exactly 1280 by 720 and 0, 0
//   fillW(), fillH()              the size now (1280 and 720 unless the flight has taken the window);   fillOx(), fillOy(): the safe area's offset now (0 unless it has)
//   fillSX(cam), fillSY(cam)      a camera's scroll as the 1280 by 720 maths want it;   fillPX(p), fillPY(p): a pointer in the safe area;   fillPutX(x), fillPutY(y): a scroll worked out the old way, as the camera wants it
//   fillSync(scene)               the Campaign scene calls it every frame: takes the window when the switch is on (and gives it back when it goes off), again when the window changes; sets the three cameras and the star layers
//   fillRelease(scene)            the game is 1280 by 720 again (the scene pauses or ends)
const FILL = {
  W: 1280, H: 720,               // the game's size as it always was: the least it ever is, and the safe area's
  k: 1.23,                       // THE FIXED SCALE (Troy, 25 Nov 2026): screen px for a game px, the size the game has today on his own window (1578 by 1000: 1578 / 1280 is 1.233). Nothing on the glass is bigger or smaller than he sees now; a bigger window adds room
  cap: 0,                        // NO CAP (card space-game-fill-window-scale-bug; Troy, 26 Nov 2026, playing: "more visible space WITHOUT scaling"). A cap of 1.5 (1920 by 1080 game px) was here for a day, and past it the picture scaled up: on his 2000 px wide window that began at 2362 px, and he felt it as the scale changing. 0: above the least window nothing ever scales; a number here (a multiple of 1280 by 720 each way) would bring the scale-up back
  addr: 'fill', store: 'longhaul.fill',
  memo: { s: null, v: null },    // the page's address, read again only when it changed
  now: { on: false, w: 1280, h: 720, ox: 0, oy: 0 } // what the game is now
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
function fillCams(s) { // the three cameras of a flight scene (src/camzoom.js) and the star layers, for the size the game has now
  const N = FILL.now, cz = s && s._cz; if (!cz) return false;
  cz.main.setViewport(0, 0, N.w, N.h); cz.bg.setViewport(0, 0, N.w, N.h); // the world and the stars: the whole window
  cz.ui.setViewport(N.ox, N.oy, FILL.W, FILL.H);                           // the canvas HUD: the safe area, where its numbers were written for
  (s.bgLayers || []).forEach(t => { if (t && t.setSize && (t.width !== N.w || t.height !== N.h)) t.setSize(N.w, N.h); });
  return true;
}
function fillGame(game, w, h) { // the game's own size (FIT then fits it to the window); nothing is asked when it is that size already
  const sc = game && game.scale; if (!sc || typeof sc.setGameSize !== 'function') return false;
  if (sc.width !== w || sc.height !== h) sc.setGameSize(w, h);
  return true;
}
function fillSync(s) {
  if (!s || !s.game || typeof window === 'undefined') return false;
  const want = fillOn() && !s.mp, ww = want ? window.innerWidth : 0, wh = want ? window.innerHeight : 0, sig = (want ? 1 : 0) + ':' + ww + 'x' + wh;
  if (s.fillSig === sig) return want;
  s.fillSig = sig;
  const z = want ? fillSize(ww, wh) : { w: FILL.W, h: FILL.H, ox: 0, oy: 0 };
  FILL.now = { on: want, w: z.w, h: z.h, ox: z.ox, oy: z.oy };
  fillGame(s.game, z.w, z.h); fillCams(s);
  return want;
}
function fillRelease(s) {
  if (s) s.fillSig = null; // the next frame of this scene (it resumes) takes the window again
  if (!FILL.now.on && FILL.now.w === FILL.W && FILL.now.h === FILL.H) return false;
  FILL.now = { on: false, w: FILL.W, h: FILL.H, ox: 0, oy: 0 };
  if (s) { fillGame(s.game, FILL.W, FILL.H); fillCams(s); }
  return true;
}
fillLoad(); // the Settings row's memory, read when the page starts

// ---------- Fill the window: the flight's view takes the window's shape, no dark bands, nothing stretched, nothing cut (landing A; card space-game-fill-window-a-flight) ----------
// Troy, 25 Nov 2026: "stretch to fit the window's full height and width". The game was a fixed 1280 by 720 picture scaled to fit (Phaser.Scale.FIT, src/main.js), so a window of another shape had dark bands.
// The plan is the scope report on card space-game-fill-window-scope: FIT is kept and the GAME'S OWN SIZE takes the window's shape, one side always 1280 or 720 and the other longer, so a game pixel is the same
// size on the glass as before and a 16:9 window is today's game, number for number. The world and the stars are drawn on the whole size (the cruiser in the middle); everything still drawn on the canvas HUD
// stays where its numbers put it, in a 1280 by 720 SAFE AREA in the middle (the HUD camera's viewport); the page HUD goes to the window's true corners. Only the Campaign's flight scene does this: when it
// pauses (the ready room at a dock, Settings) or ends, and while its Tab map is open (the map covers the view and is laid out for 1280 by 720), the game is 1280 by 720 again, so the Long Haul and every
// other screen are as they were.
// Behind one switch, OFF at first: CAMP.flags.fill (src/campaign.js), a row of Settings > CONTENT (kept in the browser), and the address ?fill=1 / ?fill=0 (the tests' way).
// The one idea the other files need: the old maths of "where is this world point on the screen" are all written for a 1280 by 720 view, and they stay TRUE in the safe area if the camera's scroll is read
// through fillSX / fillSY (the scroll the view would have at 1280 by 720: the real one plus the safe area's offset) and a pointer through fillPX / fillPY (its place in the safe area). With the switch off the
// offsets are 0 and all four give back what they were given.
//   fillOn()                      is it on: the flag or ?fill=1, unless ?fill=0;   fillSet(on): the Settings row's (the flag and the browser's memory);   fillLoad(): the memory read back when the page starts
//   fillSize(winW, winH)          PURE: the game's size for a window: { w, h, ox, oy, k } (w by h has the window's shape, capped at 21:9 wide and 4:3 tall; one of them is 1280 or 720, never less;
//                                 ox, oy: where the 1280 by 720 safe area starts; k: screen px for a game px). A 16:9 window gives exactly 1280 by 720 and 0, 0
//   fillW(), fillH()              the size now (1280 and 720 unless the flight has taken the window);   fillOx(), fillOy(): the safe area's offset now (0 unless it has)
//   fillSX(cam), fillSY(cam)      a camera's scroll as the 1280 by 720 maths want it;   fillPX(p), fillPY(p): a pointer in the safe area;   fillPutX(x), fillPutY(y): a scroll worked out the old way, as the camera wants it
//   fillSync(scene)               the Campaign scene calls it every frame: takes the window when the switch is on (and gives it back when it goes off), again when the window changes; sets the three cameras and the star layers
//   fillRelease(scene)            the game is 1280 by 720 again (the scene pauses or ends)
const FILL = {
  W: 1280, H: 720,               // the game's size as it always was: the least it ever is, and the safe area's
  wide: 21 / 9, tall: 4 / 3,     // the cap on the shape (Troy, 25 Nov 2026): no wider than 21:9, no taller than 4:3; past it the bands come back, small (at most a third more view along the long side)
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
  const a = Math.max(FILL.tall, Math.min(FILL.wide, ww / wh)), base = W0 / H0;
  const even = v => 2 * Math.round(v / 2), w = a > base ? even(H0 * a) : W0, h = a < base ? even(W0 / a) : H0; // the short side is today's, the long side grows (to an even number of px: the safe area then starts on a whole pixel and the middle of the view is the middle of the safe area exactly)
  return { w, h, ox: Math.round((w - W0) / 2), oy: Math.round((h - H0) / 2), k: Math.min(ww / w, wh / h) };
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

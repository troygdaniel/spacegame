// ---------- Campaign zoom: + and - zoom the view and the map (card space-game-campaign-zoom; Troy, 20 Nov 2026) ----------
// Troy: "zooming in and out, with the + and - keys, for the game and for the map". The Long Haul's camera zoom (src/camzoom.js) is the game view's: the Campaign scene calls camzoomSetup, so the world is on one camera and the HUD,
// the panels and the strip on another that never scales, and the zoom eases to where it was put (0.3 s) within camzoom's own limits (0.4 to 1.6). This file is what the Campaign adds, with no Phaser in it:
//   keys      + (the = key too, and numpad +) zooms in, - (numpad - too) zooms out, 0 (numpad 0) goes back to the default; a held key repeats. The mouse wheel keeps working: in the battle it is camzoom's, with the map open it is the map's
//   memory    the zoom is kept for the level (a retry comes back as it was) and starts at the default on a new level; the Long Haul's own remembered zoom is put back when the Campaign scene is left
//   the map   (Tab) zooms in the same way, from the whole system (the zoom at which every body and ring just fits, campMapZMin: 0.02 of the level fitted on the rim, 0.3 on level 3) to 8 times the level fitted to the frame, eased,
//             in bigger steps than the flight's (the system is up to 40 times the level): about the place you picked (a list choice or a click) or, with none, about the middle of the frame. The view is campMapView
//             (src/campmap.js), which keeps what you zoom about where it was on the screen and the level inside the frame (and moves to the system's centre as it goes out); every click is read through mp.fit, which the view writes, so it is right at any zoom
//   the view  (the flight) zooms out twice as far as it did (CAMPZOOM.view.min, 0.2 against the Long Haul's 0.4: a whole fight with the convoy on one screen), and the small ships keep a size you can see (campZoomShipScale)
// campZoomPress(s, zk, repeat) is the one door for a key; the scene calls it before anything else reads the key (a held key repeats, and the scene ignores repeats). tests/campzoom.mjs.
const CAMPZOOM = {
  map: { min: 0.5, max: 8, key: 1.4, hold: 1.06, wheel: 0.002 }, // the map's zoom range; 1 is the level fitted to the frame. min is how far out it goes AT LEAST: the zoom at which the whole system fits is lower where the system is much larger than the level (mp.zMin, campMapZMin). key, hold and wheel: the step of a press, of a held key's repeat and of a wheel unit (the flight's are 1.2, 1.03 and 0.0012: the map has farther to go)
  view: { min: 0.2, minShip: 10 },                                // the flight view's farthest zoom out (the camera's own is 0.4 in the Long Haul), and the smallest a ship is drawn on screen, px across, when the view is out so far that it would be smaller
  keys: { Equal: 1, NumpadAdd: 1, Minus: -1, NumpadSubtract: -1 }, // KeyboardEvent.code of the keys that zoom in (1) and out (-1); + is Shift and the = key
  reset: ['Digit0', 'Numpad0'],                                  // the keys that go back to the default
  mem: { level: 0, want: 1 }                                     // the zoom of the level last played: where a retry starts
};

// a key: { dir, reset } when it is a zoom key, else null
function campZoomKey(code) {
  if (CAMPZOOM.keys[code]) return { dir: CAMPZOOM.keys[code], reset: false };
  if (CAMPZOOM.reset.includes(code)) return { dir: 0, reset: true };
  return null;
}
// the flight view out to 0.2 (the Long Haul's is 0.4): the camera's range is CAMZOOM.min, which the Campaign scene sets while it is on (campZoomRange) and gives back; a small ship is drawn no smaller on the screen than
// CAMPZOOM.view.minShip px across, whatever the zoom: its sprite is scaled up by campZoomShipScale(zoom, its drawn length) when the view is so far out that it would be less
const campZoomShipScale = (z, len) => Math.max(1, CAMPZOOM.view.minShip / Math.max(1, (len || 1) * (z > 0 ? z : 1)));
const campZoomShotScale = z => Math.max(1, 0.5 / (z > 0 ? z : 1)); // a shot too is drawn thicker when the view is far out (at 0.2, two and a half times)
function campZoomRange(on) { if (on) { if (CAMPZOOM.mem.lhMin == null) CAMPZOOM.mem.lhMin = CAMZOOM.min; CAMZOOM.min = CAMPZOOM.view.min; } else if (CAMPZOOM.mem.lhMin != null) { CAMZOOM.min = CAMPZOOM.mem.lhMin; CAMPZOOM.mem.lhMin = null; } } // on: the Campaign's range; off: the Long Haul's put back
// where the game camera starts on a level: where it was left on this level (a retry), the default on any other
function campZoomStart(level) { return CAMPZOOM.mem.level === level ? camzoomClamp(CAMPZOOM.mem.want) : 1; }
function campZoomKeep(level, want) { CAMPZOOM.mem.level = level; CAMPZOOM.mem.want = camzoomClamp(want); }

// what the map zooms about: the place you set by a click or chose in the list, else nothing (the middle of the frame): { x, y } in the world, or null
function campMapFocus(mp) {
  if (!mp || !mp.rows) return null;
  const r = mp.setId ? mp.rows.find(x => x.id === mp.setId) : mp.userSel ? mp.rows.find(x => x.id === mp.selId) : null;
  return r ? { x: r.x, y: r.y } : null;
}
// a zoom key. With the map open it is the map's (the target is mp.zWant; campMapZoomStep eases to it), else the game camera's (CAMZOOM.want; camzoomFrame eases to it). true when the key was a zoom key
function campZoomPress(s, zk, repeat) {
  if (!zk) return false;
  const mp = s.mp, R = CAMPZOOM.map;
  if (mp) mp.zWant = zk.reset ? 1 : campMapZoomKey(mp.zWant, zk.dir, repeat, campMapZLo(mp), R.max);
  else CAMZOOM.want = zk.reset ? 1 : camzoomKey(CAMZOOM.want, zk.dir, repeat);
  return true;
}
// the wheel over the open map
function campZoomMapWheel(mp, deltaY) { if (mp) mp.zWant = campMapZoomWheel(mp.zWant, deltaY, campMapZLo(mp), CAMPZOOM.map.max); }
// the map's own steps (bigger than the flight's, which are camzoom's): a press, and a wheel unit, in the same multiplicative way so + then - is where you began and every notch is the same share
function campMapZoomKey(want, dir, repeat, lo, hi) { const K = CAMPZOOM.map; return camzoomClamp(want * Math.pow(repeat ? K.hold : K.key, dir < 0 ? -1 : 1), lo, hi); }
function campMapZoomWheel(want, deltaY, lo, hi) { const d = Math.max(-CAMZOOM.notch, Math.min(CAMZOOM.notch, +deltaY || 0)); return camzoomClamp(want * Math.exp(-d * CAMPZOOM.map.wheel), lo, hi); }
// the smallest zoom this map goes to: mp.zMin (set when it opened: the zoom at which the whole system fits), else the old 0.5
const campMapZLo = mp => mp && mp.zMin > 0 ? Math.min(mp.zMin, CAMPZOOM.map.min) : CAMPZOOM.map.min;
// one frame of the map's zoom: dt ms. Eases mp.z to mp.zWant and rewrites mp.fit (what every drawing and every click reads). true when the view moved
function campMapZoomStep(mp, F, dt) {
  if (!mp || !mp.base) return false;
  const z0 = mp.z;
  mp.z = camzoomEase(mp.z, mp.zWant, dt);
  if (mp.z === z0) return false;
  mp.fit = campMapView(mp.base, F, mp.z, mp.fit, z0, campMapFocus(mp), mp.wholeBase);
  return true;
}

// ---------- Campaign zoom: + and - zoom the view and the map (card space-game-campaign-zoom; Troy, 20 Nov 2026) ----------
// Troy: "zooming in and out, with the + and - keys, for the game and for the map". The Long Haul's camera zoom (src/camzoom.js) is the game view's: the Campaign scene calls camzoomSetup, so the world is on one camera and the HUD,
// the panels and the strip on another that never scales, and the zoom eases to where it was put (0.3 s) within camzoom's own limits (0.4 to 1.6). This file is what the Campaign adds, with no Phaser in it:
//   keys      + (the = key too, and numpad +) zooms in, - (numpad - too) zooms out, 0 (numpad 0) goes back to the default; a held key repeats. The mouse wheel keeps working: in the battle it is camzoom's, with the map open it is the map's
//   memory    the zoom is kept for the level (a retry comes back as it was) and starts at the default on a new level; the Long Haul's own remembered zoom is put back when the Campaign scene is left
//   the map   (Tab) zooms in the same way, 0.5 to 8 times the level fitted to the frame, eased; about the place you picked (a list choice or a click) or, with none, about the middle of the frame. The view is campMapView
//             (src/campmap.js), which keeps what you zoom about where it was on the screen and the level inside the frame; every click is read through mp.fit, which the view writes, so it is right at any zoom
// campZoomPress(s, zk, repeat) is the one door for a key; the scene calls it before anything else reads the key (a held key repeats, and the scene ignores repeats). tests/campzoom.mjs.
const CAMPZOOM = {
  map: { min: 0.5, max: 8 },                                     // the map's zoom range; 1 is the level fitted to the frame
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
  if (mp) mp.zWant = zk.reset ? 1 : camzoomKey(mp.zWant, zk.dir, repeat, R.min, R.max);
  else CAMZOOM.want = zk.reset ? 1 : camzoomKey(CAMZOOM.want, zk.dir, repeat);
  return true;
}
// the wheel over the open map
function campZoomMapWheel(mp, deltaY) { if (mp) mp.zWant = camzoomWheel(mp.zWant, deltaY, CAMPZOOM.map.min, CAMPZOOM.map.max); }
// one frame of the map's zoom: dt ms. Eases mp.z to mp.zWant and rewrites mp.fit (what every drawing and every click reads). true when the view moved
function campMapZoomStep(mp, F, dt) {
  if (!mp || !mp.base) return false;
  const z0 = mp.z;
  mp.z = camzoomEase(mp.z, mp.zWant, dt);
  if (mp.z === z0) return false;
  mp.fit = campMapView(mp.base, F, mp.z, mp.fit, z0, campMapFocus(mp));
  return true;
}

// ---------- Campaign zoom: + and - zoom the view and the map (card space-game-campaign-zoom; Troy, 20 Nov 2026) ----------
// Troy: "zooming in and out, with the + and - keys, for the game and for the map". The Long Haul's camera zoom (src/camzoom.js) is the game view's: the Campaign scene calls camzoomSetup, so the world is on one camera and the HUD,
// the panels and the strip on another that never scales, and the zoom eases to where it was put (0.3 s) within camzoom's own limits (0.4 to 1.6). This file is what the Campaign adds, with no Phaser in it:
//   keys      + (the = key too, and numpad +) zooms in, - (numpad - too) zooms out, 0 (numpad 0) goes back to the default; a held key repeats. The mouse wheel keeps working: in the battle it is camzoom's, with the map open it is the map's
//   memory    the zoom is kept for the level (a retry comes back as it was) and starts at the default on a new level; the Long Haul's own remembered zoom is put back when the Campaign scene is left
//   the map   (Tab) zooms in the same way, from the whole system (the zoom at which every body and ring just fits, campMapZMin: 0.02 of the level fitted on the rim, 0.3 on level 3) to 8 times the level fitted to the frame, eased,
//             in bigger steps than the flight's (the system is up to 40 times the level): about the place you picked (a list choice or a click) or, with none, about the middle of the frame. The view is campMapView
//             (src/campmap.js), which keeps what you zoom about where it was on the screen and the level inside the frame (and moves to the system's centre as it goes out); every click is read through mp.fit, which the view writes, so it is right at any zoom
//   the view  (the flight) zooms out twice as far as it did (CAMPZOOM.view.min, 0.2 against the Long Haul's 0.4: a whole fight with the convoy on one screen), and the small ships keep a size you can see (campZoomShipScale).
//             Past 0.2 it goes on, mission by mission (card space-game-zoom-fit-mission; Troy, 22 Nov 2026: "zoom out until the mission's start and goal both fit on screen": 1.1 is about 16,500 px long, and 0.2 shows 6,400):
//             the farthest zoom is the one at which the whole ROUTE (the start, the mission's place and its objective points: campBriefBounds of the briefing, zoom 0) is on the screen from anywhere on it, the camera being on
//             the cruiser (campZoomFit), never past CAMPZOOM.view.floor; a mission whose route already fits at 0.2 keeps 0.2. At that zoom a ship is no smaller than minShip px, a shot no thicker than shotMax times and a world label (a place's name)
//             no smaller than 1/labelMax of its size
// campZoomPress(s, zk, repeat) is the one door for a key; the scene calls it before anything else reads the key (a held key repeats, and the scene ignores repeats). tests/campzoom.mjs.
const CAMPZOOM = {
  map: { min: 0.5, max: 8, key: 1.4, hold: 1.06, wheel: 0.002 }, // the map's zoom range; 1 is the level fitted to the frame. min is how far out it goes AT LEAST: the zoom at which the whole system fits is lower where the system is much larger than the level (mp.zMin, campMapZMin). key, hold and wheel: the step of a press, of a held key's repeat and of a wheel unit (the flight's are 1.2, 1.03 and 0.0012: the map has farther to go)
  view: { min: 0.2, minShip: 10, floor: 0.02, fitPad: 0.25, shotMax: 6, labelMax: 6, farKey: 1.5, markZ: 0.08 }, // the flight view's farthest zoom out for a short mission (the camera's own is 0.4 in the Long Haul), and the smallest a ship is drawn on screen, px across, when the view is out so far that it would be smaller. floor: the farthest of all (a mission's own fit is never past it: the screen is 64,000 px across there); fitPad: the share of room left past the farthest point of the route; markZ: under this zoom a place's name and an escorted ship's are drawn on the screen as marks (src/campfarscene.js), the world labels being a few pixels high; farKey: the step of a press of - or + past 0.2 (1.2 times, camzoom's own, from the default out to 0.2); shotMax and labelMax: how far a shot is thickened and a world label (a place's name) is scaled up at far zoom (src/camzoom.js camzoomLabelScale reads CAMZOOM.labelMax)
  keys: Object.assign({}, ...campKeyCodes('zoomin').map(c => ({ [c]: 1 })), ...campKeyCodes('zoomout').map(c => ({ [c]: -1 }))), // KeyboardEvent.code of the keys that zoom in (1) and out (-1): the table's (CAMP_KEYS in src/data_controls.js: = and the keypad's +, - and the keypad's -)
  reset: campKeyCodes('zoomreset'),                              // the keys that go back to the default: Backspace
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
const campZoomShipScale = (z, len) => Math.max(1, CAMPZOOM.view.minShip / Math.max(0.01, (len || 1) * (z > 0 ? z : 1))); // (the divisor was held at 1: a ship on screen under 1 px was scaled up only 10 times; now to the 10 px, up to a hundred times)
const campZoomShotScale = z => Math.min(CAMPZOOM.view.shotMax, Math.max(1, 0.5 / (z > 0 ? z : 1))); // a shot too is drawn thicker when the view is far out (at 0.2, two and a half times; never past shotMax)
// the marks of a far view (src/campfarscene.js draws them under CAMPZOOM.view.markZ): the places with their names (the one the HUD's goal is at, and the ones the escorted ships are going to, marked as goals) and the escorted ships with theirs, which a few pixels cannot say
function campZoomMarks(C) {
  const out = [], g = typeof campNavGoal === 'function' ? campNavGoal(C) : null, pl = typeof campPlaces === 'function' ? campPlaces(C.level) : {};
  const goals = {}; if (g && g.kind === 'place') goals[g.id] = 1; ((C.L && C.L.convoys) || []).forEach(cv => { if (cv && cv.to) goals['place:' + cv.to] = 1; }); // the HUD's goal, and where the escorted ships are going
  Object.keys(pl).forEach(id => { const p = pl[id]; if (p && !p.hidden) out.push({ kind: 'place', id: 'place:' + id, x: p.x, y: p.y, name: String(p.name), goal: !!goals['place:' + id] }); });
  (C.ships || []).forEach(u => { if (u.hp > 0 && u.kind === 'freighter') out.push({ kind: 'convoy', id: u.id, x: u.x, y: u.y, name: typeof campConvoyName === 'function' ? campConvoyName(u) : 'convoy', goal: false }); });
  return out;
}
// the zoom at which a mission's route is all on the screen. The camera is on the cruiser, which starts at one end and flies to the other, so the route is on the screen from wherever it is when half a screen reaches the
// route's whole width and height: zoom = half the screen over the route's size (with the pad); 0 when the mission has no route to measure
function campZoomFit(level, mi) {
  if (typeof campBriefLayers !== 'function' || typeof campBriefBounds !== 'function') return 0;
  const Y = campBriefLayers(level, mi); if (!Y) return 0;
  const b = campBriefBounds(Y, 0), pad = 1 + CAMPZOOM.view.fitPad;
  return Math.min(W / (2 * Math.max(1, b.x1 - b.x0) * pad), H / (2 * Math.max(1, b.y1 - b.y0) * pad));
}
// the farthest zoom of this mission's view: 0.2 for a short one, the route's fit for a long one, never past the floor
const campZoomFloor = (level, mi) => { const K = CAMPZOOM.view, fit = campZoomFit(level, mi); return fit > 0 ? Math.max(K.floor, Math.min(K.min, fit)) : K.min; };
// a press of + or -: a step is 1.2 times (CAMZOOM.key) from the default out to 0.2 and 1.5 times (CAMPZOOM.view.farKey) past it, so the way out to a long mission's route is a few more presses (15 to the farthest of 1.1, not 21), and + after - is
// where it began; a held key's repeat is camzoom's smooth step
function campViewKey(want, dir, repeat) {
  if (repeat) return camzoomKey(want, dir, true);
  const K = CAMPZOOM.view, near = Math.log(CAMZOOM.key), far = Math.log(K.farKey), lo = Math.log(K.min), x = Math.log(want);
  const p = x >= lo ? (x - lo) / near : (x - lo) / far, q = p + (dir < 0 ? -1 : 1);
  return camzoomClamp(Math.exp(q >= 0 ? lo + q * near : lo + q * far));
}
// on: the Campaign's range (floor: this mission's farthest zoom, else 0.2) and its far labels; off: the Long Haul's put back
function campZoomRange(on, floor) {
  const m = CAMPZOOM.mem, K = CAMPZOOM.view;
  if (on) { if (m.lhMin == null) { m.lhMin = CAMZOOM.min; m.lhLabel = CAMZOOM.labelMax; } CAMZOOM.min = floor > 0 ? floor : K.min; CAMZOOM.labelMax = K.labelMax; }
  else if (m.lhMin != null) { CAMZOOM.min = m.lhMin; CAMZOOM.labelMax = m.lhLabel; m.lhMin = null; m.lhLabel = null; }
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
  if (mp) mp.zWant = zk.reset ? 1 : campMapZoomKey(mp.zWant, zk.dir, repeat, campMapZLo(mp), R.max);
  else CAMZOOM.want = zk.reset ? 1 : campViewKey(CAMZOOM.want, zk.dir, repeat);
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

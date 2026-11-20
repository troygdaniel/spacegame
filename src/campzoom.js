// ---------- Campaign zoom: + and - zoom the view and the map (card space-game-campaign-zoom; Troy, 20 Nov 2026) ----------
// Troy: "zooming in and out, with the + and - keys, for the game and for the map". The Long Haul's camera zoom (src/camzoom.js) is the game view's: the Campaign scene calls camzoomSetup, so the world is on one camera and the HUD,
// the panels and the strip on another that never scales, and the zoom eases to where it was put (0.3 s) within camzoom's own limits (0.4 to 1.6). This file is what the Campaign adds, with no Phaser in it:
//   keys      + (the = key too, and numpad +) zooms in, - (numpad - too) zooms out, 0 (numpad 0) goes back to the default; a held key repeats. The mouse wheel keeps working: in the battle it is camzoom's, with the map open it is the map's
//   memory    the zoom is kept for the level (a retry comes back as it was) and starts at the default on a new level; the Long Haul's own remembered zoom is put back when the Campaign scene is left
// campZoomPress(s, zk, repeat) is the one door for a key; the scene calls it before anything else reads the key (a held key repeats, and the scene ignores repeats). tests/campzoom.mjs.
const CAMPZOOM = {
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

// a zoom key: the game camera's (CAMZOOM.want; camzoomFrame eases to it). With the map open the key is not the camera's, and the map does not zoom yet (the next commit)
function campZoomPress(s, zk, repeat) {
  if (!zk) return false;
  if (s.mp) return true;
  CAMZOOM.want = zk.reset ? 1 : camzoomKey(CAMZOOM.want, zk.dir, repeat);
  return true;
}

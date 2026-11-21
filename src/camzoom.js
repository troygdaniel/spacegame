// ---------- Wheel zoom: the mouse wheel pulls the Space camera out and in (card space-game-wheel-zoom) ----------
// Wheel away from you zooms in on the ship, toward you zooms out far enough to see a whole fight or the station and its traffic.
// The zoom eases to where the wheel put it and is remembered until the page closes (CAMZOOM.want; not saved), so a launch comes back as you left it.
//
// How it combines with the other zooms. Cruise (0.85), the jump charge (1.1) and the launch settle (1.6 to 1) each write the camera's zoom as if 1
// were normal. This file treats what they write as the BASE and multiplies it by the wheel: zoomed out to 0.5, cruise is 0.5 x 0.85 and the jump
// charge ends at 0.5 x 1.1, each with its own easing untouched. Docking, landing, a jump leaving and death ease the wheel's part back to 1 so those
// moves play as they were drawn; the wheel's setting is kept and comes back on the next launch.
//
// One camera used to draw the world and the HUD, so any zoom shrank the HUD with it. camzoomSetup() gives the scene three cameras:
//   cz-bg   zoom 1, under the world: the star layers and the distant sun, giant and moon (depth below 0, scroll factor under 1)
//   main    the world, zoomed. The game's code still talks to s.cameras.main, as before.
//   cz-ui   zoom 1, on top: everything screen-fixed (scroll factor 0): the HUD, toasts, panels, prompts
// Every new object is put on its one camera the first frame after it is made (camzoomSort). The HUD draws marks on world things (lock brackets, the
// objective marker): src/hud.js asks camzoomScreen() where a world point is on the screen, which is right at any zoom.
//
// Far out, the things you must still read keep their size on the screen: the labels label() made (src/common.js) are scaled back up, and your ship
// gets a chevron (hostiles a small diamond) once it is too small to see which way it points.
// space.js: one line in create(), camzoomSetup(this). No frame line: it runs on the scene's postupdate event, after every return path of update().
// tests/camzoom.mjs checks the clamp, the wheel steps, the easing and the combining in plain Node.
const CAMZOOM = {
  min: 0.4, max: 1.6,   // far out (a 3200 x 1800 px view) and close on the ship
  wheel: 0.0012,        // per unit of wheel deltaY: a mouse notch (100) is about 11%, a trackpad's small steps are smooth
  notch: 240,           // the most one wheel event may count for (a flung trackpad sends thousands)
  ease: 0.008,          // per ms: about 90% of the way in 0.3 s
  far: 0.75, farFull: 0.55, // the ship's chevron starts to show under this zoom and is solid by this one
  labelMax: 2.5,        // a world label is never drawn more than this many times its size
  key: 1.2, keyHold: 1.03, // the + and - keys (card space-game-campaign-zoom): a press is this step (about a notch and a half of the wheel), and each repeat of a held key this much
  want: 1               // where the wheel has put the zoom: kept for the session
};
function camzoomClamp(z, lo, hi) { return Math.min(hi === undefined ? CAMZOOM.max : hi, Math.max(lo === undefined ? CAMZOOM.min : lo, +z || 1)); } // lo and hi: another range (the Campaign's map)
// the wheel moved by deltaY: the new setting. Multiplicative, so every notch feels the same size near and far.
function camzoomWheel(want, deltaY, lo, hi) {
  const d = Math.max(-CAMZOOM.notch, Math.min(CAMZOOM.notch, +deltaY || 0));
  return camzoomClamp(want * Math.exp(-d * CAMZOOM.wheel), lo, hi);
}
// the + (dir 1) or - (dir -1) key: the new setting; repeat is a held key's repeat. The same multiplicative steps as the wheel, so + then - is where you began
function camzoomKey(want, dir, repeat, lo, hi) { return camzoomClamp(want * Math.pow(repeat ? CAMZOOM.keyHold : CAMZOOM.key, dir < 0 ? -1 : 1), lo, hi); }
// whether the wheel is the camera's now: not while the scene is leaving or the ship is dead, and not while the scene says it has the wheel for something else (s.camzoomHold: the Campaign's open map)
function camzoomCanWheel(s) { return !s.leaving && !s.dead && !s.camzoomHold; }
// one frame of easing from cur toward target: never overshoots, the same curve at any frame rate, and it lands exactly
function camzoomEase(cur, target, dt) {
  const k = 1 - Math.exp(-Math.max(0, dt) * CAMZOOM.ease), z = cur + (target - cur) * k;
  return Math.abs(target - z) < 0.0005 ? target : z;
}
function camzoomCompose(base, wheel) { return Math.min(4, Math.max(0.1, base * wheel)); } // (the floor was 0.25: the Campaign's view goes out to 0.2, card space-game-zoom-out-more; the Long Haul's wheel stops at 0.4 times its base, which is over this either way)
// how much a world label is scaled so it keeps its size on the screen when the camera is out
function camzoomLabelScale(z) { return z < 1 ? Math.min(CAMZOOM.labelMax, 1 / z) : 1; }
function camzoomFarK(z) { return Math.min(1, Math.max(0, (CAMZOOM.far - z) / (CAMZOOM.far - CAMZOOM.farFull))); }
// The base zoom: what the rest of the game wants the camera at, read back from the camera after the game has had its frame.
// c = { base, out }: the base so far and the zoom this file last wrote. zoomNow is the camera's zoom now; fx is its zoom effect (zoomTo).
//   a zoomTo that began from the zoom this file wrote (base x wheel) is put back on the base, or the wheel would count twice at its start
//   anything else that changed the zoom since (cruise's setZoom, a setZoom before an effect) is the new base as written
function camzoomBase(c, zoomNow, fx) {
  if (fx && fx.isRunning) {
    if (c.out !== null && fx.source === c.out && c.out !== c.base) fx.source = c.base;
    return fx.source + (fx.destination - fx.source) * fx.ease(fx.progress);
  }
  return c.out !== null && zoomNow === c.out ? c.base : zoomNow;
}
// where a world point is on the screen. A scene with no wheel zoom (the station, the surface) answers as the HUD always worked it out.
function camzoomZ(s) { return s && s._cz ? s.cameras.main.zoom : 1; }
function camzoomScreen(s, wx, wy) {
  const cam = s.cameras.main, z = camzoomZ(s);
  return { x: (wx - cam.scrollX - W / 2) * z + W / 2, y: (wy - cam.scrollY - H / 2) * z + H / 2 };
}

function camzoomSetup(s) {
  const main = s.cameras.main, bg = s.cameras.add(0, 0, W, H).setName('cz-bg'), ui = s.cameras.add(0, 0, W, H).setName('cz-ui');
  const list = s.cameras.cameras; list.splice(list.indexOf(bg), 1); list.unshift(bg); // drawn first: under the world
  if (!main.transparent) { bg.setBackgroundColor(main.backgroundColor.rgba); main.setBackgroundColor('rgba(0,0,0,0)'); } // the dark of space moves under the stars
  const c = s._cz = { main, bg, ui, all: main.id | bg.id | ui.id, cur: CAMZOOM.want, base: main.zoom, out: null, px: null, py: null,
    mark: s.add.graphics().setDepth(6) };
  // a click's world point must be the main camera's (src/clickmove.js flies to pointer.worldX): Phaser leaves it as the last camera it tried, so the
  // camera under the world takes no input, and a click that lands on a HUD button (tried first, on cz-ui) is put back on the main camera
  bg.inputEnabled = false;
  const down = p => { const w = main.getWorldPoint(p.x, p.y); p.worldX = w.x; p.worldY = w.y; };
  s.input.on('gameobjectdown', down);
  const wheel = (p, over, dx, dy) => { if (camzoomCanWheel(s)) CAMZOOM.want = camzoomWheel(CAMZOOM.want, dy); };
  const frame = () => camzoomFrame(s);
  s.input.on('wheel', wheel); s.events.on('postupdate', frame);
  s.events.once('shutdown', () => { s.input.off('wheel', wheel); s.input.off('gameobjectdown', down); s.events.off('postupdate', frame); s._cz = null; }); // the scene object is used again on the next launch
}
// each object on one camera: looked at once, the first frame after it is made
function camzoomSort(s, c) {
  const list = s.children.list, vig = s.cr && s.cr.vig; // cruise's vignette sizes itself by the main camera's zoom (src/cruise.js): it stays there
  for (let i = 0; i < list.length; i++) {
    const o = list[i]; if (o._cz) continue;
    const cam = o === vig ? c.main : o.scrollFactorX < 1 && o.depth < 0 ? c.bg : o.scrollFactorX === 0 ? c.ui : c.main;
    o.cameraFilter = c.all & ~cam.id; o._cz = 1;
  }
}
function camzoomFrame(s) {
  const c = s._cz; if (!c) return;
  const main = c.main;
  camzoomSort(s, c);
  c.base = camzoomBase(c, main.zoom, main.zoomEffect);
  c.cur = camzoomEase(c.cur, s.leaving || s.dead ? 1 : CAMZOOM.want, s.game.loop.delta);
  main.setZoom(camzoomCompose(c.base, c.cur)); c.out = main.zoom;
  const z = c.out;
  c.bg.setScroll(main.scrollX, main.scrollY); // the distant bodies drift as they always did, at their own size
  const f = main.fadeEffect; c.ui.setAlpha(f && (f.isRunning || f.isComplete) ? 1 - f.alpha : 1); // a fade of the world takes the HUD with it, as it did with one camera
  // the key cap prompt over the ship or a signal is placed as if the zoom were 1 (src/ui.js, src/poi.js): move it to where that point really is
  const box = s.prompt && s.prompt.box;
  if (box && box.visible && z !== 1 && (box.x !== c.px || box.y !== c.py)) {
    box.setPosition((box.x - W / 2) * z + W / 2, (box.y - H / 2) * z + H / 2); c.px = box.x; c.py = box.y;
  }
  const ls = camzoomLabelScale(z);
  if (s._wl) for (const t of s._wl) if (t.active && t.scaleX !== ls) t.setScale(ls);
  // far out: a chevron on your ship that keeps its size on the screen, a diamond on each hostile
  const g = c.mark, k = camzoomFarK(z), ship = s.ship;
  g.clear();
  if (k > 0.01 && ship && ship.active && !s.dead && !s.leaving) {
    const r = 17 / z, a = ship.rotation, pt = (d, m) => ({ x: ship.x + Math.cos(a + d) * r * m, y: ship.y + Math.sin(a + d) * r * m });
    g.lineStyle(2 / z, CYAN, 0.9 * k); g.strokePoints([pt(0, 1.25), pt(2.5, 1), pt(Math.PI, 0.35), pt(-2.5, 1)], true);
    if (s.enemies) s.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const q = 8 / z; g.lineStyle(1.5 / z, RED, 0.85 * k);
      g.strokePoints([{ x: e.x, y: e.y - q }, { x: e.x + q, y: e.y }, { x: e.x, y: e.y + q }, { x: e.x - q, y: e.y }], true);
    });
  }
}

// ---------- Click to move: the mouse gives the flight assist its orders (card space-game-click-to-move) ----------
// Goes with src/assist.js and only works while the flight assist is on (Z). With the assist off the mouse fires the guns, as it always has.
//   a click on empty space      Approach that point: the ship turns, burns, brakes and stops on it (assistSet('approach', { x, y }, 0))
//   a click on a station, a planet, a gate, an outpost or a found signal
//                               makes it the nav target, the one the N list sets (cruisePick): 1, 2, C and P then work on it
//   a click on a ship           makes that ship the target: an order that is flying moves onto it; with no order, 1 and 2 are now about it
// A belt is not picked: a click inside one is a point to fly to. While the assist is on the mouse button gives orders and does not fire
// (Space still does); the held button fires again as soon as the assist is off.
//
// This file edits nothing else. It hooks itself onto the Space scene (clickmoveInstall, at the end), reads the pointer there and, one step
// before the assist reads its keys, hands 1 and 2 the picked ship (the assist's own keys know only the nav target).
//   clickmovePick(s, x, y)    pure: what is under a world point: { kind: 'ship' | 'body' | 'point', target }
//   clickmoveClick(s, x, y)   what a click does; returns the kind it acted on, '' when it did nothing (assist off, nav list open, docked, dead)
//   clickmovePress(s, p)      the pointerdown listener: the left button, and not on the HUD (clickmoveOnHud(s, px, py), from clickmoveHud(s))
//   clickmoveFrame(s, time)   once a frame before Space.update: the picked ship's keys, the gun hold, the marker
const CLICKMOVE = {
  ship: 34, body: 120,   // px on screen around a ship's centre that count as a click on it; the least radius of a body (a station has none of its own)
  hold: 80,              // ms the guns stay quiet past each frame the order button is still down
  color: 0x9fe9ff,
  hud: [], hudPad: 4     // more rectangles of the HUD, from other files (see clickmoveHud); px round a HUD rectangle that still count as on it
};

function clickmoveShips(s) {
  const out = [];
  const add = (o, name) => { if (o && o.active !== false && o.visible !== false) out.push({ o, name }); };
  if (s.enemies && s.enemies.getChildren) s.enemies.getChildren().forEach(e => add(e, e.def ? 'the ' + e.def.key : 'the pirate'));
  if (s.mx && s.mx.freighter) add(s.mx.freighter, 'MULE');
  if (s.tr) { (s.tr.police || []).forEach(p => add(p.img, 'the police cruiser')); (s.tr.civ || []).forEach(c => add(c.img, 'the freighter')); }
  return out;
}

// a ship the assist can follow: a physics sprite as it is (it has a body and a velocity); a hand-moved image (police, civilians) behind a
// small stand-in with a live x and y, so the assist sees a ship (it stops 150 px off) and not a bare point
function clickmoveTarget(row) {
  const o = row.o;
  if (o.body) { if (!o.name) o.name = row.name; return o; }
  if (!o.cmProxy) o.cmProxy = { get x() { return o.x; }, get y() { return o.y; }, get active() { return o.active !== false && o.visible !== false; }, name: row.name, body: { velocity: { x: 0, y: 0 } }, of: o };
  return o.cmProxy;
}

function clickmovePick(s, x, y) {
  const zoom = (s.cameras && s.cameras.main && s.cameras.main.zoom) || 1;
  let best = null, bd = CLICKMOVE.ship / zoom;
  clickmoveShips(s).forEach(row => { const d = Math.hypot(row.o.x - x, row.o.y - y); if (d <= bd) { bd = d; best = row; } });
  if (best) return { kind: 'ship', target: clickmoveTarget(best) };
  const b = cruiseKnown(s).filter(q => q.type !== 'belt').find(q => Math.hypot(q.x - x, q.y - y) <= Math.max(q.r || 0, CLICKMOVE.body / zoom));
  if (b) return { kind: 'body', target: b };
  return { kind: 'point', target: { x, y } };
}

function clickmoveClick(s, x, y) {
  const cm = s.cm, a = s.as;
  if (!cm || !a || !ASSIST.on || s.dead || s.leaving || s.jmp || s.cruising || (s.cr && s.cr.navOpen)) return '';
  cm.hold = true; // this press is an order, not a shot
  const p = clickmovePick(s, x, y);
  if (p.kind === 'body') { cm.pick = null; cruisePick(s, p.target); cm.nav = s.cr.target; return 'body'; }
  if (p.kind === 'ship') {
    cm.pick = p.target; cm.nav = s.cr ? s.cr.target : null;
    if (a.mode) assistSet(a.mode, p.target);
    else { toast(s, 'Target: ' + p.target.name + '.   ' + Object.values(ASSIST_MODES).filter(m => m.cap).map(m => m.cap + ' ' + m.label).join('   '), '#ffd37a'); sfx('chime'); }
    return 'ship';
  }
  cm.pick = null;
  if (!assistSet('approach', p.target, 0)) return '';
  cm.point = p.target;
  return 'point';
}

// what the HUD covers right now, as { x, y, w, h } in screen px (the game's 1280 by 720): the zones src/hud.js lists each frame (gauges, the
// mission panel, the radar, the top strip, the assist panel, banners and toasts), then the things with a rectangle of their own while they
// are up: the key line, a tip of the guide, the assist readout, the Overview, the nav panel. A panel of another file joins with
// CLICKMOVE.hud.push(s => ({ x, y, w, h }))  (or an array of them, or null while it is hidden).
function clickmoveHud(s) {
  const out = [], rect = b => { if (b && b.right > b.x && b.bottom > b.y) out.push({ x: b.x, y: b.y, w: b.right - b.x, h: b.bottom - b.y }); };
  const obj = o => { if (o && o.active !== false && o.visible && typeof o.getBounds === 'function') rect(o.getBounds()); };
  ((s._hud && s._hud.zones) || []).forEach(z => rect({ x: z.x0, y: z.y0, right: z.x1, bottom: z.y1 }));
  obj(s.keyLine); obj(s._gh); obj(s.as && s.as.read);
  if (s.ov && s.ov.shown) obj(s.ov.bg);
  if (s.np && s.np.shown) obj(s.np.bg);
  CLICKMOVE.hud.forEach(f => { const r = f(s); [].concat(r || []).forEach(q => { if (q && q.w > 0 && q.h > 0) out.push(q); }); });
  return out;
}
// is this screen point on the HUD
function clickmoveOnHud(s, px, py) {
  const m = CLICKMOVE.hudPad;
  return clickmoveHud(s).some(r => px >= r.x - m && px <= r.x + r.w + m && py >= r.y - m && py <= r.y + r.h + m);
}
// a press of the mouse: the left button, and not on the HUD (a click on the mission panel folds it, a click on the radar is a click on the
// radar: neither is an order to fly to the world point behind it). Returns what clickmoveClick did, '' for nothing.
function clickmovePress(s, p) {
  if (!p || p.button || clickmoveOnHud(s, p.x, p.y)) return '';
  return clickmoveClick(s, p.worldX, p.worldY);
}

function clickmoveFrame(s, time) {
  const cm = s.cm, a = s.as; if (!cm || !a) return;
  // the guns: space.js fires while the pointer is down, so an order's press keeps them quiet until the button is up
  if (cm.hold) { if (ASSIST.on && s.input.activePointer.isDown) s.nextFire = Math.max(s.nextFire || 0, time + CLICKMOVE.hold); else cm.hold = false; }
  // the picked ship stops being the target when it is gone, when the assist is off, or when the nav target has changed since (N list, a body click)
  if (cm.pick && (cm.pick.active === false || !ASSIST.on || (s.cr && s.cr.target !== cm.nav))) cm.pick = null;
  // 1 and 2 about the picked ship: taken here, one step before assistFrame would give them to the nav target
  if (cm.pick && ASSIST.on && !(s.cr && s.cr.navOpen)) {
    for (const m of Object.values(ASSIST_MODES)) {
      const k = m.key && a.k[m.key]; if (!k || !k._justDown) continue;
      k._justDown = false;
      if (a.mode === m.id && a.target === cm.pick) assistSet(''), toast(s, 'You have the stick.', '#9fe9ff'); else assistSet(m.id, cm.pick);
      break;
    }
  }
  if (cm.point && a.target !== cm.point) cm.point = null; // the order to that point has ended or changed
  clickmoveDraw(s, time);
}

// the marker: a cross in a ring where the ship is going, four corners around the picked ship
function clickmoveDraw(s, time) {
  const cm = s.cm, g = cm.g; if (!g) return;
  g.clear();
  const z = (s.cameras.main && s.cameras.main.zoom) || 1, pulse = 0.55 + 0.25 * Math.sin(time / 180);
  if (cm.point) {
    const p = cm.point, r = 14 / z;
    g.lineStyle(2 / z, CLICKMOVE.color, pulse).strokeCircle(p.x, p.y, r);
    g.lineBetween(p.x - r * 0.45, p.y, p.x + r * 0.45, p.y).lineBetween(p.x, p.y - r * 0.45, p.x, p.y + r * 0.45);
  }
  if (cm.pick) {
    const p = cm.pick, r = 30 / z, c = r * 0.45;
    g.lineStyle(2 / z, 0xffd37a, pulse + 0.15);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      g.lineBetween(p.x + sx * r, p.y + sy * r, p.x + sx * (r - c), p.y + sy * r).lineBetween(p.x + sx * r, p.y + sy * r, p.x + sx * r, p.y + sy * (r - c));
    });
  }
}

function clickmoveSetup(s) {
  const cm = s.cm = { pick: null, point: null, nav: null, hold: false, g: null };
  cm.g = s.add.graphics().setDepth(5);
  s.input.on('pointerdown', p => clickmovePress(s, p)); // the input plugin drops its listeners when the scene ends
  s.events.once('shutdown', () => { if (s.cm === cm) s.cm = null; });
}

// space.js is not edited for this: the Space scene says when it has been built, and a frame is about to run
function clickmoveInstall(game) {
  const hook = () => {
    const s = game.scene.getScene('Space'); if (!s) return;
    s.events.on('create', () => clickmoveSetup(s));
    s.events.on('preupdate', time => { if (s.cm && s.ship && s.as) clickmoveFrame(s, time); });
    if (s.sys.isActive() && s.ship && !s.cm) clickmoveSetup(s);
  };
  if (game.isBooted) hook(); else game.events.once('ready', hook);
}
if (typeof window !== 'undefined' && window.game && window.game.events && typeof window.game.events.once === 'function') clickmoveInstall(window.game);

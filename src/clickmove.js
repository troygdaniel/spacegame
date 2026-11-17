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
//   clickmoveFrame(s, time)   once a frame before Space.update: the picked ship's keys, the gun hold, the marker
const CLICKMOVE = {
  ship: 34, body: 120,   // px on screen around a ship's centre that count as a click on it; the least radius of a body (a station has none of its own)
  hold: 80,              // ms the guns stay quiet past each frame the order button is still down
  color: 0x9fe9ff
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
  s.input.on('pointerdown', p => { if (!p.button) clickmoveClick(s, p.worldX, p.worldY); }); // the left button; the input plugin drops its listeners when the scene ends
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

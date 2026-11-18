// ---------- Overview: the list of what is around, nearest first (card space-game-overview) ----------
// Goes with the flight assist (src/assist.js) and click to move (src/clickmove.js). A compact panel under the radar lists what is near the ship:
// raiders, the escort, police and freighters, each with its range and whether it closes or opens. Ships only: a place (the station, a planet,
// a gate, a signal) is picked in the navigation panel (N, src/navpanel.js), card space-game-one-way-to-target.
// Hostiles are red. A click on a row makes it the target; so do W S and Enter while the list has the keys. The target's row opens: under it
// are its range, its closing speed and its orders as buttons (the assist's 1 to 4, and the gun lock for a hostile): a click on a button, or
// its key, gives the order. This is the only place the orders are drawn: there is no separate assist panel.
// A ship that is far away gets one more order, first on its row: Cruise to (C), which cruises to it and then hands over to the assist.
//   B                   hidden -> shown with the keys on it -> hidden. Enter picks the row and gives the keys back to the ship (the list stays up);
//                       B on a list that is up without the keys takes them again.
//   the target setter   a ship: the same pick a click on the ship in space makes
//                       (clickmoveClick at the ship), which needs the assist on, so picking a ship switches it on.
//   space.js            overviewSetup(this) in create(); overviewFrame(this, time) in update(), before the keys are read: while the list has
//                       the keys it takes W, S and the up and down arrows away from the flight code
//   overviewRows(things, me, max)   pure: the sort and the rows. things: [{ name, kind, x, y, vx, vy, hostile, friend, ref }], me: { x, y, vx, vy }
//   overviewThings(s)               what the scene has around the ship, as things
//   overviewPick(s, row)            make a row the target; returns 'body', 'ship' or ''
const OVERVIEW = {
  key: 'B', max: 10,            // rows shown
  every: 250,                   // ms between rebuilds of the list
  still: 5,                     // px/s: under this the range neither closes nor opens
  x: 1004, y: 242, w: 260, row: 18,   // under the radar and its hostile line
  btn: 18, btns: 8,             // the open row's block: a button's height, and how many buttons the pool holds
  far: 2500, cruiseKey: 'C', cruiseThen: 'keep',   // Cruise to: a ship further than this (px) gets it; its key (the cruise key); the order it hands over to when none was chosen
  kinds: { station: 'STATION', planet: 'PLANET', gate: 'GATE', belt: 'BELT', poi: 'SIGNAL', scenery: 'BODY', raider: 'RAIDER', drone: 'DRONE', gunship: 'GUNSHIP', pirate: 'PIRATE', escort: 'ESCORT', police: 'POLICE', civ: 'SHIP' },
  colors: { hostile: '#ff4d6d', friend: '#6dff9c', station: '#38e1ff', planet: '#ffb454', other: '#9fb6c8' }
};

// ---- the list: pure ----

// ---- the panel: where things are, pure ----
// One panel (Troy, 17 Nov 2026: the orders live inside the list, like EVE). The row of the target opens: under it a block with the target's
// range and closing speed and its orders as buttons, each with its key (the assist's modes from assistState().keys, and Lock for a hostile).
// A click on a button gives the order; so does its key. The separate target panel under the radar is gone (src/hud.js hudAssist draws none).

// n: rows shown; ti: the index of the target's row among them (-1: no target, no block). Answers the panel's rectangle and where each part
// goes: { x, y, w, h, rowY: [..], blockY, footY, block }. The rows under the target's are pushed down by the block. lines: how many lines of
// buttons the block holds (overviewButtonLines; 2 when not said): the block is one line of words and those.
function overviewLayout(n, ti, lines) {
  const O = OVERVIEW, open = ti >= 0 && ti < n, block = O.row + 2 + Math.max(1, lines || 2) * (O.btn + 4) + 2, add = open ? block : 0, rowY = [];
  for (let i = 0; i < O.max; i++) rowY.push(O.y + 7 + O.row * (i + 1) + (open && i > ti ? add : 0));
  return { x: O.x, y: O.y, w: O.w, h: O.row * (O.max + 2) + 14 + add, rowY, blockY: open ? O.y + 7 + O.row * (ti + 2) : -1, footY: O.y + 9 + O.row * (O.max + 1) + add, block };
}

// the orders of the target, as buttons. keys: assistState().keys ([{ id, label, cap }]); st: { mode, mine } (the order in force, and whether
// it is about this target); lock: { cap, can, on } or null when there is no gun lock in this build.
// Answers [{ id, cap, label, on, off }]: label is the mode's first word (Keep at range -> Keep), on: lit, off: not for this target.
// cruise: { cap, on } when the target is far enough for Cruise to (it goes first), else null or nothing.
function overviewOrders(keys, st, lock, cruise) {
  const out = (keys || []).filter(k => k.cap).map(k => ({ id: k.id, cap: k.cap, label: String(k.label).split(' ')[0], on: !!(st && st.mine && st.mode === k.id), off: false }));
  if (cruise) out.unshift({ id: 'cruise', cap: cruise.cap, label: 'Cruise to', on: !!cruise.on, off: false });
  if (lock) out.push({ id: 'lock', cap: lock.cap, label: 'Lock', on: !!lock.on, off: !lock.can });
  return out;
}

// where each button goes in the block: left to right from the block's second line, a new line when the next one would pass the right edge.
// Answers the orders with { x, y, w, h } each (screen px). cw: the width of one character of the button font.
function overviewButtons(orders, L, cw) {
  const O = OVERVIEW, left = L.x + 10, right = L.x + L.w - 8, out = []; let x = left, y = L.blockY + O.row + 2, line = 0;
  orders.forEach(o => {
    const w = Math.ceil((String(o.cap).length + 1 + o.label.length) * (cw || 7.3)) + 12;
    if (x + w > right && x > left) { x = left; y += O.btn + 4; line++; }
    out.push(Object.assign({}, o, { x, y, w, h: O.btn, line })); x += w + 6;
  });
  return out;
}
// how many lines those buttons take: the layout makes the block that tall
function overviewButtonLines(orders, cw) {
  const b = overviewButtons(orders, { x: OVERVIEW.x, w: OVERVIEW.w, blockY: 0 }, cw);
  return b.length ? b[b.length - 1].line + 1 : 1;
}

// the block's first line: the range and how fast it closes, and on the right the planner's word while an order is on this target
function overviewInfo(r, st) {
  const rate = r.trend ? r.trend.toUpperCase() + ' ' + Math.min(9999, Math.round(Math.abs(r.closing))) : 'STEADY';
  return { left: hudFmt(r.range / 10) + ' KM   ' + rate, right: st && st.mine ? (st.status || st.label || '').toUpperCase() : 'NO ORDER' };
}

// the rows to show: the nearest `max`, and the target among them even when it is further than those (it takes the last place)
function overviewWithTarget(all, max, isTarget) {
  const rows = all.slice(0, max), t = all.find(isTarget);
  if (t && !rows.includes(t)) rows[rows.length - 1] = t;
  return rows;
}

// nearest first. range: px to its centre. closing: px/s the range shrinks by (negative: it opens). trend: 'closing', 'opening' or ''.
function overviewRows(things, me, max) {
  const rows = things.map(t => {
    const dx = t.x - me.x, dy = t.y - me.y, range = Math.hypot(dx, dy), d = range || 1e-6;
    const closing = ((me.vx || 0) - (t.vx || 0)) * dx / d + ((me.vy || 0) - (t.vy || 0)) * dy / d;
    return { name: t.name, kind: t.kind, label: OVERVIEW.kinds[t.kind] || String(t.kind || '').toUpperCase(), hostile: !!t.hostile, friend: !!t.friend, range, closing,
      trend: closing > OVERVIEW.still ? 'closing' : closing < -OVERVIEW.still ? 'opening' : '', ref: t.ref === undefined ? t : t.ref, id: t.id };
  });
  rows.sort((a, b) => a.range - b.range || String(a.name).localeCompare(String(b.name)));
  return max ? rows.slice(0, max) : rows;
}

// one row as the panel prints it: a mark for the target, the name, the range in km, an arrow and the rate
function overviewLine(r, isTarget) {
  const name = String(r.name || r.label).toUpperCase().slice(0, 15).padEnd(15), km = (hudFmt(r.range / 10) + ' km').padStart(9);
  const rate = r.trend ? (r.trend === 'closing' ? ' ▼' : ' ▲') + String(Math.min(9999, Math.round(Math.abs(r.closing)))).padStart(4) : '';
  return (isTarget ? '▸' : ' ') + name + km + rate;
}
function overviewColor(r) {
  const c = OVERVIEW.colors;
  return r.hostile ? c.hostile : r.friend ? c.friend : c[r.kind] || c.other;
}

// ---- the scene side ----

// a hand-moved image (police, civilians) has no physics body: its speed is what it moved since the last look
function overviewVel(o, now) {
  if (o.body && o.body.velocity) return { x: o.body.velocity.x || 0, y: o.body.velocity.y || 0 };
  const p = o._ov, v = p && now > p.t ? { x: (o.x - p.x) * 1000 / (now - p.t), y: (o.y - p.y) * 1000 / (now - p.t) } : (p && p.v) || { x: 0, y: 0 };
  if (!p || now - p.t >= 100) o._ov = { x: o.x, y: o.y, t: now, v };
  return p && now - p.t < 100 ? p.v || v : v;
}

function overviewThings(s) {
  const out = [], now = s.time.now;
  const ship = (o, name, kind, flags) => { if (!o || o.active === false || o.visible === false) return; const v = overviewVel(o, now); out.push(Object.assign({ name, kind, x: o.x, y: o.y, vx: v.x, vy: v.y, ref: o, ship: true }, flags)); };
  if (s.enemies && s.enemies.getChildren) s.enemies.getChildren().forEach(e => { const k = (e.def && e.def.key) || 'pirate'; ship(e, e.boss || e.wanted ? 'wanted ' + k : k, OVERVIEW.kinds[k] ? k : 'pirate', { hostile: true }); });
  if (s.mx && s.mx.freighter) ship(s.mx.freighter, 'MULE', 'escort', { friend: true });
  if (s.tr) { (s.tr.police || []).forEach(p => ship(p.img, 'police', 'police', {})); (s.tr.civ || []).forEach(c => ship(c.img, 'freighter', 'civ', {})); }
  // no places here (card space-game-one-way-to-target): the station, planets, belts, gates and signals are picked in the navigation panel (N, src/navpanel.js)
  return out;
}

function overviewIsTarget(s, r) {
  const o = r.ref, a = s.as, cm = s.cm;
  if (o && (o.body || o.setPosition)) { // a ship: the assist's order is on it, or it is the picked ship of click to move
    const hit = t => !!t && (t === o || t.of === o);
    return hit(a && a.target) || hit(cm && cm.pick);
  }
  if ((cm && cm.pick) || (a && a.mode && a.target && a.target.body)) return false; // a picked ship, or the ship an order is on, is the target now, not the nav body
  return !!(s.cr && s.cr.target && r.id !== undefined && s.cr.target.id === r.id);
}

function overviewPick(s, r) {
  const o = r && r.ref; if (!o || s.dead || s.leaving) return '';
  if (!(o.body || o.setPosition)) return ''; // not a ship: a place is picked in the navigation panel, never here
  if (o.active === false) return '';
  if (typeof ASSIST === 'undefined' || !s.as) return '';
  if (!ASSIST.on) assistOn(s, true); // a ship is a target of the assist: picking one switches it on
  if (typeof clickmoveClick === 'function' && s.cm) return clickmoveClick(s, o.x, o.y) === 'ship' ? 'ship' : '';
  return assistSet(s.as.mode || 'approach', o) ? 'ship' : ''; // no click to move in this build: give the order straight
}

// the one selected thing: what a click in space, a row of this list or the nav list last made the target. { ref, ship } or null.
// The same rule overviewIsTarget marks a row by: a picked ship first, then the ship an order is on, then the nav body.
function overviewTarget(s) {
  const a = s.as, cm = s.cm, un = t => (t && t.of) || t, isShip = o => !!o && !!(o.body || o.setPosition);
  if (cm && cm.pick && cm.pick.active !== false) return { ref: un(cm.pick), ship: true };
  if (a && a.mode && a.target && isShip(un(a.target)) && un(a.target).active !== false) return { ref: un(a.target), ship: true };
  if (s.cr && s.cr.target) return { ref: s.cr.target, ship: false };
  return null;
}
function overviewHostile(s, o) { return !!(s.enemies && s.enemies.getChildren && s.enemies.getChildren().includes(o) && o.active !== false); }
// the order in force as the block needs it: { mode, label, status, mine }  (mine: it is about the selected thing)
function overviewOrderState(s) {
  const a = s.as, t = overviewTarget(s), st = typeof assistState === 'function' ? assistState() : { mode: '' };
  if (!a || !st.mode || !t) return { mode: '', label: '', status: '', mine: false };
  const at = (a.target && a.target.of) || a.target;
  return { mode: st.mode, label: st.label, status: st.status, mine: t.ship ? at === t.ref : !(at && (at.body || at.setPosition)) };
}

// ---- Cruise to: the order for a ship that is far away (card space-game-overview-cruise-to) ----
// Like Warp to in EVE. A selected ship further than OVERVIEW.far gets Cruise to as the first order of its row (key C). It uses the cruise
// of src/cruise.js as it is: the ship's place becomes the cruise's destination and follows the ship while it moves, cruise drops out where it
// always does (900 px short, or 1100 px from a hostile, which is the "contact ahead" of cruise), and then the assist takes over with the order
// that was in force on that ship when you pressed it, or Keep at range. Cancelled (S), interdicted, or the ship gone: no hand-over.
// Nothing in src/cruise.js or src/assist.js changes for it: what this needs of them is cruiseEngage, cruiseEnd, s.cr.target and assistSet.

function overviewFar(range) { return range > OVERVIEW.far; }
// what to do when the cruise that Cruise to started has ended. why: s.cr.endWhy; alive: the ship is still there.
// 'hand': give the assist its order; 'drop': forget it (you cancelled, pirates pulled you out, or there is nothing left to fly to)
function overviewCruiseEnds(why, alive) { return alive && (why === 'arrived' || why === 'hostile') ? 'hand' : 'drop'; }

function overviewCruiseDrop(s) {
  const ov = s.ov, c = ov && ov.cruise; if (!c) return;
  ov.cruise = null; ov.at = 0;
  if (s.cr && s.cr.target && s.cr.target.of === c.ref) { s.cr.target = c.prev || null; if (s.cm) s.cm.nav = s.cr.target; } // the nav target you had comes back
}
// start it (or, pressed again while it runs, cancel it). Returns true when it took the ship or cancelled.
function overviewCruiseTo(s) {
  const t = overviewTarget(s), ov = s.ov, cr = s.cr;
  if (!t || !t.ship || !ov || !cr || s.dead || s.leaving || typeof cruiseEngage !== 'function') return false;
  if (ov.cruise) { const on = cr.active; if (on) cruiseEnd(s, 'cut'); overviewCruiseDrop(s); return on; }
  const o = t.ref, st = overviewOrderState(s), row = overviewThings(s).find(x => x.ref === o);
  if (!ASSIST.on) assistOn(s, true); // the hand-over is an order of the assist
  ov.cruise = { ref: o, then: st.mine && st.mode ? st.mode : OVERVIEW.cruiseThen, prev: cr.target, started: false };
  cr.target = { id: 'ov-ship', name: String((row && row.name) || 'the ship'), type: 'ship', x: o.x, y: o.y, r: 0, of: o };
  if (s.cm) s.cm.nav = cr.target; // click to move drops its picked ship when the nav target changes under it: this change is ours
  cruiseEngage(s); // it says why when it will not (too close, hostiles near); inside a mass limit the autopilot flies clear first
  if (!cr.active && !(s.ap && s.ap.on)) { overviewCruiseDrop(s); return false; }
  ov.cruise.started = !!cr.active; // engaged at once (not flying clear of a mass first): its end is a real end, even one frame later
  return true;
}
// every frame while a Cruise to is on: keep the destination on the ship, and when the cruise is over hand the ship to the assist
function overviewCruiseFrame(s) {
  const c = s.ov.cruise; if (!c) return;
  const cr = s.cr, o = c.ref, alive = o.active !== false;
  if (s.dead || s.leaving) { overviewCruiseDrop(s); return; }
  if (alive && cr.target && cr.target.of === o) { cr.target.x = o.x; cr.target.y = o.y; }
  if (cr.active) { c.started = true; return; }
  if (!c.started) { if (!(s.ap && s.ap.on)) overviewCruiseDrop(s); return; } // still flying clear of a mass; or it never engaged
  const then = c.then, what = overviewCruiseEnds(cr.endWhy, alive);
  overviewCruiseDrop(s);
  if (what === 'hand' && ASSIST.on) assistSet(then, o);
}

// give the selected thing an order: what a click on a button of the block does. id: a mode of the assist, 'cruise' (Cruise to) or 'lock'. The same button again
// ends the order (or drops the lock). The assist is switched on if it was off: an order needs it. Returns true when something changed.
function overviewOrder(s, id) {
  const t = overviewTarget(s); if (!t || s.dead || s.leaving || typeof ASSIST === 'undefined' || !s.as) return false;
  if (id === 'cruise') return overviewCruiseTo(s);
  if (id === 'lock') {
    if (typeof gunlockSet !== 'function' || !t.ship || !overviewHostile(s, t.ref)) return false;
    if (!ASSIST.on) assistOn(s, true);
    return gunlockTarget() === t.ref ? gunlockSet(null) : gunlockSet(t.ref);
  }
  if (!ASSIST_MODES[id]) return false;
  if (!ASSIST.on) assistOn(s, true);
  const o = overviewOrderState(s);
  if (o.mine && o.mode === id) return assistSet('');
  return t.ship ? assistSet(id, t.ref) : assistSet(id);
}

function overviewSetup(s) {
  const O = OVERVIEW, ov = s.ov = { shown: false, keys: false, sel: 0, rows: [], at: 0, press: false, k: null, parts: [], texts: [], btns: [], orders: [], lay: overviewLayout(0, -1) };
  ov.k = s.input.keyboard.addKeys([O.key, O.cruiseKey, 'W', 'S', 'UP', 'DOWN', 'ENTER'].join(','));
  const fix = o => { o.setScrollFactor(0).setVisible(false); ov.parts.push(o); return o; };
  const L = ov.lay, stop = e => { ov.press = true; if (e && e.stopPropagation) e.stopPropagation(); }; // a click on the panel is not a click in space
  ov.bg = fix(s.add.rectangle(L.x, L.y, L.w, L.h, 0x04101c, 0.72).setOrigin(0, 0).setStrokeStyle(1, 0x2a6f8f, 0.9).setDepth(100)); // the whole panel: click to move reads it as HUD
  ov.bg.setInteractive(); ov.bg.on('pointerdown', (p, x, y, e) => stop(e));
  ov.hl = fix(s.add.rectangle(L.x + 2, L.y, L.w - 4, O.row, 0x38e1ff, 0.16).setOrigin(0, 0).setDepth(100.5));
  ov.blk = fix(s.add.rectangle(L.x + 4, L.y, L.w - 8, L.block - 4, 0x0b2a3d, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x38e1ff, 0.5).setDepth(100.5)); // the open row's block
  const style = { fontFamily: 'monospace', fontSize: '13px', color: O.colors.other };
  ov.head = fix(s.add.text(L.x + 8, L.y + 5, '', Object.assign({}, style, { color: '#5b7a92' })).setDepth(101));
  for (let i = 0; i < O.max; i++) {
    const t = fix(s.add.text(L.x + 8, L.rowY[i], '', style).setDepth(101));
    t.setInteractive(); t.on('pointerdown', (p, x, y, e) => { stop(e); if (ov.rows[i]) { ov.sel = i; overviewPick(s, ov.rows[i]); ov.at = 0; } });
    ov.texts.push(t);
  }
  ov.info = fix(s.add.text(L.x + 12, L.y, '', Object.assign({}, style, { fontSize: '12px', color: '#9fe9ff' })).setDepth(101));
  ov.stat = fix(s.add.text(L.x + L.w - 12, L.y, '', Object.assign({}, style, { fontSize: '12px', fontStyle: 'bold', color: '#6dff9c' })).setOrigin(1, 0).setDepth(101));
  for (let i = 0; i < O.btns; i++) { // the order buttons: a pool, filled by the draw
    const b = fix(s.add.text(L.x, L.y, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9fe9ff', backgroundColor: '#123347', padding: { x: 6, y: 2 } }).setDepth(101.5));
    b.setInteractive({ useHandCursor: true }); b.on('pointerdown', (p, x, y, e) => { stop(e); const o = ov.orders[i]; if (o && !o.off) { overviewOrder(s, o.id); sfx('tick'); ov.at = 0; } });
    ov.btns.push(b);
  }
  ov.foot = fix(s.add.text(L.x + 8, L.footY, '', Object.assign({}, style, { color: '#5b7a92' })).setDepth(101));
  s.events.once('shutdown', () => { if (s.ov === ov) s.ov = null; });
}

function overviewShow(s, shown, keys) {
  const ov = s.ov; if (!ov) return;
  ov.shown = !!shown; ov.keys = !!(shown && keys); ov.at = 0;
  if (!ov.shown) ov.parts.forEach(o => o.setVisible(false));
}

const overviewJustDown = k => { if (k && k._justDown) { k._justDown = false; return true; } return false; };

// one call per frame from Space.update, before cruise, the autopilot, the assist and the flight code read the keys
function overviewFrame(s, time) {
  const ov = s.ov; if (!ov) return;
  const k = ov.k, nav = !!(s.cr && s.cr.navOpen);
  if (ov.press) { if (s.input.activePointer.isDown) s.nextFire = Math.max(s.nextFire || 0, time + 80); else ov.press = false; } // a press on the panel does not fire the guns
  if (nav) ov.keys = false; // the nav list has the keyboard
  else if (overviewJustDown(k[OVERVIEW.key])) { if (!ov.shown) overviewShow(s, true, true); else if (!ov.keys) overviewShow(s, true, true); else overviewShow(s, false); sfx('tick'); }
  // C with a far ship selected is Cruise to that ship, not cruise to the nav target: this frame the cruise code (which runs after this) must
  // not see the key. With the list hidden too: the order is the key's, the button only shows it.
  overviewCruiseFrame(s);
  // The key is only looked at here, never taken unless Cruise to is what it does: Phaser hands this list and src/cruise.js the same Key object for C,
  // so taking the press for a ship that is not far (or none) would leave plain cruise to the nav target with a key that never came (the night smoke, tests/cruise.mjs)
  const ck = k[OVERVIEW.cruiseKey];
  if (!nav && ck && ck._justDown) {
    const sel = overviewTarget(s), sh = s.ship;
    if (ov.cruise || (sel && sel.ship && overviewFar(Math.hypot(sel.ref.x - sh.x, sel.ref.y - sh.y)))) {
      ck._justDown = false;
      if (s.cr && s.cr.k && s.cr.k[OVERVIEW.cruiseKey]) s.cr.k[OVERVIEW.cruiseKey]._justDown = false;
      overviewCruiseTo(s);
    }
  }
  if (!ov.shown) return;
  const t = overviewTarget(s), tr = t ? t.ref : null;
  if (tr !== ov.tgt) { ov.tgt = tr; ov.at = 0; } // the target changed (a click in space, the nav list, an order): the block moves this frame
  if (time >= ov.at) { ov.at = time + OVERVIEW.every; overviewBuild(s); }
  if (ov.keys) {
    const up = overviewJustDown(k.W) | overviewJustDown(k.UP), down = overviewJustDown(k.S) | overviewJustDown(k.DOWN);
    if (ov.rows.length) {
      if (up) ov.sel = (ov.sel + ov.rows.length - 1) % ov.rows.length;
      if (down) ov.sel = (ov.sel + 1) % ov.rows.length;
      if (up || down) { ov.selRef = ov.rows[ov.sel].ref; sfx('tick'); overviewDraw(s); }
    }
    if (overviewJustDown(k.ENTER)) { if (ov.rows[ov.sel]) overviewPick(s, ov.rows[ov.sel]); ov.keys = false; ov.at = 0; overviewBuild(s); }
    ['W', 'S', 'UP', 'DOWN'].forEach(n => { if (k[n]) k[n].isDown = false; }); // these keys are the list's: the flight code after this line does not see them held
  }
}

function overviewBuild(s) {
  const ov = s.ov, sh = s.ship, v = (sh.body && sh.body.velocity) || { x: 0, y: 0 };
  const keep = ov.selRef;
  ov.rows = overviewWithTarget(overviewRows(overviewThings(s), { x: sh.x, y: sh.y, vx: v.x, vy: v.y }, 0), OVERVIEW.max, r => overviewIsTarget(s, r));
  if (ov.keys && keep) { const i = ov.rows.findIndex(r => r.ref === keep || (r.id !== undefined && keep && r.id === keep.id)); if (i >= 0) ov.sel = i; } // the ring stays on its row while the order changes
  if (ov.sel >= ov.rows.length) ov.sel = Math.max(0, ov.rows.length - 1);
  overviewDraw(s);
}

function overviewDraw(s) {
  const ov = s.ov, O = OVERVIEW, ti = ov.rows.findIndex(r => overviewIsTarget(s, r)), has = ti >= 0;
  // the open row's block: the range and the rate, the planner's word, and the orders as buttons
  const st = has ? overviewOrderState(s) : null, tr = has ? ov.rows[ti] : null;
  const lock = has && typeof gunlockTarget === 'function' ? { cap: GUNLOCK.key, can: overviewHostile(s, tr.ref), on: gunlockTarget() === tr.ref } : null;
  const going = has && !!ov.cruise && ov.cruise.ref === tr.ref, cruise = has && tr.ref && (tr.ref.body || tr.ref.setPosition) && (going || overviewFar(tr.range)) ? { cap: O.cruiseKey, on: going } : null;
  const orders = has ? overviewOrders(typeof assistState === 'function' ? assistState().keys : [], st, lock, cruise).slice(0, O.btns) : [];
  const L = ov.lay = overviewLayout(ov.rows.length, ti, overviewButtonLines(orders)), open = L.blockY >= 0;
  ov.bg.setVisible(true).setPosition(L.x, L.y).setSize(L.w, L.h);
  if (ov.bg.input && ov.bg.input.hitArea && ov.bg.input.hitArea.setSize) ov.bg.input.hitArea.setSize(L.w, L.h);
  ov.head.setVisible(true).setText('OVERVIEW' + '  RANGE'.padStart(17) + '  RATE');
  ov.texts.forEach((t, i) => {
    const r = ov.rows[i];
    t.setVisible(!!r).setY(L.rowY[i]);
    if (r) t.setText(overviewLine(r, i === ti)).setColor(overviewColor(r));
  });
  ov.hl.setVisible(ov.keys && ov.rows.length > 0).setY((L.rowY[ov.sel] || L.rowY[0]) - 1);
  ov.orders = open ? overviewButtons(orders, L) : [];
  ov.blk.setVisible(open); ov.info.setVisible(open); ov.stat.setVisible(open);
  if (open) {
    const info = overviewInfo(tr, going ? { mine: true, status: 'cruise' } : st);
    ov.blk.setPosition(L.x + 4, L.blockY - 2).setSize(L.w - 8, L.block - 4);
    ov.info.setPosition(L.x + 12, L.blockY + 1).setText(info.left);
    ov.stat.setPosition(L.x + L.w - 12, L.blockY + 1).setText(info.right).setColor(st.mine ? (/BRAKE|BACK/.test(info.right) ? '#ffb454' : '#6dff9c') : '#5b7a92');
  }
  ov.btns.forEach((b, i) => {
    const o = ov.orders[i];
    b.setVisible(!!o);
    if (o) b.setPosition(o.x, o.y).setText(o.cap + ' ' + o.label).setColor(o.off ? '#3d566a' : o.on ? '#04101c' : '#9fe9ff').setBackgroundColor(o.off ? '#0b1c29' : o.on ? '#38e1ff' : '#123347');
  });
  ov.foot.setVisible(true).setPosition(L.x + 8, L.footY).setText(ov.keys ? 'W S choose   Enter target   B hide' : 'click a row to target   B keys');
}

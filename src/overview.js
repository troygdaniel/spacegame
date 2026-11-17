// ---------- Overview: the list of what is around, nearest first (card space-game-overview) ----------
// Goes with the flight assist (src/assist.js) and click to move (src/clickmove.js). A compact panel under the radar lists what is near the ship:
// raiders, the escort, police and freighters, the station, planets, gates and found signals, each with its range and whether it closes or opens.
// Hostiles are red. A click on a row makes it the target; so do W S and Enter while the list has the keys. The assist keys (1, 2 and the rest)
// then act on it.
//   B                   hidden -> shown with the keys on it -> hidden. Enter picks the row and gives the keys back to the ship (the list stays up);
//                       B on a list that is up without the keys takes them again.
//   the target setter   a body: cruisePick (the N list's own target). A ship: the same pick a click on the ship in space makes
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
  kinds: { station: 'STATION', planet: 'PLANET', gate: 'GATE', belt: 'BELT', poi: 'SIGNAL', scenery: 'BODY', raider: 'RAIDER', drone: 'DRONE', gunship: 'GUNSHIP', pirate: 'PIRATE', escort: 'ESCORT', police: 'POLICE', civ: 'SHIP' },
  colors: { hostile: '#ff4d6d', friend: '#6dff9c', station: '#38e1ff', planet: '#ffb454', other: '#9fb6c8' }
};

// ---- the list: pure ----

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
  cruiseKnown(s).forEach(b => out.push({ id: b.id, name: b.name, kind: b.type, x: b.x, y: b.y, vx: 0, vy: 0, ref: b, ship: false }));
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
  if (!(o.body || o.setPosition)) { cruisePick(s, o); if (s.cm) s.cm.pick = null; return 'body'; } // a body: the nav target, as the N list sets it
  if (o.active === false) return '';
  if (typeof ASSIST === 'undefined' || !s.as) return '';
  if (!ASSIST.on) assistOn(s, true); // a ship is a target of the assist: picking one switches it on
  if (typeof clickmoveClick === 'function' && s.cm) return clickmoveClick(s, o.x, o.y) === 'ship' ? 'ship' : '';
  return assistSet(s.as.mode || 'approach', o) ? 'ship' : ''; // no click to move in this build: give the order straight
}

function overviewSetup(s) {
  const O = OVERVIEW, ov = s.ov = { shown: false, keys: false, sel: 0, rows: [], at: 0, press: false, k: null, parts: [], texts: [] };
  ov.k = s.input.keyboard.addKeys([O.key, 'W', 'S', 'UP', 'DOWN', 'ENTER'].join(','));
  const fix = o => { o.setScrollFactor(0).setVisible(false); ov.parts.push(o); return o; };
  const h = O.row * (O.max + 2) + 14;
  ov.bg = fix(s.add.rectangle(O.x, O.y, O.w, h, 0x04101c, 0.72).setOrigin(0, 0).setStrokeStyle(1, 0x2a6f8f, 0.9).setDepth(100));
  ov.bg.setInteractive(); ov.bg.on('pointerdown', (p, x, y, e) => { ov.press = true; if (e && e.stopPropagation) e.stopPropagation(); }); // a click on the panel is not a click in space
  ov.hl = fix(s.add.rectangle(O.x + 2, O.y, O.w - 4, O.row, 0x38e1ff, 0.16).setOrigin(0, 0).setDepth(100.5));
  const style = { fontFamily: 'monospace', fontSize: '13px', color: O.colors.other };
  ov.head = fix(s.add.text(O.x + 8, O.y + 5, '', Object.assign({}, style, { color: '#5b7a92' })).setDepth(101));
  for (let i = 0; i < O.max; i++) {
    const t = fix(s.add.text(O.x + 8, O.y + 7 + O.row * (i + 1), '', style).setDepth(101));
    t.setInteractive(); t.on('pointerdown', (p, x, y, e) => { ov.press = true; if (e && e.stopPropagation) e.stopPropagation(); if (ov.rows[i]) { ov.sel = i; overviewPick(s, ov.rows[i]); ov.at = 0; } });
    ov.texts.push(t);
  }
  ov.foot = fix(s.add.text(O.x + 8, O.y + 9 + O.row * (O.max + 1), '', Object.assign({}, style, { color: '#5b7a92' })).setDepth(101));
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
  if (!ov.shown) return;
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
  ov.rows = overviewRows(overviewThings(s), { x: sh.x, y: sh.y, vx: v.x, vy: v.y }, OVERVIEW.max);
  if (ov.keys && keep) { const i = ov.rows.findIndex(r => r.ref === keep || (r.id !== undefined && keep && r.id === keep.id)); if (i >= 0) ov.sel = i; } // the ring stays on its row while the order changes
  if (ov.sel >= ov.rows.length) ov.sel = Math.max(0, ov.rows.length - 1);
  overviewDraw(s);
}

function overviewDraw(s) {
  const ov = s.ov, O = OVERVIEW;
  ov.bg.setVisible(true); ov.head.setVisible(true).setText('OVERVIEW' + '  RANGE'.padStart(17) + '  RATE');
  ov.texts.forEach((t, i) => {
    const r = ov.rows[i];
    t.setVisible(!!r);
    if (r) t.setText(overviewLine(r, overviewIsTarget(s, r))).setColor(overviewColor(r));
  });
  ov.hl.setVisible(ov.keys && ov.rows.length > 0).setY(O.y + 6 + O.row * (ov.sel + 1));
  ov.foot.setVisible(true).setText(ov.keys ? 'W S choose   Enter target   B hide' : 'click a row to target   B keys');
}

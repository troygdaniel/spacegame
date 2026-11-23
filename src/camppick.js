// ---------- Campaign: picking the target of an order (card space-game-order-target-pick; Troy, 22 Nov 2026) ----------
// An order that needs something to act on helps the player choose it. A row of a list says so with `pick` (CAMP_PANELS in src/data_controls.js):
//   'enemy'   Attack (the squads' lists and the escorts'): a hostile, the nearest threat to the ships you protect first
//   'escort'  Escort the convoy: a convoy ship or one of the neutral miners, the nearest to the cruiser first
//   'field'   Mine ore: a field of rocks with rock left in it, the nearest to the cruiser first
// ONE candidate: the order is given at once, at it (an enemy also becomes THE target, C.tgt, so P fly to the target and a missile follow it). SEVERAL: Enter on the row opens a SUB-LIST of them (a row each: its name, how far, its hull),
// Up and Down move the highlight, Enter gives the order, Esc (or Left) goes back to the list it came from. NONE: the order is as it always was (no convoy in the level: the escorts stay close; no rock: the ore lying about; no hostile: Attack
// is refused, and its row is grey). An enemy that is already the target (A D S picked it) is attacked at once, with no list: those keys stay the quick way. Moving the highlight REVEALS the candidate in the flight view (src/camppickdraw.js).
// Plain data and functions, no Phaser (tests/camppick.mjs runs it in Node). The list state is P.pick (src/camppanel.js keeps it, the panel's P):
//   P.pick = { row: the row's id, kind, ids: [the candidates' ids in the order they were first shown], sel: the id the highlight is on, at, top }   null when no sub-list is open; P.open stays the list it came from
//   P.seen = { kind, id, until }                the candidate an order was just given at: its bracket stays on the screen until the scene's clock passes `until` (CAMP_PICK.seen)
//   campPickKind(row)                           the row's kind, or ''
//   campPickItems(C, kind)                      the candidates now: [{ id, name, what, x, y, r, km, hp (0 to 1; -1 for a field), n (rocks), rock (a field: the rock the order is at) }], in the order a first showing is made
//   campPickPlan(C, row)                        { how: 'direct' } the order as it always was | { how: 'auto', item } one candidate | { how: 'list', items } several
//   campPickOpen(P, row, items)                 open the sub-list for a row, the first candidate highlighted
//   campPickSync(C, pk)                         the sub-list's candidates now, in its own order (the dead are gone, a new one comes last), the highlight kept on the same candidate: [] when none is left
//   campPickRow(C, item, kind)                  one row of the sub-list as the drawing wants it: { id, label, key, more, ok, state, short, marked }
//   campPickShown(P, C, now)                    the candidate the flight view marks now (the highlighted one, or the one an order was just given at), or null
//   campPickFit(C, item, view)                  the flight zoom at which the candidate and the cruiser are both inside `view` ({ x0, y0, x1, y1 }, screen px), the cruiser being at the middle of the screen
const CAMP_PICK = {
  seen: 1200,                                  // ms an order's bracket stays on the candidate it was given at (the auto-pick, and a choice from the sub-list)
  view: { left: 480, right: 40, top: 90, bottom: 80 } // px of the screen the reveal keeps clear: the list at the left edge ends at 384, and the bracket round the candidate reaches 30 px (and a little more) out from its middle; the radar and the gauges take the top, the key line the bottom
};
const campPickKind = row => (row && row.pick) || '';
const campPickGuarded = C => (typeof campConvoyShips === 'function' ? campConvoyShips(C) : campConvoys(C)); // the ships you protect: the convoys and the neutral miners
const campPickHull = u => Math.max(0, Math.min(1, u.hp / (u.maxHp || u.hp || 1)));
const campPickByNear = (list, p) => list.slice().sort((a, b) => campDist(a, p) - campDist(b, p) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
function campPickShip(C, u, name, what) { return { id: u.id, name, what, x: u.x, y: u.y, r: u.r || 20, km: campNavKm(campDist(u, C.carrier)), hp: campPickHull(u), n: 0, rock: '' }; }
function campPickHostiles(C) { // every hostile (what A D S step through), the nearest threat to the ships you protect first; with none to protect, the nearest to the cruiser
  const guard = campPickGuarded(C), ref = guard.length ? guard : [C.carrier], gap = u => Math.min.apply(null, ref.map(p => campDist(u, p)));
  return campAliens(C).slice().sort((a, b) => gap(a) - gap(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(u => campPickShip(C, u, campNavUnitName(u), 'ship'));
}
function campPickEscorts(C) { return campPickByNear(campPickGuarded(C), C.carrier).map(u => Object.assign(campPickShip(C, u, u.kind === 'freighter' && !u.named ? campConvoyName(u) + ' convoy' : campConvoyName(u), 'ship'), { charge: true })); } // charge: a ship you protect, whose row wears its health bar (card space-game-protected-health)
function campPickFields(C) { // the rocks that are left, a field of them by the row of the level that made them (a rock carries its field's number)
  const by = {}; (C.rocks || []).forEach(r => { if (r.hp > 0) (by[r.field == null ? 0 : r.field] = by[r.field == null ? 0 : r.field] || []).push(r); });
  return campPickByNear(Object.keys(by).map(k => {
    const rs = by[k], n = rs.length, x = rs.reduce((a, r) => a + r.x, 0) / n, y = rs.reduce((a, r) => a + r.y, 0) / n, c = { x, y };
    const near = campPickByNear(rs, C.carrier)[0], r = Math.max.apply(null, rs.map(o => campDist(o, c) + (o.r || 30)));
    return { id: 'field-' + k, name: uiText('camp.ui.cand.field', { n: (+k | 0) + 1 }), what: 'field', x, y, r, km: campNavKm(campDist(c, C.carrier)), hp: -1, n, rock: near.id };
  }), C.carrier);
}
function campPickItems(C, kind) {
  if (!C || !C.carrier) return [];
  return kind === 'enemy' ? campPickHostiles(C) : kind === 'escort' ? campPickEscorts(C) : kind === 'field' ? campPickFields(C) : [];
}
function campPickPlan(C, row) {
  const kind = campPickKind(row); if (!kind || !C) return { how: 'direct' };
  if (kind === 'enemy' && typeof campTgtNow === 'function' && campTgtNow(C)) return { how: 'direct' }; // a target is picked already (A D S): the order goes at it
  const items = campPickItems(C, kind);
  return items.length === 1 ? { how: 'auto', item: items[0] } : items.length > 1 ? { how: 'list', items } : { how: 'direct' };
}
function campPickOpen(P, row, items) {
  P.pick = { row: row.id, kind: campPickKind(row), ids: items.map(i => i.id), sel: items[0] ? items[0].id : '', at: 0, top: 0 };
  return P.pick;
}
function campPickSync(C, pk) {
  if (!pk || !C) return [];
  const live = campPickItems(C, pk.kind), by = {}; live.forEach(i => { by[i.id] = i; });
  const known = pk.ids.filter(id => by[id]), fresh = live.filter(i => pk.ids.indexOf(i.id) < 0).map(i => i.id); // the dead are gone; one that came since is last
  pk.ids = known.concat(fresh);
  const items = pk.ids.map(id => by[id]); if (!items.length) return [];
  const i = items.findIndex(x => x.id === pk.sel); pk.at = i >= 0 ? i : Math.max(0, Math.min(items.length - 1, pk.at | 0)); pk.sel = items[pk.at].id; // the highlight stays on the same candidate while the others come and go
  return items;
}
function campPickRow(C, it, kind) {
  const pct = Math.round(Math.max(0, it.hp) * 100), n = it.n;
  const short = it.what === 'field' ? uiText(n === 1 ? 'camp.ui.cand.rock1' : 'camp.ui.cand.rocks', { n }) + '  ' + it.km + ' km' : it.km + ' km  ' + pct + '%';
  const state = it.what === 'field' ? uiText('camp.ui.cand.state.field', { name: it.name, n, km: it.km }) : uiText('camp.ui.cand.state.ship', { name: it.name, km: it.km, hp: pct });
  return { id: it.id, label: it.name, key: '', more: false, ok: true, state, short, marked: kind === 'enemy' && !!C.tgt && C.tgt === it.id, hull: it.charge ? Math.max(0, Math.min(1, it.hp)) : -1, band: it.charge ? campChargeBand(it.hp) : '' }; // the target now is marked; a ship you protect has its hull and the band of its colour for the bar at the right of its row (src/campanelsdraw.js)
}
function campPickShown(P, C, now) {
  if (!P || !C) return null;
  if (P.pick) { const items = campPickSync(C, P.pick); return items[P.pick.at] || null; }
  const s = P.seen; if (!s) return null;
  if (!(now < s.until)) { P.seen = null; return null; }
  return campPickItems(C, s.kind).find(i => i.id === s.id) || null;
}
// the zoom at which the candidate and the cruiser both fit: the cruiser is at the middle of the screen (the camera follows it), so the candidate is at (dx, dy) times the zoom from the middle and must stay inside the view
function campPickFit(C, it, view) {
  if (!C || !it) return Infinity;
  const V = view || { x0: CAMP_PICK.view.left, y0: CAMP_PICK.view.top, x1: W - CAMP_PICK.view.right, y1: H - CAMP_PICK.view.bottom }, cx = W / 2, cy = H / 2;
  const dx = it.x - C.carrier.x, dy = it.y - C.carrier.y, ex = Math.abs(dx) + (it.r || 0), ey = Math.abs(dy) + (it.r || 0);
  const roomX = dx < 0 ? cx - V.x0 : V.x1 - cx, roomY = dy < 0 ? cy - V.y0 : V.y1 - cy; // the room between the middle and the edge of the view on the side the candidate is on
  const zx = ex > 0 ? Math.max(0.001, roomX) / ex : Infinity, zy = ey > 0 ? Math.max(0.001, roomY) / ey : Infinity;
  return Math.min(zx, zy);
}

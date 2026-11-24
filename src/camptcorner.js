// ---------- Campaign: the target corners, [ ] HOSTILES top right and O P FRIENDLIES bottom right (card space-game-layout-targets; Troy, 24 Nov 2026, agreed bite by bite from his screenshot) ----------
// The one target box became two corners of the corner panel (src/campcorner.js): [ ] HOSTILES at the top right and O P FRIENDLIES at the bottom right, each a small title that never leaves, after its key chips. Still ONE target is held
// at a time (C.tgt or C.fsel, src/camptarget.js): the corner that holds it writes its name beside the title (never fades) and, in its details, shows the picture, the hull, the shield, how far it is, what it is doing and the E chip
// (E Attack for an enemy, E Guard for a friendly: bright when the order can be given, grey when not). The details open when the corner's keys are used and, by themselves, whenever the target held (or the ship an order's list is on)
// changes: a bracket, the nearest-threat key, a click on an outpost on the Tab map. They fade after CAMP.corner.show ms; the title stays. With nothing to pick the title says NO HOSTILES or NO FRIENDLIES. A map-clicked outpost or
// planet is a friendly. This file is the rule (no Phaser: tests/campcorners.mjs); campTcornerHold in src/camptdisp.js says what each corner holds, src/camptcornerscene.js draws the ship's picture, the panel draws the rest.
//   campTcornerLook(P, now)       the scene tells the rule the panels' state and its clock each frame (campCornerNow reads only the game): the ship an order's list is on is shown in its side's details
//   campTcornerInfo(C, which)     campTcornerHold with what campTcornerLook said ('host' | 'fri')
//   campTcornerRows(C, which)     the details' items (the panel's kinds, and { kind: 'pic' } for the picture row the scene draws): the picture with its type and distance, HULL and SHIELD bars (no shield: a line saying so), what it does, the E chip
const CAMP_TCORNER_SEEN = { P: null, now: 0 }; // what the scene last told the rule: the panels' state (null in a test) and its clock in ms
function campTcornerLook(P, now) { CAMP_TCORNER_SEEN.P = P || null; CAMP_TCORNER_SEEN.now = +now || 0; }
const campTcornerInfo = (C, which) => campTcornerHold(C, CAMP_TCORNER_SEEN.P, CAMP_TCORNER_SEEN.now, which);
const campTcornerSubjectId = (C, which) => { const s = campTcornerInfo(C, which).subject; return s ? (s.u ? s.u.id : s.post ? s.post.id : '') : ''; }; // the ship or the place the details show, '' for none
function campTcornerRows(C, which) {
  const sub = campTcornerInfo(C, which).subject; if (!sub) return [];
  const K = CAMP.tdisp, ink = K.ink[sub.side === 'hostile' ? 'hostile' : 'friend'], info = sub.post ? campTdispPostInfo(C, sub.post) : campTdispInfo(C, sub.u, sub.side);
  const ord = sub.held ? campTdispOrder(C, sub.side === 'hostile' ? 'attack' : 'guard') : null, km = uiText('camp.tdisp.km', { km: info.km }), rows = [];
  if (info.kind === 'post') rows.push({ kind: 'text', text: info.type, ink }, { kind: 'text', text: km, ink: '#e8f6ff' }); // an outpost or a planet: no picture, no hull, no shield, no order it is on
  else {
    rows.push({ kind: 'pic', text: '', ship: info.kind, id: info.id, side: sub.side, name: sub.held ? '' : info.name, type: info.type, km }); // the name is beside the title when it is held; a ship an order's list is on has none there
    rows.push({ kind: 'bar', name: uiText('camp.tdisp.hull'), num: info.hull.now + ' / ' + info.hull.max, share: info.hull.share, color: CAMP.charge.color[campChargeBand(info.hull.share)] });
    rows.push(info.shield ? { kind: 'bar', name: uiText('camp.tdisp.shield'), num: info.shield.now + ' / ' + info.shield.max, share: info.shield.share, color: 0x7fe9ff } : { kind: 'text', text: uiText('camp.tdisp.noshield'), ink: '#7f95a8' });
    rows.push({ kind: 'text', text: info.doing, ink });
  }
  if (ord) rows.push({ kind: 'key', cap: ord.key, label: ord.label, ok: ord.ok });
  return rows;
}
const campTcornerHit = (C, mem, which) => { const id = campTcornerSubjectId(C, which), was = mem.id || ''; mem.id = id; return !!id && id !== was; }; // true when the ship or the place shown is a new one: the details come back by themselves, whatever key picked it
campCornerAdd({
  id: 'hostiles', at: 'tr', keys: ['hostiles'], title: C => campTcornerInfo(C, 'host').titleKey,
  selection: C => campTcornerInfo(C, 'host').name, rows: C => campTcornerRows(C, 'host'), hit: (C, mem) => campTcornerHit(C, mem, 'host')
});
campCornerAdd({
  id: 'friendlies', at: 'br', keys: ['friendlies'], title: C => campTcornerInfo(C, 'fri').titleKey,
  selection: C => campTcornerInfo(C, 'fri').name, rows: C => campTcornerRows(C, 'fri'), hit: (C, mem) => campTcornerHit(C, mem, 'fri')
});

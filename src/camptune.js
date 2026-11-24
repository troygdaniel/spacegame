// ---------- Campaign: the tuning panel's numbers and switches (card space-game-tuning-panel; Troy, 22 Nov 2026) ----------
// Troy tunes the Campaign by feel: most of his asks are "change this number" or "turn this off". The tuning panel (src/camptunedraw.js; the N key, in flight and in the ready room) lists the
// numbers and the switches of this file's table, changes them LIVE, and keeps them in this browser. This file is the rule of it, pure (no Phaser): the table, the overrides, and the text
// block "Copy my settings" puts on the clipboard so an agent can bake the values in as the new defaults (tools/apply-tuning.mjs reads it and prints the CAMP changes it means).
//
//   THE ROWS (CAMP_TUNE.rows): { id, kind, group, label (camp.ui.tune.row.<id>), when, ... }
//     kind 'num' (the default): { root: 'CAMP' | 'CAMPZOOM', path: 'carrier.speed', min, max, step, unit }: a number of that table. An array with `of: 2` is a row of numbers by power pips: the row shows the
//         value at pip 2 (the default setting) and every pip of the array is scaled with it, so the shape of the curve stays.
//     kind 'flag': { flag: 'distress' }: a switch of CAMP.flags (src/campaign.js), one place that the missions and the systems read (campFlag).
//     when: 'now' the change is felt at once; 'next' from the next mission start (the number is copied into a ship or a rock when the mission is made).
//   THE OVERRIDES (CAMP_TUNE.state.over): { id: value } for the rows that differ from the default. The default is what CAMP held the first time anything here was asked (the snapshot).
//   campTuneRow(id) / campTuneRows(group)   the rows
//   campTuneDefault(id) / campTuneValue(id) the default and the value now (a number, or true or false for a switch)
//   campTuneSet(id, v) / campTuneStep(id, dir, big) / campTuneReset(id) / campTuneResetAll()   change one: clamped to the row's range and rounded to its step; a value that is the default is no override
//   campTuneActive() / campTuneCount()      is any override on; how many
//   campTuneText() / campTuneParse(text)    the block "Copy my settings" writes (only the changed rows) and its reading again (the tool's)
//   campTuneLoadOnce() / campTuneSave()     the browser's localStorage: read once per page by the Campaign and the ready room, written at every change. NEVER read by a bot, a node test or a boot script:
//                                           only a scene calls campTuneLoadOnce, and a browser driven by automation (navigator.webdriver) is refused (campTuneBlocked), which also keeps it from saving
// Scores and ranks earned while any override is on are not kept (campTuneKeepScore, used by the Campaign scene's debrief).
const CAMP_TUNE = {
  store: 'longhaul.campaign.tuning',      // the localStorage key: { v: 1, over: { id: value } }
  ver: 1,
  bigStep: 10,                            // Shift with Left or Right: this many steps at once
  groups: ['ship', 'guns', 'wing', 'foes', 'time', 'ore', 'systems'],   // the panel's headings, in order (camp.ui.tune.group.<id>)
  rows: [
    // the cruiser
    { id: 'cruiserspeed', group: 'ship', root: 'CAMP', path: 'carrier.speed', min: 60, max: 600, step: 10, unit: 'px/s', when: 'next' },
    { id: 'cruiserturn', group: 'ship', root: 'CAMP', path: 'carrier.turn', min: 0.3, max: 4, step: 0.1, unit: 'rad/s', when: 'next' },
    { id: 'shieldsize', group: 'ship', root: 'CAMP', path: 'carrier.shield', min: 30, max: 600, step: 10, unit: 'points', when: 'now' },
    { id: 'shieldmend', group: 'ship', root: 'CAMP', path: 'power.shields.regen', of: 2, min: 0, max: 30, step: 0.5, unit: 'a second', when: 'now' },
    // the guns: the turrets, the missiles, the charge the turrets draw
    { id: 'turretdamage', group: 'guns', root: 'CAMP', path: 'carrier.pd', min: 1, max: 40, step: 1, unit: '', when: 'now' },
    { id: 'turretdelay', group: 'guns', root: 'CAMP', path: 'carrier.pdDelay', min: 100, max: 2000, step: 50, unit: 'ms', when: 'now' },
    { id: 'sensorrange', group: 'guns', root: 'CAMP', path: 'sensor.range', min: 0, max: 20000, step: 500, unit: 'px', when: 'now' },
    { id: 'turretreach', group: 'guns', root: 'CAMP', path: 'carrier.pdRange', min: 150, max: 1500, step: 50, unit: 'px', when: 'now' },
    { id: 'missilecount', group: 'guns', root: 'CAMP', path: 'missile.magazine', min: 0, max: 12, step: 1, unit: '', when: 'next' },
    { id: 'missilereload', group: 'guns', root: 'CAMP', path: 'missile.reload', min: 2000, max: 60000, step: 1000, unit: 'ms', when: 'now' },
    { id: 'lasertank', group: 'guns', root: 'CAMP', path: 'tank.max', min: 20, max: 400, step: 10, unit: '', when: 'now' },
    { id: 'laserrefill', group: 'guns', root: 'CAMP', path: 'tank.refill', of: 2, min: 1, max: 40, step: 1, unit: 'a second', when: 'now' },
    // the wing and the ships you escort
    { id: 'fighterhull', group: 'wing', root: 'CAMP', path: 'fighter.hp', min: 6, max: 200, step: 2, unit: '', when: 'next' },
    { id: 'fighterdamage', group: 'wing', root: 'CAMP', path: 'fighter.damage', min: 1, max: 40, step: 1, unit: '', when: 'now' },
    { id: 'repairbelow', group: 'wing', root: 'CAMP', path: 'repair.below', min: 0.05, max: 0.9, step: 0.05, unit: '', when: 'now' },     // card space-game-keys2-orders: the hull a pilot breaks off at and returns home by itself
    { id: 'repairtime', group: 'wing', root: 'CAMP', path: 'repair.time', min: 2, max: 90, step: 2, unit: 's', when: 'now' },                  // and the seconds its mend takes before it comes back out whole
    { id: 'convoyspeed', group: 'wing', root: 'CAMP', path: 'convoy.speedScale', min: 0.3, max: 3, step: 0.05, unit: 'x', when: 'next' },
    // the enemy
    { id: 'enemyhull', group: 'foes', root: 'CAMP', path: 'alien.hpScale', min: 0.2, max: 5, step: 0.1, unit: 'x', when: 'next' },
    { id: 'enemydamage', group: 'foes', root: 'CAMP', path: 'alien.damageScale', min: 0.2, max: 5, step: 0.1, unit: 'x', when: 'next' },
    // time
    { id: 'pace', group: 'time', root: 'CAMP', path: 'pace.scale', min: 0.4, max: 1.6, step: 0.05, unit: 'x', when: 'next' },
    { id: 'fightpace', group: 'time', root: 'CAMP', path: 'pace.fight', min: 0.25, max: 1, step: 0.05, unit: 'x', when: 'now' },     // how fast the small ships fly and fire while a foe is near (card space-game-slower-fights); 1 is as fast as they travel
    { id: 'wavetime', group: 'time', root: 'CAMP', path: 'time.waves', min: 0.25, max: 3, step: 0.05, unit: 'x', when: 'now' },
    { id: 'startzoom', group: 'time', root: 'CAMPZOOM', path: 'view.startPresses', min: 0, max: 12, step: 1, unit: 'presses', when: 'next' },
    // the ore
    { id: 'orerock', group: 'ore', root: 'CAMP', path: 'ore.rock', min: 5, max: 100, step: 5, unit: 'ore', when: 'next' },
    { id: 'miningrate', group: 'ore', root: 'CAMP', path: 'laser.dps', min: 1, max: 60, step: 1, unit: 'a second', when: 'now' },
    { id: 'repairprice', group: 'ore', root: 'CAMP', path: 'mend.hullOre', min: 5, max: 400, step: 5, unit: 'ore a hull', when: 'now' },          // card space-game-repair-with-ore: the cruiser's whole hull, mended in space (the dock takes half)
    { id: 'wardprice', group: 'ore', root: 'CAMP', path: 'mend.wardPoint', min: 0, max: 2, step: 0.05, unit: 'ore a point', when: 'now' },     // a ship you protect
    { id: 'fightermend', group: 'ore', root: 'CAMP', path: 'repair.ore', min: 0, max: 50, step: 1, unit: 'ore', when: 'now' },                  // a landed fighter's mend (none: twice the time)
    // the switches (each turns a whole system off, as if it were not in the mission; autofire turns one on)
    { id: 'distress', kind: 'flag', group: 'systems', flag: 'distress', when: 'next' },
    { id: 'tboats', kind: 'flag', group: 'systems', flag: 'tboats', when: 'next' },
    { id: 'rival', kind: 'flag', group: 'systems', flag: 'rival', when: 'next' },
    { id: 'repair', kind: 'flag', group: 'systems', flag: 'repair', when: 'now' },
    { id: 'convoyorders', kind: 'flag', group: 'systems', flag: 'convoyorders', when: 'now' },
    { id: 'autofire', kind: 'flag', group: 'systems', flag: 'autofire', when: 'now' },
    { id: 'laser', kind: 'flag', group: 'systems', flag: 'laser', when: 'now' },
    { id: 'hints', kind: 'flag', group: 'systems', flag: 'hints', when: 'now' }
  ],
  state: { over: {}, snap: null, loaded: false }
};

const campTuneRow = id => CAMP_TUNE.rows.find(r => r.id === id) || null;
const campTuneRows = group => CAMP_TUNE.rows.filter(r => !group || r.group === group);
const campTuneIsFlag = row => !!row && row.kind === 'flag';

// where a row's number lives: its table and path
function campTuneRoot(name) { // the tables a row can live in: the Campaign's own (src/campaign.js), the flight view's zoom (src/campzoom.js)
  if (name === 'CAMPZOOM') return typeof CAMPZOOM === 'object' ? CAMPZOOM : null;
  return typeof CAMP === 'object' ? CAMP : null;
}
function campTuneSlot(row) { // { obj, key } of the row's number (the parent object and its key), or null when the table has no such place
  if (!row) return null;
  if (campTuneIsFlag(row)) { const C = campTuneRoot('CAMP'); return C && C.flags ? { obj: C.flags, key: row.flag } : null; }
  let obj = campTuneRoot(row.root); const parts = row.path.split('.');
  for (let i = 0; i < parts.length - 1 && obj; i++) obj = obj[parts[i]];
  return obj ? { obj, key: parts[parts.length - 1] } : null;
}
const campTuneDec = row => { const s = String(row.step || 1), i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
const campTuneRound = (row, v) => +(+v).toFixed(campTuneDec(row) + 3);

// the snapshot: what the table held before any override went in, taken once (so every default is the table's own, whatever a mod or a test did to it before)
function campTuneSnap() {
  const S = CAMP_TUNE.state; if (S.snap) return S.snap;
  S.snap = {};
  CAMP_TUNE.rows.forEach(row => {
    const sl = campTuneSlot(row); if (!sl) return;
    const v = sl.obj[sl.key];
    if (campTuneIsFlag(row)) S.snap[row.id] = { v: v === true, arr: null };
    else if (row.of != null && Array.isArray(v)) S.snap[row.id] = { v: v[row.of], arr: v.slice() };
    else S.snap[row.id] = { v, arr: null };
  });
  return S.snap;
}
function campTuneDefault(id) { const s = campTuneSnap()[id]; return s ? s.v : undefined; }
function campTuneValue(id) { const o = CAMP_TUNE.state.over; return Object.prototype.hasOwnProperty.call(o, id) ? o[id] : campTuneDefault(id); }
const campTuneChanged = id => Object.prototype.hasOwnProperty.call(CAMP_TUNE.state.over, id);
const campTuneCount = () => Object.keys(CAMP_TUNE.state.over).length;
const campTuneActive = () => campTuneCount() > 0;

// put a value into the live table (a scaled array: every pip moves with the one the row shows)
function campTunePut(row, v) {
  const sl = campTuneSlot(row), s = campTuneSnap()[row.id]; if (!sl || !s) return false;
  if (campTuneIsFlag(row)) { sl.obj[sl.key] = !!v; return true; }
  if (s.arr) { const base = s.arr[row.of]; sl.obj[sl.key] = s.arr.map((x, i) => i === row.of ? v : base ? campTuneRound(row, x * v / base) : x); return true; }
  sl.obj[sl.key] = v; return true;
}
function campTuneClamp(row, v) {
  if (campTuneIsFlag(row)) return !!v;
  v = Number(v); if (!isFinite(v)) return campTuneDefault(row.id);
  return campTuneRound(row, Math.max(row.min, Math.min(row.max, Math.round(v / row.step) * row.step)));
}
const campTuneSame = (row, a, b) => campTuneIsFlag(row) ? !!a === !!b : Math.abs(a - b) < 1e-9;

function campTuneSet(id, v) {
  const row = campTuneRow(id); if (!row || !campTuneSnap()[id]) return null;
  const val = campTuneClamp(row, v), d = campTuneDefault(id);
  if (campTuneSame(row, val, d)) delete CAMP_TUNE.state.over[id]; else CAMP_TUNE.state.over[id] = val;
  campTunePut(row, val); campTuneSave();
  return val;
}
function campTuneStep(id, dir, big) {
  const row = campTuneRow(id); if (!row) return null;
  if (campTuneIsFlag(row)) return campTuneSet(id, !campTuneValue(id));
  return campTuneSet(id, campTuneValue(id) + dir * row.step * (big ? CAMP_TUNE.bigStep : 1));
}
const campTuneReset = id => { const row = campTuneRow(id); return row ? campTuneSet(id, campTuneDefault(id)) : null; };
function campTuneResetAll() { Object.keys(CAMP_TUNE.state.over).forEach(id => campTuneReset(id)); return campTuneCount(); }
function campTuneApply() { Object.keys(CAMP_TUNE.state.over).forEach(id => { const row = campTuneRow(id); if (row) campTunePut(row, CAMP_TUNE.state.over[id]); }); }
function campTuneRestore() { campTuneSnap(); CAMP_TUNE.rows.forEach(row => campTunePut(row, campTuneDefault(row.id))); } // every row back to the table's own (the overrides are kept: campTuneApply puts them in again)

// how a value reads on the panel: the number in the row's step, with its unit; a switch is ON or OFF
function campTuneFmt(row, v) {
  if (campTuneIsFlag(row)) return uiText(v ? 'camp.ui.tune.on' : 'camp.ui.tune.off');
  const n = (+v).toFixed(campTuneDec(row));
  return row.unit ? n + ' ' + row.unit : n;
}
const campTuneLabel = row => uiText('camp.ui.tune.row.' + row.id);
const campTuneWhen = row => uiText('camp.ui.tune.when.' + (row.when || 'now'));

// ----- the browser's storage -----
// A browser a program drives (a boot script, a screenshot tool: navigator.webdriver) has no overrides and keeps none. Node has no localStorage here at all unless a test gives one.
function campTuneBlocked() { try { return typeof navigator === 'object' && !!navigator && navigator.webdriver === true; } catch (e) { return true; } }
function campTuneSave() {
  try {
    if (campTuneBlocked() || typeof localStorage === 'undefined') return false;
    if (!campTuneCount()) localStorage.removeItem(CAMP_TUNE.store); else localStorage.setItem(CAMP_TUNE.store, JSON.stringify({ v: CAMP_TUNE.ver, over: CAMP_TUNE.state.over }));
    return true;
  } catch (e) { return false; }
}
function campTuneLoad() { // read the saved overrides and put them in; an id this build does not know is dropped, a value is clamped to its row
  let n = 0;
  try {
    if (campTuneBlocked() || typeof localStorage === 'undefined') return 0;
    const raw = localStorage.getItem(CAMP_TUNE.store); if (!raw) return 0;
    const j = JSON.parse(raw), over = j && j.v === CAMP_TUNE.ver && j.over && typeof j.over === 'object' ? j.over : {};
    campTuneSnap();
    Object.keys(over).forEach(id => { const row = campTuneRow(id); if (!row || !campTuneSnap()[id]) return; const val = campTuneClamp(row, over[id]); if (!campTuneSame(row, val, campTuneDefault(id))) { CAMP_TUNE.state.over[id] = val; campTunePut(row, val); n++; } });
  } catch (e) { return 0; }
  return n;
}
function campTuneLoadOnce() { if (!CAMP_TUNE.state.loaded) { CAMP_TUNE.state.loaded = true; campTuneLoad(); } return campTuneCount(); }

// ----- Copy my settings -----
// One line a changed row: "<id> = <value>   # <words>, default <default>". Only the changed rows; nothing changed is an empty block (the panel says so). The id and the value are what the tool reads.
const CAMP_TUNE_HEAD = 'LONG HAUL TUNING v1';
function campTuneText() {
  const rows = CAMP_TUNE.rows.filter(r => campTuneChanged(r.id));
  if (!rows.length) return '';
  const val = (row, v) => campTuneIsFlag(row) ? (v ? 'on' : 'off') : String(campTuneRound(row, v));
  return [CAMP_TUNE_HEAD].concat(rows.map(r => r.id + ' = ' + val(r, campTuneValue(r.id)) + '   # ' + campTuneLabel(r) + ', default ' + val(r, campTuneDefault(r.id)))).join('\n') + '\n';
}
function campTuneParse(text) { // the block back: { rows: [{ id, value }], bad: [the lines that were not understood] }; the head, blank lines and # comments are skipped
  const out = { rows: [], bad: [] };
  String(text || '').split(/\r?\n/).forEach(line => {
    const t = line.replace(/#.*$/, '').trim(); if (!t || t === CAMP_TUNE_HEAD) return;
    const m = /^([a-z][a-z0-9]*)\s*=\s*(on|off|true|false|-?\d+(?:\.\d+)?)$/i.exec(t); const row = m && campTuneRow(m[1]);
    if (!row) { out.bad.push(line.trim()); return; }
    const w = m[2].toLowerCase(), flag = w === 'on' || w === 'true';
    if (campTuneIsFlag(row) !== (flag || w === 'off' || w === 'false')) { out.bad.push(line.trim()); return; }
    out.rows.push({ id: row.id, value: campTuneIsFlag(row) ? flag : Number(w) });
  });
  return out;
}

// the debrief's score: a mission flown with any override on is a zero-score run for the save (the level still moves on; the best scores and the rank, which are sums of them, do not). The words say so.
const campTuneKeepScore = tuned => !tuned;

// ---------- the panel's model (pure: the drawing is src/camptunedraw.js) ----------
// The list: two action rows (Copy my settings, Reset everything), then each group's heading and rows. A heading is never the highlight. P: { cur, top, msg }.
//   campTuneItems()                 the list, in order: { kind: 'copy' | 'reset' | 'head' | 'row', group?, row? }
//   campTunePanelNew()              a fresh panel model (the highlight on the first row)
//   campTunePanelKey(P, code, shift)  a key in the open panel -> { used: true, close, changed, action: '' | 'copy' | 'reset', text, say } (every key is the panel's while it is open; the battle waits)
const CAMP_TUNE_VIEW = { show: 15 };        // how many lines of the list are on the screen at once; a longer list scrolls with the highlight
function campTuneItems() {
  const it = [{ kind: 'copy' }, { kind: 'reset' }];
  CAMP_TUNE.groups.forEach(g => { const rows = campTuneRows(g); if (!rows.length) return; it.push({ kind: 'head', group: g }); rows.forEach(r => it.push({ kind: 'row', row: r })); });
  return it;
}
const campTunePanelNew = () => ({ cur: 0, top: 0, msg: '' });
function campTuneKeepSeen(P, items) { // the highlight stays on the screen: the window starts at or above it (and a row's heading comes into view with it)
  const show = CAMP_TUNE_VIEW.show;
  let want = P.cur; if (items[want - 1] && items[want - 1].kind === 'head') want--;
  if (want < P.top) P.top = want;
  if (P.cur >= P.top + show) P.top = P.cur - show + 1;
  P.top = Math.max(0, Math.min(P.top, Math.max(0, items.length - show)));
}
function campTunePanelKey(P, code, shift) {
  const items = campTuneItems(), res = { used: true, close: false, changed: false, action: '', text: '', say: '' };
  if (P.cur >= items.length || items[P.cur].kind === 'head') P.cur = items.findIndex(x => x.kind !== 'head');
  const cur = items[P.cur];
  const move = d => { let i = P.cur; do { i = (i + d + items.length) % items.length; } while (items[i].kind === 'head'); P.cur = i; P.msg = ''; };
  if (campKeyIs('tune', code) || code === 'Escape') res.close = true;
  else if (code === 'ArrowUp') move(-1);
  else if (code === 'ArrowDown') move(1);
  else if (code === 'ArrowLeft' || code === 'ArrowRight') { if (cur.kind === 'row') { campTuneStep(cur.row.id, code === 'ArrowRight' ? 1 : -1, !!shift); res.changed = true; P.msg = ''; } }
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    if (cur.kind === 'copy') { res.action = 'copy'; res.text = campTuneText(); P.msg = res.text ? 'copied' : 'nothing'; }
    else if (cur.kind === 'reset') { const n = campTuneCount(); campTuneResetAll(); res.action = 'reset'; res.changed = n > 0; P.msg = n ? 'reset' : 'nothing'; }
    else if (cur.kind === 'row' && campTuneIsFlag(cur.row)) { campTuneStep(cur.row.id, 1, false); res.changed = true; P.msg = ''; }
  } else if (code === 'Backspace' || code === 'Delete') { if (cur.kind === 'row' && campTuneChanged(cur.row.id)) { campTuneReset(cur.row.id); res.changed = true; P.msg = ''; } }
  campTuneKeepSeen(P, items);
  return res;
}

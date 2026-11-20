// ---------- Campaign: the keyboard panels, the logic (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// Key Q opens the FLEET panel (launch, attack, escort, guard, recall) at the left, key E the SHIP panel (mine, recharge, build a fighter, build an escort, fly to the objective) at the right (it was 1 and 2 until card
// space-game-campaign-panels-ui: Troy); Q again closes the left one, E again the right, and Q with the right one open switches. A row's digit (1 to 5) does it and the panel closes; a digit with no panel open does nothing.
// The digits are not orders any more. The panels, their rows and their words are CAMP_PANELS (src/data_controls.js): this file only reads it. It is plain data and functions, no Phaser
// (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws the panels and src/campaignscene.js gives it the keys and the clicks.
//   campPanelDigit(code)             the digit of a key code ('Digit3' -> 3, 'Numpad3' -> 3), else null
//   campPanelNew()                   the state the scene keeps: { open: '' or a panel id, at: the clock when it opened, flash: the last pick, closed: the last panel to close } (the last two are for the drawing: the tabs, src/campanelsdraw.js)
//   campPanelKey(P, C, code, now)    one key: { used, opened, closed, ran, ok, say, row }. Q or E opens, closes or switches a panel; with one open a digit picks its row (and closes it); Esc closes it; any other key closes it and goes on being itself
//   campPanelShown(P, now)           is the panel to be drawn? CAMP_PANELS.delay ms after it opened: none now (the list drops in over anim.fadeIn; a pick before that pulses the tab and does not flash a row)
//   campPanelRows(C, id)             the rows of a panel with their live state: [{ n, id, label, tag, ok, state, short }] (state: what it will do, or why it cannot, in a few words; short: the same in one or two, for the one-line rows)
//   campPanelToggle(P, id, now)      a click on a tab: opens the panel at once (the other one, if open, closes: they cross-fade), or closes it
//   campPanelPick(P, id, rowId, now) a pick made by a click: the panel closes and the row is to flash (campPanelKey does this for a key)
//   campPanelView(P, id, now)        what the drawing shows of a panel at this moment (card space-game-campaign-panels-ui): { open, list: 0 to 1 how far the list is shown under its tab, flash: { row, lit } or null, pulse: 0 to 1 the tab's pulse }, from the timings in CAMP_PANELS.anim
//   campPanelHead(C, id)             the line under the heading: the bay and the ships out, or the ore and the shield
//   campPanelRun(C, row, how)        do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), or the autopilot to the objective -> { ok, say }
//   campPanelKeyLine()               'Q Fleet   E Ship': the panels in the key line, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys with the panels in it)
const campPanelDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0, flash: null, closed: null }); // flash: { id, row, at, shown } the last pick (shown: the list had dropped in); closed: { id, at, from } the last panel to close and how far its list was shown: the drawing fades them
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => CAMP_PANELS.panels.map(p => p.key + ' ' + campPanelCase(p.title)).join('   ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });

function campPanelKey(P, C, code, now) {
  const d = campPanelDigit(code), res = { used: false, opened: '', closed: false, ran: false, ok: false, say: '', row: '' };
  const close = () => { P.closed = { id: P.open, at: now, from: campPanelView(P, P.open, now).list }; P.open = ''; }; // from: how far the list was shown, for it to fade from
  const pk = CAMP_PANELS.panels.find(p => p.code === code);
  if (pk) { // Q or E: that panel opens; its key again closes it; the other panel's key switches (the two lists cross-fade)
    res.used = true;
    if (P.open === pk.id) { close(); res.closed = true; return res; }
    if (P.open) close();
    P.open = pk.id; P.at = now; P.flash = null; res.opened = pk.id; return res;
  }
  if (code === 'Escape' && P.open) { close(); res.used = true; res.closed = true; return res; }
  if (d == null) { if (P.open) { close(); res.closed = true; } return res; } // another key closes the panel and is itself (W flies, Tab opens the map)
  res.used = true; // a digit is the panels' in the Campaign: none of them is an order on its own, and with no panel open it does nothing
  if (P.open) {
    const def = campPanelDef(P.open), row = def && def.rows.find(r => r.n === d);
    if (!row) return res; // not a row of this panel (0, 6 to 9): nothing happens and the panel stays
    const r = campPanelRun(C, row, 'key'); campPanelPick(P, def.id, row.id, now); res.closed = true; res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; return res;
  }
  return res;
}
const campPanelShown = (P, now) => !!P.open && now - P.at >= CAMP_PANELS.delay;
// a pick: the panel closes; the row it was is to flash if the list had dropped in (shown), else (a fast typist: Q then 3 inside the list's 120 ms) the tab pulses and the list goes from where it was
function campPanelPick(P, id, rowId, now) {
  const v = campPanelView(P, id, now), shown = v.list >= 1;
  P.flash = { id, row: rowId, at: now, shown }; P.closed = shown ? null : { id, at: now, from: v.list }; P.open = '';
}
// a click on a tab: it opens its panel, with the other panel's list going away as this one comes in; or, when it is the one open, closes it (what Q and E do)
function campPanelToggle(P, id, now) {
  const close = () => { P.closed = { id: P.open, at: now, from: campPanelView(P, P.open, now).list }; };
  if (P.open === id) { close(); P.open = ''; return 'closed'; }
  if (P.open) close();
  P.open = id; P.at = now; P.flash = null; return 'opened';
}
// what the drawing shows of a panel at this moment. list: how far its rows are shown under the tab (0 to 1: they drop in over anim.fadeIn after the panel is drawn, stay while it is open or its pick flashes, and go over anim.fadeOut);
// flash: the row just picked and how lit it is (two pulses in anim.flash ms); pulse: the tab's one pulse when the pick came before the list had dropped in. The tab is lit as far as the list is shown.
function campPanelView(P, id, now) {
  const A = CAMP_PANELS.anim, v = { open: false, list: 0, flash: null, pulse: 0 }, clamp = x => Math.max(0, Math.min(1, x)), F = P.flash, Z = P.closed;
  if (P.open === id && campPanelShown(P, now)) { v.open = true; v.list = clamp((now - P.at - CAMP_PANELS.delay) / A.fadeIn); }
  else if (F && F.id === id && F.shown && now >= F.at) { const t = now - F.at; v.list = t < A.flash ? 1 : clamp(1 - (t - A.flash) / A.fadeOut); if (t < A.flash) v.flash = { row: F.row, lit: 0.5 - 0.5 * Math.cos(4 * Math.PI * t / A.flash) }; }
  else if (Z && Z.id === id && now >= Z.at) v.list = clamp(Z.from * (1 - (now - Z.at) / A.fadeOut));
  if (F && F.id === id && !F.shown && now >= F.at && now - F.at < A.pulse) v.pulse = Math.sin(Math.PI * (now - F.at) / A.pulse);
  return v;
}

// do a row: the order with the row's words, so the keys, the strip and the voice are one set of rules; fly: the autopilot to the objective
function campPanelRun(C, row, how) {
  if (!C || !row) return { ok: false, say: '' };
  if (row.fly === 'objective') { const r = campNavCheck(C, 'the objective'); if (r.ok) campNavDo(C, r); return r; }
  return campOrder(C, row.order, row.arg || '', how || 'key');
}

// ---- the live state of a row ----
function campPanelWhy(r) {
  const W = CAMP_PANELS.why; let t = W[r.code] || W.what;
  if (r.code === 'noore2') { const m = /(\d+) needed/.exec(r.say || ''); t = t.replace('{need}', m ? m[1] : '?'); }
  return t;
}
// what the carrier's recharge would do: Earth's shield when it is near and not full, else the carrier's own; and what it costs
function campPanelRecharge(C) {
  const R = CAMP.recharge, near = !!C.earth && campDist(C.carrier, C.earth) <= R.earthReach;
  if (near && C.earth.shield < C.earth.max * 0.9) return { what: 'Earth', cost: R.earth };
  return { what: 'carrier', cost: Math.max(5, Math.ceil(R.carrier * (CAMP.carrier.shield - C.shield) / CAMP.carrier.shield)) };
}
function campPanelState(C, row) {
  const B = CAMP.build;
  switch (row.id) {
    case 'launch': return C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts';
    case 'attack': return campWing(C, 'fighter').length + ' fighters out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) + ' convoy' : 'stay by the carrier'; } // a level with no convoy (the belt): the escorts stay close
    case 'guard': case 'recall': return campWing(C).length + ' ships out';
    case 'mine': return campMiners(C).length + ' ships, ' + C.rocks.filter(r => r.hp > 0).length + ' rocks, ' + C.pickups.length + ' ore'; // the whole wing mines (the belt, space-game-campaign-belt): rocks to cut and ore lying about
    case 'recharge': { const r = campPanelRecharge(C); return (r.what === 'Earth' ? 'Earth: ' : 'shield: ') + r.cost + ' ore'; }
    case 'buildf': return B.fighterCost + ' ore, ' + B.fighterTime + ' s';
    case 'builde': return B.escortCost + ' ore, ' + B.escortTime + ' s';
    case 'goal': { const g = campNavGoal(C); return g ? g.name + '  ' + campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
  }
  return '';
}
// the same in a word or two, for a one-line row: what a row will do, and why it cannot (CAMP_PANELS.shortWhy); a row the table adds with no case here has no short state, and the drawing leaves the suffix empty
function campPanelShortWhy(r) {
  const W = CAMP_PANELS.shortWhy; let t = W[r.code] || W.what;
  if (r.code === 'noore2') { const m = /(\d+) needed/.exec(r.say || ''); t = t.replace('{need}', m ? m[1] : '?'); }
  return t;
}
function campPanelShortState(C, row) {
  const B = CAMP.build;
  switch (row.id) {
    case 'launch': return (C.bay.fighters + C.bay.escorts) + ' in bay';
    case 'attack': return campWing(C, 'fighter').length + ' out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) : 'stay close'; }
    case 'guard': case 'recall': return campWing(C).length + ' out';
    case 'mine': return campMiners(C).length + ' ships';
    case 'recharge': return campPanelRecharge(C).cost + ' ore';
    case 'buildf': return B.fighterCost + ' ore';
    case 'builde': return B.escortCost + ' ore';
    case 'goal': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
  }
  return '';
}
function campPanelRowState(C, row) {
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return { ok: false, state: CAMP_PANELS.why.nogoal, short: CAMP_PANELS.shortWhy.nogoal };
    return campNavCheck(C, 'the objective').ok ? { ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) } : { ok: false, state: CAMP_PANELS.why.there, short: CAMP_PANELS.shortWhy.there };
  }
  const r = campCheck(C, row.order, row.arg || '');
  return r.ok ? { ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) } : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) };
}
function campPanelRows(C, id) {
  const def = campPanelDef(id); if (!def || !C) return [];
  return def.rows.map(row => Object.assign({ n: row.n, id: row.id, label: row.label, tag: row.tag || row.label }, campPanelRowState(C, row)));
}
function campPanelHead(C, id) {
  if (id === 'fleet') return 'bay ' + C.bay.fighters + '+' + C.bay.escorts + '   out ' + campWing(C).length;
  if (id === 'ship') return 'ore ' + Math.floor(C.ore) + '   shield ' + Math.round(C.shield);
  return '';
}

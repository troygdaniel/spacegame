// ---------- Campaign: the keyboard panels, the logic (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// Key Q opens the FLEET panel (launch, attack, escort, guard, recall) at the left, key E the SHIP panel (mine, build a fighter, build an escort, fly to the objective, dock) at the right (it was 1 and 2 until card
// space-game-campaign-panels-ui: Troy); Q again closes the left one, E again the right, and Q with the right one open switches. A row's digit (1 to 5) does it and the panel closes; a digit with no panel open does nothing.
// The digits are not orders any more. The panels, their rows and their words are CAMP_PANELS (src/data_controls.js): this file only reads it. It is plain data and functions, no Phaser
// (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws the panels and src/campaignscene.js gives it the keys and the clicks.
//   campPanelDigit(code)             the digit of a key code ('Digit3' -> 3, 'Numpad3' -> 3), else null
//   campPanelNew()                   the state the scene keeps: { open: '' or a panel id, at: the clock when it opened, flash: the last pick, closed: the last panel to close } (the last two are for the drawing: the tabs, src/campanelsdraw.js)
//   campPanelKey(P, C, code, now, shift)    one key (shift: Shift+5 on the SHIP panel flies to the objective FAST, which needs the wing aboard: src/campnav.js campNavFly): { used, opened, closed, ran, ok, say, row }. Q or E opens, closes or switches a panel; with one open a digit picks its row (and closes it); Esc closes it; any other key closes it and goes on being itself
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
const campPanelNew = () => ({ open: '', at: 0, flash: null, closed: null, page: 0 }); // flash: { id, row, at, shown } the last pick (shown: the list had dropped in); closed: { id, at, from } the last panel to close and how far its list was shown: the drawing fades them
const campPanelPages = id => { const d = campPanelDef(id); return d && d.page2 && CAMP_PANELS.pages > 1 ? 2 : 1; };
const campPanelPageRows = (def, page) => page === 1 && def.page2 ? def.page2.rows : def.rows;
// the page a panel is drawn on: the open one's, or while it fades after a pick or a close the page it was picked on (the list does not change words as it goes)
const campPanelPageOf = (P, id) => campPanelPages(id) < 2 ? 0 : P.open === id ? P.page | 0 : P.flash && P.flash.id === id ? P.flash.page | 0 : P.closed && P.closed.id === id ? P.closed.page | 0 : 0;
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => CAMP_PANELS.panels.map(p => p.key + ' ' + campPanelCase(p.title)).join('   ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });

function campPanelKey(P, C, code, now, shift) {
  const d = campPanelDigit(code), res = { used: false, opened: '', closed: false, ran: false, ok: false, say: '', row: '' };
  const close = () => { P.closed = { id: P.open, at: now, from: campPanelView(P, P.open, now).list, page: P.page | 0 }; P.open = ''; }; // from: how far the list was shown, for it to fade from
  const pk = CAMP_PANELS.panels.find(p => p.code === code);
  if (pk) { // Q or E: that panel opens; its key again closes it; the other panel's key switches (the two lists cross-fade)
    res.used = true;
    if (P.open === pk.id) { close(); res.closed = true; return res; }
    if (P.open) close();
    P.open = pk.id; P.at = now; P.flash = null; P.page = 0; res.opened = pk.id; return res; // a panel opens on its first page every time: the page is not remembered
  }
  if (P.open && (code === 'ArrowLeft' || code === 'ArrowRight')) { // the arrows flip the pages of a panel that has more than one (FLEET: the orders, the stances); with one page they are an ordinary key
    const pg = campPanelPages(P.open); if (pg > 1) { P.page = ((P.page | 0) + (code === 'ArrowRight' ? 1 : pg - 1)) % pg; res.used = true; res.page = P.page; return res; }
  }
  if (code === 'Escape' && P.open) { close(); res.used = true; res.closed = true; return res; }
  if (d == null) { if (P.open) { close(); res.closed = true; } return res; } // another key closes the panel and is itself (W flies, Tab opens the map)
  res.used = true; // a digit is the panels' in the Campaign: none of them is an order on its own, and with no panel open it does nothing
  if (P.open) {
    const def = campPanelDef(P.open), row = def && campPanelPageRows(def, campPanelPages(P.open) > 1 ? P.page | 0 : 0).find(r => r.n === d);
    if (!row) return res; // not a row of this panel (0, 6 to 9): nothing happens and the panel stays
    const r = campPanelRun(C, row, 'key', shift); campPanelPick(P, def.id, row.id, now); res.closed = true; res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; return res;
  }
  return res;
}
const campPanelShown = (P, now) => !!P.open && now - P.at >= CAMP_PANELS.delay;
// a pick: the panel closes; the row it was is to flash if the list had dropped in (shown), else (a fast typist: Q then 3 inside the list's 120 ms) the tab pulses and the list goes from where it was
function campPanelPick(P, id, rowId, now) {
  const v = campPanelView(P, id, now), shown = v.list >= 1;
  P.flash = { id, row: rowId, at: now, shown, page: P.page | 0 }; P.closed = shown ? null : { id, at: now, from: v.list, page: P.page | 0 }; P.open = '';
}
// a click on a tab: it opens its panel, with the other panel's list going away as this one comes in; or, when it is the one open, closes it (what Q and E do)
function campPanelToggle(P, id, now) {
  const close = () => { P.closed = { id: P.open, at: now, from: campPanelView(P, P.open, now).list, page: P.page | 0 }; };
  if (P.open === id) { close(); P.open = ''; return 'closed'; }
  if (P.open) close();
  P.open = id; P.at = now; P.flash = null; P.page = 0; return 'opened';
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
// a level that lists no outpost has nowhere to dock: its SHIP panel's sixth row mends the hull aboard instead (card space-game-night-quit-at-pick, finding F of docs/night/hunt-l2-l3.md; the rule is src/campoutpost.js campAboard)
const campPanelAs = (C, row) => row && row.id === 'dock' && C && typeof campAboard === 'function' && campAboard(C) ? Object.assign({}, row, { order: 'repair', arg: '', label: 'Repair the hull', tag: 'Repair', help: 'Mend the hull aboard (costs ore)' }) : row;
function campPanelRun(C, row, how, fast) {
  if (!C || !row) return { ok: false, say: '' };
  row = campPanelAs(C, row);
  if (row.fly === 'objective') { const r = campNavCheck(C, (fast && row.fast ? 'fast ' : '') + 'the objective'); if (r.ok) campNavDo(C, r, how); return r; } // Shift: a burn (a row that has `fast` in the table)
  return campOrder(C, row.order, row.arg || '', how || 'key');
}

// ---- the live state of a row ----
function campPanelWhy(r) {
  const W = CAMP_PANELS.why; let t = W[r.code] || W.what;
  if (r.code === 'noore2') { const m = /(\d+) needed/.exec(r.say || ''); t = t.replace('{need}', m ? m[1] : '?'); }
  if (r.code === 'cooling') { const m = /in (\d+) seconds/.exec(r.say || ''); t = t.replace('{s}', m ? m[1] : '?'); }
  return t;
}
function campPanelState(C, row) {
  const B = CAMP.build;
  switch (row.id) {
    case 'launch': return C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts';
    case 'attack': return campWing(C, 'fighter').length + ' fighters out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) + ' convoy' : 'stay by the carrier'; } // a level with no convoy (the belt): the escorts stay close
    case 'guard': case 'recall': return campWing(C).length + ' ships out';
    case 'mine': return campMiners(C).length + ' ships, ' + C.rocks.filter(r => r.hp > 0).length + ' rocks, ' + C.pickups.length + ' ore'; // the whole wing mines (the belt, space-game-campaign-belt): rocks to cut and ore lying about
    case 'buildf': return B.fighterCost + ' ore, ' + B.fighterTime + ' s';
    case 'builde': return B.escortCost + ' ore, ' + B.escortTime + ' s';
    case 'free': case 'orbit': case 'keep': case 'match': case 'hold': return C.stance === row.id ? 'in force' : ''; // the wing's stance: the one in force is marked
    case 'weapons': case 'shields': case 'engines': { const i = { weapons: 0, shields: 1, engines: 2 }[row.id], fx = campPowerFx(C); return C.power.p[i] + ' pips: ' + (i === 0 ? 'turrets x' + (1 / fx.delay).toFixed(2) : i === 1 ? 'shield ' + Math.round(campShieldMax(C)) + (fx.regen > 0 ? ', mends ' + fx.regen + '/s' : ', no mend') : 'speed x' + fx.speed.toFixed(2)); }
    case 'balance': return 'now ' + C.power.p.join(' / ');
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s of shields, then back';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') { const q = campMendQuote(C); return Math.round(q.missing) + ' hull for ' + q.cost + ' ore'; } const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range (aboard: the mend)
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
    case 'buildf': return B.fighterCost + ' ore';
    case 'builde': return B.escortCost + ' ore';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') return campMendQuote(C).cost + ' ore'; const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; } // the outpost in range, by name (the row had no word of its own when it could be done: wrap-up, 8-GEN)
    case 'goal': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
  }
  return '';
}
function campPanelRowState(C, row) {
  row = campPanelAs(C, row);
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return { ok: false, state: CAMP_PANELS.why.nogoal, short: CAMP_PANELS.shortWhy.nogoal };
    return campNavCheck(C, 'the objective').ok ? { ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) } : { ok: false, state: CAMP_PANELS.why.there, short: CAMP_PANELS.shortWhy.there };
  }
  const r = campCheck(C, row.order, row.arg || '');
  return r.ok ? { ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) } : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) };
}
function campPanelRows(C, id, page) {
  const def = campPanelDef(id); if (!def || !C) return [];
  return campPanelPageRows(def, page | 0).map(row => { const as = campPanelAs(C, row); return Object.assign({ n: as.n, id: as.id, label: as.label, tag: as.tag || as.label, marked: as.order === 'stance' && C.stance === as.id }, campPanelRowState(C, row)); });
}
const campPanelTab = (C, id) => { const d = campPanelDef(id); if (!d) return ''; const st = id === 'fleet' && C && C.stance ? d.page2.rows.find(r => r.id === C.stance) : null; return d.title + (st ? ' - ' + st.label.toUpperCase() : ''); };
function campPanelHead(C, id, page) {
  if (id === 'fleet' && page === 1) return 'stance ' + (CAMP_PANELS.panels[0].page2.rows.find(r => r.id === C.stance) || { label: 'Free' }).label.toLowerCase();
  if (id === 'fleet') return 'bay ' + C.bay.fighters + '+' + C.bay.escorts + '   out ' + campWing(C).length;
  if (id === 'ship') return 'ore ' + Math.floor(C.ore) + '   shield ' + Math.round(C.shield);
  if (id === 'systems') return 'W ' + C.power.p[0] + '  S ' + C.power.p[1] + '  E ' + C.power.p[2] + (C.t < C.power.until ? '   emergency ' + Math.ceil((C.power.until - C.t) / 1000) + ' s' : '');
  return '';
}

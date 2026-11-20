// ---------- Campaign: the keyboard panels, the logic (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// Key 1 opens the FLEET panel (launch, attack, escort, guard, recall) at the left, key 2 the SHIP panel (mine, recharge, build a fighter, build an escort, fly to the objective) at the right; a row's digit does it
// and the panel closes. The digits 1 to 9 are not orders any more. The panels, their rows and their words are CAMP_PANELS (src/data_controls.js): this file only reads it. It is plain data and functions, no Phaser
// (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws the panels and src/campaignscene.js gives it the keys and the clicks.
//   campPanelDigit(code)             the digit of a key code ('Digit3' -> 3, 'Numpad3' -> 3), else null
//   campPanelNew()                   the state the scene keeps: { open: '' or a panel id, at: the clock when it opened }
//   campPanelKey(P, C, code, now, shift)    one key (shift: Shift+5 on the SHIP panel flies to the objective FAST, which needs the wing aboard: src/campnav.js campNavFly): { used, opened, closed, ran, ok, say, row }. A digit opens a panel, or with one open picks its row (and closes it); Esc closes it; any other key closes it and goes on being itself
//   campPanelShown(P, now)           is the panel to be drawn? only CAMP_PANELS.delay ms after it opened, so 1 then 3 typed quickly never flashes it
//   campPanelRows(C, id, page)       the rows of a panel (its page 0, or 1: the FLEET panel's stances) with their live state: [{ n, id, label, ok, state, marked }] (state: what it will do, or why it cannot, in a few words; marked: the stance in force)
//   campPanelPages(id)               how many pages the panel shows: 2 for FLEET once CAMP_PANELS.pages says so (the arrows flip them while it is open), else 1
//   campPanelTab(C, id)              the collapsed panel's text: 'FLEET - ORBIT' (the panel's name and, for FLEET, the wing's stance)
//   campPanelHead(C, id)             the line under the heading: the bay and the ships out, or the ore and the shield
//   campPanelRun(C, row, how)        do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), or the autopilot to the objective -> { ok, say }
//   campPanelKeyLine()               '1 Fleet   2 Ship': the panels in the key line, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys with the panels in it)
const campPanelDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0, page: 0 });
const campPanelPages = id => { const d = campPanelDef(id); return d && d.page2 && CAMP_PANELS.pages > 1 ? 2 : 1; };
const campPanelPageRows = (def, page) => page === 1 && def.page2 ? def.page2.rows : def.rows;
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => CAMP_PANELS.panels.map(p => p.key + ' ' + campPanelCase(p.title)).join('   ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });

function campPanelKey(P, C, code, now, shift) {
  const d = campPanelDigit(code), res = { used: false, opened: '', closed: false, ran: false, ok: false, say: '', row: '' };
  if (code === 'Escape' && P.open) { P.open = ''; res.used = true; res.closed = true; return res; }
  if (P.open && (code === 'ArrowLeft' || code === 'ArrowRight')) { // the arrows flip the pages of a panel that has more than one (FLEET: the orders, the stances); with one page they are an ordinary key
    const pg = campPanelPages(P.open); if (pg > 1) { P.page = ((P.page | 0) + (code === 'ArrowRight' ? 1 : pg - 1)) % pg; res.used = true; res.page = P.page; return res; }
  }
  if (d == null) { if (P.open) { P.open = ''; res.closed = true; } return res; } // another key closes the panel and is itself (W flies, Tab opens the map)
  res.used = true; // a digit is the panels' in the Campaign: none of them is an order on its own any more
  if (P.open) {
    const def = campPanelDef(P.open), row = def && campPanelPageRows(def, campPanelPages(P.open) > 1 ? P.page | 0 : 0).find(r => r.n === d);
    if (!row) return res; // not a row of this panel (0, 6 to 9): nothing happens and the panel stays
    const r = campPanelRun(C, row, 'key', shift); P.open = ''; res.closed = true; res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; return res;
  }
  const def = CAMP_PANELS.panels.find(p => p.key === String(d));
  if (def) { P.open = def.id; P.at = now; P.page = 0; res.opened = def.id; } // key 3 has no panel yet (reserved), and nor has a digit from 4 to 9: nothing
  return res;
}
const campPanelShown = (P, now) => !!P.open && now - P.at >= CAMP_PANELS.delay;

// do a row: the order with the row's words, so the keys, the strip and the voice are one set of rules; fly: the autopilot to the objective
function campPanelRun(C, row, how, fast) {
  if (!C || !row) return { ok: false, say: '' };
  if (row.fly === 'objective') { const r = campNavCheck(C, (fast && row.fast ? 'fast ' : '') + 'the objective'); if (r.ok) campNavDo(C, r, how); return r; } // Shift: a burn (a row that has `fast` in the table)
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
    case 'free': case 'orbit': case 'keep': case 'match': case 'hold': return C.stance === row.id ? 'in force' : ''; // the wing's stance: the one in force is marked
    case 'dock': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range
    case 'goal': { const g = campNavGoal(C); return g ? g.name + '  ' + campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
  }
  return '';
}
function campPanelRowState(C, row) {
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return { ok: false, state: CAMP_PANELS.why.nogoal };
    return campNavCheck(C, 'the objective').ok ? { ok: true, state: campPanelState(C, row) } : { ok: false, state: CAMP_PANELS.why.there };
  }
  const r = campCheck(C, row.order, row.arg || '');
  return r.ok ? { ok: true, state: campPanelState(C, row) } : { ok: false, state: campPanelWhy(r) };
}
function campPanelRows(C, id, page) {
  const def = campPanelDef(id); if (!def || !C) return [];
  return campPanelPageRows(def, page | 0).map(row => Object.assign({ n: row.n, id: row.id, label: row.label, marked: row.order === 'stance' && C.stance === row.id }, campPanelRowState(C, row)));
}
const campPanelTab = (C, id) => { const d = campPanelDef(id); if (!d) return ''; const st = id === 'fleet' && C && C.stance ? d.page2.rows.find(r => r.id === C.stance) : null; return d.title + (st ? ' - ' + st.label.toUpperCase() : ''); };
function campPanelHead(C, id, page) {
  if (id === 'fleet' && page === 1) return 'stance ' + (CAMP_PANELS.panels[0].page2.rows.find(r => r.id === C.stance) || { label: 'Free' }).label.toLowerCase();
  if (id === 'fleet') return 'bay ' + C.bay.fighters + '+' + C.bay.escorts + '   out ' + campWing(C).length;
  if (id === 'ship') return 'ore ' + Math.floor(C.ore) + '   shield ' + Math.round(C.shield);
  return '';
}

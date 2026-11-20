// ---------- Campaign: the keyboard panels, the logic (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// Key 1 opens the FLEET panel (launch, attack, escort, guard, recall) at the left, key 2 the SHIP panel (mine, recharge, build a fighter, build an escort, fly to the objective) at the right; a row's digit does it
// and the panel closes. The digits 1 to 9 are not orders any more. The panels, their rows and their words are CAMP_PANELS (src/data_controls.js): this file only reads it. It is plain data and functions, no Phaser
// (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws the panels and src/campaignscene.js gives it the keys and the clicks.
//   campPanelDigit(code)             the digit of a key code ('Digit3' -> 3, 'Numpad3' -> 3), else null
//   campPanelNew()                   the state the scene keeps: { open: '' or a panel id, at: the clock when it opened }
//   campPanelKey(P, C, code, now)    one key: { used, opened, closed, ran, ok, say, row }. A digit opens a panel, or with one open picks its row (and closes it); Esc closes it; any other key closes it and goes on being itself
//   campPanelShown(P, now)           is the panel to be drawn? only CAMP_PANELS.delay ms after it opened, so 1 then 3 typed quickly never flashes it
//   campPanelRows(C, id)             the rows of a panel with their live state: [{ n, id, label, ok, state }] (state: what it will do, or why it cannot, in a few words)
//   campPanelHead(C, id)             the line under the heading: the bay and the ships out, or the ore and the shield
//   campPanelRun(C, row, how)        do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), or the autopilot to the objective -> { ok, say }
//   campPanelKeyLine()               '1 Fleet   2 Ship': the panels in the key line, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys with the panels in it)
const campPanelDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0 });
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => CAMP_PANELS.panels.map(p => p.key + ' ' + campPanelCase(p.title)).join('   ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });

function campPanelKey(P, C, code, now) {
  const d = campPanelDigit(code), res = { used: false, opened: '', closed: false, ran: false, ok: false, say: '', row: '' };
  if (code === 'Escape' && P.open) { P.open = ''; res.used = true; res.closed = true; return res; }
  if (d == null) {
    const lp = !P.open && code ? CAMP_PANELS.panels.find(p => p.code === code) : null; // a panel with a letter key of its own (SYSTEMS on C): the key opens it
    if (lp) { P.open = lp.id; P.at = now; res.used = true; res.opened = lp.id; return res; }
    if (P.open) { P.open = ''; res.closed = true; } return res; // another key closes the panel and is itself (W flies, Tab opens the map)
  }
  res.used = true; // a digit is the panels' in the Campaign: none of them is an order on its own any more
  if (P.open) {
    const def = campPanelDef(P.open), row = def && def.rows.find(r => r.n === d);
    if (!row) return res; // not a row of this panel (0, 6 to 9): nothing happens and the panel stays
    const r = campPanelRun(C, row, 'key'); P.open = ''; res.closed = true; res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; return res;
  }
  const def = CAMP_PANELS.panels.find(p => p.key === String(d));
  if (def) { P.open = def.id; P.at = now; res.opened = def.id; } // key 3 has no panel yet (reserved), and nor has a digit from 4 to 9: nothing
  return res;
}
const campPanelShown = (P, now) => !!P.open && now - P.at >= CAMP_PANELS.delay;

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
  if (r.code === 'cooling') { const m = /in (\d+) seconds/.exec(r.say || ''); t = t.replace('{s}', m ? m[1] : '?'); }
  return t;
}
// what the carrier's recharge would do: Earth's shield when it is near and not full, else the carrier's own; and what it costs
function campPanelRecharge(C) {
  const R = CAMP.recharge, near = !!C.earth && campDist(C.carrier, C.earth) <= R.earthReach;
  if (near && C.earth.shield < C.earth.max * 0.9) return { what: 'Earth', cost: R.earth };
  const max = campShieldMax(C); return { what: 'carrier', cost: Math.max(5, Math.ceil(R.carrier * (max - C.shield) / max)) };
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
    case 'weapons': case 'shields': case 'engines': { const i = { weapons: 0, shields: 1, engines: 2 }[row.id], fx = campPowerFx(C); return C.power.p[i] + ' pips: ' + (i === 0 ? 'turrets x' + (1 / fx.delay).toFixed(2) : i === 1 ? 'shield ' + Math.round(campShieldMax(C)) : 'speed x' + fx.speed.toFixed(2)); }
    case 'balance': return 'now ' + C.power.p.join(' / ');
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s of shields, then back';
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
function campPanelRows(C, id) {
  const def = campPanelDef(id); if (!def || !C) return [];
  return def.rows.map(row => Object.assign({ n: row.n, id: row.id, label: row.label }, campPanelRowState(C, row)));
}
function campPanelHead(C, id) {
  if (id === 'fleet') return 'bay ' + C.bay.fighters + '+' + C.bay.escorts + '   out ' + campWing(C).length;
  if (id === 'ship') return 'ore ' + Math.floor(C.ore) + '   shield ' + Math.round(C.shield);
  if (id === 'systems') return 'W ' + C.power.p[0] + '  S ' + C.power.p[1] + '  E ' + C.power.p[2] + (C.t < C.power.until ? '   emergency ' + Math.ceil((C.power.until - C.t) / 1000) + ' s' : '');
  return '';
}

// ---------- Campaign: the two hands' panels, the logic (cards space-game-campaign-keys-help and space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// Two panels are on the screen all the time: FLEET at the left (the left hand: 1 launch or recall, 2 attack the target, 3 escort, 4 guard, W mine, E the next stance, R the next convoy order, Q the next page; A D S X pick and clear the target)
// and SHIP at the right (the right hand: 7 fly to the goal, 8 fly to the target, 9 a fast burn, 0 dock, J K L ; power, U emergency shields, Enter a missile at the target, I the warp blink, P the next page). Every row shows its key and ONE key is ONE
// order: nothing is opened and then picked. On a second page (the stances and the convoy orders of FLEET, BUILD of SHIP) the digits pick that page's rows; the panel goes back to its first page after CAMP_PANELS.back ms or a pick, so a digit is
// never left meaning something else for long. The letter rows (W E R J K L ; U I Enter) work on every page.
// The panels, their rows, their keys and their words are CAMP_PANELS and CAMP_KEYS (src/data_controls.js): this file only reads them. It is plain data and functions, no Phaser (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws
// the panels and src/campaignscene.js gives it the keys and the clicks. The target is src/camptarget.js.
//   campPanelDigit(code)             the digit of a key code ('Digit3' -> 3, 'Numpad3' -> 3), else null
//   campPanelNew()                   the state the scene keeps: { page: { fleet, ship }: the page each panel is on (0 is the first), at: when it was turned to it, lit: { row id: when its key was last pressed } }
//   campPanelKey(P, C, code, now, shift)   one key: { used, ran, ok, say, row, page, tgt, fleet }: a panel's page key turns its page; a row's key does the row (ran: it was an order; ok and say are its answer; Shift with 8 is a fast burn); A D S X pick and clear the target (tgt)
//   campPanelTick(P, now)            a panel left on a later page goes back to its first one after CAMP_PANELS.back ms
//   campPanelRows(C, id, page)       the rows of a panel's page with their live state: [{ n, id, k, label, tag, ok, state, short, marked }] (state: what it will do, or why it cannot, in a few words; short: the same in one or two, for the one-line rows)
//   campPanelRun(C, row, how, shift) do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), the autopilot, the blink -> { ok, say }
//   campPanelTarget(C)               the line of the target for the FLEET panel: { name, km, hp } or null
//   campPanelKeyLine()               'Q Fleet   P Ship': the panels' page keys, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys)
const campPanelDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ page: { fleet: 0, ship: 0 }, at: { fleet: 0, ship: 0 }, lit: {} });
const campPanelPages = id => { const d = campPanelDef(id); return d ? Math.min(Math.max(1, CAMP_PANELS.pages | 0), 1 + (d.page2 ? 1 : 0) + (d.page3 ? 1 : 0)) : 1; }; // the pages of a panel: its rows, its page2 and its page3, as many as CAMP_PANELS.pages allows
const campPanelPageRows = (def, page) => page === 1 && def.page2 ? def.page2.rows : page === 2 && def.page3 ? def.page3.rows : def.rows;
const campPanelPageTitle = (def, page) => page === 1 && def.page2 ? def.page2.title : page === 2 && def.page3 ? def.page3.title : def.title; // what a page is called (on the panel's heading)
const campPanelPageOf = (P, id) => campPanelPages(id) < 2 ? 0 : (P.page && P.page[id]) | 0; // the page a panel is on now
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => CAMP_PANELS.panels.map(p => p.key + ' ' + campPanelCase(p.title)).join('   ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });
const campPanelTick = (P, now) => { CAMP_PANELS.panels.forEach(p => { if ((P.page[p.id] | 0) > 0 && now - (P.at[p.id] | 0) >= CAMP_PANELS.back) P.page[p.id] = 0; }); };
// the row a key is, among the rows live now: those of each panel's page, and the letter rows of its first page whatever page it is on (a digit means what the page says)
function campPanelFind(P, code) {
  for (const def of CAMP_PANELS.panels) {
    const page = campPanelPageOf(P, def.id), live = campPanelPageRows(def, page).concat(page > 0 ? def.rows.filter(r => !/^Digit\d$/.test(r.code)) : []);
    const row = live.find(r => campRowCodes(r).indexOf(code) >= 0); if (row) return { def, row, page };
  }
  return null;
}
function campPanelKey(P, C, code, now, shift) {
  const res = { used: false, ran: false, ok: false, say: '', row: '', page: -1, tgt: '', fleet: false }; // fleet: the key was the left hand's (command time slows the battle a moment: src/campslow.js)
  campPanelTick(P, now);
  const pk = CAMP_PANELS.panels.find(p => p.code === code);
  if (pk) { // Q or P: the next page of that panel (it goes round to the first)
    res.used = true; res.fleet = pk.id === 'fleet'; const n = campPanelPages(pk.id);
    if (n > 1) { P.page[pk.id] = ((P.page[pk.id] | 0) + 1) % n; P.at[pk.id] = now; res.page = P.page[pk.id]; }
    return res;
  }
  const tk = typeof campTgtStep === 'function' ? (campKeyCodes('next').indexOf(code) >= 0 ? 'next' : campKeyCodes('last').indexOf(code) >= 0 ? 'last' : campKeyCodes('near').indexOf(code) >= 0 ? 'near' : campKeyCodes('clear').indexOf(code) >= 0 ? 'clear' : '') : '';
  if (tk) { // A D S X: the one target (src/camptarget.js)
    res.used = true; res.fleet = true; if (!C) return res;
    if (tk === 'clear') campTgtClear(C); else if (tk === 'near') campTgtNearest(C); else campTgtStep(C, tk === 'next' ? 1 : -1);
    res.tgt = C.tgt || ''; return res;
  }
  const hit = campPanelFind(P, code); if (!hit) return res;
  res.used = true; res.fleet = hit.def.id === 'fleet'; res.row = hit.row.id; P.lit[hit.row.id] = now;
  const r = campPanelRun(C, hit.row, 'key', shift);
  res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || '';
  if (hit.page > 0 && campPanelPageRows(hit.def, hit.page).indexOf(hit.row) >= 0) P.page[hit.def.id] = 0; // a pick on a later page: back to the first
  return res;
}

// do a row: the order with the row's words, so the keys, the strip and the voice are one set of rules; fly: the autopilot to the objective or the target; blink: the warp hop; cycle: the next stance or convoy order
// a level that lists no outpost has nowhere to dock: its SHIP panel's dock row mends the hull aboard instead (card space-game-night-quit-at-pick, finding F of docs/night/hunt-l2-l3.md; the rule is src/campoutpost.js campAboard);
// the launch row recalls the wing when no ship waits in the bay and some are out (a toggle)
const campPanelAs = (C, row) => {
  if (!row || !C) return row;
  if (row.id === 'dock' && typeof campAboard === 'function' && campAboard(C)) return Object.assign({}, row, { order: 'repair', arg: '', label: 'Repair the hull', tag: 'Repair', help: 'Mend the hull aboard (costs ore)' });
  if (row.id === 'launch' && !(C.bay.fighters + C.bay.escorts) && !C.launchQ.length && campWing(C).length) return Object.assign({}, row, { order: 'recall', label: 'Recall the wing', tag: 'Recall', help: 'The wing flies home' });
  return row;
};
const campPanelTargetArg = (C, row) => (row.order === 'attack' || row.order === 'missiles') && typeof campTgtNow === 'function' && campTgtNow(C) ? CAMP_TGT : (row.arg || ''); // with a target picked the attack and the missile go at it; none: as they always did
// the next of the stances or the convoy orders (E and R): the row after the one in force on the panel's page, round at the end
function campPanelNext(C, row) {
  const def = campPanelDef('fleet'), list = row.cycle === 'stance' ? def.page2.rows : def.page3.rows;
  const at = list.findIndex(r => row.cycle === 'stance' ? C.stance === r.id : campPanelConvoyMarked(C, r));
  return list[(at + 1) % list.length];
}
function campPanelRun(C, row, how, fast) {
  if (!C || !row) return { ok: false, say: '' };
  row = campPanelAs(C, row);
  if (row.blink) { C.input.blink = true; const bw = typeof campBlinkWhy === 'function' ? campBlinkWhy(C) : ''; return { ok: !bw, say: bw }; } // the warp blink: without the technology, or while it cools, the key says so
  if (row.cycle) { const nx = campPanelNext(C, row); return campOrder(C, nx.order, nx.arg || '', how || 'key'); }
  if (row.fly === 'target') { // the autopilot to the target (Shift: a burn)
    const tr = typeof campTgtRow === 'function' ? campTgtRow(C) : null; if (!tr) return campNo('notarget');
    const t = campNavTarget(C, tr) || tr, d = Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y);
    if (!tr.moving && d - campNavStop(tr.kind, t) <= CAMP.nav.arrive) return { ok: false, say: uiText('camp.nav.there', { name: tr.name }) };
    const r = campNavFly(C, tr, !!(fast && row.fast), how || 'key'); return r.ok ? { ok: true, say: uiText('camp.nav.say', { name: tr.name, km: campNavKm(d) }) } : r;
  }
  if (row.fly === 'objective') { const r = campNavCheck(C, (row.burn ? 'fast ' : '') + 'the objective'); if (r.ok) campNavDo(C, r, how); return r; } // 7 flies, 9 burns (a burn needs the wing aboard)
  return campOrder(C, row.order, campPanelTargetArg(C, row), how || 'key');
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
    case 'launch': return campPanelAs(C, row).order === 'recall' ? campWing(C).length + ' ships out' : C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts';
    case 'attack': { const tg = campPanelTarget(C); return tg ? tg.name + ', ' + tg.km + ' km' : campWing(C, 'fighter').length + ' fighters out'; } // the target, when one is picked
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) + ' convoy' : 'stay by the carrier'; } // a level with no convoy (the belt): the escorts stay close
    case 'guard': case 'recall': return campWing(C).length + ' ships out';
    case 'mine': return campMiners(C).length + ' ships, ' + C.rocks.filter(r => r.hp > 0).length + ' rocks, ' + C.pickups.length + ' ore'; // the whole wing mines (the belt, space-game-campaign-belt): rocks to cut and ore lying about
    case 'buildf': return B.fighterCost + ' ore, ' + B.fighterTime + ' s';
    case 'builde': return B.escortCost + ' ore, ' + B.escortTime + ' s';
    case 'free': case 'orbit': case 'keep': case 'match': case 'hold': return C.stance === row.id ? 'in force' : ''; // the wing's stance: the one in force is marked
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length); // the convoy orders: the one in force is marked (src/campconvoy.js)
    case 'weapons': case 'shields': case 'engines': { const i = { weapons: 0, shields: 1, engines: 2 }[row.id], fx = campPowerFx(C); return C.power.p[i] + ' pips: ' + (i === 0 ? 'turrets x' + (1 / fx.delay).toFixed(2) : i === 1 ? 'shield ' + Math.round(campShieldMax(C)) + (fx.regen > 0 ? ', mends ' + fx.regen + '/s' : ', no mend') : 'speed x' + fx.speed.toFixed(2)); }
    case 'balance': return 'now ' + C.power.p.join(' / ');
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s of shields, then back';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') { const q = campMendQuote(C); return Math.round(q.missing) + ' hull for ' + q.cost + ' ore'; } const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range (aboard: the mend)
    case 'goal': case 'burn': { const g = campNavGoal(C); return g ? g.name + '  ' + campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': { const tg = campPanelTarget(C); return tg ? tg.name + '  ' + tg.km + ' km' : ''; }
    case 'stance': return campPanelStanceName(C);
    case 'convoy': return campPanelConvoyName(C);
    case 'missile': return C.missiles + ' of ' + C.magazine + ' left';
    case 'blink': return campPanelBlinkWord(C);
  }
  return '';
}
// the same in a word or two, for a one-line row: what a row will do, and why it cannot (CAMP_PANELS.shortWhy); a row the table adds with no case here has no short state, and the drawing leaves the suffix empty
function campPanelShortWhy(r) {
  const W = CAMP_PANELS.shortWhy; let t = W[r.code] || W.what;
  if (r.code === 'noore2') { const m = /(\d+) needed/.exec(r.say || ''); t = t.replace('{need}', m ? m[1] : '?'); }
  if (r.code === 'cooling') { const m = /in (\d+) seconds/.exec(r.say || ''); t = t.replace('{s}', m ? m[1] : '?'); } // the emergency's row said "{s} s": campPanelWhy fills it, this one did not
  return t;
}
function campPanelShortState(C, row) {
  const B = CAMP.build;
  switch (row.id) {
    case 'launch': return campPanelAs(C, row).order === 'recall' ? campWing(C).length + ' out' : (C.bay.fighters + C.bay.escorts) + ' in bay';
    case 'attack': return campWing(C, 'fighter').length + ' out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) : 'stay close'; }
    case 'guard': case 'recall': return campWing(C).length + ' out';
    case 'mine': return campMiners(C).length + ' ships';
    case 'buildf': return B.fighterCost + ' ore';
    case 'builde': return B.escortCost + ' ore';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') return campMendQuote(C).cost + ' ore'; const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; } // the outpost in range, by name (the row had no word of its own when it could be done: wrap-up, 8-GEN)
    case 'goal': case 'burn': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': { const tg = campPanelTarget(C); return tg ? tg.km + ' km' : ''; }
    case 'stance': return campPanelStanceName(C);
    case 'convoy': return campPanelConvoyName(C);
    case 'missile': return C.missiles + ' left';
    case 'blink': return campPanelBlinkWord(C);
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length);
  }
  return '';
}
function campPanelRowState(C, row) {
  row = campPanelAs(C, row);
  const ok = () => ({ ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) }), no = (why, sh) => ({ ok: false, state: CAMP_PANELS.why[why] || CAMP_PANELS.why.what, short: CAMP_PANELS.shortWhy[sh || why] || CAMP_PANELS.shortWhy.what });
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return no('nogoal');
    return campNavCheck(C, (row.burn ? 'fast ' : '') + 'the objective').ok ? ok() : no('there');
  }
  if (row.fly === 'target') {
    const tr = typeof campTgtRow === 'function' ? campTgtRow(C) : null; if (!tr) return no('notarget');
    const t = campNavTarget(C, tr) || tr; return !tr.moving && Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y) - campNavStop(tr.kind, t) <= CAMP.nav.arrive ? no('there') : ok();
  }
  if (row.blink) return campHas(C, 'blink') ? (campBlinkWhy(C) ? no('cooling', 'cooling') : ok()) : no('noblink');
  if (row.cycle) { if (row.cycle === 'stance') return ok(); const nx = campPanelNext(C, row), r = campCheck(C, nx.order, nx.arg || ''); return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; }
  const r = campCheck(C, row.order, campPanelTargetArg(C, row));
  return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) };
}
const campPanelStanceName = C => ((campPanelDef('fleet').page2.rows.find(r => r.id === (C.stance || 'free')) || { label: 'Free' }).label); // the stance in force
const campPanelConvoyName = C => { const l = campPanelDef('fleet').page3.rows.find(r => campPanelConvoyMarked(C, r)); return l ? l.label : campConvoyShips(C).length ? 'mixed' : 'no convoy'; }; // the convoy order in force
const campPanelBlinkWord = C => !campHas(C, 'blink') ? 'no tech' : campBlinkWhy(C) ? Math.ceil((campBlinkCooldown(C) - (C.t - C.blinkAt)) / 1000) + ' s' : 'ready';
const campPanelTarget = C => (typeof campTgtInfo === 'function' ? campTgtInfo(C) : null); // { name, km, hp } of the target, or null
const campPanelShips = n => n + (n === 1 ? ' ship' : ' ships'); // "1 ship", "3 ships"
const campPanelConvoyMarked = (C, row) => row.order === 'convoy' && campConvoyState(C) === campConvoyVerb(String(row.arg || '')); // the convoy order that all the escorted ships are under
function campPanelRows(C, id, page) {
  const def = campPanelDef(id); if (!def || !C) return [];
  return campPanelPageRows(def, page | 0).map(row => { const as = campPanelAs(C, row); return Object.assign({ n: as.n, id: as.id, k: as.k, label: as.label, tag: as.tag || as.label, marked: (as.order === 'stance' && C.stance === as.id) || campPanelConvoyMarked(C, as) }, campPanelRowState(C, row)); });
}
const campPanelTab = (C, id) => { const d = campPanelDef(id); if (!d) return ''; const st = id === 'fleet' && C && C.stance && C.stance !== 'free' ? d.page2.rows.find(r => r.id === C.stance) : null; return d.title + (st ? ' - ' + st.label.toUpperCase() : ''); };
function campPanelHead(C, id, page) {
  if (id === 'fleet') return 'bay ' + C.bay.fighters + '+' + C.bay.escorts + '   out ' + campWing(C).length;
  if (id === 'ship') return 'ore ' + Math.floor(C.ore) + '   shield ' + Math.round(C.shield);
  return '';
}

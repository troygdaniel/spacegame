// ---------- Campaign: the order lists, the logic (cards one-list-keys and list-shortcuts; Troy, 22 and 23 Nov 2026) ----------
// Q opens the FLEET list at the left, P the SHIP list at the right. Each has a row for every part of it, and a part has a key of its own that opens its list directly, at any time: W CONVOY, E FIGHTERS, R ESCORTS on the left;
// O AUTOPILOT, I POWER, U DOCK AND BUILD on the right (STANCE is a part with no key: Enter on its row opens it). Nothing is on the screen until a key is pressed; only one list is open at a time.
// In an open list Up and Down move the highlight (round at the ends), Enter gives the highlighted order (on a part's row: opens that part), Left goes back to the list it is a part of, the list's own key or Esc closes it.
// An order that is taken closes the list (a power row leaves it open: a pip is given again and again); one that is refused leaves it open and says why.
// No key is reused: the direct keys (A D S X the target, J K L ; the power, Enter a missile while no list is open) mean the same whether a list is open or not; only the arrows and Enter are the open list's.
// The lists, their rows and their words are CAMP_PANELS and CAMP_KEYS (src/data_controls.js): this file only reads them. It is plain data and functions, no Phaser (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws
// the open list and src/campaignscene.js gives it the keys and the clicks. The target is src/camptarget.js.
//   campPanelNew()                   the state the scene keeps: { open: '' or a list's id, at: the highlighted row, top: the first row on the screen, lit: { row id: when Enter last gave it } }
//   campPanelKey(P, C, code, now)    one key: { used, ran, ok, say, row, tgt, fleet, open }: a list's key opens it, or closes it when it is the one open; in an open list Up, Down, Left, Enter and Esc are the list's; A D S X pick and clear the target (tgt);
//                                    J K L ; move the power; Enter with no list open fires a missile (ran: it was an order; ok and say are its answer). The scene asks a pilot's call BEFORE this when no list is open
//   campPanelOpen(P)                 the id of the open list, or ''          campPanelClose(P)   close it          campPanelGo(P, C, id, from)   open list `id` (from: the list we came back from: the highlight goes to its row)
//   campPanelList(C, id)             the rows of a list in THIS mission (a row whose `when` can never hold here is left out)
//   campPanelRows(C, id)             the same with their live state: [{ id, label, key, more, ok, state, short, marked }] (key: the key of the part a row opens; more: it opens a part; state: what it will do, or why it cannot; short: the same in a word or two)
//   campPanelView(P, C)              what the open list draws: null, or { id, title, key, side, parent, rows (the ones on the screen), at (the highlight, in rows), first, total, above, below (rows off the screen) }
//   campPanelRun(C, row, how)        do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), an order to one part of the wing, the autopilot, the blink -> { ok, say }
//   campPanelTarget(C)               the line of the target: { name, km, hp } or null
//   campPanelKeyLine()               'Q Fleet  W Convoy  E Fighters  R Escorts   P Ship  O Autopilot  I Power  U Dock': the lists' keys, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys)
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0, top: 0, lit: {} });
const campPanelOpen = P => (P && typeof P.open === 'string' && campPanelDef(P.open) ? P.open : '');
const campPanelClose = P => { if (P && typeof P === 'object') { P.open = ''; P.at = 0; P.top = 0; } };
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => ['left', 'right'].map(side => CAMP_PANELS.panels.filter(p => p.side === side && p.key).map(p => p.key + ' ' + p.tab).join('  ')).join('    ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });
// a row that can never be used in this mission is not in its list: the convoy's part with no convoy to give orders to, the blink without its tech, building where ships are built docked
function campPanelWhen(C, row) {
  if (!row.when || !C) return true;
  if (row.when === 'convoy') return !!((C.L && C.L.convoys && C.L.convoys.length) || (typeof campConvoyShips === 'function' && campConvoyShips(C).length));
  if (row.when === 'blink') return campHas(C, 'blink');
  if (row.when === 'aboard') return typeof campAboard !== 'function' || campAboard(C);
  return true;
}
const campPanelList = (C, id) => { const d = campPanelDef(id); return d ? d.rows.filter(r => campPanelWhen(C, r)) : []; };
// the highlight is kept on the screen: the list scrolls by a row when it passes the first or the last one shown
function campPanelScroll(P, n) {
  const show = Math.max(1, CAMP_PANELS.show | 0);
  P.at = n ? ((P.at % n) + n) % n : 0;
  if (P.at < P.top) P.top = P.at; else if (P.at >= P.top + show) P.top = P.at - show + 1;
  P.top = Math.max(0, Math.min(P.top, Math.max(0, n - show)));
}
// open a list: at its first row, or (from: the part we came back from) on that part's row
function campPanelGo(P, C, id, from) {
  P.open = id; P.at = 0; P.top = 0;
  if (from) { const rows = campPanelList(C, id), i = rows.findIndex(r => r.open === from); if (i >= 0) { P.at = i; campPanelScroll(P, rows.length); } }
}
function campPanelKey(P, C, code, now) {
  const res = { used: false, ran: false, ok: false, say: '', row: '', tgt: '', fleet: false, open: campPanelOpen(P) }; // fleet: an order of the left hand or a pick of the target (a label for the tests and the radio; nothing slows the battle for it: card space-game-no-command-slowdown)
  const pk = code ? CAMP_PANELS.panels.find(p => p.code === code) : null;
  if (pk) { // a list's key (Q W E R, P O I U): open that list at its first row, or close it when it is the one open
    res.used = true;
    if (campPanelOpen(P) === pk.id) campPanelClose(P); else campPanelGo(P, C, pk.id);
    res.open = campPanelOpen(P); return res;
  }
  const open = campPanelOpen(P);
  if (open) { // the open list has the arrows, Enter and Esc
    const rows = campPanelList(C, open), def = campPanelDef(open);
    if (campKeyIs('pause', code)) { campPanelClose(P); res.used = true; res.open = ''; return res; }
    if (campKeyIs('up', code) || campKeyIs('down', code)) { P.at += campKeyIs('down', code) ? 1 : -1; campPanelScroll(P, rows.length); res.used = true; return res; }
    if (code === 'ArrowLeft') { res.used = true; if (def.parent) { campPanelGo(P, C, def.parent, open); res.open = campPanelOpen(P); } return res; } // back to the list this one is a part of
    if (code === 'ArrowRight') { res.used = true; campPanelScroll(P, rows.length); const row = rows[P.at]; if (row && row.open) { campPanelGo(P, C, row.open); res.open = campPanelOpen(P); } return res; } // into the part the highlight is on (the ship coasts while a list is open: the arrows are the list's)
    if (campKeyIs('pick', code)) {
      campPanelScroll(P, rows.length); const row = rows[P.at]; res.used = true; if (!row) return res;
      if (row.open) { campPanelGo(P, C, row.open); res.open = campPanelOpen(P); return res; } // a part's row: its list opens
      const r = campPanelRun(C, row, 'key');
      res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; res.fleet = def.side === 'left'; P.lit[row.id] = now;
      if (res.ok && !row.stay) campPanelClose(P); // the order is given: the keys go back to the ship (a power row stays: a pip more, and more). A refusal leaves the list open, with its reason said
      res.open = campPanelOpen(P); return res;
    }
  }
  const tk = typeof campTgtStep === 'function' ? (campKeyIs('next', code) ? 'next' : campKeyIs('last', code) ? 'last' : campKeyIs('near', code) ? 'near' : campKeyIs('clear', code) ? 'clear' : '') : '';
  if (tk) { // A D S X: the one target (src/camptarget.js)
    res.used = true; res.fleet = true; if (!C) return res;
    if (tk === 'clear') campTgtClear(C); else if (tk === 'near') campTgtNearest(C); else campTgtStep(C, tk === 'next' ? 1 : -1);
    res.tgt = C.tgt || ''; return res;
  }
  const pw = ['shields', 'engines', 'weapons', 'balance'].find(id => campKeyIs(id, code));
  if (pw) { // J K L ; the ship's power
    res.used = true; if (!C) return res;
    const r = pw === 'balance' ? campOrder(C, 'balance', '', 'key') : campOrder(C, 'power', pw, 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = pw; return res;
  }
  if (!open && campKeyIs('missile', code)) { // Enter with no list open: a homing missile at the target
    res.used = true; if (!C) return res;
    const r = campOrder(C, 'missiles', campPanelTargetArg(C, { order: 'missiles' }), 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = 'missile'; return res;
  }
  return res;
}

// do a row: the order with the row's words, so the lists, the strip and the voice are one set of rules; fly: the autopilot to the objective or the target (burn: fast); blink: the warp hop
// a level that lists no outpost has nowhere to dock: its dock row mends the hull aboard instead (card space-game-night-quit-at-pick, finding F of docs/night/hunt-l2-l3.md; the rule is src/campoutpost.js campAboard)
const campPanelAs = (C, row) => {
  if (!row || !C) return row;
  if (row.id === 'dock' && typeof campAboard === 'function' && campAboard(C)) return Object.assign({}, row, { order: 'repair', arg: '', label: 'Repair the hull', help: 'Mend the hull aboard (costs ore)' });
  return row;
};
const campPanelTargetArg = (C, row) => (row.order === 'attack' || row.order === 'missiles') && typeof campTgtNow === 'function' && campTgtNow(C) ? CAMP_TGT : (row.arg || ''); // with a target picked the attack and the missile go at it; none: as they always did
const campPanelWingTarget = (C, row) => { const u = row.wing[1] === 'attack' && typeof campTgtNow === 'function' ? campTgtNow(C) : null; return u ? u.id : null; }; // an order to a part of the wing: Attack goes at the target (none picked: the verb's own, the nearest enemy); Guard is the cruiser, Mine the nearest ore
function campPanelRun(C, row, how) {
  if (!C || !row) return { ok: false, say: '' };
  row = campPanelAs(C, row);
  if (row.open) return { ok: true, say: '', open: row.open }; // a part's row: the caller opens its list
  if (row.wing) return campWingOrder(C, row.wing[0], row.wing[1], campPanelWingTarget(C, row), how || 'key');
  if (row.blink) { const bw = typeof campBlinkWhy === 'function' ? campBlinkWhy(C) : ''; if (!bw) C.input.blink = true; return { ok: !bw, say: bw }; } // the warp blink: without the technology, or while it cools, the row says so
  if (row.fly === 'target') { // the autopilot to the target (burn: fast, which needs the wing aboard)
    const tr = typeof campTgtRow === 'function' ? campTgtRow(C) : null; if (!tr) return campNo('notarget');
    const t = campNavTarget(C, tr) || tr, d = Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y);
    if (!tr.moving && d - campNavStop(tr.kind, t) <= CAMP.nav.arrive) return { ok: false, say: uiText('camp.nav.there', { name: tr.name }) };
    const r = campNavFly(C, tr, !!row.burn, how || 'key'); return r.ok ? { ok: true, say: uiText('camp.nav.say', { name: tr.name, km: campNavKm(d) }) } : r;
  }
  if (row.fly === 'objective') { // the autopilot to the goal; a burn with a ship out is refused the first time (the list stays open) and the second Enter recalls the wing and burns (src/campnav.js)
    const r = campNavCheck(C, (row.burn ? 'fast ' : '') + 'the objective'); if (!r.ok || !r.row) return r;
    const f = campNavFly(C, r.row, !!r.fast, how || 'key'); return f.ok ? { ok: true, say: f.say || r.say } : f;
  }
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
    case 'launch': return C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts';
    case 'attack': { const tg = campPanelTarget(C); return tg ? tg.name + ', ' + tg.km + ' km' : campWing(C, 'fighter').length + ' fighters out'; } // the target, when one is picked
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) + ' convoy' : 'stay by the carrier'; } // a level with no convoy (the belt): the escorts stay close
    case 'guard': case 'recall': return campWing(C).length + ' ships out';
    case 'gfighters': case 'fguard': case 'fmine': case 'frecall': return campWing(C, 'fighter').length + ' fighters out';
    case 'gescorts': case 'eattack': case 'eguard': case 'erecall': return campWing(C, 'escort').length + ' escorts out';
    case 'gconvoy': return campPanelConvoyName(C);
    case 'gstance': return campPanelStanceName(C);
    case 'gnav': return C.nav ? 'flying to ' + C.nav.name : 'not flying';
    case 'gpower': return 'weapons ' + C.power.p[0] + ', shields ' + C.power.p[1] + ', engines ' + C.power.p[2];
    case 'gyard': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name + ' in range' : typeof campAboard === 'function' && campAboard(C) ? 'aboard' : 'no outpost in range'; }
    case 'weapons': case 'shields': case 'engines': { const i = { weapons: 0, shields: 1, engines: 2 }[row.id], fx = campPowerFx(C); return C.power.p[i] + (C.power.p[i] === 1 ? ' pip: ' : ' pips: ') + (i === 0 ? 'turrets x' + (1 / fx.delay).toFixed(2) : i === 1 ? 'shield ' + Math.round(campShieldMax(C)) + (fx.regen > 0 ? ', mends ' + fx.regen + '/s' : ', no mend') : 'speed x' + fx.speed.toFixed(2)); }
    case 'balance': return 'now ' + C.power.p.join(' / ');
    case 'mine': return campMiners(C).length + ' ships, ' + C.rocks.filter(r => r.hp > 0).length + ' rocks, ' + C.pickups.length + ' ore'; // the whole wing mines (the belt, space-game-campaign-belt): rocks to cut and ore lying about
    case 'buildf': return B.fighterCost + ' ore, ' + B.fighterTime + ' s';
    case 'builde': return B.escortCost + ' ore, ' + B.escortTime + ' s';
    case 'free': case 'orbit': case 'keep': case 'match': case 'hold': return C.stance === row.id ? 'in force' : ''; // the wing's stance: the one in force is marked
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length); // the convoy orders: the one in force is marked (src/campconvoy.js)
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s of shields, then back';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') { const q = campMendQuote(C); return Math.round(q.missing) + ' hull for ' + q.cost + ' ore'; } const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range (aboard: the mend)
    case 'goal': case 'burn': { const g = campNavGoal(C); return g ? g.name + '  ' + campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': case 'burntarget': { const tg = campPanelTarget(C); return tg ? tg.name + '  ' + tg.km + ' km' : ''; }
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
    case 'launch': return (C.bay.fighters + C.bay.escorts) + ' in bay';
    case 'attack': return campWing(C, 'fighter').length + ' out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) : 'stay close'; }
    case 'guard': case 'recall': return campWing(C).length + ' out';
    case 'gfighters': case 'fguard': case 'fmine': case 'frecall': return campWing(C, 'fighter').length + ' out';
    case 'gescorts': case 'eattack': case 'eguard': case 'erecall': return campWing(C, 'escort').length + ' out';
    case 'gconvoy': return campPanelConvoyName(C);
    case 'gstance': return campPanelStanceName(C);
    case 'gnav': return C.nav ? 'on' : '';
    case 'gpower': return C.power.p.join(' / ');
    case 'gyard': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; }
    case 'shields': case 'engines': case 'weapons': { const n = C.power.p[{ weapons: 0, shields: 1, engines: 2 }[row.id]]; return CAMP_KEYS[row.id].k + '   ' + n + (n === 1 ? ' pip' : ' pips'); }
    case 'balance': return CAMP_KEYS.balance.k + '   ' + C.power.p.join(' / ');
    case 'mine': return campMiners(C).length + ' ships';
    case 'buildf': return B.fighterCost + ' ore';
    case 'builde': return B.escortCost + ' ore';
    case 'dock': { if (campPanelAs(C, row).order === 'repair') return campMendQuote(C).cost + ' ore'; const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; } // the outpost in range, by name (the row had no word of its own when it could be done: wrap-up, 8-GEN)
    case 'goal': case 'burn': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': case 'burntarget': { const tg = campPanelTarget(C); return tg ? tg.km + ' km' : ''; }
    case 'free': case 'orbit': case 'keep': case 'match': case 'hold': return C.stance === row.id ? 'in force' : '';
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s';
    case 'blink': return campPanelBlinkWord(C);
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length);
  }
  return '';
}
function campPanelRowState(C, row) {
  row = campPanelAs(C, row);
  const ok = () => ({ ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) }), no = (why, sh) => ({ ok: false, state: CAMP_PANELS.why[why] || CAMP_PANELS.why.what, short: CAMP_PANELS.shortWhy[sh || why] || CAMP_PANELS.shortWhy.what });
  if (row.open) return ok(); // a part's row is always open to go into
  if (row.wing) { const r = campWingOrder(C, row.wing[0], row.wing[1], campPanelWingTarget(C, row), 'key', true); return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; }
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return no('nogoal');
    return campNavCheck(C, (row.burn ? 'fast ' : '') + 'the objective').ok ? ok() : no('there');
  }
  if (row.fly === 'target') {
    const tr = typeof campTgtRow === 'function' ? campTgtRow(C) : null; if (!tr) return no('notarget');
    const t = campNavTarget(C, tr) || tr; if (!tr.moving && Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y) - campNavStop(tr.kind, t) <= CAMP.nav.arrive) return no('there');
    return ok();
  }
  if (row.blink) { // without the tech; cooling, with the seconds left filled in (the row showed "{s} s"); or ready
    if (!campHas(C, 'blink')) return no('noblink'); if (!campBlinkWhy(C)) return ok();
    const secs = Math.ceil((campBlinkCooldown(C) - (C.t - C.blinkAt)) / 1000); return { ok: false, state: CAMP_PANELS.why.cooling.replace('{s}', secs), short: CAMP_PANELS.shortWhy.cooling.replace('{s}', secs) };
  }
  const r = campCheck(C, row.order, campPanelTargetArg(C, row));
  return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) };
}
const campPanelStanceName = C => { const r = campPanelDef('stance').rows.find(x => x.id === (C.stance || 'free')); return r ? r.name : 'Free'; }; // the stance in force
const campPanelConvoyName = C => { const l = campPanelDef('convoy').rows.find(r => campPanelConvoyMarked(C, r)); return l ? l.label : campConvoyShips(C).length ? 'mixed' : 'no convoy'; }; // the convoy order in force
const campPanelBlinkWord = C => !campHas(C, 'blink') ? 'no tech' : campBlinkWhy(C) ? Math.ceil((campBlinkCooldown(C) - (C.t - C.blinkAt)) / 1000) + ' s' : 'ready';
const campPanelTarget = C => (typeof campTgtInfo === 'function' ? campTgtInfo(C) : null); // { name, km, hp } of the target, or null
const campPanelShips = n => n + (n === 1 ? ' ship' : ' ships'); // "1 ship", "3 ships"
const campPanelConvoyMarked = (C, row) => row.order === 'convoy' && campConvoyState(C) === campConvoyVerb(String(row.arg || '')); // the convoy order that all the escorted ships are under
function campPanelRows(C, id) {
  if (!campPanelDef(id) || !C) return [];
  return campPanelList(C, id).map(row => { const as = campPanelAs(C, row); const part = as.open ? campPanelDef(as.open) : null; return Object.assign({ id: as.id, label: as.label, key: part ? part.key : '', more: !!part, marked: (as.order === 'stance' && C.stance === as.id) || campPanelConvoyMarked(C, as) }, campPanelRowState(C, row)); });
}
function campPanelView(P, C) {
  const id = campPanelOpen(P), def = campPanelDef(id); if (!def || !C) return null;
  const all = campPanelRows(C, id), show = Math.max(1, CAMP_PANELS.show | 0); campPanelScroll(P, all.length);
  return { id, title: def.title, key: def.key, side: def.side, parent: def.parent || '', rows: all.slice(P.top, P.top + show), at: P.at - P.top, first: P.top, total: all.length, above: P.top, below: Math.max(0, all.length - P.top - show) };
}

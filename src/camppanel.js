// ---------- Campaign: the order lists, the logic (cards one-list-keys and list-shortcuts; Troy, 22 and 23 Nov 2026) ----------
// Q opens the FLEET list at the left, P the SHIP list at the right. Each has a row for every part of it, and a part has a key of its own that opens its list directly, at any time: W ALL SQUADS, E RED, R GREEN, T YELLOW on the left;
// O POWER, I AUTOPILOT, U DOCK AND REPAIR on the right (CONVOY is a part with no key: Enter on its row opens it). Nothing is on the screen until a key is pressed; only one list is open at a time.
// In an open list Up and Down move the highlight (round at the ends), Enter gives the highlighted order (on a part's row: opens that part), Left goes back to the list it is a part of, the list's own key closes it.
// ESC GOES BACK ONE STEP, TO WHERE YOU CAME FROM (card space-game-order-target-pick; Troy, 22 Nov 2026): a target sub-list (src/camppick.js) goes back to the list it was opened from; a list opened from a part's row (Q, then Squads) goes back to that list (Q);
// a list opened by its own key (Q, or W E R T, O I U) is closed; with nothing open Esc pauses (the scene). P.trail is the lists we came through by rows, the last one first to go back to.
// An order that is taken closes the list (a power row leaves it open: a pip is given again and again); one that is refused leaves it open and says why.
// No key is reused: the direct keys (A D S X the target, J K L ; the power, Enter a missile while no list is open) mean the same whether a list is open or not; only the arrows and Enter are the open list's.
// The lists, their rows and their words are CAMP_PANELS and CAMP_KEYS (src/data_controls.js): this file only reads them. It is plain data and functions, no Phaser (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws
// the open list and src/campaignscene.js gives it the keys and the clicks. The target is src/camptarget.js.
//   campPanelNew()                   the state the scene keeps: { open: '' or a list's id, at: the highlighted row, top: the first row on the screen, lit: { row id: when Enter last gave it }, trail: [the lists we came through by rows], pick: the target sub-list or null, seen: the candidate an order was just given at, ring: the squads whose ring stays on after an order (src/campwing.js campSquadsShown) }
//   campPanelKey(P, C, code, now)    one key: { used, ran, ok, say, row, tgt, fleet, open }: a list's key opens it, or closes it when it is the one open; in an open list Up, Down, Left, Enter and Esc are the list's; A D S X pick and clear the target (tgt);
//                                    J K L ; move the power; Enter with no list open fires a missile (ran: it was an order; ok and say are its answer). The scene asks a pilot's call BEFORE this when no list is open
//   campPanelOpen(P)                 the id of the open list, or '' (while a target sub-list is open it is the list that sub-list came from)          campPanelClose(P)   close it (and the sub-list)
//   campPanelGo(P, C, id, back, via) open list `id` (back: the part we came back from: the highlight goes to its row; via: the list whose row opened it, so Esc goes back there)
//   campPanelList(C, id)             the rows of a list in THIS mission (a row whose `when` can never hold here is left out)
//   campPanelRows(C, id)             the same with their live state: [{ id, label, key, more, ok, state, short, marked }] (key: the key of the part a row opens; more: it opens a part; state: what it will do, or why it cannot; short: the same in a word or two)
//   campPanelView(P, C)              what the open list draws: null, or { id, title, key, side, parent, keys (the foot's words), pick (a target sub-list), rows (the ones on the screen), at (the highlight, in rows), first, total, above, below (rows off the screen) }
//   campPanelRun(C, row, how, item)  do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), an order to one part of the wing, the autopilot, the blink -> { ok, say }; item: the candidate a pick row's order is given at (src/camppick.js)
//   campPanelTarget(C)               the line of the target: { name, km, hp } or null
//   campPanelKeyLine()               'Q Fleet  W All  E Red  R Green  T Yellow   P Ship  O Power  I Autopilot  U Dock': the lists' keys, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys)
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0, top: 0, lit: {}, trail: [], pick: null, seen: null, ring: null });
const campPanelOpen = P => (P && typeof P.open === 'string' && campPanelDef(P.open) ? P.open : '');
const campPanelClose = P => { if (P && typeof P === 'object') { P.open = ''; P.at = 0; P.top = 0; P.pick = null; P.trail = []; } };
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => ['left', 'right'].map(side => CAMP_PANELS.panels.filter(p => p.side === side && p.key).map(p => p.key + ' ' + p.tab).join('  ')).join('    ');
const campKeyLine = () => uiText('camp.ui.keys', { panels: campPanelKeyLine() });
// a row that can never be used in this mission is not in its list: the convoy's part with no convoy to give orders to, the blink without its tech, the dock where there is no outpost
function campPanelWhen(C, row) {
  if (!row.when || !C) return true;
  if (row.when === 'convoy') return campFlag('convoyorders') && !!((C.L && C.L.convoys && C.L.convoys.length) || (typeof campConvoyShips === 'function' && campConvoyShips(C).length));
  if (row.when === 'blink') return campHas(C, 'blink');
  if (row.when === 'outpost') return typeof campAboard !== 'function' || !campAboard(C); // the dock row: not in a level with no outpost to dock at (card space-game-repair-with-ore: the hull is mended anywhere)
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
// open a list: at its first row (or, for a list that says start: 'usable', its first row that can be given), or (back: the part we came back from) on that part's row; via: the list whose row opened this one (Esc goes back to it), none for a list opened by its own key
function campPanelGo(P, C, id, back, via) {
  const dd = campPanelDef(id); if (dd && dd.off) return; // a list that is switched off (the fleet list: CAMP_FLEET_LIST, src/data_controls.js) is opened by nothing: not its key, not Left from a part of it
  P.open = id; P.at = 0; P.top = 0; P.pick = null; P.trail = via ? (P.trail || []).concat(via) : [];
  if (back) { const rows = campPanelList(C, id), i = rows.findIndex(r => r.open === back); if (i >= 0) { P.at = i; campPanelScroll(P, rows.length); } }
  else if (C && campPanelDef(id) && campPanelDef(id).start === 'usable') { const rows = campPanelList(C, id), i = rows.findIndex(r => campPanelRowState(C, r).ok); if (i > 0) { P.at = i; campPanelScroll(P, rows.length); } } // a list whose table says start: 'usable' opens on its first row that can be given now: All squads opens on Launch while there are ships in the bay and, once the wing is out (Launch greyed: all out), on Attack the target (card space-game-squad-tint)
}
// the keys of a target sub-list (P.pick): Up and Down move the highlight, Enter gives the order at it, Esc and Left go back to the list it came from; true when the key was the sub-list's (any other key goes on to the direct keys)
function campPanelPickKey(P, C, code, now, res, def) {
  const pk = P.pick, items = campPickSync(C, pk);
  if (!items.length) { P.pick = null; return false; } // every candidate is gone: back to the list, and the key is read there
  if (campKeyIs('pause', code) || code === 'ArrowLeft') { P.pick = null; res.used = true; return true; }
  if (campKeyIs('up', code) || campKeyIs('down', code)) { pk.at += campKeyIs('down', code) ? 1 : -1; campPanelScroll(pk, items.length); pk.sel = items[pk.at].id; res.used = true; return true; }
  if (code === 'ArrowRight') { res.used = true; return true; }
  if (campKeyIs('pick', code)) { res.used = true; Object.assign(res, campPanelChoose(P, C, now, 'key', def)); return true; }
  return false;
}
// Enter (or a click) on the sub-list's highlighted candidate: the row's order is given at it, and the lists close; a refusal leaves the sub-list open, with its reason said
function campPanelChoose(P, C, now, how, def) {
  const pk = P.pick, items = campPickSync(C, pk), it = items[pk.at], row = campKeyRow(pk.row), out = { ran: false, ok: false, say: '', row: pk.row };
  if (!it || !row) return out;
  const r = campPanelRun(C, row, how, it);
  out.ran = true; out.ok = !!(r && r.ok); out.say = (r && r.say) || ''; out.fleet = !def || def.side === 'left'; P.lit[row.id] = now;
  if (out.ok) { P.seen = { kind: pk.kind, id: it.id, until: now + CAMP_PICK.seen }; campSquadsKeep(P, campPanelOpen(P), now); campPanelClose(P); }
  out.open = campPanelOpen(P); return out;
}
function campPanelKey(P, C, code, now) {
  const res = { used: false, ran: false, ok: false, say: '', row: '', tgt: '', fleet: false, open: campPanelOpen(P) }; // fleet: an order of the left hand or a pick of the target (a label for the tests and the radio; nothing slows the battle for it: card space-game-no-command-slowdown)
  const pk = code ? CAMP_PANELS.panels.find(p => p.code === code) : null;
  if (pk) { // a list's key (Q W, P O I U): open that list at its first row, or close it when it is the one open
    res.used = true;
    if (campPanelOpen(P) === pk.id) campPanelClose(P); else campPanelGo(P, C, pk.id);
    res.open = campPanelOpen(P); return res;
  }
  const open = campPanelOpen(P);
  if (open) { // the open list has the arrows, Enter and Esc
    const rows = campPanelList(C, open), def = campPanelDef(open);
    if (P.pick && campPanelPickKey(P, C, code, now, res, def)) return res; // a target sub-list (src/camppick.js) is the one that has the keys
    if (campKeyIs('pause', code)) { // Esc: one step back, to where we came from: the list a part's row opened this from, else closed
      res.used = true; const trail = (P.trail || []).slice(), prev = trail.pop();
      if (prev && campPanelDef(prev)) { campPanelGo(P, C, prev, open); P.trail = trail; } else campPanelClose(P);
      res.open = campPanelOpen(P); return res;
    }
    if (campKeyIs('up', code) || campKeyIs('down', code)) { P.at += campKeyIs('down', code) ? 1 : -1; campPanelScroll(P, rows.length); res.used = true; return res; }
    if (code === 'ArrowLeft') { res.used = true; if (def.parent) { campPanelGo(P, C, def.parent, open); res.open = campPanelOpen(P); } return res; } // back to the list this one is a part of
    if (code === 'ArrowRight') { res.used = true; campPanelScroll(P, rows.length); const row = rows[P.at]; if (row && row.open) { campPanelGo(P, C, row.open, '', open); res.open = campPanelOpen(P); } return res; } // into the part the highlight is on (the ship coasts while a list is open: the arrows are the list's)
    if (campKeyIs('pick', code)) {
      campPanelScroll(P, rows.length); const row = rows[P.at]; res.used = true; if (!row) return res;
      if (row.open) { campPanelGo(P, C, row.open, '', open); res.open = campPanelOpen(P); return res; } // a part's row: its list opens (Esc comes back here)
      let item = null;
      if (campPickKind(row) && campPanelRowState(C, row).ok) { // a row that needs a target: one candidate is taken at once, several open a sub-list of them (src/camppick.js)
        const plan = campPickPlan(C, row);
        if (plan.how === 'list') { campPickOpen(P, row, plan.items); res.open = campPanelOpen(P); return res; }
        if (plan.how === 'auto') item = plan.item;
      }
      const r = campPanelRun(C, row, 'key', item);
      res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; res.fleet = def.side === 'left'; P.lit[row.id] = now;
      if (res.ok && item) P.seen = { kind: campPickKind(row), id: item.id, until: now + CAMP_PICK.seen }; // the one that was taken keeps its bracket for a moment
      if (res.ok) campSquadsKeep(P, open, now); // a squad's list: the squad keeps its ring for a while (src/campwing.js)
      if (res.ok && !row.stay) campPanelClose(P); // the order is given: the keys go back to the ship (a power row stays: a pip more, and more). A refusal leaves the list open, with its reason said
      res.open = campPanelOpen(P); return res;
    }
  }
  if (campKeyIs('all', code) && typeof campSelAll === 'function') { // Q (the fleet list is off): all three pilots are the friend; the next E R T goes to all three (src/camptarget.js campSelAll)
    res.used = true; res.fleet = true; if (!C) return res;
    campSelAll(C); res.sel = C.sel || ''; res.tgt = C.tgt || ''; return res;
  }
  const tk = typeof campTgtStep === 'function' ? (campKeyIs('next', code) ? 'next' : campKeyIs('last', code) ? 'last' : campKeyIs('fnext', code) ? 'fnext' : campKeyIs('flast', code) ? 'flast' : campKeyIs('near', code) ? 'near' : campKeyIs('clear', code) ? 'clear' : '') : '';
  if (tk) { // [ ] S the hostile, A D the friend, X both (src/camptarget.js: the two selections)
    res.used = true; res.fleet = true; if (!C) return res;
    if (tk === 'clear') { campTgtClear(C); campSelClear(C); campSquadsFree(P); } else if (tk === 'near') campTgtNearest(C); else if (tk === 'fnext' || tk === 'flast') campSelStep(C, tk === 'fnext' ? 1 : -1); else campTgtStep(C, tk === 'next' ? 1 : -1);
    res.tgt = C.tgt || ''; res.sel = C.sel || ''; return res;
  }
  const ok = typeof campSelOrder === 'function' ? ['attack', 'guard', 'recall'].find(id => campKeyIs(id, code)) : '';
  if (ok) { // E R T: the pilots attack the hostile, guard the friend, fly home; a selected pilot takes the order alone (src/camptarget.js campSelOrder)
    res.used = true; if (!C) return res;
    const f = campSelNow(C), r = campSelOrder(C, ok, 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = ok; res.fleet = true;
    if (res.ok) campSquadsKeep(P, f && f.kind === 'pilot' ? f.squad : 'squads', now); // the pilot (or all three) keep the ring a while
    return res;
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
// (a level with no outpost used to turn its Dock row into Repair the hull; the hull is mended anywhere now, so that row is its own and the Dock row is left out there: when 'outpost')
const campPanelAs = (C, row) => row;
const campPanelTargetArg = (C, row) => (row.order === 'attack' || row.order === 'missiles') && typeof campTgtNow === 'function' && campTgtNow(C) ? CAMP_TGT : (row.arg || ''); // with a target picked the attack and the missile go at it; none: as they always did
const campPanelWingTarget = (C, row) => { const u = row.wing[1] === 'attack' && typeof campTgtNow === 'function' ? campTgtNow(C) : null; return u ? u.id : null; }; // an order to a part of the wing: Attack goes at the target (none picked: the verb's own, the nearest enemy); Guard is the cruiser, Mine the nearest ore
function campPanelRun(C, row, how, item) {
  if (!C || !row) return { ok: false, say: '' };
  row = campPanelAs(C, row);
  if (row.open) return { ok: true, say: '', open: row.open }; // a part's row: the caller opens its list
  if (item && row.pick === 'enemy') C.tgt = item.id; // the hostile that was chosen is THE target now: the attack below goes at it, and P fly to the target and Enter a missile follow it
  else if (item && row.pick === 'escort') return campWingOrder(C, row.wing ? row.wing[0] : 'fighters', 'escort', item.id, how || 'key'); // the squads (or the one squad of the row) go to the ship that was chosen (a convoy ship or a miner)
  else if (item && row.pick === 'guard') return campWingOrder(C, row.wing[0], 'guard', item.id, how || 'key'); // the squad guards the ship or outpost that was chosen, in formation beside it (src/campwing.js campWingGuardStep ends it when the ship is lost or safe)
  else if (row.pick === 'guard') { const dry = campWingOrder(C, row.wing[0], 'guard', null, how || 'key', true); return dry.ok ? campNo('noguard') : dry; } // Guard the target with nothing to guard: refused in words, never the carrier by a side door
  else if (item && row.pick === 'ward') return campOrder(C, 'mendship', item.id, how || 'key'); // the ship that was chosen is mended (src/campmend.js)
  else if (item && row.pick === 'field') return campWingOrder(C, row.wing ? row.wing[0] : 'all', 'mine', item.rock, how || 'key'); // the wing starts at the rock of the field that was chosen
  else if (row.pick === 'enemy' && !campTgtNow(C) && !campTgtList(C).length) { const dry = row.wing ? campWingOrder(C, row.wing[0], row.wing[1], null, how || 'key', true) : campCheck(C, row.order, ''); return dry.ok ? campNo('nofoe') : dry; } // Attack with no hostile and no target: nothing to attack (an order's own refusal, no fighters out, is said first)
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
// the squad a row is about (its order is to one squad, or it opens that squad's list): 'red', 'green', 'yellow', or '' (card space-game-fighter-squads)
const campPanelSquadOf = row => { const g = row.wing && CAMP.wing.groups[row.wing[0]]; return g && g.squad ? g.squad : row.open && CAMP.wing.squads.indexOf(row.open) >= 0 ? row.open : ''; };
// what a row of the DOCK AND REPAIR list costs, in words, from the row's own `cost` (the table CAMP_YARD, src/data_controls.js), live: 'hull' is mending the hull now ('30 ore, 4 s', short '30 ore', or 'hull sound'); 'ward' is the nearest
// ship you protect that is hurt and near ('10 ore'), '' when none is; '' for a row with no cost (card space-game-repair-with-ore)
const campPanelCost = (C, row, short) => {
  const k = row.cost, K = CAMP.mend; if (!k || !C || !C.carrier) return '';
  if (k === 'hull') { const q = campMendQuote(C); return q.missing <= 0.5 ? 'hull sound' : q.cost + ' ore' + (short || C.docked ? '' : ', ' + Math.max(1, Math.round(K.hullSecs * q.missing / C.carrier.maxHp)) + ' s'); }
  if (k === 'ward') { const u = typeof campWardsNear === 'function' ? campWardsNear(C)[0] : null; return u ? campWardQuote(C, u).cost + ' ore' : ''; }
  return '';
};
function campPanelState(C, row) {
  const sq = campPanelSquadOf(row);
  if (row.cost) return campPanelCost(C, row); // a yard row: what it costs (now)
  if (sq) { const n = campWingShips(C, sq).length, tg = row.wing && row.wing[1] === 'attack' ? campPanelTarget(C) : null; return tg ? tg.name + ', ' + tg.km + ' km' : n + (n === 1 ? ' ship out' : ' ships out'); } // a squad's row: the target the attack goes at, else how many of its ships are out
  switch (row.id) {
    case 'launch': case 'slaunch': return C.bay.fighters + ' fighters';
    case 'attack': { const tg = campPanelTarget(C); return tg ? tg.name + ', ' + tg.km + ' km' : campWing(C, 'fighter').length + ' fighters out'; } // the target, when one is picked
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) + ' convoy' : 'stay by the carrier'; } // a level with no convoy (the belt): the squads stay close
    case 'guard': case 'recall': return campWing(C).length + ' ships out';
    case 'gsquads': case 'fguard': case 'fguardt': case 'fmine': case 'frecall': return campWing(C, 'fighter').length + ' fighters out';
    case 'gconvoy': return campPanelConvoyName(C);
    case 'gnav': return C.nav ? 'flying to ' + C.nav.name : 'not flying';
    case 'gpower': return 'weapons ' + C.power.p[0] + ', shields ' + C.power.p[1] + ', engines ' + C.power.p[2];
    case 'gyard': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name + ' in range' : 'no outpost in range'; }
    case 'weapons': case 'shields': case 'engines': { const i = { weapons: 0, shields: 1, engines: 2 }[row.id], fx = campPowerFx(C); return C.power.p[i] + (C.power.p[i] === 1 ? ' pip: ' : ' pips: ') + (i === 0 ? 'turrets x' + (1 / fx.delay).toFixed(2) : i === 1 ? 'shield ' + Math.round(campShieldMax(C)) + (fx.regen > 0 ? ', mends ' + fx.regen + '/s' : ', no mend') : 'speed x' + fx.speed.toFixed(2)); }
    case 'balance': return 'now ' + C.power.p.join(' / ');
    case 'mine': return campMiners(C).length + ' ships, ' + C.rocks.filter(r => r.hp > 0).length + ' rocks, ' + C.pickups.length + ' ore'; // the whole wing mines (the belt, space-game-campaign-belt): rocks to cut and ore lying about
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length); // the convoy orders: the one in force is marked (src/campconvoy.js)
    case 'emergency': return CAMP.power.emergency.ms / 1000 + ' s of shields, then back';
    case 'dock': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range
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
  const sq = campPanelSquadOf(row);
  if (row.cost) return campPanelCost(C, row, true);
  if (sq) { const tg = row.wing && row.wing[1] === 'attack' ? campPanelTarget(C) : null; return tg ? tg.km + ' km' : campWingShips(C, sq).length + ' out'; }
  switch (row.id) {
    case 'launch': case 'slaunch': return C.bay.fighters + ' in bay';
    case 'attack': return campWing(C, 'fighter').length + ' out';
    case 'escort': { const cv = campNearest(campConvoys(C), C.carrier); return cv ? campConvoyName(cv) : 'stay close'; }
    case 'guard': case 'recall': return campWing(C).length + ' out';
    case 'gsquads': case 'fguard': case 'fguardt': case 'fmine': case 'frecall': return campWing(C, 'fighter').length + ' out';
    case 'gconvoy': return campPanelConvoyName(C);
    case 'gnav': return C.nav ? 'on' : '';
    case 'gpower': return C.power.p.join(' / ');
    case 'gyard': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; }
    case 'shields': case 'engines': case 'weapons': return CAMP_KEYS[row.id].k; // the key of the row (the pips are the row's own bar now, the gauge's twin: src/campanelsdraw.js)
    case 'balance': return CAMP_KEYS.balance.k + '   ' + C.power.p.join(' / ');
    case 'mine': return campMiners(C).length + ' ships';
    case 'dock': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; }
    case 'goal': case 'burn': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': case 'burntarget': { const tg = campPanelTarget(C); return tg ? tg.km + ' km' : ''; }
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
  if (row.pick === 'enemy' && !campTgtNow(C) && !campTgtList(C).length) { const r = row.wing ? campWingOrder(C, row.wing[0], row.wing[1], null, 'key', true) : campCheck(C, row.order, ''); return r.ok ? no('nofoe') : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; } // Attack with no hostile to attack: grey, and why (a refusal of its own comes first: no fighters out)
  if (row.pick === 'guard' && !campPickItems(C, 'guard').length) { const r = campWingOrder(C, row.wing[0], 'guard', null, 'key', true); return r.ok ? no('noguard') : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; } // Guard the target with nothing to guard: grey, and why (a refusal of its own comes first: no ships of the squad out)
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
const campPanelConvoyName = C => { const l = campPanelDef('convoy').rows.find(r => campPanelConvoyMarked(C, r)); return l ? l.label : campConvoyShips(C).length ? 'mixed' : 'no convoy'; }; // the convoy order in force
const campPanelBlinkWord = C => !campHas(C, 'blink') ? 'no tech' : campBlinkWhy(C) ? Math.ceil((campBlinkCooldown(C) - (C.t - C.blinkAt)) / 1000) + ' s' : 'ready';
const campPanelTarget = C => (typeof campTgtInfo === 'function' ? campTgtInfo(C) : null); // { name, km, hp } of the target, or null
const campPanelShips = n => n + (n === 1 ? ' ship' : ' ships'); // "1 ship", "3 ships"
const campPanelConvoyMarked = (C, row) => row.order === 'convoy' && campConvoyState(C) === campConvoyVerb(String(row.arg || '')); // the convoy order that all the escorted ships are under
function campPanelRows(C, id) {
  if (!campPanelDef(id) || !C) return [];
  return campPanelList(C, id).map(row => { const as = campPanelAs(C, row); const part = as.open ? campPanelDef(as.open) : null; return Object.assign({ id: as.id, label: as.label, key: part ? part.key : '', more: !!part, marked: campPanelConvoyMarked(C, as), pip: as.pip === undefined ? -1 : as.pip }, campPanelRowState(C, row)); });
}
function campPanelView(P, C) {
  const id = campPanelOpen(P), def = campPanelDef(id); if (!def || !C) return null;
  const show = Math.max(1, CAMP_PANELS.show | 0);
  if (P.pick) { // a target sub-list: the candidates, over the list it came from
    const items = campPickSync(C, P.pick);
    if (items.length) {
      campPanelScroll(P.pick, items.length); const pk = P.pick, all = items.map(i => campPickRow(C, i, pk.kind));
      return { id, title: uiText('camp.ui.cand.title.' + pk.kind), key: def.key, side: def.side, parent: id, pick: true, keys: 'camp.ui.cand.keys', rows: all.slice(pk.top, pk.top + show), at: pk.at - pk.top, first: pk.top, total: all.length, above: pk.top, below: Math.max(0, all.length - pk.top - show) };
    }
    P.pick = null; // none is left: the list it came from
  }
  const all = campPanelRows(C, id); campPanelScroll(P, all.length);
  const keys = P.trail && P.trail.length ? 'camp.ui.listkeyback' : def.parent ? 'camp.ui.listkeysub' : 'camp.ui.listkeys'; // the foot's words: Esc closes a list its own key opened, and goes back from one a part's row opened
  return { id, title: def.title, key: def.key, side: def.side, parent: def.parent || '', pick: false, keys, rows: all.slice(P.top, P.top + show), at: P.at - P.top, first: P.top, total: all.length, above: P.top, below: Math.max(0, all.length - P.top - show) };
}

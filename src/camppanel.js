// ---------- Campaign: the order lists, the logic (cards one-list-keys and list-shortcuts; Troy, 22 and 23 Nov 2026) ----------
// (The FLEET, SHIP, POWER, AUTOPILOT and ALL-SQUADQ lists, their keys Q W P O I U and their switches CAMP_FLEET_LIST and CAMP_SHIP_LIST are DELETED: card space-game-delete-off-lists, Troy, 24 Nov 2026; the git tag lists-before-delete is main as they stood.) S opens the CRUISER list, the one list with a key; the convoy list and the dock list stay as data that no key opens. Nothing is on the screen until a key is pressed; only one list is open at a time.
// (A NUMBERED list, the Q list's `numbers: 1`, card space-game-s-list-numbers, is driven by the digits 1 to 9 alone: its rows carry their numbers, there is no highlight, and Up, Down, Left, Right and Enter are left to the ship.) In an open list that is not numbered Up and Down move the highlight (round at the ends), Enter gives the highlighted order (on a part's row: opens that part), Left goes back to the list it is a part of, the list's own key closes it.
// ESC GOES BACK ONE STEP, TO WHERE YOU CAME FROM (card space-game-order-target-pick; Troy, 22 Nov 2026): a target sub-list (src/camppick.js) goes back to the list it was opened from; a list opened from a part's row goes back to that list;
// a list opened by its own key (S) is closed; with nothing open Esc pauses (the scene). P.trail is the lists we came through by rows, the last one first to go back to.
// An order that is taken closes the list; one that is refused leaves it open and says why.
// No key is reused: the direct keys (Q who, ] [ the target, \ the nearest threat, X clear, W the order, J K L the power when it is on, Enter a missile while no list is open) mean the same whether a list is open or not; only the arrows and Enter are the open list's, and only a list that takes them.
// The lists, their rows and their words are CAMP_PANELS and CAMP_KEYS (src/data_controls.js): this file only reads them. It is plain data and functions, no Phaser (tests/campanels.mjs runs it in Node); src/campanelsdraw.js draws
// the open list and src/campaignscene.js gives it the keys and the clicks. The target is src/camptarget.js.
//   campPanelNew()                   the state the scene keeps: { open: '' or a list's id, at: the highlighted row, top: the first row on the screen, lit: { row id: when Enter last gave it }, trail: [the lists we came through by rows], pick: the target sub-list or null, seen: the candidate an order was just given at, ring: the squads whose ring stays on after an order (src/campwing.js campSquadsShown) }
//   campPanelKey(P, C, code, now)    one key: { used, ran, ok, say, row, tgt, fleet, open }: a list's key opens it, or closes it when it is the one open; in an open list Up, Down, Left, Enter and Esc are the list's; Q who, ] [ \ X pick and clear the target (tgt), W gives the order;
//                                    J K L move the power (only with CAMP_POWER on); Enter with no list open fires a missile (ran: it was an order; ok and say are its answer). The scene asks a pilot's call BEFORE this when no list is open
//   campPanelOpen(P)                 the id of the open list, or '' (while a target sub-list is open it is the list that sub-list came from)          campPanelClose(P)   close it (and the sub-list)
//   campPanelGo(P, C, id, back, via) open list `id` (back: the part we came back from: the highlight goes to its row; via: the list whose row opened it, so Esc goes back there)
//   campPanelList(C, id)             the rows of a list in THIS mission (a row whose `when` can never hold here is left out)
//   campPanelRows(C, id)             the same with their live state: [{ id, label, key, more, ok, state, short, marked }] (key: the key of the part a row opens; more: it opens a part; state: what it will do, or why it cannot; short: the same in a word or two)
//   campPanelView(P, C)              what the open list draws: null, or { id, title, key, side, parent, keys (the foot's words), pick (a target sub-list), rows (the ones on the screen), at (the highlight, in rows), first, total, above, below (rows off the screen) }
//   campPanelRun(C, row, how, item)  do the row: campOrder with the row's words (how: 'key' or 'click', the play log's), an order to one part of the wing, the autopilot, the blink -> { ok, say }; item: the candidate a pick row's order is given at (src/camppick.js)
//   campPanelTarget(C)               the line of the target: { name, km, hp } or null
//   campPanelKeyLine()               'S Cruiser': the lists' keys, from the table;   campKeyLine(): the whole bottom key line (camp.ui.keys: the flying keys, not the lists')
const campPanelDef = id => CAMP_PANELS.panels.find(p => p.id === id) || null;
const campPanelNew = () => ({ open: '', at: 0, top: 0, lit: {}, trail: [], pick: null, seen: null, ring: null, touch: null });
const campPanelOpen = P => (P && typeof P.open === 'string' && campPanelDef(P.open) ? P.open : '');
// a NUMBERED list (the cruiser's: `numbers: 1`, card space-game-s-list-numbers) is driven by the digits 1 to 9 alone: it takes neither the arrows nor Enter, so while it is open the arrows fly the ship and Enter fires a missile. campPanelOwnsArrows: an open list that is NOT numbered has them
const campPanelNumbered = P => { const d = campPanelDef(campPanelOpen(P)); return !!(d && d.numbers); };
const campPanelOwnsArrows = P => !!campPanelOpen(P) && !campPanelNumbered(P);
const campPanelClose = P => { if (P && typeof P === 'object') { P.open = ''; P.at = 0; P.top = 0; P.pick = null; P.trail = []; P.touch = null; } };
// THE FADE (card space-game-keys2-cruiser; Troy, 23 Nov 2026: the cruiser list "fades after a few seconds untouched"). A list marked `fades` in the table (the cruiser's, and any list or target sub-list reached from it) closes by itself after CAMP_PANELS.anim.idle ms
// with no key and no click (P.touch is the scene clock of the last: a key in campPanelKey, a click in campPanelsClick) and dims over the next anim.out ms. campPanelFade(P, now) is asked every frame by the drawing: the list's opacity, 1 to 0 (it has closed at 0).
const campPanelFades = P => { const o = campPanelOpen(P); if (!o) return false; const d = campPanelDef(o); return !!(d && d.fades) || (P.trail || []).some(id => { const t = campPanelDef(id); return !!(t && t.fades); }); };
function campPanelFade(P, now) {
  if (!campPanelFades(P)) return 1;
  const K = CAMP_PANELS.anim; if (typeof P.touch !== 'number' || P.touch > now) P.touch = now; // a list that has just opened starts counting at its first frame
  const idle = now - P.touch; if (idle >= K.idle + K.out) { campPanelClose(P); return 0; }
  return idle <= K.idle ? 1 : 1 - (idle - K.idle) / K.out;
}
const campPanelCase = t => t.charAt(0) + t.slice(1).toLowerCase();
const campPanelKeyLine = () => ['left', 'right'].map(side => CAMP_PANELS.panels.filter(p => p.side === side && p.key).map(p => p.key + ' ' + p.tab).join('  ')).join('    ');
const campKeyLine = () => uiText('camp.ui.keys'); // the bottom line is the flying keys only: Arrows, Space, Enter, Tab, H (card space-game-layout-hud: the lists' keys, S Cruiser, are written on their own corner's title now)
// a row that can never be used in this mission is not in its list: the convoy's part with no convoy to give orders to, the blink without its tech, the dock where there is no outpost
function campPanelWhen(C, row) {
  if (row.off) return false; // a row switched off (the Q list's Dock and repair, card space-game-keys3-repair: it stays in the table)
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
// open a list: at its first row, or (back: the part we came back from) on that part's row; via: the list whose row opened this one (Esc goes back to it), none for a list opened by its own key
function campPanelGo(P, C, id, back, via) {
  if (C) (C.keysUsed || (C.keysUsed = {}))[id] = true; // the lists a player has opened (card space-game-chunk12-teach-q: the key row's teaching chip goes quiet once its key has been used; src/campteach.js)
  P.open = id; P.at = 0; P.top = 0; P.pick = null; P.trail = via ? (P.trail || []).concat(via) : [];
  if (back) { const rows = campPanelList(C, id), i = rows.findIndex(r => r.open === back); if (i >= 0) { P.at = i; campPanelScroll(P, rows.length); } }
}
// the keys of a target sub-list (P.pick): Up and Down move the highlight, Enter gives the order at it, Esc and Left go back to the list it came from; true when the key was the sub-list's (any other key goes on to the direct keys)
function campPanelPickKey(P, C, code, now, res, def) {
  const pk = P.pick, items = campPickSync(C, pk);
  if (!items.length) { P.pick = null; return false; } // every candidate is gone: back to the list, and the key is read there
  const nums = !!(def && def.numbers), dn = nums ? campKeyDigit(code) : 0; // a numbered list's sub-list is numbered too: 1 to 9 choose a candidate, Esc goes back, the arrows and Enter are the ship's
  if (campKeyIs('pause', code) || (!nums && code === 'ArrowLeft')) { P.pick = null; res.used = true; return true; }
  if (dn) { res.used = true; if (dn > items.length) return true; pk.at = dn - 1; campPanelScroll(pk, items.length); pk.sel = items[pk.at].id; Object.assign(res, campPanelChoose(P, C, now, 'key', def)); return true; }
  if (nums) return false;
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
  out.ran = true; out.ok = !!(r && r.ok); out.say = (r && r.say) || ''; out.fleet = !def || def.side === 'left'; P.lit[row.id] = now; if (out.ok) P.did = { id: row.id, at: now }; // (P.did: the last order a list ran that was taken: the line under the left panel reads it back, src/camporderline.js)
  if (out.ok) { P.seen = { kind: pk.kind, id: it.id, until: now + CAMP_PICK.seen }; campPanelClose(P); }
  out.open = campPanelOpen(P); return out;
}
// the hold after a card (card space-game-enter-card-fires-missile; Troy, 24 Nov 2026: the Enter that closes the story card or the briefing also fired a missile, and a missile costs ore now): the scene calls campPanelHold(P, now) when a card closes and when a battle begins; for CAMP.card.lock ms after that campPanelHeld says true, and the missile key (and a click on a ship, shipClick) does nothing. The arrows, Space and the turrets are held-key reads (`isDown`), not presses, and the battle does not run under a card, so nothing else needs the hold.
const campPanelHold = (P, now) => { if (P && typeof now === 'number') P.hold = now + CAMP.card.lock; };
const campPanelHeld = (P, now) => !!P && typeof now === 'number' && typeof P.hold === 'number' && now < P.hold;
function campPanelKey(P, C, code, now) {
  const res = { used: false, ran: false, ok: false, say: '', row: '', tgt: '', fleet: false, open: campPanelOpen(P) }; // fleet: an order of the left hand or a pick of the target (a label for the tests and the radio; nothing slows the battle for it: card space-game-no-command-slowdown)
  if (typeof now === 'number' && campPanelOpen(P)) P.touch = now; // a key in an open list is a touch: the fade starts again (campPanelFade)
  const pk = code ? CAMP_PANELS.panels.find(p => p.code && p.code === code) : null;
  if (pk) { // a list's key (S): open that list at its first row, or close it when it is the one open
    res.used = true;
    if (pk.step && C && typeof campSelStep === 'function') {
      if (pk.step === 'fri') { if (!campFriNumbered(C).some(e => e.alive)) { res.tgt = C.tgt || ''; res.sel = C.sel || ''; res.fsel = C.fsel || ''; return res; } campFriStep(C, 1); } else if (campPanelOpen(P) !== pk.id) campSelAll(C); else campSelStep(C, 1); // W (card space-game-keys8-e-digit item 5): the first tap, the pick closed, picks ALL pilots and opens it; the next taps step Wedge, Kara, Apollo, all // E (card space-game-keys8-e-digit) steps the ships you protect in their numbers, the same way: no ship to protect, no pick
      if (campPanelOpen(P) !== pk.id) campPanelGo(P, C, pk.id); else { P.at = 0; P.top = 0; } res.open = campPanelOpen(P); res.sel = C.sel || ''; res.fsel = C.fsel || ''; res.tgt = C.tgt || ''; return res;
    } // the fleet pick's key (card space-game-keys7-trim, Troy, 24 Nov 2026): each press steps who (Wedge, Kara, Apollo, all, round again) and keeps the pick open; a digit still jumps there; Esc or the fade closes it
    if (campPanelOpen(P) === pk.id) campPanelClose(P); else campPanelGo(P, C, pk.id);
    res.open = campPanelOpen(P); return res;
  }
  const open = campPanelOpen(P), nums = campPanelNumbered(P), dn = nums ? campKeyDigit(code) : 0; // nums: the open list is a numbered one: the digits do its rows, and the arrows and Enter are the ship's (card space-game-s-list-numbers)
  if (open) { // the open list has the arrows, Enter and Esc (a numbered one has the digits and Esc)
    const rows = campPanelList(C, open), def = campPanelDef(open);
    if (P.pick && campPanelPickKey(P, C, code, now, res, def)) return res; // a target sub-list (src/camppick.js) is the one that has the keys
    if (campKeyIs('pause', code)) { // Esc: one step back, to where we came from: the list a part's row opened this from, else closed
      res.used = true; const trail = (P.trail || []).slice(), prev = trail.pop();
      if (prev && campPanelDef(prev)) { campPanelGo(P, C, prev, open); P.trail = trail; } else campPanelClose(P);
      res.open = campPanelOpen(P); return res;
    }
    if (!nums && (campKeyIs('up', code) || campKeyIs('down', code))) { P.at += campKeyIs('down', code) ? 1 : -1; campPanelScroll(P, rows.length); res.used = true; return res; }
    if (!nums && code === 'ArrowLeft') { res.used = true; if (def.parent) { campPanelGo(P, C, def.parent, open); res.open = campPanelOpen(P); } return res; } // back to the list this one is a part of
    if (!nums && code === 'ArrowRight') { res.used = true; campPanelScroll(P, rows.length); const row = rows[P.at]; if (row && row.open) { campPanelGo(P, C, row.open, '', open); res.open = campPanelOpen(P); } return res; } // into the part the highlight is on (the ship coasts while a list is open: the arrows are the list's)
    if (dn || (!nums && campKeyIs('pick', code))) { // Enter on the highlighted row, or (a numbered list) the digit of a row: the same doing
      if (dn) { res.used = true; res.digit = dn; if (dn > rows.length) return res; P.at = dn - 1; } // a digit with no row on it does nothing
      campPanelScroll(P, rows.length); const row = rows[P.at]; res.used = true; if (!row) return res;
      if (row.open) { campPanelGo(P, C, row.open, '', open); res.open = campPanelOpen(P); return res; } // a part's row: its list opens (Esc comes back here)
      let item = null;
      if (campPickKind(row) && campPanelRowState(C, row).ok) { // a row that needs a target: one candidate is taken at once, several open a sub-list of them (src/camppick.js)
        const plan = campPickPlan(C, row);
        if (plan.how === 'list') { campPickOpen(P, row, plan.items); res.open = campPanelOpen(P); return res; }
        if (plan.how === 'auto') item = plan.item;
      }
      const r = campPanelRun(C, row, 'key', item);
      res.ran = (!row.who && !row.fri) || !(r && r.ok); res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = row.id; res.fleet = def.side === 'left'; P.lit[row.id] = now; if (res.ok) P.did = { id: row.id, at: now }; // (a pick of who is no order: it says nothing unless it is refused)
      if (res.ok && item) P.seen = { kind: campPickKind(row), id: item.id, until: now + CAMP_PICK.seen }; // the one that was taken keeps its bracket for a moment
      if (res.ok) campPanelClose(P); // the order is given: the keys go back to the ship. A refusal leaves the list open, with its reason said
      res.open = campPanelOpen(P); return res;
    }
  }
  const tk = typeof campTgtStep === 'function' ? (campKeyIs('hostiles', code) ? 'hostiles' : campKeyIs('near', code) ? 'near' : '') : '';
  if (tk) { // ] the next enemy, \ the nearest threat: one key and one direction each, each cycle going round with no empty stop (src/camptarget.js; cards space-game-keys4-onekey, space-game-keys5-qwe, space-game-keys6-enter and space-game-keys8-e-digit: W is the fleet pick and E the friends pick, lists' keys above; X is gone)
    res.used = true; res.fleet = true; if (!C) return res;
    if (tk === 'near') campTgtNearest(C); else campTgtCycle(C);
    res.tgt = C.tgt || ''; res.sel = C.sel || ''; res.fsel = C.fsel || ''; return res;
  }
  const ok = typeof campSelOrder === 'function' && campKeyIs('order', code) ? 'engage' : '';
  if (ok && open && !nums) return res; // an open list that takes Enter (not a numbered one) has had it above: the order is not given through it
  if (ok) { // Enter: the pilots attack the enemy, guard the friend, or form up on the cruiser, by what is picked; a selected pilot takes the order alone (src/camptarget.js campSelOrder; cards space-game-keys2-orders and space-game-keys6-enter)
    res.used = true; if (!C || campPanelHeld(P, now)) return res; // a card has just closed (campPanelHold): the Enter that closed it gives no order
    const f = campSelNow(C), r = campSelOrder(C, ok, 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = r && r.verb || ok; res.fleet = true;
    if (res.ok) campSquadsKeep(P, f && f.kind === 'pilot' ? f.squad : 'squads', now); // the pilot (or all three) keep the ring a while
    return res;
  }
  const pw = ['shields', 'engines', 'weapons'].find(id => campKeyIs(id, code));
  if (pw) { // J K L the ship's power (the semicolon's balance key is gone)
    res.used = true; if (!C) return res;
    const r = campOrder(C, 'power', pw, 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = pw; return res;
  }
  if (campKeyIs('reload', code)) { // R: queue one missile to build, for ore (card space-game-missiles-cost-ore: it is also the Q list's row Reload missiles, so the row lights as the key is pressed)
    res.used = true; if (!C) return res;
    const r = campOrder(C, 'reload', '', 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = 'sreload'; if (typeof now === 'number' && P && P.lit) P.lit.sreload = now; return res;
  }
  if (campKeyIs('missile', code)) { // Z: a homing missile at the target (card space-game-keys6-enter: it was Enter; a letter takes no list's key, so it fires with a list open too)
    res.used = true; if (!C || campPanelHeld(P, now)) return res; // a card has just closed (campPanelHold): the press that closed it, or a second one at once, fires nothing and says nothing
    if (typeof campTgtNow === 'function' && !campTgtNow(C) && typeof campTgtNearest === 'function') campTgtNearest(C, CAMP.missile.lock); // no enemy picked (card space-game-keys7-trim): the nearest enemy IN missile range is picked now (card space-game-missiles-miss: not one out of range) and the missile goes at it (it becomes the target; a friendly held is let go: one target at a time); none in range: the old way, the nearest big ship in reach or the short no-line
    const r = campOrder(C, 'missiles', campPanelTargetArg(C, { order: 'missiles' }), 'key');
    res.ran = true; res.ok = !!(r && r.ok); res.say = (r && r.say) || ''; res.row = 'missile'; return res;
  }
  if (campKeyIs('cockpit', code) && typeof campCockpitOn === 'function' && campCockpitOn()) { // C: take the stick of a pilot's fighter, or hand it back (card space-game-fly-fighter-l1; with the switch off this key is no key)
    res.used = true; if (!C || campPanelHeld(P, now) || campPanelOwnsArrows(P)) return res; // (a list that has the arrows has the keys: C waits until it is shut)
    let r = null, say = ''; if (C.cockpit) { campCockpitGive(C, 'hand'); say = uiText('camp.corner.backon'); } else if (!campCockpitTake(C)) r = campCockpitPodWait(C) > 0 ? { ok: false, say: uiText('camp.corner.podwait', { s: campCockpitPodWait(C) }) } : campNo('nopilot'); else { const f = campCockpitFlown(C); say = f ? uiText('camp.corner.flying', { name: campSelLabel(CAMP_SELPILOT + (f.squad || '')) }) : ''; } // a line either way (the scene toasts what a key says: an empty one left an empty plate on the screen)
    res.ran = true; res.ok = !r; res.say = r ? r.say : say; res.row = 'cockpit'; return res;
  }
  return res;
}

// do a row: the order with the row's words, so the lists, the strip and the voice are one set of rules; fly: the autopilot to the objective or the target (burn: fast); blink: the warp hop
// (a level with no outpost used to turn its Dock row into Repair the hull; the hull is mended anywhere now, so that row is its own and the Dock row is left out there: when 'outpost')
const campPanelTargetArg = (C, row) => row.order === 'missiles' && typeof campTgtNow === 'function' && campTgtNow(C) ? CAMP_TGT : (row.arg || ''); // with a target picked the missile goes at it; none: as it always did
function campPanelRun(C, row, how, item) {
  if (!C || !row) return { ok: false, say: '' };
  if (row.open) return { ok: true, say: '', open: row.open }; // a part's row: the caller opens its list
  if (row.who) return campSelPick(C, row.who, how || 'key'); // a row of the fleet pick: WHO takes the order (no order is given)
  if (row.fri) return campFriJump(C, row.fri, how || 'key'); // a row of the friends pick (E, then a digit): that ship is the friendly held
  if (row.formup && typeof campCockpitFlown === 'function' && campCockpitFlown(C)) return campCockpitCome(C, how || 'key'); // 7 of the Q list while he flies a fighter: the cruiser comes to him (src/campcockpit.js)
  if (row.formup) return campSelOrder(C, 'formup', how || 'key'); // 5 of the fleet pick: form up on the cruiser, at once, whoever is picked
  if (item && row.pick === 'ward') return campOrder(C, 'mendship', item.id, how || 'key'); // the ship that was chosen is mended (src/campmend.js)
  else if (item && row.pick === 'field') return campWingOrder(C, row.wing ? row.wing[0] : 'all', 'mine', item.rock, how || 'key'); // the wing starts at the rock of the field that was chosen
  if (row.wing) return campWingOrder(C, row.wing[0], row.wing[1], null, how || 'key');
  if (row.blink) { const bw = typeof campBlinkWhy === 'function' ? campBlinkWhy(C) : ''; if (!bw) C.input.blink = true; return { ok: !bw, say: bw }; } // the warp blink: without the technology, or while it cools, the row says so
  if (row.fly === 'target') { // the autopilot to the target the one target held, an enemy, a ship you protect or a place clicked on the map
    const tr = typeof campHeldRow === 'function' ? campHeldRow(C) : null; if (!tr) return campNo('notarget');
    const t = campNavTarget(C, tr) || tr, d = Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y);
    if (!tr.moving && d - campNavStop(tr.kind, t) <= CAMP.nav.arrive) return { ok: false, say: uiText('camp.nav.there', { name: tr.name }) };
    const r = campNavFly(C, tr, false, how || 'key'); return r.ok ? { ok: true, say: uiText('camp.nav.say', { name: tr.name, km: campNavKm(d) }) } : r;
  }
  if (row.fly === 'objective') { // the autopilot to the goal
    const r = campNavCheck(C, 'the objective'); if (!r.ok || !r.row) return r;
    const auto = row.fast === 'auto' && campNavAuto(C, Math.hypot(r.row.x - C.carrier.x, r.row.y - C.carrier.y)); // the cruiser list's Fly to the goal burns by itself on a long clear leg (src/campnav.js campNavAuto; card space-game-keys2-cruiser)
    const f = campNavFly(C, r.row, !!r.fast || auto, how || 'key'); if (f.ok && C.nav) C.nav.auto = auto;
    return f.ok ? { ok: true, say: auto ? uiText('camp.nav.gofast', { name: r.row.name }) : f.say || r.say } : f;
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
// what a row of the DOCK AND REPAIR list costs, in words, from the row's own `cost` (the table CAMP_YARD, src/data_controls.js), live: 'hull' is mending the hull now ('30 ore, 4 s', short '30 ore', or 'hull sound'); 'ward' is the nearest
// ship you protect that is hurt and near ('10 ore'), '' when none is; '' for a row with no cost (card space-game-repair-with-ore)
const campPanelCost = (C, row, short) => {
  const k = row.cost, K = CAMP.mend; if (!k || !C || !C.carrier) return '';
  if (k === 'hull') { const q = campMendQuote(C); return q.missing <= 0.5 ? 'hull sound' : q.cost + ' ore' + (short || C.docked ? '' : ', ' + Math.max(1, Math.round(K.hullSecs * q.missing / C.carrier.maxHp)) + ' s'); }
  if (k === 'ward') { const u = typeof campWardsNear === 'function' ? campWardsNear(C)[0] : null; return u ? campWardQuote(C, u).cost + ' ore' : ''; }
  if (k === 'missiles') { const q = campReloadPlan(C); return q.ore + ' ore' + (short ? '' : ', ' + q.n + (q.n === 1 ? ' missile' : ' missiles')); } // the rack R would build now: what it spends ('60 ore, 3 missiles', short '60 ore'; src/campmissilebuild.js)
  return '';
};
function campPanelState(C, row) {
  if (row.who) return campSelIs(C, row.who) ? 'picked' : ''; // the fleet pick: what is picked now says so
  if (row.fri) return campFriNumbered(C).some(e => e.number === row.fri && e.picked) ? 'picked' : '';
  if (row.cost) return campPanelCost(C, row); // a yard row: what it costs (now)
  switch (row.id) {
    case 'fmine': { const out = campWing(C, 'fighter').length; return out || !(C.bay.fighters > 0) ? out + ' fighters out' : C.bay.fighters + ' in the bay'; } // pilots in the bay take the order by launching (card space-game-keys-orders)
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length); // the convoy orders: the one in force is marked (src/campconvoy.js)
    case 'emergency': return CAMP.emergency.ore + ' ore: the shields fill at once';
    case 'dock': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? 'dock at ' + n.o.name : ''; } // the outpost in range
    case 'goal': { const g = campNavGoal(C); if (!g) return ''; const d = Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y), far = row.fast === 'auto' && d >= CAMP.nav.auto.leg && !campNavHostileNear(C); return g.name + '  ' + campNavKm(d) + ' km' + (C.nav && C.nav.on && C.nav.name === g.name ? ', flying there' : far ? ', burns' : ''); } // the cruiser list's goal row says whether it will burn by itself: on a long clear leg it does, the wing out or aboard
    case 'target': { const tg = campPanelTarget(C); return tg ? tg.name + '  ' + tg.km + ' km' + (C.nav && C.nav.on && C.nav.name === tg.name ? ', flying there' : '') : ''; } // (card space-game-keys3-repair: the autopilot's line left the top left of the screen, so the rows say it)
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
  if (row.who) return campSelIs(C, row.who) ? 'picked' : '';
  if (row.fri) return campFriNumbered(C).some(e => e.number === row.fri && e.picked) ? 'picked' : '';
  if (row.cost) return campPanelCost(C, row, true);
  switch (row.id) {
    case 'fmine': { const out = campWing(C, 'fighter').length; return out || !(C.bay.fighters > 0) ? out + ' out' : C.bay.fighters + ' in bay'; }
    case 'dock': { const n = typeof campOutpostNear === 'function' ? campOutpostNear(C) : null; return n ? n.o.name : ''; }
    case 'goal': { const g = campNavGoal(C); return g ? campNavKm(Math.hypot(g.x - C.carrier.x, g.y - C.carrier.y)) + ' km' : ''; }
    case 'target': { const tg = campPanelTarget(C); return tg ? tg.km + ' km' : ''; }
    case 'emergency': return CAMP.emergency.ore + ' ore';
    case 'blink': return campPanelBlinkWord(C);
    case 'ctuck': case 'chold': case 'crun': case 'ccarry': return campPanelConvoyMarked(C, row) ? 'in force' : campPanelShips(campConvoyShips(C).length);
  }
  return '';
}
function campPanelRowState(C, row) {
  const ok = () => ({ ok: true, state: campPanelState(C, row), short: campPanelShortState(C, row) }), no = (why, sh) => ({ ok: false, state: CAMP_PANELS.why[why] || CAMP_PANELS.why.what, short: CAMP_PANELS.shortWhy[sh || why] || CAMP_PANELS.shortWhy.what });
  if (row.open) return ok(); // a part's row is always open to go into
  if (row.who) { if (campSelList(C).some(e => e.id === row.who)) return ok(); const fl = typeof campCockpitFlown === 'function' ? campCockpitFlown(C) : null; return fl && row.who === CAMP_SELPILOT + fl.squad ? no('flying') : no('nopilot'); } // a pilot who is lost or home is no stop of the pick; the one whose fighter he flies is no stop either, and the row says so (the digits do not move)
  if (row.fri) return campFriNumbered(C).some(e => e.number === row.fri && e.alive) ? ok() : no('nofriend'); // a ship that is lost: its number is dark
  if (row.formup && typeof campCockpitFlown === 'function' && campCockpitFlown(C)) { const r = campCockpitCome(C, 'key', true); return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; }
  if (row.formup) { const r = campSelOrder(C, 'formup', 'key', true); return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; }
  if (row.wing) { const r = campWingOrder(C, row.wing[0], row.wing[1], null, 'key', true); return r.ok ? ok() : { ok: false, state: campPanelWhy(r), short: campPanelShortWhy(r) }; }
  if (row.fly === 'objective') {
    const f = campNavFind(C, 'the objective'); if (!f.row) return no('nogoal');
    return campNavCheck(C, 'the objective').ok ? ok() : no('there');
  }
  if (row.fly === 'target') {
    const tr = typeof campHeldRow === 'function' ? campHeldRow(C) : null; if (!tr) return no('notarget');
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
  return campPanelList(C, id).map(row => { const part = row.open ? campPanelDef(row.open) : null; return Object.assign({ id: row.id, label: row.formup && typeof campCockpitFlown === 'function' && campCockpitFlown(C) ? uiText('camp.corner.comehere') : row.who ? campSelLabel(row.who) : row.fri ? campFriLabel(C, row.fri) : row.label, key: part ? part.key : row.cap && CAMP_KEYS[row.cap] ? CAMP_KEYS[row.cap].k : '', more: !!part, marked: row.who ? campSelIs(C, row.who) : row.fri ? campFriNumbered(C).some(e => e.number === row.fri && e.picked) : campPanelConvoyMarked(C, row) }, campPanelRowState(C, row)); });
}
function campPanelView(P, C) {
  const id = campPanelOpen(P), def = campPanelDef(id); if (!def || !C) return null;
  const show = Math.max(1, CAMP_PANELS.show | 0);
  if (P.pick) { // a target sub-list: the candidates, over the list it came from
    const items = campPickSync(C, P.pick);
    if (items.length) {
      campPanelScroll(P.pick, items.length); const pk = P.pick, all = items.map(i => campPickRow(C, i, pk.kind)), num = (r, i) => def.numbers && pk.top + i < 9 ? Object.assign({}, r, { num: pk.top + i + 1 }) : r; // a numbered list's candidates carry their numbers too (1 to 9)
      return { id, title: uiText('camp.ui.cand.title.' + pk.kind), key: def.key, side: def.side, parent: id, pick: true, numbers: !!def.numbers, last: Math.min(9, all.length), keys: def.numbers ? 'camp.ui.candnums' : 'camp.ui.cand.keys', rows: all.slice(pk.top, pk.top + show).map(num), at: def.numbers ? -1 : pk.at - pk.top, first: pk.top, total: all.length, above: pk.top, below: Math.max(0, all.length - pk.top - show) };
    }
    P.pick = null; // none is left: the list it came from
  }
  const all = campPanelRows(C, id); campPanelScroll(P, all.length);
  const keys = def.numbers ? 'camp.ui.listnums' : P.trail && P.trail.length ? 'camp.ui.listkeyback' : def.parent ? 'camp.ui.listkeysub' : 'camp.ui.listkeys'; // the foot's words: Esc closes a list its own key opened, and goes back from one a part's row opened; a numbered list says its digits
  return { id, title: def.title, key: def.key, side: def.side, parent: def.parent || '', pick: false, numbers: !!def.numbers, last: Math.min(9, all.length), keys, rows: all.slice(P.top, P.top + show).map((r, i) => def.numbers && P.top + i < 9 ? Object.assign({}, r, { num: P.top + i + 1 }) : r), at: def.numbers ? -1 : P.at - P.top, first: P.top, total: all.length, above: P.top, below: Math.max(0, all.length - P.top - show) };
}

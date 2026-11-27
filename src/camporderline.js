// ---------- The order as a sentence (card space-game-orders-f1-sentence; Troy, 27 Nov 2026: mock F, step 1 of 5, display only) ----------
// W picks WHO (a pilot, or All pilots), E and ] pick the one TARGET, Enter does what fits (campSelOrder 'engage'): an enemy picked, the pilots attack it; a friendly picked, they guard it; nothing picked, they form up on the cruiser
// (or on the fighter he flies). This reads that back, left to right, as the keys land: WHO in white, the verb in mint, the target in white ("Wedge  attack  Raider 3"), a check after Enter. A word that is the game's default and not a pick
// (All pilots, the cruiser) is grey. The words are TODAY'S real Enter result (the dry run of campSelOrder), so they are true; no key and no rule changes. On the picked target in the world a small tip says the same: "Wedge will attack".
//   campOrderLine(C)        the sentence now: { who: { t, ghost }, verb: { t, kind: 'attack' | 'guard' | 'formup' }, target: { t, ghost, kind: 'hostile' | 'friendly' | 'cruiser' | 'fighter' }, ok (the Enter would be taken), why (its refusal in words),
//                           pick: true when WHO or the target is a pick of the player's, tip: { id (the target ship, or ''), text } }, or null with no cruiser
//   campOrderLineNow(C)     what the screen shows: null (nothing to say), or the sentence with a (0 to 1: the squares' own clock, src/camptarget.js campMarkNow: 1 for CAMP.mark.show ms after a pick or an order, then a fade) and check (true for
//                           CAMP.orderLine.check ms after an order was carried out). It shows only while WHO or the target is a pick, or just after an order (Enter with nothing picked forms up: "All pilots  form up  Cruiser  ✓").
//                           Called once a frame by the page HUD (src/camppagehud.js) and by the scene's tip (campOrderLineTipSync); it keeps its own last-look note per game, so the check is found once.
//   F2 (card space-game-orders-f2-q-row): a Q order read back the same way: after a digit of the Q row the line says "I  fly to the goal  ✓" (campOrderLineNow(C, P) reads the rows the list lit, P.lit); campOrderRowShort(id, flown) is a row's short word for the row beside Q (src/camppagehud.js).
// The words are the corner's own (camp.corner.enter.attack, .guard, camp.corner.formup, camp.sel.all, a pilot's name, the target's name, camp.corner.cruiser); the one new line is the tip, camp.corner.orderline.tip. Pure: tests/camporderline.mjs.
const CAMP_ORDERLINE_STATE = new WeakMap();
const campOrderLineLower = t => String(t || '').toLowerCase();
const campOrderLineCruiser = () => { const t = typeof uiText === 'function' ? uiText('camp.corner.cruiser') : 'Cruiser'; return t.charAt(0) + t.slice(1).toLowerCase(); }; // (the corner's title is CRUISER: written as a word)

function campOrderLine(C) {
  if (!C || !C.carrier || typeof campSelOrder !== 'function' || typeof campSelNow !== 'function') return null;
  const w = campSelNow(C), h = typeof campHeldNow === 'function' ? campHeldNow(C) : null, e = campSelOrder(C, 'engage', 'key', true) || {}; // (the dry run: today's real Enter; nothing is carried out)
  const kind = e.formup ? 'formup' : e.verb === 'attack' ? 'attack' : 'guard';
  const verb = uiText(kind === 'attack' ? 'camp.corner.enter.attack' : kind === 'guard' ? 'camp.corner.enter.guard' : 'camp.corner.formup');
  const f = kind === 'formup' && typeof campCockpitFlown === 'function' ? campCockpitFlown(C) : null; // flying a fighter, nothing picked: the others form up on HIM
  const target = kind === 'formup' ? (f ? { t: typeof campSelLabel === 'function' && f.squad ? campSelLabel(CAMP_SELPILOT + f.squad) : f.kind, ghost: true, kind: 'fighter' } : { t: campOrderLineCruiser(), ghost: true, kind: 'cruiser' }) : { t: h ? h.name : '', ghost: false, kind: h ? h.kind : 'friendly' };
  const who = { t: w ? String(w.label || w.name || '') : '', ghost: !w || w.kind !== 'pilot' };
  return { who, verb: { t: campOrderLineLower(verb), kind }, target, ok: e.ok !== false, why: e.ok === false && e.say ? String(e.say) : '', pick: !who.ghost || !!h,
    tip: h && h.unit && e.ok !== false ? { id: h.id, text: uiText('camp.corner.orderline.tip', { who: who.t, verb: campOrderLineLower(verb) }) } : { id: '', text: '' } };
}

// the Q order just given: a list that runs a row and has it TAKEN notes it in P.did ({ id, at }; a refusal is not noted), so a new P.did is an order (the first look is not news); the row's words, read back
function campOrderLineQ(C, P, st, t) {
  if (!P || typeof campPanelList !== 'function') return;
  const sig = P.did ? P.did.id + '@' + P.did.at : '';
  if (st.sig === undefined) { st.sig = sig; return; } // the first look: an order given before it is not news
  if (sig === st.sig) return; st.sig = sig; if (!P.did) return;
  const row = campPanelList(C, 'cruiser').find(r => r.id === P.did.id); if (row) st.q = { at: t, label: String(row.label || ''), id: row.id };
}
// a row of the Q list as a word or two for the row beside the Q badge (card space-game-orders-f2-q-row: Goal, Target, Mine, Dock, Repair, Shields, Form up; flown, the last is Come here); '' for a row with no short word (its full label is used)
function campOrderRowShort(id, flown) { const k = 'camp.corner.qrow.' + (id === 'formup' && flown ? 'come' : id), t = typeof uiText === 'function' ? uiText(k) : k; return t && t !== k ? t : ''; }
function campOrderLineNow(C, P) {
  const L = campOrderLine(C); if (!L) return null;
  const t = typeof campMarkClock === 'function' ? campMarkClock(C) : +(C && C.t) || 0, n = typeof campMarkOrders === 'function' ? campMarkOrders(C) : 0;
  const wk = String(C.sel || ''), hk = String(C.tgt || '') + '|' + String(C.fsel || '');
  let st = CAMP_ORDERLINE_STATE.get(C); if (!st) { st = { n, gaveAt: -1e9, wk, hk, pickAt: -1e9, sig: undefined, q: null }; CAMP_ORDERLINE_STATE.set(C, st); }
  if (n > st.n) st.gaveAt = t; st.n = n; // an order was carried out since the last look
  if (wk !== st.wk || hk !== st.hk) { st.wk = wk; st.hk = hk; st.pickAt = t; } // a pick since the last look
  campOrderLineQ(C, P, st, t);
  const age = t - st.gaveAt, K = CAMP.orderLine, M = CAMP.mark, m = typeof campMarkNow === 'function' ? campMarkNow(C) : { who: 1, held: 1 };
  const qa = st.q ? t - st.q.at : -1; // a Q order just given, newer than any pick or Enter: the line says "I  fly to the goal  ✓"
  if (st.q && qa >= 0 && qa < M.show + M.fade && st.q.at >= st.pickAt && st.q.at >= st.gaveAt) return { who: { t: uiText('camp.corner.orderline.i'), ghost: false }, verb: { t: campOrderLineLower(st.q.label), kind: 'q' }, target: { t: '', ghost: false, kind: '' }, ok: true, why: '', pick: true, tip: { id: '', text: '' }, a: qa < M.show ? 1 : 1 - (qa - M.show) / M.fade, check: qa < K.check, q: true };
  const recent = age >= 0 && age < M.show + M.fade, a = Math.max(m.who, m.held);
  if (!(a > 0) || !(L.pick || recent)) return null;
  return Object.assign(L, { a, check: age >= 0 && age < K.check });
}

// the scene's half: the tip on the picked target, one small text over it, the same words as the line ("Wedge will attack"), in the strength of the squares; kept in scene.hud (a scene that starts again makes its own)
function campOrderLineTipSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, V = scene.hud; if (!C || !cam || !V) return;
  const L = scene.mode === 'play' && !scene.mp && CAMP.orderLine.tip ? campOrderLineNow(C) : null, u = L && L.tip.id && C.by ? C.by[L.tip.id] : null;
  let t = V.orderTip; if (!L || !u || u.hp <= 0) { if (t && t.visible) t.setVisible(false); return; }
  if (!t || (t.active === false && !t.scene)) t = V.orderTip = scene.add.text(0, 0, '', uiFont(11, '#e6edf7', { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0.5, 1).setDepth(9);
  const z = cam.zoom > 0 ? cam.zoom : 1, word = L.tip.text + (L.check ? ' ✓' : '');
  if (typeof campLabel === 'function') campLabel(t, word, '#e6edf7'); else if (t.text !== word) t.setText(word);
  t.setScale(1 / z).setAlpha(L.a).setPosition(u.x, u.y - ((u.r || 14) + 18) / z).setVisible(true); // the same size on the screen at any zoom, above the ship
}

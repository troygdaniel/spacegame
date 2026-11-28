// ---------- The cards of the Campaign scene in the new look, the pure half: what each card shows for a state (piece a of the new screens; card space-game-screens-a-cards) ----------
// The pause, the mission won card (the debrief), the mission lost card, the level won card, the Earth refit, the tech pick and the end card, as the mock draws them (docs/screens-mock.html, second round included): page panels
// over the paused or finished flight, a few words, key chips read from the key table (src/screens.js scrChip), numbers where a sentence was. This file only says WHAT is shown, as a small tree of nodes (a card, rows, texts,
// chips, pills, meters, rings, stats, tiles); src/scrcardsdraw.js draws a tree with the panel host (src/scrhost.js) and src/campaignscene.js asks for it while the switch is on (scrOn(): CAMP.flags.screens). Pure: no Phaser, no page.
// Nothing here changes a rule, a key, a number or a sound: the words that are SPOKEN are still the old keys (camp.l*.after.*, camp.lose.*, camp.end.*), said by the scene as before; these words are shown only (scr.card.*,
// scr.tech.*, scr.b.*: content/text/scrcards.md).
//   scrNode builders      scrTextN, scrChipN, scrPillN, scrMeterN, scrRingN, scrStatN, scrRowN, scrColN, scrTileN, scrKeyWordN, scrCardN   a node is { k: kind, ... , kids: [...] }
//   scrNodeWords(n)       the words and numbers a tree shows, counted as the mock counts them (a chip's cap, a pill's tick and its text, a ring's number): scrWithin(screen, tree) holds it to src/screens.js's budget
//   scrBonusText(b)       a bonus objective in its short form ("Under 6:40", "No ships lost"; the new scr.b.* keys, the old camp.b.* stay for the screens of today)
//   scrTipSegments(...)   a lose tip split into words and key chips (campLoseLines passes it sentinels for the {key..} placeholders)
//   scrPauseModel(C, o)   the pause card;  scrWonModel(C, P, o): the mission won card (the debrief);  scrLostModel(C, why): the mission lost card;  scrLevelWonModel(C, P, level, resumed): the level won card
//   scrRefitModel(o) and scrPickModel(o): the Earth refit and the plain tech pick (the same tiles);  scrEndModel(): the end card
const scrClock = secs => { const t = Math.max(0, Math.round(secs)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const scrNum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const scrHas = k => typeof UI_TEXT === 'object' && UI_TEXT !== null && Object.prototype.hasOwnProperty.call(UI_TEXT, k);
const SCRC = { sentinel: '\u0001' }; // a lose tip's key placeholders are filled with this and the id, then cut at them (scrTipSegments)

// ---- the nodes ----
const scrTextN = (cls, text, tone) => ({ k: 'text', cls, text: String(text == null ? '' : text), tone: tone || '' });   // cls: lab, t1, t2, t3, sm
const scrChipN = id => { const c = scrChip(id); return c ? { k: 'chip', id: c.id, cap: c.k } : null; };                 // a key chip: the table's cap (null for a role the table has not: the card draws none); ghost (set by the caller): drawn invisible, keeping its room
const scrPillN = (text, ok, o) => Object.assign({ k: 'pill', text: String(text == null ? '' : text), ok: ok === undefined || ok === null ? null : !!ok }, o);   // o.lead: a number in front (o.leadTone its colour); o.tone
const scrMeterN = (frac, tone) => { const m = scrMeter(frac, { tone }); return { k: 'meter', pct: m.pct, tone: tone || m.tone }; };
const scrRingN = (frac, tone, text, size) => { const r = scrRing(frac, { tone, text }); return { k: 'ring', v: r.v, tone: r.tone, text: r.text, size: size || '' }; };
const scrStatN = (label, value) => ({ k: 'stat', label: String(label), value: String(value) });
const scrRowN = (kids, o) => Object.assign({ k: 'row', kids: (kids || []).filter(Boolean) }, o);                          // o: just ('end', 'ctr', 'sp'), wrap, gap (em), push (margin-left:auto)
const scrColN = (kids, o) => Object.assign({ k: 'col', kids: (kids || []).filter(Boolean) }, o);
const scrTileN = (kids, o) => Object.assign({ k: 'tile', kids: (kids || []).filter(Boolean) }, o);                        // o: on (the picked one), dim, grow (flex-basis in em), fit (as wide as its words: it never shrinks)
const scrKeyWordN = (id, word) => { const c = scrChipN(id); return c ? scrRowN([c, scrTextN('lab', word)]) : null; };       // a chip and what it does
const scrScreenN = (id, kids) => ({ k: 'screen', id, kids: (kids || []).filter(Boolean) });                                 // a whole screen: its kids carry their own place (o.at: { left, top, right, bottom, transform }, o.bare: no panel)
const scrRuleN = () => ({ k: 'rule' });
const scrCardN = (id, o, kids) => Object.assign({ k: 'card', id, kids: (kids || []).filter(Boolean) }, o);                 // o: w (em), top (percent), gap (em), ctr, deep (a darker panel with the picture behind it blurred and dimmed: the mission pick's tiles)
function scrNodeWords(n) { // the words and numbers a tree shows
  if (!n || typeof n !== 'object') return 0;
  let w = 0;
  if (n.k === 'text') w += scrWords(n.text);
  else if (n.k === 'chip') w += scrWords(n.cap);
  else if (n.k === 'pill') w += scrWords(n.text) + (n.lead ? scrWords(n.lead) : 0) + (n.ok === null || n.ok === undefined ? 0 : 1);
  else if (n.k === 'ring') w += scrWords(n.text);
  else if (n.k === 'stat') w += scrWords(n.label) + scrWords(n.value);
  else if (n.k === 'star') w += scrWords(n.text);
  (n.kids || []).forEach(c => { w += scrNodeWords(c); });
  return w;
}

// ---- the short bonus lines ----
function scrBonusText(b) { // b: { type, secs, n, pct } as campBonuses gives it (src/campaign.js) or the row's bonus: a bonus that allows none of something says so
  const none = 'scr.b.no' + b.type, one = 'scr.b.' + b.type + '.one';
  if (!b.n && scrHas(none)) return uiText(none);
  return uiText(b.n === 1 && scrHas(one) ? one : 'scr.b.' + b.type, { time: scrClock(b.secs | 0), n: b.n, pct: b.pct }); // "Lose 1 ship at most", not "1 ships"
}

// ---- a lose tip: words and chips ----
function scrTipFill() { const f = {}; if (typeof CAMP_KEYS === 'object') Object.keys(CAMP_KEYS).forEach(id => { f['key' + id] = SCRC.sentinel + id + SCRC.sentinel; }); return f; } // {keyfriendlies} and the others, as markers
function scrTipSegments(text) { // a text with markers -> [{ text } | { chip: id }]: the punctuation that only wrapped a key ("(E)", "E, then Enter.") goes
  const parts = String(text || '').split(new RegExp(SCRC.sentinel + '([a-z]+)' + SCRC.sentinel)), out = [];
  parts.forEach((p, i) => {
    if (i % 2) { out.push({ chip: p }); return; }
    const t = p.replace(/^[\s,.;:)(]+/, '').replace(/[\s,;(.)]+$/, '').replace(/\s+/g, ' ');
    if (t) out.push({ text: t });
  });
  return out;
}

// ---- the pause ----
function scrPauseModel(C, o) { // o: { mission: a mission has a restart, debug: the debug line (or '') }
  o = o || {};
  const g = C && typeof campPageHudGoal === 'function' ? campPageHudGoal(C) : null, kids = [scrTextN('t1', uiText('scr.card.paused'))];
  if (g) kids.push(scrRowN(g.frac == null ? [scrTextN('lab', g.label, 'gold'), scrTextN('t3', g.value)] : [scrTextN('lab', g.label, 'gold'), scrMeterN(g.frac, 'gold'), scrTextN('t3', g.value)], { full: true }));
  kids.push(scrRowN([scrKeyWordN('close', uiText('scr.card.resume')), o.mission ? scrKeyWordN('restart', uiText('scr.card.restart')) : null, scrKeyWordN('help', uiText('scr.card.keys')), scrKeyWordN('settings', uiText('scr.card.settings')), scrKeyWordN('hub', uiText('scr.card.readyroom')), scrKeyWordN('title', uiText('scr.card.title'))], { wrap: true, just: 'ctr', gap: 0.9 })); // K: the ready room (card space-game-b13-a3-a9-pause-settings), the word the lost card already has
  if (o.debug) kids.push(scrTextN('sm', o.debug, 'amber'));
  return scrCardN('pause', { w: 30, top: 30, gap: 1, ctr: true }, kids);
}

// ---- the mission won card (the debrief) ----
function scrRankGroup(P) { // the rank as a ring (the way to the next rank, the number inside) and its name; Promoted when this mission took the pilot up
  try {
    const s = campRankStatus(P), k = campRank(P), frac = s.next === null ? 1 : Math.max(0, Math.min(1, (s.points - k.at) / Math.max(1, s.next - k.at)));
    return scrRowN([scrRingN(frac, 'gold', s.n, '2.6em'), scrColN([scrTextN('lab', uiText(P && P.promo ? 'scr.card.promoted' : 'scr.card.rank'), 'gold'), scrTextN('t3', s.name)], { gap: 0 })], { push: true });
  } catch (e) { return null; }
}
function scrWonModel(C, P, o) { // o: { sc: the score, title: the mission's name, replay: { first, improved, best } | null, tuned: true for a tuned run, mdone: the level is done (the level card is next) }
  o = o || {}; const sc = o.sc || (C && typeof campScore === 'function' ? campScore(C) : {}), R = o.replay || null;
  const hp = C && C.carrier ? Math.round(100 * C.carrier.hp / Math.max(1, C.carrier.maxHp)) : 100, stats = [scrStatN(uiText('scr.card.time'), scrClock(sc.t | 0)), scrStatN(uiText('scr.card.hull'), hp + '%'), scrStatN(uiText('scr.card.shipslost'), sc.shipsLost | 0)];
  if ((sc.haulersLost | 0) > 0) stats.push(scrStatN(uiText('scr.card.haulerslost'), sc.haulersLost | 0));
  if (sc.flown === true) stats.push(scrStatN(uiText('scr.card.ownkills'), sc.ownKills | 0)); // the kills he made himself in a fighter he flew (card space-game-b10-c14-won-kills; BRIEF 10 chunk 14): shown only when he took the stick
  if (o.tuned === true) stats.push(scrPillN(uiText('scr.card.notkept'), null, { tone: 'amber', push: true })); else stats.push(scrRankGroup(P));
  const kids = [
    scrRowN([scrColN([scrTextN('lab', uiText(R ? 'scr.card.replay' : 'scr.card.complete'), 'ok'), scrTextN('t2', o.title || '')], { gap: 0.1 }), scrTextN('t1', scrNum(sc.score | 0), 'gold')], { just: 'sp' }),
    R ? scrRowN([scrPillN(uiText('scr.card.best', { best: scrNum(R.best | 0) }), null), R.improved || R.first ? scrPillN(uiText('scr.card.newbest'), true) : null], { gap: 0.5 }) : null,
    scrRowN((sc.bonuses || []).map(b => scrPillN(scrBonusText(b), !!b.ok)), { wrap: true, gap: 0.5 }),
    scrRowN(stats, { gap: 1.6 }),
    scrRowN([scrKeyWordN('pick', uiText(o.mdone ? 'scr.card.continue' : 'scr.card.readyroom'))], { just: 'end' })];
  return scrCardN('won', { w: 36, top: 14, gap: 1 }, kids);
}

// ---- the mission lost card ----
function scrLostModel(C, why, o) { // o: { mission: a mission of the list (else a level), level }
  o = o || {}; const L = C && C.L, ms = o.mission !== undefined ? !!o.mission : !!(L && L.objectives), fill = scrTipFill();
  const lines = typeof campLoseLines === 'function' ? campLoseLines(C, why, fill) : [uiText('camp.lose.' + why)], cause = lines[0] || '', tip = lines.length > 2 ? lines[2] : '', segs = tip ? scrTipSegments(tip) : [];
  const kids = [
    scrColN([scrTextN('lab', ms ? uiText('scr.card.missionlost') : uiText('scr.card.levellost', { n: o.level != null ? o.level : (C && C.level) || 1 }), 'pink'), scrTextN('t2', cause)], { gap: 0.1 }),
    scrRowN([scrPillN(C ? scrClock(C.t / 1000) : '0:00', null), scrPillN(uiText(C && C.kills === 1 ? 'scr.card.kills.one' : 'scr.card.kills', { n: C ? C.kills | 0 : 0 }), null)]),
    segs.length ? scrTileN([scrTextN('lab', uiText('scr.card.nexttime'), 'gold'), scrRowN(segs.map((s, i) => s.chip ? (scrChipN('tip' + s.chip) || scrTextN('t3', (CAMP_KEYS[s.chip] || {}).k || s.chip)) : scrTextN(i === 0 ? 't3' : 'sm', s.text)))]) : null,
    scrRowN([scrKeyWordN('pick', uiText('scr.card.again')), scrKeyWordN('close', uiText('scr.card.readyroom')), scrKeyWordN('title', uiText('scr.card.title'))], { just: 'end' })]; // Esc: back to the ready room (docs/screens-flow.html step 4)
  return scrCardN('lost', { w: 36, top: 26, gap: 0.9 }, kids);
}

// ---- the level won card ----
function scrLevelWonModel(C, P, level, resumed) {
  const L = (typeof CAMP === 'object' && CAMP.levels[level]) || {}, story = typeof campStory === 'function' ? campStory(level, 'after', !!(P && P.revealed)) : [], convoys = ((C && (C.L || CAMP.levels[C.level])) || {}).convoys || [];
  const t = C && C.t != null ? Math.max(0, Math.round(C.t / 1000)) : 0, hp = C && C.carrier ? Math.round(100 * C.carrier.hp / Math.max(1, C.carrier.maxHp)) : 100;
  const stats = resumed || !C ? [] : [scrStatN(uiText('scr.card.time'), scrClock(t)), scrStatN(uiText('scr.card.hull'), hp + '%'), convoys.length ? scrStatN(uiText('scr.card.haulershome'), (C.delivered | 0) + ' / ' + convoys.length) : null, scrStatN(uiText('scr.card.shipslost'), C.lostShips | 0)];
  const next = L.refit ? 'scr.card.earthrefit' : typeof campTechChoices === 'function' && campTechChoices(level, P).length ? 'scr.card.technology' : 'scr.card.next';
  const kids = [
    scrColN([scrTextN('lab', uiText('scr.card.levelwon', { n: level }), 'ok'), scrTextN('t1', L.name || ''), story[0] ? scrTextN('sm', story[0]) : null], { gap: 0.1 }),
    stats.length ? scrRowN(stats, { gap: 1.6 }) : null,
    scrRowN([scrKeyWordN('pick', uiText(next))], { just: 'end' })];
  return scrCardN('lvlwon', { w: 36, top: 22, gap: 1 }, kids);
}

// ---- the Earth refit and the tech pick ----
function scrTechNodes(id, P) { // what a technology changes, as a meter or short pills with its numbers (CAMP_HUB_TECHVARS, src/camphub.js: the same numbers the ready room's refit says in words)
  const t = typeof CAMP === 'object' && CAMP.tech ? CAMP.tech[id] : null, f = typeof CAMP_HUB_TECHVARS === 'object' ? CAMP_HUB_TECHVARS[id] : null; if (!t || !f) return [];
  let v; try { v = f(t, P); } catch (e) { return []; }
  const pill = k => scrPillN(uiText('scr.tech.' + id + '.' + k, v), null);
  if (id === 'shield') return [scrRowN([scrTextN('lab', uiText('scr.tech.shield.lab')), scrMeterN((v.to | 0) / Math.max(1, v.from | 0), 'blue'), scrTextN('t3', uiText('scr.tech.shield.val', { pct: v.to }))])];
  const parts = { beam: ['dmg', 'reach', 'through'], blink: ['hop', 'ready'], plating: ['hull'], bay2: ['wing'], repair: ['rate', 'reach'], overdrive: ['speed'], lens: ['sense'] }[id] || [];
  return parts.length ? [scrRowN(parts.map(pill), { wrap: true, gap: 0.4 })] : [];
}
const scrDigitId = i => 'd' + (i < 3 ? i + 1 : i + 3); // the refit's keys: 1 2 3, then 6 7 8 for what was looted (4 buys a fighter)
function scrTechTiles(choices, P, cur, digit) { // cur: the lit one (the bright outline)
  return (choices || []).map((id, i) => scrTileN([scrRowN([scrChipN(digit(i)), scrTextN('t3', uiText('camp.tech.' + id + '.name'))])].concat(scrTechNodes(id, P)), { on: cur === i, grow: 14, gap: 0.5 }));
}
// what the keys do on these cards, always on the card (card space-game-refit-card-stuck: the Continue chip came only after a pick and the pick card had none, so Enter did nothing and nothing said so): Left Right choose, Enter takes the lit one (or buys on the fighter row)
const scrChoiceKeys = (onF, withFighter) => scrRowN([scrRowN([scrChipN('left'), scrChipN('right'), scrTextN('lab', uiText('scr.hub.choose'))]), scrKeyWordN('pick', uiText(onF ? 'scr.hub.buy' : 'scr.card.take'))], { just: 'end', gap: 1.4 });
function scrRefitModel(o) { // o: { choices: [tech ids], cur: the lit choice (a technology, or the fighter row after them), pick: the chosen id (cur follows it when none is given), f: fighters bought on this card, w: { ore, credits } the cruiser has, P }
  o = o || {}; const w = o.w || { ore: 0, credits: 0 }, B = CAMP.refit, funds = (w.credits | 0) + (w.ore | 0), can = (o.f | 0) < B.most && funds >= B.fighterCost, n = (o.choices || []).length;
  const cur = o.cur != null ? o.cur : Math.max(0, (o.choices || []).indexOf(o.pick)), onF = cur >= n;
  const kids = [
    scrRowN([scrTextN('t2', uiText('scr.card.refit')), scrRowN([scrPillN(uiText('scr.card.credits'), null, { lead: scrNum(w.credits | 0), leadTone: 'gold' }), scrPillN(uiText('scr.card.ore'), null, { lead: scrNum(w.ore | 0), leadTone: 'gold' })])], { just: 'sp' }),
    scrTextN('lab', uiText('scr.card.chooseone'), 'gold'),
    scrRowN(scrTechTiles(o.choices, o.P, cur, scrDigitId), { wrap: true, stretch: true }),
    scrTileN([scrRowN([scrRowN([scrChipN('d4'), scrTextN('t3', uiText('scr.card.fighter'))]), scrRowN([(o.f | 0) > 0 ? scrPillN(uiText('scr.card.bought', { n: o.f | 0 }), null) : null, scrTextN('t3', B.fighterCost, 'gold'), scrTextN('sm', uiText('scr.card.fightercost'))])], { just: 'sp' })], { dim: !can, on: onF }),
    scrChoiceKeys(onF)];
  return scrCardN('earthrefit', { w: 44, top: 12, gap: 1 }, kids);
}
function scrPickModel(o) { // the plain pick after the later levels: the tiles with their digits 1 to 6; a digit takes one at once, the arrows move the light and Enter takes the lit one
  o = o || {}; const cur = o.cur != null ? o.cur : 0;
  return scrCardN('tech', { w: 44, top: 14, gap: 1 }, [scrTextN('t2', uiText('scr.card.choose')), scrRowN(scrTechTiles(o.choices, o.P, cur, i => 'd' + (i + 1)), { wrap: true, stretch: true }), scrChoiceKeys(false)]);
}

// ---- the end card ----
function scrEndModel(lines, star) { // lines: camp.end.1 to .3 (campEnding), star: the star's name
  return scrCardN('end', { w: 40, top: 20, gap: 1.2, ctr: true }, [scrTextN('lab', uiText('scr.card.warnotover'), 'gold')].concat((lines || []).map(l => scrTextN('t2', l)), [star ? { k: 'star', text: String(star).toUpperCase() } : null, scrRowN([scrKeyWordN('pick', uiText('scr.card.title'))], { just: 'end', full: true })]));
}

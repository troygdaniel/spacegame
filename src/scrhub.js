// ---------- The ready room and its screens in the new look, the pure half: what the next-mission card, the refit, the rank and the mission pick show for a state (piece c of the new screens; card space-game-screens-c-hub) ----------
// The mock is docs/screens-mock.html (direction A for the ready room): page panels over the dimmed hangar, a few words, one number a row, the keys as chips read from the key table. This file says WHAT is shown, as the small
// tree of nodes of src/scrcards.js (scrNode builders; src/scrcardsdraw.js scrView draws it); src/scrhubdraw.js mounts it over the ready room scene (src/camphubscene.js) while the switch is on (scrOn(): CAMP.flags.screens).
// It reads the pure hub (src/camphub.js: campHubBoard, campHubBrief, campHubRefit, campHubRank ...) and changes nothing in it: the keys, the rows, the prices and the saves are the hub's own, as they were.
//   scrReadyModel(P, H, o)    the next-mission card: the station and level, Esc Title; the mission with its goal line and the L Briefing chip; the three rows with their one number; the pilots as rings
//   scrHubRefitModel(P, H, o) the refit: credits and ore pills, the fighter row with the wing as a meter, the tech fitted, Enter Buy, Backspace Undo, Left Back
//   scrHubRankModel(P)        the rank: a ring, the name, the points to the next, the six ranks as tiles with the ships each adds
//   scrHubPickModel(P, H, o)  the mission pick: nine tiles in rows of a level (lit, Next, dim, dashed when skipped), the bar with the chosen mission's goal line, its bonus count, +250 each and par
//   scrHubModel(P, H, o)      the one for what is open (H.open: '' the ready room, 'board', 'refit', 'rank')
const scrMissionNo = (level, i) => campHubLevels().filter(l => l < level).reduce((a, l) => a + campMissions(l).length, 0) + (i | 0) + 1; // the place of a mission in the whole campaign (1.1 is 1, 2.1 is 4)
const scrPilotNames = () => (typeof CAMP === 'object' && Array.isArray(CAMP.pilots) ? CAMP.pilots : []).map(p => p.name);
function scrWingCap() { // the biggest wing there can be: the bay, the second bay, what the refit adds, the top rank's ships (the wing meter's full scale)
  const top = (CAMP.ranks || []).reduce((a, r) => Math.max(a, r.fighters | 0), 0);
  return CAMP.pilotStrength + ((CAMP.tech && CAMP.tech.bay2 && CAMP.tech.bay2.fighters) | 0) + (CAMP.refit.most | 0) + top;
}
const scrHubRowIds = H => (H && H.rows && H.rows.length ? H.rows : CAMP_HUB.rows);
const scrHubDigit = (H, id) => 'd' + (scrHubRowIds(H).indexOf(id) + 1); // a row's digit chip: its place (the keys of the hub: 1 to 4 pick the row)
const scrHubMsg = o => (o && o.msg && o.msg.text ? scrTextN('sm', o.msg.text, o.msg.ok ? 'ok' : 'amber') : null);

// ---- the ready room ----
function scrReadyModel(P, H, o) { // o: { station: the dock's name, msg: { text, ok }, oldNote: tell an older save once }
  o = o || {}; const t = campHubTarget(P, H), b = campHubBrief(P, t.level, t.i), nx = campHubNext(P), id = scrHubRowIds(H)[H.row] || '', all = campHubAll(), no = scrMissionNo(t.level, t.i);
  const tag = uiText(t.skipped ? 'scr.hub.skippedmission' : t.replay ? 'scr.hub.replay' : 'scr.hub.next', { n: no, all }), rk = campHubRank(P);
  const note = { board: uiText('scr.hub.notemissions', { done: campHubFlown(P), all }), refit: uiText('scr.hub.notecredits', { credits: Math.max(0, Math.floor(P.credits || 0)) }), rank: rk.ranked ? rk.name : uiText('scr.hub.points', { n: rk.points }) };
  const items = ['board', 'refit', 'rank'].filter(k => scrHubRowIds(H).indexOf(k) >= 0).map(k => scrTileN([scrRowN([scrChipN(scrHubDigit(H, k)), scrTextN('t3', uiText('scr.hub.' + { board: 'missions', refit: 'refit', rank: 'rank' }[k])), scrTextN('sm', note[k])])], { flat: true, on: id === k, click: 'row:' + scrHubRowIds(H).indexOf(k) }));
  const lines = b ? b.lines : [];
  const bar = scrCardN('ready.bar', { bare: true, at: { left: '1.4em', right: '1.4em', top: '1.2em' }, gap: 0 }, [scrRowN([scrRowN([scrTextN('lab', o.station || ''), scrTextN('dim', '·'), scrTextN('lab', uiText('scr.hub.level', { n: nx.level, name: CAMP.levels[nx.level].name }))]), scrKeyWordN('close', uiText('scr.card.title'))], { just: 'sp', full: true })]);
  const card = scrCardN('ready', { w: 40, top: 20, gap: 1 }, [
    scrRowN([scrColN([scrTextN('lab', tag, 'gold'), scrTextN('t1', b ? b.title : ''), lines[0] ? scrTextN('sm', lines[0]) : null], { gap: 0.2 }), scrColN([scrKeyWordN('launch', uiText('scr.hub.briefing')), id === 'launch' ? scrKeyWordN('pick', uiText('scr.hub.launch')) : null], { gap: 0.3, ctr: true })], { just: 'sp' }),
    scrRuleN(),
    scrRowN(items.concat([id && id !== 'launch' ? Object.assign(scrKeyWordN('pick', uiText('scr.hub.open')), { push: true }) : null]), { gap: 0.6 }),
    o.oldNote ? scrTextN('sm', uiText('scr.hub.oldsave'), 'amber') : null, scrHubMsg(o)]);
  const pilots = scrCardN('ready.pilots', { row: true, at: { left: '50%', bottom: '8%', transform: 'translateX(-50%)' }, gap: 1 }, scrPilotNames().map((n, i) => scrRingN(1, 'good', i + 1)).concat([scrColN([scrTextN('lab', uiText('scr.hub.pilots')), scrTextN('sm', scrPilotNames().join(', '))], { gap: 0.15 })]));
  return scrScreenN('ready', [bar, card, pilots]);
}

// ---- the refit ----
function scrHubRefitModel(P, H, o) {
  o = o || {}; const r = campHubRefit(P), it = r.items[0], B = CAMP.refit, wing = r.wing.fighters, bought = r.extra.fighters, full = bought >= B.most, funds = typeof campWealth === 'function' ? campWealth(P) : r.ore + r.credits;
  const status = it.ok ? uiText('scr.hub.can') : full ? uiText('scr.hub.most') : uiText('scr.hub.need', { n: Math.max(0, it.cost - funds) });
  const techs = r.techs.map(t => scrTileN([scrTextN('t3', t.name)].concat(scrTechNodes(t.id, P)), { flat: true, grow: 1 })), chips = scrRowN([scrKeyWordN('pick', uiText('scr.hub.buy')), scrKeyWordN('giveback', uiText('scr.hub.undo')), scrKeyWordN('left', uiText('scr.hub.back'))]);
  return scrScreenN('refit', [scrCardN('refit', { w: 34, top: 22, gap: 1 }, [
    scrRowN([scrTextN('t2', uiText('scr.hub.refit')), scrRowN([scrPillN(uiText('scr.card.credits'), null, { lead: scrNum(r.credits), leadTone: 'gold' }), scrPillN(uiText('scr.card.ore'), null, { lead: scrNum(r.ore), leadTone: 'gold' }), bought > 0 ? scrPillN(uiText('scr.card.bought', { n: bought }), null) : null])], { just: 'sp' }),
    scrTileN([scrRowN([scrColN([scrTextN('t3', uiText('scr.hub.fighter')), scrRowN([scrTextN('lab', uiText('scr.hub.wing', { n: wing })), scrMeterN(Math.min(1, wing / Math.max(1, scrWingCap())), 'blue'), scrTextN('lab', wing + 1)], { width: 16 })], { gap: 0.3 }), scrRowN([scrTextN('t3', it.cost, 'gold'), scrTextN('sm', status)])], { just: 'sp' })], { on: true }),
    scrHubMsg(o)].concat(techs.length ? [scrRowN(techs, { gap: 0.6 }), scrRowN([chips], { just: 'end' })] : [scrRowN([scrTextN('sm', uiText('scr.hub.notech'), 'dim'), chips], { just: 'sp' })]))]);
}

// ---- the rank ----
function scrHubRankModel(P) {
  const r = campHubRank(P), k = typeof campRank === 'function' ? campRank(P) : { at: 0 };
  const frac = r.next == null ? 1 : Math.max(0, Math.min(1, (r.points - k.at) / Math.max(1, r.next - k.at)));
  const head = r.ranked ? scrRowN([scrRingN(frac, 'gold', r.n, '4.6em'), scrColN([scrTextN('lab', uiText('scr.hub.rankof', { n: r.n, of: r.of }), 'gold'), scrTextN('t1', r.name), scrTextN('sm', r.next != null ? uiText('scr.hub.togo', { n: scrNum(Math.max(0, r.next - r.points)), name: r.nextName }) : uiText('scr.hub.top'))], { gap: 0.2 })], { gap: 1.2 }) : scrTextN('t2', uiText('scr.hub.points', { n: scrNum(r.points) }));
  return scrScreenN('rank', [scrCardN('rank', { w: 44, top: 20, gap: 1.1 }, [head,
    r.ladder.length ? scrRowN(r.ladder.map(l => scrTileN([scrTextN('sm', l.name), scrTextN('t3', uiText('scr.hub.plus', { n: l.fighters }))], { on: l.here, ctr: true, grow: 1 })), { gap: 0.5 }) : null,
    scrRowN([scrTextN('sm', uiText('scr.hub.wingnote'), 'dim'), scrKeyWordN('left', uiText('scr.hub.back'))], { just: 'sp' })])]);
}

// ---- the mission pick ----
function scrHubPickModel(P, H, o) { // o: { msg }
  o = o || {}; const sel = campHubSelectable(P), cur = sel[Math.max(0, Math.min(sel.length - 1, H.cur | 0))] || null, pk = H.pick, board = campHubBoard(P);
  const levels = campHubLevels().map(level => {
    const L = board.filter(r => !r.head && r.level === level);
    return scrRowN([Object.assign(scrTextN('lab', uiText('scr.hub.levelrow', { n: level, name: CAMP.levels[level].name })), { w: 11 })].concat(L.map(r => {
      const at = sel.findIndex(s => s.level === r.level && s.i === r.i), isCur = !!cur && cur.level === r.level && cur.i === r.i, isPick = !!pk && pk.level === r.level && pk.i === r.i;
      const tag = r.state === 'next' ? scrTextN('lab', uiText('scr.hub.nexttag'), 'gold') : r.state === 'passed' ? scrTextN('lab', uiText('scr.hub.skipped'), 'dim') : r.state === 'done' ? scrTextN('lab', scrNum(r.score), 'gold') : null;
      return scrTileN([scrRowN([scrTextN('t3', r.title), scrRowN([isPick ? scrTextN('lab', uiText('scr.hub.replaytag'), 'ok') : null, tag], { gap: 0.5 })], { just: 'sp' }), scrTextN('lab', uiText('camp.hub.kind.' + r.kind))], { on: isCur, dim: r.state === 'later', dash: r.state === 'passed', click: at >= 0 ? at : undefined, grow: 1 });
    })), { gap: 0.7 });
  });
  const b = cur ? campHubBrief(P, cur.level, cur.i) : null, n = b ? b.bonus.length : 0, pts = typeof CAMP === 'object' ? CAMP.score.bonus : 250;
  const count = !b ? null : cur.state === 'done' ? scrTextN('lab', uiText(n === 1 ? 'scr.hub.bonusesdone.one' : 'scr.hub.bonusesdone', { got: (cur.bonus | 0), n })) : scrTextN('lab', uiText(n === 1 ? 'scr.hub.bonuses.one' : 'scr.hub.bonuses', { n }));
  const top = scrCardN('pick.top', { bare: true, at: { left: '6%', right: '6%', top: '5%' }, gap: 0 }, [scrRowN([scrTextN('t2', uiText('scr.hub.missions')), scrRowN([scrChipN('up'), scrChipN('down'), scrTextN('lab', uiText('scr.hub.choose')), scrKeyWordN('pick', uiText('scr.hub.briefing')), scrKeyWordN('left', uiText('scr.hub.back'))])], { just: 'sp', full: true })]);
  const grid = scrCardN('pick.grid', { bare: true, at: { left: '6%', right: '6%', top: '15%' }, gap: 0.9 }, levels);
  const bar = scrCardN('pick.bar', { row: true, at: { left: '6%', right: '6%', bottom: '6%' }, gap: 1 }, [scrRowN([scrColN([scrTextN('t3', b ? b.title : ''), b && b.lines[0] ? scrTextN('sm', b.lines[0]) : null, scrHubMsg(o)], { gap: 0.25 }), scrRowN([count, scrPillN(uiText('scr.hub.each', { pts }), null), scrTextN('lab', uiText('scr.hub.par', { time: scrClock(b ? b.par : 0) }))])], { just: 'sp', full: true })]);
  return scrScreenN('pick', [top, grid, bar]);
}

function scrHubModel(P, H, o) {
  const open = H && H.open && !(o && o.dock) ? H.open : '';
  return open === 'board' ? scrHubPickModel(P, H, o) : open === 'refit' ? scrHubRefitModel(P, H, o) : open === 'rank' ? scrHubRankModel(P) : scrReadyModel(P, H, o);
}

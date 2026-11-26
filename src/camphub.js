// ---------- Campaign: the hub, the ready room between missions (card space-game-campaign-hub; Troy, 20 Nov 2026) ----------
// "I do like how the pilots start out in the space station" (X-Wing). Between missions the cruiser is docked and the pilot stands in the ready room: the MISSIONS (the next mission, the ones flown and their
// scores; Enter on one opens its briefing), the REFIT (the ore, the tech, the wing; ore buys extra ships), the RANK, and LAUNCH. A debrief returns here; the Campaign state (localStorage longhaul.campaign,
// campProgressSave) is saved at every debrief (campaignscene.js missionWon) and at every purchase here. This file is the PURE half (no Phaser, no page; tests/camphub.mjs runs it in Node): the rows, what
// each shows, and the keys. src/camphubscene.js draws the room (Long Haul's station hall: src/interior.js and src/stationlook.js) and gives it the keys and the clicks.
//   The keys (card space-game-ready-room-simple; Troy, 21 Nov 2026): the menu is the four rows; the right side says in a sentence or two what the chosen row is. Enter (or Right) on Missions, Refit or Rank
//   OPENS IT as an overlay that takes the top of the screen; Up and Down move in the overlay's list (the same on every one), Enter does the thing on the choice, Left or Esc closes it. Launch launches.
//     1 to 4 pick the row (and close an overlay)   Up Down (W S) move the row   Enter or Right open it   L launches from anywhere   Esc closes the overlay, and with none open leaves for the title (T too)
//     in the Missions overlay: Up Down (or a click on a mission) choose a mission, Enter (R, or a second click on it) picks it and opens its briefing (a mission done is a replay; a SKIPPED one, [-], is flown the same way and its first win is kept: card space-game-replay-reselect-bug),
//       X goes back to the next mission; the last row, Start the campaign over, asks on Enter and does it on the second Enter (any other key takes it back)
//     in the Refit overlay: Up Down choose, Enter buys (or F a fighter), Backspace gives the last one back; each choice shows what it changes (with the numbers), its cost and what you have
//   campHubNew(P, opts)            the state the scene keeps: { row, rows, last, open (the row whose overlay is up, or ''), sel (the refit's choice), cur (the Missions cursor), pick (the replay chosen), ask (Start over has asked) }; opts: { rows: [ids], at: the id to start on }
//   campHubRows(P, ids)            the rows (the five, or ids) with the live note of each: [{ id, n, name, note }]
//   THE ROWS ARE DATA: a row is an id with its words (camp.hub.row.<id>, camp.hub.foot.<id>), a note (CAMP_HUB.note[id](P)), what Enter does on it (CAMP_HUB.act[id]: an action, or nothing to go on to the next row),
//   its own keys (CAMP_HUB.rowKey[id](H, P, code, res), for a dock's rows) or its overlay (CAMP_HUB.over[id]: the list, the cursor, what Enter does, its own keys; not in a dock's room) and its page and stand in the scene (CAMP_HUBS.page[id], .stops[id], .face[id], src/camphubscene.js). The room is opened with scene data { rows, at, station:
//   { name, accent, art }, onLaunch(scene), onLeave(scene) }: a dock at an outpost (card space-game-campaign-outposts) registers its rows (build, repair ...) and opens the same room with them.
//   campHubNext(P)                 the mission the Launch row flies: { level, i }
//   campHubBoard(P)                every level and mission, in order: [{ head: true, level, name, n } | { level, i, n, id, title, kind, state: 'done' | 'next' | 'passed' | 'later', score, bonus, of, tries }]
//   campHubBoardView(rows, max)    the window of the board that fits max lines and holds the next mission
//   campHubBoardHits(P, max)       the lines of that window a mouse click can land on (card space-game-click-mission): [{ line, cur }], the missions done, skipped and next, with the cursor's place among them; never a heading, a later mission or Start over
//   campHubClickMission(H, P, cur) a click on the mission at cursor place cur of the Missions overlay -> the result of a key: the first click moves the cursor (an arrow), a second on the chosen mission is Enter; { used: false } when no such mission, or the overlay is not the Missions
//   campHubBrief(P, level, i)      one mission's briefing: { title, kindText, lines, objectives, kinds, bonus: [{ type, points, text }], par, best, tries }
//   campHubRefit(P)                { ore, techs: [{ id, name, text, change }], wing: { fighters }, extra: { fighters }, most, fc, items }
//   campHubRefitItems(P)           the refit's choices: [{ id: 'fighters', name, change (what it does, in words with the numbers), cost, have, ok (can be bought now), status }]
//   campHubTechChange(id, P)       what a tech changes, in plain words with the numbers of CAMP.tech ("Carrier hull: 600 to 900")
//   campHubRank(P)                 { ranked, name, n, of, points, next, nextName, wing, flown, all }: campRankStatus(P) (the ranks card, src/campranks.js) when it is there, else the plain score
//   campHubBuy(P, what) / campHubGiveBack(P, what)   what: 'fighters'  -> { ok, key, vars }
//   campHubKey(H, P, code, ctx)    one key -> { used, moved, action: '' | 'launch' | 'ready' | 'undock' | 'title', changed, ok, say: { key, vars } | { text } | null }; ctx: the scene's data, handed to a row's keys
//   REPLAYS (card space-game-campaign-replay): on the board A D (or the arrows) choose a mission already done, R makes it the one the Briefing and Launch are for, X goes back to the next mission. campHubDone(P) is the list
//   of missions that can be replayed; campHubTarget(P, H) is the mission Launch flies: the replay picked, else the next one; campHubLaunch(P, H) says { level, mission, via: 'hub', replay }. The story and the progress do not move.
//   campHubLaunch(P)               what the Campaign scene is started with: { level, mission, via: 'hub' }
//   campHubStation(level, mission) the station the level's ready room is: { name, accent, art }; with a mission, the dock where that mission starts gives the name
const CAMP_HUB = {
  rows: ['board', 'refit', 'rank', 'launch'],            // the rows, in order; the digit of a row is its place + 1 (the Briefing row is gone: Enter on a mission opens its briefing)
  stations: {                                            // the station the ready room is at, by level: the belt outpost, the warp station, the last outpost before the home world
    1: { name: 'Occator Works', accent: '#6dff9c', art: 'outpost' },
    2: { name: 'Proxima Gate', accent: '#38e1ff', art: 'station' },
    3: { name: 'Aegir Watch', accent: '#ffb454', art: 'foundry' }
  },
  boardLines: 12,                                        // lines of the mission board shown at once (a level's name is a line): three levels of three missions fit
  actReady: 'ready',                                     // what L does in the hall (card space-game-ready-l-briefing-first): the briefing of the mission Launch flies opens first (a mission with no briefing launches at once); L again, in the briefing, launches (src/campbrief.js). In a dock L is the row's own way out (undock)
  act: { launch: 'launch', board: 'brief' },             // what Enter does on a row, by id: the action the scene carries out; a row with none goes on to the next one (board: INSIDE its overlay, Enter opens the big briefing, src/campbriefdraw.js)
  over: {},                                              // the rows that open an overlay on Enter, by id (filled below, where the helpers are): { len(P) the list's length, get(H) / set(H, i) the cursor, go(H, P, res) what Enter does on the choice, key(H, P, code, res) its own keys }. Not in a dock's room: its rows go on as ever
  note: {},                                              // the live note under a row's name, by id: (P) => text (filled below, where the helpers are)
  rowKey: {}                                             // a row's own keys, by id: (H, P, code, res, ctx) => res when the key was the row's (the refit's F, E, U and Backspace are here)
};

const campHubDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campHubPlain = t => !/^camp\./.test(String(t)); // a string the game has no words for answers its own key
const campHubLevels = () => Object.keys(CAMP.levels).map(Number).filter(n => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
function campHubStation(level, mission) { // mission (optional): the next mission to fly: the room is where it starts, when the level's docks name that place (before 1.1 the Lunar Base, not the works at Ceres)
  const s = CAMP_HUB.stations[level] || CAMP_HUB.stations[1], L = CAMP.levels[level], m = mission != null && L && typeof campMissions === 'function' ? campMissions(level)[mission | 0] : null, at = m && L.docks ? L.docks[m.place] : '';
  return { name: at || s.name, accent: s.accent, art: s.art };
}
// the rows this visit shows: the ids asked for that the table knows (a note is what makes a row known), else the five; at: the id to stand on
const campHubIds = ids => { const ok = (Array.isArray(ids) ? ids : []).filter((id, i, a) => typeof id === 'string' && typeof CAMP_HUB.note[id] === 'function' && a.indexOf(id) === i); return ok.length ? ok : CAMP_HUB.rows.slice(); };
function campHubNew(P, opts) { const rows = campHubIds(opts && opts.rows), at = opts && opts.at ? rows.indexOf(opts.at) : 0; return { row: at > 0 ? at : 0, rows, last: '', open: '', sel: 0, cur: Math.max(0, campHubSelectable(P).findIndex(r => r.state === 'next')), pick: null, ask: false }; } // cur: the board's cursor among the missions that can be picked (the ones done and the next one; it starts on the next); pick: the replay chosen, { level, i }, or null; ask: the Start over row has asked and waits for its second Enter

// the mission the Launch row flies: the one the save says is next, kept inside what exists
function campHubNext(P) {
  const lv = campHubLevels(); let level = P && P.level | 0, i = P && P.mission | 0;
  if (lv.indexOf(level) < 0) level = lv[0] || 1;
  const n = campMissions(level).length; if (i < 0 || i >= n) i = 0;
  if (P && (P.levelDone | 0) === level && level === (P.level | 0)) i = n - 1; // the level is won and its story and pick wait (a tab was closed at the pick): Launch goes to them, not to mission 1
  return { level, i };
}
function campHubTitle(level, i) {
  const t = uiText('camp.m.' + level + '.' + (i + 1) + '.title');
  return campHubPlain(t) ? t : (CAMP.levels[level] ? String(CAMP.levels[level].name) : '');
}
function campHubBonusText(b) { const none = 'camp.b.no' + b.type; return !b.n && Object.prototype.hasOwnProperty.call(UI_TEXT, none) ? uiText(none) : uiText('camp.b.' + b.type, { secs: b.secs, n: b.n, pct: b.pct }); } // a bonus that allows none of something says so ("Lose no miners"), not "Miners lost: 0 or fewer": camp.b.nolost, .noneutrals, .notorpedoes
const campHubResults = P => (P && P.results && typeof P.results === 'object') ? P.results : {};
function campHubFlown(P) { return Object.keys(campHubResults(P)).length; }
function campHubAll() { return campHubLevels().reduce((a, l) => a + campMissions(l).length, 0); }
function campHubTotal(P) { const r = campHubResults(P); return Object.keys(r).reduce((a, k) => a + ((r[k] && r[k].score) | 0), 0); }

// the name of a rank by its index (the ranks card, CAMP.ranks): '' when there are no ranks
const campHubRankName = i => (typeof CAMP === 'object' && CAMP.ranks && CAMP.ranks[i] ? uiText('camp.rank.' + CAMP.ranks[i].id) : '');
// ---- the mission board ----
function campHubBoard(P) {
  const nx = campHubNext(P), res = campHubResults(P), out = [];
  campHubLevels().forEach(level => {
    const ms = campMissions(level);
    out.push({ head: true, level, name: String(CAMP.levels[level].name), n: ms.length });
    ms.forEach((m, i) => {
      const r = res[campResultKey(level, i)] || null, here = level === nx.level && i === nx.i, before = level < nx.level || (level === nx.level && i < nx.i);
      out.push({ level, i, n: i + 1, id: m.id, title: campHubTitle(level, i), kind: m.kind || 'waves', state: here ? 'next' : r ? 'done' : before ? 'passed' : 'later',
        score: r ? r.score | 0 : 0, bonus: r && Array.isArray(r.bonuses) ? r.bonuses.length : 0, of: (m.bonus || []).length, tries: r ? r.tries | 0 : 0, replays: r ? r.replays | 0 : 0, rank: r && Number.isInteger(r.rank) ? campHubRankName(r.rank) : '' });
    });
  });
  return out;
}
// the lines of the board that fit: all of them, or a window of max lines that holds the next mission (and the heading of its level)
function campHubBoardView(rows, max) {
  max = max || CAMP_HUB.boardLines; if (rows.length <= max) return rows.slice();
  const at = Math.max(0, rows.findIndex(r => r.state === 'next')); let a = Math.max(0, Math.min(rows.length - max, at - Math.floor(max / 2)));
  if (a > 0 && !rows[a].head) { const h = rows.slice(0, a + 1).map((r, i) => r.head ? i : -1).filter(i => i >= 0).pop(); if (h != null && h >= 0 && a - h <= 1) a = h; } // start on the heading of the level when it is the line above
  return rows.slice(a, a + max);
}

// ---- replays ----
const campHubDone = P => campHubBoard(P).filter(r => !r.head && r.state === 'done'); // the missions with a result that are not the next one: they can be flown again
// the missions that can be flown from the board besides the next one (card space-game-replay-reselect-bug): the ones done, and the ones SKIPPED (before the next one with no result: a save from an older version, whose
// missions changed under it, or the tune kit's skip). A skipped one is flown like a replay (the story and the progress do not move) and its first win is kept as its result
const campHubFlyable = P => campHubBoard(P).filter(r => !r.head && (r.state === 'done' || r.state === 'passed'));
// the mission Launch flies: the replay picked on the board (if it can still be flown), else the next one the save says. skipped: the pick has no result yet
function campHubTarget(P, H) {
  const pk = H && H.pick, row = pk && campHubFlyable(P).find(r => r.level === pk.level && r.i === pk.i);
  if (row) return { level: pk.level, i: pk.i, replay: true, skipped: row.state === 'passed' };
  const nx = campHubNext(P); return { level: nx.level, i: nx.i, replay: false, skipped: false };
}
// the missions the board's cursor can stand on: the ones done, the ones skipped (they can be flown) and the next one
const campHubSelectable = P => campHubBoard(P).filter(r => !r.head && (r.state === 'done' || r.state === 'passed' || r.state === 'next'));
// the mission under the cursor becomes the one Launch flies: a mission done or skipped is a replay (picked), the next one is the road (nothing picked); the answer says which
function campHubSelect(H, P) {
  const sel = campHubSelectable(P); if (!sel.length) return null;
  H.cur = Math.max(0, Math.min(sel.length - 1, H.cur | 0)); const t = sel[H.cur];
  if (t.state === 'done' || t.state === 'passed') { H.pick = { level: t.level, i: t.i }; return { key: t.state === 'done' ? 'camp.hub.replay.set' : 'camp.hub.skipped.set', vars: { n: t.n, title: t.title } }; }
  H.pick = null; return null;
}
// A save from an older version meets missions that changed: the ones before the next with no result show as skipped. The ready room says so ONCE (src/camphubscene.js campHubOldNote: a flag of its own beside the save, not a key of it; this half has no storage)
const campHubOldSave = P => campHubBoard(P).some(r => !r.head && r.state === 'passed');
// START OVER: the last row of the Missions list. The first Enter asks, the second does it (any other key takes the question back); what is kept is the ending seen
const campHubOverRow = P => campHubSelectable(P).length; // the cursor's place on that row
function campHubStartOver(H, P) {
  const keep = { revealed: P.revealed }, fresh = campProgressNew();
  Object.keys(P).forEach(k => { delete P[k]; }); Object.assign(P, fresh, keep);
  H.cur = Math.max(0, campHubSelectable(P).findIndex(r => r.state === 'next')); H.pick = null; H.ask = false;
}
// the MISSIONS overlay (card space-game-ready-room-simple): Up Down (the model's) move the cursor over the missions done and the next one; Enter or R picks the one under it AND opens its briefing at once (a
// mission done is a replay); X goes back to the next mission. A dock's room has no overlay (nothing there launches a mission)
function campHubBoardGo(H, P, res) {
  const sel = campHubSelectable(P);
  if (!sel.length) { res.ok = false; res.say = { key: 'camp.hub.replay.none', vars: {} }; return res; }
  if ((H.cur | 0) >= sel.length) { // the Start over row: asks first, does it on the second Enter
    if (!H.ask) { H.ask = true; res.ok = false; res.say = { key: 'camp.hub.restart.ask', vars: {} }; return res; }
    campHubStartOver(H, P); res.changed = true; res.say = { key: 'camp.hub.restart.done', vars: {} }; return res;
  }
  H.cur = Math.max(0, Math.min(sel.length - 1, H.cur | 0));
  const say = campHubSelect(H, P); if (say) res.say = say; res.action = CAMP_HUB.act.board; return res;
}
CAMP_HUB.over.board = {
  len: P => campHubSelectable(P).length + (typeof scrOn === 'function' && scrOn() ? 0 : 1), get: H => H.cur | 0, set: (H, i) => { H.cur = i; }, go: campHubBoardGo, // + 1: the Start over row (the new look has none: Troy, 25 Nov 2026, it lives on Settings > Reset as Reset campaign, so the cursor never stands on it)
  key: (H, P, code, res) => {
    if (code === 'KeyR') { res.used = true; return (H.cur | 0) >= campHubOverRow(P) ? res : campHubBoardGo(H, P, res); } // (R opens a briefing: there is none on the Start over row)
    if (code === 'KeyX') { res.used = true; if (H.pick) { H.pick = null; res.say = { key: 'camp.hub.replay.cleared', vars: {} }; } return res; }
    return null;
  }
};
// the mission pick's GRID in the new look (card space-game-screens-arrows-walk; Troy, 26 Nov 2026, playing with the new screens: "all four arrows move round the grid, Enter selects"): the rows are the levels and the columns the missions of a level. Left and Right go to the next tile of the row the cursor can stand on
// (done, skipped, next: the dim ones are skipped over), Up and Down to the row above or below that has one (the same column, else the nearest), and every move stops at an edge. dir: 'left', 'right', 'up' or 'down'. Pure: it moves H.cur (an index into campHubSelectable) and says whether it moved.
function campHubGridMove(P, H, dir) {
  const sel = campHubSelectable(P); if (!sel.length) return false;
  const at = Math.max(0, Math.min(sel.length - 1, H.cur | 0)), cur = sel[at], rowOf = lv => sel.map((s, k) => ({ s, k })).filter(x => x.s.level === lv);
  let to = -1;
  if (dir === 'left' || dir === 'right') { const row = rowOf(cur.level), n = row[row.findIndex(x => x.k === at) + (dir === 'right' ? 1 : -1)]; if (n) to = n.k; }
  else if (dir === 'up' || dir === 'down') {
    const levels = campHubLevels().filter(lv => sel.some(s => s.level === lv)), lv = levels[levels.indexOf(cur.level) + (dir === 'down' ? 1 : -1)];
    if (lv != null) { let best = null; rowOf(lv).forEach(x => { const d = Math.abs(x.s.i - cur.i); if (!best || d < best.d) best = { d, k: x.k }; }); if (best) to = best.k; } // (the nearest column; the lower one when two are as near)
  }
  if (to < 0 || to === at) return false; H.cur = to; return true;
}
// the MOUSE on the Missions overlay (card space-game-click-mission; Troy, 24 Nov 2026): a click on a mission is what the arrows are, a second click on the chosen one is Enter. The lines a click can land on are the
// missions the cursor can stand on (the same rule: done, skipped, next); Start over is left to the keys (Enter asks, a second Enter does it: a stray double click must not wipe a campaign)
function campHubBoardHits(P, max) {
  const sel = campHubSelectable(P);
  return campHubBoardView(campHubBoard(P), max).map((r, line) => { if (r.head) return null; const cur = sel.findIndex(s => s.level === r.level && s.i === r.i); return cur >= 0 ? { line, cur } : null; }).filter(Boolean);
}
function campHubClickMission(H, P, cur) {
  const res = { used: false, moved: false, action: '', changed: false, ok: true, say: null }, sel = campHubSelectable(P), rows = H.rows && H.rows.length ? H.rows : CAMP_HUB.rows;
  if (H.open !== 'board' || rows[H.row] !== 'board' || !Number.isInteger(cur) || cur < 0 || cur >= sel.length) return res; // (another overlay, a place with no mission: nothing)
  H.ask = false; // the Start over question is taken back by anything but its Enter, a click too
  if ((H.cur | 0) === cur) return campHubKey(H, P, 'Enter', {}); // the chosen mission again: Enter
  H.cur = cur; res.used = res.moved = true; return res;
}

// ---- the briefing ----
function campHubBrief(P, level, i) {
  const L = campMissionRow(level, i); if (!L) return null;
  const k = 'camp.m.' + level + '.' + (i + 1) + '.', res = campHubResults(P)[campResultKey(level, i)] || null;
  const need = o => (o.type === 'scan' ? (o.points || []).length : o.type === 'deliver' || o.type === 'caches' || o.type === 'ore' || o.type === 'cashin' ? o.n : // the rim run's mining mission: 120 ore to mine, 100 to sell (the goal read "0 of 1": card space-game-night-hunt-l2-l3)
     o.type === 'hold' ? o.secs : 1) | 0;
  const objectives = (L.objectives || []).map(o => uiText(campObjKey(o, (L.convoys || []).length), { got: o.type === 'ore' ? Math.min(need(o), Math.max(0, (P && P.ore) | 0)) : 0, need: need(o), total: (L.convoys || []).length, secs: need(o) }));
  return {
    level, i, n: i + 1, of: L.missions, id: L.mid, title: campHubTitle(level, i), kind: L.kind, kindText: uiText('camp.hub.kind.' + L.kind),
    lines: [uiText(k + 'b1'), uiText(k + 'b2')].filter(campHubPlain), objectives, kinds: (L.objectives || []).map(o => o.type + (o.type === 'kill' ? '.' + String(o.what).replace(/:.*/, '') : '')), // kinds: the same objectives by kind (scan, deliver, kill.mother ...), for the briefing's pictures
    bonus: (L.bonus || []).map(b => ({ id: b.id, type: b.type, points: CAMP.score.bonus, text: campHubBonusText(b) })), par: L.par || CAMP.score.par,
    best: res ? res.score | 0 : 0, tries: res ? res.tries | 0 : 0
  };
}

// ---- the wing, the refit, the rank ----
// what the next mission starts with: the ranks card says (its rank's extras are in it), else the bay, the second bay tech and the extras the refit bought
function campHubWing(P) {
  try {
    const r = typeof campRankStatus === 'function' ? campRankStatus(P) : null;
    if (r && r.wing && Number.isFinite(r.wing.fighters)) return { fighters: r.wing.fighters | 0 };
  } catch (e) { /* the ranks card's trouble is not the room's */ }
  const b = P.bonus || {};
  return { fighters: CAMP.pilotStrength + (P.techs.indexOf('bay2') >= 0 ? CAMP.tech.bay2.fighters : 0) + (b.fighters | 0) };
}
// what a tech changes, in plain words with the numbers it works from (the words are content/text/readyroom.md, camp.room.tech.<id>; the numbers are CAMP.tech and the carrier's own)
const CAMP_HUB_TECHVARS = {
  shield: t => ({ from: 100, to: Math.round(t.taken * 100) }),
  beam: t => ({ dmg: t.damage, from: CAMP.carrier.pdRange, to: Math.round(CAMP.carrier.pdRange * t.reach) }),
  blink: t => ({ dist: t.dist, secs: Math.round(t.cooldown / 1000) }),
  plating: t => ({ from: CAMP.carrier.hull, to: Math.round(CAMP.carrier.hull * t.hull) }),
  bay2: (t, P) => { const from = P ? campHubWing(P).fighters - (P.techs.indexOf('bay2') >= 0 ? t.fighters : 0) : CAMP.pilotStrength; return { from, to: from + t.fighters }; }, // the bay the pilot really has (the rank's ships and the refit's count are in it: the hunt of levels 2 and 3), before the tech; with no pilot to ask, the table's bare bay
  repair: t => ({ rate: t.rate, reach: t.reach }),
  overdrive: t => ({ from: CAMP.carrier.speed, to: Math.round(CAMP.carrier.speed * t.speed) }),
  lens: t => ({ from: CAMP.anomaly.sense, to: Math.round(CAMP.anomaly.sense * t.sense) })
};
function campHubTechChange(id, P) { // P (optional): the pilot's progress, for the numbers that depend on what he has (the second bay)
  const t = CAMP.tech[id], f = CAMP_HUB_TECHVARS[id]; if (!t || !f) return '';
  let v; try { v = f(t, P); } catch (e) { return ''; }
  const w = uiText('camp.room.tech.' + id, v); return campHubPlain(w) ? w : '';
}
function campHubRefit(P) {
  const b = P.bonus || {};
  return { ore: P.ore | 0, credits: Math.max(0, Math.floor(P.credits || 0)), techs: P.techs.filter(t => CAMP.tech[t]).map(id => ({ id, name: uiText('camp.tech.' + id + '.name'), text: uiText('camp.tech.' + id + '.text'), change: campHubTechChange(id, P) })), wing: campHubWing(P),
      extra: { fighters: b.fighters | 0 }, most: CAMP.refit.most, fc: CAMP.refit.fighterCost, items: campHubRefitItems(P) };
}
// the refit's choices, each with what it changes (the numbers), what it costs, what you have, and whether you can have it now
function campHubRefitItems(P) {
  const b = P.bonus || {}, ore = P.ore | 0, credits = Math.max(0, Math.floor(P.credits || 0)), funds = campWealth(P), w = campHubWing(P), most = CAMP.refit.most; // the refit spends credits first, then ore (campSpend, src/campaign.js: card space-game-credits-apart-from-ore)
  const ship = (id, have, cost) => {
    const n = b[id] | 0, full = n >= most, ok = !full && funds >= cost;
    return { id, name: uiText('camp.room.item.' + id), change: uiText('camp.room.change.' + id, { from: have, to: have + 1 }), cost, have: uiText('camp.room.have.ship', { ore, credits, n, most }), ok,
      status: ok ? uiText('camp.room.can') : full ? uiText('camp.room.most', { most }) : uiText('camp.room.need', { need: cost - funds }) };
  };
    return [ship('fighters', w.fighters, CAMP.refit.fighterCost)];
  }
  const campHubCost = what => CAMP.refit.fighterCost;
function campHubBuy(P, what) {
  if (what !== 'fighters') return { ok: false, key: 'camp.hub.nothing', vars: {} };
  if (!P.bonus) P.bonus = { fighters: 0 };
  const cost = campHubCost(what);
  if ((P.bonus[what] | 0) >= CAMP.refit.most) return { ok: false, key: 'camp.hub.most', vars: { most: CAMP.refit.most } };
  if (!campSpend(P, cost)) return { ok: false, key: 'camp.hub.noore', vars: { need: cost, have: campWealth(P) } }; // credits first, then ore
  P.bonus[what] = (P.bonus[what] | 0) + 1;
  return { ok: true, key: 'camp.hub.boughtf', vars: { cost, ore: P.ore, credits: P.credits } };
}
function campHubGiveBack(P, what) {
  if (!P.bonus) P.bonus = { fighters: 0 };
  if (!(P.bonus[what] | 0)) return { ok: false, key: 'camp.hub.nothing', vars: {} };
  const cost = campHubCost(what); P.bonus[what]--; campRefund(P, cost); // given back as ore while the store has room, the rest as credits (it was ore, cut to the store)
  return { ok: true, key: 'camp.hub.soldf', vars: { cost, ore: P.ore, credits: P.credits } };
}
function campHubRank(P) {
  let st = null; try { st = typeof campRankStatus === 'function' ? campRankStatus(P) : null; } catch (e) { st = null; }
  const ok = !!(st && typeof st.name === 'string' && st.name), total = campHubTotal(P);
  return { ranked: ok, name: ok ? st.name : '', n: ok ? st.n | 0 : 0, of: ok ? st.of | 0 : 0, points: ok && Number.isFinite(st.points) ? st.points | 0 : total, next: ok && Number.isFinite(st.next) ? st.next | 0 : null,
    nextName: ok && st.nextName ? String(st.nextName) : '', wing: campHubWing(P), total, flown: campHubFlown(P), all: campHubAll(),
    ladder: (typeof CAMP === 'object' && Array.isArray(CAMP.ranks) ? CAMP.ranks : []).map((r, i) => ({ name: campHubRankName(i), at: r.at | 0, fighters: r.fighters | 0, here: ok && i + 1 === (st.n | 0) })) }; // ladder: every rank, the points it is held from and the ships it adds to the wing
}

// ---- the rows ----
CAMP_HUB.note.board = P => uiText('camp.hub.note.board', { done: campHubFlown(P), all: campHubAll() });
CAMP_HUB.note.refit = P => uiText('camp.hub.note.refit', { ore: P.ore | 0, credits: Math.max(0, Math.floor(P.credits || 0)) });
CAMP_HUB.note.rank = P => { const rk = campHubRank(P); return rk.ranked ? rk.name : uiText('camp.hub.note.points', { points: rk.points }); };
CAMP_HUB.note.launch = (P, ctx) => { const t = campHubTarget(P, ctx && ctx.hub); return uiText(t.replay && !t.skipped ? 'camp.hub.note.replay' : (P && (P.levelDone | 0) === t.level && t.level === (P.level | 0)) ? 'camp.hub.note.pick' : 'camp.hub.note.launch', { n: t.i + 1 }); };
function campHubRows(P, ids, ctx) { // ctx: the scene's data (a dock passes { dock, camp, P }): what a row's note may read besides the progress
  return campHubIds(ids).map((id, k) => { let note = ''; try { note = String(CAMP_HUB.note[id](P, ctx)); } catch (e) { note = ''; } return { id, n: k + 1, name: uiText('camp.hub.row.' + id), note }; });
}
const campHubFoot = (row, ctx) => { const k = 'camp.hub.dockfoot.' + row, t = ctx && ctx.dock ? uiText(k) : k; return /^camp\./.test(t) ? uiText('camp.hub.foot.' + row) : t; }; // a dock's room has its own foot lines for the rows that go on to another one
const campHubKeyLine = dock => uiText(dock ? 'camp.hub.keys.dock' : 'camp.hub.keys'); // a dock's room has its own line (three rows, L undocks)
const campHubLaunch = (P, H) => { const t = campHubTarget(P, H); return { level: t.level, mission: t.i, via: 'hub', replay: t.replay }; }; // replay: the Campaign scene flies it from its standard start and moves nothing

// ---- the keys ----
// the refit's own keys: F buys a fighter, Backspace gives the last one back. In the hall they are the OVERLAY's (a purchase is always seen with its numbers); a room with no
// overlay for the row (a dock's) has them on the row, as ever
CAMP_HUB.rowKey.refit = (H, P, code, res) => {
  if (code !== 'KeyF' && code !== 'Backspace') return null;
  res.used = true; let r;
  if (code === 'Backspace') { const b = P.bonus || {}, what = H.last && (b[H.last] | 0) > 0 ? H.last : (b.fighters | 0) > 0 ? 'fighters' : ''; r = campHubGiveBack(P, what); }
  else { const what = 'fighters'; r = campHubBuy(P, what); if (r.ok) H.last = what; }
  res.ok = r.ok; res.changed = r.ok; res.say = { key: r.key, vars: r.vars };
  return res;
};
// the REFIT overlay: Up Down choose among the refit's choices (a fighter); Enter buys the one chosen; F Backspace as ever
CAMP_HUB.over.refit = {
  len: () => 1, get: H => H.sel | 0, set: (H, i) => { H.sel = i; },
  go: (H, P, res) => {
    const it = campHubRefitItems(P)[0]; res.used = true; let r; // (one choice now: a fighter)
    r = campHubBuy(P, it.id); if (r.ok) H.last = it.id;
    res.ok = r.ok; res.changed = r.ok; res.say = { key: r.key, vars: r.vars }; return res;
  },
  key: (H, P, code, res) => CAMP_HUB.rowKey.refit(H, P, code, res)
};
// the RANK overlay: nothing to choose or buy, so Up Down and Enter only stand there; Left or Esc closes it
CAMP_HUB.over.rank = { len: () => 0, get: () => 0, set() {}, go: (H, P, res) => res, key: () => null };
const campHubUp = c => c === 'ArrowUp' || c === 'KeyW', campHubDown = c => c === 'ArrowDown' || c === 'KeyS', campHubLeft = c => c === 'ArrowLeft' || c === 'KeyA', campHubRight = c => c === 'ArrowRight' || c === 'KeyD';
function campHubKey(H, P, code, ctx) {
  const rows = H.rows && H.rows.length ? H.rows : CAMP_HUB.rows, n = rows.length, id = rows[H.row] || rows[0], dock = !!(ctx && ctx.dock);
  const res = { used: false, moved: false, action: '', changed: false, ok: true, say: null };
  const ov = !dock && H.open && CAMP_HUB.over[H.open] && H.open === id ? CAMP_HUB.over[H.open] : null; // the overlay that is up (a row picked from outside it closes it)
  if (H.open && !ov) H.open = '';
  const enter = code === 'Enter' || code === 'NumpadEnter', d = campHubDigit(code);
  if (!enter) H.ask = false; // the Start over row's question stands until a key other than Enter
  if (d != null) { if (d >= 1 && d <= n) { H.row = d - 1; H.open = ''; res.used = res.moved = true; } return res; }
  if (ov && H.open === 'board' && typeof scrOn === 'function' && scrOn()) { // the new look's mission pick: a grid, all four arrows move round it (Left no longer closes it and Right no longer opens a briefing: Esc is Back, Enter selects)
    const dir = campHubLeft(code) ? 'left' : campHubRight(code) ? 'right' : campHubUp(code) ? 'up' : campHubDown(code) ? 'down' : '';
    if (dir) { res.used = true; res.moved = campHubGridMove(P, H, dir); return res; }
  }
  const sel = !dock && typeof scrOn === 'function' && scrOn(); // THE NEW SCREENS (card space-game-ready-room-arrows-select; Troy, 26 Nov 2026: "do not use arrow keys to move forward; Enter only. Arrow keys select items on the screen"): every arrow key only moves the highlight, Enter opens, does or goes on, Esc goes back
  if (ov) { // an overlay is up: Esc closes it, Up and Down move in its list, Enter does the thing on the choice, and its own keys (the glass look: Left also closes it and Right also does the thing; the new screens: the arrows only choose)
    if (code === 'Escape' || (!sel && campHubLeft(code))) { H.open = ''; res.used = res.moved = true; return res; }
    if (campHubUp(code) || campHubDown(code) || (sel && (campHubLeft(code) || campHubRight(code)))) { const len = ov.len(P), fwd = campHubDown(code) || campHubRight(code); res.used = true; if (len > 1) { ov.set(H, (ov.get(H) + (fwd ? 1 : len - 1)) % len); res.moved = true; } return res; } // (Left and Right are the previous and the next item too: the refit's techs stand in a row)
    if (enter || (!sel && campHubRight(code))) { res.used = true; ov.go(H, P, res); return res; }
  } else if (sel && (campHubLeft(code) || campHubRight(code) || campHubUp(code) || campHubDown(code))) { // the ready room, new look: the card's Briefing is above a row of three chips (Missions, Refit, Rank): Left and Right go along the row (round the ends), Up goes to the card and Down back to the chip that was lit; none of them opens anything
    const chips = rows.filter(r => r !== 'launch'), top = rows.indexOf('launch'), onTop = id === 'launch'; res.used = true;
    if (campHubLeft(code) || campHubRight(code)) { if (!onTop && chips.length > 1) { H.row = rows.indexOf(chips[(chips.indexOf(id) + (campHubRight(code) ? 1 : chips.length - 1)) % chips.length]); H.chip = H.row; res.moved = true; } }
    else if (campHubUp(code)) { if (!onTop && top >= 0) { H.chip = H.row; H.row = top; res.moved = true; } }
    else if (onTop) { const back = H.chip != null && rows[H.chip] && rows[H.chip] !== 'launch' ? H.chip : rows.indexOf(chips[0]); if (back >= 0) { H.row = back; res.moved = true; } }
    return res;
  } else {
    if (campHubUp(code)) { H.row = (H.row + n - 1) % n; res.used = res.moved = true; return res; }
    if (campHubDown(code)) { H.row = (H.row + 1) % n; res.used = res.moved = true; return res; }
    if (!dock && CAMP_HUB.over[id] && (enter || (!sel && campHubRight(code)))) { H.open = id; res.used = res.moved = true; return res; } // Enter (the glass look: or Right) opens the row as an overlay
    if (enter) {
      res.used = true;
      const act = dock && id === 'board' ? '' : CAMP_HUB.act[id]; // (a dock's room has no mission board to open)
      if (act) res.action = act; else { H.row = (H.row + 1) % n; res.moved = true; }
      return res;
    }
  }
  if (campKeyIs('ready', code)) { const out = rows.find(r => CAMP_HUB.act[r] === 'launch' || CAMP_HUB.act[r] === 'undock'); if (out) { res.used = true; const a = CAMP_HUB.act[out], hall = !(ctx && (ctx.dock || typeof ctx.onLaunch === 'function')); res.action = a === 'launch' && hall ? CAMP_HUB.actReady : a; } return res; } // L: from any row, when the room has a way out: the hall's Launch row shows the briefing first (the briefing's own L launches), a dock's Undock row (or a room that has its own onLaunch) goes out at once
  if (code === 'KeyT' || (code === 'Escape' && !ov)) { res.used = true; res.action = 'title'; return res; }
  const rk = ov ? ov.key : (!dock && CAMP_HUB.over[id]) ? null : CAMP_HUB.rowKey[id]; if (rk) { const r = rk(H, P, code, res, ctx); if (r) return r; }
  return res;
}

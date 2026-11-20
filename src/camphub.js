// ---------- Campaign: the hub, the ready room between missions (card space-game-campaign-hub; Troy, 20 Nov 2026) ----------
// "I do like how the pilots start out in the space station" (X-Wing). Between missions the cruiser is docked and the pilot stands in the ready room: the MISSION BOARD (the next mission, the ones flown and their
// scores), the BRIEFING of the next one, the REFIT (the ore, the tech, the wing; ore buys extra ships), the RANK, and LAUNCH. A debrief returns here; the Campaign state (localStorage longhaul.campaign,
// campProgressSave) is saved at every debrief (campaignscene.js missionWon) and at every purchase here. This file is the PURE half (no Phaser, no page; tests/camphub.mjs runs it in Node): the rows, what
// each shows, and the keys. src/camphubscene.js draws the room (Long Haul's station hall: src/interior.js and src/stationlook.js) and gives it the keys and the clicks.
//   The keys follow the Campaign's panels (key 1 and key 2, card space-game-campaign-keys-help): a digit picks a row, the list stays on screen, a row says what it will do or why it cannot.
//     1 to 5 pick the row (Missions, Briefing, Refit, Rank, Launch)   W S or the arrows move it   Enter goes to the next row, and on Launch launches   L launches from any row   Esc or T leaves for the title
//     on the Refit row: F buys a fighter, E an escort (the ore: CAMP.build prices, at most CAMP.refit.most of each), Backspace gives the last one back
//   campHubNew(P, opts)            the state the scene keeps: { row, rows, last }; opts: { rows: [ids], at: the id to start on }
//   campHubRows(P, ids)            the rows (the five, or ids) with the live note of each: [{ id, n, name, note }]
//   THE ROWS ARE DATA: a row is an id with its words (camp.hub.row.<id>, camp.hub.foot.<id>), a note (CAMP_HUB.note[id](P)), what Enter does on it (CAMP_HUB.act[id]: an action, or nothing to go on to the next row),
//   its own keys (CAMP_HUB.rowKey[id](H, P, code, res)) and its page and stand in the scene (CAMP_HUBS.page[id], .stops[id], .face[id], src/camphubscene.js). The room is opened with scene data { rows, at, station:
//   { name, accent, art }, onLaunch(scene), onLeave(scene) }: a dock at an outpost (card space-game-campaign-outposts) registers its rows (build, repair ...) and opens the same room with them.
//   campHubNext(P)                 the mission the Launch row flies: { level, i }
//   campHubBoard(P)                every level and mission, in order: [{ head: true, level, name, n } | { level, i, n, id, title, kind, state: 'done' | 'next' | 'passed' | 'later', score, bonus, of, tries }]
//   campHubBoardView(rows, max)    the window of the board that fits max lines and holds the next mission
//   campHubBrief(P, level, i)      one mission's briefing: { title, kindText, lines, objectives, bonus: [{ points, text }], par, best, tries }
//   campHubRefit(P)                { ore, techs, wing: { fighters, escorts }, extra: { fighters, escorts }, most, fc, ec }
//   campHubRank(P)                 { ranked, name, n, of, points, next, nextName, wing, flown, all }: campRankStatus(P) (the ranks card, src/campranks.js) when it is there, else the plain score
//   campHubBuy(P, what) / campHubGiveBack(P, what)   what: 'fighters' | 'escorts'  -> { ok, key, vars }
//   campHubKey(H, P, code, ctx)    one key -> { used, moved, action: '' | 'launch' | 'undock' | 'title', changed, ok, say: { key, vars } | { text } | null }; ctx: the scene's data, handed to a row's keys
//   campHubLaunch(P)               what the Campaign scene is started with: { level, mission, via: 'hub' }
//   campHubStation(level)          the station the level's ready room is: { name, accent, art }
const CAMP_HUB = {
  rows: ['board', 'brief', 'refit', 'rank', 'launch'],   // the rows, in order; the digit of a row is its place + 1
  stations: {                                            // the station the ready room is at, by level: the belt outpost, the warp station, the last outpost before the home world
    1: { name: 'Occator Works', accent: '#6dff9c', art: 'outpost' },
    2: { name: 'Proxima Gate', accent: '#38e1ff', art: 'station' },
    3: { name: 'Aegir Watch', accent: '#ffb454', art: 'foundry' }
  },
  boardLines: 12,                                        // lines of the mission board shown at once (a level's name is a line): three levels of three missions fit
  act: { launch: 'launch' },                             // what Enter does on a row, by id: the action the scene carries out; a row with none goes on to the next one
  note: {},                                              // the live note under a row's name, by id: (P) => text (filled below, where the helpers are)
  rowKey: {}                                             // a row's own keys, by id: (H, P, code, res, ctx) => res when the key was the row's (the refit's F, E, U and Backspace are here)
};

const campHubDigit = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(String(code || '')); return m ? +m[1] : null; };
const campHubPlain = t => !/^camp\./.test(String(t)); // a string the game has no words for answers its own key
const campHubLevels = () => Object.keys(CAMP.levels).map(Number).filter(n => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
function campHubStation(level) { const s = CAMP_HUB.stations[level] || CAMP_HUB.stations[1]; return { name: s.name, accent: s.accent, art: s.art }; }
// the rows this visit shows: the ids asked for that the table knows (a note is what makes a row known), else the five; at: the id to stand on
const campHubIds = ids => { const ok = (Array.isArray(ids) ? ids : []).filter((id, i, a) => typeof id === 'string' && typeof CAMP_HUB.note[id] === 'function' && a.indexOf(id) === i); return ok.length ? ok : CAMP_HUB.rows.slice(); };
function campHubNew(P, opts) { const rows = campHubIds(opts && opts.rows), at = opts && opts.at ? rows.indexOf(opts.at) : 0; return { row: at > 0 ? at : 0, rows, last: '' }; }

// the mission the Launch row flies: the one the save says is next, kept inside what exists
function campHubNext(P) {
  const lv = campHubLevels(); let level = P && P.level | 0, i = P && P.mission | 0;
  if (lv.indexOf(level) < 0) level = lv[0] || 1;
  const n = campMissions(level).length; if (i < 0 || i >= n) i = 0;
  return { level, i };
}
function campHubTitle(level, i) {
  const t = uiText('camp.m.' + level + '.' + (i + 1) + '.title');
  return campHubPlain(t) ? t : (CAMP.levels[level] ? String(CAMP.levels[level].name) : '');
}
function campHubBonusText(b) { return b.type === 'lost' && !b.n ? uiText('camp.b.nolost') : uiText('camp.b.' + b.type, { secs: b.secs, n: b.n, pct: b.pct }); }
const campHubResults = P => (P && P.results && typeof P.results === 'object') ? P.results : {};
function campHubFlown(P) { return Object.keys(campHubResults(P)).length; }
function campHubAll() { return campHubLevels().reduce((a, l) => a + campMissions(l).length, 0); }
function campHubTotal(P) { const r = campHubResults(P); return Object.keys(r).reduce((a, k) => a + ((r[k] && r[k].score) | 0), 0); }

// ---- the mission board ----
function campHubBoard(P) {
  const nx = campHubNext(P), res = campHubResults(P), out = [];
  campHubLevels().forEach(level => {
    const ms = campMissions(level);
    out.push({ head: true, level, name: String(CAMP.levels[level].name), n: ms.length });
    ms.forEach((m, i) => {
      const r = res[campResultKey(level, i)] || null, here = level === nx.level && i === nx.i, before = level < nx.level || (level === nx.level && i < nx.i);
      out.push({ level, i, n: i + 1, id: m.id, title: campHubTitle(level, i), kind: m.kind || 'waves', state: here ? 'next' : r ? 'done' : before ? 'passed' : 'later',
        score: r ? r.score | 0 : 0, bonus: r && Array.isArray(r.bonuses) ? r.bonuses.length : 0, of: (m.bonus || []).length, tries: r ? r.tries | 0 : 0 });
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

// ---- the briefing ----
function campHubBrief(P, level, i) {
  const L = campMissionRow(level, i); if (!L) return null;
  const k = 'camp.m.' + level + '.' + (i + 1) + '.', res = campHubResults(P)[campResultKey(level, i)] || null;
  const need = o => (o.type === 'scan' ? (o.points || []).length : o.type === 'deliver' || o.type === 'caches' ? o.n : o.type === 'hold' ? o.secs : 1) | 0;
  const objectives = (L.objectives || []).map(o => uiText('camp.o.' + o.type + (o.type === 'kill' ? '.' + String(o.what).replace(/:.*/, '') : ''), { got: 0, need: need(o), secs: need(o) }));
  return {
    level, i, n: i + 1, of: L.missions, id: L.mid, title: campHubTitle(level, i), kind: L.kind, kindText: uiText('camp.hub.kind.' + L.kind),
    lines: [uiText(k + 'b1'), uiText(k + 'b2')].filter(campHubPlain), objectives,
    bonus: (L.bonus || []).map(b => ({ id: b.id, points: CAMP.score.bonus, text: campHubBonusText(b) })), par: L.par || CAMP.score.par,
    best: res ? res.score | 0 : 0, tries: res ? res.tries | 0 : 0
  };
}

// ---- the wing, the refit, the rank ----
// what the next mission starts with: the ranks card says (its rank's extras are in it), else the bay, the second bay tech and the extras the refit bought
function campHubWing(P) {
  try {
    const r = typeof campRankStatus === 'function' ? campRankStatus(P) : null;
    if (r && r.wing && Number.isFinite(r.wing.fighters) && Number.isFinite(r.wing.escorts)) return { fighters: r.wing.fighters | 0, escorts: r.wing.escorts | 0 };
  } catch (e) { /* the ranks card's trouble is not the room's */ }
  const b = P.bonus || {};
  return { fighters: CAMP.bay.fighters + (P.techs.indexOf('bay2') >= 0 ? CAMP.tech.bay2.fighters : 0) + (b.fighters | 0), escorts: CAMP.bay.escorts + (b.escorts | 0) };
}
// the Fabricator (card space-game-campaign-outposts): a tech bought at a refit with ore, once; the carrier then builds ships anywhere (campCanBuild)
const campHubHasFab = P => P.techs.indexOf('fabricator') >= 0;
function campHubFabricator(P) {
  const cost = CAMP.outpost.fabricator; if (campHubHasFab(P)) return { ok: false, key: 'camp.hub.nothing', vars: {} };
  if ((P.ore | 0) < cost) return { ok: false, key: 'camp.hub.upgrade.no', vars: { need: cost, have: P.ore | 0 } };
  P.ore = (P.ore | 0) - cost; P.techs.push('fabricator'); return { ok: true, key: 'camp.hub.refit.fabbought', vars: { ore: P.ore } };
}
function campHubRefit(P) {
  const b = P.bonus || {};
  return { fab: { owned: campHubHasFab(P), cost: CAMP.outpost.fabricator }, ore: P.ore | 0, techs: P.techs.filter(t => CAMP.tech[t]).map(id => ({ id, name: uiText('camp.tech.' + id + '.name'), text: uiText('camp.tech.' + id + '.text') })), wing: campHubWing(P),
    extra: { fighters: b.fighters | 0, escorts: b.escorts | 0 }, most: CAMP.refit.most, fc: CAMP.build.fighterCost, ec: CAMP.build.escortCost };
}
const campHubCost = what => (what === 'fighters' ? CAMP.build.fighterCost : CAMP.build.escortCost);
function campHubBuy(P, what) {
  if (what !== 'fighters' && what !== 'escorts') return { ok: false, key: 'camp.hub.nothing', vars: {} };
  if (!P.bonus) P.bonus = { fighters: 0, escorts: 0 };
  const cost = campHubCost(what);
  if ((P.bonus[what] | 0) >= CAMP.refit.most) return { ok: false, key: 'camp.hub.most', vars: { most: CAMP.refit.most } };
  if ((P.ore | 0) < cost) return { ok: false, key: 'camp.hub.noore', vars: { need: cost, have: P.ore | 0 } };
  P.ore = (P.ore | 0) - cost; P.bonus[what] = (P.bonus[what] | 0) + 1;
  return { ok: true, key: what === 'fighters' ? 'camp.hub.boughtf' : 'camp.hub.boughte', vars: { cost, ore: P.ore } };
}
function campHubGiveBack(P, what) {
  if (!P.bonus) P.bonus = { fighters: 0, escorts: 0 };
  if (!(P.bonus[what] | 0)) return { ok: false, key: 'camp.hub.nothing', vars: {} };
  const cost = campHubCost(what); P.bonus[what]--; P.ore = Math.min(CAMP.ore.cap, (P.ore | 0) + cost);
  return { ok: true, key: what === 'fighters' ? 'camp.hub.soldf' : 'camp.hub.solde', vars: { cost, ore: P.ore } };
}
function campHubRank(P) {
  let st = null; try { st = typeof campRankStatus === 'function' ? campRankStatus(P) : null; } catch (e) { st = null; }
  const ok = !!(st && typeof st.name === 'string' && st.name), total = campHubTotal(P);
  return { ranked: ok, name: ok ? st.name : '', n: ok ? st.n | 0 : 0, of: ok ? st.of | 0 : 0, points: ok && Number.isFinite(st.points) ? st.points | 0 : total, next: ok && Number.isFinite(st.next) ? st.next | 0 : null,
    nextName: ok && st.nextName ? String(st.nextName) : '', wing: campHubWing(P), total, flown: campHubFlown(P), all: campHubAll() };
}

// ---- the rows ----
CAMP_HUB.note.board = P => uiText('camp.hub.note.board', { done: campHubFlown(P), all: campHubAll() });
CAMP_HUB.note.brief = P => { const nx = campHubNext(P); return campHubTitle(nx.level, nx.i); };
CAMP_HUB.note.refit = P => uiText('camp.hub.note.refit', { ore: P.ore | 0 });
CAMP_HUB.note.rank = P => { const rk = campHubRank(P); return rk.ranked ? rk.name : uiText('camp.hub.note.points', { points: rk.points }); };
CAMP_HUB.note.launch = P => uiText('camp.hub.note.launch', { n: campHubNext(P).i + 1 });
function campHubRows(P, ids, ctx) { // ctx: the scene's data (a dock passes { dock, camp, P }): what a row's note may read besides the progress
  return campHubIds(ids).map((id, k) => { let note = ''; try { note = String(CAMP_HUB.note[id](P, ctx)); } catch (e) { note = ''; } return { id, n: k + 1, name: uiText('camp.hub.row.' + id), note }; });
}
const campHubFoot = (row, ctx) => { const k = 'camp.hub.dockfoot.' + row, t = ctx && ctx.dock ? uiText(k) : k; return /^camp\./.test(t) ? uiText('camp.hub.foot.' + row) : t; }; // a dock's room has its own foot lines for the rows that go on to another one
const campHubKeyLine = () => uiText('camp.hub.keys');
const campHubLaunch = P => { const n = campHubNext(P); return { level: n.level, mission: n.i, via: 'hub' }; };

// ---- the keys ----
// the refit's own keys: F buys a fighter, E an escort, Backspace gives the last one back
CAMP_HUB.rowKey.refit = (H, P, code, res) => {
  if (code !== 'KeyF' && code !== 'KeyE' && code !== 'Backspace' && code !== 'KeyU') return null;
  res.used = true; let r;
  if (code === 'KeyU') { r = campHubFabricator(P); res.ok = r.ok; res.changed = r.ok; res.say = { key: r.key, vars: r.vars }; return res; }
  if (code === 'Backspace') { const b = P.bonus || {}, what = H.last && (b[H.last] | 0) > 0 ? H.last : (b.fighters | 0) > 0 ? 'fighters' : 'escorts'; r = campHubGiveBack(P, what); }
  else { const what = code === 'KeyF' ? 'fighters' : 'escorts'; r = campHubBuy(P, what); if (r.ok) H.last = what; }
  res.ok = r.ok; res.changed = r.ok; res.say = { key: r.key, vars: r.vars };
  return res;
};
function campHubKey(H, P, code, ctx) {
  const rows = H.rows && H.rows.length ? H.rows : CAMP_HUB.rows, n = rows.length, id = rows[H.row] || rows[0];
  const res = { used: false, moved: false, action: '', changed: false, ok: true, say: null };
  const d = campHubDigit(code);
  if (d != null) { if (d >= 1 && d <= n) { H.row = d - 1; res.used = res.moved = true; } return res; }
  if (code === 'KeyW' || code === 'ArrowUp') { H.row = (H.row + n - 1) % n; res.used = res.moved = true; return res; }
  if (code === 'KeyS' || code === 'ArrowDown') { H.row = (H.row + 1) % n; res.used = res.moved = true; return res; }
  if (code === 'Enter' || code === 'NumpadEnter') {
    res.used = true;
    if (CAMP_HUB.act[id]) res.action = CAMP_HUB.act[id]; else { H.row = (H.row + 1) % n; res.moved = true; }
    return res;
  }
  if (code === 'KeyL') { const out = rows.find(r => CAMP_HUB.act[r] === 'launch' || CAMP_HUB.act[r] === 'undock'); if (out) { res.used = true; res.action = CAMP_HUB.act[out]; } return res; } // L: from any row, when the room has a way out (Launch, or Undock in a dock)
  if (code === 'Escape' || code === 'KeyT') { res.used = true; res.action = 'title'; return res; }
  const rk = CAMP_HUB.rowKey[id]; if (rk) { const r = rk(H, P, code, res, ctx); if (r) return r; }
  return res;
}

// ---------- The briefing in the new look, the pure half: one page (piece b of the new screens; card space-game-screens-b-briefing) ----------
// Troy approved the one-page briefing (25 Nov 2026; the mock is docs/screens-mock.html, "Briefing, one page"): the map on the canvas with the route and four NUMBERED MOMENTS on it, the moments named under it, the bonus as pills, the three pilots
// as rings, and the Launch chip. No Why paragraph, no keys legend, no readiness block, and the stepped walk (the walking craft, Enter from stop to stop) is gone. The ship says ONE sentence a mission, the goal line, when the briefing opens.
// This file says WHAT is shown (the node trees of src/scrcards.js; src/scrbriefdraw.js draws them over the ready room and paints the map and the moments on the canvas); it reads src/campbrief.js and src/camphub.js and changes nothing there.
//   scrGoalLine(level, i)        the mission's goal line, the one sentence: scr.m.<level>.<mission>.goal when the mission has one of its own (1.1 and 1.2: new words, recorded by Troy), else its camp.m.<level>.<mission>.b1
//   scrGoalSpoken(level, i)      the same, or '' when the voice has nothing to say (the line is spoken when the briefing opens: scrBriefOpen)
//   campBriefMoments(level, i)   the four moments of a mission: [{ n, kind: 'mute' | 'help' | 'threat' | 'goal', text, at: { x, y } }], from the walk table's row (src/data_briefwalk.js `moments`) and the words scr.bf.<level>.<mission>.<key>; [] when the mission has none yet
//   scrBriefModel(P, bf)         the page: the heading and its chips, the goal line, the moments as tiles with a ring each, the bonus pills and the pilots' rings
const SCRBRIEF = {
  walk: { zoom: 2.4, ms: 520 },                 // Left and Right walk the four moments (card space-game-screens-arrows-walk): the map zooms to this many times the view it was and pans to the moment's mark in this many ms (smoothly, not a jump)
  frame: { x: 51, y: 144, w: 1178, h: 330 },   // px: the map on the page (92 percent of the width, from 20 percent down): the one page's frame; the three-screen briefing's is CAMPBRIEF.frame
  tones: { mute: 0x9fb3c8, help: 0xffc857, threat: 0xff6fa8, goal: 0xe9b872 },   // the colour of a moment's marker on the map (the tile's ring has the same, by name: mute, amber, foe, gold)
  ring: { mute: 'mute', help: 'amber', threat: 'foe', goal: 'gold' }              // a moment's ring in the tile: the page tokens of src/screens.css
};
function scrGoalLine(level, i) {
  const own = 'scr.m.' + level + '.' + ((i | 0) + 1) + '.goal';
  if (scrHas(own)) return uiText(own);
  const B = typeof campHubBrief === 'function' ? campHubBrief({ results: {} }, level, i) : null;
  return B && B.lines[0] ? B.lines[0] : '';
}
const scrGoalSpoken = (level, i) => scrGoalLine(level, i);
// WHERE a moment happens, from the mission's own row, so a moment cannot point at a place the mission no longer has (card space-game-screens-f-briefings): a spec is one of
//   { place }, { spot }, { rival }, { road }, { x, y }            as the walk's (src/campbriefwalk.js campWalkWhere): a place of the level, a neutral ship, a rival, a share of the convoy's road, a point of the world
//   { start }                where the cruiser starts;  { rocks }  the middle of the mission's rock fields;  { caches }  the middle of its caches;  { guards }  the middle of its guards;  { relic }  the relic's place
//   { tower: k }             the place of tower group k;  { scan: k }  scan point k;  { wave: k }  where wave k comes from (its own point, or its place on the road);  { waveWith: 'tboat' }  the first wave with that kind of ship
//   { mid: [spec, spec] }    half way between two;  and any of them with `off: [dx, dy]`: that many px away (so two moments at one place do not sit on each other)
function scrMomentWhere(spec, ctx) {
  const s = spec || {}, L = ctx.L, avg = list => list.length ? { x: list.reduce((a, q) => a + q.x, 0) / list.length, y: list.reduce((a, q) => a + q.y, 0) / list.length } : null;
  let p = null;
  if (s.mid) { const a = scrMomentWhere(s.mid[0], ctx), b = scrMomentWhere(s.mid[1], ctx); p = a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null; }
  else if (s.start) p = ctx.start;
  else if (s.rocks) p = avg((L.rocks || []).map(r => ({ x: r.at[0], y: r.at[1] })));
  else if (s.caches) p = avg((L.caches || []).map(c => ({ x: c[0], y: c[1] })));
  else if (s.guards) p = avg((L.guards || []).map(g => ({ x: g.at[0], y: g.at[1] })));
  else if (s.relic) { const q = L.relic && ctx.pl[L.relic.place]; p = q ? { x: q.x, y: q.y } : null; }
  else if (s.tower != null) { const t = (L.towers || [])[s.tower], q = t && ctx.pl[t.place]; p = q ? { x: q.x, y: q.y } : null; }
  else if (s.scan != null) { const o = (L.objectives || []).find(x => x.type === 'scan'), q = o && (o.points || [])[s.scan]; p = q ? { x: q.at[0], y: q.at[1] } : null; }
  else if (s.wave != null || s.waveWith) {
    const w = s.waveWith ? (L.waves || []).find(x => x.ships && x.ships[s.waveWith] > 0) : (L.waves || [])[s.wave];
    if (w && w.from) p = { x: w.from[0], y: w.from[1] };
    else if (w && w.on && w.on.lane != null && ctx.road) p = campWalkWhere({ road: ((+w.on.lane) * ctx.road.len + (+w.ahead || 0)) / ctx.road.len }, ctx);
  } else p = campWalkWhere(s, ctx);
  return p && s.off ? { x: p.x + s.off[0], y: p.y + s.off[1] } : p;
}
// the numbers a moment's words may name, from the mission's row (so "Hold 14 seconds" is the relic's own 14): {cachesword} two, {guardsword} Seven, {towersword} Four, {wavesword} Two, {hold}, {scansecs}
const scrNumWord = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n | 0] || String(n | 0);
const scrCapital = t => t.charAt(0).toUpperCase() + t.slice(1);
function scrMomentVars(L) {
  const scan = (L.objectives || []).find(o => o.type === 'scan'), caches = (L.objectives || []).find(o => o.type === 'caches'), towers = (L.towers || []).reduce((a, t) => a + (t.n || 1), 0);
  return { cachesword: scrNumWord(caches ? caches.n : (L.caches || []).length), guardsword: scrCapital(scrNumWord((L.guards || []).length)), towersword: scrCapital(scrNumWord(towers)), wavesword: scrCapital(scrNumWord((L.waves || []).filter(w => !w.secret && !w.optional).length)),
    hold: L.relic ? L.relic.hold | 0 : 0, scansecs: scan && scan.points && scan.points[0] ? scan.points[0].secs | 0 : 0 };
}
function campBriefMoments(level, i) {
  const D = typeof CAMPWALKS === 'object' && CAMPWALKS ? CAMPWALKS[level + '.' + ((i | 0) + 1)] : null, list = D && Array.isArray(D.moments) ? D.moments : null; if (!list) return [];
  const L = typeof campMissionRow === 'function' ? campMissionRow(level, i) : null; if (!L) return [];
  let road = null; try { road = typeof campWalkRoad === 'function' ? campWalkRoad(level, i, D) : null; } catch (e) { road = null; }
  const pl = campPlaces(level), st = pl[L.start] || { x: 0, y: 0 }, sa = L.startAt || [0, 0], ctx = { L, pl, road, start: { x: st.x + (sa[0] || 0), y: st.y + (sa[1] || 0) } };
  const vars = Object.assign({}, road && typeof campWalkVars === 'function' ? campWalkVars(road) : {}, scrMomentVars(L));
  return list.map((m, k) => {
    let at = null; try { at = scrMomentWhere(m.at, ctx); } catch (e) { at = null; } // (a road, a wave or a place the mission lacks: nowhere, so left out)
    const key = 'scr.bf.' + level + '.' + ((i | 0) + 1) + '.' + m.key;
    return at && Number.isFinite(at.x) && Number.isFinite(at.y) && scrHas(key) ? { n: k + 1, kind: String(m.kind || 'mute'), text: uiText(key, vars), at } : null;
  }).filter(Boolean).map((m, k) => Object.assign(m, { n: k + 1 }));
}
function scrBriefModel(P, bf) { // bf: { t: { level, i, replay, skipped }, brief: campHubBrief, moments: campBriefMoments }
  const B = bf.brief, t = bf.t, rp = t.replay === true && t.skipped !== true, goal = scrGoalLine(t.level, t.i), moments = bf.moments || [];
  const head = scrCardN('brief.head', { bare: true, at: { left: '4%', right: '4%', top: '4%' }, gap: 0 }, [scrRowN([
    scrColN([scrTextN('lab', uiText(rp ? 'scr.bf.headreplay' : 'scr.bf.head', { n: B.n, kind: B.kindText }), 'gold'), scrTextN('t1', B.title), goal ? scrTextN('sm', goal) : null], { gap: 0.1 }),
    scrRowN([scrChipN('pick'), scrTextN('t3', uiText('scr.hub.launch')), scrChipN('left'), scrChipN('right'), scrTextN('lab', uiText('scr.walk.step')), scrChipN('close'), scrTextN('lab', uiText('scr.hub.back'))])], { just: 'sp', full: true })]);
  const strip = moments.length ? scrCardN('brief.moments', { row: true, bare: true, at: { left: '4%', right: '4%', top: '68%' }, gap: 0.8 }, moments.map(m => scrTileN([scrRowN([scrRingN(1, SCRBRIEF.ring[m.kind] || 'mute', m.n, '1.7em'), scrTextN('t3', m.text)])], { grow: 1, on: bf.step === m.n }))) : null;
  const bonus = scrCardN('brief.bonus', { row: true, bare: true, at: { left: '4%', right: '4%', bottom: '5%' }, gap: 1 }, [scrRowN([
    scrRowN([scrTextN('lab', uiText('scr.bf.bonus'), 'gold')].concat(((typeof campMissionRow === 'function' && (campMissionRow(t.level, t.i) || {}).bonus) || []).map(b => scrPillN(scrBonusText(b), null))), { wrap: true, gap: 0.5 }),
    scrRowN(scrPilotNames().map((n, k) => scrRingN(1, 'good', k + 1, '1.7em')))], { just: 'sp', full: true })]);
  return scrScreenN('brief', [head, strip, bonus]);
}

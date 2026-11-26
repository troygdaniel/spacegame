// ---------- The briefing in the new look, the pure half: one page (piece b of the new screens; card space-game-screens-b-briefing) ----------
// Troy approved the one-page briefing (25 Nov 2026; the mock is docs/screens-mock.html, "Briefing, one page"): the map on the canvas with the route and four NUMBERED MOMENTS on it, the moments named under it, the bonus as pills, the three pilots
// as rings, and the Launch chip. No Why paragraph, no keys legend, no readiness block, and the stepped walk (the walking craft, Enter from stop to stop) is gone. The ship says ONE sentence a mission, the goal line, when the briefing opens.
// This file says WHAT is shown (the node trees of src/scrcards.js; src/scrbriefdraw.js draws them over the ready room and paints the map and the moments on the canvas); it reads src/campbrief.js and src/camphub.js and changes nothing there.
//   scrGoalLine(level, i)        the mission's goal line, the one sentence: scr.m.<level>.<mission>.goal when the mission has one of its own (1.1 and 1.2: new words, recorded by Troy), else its camp.m.<level>.<mission>.b1
//   scrGoalSpoken(level, i)      the same, or '' when the voice has nothing to say (the line is spoken when the briefing opens: scrBriefOpen)
//   campBriefMoments(level, i)   the four moments of a mission: [{ n, kind: 'mute' | 'help' | 'threat' | 'goal', text, at: { x, y } }], from the walk table's row (src/data_briefwalk.js `moments`) and the words scr.bf.<level>.<mission>.<key>; [] when the mission has none yet
//   scrBriefModel(P, bf)         the page: the heading and its chips, the goal line, the moments as tiles with a ring each, the bonus pills and the pilots' rings
const SCRBRIEF = {
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
function campBriefMoments(level, i) {
  const D = typeof CAMPWALKS === 'object' && CAMPWALKS ? CAMPWALKS[level + '.' + ((i | 0) + 1)] : null, list = D && Array.isArray(D.moments) ? D.moments : null; if (!list) return [];
  const L = typeof campMissionRow === 'function' ? campMissionRow(level, i) : null; if (!L) return [];
  let road = null; try { road = typeof campWalkRoad === 'function' ? campWalkRoad(level, i, D) : null; } catch (e) { road = null; }
  const ctx = { L, pl: campPlaces(level), road }, vars = road && typeof campWalkVars === 'function' ? campWalkVars(road) : {};
  return list.map((m, k) => {
    let at = null; try { at = typeof campWalkWhere === 'function' ? campWalkWhere(m.at, ctx) : null; } catch (e) { at = null; } // (a road or a rival place of a mission with no road: nowhere)
    const key = 'scr.bf.' + level + '.' + ((i | 0) + 1) + '.' + m.key;
    return at && scrHas(key) ? { n: k + 1, kind: String(m.kind || 'mute'), text: uiText(key, vars), at } : null;
  }).filter(Boolean).map((m, k) => Object.assign(m, { n: k + 1 }));
}
function scrBriefModel(P, bf) { // bf: { t: { level, i, replay, skipped }, brief: campHubBrief, moments: campBriefMoments }
  const B = bf.brief, t = bf.t, rp = t.replay === true && t.skipped !== true, goal = scrGoalLine(t.level, t.i), moments = bf.moments || [];
  const head = scrCardN('brief.head', { bare: true, at: { left: '4%', right: '4%', top: '4%' }, gap: 0 }, [scrRowN([
    scrColN([scrTextN('lab', uiText(rp ? 'scr.bf.headreplay' : 'scr.bf.head', { n: B.n, kind: B.kindText, par: scrClock(B.par) }), 'gold'), scrTextN('t1', B.title), goal ? scrTextN('sm', goal) : null], { gap: 0.1 }),
    scrRowN([scrChipN('launch'), scrTextN('t3', uiText('scr.hub.launch')), scrChipN('left'), scrTextN('lab', uiText('scr.hub.back'))])], { just: 'sp', full: true })]);
  const strip = moments.length ? scrCardN('brief.moments', { row: true, bare: true, at: { left: '4%', right: '4%', top: '68%' }, gap: 0.8 }, moments.map(m => scrTileN([scrRowN([scrRingN(1, SCRBRIEF.ring[m.kind] || 'mute', m.n, '1.7em'), scrTextN('t3', m.text)])], { grow: 1 }))) : null;
  const bonus = scrCardN('brief.bonus', { row: true, bare: true, at: { left: '4%', right: '4%', bottom: '5%' }, gap: 1 }, [scrRowN([
    scrRowN([scrTextN('lab', uiText('scr.bf.bonus'), 'gold')].concat(((typeof campMissionRow === 'function' && (campMissionRow(t.level, t.i) || {}).bonus) || []).map(b => scrPillN(scrBonusText(b), null))), { wrap: true, gap: 0.5 }),
    scrRowN(scrPilotNames().map((n, k) => scrRingN(1, 'good', k + 1, '1.7em')))], { just: 'sp', full: true })]);
  return scrScreenN('brief', [head, strip, bonus]);
}

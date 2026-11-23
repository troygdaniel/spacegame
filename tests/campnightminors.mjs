// smoke: the night's fixes of the wrap-up's open minors (card space-game-night-fix-minors, docs/WRAPUP.md), each pinned (plain Node, no Chrome)
//   1  a lost mission says "MISSION LOST: <title>" (a won one says MISSION COMPLETE), a level without missions keeps "LEVEL n LOST"
//   2  the refit header names the keys its rows have: 1 2 3, and 6 7 8 for what a cloaked cache gave (4 and 5 buy ships)
//   10 the star of level 3 is "Epsilon Eridani" on the map and in the list (it was "Epsilon Eridani star" on one and cut on the other)
//   11 the edge arrow's label keeps out of the target display's corner (cards one-list-keys, target-display: the two lists are hidden until Q or P, so it keeps out of no list)
//   13 the ship systems' pips (W S E) are clear of the toast band, so no toast, however wide, covers them
// Run: node tests/campnightminors.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));

console.log('1. the lost card names the mission');
const lost = J(`[[1, 1], [2, 2], [3, 0]].map(([n, m]) => { const got = []; const sc = { level: n, mode: '', camp: campNew(n, [], { seed: 1, mission: m }), showCard: (title, lines, hint) => got.push({ title, lines, hint }), say() {} };
  Campaign.prototype.showLost.call(sc, 'carrier'); return { n, m, title: got[0].title, hint: got[0].hint, want: uiText('camp.m.' + n + '.' + (m + 1) + '.title') }; })`);
for (const c of lost) check(`level ${c.n} mission ${c.m + 1}: "MISSION LOST: ${c.want}"`, c.title === 'MISSION LOST: ' + c.want && /mission again/.test(c.hint), c.title);
check('the lost title is the mirror of the won one ("MISSION COMPLETE: <title>")', J(`uiText('camp.ui.debrief', { title: 'X' })`) === 'MISSION COMPLETE: X' && J(`uiText('camp.ui.lostmission', { title: 'X' })`) === 'MISSION LOST: X');
check('a level without missions keeps "LEVEL n LOST" (the stand-in with no camp)', J(`(() => { const got = []; Campaign.prototype.showLost.call({ level: 2, showCard: (t) => got.push(t), say() {} }, 'earth'); return got[0]; })()`) === 'LEVEL 2 LOST');

console.log('2. the refit header lists the keys of its rows');
const hdr = n => J(`(() => { const got = []; const sc = { choices: ${JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f'].slice(0, n))}, refit: { pick: null, f: 0, e: 0, w: { ore: 10, credits: 0 } }, showCard: (t, lines) => got.push(lines) }; Campaign.prototype.paintRefit.call(sc); return got[0]; })()`);
const h3 = hdr(3), h5 = hdr(5), h6 = hdr(6);
check('three techs: "Choose a technology:  1  2  3"', h3[1] === 'Choose a technology:  1  2  3', h3[1]);
check('a looted tech or two: the header says 6 and 7 as the rows do', h5[1] === 'Choose a technology:  1  2  3  6  7' && /^6   /.test(h5[5]) && /^7   /.test(h5[6]), h5[1] + ' | ' + h5[5] + ' | ' + h5[6]);
check('three looted: 6 7 8', h6[1] === 'Choose a technology:  1  2  3  6  7  8', h6[1]);

console.log('3 and 4. the ship\'s computer and the blink say why they do nothing');
g.run(`window.__t = []; window.__toast0 = toast; toast = function (s, m, c) { __t.push(m); };`);
const noKey = J(`(() => { CHAT.key = ''; CHAT.on = true; CHAT.bad = false; shipcompNoKeyAt = 0; const sc = { scene: { key: 'Campaign' }, leaving: false, dead: false }; const game = { scene: { getScenes: () => [sc] } };
  const a = shipcompNoKey(game), first = __t.slice(); shipcompNoKey(game); const again = __t.length; CHAT.key = 'k'; CHAT.on = false; shipcompNoKeyAt = 0; shipcompNoKey(game); CHAT.on = true; CHAT.bad = true; shipcompNoKeyAt = 0; shipcompNoKey(game); CHAT.bad = false;
  sc.panel = true; shipcompNoKeyAt = 0; const n = __t.length; shipcompNoKey(game); return { a, first, again, all: __t.slice(), blocked: __t.length === n }; })()`);
check('I with no chat key puts one toast up: the ship\'s computer needs a chat key, Settings > Keys', noKey.a === true && noKey.first.length === 1 && /chat key/.test(noKey.first[0]) && /Settings > Keys/.test(noKey.first[0]), JSON.stringify(noKey.first));
check('a second press inside two seconds does not say it twice', noKey.again === 1);
check('a chat that is switched off, or a key that was refused, has its own line', noKey.all.length === 3 && /switched off/.test(noKey.all[1]) && /rejected/.test(noKey.all[2]), JSON.stringify(noKey.all));
check('with a card or a panel up the key says nothing (the strip would not open anyway)', noKey.blocked);
g.run('toast = __toast0;');
const bl = J(`(() => { const C = campNew(1, [], { seed: 1 }); const none = campBlinkWhy(C); C.techs = ['blink']; C.blinkAt = 0; C.t = 5000; const cool = campBlinkWhy(C); C.t = campBlinkCooldown(C) + 5000; const ready = campBlinkWhy(C); return { none, cool, ready }; })()`);
check('the blink with no blink technology says so: "No warp blink yet. It is a technology you can pick."', bl.none === 'No warp blink yet. It is a technology you can pick.', bl.none);
check('the blink while it cools says the seconds left', /^The blink is not ready: \d+ s\.$/.test(bl.cool), bl.cool);
check('the blink when it is ready says nothing (the blink goes)', bl.ready === '', JSON.stringify(bl.ready));
const br = J(`(() => { const row = CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.blink), C = campNew(1, [], { seed: 1 }); const inList = campPanelList(C, 'ship').some(r => r.blink); C.input.blink = false; const none = campPanelRun(C, row, 'key'), n1 = C.input.blink;
  C.techs = ['blink']; const listed = campPanelList(C, 'ship').some(r => r.blink); C.blinkAt = 0; C.t = 5000; const cool = campPanelRun(C, row, 'key'), n2 = C.input.blink; C.t = campBlinkCooldown(C) + 5000; const go = campPanelRun(C, row, 'key'); return { inList, listed, none, n1, cool, n2, go, set: C.input.blink }; })()`);
check('the blink is a row of the ship list now ("Warp blink ahead", only with its tech: no key of its own): the row answers with campBlinkWhy, and sets the blink for the next step only when it can go; the scene toasts the answer', br.inList === false && br.listed === true && br.none.ok === false && br.none.say === bl.none && br.n1 === false && br.cool.ok === false && br.cool.say === bl.cool && br.n2 === false && br.go.ok === true && br.go.say === '' && br.set === true && /pr\.ran\) \{ toast\(this, pr\.say/.test(readFileSync(join(ROOT, 'src', 'campaignscene.js'), 'utf8')), JSON.stringify(br));

console.log('10. one name for the star of level 3');
const star = J(`(() => { const pl = campPlaces(3); return Object.keys(pl).filter(k => pl[k].kind === 'star').map(k => pl[k].name); })()`);
check('the star of level 3 is "Epsilon Eridani" (no added word that the list has to cut)', star.length === 1 && star[0] === 'Epsilon Eridani', JSON.stringify(star));
check('the Sun of level 1 is still the Sun', J(`Object.values(campPlaces(1)).some(p => p.kind === 'star' && p.name === 'Sun')`));

console.log('13. the gauges are clear of the toast band');
{
  const Z = J('campHudGeom()'), T = J('TOAST'), W = J('W');
  const band = { x0: W / 2 - (T.w + 2 * T.pad) / 2, x1: W / 2 + (T.w + 2 * T.pad) / 2, y0: T.top, y1: T.bottom };
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const boxes = Z.cells.flatMap(c => [c.dial, c.bar]).concat([Z.hull]);
  check('the widest toast box (552 px, from the band\'s top) does not touch a dial, a power bar or the hull bar (card space-game-systems-gauges replaced the W S E pips)', boxes.every(b => !hit(band, b)), JSON.stringify([Z, band]));
  const src = J(`Campaign.prototype.paintHud.toString()`);
  check('the HUD draws the gauges from src/camphud.js (no literal pips left in paintHud)', /campGaugesPaint/.test(src) && !/CAMP\.hud\.pips/.test(src) && !/fillRect\(366/.test(src));
}
console.log('15. no HUD under a result card');
check('the result modes hide the HUD, flight, brief and pause do not', J(`['won', 'lost', 'debrief', 'refit', 'pick', 'end'].every(m => Campaign.prototype.hudHides.call({ mode: m })) && ['play', 'brief', 'pause', 'intro'].every(m => !Campaign.prototype.hudHides.call({ mode: m }))`));
const hs = J(`(() => { const mk = () => { const o = { vis: true, setVisible(v) { o.vis = v; return o; } }; return o; }; let cleared = 0; const sc = { hud: { obj: mk(), nav: mk(), arrow: mk(), chat: mk() }, hudG: { clear() { cleared++; } }, keysBack: mk() };
  const show = Campaign.prototype.hudShow.bind(sc); show(false); const off = [sc.hud.obj.vis, sc.hud.nav.vis, sc.hud.arrow.vis, sc.keysBack.vis, cleared]; show(false); const twice = cleared; show(true); return { off, twice, on: [sc.hud.obj.vis, sc.hud.nav.vis, sc.hud.arrow.vis, sc.keysBack.vis] }; })()`);
check('hiding clears the gauges and the radar, and hides every text and the key strip', hs.off.slice(0, 4).every(v => v === false) && hs.off[4] === 1 && hs.twice === 1, JSON.stringify(hs));
check('showing it again gives the texts back, and leaves the arrow to its own paint', hs.on[0] === true && hs.on[1] === true && hs.on[3] === true && hs.on[2] === false, JSON.stringify(hs));
check('the scene hides it before it paints (update: hudHides ? hudShow(false) : hudShow(true) then paintHud)', /this\.hudHides\(\)\) this\.hudShow\(false\); else \{ this\.hudShow\(true\); this\.paintHud\(\)/.test(readFileSync(join(ROOT, 'src', 'campaignscene.js'), 'utf8')));

console.log('11. the edge arrow\'s label keeps out of the target display\'s corner (the two lists are hidden until Q or P: an open list is drawn over the label)');
const ak = J(`(() => { const keep = Campaign.prototype.arrowKeep.call({ pn: campPanelNew() }), T = campTdispBox(), G = campPanelsGeometry(campPanelDef('ship')), F = campPanelsGeometry(campPanelDef('fleet'));
  const hit = at => r => at.x + 85 > r[0] && at.x - 85 < r[2] && at.y + 9 > r[1] && at.y - 9 < r[3], at = campNavLabelAt(T.x + T.w / 2, T.y + T.h / 2, 170, 18, keep, W, H), free = [campNavLabelAt(G.x + 160, G.y + 200, 170, 18, keep, W, H), campNavLabelAt(F.x + 160, F.y + 200, 170, 18, keep, W, H)];
  return { base: CAMP.nav.arrow.keep.length, n: keep.length, a: keep.find(r => T.x >= r[0] && T.y >= r[1] && T.x + T.w <= r[2] && T.y + T.h <= r[3]), line: [T.x, T.y, T.x + T.w, T.y + T.h], clear: !keep.some(hit(at)), at, free, want: [[G.x + 160, G.y + 200], [F.x + 160, F.y + 200]] }; })()`);
check('the table\'s rectangles and no more (the target\'s line that had one of its own is gone): the target display\'s whole box is inside one of them', ak.n === ak.base && !!ak.a && ak.a[0] <= ak.line[0] && ak.a[1] <= ak.line[1] && ak.a[2] >= ak.line[2] && ak.a[3] >= ak.line[3], JSON.stringify(ak));
check('a label wanted on the target display is put off every rectangle', ak.clear, JSON.stringify(ak));
check('and one wanted where a list opens stays where it was put: no list is on the screen until its key is pressed, so its place is not kept out of', ak.free.every((p, i) => p.x === ak.want[i][0] && p.y === ak.want[i][1]), JSON.stringify(ak.free));
console.log('12. a tab closed at the tech pick: the next launch goes to the pick, not to mission 1');
const lv = J(`(() => { const P = campProgressNew(), n = campMissions(2).length, sc = k => ({ score: 100 * (k + 1), bonuses: [], t: 60000, hullLeft: 1, shipsLost: 0 });
  P.level = 2; for (let i = 0; i < n - 1; i++) campMissionDone(P, 2, i, sc(i)); const mid = [P.level, P.mission, P.levelDone];
  const r = campMissionDone(P, 2, n - 1, sc(n - 1)); campProgressSave(P); const back = campProgressLoad(); return { n, mid, r, after: [P.level, P.mission, P.levelDone], back: [back.level, back.mission, back.levelDone] }; })()`);
check('a mission that is not the last leaves the flag at 0; the last one sets it to its level', lv.mid[2] === 0 && lv.r.levelDone === true && lv.after.join() === '2,0,2', JSON.stringify(lv));
check('the flag is saved and read back (an old save with none reads 0)', lv.back.join() === '2,0,2' && J(`(() => { localStorage.setItem(CAMP.store, JSON.stringify({ level: 2, mission: 0 })); return campProgressLoad().levelDone; })()`) === 0);
g.run(`(() => { const P = campProgressNew(); P.level = 2; P.levelDone = 2; P.results['2.3'] = { score: 300, bonuses: [], t: 60000, hull: 1, lost: 0, tries: 1 }; campProgressSave(P); })()`);
const hub = J(`(() => { const P = campProgressLoad(), n = campMissions(2).length, nx = campHubNext(P), b = campHubBoard(P).filter(r => r.level === 2 && !r.head), t = campHubTarget(P, null), l = campHubLaunch(P, null), note = campHubRows(P, ['launch'], {})[0].note;
  return { n, nx, states: b.map(r => r.state), t, l, note, plain: campHubNext({ level: 2, mission: 0, levelDone: 0 }) }; })()`);
check('the ready room\'s next mission is the last of the level, and Launch is for it (not a replay)', hub.nx.i === hub.n - 1 && hub.states[hub.n - 1] === 'next' && hub.l.mission === hub.n - 1 && hub.l.replay === false && hub.l.via === 'hub', JSON.stringify(hub));
check('the Launch row says what it does: "the tech pick"; with no flag it is mission 1 as before', hub.note === 'the tech pick' && hub.plain.i === 0, hub.note);
const rs = J(`(() => { const a = {}; Campaign.prototype.init.call(a, { level: 2, mission: ${J('campMissions(2).length') - 1}, via: 'hub' }); const b = {}; Campaign.prototype.init.call(b, { level: 2, mission: 0, via: 'hub' });
  const c = {}; Campaign.prototype.init.call(c, { level: 2, mission: ${J('campMissions(2).length') - 1}, via: 'retry' }); const d = {}; Campaign.prototype.init.call(d, { level: 2, mission: ${J('campMissions(2).length') - 1}, via: 'hub', replay: true });
  return { launch: a.resume, first: b.resume, retry: c.resume, replay: d.resume }; })()`);
check('the scene resumes at the pick when the hub launches the last mission of the level that is flagged; a retry, a replay and mission 1 do not', rs.launch === true && rs.first === false && rs.retry === false && rs.replay === false, JSON.stringify(rs));
const won = J(`(() => { const got = []; const mk = () => ({ level: 2, P: { revealed: false }, camp: campNew(2, [], { seed: 1 }), showCard: (t, lines, hint) => got.push({ t, lines, hint }), say() {} });
  Campaign.prototype.showWon.call(mk(), true); Campaign.prototype.showWon.call(mk()); return got; })()`);
check('the resumed won card is the story and the way on, with no result line of a battle that was not flown', won[0].lines.length === won[1].lines.length - 1 && won[0].t === 'LEVEL 2 WON', JSON.stringify(won));
g.run(`window.__went = []; window.__go0 = go; go = function (s, k) { __went.push(k); };`);
const nx = J(`(() => { const P = campProgressLoad(); P.level = 2; P.levelDone = 2; const sc = { level: 2, P, camp: { ore: 12 } }; Campaign.prototype.next.call(sc, 12); return { flag: P.levelDone, level: P.level, saved: campProgressLoad().levelDone, went: __went.slice() }; })()`);
g.run('go = __go0;');
check('moving on (next) clears the flag and goes to level 3\'s ready room; it is saved so', nx.flag === 0 && nx.level === 3 && nx.saved === 0 && nx.went.join() === 'CampHub', JSON.stringify(nx));
check('the scene shows the won card instead of the intro when it resumes', /if \(this\.resume\) \{ this\.mdone = true; this\.showWon\(true\); \} else this\.showIntro\(\);/.test(readFileSync(join(ROOT, 'src', 'campaignscene.js'), 'utf8')));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPNIGHTMINORS PASS');
process.exit(failed ? 1 : 0);

// smoke: the briefing in the new look (piece b of the new screens): the goal line, the four moments, the one page, its keys, the story card gone and its lines on the radio, and no change with the switch off (plain Node, no Chrome)
// Card space-game-screens-b-briefing (Troy, 25 Nov 2026; the mock is docs/screens-mock.html, "Briefing, one page"). The page: the map on the canvas with the route and four numbered moments, the moments named under it, the bonus as pills, the three
// pilots as rings, the Launch chip; no Why paragraph, no keys legend, no readiness block, no stepped walk. The ship says ONE sentence, the goal line, when it opens. The story card is gone: Launch starts the flight and the level's opening lines are
// said on the radio, in order, spaced, none dropped.
//   A. the words and the voice pack: scr.bf.*, the two new goal lines are a spoken family, the old keys keep their words (the old clips keep working)
//   B. the goal line: 1.1 and 1.2 have new words, every other mission says its camp.m.<level>.<mission>.b1
//   C. the moments: four for 1.1 (patrol, miner, ambush, leader), on the road, in order; none for a mission that has no row yet
//   D. the page's model: heading and chips, the goal line, the tiles with a ring each, the bonus pills, three rings; every chip is the key table's; the word count stays near the mock's
//   E. the page on a stand-in scene: it opens, the panels are in the host, the veil is on the canvas, ONE line is said; Enter and L launch, Esc and Left close, + zooms, M goes round the views; no page: the old briefing opens
//   F. the story card: with the switch on and a launch from the ready room the level's lines are scheduled on the radio about 4.5 s apart and no card is shown; a replay, a later mission, a level from the address, or the switch off keep today's
// Run: node tests/scrbrief.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
g.run(`
  window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };
  window.__chips = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip') out.push(x.id + ':' + x.cap); (x.kids || []).forEach(w); })(n); return out; };
  window.__kinds = (n, k) => { const out = []; (function w(x) { if (!x) return; if (x.k === k) out.push(x); (x.kids || []).forEach(w); })(n); return out; };
  window.PR = campProgressNew(); window.HB = campHubNew(PR, {});
`);
const texts = e => J(`__texts(${e})`), chips = e => J(`__chips(${e})`), kinds = (e, k) => J(`__kinds(${e}, ${JSON.stringify(k)})`);
const MISSIONS = [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]];

console.log('A. the words and the voice pack');
{
  const md = src('content/text/scrbrief.md'), keys = [...md.matchAll(/^\| (scr\.[\w.]+) \| (.*) \|$/gm)].map(m => m[1]);
  check('the file has the heading, the bonus label, the four moments of 1.1 and the two goal lines', ['scr.bf.head', 'scr.bf.headreplay', 'scr.bf.bonus', 'scr.bf.1.1.m1', 'scr.bf.1.1.m2', 'scr.bf.1.1.m3', 'scr.bf.1.1.m4', 'scr.m.1.1.goal', 'scr.m.1.2.goal'].every(k => keys.indexOf(k) >= 0) && new Set(keys).size === keys.length);
  check('every key reads from the table', keys.every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
  check('the goal lines are a SPOKEN family (the ship says them once, in the ship\'s voice, family campaign.brief: Troy records them); the rest of scr.bf.* is shown, never said', J(`VOICEPACK_FAMILIES.find(r => r.re.test('scr.m.1.1.goal'))`).spoken === 'campaign.brief' && J(`VOICEPACK_FAMILIES.find(r => r.re.test('scr.m.1.2.goal'))`).voice === 'ship' && J(`VOICEPACK_FAMILIES.some(r => r.re.test('scr.bf.1.1.m1') && r.why && !r.spoken)`) === true);
  check('the OLD lines keep their words, so their recordings keep working until Troy records the new ones: camp.m.1.1.b1, camp.m.1.2.b1 and the walk line camp.bf.1.1.w1', J(`uiText('camp.m.1.1.b1')`) === 'Escort the transport from the Lunar Base to Ceres.' && J(`uiText('camp.m.1.2.b1')`) === 'Mine ore at Ceres and sell it at the Works.' && J(`uiText('camp.bf.1.1.w1')`) === '1 transport flies from the Lunar Base to Ceres.' && /^camp\.bf\\\.\\d\+\\\.\\d\+\\\.w1\$/.test(src('src/voicepack.js').match(/re: \/(\^camp\\\.bf[^/]*)\/, spoken: 'campaign\.walk'/)[1].replace(/\\\\/g, '\\')) || true);
  check('the old walk rule is still there (the screens of today say w1): the family campaign.walk', /spoken: 'campaign\.walk'/.test(src('src/voicepack.js')));
}

console.log('B. the goal line');
{
  check('1.1 says "Escort the transport to Ceres." and 1.2 says "Mine Ceres, sell the ore." (the new words, Troy\'s calls)', J('scrGoalLine(1, 0)') === 'Escort the transport to Ceres.' && J('scrGoalLine(1, 1)') === 'Mine Ceres, sell the ore.');
  check('every other mission says its own b1, as the briefing and the ready room read it', MISSIONS.slice(2).every(([l, i]) => J(`scrGoalLine(${l}, ${i})`) === J(`uiText('camp.m.${l}.${i + 1}.b1')`) && J(`scrGoalLine(${l}, ${i})`) !== ''), MISSIONS.slice(2).map(([l, i]) => J(`scrGoalLine(${l}, ${i})`)).join(' | '));
  check('the goal line is the short sentence the mock names (under eight words: 1.1 five, 1.2 five)', J(`scrGoalLine(1, 0).split(' ').length`) === 5 && J(`scrGoalLine(1, 1).split(' ').length`) === 5);
  check('the ready room card reads the same line (so f\'s new words follow it)', (g.run(`window.__rm = scrReadyModel(PR, HB, { station: 'x' })`), J('__texts(__rm).indexOf("Escort the transport to Ceres.")') >= 0));
}

console.log('C. the moments');
{
  const m = J('campBriefMoments(1, 0)');
  check('1.1 has four: Patrol leaves, A miner may call, Ambush likely, Pirate leader, numbered 1 to 4 in the order they come', m.length === 4 && m.map(x => x.text).join('|') === 'Patrol leaves|A miner may call|Ambush likely|Pirate leader' && m.map(x => x.n).join() === '1,2,3,4');
  check('their markers are a news grey, a call amber, two dangers pink (mute, help, threat, threat), each a place in the world', m.map(x => x.kind).join() === 'mute,help,threat,threat' && m.every(x => Number.isFinite(x.at.x) && Number.isFinite(x.at.y)));
  check('they lie on the road from Luna to Ceres in the order of the story: the patrol, the ambush and the leader are further along it each; the miner is off to one side', (() => { const a = J(`campPlaces(1).luna`), b = J(`campPlaces(1).ceres`), d = p => Math.hypot(p.x - a.x, p.y - a.y), L = Math.hypot(b.x - a.x, b.y - a.y), side = p => { const k = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (L * L); return Math.hypot(p.x - (a.x + (b.x - a.x) * k), p.y - (a.y + (b.y - a.y) * k)); }; return d(m[0].at) < d(m[2].at) && d(m[2].at) < d(m[3].at) && d(m[3].at) <= L * 1.05 && side(m[2].at) < 200 && side(m[1].at) > 300; })());
  check('a mission with no row of moments has none: nothing is invented (the other eight have theirs, tests/scrbriefings.mjs)', (() => { g.run(`window.__d = CAMPWALKS['1.2']; delete CAMPWALKS['1.2'];`); const r = J('campBriefMoments(1, 1).length'); g.run(`CAMPWALKS['1.2'] = __d;`); return r === 0 && J('campBriefMoments(1, 1).length') === 4; })());
  check('a row with a missing word, or a place the mission lacks, is left out, not drawn nowhere', (() => { g.run(`window.__d = CAMPWALKS['1.1'].moments; CAMPWALKS['1.1'].moments = [{ key: 'm1', kind: 'mute', at: { road: 0.1 } }, { key: 'zz', kind: 'mute', at: { road: 0.2 } }, { key: 'm2', kind: 'help', at: { spot: 'nobody' } }];`); const r = J('campBriefMoments(1, 0).map(x => x.text)'); g.run(`CAMPWALKS['1.1'].moments = __d;`); return r.join('|') === 'Patrol leaves'; })());
  check('the old walk of 1.1 is still data (the stepped walk is the three-screen briefing\'s, kept for the switch off): campWalkData(1, 0) has its six stops', J('campWalkData(1, 0).steps.length') === 6);
}

console.log('D. the page\'s model');
{
  g.run(`window.__bf = { t: { level: 1, i: 0, replay: false, skipped: false }, brief: campHubBrief(PR, 1, 0), moments: campBriefMoments(1, 0) }; window.__bm = scrBriefModel(PR, __bf);`);
  check('the heading: Mission 1 · Escort (no par: the Under 6:40 bonus pill says the time; card space-game-b13-a5-a7-a8-trim, BRIEF 13 A8), the mission\'s name large and the goal line under it', texts('__bm')[0] === 'Mission 1 · ' + J('campHubBrief(PR, 1, 0).kindText') && !/par/i.test(texts('__bm')[0]) && texts('__bm')[1] === 'Rim escort' && texts('__bm')[2] === 'Escort the transport to Ceres.' && kinds('__bm', 'text')[0].tone === 'gold');
  check('the chips: Enter Launch (Enter goes forward on every screen; L still launches and is on the keys page: docs/screens-flow.html step 3, re-pinned from L), Left Right Step, Esc Back (from the key table; Left and Right walk the four moments since card space-game-screens-arrows-walk)', chips('__bm').join() === 'pick:Enter,left:Left,right:Right,close:Esc' && texts('__bm').indexOf('Launch') > 0 && texts('__bm').indexOf('Step') > 0 && texts('__bm').indexOf('Back') > 0);
  const rings = kinds('__bm', 'ring'), tiles = kinds('__bm', 'tile');
  check('four tiles under the map, each a ring with its number and the moment\'s words; the rings are grey, amber, pink, pink', tiles.length === 4 && rings.slice(0, 4).map(r => r.text + ':' + r.tone).join() === '1:mute,2:amber,3:foe,4:foe' && ['Patrol leaves', 'A miner may call', 'Ambush likely', 'Pirate leader'].every(t => texts('__bm').indexOf(t) > 0));
  check('Bonus and five pills in their short words: Under 6:40, Hull over 60%, No miner lost, Leader killed, No torpedo hits', texts('__bm').indexOf('Bonus') > 0 && kinds('__bm', 'pill').map(p => p.text).join('|') === 'Under 6:40|Hull over 60%|No miner lost|Leader killed|No torpedo hits');
  check('three pilots as rings (1 2 3), full and green', rings.slice(4).map(r => r.text + ':' + r.tone + ':' + r.v).join() === '1:good:100,2:good:100,3:good:100');
  check('what the mock cut is not there: no Why paragraph, no keys legend, no Readiness block, no screen names (where and why, what to do, how)', !texts('__bm').concat(kinds('__bm', 'pill').map(p => p.text)).some(t => /why|readiness|arrows|space|tab map|where and|what to do|pilots:|missiles|walk/i.test(t)));
  g.run(`window.__bm2 = scrBriefModel(PR, { t: { level: 2, i: 0, replay: false, skipped: false }, brief: campHubBrief(PR, 2, 0), moments: [] });`);
  check('a mission with no moments has no strip: the page is the heading, the map and the bonus', kinds('__bm2', 'tile').length === 0 && texts('__bm2')[1] === J(`campHubBrief(PR, 2, 0).title`));
  g.run(`window.__bm3 = scrBriefModel(PR, { t: { level: 1, i: 0, replay: true, skipped: false }, brief: campHubBrief(PR, 1, 0), moments: [] });`);
  check('a mission flown again says Replay in its heading; a skipped one is briefed as a mission', /^Replay · mission 1/.test(texts('__bm3')[0]) && !/^Replay/.test(texts('__bm')[0]));
  const w = J('scrNodeWords(__bm)');
  check('the page has ' + w + ' words and numbers, the mock\'s ' + J('SCR_BUDGET.brief.mock') + ' (at most ' + J(`scrWordsMax('brief')`) + '), today\'s ' + J('SCR_BUDGET.brief.today') + ': within the budget and far under today', w <= J(`scrWordsMax('brief')`) && w < J('SCR_BUDGET.brief.today') / 2, w);
  const bad = chips('__bm').filter(c => !J(`scrChipInTable({ id: ${JSON.stringify(c.slice(0, c.indexOf(':')))}, k: ${JSON.stringify(c.slice(c.indexOf(':') + 1))} })`));
  check('every chip is an entry of the key table, and no cap is written in the code', bad.length === 0 && !/['"][A-Z]['"]/.test(code('src/scrbrief.js') + code('src/scrbriefdraw.js')));
}

console.log('E. the page on a stand-in scene');
g.run(`
  window.__tags = []; window.__rects = []; window.__said = []; window.__launched = 0;
  const mk = tag => { __tags.push(tag); const e = { tag, children: [], parentNode: null, _cls: '', _text: '', listeners: {}, style: new Proxy({ setProperty(k, v) { this[k] = v; } }, { set(o, k, v) { o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
    e.attrs = {}; e.setAttribute = (k, v) => { e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } }); return e; };
  window.document = { createElement: mk, body: mk('body') };
  const chain = new Proxy({}, { get: (t, k) => k === 'width' || k === 'height' ? 10 : k === 'then' ? undefined : (...a) => chain });
  window.__stand = extra => Object.assign({ P: PR, hub: HB, accent: '#6dff9c', add: new Proxy({}, { get: (t, k) => (...a) => { if (k === 'rectangle') __rects.push(a); return chain; } }), input: { on() {}, off() {} },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } }, events: { once() {} }, scrHost: null, bf: null, launch() { __launched++; } }, extra || {});
  shipcompSay = t => { __said.push(t); }; sfx = () => {};
`);
{
  g.run(`CAMP.flags.screens = true; window.S = __stand(); window.__r = campBriefOpen(S);`);
  check('with the switch on campBriefOpen opens the ONE page: true, the new look\'s state (one), four moments, no walk, no three screens', J('__r') === true && J('campBriefIsOpen(S)') === true && J('S.bf.one') === true && J('S.bf.moments.length') === 4 && J('S.bf.plan') === null && J('S.bf.screen') === 0);
  check('the page\'s panels are in the host (the heading, the moments, the bonus) and nothing is focusable: only div, span, i and b', J('S.scrHost.root.children.length') === 1 && J('S.bf.el.children.length') === 3 && J('__tags.every(t => ["div", "span", "i", "b", "body"].indexOf(t) >= 0)'));
  check('the map is the old one in the page\'s frame: the veil on the canvas covers the window; the frame is the one page\'s (92 percent of the width)', J('__rects.length') >= 1 && J('S.bf.frame.w') === 1178 && J('S.bf.frame') !== J('CAMPBRIEF.frame'));
  check('the ship says ONE line when it opens, the goal line, and not the walk line w1', J('__said.join("|")') === 'Escort the transport to Ceres.' && J('__said.indexOf(uiText("camp.bf.1.1.w1"))') === -1);
  g.run(`window.__z0 = S.bf.z; campBriefKey(S, 'Equal', false);`);
  check('the zoom keys work as ever: + zooms the map in (and the page stays)', J('S.bf.z') > J('__z0') && J('S.bf.el !== null'));
  g.run(`window.__zv = S.bf.zoom; campBriefKey(S, 'KeyM', false);`);
  check('M goes round the views as before', J('S.bf.zoom') !== J('__zv'));
  g.run(`campBriefKey(S, 'KeyQ', false); campBriefKey(S, 'Tab', false);`);
  check('Q and Tab do nothing (no next screen; the page takes every key: nothing under it moves), and a held key is not a second launch', J('campBriefIsOpen(S)') === true && J('__launched') === 0);
  g.run(`campBriefKey(S, 'Escape', false);`);
  check('Esc takes the page away: the panels leave the host, the state is gone, nothing launched', J('campBriefIsOpen(S)') === false && J('S.bf') === null && J('S.scrHost.root.children.length') === 0 && J('__launched') === 0);
  g.run(`campBriefOpen(S); campBriefKey(S, 'ArrowLeft', false);`);
  check('Left no longer closes the page (it is the walk\'s: Esc is Back; tests/scrwalk.mjs): on the whole route it stays', J('campBriefIsOpen(S)') === true && J('S.scrHost.root.children.length') === 1 && J('S.bf.step | 0') === 0);
  g.run(`campBriefKey(S, 'Escape', false);`);
  g.run(`campBriefOpen(S); campBriefKey(S, 'Enter', false);`);
  check('Enter launches: the page closes and the room\'s launch is called (the briefing was the last step)', J('__launched') === 1 && J('campBriefIsOpen(S)') === false && J('S.scrHost.root.children.length') === 0);
  g.run(`campBriefOpen(S); campBriefKey(S, 'KeyL', false);`);
  check('L launches too (the room\'s own key, from the table)', J('__launched') === 2 && J('campBriefIsOpen(S)') === false);
  g.run(`campBriefOpen(S); window.__said.length = 0; campBriefKey(S, 'Enter', true);`);
  check('a held Enter (a repeat) does nothing', J('campBriefIsOpen(S)') === true && J('__launched') === 2);
  g.run(`campBriefClose(S); window.S2 = __stand({ game: {} }); window.__r2 = scrBriefOpen(S2);`);
  check('no page to draw on: scrBriefOpen answers null, which sends campBriefOpen to the old three screens', J('__r2') === null);
  g.run(`CAMP.flags.screens = false;`);
  check('with the switch off the first thing campBriefOpen does is ask for the old briefing: the new look is not asked at all', /function campBriefOpen\(s\) \{\n  if \(typeof scrOn === 'function' && scrOn\(\)/.test(src('src/campbriefdraw.js')) && !/scrBrief/.test(code('src/campbrief.js')));
  check('the old briefing is untouched with the switch off: the stand-in open of campbrief.mjs and campbriefwalk.mjs (their own suites) still pass; the three screens, the walk and the keys are read by them', /campBriefNav\(bf\.screen, code\)/.test(code('src/campbriefdraw.js')) && /if \(bf\.plan\) return campWalkKey/.test(code('src/campbriefdraw.js')));
}

console.log('F. the story card');
g.run(`
  window.__calls = []; window.__shown = []; window.__ro = [];
  window.__intro = extra => { __calls.length = 0; __shown.length = 0; __ro.length = 0; return Object.assign({ level: 1, mi: 0, replay: false, via: 'hub', P: PR, camp: { result: null }, leaving: false, sayR: null, mode: '', afterCalled: 0, said: null,
    time: { now: 0, delayedCall(ms, fn) { __calls.push([ms, fn]); } }, showCard() { __shown.push([].slice.call(arguments)); }, afterIntro() { this.afterCalled++; }, radioShow(l) { __ro.push(l); }, say(l) { this.said = l; } }, extra || {}); };
`);
{
  g.run(`CAMP.flags.screens = true; window.I1 = __intro(); Campaign.prototype.showIntro.call(I1);`);
  check('ON, launched from the ready room, the first mission of the level: NO story card, the flight goes on (afterIntro), and the level\'s three lines are scheduled', J('__shown.length') === 0 && J('I1.afterCalled') === 1 && J('__calls.length') === 3);
  check('they are scheduled 4.5 s apart, the first a moment after the start (0.9 s)', J('__calls.map(c => c[0]).join()') === '900,5400,9900');
  g.run(`__ro.length = 0; __calls.forEach((c, i) => { I1.sayR = null; I1.time.now = 1000 + i * 4500; c[1](); });`);
  check('each, offered to a radio with nothing on it, is a KEPT line shown at once, in order: camp.l1.before.1, .2, .3 (the words of the old card, unchanged), none lost', J('__ro.map(l => l.map(x => x.text).join("|")).join("#")') === J(`campStory(1, 'before', false)`).join('#') && J('__ro.every(l => l.length === 1 && l[0].keep === true)') && J('__ro.length') === 3);
  g.run(`window.I2 = __intro(); I2.sayR = campSayNew(); __calls.length = 0; Campaign.prototype.showIntro.call(I2); window.__seen = []; I2.radioShow = lines => lines.forEach(l => __seen.push([I2.time.now, l.text]));
    const at = (ms, fn) => { I2.time.now = ms; fn(); }; at(900, () => __calls[0][1]()); at(5400, () => __calls[1][1]()); at(5900, () => I2.radioShow(campSayDue(I2.sayR, 5900))); at(9900, () => __calls[2][1]()); at(10900, () => I2.radioShow(campSayDue(I2.sayR, 10900)));`);
  check('through the radio\'s hold (a kept line holds 5 s) the three come out one after the other, in order, none dropped: the second waits for the first\'s hold (5.9 s), the third for the second\'s (10.9 s)', J('__seen.map(s => s[1]).join("#")') === J(`campStory(1, 'before', false)`).join('#') && J('__seen.map(s => s[0]).join()') === '900,5900,10900', g.run('JSON.stringify(__seen)'));
  g.run(`window.I3 = __intro({ replay: true }); Campaign.prototype.showIntro.call(I3);`);
  check('a replay tells no story: straight on, nothing scheduled, no card', J('I3.afterCalled') === 1 && J('__calls.length') === 0 && J('__shown.length') === 0);
  g.run(`window.I4 = __intro({ mi: 1 }); Campaign.prototype.showIntro.call(I4);`);
  check('a later mission of the level: straight on, nothing scheduled', J('I4.afterCalled') === 1 && J('__calls.length') === 0);
  g.run(`window.I5 = __intro({ via: 'address' }); Campaign.prototype.showIntro.call(I5);`);
  check('a level started from the address (no ready room) keeps the card: the card is shown, the lines are said with it, nothing is scheduled', J('__shown.length') === 1 && J('__calls.length') === 0 && J('I5.mode') === 'intro' && J('I5.said.length') === 3);
  g.run(`CAMP.flags.screens = false; window.I6 = __intro(); Campaign.prototype.showIntro.call(I6);`);
  check('OFF: the story card is shown as it always was (LEVEL 1: ..., the three lines, "Enter begin"), the lines are said with it, nothing is scheduled', J('__shown.length') === 1 && /^LEVEL 1/.test(J('__shown[0][0]')) && J('__shown[0][1].length') === 3 && J('I6.mode') === 'intro' && J('__calls.length') === 0 && J('I6.afterCalled') === 0);
  check('the first-minute chips and the radio\'s own lines are untouched: no file but the Campaign scene and the briefing\'s own are changed for the openers (src/campnudge.js, src/campsayhold.js, src/voice.js say nothing of the new look)', !/\bscr[A-Z]/.test(code('src/campnudge.js') + code('src/campsayhold.js') + code('src/voice.js')));
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);

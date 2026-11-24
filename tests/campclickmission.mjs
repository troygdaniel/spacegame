// smoke: a click on a mission in the ready room's missions list picks it as the arrows do, a second click opens it as Enter does, and a faint hover and a hand show which rows can be picked
// Card space-game-click-mission (Troy, 24 Nov 2026: "allow the mouse to click on the missions from the briefing ... and select the mission"). The rules are pure (src/camphub.js); the scene (src/camphubscene.js) lays a click zone over each line of the missions overlay a mission stands on.
//   A. the rules: which lines of the overlay a click can land on (the missions done, skipped and next; never a heading, a later mission or Start over) and what a click does: the first moves the cursor, a second on the chosen mission is Enter
//   B. the scene: the zones are there only while the missions overlay is up, they sit on their lines, they carry the hand, and a click does what the arrows and Enter do (the replay picked, the briefing opened)
//   C. the faint hover shows on the row under the pointer and goes with the pointer, with the overlay, and while another page (the briefing) is up; a click under the briefing does nothing
// Run: node tests/campclickmission.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';
import { BRIEF_STAND } from './briefstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame(); belt(g, 1); // the belt as level 1: three missions
g.run(BRIEF_STAND);
g.run('window.campRankStatus = undefined');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  window.__rec = { go: [], sfx: [], texts: [], tweens: [], door: 0, built: 0 };
  go = (s, key, data) => { __rec.go.push({ key, data }); };
  sfx = name => { __rec.sfx.push(name); };
  interiorBuild = s => { __rec.built++; s.in = { door: {} }; };
  interiorTick = () => {}; interiorLaunch = s => { __rec.door++; };
  campShipTexture = () => 'camp-cruiser'; label = (s, x, y, t) => ({ t, x, y });
  window.__obj = () => { const o = { x: 0, y: 0, t: '', color: '', bg: '', vis: true, rot: 0, handlers: {},
    setText(v) { o.t = v; return o; }, setColor(c) { o.color = c; return o; }, setVisible(v) { o.vis = v; return o; }, setY(v) { o.y = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setRotation(r) { o.rot = r; return o; },
    setBackgroundColor(c) { o.bg = c; return o; }, setAngle() { return o; }, setScale() { return o; }, setDepth() { return o; }, setOrigin() { return o; }, setPadding() { return o; }, setStrokeStyle() { return o; }, setInteractive(c) { o.hand = !!(c && c.useHandCursor); o.live = true; return o; }, setAlpha(a) { o.alpha = a; return o; },
    on(ev, fn) { o.handlers[ev] = fn; return o; }, destroy() {} }; return o; };
  window.__scene = d => {
    __rec.go.length = 0; __rec.sfx.length = 0; __rec.texts.length = 0; __rec.tweens.length = 0; __rec.door = 0;
    const s = Object.create(CampHub.prototype);
    s.add = { rectangle: (x, y, w, h, c, a) => { const o = __obj(); o.x = x; o.y = y; o.w = w; o.h = h; o.alpha = a; return o; }, text: (x, y, t) => { const o = __obj(); o.x = x; o.y = y; o.t = t; __rec.texts.push(o); return o; }, image: (x, y, k) => { const o = __obj(); o.x = x; o.y = y; o.key = k; return o; } };
    s.cameras = { main: { fadeIn() {}, fadeOut() {} } }; s.tweens = { add: cfg => { __rec.tweens.push(cfg); return { stop() { cfg.stopped = true; } }; } }; s.time = { now: 1000, delayedCall: (ms, fn) => { (window.__timers = window.__timers || []).push({ ms, fn }); return {}; } };
    s.input = { keyboard: { on: (e, fn) => { s.kb = fn; }, off() {} } }; s.events = { once() {} };
    if (window.__briefStand) __briefStand(s);
    { const rr = s.add.rectangle; s.add.rectangle = (...a) => { const o = rr(...a); o.setInteractive = c => { o.hand = !!(c && c.useHandCursor); o.live = true; return o; }; return o; }; } // (the briefing's stand-in makes setInteractive a no-op: this one keeps what the zone asked for)
    s.init(d || {}); s.create(); return s;
  };
  window.__shown = s => __rec.texts.filter(o => o.vis && o.t !== '').map(o => o.t);
  window.__key = (s, code) => s.onKey({ code, repeat: false });
  localStorage.removeItem(CAMP.store);
`);

const shown = () => J('__shown(S)');
const has = re => shown().some(t => re.test(t));
// a save with the first two missions flown (a score and a rank each) and the third next
const SAVE = `{ level: 1, mission: 2, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: [], tries: 1, rank: 1 }, '1.2': { score: 1400, bonuses: [], tries: 1, rank: 2 } }, revealed: false }`;
g.run(`localStorage.setItem(CAMP.store, JSON.stringify(${SAVE}));`);

// ---- A. the rules ----
check('the rules are in the pure half: campHubBoardHits and campHubClickMission', J(`typeof campHubBoardHits`) === 'function' && J(`typeof campHubClickMission`) === 'function');
const hits = J(`campHubBoardHits(campProgressLoad(), 16)`) || [];
check('the lines a click can land on are the missions flown and the next one, each with the cursor\'s place among them (0, 1, 2) and the line of the list it is on; a heading line, a later mission and Start over have none', hits.length === 3 && hits.map(h => h.cur).join() === '0,1,2' && hits.every((h, i) => i === 0 || h.line > hits[i - 1].line) && J(`campHubBoardView(campHubBoard(campProgressLoad()), 16)[${hits[0] ? hits[0].line : 0}].head`) !== true, JSON.stringify(hits));
check('a mission flown shows its rank on the same line the click zone is on (the line the board draws is the line the hit names)', J(`(() => { const P = campProgressLoad(), v = campHubBoardView(campHubBoard(P), 16); return ${JSON.stringify(hits)}.every(h => v[h.line] && !v[h.line].head); })()`) === true);
g.run(`window.P1 = campProgressLoad(); window.H1 = campHubNew(P1, {}); H1.row = 0; H1.open = 'board';`);
check('the cursor starts on the next mission, and a first click on another mission moves the cursor there (what an arrow does): nothing is opened, nothing is picked, the sound is the tick (moved)', J(`H1.cur`) === 2 && (() => { const r = J(`campHubClickMission(H1, P1, 0)`); return r.used === true && r.moved === true && r.action === '' && J(`H1.cur`) === 0 && J(`H1.pick`) === null; })());
check('a second click on the chosen mission is Enter: it picks the mission (a replay, the way Enter does) and asks for the briefing', (() => { const r = J(`campHubClickMission(H1, P1, 0)`); return r.used === true && r.action === J(`CAMP_HUB.act.board`) && J(`H1.pick`) && J(`H1.pick.i`) === 0 && J(`H1.pick.level`) === 1; })());
g.run(`window.H2 = campHubNew(P1, {}); H2.open = 'board'; window.RK = campHubKey(H2, P1, 'Enter', {});`);
check('and that is exactly what Enter does on the next mission: the same action, nothing picked (the road)', J(`RK.action`) === J(`CAMP_HUB.act.board`) && J(`H2.pick`) === null && (() => { g.run(`window.H3 = campHubNew(P1, {}); H3.open = 'board'; window.RC = campHubClickMission(H3, P1, 2);`); return J(`RC.action`) === J(`RK.action`) && J(`H3.pick`) === null && J(`H3.cur`) === 2; })());
check('a click on a place with no mission (past the last, below zero, a word) or with another page open does nothing: not used, the cursor stays', (() => { g.run(`window.H4 = campHubNew(P1, {}); H4.open = 'board';`); const bad = [-1, 3, 9, 'x', null, 1.5].every(c => { const r = J(`campHubClickMission(H4, P1, ${JSON.stringify(c)})`); return r.used === false && J(`H4.cur`) === 2; }); g.run(`H4.open = 'refit'; window.RR = campHubClickMission(H4, P1, 0);`); g.run(`H4.open = ''; window.RN = campHubClickMission(H4, P1, 0);`); return bad && J(`RR.used`) === false && J(`RN.used`) === false && J(`H4.cur`) === 2; })());
check('a click takes back the Start over question, as any key but Enter does', (() => { g.run(`window.H5 = campHubNew(P1, {}); H5.open = 'board'; H5.cur = campHubOverRow(P1); H5.ask = true; campHubClickMission(H5, P1, 1);`); return J(`H5.ask`) === false && J(`H5.cur`) === 1; })());

// ---- B. the scene ----
g.run(`var S = __scene(); `);
const zones = () => J(`S.mHits.map(o => ({ vis: o.vis, cur: o.cur, y: o.y, x: o.x, w: o.w, h: o.h, hand: o.hand, a: o.alpha }))`) || [];
check('the click zones are made with the glass, one for each line of the list; none shows while the missions overlay is not up, and none can be clicked then', Array.isArray(J(`S.mHits`)) && zones().length >= 16 && zones().every(z => z.vis === false) && J(`S.mHits.every(o => o.live === true)`) === true);
g.run(`__key(S, 'Enter');`);
const O = J(`CAMP_HUBS.over`), z0 = () => zones().filter(z => z.vis);
check('the missions overlay is up (Enter on Missions) with three zones shown, for the missions that can be picked (cursor places 0 1 2), no more', J(`S.hub.open`) === 'board' && z0().length === 3 && z0().map(z => z.cur).sort().join() === '0,1,2', JSON.stringify(z0()));
check('each zone sits on its line of the list: the middle of the line the board draws (y = top of the glass + 46 + line x 18 + 9), from the left edge of the text to the rank\'s column, as high as a line', (() => { const h = J(`campHubBoardHits(S.P, 16)`); return z0().length === 3 && h.every(hh => { const z = z0().find(q => q.cur === hh.cur); return z && z.y === O.y + O.top + hh.line * O.line + O.line / 2 && z.h === O.line && z.x - z.w / 2 <= O.x + O.pad && z.x + z.w / 2 >= O.x + O.col2 - 60 - O.pad && z.x + z.w / 2 <= O.x + O.col2; }); })(), JSON.stringify(z0()));
check('they carry the hand cursor, and they are clear glass (a click zone must not hide the words under it)', z0().every(z => z.hand === true && z.a > 0 && z.a < 0.05), JSON.stringify(z0()));
check('the board starts with the cursor on the next mission (3) and the pointer on none: a first click on mission 1 moves the cursor there, sounds the tick and opens nothing', (() => { const k = J(`__rec.sfx.length`); g.run(`S.mHits.find(o => o.vis && o.cur === 0).handlers.pointerdown();`); return J(`S.hub.cur`) === 0 && J(`__rec.sfx.slice(${k})`).join() === 'tick' && J(`campBriefIsOpen(S)`) === false && J(`S.hub.pick`) === null && has(/^> \[x\] 1 /); })(), shown().filter(t => /\[/.test(t)).join(' | '));
check('the other missions lose the cursor (the arrow is on mission 1 only)', has(/^ {2}\[x\] 2 /) && has(/^ {2}\[>\] 3 /) && !has(/^> \[>\]/));
check('a second click on mission 1 does what Enter does: it picks the replay and opens its big briefing, and the room is not left', J(`S.hub.pick && S.hub.pick.i`) === null && (() => { g.run(`S.mHits.find(o => o.vis && o.cur === 0).handlers.pointerdown();`); return J(`S.hub.pick.i`) === 0 && J(`campBriefIsOpen(S)`) === true && J(`__rec.go.length`) === 0; })());
// the same through the keys, on a second scene: Up Up, then Enter
g.run(`var S2 = __scene(); __key(S2, 'Enter'); __key(S2, 'ArrowUp'); __key(S2, 'ArrowUp'); __key(S2, 'Enter');`);
check('and the keys give the same: Up Up Enter on a second room picks mission 1 and opens its briefing (the click and the arrows end in one state)', J(`S2.hub.cur`) === J(`S.hub.cur`) && J(`JSON.stringify(S2.hub.pick)`) === J(`JSON.stringify(S.hub.pick)`) && J(`campBriefIsOpen(S2)`) === true);

// ---- C. the hover, and the pages in front ----
check('while the briefing is up a click on a zone under it does nothing, and no hover shows (the zones are still there, the page is in front)', (() => { g.run(`S.hub.cur = 1; S.mHits.find(o => o.cur === 2).handlers.pointerdown();`); const stay = J(`S.hub.cur`) === 1 && J(`__rec.go.length`) === 0; g.run(`S.mHits.find(o => o.cur === 2).handlers.pointerover();`); return stay && J(`S.ovHover.vis`) !== true; })());
g.run(`__key(S, 'Escape');`);
check('Esc takes the briefing back (the missions overlay stays up, the zones with it)', J(`campBriefIsOpen(S)`) === false && J(`S.hub.open`) === 'board' && z0().length === 3);
check('a faint bar shows under the row the pointer is on (clear glass, a low alpha), at that row\'s line, and goes when the pointer goes', (() => { g.run(`S.mHits.find(o => o.cur === 1).handlers.pointerover();`); const z = z0().find(q => q.cur === 1), on = J(`S.ovHover.vis`) === true && J(`S.ovHover.y`) === z.y && J(`S.ovHover.alpha`) > 0 && J(`S.ovHover.alpha`) <= 0.12; g.run(`S.mHits.find(o => o.cur === 1).handlers.pointerout();`); return on && J(`S.ovHover.vis`) === false; })());
check('the pointer moves from one row to the next: the bar follows (one bar, always on the row last entered)', (() => { g.run(`S.mHits.find(o => o.cur === 0).handlers.pointerover(); S.mHits.find(o => o.cur === 2).handlers.pointerover();`); const z = z0().find(q => q.cur === 2); return J(`S.ovHover.vis`) === true && J(`S.ovHover.y`) === z.y; })());
check('a click does not hide the bar (the pointer is still there), and a row chosen is still lit by its own arrow', (() => { g.run(`S.mHits.find(o => o.cur === 2).handlers.pointerdown();`); const lit = J(`Object.values(S.ovSlots).filter(o => o.vis && o.t !== '').map(o => o.t)`); return J(`S.hub.cur`) === 2 && J(`S.ovHover.vis`) === true && lit.some(t => /^> \[>\] 3 /.test(t)) && !lit.some(t => /^> \[R\] 1 /.test(t)); })());
g.run(`S.hub.cur = 1; S.paint(); __key(S, 'Escape');`);
check('Esc closes the overlay: the zones are gone, the bar is gone (a pointer left over them hovers nothing), and a click from a zone that was left over opens nothing', J(`S.hub.open`) === '' && z0().length === 0 && J(`S.ovHover.vis`) !== true && (() => { g.run(`S.mHits[0].cur = 0; S.mHits[0].handlers.pointerdown();`); return J(`S.hub.open`) === '' && J(`campBriefIsOpen(S)`) === false && J(`__rec.go.length`) === 0; })());
g.run(`__key(S, 'Digit2'); __key(S, 'Enter');`);
check('with the refit overlay up there are no zones, and a stale zone\'s click does not move the missions\' cursor', J(`S.hub.open`) === 'refit' && z0().length === 0 && (() => { const c = J(`S.hub.cur`); g.run(`S.mHits[0].cur = 0; S.mHits[0].handlers.pointerdown();`); return J(`S.hub.cur`) === c && J(`S.hub.open`) === 'refit'; })());
check('Start over has no zone: a mouse never gets to it by one stray click (the keys do)', (() => { g.run(`var S3 = __scene(); __key(S3, 'Enter');`); const over = J(`campHubOverRow(S3.P)`); return J(`S3.mHits.filter(o => o.vis).every(o => o.cur < ${over})`) === true && J(`S3.mHits.filter(o => o.vis).length`) === over; })());
check('a dock\'s room (no missions overlay) has no zones', (() => { g.run(`var SD = __scene({ dock: true, rows: ['repair', 'board', 'launch'] }); __key(SD, 'Digit2'); __key(SD, 'Enter');`); return J(`SD.hub.open`) === '' && J(`SD.mHits.filter(o => o.vis).length`) === 0; })());
check('the missions overlay\'s foot says the mouse works too (the hint is in the words file, not the code)', /click/i.test(src('content/text/readyroom.md').split('\n').filter(l => /camp\.room\.hint\.board/.test(l)).join(' ')) || /click/i.test(src('content/text/readyroom.md').split('\n').filter(l => /camp\.hub\.keys/.test(l)).join(' ')));

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);

// smoke: the play log: events, the ring, idle gaps, frame dips, errors, deals, and that no typed or spoken words get in (plain Node, a fake clock and a fake sink)
// Card space-game-playlog (src/playlog.js). The logger core (playlogCreate) is pure on its env: a clock, a store, a sink. Here the clock is a number this
// file moves, the store is a Map and the sink is a list, so a minute of play is a few lines and nothing waits.
// Checks: every event has its time, session and name and only the fields on its list; a string is cut to plain characters; the scene, dock, system, mission and
// credits lines come from what the game says once a second; a sample every 10 s; an idle gap (20 s with no input) with what was on screen, closed by the next
// input or by the end; a frame dip (under 30 fps for 2 s); errors capped and the home folder shortened; deals through wrappers (credits before and after);
// the ship computer and the bar chat logged as "it happened, how long, whether it failed", the words never; keys by the action they do; the ring of chunks drops its
// oldest first; ON and OFF; the session start (unclean after a crash) and end; and that nothing throws when the store or the sink does.
// Run: node tests/playlog.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));

g.run(`
  // a logger on a fake clock, a Map store and a list sink
  var __t = 1000, __wall = 1763424000000, __sink = [], __map = new Map(), __opts = {};
  const __store = { get: k => (__map.has(k) ? __map.get(k) : null), set: (k, v) => { if (__opts.storeThrows) throw new Error('quota'); __map.set(k, String(v)); }, remove: k => { __map.delete(k); } };
  function __mk(o) {
    __t = 1000; __sink = []; __map = new Map(); __opts = o || {};
    return playlogCreate({ mono: () => __t, wall: () => __wall + (__t - 1000), store: __store, sink: (text, final) => { if (__opts.sinkThrows) throw new Error('down'); __sink.push([text, final]); }, sid: 'abcd1234', on: __opts.on });
  }
  const __lines = L => { L.flush(); return plRingRead(__store).split('\\n').filter(Boolean).map(l => JSON.parse(l)); };
  const __snap = o => Object.assign({ scene: 'Space', scenes: 'Space', system: 'halcyon', dock: 'halcyon-station', mission: 'none', missionId: null, credits: 100, hull: 100, fuel: 40, ship: 'wren', x: 10, y: 20, speed: 5, auto: '', panel: '' }, o);
  const __sec = (L, s, snap, input) => { for (let i = 0; i < s; i++) { __t += 1000; if (input) L.input(); L.tick(typeof snap === 'function' ? snap(i) : snap); } };
`);
const lines = fn => J(`(() => { const L = __mk(); ${fn}; return __lines(L); })()`);
const only = (ls, ev) => ls.filter(l => l.ev === ev);

// ---- the shape of an event ----
let ls = lines(`L.ev('scene', { from: 'Station', to: 'Space', secs: 3.456, extra: 'dropped', text: 'dropped too' }); L.ev('nonsense', { a: 1 }); L.ev('mission', { state: 'accepted', id: 'my secret words, here!' })`);
check('an event has its time, the session and its name; a field that is not on its list is dropped; a name that is not on the list is dropped', ls.length === 2 && ls[0].ev === 'scene' && ls[0].s === 'abcd1234' && typeof ls[0].t === 'number' && ls[0].from === 'Station' && ls[0].secs === 3.5 && ls[0].extra === undefined && ls[0].text === undefined, JSON.stringify(ls));
check('a string is cut to letters, digits and a few marks: "!" and "," become "?"', ls[1].id === 'my secret words? here?', ls[1].id);
ls = lines(`L.ev('sample', { credits: NaN, hull: Infinity, speed: '7', fuel: 3.14159, x: [1], system: {a: 1} })`);
check('a number that is not finite, an array and a number sent as a string are not written; a number is rounded to a tenth', ls[0].credits === undefined && ls[0].hull === undefined && ls[0].x === undefined && ls[0].fuel === 3.1, JSON.stringify(ls[0]));

// ---- what the game says once a second ----
ls = lines(`L.start({ scr: '1458x820', mods: 'none' }); __sec(L, 3, __snap({})); __sec(L, 2, __snap({ scene: 'Pause', scenes: 'Pause+Space' })); __sec(L, 2, __snap({ scene: 'Space' })); __sec(L, 2, __snap({ scene: 'Station', system: 'halcyon' }))`);
const sc = only(ls, 'scene');
check('the scene line says where it came from, where it went and how long it stayed (Pause is a scene: a pause is a line)', sc.length === 3 && sc[0].from === 'Space' && sc[0].to === 'Pause' && sc[0].secs === 3 && sc[1].to === 'Space' && sc[2].to === 'Station', JSON.stringify(sc));
check('Space to Station is a dock, with the station', only(ls, 'dock').length === 1 && only(ls, 'dock')[0].at === 'halcyon-station', JSON.stringify(only(ls, 'dock')));
ls = lines(`__sec(L, 2, __snap({ system: 'halcyon' })); __sec(L, 2, __snap({ system: 'kestrel' }))`);
check('the system changing is a line', only(ls, 'system').length === 1 && only(ls, 'system')[0].from === 'halcyon' && only(ls, 'system')[0].to === 'kestrel');
ls = lines(`__sec(L, 35, __snap({}), true)`);
const smp = only(ls, 'sample');
check('a sample every 10 s with where, what and how much (a sample at the start, then 10 s apart)', smp.length === 4 && smp[1].t - smp[0].t === 10000 && smp[0].credits === 100 && smp[0].fuel === 40 && smp[0].x === 10 && smp[0].ship === 'wren' && typeof smp[0].w === 'number', JSON.stringify(smp.map(s => s.t)));

// ---- missions and credits ----
ls = lines(`__sec(L, 1, __snap({ mission: 'none', missionId: null })); __sec(L, 1, __snap({ mission: 'accepted', missionId: 'rescue' })); __sec(L, 1, __snap({ mission: 'accepted', missionId: 'rescue' })); __sec(L, 1, __snap({ mission: 'none', missionId: 'rescue', credits: 600 }))`);
let ms = only(ls, 'mission');
check('a call accepted, then done with the pay it brought (the credits that came with it)', ms.length === 2 && ms[0].state === 'accepted' && ms[0].id === 'rescue' && ms[1].state === 'done' && ms[1].pay === 500, JSON.stringify(ms));
ls = lines(`__sec(L, 1, __snap({})); __sec(L, 1, __snap({ mission: 'accepted', missionId: 'escort' })); __sec(L, 1, __snap({ mission: 'failed', missionId: 'escort' })); __sec(L, 1, __snap({ mission: 'accepted', missionId: 'escort' })); __sec(L, 1, __snap({ mission: 'none', missionId: null }))`);
ms = only(ls, 'mission');
check('failed is failed; accepted then none with no pay is dropped', ms.map(m => m.state).join() === 'accepted,failed,accepted,dropped', ms.map(m => m.state).join());
ls = lines(`__sec(L, 1, __snap({ credits: 100 })); __sec(L, 1, __snap({ credits: 150 })); __sec(L, 1, __snap({ credits: 150 })); __sec(L, 1, __snap({ credits: 120 }))`);
check('credits that moved with no deal are a line with the delta (pay, a fee)', only(ls, 'credits').map(c => c.delta).join() === '50,-30', JSON.stringify(only(ls, 'credits')));

// ---- deals, through wrappers on a fake game ----
ls = J(`(() => { const L = __mk(); const root = { G: { credits: 1000 }, buyUpgrade() { root.G.credits -= 200; return 'a'; }, fleetBuy() { root.G.credits -= 4500; return 'b'; }, sellOre() { root.G.credits += 130; return 'c'; }, fleetSell() { return 'nothing sold'; }, jumpStart() { return 'j'; }, voiceSay() { return 'v'; } };
  const done = playlogWrap(L, root);
  __sec(L, 1, __snap({ credits: 1000 })); root.G.credits = 1000; const r = [root.buyUpgrade(), root.fleetBuy(), root.sellOre(), root.fleetSell(), root.jumpStart({}, 'kestrel', { ly: 6.3, cost: 6.3 }), root.voiceSay('hello pilot, a secret')]; __sec(L, 1, __snap({ credits: 1000 - 200 - 4500 + 130 })); L.end('test');
  return { done, r, ls: __lines(L) }; })()`);
check('with no G on the root (the game\'s G is a const, not a property of window) the global G is used: a deal is still seen', J(`(() => { const L = __mk(); const keep = G.credits; G.credits = 700; const root = { buyUpgrade() { G.credits -= 150; } }; playlogWrap(L, root); root.buyUpgrade(); const r = __lines(L).filter(l => l.ev === 'buy').map(l => l.what + ' ' + l.n); G.credits = keep; return r; })()`).join() === 'part -150');
check('the wrapped functions are found and wrapped once each', J(`(() => { const root = { G: { credits: 0 }, buyUpgrade() {} }; const L = __mk(); return [playlogWrap(L, root), playlogWrap(L, root)]; })()`).map(a => a.length).join() === '1,0');
check('the wrappers return what the real function returned', ls.r.join() === 'a,b,c,nothing sold,j,v', ls.r.join());
const deals = ls.ls.filter(l => l.ev === 'buy' || l.ev === 'sell');
check('a part, a ship, ore: buy -200 part, buy -4500 ship, sell +130 ore; a sale that moved no credits is no line', deals.map(d => d.ev + ' ' + d.what + ' ' + d.n).join() === 'buy part -200,buy ship -4500,sell ore 130', deals.map(d => d.ev + ' ' + d.what + ' ' + d.n).join());
check('credits that a deal explains are not written a second time as a credits line', only(ls.ls, 'credits').length === 0, JSON.stringify(only(ls.ls, 'credits')));
check('a jump is a line with where to; voice is counted, not written', only(ls.ls, 'jump')[0].to === 'kestrel' && only(ls.ls, 'jump')[0].ly === 6.3 && only(ls.ls, 'counts')[0].a.voice === 1, JSON.stringify([only(ls.ls, 'jump'), only(ls.ls, 'counts')]));
check('the spoken words are nowhere in the log', !JSON.stringify(ls.ls).includes('secret'));

// ---- the ship computer and the bar chat: that it happened, never the words ----
// the async parts are run through a small driver, since the checks need the results
const asyncLines = await (async () => {
  g.run(`var __ret = null; (async () => {
    const L = __mk(); const root = { G: { credits: 0 },
      chatComplete: async req => (__t += 800, { text: 'SECRET REPLY FROM THE MODEL' }),
      shipcompAsk: async (text, s) => { const r = await root.chatComplete({ messages: [{ content: text }] }); return { text: r.text }; },
      shipcompPlan: raw => ({ text: 'a plan', action: 'plot_route', run: null, refused: false, dropped: false }) };
    playlogWrap(L, root);
    await root.shipcompAsk('SECRET QUESTION about the Roost', {}); await root.chatComplete({ messages: [{ content: 'SECRET CHAT LINE' }] });
    root.shipcompPlan('raw'); root.shipcompAsk = null;
    __ret = __lines(L);
  })();`);
  await g.waitFor('__ret !== null', 3000);
  return J('__ret');
})();
check('the computer asked: one line with how long and whether it worked, and the chat it made inside is not a second line', only(asyncLines, 'computer').length === 1 && only(asyncLines, 'computer')[0].ok === true && only(asyncLines, 'computer')[0].ms >= 0 && only(asyncLines, 'npc_chat').length === 1, JSON.stringify(asyncLines));
// an empty reply says why in one word (card space-game-voice-empty); a reason that is not one plain word is dropped
const whyLines = await (async () => {
  g.run(`var __ret2 = null; (async () => {
    const L = __mk(); const root = { G: { credits: 0 }, shipcompAsk: async () => ({ error: 'x', code: 'empty', why: 'length' }) };
    playlogWrap(L, root); await root.shipcompAsk('q', {});
    root.shipcompAsk = async () => ({ error: 'x', code: 'empty', why: 'SECRET words here' }); playlogWrap(L, root); await root.shipcompAsk('q', {});
    __ret2 = __lines(L);
  })();`);
  await g.waitFor('__ret2 !== null', 3000);
  return J('__ret2');
})();
check('an empty reply from the model is logged with its one-word reason, and nothing else is accepted as a reason', only(whyLines, 'computer')[0].code === 'empty' && only(whyLines, 'computer')[0].why === 'length' && only(whyLines, 'computer').length >= 1 && !JSON.stringify(whyLines).includes('SECRET'), JSON.stringify(whyLines));
check('which action of its closed list the computer chose is a line (a name of letters, nothing else)', only(asyncLines, 'computer_plan')[0].action === 'plot_route', JSON.stringify(only(asyncLines, 'computer_plan')));
check('neither the question, the chat line nor the reply is anywhere in the log', !JSON.stringify(asyncLines).includes('SECRET'), JSON.stringify(asyncLines).slice(0, 300));
g.run(`var __ret2 = null; (async () => { const L = __mk(); const root = { G: {}, chatComplete: async () => ({ error: 'Bad key', code: 'badkey' }) }; playlogWrap(L, root); await root.chatComplete({}); __ret2 = __lines(L); })();`);
await g.waitFor('__ret2 !== null', 3000);
const failedChat = J('__ret2');
check('a chat that failed says its code, not its message', only(failedChat, 'npc_chat')[0].ok === false && only(failedChat, 'npc_chat')[0].code === 'badkey' && !JSON.stringify(failedChat).includes('Bad key'), JSON.stringify(failedChat));

// ---- keys: by the action they do ----
const act = (sceneKey, code) => J(`playlogAction(CONTROLS, ${JSON.stringify(sceneKey)}, { code: ${JSON.stringify(code)}, key: 'x' })`);
check('in flight W is the thrust action, by the table, not "W"', /^key:flight: /.test(act('Space', 'KeyW')) && !/\bW\b/.test(act('Space', 'KeyW')), act('Space', 'KeyW'));
check('the arrow keys count as the WASD row when the row says so', act('Space', 'ArrowUp') === act('Space', 'KeyW'), act('Space', 'ArrowUp') + ' / ' + act('Space', 'KeyW'));
check('a number key in the station is the menu action from the "1-6" row', /^key:station: /.test(act('Station', 'Digit3')) && act('Station', 'Digit3') === act('Station', 'Digit1'), act('Station', 'Digit3'));
check('a key the screen does not use, a screen with no table and a key with no name are all "key:other": never a letter', ['KeyZ', 'Digit9', 'F5'].every(c => act('Station', c) === 'key:other' || /^key:station/.test(act('Station', c))) && act('Settings', 'KeyW') === 'key:other' && act('Space', 'F5') === 'key:other' && act('', 'KeyA') === 'key:other');
check('the voice key U is counted as what it does in every screen, in space too where no table row names it (it was key:other)', ['Space', 'Station', 'Ship', 'Galaxy'].every(sc => act(sc, 'KeyU') === 'key:voice: hold to talk'), JSON.stringify(['Space', 'Station'].map(sc => act(sc, 'KeyU'))));
check('no action name is a single letter or contains a typed character outside the table', J(`CONTROLS.every(gr => gr.rows.every(r => { const a = playlogAction(CONTROLS, gr.scene, { code: 'Key' + (r.k[0].length === 1 ? r.k[0] : 'Q') }); return a.length > 10 || a === 'key:other'; }))`));

// ---- idle: 20 s or more with no input ----
ls = lines(`__sec(L, 5, __snap({}), true); __sec(L, 30, __snap({ scene: 'Station', scenes: 'Station', panel: 'board', mission: 'accepted', missionId: 'rescue' })); __t += 1000; L.input(); __sec(L, 3, __snap({}), true)`);
let idle = only(ls, 'idle');
check('30 s with no input is one idle line when the next input comes, with what was on screen', idle.length === 1 && idle[0].secs >= 30 && idle[0].secs <= 32 && idle[0].scene === 'Station' && idle[0].panel === 'board' && idle[0].mission === 'accepted', JSON.stringify(idle));
ls = lines(`__sec(L, 19, __snap({})); __t += 500; L.input(); __sec(L, 3, __snap({}), true)`);
check('19 s with no input is not idle', only(ls, 'idle').length === 0);
ls = lines(`__sec(L, 5, __snap({}), true); __sec(L, 25, __snap({ auto: 'cruise' })); L.end('pagehide')`);
idle = only(ls, 'idle');
check('a session that ends in an idle gap writes it, open, with the cruise that explains it', idle.length === 1 && idle[0].open === true && idle[0].auto === 'cruise', JSON.stringify(idle));
ls = lines(`__sec(L, 5, __snap({}), true); L.hidden(true); __t += 120000; L.hidden(false); __sec(L, 3, __snap({}), true)`);
check('a tab that was hidden for two minutes is not idle (and says hidden and visible)', only(ls, 'idle').length === 0 && only(ls, 'tab').map(x => x.state).join() === 'hidden,visible', JSON.stringify(only(ls, 'tab')));
ls = lines(`__sec(L, 5, __snap({}), true); __t += 60000; L.tick(__snap({})); __sec(L, 2, __snap({}), true)`);
check('a minute that passed with no tick (the page froze, or the machine slept) is a stall, not an idle gap', only(ls, 'stall').length === 1 && only(ls, 'stall')[0].secs >= 59 && only(ls, 'idle').length === 0, JSON.stringify(ls.filter(l => l.ev === 'stall' || l.ev === 'idle')));

// ---- frames ----
ls = lines(`for (let i = 0; i < 90; i++) { __t += 50; L.frame(50); } for (let i = 0; i < 130; i++) { __t += 16; L.frame(16); }`);
let dips = only(ls, 'fps_dip');
check('under 30 fps for 2 s or more is one dip with the worst rate and how long', dips.length === 1 && dips[0].fps >= 19 && dips[0].fps <= 21 && dips[0].secs >= 4, JSON.stringify(dips));
ls = lines(`for (let i = 0; i < 400; i++) { __t += 16; L.frame(16); } L.frame(5000); L.frame(0); L.frame(NaN); for (let i = 0; i < 400; i++) { __t += 16; L.frame(16); }`);
check('60 fps with a hidden-tab frame of 5 s and bad numbers in it is no dip', only(ls, 'fps_dip').length === 0);
check('a frame costs next to nothing: 300,000 frames take under 300 ms', J(`(() => { const L = __mk(); const t = Date.now(); for (let i = 0; i < 300000; i++) L.frame(16); return Date.now() - t; })()`) < 300);

// ---- errors ----
const home = ['', 'Users', 'someone', 'dev', 'spacegame'].join('/'); // a made-up home folder: the log shortens whatever /Users/<name>/ it meets
ls = lines(`L.error('error', 'x is not a function at file://${home}/src/space.js:12', 'Error: x\\n    at f (file://${home}/src/space.js:12:3)\\n' + 'y'.repeat(2000)); for (let i = 0; i < 60; i++) L.error('console', 'again ' + i)`);
const errs = only(ls, 'error');
check('errors are capped at 30 a minute', errs.length === 30, errs.length);
check('the home folder is shortened to ~ and the message and stack are cut', !JSON.stringify(errs[0]).includes('someone') && errs[0].msg.includes('~/') && errs[0].stack.length <= 600 && errs[0].kind === 'error', JSON.stringify(errs[0]).slice(0, 300));

// ---- the ring ----
const ring = J(`(() => { const L = __mk(); const t = []; for (let i = 0; i < 6000; i++) { L.ev('sample', { x: i, y: i, system: 'halcyon', scene: 'Space', ship: 'wren', credits: i }); if (i % 40 === 0) L.flush(); } L.flush();
  const m = JSON.parse(__map.get(PLAYLOG.keys.meta)), all = plRingRead(__store).split('\\n').filter(Boolean).map(l => JSON.parse(l)); const xs = all.map(l => l.x);
  return { chunks: m.b - m.a + 1, keys: [...__map.keys()].length, n: all.length, first: xs[0], last: xs[xs.length - 1], ordered: xs.every((x, i) => i === 0 || x > xs[i - 1]), maxChunk: Math.max(...[...__map.entries()].filter(([k]) => k.startsWith(PLAYLOG.keys.chunk)).map(([, v]) => v.length)), bytes: plRingRead(__store).length }; })()`);
check('the ring holds at most 20 chunks of 24 KB, in all about 480 KB at most', ring.chunks <= 20 && ring.maxChunk <= 24000 + 400 && ring.bytes <= 20 * 24400, JSON.stringify(ring));
check('the oldest chunk went first: what is left is the newest lines, in order, with the last one there', ring.last === 5999 && ring.first > 0 && ring.ordered, JSON.stringify(ring));
check('forget clears the ring and anything waiting', J(`(() => { const L = __mk(); L.ev('tab', { state: 'hidden' }); L.flush(); L.ev('tab', { state: 'visible' }); const had = L.text().length; L.forget(); return [had > 0, L.text().length, [...__map.keys()].length]; })()`).join() === 'true,0,0');
check('the text for a download has what is in the ring and what is still waiting', J(`(() => { const L = __mk(); L.ev('tab', { state: 'hidden' }); L.flush(); L.ev('tab', { state: 'visible' }); return L.text().split('\\n').filter(Boolean).length; })()`) === 2);

// ---- sessions, ON and OFF ----
ls = lines(`__map.set(PLAYLOG.keys.open, 'old'); L.start({ scr: '1x1' }); __sec(L, 3, __snap({})); __t += 5000; L.end('pagehide'); L.end('again')`);
const ss = only(ls, 'session');
check('a session start says "unclean" when the last one never ended, and the end says why and how long', ss[0].phase === 'start' && ss[0].prev === 'unclean' && ss[ss.length - 1].phase === 'end' && ss[ss.length - 1].why === 'pagehide' && ss[ss.length - 1].secs >= 8, JSON.stringify(ss));
check('end twice is one end, and it takes the "open" mark away', ss.filter(s => s.phase === 'end').length === 1 && J(`__map.has(PLAYLOG.keys.open)`) === false);
check('the last scene is closed with its time at the end', only(ls, 'scene').slice(-1)[0].to === 'end' && only(ls, 'scene').slice(-1)[0].secs >= 3, JSON.stringify(only(ls, 'scene')));
ls = lines(`L.start({}); L.setOn(false); L.ev('tab', { state: 'hidden' }); __sec(L, 15, __snap({}), true); L.setOn(true); L.ev('tab', { state: 'visible' })`);
check('OFF writes an off line and then nothing; ON writes a resume line and goes on', ls.map(l => l.ev + (l.phase ? ':' + l.phase : '')).join() === 'session:start,session:off,session:resume,tab' && J(`__map.get(PLAYLOG.keys.on)`) === '1', ls.map(l => l.ev + (l.phase ? ':' + l.phase : '')).join());
check('a logger made with OFF writes nothing at all', J(`(() => { const L = __mk({ on: false }); L.start({}); __sec(L, 30, __snap({}), true); L.end('x'); return [L.text().length, __sink.length]; })()`).join() === '0,0');

// ---- the sink ----
const sink = J(`(() => { const L = __mk(); L.start({}); L.ev('tab', { state: 'hidden' }); L.end('pagehide'); return __sink; })()`);
check('every flush goes to the sink as lines of JSON, and the last one says it is the last', sink.length >= 2 && sink.every(s => s[0].trim().split('\n').every(l => JSON.parse(l).s === 'abcd1234')) && sink[sink.length - 1][1] === true && sink[0][1] === false, JSON.stringify(sink).slice(0, 300));

// ---- never throws ----
const safe = J(`(() => { const out = []; for (const o of [{ storeThrows: true }, { sinkThrows: true }, {}]) { try { const L = __mk(o); L.start({}); __sec(L, 40, __snap({}), true); L.error('error', 'x'); L.count('a'); L.frame(16); L.hidden(true); L.hidden(false); L.end('x'); L.text(); L.forget(); L.setOn(false); L.death(undefined, undefined); L.ev(undefined, null); L.tick(null); L.tick({}); out.push('ok'); } catch (e) { out.push('THREW ' + e.message); } } return out; })()`);
check('a store that throws, a sink that throws and junk arguments never make the logger throw', safe.join() === 'ok,ok,ok', safe.join());
check('the pending list never grows past its cap', J(`(() => { const L = __mk({ storeThrows: true }); for (let i = 0; i < 5000; i++) L.ev('tab', { state: 'x' }); return L.pending.length <= PLAYLOG.pendingMax; })()`));

// ---- the page wiring, on a fake game and a window that records its listeners ----
{
  const w = nodeGame();
  w.run(`
    var __h = {}, __on = (n, f) => { (__h[n] = __h[n] || []).push(f); };
    window.addEventListener = __on; document.addEventListener = __on;
    var __scenes = [], __ev = {};
    const __sc = (key, st) => ({ scene: { key, isActive: () => st === 'run', isPaused: () => st === 'pause' } });
    var __game = { scene: { scenes: __scenes, getScene: k => __scenes.find(s => s.scene.key === k) || null, isActive: k => (__scenes.find(s => s.scene.key === k) || { scene: { isActive: () => false } }).scene.isActive() },
      events: { on: (n, f) => { __ev[n] = f; } } };
    function __set(list) { __scenes.length = 0; list.forEach(([k, st, extra]) => __scenes.push(Object.assign(__sc(k, st), extra || {}))); }
    G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.credits = 321; G.hull = 87; G.mission = 'none'; G.missionId = null;
  `);
  const WJ = e => JSON.parse(w.run(`JSON.stringify(${e})`));
  w.run(`__set([['Space', 'pause', { ship: { x: 1234, y: 5678, body: { speed: 210 }, active: true }, cruising: true }], ['Galaxy', 'run'], ['Title', 'stop']])`);
  const snap = WJ('playlogSnapshot(__game)');
  check('the snapshot picks the screen on top (the map over a paused Space), and says where the ship is, how fast, and that it is cruising', snap.scene === 'Galaxy' && snap.scenes === 'Space+Galaxy' && snap.x === 1230 && snap.y === 5680 && snap.speed === 210 && snap.auto === 'cruise' && snap.credits === 321 && snap.system === 'halcyon', JSON.stringify(snap));
  w.run(`__set([['Station', 'run', { shopOpen: true }], ['Space', 'stop', { ship: { x: 1, y: 1, body: { speed: 99 } } }]])`);
  const st = WJ('playlogSnapshot(__game)');
  check('in the station the panel is named, and a stale Space scene gives no position', st.scene === 'Station' && st.panel === 'shop' && st.x === undefined && st.speed === undefined, JSON.stringify(st));
  w.run(`__set([['Pause', 'run'], ['Space', 'pause'], ['Settings', 'stop']])`);
  check('Pause comes before the scene under it', WJ('playlogSnapshot(__game).scene') === 'Pause');
  w.run(`__set([['Space', 'run', { ship: { x: 5, y: 5, body: { speed: 1 } } }]]); window.game = __game; var __L = playlogInstall(__game);`);
  check('installing returns the logger, hooks the page and does not throw', WJ('!!__L && window.PLAYLOG_LIVE === __L && typeof __ev.step === "function" && !!__h.keydown && !!__h.pagehide && !!__h.error && !!__h.unhandledrejection'));
  w.run(`__keys = (code, target) => __h.keydown.forEach(f => f({ code, key: 'x', repeat: false, target: target || { tagName: 'BODY' } }));`);
  w.run(`__keys('KeyW'); __keys('KeyW'); __keys('Space'); __keys('KeyQ', { tagName: 'INPUT' }); __keys('KeyH', { tagName: 'TEXTAREA' }); __keys('KeyA', { isContentEditable: true }); __h.pointerdown.forEach(f => f({}));`);
  const live = WJ('(() => { __L.flush(); const t = __L.text(); return t; })()');
  w.run(`__h.pagehide.forEach(f => f())`); // the tab closing
  const text = WJ('__L.text()'), evs = text.split('\n').filter(Boolean).map(l => JSON.parse(l)), cnt = evs.filter(e => e.ev === 'counts').pop();
  check('keys are counted by action: W twice as the thrust action, Space as fire, a click as a click', cnt && cnt.a['key:flight: thrust'] === 2 && /^key:flight: fire/.test(Object.keys(cnt.a).find(k => /fire/.test(k)) || '') && cnt.a.click === 1, JSON.stringify(cnt));
  check('a key pressed in a text box, a text area or an editable field is activity and nothing else: no action is counted for it, and no letter is ever a name', Object.keys(cnt.a).every(k => k === 'click' || /^key:[a-z]+: /.test(k)) && Object.values(cnt.a).reduce((a, b) => a + b, 0) === 4, JSON.stringify(cnt));
  check('the session start is in the log and the end says pagehide', evs[0].ev === 'session' && evs[0].phase === 'start' && evs[evs.length - 1].why === 'pagehide', JSON.stringify([evs[0], evs[evs.length - 1]]));
  check('an error event on the window is a line with the message', (() => { w.run(`__h.error.forEach(f => f({ message: 'boom', error: { stack: 'Error: boom' } }))`); w.run(`__L.flush()`); return WJ('__L.text()').includes('"msg":"boom"'); })());
  check('a rejected promise is a line too', (() => { w.run(`__h.unhandledrejection.forEach(f => f({ reason: { message: 'nope', stack: 'x' } }))`); w.run(`__L.flush()`); return WJ('__L.text()').includes('"kind":"promise"'); })());
  check('the settings helpers: OFF then ON, download and forget answer without a page', WJ('[playlogOn(), playlogSet(false), playlogOn(), playlogSet(true), playlogOn(), typeof playlogDownload().ok, playlogForget(), __L.text().length]').join() === 'true,false,false,true,true,boolean,true,0');
  check('the wiring raised no errors', w.errors.length === 0, w.errors.join(' | '));
}

// ---- the Settings row (src/settings.js): the three buttons on a stand-in scene ----
{
  const w = nodeGame();
  w.run(`
    var __pn = 10000; performance.now = () => __pn;
    var __map2 = new Map(), __st = { get: k => (__map2.has(k) ? __map2.get(k) : null), set: (k, v) => { __map2.set(k, String(v)); }, remove: k => { __map2.delete(k); } };
    var __tt = 1000; globalThis.PLAYLOG_LIVE = playlogCreate({ mono: () => __tt, wall: () => 1763424000000, store: __st, sink: null, sid: 'cafe0001' });
    const __btn = () => { const b = { text: '', on: false, edge: 0, set(s) { b.text = s; return b; }, color() { return b; }, mark(o) { b.on = !!o; return b; }, draw() {} }; return b; };
    var __said = [], __row = { armed: null, slots: { plOn: __btn(), plforget: __btn() }, show() {}, say(m) { __said.push(m); } };
    var __S = Settings.prototype;
  `);
  const WJ = e => JSON.parse(w.run(`JSON.stringify(${e})`));
  check('the row starts ON (the default)', WJ('playlogOn()') === true);
  w.run(`__S.playlogToggle.call(__row)`);
  check('the first press turns it OFF: the button says so, the log stops, and the choice is kept for next time', WJ('[playlogOn(), __row.slots.plOn.text, __row.slots.plOn.on, __map2.get(PLAYLOG.keys.on), __said.slice(-1)[0]]').join() === 'false,Play log: OFF,false,0,Play log OFF: nothing more is recorded.');
  w.run(`__S.playlogToggle.call(__row)`);
  check('the second press turns it ON again', WJ('[playlogOn(), __row.slots.plOn.text, __row.slots.plOn.on, __map2.get(PLAYLOG.keys.on)]').join() === 'true,Play log: ON,true,1');
  w.run(`__said.length = 0; PLAYLOG_LIVE.forget(); __S.playlogGet.call(__row)`);
  check('Download with nothing in the log says so and saves nothing', WJ('__said[0]') === 'There is nothing in the log to download yet.');
  w.run(`__said.length = 0; PLAYLOG_LIVE.ev('tab', { state: 'hidden' }); PLAYLOG_LIVE.flush(); __S.playlogGet.call(__row)`);
  check('Download with a log says the file name (longhaul-playlog-<date>.jsonl)', /^Saved longhaul-playlog-\d{8}\.jsonl \(1 KB\) to your downloads\.$/.test(WJ('__said[0]')), WJ('__said[0]'));
  w.run(`__said.length = 0; __S.press.call(__row, 'plforget')`);
  check('Forget log: the first press only asks (the button says "Press again") and the log is still there', WJ('[__row.slots.plforget.text, __said[0], PLAYLOG_LIVE.text().length > 0]').join() === 'Press again,Press Forget log again to erase the log kept in this browser.,true');
  w.run(`__pn += 100; __S.press.call(__row, 'plforget')`);
  check('a second press within a third of a second is a double tap, not a yes', WJ('PLAYLOG_LIVE.text().length > 0'));
  w.run(`__pn += 600; __S.press.call(__row, 'plforget')`);
  check('the second press forgets: the log is empty, the button is back to "Forget log", and it says what stays on the server', WJ('[PLAYLOG_LIVE.text().length, __row.slots.plforget.text, __said.slice(-1)[0]]').join() === '0,Forget log,Play log forgotten. (A copy that the dev server kept stays in its own folder.)');
  check('the row raised no errors', w.errors.length === 0, w.errors.join(' | '));
}

check('the file does not start itself in plain Node (no page, no game)', J(`typeof PLAYLOG_LIVE`) === 'undefined' || J(`PLAYLOG_LIVE`) === null);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PLAYLOG FAIL (${failed} of ${n})` : `PLAYLOG PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

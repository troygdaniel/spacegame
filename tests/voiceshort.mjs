// smoke: the ship stops talking on U, Esc or a click, answers are short by default, and Settings > Sound has Spoken replies (plain Node, mocked audio, no Chrome, no real model call)
// Card space-game-voice-shorter. Troy (18 Nov 2026): "the ship is long winded": he wants to cut it off, he may not want to hear it all.
//   A. what is said aloud: the first sentence or two (voiceFirst), by the player's choice short / full / off (voiceSpokenText), kept in this browser
//   B. the computer: its answer through the mode (shipcompSay), 1 to 2 short sentences by default and more only when asked (the rules, the limits)
//   C. stopping: what plays is cut at once, what waits is dropped, a line still being fetched never plays, and the report says how it ended (counts, never words)
//   D. the doors: U cuts it and starts the ring, Esc cuts it before the pause menu gets a turn, a click on the strip cuts it; the strip keeps the words up while the ship talks
//   E. the play log: one voice_reply line per spoken answer; and the Settings row and its words
// Run: node tests/voiceshort.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 220) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const KEY = 'sk-test-' + 'o'.repeat(28); // built from pieces: tests/hygiene.mjs looks for key-like strings in the repo
const settle = ms => new Promise(r => setTimeout(r, ms));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a fake page and fake audio: a source that remembers it was started or stopped, a buffer that takes as long as the test says, a clock for the strip
g.run(`
  window.__srcs = []; window.__buffers = []; window.__spoke = []; window.__hold = null; window.__mkEl = null;
  AC = { createBufferSource() { const s = { buffer: null, onended: null, started: false, stopped: false, connect() {}, start() { s.started = true; }, stop() { s.stopped = true; } }; __srcs.push(s); return s; }, destination: {} };
  AUD.master = {};
  voiceBuffer = async (text, voice) => { __buffers.push(text); if (__hold) await __hold; return { duration: 2.5 }; };
  const _spoke = voiceSpoke; voiceSpoke = info => { __spoke.push(info); return _spoke(info); };
  VOICE.key = 'k'; VOICE.on = true; VOICE.bad = false; G.muted = false; G.volume = 1;
  window.__fresh = () => { VOICE.said = {}; VOICE.queue.length = 0; VOICE.playing = false; VOICE.cur = null; VOICE.src = null; VOICE.finish = null; VOICE.gen++; __srcs.length = 0; __buffers.length = 0; __spoke.length = 0; __hold = null; VOICE.spoken = 'short'; return 1; };
`);
const fresh = () => g.run('__fresh()');
const nat = () => g.run('(__srcs.length && __srcs[__srcs.length - 1].onended) ? (__srcs[__srcs.length - 1].onended(), 1) : 0'); // the audio ends by itself

// ---------- A. what is said aloud ----------
console.log('A. what is said aloud');
{
  const first = t => J(`voiceFirst(${JSON.stringify(t)})`);
  check('one short sentence is said whole', first('Kepler-4b is 816 km north-east.') === 'Kepler-4b is 816 km north-east.');
  check('a first sentence under 70 letters takes the second one too', first('Press G. Pick a star, then press Enter. The jump takes four seconds.') === 'Press G. Pick a star, then press Enter.');
  const long1 = 'Kestrel is 6.3 ly away and your tank holds 4.1 of the 7.8 ly the jump needs, so you are short.';
  check('a first sentence of 70 letters or more is said alone', first(long1 + ' Refuel at the pump.') === long1, first(long1 + ' Refuel at the pump.'));
  check('"6.3 ly" and "4.1 of the 7.8" are not sentence ends: a full stop counts only before a space or the end', first('It is 6.3 ly. Go.') === 'It is 6.3 ly. Go.');
  check('"!" and "?" end a sentence too', first('Hostiles near! Weapons ready. Fire at will, pilot, when you are in range of anything.') === 'Hostiles near! Weapons ready.');
  const huge = 'word '.repeat(80).trim() + '.';
  const cut = first(huge);
  check('one very long sentence is cut at a space, never mid-word, to 170 letters at most, and ends with a full stop', cut.length <= 171 && /\.$/.test(cut) && /word\.$/.test(cut) && cut.length > 100, cut.length);
  check('nothing in, nothing out; no full stop at all is fine', first('') === '' && first('   ') === '' && first('no stops here') === 'no stops here');
  check('white space is tidied', first('Line one.\n\n  Line   two.') === 'Line one. Line two.');
  g.run(`VOICE.spoken = 'short'`);
  const t = 'Press G. Pick a star, then press Enter. The jump takes four seconds.';
  check('short mode says the first sentence or two', J(`voiceSpokenText(${JSON.stringify(t)})`) === 'Press G. Pick a star, then press Enter.');
  g.run(`VOICE.spoken = 'full'`); check('full mode says all of it', J(`voiceSpokenText(${JSON.stringify(t)})`) === t);
  g.run(`VOICE.spoken = 'off'`); check('off says nothing', J(`voiceSpokenText(${JSON.stringify(t)})`) === '');
  g.run(`VOICE.spoken = 'short'`);
  check('the modes are short, full and off, and short is the default', J('VOICE_SPOKEN_MODES.map(m => m[0]).join()') === 'short,full,off' && J('VOICE.spoken') === 'short');
  check('an unknown mode is refused and changes nothing', J(`voiceSetSpoken('loud')`) === false && J('VOICE.spoken') === 'short');
  check('a choice is kept in this browser and read back on the next load', J(`voiceSetSpoken('off')`) === true && g.run(`localStorage.getItem(VOICE_SPOKEN)`) === 'off' && (g.run(`VOICE.spoken = 'short'; voiceLoad(); VOICE.key = 'k'`), J('VOICE.spoken')) === 'off');
  g.run(`voiceSetSpoken('short')`);
  g.run(`localStorage.setItem(VOICE_SPOKEN, 'garbage'); VOICE.spoken = 'full'; voiceLoad(); VOICE.key = 'k'`);
  check('a bad stored value falls back to short', J('VOICE.spoken') === 'short'); g.run(`localStorage.removeItem(VOICE_SPOKEN)`);
}

// ---------- B. the computer ----------
console.log('B. the computer');
{
  await fresh();
  g.run(`window.__then = []; window.__said = []; const _sayThen = voiceSayThen; voiceSayThen = (t, p, m, start, meta) => { __said.push({ t, meta }); start('audio'); return true; }`);
  const T = 'Press G. Pick a star, then press Enter. The jump takes four seconds.';
  g.run(`VOICE.spoken = 'short'; shipcompSay(${JSON.stringify(T)}, how => __then.push(how))`);
  check('short: the voice gets the first sentence or two, tagged as the computer\'s answer with the letters of the whole', J('__said[0].t') === 'Press G. Pick a star, then press Enter.' && J('__said[0].meta.kind') === 'computer' && J('__said[0].meta.full') === T.length && J('__then.join()') === 'audio');
  g.run(`__said.length = 0; __then.length = 0; VOICE.spoken = 'full'; shipcompSay(${JSON.stringify(T)}, how => __then.push(how))`);
  check('full: all of it', J('__said[0].t') === T);
  g.run(`__said.length = 0; __then.length = 0; VOICE.spoken = 'off'; shipcompSay(${JSON.stringify(T)}, how => __then.push(how))`);
  check('off: nothing is said, and the strip is told "silent" at once so the words never wait', J('__said.length') === 0 && J('__then.join()') === 'silent');
  g.run(`VOICE.spoken = 'short'; voiceSayThen = _sayThen`);

  const rules = J('SC_RULES + SC_ACTS');
  check('the rules say one or two short sentences, and more only when asked', /one or two short sentences/.test(rules) && /only when the pilot asks for more/.test(rules) && !/one to four short sentences/.test(rules));
  check('the persona file says it too', /one or two sentences/.test(src('content/npcs/ship-computer.md')) && /one or two sentences/.test(J('SHIPCOMP.persona') + src('content/npcs/ship-computer.md')));
  check('"tell me more", "explain", "in detail" and "step by step" ask for more; a plain question does not', ['tell me more', 'Explain the jump', 'in detail please', 'step by step', 'walk me through it'].every(q => J(`scWantsMore(${JSON.stringify(q)})`)) && !['where is the Roost', 'how far is the gate', 'what does B do', 'why can\'t I jump'].some(q => J(`scWantsMore(${JSON.stringify(q)})`)));
  g.run(`chatSetKey('${KEY}'); chatSetOn(true); SHIPCOMP.limit.gap = 0; SHIPCOMP.lastAt = 0; SHIPCOMP.busy = false; SHIPCOMP.history = []; SHIPCOMP.limit.day = 400; SHIPCOMP.mem = { day: '', n: 0 }; window.__chat = []; window.__long = 'x'.repeat(1000);
    chatComplete = async o => { __chat.push({ maxTokens: o.maxTokens, maxChars: o.maxChars }); return { text: __long }; }`);
  const sc = `({ scene: { key: 'Space' }, ship: { x: 0, y: 0, body: { speed: 0 } }, enemies: { getChildren: () => [] }, cruising: false, cr: {} })`;
  const ask = async q => { g.run(`window.__r = null; shipcompAsk(${JSON.stringify(q)}, ${sc}).then(r => { window.__r = r; })`); await settle(10); return J('__r'); };
  let r = await ask('where is the Roost');
  check('a plain question: 160 tokens, and a long reply is cut to the short limit (320 letters)', J('__chat[0].maxTokens') === 160 && r.text.length === 320 && J('SHIPCOMP.limit.chars') === 320, r.text && r.text.length);
  g.run(`SHIPCOMP.lastAt = 0; SHIPCOMP.busy = false`);
  r = await ask('tell me more about the jump');
  check('"tell me more": 300 tokens and up to 700 letters', J('__chat[1].maxTokens') === 300 && r.text.length === 700, r.text && r.text.length);
  check('the raw reply keeps room for its DO line either way (the cut is on the words, after)', J('__chat[0].maxChars') === 700 && J('__chat[1].maxChars') === 700);
}

// ---------- C. stopping ----------
console.log('C. stopping');
{
  await fresh(); g.run(`window.__started = 0`);
  g.run(`voiceSay('One long answer from the ship.', 1, undefined, () => { __started++; }, { kind: 'computer', full: 90 })`); await settle(10);
  check('the answer plays: a source was made and started, the voice says it is speaking, and the strip may ask whether it is on the answer', J('__srcs.length') === 1 && J('__srcs[0].started') === true && J('voiceSpeaking()') === true && J(`voiceSpeaking('computer')`) === true && J(`voiceSpeaking('other')`) === false && J('__started') === 1);
  g.run(`voiceSay('A warning follows.', 2); voiceSay('And another.', 1)`);
  check('lines that wait behind it are queued', J('VOICE.queue.length') === 2);
  check('stop: it says so, the source is cut at once, the queue is dropped, nothing is speaking', J(`voiceStop('u')`) === true && J('__srcs[0].stopped') === true && J('VOICE.queue.length') === 0 && J('voiceSpeaking()') === false && J('VOICE.playing') === false);
  check('the report says it was stopped, how, and how much of the answer there was; never the words', J('__spoke.length') === 1 && J('__spoke[0].stopped') === true && J('__spoke[0].how') === 'u' && J('__spoke[0].kind') === 'computer' && J('__spoke[0].full') === 90 && J('__spoke[0].chars') === 30 && J('__spoke[0].mode') === 'short' && !JSON.stringify(J('__spoke')).includes('long answer'));
  await settle(30);
  check('and nothing queued plays afterwards', J('__srcs.length') === 1 && J('__buffers.join("|")') === 'One long answer from the ship.');
  check('stopping again, with nothing to stop, does nothing', J(`voiceStop('u')`) === false && J('__spoke.length') === 1);

  await fresh();
  g.run(`voiceSay('Ends by itself.', 1, undefined, undefined, { kind: 'computer', full: 15 })`); await settle(10); nat(); await settle(10);
  check('an answer that ends by itself reports seconds and stopped = false, and the voice is free again', J('__spoke[0].stopped') === false && J('__spoke[0].how') === 'end' && typeof J('__spoke[0].sec') === 'number' && J('voiceSpeaking()') === false);
  g.run(`voiceSay('Not an answer.', 1)`); await settle(10); nat(); await settle(10);
  check('a line that is not the computer\'s answer (a warning, a character) carries no report', J('__spoke.length') === 1);

  await fresh(); g.run(`window.__started = 0; window.__hold = new Promise(r => { window.__go = r; })`);
  g.run(`voiceSay('Still on its way.', 1, undefined, () => { __started++; }, { kind: 'computer', full: 18 })`); await settle(5);
  check('a line still being fetched counts as speaking (so U or Esc can stop it before it is heard)', J('voiceSpeaking()') === true && J('__srcs.length') === 0);
  check('stopping it reports 0 seconds, stopped', J(`voiceStop('esc')`) === true && J('__spoke[0].stopped') === true && J('__spoke[0].sec') === 0 && J('__spoke[0].how') === 'esc');
  g.run('__go()'); await settle(20);
  check('when the audio arrives anyway it is never played, and its start never runs', J('__srcs.length') === 0 && J('__started') === 0 && J('VOICE.playing') === false);
  g.run(`__hold = null; voiceSay('Next answer.', 1)`); await settle(20);
  check('a line said after the stop plays normally', J('__srcs.length') === 1 && J('__srcs[0].started') === true);
  nat(); await settle(5);

  await fresh();
  g.run(`voiceSay('First.', 1); voiceSay('Second.', 1)`); await settle(10);
  g.run(`voiceStop('click')`); await settle(10);
  g.run(`voiceSay('After the stop.', 1)`); await settle(20);
  check('the old line\'s end does not eat the newer line: the one after a stop is heard', J('__srcs.length') === 2 && J('__srcs[1].started') === true && J('VOICE.cur.text') === 'After the stop.');
  nat(); await settle(5);
}

// ---------- D. the doors ----------
console.log('D. the doors');
{
  await fresh();
  g.run(`window.__pd = 0; window.__sp = 0; window.__pressed = 0; window.__fg = { scene: { isActive: () => false, getScene: () => null, getScenes: () => [{ scene: { key: 'Space' }, leaving: false, dead: false }] } };
    LISTEN.on = true; LISTEN.game = __fg; listenReset(false); const _press = listenPress; listenPress = gm => { __pressed++; return true; };
    window.__key = (code, over) => listenKeyDown(Object.assign({ code, repeat: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault() { __pd++; }, stopPropagation() { __sp++; } }, over || {}), __fg);`);
  g.run(`voiceSay('The ship talks on.', 1, undefined, undefined, { kind: 'computer', full: 20 })`); await settle(10);
  g.run(`__key('KeyU')`);
  check('U while the ship talks cuts the voice at once, and the hold ring starts', J('__srcs[0].stopped') === true && J('voiceSpeaking()') === false && J('__pressed') === 1 && J('__spoke[0].how') === 'u');
  g.run(`__key('KeyU')`);
  check('U with the ship quiet is just the ring (nothing to stop, nothing reported twice)', J('__pressed') === 2 && J('__spoke.length') === 1);

  await fresh(); g.run(`__pd = 0; __sp = 0`);
  g.run(`voiceSay('The ship talks on.', 1, undefined, undefined, { kind: 'computer', full: 20 })`); await settle(10);
  g.run(`__key('Escape')`);
  check('Esc while the ship talks stops the voice and is taken: the pause menu does not see it (default prevented, propagation stopped)', J('__srcs[0].stopped') === true && J('__pd') === 1 && J('__sp') === 1 && J('__spoke[0].how') === 'esc');
  g.run(`__key('Escape')`);
  check('the next Esc is left alone, so it pauses as before', J('__pd') === 1 && J('__sp') === 1);
  check('Esc while it listens still cancels the listening first', (() => { g.run(`LISTEN.s.state = 'listening'; LISTEN.s.seq = 5; voiceSay('Again.', 1)`); g.run(`__key('Escape')`); return J('LISTEN.s.state') === 'idle' && J('__pd') === 2; })());
  g.run(`listenPress = _press; voiceStop('x')`);
}
{
  // the strip: a click stops it, and the words stay up while the ship talks
  await fresh();
  g.run(`
    window.__now = 100000; csNow = () => window.__now;
    window.__mk = tag => { const e = { tag, style: {}, kids: [], attrs: {}, handlers: {}, value: '', textContent: '', focus() {}, blur() {}, setAttribute(k, v) { e.attrs[k] = v; }, appendChild(k) { e.kids.push(k); }, addEventListener(ev, fn) { (e.handlers[ev] = e.handlers[ev] || []).push(fn); } }; return e; };
    document = { activeElement: null, hidden: false, body: { appendChild() {} }, createElement: tag => __mk(tag), addEventListener() {} };
    window.__scene = { scene: { key: 'Space' }, input: { keyboard: { resetKeys() {} } }, panel: false, talk: false, shopOpen: false, leaving: false, dead: false, jmp: null, cr: {} };
    window.__sg = { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) }, scene: { getScenes: () => [__scene] } };
    listenReset(false); cmdstripVoice(null); // the Cancelled. line the Esc check above made is gone
    CMDSTRIP.s.dom = null; CMDSTRIP.s.game = __sg; CMDSTRIP.s.live = { q: 'q', a: 'An answer.', kind: 'say', at: 100000, hold: 4500 }; CMDSTRIP.s.items = [];
  `);
  g.run(`voiceSay('An answer.', 1, undefined, undefined, { kind: 'computer', full: 10 })`); await settle(10);
  g.run(`__now += 9000; cmdstripPaint()`);
  check('the ship is still talking: the answer is kept up past its hold, and the strip can be clicked', J('CMDSTRIP.s.shown') === true && J('CMDSTRIP.s.live.at') === 109000 && J('CMDSTRIP.s.dom.box.style.pointerEvents') === 'auto' && J('CMDSTRIP.s.dom.root.style.opacity') === '1');
  check('a click on the strip stops the voice', (g.run(`CMDSTRIP.s.dom.box.handlers.click[0]()`), true) && J('__srcs[0].stopped') === true && J('__spoke[0].how') === 'click' && J('voiceSpeaking()') === false);
  check('the full text stays: the strip still shows it, and from the stop it has its whole hold', J('CMDSTRIP.s.shown') === true && J('CMDSTRIP.s.live.a') === 'An answer.' && J('CMDSTRIP.s.dom.box.style.pointerEvents') === 'none');
  g.run(`__now += 4400; cmdstripPaint()`);
  check('a moment later it is still up', J('CMDSTRIP.s.shown') === true);
  g.run(`__now += 2000; cmdstripPaint()`);
  check('and then it fades away by itself, as ever', J('CMDSTRIP.s.shown') === false && J('CMDSTRIP.s.items.length') === 1, J('CMDSTRIP.s.shown') + ' ' + J('CMDSTRIP.s.items.length') + ' ' + J('CMDSTRIP.s.live && CMDSTRIP.s.live.at') + ' ' + J('__now'));
  g.run(`document = { activeElement: null, hidden: false, body: { appendChild() {} }, createElement: tag => ({ style: {}, setAttribute() {}, appendChild() {} }) }; CMDSTRIP.s.dom = null`);
}

// ---------- E. the play log, Settings ----------
console.log('E. the play log and Settings');
{
  const evs = [];
  g.run(`window.__evs = []; window.__root = { voiceSpoke(info) { return info; }, G: G }; playlogWrap({ ev: (k, d) => __evs.push([k, d]), count() {}, dealt() {} }, __root)`);
  g.run(`__root.voiceSpoke({ kind: 'computer', sec: 3.2, stopped: true, how: 'u', mode: 'short', chars: 60, full: 190, text: 'SECRET WORDS' })`);
  g.run(`__root.voiceSpoke({ kind: 'bar', sec: 1, stopped: false, how: 'end', mode: 'short', chars: 5, full: 5 })`);
  check('one voice_reply line per spoken answer of the computer, with seconds, how it ended and the letters', J('__evs.length') === 1 && J('__evs[0][0]') === 'voice_reply' && J('__evs[0][1].sec') === 3.2 && J('__evs[0][1].stopped') === true && J('__evs[0][1].how') === 'u' && J('__evs[0][1].mode') === 'short' && J('__evs[0][1].chars') === 60 && J('__evs[0][1].full') === 190);
  check('never the words: the line carries only counts and a how', !JSON.stringify(J('__evs')).includes('SECRET') && /voice_reply: \[/.test(src('src/playlog.js')) && /voice_reply/.test(src('docs/PLAYLOG.md')));
  check('the log may keep these fields (the allow-list names them all)', ['sec', 'stopped', 'how', 'mode', 'chars', 'full'].every(f => J(`PLAYLOG.fields.voice_reply.includes('${f}')`)), J('typeof PLAYLOG'));
  const st = src('src/settings.js');
  check('Settings > Sound has the SPOKEN REPLIES label and a button each for Short, Full and Off (src/settings.js)', /'SPOKEN REPLIES'/.test(st) && /VOICE_SPOKEN_MODES\.forEach/.test(st) && /voiceSetSpoken\(id\)/.test(st));
  check('its words are content/text/ui.md\'s (spoken.use and one line each for short, full and off) and the game says them', ['spoken.use', 'spoken.short', 'spoken.full', 'spoken.off'].every(k => J(`uiText('${k}') !== '${k}' && uiText('${k}').length > 5`)) && /spoken\.use \| Spoken replies/.test(src('content/text/ui.md')) && /U, Esc or a click on the strip stops the voice/.test(J(`uiText('spoken.use')`)));
  check('docs/VOICE.md tells it', /Spoken replies/.test(src('docs/VOICE.md')) && /Esc/.test(src('docs/VOICE.md')));
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nVOICESHORT FAIL (${failed} of ${n})` : `\nVOICESHORT PASS (${n})`);
process.exitCode = failed ? 1 : 0;

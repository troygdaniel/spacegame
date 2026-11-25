// smoke: all the sound stops and stays off (card space-game-sound-stops): every way the game's sound could be left off or down has a way back (plain Node, no Chrome)
// Troy: "sometimes all sound stops and stays off"; he suspected a voice line ending, or Esc. The game's audio code runs on a stand-in AudioContext; nothing plays.
//   A. ducking:   Esc ducks the sound (AUD.ducked); a resume gives it back, and so does the paused scene being stopped (Pause > Title, Restart, New game): the flag was left set
//   B. the context: a context that is not running (suspended, or interrupted by the system) is woken by the next tick and by its own statechange, whatever the reason; a closed one, a muted game and a page with no key or click yet are left alone
//   C. the voice: a line whose network call never answers is let go after VOICE.wait (it kept VOICE.playing set: no voice again, the music ducked for the whole wait); Esc cuts a line at any point and the next one speaks
//   D. mute:      M (the Long Haul's own key) said nothing on the title, in the ready room and everywhere that is not a flight screen: the sound went off with no word and stayed off in the save; it says so everywhere now
//   E. the way back: after every one of those, with the game not muted, the master gain follows the volume
// Run: node tests/soundstops.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const nap = ms => new Promise(r => setTimeout(r, ms));

// the stand-in AudioContext (its state is set by the checks), a fetch that answers or never answers, scenes that keep their listeners
g.run(`
  function __fake() {
    const param = v => { const p = { value: v, ev: [] }; ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'].forEach(k => { p[k] = (x, t) => { p.ev.push([k, x, t]); return p; }; }); p.cancelScheduledValues = () => p; return p; };
    const node = (kind, extra) => Object.assign({ kind, connect(d) { return d; }, disconnect() {}, start() {}, stop() {} }, extra);
    const ac = { sampleRate: 8000, currentTime: 10, state: 'running', destination: {}, resumed: 0, resume() { ac.resumed++; return Promise.resolve(); },
      createOscillator: () => node('osc', { frequency: param(440) }), createGain: () => node('gain', { gain: param(1) }), createBiquadFilter: () => node('filter', { frequency: param(350), Q: param(1) }),
      createBufferSource: () => node('source', { buffer: null }), createConvolver: () => node('convolver', {}), createDynamicsCompressor: () => node('compressor', {}),
      createBuffer: (ch, len, rate) => { const data = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: c => data[c] }; },
      decodeAudioData: async () => ({ duration: 0.2 }) };
    return ac;
  }
  window.AudioContext = function () { return (window.__ac = __fake()); }; window.webkitAudioContext = undefined;
  window.__reset = (muted, volume) => { AC = null; window.__ac = null; Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, rev: null, pool: null, sendNow: undefined, gesture: true, ducked: false }); G.muted = !!muted; G.volume = volume === undefined ? 1 : volume; };
  window.__calls = 0; window.__answer = true;
  window.fetch = () => { __calls++; return __answer ? Promise.resolve({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }) : new Promise(() => {}); };
  window.__scene = key => { const h = {}; return { scene: { key }, add: {}, tweens: {}, time: { now: 0 }, events: { on(n, f) { (h[n] = h[n] || []).push(f); }, off() {}, emit(n) { (h[n] || []).forEach(f => f()); } } }; };
  window.__scenes = ['Station', 'Space', 'Surface', 'Pause', 'Title', 'Campaign', 'CampHub'].map(__scene);
  window.__ints = []; window.setInterval = (f, ms) => { __ints.push(f); return __ints.length; }; setInterval = window.setInterval;
  window.__on = key => __scenes.find(s => s.scene.key === key);
  installAudio({ scene: { scenes: __scenes }, events: { once() {} } });
`);
const gain = () => J('AUD.master.gain.ev.length ? AUD.master.gain.ev[AUD.master.gain.ev.length - 1][1] : AUD.master.gain.value');

console.log('A. ducking');
g.run(`__reset(false, 1); __on('Space').events.emit('create'); __on('Space').events.emit('pause');`);
check('Esc in the Space scene ducks the sound', J('AUD.ducked') === true);
g.run(`__on('Space').events.emit('resume');`);
check('Resume gives it back', J('AUD.ducked') === false);
g.run(`__on('Space').events.emit('pause'); __on('Space').events.emit('shutdown');`); // Pause > Title stops the paused scene
check('the paused scene stopped (Pause > Title, Restart, New game): the duck goes with it', J('AUD.ducked') === false);
g.run(`__on('Campaign').events.emit('create');`);
check('so the Campaign, which has no pad of its own to reset it, starts with the sound up', J('AUD.ducked') === false);
g.run(`__on('Station').events.emit('create'); __on('Station').events.emit('pause'); __on('Space').events.emit('create');`);
check('and a paused Station left for the Space scene (a scene start) is not ducked either', J('AUD.ducked') === false);

console.log('B. the context');
const woke = state => { g.run(`__reset(false, 1); audioReady(); __ac.state = ${JSON.stringify(state)}; __ac.resumed = 0; syncMaster();`); return J('__ac.resumed'); };
check('a suspended context is resumed by the tick', woke('suspended') >= 1);
check('an interrupted one (the system took the output) is too', woke('interrupted') >= 1, woke('interrupted'));
check('a running context is not touched', woke('running') === 0);
check('a closed one is not touched (resume would reject)', woke('closed') === 0);
g.run(`__reset(true, 1); audioReady(); __ac.state = 'interrupted'; __ac.resumed = 0; syncMaster();`);
check('a muted game does not wake the context (nothing to hear; M wakes it)', J('__ac.resumed') === 0);
g.run(`__reset(false, 1); AUD.gesture = false; audioReady(); __ac.state = 'suspended'; __ac.resumed = 0; syncMaster();`);
check('before the first key or click the browser would refuse: not asked', J('__ac.resumed') === 0);
g.run(`__reset(false, 1); audioReady(); __ac.resumed = 0; __ac.state = 'interrupted'; __ac.onstatechange && __ac.onstatechange();`);
check('the context\'s own state change wakes it at once, not at the next tick', typeof J('typeof __ac.onstatechange') === 'string' && J('typeof __ac.onstatechange') === 'function' && J('__ac.resumed') >= 1);
let unhandled = 0; process.on('unhandledRejection', () => { unhandled++; });
g.run(`__reset(false, 1); audioReady(); __ac.state = 'suspended'; __ac.resume = () => Promise.reject(new Error('no')); syncMaster();`);
await nap(20);
check('a resume the browser refuses is not left as an unhandled rejection (and does not throw out of the tick)', unhandled === 0, unhandled);
g.run(`__reset(false, 1); sfx('laser'); __ac.state = 'suspended'; __ac.resumed = 0; sfx('laser');`);
check('and an effect asked for in a context that is not running wakes it', J('__ac.resumed') >= 1);

console.log('C. the voice');
g.run(`__reset(false, 1); VOICE.key = 'TEST-KEY-NOT-REAL-ABCDEFGHIJKL'; VOICE.on = true; VOICE.bad = false; VOICE.fails = 0; VOICE.pauseUntil = 0; VOICE.said = {}; VOICE.cache.clear(); VOICE.queue.length = 0; VOICE.playing = false; VOICE.wait = 60; __answer = false; __calls = 0;`);
check('VOICE.wait is a number of milliseconds a line may wait for its network call', J('typeof VOICE.wait') === 'number' && J('VOICE.wait') > 0);
check('a line is taken', J(`voiceSay('The first line.', 1)`) === true);
check('and it is on its way: VOICE.playing is set (and the music ducked while it is: the way it always was)', J('VOICE.playing') === true && J('__calls') === 1);
await nap(200);
check('the call never answers: after VOICE.wait the line is let go, nothing is playing, nothing waits', J('VOICE.playing') === false && J('VOICE.queue.length') === 0 && J('VOICE.cur') === null, J('({ p: VOICE.playing, q: VOICE.queue.length })'));
check('the music is no longer ducked for it', J(`typeof musicDuck === 'function' ? musicDuck() : 1`) === 1);
g.run(`__answer = true;`);
check('and the next line speaks (a second call is made)', J(`voiceSay('The second line.', 1)`) === true);
await nap(30);
check('it is on the air', J('VOICE.playing') === true && J('__calls') === 2);
g.run(`voiceStop('esc');`);
check('Esc cuts it: nothing is playing and the next line is taken at once', J('VOICE.playing') === false && J(`voiceSay('The third line.', 1)`) === true);
await nap(30);
g.run(`voiceStop('esc'); VOICE.queue.length = 0;`);
g.run(`__answer = false; VOICE.said = {};`);
g.run(`voiceSay('A line stopped while it waits.', 1); voiceStop('esc');`);
check('Esc while a line still waits for its call: nothing is playing, and the late answer plays nothing', J('VOICE.playing') === false);
g.run(`__answer = true; VOICE.said = {};`);
check('and the next line is taken', J(`voiceSay('A line after the stop.', 1)`) === true);
await nap(30); g.run(`voiceStop('esc');`);

console.log('D. mute says so');
g.run(`
  window.__toasts = []; window.toast = (s, text, color) => { __toasts.push({ scene: s.scene.key, text }); };
  window.__game = (keys) => ({ scene: { isActive: k => keys.includes(k), getScenes: () => keys.map(k => __scenes.find(s => s.scene.key === k)) } });
  saveGame = () => {};
`);
const mute = keys => { g.run(`__reset(false, 1); __toasts.length = 0; toggleMute(__game(${JSON.stringify(keys)}));`); return J('({ muted: G.muted, toasts: __toasts.slice() })'); };
let r = mute(['Space']);
check('in the flight screens it still says so (the Long Haul\'s own toast)', r.muted === true && r.toasts.length === 1 && r.toasts[0].scene === 'Space' && /muted/i.test(r.toasts[0].text), JSON.stringify(r));
r = mute(['Title']);
check('on the title it says so too (it said nothing: the sound was off and nothing told him)', r.muted === true && r.toasts.length === 1 && r.toasts[0].scene === 'Title' && /muted/i.test(r.toasts[0].text), JSON.stringify(r));
r = mute(['CampHub']);
check('in the ready room it says so', r.muted === true && r.toasts.length === 1 && r.toasts[0].scene === 'CampHub', JSON.stringify(r));
g.run(`__reset(true, 1); __toasts.length = 0; toggleMute(__game(['CampHub']));`);
check('and says so when it comes back on', J('G.muted') === false && J('__toasts.length') === 1 && /on/i.test(J('__toasts[0].text')) && !/muted/i.test(J('__toasts[0].text')));
r = mute(['Pause']);
check('the pause menu still shows the state itself: no toast there', r.muted === true && r.toasts.length === 0, JSON.stringify(r));
r = mute([]);
check('with no scene to put it on nothing throws and the sound is still toggled', r.muted === true && r.toasts.length === 0);

console.log('E. the way back');
g.run(`__reset(true, 1); audioReady(); G.muted = false; syncMaster();`);
check('muted, then M: the master gain is the volume again (not left at 0)', gain() === 1, gain());
g.run(`__reset(false, 0.5); audioReady(); __on('Space').events.emit('create'); __on('Space').events.emit('pause'); __on('Space').events.emit('shutdown'); syncMaster();`);
check('a pause left by the title: the master gain is the volume (0.5)', gain() === 0.5, gain());

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SOUND STOPS FAIL (${failed} of ${n})` : `SOUND STOPS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

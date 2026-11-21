// smoke: the generative music: the plan (seeded, in the scale, sparse, never loud), the engine on a stand-in AudioContext (ducks, off, mute, no files), the Music row in Settings (plain Node, no Chrome)
// Card space-game-music (src/music.js). Nothing plays and there is no browser. Two halves:
//   the plan     musicMaker(seed, mood) is pure: the same seed gives the same notes however often it is asked (the clock is passed in); every note
//                is a tone of the mode; the pad changes chord every half a minute and never to the chord it had; the bells are sparse; the loudest
//                instant of ten minutes stays under the cap; a mood change turns the next chord to the new mood; a clock that jumps leaves no backlog
//   the engine   musicTick() against a stand-in AudioContext that records every node and every automation: no scene, no music; the Space scene
//                starts a bus into the master gain (so the volume and mute of the game apply) and the shared reverb; the pause and the ship's voice
//                duck it and it comes back; Music off, volume 0, mute or the game's volume 0 stop it; leaving space fades it out; a new start is a
//                new seed; the notes scheduled are the plan's, each oscillator started in the future; no audio file and no network call
//   Settings     the Music row (switch, volume in tenths, its sentence from content/text/ui.md), kept in this browser, and every row of Sound on the panel
// Whether it sounds good is Troy's ear, not a test's: how loud at most and what notes it may play are what is pinned here.
// Run: node tests/music.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
// the engine starts each piece from Math.random: with the game's own random the loudest-instant check below saw a different seed every run and failed one run in six (card space-game-night-cosmetics, finding I).
// The game's random is seeded here (the same run every time); the bus's clamp is checked on a hundred and twenty seeds of its own, below
g.run(`(function () { let a = 20261121; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`);
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// the plan, run in the game's own context: minutes of the clock at `step` seconds a call, for a seed
g.run(`
  function __play(seed, minutes, step, mood, from) {
    const m = musicMaker(seed, mood || 'space'), notes = [], t0 = from === undefined ? 100 : from;
    for (let t = t0; t < t0 + minutes * 60; t += step) notes.push(...m.take(t, 4));
    return { m, notes };
  }
  function __sig(notes) { return notes.map(n => [n.kind, +n.at.toFixed(6), +n.end.toFixed(6), +n.freq.toFixed(4), +n.vel.toFixed(6), +n.pan.toFixed(6)].join(',')).join('|'); }
`);

console.log('the plan: the same seed gives the same music, however it is asked for');
{
  const a = J(`__sig(__play(7, 10, 0.4).notes)`), b = J(`__sig(__play(7, 10, 0.4).notes)`), c = J(`__sig(__play(7, 10, 2.5).notes)`), d = J(`__sig(__play(8, 10, 0.4).notes)`);
  check('a seed run twice: the same notes', a === b && a.length > 1000);
  check('and asked for in steps of 0.4 s or of 2.5 s: the same notes (the pad and the bells each have a random of their own)', a.slice(0, 3000) === c.slice(0, 3000) && a.split('|').length > 100, a.split('|').length + ' vs ' + c.split('|').length);
  check('another seed: other music (never the same twice)', a !== d && a.split('|').slice(0, 20).join() !== d.split('|').slice(0, 20).join());
  check('each start of the music takes a new seed from the random generator, not a fixed one', /Math\.random\(\) \* 4294967296/.test(read('src/music.js')));
}

console.log('the plan: every note is in the scale');
const modeOf = J(`MUSIC.moods.space.mode`);
{
  const r = J(`(() => { const out = {}; for (const seed of [1, 2, 3, 99, 12345, 777777]) { const { notes } = __play(seed, 10, 0.4); out[seed] = { n: notes.length, bad: notes.filter(n => !musicInMode(n.freq, '${modeOf}')).length }; } return out; })()`);
  check('six seeds, ten minutes each: every pad note and every bell is a tone of ' + modeOf + ' above the drone\'s E (' + Object.values(r).map(x => x.n).join(', ') + ' notes)', Object.values(r).every(x => x.n > 80 && x.bad === 0));
  check('the chords themselves are tones of the mode (so any chord after any other is consonant)', J(`MUSIC.moods.space.chords.every(c => c.every(s => MUSIC.modes.${modeOf}.includes(((s % 12) + 12) % 12)))`));
  check('the tonic is the space drone\'s: 41.2034 Hz is E1, the drone of src/audio.js is the 41 Hz saw', Math.abs(J('MUSIC.root') - 41.2034) < 1e-9 && /aOsc\(list, 'sawtooth', 41,/.test(read('src/audio.js')));
  check('pads sit between A2 and B4, bells between E4 and D#6 (nothing shrill, nothing under the drone)', J(`(() => { const { notes } = __play(5, 10, 0.4); const lo = musicFreq(17) - 0.01, hi = musicFreq(43) + 0.01, blo = musicFreq(36) - 0.01, bhi = musicFreq(62) + 0.01; return notes.every(n => n.kind === 'pad' ? n.freq >= lo && n.freq <= hi : n.freq >= blo && n.freq <= bhi); })()`));
}

console.log('the plan: sparse, slow, and never loud');
{
  const r = J(`(() => { const out = []; for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const { notes } = __play(seed, 10, 0.4), pads = notes.filter(n => n.kind === 'pad'), bells = notes.filter(n => n.kind === 'bell'), w = musicWorst(notes); out.push({ pads: pads.length / 10, bells: bells.length / 10, peak: w.peak, voices: w.voices }); } return out; })()`);
  check('pad notes: three to eight a minute (a chord of three every 28 to 52 s)', r.every(x => x.pads >= 3 && x.pads <= 8), r.map(x => x.pads).join(' '));
  check('bells: three to twelve a minute, a few and spaced out', r.every(x => x.bells >= 3 && x.bells <= 12), r.map(x => x.bells).join(' '));
  check('never more than ten notes sounding at once (six of a chord changing over and a few bells)', r.every(x => x.voices <= 10), r.map(x => x.voices).join(' '));
  const cap = J('MUSIC.cap'), level = J('MUSIC.level');
  check(`the loudest instant of eight seeds, ten minutes each, counting every note at its full velocity for its whole life: ${Math.max(...r.map(x => x.peak)).toFixed(2)} on the bus, ${(Math.max(...r.map(x => x.peak)) * level).toFixed(2)} after it, under the cap of ${cap} at volume 1`, r.every(x => x.peak * level <= cap));
  check('and at the default volume (70%) that is under 0.21 of full scale, about 14 dB down, the loudest instant there is', r.every(x => x.peak * level * J('MUSIC.vol') <= 0.21), (Math.max(...r.map(x => x.peak)) * level * J('MUSIC.vol')).toFixed(3));
  check('every velocity is inside the mood\'s bounds, so no note is louder than its peak', J(`(() => { const m = MUSIC.moods.space; const { notes } = __play(3, 10, 0.4); return notes.every(n => n.vel >= (n.kind === 'pad' ? m.padVel[0] : m.bellVel[0] * 0.8) - 1e-9 && n.vel <= (n.kind === 'pad' ? m.padVel[1] : m.bellVel[1]) + 1e-9); })()`));
  check('the peak of one note is small: a pad 0.10 and a bell 0.07 at velocity 1', J('MUSIC.peak.pad') <= 0.1 && J('MUSIC.peak.bell') <= 0.07);
  const gaps = J(`(() => { const { notes } = __play(4, 20, 0.4); const b = notes.filter(n => n.kind === 'bell').map(n => n.at).sort((x, y) => x - y); const d = []; for (let i = 1; i < b.length; i++) d.push(b[i] - b[i - 1]); return { longest: Math.max(...d), shortest: Math.min(...d) }; })()`);
  check('the bells come in a pair now and then (under a second apart) and otherwise six seconds or more apart; and in twenty minutes there is a rest of at least eighteen seconds', gaps.shortest < 1.3 && gaps.longest >= 18, JSON.stringify(gaps));
}

console.log('the plan: the chord drifts');
{
  const r = J(`(() => { const m = musicMaker(11, 'space'); for (let t = 100; t < 100 + 1800; t += 0.4) m.take(t, 4); return null; })()`);
  const c = J(`(() => { const m = musicMaker(11, 'space'), seen = []; let last = null; for (let t = 100; t < 100 + 1800; t += 0.4) { m.take(t, 4); const ch = m.state.chords[m.state.chords.length - 1]; if (ch && (!last || ch.at !== last.at)) { seen.push({ at: ch.at, hold: ch.end - ch.at, i: ch.i }); last = ch; } } return seen; })()`);
  check('in half an hour the chord changes about forty times, each held 28 to 52 s', c.length >= 30 && c.length <= 70 && c.every(x => x.hold >= 28 - 1e-9 && x.hold <= 52 + 1e-9), c.length + ' chords');
  check('and never to the chord it already had', c.every((x, i) => i === 0 || x.i !== c[i - 1].i));
  check('all four chords come up', new Set(c.map(x => x.i)).size === J('MUSIC.moods.space.chords.length'));
  check('a pad swells in over 5 s and fades over 8: a chord is under the next, not cut', J(`(() => { const { notes } = __play(2, 5, 0.4); const pads = notes.filter(n => n.kind === 'pad'); return pads.every(p => p.attack === 5 && p.release === 8 && Math.abs(p.at + p.attack + p.hold + p.release - p.end) < 1e-6 && p.hold >= 0); })()`));
}

console.log('the plan: a new mood, a clock that jumps, nothing in the past');
{
  g.run(`MUSIC.moods.test = { mode: 'aeolian', chords: [[24, 27, 31, 34], [20, 27, 32, 34]], chordEvery: [20, 30], voices: 3, stagger: [0, 2], attack: 3, release: 4, padVel: [0.3, 0.5], bellEvery: [10, 20], bellPair: 0, bellRange: [40, 60], bellDecay: [3, 4], bellVel: [0.3, 0.5], rest: { every: [200, 300], len: [10, 20] } };`);
  const r = J(`(() => {
    const m = musicMaker(5, 'space'); let all = []; for (let t = 100; t < 200; t += 0.4) all.push(...m.take(t, 4));
    const same = m.setMood('space', 200), unknown = m.setMood('nope', 200), changed = m.setMood('test', 200), after = [];
    for (let t = 200; t < 400; t += 0.4) after.push(...m.take(t, 4));
    const late = after.filter(n => n.at >= 201.5), pads = late.filter(n => n.kind === 'pad'), bells = late.filter(n => n.kind === 'bell');
    return { same, unknown, changed, mood: m.mood, padsInTest: pads.every(n => musicInMode(n.freq, 'aeolian') && [20, 24, 27, 31, 32, 34].some(s => Math.abs(n.freq - musicFreq(s)) < 0.01)), bellsInTest: bells.every(n => musicInMode(n.freq, 'aeolian')), pads: pads.length, bells: bells.length, firstNew: pads.length ? Math.min(...pads.map(p => p.at)) : null };
  })()`);
  check('setMood: the same mood and an unknown one change nothing; a known one does', r.same === false && r.unknown === false && r.changed === true && r.mood === 'test');
  check('the next chord is of the new mood a second after the change, and its pad and bells are tones of the new mode', r.pads >= 3 && r.padsInTest && r.bellsInTest && r.firstNew >= 201 && r.firstNew <= 205, JSON.stringify(r));
  const jump = J(`(() => { const m = musicMaker(9, 'space'); m.take(100, 4); const later = m.take(5000, 4); return { n: later.length, early: later.filter(n => n.at < 5000).length }; })()`);
  check('the clock jumps (a tab asleep for an hour): the notes begin again from now, no backlog of an hour', jump.n > 0 && jump.n < 12 && jump.early === 0, JSON.stringify(jump));
  check('no note ever starts before the clock it was asked at', J(`(() => { const m = musicMaker(21, 'space'); let ok = true; for (let t = 50; t < 50 + 600; t += 0.4) m.take(t, 4).forEach(x => { if (x.at < t - 1e-9) ok = false; }); return ok; })()`));
}

// ---------------------------------------------------------------- the engine, on a stand-in AudioContext
g.run(`
  function __fake() {
    const made = { osc: 0, gain: 0, filter: 0, source: 0, buffer: 0, convolver: 0, compressor: 0, panner: 0 }, nodes = [];
    const param = v => { const p = { value: v, ev: [] };
      p.setValueAtTime = (x, t) => { p.ev.push(['set', x, t]); return p; }; p.linearRampToValueAtTime = (x, t) => { p.ev.push(['lin', x, t]); return p; };
      p.exponentialRampToValueAtTime = (x, t) => { p.ev.push(['exp', x, t]); return p; }; p.setTargetAtTime = (x, t, tc) => { p.ev.push(['target', x, t, tc]); return p; };
      p.cancelScheduledValues = t => { p.ev = p.ev.filter(e => e[2] < t); return p; };
      return p; };
    const node = (kind, extra) => { made[kind]++; const o = Object.assign({ kind, to: [], connect(d) { o.to.push(d); return d; }, disconnect() { o.to = []; o.gone = true; }, start(t) { o.startAt = t; }, stop(t) { o.stopAt = t; } }, extra); nodes.push(o); return o; };
    const ac = { sampleRate: 8000, currentTime: 10, state: 'running', destination: { kind: 'destination' }, made, nodes, resume() {},
      createOscillator: () => node('osc', { type: 'sine', frequency: param(440) }),
      createGain: () => node('gain', { gain: param(1) }),
      createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }),
      createStereoPanner: () => node('panner', { pan: param(0) }),
      createBufferSource: () => node('source', { buffer: null, loop: false }),
      createConvolver: () => node('convolver', { buffer: null }),
      createDynamicsCompressor: () => node('compressor', {}),
      createBuffer: (ch, len, rate) => { made.buffer++; const data = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: c => data[c] }; } };
    return ac;
  }
  var __made = 0, __ac = null; window.AudioContext = function () { __made++; return (__ac = __fake()); }; window.webkitAudioContext = undefined;
  function __reset(o) {
    o = o || {}; AC = null; __ac = null; __made = 0; if (MUS.bus) MUS.bus = null;
    Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, rev: null, pool: null, sendNow: undefined, gesture: o.gesture !== false, ducked: false });
    G.muted = !!o.muted; G.volume = o.volume === undefined ? 1 : o.volume; MUSIC.on = o.on !== false; MUSIC.vol = o.vol === undefined ? 0.7 : o.vol;
    MUS.scene = o.scene === undefined ? 'Space' : o.scene; MUS.lastPreview = 0; VOICE.playing = false;
  }
  function __run(secs, step) { for (let t = 0; t < secs; t += step) { if (__ac) __ac.currentTime += step; musicTick(); } }
  function __bus() { return MUS.bus; }
  function __target() { const e = MUS.bus.out.gain.ev.filter(x => x[0] === 'target'); return e.length ? e[e.length - 1][1] : null; }
`);

console.log('the engine: nothing unless the scene, the switch, the volumes and the browser all say so');
for (const [tag, o] of [['no scene (the Title, a station without a mood)', { scene: null }], ['the Station scene (no mood in this slice)', { scene: 'Station' }], ['Music off', { on: false }], ['Music volume 0', { vol: 0 }], ['sound muted (M)', { muted: true }], ['the game volume 0', { volume: 0 }], ['no key or click yet (a browser plays nothing before)', { gesture: false }]]) {
  g.run(`__reset(${JSON.stringify(o)}); __run(20, 0.4);`);
  check(`${tag}: no bus, no oscillator, no audio context made for it`, J('MUS.bus') === null && (J('__ac') === null || J('__ac.made.osc') === 0), J('__ac && __ac.made'));
}

console.log('the engine: the Space scene starts it');
{
  g.run(`__reset(); __run(30, 0.4);`);
  const b = J(`(() => { const b = MUS.bus; return { has: !!b, mood: b.mood, seed: b.seed, osc: __ac.made.osc, played: b.played.length, toMaster: b.out.to.includes(AUD.master), send: !!b.send, rev: b.send && AUD.rev ? b.send.to.includes(AUD.rev.in) : false }; })()`);
  check('a bus of the space mood, with a seed', b.has && b.mood === 'space' && Number.isInteger(b.seed));
  check('into the master gain of audio.js (the game\'s volume and mute apply to it) and, through a send, into the shared reverb', b.toMaster && b.send && b.rev);
  check('notes are scheduled: oscillators exist, two for each pad note and three for each bell', b.osc > 0 && b.osc === J('__bus().played.reduce((s, x) => s + (x.kind === "pad" ? 2 : 3), 0)'), b.osc + ' oscillators for ' + b.played + ' notes');
  check('each oscillator is started on the audio clock, not before it, and told when to stop; none starts a note in the past', J(`__ac.nodes.filter(n => n.kind === 'osc').every(n => n.startAt >= 10 && n.stopAt > n.startAt)`));
  check('every oscillator\'s pitch is the plan\'s: a note\'s own pitch (or its detune, or a partial of a bell)', J(`(() => { const ratios = [1, 1.003, 2, 2.76]; return __ac.nodes.filter(n => n.kind === 'osc').every(o => { const s = musicSemi(o.frequency.value / ratios.find(r => { const f = o.frequency.value / r, x = musicSemi(f); return Math.abs(x - Math.round(x)) < 1e-6; })); return Math.abs(s - Math.round(s)) < 1e-6; }); })()`));
  check('the bus fades in: its gain starts at 0 and the target is the level times the music volume (0.6 x 0.7)', J('__bus().out.gain.value') === 0 && Math.abs(J('__target()') - J('MUSIC.level') * 0.7) < 1e-9, J('__target()'));
}

console.log('the engine: the volume, the pause, the ship voice');
{
  g.run(`__reset(); __run(5, 0.4);`);
  const at = () => J('__target()');
  const L = J('MUSIC.level');
  check('music volume 100%: the bus follows it up (the level, 0.6)', (g.run(`musicSetVol(1); __run(1, 0.4);`), Math.abs(at() - L) < 1e-9), at());
  check('music volume 50%: half of that', (g.run(`musicSetVol(0.5); __run(1, 0.4);`), Math.abs(at() - L * 0.5) < 1e-9));
  g.run(`musicSetVol(0.5); AUD.ducked = true; __run(1, 0.4);`);
  check('the pause (audio.js ducks): the music goes down to 30% of that, quickly', Math.abs(at() - L * 0.5 * 0.3) < 1e-9 && J(`__bus().out.gain.ev.filter(x => x[0] === 'target').pop()[3]`) <= 0.3, at());
  g.run(`AUD.ducked = false; __run(1, 0.4);`);
  check('and back when the pause ends, slowly (a time constant over a second)', Math.abs(at() - L * 0.5) < 1e-9 && J(`__bus().out.gain.ev.filter(x => x[0] === 'target').pop()[3]`) >= 1);
  g.run(`VOICE.playing = true; __run(1, 0.4);`);
  check('the ship\'s voice (VOICE.playing): the music goes down to 40%', Math.abs(at() - L * 0.5 * 0.4) < 1e-9, at());
  g.run(`AUD.ducked = true; __run(1, 0.4);`);
  check('the pause and the voice together: the lower of the two, not both', Math.abs(at() - L * 0.5 * 0.3) < 1e-9, at());
  g.run(`AUD.ducked = false; VOICE.playing = false; __run(1, 0.4);`);
  check('both over: back to the full level', Math.abs(at() - L * 0.5) < 1e-9);
  check('the music never touches the master gain itself: M and the game\'s volume stay the game\'s (the bus feeds the master, nothing writes to it)', !/AUD\.master\.gain/.test(read('src/music.js')) && !/G\.volume\s*=/.test(read('src/music.js')) && !/G\.muted\s*=/.test(read('src/music.js')));
}

console.log('the engine: it stops when it should, and a new start is a new piece');
{
  g.run(`__reset(); __run(10, 0.4);`);
  const seed1 = J('MUS.bus.seed'), bus1 = J(`(() => { window.__b1 = MUS.bus; return 1; })()`);
  g.run(`MUS.scene = 'Station'; __run(1, 0.4);`);
  check('leaving space (the Station scene runs): the bus is let go, its gain falls to 0 (fade out), nothing new is scheduled', J('MUS.bus') === null && J(`__b1.out.gain.ev.filter(x => x[0] === 'target').pop()[1]`) === 0);
  g.run(`const __n = __ac.made.osc; __run(10, 0.4); window.__noMore = __ac.made.osc === __n;`);
  check('and while it is away it makes no oscillator', J('__noMore'));
  g.run(`MUS.scene = 'Space'; __run(10, 0.4);`);
  check('back in space: a bus of its own with a new seed (never the same twice)', J('MUS.bus') !== null && J('MUS.bus.seed') !== seed1 && J('MUS.bus') !== J('__b1'));
  g.run(`musicSetOn(false); __run(1, 0.4);`);
  check('Music turned off in Settings while it plays: it fades out at once', J('MUS.bus') === null);
  g.run(`musicSetOn(true); __run(2, 0.4);`);
  check('turned on again: it starts', J('MUS.bus') !== null);
  g.run(`G.muted = true; __run(1, 0.4);`);
  check('M (mute): it stops and makes nothing more; unmuted it comes back', J('MUS.bus') === null && (g.run(`G.muted = false; __run(2, 0.4);`), J('MUS.bus') !== null));
  g.run(`musicSetVol(0); __run(1, 0.4);`);
  check('Music volume 0 is off', J('MUS.bus') === null);
}

console.log('the bus: the loudest instant is under the cap for every seed');
{
  g.run(`function __plan(seed, minutes) { const m = musicMaker(seed, 'space'), notes = []; for (let t = 100; t < 100 + minutes * 60; t += 0.4) notes.push(...m.take(t, 4)); return notes; }
    window.__fit = seed => { const notes = __plan(seed, 20), played = []; notes.forEach(n => { musicFit(played, n); played.push(n); if (played.length > 200) played.shift(); }); return notes; };`);
  const cap = J('MUSIC.cap'), level = J('MUSIC.level'), raw = [], fit = [];
  for (let sd = 1; sd <= 120; sd++) { raw.push(J(`musicWorst(__plan(${sd}, 20)).peak`)); fit.push(J(`musicWorst(__fit(${sd})).peak`)); }
  check('the plan alone is NOT always under the cap: some seeds play a hair over (this is the flake the test had: one run in six)', raw.filter(p => p * level > cap).length >= 5, raw.filter(p => p * level > cap).length + ' of 120 seeds, loudest ' + Math.max(...raw).toFixed(3));
  check('through the bus (musicFit) the loudest instant of twenty minutes is under the cap on all 120 seeds', fit.every(p => p * level <= cap), 'loudest ' + Math.max(...fit).toFixed(4) + ' on the bus, ' + (Math.max(...fit) * level).toFixed(4) + ' after it, cap ' + cap);
  check('and the clamp only ever quietens: no note is louder than the plan made it, none is below zero, and a seed that was under the cap is not touched at all', J(`(() => { let ok = true, same = 0; for (let sd = 1; sd <= 40; sd++) { const a = __plan(sd, 20), b = __fit(sd); a.forEach((n, i) => { if (b[i].vel > n.vel + 1e-12 || b[i].vel < 0) ok = false; }); if (musicWorst(a).peak * MUSIC.level <= MUSIC.cap && a.every((n, i) => b[i].vel === n.vel)) same++; } return ok && same >= 20; })()`));
  check('the engine uses it: every note goes through musicFit before it is voiced', /musicFit\(b\.played, n\); musicVoice\(b\.out, n\)/.test(read('src/music.js')));
  check('the plan itself is untouched by it (pure, in its mood\'s bounds): musicMaker does not call musicFit', !/musicFit/.test(read('src/music.js').slice(read('src/music.js').indexOf('function musicMaker'), read('src/music.js').indexOf('function musicWorst'))));
}

console.log('the engine: never loud, however long it plays; and the nodes do not pile up');
{
  g.run(`__reset(); musicSetVol(1); __run(20 * 60, 0.4);`);
  const r = J(`(() => { const b = MUS.bus, w = musicWorst(b.played), top = Math.max(...b.out.gain.ev.filter(x => x[0] === 'target').map(x => x[1])); return { peak: w.peak, voices: w.voices, top, kept: b.played.length, osc: __ac.made.osc, gain: __ac.made.gain, nodes: __ac.nodes.length }; })()`);
  check('twenty minutes at music volume 100%: the bus never asks for more than the level (0.4)', r.top <= J('MUSIC.level') + 1e-9, r.top);
  check('and the notes of the last 200 together, after the bus, stay under the cap', r.peak * J('MUSIC.level') <= J('MUSIC.cap'), r.peak);
  check('a voice\'s own gain never goes above its note\'s peak: the envelope of every pad and bell tops out at velocity times 0.10 or 0.07', J(`(() => { let ok = true; __ac.nodes.filter(n => n.kind === 'gain' && n.gain.ev.length >= 3 && !n.to.includes(AUD.master)).forEach(e => { const top = Math.max(...e.gain.ev.map(x => x[1])); if (top > 0.1 + 1e-9) ok = false; }); return ok; })()`));
  check('a note is about six audio nodes and there are about ten notes a minute: twenty minutes make under 2,000 nodes, not tens of thousands', r.nodes < 2000, r.nodes);
  check('each finished note lets go of its connection (the first oscillator\'s ended event disconnects the envelope)', /oscs\[0\]\.onended = \(\) => \{ try \{ env\.disconnect\(\)/.test(read('src/music.js')));
}

console.log('the engine: the preview, and the scenes it listens to');
{
  g.run(`__reset({ scene: null }); __ac = null;`);
  check('the preview with the music off or muted: nothing is made', (g.run(`MUSIC.on = false;`), J('musicPreview()') === false) && (g.run(`MUSIC.on = true; G.muted = true;`), J('musicPreview()') === false) && J('__ac === null || __ac.made.osc === 0'));
  g.run(`__reset({ scene: null }); window.__t0 = 0;`);
  const p = J(`(() => { const ok = musicPreview(); const bells = __ac.nodes.filter(n => n.kind === 'osc'); const bus = __ac.nodes.filter(n => n.kind === 'gain').find(n => n.to.includes(AUD.master)); return { ok, osc: bells.length, level: bus ? bus.gain.value : null, again: musicPreview() }; })()`);
  check('a press in Settings plays two bells (six oscillators) on a bus of their own at the level the music will have (the level x the volume), into the master gain', p.ok && p.osc === 6 && Math.abs(p.level - J('MUSIC.level') * 0.7) < 1e-9, JSON.stringify(p));
  check('and a second press within a third of a second plays nothing (a held button does not pile bells up)', p.again === false);
  const sc = J(`(() => {
    const on = {}, fake = key => ({ scene: { key }, events: { on: (e, f) => { (on[key] = on[key] || {})[e] = f; } } });
    const game = { scene: { scenes: [fake('Space'), fake('Station'), fake('Surface'), fake('Title')] }, events: { once() {} } };
    MUS.scene = null; const timer = musicInstall(game); clearInterval(timer);
    const seen = [];
    on.Space.create(); seen.push(MUS.scene); on.Space.shutdown(); seen.push(MUS.scene);
    on.Station.create(); seen.push(MUS.scene); on.Surface.shutdown(); seen.push(MUS.scene); on.Station.shutdown(); seen.push(MUS.scene);
    return { seen, title: !!on.Title };
  })()`);
  check('musicInstall: Space, Station and Surface set the scene on create and clear it on their shutdown (a shutdown of another scene leaves it); the Title is not watched', JSON.stringify(sc.seen) === JSON.stringify(['Space', null, 'Station', 'Station', null]) && !sc.title, JSON.stringify(sc));
  check('only the Space scene has a mood in this slice: musicMoodFor(Space) is space, any other scene none', J(`[musicMoodFor('Space'), musicMoodFor('Station'), musicMoodFor('Surface'), musicMoodFor(null), musicMoodFor('Title')]`).join() === 'space,,,,');
}

console.log('no files, no network, no key');
{
  const src = read('src/music.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check('the music code has no audio file, no Audio element, no fetch, no request: it is oscillators', !/\.(mp3|wav|ogg|m4a|flac)\b/i.test(src) && !/new Audio\(|fetch\(|XMLHttpRequest|decodeAudioData|createMediaElementSource/.test(src));
  check('no key, no address in it', !/https?:\/\//.test(src) && !/api[_-]?key|Authorization/i.test(src));
  const html = read('index.html'), at = s => html.indexOf('src/' + s);
  check('index.html loads src/music.js after audio.js, voice.js, settings.js and main.js (it reads their names, and installs on the game main.js made)', at('music.js') > at('audio.js') && at('music.js') > at('voice.js') && at('music.js') > at('settings.js') && at('music.js') > at('main.js') && at('audio.js') > 0);
}

console.log('Settings > Sound: the Music row');
{
  const store = new Map();
  const peek = (st, e) => JSON.parse(nodeGame({ store: st }).run(`JSON.stringify(${e})`));
  let r = peek(store, '({ on: MUSIC.on, vol: MUSIC.vol })');
  check('first run: music on, volume 70% (30% was lost under the drone and the engine)', r.on === true && r.vol === 0.7, JSON.stringify(r));
  const g2 = nodeGame({ store }); g2.run('musicSetOn(false); musicSetVol(0.7);');
  r = peek(store, '({ on: MUSIC.on, vol: MUSIC.vol })');
  check('the switch and the volume are kept in this browser (localStorage), and come back on a reload', r.on === false && r.vol === 0.7, JSON.stringify(r) + ' ' + JSON.stringify([...store]));
  check('not in the save: the save file has no music field', !/music/i.test(read('src/meta.js')));
  store.set('longhaul.music.vol', 'loud'); store.set('longhaul.music.on', 'maybe');
  r = peek(store, '({ on: MUSIC.on, vol: MUSIC.vol })');
  check('a stored value that is not a number or not 0 or 1 is ignored: the defaults', r.on === true && r.vol === 0.7, JSON.stringify(r));
  store.set('longhaul.music.vol', '9');
  check('a volume out of range is clamped to 100%', peek(store, 'MUSIC.vol') === 1);
  g.run(`musicSetVol(0.34)`); check('a volume is in tenths (0.34 is 0.3)', J('MUSIC.vol') === 0.3);
  g.run(`musicSetVol(-1)`); check('and never under 0', J('MUSIC.vol') === 0);
  g.run(`musicSetVol(0.7); musicSetOn(true)`);
  // the real draw_sound and soundRefresh on a stand-in scene: what is drawn, where, and what a press does
  g.run(`
    window.__draw = (() => {
      const P = new Proxy(function () {}, { get: (_, k) => (k === 'width' ? 20 : P), apply: () => P });
      const rec = { txt: [], label: [], buttons: [] };
      const fake = { bx: -304, by: -262, bw: 840, slots: {}, body: { add() {} }, add: { graphics: () => P, rectangle: () => P }, inputs: {},
        label: (x, y, s) => { rec.label.push({ x, y, s }); }, line: () => {}, say: () => {}, railDraw() {}, tagDraw() {},
        txt: (x, y, s, size) => { const t = { x, y, s, size, set: v => { t.s = v; return t; }, setText: v => { t.s = v; return t; }, setColor: () => t }; rec.txt.push(t); return t; },
        button: (x, y, w, l, fn) => { const b = { x, y, w, l, fn, set: v => { b.l = v; return b; }, color: () => b, mark: () => b }; rec.buttons.push(b); return b; },
        toggleMute() {}, stepVoice() {}, hearVoice() {}, adjustVolume() {}, setVolume() {},
        adjustMusic(d) { return Settings.prototype.adjustMusic.call(fake, d); }, soundRefresh() { return Settings.prototype.soundRefresh.call(fake); } };
      Settings.prototype.draw_sound.call(fake);
      return { fake, rec };
    })();
  `);
  const row = J(`(() => { const { rec } = __draw; const mu = rec.buttons.find(b => /^Music/.test(b.l)); return { label: rec.label.some(l => l.s === 'MUSIC'), on: mu && mu.l, pct: rec.txt.find(t => /^\\d+%$/.test(t.s) && t.x > -100 && t.y < -100) && true, note: rec.txt.some(t => /Music is made by the game/.test(t.s)), buttons: rec.buttons.map(b => b.l) }; })()`);
  check('Sound has a MUSIC label, a Music: ON button and the sentence of content/text/ui.md (music.use) under the row', row.label && row.on === 'Music: ON' && row.note, JSON.stringify(row));
  g.run(`(() => { const { rec } = __draw; rec.buttons.filter(b => b.l === '-')[1].fn(); })()`);
  check('the - beside it takes a tenth off the music volume (not the master volume)', J('MUSIC.vol') === 0.6 && J('G.volume') === 1, J('MUSIC.vol'));
  g.run(`(() => { const { rec } = __draw; rec.buttons.filter(b => b.l === '+')[1].fn(); rec.buttons.filter(b => b.l === '+')[1].fn(); })()`);
  check('the + puts it back, a tenth at a time (twice: 0.8)', J('MUSIC.vol') === 0.8 && J('G.volume') === 1, J('MUSIC.vol'));
  g.run(`musicSetVol(0.7); (() => { const { rec } = __draw; rec.buttons.find(b => /^Music/.test(b.l)).fn(); })()`);
  check('the Music button switches it off (label Music: OFF, and the percentage says OFF), and on again', J('MUSIC.on') === false && J(`__draw.rec.buttons.find(b => /^Music/.test(b.l)).l`) === 'Music: OFF' && J(`__draw.rec.txt.some(t => t.s === 'OFF')`) && (g.run(`__draw.rec.buttons.find(b => /^Music/.test(b.l)).fn()`), J('MUSIC.on') === true));
  const ys = J(`(() => { const { rec, fake } = __draw; return Math.max(...rec.txt.map(t => t.y), ...rec.buttons.map(b => b.y), ...rec.label.map(l => l.y)) - fake.by; })()`);
  check(`every row of Sound is still on the panel: the lowest is ${ys} px under the body's top, the hint line is at 560 and the panel ends at 582`, ys <= 520, ys);
  check('the old rows are all still there: master volume, sound, ship voice, ship computer voice, Hear it', ['MASTER VOLUME', 'SOUND', 'SHIP VOICE', 'SHIP COMPUTER VOICE'].every(w => J(`__draw.rec.label.some(l => l.s === ${JSON.stringify(w)})`)) && J(`__draw.rec.buttons.some(b => b.l === 'Hear it')`));
  const ui = read('content/text/ui.md'), line = (ui.match(/^\| music\.use \| (.*) \|$/m) || [])[1];
  check('the sentence is in content/text/ui.md and the game says it (uiText), the same words as the code\'s default', !!line && J(`uiText('music.use')`) === line && J(`UI_TEXT['music.use']`) === line, line);
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));
console.log(failed ? `\nMUSIC FAIL (${failed} of ${n})` : `\nMUSIC PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

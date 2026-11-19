// ---------- Music: generative, built in code, in the manner of EVE Online's (card space-game-music) ----------
// No files and no cost. A seeded generator plays long soft notes of a slow scale, a few sparse bell tones over them and a chord that drifts to
// another every half a minute or so; it runs through the shared reverb of src/audio.js, so a lot of it is room. Never the same twice: every
// start of the music takes a new seed.
//
// This slice is the SPACE mood only: it plays while the Space scene runs. The generator already takes a mood by name (MUSIC.moods, one entry
// of data each), so the hostile, docked, jump and pause moods are table rows and a line in musicMoodFor() and nothing else.
//
// Two halves, so a plain Node test can check the music without a browser (tests/music.mjs):
//   the plan     musicMaker(seed, mood)   pure: a seeded random, a clock that is passed in (seconds), no audio. take(now, ahead) returns the
//                notes that start before now + ahead. Which notes (all in the mode of the mood), how many (sparse), how loud at most (a
//                velocity against the peak in MUSIC.peak) and how they come and go are the plan's. musicWorst(notes) is the loudest instant.
//   the engine   musicTick() every 400 ms (musicInstall): wants the music or not (the scene, the switch, volume, mute), starts a bus into the
//                master gain of audio.js (so the volume and the mute of the game apply), feeds the plan's notes to oscillators scheduled ahead on
//                the audio clock, ducks under the pause (AUD.ducked) and under the ship's voice (VOICE.playing), and fades out when it stops.
// Settings > Sound has its own Music row: On/Off and a volume in tenths (default on, 30%), kept in this browser (localStorage) like the ship
// voice choice, not in the save. The row's sentence is content/text/ui.md's (music.use).

const MUSIC = {
  store: { on: 'longhaul.music.on', vol: 'longhaul.music.vol' },
  on: true, vol: 0.3,              // Settings > Sound: the switch and the volume, 0 to 1 in tenths. Default low
  level: 0.4,                      // the music bus at volume 1, before the master gain: with the loudest instant of the plan under cap
  cap: 0.3,                        // the most the notes can add up to after the bus at volume 1 (about 10 dB under full scale); tests/music.mjs
  send: 0.7,                       // how much of the bus goes to the shared reverb (the space drone sends 0.3): the music is mostly room
  ahead: 4,                        // seconds of notes scheduled ahead of the audio clock
  tick: 400,                       // ms between looks at what the music should be doing
  duck: { pause: 0.3, voice: 0.4 }, // the pause menu leaves a murmur (as the pads do); the ship's voice and a character's leave less than half
  fade: { in: 1.6, down: 0.25, out: 1.0 }, // time constants (seconds): the level comes up slowly (also the fade in at the start), goes down quickly (a duck, the volume) and the stop fades out over a few seconds
  root: 41.2034,                   // E1 in Hz: the tonic of the space drone of src/audio.js (its 41 Hz), so the two agree
  peak: { pad: 0.1, bell: 0.07 },  // the level of one note at velocity 1, before the bus
  modes: { dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], pentatonic: [0, 3, 5, 7, 10] }, // semitones above the tonic
  moods: {
    space: {
      mode: 'dorian',               // E F# G A B C# D: open and a little sad
      // the chords: semitones above E1 (+24 is E3, +36 is E4), every tone inside the mode: E minor with the ninth, G major seventh, D with the
      // second, A with the second. Any of them after any other is consonant, so the drift is a random walk with no rule to break
      chords: [[24, 31, 38, 43], [27, 34, 38, 43], [22, 29, 36, 38], [17, 24, 31, 36]],
      chordEvery: [28, 52],         // seconds a chord is held before the drift
      voices: 3, stagger: [0, 4],   // pad notes to a chord, and how far apart in time they come in
      attack: 5, release: 8,        // a pad note swells in over 5 s and fades out over 8, so one chord is under the next
      padVel: [0.45, 0.8],
      bellEvery: [6, 15], bellPair: 0.2, // seconds between bells; the share of bells that are followed by a second, a step away, within a second
      bellRange: [36, 62], bellDecay: [4, 7], bellVel: [0.3, 0.75],
      rest: { every: [90, 150], len: [18, 30] } // now and then the bells stop for a while and only the pad is left
    }
  }
};

// ---------- the plan (pure) ----------
const musicRng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const musicFreq = semi => MUSIC.root * Math.pow(2, semi / 12);
// the semitone count above the tonic of a pitch, and whether it is a tone of the mode
const musicSemi = freq => 12 * Math.log2(freq / MUSIC.root);
const musicInMode = (freq, mode) => { const s = musicSemi(freq), r = Math.round(s); return Math.abs(s - r) < 1e-6 && MUSIC.modes[mode].includes(((r % 12) + 12) % 12); };

// maker(seed, mood): the pad and the bells each have a random of their own, so the music of a seed does not depend on how often take() is called.
// A note: { kind: 'pad' | 'bell', at, end, freq, vel, pan, attack, hold, release (pad) | decay (bell) }; end is when it is silent again.
function musicMaker(seed, mood) {
  const rp = musicRng(seed), rb = musicRng((seed ^ 0x9e3779b9) >>> 0);
  const between = (r, [a, b]) => a + (b - a) * r();
  const st = { seed, mood: MUSIC.moods[mood] ? mood : 'space', chords: [], chordAt: null, bellAt: null, restAt: null, last: -1, lastBell: -1, taken: 0, drawn: 0 };
  const M = () => MUSIC.moods[st.mood];
  // the pad notes of a chord: 3 of its tones (the lowest, the highest and one between), each coming in a little late
  const padNotes = c => {
    const m = MUSIC.moods[c.mood], tones = m.chords[c.i], mid = tones.slice(1, -1), pick = [tones[0], mid[Math.floor(rp() * mid.length)], tones[tones.length - 1]].slice(0, m.voices), out = [];
    pick.forEach(semi => {
      const at = c.at + between(rp, m.stagger), end = c.end + between(rp, m.stagger) + m.release;
      out.push({ kind: 'pad', at, end, freq: musicFreq(semi), vel: between(rp, m.padVel), pan: (rp() * 2 - 1) * 0.5, attack: m.attack, hold: Math.max(0, end - m.release - at - m.attack), release: m.release });
    });
    return out;
  };
  // the chord timeline: [{ at, end, i, mood, notes }], made as far ahead as it is asked for. A chord and its notes are drawn together, one chord
  // after another, so the pad is the same however often take() is called
  const extend = to => {
    while (st.chordAt <= to) {
      const m = M(), others = m.chords.map((_, i) => i).filter(i => i !== st.last), i = others[Math.floor(rp() * others.length)];
      const hold = between(rp, m.chordEvery); st.last = i;
      const c = { at: st.chordAt, end: st.chordAt + hold, i, mood: st.mood }; c.notes = padNotes(c);
      st.chords.push(c); st.chordAt += hold;
    }
  };
  const chordAt = t => { extend(t); return st.chords.find(c => t >= c.at && t < c.end) || st.chords[st.chords.length - 1]; };
  const bellPitch = (c, notBelow) => { // a tone of the mode in the bell range, the chord's own tones three times as likely
    const m = MUSIC.moods[c.mood], scale = MUSIC.modes[m.mode], tones = m.chords[c.i].map(s => ((s % 12) + 12) % 12), pool = [];
    for (let s = m.bellRange[0]; s <= m.bellRange[1]; s++) if (scale.includes(s % 12) && s !== st.lastBell) { const w = tones.includes(s % 12) ? 3 : 1; for (let k = 0; k < w; k++) pool.push(s); }
    return pool[Math.floor(rb() * pool.length)];
  };
  const bellNotes = (t, c, out) => {
    const m = MUSIC.moods[c.mood], semi = bellPitch(c), vel = between(rb, m.bellVel), decay = between(rb, m.bellDecay), pan = (rb() * 2 - 1) * 0.7;
    out.push({ kind: 'bell', at: t, end: t + decay, freq: musicFreq(semi), vel, pan, decay }); st.lastBell = semi;
    if (rb() < m.bellPair) { // a second bell a scale step or two away, soon after
      const scale = MUSIC.modes[m.mode], up = rb() < 0.5 ? 1 : -1, steps = 1 + Math.floor(rb() * 2), at = t + 0.35 + rb() * 0.6, d2 = between(rb, m.bellDecay);
      let s = semi, n = 0; while (n < steps) { s += up; if (scale.includes(((s % 12) + 12) % 12)) n++; }
      s = Math.max(m.bellRange[0], Math.min(m.bellRange[1], s));
      if (scale.includes(s % 12)) { out.push({ kind: 'bell', at, end: at + d2, freq: musicFreq(s), vel: vel * 0.8, pan: pan * -0.6, decay: d2 }); st.lastBell = s; }
    }
  };
  return {
    seed, state: st,
    get mood() { return st.mood; },
    // the notes that start before now + ahead and were not given before, in the order they start
    take(now, ahead) {
      const m = M(), out = [], to = now + ahead;
      if (st.chordAt === null) { st.chordAt = now; st.bellAt = now + between(rb, m.bellEvery); st.restAt = now + between(rb, m.rest.every); }
      // the next chord and the next bell are always ahead of the clock; when one is not, the clock jumped (a tab asleep): start from now, no backlog
      if (st.chordAt < now - 2 || st.bellAt < now - 2) { st.chordAt = now; st.chords = []; st.bellAt = now + 1 + between(rb, [0, M().bellEvery[0]]); st.restAt = now + between(rb, M().rest.every); }
      const first = st.chords.length;
      extend(to);
      for (let i = first; i < st.chords.length; i++) out.push(...st.chords[i].notes);
      while (st.bellAt <= to) {
        const c = chordAt(st.bellAt), mm = MUSIC.moods[c.mood];
        if (st.restAt !== null && st.bellAt >= st.restAt) { st.bellAt = st.restAt + between(rb, mm.rest.len); st.restAt = st.bellAt + between(rb, mm.rest.every); continue; }
        bellNotes(st.bellAt, c, out); st.bellAt += between(rb, mm.bellEvery);
      }
      st.chords = st.chords.filter(c => c.end > now - 30); // the timeline of the last half minute is all that is looked up
      st.taken += out.length;
      return out.sort((a, b) => a.at - b.at);
    },
    // a new mood from now: the chord in hand is let go (its notes fade out as they were planned) and the next one is of the new mood in a second
    setMood(name, now) {
      if (!MUSIC.moods[name] || name === st.mood) return false;
      st.mood = name; st.chords = st.chords.filter(c => c.at <= now); st.chords.forEach(c => { if (c.end > now + 1) c.end = now + 1; }); st.chordAt = now + 1; st.last = -1;
      if (st.bellAt !== null) st.bellAt = Math.min(st.bellAt, now + 4 + rb() * 4);
      return true;
    }
  };
}
// the loudest instant of a list of notes: every note counted at its full velocity from its start to its end (a pad note really swells in, so this
// is above what is heard). The sum of velocity times peak of the notes sounding together, before the bus
function musicWorst(notes) {
  const ev = []; notes.forEach(n => { const v = n.vel * MUSIC.peak[n.kind]; ev.push([n.at, v], [n.end, -v]); });
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let cur = 0, max = 0, sim = 0, maxSim = 0;
  ev.forEach(([, v]) => { cur += v; sim += v > 0 ? 1 : -1; if (cur > max) max = cur; if (sim > maxSim) maxSim = sim; });
  return { peak: max, voices: maxSim };
}
// the mood the game is in: the scene it is in, or null for none. This slice has the one
const musicMoodFor = scene => (scene === 'Space' ? 'space' : null);

// ---------- the switch and the volume (Settings > Sound) ----------
function musicLoad() {
  try {
    const on = localStorage.getItem(MUSIC.store.on), vol = parseFloat(localStorage.getItem(MUSIC.store.vol));
    if (on === '0') MUSIC.on = false; else if (on === '1') MUSIC.on = true;
    if (Number.isFinite(vol)) MUSIC.vol = Math.min(1, Math.max(0, Math.round(vol * 10) / 10));
  } catch (e) { /* storage is optional */ }
}
function musicSetOn(on) { MUSIC.on = !!on; try { localStorage.setItem(MUSIC.store.on, on ? '1' : '0'); } catch (e) { /* storage is optional */ } }
function musicSetVol(v) { MUSIC.vol = Math.min(1, Math.max(0, Math.round(v * 10) / 10)); try { localStorage.setItem(MUSIC.store.vol, String(MUSIC.vol)); } catch (e) { /* storage is optional */ } }
// the music can sound: the switch, its own volume, and the game's (mute and master volume)
const musicUsable = () => MUSIC.on && MUSIC.vol > 0 && !G.muted && G.volume > 0;
musicLoad();

// ---------- the engine ----------
const MUS = { scene: null, bus: null, timer: null, lastPreview: 0 }; // scene: the key of the scene that runs; bus: the music playing now
// one note on the audio clock, into the bus `out`: a pad note is two soft oscillators (a triangle and a sine a few cents apart) through a
// low-pass, swelling in and out; a bell is a sine with two upper partials that die faster, through a low-pass that closes as it rings
function musicVoice(out, n) {
  const env = AC.createGain(), flt = AC.createBiquadFilter(), peak = n.vel * MUSIC.peak[n.kind], oscs = [];
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = n.pan; env.connect(pan); pan.connect(out); } else env.connect(out);
  flt.connect(env);
  const osc = (type, f, gain) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = gain; o.connect(g); g.connect(flt); o.start(n.at); o.stop(n.end + 0.2); oscs.push(o); return o; };
  flt.type = 'lowpass';
  if (n.kind === 'pad') {
    flt.frequency.value = Math.min(1800, n.freq * 4); flt.Q.value = 0.4;
    osc('triangle', n.freq, 0.5); osc('sine', n.freq * 1.003, 0.5);
    env.gain.setValueAtTime(0, n.at); env.gain.linearRampToValueAtTime(peak, n.at + n.attack);
    env.gain.setValueAtTime(peak, n.at + n.attack + n.hold); env.gain.linearRampToValueAtTime(0, n.end);
  } else {
    flt.Q.value = 0.3; flt.frequency.setValueAtTime(Math.min(7000, n.freq * 6), n.at); flt.frequency.exponentialRampToValueAtTime(Math.max(300, n.freq * 1.5), n.at + n.decay * 0.6);
    osc('sine', n.freq, 0.73); osc('sine', n.freq * 2, 0.18); osc('sine', n.freq * 2.76, 0.09);
    env.gain.setValueAtTime(0.0001, n.at); env.gain.linearRampToValueAtTime(peak, n.at + 0.015); env.gain.exponentialRampToValueAtTime(0.0001, n.end);
  }
  oscs[0].onended = () => { try { env.disconnect(); } catch (e) { /* gone */ } };
}
// the bus: the gain every note goes into, into the master gain of audio.js, and its share of the shared reverb (made when the sound is on)
function musicBus(seed, mood) {
  const out = AC.createGain(); out.gain.value = 0; out.connect(AUD.master);
  return { out, send: revSend(out, MUSIC.send), maker: musicMaker(seed, mood), mood, seed, played: [], target: 0, tc: MUSIC.fade.in };
}
const musicDuck = () => Math.min(AUD.ducked ? MUSIC.duck.pause : 1, typeof VOICE !== 'undefined' && VOICE.playing ? MUSIC.duck.voice : 1);
const musicTarget = () => MUSIC.level * MUSIC.vol * musicDuck();
function musicLevel(b) { // follows the volume, the mute and the ducks: down quickly, up slowly
  const t = musicTarget(), now = AC.currentTime;
  if (t !== b.target) b.tc = t < b.target ? MUSIC.fade.down : MUSIC.fade.in; // the way it is going is kept until the target changes again
  b.out.gain.cancelScheduledValues(now); b.out.gain.setTargetAtTime(t, now, b.tc); b.target = t;
}
function musicStart(mood) {
  const seed = (Math.random() * 4294967296) >>> 0;
  MUS.bus = musicBus(seed, mood);
}
function musicStop() {
  const b = MUS.bus; if (!b) return; MUS.bus = null;
  try { b.out.gain.cancelScheduledValues(AC.currentTime); b.out.gain.setTargetAtTime(0, AC.currentTime, MUSIC.fade.out); } catch (e) { /* gone */ }
  setTimeout(() => { try { b.out.disconnect(); } catch (e) { /* gone */ } if (b.send) { try { b.send.disconnect(); } catch (e) { /* gone */ } } }, 9000);
}
// what the music should be doing now: nothing (no mood for this scene, the switch off, muted), or the mood of the scene
function musicTick() {
  const mood = musicUsable() ? musicMoodFor(MUS.scene) : null, b = MUS.bus;
  if (!mood) { if (b && AC) musicStop(); return; }
  if (!audioReady() || !AUD.gesture) return; // a browser plays nothing before the first key or click
  if (!b) { musicStart(mood); return musicTick(); }
  if (b.mood !== mood) { b.maker.setMood(mood, AC.currentTime); b.mood = mood; }
  if (!b.send) b.send = revSend(b.out, MUSIC.send); // the reverb is made the first time it is wanted: with the sound off it was not
  b.maker.take(AC.currentTime, MUSIC.ahead).forEach(n => { try { musicVoice(b.out, n); b.played.push(n); if (b.played.length > 200) b.played.shift(); } catch (e) { /* audio is optional */ } });
  musicLevel(b);
}
// the Music row's own sound, when its volume or switch is pressed in Settings: two bells at the level the music will have, from a bus of their
// own (the music is not running on the Title, and the pause has it ducked). Nothing when the music cannot sound
function musicPreview() {
  if (!musicUsable() || !audioReady()) return false;
  const t = performance.now(); if (t - MUS.lastPreview < 300) return false; MUS.lastPreview = t;
  resumeAudio(); syncMaster();
  const out = AC.createGain(); out.gain.value = MUSIC.level * MUSIC.vol; out.connect(AUD.master); const send = revSend(out, MUSIC.send), now = AC.currentTime + 0.02;
  [[48, 0], [55, 0.45]].forEach(([semi, dt]) => musicVoice(out, { kind: 'bell', at: now + dt, end: now + dt + 3, freq: musicFreq(semi), vel: 0.6, pan: 0, decay: 3 }));
  setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } if (send) { try { send.disconnect(); } catch (e) { /* gone */ } } }, 4500);
  return true;
}

// ---------- wiring ----------
// The scenes audio.js gives a pad to say which scene runs: its create and shutdown. Pause and resume are AUD.ducked's, set by audio.js itself.
function musicInstall(game) {
  const hook = sc => {
    const key = sc.scene.key; if (!['Station', 'Space', 'Surface'].includes(key)) return;
    sc.events.on('create', () => { MUS.scene = key; });
    sc.events.on('shutdown', () => { if (MUS.scene === key) MUS.scene = null; });
  };
  const wire = () => game.scene.scenes.forEach(hook);
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
  if (MUS.timer) clearInterval(MUS.timer);
  MUS.timer = setInterval(musicTick, MUSIC.tick);
  return MUS.timer;
}
if (typeof window !== 'undefined' && window.game && window.game.scene && window.game.scene.scenes) musicInstall(window.game);

// ---------- Audio: synthesized ambient pads, engine hum and one-shot effects ----------
// Everything is Web Audio, no files. It shares the one AudioContext (AC) that beep() in common.js uses.
// One shared reverb gives it room and a fixed pool of voices plays every effect: see "weight" below.
// Volume and mute come from G.volume and G.muted (set in the pause menu, meta.js) through one master gain.
// installAudio(game) hooks each scene's create, update, pause, resume and shutdown events,
// so the scenes need no code for loops; only sfx('name') calls replace beep() at a few spots.

const AUD = { master: null, noise: null, amb: null, eng: null, cru: null, ducked: false, gesture: false, rev: null, pool: null, sendNow: undefined };
// Each pad has its own level on top of the master volume (G.volume and mute), so a pad that is only noise can sit low
// without turning the others down. The planet wind is hiss with no pitch, so it reads much louder than a tone of the same
// size: it sits about 8 dB under the quietest effect (it was 16 dB over a laser shot at level 1) (tests/surface.mjs measures it against laser, tick, hit and boom).
const AMB_LEVEL = { station: 1, space: 1, wind: 0.06 };
const ambLevel = kind => AMB_LEVEL[kind] === undefined ? 1 : AMB_LEVEL[kind];

// ---------- the effects volume, and the mix under the music (card space-game-music) ----------
// FX.vol is Settings > Sound > Effects: one scale (0 to 1, tenths) for every game sound except the ship's voice and the music: each effect, the
// beeps and clicks, the engine hum, the thrusters, the cruise hum and the scene pads. It sits under the master volume and M, which still apply to
// everything. It scales the level a sound is given when it is scheduled, so the share an effect sends to the reverb follows it. At 1, with no music
// playing, nothing changes: every level in tests/sfxlevels.mjs and tests/audiolevels.mjs is as it was.
// While the music plays (MUS.bus, src/music.js) the effects are eased to FX.under.effects and the pads (the space drone sits in the music's own low
// band and was masking it) to FX.under.pad, on top of FX.vol; both come back when the music stops (syncMaster follows it).
const FX = { vol: 1, store: 'longhaul.fx.vol', under: { effects: 0.75, pad: 0.45 } };
function fxLoad() { try { const v = parseFloat(localStorage.getItem(FX.store)); if (Number.isFinite(v)) FX.vol = Math.min(1, Math.max(0, Math.round(v * 10) / 10)); } catch (e) { /* storage is optional */ } }
function fxSetVol(v) { FX.vol = Math.min(1, Math.max(0, Math.round(v * 10) / 10)); try { localStorage.setItem(FX.store, String(FX.vol)); } catch (e) { /* storage is optional */ } }
const fxMusic = () => typeof MUS !== 'undefined' && !!MUS.bus; // the music is playing now
const fxScale = () => FX.vol * (fxMusic() ? FX.under.effects : 1);                       // what an effect, a click or the engine is multiplied by
const padScale = kind => ambLevel(kind) * FX.vol * (fxMusic() ? FX.under.pad : 1);     // a pad's own level, before the pause duck
fxLoad();

function audioReady() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (!AUD.master) {
      const comp = AC.createDynamicsCompressor(); // keeps stacked effects from clipping
      AUD.master = AC.createGain();
      AUD.master.connect(comp); comp.connect(AC.destination);
      AUD.master.gain.value = G.muted ? 0 : G.volume;
    }
    return true;
  } catch (e) { return false; }
}

function syncMaster() {
  if (!AUD.master) return;
  AUD.master.gain.setTargetAtTime(G.muted ? 0 : G.volume, AC.currentTime, 0.05);
  fxSync();
  resumeAudio(); // after M unmutes, wake a suspended context
}
// the pad follows the Effects volume and the music coming and going (the effects and the engine read them when they are scheduled)
function fxSync() {
  const a = AUD.amb; if (!a || !AC) return;
  const want = padScale(a.kind) * (AUD.ducked ? 0.3 : 1);
  if (a.want !== undefined && Math.abs(want - a.want) < 1e-6) return;
  a.want = want; a.out.gain.setTargetAtTime(want, AC.currentTime, 0.8);
}

function resumeAudio() { if (AC && AUD.gesture && AC.state === 'suspended' && !G.muted) AC.resume(); }

function noiseBuf() {
  if (!AUD.noise) {
    const n = AC.sampleRate * 2, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    AUD.noise = b;
  }
  return AUD.noise;
}

// ---------- building blocks (each returns the started source so a loop can stop it) ----------
function aOsc(list, type, f, dest, gain) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f; g.gain.value = gain;
  o.connect(g); g.connect(dest); o.start(); list.push(o);
  return o;
}
function aNoise(list, dest, ftype, f, q, gain) {
  const s = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf(); s.loop = true;
  flt.type = ftype; flt.frequency.value = f; flt.Q.value = q; g.gain.value = gain;
  s.connect(flt); flt.connect(g); g.connect(dest); s.start(); list.push(s);
  return flt;
}
function aLfo(list, param, rate, depth) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.frequency.value = rate; g.gain.value = depth;
  o.connect(g); g.connect(param); o.start(); list.push(o);
}

// ---------- looping pads: one per scene ----------
const PADS = {
  station(list, out) { // warm mains hum, beating pair plus a soft air bed
    aOsc(list, 'sine', 55, out, 0.5); aOsc(list, 'sine', 55.7, out, 0.5); aOsc(list, 'triangle', 110.4, out, 0.12);
    aNoise(list, out, 'lowpass', 260, 0.7, 0.35);
    aLfo(list, out.gain, 0.11, 0.12);
  },
  space(list, out) { // deep drone: a low fifth through a slowly breathing filter
    const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 220; flt.Q.value = 2;
    flt.connect(out);
    aOsc(list, 'sawtooth', 41, flt, 0.28); aOsc(list, 'sawtooth', 61.7, flt, 0.18); aOsc(list, 'sine', 82.4, out, 0.2);
    aLfo(list, flt.frequency, 0.07, 70);
  },
  wind(list, out) { // gusting noise over a low rumble
    const flt = aNoise(list, out, 'bandpass', 600, 0.7, 0.55);
    aNoise(list, out, 'lowpass', 120, 0.5, 0.5);
    aLfo(list, flt.frequency, 0.17, 260);
    aLfo(list, out.gain, 0.09, 0.2);
  }
};

function fadeOutAndStop(out, list, secs) {
  try { out.gain.cancelScheduledValues(AC.currentTime); out.gain.setTargetAtTime(0, AC.currentTime, secs / 3); } catch (e) { /* gone */ }
  setTimeout(() => {
    list.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } });
    try { out.disconnect(); } catch (e) { /* already gone */ }
  }, secs * 1000 + 100);
}

function startAmbient(kind) {
  if (!audioReady()) return;
  stopAmbient();
  const out = AC.createGain(), pad = AC.createGain(), list = []; // out fades; pad takes the slow wobble
  out.gain.value = 0.0001; out.connect(AUD.master); pad.connect(out);
  PADS[kind](list, pad);
  revSend(out, SOUND.loop[kind] || 0); // the space drone has a long tail; the planet wind has none
  const want = padScale(kind) * (AUD.ducked ? 0.3 : 1);
  out.gain.setTargetAtTime(want, AC.currentTime, 0.5); // fade in
  AUD.amb = { kind, out, list, want };
}
function stopAmbient() {
  if (!AUD.amb) return;
  fadeOutAndStop(AUD.amb.out, AUD.amb.list, 0.35);
  AUD.amb = null;
}

// ---------- engine hum: rises with thrust and boost, silent when idle ----------
const ENG_BRAKE = 0.03, ENG_RCS = 0.009; // the braking hiss and the thruster hiss at full, before the master volume: both under the engine (0.2 at full boost)
function startEngine(sc) {
  if (!audioReady()) return;
  stopEngine();
  const out = AC.createGain(), list = [];
  out.gain.value = 0; out.connect(AUD.master);
  const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 300; flt.Q.value = 1.2; flt.connect(out);
  const saw = aOsc(list, 'sawtooth', 50, flt, 0.5), sub = aOsc(list, 'square', 25, flt, 0.25);
  const rush = aNoise(list, out, 'bandpass', 900, 1, 0.3);
  // the braking burn and the turn thrusters (card space-game-burn-feel): two quiet hisses of their own, so they sound while the engine is off
  const brk = AC.createGain(); brk.gain.value = 0; brk.connect(AUD.master); aNoise(list, brk, 'bandpass', 1500, 0.8, 1); aOsc(list, 'sawtooth', 70, brk, 0.25);
  const rcs = AC.createGain(); rcs.gain.value = 0; rcs.connect(AUD.master); aNoise(list, rcs, 'highpass', 3800, 0.7, 1);
  revSend(out, SOUND.loop.engine);
  AUD.eng = { out, list, flt, saw, sub, rush, brk, rcs, level: 0, nextAt: 0 };
  const tick = (time) => {
    const e = AUD.eng;
    if (!e || time < e.nextAt) return;
    e.nextAt = time + 60; // retune about 16 times a second, not every frame
    const ship = sc.ship, now = AC.currentTime, fx = fxScale();
    const thrusting = ship && ship.body && !sc.dead && ship.body.acceleration.length() > 0 && !AUD.ducked;
    const boost = thrusting && sc.boosting; // boost.js: Shift held and the tank not empty
    e.level = thrusting ? (boost ? 1 : 0.55) : 0;
    // what the ship is doing, read by src/feel.js (feelBurnRead): the hum builds with the burn instead of snapping on, and sounds under the
    // flight assist too; the brake and the thrusters hiss as much as they fire. Louder on Heavy handling (b.strength).
    const b = !sc.dead && !AUD.ducked && sc.fx && sc.fx.burn;
    if (b) e.level = Math.min(1, (boost ? 1 : 0.55) * b.engine * (0.8 + 0.2 * b.strength));
    e.brk.gain.setTargetAtTime(b ? ENG_BRAKE * b.brake * b.strength * fx : 0, now, 0.06);
    e.rcs.gain.setTargetAtTime(b ? ENG_RCS * Math.abs(b.turn) * b.strength * fx : 0, now, 0.04);
    const speed = ship && ship.body ? Math.min(1, ship.body.speed / 800) : 0;
    e.out.gain.setTargetAtTime(e.level * 0.2 * fx, now, 0.12);
    const f = 46 + e.level * 32 + speed * 22;
    e.saw.frequency.setTargetAtTime(f, now, 0.15); e.sub.frequency.setTargetAtTime(f / 2, now, 0.15);
    e.flt.frequency.setTargetAtTime(280 + e.level * 700, now, 0.15);
    e.rush.frequency.setTargetAtTime(700 + e.level * 1300, now, 0.15);
  };
  AUD.eng.handler = tick; sc.events.on('update', tick);
  AUD.eng.scene = sc;
}
function stopEngine() {
  const e = AUD.eng;
  if (!e) return;
  if (e.scene) e.scene.events.off('update', e.handler);
  [e.brk, e.rcs].forEach(g => { try { g.gain.cancelScheduledValues(AC.currentTime); g.gain.setTargetAtTime(0, AC.currentTime, 0.05); } catch (err) { /* gone */ } });
  fadeOutAndStop(e.out, e.list, 0.25);
  AUD.eng = null;
}

function duck(on) { // the pause menu: engine off, pad down to a murmur
  AUD.ducked = on;
  if (AUD.amb && AC) { AUD.amb.want = padScale(AUD.amb.kind) * (on ? 0.3 : 1); AUD.amb.out.gain.setTargetAtTime(AUD.amb.want, AC.currentTime, 0.15); }
  if (AUD.eng && AC) { if (on) AUD.eng.level = 0; [AUD.eng.out, AUD.eng.brk, AUD.eng.rcs].forEach(g => g.gain.setTargetAtTime(0, AC.currentTime, 0.05)); }
}

// ---------- weight: one shared reverb, and a pool of voices the effects reuse (card space-game-sound-weight) ----------
// The reverb. One send bus for the whole game: a convolver whose impulse is made here from a few seconds of fading noise (no audio file),
// back into the master gain, so volume and mute apply to it like to everything else. Each effect feeds it by its own amount (SOUND.send):
// a lot for the big, rare things (a kill, the jump, the dock clamps), a little for the cannons, nothing for the UI clicks, which stay
// short and dry. The engine and the space drone feed it too (SOUND.loop), which is what makes space sound large.
//
// The pool. An oscillator or a noise source cannot be started twice, so every tone used to make two new nodes and every burst three, and
// a busy fight made hundreds a minute. Now SOUND.tones oscillators and SOUND.noises noise loops are made once, run silent, and a sound is
// an envelope scheduled on one of them: its pitch, its level, its share of the reverb. No voice free at that moment: the one that ends
// soonest is cut and taken (AUD.pool.stolen counts those). beep() of common.js plays on the same voices. With the sound off (mute, or
// volume 0) sfx() and beep() return before any of this is made.
//
// It is all tied to the AudioContext and master gain in use: a test that renders into an OfflineAudioContext of its own (tests/sfxlevels.mjs)
// gets a pool and a reverb of its own in that context.
const SOUND = {
  tones: 20, noises: 8,             // the voices: no effect, however many at once, makes more (20: the worst instant of a fight, a shot, a kill, its bounty, a shield and the siren together, needs 18)
  rt60: 2.2, tail: 2.4,             // the reverb: seconds to fall 60 dB, and the length of the impulse
  wet: 0.6,                         // the level of the reverb's return into the master
  send: {                           // how much of each effect goes to the reverb (0: dry). A name that is not here gets SOUND.other
    boom: 0.55, hyperJump: 0.6, hyperArrive: 0.55, dock: 0.45,                       // the big events: long tails
    hyperCharge: 0.3, interdict: 0.3, cruiseOn: 0.3, cruiseOff: 0.3, shieldDown: 0.3, thrusters: 0.3, shieldUp: 0.25,
    hit: 0.22, bounty: 0.2, siren: 0.2, dash: 0.15, laser: 0.14, chime: 0.12, tick: 0.06, turret: 0.06,
    fuelPump: 0.05, fuelLow: 0.05, beep: 0.05,
    click: 0, uiOpen: 0, uiClose: 0, type: 0, buy: 0, sell: 0, empty: 0             // the interface: short and dry
  },
  other: 0.1,
  loop: { engine: 0.18, space: 0.3, station: 0.08, wind: 0 }   // the loops: the engine hum and each scene's pad
};
const soundSend = name => SOUND.send[name] === undefined ? SOUND.other : SOUND.send[name];

// the impulse: `secs` of noise that dies away (60 dB in rt60 seconds), a little darker toward the end as a real space is, and scaled so its
// energy is 1: what comes back from the reverb is then about as loud as what was sent. Pure: rand is Math.random in the game. Two channels.
function reverbImpulse(rate, secs, rt60, rand) {
  const n = Math.max(1, Math.round(rate * secs)), out = [new Float32Array(n), new Float32Array(n)];
  out.forEach(d => {
    let low = 0, e = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate, white = rand() * 2 - 1, k = Math.min(0.9, 0.25 + 0.6 * t / secs); // more smoothing later: the highs die first
      low += (white - low) * (1 - k);
      d[i] = low * Math.exp(-6.908 * t / rt60) * Math.min(1, i / (rate * 0.004)); // 6.908 = ln(1000): 60 dB down at rt60; a 4 ms fade in, so the dry hit stays crisp
      e += d[i] * d[i];
    }
    const s = 1 / Math.sqrt(e || 1);
    for (let i = 0; i < n; i++) d[i] *= s;
  });
  return out;
}

// the send bus of the context in use, made the first time something is sent while the sound is on; null with the sound off or no convolver
function revBus() {
  if (!AC || !AUD.master || G.muted || G.volume <= 0) return null;
  if (AUD.rev && AUD.rev.ac === AC && AUD.rev.master === AUD.master) return AUD.rev;
  try {
    const inp = AC.createGain(), conv = AC.createConvolver(), out = AC.createGain(), imp = reverbImpulse(AC.sampleRate, SOUND.tail, SOUND.rt60, Math.random);
    const buf = AC.createBuffer(2, imp[0].length, AC.sampleRate);
    buf.getChannelData(0).set(imp[0]); buf.getChannelData(1).set(imp[1]);
    conv.buffer = buf; out.gain.value = SOUND.wet;
    inp.connect(conv); conv.connect(out); out.connect(AUD.master);
    AUD.rev = { ac: AC, master: AUD.master, in: inp, conv, out };
  } catch (e) { AUD.rev = null; }
  return AUD.rev;
}
// feed a loop (the engine, a pad) to the reverb by a fixed amount; returns the send gain, or null when there is nothing to send to
function revSend(node, amount) {
  const r = amount > 0 ? revBus() : null; if (!r) return null;
  const g = AC.createGain(); g.gain.value = amount; node.connect(g); g.connect(r.in);
  return g;
}

// the voices of the context in use: made once, at the first sound
function soundPool() {
  const p = AUD.pool;
  if (p && p.ac === AC && p.master === AUD.master) return p;
  const r = revBus(), np = { ac: AC, master: AUD.master, tones: [], noises: [], stolen: 0, played: 0 };
  const strip = v => { // a voice's own level and its share of the reverb
    v.g = AC.createGain(); v.g.gain.value = 0; v.g.connect(AUD.master);
    v.send = AC.createGain(); v.send.gain.value = 0; v.g.connect(v.send); if (r) v.send.connect(r.in);
    v.until = 0; v.kind = '';
    return v;
  };
  for (let i = 0; i < SOUND.tones; i++) { const v = strip({ o: AC.createOscillator() }); v.o.connect(v.g); v.o.start(); np.tones.push(v); }
  for (let i = 0; i < SOUND.noises; i++) {
    const v = strip({ s: AC.createBufferSource(), flt: AC.createBiquadFilter() });
    v.s.buffer = noiseBuf(); v.s.loop = true; v.s.connect(v.flt); v.flt.connect(v.g); v.s.start(0, i * 0.23 % 2); // each loop starts somewhere else in the noise
    np.noises.push(v);
  }
  return (AUD.pool = np);
}
// a voice for a sound of this kind (a waveform, or a filter type) from t to end. Free: silent by now, or silent by t and already of this
// kind (the kind of a voice is set at once, not at a time, so a voice still sounding as something else cannot be booked ahead).
// None free: the one that ends soonest is cut at t and taken.
function soundVoice(list, kind, t, end) {
  const p = AUD.pool, now = AC.currentTime;
  let v = list.find(x => x.until <= t && x.kind === kind) || list.find(x => x.until <= now);
  if (!v) {
    v = list.reduce((a, b) => (b.until < a.until ? b : a)); p.stolen++;
    [v.g.gain, v.send.gain, v.o ? v.o.frequency : v.flt.frequency].forEach(q => { try { q.cancelScheduledValues(t); } catch (e) { /* not scheduled */ } });
    v.g.gain.setValueAtTime(0, t);
  }
  v.kind = kind; v.until = end; p.played++;
  v.send.gain.setValueAtTime(AUD.sendNow === undefined ? SOUND.other : AUD.sendNow, t);
  return v;
}

// ---------- one-shot effects: envelopes on the pool's voices ----------
function tone(t, type, f0, f1, dur, vol) {
  vol *= fxScale();
  const v = soundVoice(soundPool().tones, type, t, t + dur + 0.012), g = v.g.gain;
  v.o.type = type;
  v.o.frequency.setValueAtTime(f0, t); v.o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.setValueAtTime(vol, t); g.exponentialRampToValueAtTime(0.0001, t + dur); g.setValueAtTime(0, t + dur + 0.006); // silent again: the voice goes on running
}
function burst(t, dur, vol, ftype, f0, f1, q = 1, attack = 0.005) {
  vol *= fxScale();
  const v = soundVoice(soundPool().noises, ftype, t, t + dur + 0.012), g = v.g.gain;
  v.flt.type = ftype; v.flt.Q.setValueAtTime(q, t);
  v.flt.frequency.setValueAtTime(f0, t); v.flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(vol, t + attack);
  g.exponentialRampToValueAtTime(0.0001, t + dur); g.setValueAtTime(0, t + dur + 0.006);
}
// a tone that swells in and then dies away: the first `attack` seconds are the rise (charge-up whines, a shield coming back)
function swell(t, type, f0, f1, dur, vol, attack) {
  vol *= fxScale();
  const v = soundVoice(soundPool().tones, type, t, t + dur + 0.012), g = v.g.gain;
  v.o.type = type;
  v.o.frequency.setValueAtTime(f0, t); v.o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(vol, t + (attack || dur * 0.8)); g.exponentialRampToValueAtTime(0.0001, t + dur); g.setValueAtTime(0, t + dur + 0.006);
}

const SFX = {
  laser(t) { tone(t, 'square', 1300, 260, 0.13, 0.05); tone(t, 'sawtooth', 2400, 600, 0.06, 0.02); },
  tick(t) { tone(t, 'square', 520, 260, 0.05, 0.03); burst(t, 0.04, 0.05, 'highpass', 3000, 3000); },
  boom(t) { burst(t, 0.6, 0.22, 'lowpass', 1800, 80); tone(t, 'sine', 110, 36, 0.5, 0.22); burst(t, 0.15, 0.1, 'highpass', 2500, 1200);
    tone(t, 'sine', 58, 26, 1.1, 0.14); burst(t + 0.04, 1.2, 0.06, 'lowpass', 500, 50); }, // a kill has weight: a sub that falls for a second and a low rumble under it
  hit(t) { tone(t, 'sawtooth', 220, 70, 0.18, 0.08); burst(t, 0.14, 0.12, 'bandpass', 1400, 400); },
  dock(t) { // two heavy clamps, then a latch
    tone(t, 'sine', 95, 45, 0.18, 0.28); burst(t, 0.06, 0.12, 'lowpass', 1200, 300);
    tone(t + 0.16, 'sine', 70, 38, 0.22, 0.26); burst(t + 0.16, 0.06, 0.1, 'lowpass', 900, 250);
    tone(t + 0.28, 'square', 1800, 1500, 0.03, 0.03);
    tone(t + 0.28, 'sine', 52, 30, 0.8, 0.1); // the hull settling on the clamps
  },
  thrusters(t) { burst(t, 0.9, 0.14, 'bandpass', 300, 1200, 0.9, 0.25); tone(t, 'sine', 70, 110, 0.8, 0.07); },
  dash(t) { burst(t, 0.22, 0.13, 'bandpass', 700, 2800, 0.9, 0.2); tone(t, 'sine', 260, 820, 0.18, 0.05); },
  empty(t) { tone(t, 'square', 190, 120, 0.1, 0.035); },
  // ---- the Campaign's sounds (card space-game-campaign-sounds; what each is built of is in SFX_BUILT below, so a change can be asked for by name) ----
  // turret: one shot of the eight turrets, a short bright bolt, higher or lower by turret (a = the turret's number, 0 to 7), so a staggered volley rattles
  turret(t, a) { const i = a | 0, f = (1500 + (i % 4) * 150 + (i > 3 ? 70 : 0)) * (0.97 + Math.random() * 0.06);
    tone(t, 'square', f, f * 0.3, 0.07, 0.03); tone(t, 'sawtooth', f * 1.9, f * 0.6, 0.035, 0.012); burst(t, 0.012, 0.012, 'highpass', 4500, 4500); },
  // bounty: two bright coin pings, the second higher and longer, with a thin shimmer on top (plays just after the boom)
  bounty(t) { tone(t, 'triangle', 988, 975, 0.1, 0.06); tone(t + 0.075, 'triangle', 1319, 1300, 0.26, 0.06); tone(t + 0.075, 'sine', 2637, 2620, 0.2, 0.022); },
  // cruise: a rising whoosh as it engages, a falling one and a soft thud as it drops out (src/cruise.js)
  // interdiction: a two-tone siren for 1.2 s (src/cruise.js)
  siren(t) { for (let i = 0; i < 4; i++) { tone(t + i * 0.3, 'sawtooth', 620, 900, 0.28, 0.04); tone(t + i * 0.3, 'square', 310, 450, 0.28, 0.014); } },
  cruiseOn(t) { burst(t, 0.9, 0.08, 'bandpass', 300, 3200, 0.9, 0.3); tone(t, 'sawtooth', 90, 420, 0.8, 0.025); tone(t + 0.1, 'sine', 200, 900, 0.7, 0.022); },
  cruiseOff(t) { burst(t, 0.7, 0.016, 'bandpass', 2600, 260, 0.9, 0.05); tone(t, 'sine', 420, 70, 0.6, 0.008); tone(t + 0.05, 'square', 140, 70, 0.16, 0.0036);
    tone(t, 'sine', 95, 34, 0.5, 0.027); burst(t, 0.22, 0.0145, 'lowpass', 520, 90); }, // the drop-out thud: a low sine falling away, a short soft thump of air
  // ---- the sound pass (card space-game-sfx-pass): every one goes through AUD.master, so mute and volume apply, and none is louder than the
  // laser (tests/sfxlevels.mjs measures them all against the laser and the planet wind) ----
  // interdiction (src/cruise.js): pulled out of cruise (a low thud and a falling sweep), then the siren
  interdict(t) { tone(t, 'sine', 150, 38, 0.4, 0.025); burst(t, 0.35, 0.016, 'bandpass', 2400, 200, 0.9, 0.02); SFX.siren(t + 0.12); },
  // hyperspace (src/hyperspace.js; the jump card B4 will call the same three): a whine that climbs, the jump, the arrival
  hyperCharge(t) { swell(t, 'sine', 140, 1100, 1.4, 0.023, 1.3); swell(t, 'triangle', 280, 2200, 1.4, 0.01, 1.3); burst(t, 1.4, 0.032, 'bandpass', 400, 3600, 1.2, 1.2); },
  hyperJump(t) { tone(t, 'sine', 90, 30, 0.7, 0.0255); burst(t, 0.18, 0.0155, 'highpass', 800, 6000, 0.7, 0.01); burst(t + 0.04, 0.9, 0.0127, 'bandpass', 600, 3000, 0.8, 0.2); tone(t, 'sawtooth', 220, 1400, 0.35, 0.0045);
    tone(t + 0.05, 'sine', 55, 24, 1.5, 0.012); }, // and a long sub under the jump
  hyperArrive(t) { burst(t, 0.9, 0.018, 'bandpass', 3000, 180, 0.8, 0.05); tone(t, 'sine', 520, 60, 0.8, 0.011); tone(t + 0.35, 'sine', 90, 34, 0.5, 0.03); burst(t + 0.35, 0.2, 0.0155, 'lowpass', 500, 90);
    tone(t + 0.35, 'sine', 60, 26, 1.2, 0.012); },
  // fuel (src/fuel.js, hud.js): the pump glugs, then a click when the nozzle lets go; the low-fuel warning is two falling pairs of soft beeps
  fuelPump(t) { for (let i = 0; i < 6; i++) { const u = t + i * 0.16; tone(u, 'sine', 170 + i * 14, 240 + i * 14, 0.09, 0.05); burst(u, 0.09, 0.07, 'bandpass', 500, 900, 1.5, 0.01); } tone(t + 1.0, 'square', 1500, 1300, 0.03, 0.025); },
  fuelLow(t) { for (let i = 0; i < 2; i++) { tone(t + i * 0.34, 'triangle', 700, 560, 0.14, 0.045); tone(t + i * 0.34 + 0.16, 'triangle', 520, 400, 0.16, 0.045); } },
  // buying and selling (src/hangar.js, shop.js): two coin pings rising when you buy, falling when you sell
  buy(t) { tone(t, 'triangle', 880, 870, 0.09, 0.042); tone(t + 0.08, 'triangle', 1175, 1160, 0.22, 0.042); tone(t + 0.08, 'sine', 2350, 2330, 0.16, 0.0126); burst(t, 0.03, 0.042, 'highpass', 3000, 3000); },
  sell(t) { tone(t, 'triangle', 1175, 1160, 0.09, 0.042); tone(t + 0.08, 'triangle', 880, 870, 0.22, 0.042); tone(t + 0.08, 'sine', 1760, 1740, 0.16, 0.0126); },
  // shields (src/space.js): down is a falling crackle and a thump, back up is a rising hum and one clear ping
  shieldDown(t) { tone(t, 'sawtooth', 720, 80, 0.5, 0.027); tone(t, 'square', 360, 60, 0.4, 0.011); for (let i = 0; i < 4; i++) burst(t + i * 0.07, 0.05, 0.032, 'highpass', 2500, 4000); tone(t + 0.05, 'sine', 80, 36, 0.4, 0.027); },
  shieldUp(t) { swell(t, 'sine', 320, 1150, 0.5, 0.0245, 0.45); tone(t + 0.5, 'triangle', 1480, 1470, 0.28, 0.0245); },
  // panels and clicks (hangar, shop, Journal, Pause, NPC chat): a tiny click, a rising pair on open, a falling pair on close; a soft tick per few letters of an NPC line
  click(t) { tone(t, 'triangle', 1500, 800, 0.05, 0.07); },
  uiOpen(t) { tone(t, 'triangle', 620, 640, 0.06, 0.06); tone(t + 0.055, 'triangle', 930, 950, 0.1, 0.06); },
  uiClose(t) { tone(t, 'triangle', 930, 900, 0.06, 0.06); tone(t + 0.055, 'triangle', 620, 600, 0.1, 0.056); },
  type(t) { tone(t, 'sine', 1150 + Math.random() * 180, 880, 0.03, 0.062); burst(t, 0.015, 0.062, 'highpass', 4500, 4500); },
  chime(t) { [660, 880, 1320].forEach((f, i) => tone(t + i * 0.07, 'triangle', f, f * 0.995, 0.35, 0.05)); tone(t + 0.21, 'sine', 1760, 1750, 0.3, 0.025); }
};

// What each of the Campaign's sounds is made of, in plain words (card space-game-campaign-sounds), and the group it was made in: so Troy can ask for a change by name.
// The numbers are in the sound's own line above. tests/campsounds.mjs holds every name here to a sound that exists and to the level rules.
const SFX_BUILT = {
  turret: { group: 'turrets', says: 'the turret pew: a short bright square bolt that falls to under a third of its pitch in 70 ms, a thin sawtooth zip on top and a hair of click at the start; the pitch is set by the turret (four steps of 150 Hz, the back four a little higher) and moved 3 percent at random, so the eight rattle and do not smear' }
};

// every effect plays with its own share of the reverb, however it is called (sfx('boom'), or SFX.boom(t) from another effect or a test); a is the sound's own argument (the turret's number)
Object.keys(SFX).forEach(name => {
  const play = SFX[name];
  SFX[name] = (t, a) => { const was = AUD.sendNow; AUD.sendNow = soundSend(name); try { play(t, a); } finally { AUD.sendNow = was; } };
});

// ---------- the cruise rumble: a quiet sub-bass bed while the ship flies itself (src/cruise.js) ----------
// Through AUD.master like everything else. startCruiseHum() on engage, stopCruiseHum() on every way out (a drop, a cancel, death, a scene change).
function startCruiseHum() {
  if (!audioReady()) return;
  stopCruiseHum();
  const out = AC.createGain(), list = [], now = AC.currentTime;
  out.gain.value = 0; out.connect(AUD.master);
  const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 180; flt.Q.value = 0.8; flt.connect(out);
  aOsc(list, 'sine', 42, flt, 0.5); aOsc(list, 'sine', 63, flt, 0.25); aOsc(list, 'sawtooth', 84, flt, 0.12);
  aNoise(list, out, 'bandpass', 140, 0.7, 0.18);
  out.gain.linearRampToValueAtTime(0.024 * fxScale(), now + 0.6);
  AUD.cru = { out, list };
}
function stopCruiseHum() {
  const c = AUD.cru; if (!c) return; AUD.cru = null;
  try { c.out.gain.cancelScheduledValues(0); c.out.gain.setTargetAtTime(0, AC.currentTime, 0.12); } catch (e) { /* audio is optional */ }
  setTimeout(() => c.list.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } }), 700);
}

function sfx(name, arg) { // arg: what a sound takes (the turret's number); most take none
  if (G.muted || G.volume <= 0 || FX.vol <= 0 || !SFX[name] || !audioReady()) return;
  resumeAudio(); syncMaster();
  try { SFX[name](AC.currentTime, arg); } catch (e) { /* audio is optional */ }
}
// beep() of src/common.js made an oscillator and a gain for every call (a salvage pod, a hit on the MULE, most of the station's clicks).
// The same call now plays on a voice of the pool, through the master gain (which is the volume, so v is not scaled here), nearly dry.
beep = function (f = 440, d = 0.08, type = 'square', v = 0.03, slide = 0) {
  if (G.muted || G.volume <= 0 || FX.vol <= 0 || !audioReady()) return;
  resumeAudio(); syncMaster();
  const was = AUD.sendNow; AUD.sendNow = soundSend('beep');
  try { tone(AC.currentTime, type, f, slide ? Math.max(30, f + slide) : f, d, v); } catch (e) { /* audio is optional */ } finally { AUD.sendNow = was; }
};

// ---------- wiring ----------
function installAudio(game) {
  const PAD = { Station: 'station', Space: 'space', Surface: 'wind' };
  const hook = sc => {
    const kind = PAD[sc.scene.key];
    if (!kind) return;
    sc.events.on('create', () => {
      AUD.ducked = false;
      startAmbient(kind);
      if (sc.scene.key === 'Space') startEngine(sc); else stopEngine();
    });
    sc.events.on('shutdown', () => {
      if (AUD.amb && AUD.amb.kind === kind) stopAmbient();
      if (sc.scene.key === 'Space') stopEngine();
    });
    sc.events.on('pause', () => duck(true));
    sc.events.on('resume', () => duck(false));
  };
  const wire = () => game.scene.scenes.forEach(hook);
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
  setInterval(syncMaster, 100); // follows volume and mute changes from the pause menu or M
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { AUD.gesture = true; resumeAudio(); }));
}

// ---------- Audio: synthesized ambient pads, engine hum and one-shot effects ----------
// Everything is Web Audio, no files. It shares the one AudioContext (AC) that beep() in common.js uses.
// Volume and mute come from G.volume and G.muted (set in the pause menu, meta.js) through one master gain.
// installAudio(game) hooks each scene's create, update, pause, resume and shutdown events,
// so the scenes need no code for loops; only sfx('name') calls replace beep() at a few spots.

const AUD = { master: null, noise: null, amb: null, eng: null, ducked: false, gesture: false };
// Each pad has its own level on top of the master volume (G.volume and mute), so a pad that is only noise can sit low
// without turning the others down. The planet wind is hiss with no pitch, so it reads much louder than a tone of the same
// size: it sits about 8 dB under the quietest effect (it was 16 dB over a laser shot at level 1) (tests/surface.mjs measures it against laser, tick, hit and boom).
const AMB_LEVEL = { station: 1, space: 1, wind: 0.06 };
const ambLevel = kind => AMB_LEVEL[kind] === undefined ? 1 : AMB_LEVEL[kind];

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
  resumeAudio(); // after M unmutes, wake a suspended context
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
  out.gain.setTargetAtTime(ambLevel(kind) * (AUD.ducked ? 0.3 : 1), AC.currentTime, 0.5); // fade in
  AUD.amb = { kind, out, list };
}
function stopAmbient() {
  if (!AUD.amb) return;
  fadeOutAndStop(AUD.amb.out, AUD.amb.list, 0.35);
  AUD.amb = null;
}

// ---------- engine hum: rises with thrust and boost, silent when idle ----------
function startEngine(sc) {
  if (!audioReady()) return;
  stopEngine();
  const out = AC.createGain(), list = [];
  out.gain.value = 0; out.connect(AUD.master);
  const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 300; flt.Q.value = 1.2; flt.connect(out);
  const saw = aOsc(list, 'sawtooth', 50, flt, 0.5), sub = aOsc(list, 'square', 25, flt, 0.25);
  const rush = aNoise(list, out, 'bandpass', 900, 1, 0.3);
  AUD.eng = { out, list, flt, saw, sub, rush, level: 0, nextAt: 0 };
  const tick = (time) => {
    const e = AUD.eng;
    if (!e || time < e.nextAt) return;
    e.nextAt = time + 60; // retune about 16 times a second, not every frame
    const ship = sc.ship, now = AC.currentTime;
    const thrusting = ship && ship.body && !sc.dead && ship.body.acceleration.length() > 0 && !AUD.ducked;
    const boost = thrusting && sc.boosting; // boost.js: Shift held and the tank not empty
    e.level = thrusting ? (boost ? 1 : 0.55) : 0;
    const speed = ship && ship.body ? Math.min(1, ship.body.speed / 800) : 0;
    e.out.gain.setTargetAtTime(e.level * 0.2, now, 0.12);
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
  fadeOutAndStop(e.out, e.list, 0.25);
  AUD.eng = null;
}

function duck(on) { // the pause menu: engine off, pad down to a murmur
  AUD.ducked = on;
  if (AUD.amb && AC) AUD.amb.out.gain.setTargetAtTime(ambLevel(AUD.amb.kind) * (on ? 0.3 : 1), AC.currentTime, 0.15);
  if (AUD.eng && AC) { if (on) AUD.eng.level = 0; AUD.eng.out.gain.setTargetAtTime(0, AC.currentTime, 0.05); }
}

// ---------- one-shot effects ----------
function tone(t, type, f0, f1, dur, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + dur + 0.02);
}
function burst(t, dur, vol, ftype, f0, f1, q = 1, attack = 0.005) {
  const s = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf();
  flt.type = ftype; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(flt); flt.connect(g); g.connect(AUD.master);
  s.start(t, Math.random()); s.stop(t + dur + 0.02);
}

const SFX = {
  laser(t) { tone(t, 'square', 1300, 260, 0.13, 0.05); tone(t, 'sawtooth', 2400, 600, 0.06, 0.02); },
  tick(t) { tone(t, 'square', 520, 260, 0.05, 0.03); burst(t, 0.04, 0.05, 'highpass', 3000, 3000); },
  boom(t) { burst(t, 0.6, 0.22, 'lowpass', 1800, 80); tone(t, 'sine', 110, 36, 0.5, 0.22); burst(t, 0.15, 0.1, 'highpass', 2500, 1200); },
  hit(t) { tone(t, 'sawtooth', 220, 70, 0.18, 0.08); burst(t, 0.14, 0.12, 'bandpass', 1400, 400); },
  dock(t) { // two heavy clamps, then a latch
    tone(t, 'sine', 95, 45, 0.18, 0.28); burst(t, 0.06, 0.12, 'lowpass', 1200, 300);
    tone(t + 0.16, 'sine', 70, 38, 0.22, 0.26); burst(t + 0.16, 0.06, 0.1, 'lowpass', 900, 250);
    tone(t + 0.28, 'square', 1800, 1500, 0.03, 0.03);
  },
  thrusters(t) { burst(t, 0.9, 0.14, 'bandpass', 300, 1200, 0.9, 0.25); tone(t, 'sine', 70, 110, 0.8, 0.07); },
  dash(t) { burst(t, 0.22, 0.13, 'bandpass', 700, 2800, 0.9, 0.2); tone(t, 'sine', 260, 820, 0.18, 0.05); },
  empty(t) { tone(t, 'square', 190, 120, 0.1, 0.035); },
  chime(t) { [660, 880, 1320].forEach((f, i) => tone(t + i * 0.07, 'triangle', f, f * 0.995, 0.35, 0.05)); tone(t + 0.21, 'sine', 1760, 1750, 0.3, 0.025); }
};

function sfx(name) {
  if (G.muted || G.volume <= 0 || !SFX[name] || !audioReady()) return;
  resumeAudio(); syncMaster();
  try { SFX[name](AC.currentTime); } catch (e) { /* audio is optional */ }
}

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

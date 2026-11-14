// ---------- Audio: synthesized ambient pads, engine hum and one-shot effects ----------
// Everything is Web Audio, no files. It shares the one AudioContext (AC) that beep() in common.js uses.
// Volume and mute come from G.volume and G.muted (set in the pause menu, meta.js) through one master gain.
// installAudio(game) hooks each scene's create, update, pause, resume and shutdown events,
// so the scenes need no code for loops; only sfx('name') calls replace beep() at a few spots.

const AUD = { master: null, noise: null, amb: null, eng: null, cru: null, ducked: false, gesture: false };
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
  g.gain.value = 0.0001; // a gain node starts at 1: until the first event below takes hold (a rounding of the start time can leave one sample before it) it must be silent, not a click
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + dur + 0.02);
}
function burst(t, dur, vol, ftype, f0, f1, q = 1, attack = 0.005) {
  const s = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain();
  g.gain.value = 0.0001; // silent until the first event (see tone): a noise burst starting at a fractional time used to open with one full-scale sample
  s.buffer = noiseBuf();
  flt.type = ftype; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(flt); flt.connect(g); g.connect(AUD.master);
  s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
// a tone that swells in and then dies away: the first `attack` seconds are the rise (charge-up whines, a shield coming back)
function swell(t, type, f0, f1, dur, vol, attack) {
  const o = AC.createOscillator(), g = AC.createGain();
  g.gain.value = 0.0001;
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (attack || dur * 0.8)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + dur + 0.02);
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
  hyperJump(t) { tone(t, 'sine', 90, 30, 0.7, 0.0255); burst(t, 0.18, 0.0155, 'highpass', 800, 6000, 0.7, 0.01); burst(t + 0.04, 0.9, 0.0127, 'bandpass', 600, 3000, 0.8, 0.2); tone(t, 'sawtooth', 220, 1400, 0.35, 0.0045); },
  hyperArrive(t) { burst(t, 0.9, 0.018, 'bandpass', 3000, 180, 0.8, 0.05); tone(t, 'sine', 520, 60, 0.8, 0.011); tone(t + 0.35, 'sine', 90, 34, 0.5, 0.03); burst(t + 0.35, 0.2, 0.0155, 'lowpass', 500, 90); },
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
  out.gain.linearRampToValueAtTime(0.024, now + 0.6);
  AUD.cru = { out, list };
}
function stopCruiseHum() {
  const c = AUD.cru; if (!c) return; AUD.cru = null;
  try { c.out.gain.cancelScheduledValues(0); c.out.gain.setTargetAtTime(0, AC.currentTime, 0.12); } catch (e) { /* audio is optional */ }
  setTimeout(() => c.list.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } }), 700);
}

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

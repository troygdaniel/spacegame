// smoke: the Campaign's sounds: each is built of the pool's tones and noise bursts, short, within the level rules, in the one table of what each is made of (plain Node, no browser)
// Card space-game-campaign-sounds (src/audio.js: SFX, SFX_BUILT; src/campaignscene.js: which event plays which). Nothing plays: the game's audio code runs against a stand-in
// AudioContext (the one of tests/soundpool.mjs) that records what is scheduled on every voice, and the sounds are measured from that: how long, how high, how loud at worst.
//   G1. the turrets: the pew
//   G2. the beam and mining hum
//   G3. the missiles
//   G4. the explosions and the hits
//   G5. the sound bug: the turrets and the wing's guns can be heard (levels, the wing's pew, every shot has an event)
//   ALL. the rules every one of them keeps: no new nodes, volume and mute, the effects volume, a share of the reverb, a name in the table
// Run: node tests/campsounds.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame(); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// the stand-in AudioContext (as tests/soundpool.mjs): every node counted, every parameter keeps its events as [what, value, time]
g.run(`
  function __fake() {
    const made = { osc: 0, gain: 0, filter: 0, source: 0, buffer: 0, convolver: 0, compressor: 0 }, nodes = [];
    const param = v => { const p = { value: v, ev: [] };
      p.setValueAtTime = (x, t) => { p.ev.push(['set', x, t]); return p; }; p.linearRampToValueAtTime = (x, t) => { p.ev.push(['lin', x, t]); return p; };
      p.exponentialRampToValueAtTime = (x, t) => { p.ev.push(['exp', x, t]); return p; }; p.setTargetAtTime = (x, t) => { p.ev.push(['target', x, t]); return p; };
      p.cancelScheduledValues = t => { p.ev = p.ev.filter(e => e[2] < t); return p; };
      return p; };
    const node = (kind, extra) => { made[kind]++; const o = Object.assign({ kind, to: [], connect(d) { o.to.push(d); return d; }, disconnect() { o.to = []; }, start() { o.started = (o.started || 0) + 1; }, stop() { o.stopped = true; } }, extra); nodes.push(o); return o; };
    const ac = { sampleRate: 8000, currentTime: 10, state: 'running', destination: { kind: 'destination' }, made, nodes, resume() {},
      createOscillator: () => node('osc', { type: 'sine', frequency: param(440) }),
      createGain: () => node('gain', { gain: param(1) }),
      createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }),
      createBufferSource: () => node('source', { buffer: null, loop: false }),
      createConvolver: () => node('convolver', { buffer: null }),
      createDynamicsCompressor: () => node('compressor', {}),
      createBuffer: (ch, len, rate) => { made.buffer++; const data = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: c => data[c] }; } };
    ac.count = () => made.osc + made.gain + made.filter + made.source + made.convolver + made.compressor;
    return ac;
  }
  var __made = 0; window.AudioContext = function () { __made++; return (__ac = __fake()); }; window.webkitAudioContext = undefined;
  var __ac = null;
  function __reset(muted, volume, fx) { AC = null; __ac = null; __made = 0; Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, beam: null, rev: null, pool: null, sendNow: undefined, gesture: true, ducked: false }); G.muted = !!muted; G.volume = volume === undefined ? 1 : volume; FX.vol = fx === undefined ? 1 : fx; }
  // one sound on a fresh pool: what it asks of the voices. voices: those it touched (a gain that went above silence); peak: the sum of their loudest points (an upper bound of how loud it gets);
  // secs: from its start to the last thing scheduled; freqs: each tone voice's first and last pitch; noise: each noise voice's filter type and sweep
  window.__render = (name, arg, setup) => {
    __reset(false, 1); Math.random = () => (window.__rand === undefined ? 0.5 : window.__rand); if (setup) setup();
    sfx('click'); const before = __ac.count(); const t0 = 20; __ac.currentTime = t0;
    const pool = AUD.pool, base = new Map(); pool.tones.concat(pool.noises).forEach(v => base.set(v, v.g.gain.ev.length));
    SFX[name](t0, arg);
    const used = [], lvl = v => v.g.gain.ev.slice(base.get(v)).filter(e => e[1] > 0.0011);
    pool.tones.concat(pool.noises).forEach(v => { if (lvl(v).length) used.push(v); });
    const peak = used.reduce((s, v) => s + Math.max(...lvl(v).map(e => e[1])), 0);
    const end = Math.max(0, ...used.map(v => Math.max(...v.g.gain.ev.slice(base.get(v)).map(e => e[2])))) - t0;
    const t00 = t0, part = v => { const e = lvl(v), all = v.g.gain.ev.slice(base.get(v)), f = v.o ? v.o.frequency.ev : v.flt.frequency.ev, ff = f.filter(x => x[2] >= t00 - 0.0001); return { kind: v.o ? 'tone' : 'noise', type: v.o ? v.o.type : v.flt.type, start: Math.min(...all.map(x => x[2])) - t00, end: Math.max(...all.map(x => x[2])) - t00, bursts: all.filter(x => x[0] === 'set' && x[1] === 0.0001).map(x => x[2] - t00), ends: all.filter(x => x[0] === 'exp').map(x => x[2] - t00), peak: Math.max(...e.map(x => x[1])), f0: ff[0] && ff[0][1], f1: ff[ff.length - 1] && ff[ff.length - 1][1] }; };
    return { parts: used.map(part), voices: used.length, peak, secs: end, nodes: __ac.count() - before,
      freqs: used.filter(v => v.o).map(v => { const e = v.o.frequency.ev.filter(x => x[2] >= t0 - 0.0001); return { type: v.o.type, f0: e[0] && e[0][1], f1: e[e.length - 1] && e[e.length - 1][1] }; }),
      noise: used.filter(v => v.flt).map(v => { const e = v.flt.frequency.ev.filter(x => x[2] >= t0 - 0.0001); return { type: v.flt.type, f0: e[0] && e[0][1], f1: e[e.length - 1] && e[e.length - 1][1] }; }),
      finite: used.every(v => v.g.gain.ev.every(e => Number.isFinite(e[1]) && Number.isFinite(e[2])) && (!v.o || v.o.frequency.ev.every(e => Number.isFinite(e[1])))) };
  };
`);
const R = (name, arg) => J(`__render(${JSON.stringify(name)}, ${arg === undefined ? 'undefined' : JSON.stringify(arg)})`);
const LASER = R('laser');

// ---------- G1. the turrets ----------
console.log('G1. the turrets: the pew');
{
  const p = Array.from({ length: 8 }, (_, i) => R('turret', i));
  check('a pew is short: under 100 ms from the first thing to the last, so eight turrets 88 ms apart do not smear', p.every(x => x.secs <= 0.1 && x.secs > 0.03), p.map(x => Math.round(x.secs * 1000)).join());
  const KILL1 = R('boom').peak;
  check('and heard: 3.2 times as loud as it is written (0.054 added up, 0.173 now), above the laser of Long Haul (' + LASER.peak.toFixed(3) + ') and well under a kill\'s boom (' + KILL1.toFixed(2) + '): measured at the master output in Chrome the eight turrets were 5 dB under that laser and 24 dB under a kill (tests/campsound-probe.mjs)', p.every(x => x.peak > LASER.peak && x.peak < KILL1 * 0.5 && Math.abs(x.peak / 3.2 - 0.054) < 0.004), p[0].peak.toFixed(3));
  check('it is a bolt: a square tone that falls to under a third of its pitch, a sawtooth zip over it, and a click of noise', p[0].freqs.some(f => f.type === 'square' && f.f1 < f.f0 * 0.35) && p[0].freqs.some(f => f.type === 'sawtooth') && p[0].noise.some(f => f.type === 'highpass'), JSON.stringify(p[0].freqs));
  const base = p.map(x => x.freqs.find(f => f.type === 'square').f0);
  check('each turret has its own pitch: eight numbers give four steps of 150 Hz and the back four a little higher, all between 1.4 and 2.2 kHz', new Set(base.map(f => Math.round(f))).size === 8 && Math.min(...base) >= 1400 && Math.max(...base) <= 2200 && base[1] - base[0] === 150 && base[4] > base[0], base.map(Math.round).join());
  const lo = (g.run('window.__rand = 0'), J(`__render('turret', 0).freqs.find(f => f.type === 'square').f0`)), hi = (g.run('window.__rand = 1'), J(`__render('turret', 0).freqs.find(f => f.type === 'square').f0`)); g.run('window.__rand = 0.5');
  check('it moves 3 percent at random, so no two shots of one turret are the same: from 3 percent under to 3 percent over the turret\'s own pitch', Math.abs(lo / 1500 - 0.97) < 1e-6 && Math.abs(hi / 1500 - 1.03) < 1e-6, [lo, hi].join());
  check('it uses the pool: no new node', p.every(x => x.nodes === 0), p.map(x => x.nodes).join());
  check('the turret takes a little of the reverb, and no more than the laser', J('SOUND.send.turret') > 0 && J('SOUND.send.turret') <= J('SOUND.send.laser'));
  const sc = src('src/campaignscene.js');
  check('the scene plays it for each turret event, with the turret\'s number, no more than once in CAMP_BLIP.gap ms; the loud laser and the beep are gone from the turrets', /sfx\('turret', e\.i\)/.test(sc) && /C\.t - this\.blipAt < B\.gap/.test(sc) && !/B\.freq|B\.step/.test(sc));
}

// ---------- G2. the beam and mining hum ----------
console.log('G2. the beam and mining hum');
{
  g.run(`
    window.__bat = (techs) => { window.C = campNew(11, techs || [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12; C.pickups = []; C.rocks = [];
      const u = campSpawn(C, 'gunship', C.carrier.x + 300, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 90000; return u.id; };
    window.__go = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  `);
  g.run('__bat(["beam"]); C.input.fire = true; __go(0.5)');
  const s1 = J('campBeamState(C)');
  g.run('__go(0.5)'); const s2 = J('campBeamState(C)');
  g.run('__go(3)'); const s3 = J('campBeamState(C)');
  check('Beam turrets, Space held, a turret on a target: the beam hum is on at full level and climbs with unbroken fire: a quarter up at half a second, half at one, all the way by two seconds', s1.kind === 'turrets' && s1.level === 1 && Math.abs(s1.rise - 0.25) < 0.05 && Math.abs(s2.rise - 0.5) < 0.05 && s3.rise === 1, JSON.stringify([s1, s2, s3]));
  g.run('C.input.fire = false; __go(0.2)'); const s4 = J('campBeamState(C)'), t4 = J('C.beamT');
  check('Space let go: the hum is off, and the climb falls back three times as fast as it rose (so a tap does not start from the top)', s4.kind === '' && s4.level === 0 && t4 < 1.5 && t4 > 0.9, JSON.stringify([s4, t4]));
  g.run('__bat([]); C.input.fire = true; __go(2)');
  check('without the Beam turrets tech the turrets only pew: no hum', J('campBeamState(C).kind') === '' && J('C.beamT') === 0);
  g.run('__bat(["beam"]); C.input.fire = true; C.ships.forEach(u => { if (u.team === "alien") u.x += 5000; }); __go(1)');
  check('nothing in reach, no hum (a turret with no target does not fire)', J('campBeamState(C).kind') === '');
  g.run('__bat([]); C.lasers = []; campStep(C, 0.001)');
  check('the mining lasers (C.lasers, from the belt card): a beam on a rock gives kind laser at 0.8, climbing from when it began (half way after a second), the oldest beam counts when two fire, none gives none', (() => {
    g.run('C.t = 5000; C.lasers = [{ from: "escort-1", to: "rock-1", kind: "rock", since: 4000 }]'); const a = J('campBeamState(C)');
    g.run('C.lasers = [{ from: "escort-1", to: "rock-1", kind: "rock", since: 4900 }, { from: "escort-2", to: "rock-2", kind: "rock", since: 3000 }]'); const c = J('campBeamState(C)');
    g.run('C.lasers = []'); const d = J('campBeamState(C)');
    return a.kind === 'laser' && a.level === 0.8 && Math.abs(a.rise - 0.5) < 1e-9 && c.rise === 1 && d.kind === '';
  })());
  check('a plain turret shot at an alien is a kind alien beam in C.lasers (2-GEN: from the carrier, one list with the rocks): it keeps its pew and does not hum, unless CAMP.beamHum.alienLaser is 1, which gives the same hum as a rock', (() => {
    g.run('C.t = 5000; C.lasers = [{ from: "carrier-1", to: "raider-3", kind: "alien", since: 4000 }]'); const off = J('campBeamState(C)');
    g.run('CAMP.beamHum.alienLaser = 1'); const on = J('campBeamState(C)');
    g.run('CAMP.beamHum.alienLaser = 0; C.lasers = [{ from: "carrier-1", to: "raider-3", kind: "alien", since: 4000 }, { from: "escort-1", to: "rock-1", kind: "rock", since: 4500 }]'); const mix = J('campBeamState(C)');
    return off.kind === '' && on.kind === 'laser' && on.level === 0.8 && Math.abs(mix.rise - 0.25) < 1e-9 && J('CAMP.beamHum.alienLaser') === 0;
  })());
  check('the Beam turrets still hum over a laser: with the tech and Space held on an alien the kind is turrets; let go and a beam on a rock is the laser hum', (() => {
    g.run('__bat(["beam"]); C.lasers = [{ from: "e", to: "r", kind: "rock", since: C.t - 500 }]; C.input.fire = true; __go(0.5)'); const x = J('campBeamState(C).kind');
    g.run('C.input.fire = false; C.lasers = [{ from: "e", to: "r", kind: "rock", since: C.t - 500 }]; __go(0.1); C.lasers = [{ from: "e", to: "r", kind: "rock", since: C.t - 500 }]'); const y = J('campBeamState(C).kind');
    return x === 'turrets' && y === 'laser';
  })());
  check('a battle that is over hums nothing', (g.run('__bat(["beam"]); C.input.fire = true; __go(0.2); campEnd(C, "won", "mother")'), J('campBeamState(C).kind') === ''));
  // the loop itself, on the stand-in AudioContext
  g.run(`__reset(false, 1); AC = new AudioContext(); audioReady();`);
  g.run(`beamHum(1, 0); window.__n1 = __ac.count(); window.__b = AUD.beam`);
  check('beamHum starts one loop the first time it is told: a root, a fifth and a buzz (three oscillators), one band of hiss, a low-pass, a gain into the master', J('!!AUD.beam') && J('__b.list.length') === 4 && J('__b.out.to.includes(AUD.master)') && J('__b.flt.type') === 'lowpass' && J('__b.o1.type') === 'sine' && J('__b.o3.type') === 'sawtooth');
  g.run('for (let i = 0; i < 200; i++) { __ac.currentTime += 0.016; beamHum(1, i / 200); }');
  check('told again and again as it climbs (200 frames) it makes no new node: it retunes the one loop', J('__ac.count()') === J('__n1'));
  const ev = J('__b.o1.frequency.ev.filter(e => e[0] === "target").map(e => e[1])');
  check('it climbs: the root goes from 140 Hz up to 320 Hz as the rise goes from 0 to 1, never down, and the fifth and the buzz follow at 1.5 and 2 times', Math.abs(ev[0] - 140) < 1 && ev[ev.length - 1] > 300 && ev[ev.length - 1] <= 320 + 1e-9 && ev.every((f, i) => i === 0 || f >= ev[i - 1] - 1e-9) && Math.abs(J('__b.o2.frequency.ev[__b.o2.frequency.ev.length - 1][1]') - 1.5 * ev[ev.length - 1]) < 1e-6 && Math.abs(J('__b.o3.frequency.ev[__b.o3.frequency.ev.length - 1][1]') - 2 * ev[ev.length - 1]) < 1e-6, [ev[0], ev[ev.length - 1]].join());
  check('and the filter opens with it (500 Hz to nearly 1.9 kHz)', Math.abs(J('__b.flt.frequency.ev[0][1]') - 500) < 1 && J('__b.flt.frequency.ev[__b.flt.frequency.ev.length - 1][1]') > 1800);
  check('it is retuned about 16 times a second, not every frame (a retune every 60 ms: at most 17 a second)', ev.length <= 17 * (200 * 0.016) + 2, ev.length);
  const lvl = J('__b.out.gain.ev.filter(e => e[0] === "target").map(e => e[1])');
  check('it is heard but not loud: its loudest level is 0.04 (it was 0.02, and measured -41 dBFS: too quiet), about half a laser shot, and it follows the level it is told (0.55 gives 0.022)', Math.max(...lvl) <= 0.0401 && Math.max(...lvl) >= 0.0399 && (g.run('__ac.currentTime += 1; beamHum(0.55, 1)'), Math.abs(J('__b.out.gain.ev[__b.out.gain.ev.length - 1][1]') - 0.022) < 1e-6));
  g.run('FX.vol = 0.5; __ac.currentTime += 1; beamHum(1, 1)');
  check('the effects volume of Settings > Sound follows it while it hums (half the volume, half the level)', Math.abs(J('__b.out.gain.ev[__b.out.gain.ev.length - 1][1]') - 0.02) < 1e-6);
  g.run('FX.vol = 1; beamHum(0, 0)');
  check('told zero it fades away (a target of silence) and lets the loop go: no hum stays', J('AUD.beam') === null && J('__b.out.gain.ev[__b.out.gain.ev.length - 1][1]') === 0);
  g.run(`__reset(true, 1); beamHum(1, 0)`);
  check('muted, or volume 0, or the effects at 0: it does not start', J('__made') === 0 && J('AUD.beam') === null && (g.run('__reset(false, 0); beamHum(1, 0)'), J('AUD.beam') === null) && (g.run('__reset(false, 1, 0); beamHum(1, 0)'), J('AUD.beam') === null));
  g.run(`__reset(false, 1); AC = new AudioContext(); audioReady(); beamHum(1, 0.5); G.muted = true; beamHum(1, 0.5)`);
  check('and M pressed while it hums stops it', J('AUD.beam') === null);
  const sc = src('src/campaignscene.js');
  check('the scene asks for it every frame while it plays (and for silence when it does not: the pause card), and stops it when the scene shuts down', /campBeamState\(C\) : null; beamHum\(bs \? bs\.level : 0/.test(sc) && /events\.once\('shutdown', \(\) => \{ if \(typeof stopBeamHum/.test(sc));
  g.run(`
    window.__plays = []; window.__sfx1 = sfx; sfx = (name, a) => { __plays.push(name + ' ' + a); };
    window.__fakeSc = (techs) => { const rec = () => { const p = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => p) }); return p; };
      const f = Object.create(Campaign.prototype); f.add = rec(); f.tweens = { add() {} }; f.blipAt = undefined; f.camp = campNew(11, techs, { seed: 1 }); return f; };
  `);
  g.run('window.__f1 = __fakeSc([]); __plays.length = 0; __f1.camp.t = 1000; __f1.onEvent({ type: "turret", i: 3, x: 0, y: 0, aim: 0 }); window.__f2 = __fakeSc(["beam"]); __f2.camp.t = 1000; __f2.onEvent({ type: "turret", i: 3, x: 0, y: 0, aim: 0 }); sfx = __sfx1');
  check('with the Beam turrets the hum is the sound: the turret event plays no pew (the flash stays); without it the pew is played with the turret\'s number', J('__plays').join() === 'turret 3', J('__plays').join());
  check('the numbers are in the table: how long it takes to climb, how loud a laser hums, whether a turret shot at an alien hums too', J('CAMP.beamHum.rise') === 2 && J('CAMP.beamHum.laserLevel') === 0.8 && J('CAMP.beamHum.alienLaser') === 0);
}

// ---------- G3. the missiles ----------
console.log('G3. the missiles');
{
  const L = R('missileLaunch'), B = R('missileBlast'), F = R('missileFizzle'), BOOM = R('boom');
  const sweepN = L.parts.find(p => p.kind === 'noise' && p.type === 'bandpass' && p.f1 > p.f0 * 8), rise = L.parts.find(p => p.kind === 'tone' && p.type === 'sawtooth' && p.f1 > p.f0 * 3), thump = L.parts.find(p => p.kind === 'tone' && p.type === 'sine' && p.f1 < p.f0 / 2);
  check('the launch is a whoosh with a rising pitch: a band of noise that sweeps up (250 Hz to 3.2 kHz) and a sawtooth that climbs (110 to 520 Hz), both starting at once', !!sweepN && !!rise && sweepN.start < 0.02 && rise.start < 0.02, JSON.stringify(L.parts.map(p => [p.type, Math.round(p.f0), Math.round(p.f1)])));
  check('then a dull thump: a sine that falls under half its pitch (90 to 36 Hz), starting 0.3 s in, after the whoosh has climbed', !!thump && thump.start >= 0.25 && thump.start <= 0.35 && thump.f0 <= 100 && L.parts.some(p => p.kind === 'noise' && p.type === 'lowpass' && p.start >= 0.25), JSON.stringify(thump));
  check('the launch is over in under 0.65 s (the whoosh half a second, the thump to 0.55) and no louder than 0.25 added up, a fifth of a kill', L.secs <= 0.65 && L.secs >= 0.5 && L.peak <= 0.25 && L.peak > 0.1, [L.secs.toFixed(2), L.peak.toFixed(3)].join());
  const th = B.parts.find(p => p.kind === 'tone' && p.type === 'sine'), rum = B.parts.find(p => p.kind === 'noise' && p.type === 'lowpass'), crack = B.parts.filter(p => p.kind === 'noise' && p.type === 'highpass');
  const cs = crack.flatMap(p => p.bursts.map((b, i) => ({ at: b, dur: p.ends[i] - b }))).sort((a, b) => a.at - b.at);
  check('the blast is a low thump with a crackle: a sine that falls (80 to 30 Hz), a rumble of low-passed noise that falls (1 kHz to 70 Hz), and five short bright bursts of high-passed noise (the voices are reused, so they are counted as bursts)', !!th && th.f0 === 80 && th.f1 === 30 && !!rum && rum.f0 === 1000 && cs.length === 5, JSON.stringify(B.parts.map(p => [p.type, Math.round(p.f0), Math.round(p.f1), p.bursts.length])));
  check('the crackle is quick and spread out: each burst under 40 ms, five different starts inside the first quarter second', cs.every(c => c.dur > 0 && c.dur <= 0.04) && new Set(cs.map(c => c.at.toFixed(3))).size === 5 && cs[4].at <= 0.25, cs.map(c => c.at.toFixed(3)).join());
  check('the blast is under 0.6 s and, like a kill, big: louder than the launch and no louder than the kill\'s own boom (' + BOOM.peak.toFixed(2) + ')', B.secs <= 0.6 && B.peak > L.peak && B.peak <= BOOM.peak, [B.secs.toFixed(2), B.peak.toFixed(3)].join());
  check('and it is its own sound, not the kill\'s: different parts and a shorter tail', B.parts.length !== BOOM.parts.length && B.secs < BOOM.secs);
  check('a fizzle is a soft puff: under 0.05 added up and under half a second', F.peak <= 0.05 && F.secs <= 0.5 && F.parts.some(p => p.kind === 'noise' && p.type === 'bandpass'), [F.peak.toFixed(3), F.secs.toFixed(2)].join());
  check('the blast never takes more noise voices than the pool has (8), so even with a kill at the same moment nothing is cut', B.parts.filter(p => p.kind === 'noise').length <= 4 && L.parts.filter(p => p.kind === 'noise').length <= 3);
  const sc = src('src/campaignscene.js');
  check('the scene plays the launch for the missile event, the blast for the missile that goes off and the fizzle for the one that ran dry; the beep and the ship\'s boom are gone from them', /e\.type === 'missile'\) sfx\('missileLaunch'\)/.test(sc) && /e\.type === 'mboom'\) \{[^}]*sfx\('missileBlast'\)/.test(sc) && /e\.type === 'mfizzle'\) \{[^}]*sfx\('missileFizzle'\)/.test(sc) && !/e\.type === 'mboom'\) \{[^}]*sfx\('boom'\)/.test(sc) && !/beep\(170/.test(sc));
  check('they have a share of the reverb: the blast the most (0.4), the launch a fifth, the fizzle a little', J('SOUND.send.missileBlast') === 0.4 && J('SOUND.send.missileLaunch') === 0.2 && J('SOUND.send.missileFizzle') === 0.1);
}

// ---------- G4. the explosions and the hits ----------
console.log('G4. the explosions and the hits');
{
  const S = R('blastSmall'), Bg = R('blastBig'), SH = R('shieldHit'), HH = R('hullHit'), EH = R('earthHit'), BOOM = R('boom'), HIT = R('hit');
  const crackle = x => x.parts.filter(p => p.kind === 'noise' && p.type === 'highpass').reduce((n, p) => n + p.bursts.length, 0);
  check('a small ship dies with a thump and a crackle: a sine thump that falls (110 to 40 Hz), a low-passed rumble, four short bursts of high-passed noise, over in 0.35 s', S.parts.some(p => p.kind === 'tone' && p.type === 'sine' && p.f0 === 110 && p.f1 === 40) && S.parts.some(p => p.type === 'lowpass') && crackle(S) === 4 && S.secs <= 0.35, [crackle(S), S.secs.toFixed(2)].join());
  check('a big ship dies with two thumps (a low one for a second, a higher one under it), a long rumble and eight bursts of crackle over half a second', Bg.parts.filter(p => p.kind === 'tone' && p.type === 'sine').length === 2 && Bg.parts.some(p => p.type === 'lowpass' && p.end >= 0.9) && crackle(Bg) === 8 && Bg.secs >= 1 && Bg.secs <= 1.1, [crackle(Bg), Bg.secs.toFixed(2)].join());
  check('the big one is the bigger: longer, lower and louder than the small one, and neither is louder than the kill\'s boom of before (' + BOOM.peak.toFixed(2) + ')', Bg.secs > S.secs * 2.5 && Bg.peak > S.peak && Bg.peak <= BOOM.peak && S.peak < Bg.peak, [S.peak.toFixed(2), Bg.peak.toFixed(2)].join());
  check('and neither takes more noise voices than the pool has (the crackle reuses two), so a kill and its neighbour at the same moment cut nothing', S.parts.filter(p => p.kind === 'noise').length <= 3 && Bg.parts.filter(p => p.kind === 'noise').length <= 3);
  check('the shield hit is a bright zap: tones up high (triangle 1500 to 700, sine 2300 to 1700) and high-passed crackle, short (under 0.15 s)', SH.parts.filter(p => p.kind === 'tone').every(p => p.f0 >= 1500) && SH.parts.some(p => p.type === 'triangle' && p.f1 < p.f0 / 2) && SH.parts.some(p => p.type === 'highpass') && SH.secs <= 0.15, JSON.stringify(SH.parts.map(p => [p.type, Math.round(p.f0)])));
  check('the hull hit is a dull clank: tones down low (sawtooth 190 to 60, square 100 to 52) and a band of noise around 900 Hz, short (under 0.2 s)', HH.parts.filter(p => p.kind === 'tone').every(p => p.f0 <= 200) && HH.parts.some(p => p.type === 'sawtooth' && p.f1 < p.f0 / 2) && HH.parts.some(p => p.type === 'bandpass' && p.f0 === 900) && HH.secs <= 0.2, JSON.stringify(HH.parts.map(p => [p.type, Math.round(p.f0)])));
  check('so a shield hit and a hull hit are plainly two sounds: the lowest tone of one is above the highest of the other (700 Hz and 200 Hz), and neither is the game\'s own hit', Math.min(...SH.parts.filter(p => p.kind === 'tone').map(p => Math.min(p.f0, p.f1))) > Math.max(...HH.parts.filter(p => p.kind === 'tone').map(p => Math.max(p.f0, p.f1))) && JSON.stringify(SH.parts) !== JSON.stringify(HIT.parts) && JSON.stringify(HH.parts) !== JSON.stringify(HIT.parts));
  check('neither hit is louder than the game\'s own hit effect (' + HIT.peak.toFixed(2) + ' added up): they come often', SH.peak <= HIT.peak && HH.peak <= HIT.peak && SH.peak > 0.03 && HH.peak > 0.03, [SH.peak.toFixed(3), HH.peak.toFixed(3)].join());
  check('a shot on Earth is a deep thump felt more than heard: a sine falling 60 to 28 Hz and a low rumble under 300 Hz, half a second, under 0.15 added up', EH.parts.some(p => p.kind === 'tone' && p.type === 'sine' && p.f0 === 60 && p.f1 === 28) && EH.parts.some(p => p.type === 'lowpass' && p.f0 === 300) && EH.secs <= 0.55 && EH.peak <= 0.15, [EH.secs.toFixed(2), EH.peak.toFixed(3)].join());
  // the sim says which: a hit on the carrier's hull and on its shield
  g.run(`window.__hurt = (shield, dmg) => { window.C = campNew(11, [], { seed: 1 }); C.shield = shield; C.events.length = 0; campHurt(C, C.carrier, dmg, 'x'); return C.events.map(e => e.type + (e.hull === undefined ? '' : ':' + e.hull)); }`);
  check('the sim tells the scene which: a shot the shield took whole is a shieldhit and a hit that did not reach the hull; one that got through is a hit on the hull (and a shieldhit too while the shield lasts)', J('__hurt(150, 10)').join() === 'shieldhit,hit:false' && J('__hurt(0, 10)').join() === 'hit:true' && J('__hurt(5, 10)').join() === 'shieldhit,hit:true', [J('__hurt(150, 10)').join(), J('__hurt(0, 10)').join(), J('__hurt(5, 10)').join()].join(' | '));
  // the scene
  g.run(`
    window.__plays = []; window.__sfx1 = sfx; sfx = (name, a) => { __plays.push(name); };
    window.__fakeSc = () => { const rec = () => { const p = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => p) }); return p; };
      const f = Object.create(Campaign.prototype); f.add = rec(); f.tweens = { add() {} }; f.cameras = { main: { shake() {} } }; f.boom = { explode() {} }; f.flash = () => {}; f.camp = campNew(11, [], { seed: 1 }); return f; };
    window.__f = __fakeSc(); const at = (t, e) => { __f.camp.t = t; __f.onEvent(e); }; const c = __f.camp.carrier;
    at(1000, { type: 'boom', x: 0, y: 0, big: false, kind: 'raider' }); at(1010, { type: 'boom', x: 0, y: 0, big: false, kind: 'drone' }); at(1100, { type: 'boom', x: 0, y: 0, big: true, kind: 'mother' });
    at(2000, { type: 'hit', id: c.id, x: c.x, y: c.y, hull: true }); at(2020, { type: 'hit', id: c.id, x: c.x, y: c.y, hull: true }); at(2300, { type: 'hit', id: c.id, x: c.x, y: c.y, hull: false });
    at(3000, { type: 'shieldhit', x: c.x, y: c.y }); at(3020, { type: 'shieldhit', x: c.x, y: c.y }); at(3200, { type: 'shieldhit', x: c.x, y: c.y });
    at(4000, { type: 'earthhit', x: 1, y: 1 }); at(4100, { type: 'earthhit', x: 1, y: 1 }); at(4400, { type: 'earthhit', x: 1, y: 1 });
    at(5000, { type: 'hit', id: 'raider-9', x: 1, y: 1, hull: true });
    sfx = __sfx1;
  `);
  check('the scene plays them: a small kill and a big kill their own blast (a second kill within 45 ms is not played again), a hit on the carrier\'s hull the clank (once in 90 ms; a hit that did not get through plays none), a shot on the shield the zap, a shot on Earth the thump (once in 250 ms); a hit on an alien plays nothing (the turret\'s pew is its sound)', J('__plays').join() === 'blastSmall,blastBig,hullHit,shieldHit,shieldHit,earthHit,earthHit', J('__plays').join());
  const sc = src('src/campaignscene.js');
  check('the game\'s boom is no longer the Campaign\'s kill sound, and the gaps are one table in the scene (CAMP_SND)', !/e\.type === 'boom'\) \{[^}]*sfx\('boom'\)/.test(sc) && /const CAMP_SND = \{ blast: 45, hull: 90, shield: 90, earth: 250, wing: 55, far: 1600, min: 0\.1 \}/.test(sc));
  check('their reverb: the big blast 0.4 (under the dock\'s 0.45: the kill, the jump, the arrival and the dock keep the longest tails), the small one 0.3, the Earth thump 0.3, the zap 0.15, the clank 0.1', J('SOUND.send.blastBig') === 0.4 && J('SOUND.send.blastSmall') === 0.3 && J('SOUND.send.earthHit') === 0.3 && J('SOUND.send.shieldHit') === 0.15 && J('SOUND.send.hullHit') === 0.1);
}

// ---------- G5. the sound bug: Troy could not hear the turrets or his ships' guns ----------
console.log('G5. the turrets and the wing can be heard (card space-game-campaign-turret-sound-bug)');
{
  // measured in Chrome at the master output (tests/campsound-probe.mjs), music off (the Campaign has no music: only the Space scene has a mood):
  //   the eight turrets' loudest 46 ms -40.8 dBFS RMS / -27.8 peak: 5 dB under Long Haul's laser, 24 under a kill; the wing's guns (65 shots in 6 s): no sound at all; the beam hum -41.4 / -35
  g.run(`__reset(false, 1)`);
  check('the level table: one line a sound group in SOUND.level, 1 for a sound not in it, the turrets 3.2 and the wing\'s gun 3.2', J('SOUND.level.turret') === 3.2 && J('SOUND.level.wingShot') === 3.2 && J(`soundLevel('boom')`) === 1 && J(`soundLevel('nope')`) === 1 && /level: \{ +\/\/ how loud each sound is against the rest, one line a group/.test(src('src/audio.js')));
  g.run('window.__lv0 = SOUND.level.turret; SOUND.level.turret = 1'); const flat = R('turret', 3).peak; g.run('SOUND.level.turret = __lv0');
  check('the level multiplies into every tone and burst of the sound: with it at 1 the pew adds up to 0.054, at 3.2 to 0.173', Math.abs(flat - 0.054) < 0.002 && Math.abs(R('turret', 3).peak / flat - 3.2) < 0.01, [flat.toFixed(3), R('turret', 3).peak.toFixed(3)].join());
  check('and it is only the sound\'s own: another sound called inside one keeps its own level (the interdiction plays the siren at the siren\'s), and nothing is left set afterwards', (() => { g.run('__reset(false, 1); sfx("interdict")'); return J('AUD.lvl') === null || J('AUD.lvl === undefined'); })());
  check('the Effects volume still scales the level (half the volume, half the pew): the level is on top of it, not instead', (() => { const full = R('turret', 3).peak, half = J(`__render('turret', 3, () => { FX.vol = 0.5; }).peak`); return Math.abs(half / full - 0.5) < 0.02; })());
  // the wing's gun
  const W1 = R('wingShot', 1), W5 = R('wingShot', 0.5), W0 = R('wingShot', 0), T = R('turret', 3);
  check('the wing\'s gun is a quieter pew: under 0.7 of the turret\'s up close (about 6 dB, and the farther the softer), and not silent', W1.peak < T.peak * 0.7 && W1.peak > T.peak * 0.4 && W1.peak > 0.03, [W1.peak.toFixed(3), T.peak.toFixed(3)].join());
  check('it is softer the farther away it is: half way is half the level, and out of reach is silent', Math.abs(W5.peak / W1.peak - 0.5) < 0.05 && W0.peak === 0, [W5.peak.toFixed(3), W0.peak].join());
  check('it is a bolt, short and soft: a triangle tone falling 1 kHz to 350 Hz, a thin sine zip over it, a faint tick, all under 70 ms, no new node', W1.parts.some(p => p.kind === 'tone' && p.type === 'triangle' && p.f1 < p.f0 / 2.5 && p.f0 > 900 && p.f0 < 1100) && W1.parts.some(p => p.kind === 'tone' && p.type === 'sine') && W1.parts.some(p => p.type === 'highpass') && W1.secs <= 0.07 && W1.nodes === 0, JSON.stringify(W1.parts.map(p => [p.type, Math.round(p.f0)])));
  check('and it is not the turret\'s: lower (triangle where the turret has a square), so the two can be told apart', !T.parts.some(p => p.type === 'triangle') && T.parts.some(p => p.type === 'square') && Math.min(...W1.parts.filter(p => p.kind === 'tone').map(p => p.f0)) >= 900);
  // the events: every shot of ours says so, and every one of them has a sound
  g.run(`
    window.__fight = (secs) => { window.C = campNew(11, [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);
      const c = C.carrier, u = campSpawn(C, 'gunship', c.x + 350, c.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7;
      const cnt = { pd: 0, wing: 0, ev: {} }, b0 = campBullet; campBullet = function (C2, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth') { if (extra && extra.pd) cnt.pd++; else cnt.wing++; } return b0.apply(this, arguments); };
      campOrder(C, 'launch'); C.input.fire = true; const seen = [];
      for (let i = 0; i < secs * 30; i++) { if (i === 30 * 8) campOrder(C, 'attack', ''); campStep(C, 1 / 30); C.events.forEach(e => { cnt.ev[e.type] = (cnt.ev[e.type] || 0) + 1; if (['turret', 'wingshot'].includes(e.type)) seen.push(e); }); C.events.length = 0; }
      campBullet = b0; return { cnt, seen: seen.slice(0, 400) }; };
  `);
  const F = J('__fight(24)');
  check('every shot of ours has an event: the turrets\' bullets are as many as the \'turret\' events, the wing\'s as many as the \'wingshot\' events (a gun of ours with no event is a gun with no sound)', F.cnt.pd > 100 && F.cnt.wing > 30 && F.cnt.pd === F.cnt.ev.turret && F.cnt.wing === F.cnt.ev.wingshot, JSON.stringify([F.cnt.pd, F.cnt.ev.turret, F.cnt.wing, F.cnt.ev.wingshot]));
  const code = src('src/campaign.js'), ours = (code.match(/campBullet\([^;\n]*'earth'/g) || []);
  check('and no new gun of ours slips in without one: campaign.js has exactly two places that fire a shot of Earth\'s side (the turrets and the wing), and the test above holds each to its event', ours.length === 2, ours.length);
  g.run(`
    window.__plays = []; window.__sfx2 = sfx; sfx = (name, a) => { __plays.push([name, a]); };
    window.__fakeSc2 = () => { const rec = () => { const p = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => p) }); return p; };
      const f = Object.create(Campaign.prototype); f.add = rec(); f.tweens = { add() {} }; f.cameras = { main: { shake() {} } }; f.boom = { explode() {} }; f.flash = () => {}; f.blipAt = undefined; f.camp = campNew(11, [], { seed: 1 }); return f; };
  `);
  const sounded = J(`(() => { const f = __fakeSc2(), out = {}; f.camp.t = 10000; const kinds = ['turret', 'wingshot']; let t = 10000;
    kinds.forEach(k => { __plays.length = 0; t += 1000; f.camp.t = t; const c = f.camp.carrier; f.onEvent({ type: k, i: 2, x: c.x + 200, y: c.y, aim: 0, tx: undefined, kind: 'fighter', id: 'fighter-1' }); out[k] = __plays.map(p => p[0]); }); return out; })()`);
  check('every one of those events is a sound in the scene: the turret event plays the turret pew, the wing\'s shot the wing\'s pew', sounded.turret.join() === 'turret' && sounded.wingshot.join() === 'wingShot', JSON.stringify(sounded));
  const wing = J(`(() => { const f = __fakeSc2(), c = f.camp.carrier, r = {}; const at = (t, d) => { __plays.length = 0; f.camp.t = t; f.onEvent({ type: 'wingshot', x: c.x + d, y: c.y, kind: 'fighter', id: 'fighter-1' }); return __plays.map(p => [p[0], Math.round(p[1] * 100) / 100]); };
    r.near = at(20000, 160); r.mid = at(21000, 800); r.edge = at(22000, 1600); r.far = at(23000, 2500); r.gap = [at(30000, 100).length, at(30020, 100).length, at(30060, 100).length]; return r; })()`);
  check('the wing\'s pew is softer the farther the ship is from the carrier (a = 1 minus the distance over 1,600 px): 160 px is 0.9, 800 px is 0.5, and at 1,600 px and beyond there is none', wing.near[0][0] === 'wingShot' && wing.near[0][1] === 0.9 && wing.mid[0][1] === 0.5 && wing.edge.length === 0 && wing.far.length === 0, JSON.stringify(wing));
  check('and not more than once in 55 ms of the battle\'s clock (two shots 20 ms apart make one pew, shots 60 ms apart each get theirs)', wing.gap.join() === '1,0,1', wing.gap.join());
  g.run('sfx = __sfx2');
  const SCN = src('src/campaignscene.js');
  check('the scene plays them through the shared sound code (sfx), not a beep of its own, and the table of gaps and distances is one line (CAMP_SND)', /e\.type === 'wingshot'\) this\.wingShot\(e\)/.test(SCN) && /this\.battleSound\('wing', 'wingShot', near\)/.test(SCN) && !/beep\(1[0-9]{3}/.test(SCN));
  check('the probe that measured it is in the tests, not in the smoke (it needs Chrome): tests/campsound-probe.mjs', /not in the smoke/.test(src('tests/campsound-probe.mjs')) && /AnalyserNode/.test(src('tests/campsound-probe.mjs')));
}

// ---------- the scene's names ----------
console.log('the scene\'s method names');
{
  // Phaser sets these on every scene at boot (this.sound is the sound manager, this.add the factory ...); a method of ours with the same name is shadowed by the instance property and fails only in a browser:
  // this.sound is not a function (8-GEN found it in Chrome). A stand-in on Campaign.prototype cannot see it, so the names are held apart here.
  const PHASER = ['sys', 'game', 'anims', 'cache', 'registry', 'sound', 'textures', 'events', 'cameras', 'add', 'make', 'scene', 'children', 'lights', 'data', 'input', 'load', 'time', 'tweens', 'physics', 'matter', 'scale', 'plugins', 'renderer', 'facebook'];
  const mine = J('Object.getOwnPropertyNames(Campaign.prototype)').filter(k => k !== 'constructor');
  check('no method of the Campaign scene has the name of a property Phaser puts on every scene (sound, add, cameras, input, time, tweens ...)', !mine.some(k => PHASER.includes(k)), mine.filter(k => PHASER.includes(k)).join());
  check('the battle\'s rate-limited sound is battleSound, and the scene calls nothing named this.sound', mine.includes('battleSound') && !/this\.sound\b/.test(src('src/campaignscene.js')));
  const own = J('Object.getOwnPropertyNames(Title.prototype).concat(Object.getOwnPropertyNames(Pause.prototype))').filter(k => k !== 'constructor');
  check('and the same for the Title and the Pause scenes, which this branch\'s neighbours added methods to', !own.some(k => PHASER.includes(k)), own.filter(k => PHASER.includes(k)).join());
}

// ---------- ALL. the rules every one of them keeps ----------
console.log('ALL. the rules');
{
  const ALLN = J('Object.keys(SFX_BUILT)'), NEW = ALLN.filter(k => !J(`!!SFX_BUILT['${k}'].loop`)); // the one-shot sounds; the loops (the hum) have their own section
  check('every sound of the Campaign has its words in the table of what it is made of, with its group, and a one-shot is a sound that exists', ALLN.length >= 1 && NEW.every(k => J(`!!SFX['${k}']`)) && ALLN.every(k => J(`SFX_BUILT['${k}'].says.length`) > 40 && /^(turrets|hum|missiles|blasts)$/.test(J(`SFX_BUILT['${k}'].group`))), ALLN.join());
  check('each draws on the pool and makes no node of its own, and nothing it schedules is not a number', NEW.every(k => { const r = R(k, 3); return r.nodes === 0 && r.finite && r.voices >= 1; }));
  check('each has its share of the reverb in SOUND.send (not left to the default)', NEW.every(k => J(`SOUND.send['${k}'] !== undefined`)));
  check('muted, or volume 0, or the effects at 0: no sound is made at all (no context, no pool)', NEW.every(k => { g.run(`__reset(true, 1); sfx('${k}', 2)`); const a = J('__made') === 0 && J('AUD.pool') === null; g.run(`__reset(false, 0); sfx('${k}', 2)`); const b = J('__made') === 0 && J('AUD.pool') === null; g.run(`__reset(false, 1, 0); sfx('${k}', 2)`); return a && b && J('__made') === 0; }));
  check('the effects volume of Settings > Sound scales every one (half the volume, half the level)', NEW.every(k => { const full = J(`(__reset(false, 1, 1), __render('${k}', 2).peak)`), half = J(`(__render('${k}', 2, () => { FX.vol = 0.5; }).peak)`); return Math.abs(half / full - 0.5) < 0.02; }));
  check('the master volume and M are the master gain, as for every effect: nothing here sets the master', !/AUD\.master\.gain\.(value|setTarget)[^\n]*campaign|SFX_BUILT[^\n]*master/i.test(src('src/audio.js')));
  const KILL = R('boom').peak;
  check('no sound of the Campaign is louder than the game\'s own kill (' + KILL.toFixed(2) + ' added up), and the ship\'s voice is not scaled by the effects volume, so the voice stays above them (it is on the master, not on FX.vol)', NEW.every(k => R(k, 3).peak <= KILL + 1e-9) && !/FX\./.test(src('src/voice.js')) && !/FX\.vol/.test(src('src/shipcomputer.js')));
}

console.log(failed ? `\nCAMPSOUNDS FAIL (${failed} of ${n})` : `\nCAMPSOUNDS PASS (${n})`);
process.exitCode = failed ? 1 : 0;

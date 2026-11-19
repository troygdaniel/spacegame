// smoke: the Effects volume and the mix under the music: one scale for every game sound but the voice and the music, the drone and the effects ease off while music plays (plain Node, no Chrome)
// Card space-game-music (src/audio.js FX, src/music.js, src/settings.js). Troy heard the first slice: "music is OK, I can't hear it over the sound effects".
// The space drone sits in the music's own low band and the engine hum under it, and the music was 30% of a bus at 0.4. Now:
//   the music     its default is 70% of a bus at 0.6 (the worst instant is still under the cap, tests/music.mjs)
//   the mix       while the music plays the effects are 0.75 and the pads (the drone) 0.45 of what they were; both come back when it stops
//   the Effects   a volume of its own, in tenths, kept in this browser: it scales what each effect, click, engine hum, thruster hiss, cruise hum and pad is
//   volume        given when it is scheduled (so its share of the reverb follows), under the master volume and M; not the ship's voice, not the music
// At Effects 100% and no music nothing changes: every level in tests/sfxlevels.mjs and tests/audiolevels.mjs (Chrome, overnight) is as it was.
// A stand-in AudioContext records every automation. Run: node tests/fxmix.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

g.run(`
  function __fake() {
    const made = { osc: 0, gain: 0, filter: 0, source: 0, buffer: 0, convolver: 0, compressor: 0, panner: 0 }, nodes = [];
    const param = v => { const p = { value: v, ev: [] };
      p.setValueAtTime = (x, t) => { p.ev.push(['set', x, t]); return p; }; p.linearRampToValueAtTime = (x, t) => { p.ev.push(['lin', x, t]); return p; };
      p.exponentialRampToValueAtTime = (x, t) => { p.ev.push(['exp', x, t]); return p; }; p.setTargetAtTime = (x, t, tc) => { p.ev.push(['target', x, t, tc]); return p; };
      p.cancelScheduledValues = t => { p.ev = p.ev.filter(e => e[2] < t); return p; };
      return p; };
    const node = (kind, extra) => { made[kind]++; const o = Object.assign({ kind, to: [], connect(d) { o.to.push(d); return d; }, disconnect() { o.to = []; }, start(t) { o.startAt = t; }, stop(t) { o.stopAt = t; } }, extra); nodes.push(o); return o; };
    const ac = { sampleRate: 8000, currentTime: 10, state: 'running', destination: { kind: 'destination' }, made, nodes, resume() {},
      createOscillator: () => node('osc', { type: 'sine', frequency: param(440) }), createGain: () => node('gain', { gain: param(1) }),
      createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }), createStereoPanner: () => node('panner', { pan: param(0) }),
      createBufferSource: () => node('source', { buffer: null, loop: false }), createConvolver: () => node('convolver', { buffer: null }), createDynamicsCompressor: () => node('compressor', {}),
      createBuffer: (ch, len, rate) => { made.buffer++; const data = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: c => data[c] }; } };
    return ac;
  }
  var __made = 0, __ac = null; window.AudioContext = function () { __made++; return (__ac = __fake()); }; window.webkitAudioContext = undefined;
  function __reset(o) {
    o = o || {}; AC = null; __ac = null; __made = 0; MUS.bus = null; MUS.scene = null; stopCruiseHum(); AUD.eng = null;
    Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, rev: null, pool: null, sendNow: undefined, gesture: true, ducked: false });
    G.muted = !!o.muted; G.volume = 1; FX.vol = o.fx === undefined ? 1 : o.fx; if (o.music) MUS.bus = { fake: true };
  }
  // the loudest level any pool voice was given by the effect just played (the highest value its gain is set or ramped to)
  function __peak() { let m = 0; AUD.pool.tones.concat(AUD.pool.noises).forEach(v => v.g.gain.ev.forEach(e => { if ((e[0] === 'set' || e[0] === 'lin') && e[1] > m) m = e[1]; })); return m; }
`);
const peakOf = (opts, play) => { g.run(`__reset(${JSON.stringify(opts)}); ${play}`); return J('__peak()'); };

console.log('the Effects volume: its own scale, kept in this browser');
{
  const peek = (st, e) => JSON.parse(nodeGame({ store: st }).run(`JSON.stringify(${e})`));
  const store = new Map();
  check('first run: effects at 100%, no music playing: the scale is exactly 1, so nothing sounds different', peek(store, '[FX.vol, fxScale(), padScale("space"), padScale("station")]').join() === '1,1,1,1');
  const g2 = nodeGame({ store }); g2.run('fxSetVol(0.4)');
  check('set to 40% it is kept (localStorage) and comes back on a reload; the save has no such field', peek(store, 'FX.vol') === 0.4 && !/\bfx\b|FX\./.test(read('src/meta.js')));
  store.set('longhaul.fx.vol', 'loud'); check('a stored value that is not a number is ignored: 100%', peek(store, 'FX.vol') === 1);
  store.set('longhaul.fx.vol', '7'); check('one out of range is clamped to 100%', peek(store, 'FX.vol') === 1);
  g.run('fxSetVol(0.34)'); check('in tenths: 0.34 is 0.3', J('FX.vol') === 0.3);
  g.run('fxSetVol(-3)'); check('never under 0', J('FX.vol') === 0);
  g.run('fxSetVol(1)');
}

console.log('the mix under the music: the effects 0.75, the pads 0.45, and back');
{
  check('the numbers: a little for the effects (0.75), more for the drone that shares the music\'s band (0.45), the drone under the effects', J('FX.under.effects') === 0.75 && J('FX.under.pad') === 0.45 && J('FX.under.pad') < J('FX.under.effects'));
  g.run('__reset({})');
  check('no music playing: effect scale 1, space drone 1, planet wind 0.06, station hum 1', J('fxScale()') === 1 && J('padScale("space")') === 1 && J('padScale("wind")') === 0.06 && J('padScale("station")') === 1);
  g.run('__reset({ music: true })');
  check('music playing: effects 0.75, drone 0.45, wind 0.06 x 0.45', J('fxScale()') === 0.75 && J('padScale("space")') === 0.45 && near(J('padScale("wind")'), 0.06 * 0.45));
  g.run('__reset({ music: true, fx: 0.5 })');
  check('and under the Effects volume: 50% of those', near(J('fxScale()'), 0.375) && near(J('padScale("space")'), 0.225));
  check('what the music gained: its bus is at 0.42 by default (0.12 before), 3.5 times as much; the drone it shares a band with is under half, the effects under four fifths; together the music is about 18 dB further up from the drone, 13 dB from the effects',
    J('MUSIC.level * MUSIC.vol') >= 0.4 && J('MUSIC.level * MUSIC.vol') / 0.12 >= 3.4 && J('FX.under.pad') <= 0.5 && J('FX.under.effects') <= 0.8
    && 20 * Math.log10(J('MUSIC.level * MUSIC.vol') / 0.12 / J('FX.under.pad')) >= 17 && 20 * Math.log10(J('MUSIC.level * MUSIC.vol') / 0.12 / J('FX.under.effects')) >= 12);
}

console.log('every effect is given its level times the scale when it is scheduled');
{
  const base = peekBase();
  function peekBase() { return { laser: peakOf({}, `sfx('laser')`), charge: peakOf({}, `sfx('hyperCharge')`), beep: peakOf({}, `beep(440, 0.08, 'square', 0.03, 0)`), boom: peakOf({}, `sfx('boom')`) }; }
  check('at 100% with no music the loudest voice of a laser is its own 0.05, a beep 0.03, a hyper charge its own 0.032 (a burst), a kill 0.22: as before', near(base.laser, 0.05) && near(base.beep, 0.03) && near(base.charge, 0.032) && near(base.boom, 0.22), JSON.stringify(base));
  const half = { laser: peakOf({ fx: 0.5 }, `sfx('laser')`), charge: peakOf({ fx: 0.5 }, `sfx('hyperCharge')`), beep: peakOf({ fx: 0.5 }, `beep(440, 0.08, 'square', 0.03, 0)`), boom: peakOf({ fx: 0.5 }, `sfx('boom')`) };
  check('Effects at 50%: a tone, a burst, a swell and a beep are all half (tone() burst() and swell() scale what they are given)', Object.keys(base).every(k => near(half[k], base[k] * 0.5)), JSON.stringify(half));
  const under = { laser: peakOf({ music: true }, `sfx('laser')`), charge: peakOf({ music: true }, `sfx('hyperCharge')`), boom: peakOf({ music: true }, `sfx('boom')`) };
  check('with the music playing: three quarters of that', ['laser', 'charge', 'boom'].every(k => near(under[k], base[k] * 0.75)), JSON.stringify(under));
  const both = peakOf({ music: true, fx: 0.5 }, `sfx('laser')`);
  check('both: 0.5 x 0.75 of the laser', near(both, base.laser * 0.375));
  g.run(`__reset({ fx: 0 }); sfx('laser'); sfx('boom'); beep(440, 0.08, 'square', 0.03, 0);`);
  check('Effects at 0: sfx() and beep() make nothing at all, not even the audio context', J('__ac') === null && J('AUD.pool') === null);
  g.run(`__reset({ fx: 0.5 }); const __v = new Set(); for (let i = 0; i < 50; i++) { __ac = __ac || null; sfx('laser'); } `);
  check('the voice pool is unchanged: no more nodes than before (the scale is a number, not a node)', J('__ac.nodes.length') === J('(() => { __reset({ fx: 1 }); sfx("laser"); for (let i = 0; i < 49; i++) sfx("laser"); return __ac.nodes.length; })()'));
  check('the ship\'s voice and the music do not read the Effects volume (voice.js plays through the master gain, music.js through its own bus)', !/FX\.|fxScale/.test(read('src/voice.js')) && !/FX\.vol|fxScale|padScale/.test(read('src/music.js')));
}

console.log('the pad, the engine and the cruise hum');
{
  g.run(`__reset({}); startAmbient('space');`);
  const tgt = () => J(`AUD.amb.out.gain.ev.filter(e => e[0] === 'target').pop()[1]`);
  check('the space drone starts at its own level, 1, with no music and Effects at 100%', near(tgt(), 1));
  g.run(`MUS.bus = { fake: true }; syncMaster();`);
  check('the music starts (MUS.bus): within a tick of syncMaster the drone is eased to 0.45, slowly (a time constant of 0.8 s)', near(tgt(), 0.45) && J(`AUD.amb.out.gain.ev.filter(e => e[0] === 'target').pop()[3]`) === 0.8);
  g.run(`const __n = AUD.amb.out.gain.ev.length; syncMaster(); syncMaster(); window.__same = AUD.amb.out.gain.ev.length === __n;`);
  check('and syncMaster, every 100 ms, does not touch it again while nothing changes', J('__same'));
  g.run(`AUD.ducked = true; duck(true); `);
  check('the pause duck still takes it to 30% of that', near(tgt(), 0.45 * 0.3), tgt());
  g.run(`duck(false); MUS.bus = null; syncMaster();`);
  check('the music ends: the drone is back to 1', near(tgt(), 1));
  g.run(`fxSetVol(0.5); syncMaster();`);
  check('Effects moved to 50% while it plays: the drone follows within a tick (0.5), no restart', near(tgt(), 0.5));
  g.run(`__reset({}); startAmbient('wind');`);
  check('the planet wind keeps its own 0.06 level under the scale (the surface has no music in this slice)', near(tgt(), 0.06));

  const engine = (opts) => {
    g.run(`__reset(${JSON.stringify(opts)}); (() => { let h = null; const sc = { dead: false, boosting: false, ship: { body: { acceleration: { length: () => 1 }, speed: 400 } }, events: { on: (e, f) => { h = f; }, off() {} } };
      startEngine(sc); window.__tick = () => { h(1e9 + (window.__k = (window.__k || 0) + 1e6)); }; })();`);
    g.run(`__tick();`);
    return J(`AUD.eng.out.gain.ev.filter(e => e[0] === 'target').pop()[1]`);
  };
  const e1 = engine({}), e2 = engine({ fx: 0.5 }), e3 = engine({ music: true });
  check('the engine hum is its level (0.55 x 0.2 at cruise thrust) times the scale: 1, 0.5 and 0.75', near(e1, 0.55 * 0.2) && near(e2, e1 * 0.5) && near(e3, e1 * 0.75), [e1, e2, e3].join(' '));
  g.run(`__reset({ fx: 0.5 }); startCruiseHum();`);
  check('the cruise hum ramps to 0.024 times the scale', near(J(`AUD.cru.out.gain.ev.filter(e => e[0] === 'lin').pop()[1]`), 0.012));
}

console.log('Settings > Sound: the Effects row beside the Music row');
{
  g.run(`
    window.__draw = (() => {
      const P = new Proxy(function () {}, { get: (_, k) => (k === 'width' ? 20 : P), apply: () => P });
      const rec = { txt: [], label: [], buttons: [] };
      const fake = { bx: -304, by: -262, bw: 840, slots: {}, body: { add() {} }, add: { graphics: () => P, rectangle: () => P }, inputs: {},
        label: (x, y, s) => { rec.label.push({ x, y, s }); }, line: () => {}, say: () => {}, railDraw() {}, tagDraw() {},
        txt: (x, y, s, size) => { const t = { x, y, s, size, set: v => { t.s = v; return t; }, setText: v => { t.s = v; return t; }, setColor: () => t }; rec.txt.push(t); return t; },
        button: (x, y, w, l, fn) => { const b = { x, y, w, l, fn, set: v => { b.l = v; return b; }, color: () => b, mark: () => b }; rec.buttons.push(b); return b; },
        toggleMute() {}, stepVoice() {}, hearVoice() {}, adjustVolume() {}, setVolume() {},
        adjustMusic(d) { return Settings.prototype.adjustMusic.call(fake, d); }, adjustFx(d) { return Settings.prototype.adjustFx.call(fake, d); }, soundRefresh() { return Settings.prototype.soundRefresh.call(fake); } };
      Settings.prototype.draw_sound.call(fake);
      return { fake, rec };
    })();
  `);
  const L = J(`(() => { const { rec } = __draw, lab = s => rec.label.find(l => l.s === s), btn = rec.buttons; const mu = btn.find(b => /^Music/.test(b.l)), sound = btn.find(b => /^Sound/.test(b.l));
    const row = btn.filter(b => (b.l === '-' || b.l === '+') && b.y === mu.y);
    return { labels: ['SOUND', 'MUSIC', 'EFFECTS'].map(s => lab(s) && lab(s).y), lx: ['SOUND', 'MUSIC', 'EFFECTS'].map(s => lab(s) && lab(s).x), btnY: [sound.y, mu.y, ...row.map(b => b.y)],
      pct: rec.txt.filter(t => /^\\d+%$/.test(t.s) && t.y === mu.y).map(t => ({ s: t.s, x: t.x, y: t.y })), minus: btn.filter(b => b.l === '-').map(b => b.x), plus: btn.filter(b => b.l === '+').map(b => b.x), rowMinus: row.filter(b => b.l === '-').map(b => b.x), rowPlus: row.filter(b => b.l === '+').map(b => b.x), rowN: row.length }; })()`);
  check('SOUND, MUSIC and EFFECTS are labels of one row (the same y), left to right, and every control of the row is at the same height (four small buttons, two percentages)', L.labels.every(y => y === L.labels[0]) && L.lx[0] < L.lx[1] && L.lx[1] < L.lx[2] && L.btnY.every(y => y === L.btnY[0]) && L.rowN === 4 && L.pct.length === 2, JSON.stringify(L));
  check('the Effects - and + sit to the right of the Music + and its percentage, inside the body (under 840 px), with room between the groups', L.minus.length === 3 && L.plus.length === 3 && L.rowMinus[1] > L.rowPlus[0] + 32 && L.rowPlus[1] + 32 - (-304) < 840 && L.pct.length === 2, JSON.stringify(L));
  g.run(`FX.vol = 1; (() => { const { rec } = __draw; rec.buttons.filter(b => b.l === '-')[2].fn(); })()`);
  check('the Effects - takes a tenth off the Effects volume and nothing else (not the master volume, not the music)', J('FX.vol') === 0.9 && J('G.volume') === 1 && J('MUSIC.vol') === 0.7, J('FX.vol'));
  g.run(`(() => { const { rec } = __draw; rec.buttons.filter(b => b.l === '+')[2].fn(); rec.buttons.filter(b => b.l === '+')[2].fn(); })()`);
  check('the + puts it back and stops at 100%', J('FX.vol') === 1);
  g.run(`FX.vol = 0.1; (() => { const { rec } = __draw; rec.buttons.filter(b => b.l === '-')[2].fn(); rec.buttons.filter(b => b.l === '-')[2].fn(); })()`);
  check('and stops at 0%', J('FX.vol') === 0);
  check('the percentage beside it says so, and the row is redrawn after a press', J(`__draw.rec.txt.some(t => t.s === '0%')`));
  g.run('fxSetVol(1)');
  const ys = J(`(() => { const { rec, fake } = __draw; return Math.max(...rec.txt.map(t => t.y), ...rec.buttons.map(b => b.y), ...rec.label.map(l => l.y)) - fake.by; })()`);
  check(`every row of Sound is still on the panel: the lowest is ${ys} px under the body's top (the hint line is at 560, the panel ends at 582)`, ys <= 520, ys);
  const ui = read('content/text/ui.md'), line = (ui.match(/^\| music\.use \| (.*) \|$/m) || [])[1];
  check('the sentence under the row, content/text/ui.md\'s music.use, says what Effects is and that the drone and effects ease off, and it is the same words as the code\'s default', !!line && /Effects is the engine, the drone and every shot and click/.test(line) && /ease off a little while music plays/.test(line) && J(`uiText('music.use')`) === line && J(`UI_TEXT['music.use']`) === line && line.length <= 200, line && line.length);
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));
console.log(failed ? `\nFXMIX FAIL (${failed} of ${n})` : `\nFXMIX PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

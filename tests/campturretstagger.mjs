// smoke: the Campaign turrets fire on slots of their own, so the fire is continuous and not one volley; same shots a second; a flash and a rate-limited blip per shot (plain Node, no Chrome)
// Card space-game-campaign-turret-stagger. The eight turrets used to go off on one beat once Space was pressed: each one's next shot was "now plus the delay", so all eight, which had
// their first shot on the same tick, kept the same beat for ever. Now each turret has a slot of its own (CAMP.carrier.stagger: a turret is i/8 of a cycle behind the one before it, and
// jitter moves it a little, from a stream of its own); a slot it cannot use (no Space, nothing in reach) is let go, so nothing bursts when Space is pressed.
//   A. the spread: shots are spread over the cycle, not on one tick, with even gaps and every turret once a cycle
//   B. the same total: shots a second and damage a second are what they were (eight per pdDelay)
//   C. the switch: stagger 0 is the volley, and the test sees it
//   D. pressing Space, and an alien coming into reach, in the middle of a cycle: no burst, no catch-up
//   E. the jitter: a stream of its own, the same for the same seed, never the game's dice
//   F. the sound and the flash: an event for each shot; the scene flashes each muzzle and blips quietly, at most once in a short while
//   G. nothing else moved: Space held to fire, the lead, the numbers
// Run: node tests/campturretstagger.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a battle with a standing gunship (a lot of hit points) in reach, the carrier holding Space from `from` seconds, every shot noted as [time in ms, turret] from its event
g.run(`
  window.__fire = (secs, opts) => {
    opts = opts || {}; window.C = campNew(1, [], { seed: opts.seed == null ? 1 : opts.seed, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12;
    const c = C.carrier; let u = null;
    const foe = () => { u = campSpawn(C, 'gunship', c.x + 300, c.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 90000; return u; };
    if (!opts.foeAt) foe();
    const shots = []; let held = false;
    for (let i = 0; i < secs * 30 + 20; i++) { // and two thirds of a second more, with Space up, for the shots in the air to land
      const t = i / 30;
      if (opts.foeAt != null && !u && t >= opts.foeAt) foe();
      held = t < secs && (opts.press ? opts.press.some(p => t >= p[0] && t < p[1]) : t >= (opts.from || 0));
      C.input.fire = held; campStep(C, 1 / 30);
      C.events.forEach(e => { if (e.type === 'turret') shots.push([Math.round(C.t), e.i]); }); C.events.length = 0;
    }
    return { shots, hp: u ? Math.round(u.hp) : 0 };
  };
`);
const perTick = shots => { const m = {}; shots.forEach(s => { m[s[0]] = (m[s[0]] || 0) + 1; }); return Math.max(0, ...Object.values(m)); };
const gaps = shots => shots.slice(1).map((s, i) => s[0] - shots[i][0]);
const win = (shots, ms) => { let best = 0; for (let i = 0; i < shots.length; i++) { let c = 0; for (let j = i; j < shots.length && shots[j][0] - shots[i][0] < ms; j++) c++; best = Math.max(best, c); } return best; };

// ---------- A. the spread ----------
console.log('A. the shots are spread over the cycle');
{
  const r = J(`__fire(7.7)`), sh = r.shots, per = J('CAMP.carrier.pdDelay'), nT = J('CAMP.carrier.mounts.length'), sp = per / nT, gp = gaps(sh);
  check('eight shots per cycle from a standing start: 7.7 seconds are eleven cycles of 700 ms, 88 shots, give or take three', Math.abs(sh.length - 88) <= 3, sh.length);
  check('never more than two shots in one tick (a volley is eight)', perTick(sh) <= 2, perTick(sh));
  check('the gaps between shots are even: about pdDelay over eight (87.5 ms) on average, none longer than 180 ms (a fire that is not a volley and a pause)', Math.abs(gp.reduce((a, b) => a + b, 0) / gp.length - sp) < 6 && Math.max(...gp) <= 180, JSON.stringify([Math.round(gp.reduce((a, b) => a + b, 0) / gp.length), Math.max(...gp)]));
  check('in any 100 ms of the fire there are one or two shots, never a bunch', win(sh, 100) <= 2, win(sh, 100));
  const byT = Array.from({ length: nT }, (_, i) => sh.filter(s => s[1] === i));
  check('every turret fires once a cycle: eleven shots in 7.7 seconds, give or take one', byT.every(a => a.length >= 10 && a.length <= 12), byT.map(a => a.length).join());
  const ph = byT.map(a => { const x = a.map(s => s[0] % per); return x.reduce((p, q) => p + q, 0) / x.length; });
  check('each is a turret\'s own beat: the turrets fall behind one another by about a cycle over eight, in order', ph.every((p, i) => Math.abs(p - ph[0] - i * sp) < 15), ph.map(p => Math.round(p)).join());
}

// ---------- B. the same total ----------
console.log('B. the same shots and the same damage a second');
{
  g.run('CAMP.carrier.stagger = 1; CAMP.carrier.jitter = 12');
  const a = J(`__fire(7)`);
  g.run('CAMP.carrier.stagger = 0; CAMP.carrier.jitter = 0');
  const b = J(`__fire(7)`);
  g.run('CAMP.carrier.stagger = 1; CAMP.carrier.jitter = 12');
  const want = 8 * 7000 / J('CAMP.carrier.pdDelay'), dmg = x => 90000 - x.hp;
  check('seven seconds of Space held: the staggered fire and the old volley fire within two shots of each other, and of eight a cycle', Math.abs(a.shots.length - b.shots.length) <= 2 && Math.abs(a.shots.length - want) <= 4, JSON.stringify([a.shots.length, b.shots.length, want]));
  check('and the damage they do is the same, to within one shot in flight (4 hit points) and a shot at the end: the balance of the Campaign does not move', Math.abs(dmg(a) - dmg(b)) <= 3 * J('CAMP.carrier.pd') + 1, JSON.stringify([dmg(a), dmg(b)]));
  const hz = J(`__fire(7.7)`);
  check('so the shots a second are 8 over pdDelay (11.4)', Math.abs(hz.shots.length / 7.7 - 8 / (J('CAMP.carrier.pdDelay') / 1000)) < 0.5, hz.shots.length / 7.7);
}

// ---------- C. the switch ----------
console.log('C. stagger 0 is the old volley');
{
  g.run('CAMP.carrier.stagger = 0; CAMP.carrier.jitter = 0');
  const v = J(`__fire(3)`);
  g.run('CAMP.carrier.stagger = 1; CAMP.carrier.jitter = 12');
  check('with the stagger off all eight turrets fire in the same tick (the volley), once a cycle: the test can tell the difference', perTick(v.shots) === 8 && v.shots.length >= 32, JSON.stringify([perTick(v.shots), v.shots.length]));
  check('the switch and the jitter are in the one table with their comments', J('CAMP.carrier.stagger') === 1 && J('CAMP.carrier.jitter') === 12 && /stagger: 1, +\/\/ 1: each turret fires on a slot of its own/.test(src('src/campaign.js')) && /jitter: 12, +\/\/ ms: how far a turret's slot is moved at random/.test(src('src/campaign.js')));
  check('the jitter is under half the spacing, so a turret never passes the next (12 ms of 44)', J('CAMP.carrier.jitter') < J('CAMP.carrier.pdDelay') / J('CAMP.carrier.mounts.length') / 2);
}

// ---------- D. in the middle of a cycle ----------
console.log('D. Space pressed, or an alien coming into reach, in the middle of a cycle');
{
  const r = J(`__fire(6, { from: 2.345 })`), sh = r.shots, first = sh[0][0], eight = sh[7][0] - sh[0][0];
  check('Space pressed at 2.345 s: the first shot comes within a turret\'s spacing (about 90 ms) and the first eight take most of a cycle (not one tick)', first - 2345 <= 130 && eight >= 450 && eight <= 700, JSON.stringify([first - 2345, eight]));
  check('there is no catch-up: no more than two shots in a tick and in 100 ms from the press on', perTick(sh) <= 2 && win(sh, 100) <= 2);
  const r2 = J(`__fire(6, { foeAt: 2.1, from: 0 })`), s2 = r2.shots;
  check('an alien coming into reach at 2.1 s while Space is held: the first eight shots at it are spread over most of a cycle, not a burst (slots passed with nothing to shoot at are let go)', s2.length >= 40 && s2[0][0] >= 2100 && s2[7][0] - s2[0][0] >= 450 && perTick(s2) <= 2, JSON.stringify([s2[0][0], s2[7][0] - s2[0][0], perTick(s2)]));
  const r3 = J(`__fire(8, { press: [[0.5, 1.0], [1.2, 1.4], [2.0, 2.05], [2.5, 4.0], [4.3, 8]] })`);
  check('Space let go and pressed again, again and again: never a burst, never more than two shots in 100 ms', win(r3.shots, 100) <= 2 && perTick(r3.shots) <= 2, JSON.stringify([win(r3.shots, 100), perTick(r3.shots)]));
  const none = J(`__fire(4, { from: 99 })`);
  check('Space never pressed: not one shot, though every turret\'s slot comes round', none.shots.length === 0);
}

// ---------- E. the jitter ----------
console.log('E. the jitter has a stream of its own');
{
  const a = J(`__fire(4, { seed: 5 })`).shots, b = J(`__fire(4, { seed: 5 })`).shots, c = J(`__fire(4, { seed: 6 })`).shots;
  check('the same seed fires at the same times, shot for shot', JSON.stringify(a) === JSON.stringify(b));
  check('another seed jitters differently (the shots move by a few milliseconds)', JSON.stringify(a) !== JSON.stringify(c) && a.length === c.length);
  const code = src('src/campaign.js'), body = code.slice(code.indexOf('function campTurretAt'), code.indexOf('const campDrift'));
  check('the turrets\' jitter never takes a number from the game\'s own dice (C.rng): their stream is C.turretRng', /C\.turretRng\(\)/.test(body) && !/C\.rng\b/.test(body) && /turretRng: |C\.turretRng = campRng/.test(code));
  g.run('__fire(2, { from: 0 }); window.__r1 = C.rng(); __fire(2, { from: 99 }); window.__r2 = C.rng()');
  check('and so Space held or not leaves the dice where they were (the next number is the same)', J('__r1') === J('__r2'));
}

// ---------- F. the sound and the flash ----------
console.log('F. a flash per shot, a quiet rate-limited blip');
{
  const ev = J(`(() => { __fire(2, { from: 0 }); window.C2 = C; return 1; })()`);
  g.run(`window.__ev = []; window.C = campNew(1, [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; const u = campSpawn(C, 'gunship', C.carrier.x + 300, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 90000; C.input.fire = true; window.__bul = 0; for (let i = 0; i < 90; i++) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'turret') __ev.push(e); }); __bul = __bul; C.events.length = 0; }`);
  const evs = J('__ev');
  check('the sim says each shot with an event of its own: the turret, where it is, the way it points', evs.length >= 30 && evs.every(e => Number.isInteger(e.i) && e.i >= 0 && e.i < 8 && Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.aim)), evs.length);
  check('one event for each shot, no event for a volley: eight turrets, many events, no old "gun" event', !/type: 'gun'/.test(src('src/campaign.js')) && !/e\.type === 'gun'/.test(src('src/campaignscene.js')));
  g.run(`
    window.__beeps = []; window.__beep0 = beep; beep = function (f, d, t, v, s) { __beeps.push({ f, d, t, v, s }); };
    window.__fake = () => { const rec = () => { const log = []; const p = new Proxy({}, { get: (t, k) => (k === 'log' ? log : (...a) => { log.push([k, ...a]); return p; }) }); return p; };
      const f = Object.create(Campaign.prototype); f.add = rec(); f.tweens = { added: [], add(o) { this.added.push(o); } }; f.blipAt = undefined; return f; };
    window.F = __fake(); window.C = campNew(1, [], { seed: 1 }); F.camp = C;
  `);
  g.run('for (let i = 0; i < 8; i++) { C.t = 1000 + i * 4; F.onEvent({ type: "turret", i, x: 10 * i, y: 5, aim: 0.5 }); }');
  check('eight turrets firing within 30 ms make one blip, not eight (the blip is rate limited to one in 70 ms of the battle\'s clock)', J('__beeps.length') === 1, J('__beeps.length'));
  g.run('__beeps.length = 0; F.blipAt = undefined; for (let i = 0; i < 8; i++) { C.t = 5000 + i * 88; F.onEvent({ type: "turret", i, x: 10 * i, y: 5, aim: 0.5 }); }');
  check('shots 88 ms apart, as the stagger makes them, each get their blip: a rattle', J('__beeps.length') === 8, J('__beeps.length'));
  const bp = J('__beeps');
  check('the blip is quiet (loudness 0.012, at most 0.02) and short (about 35 ms), and its pitch differs from turret to turret, so it rattles and does not drone', bp.every(b => b.v <= 0.02 && b.d <= 0.05) && new Set(bp.map(b => b.f)).size === 4, JSON.stringify(bp.slice(0, 5).map(b => b.f)));
  g.run('F.add.log.length = 0; F.tweens.added.length = 0; F.blipAt = undefined; for (let i = 0; i < 8; i++) { C.t = 9000; F.onEvent({ type: "turret", i, x: 10 * i, y: 5, aim: 0 }); }');
  check('a muzzle flash for each shot, even when the blip is held back: eight flashes (an additive spark at the barrel tip, 14 px along the aim) that fade out in 90 ms', J('F.add.log.filter(l => l[0] === "image").length') === 8 && J('F.tweens.added.length') === 8 && J('F.tweens.added.every(t => t.duration === CAMP_BLIP.flash && t.alpha === 0)') && Math.abs(J('F.add.log.filter(l => l[0] === "image")[3][1]') - (30 + 14)) < 1e-6);
  g.run('beep = __beep0');
  const sc = src('src/campaignscene.js');
  check('the numbers of the sound are one table in the scene (CAMP_BLIP), and the turrets no longer use the loud laser', /const CAMP_BLIP = \{ gap: 70, flash: 90/.test(sc) && !/sfx\('laser'\)/.test(sc));
}

// ---------- G. nothing else moved ----------
console.log('G. nothing else moved');
{
  g.run('CAMP.carrier.stagger = 1; CAMP.carrier.jitter = 12');
  check('the numbers: 4 a shot, every 0.7 s a turret, out to 500 px, lead on, eight turrets', J('CAMP.carrier.pd') === 4 && J('CAMP.carrier.pdDelay') === 700 && J('CAMP.carrier.pdRange') === 500 && J('CAMP.carrier.lead') === 1 && J('CAMP.carrier.mounts.length') === 8);
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPTURRETSTAGGER FAIL (${failed} of ${n})` : `\nCAMPTURRETSTAGGER PASS (${n})`);
process.exitCode = failed ? 1 : 0;

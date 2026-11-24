// Measure the Campaign's speed and memory (card space-game-night-performance; docs/night/performance.md has the numbers and what they led to).
//   node --expose-gc --max-semi-space-size=128 tools/perfcampaign.mjs sim [busy1|busy3|calm1] [ticks]
//        NO CHROME. The Campaign's own game (src/campaign.js, plain numbers) in Node: time of a step and the memory it allocates, and a CPU profile by function.
//   node tools/perfcampaign.mjs frames  [busy1|busy3|natural1]     CHROME. 600 stepped frames of the scene: time of a frame split into the sim, the sprites (sync), the HUD, the backdrop
//                                                                  and the drawing, object counts, the heap
//   node tools/perfcampaign.mjs alloc   [busy1|busy3|natural1]     CHROME. where 600 frames allocate (a sampling heap profile)
//   node tools/perfcampaign.mjs profile [busy1|busy3|natural1]     CHROME. CPU profile of 600 frames, self time by function
//   node tools/perfcampaign.mjs map     [busy1|busy3]              CHROME. the same frames with the map (Tab) open
//   node tools/perfcampaign.mjs live [busy1|busy3|natural1] [seconds]  CHROME. the REAL loop for some seconds (not stepped): the gaps between drawn frames in the fight
//   node tools/perfcampaign.mjs fill [busy1|busy3] [seconds each]  CHROME. WHERE the drawing time goes (use LONGHAUL_GL=software): the real loop with one kind of thing hidden at a time
//   node tools/perfcampaign.mjs soak [game minutes] [busy1|natural1]  CHROME. a long session in 1-minute steps of game time: heap after a collection, nodes, listeners, textures, sprites
//   node tools/perfcampaign.mjs restart [n]                         CHROME. start a level n times in a row: what is left behind each time
//   node tools/perfcampaign.mjs planetstart [level]                CHROME. the planets at a level's start (card space-game-cloud-followups): the Campaign scene's create() with no planet painted yet (a retry, an address) and after the ready
//                                                                  room has been open a few seconds (it paints them one a tick, src/camphubscene.js campHubWarm): ms of create(), and how many planets were painted in it
//   node tools/perfcampaign.mjs load                                CHROME. page load to the Campaign at ?campaign=3 (median of 5)
// Scenarios: busy1 / busy3 keep a full fight going for as long as it is measured (level 1 with the mothership; level 3 with its twelve towers): the aliens are topped up to 18, the wing is
// launched and topped up, the carrier cannot die, so the numbers are the worst a level gives, not an average. natural1 is level 1 played the way a player does (launch, attack, fly).
// Output is printed, nothing is written. Chrome runs take the shared lock (tests/lock.mjs) and are headless with --mute-audio; software or GPU drawing follows LONGHAUL_GL as the tests do.
// Read a frame time as a size, not as what a player's machine does: the Mac is shared and its load moves wall-clock times (docs/PERF.md says how the ratios are kept honest: swap the code under test inside one page).
import { performance as perf } from 'node:perf_hooks';
import { Session } from 'node:inspector';
import { nodeGame, ROOT } from '../tests/nodegame.mjs';

const what = process.argv[2] || 'sim', arg = process.argv[3], arg2 = process.argv[4];
const r2 = x => Math.round(x * 100) / 100;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const stat = a => ({ med: r2(pct(a, .5)), p95: r2(pct(a, .95)), max: r2(Math.max(...a)), mean: r2(a.reduce((x, y) => x + y, 0) / a.length) });

// the fight the scenarios keep going: runs inside the game (a vm in Node, the page in Chrome). Defined as text so both get the same code.
const SCENARIO = `
  window.__fight = (level, opts) => {
    opts = opts || {};
    const techs = level === 3 ? ['shield', 'plating', 'repair'] : level === 2 ? ['shield'] : [];
    const C = window.C = campNew(level, techs, { seed: 5, god: true });
    window.__prep(C); window.__keep = !!opts.keep;
    if (opts.keep) { campOrder(C, 'launch'); window.__topup(); }
    return C;
  };
  window.__prep = C => { C.god = true; C.ships.forEach(u => { if (u.kind === 'tower') u.hp = u.maxHp = 1e9; }); window.C = C; }; // nothing in a busy fight can end the level
  window.__drive = (C, T) => { // a player: launch at 3 s, attack and escort at 14 s, fly at the nearest alien and shoot
    const sec = C.t / 1000; if (C.result) return;
    if (!T.d1 && sec > 3) { T.d1 = 1; campOrder(C, 'launch', '', 'key'); } if (!T.d2 && sec > 14) { T.d2 = 1; campOrder(C, 'attack', '', 'key'); campOrder(C, 'escort', 'mars', 'key'); }
    const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
    if (a) { const w = Math.atan2(a.y - c.y, a.x - c.x), dd = Math.atan2(Math.sin(w - c.rot), Math.cos(w - c.rot)); C.input.turn = Math.max(-1, Math.min(1, dd * 3)); C.input.thrust = campDist(a, c) > 500 ? 1 : 0; C.input.fire = Math.abs(dd) < 0.15 && campDist(a, c) < 800; }
    else { C.input.thrust = 0; C.input.fire = false; C.input.turn = 0; }
  };
  window.__topup = () => {
    const C = window.C, c = C.carrier, rnd = C.rng;
    if (campAliens(C).length < 18) { const kinds = ['raider', 'drone', 'gunship', 'raider', 'drone']; while (campAliens(C).length < 18) { const a = rnd() * 6.283, d = 450 + rnd() * 450, k = kinds[Math.floor(rnd() * kinds.length)], u = campSpawn(C, k, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d); if (!u) break; u.goal = 'carrier'; u.wave = 0; } }
    if (C.level === 1 && !C.ships.some(u => u.kind === 'mother')) { const m = campSpawn(C, 'mother', c.x + 1100, c.y - 300); m.hp = m.maxHp = 1e9; m.goal = 'earth'; m.wave = 0; }
    if (campWing(C).length < 8 && C.launchQ.length === 0) { C.bay.fighters = 8; C.bay.escorts = 4; campOrder(C, 'launch'); }
    else if (campWing(C, 'fighter').length && Math.round(C.t / 1000) % 6 === 0) campOrder(C, 'attack');
    if (typeof C.missiles === 'number' && !window.__nomissile) { C.missiles = Math.max(C.missiles, 6); campOrder(C, 'missiles', '', 'key'); } // the missile launcher (F), when this game has one: fired at every top-up, more often than a magazine and its reload allow a player
    c.hp = c.maxHp; C.input.fire = true; C.input.thrust = 0.5; C.input.turn = Math.sin(C.t / 1700) > 0 ? 1 : -1;
    C.events.length = 0; return C.ships.length;
  };
`;
const SCEN = { busy1: { level: 1, keep: true }, busy3: { level: 3, keep: true }, calm1: { level: 1, keep: false }, natural1: { level: 1, keep: false } };

// ------------------------------------------------------------------ Node: the sim alone
if (what === 'sim') {
  const k = SCEN[arg] || SCEN.busy1, ticks = Number(arg2) || 1800, DT = 1 / 60; // 1800 steps = 30 s of game time at 60 frames a second
  const g = nodeGame();
  g.run(SCENARIO);
  const C = g.run(`window.__fight(${k.level}, { keep: ${k.keep} })`);
  const tick = g.run('window.__tick = () => campStep(window.C, 1 / 60)'), topup = g.run('window.__topup');
  const warm = 120; for (let i = 0; i < warm; i++) { tick(); if (k.keep && i % 30 === 0) topup(); g.run('window.C.events.length = 0'); }
  const clear = g.run('window.__clear = () => { window.C.events.length = 0; }');
  if (typeof gc === 'function') gc();
  const times = [], ships = [], bullets = [];
  const heap0 = process.memoryUsage().heapUsed; let tt = 0;
  const sess = new Session(); sess.connect(); const post = (m, p) => new Promise((res, rej) => sess.post(m, p || {}, (e, r) => e ? rej(e) : res(r)));
  if (process.argv.includes('--profile')) { await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 100 }); await post('Profiler.start'); }
  for (let i = 0; i < ticks; i++) {
    const a = perf.now(); tick(); const d = perf.now() - a; times.push(d); tt += d;
    clear();
    if (i % 30 === 0) { if (k.keep) topup(); ships.push(g.run('window.C.ships.length')); bullets.push(g.run('window.C.bullets.length')); }
  }
  const heap1 = process.memoryUsage().heapUsed;
  console.log(`sim ${arg || 'busy1'}: ${ticks} steps of 1/60 s (${(ticks / 60).toFixed(0)} s of game time), ships ${Math.min(...ships)}..${Math.max(...ships)}, shots in the air ${Math.min(...bullets)}..${Math.max(...bullets)}`);
  console.log(`  time of one step (ms): ${JSON.stringify(stat(times))}  = ${(stat(times).mean / 16.67 * 100).toFixed(2)}% of a 16.7 ms frame; the sim is cut into 1/30 s steps, so one step a frame at 60 fps and none at all on some frames above that`);
  console.log(`  allocated: ${((heap1 - heap0) / ticks / 1024).toFixed(1)} KB a step (heapUsed delta; run with --max-semi-space-size=128 so no collection moves it; ${(heap1 - heap0) / 1048576 > 100 ? 'TOO BIG: a collection ran, read it as a floor' : 'no collection expected'})`);
  if (process.argv.includes('--profile')) {
    const { profile } = await post('Profiler.stop'), byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
    profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
    const fn = new Map(); let total = 0;
    for (const [id, us] of self) { const cf = byId.get(id).callFrame; total += us; const name = (cf.functionName || '(anon)') + ' ' + (cf.url || '').split('/').slice(-1)[0] + ':' + (cf.lineNumber + 1); fn.set(name, (fn.get(name) || 0) + us); }
    console.log(`  CPU profile (self time per step, ${(total / ticks / 1000).toFixed(3)} ms sampled in all)`);
    [...fn].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([n, us]) => console.log(`  ${(us / ticks / 1000).toFixed(4).padStart(9)} ms  ${(us / total * 100).toFixed(1).padStart(5)}%  ${n}`));
  }
  sess.disconnect();
  process.exit(0);
}

// ------------------------------------------------------------------ Chrome
const { launch, sleep } = await import('../tests/cdp.mjs');
const hashOf = k => '?campaign=' + (SCEN[k] || SCEN.busy1).level;
const SRC = process.env.PERF_ROOT || ROOT; // PERF_ROOT=<another checkout of the game>: measure that code (the tool and the scenario stay this file's), to set an old commit beside a new one

async function enter(key, opts = {}) {
  const k = SCEN[key] || SCEN.busy1, t = await launch(hashOf(key), SRC);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000, 'the Campaign is up');
    await t.send('Performance.enable');
    await t.ev(`(() => { ${SCENARIO} return 1; })()`);
    await t.clock(); await t.run(600); // settle, stepped from here on
    // out of the story card and into the battle, with the fight of the scenario (a natural run starts the level as it is)
    await t.ev(`(() => { const s = game.scene.getScene('Campaign'); s.hideCard(); s.mode = 'play'; if (${k.keep ? 'true' : 'false'}) { __prep(s.camp); window.__keep = true; campOrder(s.camp, 'launch'); window.__topup(); } return 1; })()`);
    return t;
  } catch (e) { await t.close(); throw e; }
}

// the hooks: one table of milliseconds the game spends in each part of a frame, read and cleared by the harness
const HOOKS = `(() => {
  if (window.__H) return 1;
  { const D0 = Date.now() - window.__t; Date.now = () => Math.round(D0 + window.__t); } // game time for Date.now: Phaser's tweens run on it, so with the stepped clock a 700 ms puff would otherwise outlive 40 s of game time and the display list would swell
  const H = window.__H = { sim: 0, sync: 0, hud: 0, bg: 0, map: 0, upd: 0, rend: 0, ui: 0, uiN: 0, rock: 0, rows: [] };
  const wrap = (obj, name, key) => { const f = obj[name]; obj[name] = function (...a) { const s = performance.now(); try { return f.apply(this, a); } finally { H[key] += performance.now() - s; } }; };
  const sc = game.scene.getScene('Campaign'); wrap(Campaign.prototype, 'sync', 'sync'); wrap(Campaign.prototype, 'paintHud', 'hud'); wrap(sc.sys, 'sceneUpdate', 'upd'); if (Campaign.prototype.syncRockets) wrap(Campaign.prototype, 'syncRockets', 'rock'); // Phaser copies update() into sys.sceneUpdate when the scene is made
  const g = (name, key) => { const f = window[name]; window[name] = function (...a) { const s = performance.now(); try { return f.apply(this, a); } finally { H[key] += performance.now() - s; } }; };
  g('campStep', 'sim'); g('spaceBackdropTick', 'bg'); g('campMapPaint', 'map');
  const u = window.uiText; window.uiText = function (...a) { const s = performance.now(); H.uiN++; try { return u.apply(this, a); } finally { H.ui += performance.now() - s; } };
  const R = game.renderer; for (const m of ['preRender', 'render', 'postRender']) { const f = R[m]; R[m] = function (...x) { const s = performance.now(); try { return f.apply(this, x); } finally { H.rend += performance.now() - s; } }; }
  window.__frames = n => { for (let i = 0; i < n; i++) { if (window.__storm && window.C) { const C = window.C, k = (window.__sn = (window.__sn || 0) + 1); C.carrier.hp = C.carrier.maxHp - (k % 90); if (C.earth) C.earth.shield = C.earth.max - (k % 77); } H.sim = H.sync = H.hud = H.bg = H.map = H.upd = H.rend = H.ui = H.uiN = H.rock = 0; __t += 16.67; const s = performance.now(); game.step(__t, 16.67); const tot = performance.now() - s;
      H.rows.push([tot, H.upd, H.rend, H.sim, H.sync, H.hud, H.bg, H.map, H.ui, H.uiN, H.rock]); if (window.__keep && i % 30 === 29) window.__topup(); } };
  return 1; })()`;

async function timeFrames(t, n) {
  await t.ev(HOOKS); await t.ev('(() => { __H.rows = []; return 1; })()');
  for (let left = n; left > 0; left -= 60) await t.ev(`(() => { __frames(${Math.min(60, left)}); return 1; })()`);
  const rows = await t.ev('__H.rows'), col = i => rows.map(r => r[i]);
  const other = rows.map(r => Math.max(0, r[1] - r[3] - r[4] - r[5] - r[6] - r[7] - r[10]));
  return { frameMs: stat(col(0)), updateMs: stat(col(1)), renderMs: stat(col(2)), simMs: stat(col(3)), syncMs: stat(col(4)), hudMs: stat(col(5)), backdropMs: stat(col(6)), rocketsMs: stat(col(10)), mapMs: stat(col(7)), otherUpdateMs: stat(other), uiTextMsPerFrame: stat(col(8)), uiTextCallsPerFrame: r2(col(9).reduce((a, b) => a + b, 0) / rows.length) };
}
const heap = async t => {
  await t.send('HeapProfiler.collectGarbage');
  const h = await t.send('Runtime.getHeapUsage'), m = await t.send('Performance.getMetrics'), g = k => (m.metrics.find(x => x.name === k) || {}).value;
  return { heapMB: r2(h.usedSize / 1048576), nodes: g('Nodes'), listeners: g('JSEventListeners') };
};
const counts = t => t.ev(`(() => {
  const s = game.scene.getScene('Campaign'), walk = o => { let n = 1; if (o.list) o.list.forEach(c => { n += walk(c); }); return n; }, C = s.camp, lists = s.children.list;
  return { renderer: game.renderer.type === 2 ? 'webgl' : 'canvas', textures: game.textures.getTextureKeys().length, displayList: lists.length, objects: lists.reduce((n, o) => n + walk(o), 0),
    visible: lists.filter(o => o.visible).length, shipSprites: Object.keys(s.sp).length, bulletSprites: s.bsp.length, bulletsLive: C.bullets.length, ships: C.ships.length, aliens: campAliens(C).length, wing: campWing(C).length,
    rockets: (C.rockets || []).length, missiles: C.missiles, tweens: s.tweens.getTweens ? s.tweens.getTweens().length : -1, timers: (s.time._active || []).length };
})()`);

const selfTimes = profile => {
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(); profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const fn = new Map(); let total = 0;
  for (const [id, us] of self) { const cf = byId.get(id).callFrame; if (cf.functionName === '(idle)') continue; total += us; const name = (cf.functionName || '(anon)') + ' ' + (cf.url || '').split('/').slice(-1)[0] + ':' + (cf.lineNumber + 1); fn.set(name, (fn.get(name) || 0) + us); }
  return { fn, total };
};
const printTop = (m, total, n, per = 1) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([a, us]) => console.log(`  ${(us / per / 1000).toFixed(3).padStart(8)} ms  ${(us / total * 100).toFixed(1).padStart(5)}%  ${a}`));
const noErrors = t => { if (t.errors.length) console.log('  PAGE ERRORS: ' + t.errors.slice(0, 5).join(' | ')); };

// one session, several measures: the lock is taken once and a Chrome part stays under five minutes. `all` runs frames, micro, alloc and profile in the one page.
const MEASURES = {
  async frames(t, arg, tag = '') {
    await timeFrames(t, 120); // warm
    console.log(tag + (arg || 'busy1'), JSON.stringify({ ...(await timeFrames(t, 600)), ...(await counts(t)), ...(await heap(t)) }, null, 1).replace(/\n\s*/g, ' '));
  },
  // the cost of one call, from a tight loop (the page's clock is only good to 0.1 ms, so one call cannot be timed on its own): the sim is stepped in runs of 30, the fight topped up between them
  async micro(t, arg) {
    const r = await t.ev(`(() => { const s = game.scene.getScene('Campaign'), time = (n, f) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
      const keep = !!window.__keep; let sim = 0, steps = 0; for (let b = 0; b < 40; b++) { const C = s.camp; const a = performance.now(); for (let i = 0; i < 30; i++) campStep(C, 1 / 60); sim += performance.now() - a; steps += 30; if (keep) window.__topup(); else C.events.length = 0; }
      const C = s.camp; if (s.mp) campMapClose(s);
      const out = { campStep: sim / steps, sync: time(400, () => s.sync()), paintHud: time(400, () => s.paintHud()), uiText7: time(600, () => { for (let i = 0; i < 7; i++) uiText('camp.ui.hull'); }), uiTextVars: time(600, () => uiText('camp.ui.wave', { n: 1, total: 3 })), backdrop: time(2000, () => spaceBackdropTick(s)), objective: time(600, () => campObjective(C)), marks: time(400, () => campMapMarks(C)), legend: time(400, () => campMapLegend(C)) };
      out.playlogWrapperOnly = time(5000, () => campStep(C, 0)); out.contentVars = time(2000, () => contentVars());
      campMapOpen(s); out.mapPaint = time(200, () => campMapPaint(s, 0)); campMapClose(s); return out; })()`);
    console.log('micro ' + (arg || 'busy1') + ' (ms for ONE call, from loops): ' + JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 10000) / 10000]))));
  },
  async alloc(t, arg) {
    await timeFrames(t, 120);
    await t.send('HeapProfiler.enable');
    await t.send('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    await timeFrames(t, 600);
    const { profile } = await t.send('HeapProfiler.stopSampling'), agg = new Map(); let total = 0;
    const owner = new Map(); // by the game function that asked for it (the nearest frame on the stack that is not Phaser's or the browser's)
    const walk = (n, up) => { const cf = n.callFrame, f = (cf.url || '').split('/').slice(-1)[0], mine = f && f !== 'phaser.min.js' && f !== 'perfcampaign.mjs', name = (cf.functionName || '(anon)') + ' ' + f + ':' + (cf.lineNumber + 1), who = mine ? name : up;
      agg.set(name, (agg.get(name) || 0) + n.selfSize); owner.set(who, (owner.get(who) || 0) + n.selfSize); total += n.selfSize; (n.children || []).forEach(c => walk(c, who)); };
    walk(profile.head, '(no game function on the stack)');
    console.log(`allocation in ${arg || 'busy1'}: ${(total / 600 / 1024).toFixed(0)} KB a frame (sampled, 2 KB interval)`);
    console.log('  by function (self):'); [...agg].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([a, b]) => console.log(`  ${(b / 600 / 1024).toFixed(1).padStart(7)} KB  ${(b / total * 100).toFixed(1).padStart(5)}%  ${a}`));
    console.log('  by the game function that asked for it (Phaser calls charged to the caller):'); [...owner].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([a, b]) => console.log(`  ${(b / 600 / 1024).toFixed(1).padStart(7)} KB  ${(b / total * 100).toFixed(1).padStart(5)}%  ${a}`));
  },
  async profile(t, arg) {
    await timeFrames(t, 120);
    await t.send('Profiler.enable'); await t.send('Profiler.setSamplingInterval', { interval: 100 }); await t.send('Profiler.start');
    await timeFrames(t, 600);
    const { profile } = await t.send('Profiler.stop'), s = selfTimes(profile);
    console.log(`CPU profile of ${arg || 'busy1'}: ${(s.total / 600 / 1000).toFixed(2)} ms a frame of self time ((program) is Chrome and the rasteriser, not the game)`);
    printTop(s.fn, s.total, 16, 600);
    const kids = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
    const selfUs = new Map(); profile.samples.forEach((id, i) => selfUs.set(id, (selfUs.get(id) || 0) + (profile.timeDeltas[i] || 0)));
    const owner = new Map(), mineOf = id => { for (let n = kids.get(id); n; n = kids.get(parent.get(n.id))) { const f = (n.callFrame.url || '').split('/').slice(-1)[0]; if (f && f !== 'phaser.min.js' && f !== 'perfcampaign.mjs') return (n.callFrame.functionName || '(anon)') + ' ' + f + ':' + (n.callFrame.lineNumber + 1); } return '(no game function on the stack)'; };
    let tot2 = 0; for (const [id, us] of selfUs) { if (kids.get(id).callFrame.functionName === '(idle)') continue; const w = mineOf(id); owner.set(w, (owner.get(w) || 0) + us); tot2 += us; }
    console.log('  charged to the game function that called it (Phaser time goes to its caller):'); printTop(owner, tot2, 16, 600);
  }
};
const LIST = what === 'all' ? ['frames', 'micro', 'alloc', 'profile'] : what.split(',').filter(m => MEASURES[m]); // `frames,micro` runs two in the one page
if (LIST.length) {
  const t = await enter(arg);
  try { for (const m of LIST) await MEASURES[m](t, arg); noErrors(t); } finally { await t.close(); }
}
if (what === 'map') {
  const t = await enter(arg);
  try { await t.ev("(() => { campMapOpen(game.scene.getScene('Campaign')); return 1; })()"); await MEASURES.frames(t, arg, 'map open, '); noErrors(t); } finally { await t.close(); }
}

if (what === 'live') { // the real loop, not stepped: the intervals between drawn frames in a fight, so the drawing and the Mac are in the number (the Chrome of the tests, headless, draws on the GPU)
  const key = arg || 'busy1', secs = Number(arg2) || 20, k = SCEN[key] || SCEN.busy1, t = await launch(hashOf(key), SRC);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000, 'the Campaign is up');
    await sleep(1500);
    await t.ev(`(() => { ${SCENARIO} const s = game.scene.getScene('Campaign'); s.hideCard(); s.mode = 'play'; if (${k.keep ? 'true' : 'false'}) { __prep(s.camp); window.__keep = true; campOrder(s.camp, 'launch'); window.__topup(); setInterval(() => window.__topup(), 500); }
      if (${k.keep ? 'false' : 'true'}) { const T = {}, sc = game.scene.getScene('Campaign'); setInterval(() => __drive(sc.camp, T), 100); }
      window.__dts = []; window.__js = []; let last = 0, t0 = 0; game.events.on('prestep', () => { t0 = performance.now(); }); game.events.on('postrender', () => { const n = performance.now(); if (last) { window.__dts.push(n - last); window.__js.push(n - t0); } last = n; }); return 1; })()`);
    if (process.env.PERF_ZOOM) await t.ev(`(() => { CAMZOOM.want = ${Number(process.env.PERF_ZOOM)}; return 1; })()`); // PERF_ZOOM=0.05: the view's zoom (0.335 is where a flight starts; a long mission goes out to its whole route)
    await sleep(3000); await t.ev('(() => { __dts.length = 0; __js.length = 0; return 1; })()'); // warm, then the measured part
    await sleep(secs * 1000);
    const d = await t.ev('__dts'), js = await t.ev('__js'), n = d.length, c = await counts(t), zoom = await t.ev(`game.scene.getScene('Campaign').cameras.main.zoom`);
    console.log(`live ${key} at zoom ${r2(zoom)}: ${n} frames in ${secs} s = ${r2(n / secs)} a second; interval between frames (ms) ${JSON.stringify({ ...stat(d), p99: r2(pct(d, .99)) })}; over 20 ms: ${d.filter(x => x > 20).length}, over 33 ms: ${d.filter(x => x > 33).length}, over 50 ms: ${d.filter(x => x > 50).length}; ${JSON.stringify(c)}`);
    // WHERE a long interval comes from: the game's own part of that frame (from the loop's first step to the end of its drawing, JS only) against the interval. An interval over 33 ms whose own part was a few ms was spent outside the game's JavaScript: the Mac (other programs), the browser's drawing or the display. One whose own part is long is the game (or the garbage collector, which runs inside it).
    const slow = d.map((x, i) => ({ i, gap: x, own: js[i] })).filter(x => x.gap > 33), ownLong = slow.filter(x => x.own > 8).length;
    console.log(`  the game's own part of a frame (ms) ${JSON.stringify(stat(js))}; of the ${slow.length} intervals over 33 ms, ${ownLong} had an own part over 8 ms and ${slow.length - ownLong} were spent outside the game's JavaScript; the worst five (interval/own): ${slow.sort((a, b) => b.gap - a.gap).slice(0, 5).map(x => r2(x.gap) + '/' + r2(x.own)).join(', ') || 'none'}`);
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'planets') { // what a level's world art costs the first time it is made (the texture is kept, so a retry is free)
  const t = await launch('?campaign=3');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000); await sleep(800);
    const r = await t.ev(`(() => { const s = game.scene.getScene('Campaign'), out = {}; for (const L of [1, 2, 3]) { const pl = campPlaces(L); for (const id of Object.keys(pl)) { const p = pl[id]; if (p.hidden) continue; const key = (p.kind || 'rock') + '/' + (p.seed || 1), had = s.textures.exists('planet-' + (p.kind || 'rock') + '-' + (p.seed || 1)); const a = performance.now(); planetTexture(s, p.kind || 'rock', p.seed || 1); const d = performance.now() - a; out['L' + L + ' ' + id + ' ' + key] = Math.round(d * 10) / 10; } } return out; })()`);
    console.log('first time a place of a level is made (ms): ' + JSON.stringify(r)); noErrors(t);
  } finally { await t.close(); }
}

if (what === 'loadprofile') { // CPU profile of one page load to the Campaign: where the time goes before the scene is up
  const level = Number(arg) || 1, t = await launch('?campaign=' + level);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000);
    await t.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = window.__T = {}; const iv = setInterval(() => { if (window.game && game.scene && game.scene.scenes.length && game.scene.isActive('Campaign')) { T.scene = performance.now(); clearInterval(iv); } }, 1); })()` });
    await t.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
    await t.send('Profiler.enable'); await t.send('Profiler.setSamplingInterval', { interval: 100 }); await t.send('Profiler.start');
    await t.send('Page.navigate', { url: 'file://' + ROOT + '/index.html?campaign=' + level });
    await t.waitFor('!!(window.__T && __T.scene)', 40000);
    const { profile } = await t.send('Profiler.stop'), s = selfTimes(profile);
    console.log(`load of ?campaign=${level}: Campaign up at ${r2(await t.ev('__T.scene'))} ms; ${Math.round(s.total / 1000)} ms sampled`); printTop(s.fn, s.total, 18);
  } finally { await t.close(); }
}

if (what === 'storm') { // the HUD's text changes every frame (a fight where the hull and Earth's shield fall at every step) against the same fight where they stay: the cost of Text.setText with a new string
  const t = await enter(arg || 'busy1');
  try {
    await timeFrames(t, 120);
    const a = await timeFrames(t, 600); await t.ev('(() => { window.__storm = true; return 1; })()'); await timeFrames(t, 60);
    const b = await timeFrames(t, 600); await t.ev('(() => { window.__storm = false; return 1; })()');
    const m = await t.ev(`(() => { const s = game.scene.getScene('Campaign'); let i = 0; const a = performance.now(); for (let k = 0; k < 500; k++) s.hud.wave.setText('Wave  ' + (i++)); return (performance.now() - a) / 500; })()`);
    console.log('text still   ', JSON.stringify({ frameMs: a.frameMs, updateMs: a.updateMs, renderMs: a.renderMs, hudMs: a.hudMs }));
    console.log('text changing', JSON.stringify({ frameMs: b.frameMs, updateMs: b.updateMs, renderMs: b.renderMs, hudMs: b.hudMs }));
    console.log('one setText with a new string (CPU part, from a loop): ' + r2(m) + ' ms'); noErrors(t);
  } finally { await t.close(); }
}

if (what === 'hitches') { // a level played the way a player plays it, stepped: which frames cost the most, and what ran in them (a first-time texture, a toast, a voice line, an explosion)
  const secs = Number(arg) || 120, t = await launch('?campaign=1');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000, 'the Campaign is up');
    await t.clock(); await t.run(600);
    await t.ev(`(() => { ${SCENARIO} const T = window.__T2 = { spikes: [], acc: {} }, sc = game.scene.getScene('Campaign');
      const wrap = (obj, name, key) => { const f = obj[name]; obj[name] = function (...a) { const s0 = performance.now(); try { return f.apply(this, a); } finally { T.acc[key] = (T.acc[key] || 0) + performance.now() - s0; } }; };
      for (const n of ['shipPreviewTexture', 'planetTexture', 'toast', 'shipcompSay', 'sfx', 'beep', 'campOrder']) if (typeof window[n] === 'function') wrap(window, n, n);
      wrap(sc.boom, 'explode', 'boom.explode'); wrap(Campaign.prototype, 'onEvent', 'onEvent'); wrap(Campaign.prototype, 'sync', 'sync'); wrap(Campaign.prototype, 'paintHud', 'paintHud'); wrap(window, 'campStep', 'campStep');
      const R = game.renderer; for (const m of ['preRender', 'render', 'postRender']) wrap(R, m, 'render');
      window.__play = (n) => { for (let i = 0; i < n; i++) { T.acc = {}; const C = sc.camp, ev0 = C.events.length; __t += 16.67; const s0 = performance.now(); game.step(__t, 16.67); const d = performance.now() - s0;
          if (sc.mode === 'play') __drive(C, T);
          T.spikes.push({ t: Math.round(sec * 10) / 10, ms: Math.round(d * 100) / 100, acc: Object.fromEntries(Object.entries(T.acc).map(([k, v]) => [k, Math.round(v * 100) / 100]).filter(([k, v]) => v >= 0.1)), ships: C.ships.length, bullets: C.bullets.length }); } };
      const s = sc; s.hideCard(); s.mode = 'play'; return 1; })()`);
    for (let f = 0; f < secs * 60; f += 120) await t.ev('(() => { __play(120); return 1; })()');
    const sp = await t.ev('__T2.spikes'), tot = sp.map(x => x.ms);
    console.log(`hitches, level 1 played ${secs} s (stepped): frame ms ${JSON.stringify(stat(tot))}, ${sp.filter(x => x.ms > 3).length} frames over 3 ms, ${sp.filter(x => x.ms > 8).length} over 8 ms of ${sp.length}`);
    [...sp].sort((a, b) => b.ms - a.ms).slice(0, 12).forEach(x => console.log('  ' + JSON.stringify(x)));
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'fill') { // WHERE the drawing time goes, for a machine whose drawing is slow (run it with LONGHAUL_GL=software): the real loop, the busiest fight, with one kind of thing hidden at a time
  const key = arg || 'busy1', secs = Number(arg2) || 8, k = SCEN[key] || SCEN.busy1, t = await launch(hashOf(key), SRC);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000); await sleep(1500);
    await t.ev(`(() => { ${SCENARIO} const s = game.scene.getScene('Campaign'); s.hideCard(); s.mode = 'play'; __prep(s.camp); window.__keep = true; campOrder(s.camp, 'launch'); window.__topup(); setInterval(() => window.__topup(), 500);
      window.__dts = []; let last = 0; game.events.on('postrender', () => { const n = performance.now(); if (last) window.__dts.push(n - last); last = n; });
      const all = () => s.children.list, vis = (pred, v) => all().forEach(o => { if (pred(o)) o.setVisible(v); });
      window.__variants = { base: v => {}, 'backdrop (3 full-screen layers) hidden': v => s.bgLayers.forEach(l => l.setVisible(v)), 'backdrop layer 3 (the one that breathes) hidden': v => s.bgLayers[2].setVisible(v), 'HUD graphics (radar, bars) hidden': v => s.hudG.setVisible(v),
        'ship and shot sprites hidden': v => vis(o => o.texture && o.depth >= 3 && o.depth <= 5 && o.type === 'Image', v), 'planets hidden': v => vis(o => o.texture && /^planet-/.test(o.texture.key), v), 'explosion particles hidden': v => vis(o => o.type === 'ParticleEmitter', v) };
      return 1; })()`);
    const names = await t.ev('Object.keys(__variants)');
    for (const name of names) {
      await t.ev(`(() => { __variants[${JSON.stringify(name)}](false); return 1; })()`); await sleep(1500); await t.ev('(() => { __dts.length = 0; return 1; })()'); await sleep(secs * 1000);
      const d = await t.ev('__dts'); await t.ev(`(() => { __variants[${JSON.stringify(name)}](true); return 1; })()`);
      console.log(`${name.padEnd(52)} ${r2(d.length / secs).toFixed(1).padStart(5)} fps   frame ms mean ${r2(d.reduce((a, b) => a + b, 0) / d.length)}  p95 ${r2(pct(d, .95))}`);
    }
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'rockets') { // the missile launcher's drawing (src/campaignscene.js syncRockets) against the same fight without it, in the one page: the reach ring and the turret mounts (two Graphics), the smoke puffs (an image and a tween each)
  const t = await enter(arg || 'busy1');
  try {
    await timeFrames(t, 120);
    const show = async (label, setup) => { await t.ev(`(() => { ${setup}; return 1; })()`); await timeFrames(t, 180); const r = await timeFrames(t, 600), c = await counts(t); console.log(label.padEnd(46), `frame ${r.frameMs.mean} ms (render ${r.renderMs.mean}, update ${r.updateMs.mean}, rockets ${r.rocketsMs.mean}), display list ${c.displayList}, tweens ${c.tweens}, rockets in flight ${c.rockets}`); };
    await show('as it is (missiles fired every 0.5 s)', "const s = game.scene.getScene('Campaign'); window.__nomissile = false; s.reachG && s.reachG.setVisible(true); s.mountG && s.mountG.setVisible(true)");
    await show('reach ring and turret mounts hidden', "const s = game.scene.getScene('Campaign'); s.reachG.setVisible(false); s.mountG.setVisible(false)");
    await show('no missile fired (and ring and mounts shown)', "const s = game.scene.getScene('Campaign'); window.__nomissile = true; s.reachG.setVisible(true); s.mountG.setVisible(true); s.camp.rockets.length = 0");
    await show('no missile, ring and mounts hidden', "const s = game.scene.getScene('Campaign'); s.reachG.setVisible(false); s.mountG.setVisible(false)");
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'soak') {
  const minutes = Number(arg) || 3, key = arg2 || 'busy1', t = await enter(key);
  try {
    await t.ev(HOOKS);
    const rows = []; const c0 = await counts(t); rows.push({ min: 0, ...(await heap(t)), textures: c0.textures, objects: c0.objects, bulletSprites: c0.bulletSprites });
    for (let m = 1; m <= minutes; m++) {
      for (let f = 0; f < 3600; f += 60) await t.ev('(() => { __frames(60); __H.rows.length = 0; return 1; })()');
      const c = await counts(t); rows.push({ min: m, ...(await heap(t)), textures: c.textures, objects: c.objects, bulletSprites: c.bulletSprites, tweens: c.tweens, timers: c.timers });
    }
    rows.forEach(r => console.log(JSON.stringify(r)));
    console.log('heap after a full collection, by game minute: ' + rows.map(r => r.heapMB).join(' '));
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'restart') {
  const n = Number(arg) || 8, t = await enter('natural1');
  try {
    await t.ev(HOOKS);
    const rows = []; const hop = async level => { await t.ev(`(() => { go(game.scene.getScene('Campaign'), 'Campaign', { level: ${level}, via: 'skip' }); return 1; })()`); await t.run(1200); await t.ev("(() => { const s = game.scene.getScene('Campaign'); s.hideCard(); s.mode = 'play'; return 1; })()"); await t.run(600); };
    for (let i = 0; i <= n; i++) { if (i) await hop(1 + (i % 3)); const c = await counts(t); rows.push({ start: i, ...(await heap(t)), textures: c.textures, objects: c.objects }); }
    rows.forEach(r => console.log(JSON.stringify(r)));
    console.log('heap after a full collection, by start: ' + rows.map(r => r.heapMB).join(' '));
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'planetstart') { // the planets painted inside create() were 373 ms of one frame on level 1 (docs/PERF.md): with PERF_ROOT=<an older checkout> this is the "before", the same tool on the new code the "after"
  const level = Number(arg) || 1, t = await enter('natural1');
  try {
    await t.ev(`(() => { if (window.__PL) return 1; const P = window.__PL = { rows: [], paints: 0, ms: 0, each: [] };
      const c0 = Campaign.prototype.create; Campaign.prototype.create = function (...a) { const s = performance.now(), n0 = P.paints, m0 = P.ms; try { return c0.apply(this, a); } finally { P.rows.push({ createMs: performance.now() - s, paintedInCreate: P.paints - n0, paintMsInCreate: P.ms - m0 }); } };
      const f = window.planetTexture; window.planetTexture = function (sc, kind, seed) { const had = sc.textures.exists('planet-' + kind + '-' + ((seed | 0) || 1)), s = performance.now(); try { return f.apply(this, arguments); } finally { if (!had) { const d = performance.now() - s; P.paints++; P.ms += d; P.each.push(Math.round(d)); } } };
      window.__cold = () => { Object.keys(game.textures.list).filter(k => /^planet-/.test(k)).forEach(k => game.textures.remove(k)); waPlanetCache.length = 0; P.each = []; return 1; };
      return 1; })()`);
    const goto = async (key, data, ms) => { await t.ev(`(() => { const s = game.scene.getScenes(true)[0]; go(s, ${JSON.stringify(key)}, ${JSON.stringify(data || {})}); return 1; })()`); await t.run(ms); }; // from whatever scene is up, on the stepped clock
    const last = () => t.ev('(() => { const r = __PL.rows[__PL.rows.length - 1] || {}; return { createMs: Math.round(r.createMs || 0), paintedInCreate: r.paintedInCreate, paintMsInCreate: Math.round(r.paintMsInCreate || 0) }; })()');
    const cold = async () => { await goto('Title', {}, 900); await t.ev('__cold()'); }; // the title shows no planet: take them out of the cache only when no image is using them (a picture whose texture is gone stops the renderer)
    for (let i = 0; i < 3; i++) {
      await cold(); await goto('Campaign', { level, via: 'skip' }, 1500); const noRoom = await last();
      await cold(); await goto('CampHub', {}, 4500); // the ready room, open for a few seconds (its timers run on the stepped clock)
      const inRoom = await t.ev('({ paints: __PL.paints, each: __PL.each.slice() })');
      await goto('Campaign', { level, via: 'hub' }, 1500); const fromRoom = await last();
      console.log(`level ${level}, run ${i + 1}: create() with no planet painted ${JSON.stringify(noRoom)} | ready room open 4.5 s painted ${inRoom.paints} planets (${inRoom.each.join(' ')} ms each), then create() ${JSON.stringify(fromRoom)}`);
    }
    noErrors(t);
  } finally { await t.close(); }
}

if (what === 'load') {
  const level = Number(arg) || 3, t = await launch('?campaign=' + level);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Campaign'))", 40000);
    await t.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = window.__T = {}; document.addEventListener('DOMContentLoaded', () => T.dcl = performance.now()); window.addEventListener('load', () => T.load = performance.now()); let v; Object.defineProperty(window, 'game', { configurable: true, get() { return v; }, set(x) { v = x; T.game = performance.now(); } }); const iv = setInterval(() => { if (window.game && game.scene && game.scene.scenes.length && game.scene.isActive('Campaign')) { T.scene = performance.now(); clearInterval(iv); } }, 1); })()` });
    const runs = [];
    for (let i = 0; i < 5; i++) {
      await t.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
      await t.send('Page.navigate', { url: 'file://' + ROOT + '/index.html?campaign=' + level });
      await t.waitFor('!!(window.__T && __T.scene)', 40000);
      runs.push(await t.ev('({ dcl: __T.dcl, load: __T.load, game: __T.game, scene: __T.scene })'));
    }
    const med = f => r2(pct(runs.map(r => r[f] || 0), .5));
    console.log(`?campaign=${level}: ms since navigation, median of 5: scripts done (DOMContentLoaded) ${med('dcl')}, game object ${med('game')}, load event ${med('load')}, Campaign scene up ${med('scene')}; runs: ${runs.map(r => Math.round(r.scene)).join(' ')}`);
    noErrors(t);
  } finally { await t.close(); }
}

// Measure the game's speed and memory in headless Chrome (card space-game-perf-pass; docs/PERF.md says how to read the numbers).
//   node tools/perf.mjs frames  [scenes]   time of 600 stepped frames per scene (update and render apart), object counts, heap
//   node tools/perf.mjs load    [scenes]   page load: DOMContentLoaded, the game object, the first scene up (5 loads, median)
//   node tools/perf.mjs loadprofile [scene] CPU profile of one load: self time by file and by function
//   node tools/perf.mjs art                time of every texture src/art_world.js paints at boot
//   node tools/perf.mjs profile [scene]    CPU profile of 600 frames
//   node tools/perf.mjs alloc   [scene]    where 600 frames allocate memory
//   node tools/perf.mjs leaks   [trips]    go round the scenes, then print what grew (heap after a full collection, textures, nodes)
// scenes: title station space surface hyper galaxy (a comma list, default all). Output is printed, nothing is written.
// Headless Chrome here draws with software GL, so "(program)" time in a profile is the drawing, not the game's code; the game's own
// JavaScript is what the file rows show. One Chrome at a time across all worktrees (tests/lock.mjs) applies as for any test.
import { launch, sleep, ROOT } from '../tests/cdp.mjs';

const what = process.argv[2] || 'frames', arg = process.argv[3];
const SCENES = { title: ['', 'Title'], station: ['#station', 'Station'], space: ['#space', 'Space'], surface: ['#surface', 'Surface'], hyper: ['#hyper', 'Hyper'], galaxy: ['#galaxy', 'Galaxy'] };
const r2 = x => Math.round(x * 100) / 100;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const pick = () => (arg || Object.keys(SCENES).join(',')).split(',').filter(k => SCENES[k]);

async function enter(key) {
  const [hash, scene] = SCENES[key];
  const t = await launch(hash);
  await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 30000, key + ' scene active');
  await t.send('Performance.enable');
  await t.clock(); await t.run(1500); // settle
  if (scene === 'Space') { // thrust held and no pirates, as in a quiet flight
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
    await t.ev("(() => { const s = game.scene.getScene('Space'); if (s.enemies) s.enemies.clear(true, true); return 1; })()");
  }
  return t;
}

// N stepped frames, the render part (preRender, render, postRender) timed apart from the rest
async function timeFrames(t, n) {
  await t.ev(`(() => { const R = game.renderer; window.__rt = 0; window.__ds = []; window.__rs = [];
    if (!R.__hooked) { R.__hooked = true; for (const m of ['preRender', 'render', 'postRender']) { const f = R[m]; R[m] = function (...x) { const s = performance.now(); const o = f.apply(this, x); __rt += performance.now() - s; return o; }; } }
    window.__step = k => { for (let i = 0; i < k; i++) { __rt = 0; __t += 16.67; const s = performance.now(); game.step(__t, 16.67); __ds.push(performance.now() - s); __rs.push(__rt); } };
    return 1; })()`);
  for (let left = n; left > 0; left -= 100) await t.ev(`(() => { __step(${Math.min(100, left)}); return 1; })()`);
  const ds = await t.ev('__ds'), rs = await t.ev('__rs'), ups = ds.map((d, i) => d - rs[i]);
  const f = a => ({ med: r2(pct(a, .5)), p95: r2(pct(a, .95)), max: r2(Math.max(...a)) });
  return { totalMs: f(ds), updateMs: f(ups), renderMs: f(rs) };
}

const heap = async t => {
  await t.send('HeapProfiler.collectGarbage');
  const h = await t.send('Runtime.getHeapUsage'), m = await t.send('Performance.getMetrics'), g = k => (m.metrics.find(x => x.name === k) || {}).value;
  return { heapMB: r2(h.usedSize / 1048576), nodes: g('Nodes'), listeners: g('JSEventListeners') };
};

const counts = t => t.ev(`(() => {
  const walk = o => { let n = 1; if (o.list) o.list.forEach(c => { n += walk(c); }); return n; };
  return { renderer: game.renderer.type === 2 ? 'webgl' : 'canvas', textures: game.textures.getTextureKeys().length,
    objects: game.scene.getScenes(true).map(s => s.sys.settings.key + ' ' + s.children.list.reduce((n, o) => n + walk(o), 0)).join(', ') };
})()`);

const selfTimes = (profile, idle = true) => {
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const fn = new Map(), file = new Map(); let total = 0;
  for (const [id, us] of self) {
    const cf = byId.get(id).callFrame; if (cf.functionName === '(idle)' && !idle) continue; total += us;
    const name = (cf.functionName || '(anon)') + ' ' + (cf.url || '').split('/').slice(-1)[0] + ':' + (cf.lineNumber + 1);
    fn.set(name, (fn.get(name) || 0) + us);
    const f = cf.url ? cf.url.split('/').slice(-1)[0] : cf.functionName || '(native)'; file.set(f, (file.get(f) || 0) + us);
  }
  return { fn, file, total };
};
const printTop = (m, total, n, per = 1) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([a, us]) => console.log(`  ${(us / per / 1000).toFixed(2).padStart(8)} ms  ${(us / total * 100).toFixed(1).padStart(5)}%  ${a}`));

if (what === 'frames') for (const k of pick()) {
  const t = await enter(k);
  try { console.log(k.padEnd(8), JSON.stringify({ ...(await timeFrames(t, 600)), ...(await counts(t)), ...(await heap(t)) })); } finally { await t.close(); }
}

if (what === 'load') for (const k of pick()) {
  const [hash, scene] = SCENES[k], t = await launch(hash);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 30000);
    await t.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = window.__T = {}; document.addEventListener('DOMContentLoaded', () => T.dcl = performance.now()); window.addEventListener('load', () => T.load = performance.now()); let v; Object.defineProperty(window, 'game', { configurable: true, get() { return v; }, set(x) { v = x; T.game = performance.now(); } }); const iv = setInterval(() => { if (window.game && game.scene && game.scene.scenes.length && game.scene.isActive('${scene}')) { T.scene = performance.now(); clearInterval(iv); } }, 1); })()` });
    const runs = [];
    for (let i = 0; i < 5; i++) {
      await t.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
      await t.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' + hash });
      await t.waitFor('!!(window.__T && __T.scene)', 30000);
      runs.push(await t.ev('({ dcl: __T.dcl, load: __T.load, game: __T.game, scene: __T.scene })'));
    }
    const med = f => r2(pct(runs.map(r => r[f] || 0), .5));
    console.log(k.padEnd(8), `ms since navigation, median of 5: scripts done (DOMContentLoaded) ${med('dcl')}, game object ${med('game')}, load event ${med('load')}, first scene up ${med('scene')}`);
  } finally { await t.close(); }
}

if (what === 'loadprofile') {
  const k = SCENES[arg] ? arg : 'title', [hash, scene] = SCENES[k], t = await launch(hash);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 30000);
    await t.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = window.__T = {}; const iv = setInterval(() => { if (window.game && game.scene && game.scene.scenes.length && game.scene.isActive('${scene}')) { T.scene = performance.now(); clearInterval(iv); } }, 1); })()` });
    await t.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
    await t.send('Profiler.enable'); await t.send('Profiler.setSamplingInterval', { interval: 100 }); await t.send('Profiler.start');
    await t.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' + hash });
    await t.waitFor('!!(window.__T && __T.scene)', 30000);
    const { profile } = await t.send('Profiler.stop'), s = selfTimes(profile);
    console.log(`load of ${k}: first scene up at ${r2(await t.ev('__T.scene'))} ms; ${Math.round(s.total / 1000)} ms sampled`);
    console.log('-- by file'); printTop(s.file, s.total, 12); console.log('-- by function'); printTop(s.fn, s.total, 20);
  } finally { await t.close(); }
}

if (what === 'art') {
  const t = await launch('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 30000);
    console.log('worldArt at boot:', await t.ev('window.waMs'), 'ms');
    const r = await t.ev(`(() => { const out = {}, orig = window.waCanvas, sc = game.scene.getScene('Title');
      window.waCanvas = function (s, key, w, h, fn) { const a = performance.now(); const x = orig.call(this, s, key, w, h, fn); out[key] = r1(performance.now() - a); return x; };
      function r1(x) { return Math.round(x * 10) / 10; } worldArt(sc); window.waCanvas = orig; return out; })()`);
    Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`  ${String(v).padStart(7)} ms  ${k}`));
    const planets = await t.ev(`(() => { const o = {}, sc = game.scene.getScene('Title'); for (const kind of PLANET_KINDS) { const a = performance.now(); planetTexture(sc, kind, 5); o[kind] = Math.round(performance.now() - a); } return o; })()`);
    console.log('a planet of each kind, first time (ms):', JSON.stringify(planets));
  } finally { await t.close(); }
}

if (what === 'profile' || what === 'alloc') {
  const k = SCENES[arg] ? arg : 'space', t = await enter(k);
  try {
    await timeFrames(t, 120); // warm
    if (what === 'profile') {
      await t.send('Profiler.enable'); await t.send('Profiler.setSamplingInterval', { interval: 100 }); await t.send('Profiler.start');
      await timeFrames(t, 600);
      const { profile } = await t.send('Profiler.stop'), s = selfTimes(profile, false);
      console.log(`CPU profile of ${k}: ${(s.total / 600 / 1000).toFixed(2)} ms a frame of self time (per frame below)`);
      console.log('-- by file'); printTop(s.file, s.total, 12, 600); console.log('-- by function'); printTop(s.fn, s.total, 25, 600);
    } else {
      await t.send('HeapProfiler.enable');
      await t.send('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
      await timeFrames(t, 600);
      const { profile } = await t.send('HeapProfiler.stopSampling'), agg = new Map(); let total = 0;
      const walk = n => { const cf = n.callFrame, name = (cf.functionName || '(anon)') + ' ' + (cf.url || '').split('/').slice(-1)[0] + ':' + (cf.lineNumber + 1); agg.set(name, (agg.get(name) || 0) + n.selfSize); total += n.selfSize; (n.children || []).forEach(walk); };
      walk(profile.head);
      console.log(`allocation in ${k}: ${(total / 600 / 1024).toFixed(0)} KB a frame (sampled)`);
      [...agg].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([a, b]) => console.log(`  ${(b / 600 / 1024).toFixed(1).padStart(7)} KB  ${(b / total * 100).toFixed(1).padStart(5)}%  ${a}`));
    }
  } finally { await t.close(); }
}

if (what === 'leaks') {
  const trips = Number(arg) || 8, t = await launch('#station');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 30000);
    await t.send('Performance.enable'); await t.clock(); await t.run(1000);
    const hop = async key => { await t.ev(`(() => { go(game.scene.getScenes(true)[0], '${key}'); return 1; })()`); await t.run(900); };
    const rows = [];
    for (let i = 0; i <= trips; i++) {
      if (i) { for (const k of ['Ship', 'Space']) await hop(k); await t.ev("(() => { const s = game.scene.getScene('Space'); if (s.enemies) s.enemies.clear(true, true); return 1; })()"); for (const k of ['Surface', 'Space', 'Station']) await hop(k); }
      const c = await counts(t); rows.push({ trip: i, ...(await heap(t)), textures: c.textures });
    }
    rows.forEach(r => console.log(JSON.stringify(r)));
    console.log('heap after a full collection, by trip: ' + rows.map(r => r.heapMB).join(' '));
  } finally { await t.close(); }
}

// ---------- Play log: how the game is played, kept on this machine (card space-game-playlog; Troy, 18 Nov 2026) ----------
// Troy asked for logging so ORCH can see what his play is like and talk it through with him. LOCAL ONLY: nothing leaves the machine, no key is involved,
// and no typed or spoken text is ever recorded: the ship computer and the bar chat are logged as "it happened, it took this long, it failed with this code",
// never the words (the events below have a fixed list of fields; a field that is not on it is dropped, and a string is cut to letters, digits and a few marks).
//
// ONE EVENT PER LINE (JSONL): { t: ms since this session began, s: session id, ev: name, ...the fields of that event }.
//   session    phase start | end | off | resume, why (pagehide: the tab closed or the page reloaded), secs, prev (unclean: the last session never said goodbye), build, mods, scr
//   scene      the screen on top changed: from, to, secs spent in the one it left (Pause and Settings are scenes too: every pause and every Settings visit is a line)
//   dock, system, jump   docked (from Space to Station), the star system changed, a jump was started
//   sample     every 10 s: w (epoch s), scene, system, x, y, ship, credits, fuel, hull, speed, auto (cruise | autopilot | assist), mission
//   mission    state accepted | done | failed | dropped, id, pay        buy / sell   what, n (credits, negative when it cost)      credits   delta of the rest (pay, fees)
//   death      cause (the nearest raider's kind), scene, system         counts   a: how many times each ACTION name was used (key:<what it does>, click, voice), every minute
//   computer, computer_plan   the ship computer asked: ms, ok, code (why: one word for an empty reply); and which action of its closed list it chose        npc_chat   the bar chat: ms, ok, code, why
//   listen     a hold of the voice key, one line a step: start, open (ms the microphone took), release (held seconds; short, silent), clip (bytes), heard (ms, chars of the transcript, 0 = empty), and
//              the end: why = sent (the words went to the computer) or the name of the plain line shown (tap, silent, nothing, denied...). Counts and times, never the words.
//   idle       NO INPUT FOR 20 s OR MORE: secs, and what was on screen (scene, scenes, panel, mission, system, auto): the best sign of confusion
//   fps_dip    under 30 frames a second for 2 s or more: fps (the worst), secs        stall   the page froze (no tick for 5 s)       tab   hidden | visible
//   error      every JS error, rejected promise and console.error: kind, msg, stack (file paths shortened to ~)
// A key is counted by what it DOES, from the one table of src/data_controls.js (the screen you are on decides): "key:flight: Thrust", never "W" and never a letter
// typed into a box (a keypress in an input is activity, not an action).
//
// WHERE IT GOES. Always: a ring buffer of chunks in this browser's localStorage (works from a double-clicked index.html), about 480 KB, the oldest chunk goes first.
// When the page is served by tools/serve.mjs it also POSTs each batch to that server (/__playlog), which appends it to ~/dev/spacegame-playlogs/ OUTSIDE the repo.
// Settings > Reset has the row: Play log ON or OFF (default ON), Download log, Forget log. node tools/playlog-summary.mjs reads a file and prints one screen.
//
// THE LOGGER NEVER THROWS AND NEVER SLOWS A FRAME: every entry point is inside try/catch; a frame costs a few additions; events are batched (a write every 5 s
// to one chunk of 24 KB at most); the pending list and the errors are capped. playlogCreate is pure on its env (a clock, a store, a sink): tests/playlog.mjs
// runs it with a fake clock and a fake sink. playlogInstall is the only part that touches the page.
const PLAYLOG = {
  keys: { meta: 'longhaul.playlog.meta', chunk: 'longhaul.playlog.c', on: 'longhaul.playlog.on', open: 'longhaul.playlog.open' },
  ring: { chunk: 24000, chunks: 20 }, // 24 KB a chunk, 20 chunks: about 480 KB
  flushMs: 5000, sampleMs: 10000, idleMs: 20000, countsMs: 60000, stallMs: 5000, pendingMax: 600,
  fps: { low: 30, window: 2000, skip: 1000 },       // under 30 fps over a 2 s window is a dip; a single frame over 1 s is a hidden tab, not a dip
  errors: { perMin: 30, msg: 300, stack: 600 },
  url: '/__playlog', sinkFails: 3,
  // the priority of the screens: the first one that is running (or paused under another) is "the scene" for the time spent
  scenes: ['Pause', 'Settings', 'ModsSetup', 'ShipComputer', 'Galaxy', 'Journal', 'Overlay', 'Ending', 'Hyper', 'Ship', 'Surface', 'Space', 'Station', 'Title', 'Boot'],
  // the events and the only fields each may carry
  fields: {
    session: ['phase', 'why', 'secs', 'prev', 'build', 'mods', 'scr', 'w', 'scene', 'system'],
    scene: ['from', 'to', 'secs'], dock: ['at', 'system'], system: ['from', 'to'], jump: ['to', 'ly', 'cost'],
    sample: ['w', 'scene', 'system', 'x', 'y', 'ship', 'credits', 'fuel', 'hull', 'speed', 'auto', 'mission'],
    mission: ['state', 'id', 'pay'], buy: ['what', 'n'], sell: ['what', 'n'], credits: ['delta', 'scene'], death: ['cause', 'scene', 'system'],
    counts: ['a'], computer: ['ms', 'ok', 'code', 'why'], computer_plan: ['action', 'refused', 'dropped'], npc_chat: ['ms', 'ok', 'code', 'why'], listen: ['step', 'ms', 'held', 'bytes', 'chars', 'ok', 'why', 'short', 'silent'],
    idle: ['secs', 'scene', 'scenes', 'panel', 'mission', 'system', 'auto', 'open'], fps_dip: ['fps', 'secs', 'scene'], stall: ['secs'], tab: ['state'],
    error: ['kind', 'msg', 'stack', 'scene']
  }
};

// ---- clean values: numbers, booleans, short plain strings, and one flat map of counts ----
const plClean = (v, n) => String(v).replace(/[^\w .:\/'+>-]/g, '?').slice(0, n || 60);
function plLong(v, n) { // an error message or a stack: any text, but control characters out, the home folder shortened, a length cap
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/(file:\/\/)?\/Users\/[^\/\s)]+\//g, '$1~/').replace(/\/home\/[^\/\s)]+\//g, '~/').slice(0, n || 300);
}
function plVal(v, long) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 10) / 10 : undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return long ? plLong(v, long) : plClean(v);
  if (v && typeof v === 'object' && !Array.isArray(v)) { const o = {}; Object.keys(v).slice(0, 60).forEach(k => { if (typeof v[k] === 'number' && Number.isFinite(v[k])) o[plClean(k, 48)] = Math.round(v[k]); }); return o; }
  return undefined;
}

// ---- the ring: chunks in a store (get, set, remove), oldest first ----
function plRingAppend(store, text) {
  const K = PLAYLOG.keys, R = PLAYLOG.ring;
  let m = null; try { m = JSON.parse(store.get(K.meta) || 'null'); } catch (e) { m = null; }
  if (!m || !Number.isInteger(m.a) || !Number.isInteger(m.b) || m.b < m.a) m = { a: 0, b: 0 };
  let cur = store.get(K.chunk + m.b) || '';
  if (cur && cur.length + text.length > R.chunk) { m.b++; cur = ''; while (m.b - m.a >= R.chunks) { store.remove(K.chunk + m.a); m.a++; } }
  store.set(K.chunk + m.b, cur + text); store.set(K.meta, JSON.stringify(m));
}
function plRingRead(store) {
  const K = PLAYLOG.keys; let m = null; try { m = JSON.parse(store.get(K.meta) || 'null'); } catch (e) { m = null; }
  if (!m || !Number.isInteger(m.a) || !Number.isInteger(m.b)) return '';
  let out = ''; for (let i = m.a; i <= m.b; i++) out += store.get(K.chunk + i) || ''; return out;
}
function plRingClear(store) {
  const K = PLAYLOG.keys; let m = null; try { m = JSON.parse(store.get(K.meta) || 'null'); } catch (e) { m = null; }
  if (m && Number.isInteger(m.a) && Number.isInteger(m.b)) for (let i = m.a; i <= m.b; i++) store.remove(K.chunk + i);
  store.remove(K.meta);
}

// ---- what a key does: from the controls table, by the screen you are on. Pure. controls: CONTROLS (src/data_controls.js); e: { code, key } ----
function playlogKeyLabel(e) {
  const c = String((e && e.code) || '');
  if (/^Key[A-Z]$/.test(c)) return c.slice(3); if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  return ({ Space: 'Space', Enter: 'Enter', NumpadEnter: 'Enter', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Tab: 'Tab' })[c] || '';
}
function playlogAction(controls, sceneKey, e) {
  const label = playlogKeyLabel(e); if (!label) return 'key:other';
  const g = (controls || []).find(x => x.scene === sceneKey); if (!g) return 'key:other';
  const alias = { Up: 'W', Left: 'A', Down: 'S', Right: 'D' }[label]; // the arrows do what the WASD keys do
  const has = (r, k) => r.k.some(x => x === k || (/^\d-\d$/.test(x) && /^\d$/.test(k) && k >= x[0] && k <= x[2]));
  const row = g.rows.find(r => has(r, label)) || (alias && g.rows.find(r => has(r, alias)));
  if (!row) return 'key:other';
  return 'key:' + g.id + ': ' + plClean(String(row.t).split(/[(:;,.]/)[0].trim().toLowerCase(), 36);
}

// ---- the logger ----
// env: { mono(): ms (a clock that does not jump), wall(): ms since 1970, store: { get, set, remove }, sink: null | (text, final) => void, sid, on, build: {} }
function playlogCreate(env) {
  const P = PLAYLOG, L = { sid: env.sid || 'x', on: env.on !== false, pending: [], dropped: 0 };
  const mono = () => env.mono(), t0 = mono(), wall = () => Math.floor((env.wall ? env.wall() : Date.now()) / 1000);
  let cur = null, curSince = t0, last = null, lastTick = t0, lastSample = -1e9, lastInput = t0, idleOpen = null, hidden = false, ended = false;
  let counts = {}, countsAt = t0, flushAt = t0, dealt = 0, fpsAcc = { sum: 0, n: 0, at: t0 }, dip = null, errs = { n: 0, at: t0 };
  const secs = ms => Math.round(ms / 100) / 10;

  L.ev = (name, data) => {
    try {
      if (!L.on || !P.fields[name]) return;
      const o = { t: Math.round(mono() - t0), s: L.sid, ev: name };
      P.fields[name].forEach(k => { if (data && data[k] !== undefined) { const v = plVal(data[k], name === 'error' && (k === 'msg' ? P.errors.msg : k === 'stack' ? P.errors.stack : 0)); if (v !== undefined && v !== '') o[k] = v; } });
      L.pending.push(JSON.stringify(o));
      if (L.pending.length > P.pendingMax) { L.pending.shift(); L.dropped++; }
    } catch (e) { /* the log is never the reason the game stops */ }
  };
  L.flush = final => {
    try {
      if (!L.pending.length) return;
      const text = L.pending.splice(0).join('\n') + '\n';
      try { plRingAppend(env.store, text); } catch (e) { try { plRingClear(env.store); plRingAppend(env.store, text); } catch (e2) { /* no room: the server copy, if any, has it */ } }
      if (env.sink) { try { env.sink(text, !!final); } catch (e) { /* a sink that fails is turned off by the installer */ } }
      flushAt = mono();
    } catch (e) { /* never */ }
  };
  // what a person did: any input resets the idle clock, and ends an idle gap with a line
  L.input = () => {
    try {
      const now = mono();
      if (idleOpen) { L.ev('idle', Object.assign({ secs: secs(now - idleOpen.since) }, idleOpen.ctx)); idleOpen = null; }
      lastInput = now;
    } catch (e) { /* never */ }
  };
  L.count = name => { try { counts[name] = (counts[name] || 0) + 1; } catch (e) { /* never */ } };
  const flushCounts = () => { if (Object.keys(counts).length) { L.ev('counts', { a: counts }); counts = {}; } countsAt = mono(); };
  L.dealt = delta => { dealt += delta; };

  L.start = info => {
    try {
      let prev = ''; try { if (env.store.get(P.keys.open)) prev = 'unclean'; } catch (e) { prev = ''; }
      L.ev('session', Object.assign({ phase: 'start', w: wall(), prev }, info || {}));
      try { env.store.set(P.keys.open, L.sid); } catch (e) { /* no store */ }
      L.flush();
    } catch (e) { /* never */ }
  };
  L.hidden = h => {
    try {
      if (h === hidden) return; hidden = h;
      L.ev('tab', { state: h ? 'hidden' : 'visible' });
      if (h && idleOpen) { L.ev('idle', Object.assign({ secs: secs(mono() - idleOpen.since) }, idleOpen.ctx)); idleOpen = null; }
      lastInput = mono(); lastTick = mono(); if (h) L.flush();
    } catch (e) { /* never */ }
  };
  // once a second, with a look at the game: { scene, scenes, panel, system, mission, missionId, credits, fuel, hull, x, y, speed, ship, auto }
  L.tick = snap => {
    try {
      const now = mono(), dt = now - lastTick; lastTick = now;
      if (hidden || !snap) return;
      if (dt > P.stallMs) { L.ev('stall', { secs: secs(dt) }); lastInput = now; } // the page froze, or the computer slept: not a person idle
      if (!last) { cur = snap.scene; curSince = now; }
      if (snap.scene !== cur) {
        const was = cur; L.ev('scene', { from: was, to: snap.scene, secs: secs(now - curSince) }); cur = snap.scene; curSince = now;
        if (was === 'Space' && snap.scene === 'Station') L.ev('dock', { at: snap.dock, system: snap.system });
      }
      if (last) {
        if (snap.system !== last.system) L.ev('system', { from: last.system, to: snap.system });
        let paid = 0; // the pay of a call that was done this second is the call's, not a second line of "other credits"
        if (snap.mission !== last.mission || snap.missionId !== last.missionId) {
          const was = last.mission, id = snap.missionId || last.missionId, pay = Math.round(snap.credits - last.credits - dealt);
          if (snap.mission === 'accepted' && was !== 'accepted') L.ev('mission', { state: 'accepted', id });
          else if (snap.mission === 'failed') L.ev('mission', { state: 'failed', id });
          else if (snap.mission === 'none' && (was === 'accepted' || was === 'rescued')) { L.ev('mission', { state: pay > 0 ? 'done' : 'dropped', id, pay: pay > 0 ? pay : undefined }); if (pay > 0) paid = pay; }
        }
        const resid = Math.round(snap.credits - last.credits - dealt - paid);
        if (resid && Number.isFinite(resid)) L.ev('credits', { delta: resid, scene: snap.scene });
      }
      dealt = 0; last = snap;
      if (now - lastSample >= P.sampleMs) { lastSample = now; L.ev('sample', Object.assign({ w: wall() }, snap)); }
      // idle: nothing pressed or clicked for 20 s; what was on screen is kept with it
      if (!idleOpen && now - lastInput >= P.idleMs) idleOpen = { since: lastInput, ctx: { scene: snap.scene, scenes: snap.scenes, panel: snap.panel, mission: snap.mission, system: snap.system, auto: snap.auto } };
      if (now - countsAt >= P.countsMs) flushCounts();
      if (now - flushAt >= P.flushMs) L.flush();
    } catch (e) { /* never */ }
  };
  // once a frame: a few additions
  L.frame = delta => {
    try {
      if (!(delta > 0) || delta > P.fps.skip || hidden) return;
      fpsAcc.sum += delta; fpsAcc.n++;
      if (fpsAcc.sum >= P.fps.window) {
        const fps = fpsAcc.n / (fpsAcc.sum / 1000);
        if (fps < P.fps.low) { if (!dip) dip = { fps, secs: 0 }; dip.fps = Math.min(dip.fps, fps); dip.secs += fpsAcc.sum / 1000; }
        else if (dip) { L.ev('fps_dip', { fps: dip.fps, secs: dip.secs, scene: cur }); dip = null; }
        fpsAcc = { sum: 0, n: 0, at: 0 };
      }
    } catch (e) { /* never */ }
  };
  L.error = (kind, msg, stack) => {
    try {
      const now = mono(); if (now - errs.at > 60000) errs = { n: 0, at: now };
      if (++errs.n > P.errors.perMin) return;
      L.ev('error', { kind, msg: plLong(msg, P.errors.msg), stack: plLong(stack, P.errors.stack), scene: cur });
    } catch (e) { /* never */ }
  };
  L.death = (cause, snap) => { try { L.ev('death', { cause: cause || 'unknown', scene: cur, system: snap && snap.system }); } catch (e) { /* never */ } };
  L.setOn = on => {
    try {
      if (on === L.on) return;
      if (on) { L.on = true; L.ev('session', { phase: 'resume', w: wall() }); try { env.store.set(P.keys.on, '1'); } catch (e) { /* no store */ } }
      else { L.ev('session', { phase: 'off', w: wall() }); L.flush(); L.on = false; try { env.store.set(P.keys.on, '0'); } catch (e) { /* no store */ } }
    } catch (e) { /* never */ }
  };
  L.text = () => { try { return plRingRead(env.store) + (L.pending.length ? L.pending.join('\n') + '\n' : ''); } catch (e) { return ''; } };
  L.forget = () => { try { plRingClear(env.store); L.pending = []; counts = {}; return true; } catch (e) { return false; } };
  L.end = why => {
    try {
      if (ended) return; ended = true; const now = mono();
      if (idleOpen) { L.ev('idle', Object.assign({ secs: secs(now - idleOpen.since), open: true }, idleOpen.ctx)); idleOpen = null; }
      flushCounts();
      if (cur) L.ev('scene', { from: cur, to: 'end', secs: secs(now - curSince) });
      L.ev('session', { phase: 'end', why: why || 'pagehide', secs: Math.round((now - t0) / 1000), scene: cur, system: last && last.system, w: wall() });
      L.flush(true);
      try { env.store.remove(P.keys.open); } catch (e) { /* no store */ }
    } catch (e) { /* never */ }
  };
  return L;
}

// ---- the functions of the game that are watched from outside (nothing in those files changes): a wrapper calls the real one and says what happened ----
// deal: the credits before and after say what it cost or paid. A wrapper is made once, never throws, and returns what the real function returned.
const PLAYLOG_DEALS = [['buyUpgrade', 'part'], ['fleetBuy', 'ship'], ['fleetSell', 'ship'], ['sellOre', 'ore'], ['buyFuel', 'fuel']];
function playlogWrap(L, root) {
  const done = [], G_ = root.G || (typeof G !== 'undefined' ? G : undefined); // the game's G is a const: not a property of window, but a name this script can read
  const wrap = (name, make) => {
    try {
      const orig = root[name]; if (typeof orig !== 'function' || orig.__playlog) return;
      const w = make(orig); w.__playlog = true; root[name] = w; done.push(name);
    } catch (e) { /* a name that cannot be wrapped is not watched */ }
  };
  PLAYLOG_DEALS.forEach(([name, what]) => wrap(name, orig => function () {
    const before = G_ && G_.credits;
    const r = orig.apply(this, arguments);
    try { const d = (G_.credits - before); if (d && Number.isFinite(d)) { L.dealt(d); L.ev(d < 0 ? 'buy' : 'sell', { what, n: Math.round(d) }); } } catch (e) { /* never */ }
    return r;
  }));
  wrap('jumpStart', orig => function (s, id, j) { try { L.ev('jump', { to: id, ly: j && j.ly, cost: j && j.cost }); } catch (e) { /* never */ } return orig.apply(this, arguments); });
  wrap('voiceSay', orig => function () { try { L.count('voice'); } catch (e) { /* never */ } return orig.apply(this, arguments); });
  // the ship computer and the bar chat: that it happened, how long, whether it failed: never the words
  let inComputer = 0;
  const timed = (kind, orig) => async function () {
    const t = Date.now(); let r;
    try { r = await orig.apply(this, arguments); return r; } finally {
      try { const why = r && r.error && /^[a-z]{1,12}$/.test(r.why || '') ? { why: r.why } : {}; L.ev(kind, Object.assign({ ms: Date.now() - t, ok: !!(r && !r.error), code: r && r.error ? (r.code || 'error') : '' }, why)); } catch (e) { /* never */ } // why: an empty reply's one-word reason
    }
  };
  wrap('shipcompAsk', orig => { const t = timed('computer', orig); return async function () { inComputer++; try { return await t.apply(this, arguments); } finally { inComputer--; } }; });
  wrap('chatComplete', orig => { const t = timed('npc_chat', orig); return function () { return inComputer ? orig.apply(this, arguments) : t.apply(this, arguments); }; }); // a question to the computer is its own line
  // a hold of the voice key, step by step: that it began, how long the microphone took, how long it was held, how big the clip, how long Deepgram took and whether it heard anything
  // (chars: how many characters came back, never which), and how it ended: the name of the plain line shown (tap, silent, nothing, denied...) or sent. Never the words.
  const LS = () => (typeof LISTEN !== 'undefined' ? LISTEN : null), lsEv = d => { try { L.ev('listen', d); } catch (e) { /* never */ } };
  wrap('listenPress', orig => function () { const r = orig.apply(this, arguments); if (r) lsEv({ step: 'start' }); return r; });
  wrap('listenOpen', orig => function () {
    const t = Date.now(), p = orig.apply(this, arguments);
    try { Promise.resolve(p).then(() => { const S = LS() && LS().s; lsEv({ step: 'open', ms: Date.now() - t, ok: !!S && S.state === 'listening' }); }, () => {}); } catch (e) { /* never */ }
    return p;
  });
  wrap('listenRelease', orig => function (why) {
    let was = '', held = 0; try { const S = LS().s, now = typeof lsNow === 'function' ? lsNow() : 0; was = S.state; held = was === 'listening' ? (now - S.t0) / 1000 : 0; } catch (e) { /* never */ }
    const r = orig.apply(this, arguments);
    try { const S = LS().s; if (was === 'listening') lsEv({ step: 'release', held, why: why || 'key', short: !!S.short, silent: !!S.silent }); else if (was === 'opening') lsEv({ step: 'release', held: 0, why: 'early' }); } catch (e) { /* never */ }
    return r;
  });
  wrap('listenStopped', orig => function (seq) {
    try { const S = LS().s; if (seq === S.seq && S.state === 'stopping' && S.send) lsEv({ step: 'clip', bytes: S.chunks.reduce((a, c) => a + ((c && c.size) || 0), 0) }); } catch (e) { /* never */ }
    return orig.apply(this, arguments);
  });
  wrap('listenHear', orig => function (blob) {
    const t = Date.now(), bytes = blob && blob.size, p = orig.apply(this, arguments);
    try { Promise.resolve(p).then(() => { const S = LS().s; lsEv({ step: 'heard', ms: Date.now() - t, bytes, chars: S.state === 'review' ? String(S.words || '').length : 0 }); }, () => {}); } catch (e) { /* never */ }
    return p;
  });
  wrap('listenLine', orig => function (text) { try { const k = Object.keys(LS().say).find(n => String(text).indexOf(lsSay(n)) === 0); lsEv({ step: 'end', why: k || 'other' }); } catch (e) { /* never */ } return orig.apply(this, arguments); });
  wrap('listenGo', orig => function () { const r = orig.apply(this, arguments); if (r) lsEv({ step: 'end', why: 'sent' }); return r; });
  wrap('shipcompPlan', orig => function () {
    const r = orig.apply(this, arguments);
    try { const a = r && r.action, name = typeof a === 'string' ? a : a && a.name; L.ev('computer_plan', { action: /^[a-z_]{1,24}$/.test(name || '') ? name : (a ? 'other' : 'none'), refused: !!(r && r.refused), dropped: !!(r && r.dropped) }); } catch (e) { /* never */ }
    return r;
  });
  return done;
}

// ---- the page: the only part that touches it ----
function playlogSnapshot(game) {
  const P = PLAYLOG, all = game.scene.scenes.filter(s => s.scene.isActive() || s.scene.isPaused()), keys = all.map(s => s.scene.key);
  const scene = P.scenes.find(k => keys.includes(k)) || keys[0] || 'Boot', base = ['Space', 'Station', 'Ship', 'Surface', 'Hyper', 'Title', 'Boot'].find(k => keys.includes(k));
  const o = { scene, scenes: keys.slice(0, 4).join('+'), system: G.system, dock: G.lastDock, mission: G.mission, missionId: G.missionId, credits: G.credits, hull: Math.round(G.hull || 0) };
  try { const rec = activeShip(); o.ship = rec.model; if (typeof fuelHave === 'function') o.fuel = Math.round(fuelHave(rec)); } catch (e) { /* no ship yet */ }
  const sc = base && game.scene.getScene(base);
  if (base === 'Space' && sc && sc.ship && sc.ship.body) {
    o.x = Math.round(sc.ship.x / 10) * 10; o.y = Math.round(sc.ship.y / 10) * 10; o.speed = Math.round(sc.ship.body.speed);
    o.auto = sc.cruising ? 'cruise' : (sc.ap && sc.ap.on) ? 'autopilot' : (sc.as && sc.as.mode) ? 'assist' : '';
    o.panel = (sc.np && sc.np.shown) ? 'navpanel' : '';
  } else if (base === 'Station' && sc) o.panel = sc.shopOpen ? 'shop' : sc.pumpOpen ? 'pump' : sc.panel ? 'board' : sc.talk ? 'talk' : (sc.menu && sc.menu.keys) ? 'menu' : '';
  return o;
}
function playlogInstall(game) {
  try {
    const P = PLAYLOG, w = window;
    const store = { get: k => { try { return w.localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { w.localStorage.setItem(k, v); }, remove: k => { try { w.localStorage.removeItem(k); } catch (e) { /* none */ } } };
    const sid = (() => { try { const a = new Uint8Array(4); w.crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return Math.random().toString(16).slice(2, 10).padEnd(8, '0'); } })();
    // the server sink: only when this page came from an http address (tools/serve.mjs); three failures in a row (a plain static server answers 404) and it stops trying
    let fails = 0, sinkOn = /^https?:$/.test(w.location.protocol);
    const sink = (text, final) => {
      if (!sinkOn) return;
      const url = P.url + '?s=' + sid;
      const bad = () => { if (++fails >= P.sinkFails) sinkOn = false; };
      try {
        if (final && w.navigator.sendBeacon) { w.navigator.sendBeacon(url, text); return; }
        w.fetch(url, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).then(r => { if (r.ok) fails = 0; else bad(); }, bad);
      } catch (e) { bad(); }
    };
    const on = store.get(P.keys.on) !== '0';
    const L = playlogCreate({ mono: () => w.performance.now(), wall: () => Date.now(), store, sink, sid, on });
    w.PLAYLOG_LIVE = L;
    const mods = (() => { try { return modsOnList().join(',') || 'none'; } catch (e) { return ''; } })();
    L.start({ scr: Math.round(w.innerWidth) + 'x' + Math.round(w.innerHeight), mods });
    // the player: what was pressed is an ACTION by the screen it was pressed on; typing in a box is activity only
    const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    w.addEventListener('keydown', e => {
      try {
        L.input(); if (e.repeat || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
        const sc = P.scenes.find(k => game.scene.isActive(k)) || '';
        L.count(playlogAction(typeof CONTROLS !== 'undefined' ? CONTROLS : [], sc === 'Space' || sc === 'Station' || sc === 'Ship' || sc === 'Surface' ? sc : '', e));
      } catch (er) { /* never */ }
    }, true);
    w.addEventListener('pointerdown', () => { try { L.input(); L.count('click'); } catch (e) { /* never */ } }, true);
    ['wheel', 'touchstart'].forEach(n => w.addEventListener(n, () => { try { L.input(); } catch (e) { /* never */ } }, true));
    w.document.addEventListener('visibilitychange', () => { try { L.hidden(w.document.hidden); if (w.document.hidden) L.flush(); } catch (e) { /* never */ } });
    w.addEventListener('pagehide', () => { try { L.end('pagehide'); } catch (e) { /* never */ } });
    // the page: a frame, a second, five seconds
    game.events.on('step', (time, delta) => L.frame(delta));
    setInterval(() => { try { L.tick(playlogSnapshot(game)); } catch (e) { /* never */ } }, 1000);
    // what goes wrong
    w.addEventListener('error', e => L.error('error', e && e.message, e && e.error && e.error.stack));
    w.addEventListener('unhandledrejection', e => L.error('promise', e && e.reason && (e.reason.message || e.reason), e && e.reason && e.reason.stack));
    const ce = w.console.error; w.console.error = function () { try { L.error('console', Array.prototype.map.call(arguments, a => (a && a.message) || String(a)).join(' ')); } catch (e) { /* never */ } return ce.apply(this, arguments); };
    // what the game does, watched from outside: the functions it already has
    playlogWrap(L, w);
    try { if (typeof Space === 'function' && !Space.prototype.die.__playlog) { const d = Space.prototype.die; Space.prototype.die = function () { try { const e = this.enemies && this.enemies.getChildren().filter(x => x.active).sort((a, b) => Math.hypot(a.x - this.ship.x, a.y - this.ship.y) - Math.hypot(b.x - this.ship.x, b.y - this.ship.y))[0]; L.death(e && e.def && e.def.key ? e.def.key : e ? 'pirate' : 'unknown', playlogSnapshot(game)); } catch (er) { /* never */ } return d.apply(this, arguments); }; Space.prototype.die.__playlog = true; } } catch (e) { /* not watched */ }
    try { if (typeof Station === 'function' && Station.prototype.repairHull && !Station.prototype.repairHull.__playlog) { const r0 = Station.prototype.repairHull; Station.prototype.repairHull = function () { const before = G.credits; const r = r0.apply(this, arguments); try { const d = G.credits - before; if (d) { L.dealt(d); L.ev('buy', { what: 'repair', n: Math.round(d) }); } } catch (er) { /* never */ } return r; }; Station.prototype.repairHull.__playlog = true; } } catch (e) { /* not watched */ }
    return L;
  } catch (e) { return null; /* the game starts regardless */ }
}

// ---- Settings: the row (src/settings.js) asks these ----
const playlogOn = () => !!(typeof PLAYLOG_LIVE !== 'undefined' && PLAYLOG_LIVE && PLAYLOG_LIVE.on);
function playlogSet(on) { try { if (PLAYLOG_LIVE) PLAYLOG_LIVE.setOn(!!on); return playlogOn(); } catch (e) { return false; } }
function playlogForget() { try { return !!(PLAYLOG_LIVE && PLAYLOG_LIVE.forget()); } catch (e) { return false; } }
function playlogDownload() { // the log as a file: { ok, name, bytes } ; the click on a made link works from a double-clicked index.html too
  try {
    const text = PLAYLOG_LIVE ? PLAYLOG_LIVE.text() : ''; if (!text) return { ok: false, name: '', bytes: 0 };
    const d = new Date(), name = 'longhaul-playlog-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.jsonl';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    return { ok: true, name, bytes: text.length };
  } catch (e) { return { ok: false, name: '', bytes: 0 }; }
}

// this file loads last, after every script the logger watches: the page starts it here (the node tests load the file and run nothing)
if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.game && window.game.scene && window.game.events) playlogInstall(window.game);

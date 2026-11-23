// not in the smoke: missions 1.2 and 1.3 flown as a player in the real game, beat by beat (one Chrome, muted, through the test lock; card space-game-hunt-l1-pacing)
// It is tests/huntfleet-boot.mjs with another player: the three squads are ordered apart (E red, R green, T yellow, W all), the miners or the haulers are tucked in when torpedo boats come, hurt squads are
// recalled to be mended in a quiet stretch, the power goes to the shields for the heavy raid and first contact, a missile goes at the big ships,
// It writes down every beat (BEAT: a wave that came, a wave that is gone, a call, a quiet stretch of 40 s or more) and every order it gave (DECIDE), with the mission clock.
// Every key comes from the key table (CAMP_PANELS, CAMP_KEYS), never a letter of its own.
//   node tests/huntl1pacing-boot.mjs --mission 2|3 [--ending win|lose] [--secs 420] [--nobrief]
// --ending lose: the wing is launched (in 1.3 the autopilot is put on the convoy) and no order is ever given. --nolaunch: not even that (nothing is pressed at all).  --ore N: the ore in the save.
// Pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/pacing-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const MISSION = Number(arg('mission', 1)), SECS = Number(arg('secs', 420)), ENDING = String(arg('ending', 'win')), LANE = String(arg('lane', 'short')), NOBRIEF = process.argv.includes('--nobrief'), IDLE = Number(arg('idle', 0)), NOSCOUT = process.argv.includes('--noscout'), KILL = process.argv.includes('--killleader'), DOCK0 = process.argv.includes('--dock0'), ORE = Number(arg('ore', 60)), NOLAUNCH = process.argv.includes('--nolaunch');
const TAG = `${MISSION}${ENDING === 'lose' ? 'L' : 'W'}`;
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { Tab: 9, Enter: 13, Escape: 27, Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Digit0: 48, Semicolon: 186, Equal: 187, Minus: 189, Backspace: 8, Slash: 191 };
for (let i = 0; i < 26; i++) VK['Key' + String.fromCharCode(65 + i)] = 65 + i;
for (let i = 1; i <= 9; i++) VK['Digit' + i] = 48 + i;
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const kd = (code, mods = 0) => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : /^(Key|Digit)/.test(code) ? code.replace(/^(Key|Digit)/, '').toLowerCase() : code, modifiers: mods });
  const down = async (code, mods = 0) => t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code, mods)));
  const up = async (code, mods = 0) => t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code, mods)));
  const key = async (code, wait = 50, mods = 0) => { await down(code, mods); await t.run(wait); await up(code, mods); await t.run(50); };
  const hold = async (code, ms) => { await down(code); await t.run(ms); await up(code); await t.run(50); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `pacing-${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : Object.keys(s.slots).map(k => s.slots[k]).filter(o => o && o.text).map(o => o.text); })()`);
  const hud = () => j(`(() => { const s = ${S}; const out = []; if (s.hud) Object.keys(s.hud).forEach(k => { const o = s.hud[k]; if (o && o.text && o.visible !== false) out.push(k + '=' + String(o.text).replace(/\\n/g, ' / ')); }); return out; })()`);
  const card = () => j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`);
  const state = () => j(`({ mode: ${S}.mode, result: ${S}.camp.result, t: Math.round(${S}.camp.t / 1000), clock: Math.round(campMissionClock(${S}.camp)), obj: campObjective(${S}.camp), hull: Math.round(${S}.camp.carrier.hp), shield: Math.round(${S}.camp.shield), foes: campAliens(${S}.camp).length, wing: campWing(${S}.camp).length, x: Math.round(${S}.camp.carrier.x), y: Math.round(${S}.camp.carrier.y) })`);
  const toasts = (from = 0) => j(`window.__log.slice(${from})`);

  // ---- the key table: the code of every key the walk presses, read from the game's own tables
  // The keys come from the game's own tables and nothing else: CAMP_KEYS (the direct keys: map, fire, zoom, the target keys, the power keys, the missile, and Up, Down, Enter and Esc of an open list), CAMP_PANELS (the key that opens
  // each of the lists, and which list a row is in: campKeyVia), and the Campaign group of CONTROLS for V (scout). An order is given as a player gives it (card list-shortcuts): the key of the list the row is in
  // (a list with no key of its own, the stances, is opened from its parent: the parent's key, Down to the part's row, Enter), Down to the row, Enter;
  // the row's place is read from the list of THIS mission (campPanelList), never a number written here. A row the table does not have is said and skipped, so a change of the table shows up as a note, not as a wrong key.
  const codeOf = lab => /^[A-Z]$/.test(lab) ? 'Key' + lab : /^[0-9]$/.test(lab) ? 'Digit' + lab : ({ Tab: 'Tab', Space: 'Space', Enter: 'Enter', Esc: 'Escape', ';': 'Semicolon', '+': 'Equal', '-': 'Minus', '/': 'Slash', '=': 'Equal', Backspace: 'Backspace' })[lab] || null;
  const ctl = async (re, i = 0) => codeOf(await j(`(() => { const g = CONTROLS.find(g => g.id === 'campaign'); const r = g.rows.find(r => ${re}.test(r.t)); return r ? r.k[${i}] : null; })()`));
  const ck = id => j(`(typeof CAMP_KEYS === 'object' && CAMP_KEYS[${JSON.stringify(id)}]) ? CAMP_KEYS[${JSON.stringify(id)}].codes[0] : null`);
  const rk = id => j(`(() => { const p = typeof campKeyVia === 'function' ? campKeyVia(${JSON.stringify(id)}) : null; return p ? p.id : null; })()`); // the list a row is in ('fleet', 'fighters', 'nav' ...), or null
  // the way to a row: [[the key to press, how many Downs after it], ...]: its list's own key, or (a list with no key) the parent's key, Down to the part's row, Enter. null: the row is not in this mission's list
  const wayTo = id => j(`(() => { const C = ${S}.camp, id = ${JSON.stringify(id)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
    if (p.code) return [[p.code, at]];
    const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? [[up.code, pat], [${JSON.stringify(K.pick)}, at]] : null; })()`);
  const K = {}; // filled after the boot
  const DIRECT = ['shields', 'engines', 'weapons', 'balance', 'missile']; // not rows: keys of their own (J K L ; and Enter while no list is open)
  const listOpen = () => j(`campPanelOpen(${S}.pn)`);
  const closeLists = async () => { for (let n = 0; n < 6 && (await listOpen()); n++) await key(K.esc); }; // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): until every list is closed (it pauses only when none is open)
  const press = async (id, wait = 50) => { // an order: a direct key, or a row of a list (the key of the list it is in, Down to the row, Enter)
    if ((await j(`${S}.mode`)) !== 'play') return false; // a card has the keys
    if (DIRECT.indexOf(id) >= 0) {
      const c = K[id === 'balance' ? 'even' : id]; if (!c) { note(`(no key for ${id}: the table has none)`); return false; }
      await closeLists();
      await key(c, wait); return true;
    }
    const list = K.rows[id]; if (!list || !(list in K.lists)) { note(`(no row ${id} in the table of the lists)`); return false; }
    const way = await wayTo(id); if (!way) { note(`(the row ${id} is left out of this mission's ${list} list)`); return false; }
    await closeLists(); // an open list is closed first (Esc pauses only when none is open)
    for (const [code, downs] of way) { await key(code, wait); const cur = await j(`${S}.pn.at`), n = await j(`campPanelList(${S}.camp, campPanelOpen(${S}.pn)).length`); for (let i = 0, d = ((downs - cur) % n + n) % n; i < d; i++) await key(K.down, wait); } // (All squads opens on its first row that can be given: the Downs count from the highlight)
    await key(K.pick, wait);
    if (await j(`!!${S}.pn.pick`)) await key(K.pick, wait); // a row that needs a target (Attack, Escort, Mine ore) with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one
    await closeLists(); // an order that is refused leaves the list open (its reason is the toast): it is closed, the keys go back to the ship
    return true;
  };
  const convoyTo = async (row, rx) => { const n0 = await j('window.__log.length'), gave = await press(row); await t.run(300); const said = (await toasts(n0)).join(' | '); check('the convoy row ' + row + ' gave ' + rx, gave && rx.test(said), said.slice(0, 200)); return gave; }; // the convoy orders are plain rows, one for each: the row is given once and says its order (no key steps through them, nothing to wait for)

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let m = 1; m < MISSION; m++) results['1.' + m] = res;
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: 1, mission: MISSION - 1, techs: [], ore: ORE, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  K.title = await ctl(/Title, from the pause/); K.map = await ck('map'); K.fire = await ck('fire'); K.next = await ck('next'); K.last = await ck('last'); K.near = await ck('near'); K.clear = await ck('clear'); K.minus = await ck('zoomout'); K.zero = await ck('zoomreset');
  K.scout = await ctl(/V scouts/, 0); // (the map's T took a lane at the fork of 1.1; the fork was cut, card space-game-cut-lane-fork: no K.take)
  K.up = await ck('up'); K.down = await ck('down'); K.pick = await ck('pick'); K.esc = await ck('pause'); K.shields = await ck('shields'); K.engines = await ck('engines'); K.weapons = await ck('weapons'); K.even = await ck('balance'); K.missile = await ck('missile');
  K.lists = await j(`(() => { const o = {}; CAMP_PANELS.panels.forEach(p => { o[p.id] = p.code; }); return o; })()`); // the key that opens each list ('' for a list with no key of its own: the stances)
  K.rows = {}; for (const id of ['launch', 'attack', 'escort', 'fguard', 'frecall', 'fmine', 'redattack', 'greenattack', 'yellowattack', 'redrecall', 'greenrecall', 'yellowrecall', 'redguard', 'greenguard', 'yellowguard', 'ctuck', 'crun', 'chold', 'ccarry', 'goal', 'target', 'burn', 'dock', 'emergency']) K.rows[id] = await rk(id); // the list each row is in
  K.listDown = K.down; // the map's list is stepped with Down too (A and D are the target's keys, not the map's)
  note('keys from the table: ' + JSON.stringify(K));
  check('every key the walk needs is in the key table', ['title', 'map', 'fire', 'next', 'near', 'minus', 'zero', 'scout', 'up', 'down', 'pick', 'esc', 'shields', 'engines', 'weapons', 'even', 'missile'].every(k => K[k]) && !!K.lists.fleet && !!K.lists.ship && ['launch', 'fguard', 'fmine', 'attack'].every(k => K.rows[k] === 'squads') && K.rows.escort === 'escorts' && ['ctuck', 'crun', 'ccarry'].every(k => K.rows[k] === 'convoy') && ['goal', 'target', 'burn'].every(k => K.rows[k] === 'nav') && K.rows.dock === 'yard' && K.rows.emergency === 'power' && Object.keys(K.rows).every(k => K.rows[k] in K.lists) /* each of those lists is in the table (a list with no key of its own, the escorts and the convoy, is opened from the fleet list: wayTo): the row is two or three keys away */, JSON.stringify(Object.keys(K).filter(k => !K[k]).concat(Object.keys(K.rows).filter(k => !K.rows[k]))));
  check('no row of a list has a key of its own, and no digit is a key of the flight', await j(`CAMP_PANELS.panels.every(p => p.rows.every(r => !('k' in r) && !('code' in r))) && Object.keys(CAMP_KEYS).every(id => CAMP_KEYS[id].codes.every(c => !/^(Digit|Numpad)[0-9]$/.test(c)))`));
  await key('KeyK'); // the title's own key for the Campaign (not in the Campaign group)
  check('K on the title opens the ready room', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`));
  await t.run(900); note('board: ' + (await shown()).join(' | ').slice(0, 700)); await snap('1-board');
  if (!NOBRIEF) {
    await key('Enter'); await t.run(700);
    for (let s = 0; s < 4; s++) { const b = await shown(); note((s ? 'briefing screen ' + s : 'the missions overlay') + ': ' + b.join(' | ').slice(0, 1100)); await snap('2-brief-' + s); if (s < 3) { await key('Enter'); await t.run(500); } }
    await key('Escape'); await t.run(400); // the overlay closes back to the room (the launch is L)
    note('after Esc on the briefing: scene ' + await j(`['CampHub', 'Campaign', 'Title', 'Pause'].filter(k => game.scene.isActive(k)).join()`) + ' | ' + (await shown()).join(' | ').slice(0, 300));
  }
  await key('KeyL'); // launches the mission from the room
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1500); await snap('3-warp'); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { note('mode ' + await j(`${S}.mode`) + ': ' + await card()); await snap('4-card-' + i); await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  // a log of everything the game says: toasts, radio lines, calls and what they did, the events by kind
  await t.ev(`(() => { window.__log = []; const sc = ${S}, tm = () => Math.round(sc.camp ? sc.camp.t / 1000 : 0), put = s => window.__log.push(tm() + 's  ' + s);
    const t0 = toast; toast = function (s, text) { try { put('TOAST ' + String(text).replace(/\\n/g, ' / ')); } catch (e) { /* the log only */ } return t0.apply(this, arguments); };
    const c0 = sc.chatShow; sc.chatShow = function (line, now) { try { put('RADIO ' + line.call + ': ' + line.text); } catch (e) { /* the log only */ } return c0.apply(this, arguments); };
    const e0 = sc.onEvent; sc.onEvent = function (e) { try { if (!/^(shot|hit|fx|spark|boom|trail|laser|beam|puff|splash)/.test(e.type)) put('EVENT ' + JSON.stringify(e).slice(0, 160)); } catch (x) { /* the log only */ } return e0.apply(this, arguments); };
    return 1; })()`);
  await t.run(900); await snap('5-flight'); note('HUD at the start: ' + (await hud()).join(' | ').slice(0, 800)); note('state: ' + JSON.stringify(await state()));

  // ---- the player
  const lanes = () => j(`campNavRows(${S}.camp).filter(r => r.kind === 'lane').map(r => ({ id: r.id, name: r.name }))`);
  const mapDo = async (rowId, code, what) => { // the map by its keys: open it, move the list to the row (Down, from the table), press the key (V scouts, T takes), close it
    await key(K.map); await t.run(300);
    for (let i = 0; i < 60 && (await j(`${S}.mp && ${S}.mp.selId`)) !== rowId; i++) await key(K.listDown);
    const at = await j(`${S}.mp && ${S}.mp.selId`); if (at !== rowId) note(`(${what}: the list would not go to ${rowId}; it stands on ${at})`);
    await key(code, 80); await t.run(300); await key(K.map); await t.run(200);
  };
  // ---- the player of missions 1.2 and 1.3 (card space-game-hunt-l1-pacing): the three squads apart, the convoy orders, the power, the missile, the dock
  const POLICY = ENDING === 'win';
  const C = `${S}.camp`;
  const beats = []; const beat = s => { beats.push(s); note('BEAT ' + s); };
  const look = () => j(`(() => { const C = ${C}, A = campAliens(C), F = campWing(C, 'fighter'), sq = {};
    CAMP.wing.squads.forEach(k => { const m = F.filter(u => u.squad === k); sq[k] = { n: m.length, hurt: m.filter(u => u.hp <= u.maxHp * 0.6).length, order: m[0] && m[0].order ? m[0].order.type : '' }; });
    const tg = C.tgt && C.by[C.tgt];
    return { mode: ${S}.mode, result: C.result, clock: Math.round(campMissionClock(C)), any: A.length, near: A.filter(u => campDist(u, C.carrier) < 900).length, run: A.filter(u => u.running).length,
      waves: C.waves.map((w, i) => { const m = A.filter(u => u.wave === i); return { s: !!(w && w.started), n: m.length, live: m.filter(u => !u.running).length, d: m.length ? Math.round(Math.min.apply(null, m.map(u => campDist(u, C.carrier)))) : -1, kinds: m.map(u => u.kind).sort().join(',') }; }),
      sq, wing: campWing(C).length, bay: (C.bay ? (C.bay.fighters | 0) + (C.bay.escorts | 0) : -1), rep: (C.repairs || []).length, tgt: tg ? { id: tg.id, wave: tg.wave, kind: tg.kind } : null,
      nav: !!(C.nav && C.nav.on), ore: Math.floor(C.ore), best: Math.floor(C.oreBest || 0), hull: Math.round(C.carrier.hp), shield: Math.round(C.shield), power: C.power ? C.power.p : null,
      prot: C.ships.filter(u => u.hp > 0 && (u.kind === 'freighter' || u.kind === 'miner')).map(u => (u.cname || u.id) + ':' + Math.round(100 * u.hp / u.maxHp)).join(' '), cstate: typeof campConvoyState === 'function' ? campConvoyState(C) : '',
      boats: campTorpedoBoats(C).filter(u => !u.running).length, missiles: C.missiles == null ? -1 : C.missiles, allStarted: C.waves.every(w => w && w.started), sold: C.sold | 0 }; })()`);
  // the one target, as a player picks it: S (the nearest threat), then D (the next) until the bracket is on a ship of the wave (and kind) wanted
  const aim = async (wave, kind) => {
    await closeLists(); await key(K.near);
    for (let i = 0; i < 14; i++) { const tg = await j(`(() => { const C = ${C}, u = C.tgt && C.by[C.tgt]; return u ? { wave: u.wave, kind: u.kind, run: !!u.running } : null; })()`); if (tg && tg.wave === wave && !tg.run && (!kind || tg.kind === kind)) return true; await key(K.next); }
    return false;
  };
  const did = {}; let quietFrom = -1, lastAny = 0, seen = [], cleared = [], reAt = {}, recallAt = -99, mineAt = -99, flew = -99, docked = false, sold = false;
  const say = (clock, s) => note(`DECIDE ${clock} s: ${s}`);
  const send = async (clock, squad, wave, kind) => { // a squad at a wave: the target, then the squad's Attack row
    if (!(await aim(wave, kind))) { say(clock, `(no ship of wave ${wave + 1}${kind ? ' of kind ' + kind : ''} to pick with the target keys)`); return false; }
    const n0 = await j('window.__log.length'); await press(squad === 'all' ? 'attack' : squad + 'attack'); await t.run(200);
    say(clock, `${squad} at wave ${wave + 1}${kind ? ' (' + kind + ')' : ''}: ` + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 160)); return true;
  };
  const step = async () => {
    const q = await look(); if (q.result || q.mode !== 'play') return false;
    const clock = q.clock;
    // the beats: a wave that has come, a wave that is gone, a quiet stretch
    q.waves.forEach((w, i) => { if (w.s && !seen[i]) { seen[i] = clock; beat(`${clock} s: wave ${i + 1} is here (${w.kinds || 'none alive yet'}), ${w.d} px from the cruiser; protected: ${q.prot}; squads ${JSON.stringify(q.sq)}`); }
      if (seen[i] && !w.n && !cleared[i] && clock > seen[i] + 1) { cleared[i] = clock; beat(`${clock} s: wave ${i + 1} is gone after ${clock - seen[i]} s; wing ${q.wing}, protected: ${q.prot}, hull ${q.hull}, shield ${q.shield}`); } });
    const busy = q.any > 0 || q.call;
    if (!busy && quietFrom < 0) quietFrom = clock;
    if (busy && quietFrom >= 0) { if (clock - quietFrom >= 40) beat(`QUIET ${quietFrom} to ${clock} s (${clock - quietFrom} s with no hostile alive and no call): ore ${q.ore}, objective "${await j(`campObjective(${C})`)}"`); quietFrom = -1; }
    if (!POLICY) return true; // the loss: the wing is launched and nothing else is ever ordered
    await (q.near ? down(K.fire) : up(K.fire)); // Space held while a hostile is in the turrets' reach
    const live = q.waves.map((w, i) => (w.s && w.live ? i : -1)).filter(i => i >= 0);
    const again = (k, every) => { if (clock - (reAt[k] || -99) >= every) { reAt[k] = clock; return true; } return false; };
    if (MISSION === 2) {
      if (!did.mine && clock >= 5) { did.mine = true; mineAt = clock; await press('fmine'); say(clock, 'all squads mine ore (W, Mine ore): ' + (await toasts()).slice(-1)[0]); }
      if (live.indexOf(0) >= 0 && again('w0', 9)) await send(clock, 'red', 0); // the probe: red stops mining, green and yellow cut rock
      if (live.indexOf(1) >= 0 && again('w1', 9)) { await send(clock, 'red', 1); if (!did.y1) { did.y1 = true; await send(clock, 'yellow', 1); } } // the south-west raid: red and yellow
      if (live.indexOf(2) >= 0 && again('w2', 9)) await send(clock, 'green', 2); // the second group, the far side: green
      if (live.indexOf(3) >= 0) {
        if (!did.tuck) { did.tuck = true; const n0 = await j('window.__log.length'); await press('ctuck'); await t.run(300); say(clock, 'torpedo boats: Q, Convoy, Tuck in: ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 200)); await snap('tuck'); }
        if (q.boats && again('w3b', 9)) await send(clock, 'yellow', 3, 'tboat'); // yellow at the boats
        if (again('w3s', 9)) await send(clock, 'red', 3, 'skiff'); // red at their skiffs
      }
      if (did.tuck && !did.carry && cleared[3]) { did.carry = true; const n0 = await j('window.__log.length'); await press('ccarry'); await t.run(300); say(clock, 'the boats are gone: Carry on: ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 200)); }
      if (live.indexOf(4) >= 0) {
        if (!did.heavy) { did.heavy = true; await key(K.shields); await key(K.shields); say(clock, 'the heavy raid: two pips to the shields (J J), every squad at it (W, Attack)'); await snap('heavy'); }
        if (again('w4', 9)) await send(clock, 'all', 4);
        if (q.missiles > 0 && again('msl', 12) && (await aim(4, 'brute'))) { if (await press('missile')) say(clock, 'a missile at a brute (Enter)'); }
      }
      // between the raids: hurt squads home to be mended (the hint says so), then out again and back to the rock
      if (!q.any && !did.dockGo) {
        for (const k of ['red', 'green', 'yellow']) if (q.sq[k].hurt && q.sq[k].order !== 'recall' && again('rc' + k, 30)) { await press(k + 'recall'); recallAt = clock; say(clock, `${k} squad has ${q.sq[k].hurt} hurt of ${q.sq[k].n}: recalled to be mended`); }
        if (recallAt > 0 && clock - recallAt >= 14 && q.bay > 0 && again('relaunch', 10)) { await press('launch'); say(clock, `launch again (${q.bay} in the bay)`); mineAt = -99; }
        if (q.best < 450 && clock - mineAt >= 20 && clock - recallAt >= 16) { mineAt = clock; await press('fmine'); say(clock, `back to the rock: ore ${q.ore}`); }
      }
      if (!q.any && q.best >= 450 && q.allStarted && !sold) {
        if (!did.dockGo) { did.dockGo = true; await press('goal'); await t.run(400); say(clock, `ore ${q.ore}, the raids are beaten: the goal is "${await j(`campObjective(${C})`)}"; I, Fly to the goal`); }
        else if (!q.nav && again('dock', 4)) { const n0 = await j('window.__log.length'); await press('dock'); await t.run(1500); const hub = await j(`game.scene.isActive('CampHub')`); say(clock, 'U, Dock: ' + (hub ? 'the dock room: ' + (await shown()).join(' | ').slice(0, 300) : (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 200))); await snap('dock'); if (hub) { await key('Escape'); await t.run(1200); sold = true; } }
      }
    }
    if (MISSION === 3) {
      if (!did.escort && clock > 6) { did.escort = true; const n0 = await j('window.__log.length'); await press('escort'); await t.run(300); say(clock, 'escorts to the convoy (Q, Escorts, Escort the convoy): ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 160)); }
      if (!q.nav && clock % 5 === 0) await press('goal'); // the cruiser on the autopilot beside the convoy
      if (live.indexOf(0) >= 0 && again('w0', 9)) await send(clock, 'red', 0); // the probe at the lead hauler: red forward
      if (live.indexOf(1) >= 0) {
        if (!did.tuck && q.boats) { did.tuck = true; const n0 = await j('window.__log.length'); await press('ctuck'); await t.run(300); say(clock, 'a torpedo boat: Q, Convoy, Tuck in: ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 200)); await snap('tuck'); }
        if (q.boats && again('w1b', 9)) await send(clock, 'yellow', 1, 'tboat');
        if (again('w1s', 9)) await send(clock, 'red', 1, 'skiff');
      }
      if (did.tuck && !did.carry && (cleared[1] || (seen[1] && !q.boats && q.waves[1].live === 0))) { did.carry = true; const n0 = await j('window.__log.length'); await press('ccarry'); await t.run(300); say(clock, 'the boat is gone: Carry on: ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 200)); }
      if (live.indexOf(2) >= 0 && again('w2', 9)) await send(clock, 'green', 2); // the raid on the last hauler: green goes back to her
      if (live.indexOf(3) >= 0 && again('w3', 9)) { await send(clock, 'red', 3); if (!did.y3) { did.y3 = true; await send(clock, 'yellow', 3); } } // the front again: red and yellow
      if (live.indexOf(4) >= 0 && again('w4', 9)) await send(clock, 'green', 4); // the back again: green
      if (live.indexOf(5) >= 0) {
        if (!did.contact) { did.contact = true; await key(K.shields); await key(K.shields); say(clock, 'first contact: two pips to the shields (J J), every squad at them (W, Attack)'); await snap('contact'); }
        if (again('w5', 9)) await send(clock, 'all', 5);
        if (q.missiles > 0 && again('msl', 12) && (await aim(5, 'gunship'))) { if (await press('missile')) say(clock, 'a missile at a gunship (Enter)'); }
        if (q.shield < 30 && !did.emer) { did.emer = true; const n0 = await j('window.__log.length'); await press('emergency'); await t.run(200); say(clock, 'the shield is down: O, Emergency shields: ' + (await toasts(n0)).filter(x => /TOAST/.test(x)).join(' | ').slice(0, 160)); }
      }
      if (!live.length && !q.any) { // a quiet stretch of road: hurt squads home to be mended, then out again; the rest guard the cruiser
        for (const k of ['red', 'green', 'yellow']) if (q.sq[k].hurt && q.sq[k].order !== 'recall' && again('rc' + k, 30)) { await press(k + 'recall'); recallAt = clock; say(clock, `${k} squad has ${q.sq[k].hurt} hurt of ${q.sq[k].n}: recalled to be mended`); }
        if (recallAt > 0 && clock - recallAt >= 12 && q.bay > 0 && again('relaunch', 10)) { await press('launch'); say(clock, `launch again (${q.bay} in the bay)`); }
      }
    }
    return true;
  };
  if (IDLE) { note(`idle for ${IDLE} s: nothing pressed (what the hints say to a player who has not acted)`); for (let i = 0; i < IDLE; i++) { await t.run(1000); if (i % 30 === 29) await snap('idle-' + (i + 1)); } note('HUD after the idle: ' + (await hud()).join(' | ').slice(0, 700)); }
  if (DOCK0) {
    await t.run(1500); const t1 = await j(`${S}.camp.t`); await press('dock'); await t.run(1500);
    const hub = await j(`game.scene.isActive('CampHub')`); note('the dock row at the start: hub ' + hub + (hub ? ' | ' + (await shown()).join(' | ').slice(0, 700) : ' | ' + (await toasts()).slice(-2).join(' || '))); await snap('dock0-1');
    if (hub) { for (const d of ['Digit2', 'Digit3']) { await key(d); await t.run(500); note('page ' + d + ': ' + (await shown()).join(' | ').slice(0, 500)); } await snap('dock0-2'); await key('Escape'); await t.run(1500); }
    note('after leaving: ' + JSON.stringify(await state()) + ' (the battle clock was ' + Math.round(t1 / 1000) + ' s at the dock order); ' + (await toasts()).slice(-2).join(' || '));
  }
  if (!NOLAUNCH) { await press('launch'); await t.run(900); } else note('--nolaunch: nothing is pressed at all (the wing stays in the bay, the cruiser where it is)');
  await t.run(4000); if (MISSION !== 2 && !NOLAUNCH) await press('goal'); await t.run(600); note('autopilot: ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 200)) + ' state ' + JSON.stringify(await state()));
  const t0 = Date.now();
  for (let s = 0; s < SECS; s++) {
    if (!(await step())) break;
    await t.run(1000);
    if (s % 30 === 29) { const q = await state(); note(`t+${s + 1}: ` + JSON.stringify(q)); }
    if (s % 60 === 59) await snap('flight-' + (s + 1));
    if (Date.now() - t0 > 270000) { note('(wall clock: stopping the walk at 4.5 minutes; run again for the rest)'); break; }
  }
  await up(K.fire);
  note('LOG:\n' + (await toasts()).join('\n').replace(/^.*EVENT \{"type":"(launch|spawn|wingorder)".*\n/gm, ''));
  const st = await state(); note('state: ' + JSON.stringify(st)); await snap('9-end');
  const over = await settle(`${S}.mode === 'debrief' || ${S}.mode === 'lost'`, 80); const mode = await j(`${S}.mode`);
  check(ENDING === 'win' ? 'the mission was won by play (the debrief is up)' : 'the mission was lost (the lost card is up)', over && mode === (ENDING === 'win' ? 'debrief' : 'lost'), JSON.stringify(st));
  if (over) {
    note(`${mode} card: ` + await card()); await snap('10-' + mode);
    if (mode === 'debrief') {
      for (let i = 0; i < 6 && (await j(`game.scene.isActive('Campaign')`)); i++) { const mm = await j(`${S}.mode`); if (mm === 'refit' || mm === 'pick') { await key('Digit1'); await t.run(300); } await key('Enter'); await t.run(1200); const m = await j(`${S}.mode`); if (await j(`game.scene.isActive('Campaign')`)) { note('card ' + (i + 1) + ' (mode ' + m + '): ' + (await card()).slice(0, 500)); await snap('11-card-' + (i + 1)); } }
      note('then the scene is ' + await j(`['CampHub', 'Campaign', 'Title'].filter(k => game.scene.isActive(k)).join()`));
      if (await j(`game.scene.isActive('CampHub')`)) { await t.run(900); note('the ready room after the win: ' + (await shown()).join(' | ').slice(0, 700)); await snap('12-room'); }
      note('save: ' + JSON.stringify(await j(`(() => { const v = JSON.parse(localStorage.getItem('longhaul.campaign')); return { level: v.level, mission: v.mission, results: v.results, ore: v.ore }; })()`)));
    } else {
      await key('Enter'); await t.run(1500);
      note('after Enter on the lost card: scene ' + await j(`['CampHub', 'Campaign', 'Title', 'CampWarp'].filter(k => game.scene.isActive(k)).join()`) + ' mode ' + await j(`${S}.mode`));
      for (let i = 0; i < 3 && (await j(`${S}.mode`)) !== 'play'; i++) { note('retry card: ' + await card()); await snap('11-retry-' + i); await key('Enter'); await t.run(900); }
      check('the mission is flown again, in play, from its start', (await j(`${S}.mode`)) === 'play' && (await j(`Math.round(campMissionClock(${S}.camp))`)) < 5, JSON.stringify(await state()));
      await t.run(900); note('HUD after the retry: ' + (await hud()).join(' | ').slice(0, 500));
      const n0 = await j('window.__log.length'); for (let i = 0; i < 75; i++) await t.run(1000); // the retry flown by nobody for 75 s: what is left over from the lost try, and what the new one says by itself
      note('the retry, 75 s on its own: ' + JSON.stringify(await state()) + ' route ' + JSON.stringify(await j(`${S}.camp.route && { lane: ${S}.camp.route.lane, pick: ${S}.camp.route.pick, holding: !!campRouteHolding(${S}.camp) }`)) + '\n' + (await toasts(n0)).filter(x => !/EVENT/.test(x)).join('\n'));
      await snap('11-retry-75');
      await key('Escape'); await t.run(500); note('pause card: ' + await card()); await snap('12-pause'); await key('Escape'); await t.run(300);
    }
  }
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack || e)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nPACING WALK ${TAG} FAIL (${bad})` : `\nPACING WALK ${TAG} DONE`);
process.exit(bad ? 1 : 0);

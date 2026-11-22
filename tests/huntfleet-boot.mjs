// not in the smoke: Level 1 flown start to finish as a player, in the real game (one Chrome, muted, through the test lock; card space-game-hunt-l1-fleet)
// It boots the Campaign with a save that stands at the mission, reads the ready room and the three briefing screens, launches, and then PLAYS with real key events: the wing out, the cruiser on the
// autopilot beside the convoy, the pilots' calls answered by a style, the fork scouted and picked, convoy orders, power moved in the rival's phases, missiles, the map zoomed all the way out.
// Every key comes from the key table (CAMP_PANELS for the panels and their rows, the Campaign group of CONTROLS for the rest), never a letter of its own, so the walk survives a remap of the keys.
//   node tests/huntfleet-boot.mjs --mission 1 [--ending win|lose] [--calls right|wrong|none|mix] [--secs 420] [--lane short|long] [--nobrief] [--idle 90] [--noscout] [--killleader] [--dock0]
// --dock0: the first thing a player does is dock at the base the HUD offers (SHIP, Dock), read the ready room's pages (build, repair), and undock
// --noscout: the lanes are not scouted (the ambush is a surprise); --killleader: the cruiser goes at the pirate leader (the map, Enter) and fires, for the kill and its bonus
// --idle N: a new player who does nothing for N seconds (the hints, the radio and the beats say what they say when nobody has acted yet), then the walk goes on
// --ending lose: the transport (1.1) or the haulers (1.3) or the cruiser (1.2) is let go: no fighting, no orders after the launch, then the lost card, Enter (the mission again), the pause card
// --calls: how a call is answered: right (the type's right pick), wrong (a wrong pick), none (never: the cautious pick says itself), mix (right, wrong, none, in turn)
// Pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/fleet-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const MISSION = Number(arg('mission', 1)), SECS = Number(arg('secs', 420)), ENDING = String(arg('ending', 'win')), CALLS = String(arg('calls', 'mix')), LANE = String(arg('lane', 'short')), NOBRIEF = process.argv.includes('--nobrief'), IDLE = Number(arg('idle', 0)), NOSCOUT = process.argv.includes('--noscout'), KILL = process.argv.includes('--killleader'), DOCK0 = process.argv.includes('--dock0');
const TAG = `${MISSION}${ENDING === 'lose' ? 'L' : 'W'}${CALLS[0]}`;
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
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `fleet-${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : Object.keys(s.slots).map(k => s.slots[k]).filter(o => o && o.text).map(o => o.text); })()`);
  const hud = () => j(`(() => { const s = ${S}; const out = []; if (s.hud) Object.keys(s.hud).forEach(k => { const o = s.hud[k]; if (o && o.text && o.visible !== false) out.push(k + '=' + String(o.text).replace(/\\n/g, ' / ')); }); return out; })()`);
  const card = () => j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`);
  const state = () => j(`({ mode: ${S}.mode, result: ${S}.camp.result, t: Math.round(${S}.camp.t / 1000), clock: Math.round(campMissionClock(${S}.camp)), obj: campObjective(${S}.camp), hull: Math.round(${S}.camp.carrier.hp), shield: Math.round(${S}.camp.shield), foes: campAliens(${S}.camp).length, wing: campWing(${S}.camp).length, x: Math.round(${S}.camp.carrier.x), y: Math.round(${S}.camp.carrier.y) })`);
  const toasts = (from = 0) => j(`window.__log.slice(${from})`);

  // ---- the key table: the code of every key the walk presses, read from the game's own tables
  // The keys come from the game's own tables and nothing else: CAMP_KEYS (the keys that are not a panel's: map, fire, zoom, the target keys), campKeyRow(id) (a row of the FLEET or SHIP panel: its code), and the Campaign group
  // of CONTROLS for V and T (scout, take a lane). A row the table does not have is said and skipped, so a remap shows up as a note, not as a wrong key.
  const codeOf = lab => /^[A-Z]$/.test(lab) ? 'Key' + lab : /^[0-9]$/.test(lab) ? 'Digit' + lab : ({ Tab: 'Tab', Space: 'Space', Enter: 'Enter', Esc: 'Escape', ';': 'Semicolon', '+': 'Equal', '-': 'Minus', '/': 'Slash', '=': 'Equal', Backspace: 'Backspace' })[lab] || null;
  const ctl = async (re, i = 0) => codeOf(await j(`(() => { const g = CONTROLS.find(g => g.id === 'campaign'); const r = g.rows.find(r => ${re}.test(r.t)); return r ? r.k[${i}] : null; })()`));
  const ck = id => j(`(typeof CAMP_KEYS === 'object' && CAMP_KEYS[${JSON.stringify(id)}]) ? CAMP_KEYS[${JSON.stringify(id)}].codes[0] : null`);
  const rk = id => j(`(typeof campKeyRow === 'function' && campKeyRow(${JSON.stringify(id)})) ? campKeyRow(${JSON.stringify(id)}).code : null`);
  const K = {}; // filled after the boot
  const press = async (id, wait = 50, mods = 0) => { const c = K.rows[id]; if (!c) { note(`(no key for the row ${id}: the table has none)`); return false; } await key(c, wait, mods); return true; };
  const convoyTo = async rx => { const c = K.rows.convoy; if (!c) { note('(no key for the convoy order row)'); return false; } for (let i = 0; i < 5; i++) { const n0 = await j('window.__log.length'); await key(c); await t.run(await j('(typeof CAMP_PANELS === "object" && CAMP_PANELS.settle) || 0') + 300); const said = (await toasts(n0)).join(' | '); if (rx.test(said)) { check('the convoy key gave ' + rx, true, 'after ' + (i + 1) + ' press(es)'); return true; } } check('the convoy key gave ' + rx, false, 'five presses, each rested, and the order never said it'); return false; }; // a CYCLING key gives its order only after it has rested CAMP_PANELS.settle ms (0.7 s): one press, wait for the rest and a margin, read what was said; press again only if it was another order (the cycle's next)

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let m = 1; m < MISSION; m++) results['1.' + m] = res;
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: 1, mission: MISSION - 1, techs: [], ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  K.title = await ctl(/Title, from the pause/); K.map = await ck('map'); K.fire = await ck('fire'); K.next = await ck('next'); K.last = await ck('last'); K.near = await ck('near'); K.clear = await ck('clear'); K.minus = await ck('zoomout'); K.zero = await ck('zoomreset');
  K.scout = await ctl(/V scouts/, 0); K.take = await ctl(/V scouts/, 1);
  K.rows = {}; for (const id of ['launch', 'attack', 'escort', 'guard', 'mine', 'convoy', 'goal', 'target', 'burn', 'dock', 'shields', 'engines', 'weapons', 'balance', 'emergency', 'missile']) K.rows[id] = await rk(id);
  K.listDown = K.next; K.shields = K.rows.shields; K.engines = K.rows.engines; K.weapons = K.rows.weapons; K.even = K.rows.balance; K.missile = K.rows.missile;
  note('keys from the table: ' + JSON.stringify(K));
  check('every key the walk needs is in the key table', ['title', 'map', 'fire', 'next', 'near', 'minus', 'zero', 'scout', 'take'].every(k => K[k]) && ['launch', 'attack', 'escort', 'mine', 'convoy', 'goal', 'dock', 'shields', 'engines', 'weapons', 'balance', 'missile'].every(k => K.rows[k]), JSON.stringify(Object.keys(K).filter(k => !K[k]).concat(Object.keys(K.rows).filter(k => !K.rows[k]))));
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
    const e0 = sc.onEvent; sc.onEvent = function (e) { try { if (e.type === 'call') put('CALL ' + JSON.stringify(e)); else if (!/^(shot|hit|fx|spark|boom|trail|laser|beam|puff|splash)/.test(e.type)) put('EVENT ' + JSON.stringify(e).slice(0, 160)); } catch (x) { /* the log only */ } return e0.apply(this, arguments); };
    return 1; })()`);
  await t.run(900); await snap('5-flight'); note('HUD at the start: ' + (await hud()).join(' | ').slice(0, 800)); note('state: ' + JSON.stringify(await state()));

  // ---- the player
  const callRows = () => j(`campCallView(${S}.camp)`);
  let callN = 0; const picks = { right: null, wrong: null };
  const answer = async v => { // the pick by style: right = a pick the table rates good, wrong = one it rates bad, none = wait for the pilot's own
    const style = CALLS === 'mix' ? ['right', 'wrong', 'none'][callN % 3] : CALLS; callN++;
    const R = await j(`CAMP_CALL_RATE[${JSON.stringify(v.id)}] || null`);
    let n = 0;
    if (style === 'right') n = R && R.good.length ? R.good[0] + 1 : 0; else if (style === 'wrong') n = R && R.bad.length ? R.bad[0] + 1 : 0;
    note(`call ${v.id} at ${await j(`Math.round(${S}.camp.t / 1000)`)} s, ${style} (${JSON.stringify(v.rows.map(r => r.n + ':' + r.pick))}, cautious ${v.def}) -> ${n || 'no answer'}`); await snap('call-' + callN + '-' + v.id);
    if (n) await key('Digit' + n);
  };
  const lanes = () => j(`campNavRows(${S}.camp).filter(r => r.kind === 'lane').map(r => ({ id: r.id, name: r.name }))`);
  const mapDo = async (rowId, code, what) => { // the map by its keys: open it, move the list to the row (W S from the table), press the key (V scouts, T takes), close it
    await key(K.map); await t.run(300);
    for (let i = 0; i < 60 && (await j(`${S}.mp && ${S}.mp.selId`)) !== rowId; i++) await key(K.listDown);
    const at = await j(`${S}.mp && ${S}.mp.selId`); if (at !== rowId) note(`(${what}: the list would not go to ${rowId}; it stands on ${at})`);
    await key(code, 80); await t.run(300); await key(K.map); await t.run(200);
  };
  let scouted = false, took = false, tucked = false, ran = false, zoomed = false, rivalSeen = {}, lastCall = '', ordered = {};
  const POLICY = ENDING === 'win';
  const foeRows = () => j(`(() => { const C = ${S}.camp, A = campAliens(C); return campNavRows(C).filter(r => A.some(u => u.id === r.ref)).map(r => ({ id: r.id, d: Math.round(campDist(C.carrier, A.find(u => u.id === r.ref))) })).sort((a, b) => a.d - b.d); })()`);
  let docked = false, mineAt = -99, flewAt = -99, sold = false;
  const step = async () => {
    const C = `${S}.camp`; if (await j(`${C}.result || ${S}.mode !== 'play'`)) return false;
    const v = await callRows(); if (v && lastCall !== v.id + '@' + (await j(`${C}.call.n`))) { lastCall = v.id + '@' + (await j(`${C}.call.n`)); await answer(v); }
    if (!POLICY) {
      if (MISSION === 2 && !ordered.kill && (await j(`Math.round(campMissionClock(${C}))`)) >= 200) { ordered.kill = true; note('1.2 is not lost by standing still (the rules: only the cruiser dying loses it): the cruiser is destroyed at 200 s'); await t.ev(`(() => { const C = ${C}; campHurt(C, C.carrier, 99999, 'pirate-0'); return 1; })()`); }
      return true;
    }
    const clock = await j(`Math.round(campMissionClock(${C}))`);
    const foes = await j(`campAliens(${C}).filter(u => Math.hypot(u.x - ${C}.carrier.x, u.y - ${C}.carrier.y) < 900).length`), any = await j(`campAliens(${C}).length`);
    await (foes ? down(K.fire) : up(K.fire));
    if (foes && clock % 10 === 0) { await key(K.near); await press('attack'); } // S: the nearest threat is the target, then the fighters go at it
    if (foes && clock % 11 === 0) { await key(K.near); await press('missile'); }
    if (MISSION !== 2) {
      if (!foes && !ordered.escort && clock > 6) { ordered.escort = true; await press('escort'); }
      if (!(await j(`!!(${C}.nav && ${C}.nav.on)`)) && clock % 5 === 0 && !(await j(`!!(${C}.route && campRouteHolding(${C}))`))) await press('goal'); // the autopilot to the goal (the convoy) when it lets go
    }
    // 1.1: the fork (a scout down each lane, then the pick), the convoy orders, the rival's phases
    if (MISSION === 1) {
      const L = await lanes();
      if (!scouted && !NOSCOUT && clock >= 8 && L.length) { scouted = true; for (const l of L) { note(`scout the ${l.name} (V on the map) at ${clock} s`); await mapDo(l.id, K.scout, 'scout'); } await snap('fork-scouts'); }
      const hold = await j(`campRouteHolding(${C})`);
      if (hold && !took) { took = true; const want = L.find(l => new RegExp(LANE, 'i').test(l.name)) || L[0]; note(`the transport holds at the fork (${JSON.stringify(hold)}); known: ${await j(`JSON.stringify(${C}.route.known)`)}; taking the ${want.name} (T on the map)`); await snap('fork-hold'); await mapDo(want.id, K.take, 'take'); await snap('fork-taken'); }
      const tb = await j(`campAliens(${C}).filter(u => u.kind === 'tboat').length`), ld = await j(`!!campRivalOf(${C}, 'leader')`);
      if (tb && !tucked) { tucked = true; note('torpedo boats out: Tuck in (the convoy key steps through the orders)'); await convoyTo(/tuck in/i); await snap('tuck'); }
      if (!tb && tucked && !ld && !ordered.carry) { ordered.carry = true; note('torpedo boats gone: Carry on (the convoy key steps through the orders)'); await convoyTo(/carry on/i); }
      if (ld && KILL && clock - (ordered.chase || -99) >= 8) { ordered.chase = clock; const row = await j(`(() => { const u = campRivalOf(${C}, 'leader'); const r = campNavRows(${C}).find(r => r.ref === u.id); return r ? { id: r.id, d: Math.round(campDist(${C}.carrier, u)) } : null; })()`); if (row) { note(`the cruiser goes at the leader (${row.id}, ${row.d} px) at ${clock} s`); await mapDo(row.id, 'Enter', 'fly to the leader'); } }
      if (ld && !ran) { ran = true; note('the leader is out: Run for it (the convoy key steps through the orders)'); await convoyTo(/run for it/i); await snap('run-for-it'); }
      if (ld) { const ph = await j(`campRivalOf(${C}, 'leader').rival.ph`); if (rivalSeen.cur !== ph) { rivalSeen.cur = ph; note(`rival phase ${ph} at ${clock} s: ${JSON.stringify(await j(`({ hull: Math.round(campRivalOf(${C}, 'leader').hp), shield: Math.round(campRivalOf(${C}, 'leader').rival.sh || 0), me: Math.round(${C}.carrier.hp), mine: Math.round(${C}.shield), power: ${C}.power.p })`))}`); await snap('rival-' + ph);
        const pick = { charge: K.shields, down: K.weapons, ram: K.engines, run: K.engines, stalk: K.even }[ph]; if (pick) { await key(pick); await key(pick); } } }
    }
    // 1.2: the wing mines; the cruiser goes to the raiders; when the ore is in and the raids are beaten, dock at the Works to sell
    if (MISSION === 2) {
      const ore = await j(`Math.floor(${C}.ore)`), best = await j(`Math.floor(${C}.oreBest)`);
      if (!ordered.mine || (!any && clock - mineAt >= 25 && ore < 450)) { ordered.mine = true; mineAt = clock; note(`Mine ore (FLEET) at ${clock} s: ore ${ore}`); await press('mine'); }
      if (any && !foes && clock - flewAt >= 9) { flewAt = clock; const R = await foeRows(); if (R.length) { note(`raiders at ${R[0].d} px: the cruiser goes to ${R[0].id} (the map, Enter) at ${clock} s`); await mapDo(R[0].id, 'Enter', 'fly to the raiders'); } }
      if (!any && best >= 190 && !sold && (await j(`${C}.waves.every(w => w && w.started)`))) {
        if (!ordered.dock) { ordered.dock = true; note(`ore ${ore}: the goal is now "${await j(`campObjective(${C})`)}": fly there (the goal row) at ${clock} s`); await press('goal'); await t.run(600); }
        else if (!(await j(`!!(${C}.nav && ${C}.nav.on)`)) && clock - (ordered.dockTry || 0) >= 4) {
          ordered.dockTry = clock; note(`dock at the Works (the dock row) at ${clock} s, ${await j(`Math.round(campDist(${C}.carrier, campOutposts(${C}.level).find(o => o.id === 'ceres'))) `)} px away`); await snap('dock-0'); await press('dock'); await t.run(1500);
          const hub = await j(`game.scene.isActive('CampHub')`); note('after the dock order: hub ' + hub + (hub ? ' | ' + (await shown()).join(' | ').slice(0, 600) : ' | ' + (await toasts()).slice(-2).join(' || '))); await snap('dock-1');
          if (hub) { await key('Escape'); await t.run(1200); sold = true; note('after Esc: ' + JSON.stringify(await state()) + ' ore ' + await j(`Math.floor(${C}.ore)`) + ' sold ' + await j(`${C}.sold`)); }
        }
      }
    }
    if (!zoomed && clock > 90) { zoomed = true; note('the map, all the way out (minus from the table)'); await key(K.map); await t.run(300); for (let i = 0; i < 14; i++) await key(K.minus, 40); await t.run(300); await snap('map-out'); note('map zoom ' + await j(`JSON.stringify(${S}.mp && ${S}.mp.z)`)); await key(K.zero); await key(K.map); await t.run(200); }
    return true;
  };
  if (IDLE) { note(`idle for ${IDLE} s: nothing pressed (what the hints say to a player who has not acted)`); for (let i = 0; i < IDLE; i++) { await t.run(1000); if (i % 30 === 29) await snap('idle-' + (i + 1)); } note('HUD after the idle: ' + (await hud()).join(' | ').slice(0, 700)); }
  if (DOCK0) {
    await t.run(1500); const t1 = await j(`${S}.camp.t`); await press('dock'); await t.run(1500);
    const hub = await j(`game.scene.isActive('CampHub')`); note('E 4 at the start: hub ' + hub + (hub ? ' | ' + (await shown()).join(' | ').slice(0, 700) : ' | ' + (await toasts()).slice(-2).join(' || '))); await snap('dock0-1');
    if (hub) { for (const d of ['Digit2', 'Digit3']) { await key(d); await t.run(500); note('page ' + d + ': ' + (await shown()).join(' | ').slice(0, 500)); } await snap('dock0-2'); await key('Escape'); await t.run(1500); }
    note('after leaving: ' + JSON.stringify(await state()) + ' (the battle clock was ' + Math.round(t1 / 1000) + ' s at the dock order); ' + (await toasts()).slice(-2).join(' || '));
  }
  await press('launch'); await t.run(900);
  await t.run(4000); if (MISSION !== 2) await press('goal'); await t.run(600); note('autopilot: ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 200)) + ' state ' + JSON.stringify(await state()));
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
      note('the retry, 75 s on its own: ' + JSON.stringify(await state()) + ' call ' + JSON.stringify(await j(`${S}.camp.call && { n: ${S}.camp.call.n, open: !!${S}.camp.call.open }`)) + ' route ' + JSON.stringify(await j(`${S}.camp.route && { lane: ${S}.camp.route.lane, pick: ${S}.camp.route.pick, holding: !!campRouteHolding(${S}.camp) }`)) + '\n' + (await toasts(n0)).filter(x => !/EVENT/.test(x)).join('\n'));
      await snap('11-retry-75');
      await key('Escape'); await t.run(500); note('pause card: ' + await card()); await snap('12-pause'); await key('Escape'); await t.run(300);
    }
  }
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack || e)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nFLEET WALK ${TAG} FAIL (${bad})` : `\nFLEET WALK ${TAG} DONE`);
process.exit(bad ? 1 : 0);

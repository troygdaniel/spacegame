// smoke: the Campaign's radio chatter: fixed short lines from the wing, quiet by default, never over the ship's computer (plain Node, no Chrome)
// Card space-game-campaign-chatter (Troy: yes to radio chatter from the fighters, the X-Wing wingman feel). src/campchatter.js is the whole decision, in plain numbers: which sim
// event is a call (a kill, a hit on a wing ship, an order, a wave, the magazine running low, ore), which pilot says which line, and when the radio is quiet. The scene shows the line
// beside the strip and says it with voiceSay (prio 0: it never waits behind, and never talks over, the ship's computer or a warning). Checks:
//   A  the words: content/text/chatter.md (ui.md is at its row limit), fixed lines (no number, no placeholder), about 6 words, equal to the code table; every call has its lines
//   B  the pilots: a few callsigns, each an Aura voice that is not the computer's (any it can be set to) nor a bar character's
//   C  which sim events are calls (and which are not: the carrier's own hits and the computer's warnings are not the wing's to call)
//   D  the radio: Quiet (the default) is one line in 8 s and the same kind of call not twice in 24 s; On is livelier; Off is silent; the setting is kept in this browser
//   E  never over the computer: its line holds the radio for 2.5 s, a line that is playing blocks it, and a call that is due when it cannot be said is dropped, not queued
//   F  the pilots rotate and a line is not repeated at once; what is said is one voiceSay of prio 0 in the pilot's own voice
//   G  the wiring: the script is in index.html, the scene feeds it and shows it beside the strip, Settings > Sound has the Chatter row; no key, number or content row of ui.md changed
// Run: node tests/campchatter.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } }; // a file that is not there yet reads as empty: the checks fail, the test does not crash
const words = s => String(s).split(/\s+/).filter(Boolean).length;

// ---- A: the words ----
const file = read('content/text/chatter.md');
const rows = file.split('\n').map(l => /^\|\s*(camp\.chat\.[a-z]+\.\d+)\s*\|\s*(.*?)\s*\|\s*$/.exec(l)).filter(Boolean).map(m => [m[1], m[2]]);
try {
  check('A  the lines are in content/text/chatter.md (a file of their own: ui.md is at its row limit)', rows.length >= 24, rows.length);
  const over = rows.filter(([, t]) => words(t) > 6 || /[0-9{}]/.test(t)).map(([k, t]) => k + ': ' + t);
  check('A  every line is 6 words or fewer, with no number and no placeholder (a fixed line can be recorded once)', over.length === 0, over.join(' | '));
  const ev = J('Object.keys(CHATTER.events)');
  const lack = ev.filter(e => !rows.some(([k]) => k.startsWith('camp.chat.' + e + '.')));
  check(`A  every call has its lines (${ev.length} calls)`, ev.length >= 9 && lack.length === 0, lack.join(','));
  const few = ['splash', 'hit', 'copy'].filter(e => rows.filter(([k]) => k.startsWith('camp.chat.' + e + '.')).length < 3);
  check('A  the calls said most often have at least three lines each', few.length === 0, few.join(','));
  const inCode = rows.filter(([k, t]) => J(`uiText(${JSON.stringify(k)})`) !== t);
  check('A  the code table (UI_TEXT in src/contenttables.js) says the same words as the file', inCode.length === 0, inCode.map(r => r[0]).join(','));
  const ui = read('content/text/ui.md').split('\n').filter(l => /^\| [\w.-]+ \|/.test(l)).length;
  check('A  ui.md has not grown (it is at its 200-row limit)', ui <= 199, ui);
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- B: the pilots ----
try {
  const P = J('CHATTER.pilots'), choices = J('VOICE_CHOICES.map(v => v[0])'), npc = J('NPCS.map(x => x.voice)');
  check('B  a few pilots, each with a callsign and an Aura voice name', P.length >= 3 && P.length <= 6 && P.every(p => /^[A-Z]{3,6}$/.test(p[0]) && /^aura(-2)?-[a-z]{3,12}-en$/.test(p[1])), JSON.stringify(P));
  check('B  the callsigns and the voices are all different', new Set(P.map(p => p[0])).size === P.length && new Set(P.map(p => p[1])).size === P.length);
  check('B  no pilot has a voice the ship computer can be set to, or a bar character\'s', P.every(p => !choices.includes(p[1]) && !npc.includes(p[1])), JSON.stringify([choices, npc]));
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- C: which sim events are calls ----
g.run(`window.__C = { missiles: 5, ships: [
  { id: 'carrier', team: 'earth', kind: 'carrier' }, { id: 'f1', team: 'earth', kind: 'fighter' }, { id: 'e1', team: 'earth', kind: 'fighter' },
  { id: 'a1', team: 'alien', kind: 'drone' }, { id: 'm1', team: 'alien', kind: 'mother' }, { id: 'v1', team: 'earth', kind: 'freighter' } ] };`);
const ev = e => J(`chatterEventOf(__C, ${JSON.stringify(e)})`);
try {
  check('C  an alien that blows up is a splash', ev({ type: 'boom', id: 'a1', kind: 'drone' }) === 'splash');
  check('C  the mothership blowing up is a splash too, the carrier or Earth\'s own ship is not', ev({ type: 'boom', id: 'm1', kind: 'mother' }) === 'splash' && ev({ type: 'boom', id: 'carrier', kind: 'carrier' }) === null && ev({ type: 'boom', id: 'f1', kind: 'fighter' }) === null);
  check('C  a hit on a wing ship is "taking fire"; a hit on the carrier (the computer warns) or on an alien is not', ev({ type: 'hit', id: 'f1' }) === 'hit' && ev({ type: 'hit', id: 'e1' }) === 'hit' && ev({ type: 'hit', id: 'carrier' }) === null && ev({ type: 'hit', id: 'a1' }) === null && ev({ type: 'hit', id: 'zz' }) === null);
  const say = k => ev({ type: 'say', key: k, vars: {} });
  const O = (a, b) => J(`chatterOrderDiff(${JSON.stringify(a)}, ${JSON.stringify(b)})`), z = { launch: 0, attack: 0, escort: 0, guard: 0, recall: 0, missiles: 0, mine: 0, recharge: 0, build: 0 };
  check('C  an order carried out (launch, attack, escort, guard) is answered with a copy; the recall with "going home"', ['launch', 'attack', 'escort', 'guard'].every(k => JSON.stringify(O(z, { ...z, [k]: 1 })) === '["copy"]') && JSON.stringify(O(z, { ...z, recall: 2 })) === '["home"]');
  check('C  the fire, mine, recharge and build orders, no change, and a first look are not calls', ['missiles', 'mine', 'recharge', 'build'].every(k => O(z, { ...z, [k]: 3 }).length === 0) && O(z, z).length === 0 && O(null, z).length === 0);
  check('C  the computer\'s own order lines are not sim events, so they are not calls here (the order counters are)', say('camp.say.launch') === null && say('camp.say.recall') === null);
  check('C  a wave coming is a contact; the mothership jumping in has its own call', ['wave1', 'wave2', 'l2wave1', 'l2wave2', 'l3wave1', 'l3wave2', 'l3wave3'].every(k => say('camp.say.' + k) === 'contact') && say('camp.say.wave3') === 'mother' && say('camp.say.ambush') === 'contact' && say('camp.say.bwave2') === 'contact' && say('camp.say.bwave3') === 'mother' && say('camp.say.ambush2') === null);
  check('C  the story: the relic answering, the convoy through, a cache gathered', say('camp.say.relicon') === 'relic' && say('camp.say.delivered') === 'convoy' && say('camp.say.cache') === 'cache');
  check('C  the computer\'s own warnings are not calls', ['earthhalf', 'earthlow', 'hullhalf', 'hulllow', 'mine', 'recharge', 'missiles'].every(k => say('camp.say.' + k) === null));
  check('C  a missile fired with one or none left is "low on missiles"; with more it is not', (g.run('__C.missiles = 1'), ev({ type: 'missile' })) === 'lowmissiles' && (g.run('__C.missiles = 0'), ev({ type: 'missile' })) === 'lowmissiles' && (g.run('__C.missiles = 4'), ev({ type: 'missile' })) === null);
  check('C  ore picked up is a call; the sounds and the flashes are not', ev({ type: 'ore', n: 3 }) === 'ore' && ['turret', 'launch', 'dock', 'blink', 'mboom', 'earthhit', 'shieldhit', 'recharge'].every(t => ev({ type: t }) === null));
  // card space-game-b14-c19-ore-lines-quiet (BRIEF 14 chunk 19, Troy 27 Nov 2026): the ore lines stay off the radio while a hostile is in sight (dropped, not held)
  g.run(`window.__C2 = campNew(1, ['shield'], { seed: 4, mission: 1 }); __C2.arrivedAt = 0; __C2.ships = __C2.ships.filter(u => u.team !== 'alien'); window.__R = campSpawn(__C2, 'raider', __C2.carrier.x + CAMP.sensor.range * 3, __C2.carrier.y); __R.vx = __R.vy = 0;`);
  const ev2 = () => J(`chatterEventOf(__C2, { type: 'ore', n: 20 })`);
  check('C  ore with no hostile alive is a call; with one alive but far beyond the sensors (not seen) it still is', (g.run(`__C2.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; })`), ev2()) === 'ore' && (g.run(`__R.hp = __R.maxHp || 10`), J(`campSeen(__C2, __R)`)) === false && ev2() === 'ore');
  check('C  ore with a hostile in sight (within the cruiser\'s sensor range) is NOT a call: "Ore secured." and "Ore aboard." are dropped while it lives, and come again when it is gone', (g.run(`__R.x = __C2.carrier.x + CAMP.sensor.range * 0.5; __R.y = __C2.carrier.y`), J(`campSeen(__C2, __R)`)) === true && ev2() === null && (g.run(`__R.hp = 0`), ev2()) === 'ore');
  check('C  a tower or the mothership (the kinds always seen: 3.3 with seven towers alive) counts as in sight at any distance', (g.run(`window.__T = campSpawn(__C2, 'tower', __C2.carrier.x + CAMP.sensor.range * 9, __C2.carrier.y); __T.vx = __T.vy = 0`), J(`campSeen(__C2, __T)`)) === true && ev2() === null && (g.run(`__T.hp = 0`), ev2()) === 'ore');
  check('C  the other calls are as they were while a hostile is in sight: a kill is still a splash, a hit on the wing still taking fire', (g.run(`__R.hp = 10; __R.x = __C2.carrier.x + 300`), J(`chatterEventOf(__C2, { type: 'boom', id: 'x', kind: 'raider' })`)) === 'splash');
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- D: the radio ----
const push = (e, t) => J(`chatterPush(__S, ${JSON.stringify(e)}, ${t})`);
const tick = (t, busy) => J(`chatterTick(__S, ${t}, ${!!busy})`);
const said1 = (e, t) => { push(e, t); return tick(t + J(`CHATTER.events.${e}.delay`)); }; // a call, and the line when it falls due
try {
  check('D  the setting is Quiet until the player picks another', J('CHATTER.mode') === 'quiet' && J('chatterMode()') === 'quiet');
  g.run('window.__S = chatterNew(); CHATTER.mode = "quiet"');
  check('D  Quiet: a call is taken, and said when it is due (a short beat later)', J('CHATTER.events.splash.delay') > 0 && push('splash', 1000) === true && tick(1000) === null && tick(1000 + J('CHATTER.events.splash.delay')) !== null);
  g.run('window.__S = chatterNew()'); said1('splash', 0);
  check('D  Quiet: another call 5 s after a line is dropped (one line in 8 s)', push('hit', 5000) === false);
  check('D  Quiet: 8 s after a line a call is taken', push('hit', 8500) === true);
  g.run('window.__S = chatterNew()'); said1('splash', 0);
  check('D  Quiet: the same kind of call is not made twice in 24 s even when the 8 s are over', push('splash', 9000) === false && push('splash', 24100) === true);
  g.run('window.__S = chatterNew()'); push('splash', 0);
  check('D  one at a time: a call made while another waits for its beat is dropped, not queued behind', push('hit', 100) === false && J('__S.q.length') === 1);
  g.run('CHATTER.mode = "on"; window.__S = chatterNew()'); said1('splash', 0);
  check('D  On: a call 3 s after a line is taken', push('hit', 4100) === true);
  tick(4300);
  check('D  On: the same kind of call again within 10 s is not taken, and after 10 s it is', push('splash', 6000) === false && push('splash', 10100) === true);
  g.run('CHATTER.mode = "off"; window.__S = chatterNew()');
  check('D  Off: nothing is taken, nothing is said', push('splash', 0) === false && tick(99999) === null);
  g.run('chatterSetMode("on")');
  check('D  the setting is kept in this browser (longhaul.chatter) and read back by a reload', store.get('longhaul.chatter') === 'on' && J('(CHATTER.mode = "quiet", CHATTER.loaded = false, chatterMode())') === 'on');
  store.set('longhaul.chatter', 'loud'); g.run('CHATTER.loaded = false');
  check('D  an unknown stored value is Quiet', J('chatterMode()') === 'quiet');
  g.run('chatterSetMode("shout")');
  check('D  an unknown mode is refused (it stays what it was)', J('chatterMode()') === 'quiet');
  g.run('chatterSetMode("quiet")');
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- E: never over the computer ----
try {
  g.run('CHATTER.mode = "quiet"; window.__S = chatterNew()');
  g.run('chatterHold(__S, 10000)');
  push('splash', 10000); const due = 10000 + J('CHATTER.events.splash.delay');
  check('E  a call that falls due inside the 2.5 s after the computer spoke is dropped, not queued', due < 12500 && tick(due) === null && tick(13000) === null);
  check('E  and it does not use up the radio: a call right after the hold is taken', push('hit', 12600) === true);
  g.run('window.__S = chatterNew()'); push('splash', 0);
  const d = J('CHATTER.events.splash.delay');
  check('E  a line that is playing (the computer, a warning) blocks it: dropped, not queued', tick(d, true) === null && tick(d + 100, false) === null);
  check('E  the hold after the computer spoke is 2.5 s', J('CHATTER.hold') === 2500);
  check('E  a call that answers a computer line (a wave, the story, the magazine) waits until its hold is over', ['contact', 'mother', 'relic', 'convoy', 'cache', 'lowmissiles'].every(e => J(`CHATTER.events.${e}.delay`) >= 2800));
  check('E  a call that is already stale when the radio is free (the game was paused) is dropped', (g.run('window.__S = chatterNew()'), push('splash', 0), tick(60000)) === null);
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- F: the pilots and the lines ----
try {
  g.run('CHATTER.mode = "on"; window.__S = chatterNew()');
  const said = []; let t = 0;
  for (let i = 0; i < 12; i++) { t += 20000; push('splash', t); const l = tick(t + J('CHATTER.events.splash.delay')); if (l) said.push(l); }
  check('F  twelve calls make twelve lines (the radio was clear each time)', said.length === 12, said.length);
  check('F  the same pilot never speaks twice in a row', said.every((l, i) => i === 0 || l.call !== said[i - 1].call));
  check('F  all the pilots are heard, each in his own voice', new Set(said.map(l => l.call)).size === J('CHATTER.pilots.length') && said.every(l => J('CHATTER.pilots').some(p => p[0] === l.call && p[1] === l.voice)));
  check('F  the same line is never said twice in a row for one kind of call', said.every((l, i) => i === 0 || l.text !== said[i - 1].text));
  check('F  a line carries its words, its callsign and its voice, and the words are the file\'s', said.every(l => rows.some(([, tx]) => tx === l.text) && l.ev === 'splash'));
  g.run(`window.__say = []; var __vs = typeof voiceSay === 'function' ? voiceSay : null; voiceSay = (text, prio, model) => { __say.push([text, prio, model]); return true; };`);
  const l = said[0]; g.run(`chatterPlay(${JSON.stringify(l)})`);
  check('F  chatterPlay is one voiceSay: the words, prio 0 (never waits behind, never over a warning), the pilot\'s own voice', J('__say.length') === 1 && J('__say[0][0]') === l.text && J('__say[0][1]') === 0 && J('__say[0][2]') === l.voice, J('__say'));
  g.run('voiceSay = __vs');
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }

// ---- G: the wiring ----
try {
  check('G  src/campchatter.js is a script of index.html', /<script src="src\/campchatter\.js"><\/script>/.test(read('index.html')));
  const sc = read('src/campaignscene.js');
  check('G  the scene feeds every sim event to the radio and plays what is due', /chatterHear\(/.test(sc) && /chatterPush\(/.test(sc) && /chatterTick\(/.test(sc) && /chatterPlay\(/.test(sc) && /function chatterHear/.test(read('src/campchatter.js')) && /chatterEventOf\(sc\.camp, e\)/.test(read('src/campchatter.js')) && /chatterHold\(sc\.radio/.test(read('src/campchatter.js')));
  check('G  the line is shown with the callsign, bottom left beside the strip (x under 368)', /hud\.chat\b/.test(sc) && /call/.test(sc));
  const upd = sc.slice(sc.indexOf('  update(time, dt) {'));
  g.run(`window.__sc = { camp: __C, radio: chatterNew() }; chatterHear(__sc, { type: 'say', key: 'camp.say.earthhalf' }); chatterHear(__sc, { type: 'boom', id: 'a1', kind: 'drone' });`);
  check('G  chatterHear: a computer line holds the radio, a kill is a call; a scene with no radio (a test\'s stand-in) hears nothing and does not fail', J('__sc.radio.hold') > 0 && J('__sc.radio.q.length') === 1 && J('(chatterHear({}, { type: "boom", kind: "drone" }), chatterHear(null, null), 1)') === 1);
  check('G  the radio ticks only while playing (not on a card, in the pause or after the end): chatterTick sits in the play branch of update()', upd.indexOf("this.mode === 'play'") >= 0 && upd.indexOf('chatterTick(') > upd.indexOf("this.mode === 'play'") && upd.indexOf('chatterTick(') < upd.indexOf('C.events.splice(0)'));
  check('G  orders carried out are read from the counters (key, strip or map), and every sim event is fed', /chatterOrderDiff\(/.test(sc) && /chatterHear\(this, e\)/.test(sc));
  const st = read('src/settings.js');
  check('G  Settings > Sound has the Chatter row: On, Quiet, Off', /CHATTER_MODES/.test(st) && /chatterSetMode\(/.test(st) && /'CHATTER'/.test(st) && /chatter_/.test(st));
  check('G  it is kept clear of the other rows: the label sits in the free space right of EFFECTS (x 640 or more)', /bx \+ 6[4-9]\d|bx \+ 7\d\d/.test(st.split("'CHATTER'")[0].slice(-200)));
  check('G  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
} catch (e) { check('a section of the test ran without an error', false, e && e.message); }
// ---- H: where the radio line stands (card space-game-talk-over-fleet-corner put it above the FLEET corner; card space-game-keys5-corners moved all four corners to the top: the radio line has the bottom left, above the key line) ----
try {
  g.run(`window.__R = campNew(1, [], { seed: 5, mission: 0 }); __R.t = 1000;`); // a real battle state: the three pilots are out, so FLEET has rows
  const Kc = J('CAMP.corner'), spot = dx => J(`chatterSpot(__R, ${dx || 0})`), Wd = J('W'), Hd = J('H');
  const hit = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; // two rectangles share some area
  const box = (sp, lines) => ({ x: sp.x, y: sp.bottom - 23 * lines, w: 330, h: 23 * lines }); // the line's box: 330 wide (its word wrap), 23 px a line (15 px type and the 3 px stroke), standing on its bottom edge
  const closed = spot();
  check('H  the line stands at the bottom left: its left edge the margin less the stroke (x 16, the glyph at 18), its bottom edge CAMP.corner.radio (70) px up from the screen\'s bottom', closed.x === Kc.edge - Kc.ink && closed.bottom === Hd - Kc.radio && Kc.radio === 70, JSON.stringify(closed));
  check('H  it grows upward from there: a line of one, two or three rows stays above the key line (the keep rectangle from y 656) and under the stacks at the top', [1, 2, 3].every(n => { const b = box(closed, n); return b.y + b.h <= 656 && b.y > Kc.at.bl.y + Kc.title.h; }));
  const corners = () => ['tl', 'bl', 'tr'].map(c => J(`campCornerGeom('${c}', 0, 0).title`));
  g.run(`campCornerOpen(__R, 'fleet')`);
  const G = J(`campCornerGeom('bl', campCornerItemsH(campCornerNow(__R, 'fleet').items), 0)`);
  check('H  the four corners are at the top now: no row, and not the FLEET details open under its row, reaches the radio line (any length up to three rows)', corners().every(t => [1, 2, 3].every(n => !hit(box(closed, n), t))) && [1, 2, 3].every(n => !hit(box(closed, n), G.det)) && G.det.y + G.det.h < box(closed, 3).y, JSON.stringify([G, closed]));
  check('H  the cruiser list under Q CRUISER (the tallest thing the left stack has: its frame at the table\'s eleven rows, with the FLEET row slid below it) does not reach the radio line either', (() => { const row = Kc.at.tl.y + Kc.title.h + Kc.gap, list = J('CAMPPANELS_LOOK.box'), h = list.pad + (J('CAMP_PANELS.show') * (list.row + list.gap) - list.gap) + list.pad + list.foot, fleet = row + h + Kc.gap + Kc.title.h; return fleet < box(closed, 3).y; })());
  check('H  an open list on the left steps the corners right, and the line with it (the same dx)', spot(300).x === closed.x + 300 && spot(300).bottom === closed.bottom);
  check('H  a stand-in with no clock or no state does not fail (a test\'s scene): the same place', J('chatterSpot({}, 0).bottom') === closed.bottom && J('chatterSpot(null, 0).bottom') === closed.bottom);
  const sc = read('src/campaignscene.js'), upd2 = sc.slice(sc.indexOf('  update(time, dt) {'));
  check('H  the scene text grows upward (origin 0, 1), starts at the margin, at the radio place, and is placed by chatterSpot', /this\.hud\.chat = this\.add\.text\(CAMP\.corner\.edge - CAMP\.corner\.ink, H - CAMP\.corner\.radio, [^;]*\.setOrigin\(0, 1\)/.test(sc) && /chatterSpot\(/.test(upd2) && /\.setPosition\(sp\.x, sp\.bottom\)/.test(upd2));
  // the top centre against the toasts (the toast box is 520 wide and 16 px more each side, centred; the HUD column's plate is CAMP.hud.plate.w wide, centred on CAMP.hud.text.x)
  const at = Kc.at, toastL = Wd / 2 - (J('TOAST.w') / 2 + J('TOAST.pad')), toastR = Wd / 2 + (J('TOAST.w') / 2 + J('TOAST.pad')), P = J('CAMP.hud.plate'), plateL = J('CAMP.hud.text.x') - P.w / 2, plateR = J('CAMP.hud.text.x') + P.w / 2;
  check('H  the toast box and the HUD column\'s plate (top centre) clear the four corners sideways: the left stack ends left of both, the right stack starts right of both', at.tl.x + Kc.w < Math.min(toastL, plateL) && at.bl.x + Kc.w < Math.min(toastL, plateL) && at.tr.x > Math.max(toastR, plateR), [at.tl.x + Kc.w, toastL, plateL, at.tr.x, toastR, plateR].join(' '));
  check('H  the radio line (330 wide from x 16) ends left of the toast box', closed.x + 330 < toastL, [closed.x + 330, toastL].join(' '));
  check('H  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
} catch (e) { check('a section of the test ran without an error (H)', false, e && e.message); }
console.log(failed ? `CAMP CHATTER FAIL (${failed} of ${n})` : `CAMP CHATTER PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

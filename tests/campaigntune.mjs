// smoke: the Campaign iteration kit: debug keys, start by the address, the tuning table, the play log lines (plain Node, no Chrome, nothing waits)
// Card space-game-campaign-tune (src/campdebug.js, src/campaignaddr.js, src/campaign.js, src/playlog.js). Troy plays the Campaign to tune it:
//   A. the debug keys are data (CAMP_DEBUG: one row a key) and a pure lookup; none is a key the Campaign flies by
//   B. what each does to a battle: god (the carrier and Earth's shield take nothing), win, lose, skip (the next level, with the tech the level would have given); the pause line
//   C. the address plan: ?campaign=N and ?campaign=N&tech=a,b become a level and its techs that campNew takes as they are
//   D. the tuning table is at the top of src/campaign.js, has what Troy wants to change, and a comment on every line of numbers
//   E. the play log sees a whole level through the game's own functions (campNew, campOrder, campStep, campPick, the debug keys) and says each thing once
//   G. the scene (Phaser's, so its source is read) and the title call the kit with the arguments the log and the kit need
//   H. the kit is OFF unless the address says ?debug=1 (or a bot or tool calls campDebugSet(true)): no key, no line, no row on the H page (card space-game-debug-keys-off)
// Levels 2 and 3 are built by another card; here a copy of level 1 stands in for them where a test needs a second level.
// Run: node tests/campaigntune.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  const __lv1 = CAMP.levels[1]; delete CAMP.levels[2]; delete CAMP.levels[3];
  var __two = () => { CAMP.levels[2] = __lv1; CAMP.levels[3] = __lv1; }, __one = () => { delete CAMP.levels[2]; delete CAMP.levels[3]; };
  var __run = (C, s) => { for (let i = 0; i < s; i++) campStep(C, 1); };
`);

g.run('campDebugSet(true)'); // the kit is off in the normal game (section H below); every check from A to G is about what the keys do, so the kit is on, as a bot or ?debug=1 would have it
// ---- A. the keys ----
const rows = J(`CAMP_DEBUG.keys`);
check('four debug keys: skip, win, lose and god, each with a physical key code, what it says on the pause line and what it does', rows.map(r => r.id).join() === 'skip,win,lose,god' && rows.every(r => /^[A-Za-z0-9]{2,20}$/.test(r.code) && r.key.length === 1 && r.text.length > 2), JSON.stringify(rows));
check('no two rows share a key, and no row is a key the Campaign flies or commands by (W A S D, the arrows, Space, 1 to 5, Q, I, U, Esc, H, M, Tab, Enter, E)', new Set(rows.map(r => r.code)).size === rows.length && rows.every(r => !/^(Key[WASDQIUHME]|Arrow.*|Space|Digit[0-5]|Escape|Tab|Enter)$/.test(r.code)), rows.map(r => r.code).join());
check('a physical key is looked up to its row; any other key is null (never throws)', rows.every(r => J(`campDebugKey(${JSON.stringify(r.code)})`) === r.id) && ['KeyW', 'Digit1', '', 'Backspace'].every(c => J(`campDebugKey(${JSON.stringify(c)})`) === null) && J(`campDebugKey(undefined)`) === null && J(`campDebugKey(null)`) === null);

// ---- B. what they do ----
g.run(`var C0 = campNew(1, [], { seed: 5 }), P0 = campProgressNew();`);
check('god mode toggles: on, then off, with a plain line each way', J(`(() => { const a = campDebugRun(C0, P0, 'god'), on = C0.god; const b = campDebugRun(C0, P0, 'god'); return [a.ok, a.say, on, b.say, C0.god]; })()`).join() === 'true,Debug: god mode ON.,true,Debug: god mode off.,false');
{
  // nothing launched, nothing flown: the aliens come for Earth and the carrier. Without god the level is lost; with god nothing is taken
  g.run(`var Cn = campNew(1, [], { seed: 5 }); __run(Cn, 400);`);
  g.run(`var Cg = campNew(1, [], { seed: 5 }); campDebugRun(Cg, P0, 'god'); __run(Cg, 400);`);
  check('without god mode a battle nobody fights is lost', J(`[Cn.result, Cn.carrier.hp <= 0 || Cn.earth.shield <= 0]`).join() === 'lost,true', J(`[Cn.result, Cn.why, Cn.t]`).join());
  check('with god mode on the same battle is not lost: the carrier keeps all its hull and Earth all its shield', J(`[Cg.result, Cg.carrier.hp === Cg.carrier.maxHp, Cg.earth.shield === Cg.earth.max]`).join() === ',true,true' || J(`[Cg.result, Cg.carrier.hp === Cg.carrier.maxHp, Cg.earth.shield === Cg.earth.max]`).join() === 'null,true,true', J(`[Cg.result, Cg.carrier.hp, Cg.earth.shield, Cg.t]`).join());
}
g.run(`var Cw = campNew(1, [], { seed: 1 }), Pw = campProgressNew(); var rw = campDebugRun(Cw, Pw, 'win'), rw2 = campDebugRun(Cw, Pw, 'win');`);
check('win ends the level as won, with the reason "debug", and says so; a second press says the level is over and changes nothing', J(`[Cw.result, Cw.why, rw.ok, rw.say, rw2.ok, rw2.say, Cw.events.filter(e => e.type === 'end').length]`).join() === 'won,debug,true,Debug: level 1 won.,false,Debug: this level is already over.,1');
g.run(`var Cl = campNew(1, [], { seed: 1 }); var rl = campDebugRun(Cl, Pw, 'lose');`);
check('lose ends the level as lost, with the reason "debug"', J(`[Cl.result, Cl.why, rl.say]`).join() === 'lost,debug,Debug: level 1 lost.');
g.run(`var Cs = campNew(1, [], { seed: 1 }), Ps = campProgressNew(); var rs = campDebugRun(Cs, Ps, 'skip');`);
check('skip on the last level (only level 1 is there) wins it and says it was the last', J(`[Cs.result, Cs.why, rs.go, rs.say]`).join() === 'won,debug,,Debug: that was the last level: won.');
g.run(`__two(); var Ck = campNew(1, [], { seed: 1 }), Pk = campProgressNew(); var rk = campDebugRun(Ck, Pk, 'skip');`);
check('skip with a next level goes there: the first tech of this level is picked, the progress moves on, and the scene is told where to go (the battle itself is not ended)', J(`[rk.ok, rk.go.level, rk.go.techs.join(), rk.go.via, Pk.level, Pk.techs.join(), Ck.result]`).join() === 'true,2,shield,skip,2,shield,' || J(`[rk.ok, rk.go.level, rk.go.techs.join(), rk.go.via, Pk.level, Pk.techs.join(), Ck.result]`).join() === 'true,2,shield,skip,2,shield,null', J(`[rk, Pk]`));
g.run(`var Ck2 = campNew(1, ['beam'], { seed: 1 }), Pk2 = { level: 1, techs: ['beam'] }; var rk2 = campDebugRun(Ck2, Pk2, 'skip');`);
check('a tech of that level the player already has is kept and no other is added', J(`rk2.go.techs.join()`) === 'beam' && J(`Pk2.techs.join()`) === 'beam');
check('the level skipped to starts: campNew takes the techs skip gives, and its level', J(`(() => { const C = campNew(rk.go.level, rk.go.techs, { via: rk.go.via }); return [C.level, C.techs.join()]; })()`).join() === '2,shield');
g.run(`__one();`);
check('a key with no battle, and an id that is not a row, do nothing and say nothing', J(`[campDebugRun(null, null, 'win'), campDebugRun(Cw, Pw, 'nonsense')]`).every(r => r.ok === false && r.say === '' && r.go === null));
{
  const line = J(`campDebugLine(null)`), on = J(`campDebugLine({ god: true })`), off = J(`campDebugLine({ god: false })`);
  check('the pause line lists every key with what it does, shows the god mode as it is now, and is short enough for one small line', rows.every(r => line.includes(r.key + ' ' + r.text)) && /god mode ON$/.test(on) && /god mode off$/.test(off) && /^DEBUG/.test(line) && on.length <= 64, line + ' | ' + on);
}

// ---- C. the address plan ----
const plan = (s) => J(`campAddrPlan(${JSON.stringify(s)})`);
check('no "campaign" in the address: no plan', plan('') === null && plan('?x=1') === null);
g.run(`__two();`);
check('?campaign=1 is level 1 with no tech; ?campaign=2 has the first tech of level 1; ?campaign=3 the first of levels 1 and 2; all begin "via address"', JSON.stringify([plan('?campaign=1'), plan('?campaign=2'), plan('?campaign=3')]) === JSON.stringify([{ level: 1, techs: [], via: 'address' }, { level: 2, techs: ['shield'], via: 'address' }, { level: 3, techs: ['shield', 'plating'], via: 'address' }]), JSON.stringify([plan('?campaign=1'), plan('?campaign=2'), plan('?campaign=3')]));
check('&tech=a,b names the techs instead (any order, any case, repeats once, a plain list or plus or spaces)', JSON.stringify([plan('?campaign=2&tech=blink').techs, plan('?tech=beam,Plating&campaign=3').techs, plan('?campaign=2&tech=blink,blink,beam').techs, plan('?campaign=2&tech=blink+beam').techs, plan('?campaign=2&tech=').techs]) === JSON.stringify([['blink'], ['beam', 'plating'], ['blink', 'beam'], ['blink', 'beam'], []]));
{
  const p = plan('?campaign=2&tech=laser,blink,<b>');
  check('a tech that is not one is left out, and the plan says so in a plain line with the techs that exist; nothing typed is shown as markup', p.techs.join() === 'blink' && /not there: laser, \?b\?/.test(p.say) && /Techs: .*shield.*blink/.test(p.say) && !/[<>]/.test(p.say), JSON.stringify(p));
}
check('a wrong level is a { bad, say } with the number of levels the table has now (3)', plan('?campaign=4').bad === '4' && /levels 1 to 3/.test(plan('?campaign=4').say) && plan('?campaign=4').level === undefined);
check('campNew takes a plan as it is: the level, the techs, and the techs of a plan are all real techs', [1, 2, 3].every(l => { const p = plan('?campaign=' + l); return J(`(() => { const C = campNew(${p.level}, ${JSON.stringify(p.techs)}, { via: 'address' }); return C.level === ${p.level} && C.techs.length === ${p.techs.length}; })()`); }));
g.run(`__one();`);
check('with one level in the table ?campaign=2 is bad and the line says one level', /one level/.test(plan('?campaign=2').say) && plan('?campaign=1').level === 1);
check('with no page there is no address: campAddrPlanPage is null, and given a search it plans', J(`campAddrPlanPage()`) === null && J(`campAddrPlanPage('?campaign=1')`).level === 1);

// ---- D. the tuning table ----
const src = readFileSync(ROOT + '/src/campaign.js', 'utf8'), lines = src.split('\n');
const a = lines.findIndex(l => /^const CAMP = \{/.test(l)), z = lines.findIndex((l, i) => i > a && /^\};/.test(l)), table = lines.slice(a, z + 1);
check('the tuning table is one object at the top of src/campaign.js: before any function', a > 0 && z > a && !lines.slice(0, a).some(l => /^function /.test(l)) && lines.slice(a + 1, z).every(l => !/^function /.test(l)), a + ' ' + z);
const bare = table.filter(l => /:\s*-?\d/.test(l) && !/\/\//.test(l) && !/^\s*\{ (id|at):/.test(l));
check('every line of the table that has a number has a comment (the lines of a wave and a convoy have their header\'s)', bare.length === 0, bare.join(' | '));
{
  const want = { 'carrier speed': 'CAMP.carrier.speed', 'carrier hull': 'CAMP.carrier.hull', 'fighters in the bay': 'CAMP.bay.fighters', 'escorts in the bay': 'CAMP.bay.escorts', 'fighter damage': 'CAMP.fighter.damage', 'alien hull (all)': 'CAMP.alien.hpScale', 'alien damage (all)': 'CAMP.alien.damageScale', 'mothership hull': 'CAMP.mother.hp', 'Earth shield': 'CAMP.earth.shield', 'when a wave comes': 'CAMP.levels[1].waves[0].at', 'how big a wave is': 'CAMP.levels[1].waves[0].ships.raider', 'when a convoy leaves': 'CAMP.levels[1].convoys[0].at' };
  const miss = Object.entries(want).filter(([k, e]) => { try { return typeof g.run(e) !== 'number'; } catch (er) { return true; } }).map(([k]) => k);
  check('the numbers Troy named are all in the table as numbers: ' + Object.keys(want).join(', '), miss.length === 0, miss.join(', '));
}
{
  const body = src.slice(src.indexOf('};', src.indexOf('const CAMP = {')) + 2).replace(/\/\/.*$/gm, '');
  const code = (s => s.replace(/CAMP\.[a-z]+(\.[a-zA-Z0-9]+)*/g, '').replace(/'[^']*'/g, ''))(body);
  check('src/campaign.js asks the one table for its numbers: it reads CAMP.<group> for the carrier, the bay, the aliens, the mothership and Earth, and CAMP[kind] for a fighter or an escort', ['carrier', 'bay', 'alien', 'mother', 'earth'].every(k => new RegExp('CAMP\\.' + k + '\\b').test(body)) && /CAMP\[(u\.)?kind\]/.test(body), '');
}

// ---- E. the play log through the game's own functions ----
g.run(`
  var __pn = 1000, __m = new Map(), __log = playlogCreate({ mono: () => __pn, wall: () => 1763424000000, store: { get: k => (__m.has(k) ? __m.get(k) : null), set: (k, v) => { __m.set(k, String(v)); }, remove: k => { __m.delete(k); } }, sink: null, sid: 'feed0001' });
  globalThis.PLAYLOG_LIVE = __log; var __wrapped = playlogWrap(__log, globalThis);
  var __ev = () => { __log.flush(); return plRingRead(__m.get ? { get: k => (__m.has(k) ? __m.get(k) : null) } : null).split('\\n').filter(Boolean).map(l => JSON.parse(l)).filter(l => l.ev === 'campaign'); };
`);
check('the Campaign functions are watched: campNew, campStep, campOrder and campPick', ['campNew', 'campStep', 'campOrder', 'campPick'].every(f => J(`__wrapped.includes('${f}')`)), J(`__wrapped`).join());
g.run(`
  var Cx = campNew(1, [], { seed: 3, via: 'address' }), Px = campProgressNew(); __pn += 1000;
  campOrder(Cx, 'launch', '', 'key'); campOrder(Cx, 'launch', '', 'strip'); __pn += 25000; __run(Cx, 30); campOrder(Cx, 'attack', '', 'voice'); campOrder(Cx, 'escort', 'the Mars convoy');
  __pn += 1000; campDebugRun(Cx, Px, 'win'); campStep(Cx, 0.5); campStep(Cx, 0.5); campPick(Px, 'shield');
`);
const ev = J(`__ev()`), kinds = ev.map(e => e.step);
check('a level in the log: it starts "via address", the orders say how they were given and whether they worked, a wave begins, the debug win is a debug line and one end', kinds[0] === 'start' && ev[0].via === 'address' && ev[0].level === 1 && ev.filter(e => e.step === 'order').length === 4 && ev.filter(e => e.step === 'wave').length >= 1 && kinds.includes('debug') && ev.filter(e => e.step === 'end').length === 1, kinds.join());
const ords = ev.filter(e => e.step === 'order');
check('orders: the first launch worked by key, the second did nothing (the bay was empty) by strip, attack came by voice, and an order with no "how" is "other"', ords[0].order === 'launch' && ords[0].how === 'key' && ords[0].ok === true && ords[1].how === 'strip' && ords[1].ok === false && ords[2].order === 'attack' && ords[2].how === 'voice' && ords[3].order === 'escort' && ords[3].how === 'other', JSON.stringify(ords));
const end = ev.find(e => e.step === 'end');
check('the end says win by debug, the hull left, the highest wave and the ships lost, once, though the game was stepped after it', end.result === 'win' && end.why === 'debug' && end.hull > 0 && end.wave >= 1 && end.deaths >= 0 && end.secs >= 27, JSON.stringify(end));
check('the tech picked after the level is a line with its name and that level', ev.filter(e => e.step === 'tech').length === 1 && ev.at(-1).step === 'tech' && ev.at(-1).tech === 'shield' && ev.at(-1).level === 1, JSON.stringify(ev.at(-1)));
{
  g.run(`var Cy = campNew(1, [], { seed: 3 }); __pn += 1000; var __ry = campDebugRun(Cy, Px, 'god'); __run(Cy, 3); __two(); var Cz = campNew(1, [], { seed: 3, via: 'menu' }); __pn += 4000; var __rz = campDebugRun(Cz, Px, 'skip'); __one();`);
  const ev2 = J(`__ev()`).slice(ev.length), k2 = ev2.map(e => e.step + (e.result ? ':' + e.result : '') + (e.debug ? ':' + e.debug : ''));
  check('a level began while the last was open ends the last as quit (restart); a debug key is a line with its name; a skip ends the level as skip and the next one is a start', k2.join() === 'start,debug:god,end:quit,start,debug:skip,end:skip', k2.join());
}
{
  g.run(`var Cq = campNew(1, [], { seed: 9 }); campDebugRun(Cq, Px, 'lose'); var Cr = campNew(1, [], { seed: 9 }); for (let i = 0; i < 40; i++) campStep(Cr, 1); campDebugRun(Cr, Px, 'god');`);
  const ev3 = J(`__ev()`);
  check('a level lost is an end "lose" with its reason', ev3.some(e => e.step === 'end' && e.result === 'lose' && e.why === 'debug'), ev3.slice(-6).map(e => e.step + ':' + (e.result || e.debug || '')).join());
}
check('the play log counts the Campaign keys as one, the debug keys by name, and none as a key that did nothing: the keydown names are in src/playlog.js', /sc === 'Campaign'/.test(readFileSync(ROOT + '/src/playlog.js', 'utf8')) && /key:campaign: debug/.test(readFileSync(ROOT + '/src/playlog.js', 'utf8')));

// ---- F. the files ----
{
  const dbg = readFileSync(ROOT + '/src/campdebug.js', 'utf8').replace(/\/\/.*$/gm, '');
  check('the debug file reaches nothing of the page or of Phaser', !/\b(document|window|Phaser|localStorage|sessionStorage|fetch|navigator|location|setTimeout)\b/.test(dbg));
  const html = readFileSync(ROOT + '/index.html', 'utf8');
  check('index.html loads campdebug.js once, after campaign.js and before the play log', (html.match(/src\/campdebug\.js/g) || []).length === 1 && html.indexOf('src/campaign.js') < html.indexOf('src/campdebug.js') && html.indexOf('src/campdebug.js') < html.indexOf('src/playlog.js'));
}
// ---- G. the scene calls the kit (the scene is Phaser's, so a node test reads its source: the calls are there, with the arguments the play log and the kit need) ----
{
  const scene = readFileSync(ROOT + '/src/campaignscene.js', 'utf8'), title = readFileSync(ROOT + '/src/title.js', 'utf8');
  check('the title reads the address (campAddrPlanPage), starts the Campaign with the plan\'s level, techs and via "address", and shows the plan\'s line when the address was not understood', /campAddrPlanPage\(\)/.test(title) && /scene\.start\('Campaign', \{ level: plan\.level, techs: plan\.techs, via: 'address' \}\)/.test(title) && /plan && plan\.say\) toast\(/.test(title));
  check('the scene gives every key to campDebugKey and runs the row with campDebugRun(C, P, id); a skip starts r.go.level with r.go.techs, via "skip"', /campDebugKey\(c\)/.test(scene) && /campDebugRun\(C, this\.P, id\)/.test(scene) && /go\(this, 'Campaign', \{ level: r\.go\.level, techs: r\.go\.techs, via: 'skip' \}\)/.test(scene));
  check('the pause card carries campDebugLine of the battle', /campDebugLine\(this\.camp\)/.test(scene));
  check('the scene tells the log how a level began (campNew gets { via }: menu, hub, retry, skip or address) and how an order was given (campOrder\'s fourth argument: the panels pass key or click, the strip and voice theirs)', /via: this\.via/.test(scene) && /campPanelKey\(this\.pn, C, c,/.test(scene) && /campOrder\(C, row\.order, campPanelTargetArg\(C, row\), how \|\| 'key'\)/.test(readFileSync(ROOT + '/src/camppanel.js', 'utf8')) && /via: 'hub'/.test(readFileSync(ROOT + '/src/camphub.js', 'utf8')) && /via: 'retry'/.test(scene) && /campOrder\(s2\.camp, name, arg, '(strip|voice)'\)/.test(readFileSync(ROOT + '/src/shipcomputer.js', 'utf8')));
  check('the scene key is "Campaign", the name the play log counts its keys under', /super\('Campaign'\)/.test(scene) && J(`PLAYLOG.scenes.includes('Campaign')`));
}
// ---- H. the kit is off unless the address says so (card space-game-debug-keys-off: one slip on the backslash ended Troy's Mission 1 at 108 s) ----
{
  const g2 = nodeGame(); g2.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home;');
  const J2 = e => JSON.parse(g2.run(`JSON.stringify(${e}) ?? 'null'`)), codes = J('CAMP_DEBUG.keys.map(r => r.code)');
  g2.run(`var Ch = campNew(1, [], { seed: 2 }), Ph = campProgressNew();`);
  check('a fresh game has the kit off: no page address, so no key is a debug key, no key does anything and the pause line is empty', J2('campDebugOn()') === false && codes.every(c => J2(`campDebugKey(${JSON.stringify(c)})`) === null) && ['skip', 'win', 'lose', 'god'].every(id => { const r = J2(`campDebugRun(Ch, Ph, ${JSON.stringify(id)})`); return r.ok === false && r.say === '' && r.go === null; }) && J2('[Ch.result, !!Ch.god, Ph.level]').join() === ',false,1' && J2('campDebugLine(Ch)') === '');
  check('the address turns it on: ?debug, ?debug=1, on, true, yes (any case, anywhere in the address); nothing else does', ['?debug', '?debug=1', '?campaign=2&debug=1', '?campaign=2&tech=blink&DEBUG=On', '#debug=true', '?x=1&debug=yes'].every(a => J(`campDebugAddr(${JSON.stringify(a)})`) === true) && ['', '?', '?campaign=2', '?debug=0', '?debug=off', '?debug=no', '?debug=2', '?debugging=1', '?x=debug', '?campaign=debug', '?debug%zz=1'].every(a => J(`campDebugAddr(${JSON.stringify(a)})`) === false) && J('[campDebugAddr(), campDebugAddr(null), campDebugAddr(7)]').every(v => v === false) && J(`campDebugAddrPage('?campaign=1&debug=1')`) === true && J(`campDebugAddrPage('?campaign=1')`) === false);
  const g4 = nodeGame(); g4.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; location = { search: \'?campaign=1&debug=1\' }; var Ch = campNew(1, [], { seed: 2 });');
  const J4 = e => JSON.parse(g4.run(`JSON.stringify(${e}) ?? 'null'`));
  check('campDebugOn asks the page address on the first key: ?debug=1 in it and the keys are on, and the line is there', J4('campDebugOn()') === true && J4(`campDebugKey('Backslash')`) === 'win' && J4('campDebugLine(Ch)').startsWith('DEBUG  '));
  g4.run(`location = { search: '' };`);
  check('and it stays as it was read (the address is not read again on every key)', J4('campDebugOn()') === true);
  const g3 = nodeGame(); g3.run(`location = { search: '?campaign=1' };`);
  check('an address with no debug in it: off', JSON.parse(g3.run(`JSON.stringify([campDebugOn(), campDebugKey('Backslash'), campDebugKey('BracketLeft')])`)).join() === 'false,,');
  g3.run('campDebugSet(true)');
  check('campDebugSet(true) is how a bot, a tool or a test turns it on, and campDebugSet(false) off again', JSON.parse(g3.run(`JSON.stringify([campDebugOn(), campDebugKey('Backslash'), campDebugSet(false), campDebugOn(), campDebugKey('Backslash')])`)).join() === 'true,win,false,false,');
  const addr = readFileSync(ROOT + '/src/campaignaddr.js', 'utf8'), scene = readFileSync(ROOT + '/src/campaignscene.js', 'utf8'), keys = readFileSync(ROOT + '/src/campkeys.js', 'utf8');
  check('the pause card and the H page leave the debug line and group out unless campDebugOn(); the address is read in campaignaddr.js, which loads before campdebug.js', /campDebugOn\(\) && typeof campDebugLine === 'function'/.test(scene) && /campDebugOn\(\)/.test(keys) && __rf(ROOT + '/index.html', 'utf8').indexOf('src/campaignaddr.js') < __rf(ROOT + '/index.html', 'utf8').indexOf('src/campdebug.js') && /function campDebugAddrPage/.test(addr));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN TUNE FAIL (${failed} of ${n})` : `CAMPAIGN TUNE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

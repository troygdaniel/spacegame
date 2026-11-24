// smoke: what the target corners show (the radar's old place, bottom right): who is shown, its name, type, bars, distance and what it is doing; the amber arrows for ships you protect that are in trouble (plain Node, no Chrome)
// Card space-game-target-display (Troy, 22 Nov 2026: "the bottom right mini map can go away, to make way to show the target selected": a target display like X-Wing's, with a picture, the name and type, hull and shield bars with
// numbers, the distance and one line of what it is doing; hidden with no target; it shows a friendly selection too). src/camptdisp.js is the rule (CAMP.tdisp in src/campaign.js the table, content/text/camptdisp.md the words),
// src/camptdispscene.js the drawing (a stand-in scene here), src/campsight.js campSightFriends the arrows that took over what the radar showed of the convoy.
//   A. who is shown: nothing (no target, or only a rock field in a sub-list), the target (hostile), a sub-list's candidate (a friendly ship in the friendly colour, a hostile one in red), a ship just given an order, a dead one let go
//   B. what is read: name, type, hull and shield numbers (the rival's shield; the cruiser's), how far; the key that says when to draw again
//   C. what it is doing: a line for every state the ships can be in (hostile, pirate, neutral, yours)
//   D. the box: where it is, as big as the radar's disc was, inside the arrows' keep rectangle; the words and the voice pack's rule
//   E. (the scene half of the box moved with the box: the target corners [ ] HOSTILES and O P FRIENDLIES, tests/campcorners.mjs section I)
//   F. the radar is gone (the scene draws none, the sight scene pulses none, the target's line is gone from the panels) and the amber arrows for a ship you protect that is under attack or nearly lost and off the screen
// Run: node tests/camptdisp.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  // mission 0 of level 1 (1.1): the transport, the neutral miners; god: the cruiser cannot fall; no hostile
  window.__new = (s) => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 4); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.forEach(u => { delete u.hurtAt; }); window.C = C; window.P = campPanelNew(); return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  window.__doing = u => campTdispDoing(C, u);
`);

console.log('A. who is shown');
{
  g.run('__new()');
  check('nothing picked: nothing is shown (the corner is empty)', J('campTdispSubject(C, P, 0)') === null);
  g.run(`window.R1 = __foe('raider', 900, 0); C.tgt = R1.id;`);
  check('the target (A D S) is shown, as a hostile', J('(() => { const s = campTdispSubject(C, P, 0); return !!s && s.u.id === R1.id && s.side === "hostile"; })()'));
  g.run(`window.TR = C.ships.find(u => u.kind === 'freighter'); TR.x = C.carrier.x + 300; TR.y = C.carrier.y; TR.hp = TR.maxHp * 0.4; campPickOpen(P, { id: 'repairward', pick: 'ward' }, campPickItems(C, 'ward'));`); // (the one sub-list of ships you protect: the repair row of the dock list, a hurt ship near the cruiser)
  check('a sub-list open on a ship of yours: that ship is shown, as a friend, before the target', J('(() => { const s = campTdispSubject(C, P, 0); return !!s && s.side === "friend" && s.u.team !== "alien"; })()'));
  g.run(`P.pick = null; P.seen = { kind: 'ward', id: TR.id, until: 5000 };`);
  check('an order just given at a ship of yours: it stays shown for a moment (CAMP_PICK.seen), then the target is shown again', J('campTdispSubject(C, P, 1000).side') === 'friend' && J('campTdispSubject(C, P, 1000).u.id') === J('TR.id') && J('campTdispSubject(C, P, 6000).u.id') === J('R1.id'));
  g.run(`campPickOpen(P, { id: 'mine', pick: 'field' }, [{ id: 'field-0', what: 'field' }]); C.tgt = '';`);
  check('a rock field in a sub-list is not a ship: nothing is shown', J('campTdispSubject(C, P, 0)') === null);
  g.run(`P.pick = null; C.tgt = R1.id; R1.hp = 0;`);
  check('a target that is destroyed is let go: nothing is shown', J('campTdispSubject(C, P, 0)') === null && J('C.tgt') === '');
  check('with no panels state (the sim alone) the target is shown and nothing breaks', (() => { g.run(`C.tgt = __foe('drone', 500, 0).id;`); return J('campTdispSubject(C, null, 0).side') === 'hostile'; })());
}

console.log('B. what is read');
{
  g.run('__new()'); g.run(`window.SK = __foe('skiff', 2000, 0); SK.hp = SK.maxHp * 0.5;`);
  const a = J('campTdispInfo(C, SK, "hostile")');
  check('a pirate: its name as the lists give it ("Skiff 3"), its type ("Pirate skiff"), hull as numbers and a share, how far (px over 10)', /^Skiff \d+$/.test(a.name) && a.type === 'Pirate skiff' && a.hull.share > 0.49 && a.hull.share < 0.51 && a.hull.now === Math.ceil(SK_hp()) && a.hull.max === Math.round(SK_max()) && +a.km === 200, JSON.stringify(a));
  check('it has no shield: none is drawn for it', a.shield === null);
  g.run(`window.RD = __foe('raider', 1500, 0);`);
  const b = J('campTdispInfo(C, RD, "hostile")');
  check('an alien raider: "Hostile raider"', b.type === 'Hostile raider' && /^Raider \d+$/.test(b.name), JSON.stringify(b));
  g.run(`window.RV = campSpawn(C, 'pirateleader', C.carrier.x + 1200, C.carrier.y);`);
  const r = J('campTdispInfo(C, RV, "hostile")');
  check('the rival has a shield of its own: its numbers and share, hull too', r.shield && r.shield.max > 0 && r.shield.share === 1 && r.shield.now === r.shield.max, JSON.stringify(r.shield));
  g.run('RV.rival.sh = RV.rival.shMax / 4;'); check('the shield share follows the shield', Math.abs(J('campTdispInfo(C, RV, "hostile").shield.share') - 0.25) < 1e-9);
  g.run(`C.shield = CAMP.carrier.shield / 2;`);
  check('the cruiser\'s shield is C.shield (a ship of yours picked in a list may be it)', Math.abs(J('campTdispInfo(C, C.carrier, "friend").shield.share') - 0.5) < 1e-9);
  const tr = J(`campTdispInfo(C, C.ships.find(u => u.kind === 'freighter'), 'friend')`);
  check('the transport: named as the Escort sub-list names it, "Friendly freighter", whole hull, no shield', tr.name === 'Transport' && tr.type === 'Friendly freighter' && tr.hull.share === 1 && tr.shield === null, JSON.stringify(tr));
  const k1 = J('campTdispInfo(C, SK, "hostile").key'); g.run('SK.hp -= 1;'); const k2 = J('campTdispInfo(C, SK, "hostile").key'); g.run('SK.x += 100;'); const k3 = J('campTdispInfo(C, SK, "hostile").key');
  check('the key changes with the hull and with the distance (so it is drawn again), not otherwise', k1 !== k2 && k2 !== k3 && J('campTdispInfo(C, SK, "hostile").key') === k3);
}
function SK_hp() { return J('SK.maxHp * 0.5'); }
function SK_max() { return J('SK.maxHp'); }

console.log('C. what it is doing');
{
  g.run('__new()');
  g.run(`window.RD = __foe('raider', 700, 0); RD.def.engage = 900;`);
  check('a raider with the cruiser the nearest of yours: "attacking the cruiser"', J('__doing(RD)') === 'attacking the cruiser', J('__doing(RD)'));
  g.run(`window.FI = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter') || campSpawn(C, 'fighter', C.carrier.x + 650, C.carrier.y); FI.x = RD.x - 120; FI.y = RD.y; FI.hp = FI.maxHp = 30; FI.team = 'earth';`);
  check('with a fighter of yours nearer: it is at the fighter, by name (a pilot\'s ship has the pilot\'s name: Wedge, Kara, Apollo)', /^attacking (Wedge|Kara|Apollo)$/.test(J('__doing(RD)')), J('__doing(RD)'));
  g.run(`RD.hitBy = FI.id; RD.distractedUntil = C.t + 3000; C.ships.filter(u => u.team === 'earth' && u !== FI && u !== C.carrier).forEach(u => { u.x += 9000; });`);
  check('whoever hit it is who it turns on', /^attacking (Wedge|Kara|Apollo)$/.test(J('__doing(RD)')));
  g.run(`RD.hitBy = ''; RD.distractedUntil = 0; RD.goal = 'convoy:' + C.ships.find(u => u.kind === 'freighter').id.split('-')[1];`);
  check('an alien sent at a convoy ship: at the transport', /convoy$|^attacking [A-Z]/.test(J('__doing(RD)')) && /attacking/.test(J('__doing(RD)')), J('__doing(RD)'));
  g.run(`RD.lost = true; RD.goal = '';`); check('an alien that lost the cruiser says so', J('__doing(RD)') === 'lost the cruiser' || /attacking/.test(J('__doing(RD)')), J('__doing(RD)'));
  g.run(`RD.lost = false; RD.hold = true;`); check('a guard waiting: "holding its post"', J('__doing(RD)') === 'holding its post');
  g.run(`RD.hold = false; RD.running = { since: 0, why: 'cue' };`); check('a pirate that turned to run: "breaking off"', J('__doing(RD)') === 'breaking off');
  g.run(`window.TW = campSpawn(C, 'tower', C.carrier.x + 3000, C.carrier.y);`); check('a tower: "guarding the area"', J('__doing(TW)') === 'guarding the area');
  g.run(`window.MO = campSpawn(C, 'mother', C.carrier.x + 4000, C.carrier.y); C.ships.filter(u => u.team === 'earth' && u !== C.carrier).forEach(u => { u.x += 90000; }); C.carrier.x = -90000;`);
  check('the mothership with nothing of yours in reach: "closing on Earth"', J('__doing(MO)') === 'closing on Earth', J('__doing(MO)'));
  g.run(`window.RV = campSpawn(C, 'pirateleader', C.carrier.x + 1200, C.carrier.y);`);
  const ph = {}; ['stalk', 'charge', 'down', 'ram', 'run'].forEach(p => { g.run(`RV.rival.ph = '${p}';`); ph[p] = J('__doing(RV)'); });
  check('the rival\'s phases: stalking, charging a broadside, shield down, ramming, running', ph.stalk === 'stalking the cruiser' && ph.charge === 'charging a broadside' && ph.down === 'shield down' && ph.ram === 'ramming the cruiser' && ph.run === 'running for it', JSON.stringify(ph));
  g.run('__new()'); g.run(`window.TB = campSpawn(C, 'tboat', C.carrier.x + 3000, C.carrier.y); TB.arming = C.t + 1000;`);
  check('a torpedo boat arming: "arming a torpedo"', J('__doing(TB)') === 'arming a torpedo', J('__doing(TB)'));
  g.run(`window.F2 = campSpawn(C, 'fighter', C.carrier.x + 300, C.carrier.y); F2.team = 'earth';`);
  const ord = o => { g.run(`F2.repair = false; F2.order = ${JSON.stringify(o)};`); return J('__doing(F2)'); };
  check('a fighter\'s orders: guard, attack the nearest, hold, mine, recall, fetch (the Scout order went with the escort ship)', ord({ type: 'guard' }) === 'guarding the cruiser' && ord({ type: 'attack', target: '' }) === 'attacking the nearest hostile' && ord({ type: 'hold' }) === 'holding position' && ord({ type: 'mine' }) === 'mining ore' && ord({ type: 'recall' }) === 'returning to the bay' && ord({ type: 'fetch' }) === 'fetching ore');
  g.run(`window.T2 = C.ships.find(u => u.kind === 'freighter');`);
  check('attack a named ship, escort a ship: by its name', ord({ type: 'attack', target: J('T2.id') }) === 'attacking ' + J('campTdispName(T2)') && ord({ type: 'escort', target: J('T2.id') }) === 'escorting ' + J('campTdispName(T2)'));
  g.run(`F2.repair = true;`); check('a fighter flying home to be mended: "going home to mend"', J('__doing(F2)') === 'going home to mend');
  g.run('F2.repair = false; T2.cord = "tuck";'); const c1 = J('__doing(T2)'); g.run('T2.cord = "hold";'); const c2 = J('__doing(T2)'); g.run('T2.cord = "run";'); const c3 = J('__doing(T2)'); g.run('T2.cord = null;'); const c4 = J('__doing(T2)');
  check('a convoy ship: tucked in, holding here, running, or on its way (to the place its road ends at)', c1 === 'tucked in under the shield' && c2 === 'holding here' && c3 === 'running for it' && /^on its way/.test(c4), [c1, c2, c3, c4].join(' | '));
  g.run(`window.MN = C.ships.find(u => u.kind === 'miner' && u.team === 'neutral'); delete MN.cord; MN.stay = false;`);
  check('a miner that works where it is (the distress miner, `stay`): "working where it is"', (g.run('MN.stay = true; MN.phase = "out";'), J('__doing(MN)')) === 'working where it is'); g.run('MN.stay = false;');
  const ph2 = {}; [['out', 'heading for the rocks'], ['work', 'mining'], ['home', 'heading home'], ['dock', 'docked, resting'], ['run', 'running from trouble']].forEach(([p, w]) => { g.run(`MN.phase = '${p}';`); ph2[p] = J('__doing(MN)') === w; });
  check('a neutral miner by its phase: out, working, home, docked, frightened', Object.values(ph2).every(Boolean), JSON.stringify(ph2));
  g.run(`window.PT = campSpawn(C, 'patrol', C.carrier.x + 700, C.carrier.y); PT.team = 'neutral';`); check('a patrol: "on patrol"', J('__doing(PT)') === 'on patrol');
  check('every line is short enough for the box (28 letters at the most: it is 12 px type, two lines of 180 px)', J(`['attacking {who}', 'on its way to {where}'].every(s => s.length < 32)`) && !J(`(() => { const rows = ${JSON.stringify([])}; return false; })()`));
}

console.log('D. the box and the words');
{
  const B = J('campTdispBox()'), K = J('CAMP.tdisp'), keep = J('CAMP.nav.arrow.keep');
  check('the box is in the bottom right corner: its right edge ' + K.right + ' px from the edge, its bottom ' + K.bottom + ' px up, 320 wide (the corner panel\'s width: cards space-game-layout-align and space-game-fleet-sentence) and 200 + the order-key line tall (the radar\'s disc was 196 across; card space-game-keys-panels)', B.x + B.w === 1280 - K.right && B.y + B.h === 720 - K.bottom && B.w === 320 && B.h === 200 + K.line);
  check('it is inside the rectangle the edge arrows keep out of (the one the radar had), so no label is put on it', keep.some(r => B.x >= r[0] && B.y >= r[1] && B.x + B.w <= r[2] && B.y + B.h <= r[3]));
  const rows = src('content/text/camptdisp.md').split('\n').filter(l => /^\| camp\.tdisp\./.test(l)).map(l => l.split('|')[1].trim());
  check('the words are in content/text/camptdisp.md, each as its default in src/contenttables.js (the build checks they match) and none is a bare key at run time', rows.length >= 40 && rows.every(k => J(`uiText(${JSON.stringify(k)}, { who: 'x', where: 'x', km: 1, side: 'x', what: 'x' })`) !== k), rows.length);
  check('the voice pack has a silent family for them (the target display\'s words are never said)', /camp\\\.tdisp\\\./.test(src('src/voicepack.js')));
  const t = src('src/campaign.js'), tb = t.slice(t.indexOf('  tdisp: {'), t.indexOf('  charge: {'));
  check('every line of the CAMP table\'s tdisp block has its comment', tb.split('\n').filter(l => /^\s+\w+: /.test(l)).every(l => /\/\//.test(l)));
}

console.log('F. the radar is gone; the arrows for ships you protect');
{
  const sc = src('src/campaignscene.js');
  check('the scene draws no radar and has none of its numbers (CAMP_RADAR)', !/CAMP_RADAR/.test(sc) && !/radar: the carrier at its centre/.test(sc) && J('typeof CAMP_RADAR') === 'undefined');
  check('the sight scene pulses no ring on it; the panels draw no target line and keep no rectangle for one', !/CAMP_RADAR|pulse/.test(src('src/campsightscene.js').replace(/^\/\/.*$/gm, '')) && !/L\.tgt|tgtKeys|campPanelsKeep/.test(src('src/campanelsdraw.js').replace(/^\/\/.*$/gm, '')) && J('typeof campPanelsKeep') === 'undefined');
  check('the scene calls the target corners every frame, after the pick\'s reveal (the look, the panel, then the picture); the arrows\' keep list is the table\'s', /campPickPaint\(this\);[^\n]*\n\s*if \(typeof campTcornerLook === 'function'\) campTcornerLook\(this\.pn, this\.time\.now\);[^\n]*\n\s*if \(typeof campCornerSync === 'function'\) campCornerSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campTcornerSync === 'function'\) campTcornerSync\(this, this\.time\.now\);/.test(sc) && !/campTdispSync/.test(sc) && /arrowKeep\(\) \{ return CAMP\.nav\.arrow\.keep; \}/.test(sc));
  const html = src('index.html'), p = f => html.indexOf('src/' + f);
  check('both files are in index.html, the scene half before the Campaign scene', p('camptdisp.js') > 0 && p('camptdispscene.js') > 0 && p('camptdispscene.js') < p('campaignscene.js'));
  g.run('__new(6)'); g.run(`window.TT = C.ships.find(u => u.kind === 'freighter'); window.view = { x: C.carrier.x - 640, y: C.carrier.y - 360 };`);
  const far = (dx, dy) => { g.run(`TT.x = C.carrier.x + ${dx}; TT.y = C.carrier.y + ${dy};`); return J('campSightFriends(C, view, 1280, 720, 1)'); };
  g.run('delete TT.hurtAt;');
  check('a ship you protect, off the screen and well: no arrow', far(3000, 0).length === 0);
  g.run('C.t = 100000; TT.hurtAt = 99000;');
  const a = far(3000, 0);
  check('hit a second ago and off the screen: an amber arrow at the edge, pointing at it, with its name, its hull and how far', a.length === 1 && a[0].friend === true && a[0].x > 1200 && Math.abs(a[0].angle) < 0.3 && a[0].what === J('campTdispName(TT)') && a[0].pct === 100 && Math.round(a[0].dist) === 3000, JSON.stringify(a));
  check('on the screen (the ship is in view): none', far(200, 100).length === 0);
  g.run('TT.hurtAt = 90000; TT.maxHp = 100; TT.hp = 20;');
  check('not hit lately but nearly lost (red): an arrow too', far(0, -3000).length === 1 && far(0, -3000)[0].pct === 20);
  g.run('TT.hp = 80;'); check('not hit lately and not nearly lost: none', far(0, 3000).length === 0);
  g.run('TT.hurtAt = 99900; C.t = 100000;');
  const two = (() => { g.run(`window.M2 = C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral'); M2.forEach((u, i) => { u.x = C.carrier.x + 3000 + i * 400; u.y = C.carrier.y; u.hurtAt = 99900; });`); return J('campSightFriends(C, view, 1280, 720, 1).length'); })();
  check('at most CAMP.sensor.friends (2) at once, the nearest first', two === 2 && J('CAMP.sensor.friends') === 2);
  check('the label is the words: "Name  pct%  km km"', J('uiText("camp.sight.friend", { name: "Hauler 2", pct: 40, km: 310 })') === 'Hauler 2  40%  310 km');
  check('the hostile arrows are as they were (campSightArrows is untouched by the friends)', J('typeof campSightArrows') === 'function');
}

console.log(failed ? `\nCAMPAIGN TARGET DISPLAY FAIL: ${failed} of ${n} checks failed` : `\nCAMPAIGN TARGET DISPLAY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

// smoke: 3.1's fighter is the scout (card space-game-fighter-job-31, BRIEF 8 proposal C; ORCH: REVEAL is information): a fighter within a not-begun ring's radius plus 10 s of its top speed reveals the wave that ring will call, on the hostiles panel and the Tab map, dimmed; nothing starts
// The rule is campScoutReveals (src/campscout.js) with the scan objective's scout (src/campaign.js, 3.1 only); the panel is src/camppagehud.js campPageHudFoesScout, the map's mark src/campmap.js and src/campmapdraw.js. The bot table is in PROJECT_STATUS.md.
//   A  the row: 3.1's scan objective has scout 10, no other mission has one
//   B  campScoutReveals: who counts (a pilot's fighter, the flown one, not a docked one, not a dead one, not the cruiser), how far (ring radius plus 10 s of top speed), which rings (not begun, not scanned), what it says (n, kinds, where from)
//   C  nothing starts: the ring has not begun, the scan has not moved, the wave has not been called, the sim is the same with and without the question
//   D  the hostiles panel: "Scouted", what, the side and the distance, the class scout; real hostiles in sight come first
//   E  the Tab map: a mark where the wave will come from with its count, a legend row that counts the ships; none when nothing is revealed
//   F  the words and the rules: two shown-only keys; one pure function that writes nothing
// Run: node tests/campscout.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ pagehud: 'table' });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`{
  window.__new = (level, mission) => { const C = window.C = campNew(level, level === 3 ? ['shield', 'plating', 'repair'] : [], { seed: 3, mission }); C.god = true; C.arrivedAt = 0; C.t = 1000; C.ships = C.ships.filter(u => u.team !== 'alien' && u.kind !== 'fighter'); C.events.length = 0; return C; };
  window.__fighter = (x, y) => { const f = campSpawn(C, 'fighter', x, y); f.team = 'earth'; f.docked = false; f.vmax = 300; f.vx = f.vy = 0; window.F = f; return f; };
  window.__ringedge = (k, extra) => { const p = C.scan[k]; return [p.x + p.r + extra, p.y]; };
  window.__ks = () => campScoutReveals(C).map(r => r.k);
}`);

console.log('A. the row');
g.run(`__new(3, 0);`);
check('3.1 (the approach) has three rings and its scan objective has scout 10', J('C.L.mid') === 'approach' && J('C.scan.length') === 3 && J(`C.L.objectives.find(o => o.type === 'scan').scout`) === 10);
check('no other mission has a scout on an objective', [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 1], [3, 2]].every(([l, m]) => (g.run(`__new(${l}, ${m});`), J(`(C.L.objectives || []).every(o => !o.scout)`) === true)));

console.log('B. who and how far');
g.run(`__new(3, 0);`);
check('no fighter out: nothing is revealed', J('campScoutReveals(C).length') === 0);
g.run(`__fighter(...__ringedge(1, 20000));`);
check('a fighter far off (20,000 px beyond the ring): nothing', J('__ks().length') === 0);
g.run(`F.x = __ringedge(1, 0)[0] + 3000 - 1; F.y = C.scan[1].y;`);
check('3,000 px beyond the ring\'s edge (10 s at a top speed of 300): the second ring\'s wave is revealed (the rings are close, so the others\' may be too)', J('__ks().includes(1)') === true);
g.run(`F.x = __ringedge(1, 0)[0] + 3001;`);
check('3,001 px: the second ring\'s is not yet', J('__ks().includes(1)') === false);
g.run(`F.x = __ringedge(1, 0)[0] + 2000; F.docked = true;`);
check('a fighter in the bay (docked) does not scout; nor a dead one; nor one that has gone', J('__ks().length') === 0 && (g.run(`F.docked = false; F.hp = 0;`), J('__ks().length') === 0) && (g.run(`F.hp = 20; F.gone = true;`), J('__ks().length') === 0));
g.run(`F.gone = false; F.hp = 20; F.vmax = 0; F.cockpit = true; F.x = __ringedge(1, 0)[0] + CAMP.cockpit.speed * 10 - 5;`);
check('the fighter he flies uses the cockpit\'s top speed (CAMP.cockpit.speed: 10 s of it), not the unit\'s own (its own is 0 here)', J('__ks().includes(1)') === true && (g.run(`F.x += 20;`), J('__ks().includes(1)') === false));
g.run(`F.cockpit = false; F.vmax = 300; F.x = __ringedge(1, 0)[0] + 500; C.carrier.x = F.x; C.carrier.y = F.y; C.ships.forEach(u => { if (u.kind === 'fighter' && u !== F) u.hp = 0; });`);
check('the cruiser beside a ring is not a scout (only a fighter is): with the fighter gone, nothing', (g.run(`F.hp = 0;`), J('__ks().length') === 0));
g.run(`F.hp = 20; F.x = __ringedge(1, 0)[0] + 500; F.y = C.scan[1].y;`);
const rv = J('campScoutReveals(C)[0]');
check('what it says: the ring, how many (the wave\'s ships: raider 2, drone 1, gunship 1 = 4), of what, and where the wave will come from (the row\'s from)', rv.k === 1 && rv.n === 4 && JSON.stringify(rv.kinds) === JSON.stringify({ raider: 2, drone: 1, gunship: 1 }) && J(`C.L.waves.find(w => w.on && w.on.scanning === 1).from[0]`) === rv.x && J(`C.L.waves.find(w => w.on && w.on.scanning === 1).from[1]`) === rv.y, JSON.stringify(rv));
g.run(`C.scan[1].began = true;`);
check('a ring that has begun (the wave is real) reveals nothing; nor one that has been scanned', J('__ks().includes(1)') === false && (g.run(`C.scan[1].began = false; C.scan[1].got = true;`), J('__ks().includes(1)') === false) && (g.run(`C.scan[1].got = false;`), J('__ks().includes(1)') === true));
g.run(`C.scan[1].got = false; F.x = C.scan[0].x; F.y = C.scan[0].y + 100; C.scan[0].began = true; C.scan[2].began = true;`);
check('every ring that has begun is left out: with rings 0 and 2 begun and the fighter by ring 0, ring 1 is the only one that can be revealed', J('__ks().every(k => k === 1)') === true);
g.run(`__new(3, 0); __fighter(...__ringedge(0, 100)); F.hp = 20; window.NEAR = campScoutReveals(C).map(r => r.k).join();`);
check('rings in reach are revealed together, the one nearer the cruiser first', J('NEAR') !== '' && (g.run(`__fighter(C.scan[1].x, C.scan[1].y + 3200); window.TWO = campScoutReveals(C);`), J('TWO.length') >= 2 && J('Math.hypot(TWO[0].x - C.carrier.x, TWO[0].y - C.carrier.y) <= Math.hypot(TWO[1].x - C.carrier.x, TWO[1].y - C.carrier.y)') === true));
g.run(`__new(1, 0); __fighter(C.carrier.x + 100, C.carrier.y);`);
check('a mission with no scout on its objective reveals nothing with a fighter out; and a finished mission nothing', J('campScoutReveals(C).length') === 0 && (g.run(`__new(3, 0); __fighter(...__ringedge(1, 100)); C.result = 'won';`), J('__ks().length') === 0));

console.log('C. nothing starts');
g.run(`__new(3, 0); __fighter(...__ringedge(1, 2000)); window.S0 = JSON.stringify({ scan: C.scan.map(p => [p.began, p.t, p.got]), waves: C.waves.map(w => w.started) }); window.RV = __ks().includes(1); for (let i = 0; i < 30 * 5; i++) { F.x = __ringedge(1, 2000)[0]; F.y = C.scan[1].y; campStep(C, 1 / 30); } window.S1 = JSON.stringify({ scan: C.scan.map(p => [p.began, p.t, p.got]), waves: C.waves.map(w => w.started) });`);
check('five seconds with a fighter 2,000 px off a ring: it is revealed, and still no ring has begun, no scan has moved, no wave is started: the same as before the question', J('RV') === true && J('S0') === J('S1') && J('C.scan[1].began') === false && J('C.waves[1].started') === false, J('S1'));
g.run(`__new(3, 0); __fighter(...__ringedge(1, 2000)); for (let i = 0; i < 30 * 3; i++) { campStep(C, 1 / 30); } window.A1 = JSON.stringify([C.t, C.ships.length, C.events.length]); __new(3, 0); __fighter(...__ringedge(1, 2000)); for (let i = 0; i < 30 * 3; i++) { campScoutReveals(C); campStep(C, 1 / 30); } window.A2 = JSON.stringify([C.t, C.ships.length, C.events.length]);`);
check('asking changes nothing in the sim: the same three seconds with and without the question end alike', J('A1') === J('A2'));

console.log('D. the hostiles panel');
g.run(`__new(3, 0); __fighter(...__ringedge(1, 500)); window.M = campPageModel(C, { x: 0, y: 0, zoom: 1, was: {} });`);
check('nothing hostile in sight, a ring\'s wave revealed: the panel is the group "Scouted", with what (the most dangerous kinds first), the side and the distance, and the scout mark', J('M.foes !== null') && J('M.foes.scout') === true && J('M.foes.label') === 'Scouted' && /Raiders?/.test(J('M.foes.what')) && /·|km/.test(J('M.foes.km')) && J('M.foes.enter') === null && J('M.foes.target') === null, J('M.foes'));
check('the side it comes from is the compass point from the cruiser to the wave\'s start', J('M.foes.dir.length') > 0);
g.run(`const al = campSpawn(C, 'raider', C.carrier.x + 700, C.carrier.y + 200); al.vx = al.vy = 0; window.AL = al; window.M2 = campPageModel(C, { x: 0, y: 0, zoom: 1, was: {} });`);
check('a real hostile in sight comes first: the panel is the real group (no scout mark, the usual label)', J('M2.foes !== null') && J('M2.foes.scout') === null && J('M2.foes.label') !== 'Scouted');
g.run(`AL.hp = 0; C.ships = C.ships.filter(u => u !== AL); F.hp = 0; window.M3 = campPageModel(C, { x: 0, y: 0, zoom: 1, was: {} });`);
check('the fighter gone: nothing is revealed and the panel has no scouted group', J('M3.foes') === null || J('M3.foes.scout') === null);
const pj = src('src/camppagehud.js'), css = src('src/camppagehud.css');
check('the page paints the scouted group dimmed: the panel\'s class carries scout and the stylesheet dims it (and stops its pulse)', /\(M\.foes\.scout \? ' scout' : ''\)/.test(pj) && /\.ph-foes\.scout \{ opacity: \.72; border-style: dashed; animation: none; \}/.test(css));

console.log('E. the Tab map');
g.run(`__new(3, 0); __fighter(...__ringedge(1, 500)); window.MK = campMapMarks(C).filter(m => m.type === 'scout'); window.LG = campMapLegend(C).filter(r => r.type === 'scout'); window.NK = __ks().length;`);
check('a mark for each wave revealed, where it will come from, with its ship count, and one legend row that counts the ships of all of them ("Scouted (6)" for two waves of 2 and 4), not the marks', J('MK.length') === J('NK') && J('MK.length') >= 1 && J(`MK.some(m => m.n === 4 && m.x === C.L.waves.find(w => w.on && w.on.scanning === 1).from[0])`) === true && J('LG.length') === 1 && J('LG[0].text') === 'Scouted (' + J('MK.reduce((a, m) => a + m.n, 0)') + ')', J('LG'));
g.run(`F.hp = 0; window.MK2 = campMapMarks(C).filter(m => m.type === 'scout');`);
check('no fighter, no mark', J('MK2.length') === 0 && J('campMapLegend(C).filter(r => r.type === "scout").length') === 0);
const md = src('src/campmapdraw.js');
check('the map draws it dimmed: a ring and a dot for each ship (at most 8) in the hostile colour (the new look\'s pink), at a third to a half strength', /m\.type === 'scout'\) \{ const pk = flat \? slookInt\(SLOOK\.C\.foe\) : m\.color; g\.lineStyle\(1\.5, pk, 0\.4\)\.strokeCircle\(p\.x, p\.y, 7\); for \(let i = 0; i < Math\.min\(m\.n, 8\); i\+\+\)/.test(md) && /scout: 5/.test(src('src/campmap.js')));

console.log('F. the words and the rules');
check('two keys, shown only: "Scouted" and "Scouted ({n})"; the voice pack classes them as the screen\'s words', J(`uiText('camp.hud.scouted')`) === 'Scouted' && J(`uiText('camp.map.scout', { n: 4 })`) === 'Scouted (4)' && J(`(() => { const a = voicePackFamily('camp.hud.scouted'), b = voicePackFamily('camp.map.scout'); return !!a && !!b && !a.spoken && !b.spoken; })()`) === true);
const sj = src('src/campscout.js'), code = sj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('one pure function and a speed helper: it writes nothing (no assignment to the sim\'s state), starts no wave, calls no order', /function campScoutReveals\(C\)/.test(code) && !/\bC\.[a-zA-Z.\[\]]+\s*[-+]?=[^=]/.test(code) && !/campOrder|campSay|campSpawn|began\s*=/.test(code));
check('the file has its own script tag after the sight\'s', src('index.html').indexOf('src/campscout.js') > src('index.html').indexOf('src/campsight.js') && src('index.html').split('src/campscout.js').length === 2);

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);

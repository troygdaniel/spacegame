// smoke: the canvas edge arrows of the ships you protect while the page HUD is on: none (the miner's since 25 Nov, every ship's with card space-game-page-hud-friend-edge-pill); with it off, as before (plain Node, no Chrome)
// Card space-game-page-hud-miner-edge-label (Troy, 25 Nov 2026): the miner already has his ring in the left panel and the page's pill at the edge, so the amber arrow and label the canvas draws for him are left out while the page HUD
// is on. src/campsight.js campSightFriends is the rule (it asks campPageHudHides('friendlies'), the page HUD's own switch); the sight scene (src/campsightscene.js) draws what it is given and is not changed.
//   A  the miner, off the screen and hit: one amber arrow with the page HUD off, none with it on
//   B  the other ships you protect (a hauler of 1.3) had theirs with it on; since card space-game-page-hud-friend-edge-pill they have none either (each has its pill at the edge of the page, tests/camppagehud.mjs section O); with it off both have one, the nearer first
//   C  the hostiles' arrows are as they were (campSightArrows); the page HUD's own edge pill is not touched (campPageHudEdge)
//   D  the scene files: campsightscene.js and camppagehud.js are as they were (the rule is one line of campsight.js)
// Run: node tests/campminerlabel.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = (lv, mi) => { const C = window.C = campNew(lv, [], { seed: 5, mission: mi }); C.t = 100000; window.view = { x: C.carrier.x - 640, y: C.carrier.y - 360 }; return C; };
  window.__hit = u => { u.hurtAt = 99900; return u; }; // hit a tenth of a second ago: the full bar, so an arrow when it is off the screen
  window.__far = (u, dx, dy) => { u.x = C.carrier.x + dx; u.y = C.carrier.y + dy; return u; };
  window.__arrows = () => campSightFriends(C, view, 1280, 720, 1);
`);

console.log('A. the miner');
g.run(`__new(1, 0); window.MI = C.ships.find(u => u.kind === 'miner' && u.team === 'neutral'); __far(MI, 3000, 0); __hit(MI);`);
check('1.1 has a miner you protect (it has a health bar)', J('!!MI') && J(`campChargeBars(C).some(b => b.id === MI.id && b.kind === 'miner')`));
g.run(`CAMP.flags.pagehud = false;`);
const off = J('__arrows()');
check('page HUD off: hit and off the screen, the miner has its amber arrow, as before', off.length === 1 && off[0].friend === true && off[0].x > 1200 && Math.abs(off[0].angle) < 0.3, JSON.stringify(off));
g.run(`CAMP.flags.pagehud = true;`);
check('page HUD on: the miner has none', J('__arrows()').length === 0, JSON.stringify(J('__arrows()')));
g.run(`MI.hurtAt = 90000; MI.maxHp = 100; MI.hp = 20;`);
check('page HUD on: nearly lost (red) and off the screen: none too', J('__arrows()').length === 0);
g.run(`CAMP.flags.pagehud = false;`);
check('page HUD off again: the red miner has its arrow back (the switch is read each time, nothing is kept)', J('__arrows()').length === 1);

console.log('B. the other ships you protect');
g.run(`__new(1, 2); C.god = true; for (let i = 0; i < 450 && !C.result; i++) campStep(C, 1 / 30); C.t = 100000; window.view = { x: C.carrier.x - 640, y: C.carrier.y - 360 }; CAMP.flags.pagehud = true;
  window.HA = campChargeBars(C).map(b => C.by[b.id]).find(u => u && u.kind === 'freighter'); window.MI = campSpawn(C, 'miner', C.carrier.x + 2000, C.carrier.y); MI.team = 'neutral';`); // 1.3 after 15 s: the first hauler is out; a miner beside it
check('1.3 after 15 s: the first hauler is out and has a health bar; the miner put beside it too', J('!!HA') && J(`campChargeBars(C).some(b => b.id === MI.id && b.kind === 'miner')`));
g.run(`__far(HA, 4000, 0); __hit(HA);`);
check('page HUD on: a hauler hit and off the screen has no canvas arrow now (its pill is at the edge of the page: asked for with `all`, it is there and hot)', J('__arrows().length') === 0 && J('campSightFriends(C, view, 1280, 720, 1, true).filter(a => a.id === HA.id).map(a => a.hot)')[0] === true, JSON.stringify(J('__arrows()')));
g.run(`__far(MI, 2000, 0); __hit(MI);`);
check('a miner and a hauler together: no canvas arrow for either; the page asks for them all (`all`), the miner before the hauler (nearer first)', J('__arrows().length') === 0 && J('campSightFriends(C, view, 1280, 720, 1, true).map(a => a.id)').filter(id => id === J('MI.id') || id === J('HA.id')).join() === J('[MI.id, HA.id]').join() && J('campSightFriends(C, view, 1280, 720, 1, true).length') === 4); // (the two other haulers of 1.3 are off the screen too: four in all, only the hit ones hot)
g.run(`CAMP.flags.pagehud = false;`);
check('page HUD off: both have one, the nearer (the miner) first', J('__arrows().length') === 2 && J('__arrows()[0].what') === J('campTdispName(MI)'), JSON.stringify(J('__arrows().map(a => a.what)')));

console.log('C. the hostiles and the page pill');
g.run(`__new(1, 0); CAMP.flags.pagehud = true; C.ships = C.ships.filter(u => u.team !== 'alien'); C.carrier.x = 0; C.carrier.y = 0; for (let i = 0; i < 2; i++) { const u = campSpawn(C, 'raider', 5000 + i * 80, 0); u.vx = u.vy = 0; } C.t = 100000; campSightStep(C); window.view = { x: -640, y: -360 };`);
check('the hostiles\' arrows (campSightArrows) are as they were: a group off the screen has one', J('campSightArrows(C, view, 1280, 720, 1).length') === 1);
check('the page HUD\'s edge pill for them is still made (campPageModel edge)', J('(campPageModel(C, { x: view.x, y: view.y, zoom: 1 }) || {}).edge') !== null);
g.run(`CAMP.flags.pagehud = false;`);

console.log('D. the files');
check('campsightscene.js still hides only the hostiles\' arrows for the page HUD and draws the friends\' as given (the rule is in campsight.js)', /campPageHudHides\('sight'\) \? \[\]/.test(src('src/campsightscene.js')) && !/miner/.test(src('src/campsightscene.js').replace(/^\s*\/\/.*$/gm, '')));
check('this card adds nothing to the page HUD\'s hides list: it still begins as it was (later cards added the boxes of the pilots\' pick and of the hostiles after it)', J('CAMP_PAGEHUD.hides.join()').indexOf('status,cruiser,fleet,goal,stock,hostiles,friendlies,sight,contact,places,keys,box:friendlies') === 0);

console.log(failed ? `\nMINER EDGE LABEL FAIL: ${failed} of ${n} checks failed` : `\nMINER EDGE LABEL PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

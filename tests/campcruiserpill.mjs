// smoke: while you fly a fighter the cruiser has an edge pill on the page ("Cruiser · 210 km", pale blue, like the ships you protect) (plain Node, no Chrome)
// Card space-game-b12-c2-3-pills (Troy's BRIEF 12 chunks 2 and 3, docs/next-chunks.html). Two things Troy saw in 2.2 with a fighter flown:
//   chunk 2  the cruiser's only mark was the canvas tag CRUISER AUTO, pinned half off the screen or under a panel: now she has an edge pill like every other ship while she is off the screen (src/camppagehud.js campPageHudCruiserEdge,
//            riding in the friends' list as id 'carrier'), and the canvas tag steps aside while that pill is up (tests/campcockpitcam.mjs section E has the tag's half)
//   chunk 3  "Proxima d 707 km" (the canvas's goal arrow label, gold) stood under the hostiles' pink pill and panel at the right edge: the page now says where its pills and panels stand (campPageHudPillBoxes, R.pillBoxes) and the scene's
//            goal label keeps out of them (campEdgeSpread's boxes)
// Run: node tests/campcruiserpill.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeGame } from './nodegame.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const code = f => readFileSync(ROOT + '/' + f, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');

g.run(`
  CAMP.flags.pagehud = true; CAMP.flags.cockpit = true;
  window.C = campNew(2, ['shield'], { seed: 4, mission: 1 }); C.arrivedAt = 0; C.god = true; for (let i = 0; i < 90 && !C.result; i++) campStep(C, 1 / 30); C.t = 100000; C.ships = C.ships.filter(u => u.team !== 'alien');
  window.CAR = C.carrier; window.FI = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter');
  campCockpitTake(C, FI.id);
  // the fighter 'east' of the cruiser by dx, level with her; the camera on the fighter at zoom 1 (as the flown view is): a view is its top left in the world
  window.fly = dx => { FI.x = CAR.x + dx; FI.y = CAR.y; FI.vx = FI.vy = 0; return { x: FI.x - 640, y: FI.y - 360, zoom: 1 }; };
`);

console.log('A. the cruiser\'s edge pill while a fighter is flown');
{
  g.run(`window.V = fly(3000);`);
  const M = J('campPageModel(C, V)'), p = M.fedges.find(f => f.id === 'carrier');
  check('the fighter 3,000 px from her: the page model has a pill for the cruiser (id carrier, the cruiser flag, no digit)', !!p && p.cruiser === true && p.n === '', JSON.stringify(M.fedges));
  check('it reads "Cruiser · " and her distance in km as the others do (the chip word "Cruiser", no new key), and the pill\'s label is the whole line', !!p && p.name === 'Cruiser' && J(`uiText('camp.corner.chip.cruiser')`) === 'Cruiser' && p.text === 'Cruiser \u00b7 ' + J(`uiText('camp.tdisp.km', { km: campNavKm(3000) })`) && p.label === p.text, JSON.stringify(p));
  check('it stands on the LEFT border (she is west of him), its arrow points west, and she is first in the list', !!p && p.x < 100 && Math.abs(Math.abs(p.angle) - Math.PI) < 0.2 && M.fedges[0].id === 'carrier', JSON.stringify(p));
  check('the next look is told she has a pill (view.was: a pill stays until she is well inside the screen)', M.was.carrier === true);
  const put = J('campPageHudEdgesClear(campPageModel(C, V), [])');
  check('placed through the same fit as the others: the pill is kept whole on the screen and turns to her', put.fedges.length === 1 && put.fedges[0].x >= 60 && put.fedges[0].x < 100 && Math.abs(Math.abs(put.fedges[0].angle) - Math.PI) < 0.2, JSON.stringify(put));
  g.run(`window.Sc = { pageHud: { last: campPageModel(C, V) } };`);
  check('the scene can ask whether the page has her pill (campPageHudHasPill), which is what the canvas tag looks at', J(`campPageHudHasPill(Sc, 'carrier')`) === true && J(`campPageHudHasPill(Sc, 'nobody')`) === false);

  g.run(`window.V = fly(200);`);
  check('the cruiser on the screen (200 px away): no pill, the canvas tag stays under her', J('campPageModel(C, V).fedges.filter(f => f.id === "carrier").length') === 0);
  g.run(`window.V = fly(3000); window.M1 = campPageModel(C, V); window.V = Object.assign(fly(1100), { was: M1.was });`);
  check('the cruiser coming back: still off by the loose rule (the pill is kept with view.was, no flicker at the edge)', J('campPageModel(C, V).fedges.filter(f => f.id === "carrier").length') === 1);
  g.run(`window.V = fly(3000); window.fl = campPageModel(C, V).fedges.length;`);
  check('the model gives her pill only while he flies a fighter: handed back, she is the ship he flies and has none', (g.run(`campCockpitGive(C, 'hand'); window.V = { x: CAR.x - 640, y: CAR.y - 360, zoom: 1 }; FI.x = CAR.x + 3000;`), J('campPageModel(C, V).fedges.filter(f => f.id === "carrier").length') === 0) && J('fl') === 1);
  g.run(`campCockpitTake(C, FI.id); window.V = fly(3000); CAR.hp = 0;`);
  check('a lost cruiser has no pill', J('campPageModel(C, V).fedges.filter(f => f.id === "carrier").length') === 0);
  g.run(`CAR.hp = CAR.maxHp || 1000;`);
}

console.log('B. with a friend off the screen too');
{
  // (a mission with a convoy: 1.3's freighters, as tests/campedgepills.mjs has them; 2.2 has none)
  g.run(`window.C = campNew(1, [], { seed: 5, mission: 2 }); C.god = true; for (let i = 0; i < 450 && !C.result; i++) campStep(C, 1 / 30); C.t = 100000; C.ships = C.ships.filter(u => u.team !== 'alien'); window.CAR = C.carrier; window.FI = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); campCockpitTake(C, FI.id);
    window.HO = campFriNumbered(C).map(e => e.unit).find(u => u && u.hp > 0 && u.kind === 'freighter'); window.V = fly(3000); if (HO) { HO.x = CAR.x - 3000; HO.y = CAR.y + 20; }`);
  const M = J('campPageModel(C, V)'), put = J('campPageHudEdgesClear(campPageModel(C, V), [])');
  const hasFriend = J('!!HO');
  check('the test has a ship of the convoy to put off the screen (or the two checks below prove nothing)', hasFriend === true);
  const boxes = put.fedges.map((f, i) => { const z = J(`campPageHudPillSize(${JSON.stringify(M.fedges[i].text)})`); return [f.x - z.w / 2, f.y - z.h / 2, f.x + z.w / 2, f.y + z.h / 2]; });
  const meet = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  check('a ship you protect off the screen on the same side: both have a pill, the cruiser\'s first, and the two do not touch', !hasFriend || (M.fedges.length === 2 && M.fedges[0].id === 'carrier' && boxes.length === 2 && !meet(boxes[0], boxes[1])), JSON.stringify(M.fedges.map(f => f.id)));
  check('and the friend\'s keeps its digit (the E key\'s number) while the cruiser\'s has none', !hasFriend || (String(M.fedges[1].n).length > 0 && M.fedges[0].n === ''), JSON.stringify(M.fedges.map(f => f.n)));
}

console.log('D. wiring');
{
  const hud = code('src/camppagehud.js'), scene = code('src/campaignscene.js'), cam = code('src/campcockpitcam.js'), css = readFileSync(ROOT + '/src/camppagehud.css', 'utf8');
  check('the cruiser\'s pill is painted in the pale blue class and has no digit (the ring shows nothing for her)', /ph-fcruiser/.test(hud) && /f\.cruiser \? '' : String\(f\.n\)/.test(hud) && /\.ph-fcruiser \{[^}]*9fd8ff/.test(css) && /\.ph-fnum:empty \{ display: none; \}/.test(css));
  check('the canvas tag asks the page first: campPageHudHasPill(s, \'carrier\') in its `want`', /campPageHudHasPill\(s, 'carrier'\)/.test(cam));
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCRUISER EDGE PILL OK (${n} checks)`);
process.exit(failed ? 1 : 0);

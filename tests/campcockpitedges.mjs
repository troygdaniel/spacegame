// smoke: taking the stick of a pilot's fighter, L4 (plain Node, no Chrome): from the cockpit "where I am" is the fighter: the sensor union, the target keys and their km, the missile's lock and launch, the sounds, the map's mark, the first-minute tip, pickups
// Card space-game-fly-fighter-l4 (Troy, 26 Nov 2026), after tests/campcockpit.mjs (the simulation) and tests/campcockpitscene.mjs (the scene). Behind CAMP.flags.cockpit. With no stick held every answer is the cruiser's, as it was.
//   A. the sensor: a hostile far from the cruiser is seen when it is near the fighter (the union of the two sensors), and not otherwise
//   B. the target keys: ] and the list sort from the fighter, the nearest pick and the km are its; handed back, the cruiser's
//   C. the missile: it locks from the fighter (a big ship in ITS range, not the cruiser's) and leaves the fighter; the picked target's range is the fighter's; with no stick it is the cruiser's, as ever
//   D. the sounds: a shot is loud near the fighter and quiet near the cruiser he left; a hit on the fighter shakes the view, a hit on the cruiser still blinks it
//   E. the Tab map: the fighter he flies has a mark of its own (you), no other fighter does
//   F. the first-minute tip: one line, with the key from the table, only while the switch is on, a pilot is out and the stick was never taken
//   G. pickups: a fighter he flies collects ore it flies over, into the cruiser's hold
// Run: node tests/campcockpitedges.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
g.run(`
  window.__mk = () => { CAMP.flags.cockpit = true; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; C.god = true; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.events.length = 0; return C; };
  window.__foe = (kind, x, y) => { const a = campSpawn(C, kind, x, y); a.vmax = 0; a.accel = 0; a.nextShot = 1e12; a.hp = 1e6; a.maxHp = 1e6; return a; };
  window.__fly = () => C.by[C.cockpit.id];
  window.__away = (dx, dy) => { const f = __fly(); f.x = C.carrier.x + dx; f.y = C.carrier.y + dy; f.vx = 0; f.vy = 0; return f; };
`);

console.log('A. the sensor');
{
  g.run(`__mk(); campCockpitTake(C); __away(14000, 0); window.__a = __foe('raider', C.carrier.x + 14500, C.carrier.y);`);
  check('a hostile 14,500 px from the cruiser (past its 9,000) but 500 px from the fighter he flies is SEEN: the union of the two sensors', J('campSeen(C, __a)') === true && J('Math.hypot(__a.x - C.carrier.x, __a.y - C.carrier.y) > CAMP.sensor.range') === true);
  g.run(`campCockpitGive(C, 'hand'); C.by['fighter-6'].x = C.carrier.x; C.by['fighter-7'].x = C.carrier.x; C.by['fighter-5'].x = C.carrier.x; C.by['fighter-5'].y = C.carrier.y;`);
  check('and not seen when no fighter of his is near it and it is beyond the cruiser\'s own range', J('campSeen(C, __a)') === false);
}

console.log('B. the target keys');
{
  g.run(`__mk(); campCockpitTake(C); __away(3000, 0); window.__w = __foe('gunship', C.carrier.x - 1000, C.carrier.y); window.__e = __foe('gunship', C.carrier.x + 3400, C.carrier.y);`);
  check('the list of hostiles is nearest the FIGHTER first: the one by the fighter (400 px) before the one by the cruiser (1,000 px)', J('campTgtList(C).map(u => u.id).join()') === J('[__e.id, __w.id].join()'), J('campTgtList(C).map(u => u.id)'));
  g.run(`C.tgt = ''; campTgtNearest(C);`);
  check('the nearest pick (the backslash) is the fighter\'s nearest', J('C.tgt') === J('__e.id'));
  check('the km of the picked target is from the fighter (0.4 km at 400 px? the km of the table)', J('campTgtInfo(C).km') === J('campNavKm(400)'), J('campTgtInfo(C).km'));
  check('the target card\'s km is from the fighter too', J('campTdispInfo(C, __e, "hostile").km') === J('campNavKm(400)'));
  g.run(`campCockpitGive(C, 'hand'); C.tgt = ''; campTgtNearest(C);`);
  check('handed back, everything is the cruiser\'s again: the west one is nearest, its km 1,000 px', J('C.tgt') === J('__w.id') && J('campTgtInfo(C).km') === J('campNavKm(1000)'));
  g.run(`__mk(); campCockpitTake(C); __away(3000, 0); __foe('raider', C.carrier.x + 3300, C.carrier.y); window.__call = null;`);
  check('the radio call of a sight says which way and how far from the ship he flies (300 px east of the fighter, not 3,300 from the cruiser)', J('campSightLine(C, C.ships.filter(u => u.team === "alien").map(u => u.id)).vars.km') === J('campNavKm(300)') && J('campSightLine(C, C.ships.filter(u => u.team === "alien").map(u => u.id)).vars.dir') === J(`uiText('camp.sight.dir.east')`));
}

console.log('C. the missile');
{
  g.run(`__mk(); campCockpitTake(C); __away(5000, 0); C.missiles = 3; C.nextRocket = 0; window.__big = __foe('gunship', C.carrier.x + 5400, C.carrier.y); window.__r = campOrder(C, 'missiles', '', 'key');`);
  check('a big ship 400 px from the fighter (5,400 from the cruiser, far beyond its lock) is in the missile\'s range: the order goes, and the rocket leaves the FIGHTER', J('__r.ok') === true && J('C.rockets.length') === 1 && J('Math.hypot(C.rockets[0].x - __fly().x, C.rockets[0].y - __fly().y)') < 30, JSON.stringify(J('__r')));
  g.run(`__mk(); campCockpitTake(C); __away(5000, 0); C.missiles = 3; C.nextRocket = 0; __foe('gunship', C.carrier.x + 200, C.carrier.y); window.__r = campOrder(C, 'missiles', '', 'key');`);
  check('a big ship by the cruiser but far from the fighter is NOT in range while he flies: no big ship near (the lock is the fighter\'s)', J('__r.ok') === false && J('C.rockets.length') === 0, JSON.stringify(J('__r')));
  g.run(`campCockpitGive(C, 'hand'); window.__r = campOrder(C, 'missiles', '', 'key');`);
  check('handed back it is in range of the cruiser again and the rocket leaves the cruiser', J('__r.ok') === true && J('Math.hypot(C.rockets[0].x - C.carrier.x, C.rockets[0].y - C.carrier.y)') < 60, JSON.stringify(J('__r')));
  g.run(`__mk(); campCockpitTake(C); __away(5000, 0); C.missiles = 3; C.nextRocket = 0; window.__far = __foe('gunship', C.carrier.x + 5000 + CAMP.missile.lock + 400, C.carrier.y); C.tgt = __far.id; window.__r = campOrder(C, 'missiles', CAMP_TGT, 'key');`);
  check('a picked target beyond the fighter\'s lock is refused for range, though no nearer than the cruiser\'s', J('__r.ok') === false && J('__r.code') === 'tgtrange', JSON.stringify(J('__r')));
  check('with no stick held the lock is the cruiser\'s, as it was (source: the same functions answer the eye, which is the cruiser)', J('(() => { __mk(); return campEye(C) === C.carrier; })()') === true);
}

console.log('D. the sounds');
{
  g.run(`__mk(); window.__rec = []; campCockpitTake(C); __away(5000, 0);`);
  const fx = J('({ x: __fly().x, y: __fly().y })'), cx = J('({ x: C.carrier.x, y: C.carrier.y })');
  g.run(`window.__sc = Object.create(Campaign.prototype); __sc.camp = C; __sc.battleSound = (k, s, v) => { __rec.push([k, s, v === undefined ? 1 : v]); };`);
  g.run(`__sc.wingShot({ x: ${fx.x + 200}, y: ${fx.y} });`);
  check('a shot 200 px from the fighter he flies is heard', J('__rec.length') === 1 && J('__rec[0][2]') > 0.8, JSON.stringify(J('__rec')));
  g.run(`__rec.length = 0; __sc.wingShot({ x: ${cx.x + 200}, y: ${cx.y} });`);
  check('a shot 200 px from the cruiser he left (5,000 px away: past CAMP_SND.far) is not', J('__rec.length') === 0);
  g.run(`campCockpitGive(C, 'hand'); __rec.length = 0; __sc.wingShot({ x: ${cx.x + 200}, y: ${cx.y} });`);
  check('handed back, the cruiser\'s ears again', J('__rec.length') === 1);
  const sc = src('src/campaignscene.js');
  check('a hit on the ship he flies shakes the view; a hit on the cruiser he left still blinks it and sounds', /e\.id === this\.camp\.carrier\.id \|\| e\.id === campEye\(this\.camp\)\.id\) \{ if \(e\.id === campEye\(this\.camp\)\.id\) this\.cameras\.main\.shake\(90, 0\.003\); this\.flash\(e\.id\); if \(e\.hull\) this\.battleSound\('hull', 'hullHit'\)/.test(sc));
  check('the far bodies come when the ship he flies comes near', /c = campEye\(this\.camp\), near = CAMP\.world\.draw/.test(sc));
}

console.log('E. the Tab map');
{
  g.run(`__mk(); campCockpitTake(C);`);
  const marks = J(`campMapMarks(C).filter(m => m.type === 'wing').map(m => [m.id, !!m.you])`);
  check('the fighter he flies has the mark "you", the other pilots\' marks have none', marks.length === 3 && marks.filter(m => m[1]).length === 1 && marks.find(m => m[1])[0] === J('C.cockpit.id'), JSON.stringify(marks));
  g.run(`campCockpitGive(C, 'hand');`);
  check('handed back, nobody has it', J(`campMapMarks(C).some(m => m.you)`) === false);
  const md = src('src/campmapdraw.js');
  check('the map draws it as a small triangle with the cruiser\'s cyan outline, and keeps it on the frame\'s edge when zoomed in (not clipped)', /m\.type === 'wing' && m\.you/.test(md) && /!CAMPMAP_PINNED\.includes\(m\.type\) && !m\.you/.test(md));
}

console.log('F. the first-minute tip');
{
  g.run(`__mk(); C.t = 50000; window.__sh = {};`);
  const t1 = J('campNudge(C, __sh)');
  check('level 1, 50 seconds in, the switch on, a pilot out: the tip says the key from the table and how to hand back (one line)', typeof t1 === 'string' && t1 === "C flies a pilot's fighter. C again hands it back." && J('__sh.cockpit') === true, t1);
  check('shown once', J('campNudge(C, __sh)') === null);
  g.run(`__mk(); C.t = 50000; window.__sh = { attack: true }; CAMP.flags.cockpit = false;`);
  check('the switch off: no tip, and none later', J('campNudge(C, __sh)') === null && J('(() => { CAMP.flags.cockpit = true; return campNudge(C, __sh); })()') === null);
  g.run(`__mk(); C.t = 50000; window.__sh = { attack: true }; campCockpitTake(C); campCockpitGive(C, 'hand');`);
  check('once the stick was taken, never hinted', J('campNudge(C, __sh)') === null);
  g.run(`__mk(); C.t = 10000; window.__sh = {};`);
  check('not before 45 seconds (another hint may show: the beats\' own; this one does not)', J('campNudge(C, __sh)') !== "C flies a pilot's fighter. C again hands it back." && J('__sh.cockpit') === null);
  check('the words are the content table\'s with the voice-pack family (not spoken)', J(`uiText('camp.nudge.cockpit', { keycockpit: 'C' })`) !== 'camp.nudge.cockpit' && J(`VOICEPACK_FAMILIES.some(r => r.re.test('camp.nudge.cockpit'))`) === true);
}

console.log('G. pickups');
{
  g.run(`__mk(); campCockpitTake(C); __away(4000, 0); C.pickups.push({ id: 'p-x', kind: 'wreck', x: __fly().x + 5, y: __fly().y, ore: 7, born: C.t }); window.__ore0 = C.ore; campStep(C, 0.1);`);
  check('a fighter he flies over a pickup far from the cruiser takes it, into the cruiser\'s hold', J('C.ore') === J('__ore0 + 7') && J('C.pickups.some(p => p.id === "p-x")') === false, J('[C.ore, __ore0]'));
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);

// smoke: while a fighter is flown, Enter with nothing picked forms the other two pilots on that fighter (not on the cruiser) and the tag under it says Form up / Guard / Attack; in the cruiser Enter forms up on the cruiser as it did (plain Node, no Chrome)
// Card space-game-chunk10-enter-forms-on-you (Troy, 26 Nov 2026, BRIEF 8 decision 8). src/camptarget.js campSelOrder (the guard half), src/campwingtag.js campWingTag.
// Run: node tests/campwingtag.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0; return C; };
  window.__others = (C, fid) => C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && u.id !== fid);`);

const cruiser = J(`(() => { const C = __mk(); const r = campSelOrder(C, 'engage', 'key'); const o = __others(C, null).map(u => u.order && u.order.type + ':' + (u.order.at && u.order.at.kind)); return { ok: r.ok, formup: r.formup, orders: o, tag: campWingTag(C) }; })()`);
check('in the cruiser, Enter with nothing picked still forms the pilots up on the cruiser (guard at the carrier), and there is no tag', cruiser.ok && cruiser.formup === true && cruiser.orders.length === 3 && cruiser.orders.every(o => o === 'guard:carrier') && cruiser.tag === '', JSON.stringify(cruiser));

const flown = J(`(() => { const C = __mk(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); const dry = campSelOrder(C, 'engage', 'key', true); const r = campSelOrder(C, 'engage', 'key'); const o = __others(C, f.id); const all = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0);
  return { dry: dry.ok, ok: r.ok, formup: r.formup, n: o.length, atFighter: o.every(u => u.order && u.order.type === 'guard' && u.order.at && u.order.at.id === f.id), tag: campWingTag(C), uiTag: uiText(campWingTag(C)), flownOrder: f.order ? f.order.type : null, all: all.length }; })()`);
check('flown, Enter with nothing picked forms the other two on the fighter: two pilots, each guarding the fighter flown; the dry run (the chip) agrees; the chip still says Form up', flown.ok && flown.dry && flown.formup === true && flown.n === 2 && flown.atFighter === true, JSON.stringify(flown));
check('the tag says "Form up" (the Enter chip\'s own word)', flown.tag === 'camp.corner.formup' && flown.uiTag === 'Form up', JSON.stringify(flown));

const other = J(`(() => { const C = __mk(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); campSelOrder(C, 'engage', 'key');
  __others(C, f.id).forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; }); const guard = campWingTag(C);
  const a = campSpawn(C, 'raider', f.x + 800, f.y); campSeen = () => true; campTgtHold(C, a.id); const r = campSelOrder(C, 'engage', 'key'); const atk = campWingTag(C);
  campTgtClear(C); __others(C, f.id).forEach(u => { u.order = { type: 'mine', target: '' }; }); const mine = campWingTag(C);
  return { guard, attack: atk, attackOk: r.ok, mine, word: [uiText(guard), uiText(atk)] }; })()`);
check('the tag follows the order: guarding the cruiser says "Guard", an enemy picked and Enter says "Attack"; any other order (a mine) says nothing', other.guard === 'camp.corner.enter.guard' && other.attack === 'camp.corner.enter.attack' && other.attackOk && other.mine === '' && other.word.join() === 'Guard,Attack', JSON.stringify(other));

const handed = J(`(() => { const C = __mk(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); campSelOrder(C, 'engage', 'key'); const t1 = campWingTag(C); campCockpitGive(C, 'hand'); return { t1, t2: campWingTag(C) }; })()`);
check('handing the stick back removes the tag (and Enter forms up on the cruiser again)', handed.t1 === 'camp.corner.formup' && handed.t2 === '', JSON.stringify(handed));

check('the pieces exist: campWingTag, campWingTagSync and the three words', typeof J('typeof campWingTagSync') === 'string' && J('typeof campWingTagSync') === 'function' && J(`uiText('camp.corner.formup')`) === 'Form up' && J(`uiText('camp.corner.enter.guard')`) === 'Guard' && J(`uiText('camp.corner.enter.attack')`) === 'Attack');

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP WING TAG OK (${n} checks)`);
process.exit(failed ? 1 : 0);

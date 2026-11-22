// smoke: the bigger ore bay (plain Node, no Chrome)
// Card space-game-ore-bay-bigger (Troy, 21 Nov 2026: "I cannot get more than 200 ore"). The store holds 500 now (CAMP.ore.cap), the HUD says have/cap, the computer says "Ore bay full." once, and the prices that
// the bigger bay touched are held where they make sense: one full bay does not buy the whole refit, and the sell bonus of 1.2 can be earned from the ore that is there.
// Run: node tests/campbay.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

console.log('A. the bay');
check('the store holds 500', J('CAMP.ore.cap') === 500);
{
  const r = J(`(() => { const C = campNew(1, [], { seed: 1, ore: 700 }); const a = C.ore; C.ore = 495; C.pickups.push({ id: 'x1', kind: 'chunk', x: C.carrier.x, y: C.carrier.y, ore: 20, born: C.t }); campPickups(C); const b = C.ore; C.pickups.push({ id: 'x2', kind: 'chunk', x: C.carrier.x, y: C.carrier.y, ore: 20, born: C.t }); campPickups(C); return { a, b, c: C.ore, left: C.pickups.some(p => p.id === 'x2') }; })()`);
  check('a battle starts with at most 500 (700 is brought down); a chunk taken at 495 fills the bay to 500; with the bay full the next chunk stays where it lies', r.a === 500 && r.b === 500 && r.c === 500 && r.left === true, JSON.stringify(r));
  const sv = J(`(() => { localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: [], ore: 640, bonus: { fighters: 0, escorts: 0 }, results: {} })); const a = campProgressLoad().ore; localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: [], ore: 450, bonus: { fighters: 0, escorts: 0 }, results: {} })); return [a, campProgressLoad().ore]; })()`);
  check('a saved store is read back to the cap: 640 is 500, 450 is 450 (it was cut to 200 before)', sv.join() === '500,450', sv);
}

console.log('B. "Ore bay full."');
{
  const r = J(`(() => { const C = campNew(1, [], { seed: 1 }); const says = () => C.events.filter(e => e.type === 'say' && e.key === 'camp.say.orefull').length; C.events.length = 0;
    C.ore = 480; campStep(C, 0.1); const none = says(); C.ore = 500; campStep(C, 0.1); const one = says(); campStep(C, 1); campStep(C, 1); const still = says();
    C.ore = 440; campStep(C, 0.1); const under = says(); C.ore = 500; campStep(C, 0.1); const again = says(); return { none, one, still, under, again, text: uiText('camp.say.orefull') }; })()`);
  check('nothing under the cap; when the store reaches 500 it says so once, and not again while it stays full', r.none === 0 && r.one === 1 && r.still === 1, JSON.stringify(r));
  check('it can say it again once the store has been under 90 per cent (440 is under 450) and fills again; the words are "Ore bay full."', r.under === 1 && r.again === 2 && r.text === 'Ore bay full.', JSON.stringify(r));
  const hud = J(`Campaign.prototype.paintHud.toString()`);
  check('the HUD shows ore as have / cap: ORE 190/500 (the line turns amber when the bay is full)', /Math\.floor\(C\.ore\) \+ '\/' \+ CAMP\.ore\.cap/.test(hud) && /C\.ore >= CAMP\.ore\.cap \? '#ffb454'/.test(hud));
}

console.log('C. what the bigger bay touches');
{
  const o = J('({ most: CAMP.refit.most, fc: CAMP.build.fighterCost, ec: CAMP.build.escortCost, fab: CAMP.outpost.fabricator, cap: CAMP.ore.cap })');
  const extras = o.most * (o.fc + o.ec);
  check('the extra ships of a refit cost ' + extras + ' (3 fighters and 3 escorts), less than a full bay: a full bay can buy them', extras < o.cap, JSON.stringify(o));
  check('but a full bay does not buy the whole refit: the extra ships and the Fabricator cost more than the 500 the bay holds (the Fabricator was 120 when the bay held 200)', extras + o.fab > o.cap && o.fab <= o.cap, JSON.stringify(o));
  const l2 = J('CAMP.levels[1].missions[1]');
  const rocks = J('CAMP.levels[1].missions[1].rocks.reduce((a, f) => a + f.n, 0)'), ore = J('CAMP.ore.rock'), sold = l2.bonus.find(b => b.type === 'sold').n;
  check('the sell bonus of 1.2 (400) is within what the three rock fields hold (' + rocks + ' rocks of ' + ore + ' ore), so it can be earned by mining, and it is more than the 160 sale asked for and less than the goal (450 of the 500 the bay holds; card space-game-tune-l1-notes: the goal was 190)', sold === 400 && sold <= rocks * ore && sold > 160 && l2.objectives.some(x => x.type === 'cashin' && x.n === 160) && l2.objectives.some(x => x.type === 'ore' && x.n === 450 && x.n <= J('CAMP.ore.cap')) && rocks * ore >= 450 + 100, JSON.stringify([rocks, ore, sold]));
  const gb = J(`(() => { const P = campProgressNew(); P.ore = 480; P.bonus = { fighters: 1, escorts: 1 }; campHubGiveBack(P, 'escorts'); return P.ore; })()`);
  check('giving a ship back at the refit returns its ore up to the cap (480 + 45 is 500, not 525)', gb === 500, gb);
}

console.log('D. the bots');
{
  const bot = await import('../tools/campaign-bot.mjs');
  bot.setPace('normal');
  const rs = [1, 2].map(seed => bot.run(1, seed, 'plain', 'steady', bot.techsFor(1), 420, 1));
  check('the plain bot still wins 1.2 (' + rs.map(r => r.result + ' ' + r.t + ' s').join(', ') + ') and sells more than the old cap of 200 once the bay allows it (' + rs.map(r => r.sold).join(', ') + ' sold)', rs.every(r => r.result === 'won' && r.t >= 240 && r.t <= 420) && rs.every(r => r.sold > 200), JSON.stringify(rs.map(r => [r.result, r.t, r.sold])));
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPBAY FAIL (${failed} of ${n})` : `\nCAMPBAY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

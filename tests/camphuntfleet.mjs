// smoke: the small fixes of the hunt of Levels 2 and 3 after the fleet command batch (card space-game-hunt-l23-fleet; docs/night/hunt-l23-fleet.md), plain Node, no Chrome
// The six missions were flown in the real game (muted, one Chrome) and in the sim (a tape of every second, an order fuzz); each fix here is a thing a player saw.
//   A. the pick card and the refit say what the second bay does to the wing the pilot really has (the rank's ships and the refit's count), not to the table's bare bay
//   B. a pilot who is already breaking off to land for a mend is not "hit and burning, orders?": the call is for the wingman who is still out there
// Run: node tests/camphuntfleet.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeGame } from './nodegame.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const text = f => readFileSync(join(ROOT, f), 'utf8');

// ---- A. the second bay's numbers ----
// a pilot who has flown the six missions of levels 1 and 2 at 2,000 points each is a Captain: the bay holds more than the table's 6 fighters before the tech
g.run(`window.__P = (techs, bonus) => { const P = campProgressNew(); P.level = 3; P.techs = techs; P.bonus = bonus || { fighters: 0, escorts: 0 }; for (const k of ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3']) P.results[k] = { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 }; return P; };`);
const bare = J('CAMP.bay.fighters'), plus = J('CAMP.tech.bay2.fighters'), wing = J(`campHubWing(__P(['shield']))`).fighters;
check('the fixture: a Captain\'s bay holds more than the table\'s bare bay (' + wing + ' against ' + bare + ')', wing > bare);
check('the second bay says "from the bay the pilot has to that and four more": ' + (wing) + ' to ' + (wing + plus), J(`campHubTechChange('bay2', __P(['shield']))`) === `Fighters in the bay: ${wing} to ${wing + plus}`, J(`campHubTechChange('bay2', __P(['shield']))`));
check('the refit adds the ships it bought to the count (a fighter bought: one more in the "from")', (() => { const w2 = J(`campHubWing(__P(['shield'], { fighters: 2, escorts: 0 }))`).fighters; return w2 === wing + 2 && J(`campHubTechChange('bay2', __P(['shield'], { fighters: 2, escorts: 0 }))`) === `Fighters in the bay: ${w2} to ${w2 + plus}`; })());
check('a pilot who has the second bay already: the "from" leaves it out (the line says what the tech did, not what it would do twice)', (() => { const P = `__P(['shield', 'bay2'])`, w2 = J(`campHubWing(${P})`).fighters; return w2 === wing + plus && J(`campHubTechChange('bay2', ${P})`) === `Fighters in the bay: ${wing} to ${wing + plus}`; })());
check('with no pilot to ask the line is the table\'s own, as before (6 to 10)', J(`campHubTechChange('bay2')`) === `Fighters in the bay: ${bare} to ${bare + plus}`);
check('the refit overlay lists the tech with the true numbers', J(`campHubRefit(__P(['shield', 'bay2'])).techs.find(t => t.id === 'bay2').change`) === `Fighters in the bay: ${wing} to ${wing + plus}`);
check('the pick card and the refit card give the line the pilot\'s progress (campTechLine(id, this.P) in both)', J(`campTechLine('bay2', __P(['shield']))`) === `Second bay  -  Fighters in the bay: ${wing} to ${wing + plus}` && (text('src/campaignscene.js').match(/campTechLine\(id, this\.P\)/g) || []).length === 2);
check('the other techs say what they said (the shield, the plating, the repair field)', ['shield', 'plating', 'repair'].every(id => J(`campHubTechChange('${id}', __P(['shield']))`) === J(`campHubTechChange('${id}')`)));

// ---- B. the wounded call ----
g.run(`window.__box = (lv, mi) => { const C = campNew(lv, [], { seed: 1, mission: mi || 0 }); C.arrivedAt = 0; C.t = 60000; C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier }; C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); return C; };
window.__put = (C, kind, x, y, extra) => { const u = campSpawn(C, kind, x, y); if (u.team === 'earth' && !u.order) u.order = { type: 'guard', at: { kind: 'carrier' } }; Object.assign(u, extra || {}); return u; };
window.__tick = (C, n) => { for (let i = 0; i < (n || 1); i++) campCallsTick(C, 1 / 30); };`);
const open = e => J(`(() => { const C = ${e}; __tick(C); return C.call.open ? { id: C.call.open.id, ctx: C.call.open.ctx } : null; })()`);
const hurt = (share, extra, second) => open(`(() => { const C = __box(2, 1), c = C.carrier, f = __put(C, 'fighter', c.x + 300, c.y); f.hp = f.maxHp * ${share}; Object.assign(f, ${JSON.stringify(extra || {})}); ${second || ''} __put(C, 'raider', c.x + 500, c.y); return C; })()`);
check('a fighter at 35 percent with a raider on him calls, as he did', hurt(0.35)?.id === 'wounded');
check('a fighter at 25 percent who is flying home to land (the repair, src/camprepair.js) does not: he is already on his way, "keep fighting" would be a lie', hurt(0.25, { repair: true }) === null);
check('a fighter at 25 percent too far to get home (he fights on: repair is not set) still calls', hurt(0.25)?.id === 'wounded');
check('with two wounded, the one who is flying home is skipped and the other is the one the pilot calls about', (() => {
  const a = open(`(() => { const C = __box(2, 1), c = C.carrier, f = __put(C, 'fighter', c.x + 300, c.y), h = __put(C, 'fighter', c.x + 700, c.y); f.hp = f.maxHp * 0.2; f.repair = true; h.hp = h.maxHp * 0.35; __put(C, 'raider', c.x + 500, c.y); return C; })()`);
  const who = J(`(() => { const C = __box(2, 1), c = C.carrier, f = __put(C, 'fighter', c.x + 300, c.y), h = __put(C, 'fighter', c.x + 700, c.y); f.hp = f.maxHp * 0.2; f.repair = true; h.hp = h.maxHp * 0.35; __put(C, 'raider', c.x + 500, c.y); __tick(C); return [f.id, h.id, C.call.open && C.call.open.ctx.who]; })()`);
  return a && a.id === 'wounded' && who[2] === who[1]; })());

console.log(failed ? `\ncamphuntfleet: ${failed} FAILED` : '\ncamphuntfleet: all ok');
process.exit(failed ? 1 : 0);

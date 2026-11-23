// smoke: credits are kept apart from ore: a sale pays credits with no cap, ore stays what the cruiser carries (500 at the most), both are saved, and an old save loses nothing (plain Node, no Chrome)
// Card space-game-credits-apart-from-ore (Troy, 22 Nov 2026, from the hunt of missions 1.2 and 1.3: "Sold 464 ore for 1392." and the next mission began with 500; docs/night/hunt-l1-pacing.md, "The store").
// THE RULE: ORE is what the cruiser carries (C.ore, CAMP.ore.cap at the most) and is spent anywhere; CREDITS (C.cash in a battle, P.credits in the save) have no cap and are spent only at a station
// (docked at an outpost, the ready room's refit, the Earth refit), where they are spent first. In flight a repair spends ore only (src/campmend.js, card space-game-repair-with-ore).
//   A. the save: a new campaign has no credits; credits are saved and read back; ore over the store in an OLD save becomes credits (nothing is lost); a bad number is nothing
//   B. a mission: it starts with the save's ore in the store and its credits as cash; a sale turns the store into credits; what goes on is the ore that is left and all the credits (campCarryOut)
//   C. paying at a station from the save (campWealth, campSpend): credits first, then ore; refused whole when both together are short
// Run: node tests/campcredits.mjs   (exit code 1 on a failed check)
process.argv.length = 2; // the bot tool reads its options from the command line: none
const bot = await import('../tools/campaign-bot.mjs');
const g = typeof bot.botGame === 'function' ? bot.botGame() : bot.botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
g.run(`window.__load = raw => { const k = CAMP.store, had = localStorage.getItem(k); if (raw === undefined) localStorage.removeItem(k); else localStorage.setItem(k, typeof raw === 'string' ? raw : JSON.stringify(raw)); const P = campProgressLoad(); if (had == null) localStorage.removeItem(k); else localStorage.setItem(k, had); return P; };
  window.__round = P => { const k = CAMP.store, had = localStorage.getItem(k); campProgressSave(P); const raw = JSON.parse(localStorage.getItem(k)), back = campProgressLoad(); if (had == null) localStorage.removeItem(k); else localStorage.setItem(k, had); return { raw, back }; };`);

console.log('A. the save');
{
  const cap = J('CAMP.ore.cap');
  check('the store is 500 (this card does not change it)', cap === 500, String(cap));
  check('a new campaign has no ore and no credits', J('campProgressNew().ore') === 0 && J('campProgressNew().credits') === 0, JSON.stringify(J('[campProgressNew().ore, campProgressNew().credits]')));
  const rt = J(`__round(Object.assign(campProgressNew(), { ore: 310, credits: 1392 }))`);
  check('credits are saved beside the ore and read back, with no cap on them', rt.raw.ore === 310 && rt.raw.credits === 1392 && rt.back.ore === 310 && rt.back.credits === 1392, JSON.stringify([rt.raw.ore, rt.raw.credits, rt.back.ore, rt.back.credits]));
  const big = J(`__round(Object.assign(campProgressNew(), { ore: 500, credits: 250000 }))`);
  check('a quarter of a million credits are kept whole', big.back.credits === 250000 && big.back.ore === 500, JSON.stringify([big.back.ore, big.back.credits]));
  const old = J(`__load({ level: 1, mission: 2, techs: [], ore: 1392, results: {} })`);
  check('an OLD save (no credits field) with 1,392 "ore", the cash of a sale: 500 stays ore and 892 becomes credits, nothing is lost', old.ore === 500 && old.credits === 892 && old.level === 1 && old.mission === 2, JSON.stringify([old.ore, old.credits]));
  const oldSmall = J(`__load({ level: 2, mission: 0, techs: [], ore: 120, results: {} })`);
  check('an old save under the store is as it was, with no credits', oldSmall.ore === 120 && oldSmall.credits === 0, JSON.stringify([oldSmall.ore, oldSmall.credits]));
  const both = J(`__load({ level: 1, mission: 2, techs: [], ore: 900, credits: 40, results: {} })`);
  check('a save that has credits and still more ore than the store (it cannot be written by the game): the ore over the store joins the credits', both.ore === 500 && both.credits === 440, JSON.stringify([both.ore, both.credits]));
  const bad = J(`[__load({ ore: 100, credits: -5 }), __load({ ore: 100, credits: 'lots' }), __load({ ore: 100, credits: 12.9 }), __load({ ore: 100, credits: null }), __load('not json'), __load(undefined)].map(P => [P.ore, P.credits])`);
  check('a bad credits number is no credits, a fraction is cut down, a broken or missing save is a new campaign', JSON.stringify(bad) === JSON.stringify([[100, 0], [100, 0], [100, 12], [100, 0], [0, 0], [0, 0]]), JSON.stringify(bad));
}

console.log('B. a mission');
{
  const st = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1, ore: 310, credits: 1392 }); const D = campNew(1, [], { seed: 1, mission: 1, ore: 9999, credits: 7 }); const E = campNew(1, [], { seed: 1, mission: 1 }); return [[C.ore, C.cash], [D.ore, D.cash], [E.cash]]; })()`);
  check('a mission starts with the save\'s ore in the store (500 at the most) and its credits as the cruiser\'s cash; with none given there is none', st[0][0] === 310 && st[0][1] === 1392 && st[1][0] === 500 && st[1][1] === 7 && st[2][0] === 0, JSON.stringify(st));
  const r = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1, ore: 0, credits: 100 }); for (let i = 0; i < 30; i++) campStep(C, 1 / 30); C.ore = 464; const o = campOutposts(C.level).find(o => o.market); const sold = campSell(C, o);
    C.ore = 37.6; const P = Object.assign(campProgressNew(), { ore: 5, credits: 5 }); campCarryOut(P, C); return { sold, cash: C.cash, P: [P.ore, P.credits], funds: campFunds(C) }; })()`);
  check('a sale of 464 ore pays 1,392 credits on top of the 100 the cruiser had, and empties the store', r.sold.cash === 1392 && r.cash === 1492, JSON.stringify(r));
  check('what goes on from the mission: the ore left in the store (whole numbers) and ALL the credits; nothing is cut', r.P[0] === 37 && r.P[1] === 1492, JSON.stringify(r.P));
  const over = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1 }); C.ore = 500; C.cash = 3000.4; const P = campProgressNew(); campCarryOut(P, C); return [P.ore, P.credits]; })()`);
  check('a full store and 3,000 credits both go on', over[0] === 500 && over[1] === 3000, JSON.stringify(over));
  const full = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1, ore: 0, credits: 0 }); for (let i = 0; i < 30; i++) campStep(C, 1 / 30); C.ore = 464; campSell(C, campOutposts(C.level).find(o => o.market)); const P = campProgressNew(); campCarryOut(P, C); const rt = __round(P); const N = campNew(1, [], { seed: 1, mission: 2, ore: rt.back.ore, credits: rt.back.credits }); return [rt.back.ore, rt.back.credits, N.ore, N.cash]; })()`);
  check('the case of the hunt, end to end: sell 464 ore in 1.2, save, load, start 1.3: the 1,392 is all there', JSON.stringify(full) === '[0,1392,0,1392]', JSON.stringify(full));
}

console.log('C. paying at a station from the save');
{
  const r = J(`(() => { const P = Object.assign(campProgressNew(), { ore: 300, credits: 40 }); const out = [campWealth(P)];
    out.push(campSpend(P, 25), [P.ore, P.credits]);      // 25 of the 40 credits
    out.push(campSpend(P, 45), [P.ore, P.credits]);      // the 15 credits left, then 30 ore
    out.push(campSpend(P, 271), [P.ore, P.credits]);     // one more than there is: refused, nothing moves
    out.push(campSpend(P, 270), [P.ore, P.credits]);     // all of it
    out.push(campSpend(P, 0), campSpend(P, -5), campWealth(P)); return out; })()`);
  check('what can be spent at a station is the credits and the ore together', r[0] === 340, String(r[0]));
  check('credits are spent first', r[1] === true && JSON.stringify(r[2]) === '[300,15]', JSON.stringify(r.slice(1, 3)));
  check('then ore, for what the credits do not cover', r[3] === true && JSON.stringify(r[4]) === '[270,0]', JSON.stringify(r.slice(3, 5)));
  check('a price over both together is refused whole: nothing is taken', r[5] === false && JSON.stringify(r[6]) === '[270,0]', JSON.stringify(r.slice(5, 7)));
  check('exactly what there is can be spent, and a price of nothing or less takes nothing', r[7] === true && JSON.stringify(r[8]) === '[0,0]' && r[9] === true && r[10] === false && r[11] === 0, JSON.stringify(r.slice(7)));
  const give = J(`(() => { const P = Object.assign(campProgressNew(), { ore: 490, credits: 0 }); campRefund(P, 45); const Q = Object.assign(campProgressNew(), { ore: 100, credits: 7 }); campRefund(Q, 45); campRefund(Q, 0); campRefund(Q, -9); return [[P.ore, P.credits], [Q.ore, Q.credits]]; })()`);
  check('money given back at a station (a refit item returned) fills the store first, since ore is what a repair in flight can spend, and the rest is credits: 490 and 45 back is 500 ore and 35 credits, nothing is cut', JSON.stringify(give) === '[[500,35],[145,7]]', JSON.stringify(give));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCREDITS FAIL (${failed} of ${n})` : `\nCREDITS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

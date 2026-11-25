// smoke: a new order that replaces a different one in progress says so in one short radio line from one pilot (plain Node, no Chrome)
// Card space-game-order-replaced-line (Troy, 25 Nov 2026). src/campwing.js campWingSayReplaced: one line per order, named for the NEW order (camp.say.replaced.<verb>), said by the first pilot taken off a different order that is still in progress.
//   A. when it speaks: a different order in progress          B. when it is silent: idle, the same order, an order that has run out, a dry check
//   C. one line, one speaker, however many pilots are picked  D. the replacing is as it was (the new order is the pilots' order)
//   E. the words: seven keys, curt, the voicepack names them for the three pilots
// Run: node tests/camporderreplaced.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g); // the old Level 1 as a fixture level, as tests/campwing.mjs flies on it
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = () => { window.C = campNew(11, [], { seed: 2, god: true, mission: 1 }); C.arrivedAt = 0; C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);
    campOrder(C, 'launch'); for (let i = 0; i < 300; i++) { campStep(C, 1 / 30); C.events.length = 0; } return C; };
  window.__foe = (dx, dy) => { var u = campSpawn(C, 'gunship', C.carrier.x + dx, C.carrier.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; return u; };
  window.__ord = (grp, verb, tg, dry) => { C.events.length = 0; var r = dry ? campWingCheck(C, grp, verb, tg) : campWingOrder(C, grp, verb, tg, 'test'); return { ok: r.ok, said: C.events.filter(e => e.type === 'say' && /^camp\\.say\\.replaced\\./.test(e.key)).map(e => ({ key: e.key, text: uiText(e.key, e.vars) })) }; };
  window.__pilot = id => C.ships.find(u => u.pilot === id);
`);

// ---------- A. when it speaks ----------
console.log('A. when it speaks');
{
  g.run('__new()');
  const f1 = J('__foe(900, 0).id'), f2 = J('__foe(0, 900).id');
  const a = J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  check('idle pilots (guarding the cruiser) given an attack: no line (nothing was replaced)', a.ok && a.said.length === 0, JSON.stringify(a));
  const b = J(`__ord('fighters', 'attack', ${JSON.stringify(f2)})`);
  check('on an attack, given an attack on another ship: one line, named for the new order, from Wedge', b.ok && b.said.length === 1 && b.said[0].key === 'camp.say.replaced.attack' && /^Wedge: breaking off\./.test(b.said[0].text), JSON.stringify(b));
  const c = J(`__ord('fighters', 'guard', null)`);
  check('on an attack, told to guard the cruiser: "forming up", one line', c.ok && c.said.length === 1 && c.said[0].key === 'camp.say.replaced.guard' && /Forming up/.test(c.said[0].text), JSON.stringify(c));
  const d = J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  check('idle again (the guard of the cruiser is where a pilot rests): the next attack is silent', d.ok && d.said.length === 0, JSON.stringify(d));
  J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  const e = J(`__ord('fighters', 'recall', null)`);
  check('on an attack, told to recall: "heading home"', e.ok && e.said.length === 1 && e.said[0].key === 'camp.say.replaced.recall' && /Heading home/.test(e.said[0].text), JSON.stringify(e));
  g.run('__new()');
  const f3 = J('__foe(900, 0).id');
  J(`__ord('fighters', 'attack', ${JSON.stringify(f3)})`);
  const h = J(`__ord('fighters', 'hold', { x: 1500, y: 1500 })`);
  check('on an attack, told to hold a point: "going to hold there"', h.ok && h.said.length === 1 && h.said[0].key === 'camp.say.replaced.hold', JSON.stringify(h));
  const m = J(`(() => { C.rocks.push({ id: 'rock-t', x: C.carrier.x + 300, y: C.carrier.y, r: 30, hp: 50, maxHp: 50 }); return __ord('fighters', 'mine', null); })()`);
  check('on a hold, told to mine (with ore about): "going to mine"', m.ok && m.said.length === 1 && m.said[0].key === 'camp.say.replaced.mine', JSON.stringify(m));
  const t = J(`__ord('fighters', 'attack', ${JSON.stringify(f3)})`);
  check('on a mine, told to attack: the line is named for the attack', t.ok && t.said.length === 1 && t.said[0].key === 'camp.say.replaced.attack', JSON.stringify(t));
}

// ---------- B. when it is silent ----------
console.log('B. when it is silent');
{
  g.run('__new()');
  const f1 = J('__foe(900, 0).id'), f2 = J('__foe(0, 900).id');
  J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  const same = J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  check('the same order again (the same kind, the same ship): no line', same.ok && same.said.length === 0, JSON.stringify(same));
  g.run(`C.by[${JSON.stringify(f1)}].hp = 0`);
  const gone = J(`__ord('fighters', 'attack', ${JSON.stringify(f2)})`);
  check('an attack whose ship is already gone has run out: the new order replaces nothing in progress, no line', gone.ok && gone.said.length === 0, JSON.stringify(gone));
  const dry = J(`(() => { __ord('fighters', 'attack', ${JSON.stringify(f2)}); const before = JSON.stringify(C.ships.filter(u => u.pilot).map(u => u.order)); const r = __ord('fighters', 'guard', null, true); return { r, same: before === JSON.stringify(C.ships.filter(u => u.pilot).map(u => u.order)) }; })()`);
  check('a dry check (the ship computer asking first) says nothing and changes nothing', dry.r.said.length === 0 && dry.same, JSON.stringify(dry));
  g.run('__new()');
  const idleRecall = J(`__ord('fighters', 'recall', null)`);
  check('idle pilots told to recall: no line', idleRecall.ok && idleRecall.said.length === 0, JSON.stringify(idleRecall));
  g.run('__new()');
  const f4 = J('__foe(900, 0).id');
  J(`__ord('red', 'guard', { x: 1400, y: 1400 })`);
  const g2 = J(`__ord('red', 'guard', { x: 1400, y: 1400 })`);
  check('a guard of a point given twice: the same order, no line', g2.ok && g2.said.length === 0, JSON.stringify(g2));
  const g3 = J(`__ord('red', 'attack', ${JSON.stringify(f4)})`);
  check('on a guard of a point (not the cruiser), told to attack: that is a replaced order, one line', g3.ok && g3.said.length === 1 && g3.said[0].key === 'camp.say.replaced.attack', JSON.stringify(g3));
}

// ---------- C. one line, one speaker ----------
console.log('C. one line, one speaker');
{
  g.run('__new()');
  const f1 = J('__foe(900, 0).id'), f2 = J('__foe(0, 900).id');
  J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  const all = J(`__ord('fighters', 'attack', ${JSON.stringify(f2)})`);
  check('all three pilots picked, all on another order: ONE line, from Wedge', all.said.length === 1 && /^Wedge: /.test(all.said[0].text), JSON.stringify(all));
  g.run('__new()');
  const f3 = J('__foe(900, 0).id'), f4 = J('__foe(0, 900).id');
  J(`__ord('green', 'attack', ${JSON.stringify(f3)})`); J(`__ord('yellow', 'attack', ${JSON.stringify(f3)})`);
  const part = J(`__ord('fighters', 'attack', ${JSON.stringify(f4)})`);
  check('Wedge was idle, Kara and Apollo were on another order: one line, from Kara (the first one taken off an order)', part.said.length === 1 && /^Kara: /.test(part.said[0].text), JSON.stringify(part));
  const one = J(`(() => { __ord('yellow', 'attack', ${JSON.stringify(f3)}); return __ord('yellow', 'guard', null); })()`);
  check('one pilot picked: that pilot speaks (Apollo)', one.said.length === 1 && /^Apollo: /.test(one.said[0].text), JSON.stringify(one));
  const twice = J(`(() => { __ord('fighters', 'attack', ${JSON.stringify(f3)}); const a = __ord('fighters', 'guard', null), b = __ord('fighters', 'attack', ${JSON.stringify(f4)}); return { a, b }; })()`);
  check('two orders in a row, each replacing one in progress: one line each, and a guard of the cruiser between them is a rest (the second order replaces nothing)', twice.a.said.length === 1 && twice.b.said.length === 0, JSON.stringify(twice));
}

// ---------- D. the replacing is as it was ----------
console.log('D. the replacing is as it was');
{
  g.run('__new()');
  const f1 = J('__foe(900, 0).id'), f2 = J('__foe(0, 900).id');
  J(`__ord('fighters', 'attack', ${JSON.stringify(f1)})`);
  const r = J(`(() => { const x = __ord('fighters', 'attack', ${JSON.stringify(f2)}); return { x, orders: C.ships.filter(u => u.pilot).map(u => u.order.type + '|' + u.order.target), n: C.orders.attack }; })()`);
  check('the new order is every pilot\'s order (the line only reports it), and the count of attack orders is as it was (2)', r.orders.length === 3 && r.orders.every(o => o === 'attack|' + f2) && r.n === 2, JSON.stringify(r));
  const code = src('src/campwing.js');
  check('the line is said after the order is set, in the orders that set one: Recall, Escort with no convoy, and the general assignment', (code.match(/(?<!function )campWingSayReplaced\(C, ships,/g) || []).length === 3);
}

// ---------- E. the words ----------
console.log('E. the words');
{
  const verbs = ['attack', 'escort', 'guard', 'hold', 'fetch', 'mine', 'recall'];
  const lines = verbs.map(v => J(`uiText('camp.say.replaced.${v}', { name: 'Apollo' })`));
  check('seven lines, one for each verb, each with its words (none is its own key)', lines.every((t, i) => t !== 'camp.say.replaced.' + verbs[i]) && new Set(lines).size === 7, JSON.stringify(lines));
  check('each is curt: 12 words or fewer, the pilot\'s name first, no placeholder left', lines.every(t => t.split(/\s+/).length <= 12 && /^Apollo: breaking off\./.test(t) && !/[{}]/.test(t)), JSON.stringify(lines));
  check('none says a banned word of the stale-lines list', lines.every(t => !/squad|tuck|stance|say or type|split the/i.test(t)), JSON.stringify(lines));
  const ex = J(`['attack', 'escort', 'guard', 'hold', 'fetch', 'mine', 'recall'].map(v => (VOICEPACK_EXPAND['camp.say.replaced.' + v] ? VOICEPACK_EXPAND['camp.say.replaced.' + v]() : []).map(x => x.name).join())`);
  check('the voicepack lists the three pilots for each line (Wedge, Kara, Apollo), so each is recorded for each pilot', ex.every(s => s === 'Wedge,Kara,Apollo'), JSON.stringify(ex));
  const docs = src('docs/CAMPAIGN.md') + src('PROJECT_STATUS.md');
  check('the docs say it (card space-game-order-replaced-line)', /order-replaced-line/.test(docs) && /breaking off/i.test(docs));
}
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);

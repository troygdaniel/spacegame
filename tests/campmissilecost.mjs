// smoke: missiles cost ore (20 each): the magazine does not fill itself, the ship builds ONE at 0 when the ore allows, each press of R queues one more (card space-game-missile-queue), the count joins the status block and the S list has the row (plain Node, no Chrome)
// Card space-game-missiles-cost-ore (Troy, 24 Nov 2026: "building missiles takes ore. Automatic, but only when down to 0 missiles; and a key to build when not at 0 so he can reload in calm times: R, shown as a row on the S list").
// The rule is src/campmissilebuild.js (CAMP.missile.cost and .reload), called from campMissiles in src/campaign.js; the block is src/campcruiserhud.js; the key and the row are src/data_controls.js and src/camppanel.js.
//   A. the table and the words: the price, the build time, the key R, the texts, the script loaded once, the order's name
//   B. no free reload: a magazine below its full stays where it is (no ore, no build) however long the battle runs; loot still adds to it with no ore spent
//   C. at zero: the ship builds one by itself, the ore is paid when the build starts, the missile lands after a build time, and it builds no second while there is one; with too little ore it builds nothing
//   D. R: each press QUEUES ONE missile (card space-game-missile-queue); presses add up to the empty slots; the queue is built one after another, each paid when it starts; stops short of ore (one line on the radio); refusals in words (full, every slot queued, no ore); a dry check changes nothing
//   E. state: building with the seconds, no ore, ready, full (what the block and the row say)
//   F. the block: the MISSILES line at the top right (MISSILES n/cap, +n for the queue, building s, no ore, the R chip after the words), the corners stay level and inside the screen, the old bottom-left count is gone from the scene
//   G. the S list: the row Reload missiles with the R chip and the ore price, grey with a reason; R the key runs the same order (not Shift+R); the strip's words "reload missiles" are the order and do not fire a missile
// Run: node tests/campmissilecost.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__m = (ore, missiles) => { window.C = campNew('home', [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.ore = ore == null ? 0 : ore; if (missiles != null) C.missiles = missiles; return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) campStep(C, 1 / 30); };
  window.__R = () => { const r = campOrder(C, 'reload', '', 'key'); return { ok: r.ok, code: r.code, say: r.say }; };
  window.__ev = type => C.events.filter(e => e.type === type).length;
`);

// ---- A. the table and the words ----
{
  const K = J('CAMP.missile');
  check('the price is 20 ore a missile and the build time is 10 s (15 until card space-game-missile-build-10s); the rack is six', K.cost === 20 && K.reload === 10000 && K.magazine === 6, JSON.stringify(K));
  check('R is a key of the table (CAMP_KEYS.reload), the key cap says R and the code is KeyR', J('CAMP_KEYS.reload.k') === 'R' && J('CAMP_KEYS.reload.codes.join()') === 'KeyR');
  check('the order is "reload" and a battle starts with no build and an empty queue: reloadAt 0, queued 0', (g.run('__m(100)'), J('C.reloadAt') === 0 && J('C.queued') === 0 && J('C.rackOn') === null)); // (no flag of the old whole-rack run is left)
  const words = ['camp.cruiser.missiles', 'camp.cruiser.building', 'camp.cruiser.noore', 'camp.say.reload', 'camp.say.rackdry', 'camp.no.rackfull', 'camp.no.reloading'];
  check('the seven words are in the words file and in the table, with the words the card says', words.every(k => src('content/text/campaign-missiles.md').includes('| ' + k + ' |') && src('src/contenttables.js').includes("'" + k + "'")));
  check('the words fill their numbers: building {s} s, Reloading {n} more {ore} ore, the rack stops at {n}', J(`uiText('camp.cruiser.building', { s: 12 })`) === 'building 12 s' && J(`uiText('camp.say.reload', { n: 3, ore: 60 })`) === 'Reloading: 3 more, 60 ore.' && J(`uiText('camp.say.rackdry', { n: 4 })`) === 'Out of ore, pilot. The rack stops at 4.');
  check('"the magazine is empty" says which key builds more (the key is read from the table, not typed)', J(`uiText('camp.no.nomissiles')`) === 'The magazine is empty, pilot. R builds more, for ore.');
  check('the old count\'s two words are gone (the count is in the block now)', !src('content/text/ui.md').includes('camp.ui.missilenext') && !src('src/contenttables.js').includes("'camp.ui.missiles'"));
  check('the script is loaded once, right after the campaign\'s rules', (src('index.html').match(/src\/campmissilebuild\.js/g) || []).length === 1 && src('index.html').indexOf('src/campmissilebuild.js') > src('index.html').indexOf('src/campaign.js'));
}

// ---- B. no free reload ----
{
  g.run('__m(100, 3); __run(120)');
  check('three missiles, 100 ore, two minutes of battle: still three, nothing building, no ore spent (the timer does not build above zero)', J('C.missiles') === 3 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 100, J('[C.missiles, C.reloadAt, C.ore]'));
  g.run('__m(0, 3); __run(60)');
  check('the same with no ore: still three', J('C.missiles') === 3 && J('C.reloadAt') === 0);
  g.run('__m(100, 3); campMissileAdd(C, 2)');
  check('loot goes straight into the rack and costs no ore', J('C.missiles') === 5 && J('Math.floor(C.ore)') === 100);
}

// ---- C. at zero ----
{
  g.run('__m(100, 0); __run(0.1)');
  check('at zero with 100 ore: a build starts at once, 20 ore are paid at its start, and none is in the rack yet', J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80 && J('C.missiles') === 0, J('[C.reloadAt, C.ore, C.missiles]'));
  g.run('__run(9)');
  check('9 s later the missile is not done (the build takes 10 s)', J('C.missiles') === 0 && J('C.reloadAt') > 0);
  g.run('__run(2)');
  check('after 10 s it is in the rack: one missile, nothing building, 80 ore left', J('C.missiles') === 1 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 80 && J('__ev("mbuilt")') === 1, J('[C.missiles, C.reloadAt, C.ore]'));
  g.run('__run(60)');
  check('with one in the rack the ship builds no second one by itself, however long it waits', J('C.missiles') === 1 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 80);
  g.run('__m(100, 1); __fire = () => campOrder(C, "missiles", "", "key"); C.nextRocket = 0; campFire(C, null); __run(0.1)');
  check('firing the last missile (0 left) starts the build in the next frame', J('C.missiles') === 0 && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80);
  g.run('__m(19, 0); __run(30)');
  check('19 ore is not enough for a missile at 20: nothing builds, the ore stays', J('C.missiles') === 0 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 19);
  g.run('C.ore = 20; __run(0.1)');
  check('20 ore is enough: the build starts and takes all of it', J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 0);
  g.run('CAMP.missile.cost = 0; __m(0, 0); __run(16)');
  check('a price of 0 makes them free again: the one at zero is built with no ore at all', J('C.missiles') === 1 && J('Math.floor(C.ore)') === 0);
  g.run('CAMP.missile.cost = 20');
}

// ---- D. R ----
{
  g.run('__m(100, 3)');
  const dry = J('campCheck(C, "reload", "")');
  check('a dry check says what R would do and changes nothing: one more, 20 ore', dry.ok && dry.say === 'Reloading: 1 more, 20 ore.' && J('C.queued') === 0 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 100, JSON.stringify(dry));
  const r = J('__R()');
  check('R with three of six and 100 ore queues ONE: "Reloading: 1 more, 20 ore." and its build starts at once (20 ore paid, nothing waiting)', r.ok && r.say === 'Reloading: 1 more, 20 ore.' && J('C.queued') === 0 && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80 && J('campMissileState(C).pending') === 1, JSON.stringify(r));
  const two = J('__R()');
  check('R again while it builds queues another: "Reloading: 2 more, 20 ore." (the one waiting is paid when its build starts: nothing more now)', two.ok && two.say === 'Reloading: 2 more, 20 ore.' && J('C.queued') === 1 && J('Math.floor(C.ore)') === 80 && J('campMissileState(C).pending') === 2, JSON.stringify(two));
  const three = J('__R()');
  check('a third press: 3 more, 40 ore still to pay (the two slots left after the build under way: three of six, one building, two waiting)', three.ok && three.say === 'Reloading: 3 more, 40 ore.' && J('C.queued') === 2 && J('campMissileState(C).pending') === 3, JSON.stringify(three));
  const four = J('__R()');
  check('a fourth press: every empty slot has a missile on its way: refused in words, nothing more is queued or paid', !four.ok && four.code === 'reloading' && four.say === 'Already building the rack, pilot.' && J('C.queued') === 2 && J('Math.floor(C.ore)') === 80, JSON.stringify(four));
  g.run('__run(10.2)');
  check('after one build time: four missiles, the next build has started and is paid (60 ore left), one waits', J('C.missiles') === 4 && J('C.reloadAt') > 0 && J('C.queued') === 1 && J('Math.floor(C.ore)') === 60, J('[C.missiles, C.queued, C.ore]'));
  g.run('__run(10)');
  check('after two: five, the last one is building (40 ore left), nothing waits', J('C.missiles') === 5 && J('C.queued') === 0 && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 40);
  g.run('__run(10)');
  check('after three: six, the rack is full and nothing more is built; 3 x 20 = 60 ore in all', J('C.missiles') === 6 && J('C.queued') === 0 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 40, J('[C.missiles, C.queued, C.ore]'));
  g.run('__run(60)');
  check('and it stays six a minute later', J('C.missiles') === 6 && J('Math.floor(C.ore)') === 40);
  const full = J('__R()');
  check('R with a full rack: "The rack is full, pilot."', !full.ok && full.code === 'rackfull' && full.say === 'The rack is full, pilot.', JSON.stringify(full));
  g.run('__m(10, 3)');
  const poor = J('__R()');
  check('R with 10 ore: refused with the need and what is in the store (the ore codes\' own words), nothing is queued', !poor.ok && poor.code === 'noore2' && /20 needed/.test(poor.say) && /10 in the store/.test(poor.say) && J('C.queued') === 0, JSON.stringify(poor));
  g.run('__m(50, 3)'); g.run('__R()'); const second = J('__R()'), third = J('__R()');
  check('50 ore, three missing: the first press pays 20 and starts, the second queues (20 of the 30 left will pay it), the third is refused: it needs 40 and the store has 30', second.ok && !third.ok && third.code === 'noore2' && /40 needed/.test(third.say) && /30 in the store/.test(third.say) && J('C.queued') === 1, JSON.stringify([second, third]));
  g.run('__run(10.2)');
  check('the two are built: four, then (after another build time) five, 10 ore left, nothing is said', (g.run('__run(10)'), J('C.missiles') === 5) && J('Math.floor(C.ore)') === 10 && J('C.queued') === 0 && J('C.events.filter(e => e.type === "say" && e.key === "camp.say.rackdry").length') === 0);
  g.run('__m(100, 3); __R(); __R(); __R(); C.ore = 5; __run(10.2)');
  check('ore spent elsewhere while it is queued: the one building lands (four), the next cannot start: the queue stops where it is and the radio says so once ("The rack stops at 4")', J('C.missiles') === 4 && J('C.queued') === 0 && J('C.reloadAt') === 0 && J('C.events.filter(e => e.type === "say" && e.key === "camp.say.rackdry").length') === 1 && J('C.events.find(e => e.key === "camp.say.rackdry").vars.n') === 4, J('C.events.filter(e => e.type === "say").map(e => e.key).join()'));
  g.run('__m(100, 3); __R(); __R(); __R(); campMissileAdd(C, 2); __run(0.1)');
  check('loot fills the rack while it is queued (three plus two = five, one building): the queue is cut to the slots left (none), the build under way lands', J('C.missiles') === 5 && J('C.queued') === 0 && J('C.reloadAt') > 0, J('[C.missiles, C.queued, C.reloadAt]'));
  g.run('__m(100, 3); __R(); C.nextRocket = 0; campFire(C, null); campFire(C, null); __run(10.2)');
  check('missiles fired while one is being built: the build goes on and lands (one fired twice from three: one left, then two)', J('C.missiles') === 2 && J('C.reloadAt') === 0, J('[C.missiles, C.reloadAt]'));
  g.run('__m(100, 0); __run(0.1)');
  const mid = J('__R()');
  check('R at zero while the ship is already building its one: it queues one more (2 on their way; paid when its build starts: 80 now, 60 after the first)', mid.ok && mid.say === 'Reloading: 2 more, 20 ore.' && J('C.queued') === 1 && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80 && (g.run('__run(10.2)'), J('C.missiles') === 1 && J('Math.floor(C.ore)') === 60 && J('C.queued') === 0 && J('C.reloadAt') > 0), JSON.stringify(mid));
  g.run('__m(0, 0); __run(1)');
  check('R at zero with no ore and nothing building: refused (no ore), and nothing is queued', !J('__R()').ok && J('C.queued') === 0);
  check('a battle that is over takes no order', (g.run('__m(100, 3); C.result = "won"'), J('__R().code') === 'over'));
}

// ---- E. state ----
{
  g.run('__m(100, 6)');
  check('state: a full rack is "full"', J('campMissileState(C).state') === 'full');
  g.run('__m(100, 3)');
  check('state: below the full with nothing building is "ready" (R would queue one), nothing on its way', J('campMissileState(C).state') === 'ready' && J('campMissileState(C).cap') === 6 && J('campMissileState(C).n') === 3 && J('campMissileState(C).pending') === 0 && J('campMissileState(C).queued') === 0);
  g.run('__R(); __R()');
  check('state: with two presses the first is building and one waits: pending 2, queued 1', J('campMissileState(C).state') === 'building' && J('campMissileState(C).pending') === 2 && J('campMissileState(C).queued') === 1 && J('campMissileState(C).rack') === true);
  g.run('__m(100, 0); __run(0.1)');
  check('state: a build under way is "building" with the seconds left (10, rounded up)', J('campMissileState(C).state') === 'building' && J('campMissileState(C).secs') === 10, J('campMissileState(C)'));
  g.run('__m(5, 0); __run(0.1)');
  check('state: at zero with too little ore and nothing building is "noore"', J('campMissileState(C).state') === 'noore');
  g.run('__m(5, 2)');
  check('state: two left and no ore is only "ready" (nothing is wrong yet: it builds when it is at zero)', J('campMissileState(C).state') === 'ready');
}

// ---- F. the block ----
{
  g.run('__m(100, 3)');
  check('each block has two lines: shield and hull at the top left, ore and missiles at the top right (card space-game-ore-missiles-topright)', J('CAMPCRUISERHUD.lines') === 2);
  const S = J('campCruiserStatus(C)');
  check('the status has the missiles: three of six, ready', S.missiles && S.missiles.n === 3 && S.missiles.cap === 6 && S.missiles.state === 'ready', JSON.stringify(S.missiles));
  check('the line says "MISSILES  3/6"; ready says nothing on the right', J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  3/6' && J('campCruiserMissileWhy(campCruiserStatus(C))') === '');
  g.run('__m(100, 3); __R(); __R(); __R()');
  check('with three presses the line shows what is on its way after the count: "MISSILES  3/6 +3" (the one building and the two waiting), and says building on the right', J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  3/6 +3' && /^building \d+ s$/.test(J('campCruiserMissileWhy(campCruiserStatus(C))')), J('campCruiserMissileLine(campCruiserStatus(C))'));
  g.run('__m(100, 3); __R(); __run(10.2)');
  check('when the queue has landed the +n goes: nothing on its way, no plus', (g.run('__m(100, 5); __R(); __run(10.2)'), J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  6/6'));
  g.run('__m(100, 0); __run(0.1)');
  check('building says "building 10 s" on the right', J('campCruiserMissileWhy(campCruiserStatus(C))') === 'building 10 s');
  g.run('__m(0, 0); __run(0.1)');
  check('at zero with no ore it says "no ore" on the right, and the line says 0/6', J('campCruiserMissileWhy(campCruiserStatus(C))') === 'no ore' && J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  0/6');
  const Z = J('campCruiserHudGeom()'), T = J('CAMP.corner.at'), Th = J('CAMP.corner.title.h'), K = J('CAMPCRUISERHUD');
  const Rb = Z.right;
  check('the missiles line is the second of the top right block, one row under the ore line, the state at the right edge of the block', Rb.mis.y === Rb.ore.y + K.row && Rb.misWhy.y === Rb.mis.y && Rb.misWhy.x === Rb.x1 - K.pad && Rb.mis.x === Rb.ore.x, JSON.stringify([Rb.mis, Rb.ore, Rb.misWhy]));
  check('the blocks stand inside the screen (their plates start at y >= 0) and end 4 px above the S CRUISER and HOSTILES title rows', Z.plate.y >= 0 && Rb.plate.y >= 0 && Z.y1 + K.gap === T.tl.y && Z.bottom === T.tl.y && Rb.y1 + K.gap === T.tr.y && Rb.bottom === T.tr.y, JSON.stringify([Z.plate, Rb.plate, T.tl, T.tr]));
  check('the two top corners are still level (HOSTILES with S CRUISER) and the bottom ones too, so the two blocks are level (card space-game-layout-align kept)', T.tl.y === T.tr.y && T.bl.y === T.br.y && T.tl.y === 78 && Z.y0 === Rb.y0, JSON.stringify(T));
  check('the title row and the room under it are still on the screen (the S list is the tallest thing under it)', T.tl.y + Th + 4 + 200 < J('H'), T.tl.y);
  // the R chip beside the count (Troy, 24 Nov 2026: "show the R chip beside the missile count"; ORCH, card space-game-ore-missiles-topright: it showed as a blank cyan square: the letter was under the HUD graphics, and the rectangle over it)
  g.run(`window.__st = () => { const calls = [], rec = k => (...a) => { calls.push([k].concat(a)); return gg; }, gg = { calls, fillStyle: rec('fillStyle'), fillRect: rec('fillRect'), lineStyle: rec('lineStyle'), strokeRect: rec('strokeRect'), fillRoundedRect: rec('fillRoundedRect'), clear: rec('clear') }; return gg; };
    window.__tx = () => { const t = { text: '', color: '', x: 0, y: 0, setText(v) { t.text = String(v); return t; }, setColor(c) { t.color = c; return t; }, setPosition(x, y) { t.x = x; t.y = y; return t; } }; return t; };
    window.__H = () => ({ crShieldL: __tx(), crShieldN: __tx(), crHullL: __tx(), crHullN: __tx(), crOre: __tx(), crCash: __tx(), crMis: __tx(), crMisKey: __tx(), crMisWhy: __tx(), crChipG: __st() });`);
  const ch = J('CAMPCRUISERHUD.chip'), T2 = J('CAMP.corner.title'), cc = J('CAMP.corner.chip');
  check('the chip stands on the missiles line, after the longest count (MISSILES  12/12) and before the state at the right', Rb.misKey.y === Rb.mis.y && Rb.misKey.x === Rb.mis.x + ch.x && Rb.misKey.x - T2.chipW / 2 > Rb.mis.x + 100 && Rb.misKey.x + T2.chipW / 2 < Rb.misWhy.x - 80, JSON.stringify([Rb.mis, Rb.misKey, Rb.misWhy]));
  check('the chip follows the words and keeps clear of the state: the design\'s longest line (MISSILES  6/12 +6, a magazine of twelve) with the longest state (building 15 s) leave the chip clear of both, and the state clear of the words; with no queue the chip keeps its own place', (() => { const Kf = J('CAMPCRUISERHUD'), line = 'MISSILES  6/12 +6', w = line.length * Kf.charW.caps * Kf.font.line, x = J(`campCruiserHudGeom()`), cx = J(`campCruiserChipX(campCruiserHudGeom(), ${w})`), short = J(`campCruiserChipX(campCruiserHudGeom(), ${'MISSILES  3/6'.length * Kf.charW.caps * Kf.font.line})`), why = 'building 15 s'.length * Kf.charW.low * Kf.font.side; return cx > x.right.misKey.x && cx - T2.chipW / 2 > x.right.mis.x + w && cx + T2.chipW / 2 + 4 < x.right.misWhy.x - why && short === x.right.misKey.x; })());
  g.run('__m(100, 3); window.__h1 = __H(); campCruiserHudPaint(__st(), __h1, C)');
  const rr = J(`__h1.crChipG.calls.filter(c => c[0] === 'fillRoundedRect')`), fs = J(`__h1.crChipG.calls.filter(c => c[0] === 'fillStyle')`);
  check('painted: the letter is the key table\'s (R), and the chip is the corner chips\' key cap: a rounded rectangle of their size and fill, centred on the chip\'s place', J('__h1.crMisKey.text') === 'R' && J('campCruiserMissileKey()') === 'R' && rr.length === 1 && rr[0][1] === Rb.misKey.x - T2.chipW / 2 && rr[0][2] === Rb.misKey.y - T2.chipH / 2 && rr[0][3] === T2.chipW && rr[0][4] === T2.chipH && fs.length === 1 && fs[0][1] === cc, JSON.stringify([rr, fs]));
  check('the chip is on its own Graphics, so it is drawn again only when the letter changes: a second paint draws no rectangle again', (() => { g.run('__h1.crChipG.calls.length = 0; campCruiserHudPaint(__st(), __h1, C)'); return J('__h1.crChipG.calls.length') === 0; })());
  check('the letter is dark and bold, with no stroke (a stroked dark letter on a cyan cap is a blob): its own text, in the dark ink of the corner chips', /crMisKey: sc\.add\.text\([^\n]*uiFontFn\(12, K\.ink\.chip, \{ fontStyle: 'bold' \}\)/.test(src('src/campcruiserhud.js')) && J('CAMPCRUISERHUD.ink.chip') === '#02101c');
  check('the chip, its letter and every word of the block are over the HUD\'s graphics (the plates and bars at depth 100): the words 101 and the chip 100.5; at 65 the rectangle hid the letter', J('CAMPCRUISERHUD.depth') === 101 && /crChipG: sc\.add\.graphics\(\)\.setScrollFactor\(0\)\.setDepth\(K\.depth - 0\.5\)/.test(src('src/campcruiserhud.js')) && /this\.hudG = this\.add\.graphics\(\)\.setScrollFactor\(0\)\.setDepth\(100\)/.test(src('src/campaignscene.js')));
  g.run('window.__codes = CAMP_KEYS.reload.codes; window.__k = CAMP_KEYS.reload.k; CAMP_KEYS.reload.k = "T"; CAMP_KEYS.reload.codes = ["KeyT"]; window.__h2 = __H(); campCruiserHudPaint(__st(), __h2, C)');
  check('a rebound key shows its own letter (the chip reads the table, it does not say R by itself), and the chip is drawn again for it', J('__h2.crMisKey.text') === 'T' && J(`__h2.crChipG.calls.filter(c => c[0] === 'fillRoundedRect').length`) === 1);
  g.run('CAMP_KEYS.reload.codes = []; window.__h3 = __H(); campCruiserHudPaint(__st(), __h3, C)');
  check('with no key for it, no letter and no chip are drawn', J('__h3.crMisKey.text') === '' && J(`__h3.crChipG.calls.filter(c => /Rounded/.test(c[0])).length`) === 0);
  g.run('CAMP_KEYS.reload.k = __k; CAMP_KEYS.reload.codes = __codes');
  check('the HUD makes the letter\'s text (crMisKey) and the chip\'s Graphics (crChipG), and the scene\'s texts are in its HUD (hudShow hides them with the rest)', /crMisKey: sc\.add\.text\(/.test(src('src/campcruiserhud.js')) && /crChipG: sc\.add\.graphics\(\)/.test(src('src/campcruiserhud.js')));
  const scene = src('src/campaignscene.js');
  check('the scene has no bottom-left count any more: no hud.missiles text, none of the old words; the rockets\' own sprites are made on the first frame (this.msp)', !/hud\.missiles/.test(scene) && !/camp\.ui\.missiles|camp\.ui\.missilenext/.test(scene) && /if \(!this\.msp\)/.test(scene) && /this\.msp = null;/.test(scene));
  check('the HUD makes the two texts of the line (crMis, crMisWhy) and paints them', /crMis: mk\(/.test(src('src/campcruiserhud.js')) && /crMisWhy: mk\(/.test(src('src/campcruiserhud.js')) && /H\.crMis\.setText\(campCruiserMissileLine\(S\)\)/.test(src('src/campcruiserhud.js')));
}

// ---- G. the S list and the key ----
{
  g.run('__m(100, 3); window.F = { camp: C }; window.P = campPanelNew();');
  const rows = J('campPanelRows(C, "cruiser")'), row = rows.find(r => r.id === 'sreload');
  check('the S list has the row Reload missiles, with the key cap R, and it is not a part', row && row.label === 'Reload missiles' && row.key === 'R' && row.more === false, JSON.stringify(row));
  check('with the rack at three it can be done: its state says the price of the one missile a press queues, short says the ore', row && row.ok && row.state === '20 ore, 1 missile' && row.short === '20 ore', JSON.stringify(row));
  g.run('__m(100, 6)');
  const full = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('with a full rack the row is grey and says why: "the rack is full" (short: rack full)', full && !full.ok && full.state === 'the rack is full' && full.short === 'rack full', JSON.stringify(full));
  g.run('__m(10, 3)');
  const poor = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('with 10 ore the row is grey: needs 20 ore (short: needs 20 ore)', poor && !poor.ok && poor.state === 'needs 20 ore' && poor.short === 'needs 20 ore', JSON.stringify(poor));
  g.run('__m(100, 5); __R()');
  const on = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('with every empty slot queued (five of six, one building) the row is grey and says "already building"', on && !on.ok && on.state === 'already building', JSON.stringify(on));
  g.run('__m(100, 3); window.P = campPanelNew(); window.__r = campPanelKey(P, C, "KeyR", 1234)');
  check('the key R runs the same order through the panel: used, ran, ok, the words, the row; the row lights', J('__r.used') && J('__r.ran') && J('__r.ok') && J('__r.say') === 'Reloading: 1 more, 20 ore.' && J('__r.row') === 'sreload' && J('P.lit.sreload') === 1234 && J('C.reloadAt') > 0, J('__r'));
  g.run('window.__r2 = campPanelKey(P, C, "KeyR", 1300)');
  check('R again: used, and it queues one more (the same words as the order)', J('__r2.used') && J('__r2.ran') && J('__r2.ok') && J('__r2.say') === 'Reloading: 2 more, 20 ore.' && J('campMissileState(C).pending') === 2);
  g.run('__m(100, 5); window.P = campPanelNew(); campPanelKey(P, C, "KeyR", 1400); window.__r4 = campPanelKey(P, C, "KeyR", 1500)');
  check('R with every empty slot queued: used, and refused in the words of the order ("Already building the rack")', J('__r4.used') && J('__r4.ran') && !J('__r4.ok') && J('__r4.say') === 'Already building the rack, pilot.');
  g.run('__m(100, 3); window.P = campPanelNew(); campPanelGo(P, C, "cruiser"); window.__r3 = campPanelKey(P, C, "KeyR", 10)');
  check('R works with the S list open too (it is not the list\'s key), and the list stays open', J('__r3.ran') && J('__r3.ok') && J('campPanelOpen(P)') === 'cruiser');
  const scene = src('src/campaignscene.js');
  check('the scene leaves R with Shift, Ctrl, Alt or Cmd to the browser (Shift+R stays the dev reload): the guard is in onKey before the lists\' keys', /campKeyIs\('reload', c\) && \(e\.shiftKey \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey\)\) return;/.test(scene) && scene.indexOf("campKeyIs('reload', c) && (e.shiftKey") < scene.indexOf('campPanelKey(this.pn, C, c, now)'));
  const strip = t => JSON.parse(g.run(`JSON.stringify(typeof campIntent === 'function' ? campIntent(${JSON.stringify(t)}) : null)`));
  const w = ['reload', 'reload missiles', 'reload the missiles', 'rearm', 'build missiles', 'build more missiles', 'restock the rack'].map(t => [t, strip(t)]);
  check('the strip: "reload", "reload missiles", "build more missiles" and the like are the act fleet_reload, not a missile fired', w.every(([t, r]) => r && r.act === 'fleet_reload'), JSON.stringify(w.filter(([t, r]) => !r || r.act !== 'fleet_reload')));
  check('and the words for the launcher are still the launcher: "fire missiles", "missiles at the mothership", "launch missiles"', ['fire missiles', 'missiles at the mothership', 'launch missiles'].every(t => (strip(t) || {}).act === 'fleet_missiles') && (strip('launch') || {}).act === 'fleet_launch');
  check('a bare "build" or "make" is nothing of the rack\'s (they are not words for it)', !['build', 'make'].some(t => (strip(t) || {}).act === 'fleet_reload'));
  check('the ship computer has the act (the strip runs it, the model is told it) and its order runs through campOrder', /fleet_reload: \(s, arg\) => scFleet\(s, 'reload', arg\)/.test(src('src/shipcomputer.js')) && /fleet_reload \(queues one missile to build, for ore\)/.test(src('src/shipcomputer.js')));
}

console.log(failed ? `\nFAIL: ${failed} of ${n} checks` : `\nMISSILE COST PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

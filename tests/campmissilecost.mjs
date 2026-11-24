// smoke: missiles cost ore (20 each): the magazine does not fill itself, the ship builds ONE at 0 when the ore allows, R builds up to the full rack, the count joins the status block and the S list has the row (plain Node, no Chrome)
// Card space-game-missiles-cost-ore (Troy, 24 Nov 2026: "building missiles takes ore. Automatic, but only when down to 0 missiles; and a key to build when not at 0 so he can reload in calm times: R, shown as a row on the S list").
// The rule is src/campmissilebuild.js (CAMP.missile.cost and .reload), called from campMissiles in src/campaign.js; the block is src/campcruiserhud.js; the key and the row are src/data_controls.js and src/camppanel.js.
//   A. the table and the words: the price, the build time, the key R, the texts, the script loaded once, the order's name
//   B. no free reload: a magazine below its full stays where it is (no ore, no build) however long the battle runs; loot still adds to it with no ore spent
//   C. at zero: the ship builds one by itself, the ore is paid when the build starts, the missile lands after a build time, and it builds no second while there is one; with too little ore it builds nothing
//   D. R: the order builds up to the full rack, one after another, each paid when it starts; stops when full, or short of ore (one line on the radio); refusals in words (full, already on, no ore); a dry check changes nothing
//   E. state: building with the seconds, no ore, ready, full (what the block and the row say)
//   F. the block: a fourth line (MISSILES n/cap, building s, no ore), the corner stays level and inside the screen, the old bottom-left count is gone from the scene
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
  check('the price is 20 ore a missile and the build time is the old reload time (15 s); the rack is six', K.cost === 20 && K.reload === 15000 && K.magazine === 6, JSON.stringify(K));
  check('R is a key of the table (CAMP_KEYS.reload), the key cap says R and the code is KeyR', J('CAMP_KEYS.reload.k') === 'R' && J('CAMP_KEYS.reload.codes.join()') === 'KeyR');
  check('the order is "reload" and a battle starts with no build and no run: reloadAt 0, rackOn false', (g.run('__m(100)'), J('C.reloadAt') === 0 && J('C.rackOn') === false));
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
  g.run('__run(14)');
  check('14 s later the missile is not done (the build takes 15 s)', J('C.missiles') === 0 && J('C.reloadAt') > 0);
  g.run('__run(2)');
  check('after 15 s it is in the rack: one missile, nothing building, 80 ore left', J('C.missiles') === 1 && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 80 && J('__ev("mbuilt")') === 1, J('[C.missiles, C.reloadAt, C.ore]'));
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
  check('a dry check says what R would do and changes nothing: three more, 60 ore', dry.ok && dry.say === 'Reloading: 3 more, 60 ore.' && J('C.rackOn') === false && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 100, JSON.stringify(dry));
  const r = J('__R()');
  check('R with three of six and 100 ore: "Reloading: 3 more, 60 ore." and the first build starts at once (20 ore paid)', r.ok && r.say === 'Reloading: 3 more, 60 ore.' && J('C.rackOn') === true && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80, JSON.stringify(r));
  const again = J('__R()');
  check('R again while the rack is being built: refused in words and nothing more is paid', !again.ok && again.code === 'reloading' && again.say === 'Already building the rack, pilot.' && J('Math.floor(C.ore)') === 80, JSON.stringify(again));
  g.run('__run(15.2)');
  check('after one build time: four missiles, the next is already paid (60 ore left)', J('C.missiles') === 4 && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 60, J('[C.missiles, C.ore]'));
  g.run('__run(15)');
  check('after two: five, 40 ore left', J('C.missiles') === 5 && J('Math.floor(C.ore)') === 40);
  g.run('__run(15)');
  check('after three: six, the rack is full, the run is over and nothing more is built; 3 x 20 = 60 ore in all', J('C.missiles') === 6 && J('C.rackOn') === false && J('C.reloadAt') === 0 && J('Math.floor(C.ore)') === 40, J('[C.missiles, C.rackOn, C.ore]'));
  g.run('__run(60)');
  check('and it stays six a minute later', J('C.missiles') === 6 && J('Math.floor(C.ore)') === 40);
  const full = J('__R()');
  check('R with a full rack: "The rack is full, pilot."', !full.ok && full.code === 'rackfull' && full.say === 'The rack is full, pilot.', JSON.stringify(full));
  g.run('__m(10, 3)');
  const poor = J('__R()');
  check('R with 10 ore: refused with the need and what is in the store (the ore codes\' own words)', !poor.ok && poor.code === 'noore2' && /20 needed/.test(poor.say) && /10 in the store/.test(poor.say) && J('C.rackOn') === false, JSON.stringify(poor));
  g.run('__m(50, 3); __R(); __run(15.2)');
  check('50 ore, three missing: R pays for two (40) and the third cannot be paid: "Reloading: 2 more, 40 ore."', J('C.missiles') === 4 && J('Math.floor(C.ore)') === 10);
  g.run('__run(15.2)');
  check('after the second the ore is short: the rack stops at five and the radio says so once', J('C.missiles') === 5 && J('C.rackOn') === false && J('C.reloadAt') === 0 && J('C.events.filter(e => e.type === "say" && e.key === "camp.say.rackdry").length') === 1 && J('C.events.find(e => e.key === "camp.say.rackdry").vars.n') === 5, J('C.events.filter(e => e.type === "say").map(e => e.key).join()'));
  g.run('__m(100, 3); __R(); C.nextRocket = 0; campFire(C, null); campFire(C, null); __run(15.2)');
  check('missiles fired while the rack is being built: the build goes on and lands (one fired twice from three: one left, then two)', J('C.missiles') === 2 && J('C.reloadAt') > 0, J('[C.missiles, C.reloadAt]'));
  g.run('__m(100, 0); __run(0.1)');
  const mid = J('__R()');
  check('R at zero while the ship is already building its one: it takes the run over (one more is paid at the end of this build)', mid.ok && J('C.rackOn') === true && J('C.reloadAt') > 0 && J('Math.floor(C.ore)') === 80, JSON.stringify(mid));
  g.run('__m(0, 0); __run(1)');
  check('R at zero with no ore and nothing building: refused (no ore), and it is not a run', !J('__R()').ok && J('C.rackOn') === false);
  check('a battle that is over takes no order', (g.run('__m(100, 3); C.result = "won"'), J('__R().code') === 'over'));
}

// ---- E. state ----
{
  g.run('__m(100, 6)');
  check('state: a full rack is "full"', J('campMissileState(C).state') === 'full');
  g.run('__m(100, 3)');
  check('state: below the full with nothing building is "ready" (R would build)', J('campMissileState(C).state') === 'ready' && J('campMissileState(C).cap') === 6 && J('campMissileState(C).n') === 3);
  g.run('__m(100, 0); __run(0.1)');
  check('state: a build under way is "building" with the seconds left (15, rounded up)', J('campMissileState(C).state') === 'building' && J('campMissileState(C).secs') === 15, J('campMissileState(C)'));
  g.run('__m(5, 0); __run(0.1)');
  check('state: at zero with too little ore and nothing building is "noore"', J('campMissileState(C).state') === 'noore');
  g.run('__m(5, 2)');
  check('state: two left and no ore is only "ready" (nothing is wrong yet: it builds when it is at zero)', J('campMissileState(C).state') === 'ready');
}

// ---- F. the block ----
{
  g.run('__m(100, 3)');
  check('the block has four lines: shield, hull, ore, missiles', J('CAMPCRUISERHUD.lines') === 4);
  const S = J('campCruiserStatus(C)');
  check('the status has the missiles: three of six, ready', S.missiles && S.missiles.n === 3 && S.missiles.cap === 6 && S.missiles.state === 'ready', JSON.stringify(S.missiles));
  check('the line says "MISSILES  3/6"; ready says nothing on the right', J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  3/6' && J('campCruiserMissileWhy(campCruiserStatus(C))') === '');
  g.run('__m(100, 0); __run(0.1)');
  check('building says "building 15 s" on the right', J('campCruiserMissileWhy(campCruiserStatus(C))') === 'building 15 s');
  g.run('__m(0, 0); __run(0.1)');
  check('at zero with no ore it says "no ore" on the right, and the line says 0/6', J('campCruiserMissileWhy(campCruiserStatus(C))') === 'no ore' && J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  0/6');
  const Z = J('campCruiserHudGeom()'), T = J('CAMP.corner.at'), Th = J('CAMP.corner.title.h'), K = J('CAMPCRUISERHUD');
  check('the missiles line is the fourth, one row under the ore line, the state at the right edge of the block', Z.mis.y === Z.ore.y + K.row && Z.misWhy.y === Z.mis.y && Z.misWhy.x === Z.x1 - K.pad && Z.mis.x === Z.ore.x, JSON.stringify([Z.mis, Z.ore, Z.misWhy]));
  check('the block stands inside the screen (its plate starts at y >= 0) and ends 4 px above the S CRUISER title row', Z.plate.y >= 0 && Z.y1 + K.gap === T.tl.y && Z.bottom === T.tl.y, JSON.stringify([Z.plate, Z.y1, T.tl]));
  check('the two top corners are still level (HOSTILES with S CRUISER) and the bottom ones too: moving the top pair down 16 px for the fourth line kept the alignment', T.tl.y === T.tr.y && T.bl.y === T.br.y && T.tl.y === 78, JSON.stringify(T));
  check('the title row and the room under it are still on the screen (the S list is the tallest thing under it)', T.tl.y + Th + 4 + 200 < J('H'), T.tl.y);
  const scene = src('src/campaignscene.js');
  check('the scene has no bottom-left count any more: no hud.missiles text, none of the old words; the rockets\' own sprites are made on the first frame (this.msp)', !/hud\.missiles/.test(scene) && !/camp\.ui\.missiles|camp\.ui\.missilenext/.test(scene) && /if \(!this\.msp\)/.test(scene) && /this\.msp = null;/.test(scene));
  check('the HUD makes the two texts of the line (crMis, crMisWhy) and paints them', /crMis: mk\(/.test(src('src/campcruiserhud.js')) && /crMisWhy: mk\(/.test(src('src/campcruiserhud.js')) && /H\.crMis\.setText\(campCruiserMissileLine\(S\)\)/.test(src('src/campcruiserhud.js')));
}

// ---- G. the S list and the key ----
{
  g.run('__m(100, 3); window.F = { camp: C }; window.P = campPanelNew();');
  const rows = J('campPanelRows(C, "cruiser")'), row = rows.find(r => r.id === 'sreload');
  check('the S list has the row Reload missiles, with the key cap R, and it is not a part', row && row.label === 'Reload missiles' && row.key === 'R' && row.more === false, JSON.stringify(row));
  check('with the rack at three it can be done: its state says the rack\'s price, short says the ore', row && row.ok && row.state === '60 ore, 3 missiles' && row.short === '60 ore', JSON.stringify(row));
  g.run('__m(100, 6)');
  const full = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('with a full rack the row is grey and says why: "the rack is full" (short: rack full)', full && !full.ok && full.state === 'the rack is full' && full.short === 'rack full', JSON.stringify(full));
  g.run('__m(10, 3)');
  const poor = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('with 10 ore the row is grey: needs 20 ore (short: needs 20 ore)', poor && !poor.ok && poor.state === 'needs 20 ore' && poor.short === 'needs 20 ore', JSON.stringify(poor));
  g.run('__m(100, 3); __R()');
  const on = J('campPanelRows(C, "cruiser")').find(r => r.id === 'sreload');
  check('while it builds the row is grey and says "already building"', on && !on.ok && on.state === 'already building', JSON.stringify(on));
  g.run('__m(100, 3); window.P = campPanelNew(); window.__r = campPanelKey(P, C, "KeyR", 1234)');
  check('the key R runs the same order through the panel: used, ran, ok, the words, the row; the row lights', J('__r.used') && J('__r.ran') && J('__r.ok') && J('__r.say') === 'Reloading: 3 more, 60 ore.' && J('__r.row') === 'sreload' && J('P.lit.sreload') === 1234 && J('C.rackOn') === true, J('__r'));
  g.run('window.__r2 = campPanelKey(P, C, "KeyR", 1300)');
  check('R again: used, and refused in the same words as the order ("Already building the rack")', J('__r2.used') && J('__r2.ran') && !J('__r2.ok') && J('__r2.say') === 'Already building the rack, pilot.');
  g.run('__m(100, 3); window.P = campPanelNew(); campPanelGo(P, C, "cruiser"); window.__r3 = campPanelKey(P, C, "KeyR", 10)');
  check('R works with the S list open too (it is not the list\'s key), and the list stays open', J('__r3.ran') && J('__r3.ok') && J('campPanelOpen(P)') === 'cruiser');
  const scene = src('src/campaignscene.js');
  check('the scene leaves R with Shift, Ctrl, Alt or Cmd to the browser (Shift+R stays the dev reload): the guard is in onKey before the lists\' keys', /campKeyIs\('reload', c\) && \(e\.shiftKey \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey\)\) return;/.test(scene) && scene.indexOf("campKeyIs('reload', c) && (e.shiftKey") < scene.indexOf('campPanelKey(this.pn, C, c, now)'));
  const strip = t => JSON.parse(g.run(`JSON.stringify(typeof campIntent === 'function' ? campIntent(${JSON.stringify(t)}) : null)`));
  const w = ['reload', 'reload missiles', 'reload the missiles', 'rearm', 'build missiles', 'build more missiles', 'restock the rack'].map(t => [t, strip(t)]);
  check('the strip: "reload", "reload missiles", "build more missiles" and the like are the act fleet_reload, not a missile fired', w.every(([t, r]) => r && r.act === 'fleet_reload'), JSON.stringify(w.filter(([t, r]) => !r || r.act !== 'fleet_reload')));
  check('and the words for the launcher are still the launcher: "fire missiles", "missiles at the mothership", "launch missiles"', ['fire missiles', 'missiles at the mothership', 'launch missiles'].every(t => (strip(t) || {}).act === 'fleet_missiles') && (strip('launch') || {}).act === 'fleet_launch');
  check('a bare "build" or "make" is nothing of the rack\'s (they are not words for it)', !['build', 'make'].some(t => (strip(t) || {}).act === 'fleet_reload'));
  check('the ship computer has the act (the strip runs it, the model is told it) and its order runs through campOrder', /fleet_reload: \(s, arg\) => scFleet\(s, 'reload', arg\)/.test(src('src/shipcomputer.js')) && /fleet_reload \(builds missiles up to the full rack, for ore\)/.test(src('src/shipcomputer.js')));
}

console.log(failed ? `\nFAIL: ${failed} of ${n} checks` : `\nMISSILE COST PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

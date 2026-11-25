// smoke: the corner titles after the one-key layout (card space-game-keys4-titles; the keys moved by space-game-keys5-qwe): W FLEET, E FRIENDLIES, ] HOSTILES, Q CRUISER, one chip each in one chip column; the order chip reads E Attack or E Guard
// Troy, 24 Nov 2026, agreed bite by bite: "the corner titles follow the one-key layout: Q FLEET bottom left, [ FRIENDLIES bottom right, ] HOSTILES top right (] NO HOSTILES, [ NO FRIENDLIES when empty), S CRUISER unchanged. One chip per
// title, same chip column so titles still start at the same x. The order chip in the details reads W Attack or W Guard." The keys are 2-GEN's (card space-game-keys4-onekey): who Q, order W, friendlies [, hostiles ], near \.
//   A  the table: the four corners have one key each, and the chips are those keys' caps from the table
//   B  the titles with something to pick and with nothing: ] HOSTILES / ] NO HOSTILES, [ FRIENDLIES / [ NO FRIENDLIES
//   C  one chip column: the titles of S CRUISER, HOSTILES and FRIENDLIES start at the same distance from their frame's left edge, every chip on the same baseline (FLEET is a line)
//   D  the order chip is not in the details of the target corners any more (card space-game-fleet-sentence: it is in the FLEET row)
//   E  the old keys are nowhere on a chip or in the table of the corners: no O P, no Q W pair, no [ ] pair
// Run: node tests/campkeys4titles.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (s) => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 4); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.forEach(u => { delete u.hurtAt; }); window.C = C; window.P = campPanelNew(); campTcornerLook(P, 0); return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  window.NOW = id => campCornerNow(C, id);
  window.__scene = (extra) => {
    const objs = [];
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, alpha: 1, style: { color: '#ffffff' }, width: 60, height: 14 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = v => { o.alpha = v; return o; }; objs.push(o); return o; };
    const mkP = () => { const pic = { vis: false, x: 0, y: 0, alpha: 1, width: 64, height: 32 }; ['setScrollFactor', 'setDepth', 'setTexture', 'setRotation', 'setTint', 'setScale', 'setOrigin', 'setAlpha', 'setPosition', 'setSize', 'setDisplaySize'].forEach(k => { pic[k] = () => pic; }); pic.setVisible = v => { pic.vis = v; return pic; }; return pic; };
    return window.S = Object.assign({ objs, camp: C, pn: P, mode: 'play', hud: {}, textures: { exists: () => true }, texOf: k => 'tex-' + k, add: { graphics: mkG, text: mkT, image: mkP } }, extra || {});
  };
`);

// ---- A. the table ----
console.log('A. the table');
g.run('__new();');
check('the four corners are registered, with one key each', J('CAMP_CORNERS.map(d => d.id + ":" + campCornerKeyList(d).length).sort().join()') === 'cruiser:1,fleet:1,friendlies:1,hostiles:1', J('CAMP_CORNERS.map(d => d.id + ":" + campCornerKeyList(d).length).join()'));
check('the chips are the table\'s caps: W FLEET, E FRIENDLIES, ] HOSTILES, Q CRUISER (card space-game-keys5-qwe)', J('NOW("fleet").chips.join()') === 'W' && J('NOW("friendlies").chips.join()') === 'E' && J('NOW("hostiles").chips.join()') === ']' && J('NOW("cruiser").chips.join()') === 'Q', J('["fleet","friendlies","hostiles","cruiser"].map(i => NOW(i).chips.join()).join()'));
check('the chips follow the table (a key moved there moves on the chip): friendlies and hostiles and who', (() => {
  g.run(`window.__k = [CAMP_KEYS.friendlies.k, CAMP_KEYS.hostiles.k, CAMP_KEYS.who.k]; CAMP_KEYS.friendlies.k = 'N'; CAMP_KEYS.hostiles.k = 'M'; CAMP_KEYS.who.k = 'B';`);
  const a = [J('NOW("friendlies").chips.join()'), J('NOW("hostiles").chips.join()'), J('NOW("fleet").chips.join()')].join();
  g.run(`CAMP_KEYS.friendlies.k = __k[0]; CAMP_KEYS.hostiles.k = __k[1]; CAMP_KEYS.who.k = __k[2];`);
  return a === 'N,M,B' && J('NOW("fleet").chips.join()') === 'W';
})());
check('the table: W who (the fleet pick), Enter order, E friendlies, ] hostiles, backslash the nearest', J('[CAMP_KEYS.who.k, CAMP_KEYS.order.k, CAMP_KEYS.friendlies.k, CAMP_KEYS.hostiles.k, CAMP_KEYS.near.k].join("")') === 'WEnterE]\\');
check('each corner\'s details open on its own key: W FLEET, E FRIENDLIES, ] HOSTILES (and no other: Q is the cruiser\'s)', (() => {
  const was = id => J(`NOW("${id}").open`);
  g.run(`campCornerKey(C, 'KeyW');`); const q = ['fleet', 'friendlies', 'hostiles'].map(was).join();
  g.run(`__new(); campCornerKey(C, 'KeyE');`); const l = ['fleet', 'friendlies', 'hostiles'].map(was).join();
  g.run(`__new(); campCornerKey(C, 'BracketRight');`); const r = ['fleet', 'friendlies', 'hostiles'].map(was).join();
  return q === '1,0,0' && l === '0,1,0' && r === '0,0,1';
})());

// ---- B. the titles, with something to pick and with nothing ----
console.log('B. the titles');
g.run('__new();');
check('nothing hostile alive: ] NO HOSTILES; the friendlies are there (the transport): E FRIENDLIES', J('NOW("hostiles").title') === 'NO HOSTILES' && J('NOW("hostiles").chips.join()') === ']' && J('NOW("friendlies").title') === 'FRIENDLIES' && J('NOW("friendlies").chips.join()') === 'E', J('[NOW("hostiles").title, NOW("friendlies").title].join()'));
g.run('window.R1 = __foe("raider", 900, 0);');
check('a raider alive: ] HOSTILES', J('NOW("hostiles").title') === 'HOSTILES' && J('NOW("hostiles").chips.join()') === ']');
check('no ship you protect and no place held: E NO FRIENDLIES, with the same chip', (() => {
  g.run('C.ships.forEach(u => { if (u !== C.carrier && !u.pilot) u.hp = 0; });');
  return J('campFriList(C).length') === 0 && J('NOW("friendlies").title') === 'NO FRIENDLIES' && J('NOW("friendlies").chips.join()') === 'E';
})(), J('[campFriList(C).length, NOW("friendlies").title].join()'));
check('the titles say the words of the table: HOSTILES, FRIENDLIES, FLEET, CRUISER (content, not bare keys)', J(`uiText('camp.corner.hostiles')`) === 'HOSTILES' && J(`uiText('camp.corner.friendlies')`) === 'FRIENDLIES' && J(`uiText('camp.corner.fleet')`) === 'FLEET' && J(`uiText('camp.corner.cruiser')`) === 'CRUISER');

// ---- C. one chip column ----
console.log('C. one chip column');
g.run('__new(); __scene(); campTcornerLook(P, 0); campCornerSync(S, 0);');
{
  const K = J('CAMP.corner'), at = K.at, X = (id, what) => J(`S.hud.corner.${id}.${what}`), want = K.title.pad + K.title.chips * (K.title.chipW + K.title.chipGap) - K.title.chipGap + K.title.gap;
  check('CAMP.corner.title.chips is 1: one chip each', K.title.chips === 1);
  const rows = [['cruiser', 'tl'], ['hostiles', 'tr'], ['friendlies', 'br']];
  check('the titles of S CRUISER, ] HOSTILES and [ FRIENDLIES start at the same distance from their frame\'s left edge (the chip column, ' + want + ' px)', rows.every(([id, pos]) => X(id, 'title.x') - at[pos].x === want), JSON.stringify(rows.map(([id, pos]) => [id, X(id, 'title.x') - at[pos].x])));
  check('their chips are the same distance from the frame, and as high in their rows; the FLEET row (a line, card space-game-fleet-sentence) starts its chip at the same place', rows.concat([['fleet', 'bl']]).every(([id, pos]) => X(id, 'chips[0].x') - at[pos].x === K.title.pad + K.title.chipW / 2) && new Set(rows.concat([['fleet', 'bl']]).map(([id, pos]) => Math.round((X(id, 'chips[0].y') - (at[pos].dir > 0 ? at[pos].y : at[pos].y - K.title.h)) * 100))).size === 1);
  check('the three titles read CRUISER, NO HOSTILES and FRIENDLIES as drawn; FLEET has no title word (its row is the line: tests/campfleetsentence.mjs)', ['cruiser', 'hostiles', 'friendlies'].map(id => X(id, 'title.text')).join() === 'CRUISER,NO HOSTILES,FRIENDLIES' && X('fleet', 'title.vis') === false, J('["cruiser","hostiles","friendlies"].map(id => S.hud.corner[id].title.text).join()'));
}

// ---- D. the order chip is not in the details ----
console.log('D. the order chip');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1); campTcornerLook(P, 0);');
  check('an enemy held: the details of ] HOSTILES have no key row (the W chip left them: it is in the FLEET row)', J('NOW("hostiles").items.length') > 0 && !J('NOW("hostiles").items.some(i => i.kind === "key")'));
  g.run('__new(); campFriStep(C, 1); campTcornerLook(P, 0);');
  check('a friendly held: the details of [ FRIENDLIES have none either', J('NOW("friendlies").items.length') > 0 && !J('NOW("friendlies").items.some(i => i.kind === "key")'));
  check('the order key the FLEET row reads is the table\'s: campTdispOrder says Enter for both halves, and moves with the key', (() => {
    g.run(`window.__w = CAMP_KEYS.order.k; CAMP_KEYS.order.k = 'V';`); const a = J('campTdispOrder(C, "guard").key'); g.run(`CAMP_KEYS.order.k = __w;`);
    return a === 'V' && J('campTdispOrder(C, "guard").key') === 'Enter' && J('campTdispOrder(C, "attack").key') === 'Enter';
  })());
}

// ---- E. the old keys are gone from the corners ----
console.log('E. the old keys');
{
  const files = ['src/campcorner.js', 'src/camptcorner.js', 'src/camptdisp.js', 'src/campcornerscene.js', 'src/camptcornerscene.js'].map(src).join('\n');
  check('no corner code names the old ids: wlast, wnext, flast, fnext, last, next, engage', !/'(wlast|wnext|flast|fnext|last|next|engage)'/.test(files.replace(/campTcornerKeyCap\('[a-z]+'\)/g, '')) && !/CAMP_KEYS\.(wlast|wnext|flast|fnext|engage)\b/.test(files));
  check('the table has none of them either: W, Enter, E and ] are who, order, friendlies and hostiles; O, P and X are free (S is Settings, on the pause card)', J('["wlast","wnext","flast","fnext","last","next","engage"].filter(i => CAMP_KEYS[i]).length') === 0 && J('Object.values(CAMP_KEYS).filter(v => v.codes.indexOf("KeyO") >= 0 || v.codes.indexOf("KeyP") >= 0 || v.codes.indexOf("KeyX") >= 0).length') === 0);
  check('every corner chip of the four is one of the four keys\' caps (W E ] Q) and nothing else is drawn as a chip', J('["fleet","friendlies","hostiles","cruiser"].map(i => NOW(i).chips.join("")).join("")') === 'WE]Q');
}

console.log(failed ? `\nKEYS4 TITLES FAIL: ${failed} of ${n} checks failed` : `\nKEYS4 TITLES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

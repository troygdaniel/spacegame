// smoke: the two target corners: ] HOSTILES top right and [ FRIENDLIES bottom right (the rule: which corner holds the one target, the name beside the title, NO HOSTILES and NO FRIENDLIES when empty)
// Card space-game-layout-targets (Troy, 24 Nov 2026: four corners, each a small title that never leaves, starting with its keys as plain key-cap chips; the selection is written beside the title and never fades;
// still ONE target held at a time). src/camptdisp.js campTcornerHold is the rule (no Phaser); the registration and the details are src/camptcorner.js, the picture src/camptcornerscene.js, the rest the corner panel; the words are camp.tdisp.corner.* (content/text/camptdisp.md).
//   A. the titles and the chips: from the key table; HOSTILES and FRIENDLIES while there is something to pick
//   B. an enemy held: its name is beside HOSTILES, FRIENDLIES has no name, and the details (the subject) are in HOSTILES alone
//   C. a friendly held (a ship, then a map-clicked outpost): its name is beside FRIENDLIES, HOSTILES has none, and the details are in FRIENDLIES alone
//   D. empty: NO HOSTILES with no hostile alive, NO FRIENDLIES with no ship to protect and no place held; a place held is a friendly
//   E. one target: picking one side lets the other go; X lets both go; the held name follows the pick
//   F. an order's list: the ship it is on is in the details of its side, with no name beside the title (nothing is held)
//   G. the registered corners (src/camptcorner.js on the corner panel src/campcorner.js): where they sit, their chips, title and selection; the details open on the corner's keys and by themselves when the target changes, fade, and the title stays
//   H. the details' items: the picture row, HULL, SHIELD (or no shield), what it does, the W chip (Attack, Guard); an outpost: its type and distance and the Guard chip
//   I. the scene half on a stand-in (src/camptcornerscene.js): the picture, its frame in the side's colour, the type and the distance beside it, steady when nothing changes, gone when the details fade or a card is in front
// Run: node tests/campcorners.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (s) => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 4); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.forEach(u => { delete u.hurtAt; }); window.C = C; window.P = campPanelNew(); return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  window.HC = () => campTcornerHold(C, P, 0, 'host'); window.FC = () => campTcornerHold(C, P, 0, 'fri');
`);

console.log('A. the titles and the chips');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0);');
  check('the hostiles corner: the chip is the key table\'s enemy key (hostiles), the title is HOSTILES', JSON.stringify(J('HC().keys')) === JSON.stringify([']']) && J('HC().title') === 'HOSTILES', JSON.stringify(J('HC()')));
  check('the friendlies corner: the chip is the friendly key ([), the title is FRIENDLIES', JSON.stringify(J('FC().keys')) === JSON.stringify(['[']) && J('FC().title') === 'FRIENDLIES', JSON.stringify(J('FC()')));
  check('the chips follow the key table (a key moved there moves here)', (() => { g.run(`window.__k = CAMP_KEYS.friendlies.k; CAMP_KEYS.friendlies.k = 'N';`); const a = J('FC().keys'); g.run(`CAMP_KEYS.friendlies.k = __k;`); return JSON.stringify(a) === JSON.stringify(['N']); })());
  check('with something picked nowhere: no name beside either title, nothing held', J('HC().name') === '' && J('FC().name') === '' && J('HC().held') === false && J('FC().held') === false);
  check('no cruiser (a world that has not begun): both corners are empty and say nothing', J('campTcornerHold(null, null, 0, "host").title') === '' && J('campTcornerHold({}, null, 0, "fri").empty') === true);
}

console.log('B. an enemy held');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1);');
  check('its name is written beside HOSTILES (the name the lists give it)', J('HC().name') === J('campNavUnitName(R1)') && /^Raider \d+$/.test(J('HC().name')), J('HC().name'));
  check('FRIENDLIES has no name and is not holding', J('FC().name') === '' && J('FC().held') === false);
  check('the details (the picture, hull, shield, distance, what it does, E Attack) are the enemy\'s, in HOSTILES alone', J('HC().subject.u.id') === J('R1.id') && J('HC().subject.side') === 'hostile' && J('FC().subject') === null);
  check('and HOSTILES is not empty', J('HC().empty') === false && J('HC().title') === 'HOSTILES');
}

console.log('C. a friendly held');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campFriStep(C, 1);');
  check('a ship you protect held: its name is beside FRIENDLIES', J('FC().held') === true && J('FC().name') === J('campFriNow(C).name') && J('FC().name') !== '', J('FC()'));
  check('HOSTILES has no name; the details are the friendly\'s, in FRIENDLIES alone', J('HC().name') === '' && J('HC().subject') === null && J('FC().subject.side') === 'friend' && J('FC().subject.held') === true);
  g.run(`campFriHold(C, 'place:' + Object.keys(campPlaces(C.level)).find(id => !campPlaces(C.level)[id].hidden));`);
  check('a map-clicked outpost or planet is a friendly: its name is beside FRIENDLIES, the details are its post', J('FC().held') === true && J('FC().name') === J('campFriNow(C).name') && !!J('FC().subject.post') && J('FC().subject.u') === null, JSON.stringify(J('FC()')).slice(0, 300));
  check('and HOSTILES still has no name', J('HC().name') === '' && J('HC().held') === false);
}

console.log('D. empty: NO HOSTILES and NO FRIENDLIES');
{
  g.run('__new();');
  check('no hostile alive: the title is NO HOSTILES (and it holds nothing)', J('HC().empty') === true && J('HC().title') === 'NO HOSTILES' && J('HC().name') === '', J('HC()'));
  check('a ship you protect is flying: FRIENDLIES is not empty', J('FC().empty') === false && J('FC().title') === 'FRIENDLIES', J('FC()'));
  g.run('C.ships.forEach(u => { if (u.team !== "alien" && u !== C.carrier && u.kind !== "fighter") u.hp = 0; });');
  check('no ship to protect and no place held: NO FRIENDLIES', J('campFriList(C).length') === 0 && J('FC().empty') === true && J('FC().title') === 'NO FRIENDLIES', J('FC()'));
  g.run(`campFriHold(C, 'place:' + Object.keys(campPlaces(C.level)).find(id => !campPlaces(C.level)[id].hidden));`);
  check('a place held by a map click makes it FRIENDLIES again, with its name', J('FC().empty') === false && J('FC().title') === 'FRIENDLIES' && J('FC().name') !== '', J('FC()'));
  g.run('window.R2 = __foe("raider", 900, 0);');
  check('a hostile comes: HOSTILES is back, with no name until one is picked', J('HC().empty') === false && J('HC().title') === 'HOSTILES' && J('HC().name') === '');
}

console.log('E. one target');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campFriStep(C, 1);');
  const who = J('FC().name'); check('a friendly held: its name is in FRIENDLIES', who !== '' && J('HC().name') === '');
  g.run('campTgtStep(C, 1);');
  check('an enemy picked next: the friendly is let go, the name moves to HOSTILES', J('FC().name') === '' && J('FC().held') === false && J('HC().name') === J('campNavUnitName(R1)') && J('HC().held') === true);
  g.run('campFriStep(C, 1);');
  check('a friendly picked again: the enemy is let go, the name moves back', J('HC().name') === '' && J('FC().name') === who);
  g.run('campPicksClear(C);');
  check('X lets both go: no name in either corner, the titles stay', J('HC().name') === '' && J('FC().name') === '' && J('HC().title') === 'HOSTILES' && J('FC().title') === 'FRIENDLIES');
  g.run('R1.hp = 0; campTgtStep(C, 1);');
  check('an enemy that is lost is let go: no name, and NO HOSTILES when it was the last', J('HC().name') === '' && J('HC().empty') === true && J('HC().title') === 'NO HOSTILES');
}

console.log('F. an order\'s list');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); window.TR = C.ships.find(u => u.kind === "freighter"); campPickOpen(P, { id: "escort", pick: "escort" }, campPickItems(C, "escort"));');
  check('a friendly ship the list is on: it is in the details of FRIENDLIES, with no name beside the title (nothing is held)', J('FC().subject.u.team') !== 'alien' && J('FC().subject.side') === 'friend' && J('FC().name') === '' && J('HC().subject') === null, JSON.stringify(J('FC().subject && FC().subject.side')));
  g.run('campPickOpen(P, { id: "attack", pick: "enemy" }, campPickItems(C, "enemy"));');
  check('a hostile the list is on: it is in the details of HOSTILES, and FRIENDLIES has none', J('HC().subject.u.team') === 'alien' && J('FC().subject') === null && J('HC().name') === '');
}

g.run(`
  window.__scene = (extra) => {
    const gs = { clears: 0, log: [] }, objs = [];
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, sets: 0, alpha: 1, style: { color: '#ffffff' }, width: 60, height: 14 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; o.sets++; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = a => { o.alpha = a; return o; }; objs.push(o); return o; };
    const mkP = () => { const pic = { vis: false, tex: '', textures: 0, tint: -1, sc: 0, rot: 0, x: 0, y: 0, alpha: 1, width: 64, height: 32 }; ['setScrollFactor', 'setDepth'].forEach(k => { pic[k] = () => pic; }); pic.setTexture = t => { pic.tex = t; pic.textures++; return pic; }; pic.setRotation = r => { pic.rot = r; return pic; }; pic.setTint = t => { pic.tint = t; return pic; }; pic.clearTint = () => { pic.tint = -1; return pic; }; pic.setScale = k => { pic.sc = k; return pic; }; pic.setPosition = (x, y) => { pic.x = x; pic.y = y; return pic; }; pic.setVisible = v => { pic.vis = v; return pic; }; pic.setAlpha = a => { pic.alpha = a; return pic; }; return pic; };
    return Object.assign({ gs, objs, camp: C, pn: P, mode: 'play', hud: {}, textures: { exists: () => true }, texOf: k => 'tex-' + k, add: { graphics: () => mkG(), text: mkT, image: mkP } }, extra || {});
  };
  window.NOW = id => campCornerNow(C, id);
  window.__look = () => { campTcornerLook(P, 0); };
`);

console.log('G. the registered corners');
{
  g.run('__new(); __look(); window.R1 = __foe("raider", 900, 0);');
  check('the two corners are registered where Troy put them: HOSTILES top right, FRIENDLIES bottom right', J('campCornerDef("hostiles").at') === 'tr' && J('campCornerDef("friendlies").at') === 'br');
  check('the panel gives their chips from the key table: ] for the hostiles and [ for the friendlies', JSON.stringify(J('NOW("hostiles").chips')) === JSON.stringify([']']) && JSON.stringify(J('NOW("friendlies").chips')) === JSON.stringify(['[']));
  check('the titles: HOSTILES and FRIENDLIES, no selection, details closed', J('NOW("hostiles").title') === 'HOSTILES' && J('NOW("friendlies").title') === 'FRIENDLIES' && J('NOW("hostiles").selection') === '' && J('NOW("hostiles").items.length') === 0 && J('NOW("hostiles").open') === 0);
  g.run('campCornerKey(C, "BracketRight");');
  check('a bracket key opens the details of HOSTILES alone (the panel opens every corner that has the key), but with nothing held there is nothing to show', J('NOW("hostiles").open') === 1 && J('NOW("friendlies").open') === 0 && J('NOW("hostiles").items.length') === 0);
  g.run('campTgtStep(C, 1);');
  check('the target held: its name is the selection, written beside the title', J('NOW("hostiles").selection') === J('campNavUnitName(R1)') && J('NOW("friendlies").selection') === '');
  check('and its details are open (the new target brings them back by itself)', J('NOW("hostiles").open') === 1 && J('NOW("hostiles").items.length') > 0);
  g.run('C.t += CAMP.corner.show + CAMP.corner.fade + 100;');
  check('they fade after CAMP.corner.show ms and are gone after CAMP.corner.fade more; the title and the selection stay', J('NOW("hostiles").open') === 0 && J('NOW("hostiles").items.length') === 0 && J('NOW("hostiles").title') === 'HOSTILES' && J('NOW("hostiles").selection') !== '');
  g.run('campTgtNearest(C);'); g.run('window.R2 = __foe("drone", 400, 0); campTgtNearest(C);');
  check('the nearest-threat key brings the details back with no chip of its own: a new target held opens them', J('NOW("hostiles").open') === 1 && J('NOW("hostiles").selection') === J('campNavUnitName(R2)'));
  g.run('C.t += CAMP.corner.show + CAMP.corner.fade + 100; NOW("hostiles");');
  check('the same target held again brings nothing back (it did not change)', J('NOW("hostiles").open') === 0);
  g.run('campFriStep(C, 1);');
  check('a friendly picked: FRIENDLIES opens with its name and HOSTILES has none (the enemy was let go)', J('NOW("friendlies").open') === 1 && J('NOW("friendlies").selection') !== '' && J('NOW("hostiles").selection') === '' && J('NOW("hostiles").items.length') === 0);
  g.run('campPicksClear(C); C.tgt = ""; C.t += 9000;');
  check('X lets it go: both selections are empty; the titles stay', J('NOW("hostiles").selection') === '' && J('NOW("friendlies").selection') === '' && J('NOW("hostiles").title') === 'HOSTILES');
  g.run('C.ships.filter(u => u.team === "alien").forEach(u => { u.hp = 0; });');
  check('the last hostile gone: the title of the corner is NO HOSTILES', J('NOW("hostiles").title') === 'NO HOSTILES' && J('NOW("hostiles").chips.length') === 1);
}

console.log('H. the details');
{
  g.run('__new(); __look(); window.R1 = __foe("raider", 1200, 0); campTgtStep(C, 1);');
  const kinds = J('NOW("hostiles").items.map(i => i.kind)');
  check('an enemy held: a picture row, HULL, SHIELD or its absence, what it is doing, the order chip (in the panel\'s order, top to bottom)', JSON.stringify(kinds) === JSON.stringify(['pic', 'bar', 'text', 'text', 'key']) || JSON.stringify(kinds) === JSON.stringify(['pic', 'bar', 'bar', 'text', 'key']), JSON.stringify(kinds));
  const it = J('NOW("hostiles").items');
  check('the picture row has the ship\'s kind, its type ("Hostile raider") and how far; no name (it is beside the title)', it[0].ship === 'raider' && it[0].type === 'Hostile raider' && /^[\d,.]+ km$/.test(it[0].km) && it[0].name === '' && it[0].side === 'hostile', JSON.stringify(it[0]));
  check('HULL is the ship\'s hull (now / max, its share, a colour of the charge table)', it[1].name === 'HULL' && it[1].num === J('Math.ceil(R1.hp) + " / " + Math.round(R1.maxHp)') && it[1].share === 1 && it[1].color === J('CAMP.charge.color[campChargeBand(1)]'));
  check('no shield: a line that says so, grey', it[2].kind === 'text' && it[2].text === 'no shield' && it[2].ink === '#7f95a8');
  check('the line of what it is doing is in the side\'s ink', it[3].text === J('campTdispDoing(C, R1)') && it[3].ink === J('CAMP.tdisp.ink.hostile'));
  check('the order chip is W Attack, from the key table; bright (ok) when the order can be given', it[4].cap === 'W' && it[4].label === 'Attack' && it[4].ok === J('campTdispOrder(C, "attack").ok'));
  g.run('R1.hp = R1.maxHp / 4;');
  check('the hull follows the ship', J('NOW("hostiles").items[1].share') === 0.25);
  g.run('window.RV = campSpawn(C, "pirateleader", C.carrier.x + 1200, C.carrier.y); C.tgt = RV.id;');
  check('the rival has a shield bar of its own (the cyan), not the line', J('NOW("hostiles").items[2].kind') === 'bar' && J('NOW("hostiles").items[2].name') === 'SHIELD' && J('NOW("hostiles").items[2].color') === 0x7fe9ff);
  g.run('campFriStep(C, 1);');
  const f = J('NOW("friendlies").items');
  check('a friendly ship held: the same rows, in the friendly\'s ink, with W Guard', f[0].kind === 'pic' && f[0].side === 'friend' && f[f.length - 1].kind === 'key' && f[f.length - 1].label === 'Guard' && f[f.length - 1].cap === 'W', JSON.stringify(f.map(i => i.kind + ':' + (i.label || i.name || i.text || ''))));
  g.run(`campFriHold(C, 'place:luna');`);
  const p = J('NOW("friendlies").items');
  check('an outpost held (a click on the Tab map): its type and its distance as lines, no picture, no bars, and the Guard chip', JSON.stringify(p.map(i => i.kind)) === JSON.stringify(['text', 'text', 'key']) && p[0].text === 'Friendly post' && /km$/.test(p[1].text) && p[2].label === 'Guard', JSON.stringify(p));
  check('and its name is the selection', J('NOW("friendlies").selection') === J('campFriNow(C).name'));
}

console.log('I. the picture on a stand-in scene');
{
  g.run('__new(); window.R1 = __foe("raider", 1200, 0); window.S = __scene(); campTcornerLook(P, 0); campCornerSync(S, 0); campTcornerSync(S, 0);');
  check('nothing held: the picture, the type and the distance are not shown', J('S.hud.tcorner.hostiles.pic.vis') === false && J('S.hud.tcorner.friendlies.pic.vis') === false);
  g.run('campTgtStep(C, 1); campCornerSync(S, 1000); campTcornerSync(S, 1000);');
  const V = 'S.hud.tcorner.hostiles';
  check('an enemy held: the picture is the ship\'s own art, nose up, scaled to fit the frame', J(V + '.pic.vis') && J(V + '.pic.tex') === 'tex-raider' && Math.abs(J(V + '.pic.rot') + Math.PI / 2) < 1e-9 && J(V + '.pic.sc') > 0);
  const G = J('campCornerGeom("tr", campCornerItemsH(NOW("hostiles").items), 0)');
  check('the picture is inside the details, in the top row (under the title, from the right edge in)', J(V + '.pic.x') > G.det.x && J(V + '.pic.x') < G.det.x + G.det.w && J(V + '.pic.y') > G.det.y && J(V + '.pic.y') < G.det.y + J('CAMP.corner.item.pic') + 8 && G.det.x === J('CAMP.corner.at.tr.x'), JSON.stringify([J(V + '.pic.x'), J(V + '.pic.y'), G.det]));
  check('its type and its distance are written beside it; no name (the name is beside the title)', J(V + '.type.text') === 'Hostile raider' && J(V + '.type.vis') && /km$/.test(J(V + '.km.text')) && J(V + '.km.vis') && J(V + '.name.vis') === false);
  check('the frame is drawn in the hostile\'s red', J(V + '.g.log.some(l => l[0] === "lineStyle" && l[2] === ' + J('CAMP.tdisp.color.hostile') + ')'));
  g.run(`${V}.pic.n0 = ${V}.pic.textures; ${V}.g.n0 = ${V}.g.clears; campCornerSync(S, 1100); campTcornerSync(S, 1100); campCornerSync(S, 1200); campTcornerSync(S, 1200);`);
  check('read again with nothing changed: the picture is not set and the frame not drawn again', J(V + '.pic.textures === ' + V + '.pic.n0 && ' + V + '.g.clears === ' + V + '.g.n0'));
  const km0 = J(V + '.km.text'); g.run('R1.x += 4000; campCornerSync(S, 1400); campTcornerSync(S, 1400);');
  check('the ship moves away: the distance is written again, bigger', J(V + '.km.text') !== km0 && /km$/.test(J(V + '.km.text')), km0 + ' -> ' + J(V + '.km.text'));
  g.run('S.mode = "won"; campCornerSync(S, 1500); campTcornerSync(S, 1500);');
  check('a card in front hides it, and it is there again after', J(V + '.pic.vis') === false && (g.run('S.mode = "play"; campCornerSync(S, 1600); campTcornerSync(S, 1600);'), J(V + '.pic.vis')));
  g.run('S.mp = {}; campCornerSync(S, 1700); campTcornerSync(S, 1700);');
  check('the Tab map in front hides it too', J(V + '.pic.vis') === false);
  g.run('S.mp = null; C.t += 9000; campCornerSync(S, 2000); campTcornerSync(S, 2000);');
  check('the details fade away: the picture goes with them; the title stays', J(V + '.pic.vis') === false && J(V + '.km.vis') === false);
  g.run('campFriStep(C, 1); campCornerSync(S, 3000); campTcornerSync(S, 3000);');
  const W = 'S.hud.tcorner.friendlies';
  check('a friendly held: its picture is in the bottom corner, in the friendly\'s cyan frame', J(W + '.pic.vis') && J(W + '.pic.x') > J('CAMP.corner.at.br.x') && J(W + '.g.log.some(l => l[0] === "lineStyle" && l[2] === ' + J('CAMP.tdisp.color.friend') + ')') && J(V + '.pic.vis') === false);
  g.run(`campFriHold(C, 'place:luna'); campCornerSync(S, 4000); campTcornerSync(S, 4000);`);
  check('an outpost held: no picture (its details are lines)', J(W + '.pic.vis') === false);
  g.run('P.pick = null; campPickOpen(P, { id: "escort", pick: "escort" }, campPickItems(C, "escort")); campPicksClear(C); campTcornerLook(P, 5000); C.t += 9000; campCornerSync(S, 5000); campTcornerSync(S, 5000);');
  check('a ship an order\'s list is on: its picture is shown and its name is written beside it (nothing is held, so none is beside the title)', J(W + '.pic.vis') && J(W + '.name.vis') && J(W + '.name.text') !== '' && J('NOW("friendlies").selection') === '', J(W + '.name.text'));
  check('a scene with no camp, or no graphics, is not an error (a stand-in in another test)', (() => { try { g.run('campTcornerSync({}, 0); campTcornerSync({ camp: C, hud: {} }, 0);'); return true; } catch (e) { return false; } })());
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);

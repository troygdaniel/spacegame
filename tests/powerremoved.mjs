// smoke: power management is gone from the game: no power list, no J K L, no pips on the gauges, no "power to shields" words; every system runs at the balanced values and the shield still mends (plain Node, no Chrome)
// Card space-game-power-removed (Troy, 23 Nov 2026: "he never uses it": remove the power list (P), the pips and J K L; the top-right gauges stay as plain readouts of shields, speed and lasers, with no pip bars; shields, speed
// and lasers run at the balanced values; shields still recharge by themselves; switch off rather than delete where that is cheap). The switch is CAMP_POWER in src/data_controls.js (campPowerSet(on) moves all of it) and
// CAMP.power.on in src/campaign.js. The code behind it is tested, switched on, by tests/campsystems.mjs, campgauges.mjs, camppowerkey.mjs, camppowerlink.mjs, campshieldauto.mjs and the suites of the lists; this suite is the game as it is.
//   A. the switch: off in the game; campPowerSet(true) brings back the keys, the list, the H page row and the rules; campPowerSet(false) takes them away again, to the byte
//   B. the keys and the list: no J K L (no key, no H page row), no key opens the power list, the list is off
//   C. the rules: a saved or asked setting is ignored (2 / 2 / 2: every factor 1, a shield of 150), "power" and "balance" are refused, the typed words give nothing
//   D. the shield still mends by itself: 3 a second after 3 s with no hit
//   E. the gauges: three plain dials, a cell as wide as the dial, no bar, no key under it, no frame; with the switch on the bars are there again
//   F. the words: nothing the game says tells the pilot to move power or pips; the briefing has no power line; the model is not offered the pip orders
// Run: node tests/powerremoved.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const NEW = `campNew(1, [], { seed: 1, power: [4, 1, 1] })`;

console.log('A. the switch');
check('the switch is off in the game: CAMP_POWER and CAMP.power.on are false', J('[CAMP_POWER, CAMP.power.on, campPowerOn]').join() === 'false,false,false');
const SNAP = `JSON.stringify([CAMP_KEYS.shields, CAMP_KEYS.engines, CAMP_KEYS.weapons, CAMP_PANELS.panels.map(p => [p.id, p.key, p.code, !!p.off, p.rows.map(r => r.id).join('/')]), controlsGroup('campaign').rows.length, CAMP_GAUGE.keys])`;
const off0 = g.run(SNAP);
g.run('campPowerSet(true)');
const on = JSON.parse(g.run(SNAP));
check('campPowerSet(true) brings the old world back: J K L, the power list no longer off (it has no key since card space-game-keys2-select: P and O pick friendlies, so only a mod or a test opens it by code), the H page row, CAMP.power.on', on[0].k === 'J' && on[1].k === 'K' && on[2].k === 'L' && on[3].find(p => p[0] === 'power')[3] === false && J("controlsGroup('campaign').rows.some(r => r.k.join() === 'J,K,L')") && J('CAMP.power.on') === true && on[5].KeyJ === 'shields');
g.run('campPowerSet(false)');
check('and campPowerSet(false) takes it all away again, byte for byte', g.run(SNAP) === off0);

console.log('B. the keys and the list');
check('J, K and L are no key: no code in CAMP_KEYS, no letter on the keys table', J('[CAMP_KEYS.shields, CAMP_KEYS.engines, CAMP_KEYS.weapons].every(k => k.k === "" && k.codes.length === 0)') && J('["KeyJ", "KeyK", "KeyL"].every(c => !Object.keys(CAMP_KEYS).some(id => CAMP_KEYS[id].codes.indexOf(c) >= 0))'));
check('the H page has no J K L row and no POWER heading', J("controlsGroup('campaign').rows.every(r => r.k.join() !== 'J,K,L' && r.sub !== 'POWER')"));
check('the gauges have no direct key and the key text of each dial is empty', J('Object.keys(CAMP_GAUGE.keys).length') === 0 && J(`campGauges(${NEW}).every(d => d.key === '')`));
check('the power list is off and has no key; no list lists it with a key on the H page', J("(() => { const p = CAMP_PANELS.panels.find(x => x.id === 'power'); return p.off === true && p.key === '' && p.code === ''; })()") && J("campPanelKeyRows().every(r => !/^Power/.test(r.t))"));
check('no key of the keyboard opens it: every letter key, with no list open and with each of the lists on open, leaves the power list shut', J(`(() => { const C = campNew(1, [], { seed: 3 }), codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Key' + c); return codes.every(c => { const P = campPanelNew(); campPanelKey(P, C, c, 0); return campPanelOpen(P) !== 'power'; }); })()`));
check('the power list is kept for the switch, with its pip rows', J("CAMP_PANELS.panels.find(x => x.id === 'power').rows.length") >= 3);

console.log('C. the rules');
g.run(`window.C = ${NEW}; 0`);
check('a setting asked for (4 / 1 / 1) and one saved in the browser are ignored: the pips are 2 / 2 / 2 and every factor is 1', J('C.power.p.join()') === '2,2,2' && J('(campPowerSave([3, 1, 2]), campPowerLoad().join())') === '2,2,2' && J('Object.keys(campPowerFx(C)).every(k => k === "regen" ? campPowerFx(C)[k] === CAMP.power.shields.regen[2] : campPowerFx(C)[k] === 1)')); // (the mend rate is the 3 a second of the table's middle step, not a factor)
check('the shield is 150 and the turrets, the missile reload and the engines are the table\'s own', J('campShieldMax(C)') === 150 && J('campReload(C)') === J('CAMP.missile.reload') && J('campPowerFx(C).speed') === 1 && J('campLaserRate(C)') === J('CAMP.tank.refill[2]'));
check('the power order, the balance order and the strip\'s "power to shields" are refused and move nothing', J(`(() => { const a = campOrder(C, 'power', 'shields', 'key'), b = campOrder(C, 'balance', '', 'key'); return [a.ok, a.code, b.ok, C.power.p.join(), C.orders.power, C.orders.balance]; })()`).join() === 'false,powerwhat,false,2,2,2,0,0');
check('the typed and the spoken words give nothing: "power to shields", "more power to the engines", "balance the power" are no order', J(`campIntent('power to shields')`) === null && J(`campIntent('more power to the engines')`) === null && J(`campIntent('balance the power')`) === null && J(`campIntent('balance power')`) === null);
check('"emergency shields" is not touched by this card (6-GEN\'s card replaces it), and "recharge shields" still says the shield mends by itself', J(`campIntent('emergency shields')`).act === 'fleet_emergency' && J(`campOrder(C, 'recharge', '', 'key').code`) === 'shieldauto');

console.log('D. the shield mends');
check('hit to 60, left alone: nothing for 3 s, then 3 a second (so 10 s later it is about 60 + 3 x 7 = 81)', (() => { const r = J(`(() => { const C = ${NEW}; C.shield = 60; C.shieldHitAt = C.t; let a = null; for (let i = 0; i < 100; i++) { campTick(C, 0.1); if (i === 28) a = C.shield; } return [a, C.shield, CAMP.power.shields.regen[2], CAMP.power.shields.regenDelay]; })()`); return r[0] === 60 && r[1] > 80.5 && r[1] < 82 && r[2] === 3 && r[3] === 3000; })());

console.log('E. the gauges');
const GEOM = on => { g.run(`campPowerSet(${on})`); const r = J('campHudGeom()'); return r; };
const gOff = GEOM(false), gOn = GEOM(true); g.run('campPowerSet(false)');
check('with the pips off a cell is as wide as the dial (CAMP.hud.plain), three of them end at the right edge as before', gOff.cells[1].x0 - gOff.cells[0].x0 === J('CAMP.hud.plain') && gOff.block.x1 === gOn.block.x1 && gOff.block.x1 - gOff.block.x0 === 3 * J('CAMP.hud.plain'));
check('with the pips on the cell is the old 118 and the block as it was (the bars and the keys are in it)', gOn.cells[1].x0 - gOn.cells[0].x0 === J('CAMP.hud.cell') && gOn.block.x1 - gOn.block.x0 === 3 * J('CAMP.hud.cell'));
check('the hull bar sits under the shield dial and is as wide as the dial, not as the old dial and bar', gOff.hull.x0 === gOff.cells[0].x0 && gOff.hull.x1 - gOff.hull.x0 === 2 * gOff.cells[0].R);
check('the dial is whole inside its cell, with room (the glow is a few px outside it)', gOff.cells.every(c => c.dial.x1 <= c.x0 + J('CAMP.hud.plain')));
// what is drawn: a recorder in place of the Graphics; a power segment is a 10 x 9 rectangle
g.run(`window.__rec = () => { const calls = []; const p = new Proxy({}, { get: (t, k) => k === '__calls' ? calls : (...a) => { calls.push([k, a]); return p; } }); return p; };`);
const segs = on => { g.run(`campPowerSet(${on})`); return J(`(() => { const C = ${NEW}, gr = __rec(), A = campGaugeAnimNew(C.power.p); campGaugesPaintDirect(gr, null, C, A, 1000, ${on ? 1 : -1}); const c = gr.__calls; return [c.filter(x => x[0] === 'fillRect' && x[1][2] === CAMP.hud.bar.w && x[1][3] === CAMP.hud.bar.h).length, c.filter(x => x[0] === 'strokeRoundedRect' || x[0] === 'fillRoundedRect').length, c.length > 100]; })()`); };
const sOff = segs(false), sOn = segs(true); g.run('campPowerSet(false)');
check('painted with the pips off there is no bar of power segments and no frame round a dial (and the dials are drawn)', sOff[0] === 0 && sOff[1] === 0 && sOff[2] === true, JSON.stringify(sOff));
check('and with them on there are bars (4 segments a dial, each drawn dark and the lit ones again: at least 12 rectangles) and the frame of the highlighted dial', sOn[0] >= 12 && sOn[1] >= 2, JSON.stringify(sOn));
check('the dials say what they said: shields 150, speed 0, lasers 100', J(`campGauges(${NEW}).map(d => d.big).join()`) === '150,0,100' && J(`campGauges(${NEW}).map(d => d.label).join()`) === 'SHIELDS,SPEED,LASERS');

console.log('F. the words');
const say = k => J(`uiText(${JSON.stringify(k)})`);
check('the ship\'s lines no longer tell the pilot to move power: the rival\'s three, the lasers running dry, the shield that mends by itself', ['camp.say.rival.charge', 'camp.say.rival.down', 'camp.say.rival.ram', 'camp.say.lasersdry', 'camp.no.shieldauto'].every(k => !/power|pip/i.test(say(k)) && !/^camp\./.test(say(k))), ['camp.say.rival.charge', 'camp.say.rival.down', 'camp.say.rival.ram', 'camp.say.lasersdry', 'camp.no.shieldauto'].map(say).join(' | '));
check('the lines are curt: 12 words or fewer', ['camp.say.rival.charge', 'camp.say.rival.down', 'camp.say.rival.ram', 'camp.say.lasersdry', 'camp.no.shieldauto'].every(k => say(k).split(/\s+/).length <= 12));
check('the briefing\'s readiness has no power line, and a saved setting does not change its shield (150)', J(`(() => { campPowerSave([3, 1, 2]); const r = campBriefReady(campProgressNew(), 1, 0); return [r.lines.some(l => /^Power/.test(l)), r.lines[r.lines.length - 1], r.power.join()]; })()`).join() === 'false,Shield: full, 150 points,2,2,2' && !('camp.bf.ready.power' in J('UI_TEXT')));
check('the emergency and blink rows have left the power list for the cruiser list (card space-game-keys2-cruiser): the power list holds only the four pip rows, and the briefing\'s shield key box says S', J("CAMP_PANELS.panels.find(x => x.id === 'power').rows.map(r => r.id).join()") === 'shields,engines,weapons,balance' && J("CAMP_PANELS.panels.find(x => x.id === 'cruiser').rows.some(r => r.id === 'emergency')") && J('campBriefKeys(1, 0).filter(k => k.id === "shield").map(k => k.k.join()).join()') === 'S');
const sc = src('src/shipcomputer.js');
g.run("window.__scene = { scene: { key: 'Campaign' }, leaving: false, dead: false, camp: campNew(1, [], { seed: 1 }), toasts: [] }; 0");
check('the model is not offered the pip orders in its closed list, and is not told a key or pips for the shield', !/fleet_power <|fleet_balance \|/.test(sc) && !/more pips on them/.test(sc) && J('shipcompSystem(__scene)').indexOf('pips') < 0);
check('the N panel keeps the shield mend and the laser refill rows (the numbers at the balanced setting) with words that do not say pips or power', J(`['shieldmend', 'laserrefill'].every(id => campTuneRow(id) && !/pip|power/i.test(campTuneLabel(campTuneRow(id))))`));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `POWER REMOVED FAIL (${failed} of ${n})` : `POWER REMOVED PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

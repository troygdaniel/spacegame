// smoke: the new Long Haul's page HUD model (plain Node, no Chrome): off, the sync is false and Long Haul's dials are drawn; on, the model is the shape the Campaign's painter takes, the meters and the hostiles panel say what the flight says, the edge pill is up only while no pirate is on the screen, and the three new words are in the content with a voice rule
// PROMPT 23 (the cloud session's brief 15), piece 8 of docs/longhaul-earth.html. src/lhpagehud.js: LHHUD, lhPageModel (pure), lhPageHudView, lhPageHudSync, lhPageHudDrop; the hooks are in hudTick (src/hud.js) and the key line (src/space.js).
//   A  off: lhPageHudSync is false (no page in Node either way)
//   B  the ship panel: Hull and its percentage only below 100, Shields only with a shield part, Boost with Refilling while locked, Speed bright over the plain top speed; the words are the Campaign's own
//   C  the hostiles panel: none with no pirate near; the kinds counted and named, the nearest one's compass point and distance in km; a pirate past the range is left out
//   D  the edge pill: up while pirates are near and none is on the screen, with the count; down when one is on it
//   E  the key row: six chips, the caps Long Haul's keys, three of the words the Campaign's and three new (lh.chip.*), each a content key with its default and a voice rule that says shown only
//   F  the Campaign's painter takes the model as it is (every field it reads is there) on a stand-in page
//   G  the hooks ask first: with no page HUD hudTick draws its frame and dials as before; the file asks the web for nothing
// Run: node tests/lhpagehud.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const V = o => JSON.stringify(Object.assign({ hull: 100, maxHull: 100, shield: null, en: 100, enMax: 100, boosting: false, locked: false, speed: 0, vmax: 480, foes: [], onScreen: false }, o));
const M = o => J(`lhPageModel(${V(o)})`);

console.log('A  off');
check('lhPageHudSync is false', J('lhPageHudSync({ ship: {}, game: {} }, 0)') === false);
J('lhNewSet(true)');

console.log('B  the ship panel');
const full = M({}), hurt = M({ hull: 42, shield: { pts: 30, max: 60 }, en: 20, locked: true, speed: 612 });
check('Hull is full with no percentage; no Shields row without the part', full.ship.hull.frac === 1 && full.ship.hull.show === false && full.ship.shield === null && full.ship.hull.word === 'Hull');
check('hurt: 42 percent shown; Shields at half', hurt.ship.hull.pct === 42 && hurt.ship.hull.show === true && hurt.ship.shield.frac === 0.5 && hurt.ship.shield.word === 'Shields', JSON.stringify(hurt.ship.shield));
check('Boost says Refilling while locked and is plain when full', hurt.ship.boost.locked === true && hurt.ship.boost.pctText === 'Refilling' && hurt.ship.boost.frac === 0.2 && full.ship.boost.full === true && full.ship.boost.pctText === undefined && full.ship.boost.word === 'Boost');
check('Speed is hidden at rest and bright over the plain top speed', full.ship.speed.show === false && hurt.ship.speed.n === 612 && hurt.ship.speed.over === true && M({ speed: 300 }).ship.speed.over === false);
check('there is no cruiser line and no key chip on the panel', full.ship.cruiser === null && full.ship.key === '');

console.log('C  the hostiles panel');
check('none with no pirate near', full.foes === null && full.edge === null);
const three = M({ foes: [{ kind: 'raider', name: 'Raider', dx: 400, dy: 300 }, { kind: 'raider', name: 'Raider', dx: 900, dy: 0 }, { kind: 'gunship', name: 'Gunship', dx: 0, dy: -1200 }, { kind: 'drone', name: 'Drone', dx: 9000, dy: 0 }], onScreen: true });
check('the kinds are counted and named, most first', three.foes.what === '2 Raiders, 1 Gunship' && three.foes.label === 'HOSTILES', three.foes.what);
check('the nearest one\'s compass point and distance', three.foes.dir === 'south-east' && three.foes.km === '50 km', three.foes.dir + ' ' + three.foes.km);
check('a pirate past the range is left out', !/Drone/.test(three.foes.what));

console.log('D  the edge pill');
const off = M({ foes: [{ kind: 'raider', name: 'Raider', dx: -1500, dy: 0 }, { kind: 'raider', name: 'Raider', dx: -1700, dy: 100 }], onScreen: false });
check('up with the count while none is on the screen, pointing at the nearest', off.edge.n === 2 && Math.abs(Math.abs(off.edge.angle) - Math.PI) < 1e-9 && off.edge.km === '150 km', JSON.stringify(off.edge));
check('down when one is on the screen', three.edge === null);

console.log('E  the key row');
const keys = J('LHHUD.keys'), items = full.first.items;
check('six chips with Long Haul\'s caps', items.length === 6 && items.map(i => i.key).join() === 'WASD,Space,Shift,L,N,H', items.map(i => i.key).join());
check('the words: Fly, Fire, Boost, Dock, Places, Keys', items.map(i => i.word).join() === 'Fly,Fire,Boost,Dock,Places,Keys');
check('the caps are keys Long Haul\'s flight reads', /addKeys\('W,A,S,D,E,Q,L,R,SPACE,SHIFT/.test(src('src/space.js')));
const md = src('content/text/longhaul.md'), ct = src('src/contenttables.js');
check('the three new words are in the content file and have the same default', ['dock|Dock', 'places|Places', 'keys|Keys'].every(r => { const [k, w] = r.split('|'); return md.includes(`| lh.chip.${k} | ${w} |`) && ct.includes(`'lh.chip.${k}': '${w}'`); }));
check('every key of the row is a content key the game knows', keys.every(k => J(`uiText(${JSON.stringify(k[2])})`) !== k[2]));
check('the new words have a voice rule: shown only', /\{ re: \/\^lh\\\.\/, why: '[^']*never said' \}/.test(src('src/voicepack.js').replace(/\\'/g, '')));

console.log('F  the Campaign\'s painter takes the model');
g.run(`window.fakeDoc = { createElement: () => { const e = { style: { setProperty() {} }, children: [], className: '', textContent: '', innerHTML: '', appendChild(c) { this.children.push(c); c.parentNode = this; return c; }, removeChild(c) { this.children = this.children.filter(x => x !== c); } }; return e; } };`);
const painted = J(`(() => { const R = campPageHudBuild(fakeDoc); campPageHudPaint(R, lhPageModel(${V({ hull: 42, shield: { pts: 30, max: 60 }, speed: 300, foes: [{ kind: 'raider', name: 'Raider', dx: 400, dy: 300 }] })}), fakeDoc); return { hull: R.ship.hull.fill.style.width, pct: R.ship.hull.pct.textContent, foes: R.foes.what.textContent, sub: R.foes.sub.textContent, chips: R.first.items.length, sp: R.ship.speed.n.textContent }; })()`);
check('hull 42 percent, the hostiles line and six chips are painted', painted.hull === '42%' && painted.pct === '42%' && painted.foes === '1 Raider' && /south-east/.test(painted.sub) && painted.chips === 6 && painted.sp === '300', JSON.stringify(painted));
J('lhNewSet(null)');

console.log('G  the hooks');
const hud = src('src/hud.js');
check('hudTick asks first and keeps its frame and dials as the other branch', /const lhh = space && typeof lhPageHudSync === 'function' && lhPageHudSync\(s, now\);/.test(hud) && /if \(!lhh\) hudFrame\(g, now\);/.test(hud) && /if \(!lhh\) hudGauge\(h, 'g1'/.test(hud) && /if \(space && !lhh\) \{/.test(hud));
check('the key line is hidden only with the switch on', /&& !\(typeof lhNewOn === 'function' && lhNewOn\(\)\)\);/.test(src('src/space.js')));
check('the Campaign\'s page HUD file has no word of it', !/lhPage|lhNewOn/.test(src('src/camppagehud.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhpagehud.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHPAGEHUD FAIL: ${failed} of ${n} checks failed` : `\nLHPAGEHUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

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

console.log('H  one style: the supplies, the mission and the tip as page panels (card space-game-lh-hud-one-style; Troy, 28 Nov 2026: yes, the layout picture)');
{
  const SU = o => J(`lhSupplyModel(${JSON.stringify(Object.assign({ now: 10000, cr: { show: 412, gain: null, flash: 0, pulse: 0, pulseRed: false }, fuel: { frac: 1, state: 'ok' }, ore: 0, cap: 10, parts: [] }, o))})`);
  let m = SU({});
  check('supplies at rest: Cr 412 with no float and no glow, the fuel full and cyan (ok), the ore empty, the words Cr, Fuel, Ore', m.cr.text === '412' && m.cr.delta === null && m.cr.glow === 0 && m.cr.loss === false && m.fuel.frac === 1 && m.fuel.state === 'ok' && m.ore.frac === 0 && m.ore.full === false && m.words.cr === 'Cr' && m.words.fuel === 'Fuel' && m.words.ore === 'Ore', JSON.stringify(m));
  m = SU({ cr: { show: 1234567, gain: { v: 250, t: 9700 }, flash: 10200, pulse: 10350, pulseRed: false } });
  check('a gain: the figure has its thousands (1,234,567), +250 floats beside it (green, fading), the panel glows gold and the figure flashes white', m.cr.text === '1,234,567' && m.cr.delta.text === '+250' && m.cr.delta.loss === false && m.cr.delta.alpha > 0 && m.cr.delta.alpha < 1 && m.cr.glow > 0 && m.cr.loss === false && m.cr.flash === true, JSON.stringify(m.cr));
  m = SU({ cr: { show: 300, gain: { v: -100, t: 9900 }, flash: 10600, pulse: 10500, pulseRed: true } });
  check('a loss: -100 floats (red) and the panel glows red', m.cr.delta.text === '-100' && m.cr.delta.loss === true && m.cr.loss === true, JSON.stringify(m.cr));
  check('the float is gone after 1.3 s and the glow after 0.65 s', SU({ cr: { show: 5, gain: { v: 5, t: 8000 }, flash: 0, pulse: 9000, pulseRed: false } }).cr.delta === null && SU({ cr: { show: 5, gain: null, flash: 0, pulse: 9000, pulseRed: false } }).cr.glow === 0);
  m = SU({ fuel: { frac: 0.2, state: 'low' }, ore: 10, cap: 10 });
  check('the fuel under a quarter is low (amber), the ore at the hold\'s size is full (red, beating)', m.fuel.state === 'low' && m.ore.full === true && m.ore.frac === 1 && SU({ fuel: { frac: 0.05, state: 'crit' } }).fuel.state === 'crit' && SU({ fuel: { frac: 7, state: 'ok' } }).fuel.frac === 1 && SU({ ore: 4, cap: 10 }).ore.frac === 0.4);
  m = SU({ parts: [{ short: 'SHD', tier: 2, off: false }, { short: 'WPN', tier: 0 }, { short: 'AIM', tier: 3, off: true }, { short: 'ENG', tier: 9 }] });
  check('the parts: three letters, a pip a tier (0 to 3), the aim help red while R has it off', m.parts.length === 4 && m.parts[0].short === 'SHD' && m.parts[0].tier === 2 && m.parts[1].tier === 0 && m.parts[2].off === true && m.parts[3].tier === 3, JSON.stringify(m.parts));
  check('all six parts of the game are in the view, in the game\'s order (SHD WPN ENG TNK CRG AIM)', J(`PART_ORDER.map(k => PARTS[k].short).join(' ')`) === 'SHD WPN ENG TNK CRG AIM');

  const MI = (m0, o) => J(`lhMissionModel(${JSON.stringify(Object.assign({ m: m0, meter: null, open: false }, o))})`);
  const none = { kind: 'none', head: 'NO ACTIVE MISSION', next: 'Take a call at the MISSIONS terminal' };
  const act = { kind: 'active', head: 'Rescue call', sub: 'The Moon, Earth Orbit', reward: 500, cur: 1, next: 'Land on the Moon (L)', steps: [{ text: 'Take the rescue call', state: 'done' }, { text: 'Find the colonist', state: 'cur' }, { text: 'Dock', state: 'todo' }] };
  let mm = MI(none);
  check('slim, no mission: NO ACTIVE MISSION with the T cap and the next line under it (as the picture)', mm.open === false && mm.head === 'NO ACTIVE MISSION' && mm.key === 'T' && mm.next === 'Take a call at the MISSIONS terminal' && mm.tone === 'none', JSON.stringify(mm));
  mm = MI(act);
  check('slim, a mission with steps: the step you are on (Find the colonist) and the T cap, no next line (as the canvas strip had)', mm.head === 'Find the colonist' && mm.next === '' && mm.tone === 'live' && mm.key === 'T', JSON.stringify(mm));
  mm = MI(act, { open: true });
  check('open: Mission, the T cap and Hide, +500 cr, the title and place, the three steps with their states, the next line', mm.open === true && mm.label === 'Mission' && mm.hide === 'Hide' && mm.reward === '+500 cr' && mm.head === 'Rescue call' && mm.sub === 'The Moon, Earth Orbit' && mm.steps.map(x => x.state).join() === 'done,cur,todo' && mm.next === 'Land on the Moon (L)', JSON.stringify(mm));
  check('a failed mission is bad (pink), the open one with no reward shows none', MI({ kind: 'failed', head: 'MISSION FAILED', next: 'x' }).tone === 'bad' && MI({ kind: 'failed', head: 'MISSION FAILED', next: 'x' }, { open: true }).reward === '');
  check('the meter (the freighter\'s hull, say) is in both states and is low under 30 percent', MI(act, { meter: { name: 'FREIGHTER', frac: 0.25 } }).meter.low === true && MI(act, { open: true, meter: { name: 'FREIGHTER', frac: 0.8 } }).meter.low === false && MI(act).meter === null);

  const TI = o => J(`lhTipsModel(${JSON.stringify(o)})`);
  check('the tip: the words as the canvas had them, the H cap and "Hide tips" only while the cap shows; gone with no words or while the command strip is up', TI({ text: 'W thrusts', hide: true }).text === 'W thrusts' && TI({ text: 'W thrusts', hide: true }).hide === true && TI({ text: 'W thrusts', hide: true }).word === 'Hide tips' && TI({ text: 'W thrusts', hide: false }).hide === false && TI({ text: '' }).on === false && TI({ text: 'x', away: true }).on === false);
  check('the six words are in the table and the content file', ['mission', 'hide', 'fuel', 'ore', 'cr', 'tips'].every(k => J(`uiText('lh.hud.${k}')`) !== 'lh.hud.' + k) && /lh\.hud\.tips \| Hide tips/.test(src('content/text/longhaul.md')));

  // the state that moved out of hudStrip: the same figures as before
  g.run(`window.__h = { cr: 100, crShow: 100 }; G.credits = 350; hudCredits(__h, 5000);`);
  const hc = J('({ cr: __h.cr, gain: __h.gain, flash: __h.flash, pulse: __h.pulse, show: __h.crShow, gold: __h.pulseCol === GOLD })');
  check('hudCredits keeps the old figures: a gain of 250 flashes 700 ms and glows 650 ms in gold, the shown figure goes 14 percent of the way', hc.cr === 350 && hc.gain.v === 250 && hc.flash === 5700 && hc.pulse === 5650 && hc.gold === true && Math.abs(hc.show - 135) < 0.01, JSON.stringify(hc));
  g.run(`G.credits = 0;`);

  const hs = src('src/hud.js'), lp = src('src/lhpagehud.js'), gd = src('src/guide.js'), ls = src('src/listen.js'), ix = src('index.html'), css = src('src/lhhud.css');
  check('hudTick with the switch: the credits state and the fuel sound stay, the strip and the checklist are the page\'s, and the panels are asked after the mission', /if \(lhh\) \{ hudCredits\(h, now\); const fst = fuelState\(\); hudFuelWarn\(h, now, fst === 'crit', fst !== 'ok'\); \} else hudStrip\(h, now\);/.test(hs) && /if \(lhh\) \{ h\.lhMission = \{ m, meter: s\._hm \|\| null, open: h\.open \}; lhPageHudSide\(s, h, now\); \}/.test(hs) && /else \{\s*const ht = hudTracker\(/.test(hs));
  check('hudStrip and hudFuel call the same two functions (the old strip is as it was)', /hudCredits\(h, now\);\s*const CRW = 408;/.test(hs) && /hudFuelWarn\(h, now, crit, low\);\s*\}/.test(hs));
  check('the radar sits under the supplies panel: h.radarCy in the radar, its dim disc and its zone; the hostiles panel under it', /cy = h\.radarCy \|\| 112/.test(hs) && /hudDisc\(g, W - 110, h\.radarCy \|\| 112, 88\)/.test(hs) && /y1: 250 \+ \(\(h\.radarCy \|\| 112\) - 112\)/.test(hs) && /scene\._hud\.radarCy \+ 188/.test(lp));
  check('the tip: guide.js keeps the H cap flag and leaves its canvas text out when the page draws it', /s\._gkOn = !!text &&/.test(gd) && /lhPageHudOwnsTips\(s\)\) \{ s\._gh\.setVisible\(false\); s\._gk\.setVisible\(false\); \}/.test(gd) && J(`lhPageHudOwnsTips({ scene: { key: 'Space' } })`) === false);
  check('the talk cap: a pill in the Campaign\'s look under the switch, the old ring without it', /typeof lhNewOn === 'function' && lhNewOn\(\)\) \{ \/\/ \?longhaul=new: the Campaign's look/.test(ls) && /if \(d\.lh\) \{/.test(ls) && /width:58px;height:58px;border-radius:50%/.test(ls));
  check('the stylesheet is linked and has every class the panels use', /<link rel="stylesheet" href="src\/lhhud\.css">/.test(ix) && ['ph-lhmis', 'ph-lhres', 'ph-lhtips', 'ph-lhcr', 'ph-parts', 'ph-part', 'ph-lhprog', 'ph-lhstp', 'ph-lhhide'].every(c => css.indexOf('.' + c) >= 0));
  check('a click on the mission panel opens and shuts the checklist as the canvas one did, and the toasts follow it', /hudToggle\(scene\._hud, scene, true\)/.test(lp) && /toastKeep\(scene, scene\.toastTop\(\)\)/.test(lp));
}

console.log('G  the hooks');
const hud = src('src/hud.js');
check('hudTick asks first and keeps its frame and dials as the other branch', /const lhh = space && typeof lhPageHudSync === 'function' && lhPageHudSync\(s, now\);/.test(hud) && /if \(!lhh\) hudFrame\(g, now\);/.test(hud) && /if \(!lhh\) hudGauge\(h, 'g1'/.test(hud) && /if \(space && !lhh\) \{/.test(hud));
check('the key line is hidden only with the switch on', /&& !\(typeof lhNewOn === 'function' && lhNewOn\(\)\)\);/.test(src('src/space.js')));
check('the Campaign\'s page HUD file has no word of it', !/lhPage|lhNewOn/.test(src('src/camppagehud.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhpagehud.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHPAGEHUD FAIL: ${failed} of ${n} checks failed` : `\nLHPAGEHUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

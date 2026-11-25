// smoke: with the new ship look on, your own side's fire on the Tab map is mint, not amber (decision 4: amber only ever means a ship you protect); every amber left in the ship and fire marks is on a list with its reason (plain Node, no Chrome)
// Card space-game-ship-look-map-own-fire-mint (Troy's decision 4 of the ship look, 25 Nov 2026; the look table says your fire is #7df0c0). tests/shiplookpink.mjs does the same for red and the hostile marks.
//   A  the Tab map's fire (src/campmapfire.js): a turret volley, a missile's trail and dot, a missile's blast and your wing's bullets are mint while the look is on, and what they were off; the beam tech's bullet, a patrol's, your ship's ring and flash and the shield flash are the same on and off; the hostile marks are still pink
//   B  the pin: every amber-ish colour (a hue of 28 to 52 degrees, saturation over 0.5, brightness over 0.65) in the files that draw ships, their marks and their fire is on the list below with what it is and why it stays; a new amber that is not a ship you protect fails here
// Run: node tests/shiplookmint.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const MINT = 0x7df0c0, PINK = 0xff6fa8;

g.run(`
  window.__C = { t: 5000, by: { a1: { id: 'a1', team: 'alien', kind: 'drone', x: 400, y: 0 }, f1: { id: 'f1', team: 'earth', kind: 'fighter', x: 100, y: 0 }, carrier: { id: 'carrier', team: 'earth', kind: 'carrier', x: 0, y: 0 } },
    bullets: [], rockets: [], rocks: [], lasers: [] };
  window.__F = { x: 100, y: 100, w: 800, h: 500 };
  window.__fit = { s: 0.2, cx: 0, cy: 0 };
  window.__calls = [];
  window.__G = { lineStyle(w, c, a) { __calls.push({ op: 'lineStyle', w, c, a }); return this; }, lineBetween(x0, y0, x1, y1) { __calls.push({ op: 'line', x0, y0, x1, y1 }); return this; },
    strokeCircle(x, y, r) { __calls.push({ op: 'ring', x, y, r }); return this; }, fillStyle(c, a) { __calls.push({ op: 'fillStyle', c, a }); return this; }, fillCircle(x, y, r) { __calls.push({ op: 'dot', x, y, r }); return this; } };
  window.__colors = (flag) => { CAMP.flags.shiplook = flag; const P = campFireNew(), at = e => { campFireHear(P, __C, e, 1000); return P.slots[(P.i + P.slots.length - 1) % P.slots.length].color; };
    const r = { volley: at({ type: 'turret', i: 0, x: 0, y: 0, aim: 0, tx: 300, ty: 40 }), blast: at({ type: 'mboom', x: 5, y: 5, r: 120 }), ringFriend: at({ type: 'boom', x: 10, y: 10, big: true, kind: 'carrier' }), ringFoe: at({ type: 'boom', x: 10, y: 10, big: false, kind: 'drone' }),
      flashFriend: at({ type: 'hit', id: 'f1', x: 1, y: 1 }), flashFoe: at({ type: 'hit', id: 'a1', x: 2, y: 2 }), shield: at({ type: 'shieldhit', x: 3, y: 3 }) };
    __C.bullets = [{ x: 540, y: 140, vx: 400, vy: 0, team: 'earth' }, { x: 560, y: 160, vx: 400, vy: 0, team: 'neutral' }, { x: 580, y: 180, vx: 400, vy: 0, team: 'earth', beam: true }, { x: 520, y: 120, vx: 400, vy: 0, team: 'alien' }];
    __C.rockets = [{ x: 600, y: 200, rot: 0.3 }];
    __calls.length = 0; campFirePaint(P, __C, __G, __F, __fit, 1000); const cs = __calls.slice(); __C.bullets = []; __C.rockets = [];
    r.bullets = cs.filter(c => c.op === 'lineStyle').map(c => c.c); r.rocketDot = cs.filter(c => c.op === 'fillStyle').map(c => c.c); CAMP.flags.shiplook = false; return r; };
`);
const K = J('CAMPFIRE.color'), off = J('__colors(false)'), on = J('__colors(true)');

console.log('A. your fire on the Tab map');
check('1 switch off: the volley, the missile\'s blast and the missile are the old amber (CAMPFIRE.color.volley, blast and missile), your wing\'s bullet the wing\'s green (unchanged)', off.volley === K.volley && off.blast === K.blast && off.bullets[0] === K.wing && K.volley === 0xffd37a && K.blast === 0xffd37a && K.missile === 0xffd37a, JSON.stringify(off));
check('2 switch on: a turret volley, a missile\'s blast, your wing\'s bullet, the missile\'s trail and its dot are mint (#7df0c0, the look table\'s own fire), no amber among them', on.volley === MINT && on.blast === MINT && on.bullets[0] === MINT && on.bullets[2] !== MINT && on.rocketDot.includes(MINT) && !on.rocketDot.includes(0xffd37a) && J('slookInt(SLOOK.C.own)') === MINT && J('SLOOK.C.own') === '#7df0c0', JSON.stringify(on));
check('3 the missile\'s own two marks follow it (its trail line and its dot are both mint while the look is on, both amber off)', (() => { const l = J('(() => { CAMP.flags.shiplook = true; __C.rockets = [{ x: 600, y: 200, rot: 0.3 }]; const P = campFireNew(); __calls.length = 0; campFirePaint(P, __C, __G, __F, __fit, 1000); const c = __calls.slice(); __C.rockets = []; CAMP.flags.shiplook = false; return c; })()'), o = J('(() => { __C.rockets = [{ x: 600, y: 200, rot: 0.3 }]; const P = campFireNew(); __calls.length = 0; campFirePaint(P, __C, __G, __F, __fit, 1000); const c = __calls.slice(); __C.rockets = []; return c; })()'); return l.filter(c => c.op === 'lineStyle').every(c => c.c === MINT) && l.filter(c => c.op === 'fillStyle').every(c => c.c === MINT) && o.filter(c => c.op === 'lineStyle').every(c => c.c === 0xffd37a) && o.filter(c => c.op === 'fillStyle').every(c => c.c === 0xffd37a) && l.some(c => c.op === 'dot') && o.some(c => c.op === 'dot'); })());
check('4 what is not your fire does not move: your ship\'s ring and flash (cyan), the shield flash, a patrol\'s bullet (teal), the beam tech\'s bullet (cyan) are the same on and off, and the hostile marks are still pink (an alien\'s bullet, a hostile ring and flash)', ['ringFriend', 'flashFriend', 'shield'].every(k => on[k] === off[k]) && on.bullets[1] === off.bullets[1] && on.bullets[2] === off.bullets[2] && on.bullets[1] === K.patrol && on.bullets[2] === K.beam && on.ringFoe === PINK && on.flashFoe === PINK && on.bullets[3] === PINK && off.ringFoe === K.ringFoe, JSON.stringify([on, off]));
check('5 a flip is felt at once both ways, and the helper is small and the only place of its kind: cfOwn gives mint on and the colour it was off; no raw K.volley, K.blast or K.missile is drawn without it', J('__colors(true).volley') === MINT && J('__colors(false).volley') === K.volley && (() => { const f = src('src/campmapfire.js'), body = f.slice(f.indexOf('function campFireHear')); return /const cfOwn = c => typeof slookOn === 'function' && slookOn\(\) \? slookInt\(SLOOK\.C\.own\) : c;/.test(f) && (body.match(/K\.volley/g) || []).length === 1 && /cfOwn\(K\.volley\)/.test(body) && (body.match(/K\.blast/g) || []).length === 1 && /cfOwn\(K\.blast\)/.test(body) && (body.match(/K\.missile/g) || []).length === 2 && (body.match(/own \|\| K\.missile/g) || []).length === 2 && /own \|\| K\.wing/.test(body); })());

console.log('B. the pin: amber in the ship and fire marks');
const hsv = h => { const r = parseInt(h.slice(0, 2), 16) / 255, gg = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let hh = 0; if (d) hh = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: hh * 60, s: mx ? d / mx : 0, v: mx }; };
const FILES = ['campmapfire.js', 'camptorpedoscene.js', 'campsightscene.js', 'campmapdraw.js', 'campmap.js', 'campfarscene.js', 'campconvoyscene.js', 'campchargescene.js', 'camptargetdraw.js', 'campcircles.js', 'shiplook.js', 'shiplookdraw.js', 'shiplookmarks.js', 'shiplookfx.js', 'shiplookglyph.js', 'shiplookpic.js'];
const found = new Set();
const scan = (name, text) => text.split('\n').forEach(l => { const code = l.split('//')[0]; for (const m of code.matchAll(/0x([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{6})\b/g)) { const h = (m[1] || m[2]).toLowerCase(), c = hsv(h); if (c.h >= 28 && c.h <= 52 && c.s > 0.5 && c.v > 0.65) found.add(name + '#' + h); } });
FILES.forEach(f => { try { scan(f, src('src/' + f)); } catch (e) { /* a file this checkout does not have */ } });
scan('campaignscene.js (the shot and reach tables)', src('src/campaignscene.js').split('\n').filter(l => /^const CAMP_(SHOT|REACH)\b/.test(l)).join('\n'));
// what each amber is and why it stays: gold is for goals, places and caches, amber for the ships you protect; the rest are the old colours the look replaces (mint, pink or blue while it is on)
const KNOWN = {
  'campmapfire.js#ffd37a': 'the old amber of your volley, your missile and its blast (mint through cfOwn while the look is on: test 2)',
  'camptorpedoscene.js#ffa040': 'a pirate\'s torpedo\'s old amber (pink through slookTorpTone while the look is on, src/shiplookfx.js)',
  'campsightscene.js#ffb454': 'the edge arrow of a ship you protect (amber is theirs)', 'campsightscene.js#ffd37a': 'the words of that arrow',
  'campmapdraw.js#ffd37a': 'place names, the goal and the legend\'s gold (gold is for goals and places)', 'campmapdraw.js#ffb454': 'a place\'s label and the convoy\'s mark (a ship you protect)', 'campmapdraw.js#ffd24a': 'the mission\'s goal ring', 'campmapdraw.js#e9b872': 'the word GOAL on the map: a gold pill (the page HUD\'s gold, for goals: card space-game-b3-f-tab-map-build)',
  'campmap.js#ffd37a': 'a cache\'s gold (and the old map colour table)', 'campmap.js#ffb454': 'the convoy\'s colour: a ship you protect', 'campmap.js#ff9a3a': 'the old tower dot (a sign in its side\'s colour while the look is on)', 'campmap.js#e8d24a': 'the old pirate dot (a sign in its side\'s colour while the look is on)',
  'campfarscene.js#ffd37a': 'the far view\'s marks of places and the goal (gold)',
  'shiplook.js#ffc857': 'the look\'s own colour for a ship you protect (C.protect) and the hull arc\'s middle band (the HUD\'s ring colours)',
  'shiplookfx.js#ffd37a': 'gun.gold: the reach ring and the mounts\' old gold, which the table replaces with the friend blue (slookGunTone)', 'shiplookfx.js#ffa040': 'torp.gold: the pirates\' old torpedo amber, which the table replaces with pink (slookTorpTone)',
  'campaignscene.js (the shot and reach tables)#ffa83a': 'CAMP_SHOT.pirate: the pirates\' old amber shot (pink shots while the look is on, src/shiplookfx.js)', 'campaignscene.js (the shot and reach tables)#ffd37a': 'CAMP_REACH.color: the gun reach ring\'s old gold (friend blue through slookGunTone)'
};
const unknown = [...found].filter(k => !(k in KNOWN)), gone = Object.keys(KNOWN).filter(k => !found.has(k));
check('6 every amber of the files that draw ships, their marks and their fire is on the list with its reason: no new amber that is not a ship you protect has crept in', unknown.length === 0, 'not on the list: ' + unknown.join(' '));
check('7 and the list has nothing that is not there any more (an amber that was removed leaves the list too, so it stays true)', gone.length === 0, 'gone: ' + gone.join(' '));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);

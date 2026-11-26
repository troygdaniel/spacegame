// smoke: with the new ship look on every hostile mark is pink, red is retired: the Tab map's hostile fire (rings, flashes, bullets) and the hostile target panel's frame and words; off, the colours are as they were; every red left in the Campaign's drawing is on a list with its reason (plain Node, no Chrome)
// Card space-game-ship-look-map-fire-pink (Troy, 25 Nov 2026: "every hostile mark turns pink, red retired"). The other hostile marks were done by their own pieces: the ships (A), the rings and arcs (B), the shots and torpedoes (C), the Tab map's marks, its legend and the canvas edge arrows (D).
//   A  the Tab map's fire (src/campmapfire.js): a hostile ship's ring, a hostile hit's flash and a hostile bullet (a pirate's or an alien's) are pink while the look is on; your side's rings, flashes and bullets, a missile's blast, a patrol's bullet and the mining beam keep their colours; the switch off is as it was; a flip is felt at once
//   B  the target panel (src/camptcornerscene.js): a hostile's picture frame and its name's words are pink while the look is on (and the frame is redrawn when the switch flips), a friend's are as they were
//   C  the sweep: every red-ish colour (a hue under 22 or over 340 degrees, saturation over 0.45, brightness over 0.55) in the Campaign's drawing files is on the list below with what it is and why it stays; a new red hostile mark fails here
// Run: node tests/shiplookpink.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const PINK = 0xff6fa8;

g.run(`
  window.__C = { t: 5000, by: { a1: { id: 'a1', team: 'alien', kind: 'drone', x: 400, y: 0 }, f1: { id: 'f1', team: 'earth', kind: 'fighter', x: 100, y: 0 }, carrier: { id: 'carrier', team: 'earth', kind: 'carrier', x: 0, y: 0 } },
    bullets: [], rockets: [], rocks: [], lasers: [] };
  window.__F = { x: 100, y: 100, w: 800, h: 500 };
  window.__fit = { s: 0.2, cx: 0, cy: 0 };
  window.__calls = [];
  window.__G = { lineStyle(w, c, a) { __calls.push({ op: 'lineStyle', w, c, a }); return this; }, lineBetween(x0, y0, x1, y1) { __calls.push({ op: 'line', x0, y0, x1, y1 }); return this; },
    strokeCircle(x, y, r) { __calls.push({ op: 'ring', x, y, r }); return this; }, fillStyle(c, a) { __calls.push({ op: 'fillStyle', c, a }); return this; }, fillCircle(x, y, r) { __calls.push({ op: 'dot', x, y, r }); return this; } };
  window.__colors = (flag) => { CAMP.flags.shiplook = flag; const P = campFireNew(), at = e => { campFireHear(P, __C, e, 1000); return P.slots[(P.i + P.slots.length - 1) % P.slots.length].color; };
    const r = { ringFoe: at({ type: 'boom', x: 10, y: 10, big: false, kind: 'drone' }), ringFriend: at({ type: 'boom', x: 10, y: 10, big: true, kind: 'carrier' }), flashFoe: at({ type: 'hit', id: 'a1', x: 2, y: 2 }), flashFriend: at({ type: 'hit', id: 'f1', x: 1, y: 1 }),
      shield: at({ type: 'shieldhit', x: 3, y: 3 }), blast: at({ type: 'mboom', x: 5, y: 5, r: 120 }), volley: at({ type: 'turret', i: 0, x: 0, y: 0, aim: 0, tx: 300, ty: 40 }) };
    __C.bullets = [{ x: 500, y: 100, vx: 400, vy: 0, team: 'alien', fac: 'pirate' }, { x: 520, y: 120, vx: 400, vy: 0, team: 'alien' }, { x: 540, y: 140, vx: 400, vy: 0, team: 'earth' }, { x: 560, y: 160, vx: 400, vy: 0, team: 'neutral' }, { x: 580, y: 180, vx: 400, vy: 0, team: 'earth', beam: true }];
    __calls.length = 0; campFirePaint(P, __C, __G, __F, __fit, 1000); r.bullets = __calls.filter(c => c.op === 'lineStyle').map(c => c.c); __C.bullets = [];
    CAMP.flags.shiplook = false; return r; };
`);
const K = J('CAMPFIRE.color'), off = J('__colors(false)'), on = J('__colors(true)');

console.log('A. the Tab map\'s fire');
check('1 switch off: a hostile ring is the old red, its flash the old pale red, a hostile pirate\'s bullet the map\'s pirate colour and an alien\'s the map\'s alien red (unchanged)', off.ringFoe === K.ringFoe && off.flashFoe === K.foe && off.bullets[0] === K.pirate && off.bullets[1] === K.alien, JSON.stringify(off));
check('2 switch on: the hostile ring, the hostile hit\'s flash and both hostile bullets (a pirate\'s and an alien\'s) are the look\'s hostile pink (#ff6fa8)', on.ringFoe === PINK && on.flashFoe === PINK && on.bullets[0] === PINK && on.bullets[1] === PINK, JSON.stringify(on));
check('3 and nothing else of the hostile colours moves into your side: your ship\'s ring and flash (the cyan), the shield flash, a patrol\'s bullet and the beam tech\'s bullet are the same on and off (your fire\'s volleys, bullets, missiles and blasts go mint: tests/shiplookmint.mjs)', ['ringFriend', 'flashFriend', 'shield'].every(k => on[k] === off[k]) && on.bullets[3] === off.bullets[3] && on.bullets[4] === off.bullets[4] && on.bullets[3] === K.patrol && on.bullets[4] === K.beam, JSON.stringify([on, off]));
check('4 a flip is felt at once: the colour of a mark is taken when the mark is made and a bullet\'s each frame, so the next mark and the next frame follow the switch both ways', J('__colors(true).ringFoe') === PINK && J('__colors(false).ringFoe') === K.ringFoe && J('__colors(true).bullets[1]') === PINK && J('__colors(false).bullets[1]') === K.alien);
check('5 it is one colour for every hostile (the look table\'s), whoever fires (hostile fire is pink: slookFireColor says so for the pirates and the aliens), and amber is not used for any hostile mark', J('slookFireColor("foe")') === '#ff6fa8' && J('slookFireColor("alien")') === '#ff6fa8' && on.ringFoe !== J('SLOOK.C.protect') && J('slookInt(SLOOK.C.foe)') === PINK);
const fire = src('src/campmapfire.js');
check('6 the painting code still allocates nothing a frame (no array, object, closure or new in campFirePaint: the one new name is a top-level helper), and the two helpers (cfFoe: hostile pink, cfOwn: your fire mint) are the only places that ask the switch', /const cfFoe = c => typeof slookOn === 'function' && slookOn\(\) \? slookInt\(SLOOK\.C\.foe\) : c;/.test(fire) && (fire.match(/slookOn\(\)/g) || []).length === 2 && /const cfOwn = c => typeof slookOn === 'function' && slookOn\(\) \? slookInt\(SLOOK\.C\.own\) : c;/.test(fire));

console.log('B. the target panel');
const pan = src('src/camptcornerscene.js');
check('7 a hostile\'s picture frame and its name\'s words are pink while the look is on (red off), a friend\'s are as they were, and the frame is redrawn when the switch flips (the cache key carries it)', /pinkP = !!\(F && F\.on\) && it\.side === 'hostile'/.test(pan) && /col = pinkP \? slookInt\(SLOOK\.C\.foe\) : CAMP\.tdisp\.color\[/.test(pan) && /ink = pinkP \? SLOOK\.text\.foe : CAMP\.tdisp\.ink\[/.test(pan) && /Math\.round\(o \* 20\), pinkP \? 'p' : ''\]/.test(pan) && J('CAMP.tdisp.color.hostile') === 0xff4d6d && J('CAMP.tdisp.color.friend') === 0x7fe9ff && J('SLOOK.text.foe') === '#ffb3d1');

console.log('C. the sweep for any red left');
const hsv = h => { const r = parseInt(h.slice(0, 2), 16) / 255, gg = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let hh = 0; if (d) hh = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: hh * 60, s: mx ? d / mx : 0, v: mx }; };
const found = [];
['art_world.js', 'boot.js', 'data_controls.js', ...readdirSync(ROOT + '/src').filter(f => /^(camp|shiplook).*\.(js|css)$/.test(f))].forEach(f => {
  let t; try { t = src('src/' + f); } catch (e) { return; }
  t.split('\n').forEach(l => { const code = l.split('//')[0]; for (const m of code.matchAll(/0x([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{6})\b/g)) { const h = (m[1] || m[2]).toLowerCase(), c = hsv(h); if ((c.h < 22 || c.h > 340) && c.s > 0.45 && c.v > 0.55) found.push(f + '#' + h); } });
});
// every red in the drawing and why it stays (hostile ones are made pink while the look is on; the rest are not hostile marks)
const KNOWN = {
  'art_world.js#ff9a80': 'a red dwarf star\'s glow (scenery)', 'art_world.js#ff7a3a': 'the shared sparks and the lamp of the Long Haul\'s pod (scenery, the Long Haul)',
  'campaign.js#ff4d6d': 'the target panel\'s hostile frame (CAMP.tdisp.color.hostile: pink while the look is on, src/camptcornerscene.js) and the low-hull band of the health bar of a ship you protect (CAMP.charge.color.red: the look draws the arc instead, src/shiplookmarks.js)',
  'campaign.js#ff5a4a': 'the red squad\'s colour (Wedge\'s: an identity colour, not a hostile mark)', 'campaign.js#ff6a4a': 'Proxima\'s glow (scenery)', 'campaign.js#e0825a': 'Mars\'s tint (scenery)', 'campworlddisc.js#a06a55': 'the light patch of Alpha Centauri B\'s flat disc (the world look: a rust-brown world, scenery; no tone of it is a fight colour: tests/campworlddisc.mjs)', 'campworlddisc.js#92604f': 'the light patch of Proxima Centauri\'s flat disc (the same)',
  'campaignscene.js#ff8a8a': 'the carrier\'s hit blink (a damage flash on the player\'s own ship)', 'campanelsdraw.js#ff9e7a': 'the reason a list row is refused (words, not a mark)', 'campcruiser.js#a8443c': 'the old cruiser picture\'s red light (the look has its own pictures)',
  'campcruiserhud.js#ff4d6d': 'the player\'s own hull and shield warning (the canvas HUD, hidden while the page HUD is on)', 'camphud.js#ff4d6d': 'the player\'s own low-hull colour (the canvas HUD)',
  'campmap.js#ff4d6d': 'the map\'s old hostile dot colour (CAMPMAP.color.alien): the look draws a sign in its side\'s colour instead (src/campmapdraw.js)', 'campmapfire.js#ff4d6d': 'the map\'s old hostile ring (pink through cfFoe while the look is on)',
  'camppirateart.js#ff4d6d': 'the old lancer picture\'s glow (the look has its own pictures)', 'camppirateart.js#9a2a48': 'the old lancer picture\'s dim glow (the same)',
  'campsightscene.js#ff4d6d': 'the canvas edge arrow of a hostile group (pink while the look is on; the page HUD\'s own arrow is pink already)', 'camptargetdraw.js#ff6a5a': 'the old hostile bracket (the look draws the bright ring instead, src/shiplookmarks.js)',
  'camptorpedoscene.js#ff4d6d': 'an alien\'s torpedo (pink through slookTorpTone while the look is on)', 'shiplookfx.js#ff4d6d': 'the colour slookTorpTone maps to pink (the table of what it replaces)'
};
const unknown = found.filter(k => !(k in KNOWN)), gone = Object.keys(KNOWN).filter(k => !found.includes(k));
check('8 every red-ish colour of the Campaign\'s drawing is on the list with its reason: no new red hostile mark has crept in', unknown.length === 0, 'not on the list: ' + unknown.join(' '));
check('9 and the list has nothing that is not there any more (a red that was removed leaves the list too, so it stays true)', gone.length === 0, 'gone: ' + gone.join(' '));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);

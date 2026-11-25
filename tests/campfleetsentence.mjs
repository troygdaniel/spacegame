// smoke: the W FLEET row reads as one line that never fades: who, the E chip, the order and the target (cards space-game-fleet-sentence and space-game-keys5-corners); grey with its reason when the order cannot be given; the E chip is not in the details on the right
// Troy, 24 Nov 2026: "The order has no permanent home: the W chip lives in details that fade. Make the Q FLEET corner read as one line that never fades: who, the W chip, the order and the target. Examples: Q Kara, W Attack Raider 9; Q All pilots, W Guard Transport;
// W Form up with nothing held. Grey the W part with its reason when the order cannot be given. Remove the W chip from the fading details on the right. Fit inside the corner (cut a long name short). NO to showing the backslash and X keys on screen."
//   A  the line (campFleetLine, pure): who, the order key, the order and the target, in each state: all pilots or one, an enemy held, a friendly held, nothing held (form up)
//   B  when the order cannot be given: the order key and the order are grey and say why (none out, launching); the target is left to its own corner
//   C  the layout (campCornerLineLayout, pure): chips and words left to right from the frame's inner edge; the order and the target are cut short with an ellipsis to fit, the words after them keep their room
//   D  the drawing on a stand-in scene: the line is drawn whether the details are open or not, and never fades; the title and the selection are not; a grey chip is drawn grey; nothing behind a card or the map
//   E  no backslash and no X on the screen: no chip for them anywhere in the corners
// Run: node tests/campfleetsentence.mjs   (exit code 1 on a failed check)
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
  window.LINE = () => campFleetLine(C);
  window.__text = () => LINE().filter(s => s.text !== undefined).map(s => s.text).join(' | ');
  window.__scene = (extra) => {
    const objs = [];
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const mkT = (x, y, t, st) => { const o = { text: '', x: 0, y: 0, vis: false, alpha: 1, style: { color: '#ffffff' }, width: 60, height: 14, bold: !!(st && st.fontStyle === 'bold') }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; o.width = String(v).length * (o.bold ? 8.4 : 7); return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = v => { o.alpha = v; return o; }; objs.push(o); return o; };
    const mkP = () => { const pic = { vis: false, x: 0, y: 0, alpha: 1, width: 64, height: 32 }; ['setScrollFactor', 'setDepth', 'setTexture', 'setRotation', 'setTint', 'setScale', 'setOrigin', 'setAlpha', 'setPosition', 'setSize', 'setDisplaySize'].forEach(k => { pic[k] = () => pic; }); pic.setVisible = v => { pic.vis = v; return pic; }; return pic; };
    return window.S = Object.assign({ objs, camp: C, pn: P, mode: 'play', hud: {}, textures: { exists: () => true }, texOf: k => 'tex-' + k, add: { graphics: mkG, text: mkT, image: mkP } }, extra || {});
  };
`);

// ---- A. the line ----
console.log('A. the line');
g.run('__new();');
check('FLEET registers a line (campFleetLine), and the other corners do not', J('campCornerDef("fleet").line === campFleetLine') && J('CAMP_CORNERS.filter(d => d.line).map(d => d.id).join()') === 'fleet');
check('nothing held, all pilots: W All pilots  E Form up (the order key bright)', J('LINE()[0].key') === 'who' && J('LINE()[1].text') === 'All pilots' && J('LINE()[2].key') === 'order' && J('LINE()[2].ok') === true && J('LINE()[3].text') === 'Form up', J('JSON.stringify(LINE())'));
g.run('C.sel = "pilot:green";');
check('one pilot picked: his call sign and name are the first word (W Red 2 Kara)', J('LINE()[1].text') === 'Red 2 Kara' && J('LINE()[1].bold') === true);
g.run('C.sel = "all"; window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1);');
check('an enemy held: W Attack and its name (the one the HOSTILES corner holds)', J('LINE()[3].text') === 'Attack ' + J('campHeldNow(C).name') && J('campHeldNow(C).kind') === 'hostile' && J('LINE()[2].ok') === true, J('__text()'));
g.run('campFriStep(C, 1);');
check('a friendly held: W Guard and its name (Transport)', J('LINE()[3].text') === 'Guard ' + J('campHeldNow(C).name') && J('campHeldNow(C).kind') !== 'hostile' && /^Guard \S+/.test(J('LINE()[3].text')), J('__text()'));
check('the words are content (camp.corner.attack, .guard, .formup), the keys are the table\'s (who, order)', J(`uiText('camp.corner.attack', { name: 'X' })`) === 'Attack X' && J(`uiText('camp.corner.guard', { name: 'X' })`) === 'Guard X' && J(`uiText('camp.corner.formup')`) === 'Form up' && J('campCornerCap("who") + campCornerCap("order")') === 'WEnter');
g.run('campTgtStep(C, 1);');
check('the one target: an enemy picked after a friendly takes the friendly\'s place in the line', J('campHeldNow(C).kind') === 'hostile' && /^Attack /.test(J('LINE()[3].text')));

// ---- B. the order cannot be given ----
console.log('B. when the order cannot be given');
g.run('__new(); campTgtStep(C, 1);'); // no hostile: nothing held, form up
g.run('C.ships.filter(u => u.kind === "fighter").forEach(u => { u.hp = 0; u.gone = true; });');
check('no pilot is out and none is in the bay: the order key and the words are grey and give the reason (W Form up, none out)', J('LINE()[2].ok') === false && J('LINE()[3].text') === 'Form up, none out' && J('LINE()[3].ink') === '#7f95a8', J('JSON.stringify(LINE())'));
g.run('window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1);');
check('with an enemy held the reason keeps the order\'s word and leaves the target to its own corner: Attack, none out', J('LINE()[3].text') === 'Attack, none out', J('__text()'));
g.run('C.launchQ.push({ kind: "fighter" });');
check('pilots launching: the reason says so (Attack, launching)', J('LINE()[3].text') === 'Attack, launching' && J('LINE()[2].ok') === false, J('__text()'));
check('the reasons are content, and an unknown refusal says "not now" (camp.corner.why.else)', J(`uiText('camp.corner.why.nofighters')`) === 'none out' && J(`uiText('camp.corner.why.else')`) === 'not now' && J(`uiText('camp.corner.blocked', { what: 'Attack', why: 'x' })`) === 'Attack, x');
check('the reason is campTdispOrder\'s dry run (code), so it is the same refusal the key would give', J('campTdispOrder(C, "attack").code') === 'launching' && J('campTdispOrder(C, "attack").ok') === false);

// ---- C. the layout ----
console.log('C. the layout');
{
  g.run(`window.__m = (t, sg) => t.length * (sg.bold ? 8 : 7); window.__T0 = { x: 18, y: 604, w: CAMP.corner.w, h: 26 };`);
  const T = J('CAMP.corner.title'), w = J('CAMP.corner.w');
  const seg = (name, ok) => `[{ key: 'who' }, { text: 'All pilots', bold: true, size: 14 }, { key: 'order', ok: ${ok} }, { text: ${JSON.stringify(name)}, size: 13, fit: true }]`;
  const L = J(`campCornerLineLayout(${seg('Guard Transport', true)}, __T0, __m)`);
  check('the chip W is at the frame\'s inner left edge, then All pilots after a gap, then the chip E, then the order: left to right', L.chips[0].x === 18 + T.pad && L.words[0].x === 18 + T.pad + T.chipW + T.gap && L.chips[1].x === L.words[0].x + 'All pilots'.length * 8 + T.gap && L.words[1].x === L.chips[1].x + T.chipW + T.gap, JSON.stringify(L));
  check('Guard Transport fits the corner (to its inner right edge) at the width the table gives', L.words[1].text === 'Guard Transport' && L.words[1].x + 'Guard Transport'.length * 7 <= 18 + w - T.pad, JSON.stringify(L.words));
  const Lg = J(`campCornerLineLayout(${seg('Guard Transport', false)}, __T0, __m)`);
  check('a grey order key is the same chip with ok false', Lg.chips[1].ok === false && L.chips[1].ok === true && Lg.chips[0].ok === true);
  const Ll = J(`campCornerLineLayout(${seg('Attack Transport Alpha Centauri Relay', true)}, __T0, __m)`);
  check('a name too long is cut with an ellipsis and ends inside the frame; the chips are where they were', Ll.words[1].text.endsWith('…') && Ll.words[1].text.length < 'Attack Transport Alpha Centauri Relay'.length && Ll.words[1].x + Ll.words[1].text.length * 7 <= 18 + w - T.pad && Ll.chips[1].x === L.chips[1].x, JSON.stringify(Ll.words[1]));
  const Lw = J(`campCornerLineLayout([{ key: 'who' }, { text: 'A very long pilot name indeed', bold: true, size: 14, fit: true }, { key: 'order' }, { text: 'Attack Raider 9', size: 13 }], __T0, __m)`);
  check('the words after a cut word keep their room: the order is not pushed off the frame', Lw.words[1].x + 'Attack Raider 9'.length * 7 <= 18 + w - T.pad && Lw.words[0].text.endsWith('…'), JSON.stringify(Lw));
  check('a line with no segments is empty; a key by { cap } needs no table', (() => { const e = J(`campCornerLineLayout([], __T0, __m)`), c = J(`campCornerLineLayout([{ key: { cap: 'S' } }], __T0, __m)`); return e.chips.length === 0 && e.words.length === 0 && c.chips[0].cap === 'S'; })());
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1);');
  const all = [['all', 'Attack Raider 9'], ['pilot:red', 'Attack Raider 9'], ['pilot:green', 'Attack Raider 9'], ['pilot:yellow', 'Attack Raider 9']];
  check('the longest real line (the longest pilot name, an enemy held) fits the corner at 8 px a letter for the name and 7 for the order', all.every(([sel]) => { g.run(`C.sel = ${JSON.stringify(sel)};`); const l = J('LINE()'), r = J(`campCornerLineLayout(LINE(), __T0, __m)`); const lw = r.words[r.words.length - 1]; return lw.text === l[3].text && lw.x + lw.text.length * 7 <= 18 + w - T.pad; }));
}

// ---- D. the drawing ----
console.log('D. the drawing');
g.run('__new(); __scene(); campTcornerLook(P, 0); campCornerSync(S, 0);');
{
  const shown = () => J('S.objs.filter(o => o.vis).map(o => o.text)');
  const sh = shown();
  check('closed: the line is drawn: the chips W and E, All pilots and Form up; FLEET and the selection are not', ['W', 'E', 'All pilots', 'Form up'].every(t => sh.includes(t)) && !sh.includes('FLEET'), JSON.stringify(sh));
  check('the chips and the words stand left to right in the row: W, All pilots, E, Form up', (() => { const f = J('S.hud.corner.fleet'); const xs = [f.chips[0].x, f.words[0].x, f.chips[1].x, f.words[1].x]; return xs.every((x, i) => !i || x > xs[i - 1]); })());
  check('every part of the line is inside the frame (the right edge too)', (() => { const at = J('CAMP.corner.at.bl'), w = J('CAMP.corner.w'), f = J('S.hud.corner.fleet'); return f.words.every(o => o.x >= at.x && o.x + o.width <= at.x + w) && f.chips[1].x + 11 <= at.x + w; })());
  g.run('C.t += 60000; campCornerSync(S, 0);');
  const later = shown();
  check('a minute later, with the details long closed: the line is still there, at full strength', ['W', 'E', 'All pilots', 'Form up'].every(t => later.includes(t)) && J('S.hud.corner.fleet.words.every(o => o.alpha === 1)'));
  g.run('C.ships.filter(u => u.kind === "fighter").forEach(u => { u.hp = 0; u.gone = true; }); S.hud.corner.fleet.g.log = []; campCornerSync(S, 0);');
  check('the order cannot be given: the line says why, in the grey ink, and the chip W is drawn grey (the fill 0x2a3b4c)', J('S.objs.filter(o => o.vis).map(o => o.text)').includes('Form up, none out') && J('S.hud.corner.fleet.words[1].style.color') === '#7f95a8' && J('S.hud.corner.fleet.g.log.some(l => l[0] === "fillStyle" && l[1] === 0x2a3b4c)') && J('S.hud.corner.fleet.chips[1].style.color') === '#9fb4c4');
  g.run('S.mode = "map"; campCornerSync(S, 0);');
  check('behind the map (or a card, the pause, the keys page) nothing of it is drawn', J('S.objs.filter(o => o.vis).length') === 0);
  g.run('S.mode = "play"; campCornerSync(S, 0);');
  check('and it is back when the map is closed', J('S.objs.filter(o => o.vis).length') > 0);
}

// ---- E. no backslash and no X ----
console.log('E. no backslash and no X');
{
  g.run('__new(); __scene(); window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1); campTcornerLook(P, 0); campCornerKey(C, "KeyQ"); campCornerKey(C, "BracketRight"); campCornerKey(C, "BracketLeft"); campCornerSync(S, 0);');
  const chips = J('Object.keys(S.hud.corner).map(id => S.hud.corner[id].chips.filter(c => c.vis).map(c => c.text))').flat();
  check('the chips on the screen are W, Enter, E, ] and Q (the cruiser\'s): no backslash, no X, no S', ['\\', 'X', 'S'].every(k => !chips.includes(k)) && ['W', 'Enter', 'E', ']', 'Q'].every(k => chips.includes(k)), JSON.stringify(chips));
  check('and no line of text in the corners names them', !J('S.objs.filter(o => o.vis).map(o => o.text)').some(t => /(^|\s)(\\|X)(\s|$)/.test(t)));
  check('the corner code never writes the nearest-threat or the clear key', !/CAMP_KEYS\.(near|clear)|campCornerCap\('(near|clear)'\)|key: '(near|clear)'/.test(['src/campcorner.js', 'src/camptcorner.js', 'src/campcornerscene.js', 'src/camptcornerscene.js'].map(src).join('\n')));
}

console.log(failed ? `\nFLEET SENTENCE FAIL: ${failed} of ${n} checks failed` : `\nFLEET SENTENCE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

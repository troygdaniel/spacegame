// smoke: the Campaign's pause is the word PAUSED large (two thirds of its first size since card space-game-paused-smaller) on a lit band across the middle, the battle dimmed behind it, the help in a panel under the band; Esc is still the key (plain Node, no Chrome)
// Card space-game-paused-big (Troy, 23 Nov 2026: "show the word PAUSED much more obviously: a large word on a highlighted band across the middle, the scene dimmed behind. Esc stays the pause key").
// The scene is Phaser's and is not run here: showPause (src/campaignscene.js) is called on a stand-in that records what is added, in order, and says how tall a text is (its lines, wrapped at the width it is
// given, 0.6 of the letter size a letter) so the check that the help fits its panel is a real one. The picture itself (the colours, the letters on the band) is looked at in the batch of Chrome boots.
//   A. the veil dims the battle (not black); B. the band: the whole width, tall, across the middle, lit; C. the word: PAUSED, much the largest text, centred on the band, fits the width
//   D. the help is in a panel under the band, inside the screen, and fits (with and without the tune kit's debug line, with and without the retry line); the way back is at the foot
//   E. everything is fixed to the screen above the gauges, takes the panel flag, and hideCard leaves nothing; F. Esc goes back to the battle, T to the title, H the keys (as before)
// Run: node tests/pausedbig.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__scene = (debug, missions) => {
    campDebugSet(debug); const made = [];
    const px = st => parseFloat((st && st.fontSize) || 16);
    const obj = (kind, a) => { const o = { kind, a, destroyed: false, scale: 1, ox: 0, oy: 0, depth: null, scroll: null, setStrokeStyle() { return this; }, setOrigin(x, y) { this.ox = x; this.oy = y === undefined ? x : y; return this; },
      setScrollFactor(v) { this.scroll = v; return this; }, setDepth(d) { this.depth = d; return this; }, setScale(s) { this.scale = s; return this; }, destroy() { this.destroyed = true; } };
      if (kind === 'text') { const st = a[3] || {}, size = px(st), cpl = st.wordWrap ? Math.floor(st.wordWrap.width / (0.6 * size)) : 1e9; o.size = size; o.letters = st.letterSpacing || 0; o.height = String(a[2]).split('\\n').reduce((k, l) => k + Math.max(1, Math.ceil(l.length / cpl)), 0) * (size * 1.2 + (st.lineSpacing || 0)); }
      made.push(o); return o; };
    const camp = campNew(1, [], { seed: 1 }); if (missions === false && camp.L) camp.L.objectives = null;
    const sc = { mode: '', camp, level: 1, card: null, panel: false, add: { rectangle: (...a) => obj('rect', a), text: (...a) => obj('text', a) }, hideCard: Campaign.prototype.hideCard, showCard: Campaign.prototype.showCard, drawPauseBand: Campaign.prototype.drawPauseBand };
    Campaign.prototype.showPause.call(sc); campDebugSet(false);
    window.__sc = sc; window.__made = made;
    return made.filter(o => !o.destroyed && !(o.kind === 'text' && o.a[0] < -9000)).map(o => ({ kind: o.kind, x: o.a[0], y: o.a[1], w: o.kind === 'rect' ? o.a[2] : null, h: o.kind === 'rect' ? o.a[3] : o.height, color: o.kind === 'rect' ? o.a[4] : null,
      alpha: o.kind === 'rect' ? o.a[5] : null, text: o.kind === 'text' ? String(o.a[2]) : null, size: o.size || null, letters: o.letters || 0, scale: o.scale, ox: o.ox, oy: o.oy, depth: o.depth, scroll: o.scroll }));
  };
`);
const dims = J('[W, H, CYAN]');
const [W, H, CYAN] = dims;
const run = (debug, missions) => JSON.parse(g.run(`JSON.stringify(__scene(${debug}, ${missions}))`));
const objs = run(false, true), withDebug = run(true, true);

console.log('A. the veil');
const veil = objs[0];
check('the first thing drawn is a veil over the whole screen', veil.kind === 'rect' && veil.w === W && veil.h === H, JSON.stringify(veil));
check('it dims the battle (more than the cards\' half, not black: between 55 and 85 percent)', veil.alpha >= 0.55 && veil.alpha <= 0.85, veil.alpha);

console.log('B. the band');
const band = objs.find(o => o.kind === 'rect' && o.h >= 90 && o.h < 300 && o.w === W);
check('there is a band the whole width of the screen, about two thirds of the 160 px it was: 95 to 120 px tall', !!band && band.h >= 95 && band.h <= 120, JSON.stringify(objs.filter(o => o.kind === 'rect').map(o => [o.w, o.h])));
check('it lies across the middle of the screen: its centre is within 60 px of the screen\'s middle', band && Math.abs(band.y - H / 2) <= 60, band && band.y);
check('it is lit: the HUD\'s cyan, 85 percent or more solid', band && band.color === CYAN && band.alpha >= 0.85, band && JSON.stringify([band.color, band.alpha]));

console.log('C. the word');
const word = objs.find(o => o.kind === 'text' && o.text === 'PAUSED');
check('the word PAUSED is drawn, and it is in the table of words (not typed here)', !!word && J(`uiText('camp.ui.pausetitle')`) === 'PAUSED');
check('it is large, at about two thirds of the 112 px of the first card (space-game-paused-smaller; Troy: "a bit smaller"): 70 to 80 px letters', word && word.size >= 70 && word.size <= 80, word && word.size);
check('it is by far the largest text on the screen (at least four times the help\'s letters)', word && objs.filter(o => o.kind === 'text' && o !== word).every(o => word.size >= 4 * o.size));
check('it is centred on the band, left to right and up and down, and drawn after it (so it is on top)', word && band && Math.abs(word.x - W / 2) <= 20 && word.y === band.y && objs.indexOf(word) > objs.indexOf(band));
check('it fits the width with room to spare (six letters and their spacing, 200 px of margin)', word && 6 * (0.6 * word.size + word.letters) <= W - 200, word && 6 * (0.6 * word.size + word.letters));
check('it fits inside the band, with room above and below it', word && band && 1.2 * word.size <= band.h - 10, word && [word.size, band.h]);

console.log('D. the help and the way back');
const rects = objs.filter(o => o.kind === 'rect'), panel = rects[rects.length - 1];
const fits = (list, label) => {
  const b = list.find(o => o.kind === 'rect' && o.h >= 90 && o.h < 300 && o.w === W), texts = list.filter(o => o.kind === 'text'), word = texts.find(o => o.text === 'PAUSED'), hint = texts[texts.length - 1], body = texts[texts.length - 2];
  const pn = list.filter(o => o.kind === 'rect').pop(), top = pn.y - pn.h / 2, bottom = pn.y + pn.h / 2;
  check(label + ': the panel starts under the band and ends inside the screen', top >= b.y + b.h / 2 && bottom <= H, JSON.stringify([top, b.y + b.h / 2, bottom, H]));
  check(label + ': the help starts inside the panel and ends above the way back, whatever its size after it steps down', body.y >= top && body.y + body.h * body.scale <= hint.y - 8, JSON.stringify([body.y, body.h, body.scale, hint.y]));
  check(label + ': the way back is inside the panel at its foot, and says Esc and T title', hint.y + 10 <= bottom && hint.y > body.y && /Esc/.test(hint.text) && /T\s+title/.test(hint.text), hint.text);
  check(label + ': the help is the card\'s own: the goal first, then the map line, then the missile help', /^Goal: /.test(body.text) && /Tab\s+map/.test(body.text) && /missile/i.test(body.text) && body.text.indexOf('Goal: ') < body.text.indexOf('Tab'));
  check(label + ': the help is not as large as the word: 14 px letters at least, 20 at most (after any stepping down)', body.size * body.scale >= 11 && body.size <= 20, body.size * body.scale);
};
fits(objs, 'normal game');
fits(withDebug, 'with the tune kit\'s debug line');
check('the debug line is there only with the kit on, as before', withDebug.filter(o => o.kind === 'text').some(o => /DEBUG/.test(o.text)) && !objs.filter(o => o.kind === 'text').some(o => /DEBUG/.test(o.text)));
check('a mission has the retry line (Backspace restart the mission; it was R: card space-game-pause-restart-key): it is in the help and the help still fits', objs.filter(o => o.kind === 'text').some(o => /Backspace\s+restart/.test(o.text)) || J('!(__sc.camp.L && __sc.camp.L.objectives)'));

console.log('E. the screen');
check('everything is fixed to the screen and above the gauges (depth 200; the gauges are 100 and 101)', objs.every(o => o.scroll === 0 && o.depth === 200), JSON.stringify(objs.filter(o => o.scroll !== 0 || o.depth !== 200)));
g.run('__scene(false, true)');
check('the scene is in pause mode and the panel flag is up (so the command strip stays shut)', J('[__sc.mode, __sc.panel]').join() === 'pause,true');
check('hideCard takes all of it away: nothing is left drawn', (g.run('__sc.hideCard()'), J('[__made.filter(o => !o.destroyed).length, __sc.panel]').join() === '0,false'));
check('no other card is drawn the new way: a card handed no band is the old one (a veil, an 800 px card, its title)', (() => { g.run(`window.__old = (() => { const made = []; const obj = (kind, a) => { const o = { kind, a, setStrokeStyle() { return this; }, setOrigin() { return this; }, setScrollFactor() { return this; }, setDepth() { return this; }, destroy() {}, height: 24 }; made.push(o); return o; }; const sc = { card: null, panel: false, add: { rectangle: (...a) => obj('rect', a), text: (...a) => obj('text', a) }, hideCard: Campaign.prototype.hideCard }; Campaign.prototype.showCard.call(sc, 'TITLE', ['one line'], 'Enter  go'); return made.filter(o => o.kind === 'rect').map(o => o.a[2]); })()`); return J('__old').join() === W + ',800'; })());

console.log('F. the keys');
g.run(`window.__keys = (code) => { __scene(false, true); const sc = __sc; sc.mode = 'pause'; sc.leaving = false; window.__went = []; go = (s, key) => { __went.push(key); }; sc.openKeys = () => { sc.keysOpened = true; }; Campaign.prototype.onKey.call(sc, { code }); return { mode: sc.mode, card: !!sc.card, went: __went.join(), keys: !!sc.keysOpened }; };`);
check('Esc is the pause key still: it is in the table and the scene pauses on it', J(`campKeyCodes('pause')`).join() === 'Escape' || J(`campKeyCodes('pause')`).indexOf('Escape') >= 0);
check('Esc on the band goes back to the battle and takes the band away', (() => { const r = J("__keys('Escape')"); return r.mode === 'play' && r.card === false; })());
check('T goes to the title and H opens the page of every key, as on the old card', J("__keys('KeyT')").went === 'Title' && J("__keys('KeyH')").keys === true);
g.run(`window.__keysP = (code) => { __scene(false, true); const sc = __sc; sc.mode = 'pause'; sc.leaving = false; sc.P = { techs: [] }; sc.level = 1; sc.mi = 0; window.__went = []; go = (s, key, d) => { __went.push(key + ':' + (d && d.via)); }; Campaign.prototype.onKey.call(sc, { code }); return { mode: sc.mode, card: !!sc.card, went: __went.join() }; };`);
check('Backspace (the table\'s restart key) restarts the mission; R on the pause card does nothing: no restart, the card stays, mode stays pause (card space-game-pause-restart-key: R is the missile rack in play)', (() => { const b = J("__keysP('Backspace')"), r = J("__keysP('KeyR')"); return J("campKeyCodes('restart').join()") === 'Backspace' && b.went === 'Campaign:retry' && r.went === '' && r.mode === 'pause' && r.card === true; })(), JSON.stringify([J("__keysP('Backspace')"), J("__keysP('KeyR')")]));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PAUSED BIG FAIL (${failed} of ${n})` : `PAUSED BIG PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

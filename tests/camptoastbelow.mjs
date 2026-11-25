// smoke: in the Campaign a toast starts BELOW the HUD lines stacked at the top centre, and follows them if they grow while it is up; the Long Haul's toast stays at TOAST.top (plain Node, no Chrome)
// Card space-game-toast-over-topcentre (ORCH: with Earth, REPAIR and the outpost line all showing, the top-centre column ends at y 108 and a toast, which starts at y 86, covers its last line).
// The code is src/common.js (toastBox, toast, toastKeep) and the Campaign scene (hudStackBottom, toastTop, flowHud, paintHud).
//   A. toastBox: the top is the band's own unless one is given
//   B. toast() on a stand-in scene: the scene's toastTop() is used (never above TOAST.top); a scene with none keeps TOAST.top (the Long Haul)
//   C. toastKeep: the box that is up follows a new top; a gone one, the same top and no toasts are left alone
//   D. the Campaign's numbers: the column's end with all five lines, the mothership's bar, the rival's bars; the toast is under the lot and between the two top corners
//   E. the scene's source: flowHud keeps the stack, paintHud keeps the toast under it; only the Campaign scene has toastTop
// Run: node tests/camptoastbelow.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  function __scene(top) {
    const obj = (kind, a) => { const o = { kind, text: kind === 'text' ? a[2] : undefined, x: a[0], y: a[1], w: a[2], h: a[3], active: true, destroy() { o.active = false; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth(d) { o.depth = d; return o; }, setStrokeStyle() { return o; } }; return o; };
    const s = { time: { now: 0 }, tweens: { add() {} }, add: { text: (...a) => obj('text', a), rectangle: (...a) => obj('rect', a) } };
    if (top !== undefined) s.toastTop = () => top;
    return s;
  }
  Phaser = { Display: { Color: { HexStringToColor: () => ({ color: 0xffffff }) } } };
  window.__mkT = t => { const o = { text: t, y: -1, setY(v) { o.y = v; return o; } }; return o; };
  // a Campaign scene stand-in (the prototype's own flowHud, hudStackBottom and toastTop run on it)
  window.__camp = (lines, earth, mother, rival, phase) => { const sc = Object.create(Campaign.prototype); sc.camp = { earth: earth ? { shield: 50, max: 100 } : null };
    sc.hud = { wave: __mkT(lines[0]), obj: __mkT(lines[1]), earth: __mkT(lines[2]), repair: __mkT(lines[3]), post: __mkT(lines[4]), mother: __mkT(mother ? 'MOTHERSHIP' : ''), rivalName: __mkT(rival ? 'SCAR' : ''), rivalPhase: __mkT(phase ? 'CHARGING' : '') };
    sc.hudBack = { setSize() { return sc.hudBack; } }; sc.flowHud((...a) => {}); return sc; };
`);
const T = J('TOAST'), K = J('CAMP.hud'), W = J('W');

console.log('A. toastBox');
{
  const d = J(`toastBox({ size: 20, lines: ['Docked.'] })`), lower = J(`toastBox({ size: 20, lines: ['Docked.'] }, 114)`);
  check('with no top the box starts at TOAST.top, as it always did', d.top === T.top && d.y === T.top + d.h / 2 && d.bottom === T.top + d.h, JSON.stringify(d));
  check('with a top the box starts there: the same size and x, the centre and the edges move together', lower.top === 114 && lower.bottom === 114 + d.h && lower.y === 114 + d.h / 2 && lower.w === d.w && lower.h === d.h && lower.x === d.x && lower.left === d.left, JSON.stringify(lower));
}

console.log('B. toast() on a stand-in scene');
{
  const at = top => J(`(() => { const s = __scene(${top}); toast(s, 'Docked.'); const o = s.toasts[0]; return { top: o.top, y: o.y, h: o.h, texty: o.t.y, bgy: o.bg.y }; })()`);
  const low = at(120), none = at(undefined), above = at(40);
  check('the scene\'s toastTop is used: the box starts at 120, its text and frame centred on it', low.top === 120 && low.y === 120 + low.h / 2 && low.texty === low.y && low.bgy === low.y, JSON.stringify(low));
  check('a scene with no toastTop (the Long Haul) keeps TOAST.top', none.top === T.top && none.y === T.top + none.h / 2, JSON.stringify(none));
  check('a toastTop above the band is not used: the box never starts above TOAST.top', above.top === T.top, JSON.stringify(above));
}

console.log('C. toastKeep');
{
  const r = J(`(() => { const s = __scene(100); toast(s, 'Docked.'); const o = s.toasts[0], y0 = o.y; toastKeep(s, 130); const down = { top: o.top, dy: o.y - y0, t: o.t.y - y0, bg: o.bg.y - y0, tab: o.tab.y - y0 }; toastKeep(s, 130); const same = o.y - y0; toastKeep(s, 100); const back = o.y - y0; return { down, same, back }; })()`);
  check('the box that is up follows a lower top: the text, the frame and the tab move by the same 30 px', r.down.top === 130 && r.down.dy === 30 && r.down.t === 30 && r.down.bg === 30 && r.down.tab === 30, JSON.stringify(r));
  check('the same top moves nothing, and it follows the top back up', r.same === 30 && r.back === 0, JSON.stringify(r));
  check('a toast that is gone, a scene with no toasts and one with an old entry (no top) are left alone and do not throw', J(`(() => { const s = __scene(100); toast(s, 'x'); const o = s.toasts[0]; o.t.destroy(); const y = o.y; toastKeep(s, 150); toastKeep({}, 150); const s2 = { toasts: [{ t: { active: true }, y: 5 }] }; toastKeep(s2, 150); return o.y === y && s2.toasts[0].y === 5; })()`));
}

console.log('D. the Campaign\'s numbers');
{
  const p = K.text.pitch, y0 = K.text.y;
  const all = J(`(() => { const sc = __camp(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true); return { below: sc.hudBelow, stack: sc.hudStack, top: sc.toastTop() }; })()`);
  check('with Earth, repair and the outpost line showing the column ends at y 108 (the card\'s case) and a toast starts 6 px under it: 114, not 86', all.below === 108 && all.stack === 108 && K.toastGap === 6 && all.top === 114 && all.top > T.top, JSON.stringify(all));
  const two = J(`(() => { const sc = __camp(['WAVE 1 OF 3', 'GOAL', '', '', ''], false); return { below: sc.hudBelow, top: sc.toastTop() }; })()`);
  check('with only the wave and the goal the column ends at y 42 and the toast keeps the band\'s own top (86): nothing changes for the usual case', two.below === y0 + 2 * p && two.top === T.top, JSON.stringify(two));
  const mo = J(`(() => { const sc = __camp(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true, true); return { stack: sc.hudStack, top: sc.toastTop() }; })()`);
  check('with the mothership alive its name and bar stand under the column (the bar 20 px under, 12 high): the toast starts under the bar', mo.stack === 108 + 32 && mo.top === 108 + 32 + 6, JSON.stringify(mo));
  const rv = J(`(() => { const sc = __camp(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true, false, true, false); const a = sc.toastTop(); const sp = __camp(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true, false, true, true); return { bars: a, phase: sp.toastTop(), D: CAMP_RIVAL_DRAW.hud }; })()`);
  check('with a rival ship its bars stand under the column, and its phase line under them: the toast starts under the lowest', rv.bars === 108 + 2 + rv.D.hullY + 12 + 6 && rv.phase === 108 + 2 + rv.D.phaseY + 20 + 6 && rv.phase > rv.bars, JSON.stringify(rv));
  const box = J(`(() => { const sc = __camp(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true, false, true, true); sc.time = { now: 0 }; sc.tweens = { add() {} }; const o = __scene(); sc.add = o.add; toast(sc, 'Reloading: 2 more, 20 ore. And a second line of words to make it long enough to need two lines in the band.'); const e = sc.toasts[0]; return { top: e.top, bottom: e.top + e.h, left: e.bg.x - e.bg.w / 2, right: e.bg.x + e.bg.w / 2, last: sc.hudStack }; })()`);
  const at = J('CAMP.corner.at'), cw = J('CAMP.corner.w'), th = J('CAMP.corner.title.h');
  check('the toast box (two lines, the lowest case) is under the lot, between the two top corners (their frames end at x 338 and start at x 942) and clear of the second rows of both stacks (card space-game-keys5-corners: the four corners are at the top now, so the toast is only between them)', box.top >= box.last + 6 && box.left > at.tl.x + cw && box.right < at.tr.x && box.left > at.bl.x + cw, JSON.stringify([box, at.tl.x + cw, at.tr.x]));
}

console.log('E. the scene\'s source');
{
  const sc = src('src/campaignscene.js'), cm = src('src/common.js');
  check('flowHud keeps the stack (hudStackBottom of the column\'s end) and paintHud keeps the toast under it every frame, after flowHud', /this\.hudStack = this\.hudStackBottom\(F\.bottom\)/.test(sc) && /toastKeep\(this, this\.toastTop\(\)\)/.test(sc) && sc.indexOf('this.flowHud(bar)') < sc.indexOf('toastKeep(this, this.toastTop())'));
  check('toast() asks the scene for its top (toastTop) and never goes above TOAST.top', /typeof s\.toastTop === 'function' \? Math\.max\(TOAST\.top, s\.toastTop\(\)\) : TOAST\.top/.test(cm));
  const others = ['hud.js', 'space.js', 'surface.js', 'traffic.js', 'autopilot.js', 'cruise.js', 'assist.js', 'station.js'].filter(f => { try { return /toastTop/.test(src('src/' + f)); } catch (e) { return false; } });
  check('no Long Haul file has a toastTop: only the Campaign scene moves its toasts', others.length === 0, others.join());
}

console.log(failed ? `\nFAIL: ${failed} of ${n} checks` : `\nCAMP TOAST BELOW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

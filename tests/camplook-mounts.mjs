// smoke: the eight turret mounts are drawn a third smaller on the smaller carrier (dark base 3.2 px, amber dot 1.7, barrel 7 px at rest and 11 on a shot, muzzle flash at the tip) from one table, CAMP_MOUNT (plain Node, no Chrome)
// Card space-game-campaign-look: the carrier is 98 px long now (it was 140), and the mounts were drawn for the 140: a dark base 5 px across its radius and a barrel of 11 and 18 px, which would cover a quarter of a pod.
// syncRockets is called on a stand-in whose graphics record every circle and line. The mounts "still read": a base darker than the hull, a lit dot, a barrel toward the alien, a brighter dot and longer barrel for 120 ms after a shot.
// Run: node tests/camplook-mounts.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const draw = (hot, noTarget) => J(`(() => {
  const C = campNew(1, [], { seed: 2 }); C.carrier.rot = 0.3; C.turrets.forEach((tu, i) => { tu.target = ${noTarget ? "''" : "'x'"}; tu.aim = 0.5; tu.shotAt = ${hot ? 'C.t - 10' : 'C.t - 5000'}; });
  const rec = () => { const r = { circles: [], lines: [], style: null, fill: null, clear() { r.circles.length = 0; r.lines.length = 0; return r; }, lineStyle(w, c, a) { r.style = { w, c, a }; return r; }, fillStyle(c, a) { r.fill = { c, a }; return r; },
    lineBetween(x1, y1, x2, y2) { r.lines.push({ len: Math.hypot(x2 - x1, y2 - y1), ang: Math.atan2(y2 - y1, x2 - x1), ...r.style }); return r; }, strokeCircle() { return r; }, fillCircle(x, y, rad) { r.circles.push({ x, y, rad, ...r.fill }); return r; } }; return r; };
  const text = { setColor() { return text; }, setText() { return text; } };
  const sc = { camp: C, hud: { missiles: text }, reachG: rec(), mountG: rec(), msp: {}, mode: 'play' };
  Campaign.prototype.syncRockets.call(sc, 16);
  return { circles: sc.mountG.circles, lines: sc.mountG.lines };
})()`);
const M = J('CAMP_MOUNT'), rest = draw(false), shot = draw(true), idle = draw(false, true);
check('one table of numbers for how a mount is drawn: base, dot, hot dot, barrel at rest and on a shot, its width, the flash', ['base', 'dot', 'hot', 'aim', 'width', 'flash'].every(k => M[k] !== undefined), JSON.stringify(M));
check('a third smaller than before (the base was 5 px, the dot 2.5, a shot 4, the barrel 11 and 18, 2 and 3 wide): the base is 3.5 px or less, and the barrel on a shot 13 or less', M.base <= 3.5 && M.dot <= 2 && M.hot <= 3 && M.aim[0] <= 8 && M.aim[1] <= 13);
check('eight mounts, each a dark base and a dot', rest.circles.length === 16 && rest.circles.filter(c => c.rad === M.base).length === 8 && rest.circles.filter(c => c.rad === M.dot).length === 8, rest.circles.length + ' circles');
check('the base is dark and the dot is the amber of the turrets', rest.circles.filter(c => c.rad === M.base).every(c => c.c === 0x04101c) && rest.circles.filter(c => c.rad === M.dot).every(c => c.c === 0xffd37a));
check('the dot is inside the base, so the mount reads as a lit dot in a dark ring (base bigger than the dot, and bigger than the hot dot)', M.base > M.dot && M.base > M.hot && M.hot > M.dot);
check('a barrel toward the alien on each, M.aim[0] long and M.width[0] wide at rest', rest.lines.length === 8 && rest.lines.every(l => Math.abs(l.len - M.aim[0]) < 1e-6 && l.w === M.width[0]), JSON.stringify(rest.lines[0]));
check('right after a shot the dot is white and bigger and the barrel longer and thicker', shot.circles.filter(c => c.rad === M.hot).length === 8 && shot.circles.filter(c => c.rad === M.hot).every(c => c.c === 0xffffff) && shot.lines.every(l => Math.abs(l.len - M.aim[1]) < 1e-6 && l.w === M.width[1]) && M.aim[1] > M.aim[0] && M.width[1] > M.width[0]);
check('the muzzle flash is at the barrel tip: between the barrel at rest and on a shot', M.flash >= M.aim[0] && M.flash <= M.aim[1], String(M.flash));
check('a mount with nothing in reach is a steel barrel along the carrier\'s heading (0.3 rad here), M.stub[0] long, in grey, under the amber of an aimed one: it reads as a gun, not as a window', idle.lines.length === 8 && idle.lines.every(l => Math.abs(l.len - M.stub[0]) < 1e-6 && Math.abs(l.ang - 0.3) < 1e-6 && l.c === M.stub[1] && l.w === M.width[0]) && M.stub[0] > M.base && rest.lines.every(l => l.c === 0xffd37a), JSON.stringify(idle.lines[0]));
g.run('window.__beep0 = beep; beep = () => {};');
const flash = J(`(() => { const C = campNew(1, [], { seed: 1 }); let at = null, scale = null, tw = null; const im = { setBlendMode() { return im; }, setTint() { return im; }, setScale(v) { scale = v; return im; }, setDepth() { return im; } }; const sc = { camp: C, blipAt: 0, add: { image(x, y) { at = [x, y]; return im; } }, tweens: { add(o) { tw = o; } } }; Campaign.prototype.turretFlash.call(sc, { x: 100, y: 50, aim: 0, i: 0 }); return { at, scale, to: tw && tw.scale }; })()`);
check('the scene puts the flash CAMP_MOUNT.flash px in front of the mount along its aim (not a number of its own)', flash.at && Math.abs(flash.at[0] - (100 + M.flash)) < 1e-9 && flash.at[1] === 50, JSON.stringify(flash));
check('the flash is smaller than it was on the big carrier (1.3): CAMP_MOUNT.flashScale, 1 or less, and it shrinks to under half of that as it fades', flash.scale === M.flashScale && M.flashScale <= 1 && flash.to < M.flashScale / 2 + 1e-9, JSON.stringify(flash));
g.run('beep = __beep0');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

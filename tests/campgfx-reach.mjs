// smoke: the ring that shows how far the carrier's point guns reach is drawn 2 px wide, round the carrier, as far out as the point guns reach, at a third of its strength at rest and at 40 percent while the fire key is held; a dead carrier has none (plain Node, no Chrome)
// [night] graphics, from 6-GEN and 8-GEN: the ring was 1 px at alpha 0.16 and could not be found on the screen. tests/campmissiles.mjs checks the radius; this checks the look. The scene is Phaser's: syncRockets
// is called on a stand-in whose graphics record the line style and every circle.
// Run: node tests/campgfx-reach.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
// steps: [[fire held, ms], ...] run on the scene's own clock, 16 ms a frame; the ring of the last frame is what comes back
const ring = (hp, steps = [[false, 160]]) => J(`(() => {
  const C = campNew(1, [], { seed: 2 }); C.carrier.hp = ${hp};
  const rec = () => { const r = { rings: [], circles: [], style: null, clear() { r.rings.length = 0; r.circles.length = 0; return r; }, lineStyle(w, c, a) { r.style = { w, c, a }; return r; }, fillStyle() { return r; }, lineBetween() { return r; },
    strokeCircle(x, y, rad) { r.rings.push({ x, y, rad, ...r.style }); return r; }, fillCircle(x, y, rad) { r.circles.push({ x, y, rad }); return r; } }; return r; };
  const text = { setColor() { return text; }, setText() { return text; } };
  const sc = { camp: C, hud: { missiles: text }, reachG: rec(), mountG: rec(), msp: {}, mode: 'play', time: { now: 1000 } };
  ${JSON.stringify(steps)}.forEach(([fire, ms]) => { for (let t = 0; t < ms; t += 16) { C.input.fire = fire; sc.time.now += 16; Campaign.prototype.syncRockets.call(sc, 16); } });
  return { rings: sc.reachG.rings, mounts: sc.mountG.circles.length, carrier: { x: C.carrier.x, y: C.carrier.y }, range: CAMP.carrier.pdRange };
})()`);
const alive = ring(600), dead = ring(0);
check('one ring is drawn, centred on the carrier, as far out as the point guns reach', alive.rings.length === 1 && alive.rings[0].x === alive.carrier.x && alive.rings[0].y === alive.carrier.y && alive.rings[0].rad === alive.range, JSON.stringify(alive.rings));
check('it is 2 px wide or more', alive.rings[0].w >= 2, String(alive.rings[0].w));
const full = J('CAMP_REACH.alpha'), rest = alive.rings[0].a;
check('at rest it is about a third of its strength (the cloud brief 3, decision 3): between 0.3 and 0.37 of the 0.4 it has while the turrets fire', full === 0.4 && rest >= 0.3 * full && rest <= 0.37 * full, String(rest));
const held = ring(600, [[false, 160], [true, 480]]).rings[0].a, mid = ring(600, [[false, 160], [true, 64]]).rings[0].a;
check('while the fire key is held it comes up to its full strength (0.4) within half a second, and on the way it is between the two', held >= 0.39 * 1 && held <= full + 1e-9 && mid > rest && mid < held, held + ' ' + mid);
const let_go = ring(600, [[false, 160], [true, 480], [false, 160]]).rings[0].a, gone = ring(600, [[false, 160], [true, 480], [false, 1600]]).rings[0].a;
check('let go, it goes back slowly (still above rest a moment later) and is at rest again after a second or two', let_go > rest + 0.02 && let_go < held && Math.abs(gone - rest) < 0.005, let_go + ' ' + gone);
check('the line is as wide at rest as it is firing (2 px: only its strength moves)', ring(600, [[false, 160], [true, 480]]).rings[0].w === alive.rings[0].w);
check('it comes up with the clock: the first frame is at rest, whatever is held', ring(600, [[true, 16]]).rings[0].a === rest);
g.run('CAMP.flags.autofire = true');
check('with the turrets set to fire by themselves it is bright as well (they are firing)', ring(600, [[false, 480]]).rings[0].a >= 0.39);
g.run('CAMP.flags.autofire = false');
check('it is the amber of the turrets', alive.rings[0].c === 0xffd37a);
check('the four mounts are still drawn', alive.mounts >= 4 * 2, String(alive.mounts));
check('a dead carrier has no ring and no mounts', dead.rings.length === 0 && dead.mounts === 0, JSON.stringify(dead.rings));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

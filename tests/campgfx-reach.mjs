// smoke: the ring that shows how far the carrier's point guns reach is drawn 2 px wide at 40 percent, round the carrier, 420 px out; a dead carrier has none (plain Node, no Chrome)
// [night] graphics, from 6-GEN and 8-GEN: the ring was 1 px at alpha 0.16 and could not be found on the screen. tests/campmissiles.mjs checks the radius; this checks the look. The scene is Phaser's: syncRockets
// is called on a stand-in whose graphics record the line style and every circle.
// Run: node tests/campgfx-reach.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const ring = hp => J(`(() => {
  const C = campNew(1, [], { seed: 2 }); C.carrier.hp = ${hp};
  const rec = () => { const r = { rings: [], circles: [], style: null, clear() { r.rings.length = 0; r.circles.length = 0; return r; }, lineStyle(w, c, a) { r.style = { w, c, a }; return r; }, fillStyle() { return r; }, lineBetween() { return r; },
    strokeCircle(x, y, rad) { r.rings.push({ x, y, rad, ...r.style }); return r; }, fillCircle(x, y, rad) { r.circles.push({ x, y, rad }); return r; } }; return r; };
  const text = { setColor() { return text; }, setText() { return text; } };
  const sc = { camp: C, hud: { missiles: text }, reachG: rec(), mountG: rec(), msp: {}, mode: 'play' };
  Campaign.prototype.syncRockets.call(sc, 16);
  return { rings: sc.reachG.rings, mounts: sc.mountG.circles.length, carrier: { x: C.carrier.x, y: C.carrier.y }, range: CAMP.carrier.pdRange };
})()`);
const alive = ring(600), dead = ring(0);
check('one ring is drawn, centred on the carrier, as far out as the point guns reach', alive.rings.length === 1 && alive.rings[0].x === alive.carrier.x && alive.rings[0].y === alive.carrier.y && alive.rings[0].rad === alive.range, JSON.stringify(alive.rings));
check('it is 2 px wide or more', alive.rings[0].w >= 2, String(alive.rings[0].w));
check('it can be found (alpha 0.3 or more) without shouting (alpha 0.6 or less)', alive.rings[0].a >= 0.3 && alive.rings[0].a <= 0.6, String(alive.rings[0].a));
check('it is the amber of the turrets', alive.rings[0].c === 0xffd37a);
check('the four mounts are still drawn', alive.mounts >= 4 * 2, String(alive.mounts));
check('a dead carrier has no ring and no mounts', dead.rings.length === 0 && dead.mounts === 0, JSON.stringify(dead.rings));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

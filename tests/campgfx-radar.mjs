// smoke: the Campaign's radar is a solid disc with a bold rim, and its dots are big enough to find a ship by (plain Node, no Chrome)
// [night] graphics, the blind critic's pictures 06, 07, 08 and 23: the disc let the planet and the fighters behind it show through, and the enemy blips were two-pixel specks. The numbers are in CAMP_RADAR.
// The scene is Phaser's: paintHud is called on a stand-in whose graphics record every circle, with a real battle (campNew, stepped 25 s so the first wave is there) behind it.
// Run: node tests/campgfx-radar.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.levels[1] = CAMP.levels.home'); // level 1 is the asteroid belt now (card space-game-campaign-belt); this test is about the Earth level (its Earth, convoys and wave times), kept as data under "home"
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const run = J(`(() => {
  const C = campNew(1, [], { seed: 3 }); campOrder(C, 'launch'); for (let i = 0; i < 25 * 30; i++) { campStep(C, 1 / 30); C.events.length = 0; }
  const circles = [], lines = []; let fill = null, line = null;
  const gr = { clear() { return gr; }, fillStyle(c, a) { fill = { c, a }; return gr; }, lineStyle(w, c, a) { line = { w, c, a }; return gr; }, fillRect() { return gr; }, strokeRect() { return gr; },
    fillCircle(x, y, r) { circles.push({ x, y, r, c: fill.c, a: fill.a }); return gr; }, strokeCircle(x, y, r) { lines.push({ x, y, r, w: line.w, a: line.a }); return gr; } };
  const any = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => any });
  const sc = { camp: C, hudG: gr, hud: new Proxy({}, { get: () => any }) };
  Campaign.prototype.paintHud.call(sc);
  const R = CAMP_RADAR, disc = circles.find(c => c.r === R.r), rim = lines.find(l => l.r === R.r);
  const dots = circles.filter(c => c.r < R.r), alien = campDotColor({ team: 'alien', kind: 'raider' }), aliens = C.ships.filter(u => u.team === 'alien' && u.hp > 0).length;
  return { disc, rim, R, alienDots: dots.filter(d => d.c === alien).map(d => d.r), aliens, wingDots: dots.filter(d => d.c === campDotColor({ team: 'earth', kind: 'fighter' })).map(d => d.r), all: dots.length };
})()`);
check('there are aliens on the radar to look at (the first wave is out)', run.aliens >= 3 && run.alienDots.length === run.aliens, run.aliens + ' aliens, ' + run.alienDots.length + ' blips');
check('the disc is nearly solid (alpha 0.85 or more), so the planet behind it does not show', run.disc && run.disc.a >= 0.85, run.disc && String(run.disc.a));
check('the rim is bold: 2 px or more, alpha 0.7 or more', run.rim && run.rim.w >= 2 && run.rim.a >= 0.7, JSON.stringify(run.rim));
check('every enemy blip is 3 px of radius or more', run.alienDots.every(r => r >= 3), run.alienDots.join(','));
check('the wing shows too, as big as the enemy blips', run.wingDots.length >= 1 && run.wingDots.every(r => r >= 3), run.wingDots.join(','));
check('the disc and the blips are the same size as before at the centre of the screen position (x, y, radius unchanged)', run.R.r === 98 && run.R.range === 6000);
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

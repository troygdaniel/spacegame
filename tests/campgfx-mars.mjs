// smoke: Mars is drawn rust-coloured (a tint in the places table, read by the scene's drawPlace); the other worlds keep their own look (plain Node, no Chrome)
// [night] graphics, the blind critic's pictures 02, 06 and 13: Luna, Mars and Proxima b were the same grey cratered ball. A place may carry a tint (CAMP.places, a colour the picture is multiplied by).
// The scene is Phaser's: drawPlace is called on a stand-in that records what is made and what colour it is given.
// Run: node tests/campgfx-mars.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
// one place drawn on a stand-in scene: the images it made (with the tint each was given) and the texts
const drawn = id => J(`(() => { const made = [], any = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => any }), real = planetTexture; planetTexture = (sc, kind, seed) => 'planet-' + kind + '-' + seed; // no canvas in Node: the name stands for the picture
  const img = (x, y, tex) => { const o = { x, y, tex, tint: null, scale: null, setScale(v) { this.scale = v; return this; }, setDepth() { return this; }, setTint(c) { this.tint = c; return this; } }; made.push(o); return o; };
  const sc = { add: { image: img, text: () => any }, textures: { exists: () => true } };
  try { Campaign.prototype.drawPlace.call(sc, CAMP.places.${id}); } finally { planetTexture = real; } return made.map(o => ({ tex: o.tex, tint: o.tint, scale: o.scale })); })()`);
const mars = drawn('mars'), luna = drawn('luna'), earth = drawn('earth');
check('Mars is drawn with a tint', mars[0].tint !== null, JSON.stringify(mars[0]));
const c = mars[0].tint, rgb = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
check('the tint is rust: red well above green, green above blue', rgb[0] > rgb[1] + 40 && rgb[1] > rgb[2] + 10, rgb.join(', '));
check('Luna keeps its own look (no tint)', luna[0].tint === null);
check('Earth keeps its own look (no tint)', earth[0].tint === null);
check('Mars is still the size the table says', mars[0].scale === g.run('CAMP.places.mars.r') / 300);
check('the table has the tint as a plain number', g.run('typeof CAMP.places.mars.tint') === 'number');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

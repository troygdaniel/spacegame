// smoke: space backdrop: star layers only, no picture of a sun, a planet or a moon in any system (plain Node, no Chrome)
// Card space-game-no-backdrop-bodies (Troy, 17 Nov 2026): a body in the backdrop that is not a place you can fly to reads as a place. The
// Space backdrop is three star layers and nothing else; a system's star still gives them its tint. tests/systems.mjs checks the same in the
// real page (Chrome); this is the logic alone: spaceBackdrop() on a stand-in scene, in every system and in deep space, and the art file
// no longer makes the three old pictures.
// Run: node tests/backdrop.mjs   (exit code 1 on a failed check)
import { nodeGame, ROOT } from './nodegame.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  function __backdrop(sysId, deep) {
    G.system = sysId;
    const made = { layers: [], images: [], other: [], tints: [], tweens: 0 };
    const obj = kind => { const o = { kind, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setTint(c) { made.tints.push(c); return o; } }; return o; };
    const s = { cameras: { main: { setBackgroundColor() {} } }, tweens: { add() { made.tweens++; } }, textures: { exists: () => true },
      add: new Proxy({}, { get: (t, k) => (...a) => { if (k === 'tileSprite') made.layers.push(a[4]); else if (k === 'image' || k === 'sprite') made.images.push(a[2]); else made.other.push(String(k)); return obj(k); } }) };
    spaceBackdrop(s, deep);
    return { layers: made.layers, images: made.images, other: made.other, tints: made.tints, bg: (s.bgLayers || []).length };
  }
`);

const ids = J(`Object.keys(SYSTEMS)`);
check('there are systems to look at', ids.length >= 8, ids.join(', '));
for (const id of ids) {
  const r = J(`__backdrop('${id}', false)`), star = J(`SYSTEMS['${id}'].star ? SYSTEMS['${id}'].star.type : null`);
  check(`${id}: three star layers and nothing else: no picture of a sun, a planet or a moon`, r.layers.join() === 'stars1,stars2,stars3' && r.images.length === 0 && r.other.length === 0 && r.bg === 3, JSON.stringify(r));
  if (star) check(`${id}: the layers take the tint of its star (${star})`, r.tints.length === 3 && r.tints.every(c => c === J(`STAR_TYPES['${star}'].tint`)), JSON.stringify(r.tints));
  else check(`${id}: no star row, no tint`, r.tints.length === 0, JSON.stringify(r.tints));
}
const deep = J(`__backdrop('halcyon', true)`);
check('deep space (a pull-out): the same stars, nothing else', deep.layers.length === 3 && deep.images.length === 0);

const art = readFileSync(join(ROOT, 'src', 'art_world.js'), 'utf8');
check("the art file no longer makes the 'sun', 'giant' and 'moon' pictures", !/waCanvas\(sc, '(sun|giant|moon)'/.test(art));
check('starTexture and STAR_TYPES are kept for the real star of a later card', J(`[typeof starTexture, Object.keys(STAR_TYPES).length]`).join() === 'function,5');
check('every real body is still in the data: Halcyon has its 14', J(`SYSTEMS.halcyon.bodies.length`) === 14);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `BACKDROP FAIL (${failed} of ${n})` : `BACKDROP PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

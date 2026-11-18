// smoke: the planet texture cache never drops the texture it was just asked for (plain Node, no Chrome)
// planetTexture in src/art_world.js keeps at most PLANET_CACHE_MAX (6) generated planets, and never drops one a live image shows. The one it
// has just made is not shown by anything yet (the caller makes the image next), so in a system with more than six planets, where every older
// one is on show, the new texture was the one it dropped: the caller got the key of a texture that no longer existed and its image was blank.
// Seen in the Sol pack (24 planets): Jupiter, Saturn and every moon past the sixth planet were not there (first look, docs/FIRSTLOOK.md).
// Here the textures are a stand-in set of names and the canvas is not drawn: what is checked is which names are alive.
// Run: node tests/planetcache.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));

g.run(`
  // a scene whose textures are a set of names, with a list of images that show them; the canvas itself is not drawn
  function __world() {
    const alive = new Set(), sc = { children: { list: [] } };
    sc.textures = { exists: k => alive.has(k), remove: k => { alive.delete(k); }, createCanvas: k => { alive.add(k); return { getContext: () => ({}), refresh() {} }; } };
    sc.game = { scene: { scenes: [sc] } };
    return { sc, alive };
  }
  waCanvas = (sc, key) => { if (sc.textures.exists(key)) sc.textures.remove(key); return sc.textures.createCanvas(key); }; // no drawing here
  // build a system the way cruiseFarBodies does: ask for each planet's texture, then make its image
  function __system(count) {
    waPlanetCache.length = 0;
    const w = __world(), kinds = PLANET_KINDS, blank = [];
    for (let i = 0; i < count; i++) {
      const key = planetTexture(w.sc, kinds[i % kinds.length], 100 + i);
      if (!w.alive.has(key)) blank.push(i);          // the caller would make an image of a texture that is gone
      w.sc.children.list.push({ texture: { key } });
    }
    return { blank, alive: w.alive.size, cache: waPlanetCache.length, w };
  }
`);
const max = J('PLANET_CACHE_MAX');
let r = J(`(() => { const s = __system(5); return { blank: s.blank, alive: s.alive, cache: s.cache }; })()`);
check('five planets (the most a shipped system has): every one drawn, five textures alive', r.blank.length === 0 && r.alive === 5 && r.cache === 5, JSON.stringify(r));
r = J(`(() => { const s = __system(${max + 1}); return { blank: s.blank, alive: s.alive, cache: s.cache }; })()`);
check(`one more than the cap (${max + 1}): the new planet is drawn, not dropped the moment it is made`, r.blank.length === 0 && r.alive === max + 1, JSON.stringify(r));
r = J(`(() => { const s = __system(24); return { blank: s.blank, alive: s.alive, cache: s.cache }; })()`);
check('24 planets, as in the Sol pack: all 24 drawn, every texture alive while its image shows it (the cache stays over its cap)', r.blank.length === 0 && r.alive === 24 && r.cache === 24, JSON.stringify(r));
r = J(`(() => { const s = __system(24); s.w.sc.children.list.length = 0; const key = planetTexture(s.w.sc, 'gas', 999); return { alive: s.w.alive.size, cache: waPlanetCache.length, has: s.w.alive.has(key), newest: waPlanetCache[waPlanetCache.length - 1] === key }; })()`);
check(`the scene lets go of them (a jump away): the next planet asked for brings the cache back to its cap of ${max}, and is itself kept`, r.alive === max && r.cache === max && r.has && r.newest, JSON.stringify(r));
r = J(`(() => { waPlanetCache.length = 0; const w = __world(); const a = planetTexture(w.sc, 'ice', 7), n1 = w.alive.size; const b = planetTexture(w.sc, 'ice', 7); return { same: a === b, n1, n2: w.alive.size, cache: waPlanetCache.length }; })()`);
check('the same planet asked for twice is one texture', r.same && r.n1 === 1 && r.n2 === 1 && r.cache === 1, JSON.stringify(r));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PLANET CACHE FAIL (${failed} of ${n})` : `PLANET CACHE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

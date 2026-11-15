// smoke: art for other star systems: planet kinds, star types, the four station looks
// Art for other star systems (Universe B6): node tests/systemart.mjs
// Planet kinds and star types (src/art_world.js) and the four station looks (src/stationart.js) are not used by the game yet, so this
// puts them on a throwaway scene (ArtLab, made here and never shipped) and checks them:
//   planets: all five kinds are made, are 800 px, the same (kind, seed) paints the same pixels again, and never more than six are alive
//   stars:   all five types, an unknown type falls back to G
//   looks:   hub, foundry, nest, derelict: right size, an empty corner and a filled middle, the fx adds and removes its update hook
// Saves tests/out/systemart-planets.png, systemart-stars.png and systemart-station-<hub|foundry|nest|derelict>.png.
// Exit code 1 on a failed check or a console error.
import { launch, sleep } from './cdp.mjs';

let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#station'); // not #space: that scene already draws the planets of Halcyon's far space (src/cruise.js)
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Station'))`, 30000, 'Station active');
  await sleep(1000);
  check('nothing is made at boot: no planet kind, star type or station look exists yet',
    await t.ev(`!game.textures.getTextureKeys().some(k => /^(planet-|star-|sl-)/.test(k))`));
  // the lab: a dark scene over the paused game; the nebula backdrop is the one the game uses
  await t.ev(`(() => {
    class ArtLab extends Phaser.Scene {
      constructor() { super('ArtLab'); }
      create() {
        this.add.rectangle(640, 360, 1280, 720, 0x02050e).setDepth(-1000);
        this.add.tileSprite(0, 0, 1280, 720, 'stars1').setOrigin(0).setDepth(-999);
        this.mine = [];
        window.__lab = this;
      }
      clear() { this.mine.forEach(o => o.destroy()); this.mine = []; }
      put(o) { this.mine.push(o); return o; }
    }
    game.scene.getScenes(true).forEach(s => game.scene.pause(s.scene.key));
    game.scene.add('ArtLab', ArtLab, true);
  })()`);
  await t.waitFor(`!!window.__lab`, 15000, 'ArtLab created');
  const L = '__lab';

  // ---- planets ----
  const kinds = JSON.parse(await t.ev('JSON.stringify(PLANET_KINDS)'));
  check('five planet kinds: rock, ice, gas, lava, ringed', kinds.join() === 'rock,ice,gas,lava,ringed', kinds.join());
  const made = JSON.parse(await t.ev(`JSON.stringify(PLANET_KINDS.map(k => { const t0 = performance.now(); const key = planetTexture(${L}, k, 1); const tx = ${L}.textures.get(key); const src = tx.getSourceImage(); return { k, key, w: src.width, h: src.height, ms: Math.round(performance.now() - t0) }; }))`));
  made.forEach(m => check(`${m.k}: texture ${m.key} is 800 x 800`, m.w === 800 && m.h === 800, `${m.ms} ms`));
  const hash = keyExpr => `(() => { const c = ${L}.textures.get(${keyExpr}).getSourceImage().getContext('2d'); let h = 0; for (const [x, y] of [[400, 400], [300, 250], [520, 480], [250, 400], [400, 160], [610, 400]]) { const d = c.getImageData(x, y, 1, 1).data; h = (h * 31 + d[0] * 7 + d[1] * 13 + d[2] * 17 + d[3]) % 1000003; } return h; })()`;
  // each kind has its own look, and a seed makes another planet of the same kind
  const hs = JSON.parse(await t.ev(`JSON.stringify(PLANET_KINDS.map(k => ${hash("'planet-' + k + '-1'")}))`));
  check('the five kinds look different from each other', new Set(hs).size === 5, hs.join(' '));
  await t.ev(`planetTexture(${L}, 'gas', 2)`);
  check('another seed paints another planet of the same kind', (await t.ev(hash("'planet-gas-1'"))) !== (await t.ev(hash("'planet-gas-2'"))));
  // the same (kind, seed) paints the same planet again, after it was dropped from the cache
  const h1 = await t.ev(hash("'planet-lava-1'"));
  await t.ev(`['rock', 'ice', 'gas', 'ringed', 'rock', 'gas', 'ice'].forEach((k, i) => planetTexture(${L}, k, 20 + i))`);
  check('cache: never more than six planet canvases alive', await t.ev(`${L}.textures.getTextureKeys().filter(k => k.startsWith('planet-')).length`) <= 6, String(await t.ev(`${L}.textures.getTextureKeys().filter(k => k.startsWith('planet-')).length`)));
  check('cache: the oldest was dropped (lava 1 is gone)', !(await t.ev(`${L}.textures.exists('planet-lava-1')`)));
  await t.ev(`planetTexture(${L}, 'lava', 1)`);
  check('the same kind and seed paints the same pixels again', (await t.ev(hash("'planet-lava-1'"))) === h1);
  const same = await t.ev(`(() => { const a = ${L}.textures.get(planetTexture(${L}, 'ice', 20 + 1)); return planetTexture(${L}, 'ice', 21) === 'planet-ice-21' && ${L}.textures.get('planet-ice-21') === a; })()`);
  check('asking again for one that is alive does not paint it again', same);
  // a planet that an image is showing is never dropped, even when it is the oldest and the cache is over its cap
  await t.ev(`(() => { planetTexture(${L}, 'ice', 40); ${L}.put(${L}.add.image(0, 0, 'planet-ice-40').setVisible(false)); ['rock', 'gas', 'lava', 'ringed', 'rock', 'gas', 'lava', 'ice'].forEach((k, i) => planetTexture(${L}, k, 50 + i)); })()`);
  check('a planet that is on show is never dropped from the cache', await t.ev(`${L}.textures.exists('planet-ice-40')`));
  check('an unknown kind falls back to rock', await t.ev(`planetTexture(${L}, 'plasma', 5) === 'planet-rock-5'`));
  // the picture: one of each kind, as they are when you arrive
  await t.ev(`(() => { ${L}.clear(); planetTexture(${L}, 'rock', 1); PLANET_KINDS.forEach((k, i) => { ${L}.put(${L}.add.image(130 + i * 255, 330, planetTexture(${L}, k, 1)).setScale(0.3)); ${L}.put(${L}.add.text(130 + i * 255, 470, k, { fontFamily: 'monospace', fontSize: '18px', color: '#9fe9ff' }).setOrigin(0.5)); }); })()`);
  await sleep(600);
  if (!(await t.shot('systemart-planets'))) check('screenshot of the planets', false);

  // ---- stars ----
  const types = JSON.parse(await t.ev('JSON.stringify(Object.keys(STAR_TYPES))'));
  check('five star types: M K G F A', types.join('') === 'MKGFA', types.join(''));
  const sk = JSON.parse(await t.ev(`JSON.stringify(Object.keys(STAR_TYPES).map(k => { const key = starTexture(${L}, k); const s = ${L}.textures.get(key).getSourceImage(); return [key, s.width, s.height]; }))`));
  check('each type makes a 512 px canvas star-<type>', sk.every(([key, w, h], i) => key === 'star-' + types[i] && w === 512 && h === 512), JSON.stringify(sk.map(a => a[0])));
  check('an unknown type falls back to G', await t.ev(`starTexture(${L}, 'Z') === 'star-G'`));
  check('every type has a name, a size and a backdrop tint', await t.ev(`Object.values(STAR_TYPES).every(s => s.name && s.size > 0 && Number.isInteger(s.tint))`));
  await t.ev(`(() => { ${L}.clear(); Object.keys(STAR_TYPES).forEach((k, i) => { const st = STAR_TYPES[k]; ${L}.put(${L}.add.image(130 + i * 255, 300, starTexture(${L}, k)).setScale(0.5 * st.size)); ${L}.put(${L}.add.text(130 + i * 255, 520, k + '  ' + st.name, { fontFamily: 'monospace', fontSize: '16px', color: '#9fe9ff' }).setOrigin(0.5)); }); })()`);
  await sleep(600);
  if (!(await t.shot('systemart-stars'))) check('screenshot of the stars', false);

  // ---- station looks ----
  const arts = JSON.parse(await t.ev('JSON.stringify(Object.keys(STATION_LOOKS))'));
  check('four looks: hub, foundry, nest, derelict', arts.join() === 'hub,foundry,nest,derelict', arts.join());
  for (const art of arts) {
    const r = JSON.parse(await t.ev(`(() => {
      const key = stationLookTex(${L}, '${art}'), src = ${L}.textures.get(key).getSourceImage(), c = src.getContext('2d'), N = src.width, look = STATION_LOOKS['${art}'];
      const mid = c.getImageData(N / 2, N / 2, 1, 1).data[3], corner = c.getImageData(2, 2, 1, 1).data[3];
      ${L}.clear(); const before = ${L}.events.listenerCount('update');
      const st = stationLookFx(${L}, '${art}', 640, 360); ${L}.put(st.c);
      const during = ${L}.events.listenerCount('update'); st.destroy(); const after = ${L}.events.listenerCount('update');
      const again = stationLookFx(${L}, '${art}', 640, 360); ${L}.put(again.c);
      const spare = stationLookFx(${L}, '${art}', 640, 360); spare.c.destroy(); const byHand = ${L}.events.listenerCount('update') === during; // container destroyed, not destroy()
      return JSON.stringify({ byHand, key, w: src.width, h: src.height, size: look.size, mid, corner, hooks: [before, during, after], radius: st.radius, bay: st.bay, accent: st.accent });
    })()`));
    check(`${art}: texture ${r.key} is ${r.size} x ${r.size}`, r.w === r.size && r.h === r.size, `${r.w} x ${r.h}`);
    check(`${art}: filled in the middle, empty in the corner`, r.mid > 200 && r.corner === 0, `mid ${r.mid} corner ${r.corner}`);
    check(`${art}: the fx adds one update hook and destroy() takes it away`, r.hooks[1] === r.hooks[0] + 1 && r.hooks[2] === r.hooks[0], r.hooks.join(' '));
    check(`${art}: destroying the container by hand also takes the hook away`, r.byHand);
    check(`${art}: a dock radius, a bay on the +x side and an accent colour`, r.radius > 150 && r.bay.x > 100 && r.bay.y === 0 && /^#/.test(r.accent), `radius ${r.radius}`);
    await t.ev(`(() => { ${L}.put(${L}.add.text(640, 690, '${art}', { fontFamily: 'monospace', fontSize: '18px', color: STATION_LOOKS['${art}'].accent }).setOrigin(0.5)); ${L}.mine[0].setScale(1.1); })()`);
    await sleep(1600); // let the lights run
    if (!(await t.shot('systemart-station-' + art))) check(`${art}: screenshot`, false);
  }
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'SYSTEM ART FAIL' : 'SYSTEM ART PASS');
process.exitCode = bad ? 1 : 0;

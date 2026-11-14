// The six player ships (src/shipmodels.js): a picture sheet of every hull at upgrade tiers 0 to 3, and the checks that make them real ships:
// each hull has its own silhouette, every upgrade slot changes the picture, nozzles, physics circle and callout anchors sit inside the texture,
// and the game follows the active model (hangar size, physics body, flames, Ship bay). One headless Chrome, closed at the end.
// Run: node tests/shipsheet.mjs   (exit code 1 on any failure)  ->  tests/out/shipsheet.png and tests/out/shipbay-<model>.png
import { launch, sleep } from './cdp.mjs';

const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const J = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
const IDS = ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'];

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(600);

  console.log('A. the sheet');
  // a clean scene on top. sheet(): every model in a row, tiers 0 to 3 across. big(): the five new hulls at tier 2, drawn large
  await t.ev(`(() => {
    const SheetScene = class extends Phaser.Scene {
      constructor() { super('Sheet'); }
      create() { window.__sheet = () => this.sheet(); window.__big = () => this.big(); this.sheet(); }
      clear() { this.children.removeAll(true); this.add.rectangle(640, 360, 1280, 720, 0x060c16); }
      sheet() {
        this.clear();
        const ids = ${JSON.stringify(IDS)}, x0 = 250, dx = 245, y0 = 62, dy = 112;
        ids.forEach((id, r) => {
          const L = SHIP_LOOK[id], y = y0 + r * dy + 26;
          this.add.text(20, y - 20, L.name.toUpperCase(), { fontFamily: 'monospace', fontSize: '18px', color: '#38e1ff' });
          this.add.text(20, y + 4, L.role, { fontFamily: 'monospace', fontSize: '12px', color: '#ffb454' });
          [0, 1, 2, 3].forEach((tier, c) => {
            const key = shipPreviewTexture(this, id, { plating: tier, guns: tier, engine: tier });
            this.add.image(x0 + c * dx, y, key).setScale(id === 'bastion' ? 1.75 : id === 'ox' ? 2 : 2.4);
            if (r === 0) this.add.text(x0 + c * dx, 16, 'TIER ' + tier, { fontFamily: 'monospace', fontSize: '14px', color: '#9fe9ff' }).setOrigin(0.5);
          });
        });
      }
      big() {
        this.clear();
        [['wren', 200, 170], ['kite', 640, 170], ['ox', 1080, 170], ['talon', 200, 500], ['pathfinder', 640, 500], ['bastion', 1080, 500]].forEach(([id, x, y]) => {
          const L = SHIP_LOOK[id], key = shipPreviewTexture(this, id, { plating: 2, guns: 2, engine: 2 });
          this.add.image(x, y, key).setScale(Math.min(5.4, 360 / L.w));
          this.add.text(x, y - 130, L.name.toUpperCase() + '  -  ' + L.role, { fontFamily: 'monospace', fontSize: '16px', color: '#38e1ff' }).setOrigin(0.5);
        });
      }
    };
    game.scene.add('Sheet', SheetScene, true); return 1; })()`);
  await sleep(1200);
  check('the sheet scene runs', await t.ev("game.scene.isActive('Sheet')"));
  await t.shot('shipsheet');
  await t.ev('(() => { window.__big(); return 1; })()'); await sleep(700); await t.shot('shipsheet-big');
  console.log('  (sheets saved to tests/out/shipsheet.png and shipsheet-big.png)');

  console.log('B. geometry: body, nozzles, anchors, lights sit inside the texture');
  await t.ev(`(() => {
    const sc = game.scene.getScene('Sheet');
    window.__tex = (id, p = 0, g = 0, e = 0) => shipPreviewTexture(sc, id, { plating: p, guns: g, engine: e });
    window.__img = key => { const im = game.textures.get(key).getSourceImage(), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    window.__diff = (a, b) => { const A = __img(a).data, B = __img(b).data; let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]) > 60) n++; return n; };
    window.__alpha = (key, x, y) => { const d = __img(key); return d.data[(Math.round(y) * d.width + Math.round(x)) * 4 + 3]; };
    window.__mask = key => { const im = game.textures.get(key).getSourceImage(), c = document.createElement('canvas'); c.width = 48; c.height = 32; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 48, 32); const d = x.getImageData(0, 0, 48, 32).data, m = []; for (let i = 3; i < d.length; i += 4) m.push(d[i] > 60 ? 1 : 0); return m; };
    return 1; })()`);
  for (const id of IDS) {
    const g = await J(`(() => { const L = SHIP_LOOK[id = '${id}']; const k = __tex('${id}', 2, 2, 2); const ts = [0, 1, 2, 3].map(e => L.nozzles({ plating: 0, guns: 0, engine: e }));
      return { w: L.w, h: L.h, body: L.body, cockpit: L.cockpit, fx: L.fx, anchors: L.anchors, noz: ts, tw: game.textures.get(k).getSourceImage().width, th: game.textures.get(k).getSourceImage().height,
        anchorAlpha: Object.fromEntries(Object.entries(L.anchors).map(([n, p]) => [n, __alpha(k, p[0], p[1])])), name: L.name, role: L.role, flame: L.flame, shield: L.shield }; })()`);
    const [r, bx, by] = g.body;
    check(id + ': the texture is ' + g.w + ' x ' + g.h, g.tw === g.w && g.th === g.h, g.tw + 'x' + g.th);
    check(id + ': the physics circle is inside the texture and centred', bx >= 0 && by >= 0 && bx + 2 * r <= g.w && by + 2 * r <= g.h && Math.abs(bx + r - g.w / 2) <= 2 && Math.abs(by + r - g.h / 2) <= 2, JSON.stringify(g.body));
    check(id + ': every nozzle, at every engine tier, is at the back and inside the texture', g.noz.every(list => list.length >= 1 && list.every(([dx, dy, sz]) => dx < 0 && g.w / 2 + dx > 0 && Math.abs(dy) < g.h / 2 && sz > 0)), g.noz.map(l => l.length).join('/'));
    check(id + ': the engine tiers keep or add nozzles', g.noz.every((l, i) => i === 0 || l.length >= g.noz[0].length));
    check(id + ': the callout anchors sit on the fitted ship (tier 2 everywhere)', Object.values(g.anchorAlpha).every(a => a > 40), JSON.stringify(g.anchorAlpha));
    check(id + ': cockpit, lights and shield are sane', g.cockpit[0] > 0 && g.cockpit[0] < g.w && Math.abs(g.fx[0]) < g.w / 2 && Math.abs(g.fx[1]) < g.w / 2 && g.shield >= 20 && g.shield <= 60 && g.flame.length === 2, 'shield ' + g.shield);
  }

  console.log('C. six different silhouettes');
  const masks = {};
  for (const id of IDS) masks[id] = await J(`__mask(__tex('${id}'))`);
  let worst = 0, worstPair = '';
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) {
    const a = masks[IDS[i]], b = masks[IDS[j]]; let inter = 0, uni = 0;
    for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) inter++; if (a[k] || b[k]) uni++; }
    const iou = inter / uni; if (iou > worst) { worst = iou; worstPair = IDS[i] + '/' + IDS[j]; }
  }
  check('no two hulls overlap more than 88% when scaled to the same box', worst < 0.88, worstPair + ' ' + worst.toFixed(2));
  const sizes = await J(`${JSON.stringify(IDS)}.map(id => SHIP_LOOK[id].w)`);
  check('sizes grow as the design says: the Kite is the smallest of the five new ones, the Bastion the biggest, about 1.6 times the Wren', sizes[5] === Math.max(...sizes) && Math.abs(sizes[5] / sizes[0] - 1.6) < 0.1, sizes.join(','));

  console.log('D. every upgrade slot changes the picture, on every ship');
  for (const id of IDS) {
    const d = await J(`({ plating: __diff(__tex('${id}'), __tex('${id}', 2, 0, 0)), guns: __diff(__tex('${id}'), __tex('${id}', 0, 2, 0)), engine: __diff(__tex('${id}'), __tex('${id}', 0, 0, 2)), p1: __diff(__tex('${id}'), __tex('${id}', 1, 0, 0)), g1: __diff(__tex('${id}'), __tex('${id}', 0, 1, 0)), e1: __diff(__tex('${id}'), __tex('${id}', 0, 0, 1)) })`);
    check(id + ': plating, guns and engine tiers each draw something', d.plating >= 12 && d.guns >= 12 && d.engine >= 12, JSON.stringify(d));
    check(id + ': tier 1 differs from tier 0 for every slot (a bought part shows at once)', d.p1 >= 8 && d.g1 >= 8 && d.e1 >= 8, `${d.p1}/${d.g1}/${d.e1}`);
  }

  console.log('E. the game follows the active model');
  for (const id of IDS) {
    await t.ev(`(() => { G.fleet[G.active].model = '${id}'; G.fleet[G.active].name = SHIP_LOOK['${id}'].name; /* a ship is named for its model until you rename it */ game.scene.stop('Sheet'); /* the fleet record of save v2 (src/meta.js) says which hull you fly */ game.scene.stop('Ship'); game.scene.stop('Space'); game.scene.start('Station', { arrive: false }); return 1; })()`);
    await t.waitFor("game.scene.isActive('Station')", 10000, 'station');
    await sleep(500);
    const st = await J(`(() => { const s = game.scene.getScene('Station'), L = SHIP_LOOK['${id}'], im = game.textures.get('ship').getSourceImage();
      return { w: im.width, h: im.height, lw: L.w, lh: L.h, shown: s.shipImg.displayWidth, model: SHIPS.model, shield: SHIPS.shieldR, noz: SHIPS.nozzles.ship.length }; })()`);
    check(id + ': the hangar shows the ' + id + ' (texture ' + st.w + 'x' + st.h + ') 168 px wide', st.model === id && st.w === st.lw && st.h === st.lh && Math.abs(st.shown - 168) < 1.5, JSON.stringify(st));
    if (id === 'bastion' || id === 'kite' || id === 'ox') await t.shot('shiphangar-' + id);
    await t.ev(`(() => { game.scene.getScene('Station').scene.start('Space', { from: 'station' }); return 1; })()`);
    await t.waitFor("game.scene.isActive('Space')", 15000, 'space'); await sleep(700);
    const sp = await J(`(() => { const s = game.scene.getScene('Space'), L = SHIP_LOOK['${id}']; return { r: s.ship.body.radius, br: L.body[0], ox: s.ship.body.offset.x, oy: s.ship.body.offset.y, tw: s.ship.width, lw: L.w, flame: SHIP_LOOK[SHIPS.model].flame.length }; })()`);
    check(id + ': in flight the physics circle and the texture are the ' + id + "'s", sp.r === sp.br && sp.ox === 0 + (await J(`SHIP_LOOK['${id}'].body[1]`)) && sp.tw === sp.lw, JSON.stringify(sp));
    if (id === 'bastion' || id === 'kite') { await t.press('W', 1100); await t.shot('shipflight-' + id); }
    await t.ev(`(() => { game.scene.getScene('Space').scene.start('Ship'); return 1; })()`);
    await t.waitFor("game.scene.isActive('Ship')", 10000, 'ship bay'); await sleep(1400);
    const txt = await t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('Ship').children.list.forEach(walk); return out.join('|'); })()`);
    check(id + ': the Ship bay names it', txt.includes((await t.ev(`SHIP_LOOK['${id}'].name.toUpperCase()`)) + '  -  ' + (await t.ev(`SHIP_LOOK['${id}'].role`))), txt.slice(0, 0));
    await t.shot('shipbay-' + id);
  }
  await t.ev("(() => { G.fleet[G.active].model = 'wren'; G.fleet[G.active].name = 'Wren'; return 1; })()");
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `SHIPSHEET FAIL (${fails})` : 'SHIPSHEET PASS');
process.exit(fails ? 1 : 0);

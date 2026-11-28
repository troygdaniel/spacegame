// not in the smoke: the new Long Haul in the real game (one Chrome, muted, through the test lock; PROMPT 23, the cloud session's brief 15, piece 10 of docs/longhaul-earth.html)
// Opens index.html?longhaul=new#space (the dev shortcut straight into the flight), flies for ten seconds with W and Space held by real key events, and checks what only a browser shows:
//   A  the switch is on, the home system reads Earth Orbit and the home dock Keel Station; Earth is drawn behind the flight and the landable world is a flat disc
//   B  the ships: your ship shows its flat-cut picture, and a pirate put beside it takes its own on the next frame, with the hit circle it had
//   C  ten seconds of flight with the guns held: the ship moves, shots leave as the Campaign's mint bolts at the Campaign fighter's speed and life, and nothing throws
//   D  the aim help: a pirate ahead inside the cone is tracked (the bridge's aim names it) and a helped shot does the Campaign's price of the damage; a pirate killed draws the Campaign's kill effect
//   E  the page HUD: the ship panel and the six-chip key row are on the page, Long Haul's key line is hidden, the hostiles panel names the pirate
//   F  the same page WITHOUT the switch has none of it: no panel, no flat picture, today's key line, Halcyon
//   H  (card space-game-lh-earth-zoom) Earth stands in the world (scroll factor 1) and the ship has flown away from it; the - and = keys (real key events) zoom the view out to 0.05 and back, the keys page lists them
//   G  the game logged no error in either
// It is not part of the smoke (Chrome is slow and shares one lock): the gate's Chrome batch runs it with the other boots.   node tests/lhnew-boot.mjs
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyW: 87, Space: 32, Minus: 189, Equal: 187 };
const S = `game.scene.getScene('Space')`;
const fly = async (t, ms, keys = ['KeyW', 'Space']) => {
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : code === 'Minus' ? '-' : code === 'Equal' ? '=' : 'w' });
  for (const c of keys) await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(c)));
  await t.run(ms);
  for (const c of keys) await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(c)));
};
const boot = async addr => {
  const t = await launch(addr, ROOT);
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Space') && ${S}.ship && ${S}.ship.body)`, 30000, 'the flight');
  await t.clock(); await t.run(1600); // past the launch lock
  return { t, j };
};

let errors = [];
{ // ---- with the switch
  const { t, j } = await boot('?longhaul=new#space');
  try {
    console.log('A  the setting');
    const a = await j(`({ on: lhNewOn(), sys: sysDef().name, dock: spaceHomeDock().name, earth: !!(${S}.lhEarth && ${S}.lhEarth.active), earthKey: ${S}.lhEarth && ${S}.lhEarth.texture.key, moon: ${S}.planet.texture ? ${S}.planet.texture.key : '' })`);
    check('the switch is on, the system is Earth Orbit and the dock Keel Station', a.on === true && a.sys === 'Earth Orbit' && a.dock === 'Keel Station', JSON.stringify(a));
    check('Earth is drawn behind the flight and the landable world is a flat disc', a.earth === true && a.earthKey === 'lh-earth' && /^cdisc-luna-/.test(a.moon), a.moon);

    console.log('B  the ships');
    await t.ev(`(() => { const s = ${S}; s.enemies.clear(true, true); s.launchAt = -1e6; s.ironUntil = 0; window.__p = spawnPirate(s, s.ship.x + 2000, s.ship.y, 'raider'); return 1; })()`);
    await t.run(100);
    const b = await j(`({ me: ${S}.ship.texture.key, foe: __p.texture.key, r: __p.body.radius, w: __p.width, h: __p.height, hw: __p.body.halfWidth })`);
    check('your ship (the Wren, with the plating and barrels you own: card space-game-lh-hull-shapes) and a pirate show their flat-cut pictures', /^lh-ship-wren-\d\d-\d+x\d+$/.test(b.me) && b.foe === 'lh-raider-40x30', JSON.stringify(b));
    check('the pirate\'s picture is the old size and its hit circle the old radius', b.w === 40 && b.h === 30 && b.r === 10, JSON.stringify(b));
    await t.ev(`(() => { __p.destroy(); return 1; })()`);

    console.log('C  ten seconds of flight with the guns held');
    const at0 = await j(`({ x: ${S}.ship.x, y: ${S}.ship.y })`);
    await t.ev(`(() => { ${S}.ship.rotation = 0; window.__shots = []; const s = ${S}, sh = s.shoot.bind(s); s.shoot = (g, x, y, rot, speed, now) => { const b = sh(g, x, y, rot, speed, now); if (b && g === s.pb) __shots.push({ speed, key: b.texture.key }); return b; }; return 1; })()`);
    await fly(t, 5000);
    const mid = await j(`({ n: __shots.length, speed: __shots.length ? __shots[0].speed : 0, key: __shots.length ? __shots[0].key : '', life: (${S}.pb.getChildren().find(b => b.active) || {}).life || 0 })`);
    await fly(t, 5000);
    const at1 = await j(`({ x: ${S}.ship.x, y: ${S}.ship.y, dead: ${S}.dead })`);
    check('the ship flew (more than 2,000 px in ten seconds)', Math.hypot(at1.x - at0.x, at1.y - at0.y) > 2000 && !at1.dead, Math.round(Math.hypot(at1.x - at0.x, at1.y - at0.y)) + ' px');
    check('shots left as the Campaign\'s mint bolts at 700 px/s, alive 1,400 ms', mid.n > 10 && mid.speed === 700 && mid.key === 'slook-shot-own' && mid.life === 1400, JSON.stringify(mid));

    console.log('D  the aim help and the kill');
    await t.ev(`(() => { const s = ${S}; s.enemies.clear(true, true); s.ship.rotation = 0; s.ship.body.setVelocity(0, 0); G.aimOff = false; window.pirateAI = () => {}; window.__p = spawnPirate(s, s.ship.x + 380, s.ship.y + 60, 'raider'); __p.hp = 1e6; __shots.length = 0; window.__dmg = []; return 1; })()`);
    await t.run(200);
    const aim = await j(`(() => { const A = ${S}.lhB && ${S}.lhB.C.cockpit.aim; return A && { id: A.id, steer: A.steer, is: ${S}.aimTarget === __p, ring: !!(${S}.lhB.view.hud.aimMark && ${S}.lhB.view.hud.aimMark.visible) }; })()`);
    check('a pirate ahead inside the cone is tracked and the mint ring is drawn', !!aim && aim.steer === true && aim.is === true && aim.ring === true, JSON.stringify(aim));
    await t.ev(`(() => { const s = ${S}, sh = s.shoot; s.shoot = (g, x, y, rot, speed, now) => { const b = sh(g, x, y, rot, speed, now); if (b && g === s.pb) setTimeout(() => __dmg.push(b.dmg), 0); return b; }; return 1; })()`);
    await fly(t, 1200, ['Space']); await t.ev(`new Promise(r => setTimeout(() => r(1), 30))`).catch(() => {}); // the guns only: the ship stands still, so the pirate stays in the cone
    const dmg = await j(`({ d: __dmg.slice(0, 3), want: Math.round(shipStat('damage') * CAMP.cockpit.aimK * 10) / 10, hurt: __p.hp < 1e6 })`);
    check('a helped shot does the Campaign\'s price of the damage, and the shots land', dmg.d.length > 0 && dmg.d.every(d => d === dmg.want) && dmg.hurt === true, JSON.stringify(dmg));
    const kill = await j(`(() => { const s = ${S}; s.killDrone(__p); const F = s.lhB.view.hud.slfx; return F ? { made: F.made, live: F.kills.length } : null; })()`);
    check('a kill draws the Campaign\'s kill effect', !!kill && kill.made >= 1 && kill.live >= 1, JSON.stringify(kill));
    await t.run(700);

    console.log('E  the page HUD');
    await t.ev(`(() => { const s = ${S}; window.__p = spawnPirate(s, s.ship.x + 300, s.ship.y, 'gunship'); return 1; })()`); await t.run(300);
    const hud = await j(`(() => { const vis = q => { const e = document.querySelector(q); return !!(e && e.getClientRects().length); }, tx = q => (document.querySelector(q) || { innerText: '' }).innerText; return { ship: vis('.ph-ship'), first: tx('.ph-first'), foes: tx('.ph-foes'), stock: vis('.ph-stock'), keyLine: ${S}.keyLine.visible }; })()`);
    check('the ship panel and the six-chip key row are on the page', hud.ship === true && ['WASD', 'Space', 'Shift', 'L', 'N', 'H'].every(k => hud.first.includes(k)) && /DOCK/i.test(hud.first), hud.first.replace(/\s+/g, ' '));
    check('Long Haul\'s key line is hidden and the Campaign\'s ore and missiles panel is not shown', hud.keyLine === false && hud.stock === false);
    check('the hostiles panel names the pirate', /1 Gunship/.test(hud.foes), hud.foes.replace(/\s+/g, ' '));
    console.log('H  Earth in the world, and the zoom keys');
    const w = await j(`(() => { const s = ${S}, e = s.lhEarth, home = spaceHomeDock(), z = camzoomScreen(s, e.x, e.y); return { sf: e.scrollFactorX, x: Math.round(e.x), y: Math.round(e.y), homeX: home.x, away: Math.round(Math.hypot(s.ship.x - home.x, s.ship.y - home.y)), onScreenX: Math.round(z.x), cam: e.cameraFilter, main: s._cz.main.id }; })()`);
    check('Earth stands in the world: scroll factor 1, where the dock put it (about 11,565, 12,720), and the flight took the ship far from it', w.sf === 1 && Math.abs(w.x - 11565) < 3 && Math.abs(w.y - 12720) < 3 && w.away > 1500, JSON.stringify(w));
    check('Earth is on the world\'s camera (it zooms with the world)', (w.cam & w.main) === 0, JSON.stringify(w));
    await t.ev(`(() => { ${S}.ship.body.setVelocity(0, 0); return CAMZOOM.want = 1; })()`);
    const press = async code => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Minus' ? '-' : '=' })); await t.run(60); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Minus' ? '-' : '=' })); await t.run(60); };
    await press('Minus'); await press('Minus');
    const z2 = await j('CAMZOOM.want');
    check('two presses of - zoom out two steps of 1.2 (the Campaign\'s)', Math.abs(z2 - 1 / 1.44) < 1e-3, String(z2));
    for (let i = 0; i < 30; i++) await press('Minus');
    await t.run(900);
    const far = await j(`({ want: CAMZOOM.want, cam: ${S}.cameras.main.zoom, min: CAMZOOM.min, label: CAMZOOM.labelMax })`);
    check('far out the view stops at 0.05 (a 25,600 by 14,400 px view), and the camera has come to it', far.want === 0.05 && far.min === 0.05 && far.label === 20 && Math.abs(far.cam - far.want) < 0.02, JSON.stringify(far));
    await t.ev(`(() => { ${S}.ship.body.reset(spaceHomeDock().x, spaceHomeDock().y); return 1; })()`); await t.run(600);
    const seen = await j(`(() => { const s = ${S}, cam = s.cameras.main, z = cam.zoom, w = cam.width / z, h = cam.height / z, vx = cam.scrollX + cam.width / 2 - w / 2, vy = cam.scrollY + cam.height / 2 - h / 2, inV = (x, y) => x > vx && x < vx + w && y > vy && y < vy + h, e = s.lhEarth, moon = sysDef().bodies.find(b => b.id === 'kepler-4b'); return { earth: inV(e.x, e.y), moon: inV(moon.x, moon.y), dock: inV(spaceHomeDock().x, spaceHomeDock().y), w: Math.round(w) }; })()`);
    check('at the home dock, zoomed out, Earth, Keel Station and the Moon are on one screen', seen.earth === true && seen.dock === true && seen.moon === true, JSON.stringify(seen));
    await press('Equal'); await press('Equal');
    const back = await j('CAMZOOM.want');
    check('= zooms back in (two presses: 0.05 to about 0.11)', back > 0.09 && back < 0.14, String(back));
    const keys = await j(`({ help: HELP.Space.some(l => /^- =\\s+zoom out and in/.test(l)), row: controlsGroup('flight').rows.some(r => r.lh) })`);
    check('the keys page lists - and = for the flight', keys.help === true && keys.row === true, JSON.stringify(keys));
    errors = errors.concat(t.errors);
  } finally { await t.close(); }
}
{ // ---- without the switch
  const { t, j } = await boot('#space');
  try {
    console.log('F  without the switch');
    await fly(t, 1000);
    const f = await j(`({ on: lhNewOn(), sys: sysDef().name, me: ${S}.ship.texture.key, panel: !!document.querySelector('.ph-ship'), keyLine: ${S}.keyLine.visible, earth: !!${S}.lhEarth, bridge: !!${S}.lhB, shot: (${S}.pb.getChildren().find(b => b.active) || { texture: {} }).texture.key })`);
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 189, nativeVirtualKeyCode: 189, code: 'Minus', key: '-' }); await t.run(60); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 189, nativeVirtualKeyCode: 189, code: 'Minus', key: '-' }); await t.run(100);
    const nz = await j(`({ want: CAMZOOM.want, min: CAMZOOM.min, earth: ${S}.lhEarth ? ${S}.lhEarth.scrollFactorX : null, help: HELP.Space.some(l => /^- =/.test(l)) })`);
    check('no switch: the - key does nothing, the zoom range is Long Haul\'s own (0.4), no Earth picture, the keys page does not list it', nz.want === 1 && nz.min === 0.4 && nz.earth === null && nz.help === false, JSON.stringify(nz));
    check('no switch: Halcyon, today\'s ship picture and shot, no panel, no bridge, the key line as it was', f.on === false && f.sys === 'Halcyon' && f.me === 'ship' && f.panel === false && f.earth === false && f.bridge === false && f.shot === 'bullet', JSON.stringify(f));
    errors = errors.concat(t.errors);
  } finally { await t.close(); }
}
console.log('G  errors');
check('the game logged no error', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(bad ? `\nLHNEW BOOT FAIL: ${bad} checks failed` : '\nLHNEW BOOT PASS');
process.exit(bad ? 1 : 0);

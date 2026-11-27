// smoke: the Long Haul's feel on the fighter he flies (L2 of flying a fighter: its own nozzles, flame and ribbons, the stick the puffs read, the boost store the flames read, the closer camera, the cruiser he left): plain Node, a stand-in scene
// Card space-game-fly-fighter-l2 (Troy, 26 Nov 2026: fly a pilot's fighter with the Long Haul's feel, the cruiser left heavy). The sim half is tests/campcockpit.mjs, the scene's keys and eye tests/campcockpitscene.mjs, the effects tests/campfeel.mjs and tests/campfeelfx.mjs.
// Pictures and the camera only: nothing here reads a number into the sim.
//   A  the fighter's look: two nozzles on the shoulders of its tail notch, a flame twice the cruiser's share of its length, the cruiser's own look unchanged
//   B  the stick and the store he flies: the puffs and the braking jets read the fighter's input, the flames its boost store, the Fast burn is the cruiser's; the cruiser he left keeps its own flame state
//   C  the camera: a closer view eased in while he holds the stick, back out on hand-back, a live number (CAMPZOOM.view.cockpit), with the feel off as well, never on a dragged view
//   D  the frame (the ship look's branch): the fighter has the feel, the cruiser he left has its own plain flames, the pictures follow a take and a hand-back, with the feel on and off
//   E  the puffs of a small ship: never under a pixel on the screen, bigger by the ship's look; the cruiser's are unchanged
//   F  the slider and the files
// Run: node tests/campcockpitfeel.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ feel: 'table', shiplook: 'table' });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).replace(/\/\/[^\n]*/g, '');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } };
  window.__gfx = () => { const o = { calls: [], blend: '', depth: 0, vis: true };
    o.clear = () => { o.calls.length = 0; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setBlendMode = b => { o.blend = b; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setScrollFactor = () => o;
    o.lineStyle = (w, c, a) => { o.calls.push(['lineStyle', w, c, a]); return o; }; o.lineBetween = (a, b, c, d) => { o.calls.push(['line', a, b, c, d]); return o; };
    o.fillStyle = (c, a) => { o.calls.push(['fillStyle', c, a]); return o; }; o.fillTriangle = (...p) => { o.calls.push(['tri', ...p]); return o; }; o.fillCircle = (x, y, r) => { o.calls.push(['disc', x, y, r]); return o; }; return o; };
  // a stand-in scene for the ship look's frame: images that remember what they were told, graphics that record, textures that exist once baked
  window.__scene = (zoom) => { const ims = [], tex = {}, o = { ims, camp: window.C, mode: 'play', hud: {}, sp: {}, msp: {}, mp: null, cameras: { main: { zoom, scrollX: 0, scrollY: 0 } }, events: { on() {}, once() {}, off() {} } };
    const mkIm = (x, y, key) => { const im = { x, y, key, vis: true, dead: false, dw: 0, dh: 0 }; im.setPosition = (a, b) => { im.x = a; im.y = b; return im; }; im.setRotation = () => im; im.setScale = () => im; im.setAlpha = () => im; im.setVisible = v => { im.vis = v; return im; };
      im.setOrigin = () => im; im.setDepth = () => im; im.setDisplaySize = (w, h) => { im.dw = w; im.dh = h; return im; }; im.setTexture = () => im; im.setBlendMode = () => im; im.destroy = () => { im.dead = true; return im; }; ims.push(im); return im; };
    o.add = { image: mkIm, graphics: () => __gfx() };
    o.make = { graphics: () => { const gr = {}; ['fillRect', 'fillCircle', 'fillTriangle', 'fillRoundedRect', 'strokeCircle', 'fillStyle', 'lineStyle'].forEach(k => { gr[k] = () => gr; }); gr.generateTexture = (key, w, h) => { tex[key] = { w, h }; return gr; }; gr.destroy = () => gr; return gr; } };
    o.textures = { exists: k => !!tex[k] }; o.tweens = { add() { throw new Error('no tweens'); } }; return o; };
  window.__mk = () => { CAMP.flags.cockpit = true; CAMP.flags.feel = true; CAMP.flags.shiplook = true; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; C.god = true; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.events.length = 0; return C; };
`);

console.log('A. the fighter\'s look');
{
  check('the fighter has its own two nozzles on the shoulders of the notch in its tail (the picture: (-0.32, 0.1), (-0.42, 0), (-0.32, -0.1)), mirrored; the cruiser keeps its two, anything else one in the middle', J(`campFeelEngines({ kind: 'fighter' })`).length === 2 && J(`campFeelEngines({ kind: 'fighter' })`).every(e => e[0] <= -0.32 && e[0] >= -0.42) && J(`campFeelEngines({ kind: 'fighter' })[0][1] + campFeelEngines({ kind: 'fighter' })[1][1]`) === 0 && J(`campFeelEngines({ kind: 'carrier' }).length`) === 2 && J(`campFeelEngines({ kind: 'skiff' }).length`) === 1);
  check('its flame and ribbon are a bigger share of a small ship: 2 times the length, 2 times the width (the Wren\'s 54 px flame on a 36 px hull is 1.5 lengths, the cruiser\'s half a length); the cruiser and anything else are 1 and 1', J(`campFeelLook({ kind: 'fighter' })`).len === 2 && J(`campFeelLook({ kind: 'fighter' })`).wid === 2 && J(`campFeelLook({ kind: 'carrier' })`).len === 1 && J(`campFeelLook({ kind: 'freighter' })`).wid === 1 && J('campFeelLook(null).len') === 1);
  const f1 = { th: 1, boost: 0, flare: 0 }, fb = { th: 1, boost: 1, flare: 0 };
  const cr = J(`campFeelFlameSize(100, ${JSON.stringify(f1)})`), cr2 = J(`campFeelFlameSize(100, ${JSON.stringify(f1)}, campFeelLook({ kind: 'carrier' }))`);
  check('the cruiser\'s flame is what it was (half its length, a tenth wide) with no look and with its own look', near(cr.len, 50) && near(cr.wid, 10) && near(cr2.len, 50) && near(cr2.wid, 10));
  const fl = J(`campFeelFlameSize(22, ${JSON.stringify(f1)}, campFeelLook({ kind: 'fighter' }))`), fbo = J(`campFeelFlameSize(22, ${JSON.stringify(fb)}, campFeelLook({ kind: 'fighter' }))`);
  check('a 22 px fighter at full thrust has a flame 22 px long and 4.4 px wide, on boost 48 px long (twice the cruiser\'s share of its length, the Wren\'s on a smaller hull)', near(fl.len, 22) && near(fl.wid, 4.4) && near(fbo.len, 22 * 1.1 * 2) && fbo.wid > fl.wid, JSON.stringify([fl, fbo]));
  check('the engines are off by the cruiser\'s own rule whatever the look: no thrust, no flame', J(`campFeelFlameSize(22, { th: 0, boost: 0, flare: 0 }, campFeelLook({ kind: 'fighter' }))`) === null);
}

console.log('B. the stick and the store he flies');
{
  g.run('__mk(); campCockpitTake(C);');
  check('the stick the effects read is the fighter\'s while he holds it, the cruiser\'s before and after, and nothing breaks for a sim with none', J('campFeelInput(C) === C.cockpit.input') && (g.run('campCockpitGive(C, "hand")'), J('campFeelInput(C) === C.input')) && J('campFeelInput(null)') && J('Object.keys(campFeelInput(null)).length') === 0);
  g.run(`campCockpitTake(C); window.fu = C.by[C.cockpit.id]; fu.x = 500; fu.y = 0; fu.rot = 0; fu.vx = 300; fu.vy = 0; window.spf = { displayWidth: 22, visible: true };`);
  g.run(`C.input.brake = false; C.cockpit.input.brake = true; window.SF = {}; window.sc = __scene(1); for (let k = 0; k < 20; k++) { C.t = 2000 + k * 16.7; campFeelDraw(sc, SF, fu, spf, C); }`);
  const brakePuffs = J('SF.fxs.puffs.length');
  g.run(`C.input.brake = true; C.cockpit.input.brake = false; window.SG = {}; window.sc2 = __scene(1); for (let k = 0; k < 20; k++) { C.t = 2000 + k * 16.7; campFeelDraw(sc2, SG, fu, spf, C); }`);
  check('the braking jets come from the fighter\'s own brake key: with the fighter\'s brake down and the cruiser\'s up there are jets, with the cruiser\'s down and the fighter\'s up there are none', brakePuffs >= 2 && J('SG.fxs.puffs.length') === 0, [brakePuffs, J('SG.fxs.puffs.length')]);
  g.run(`C.input.brake = false; C.cockpit.input.brake = false; C.nav = { on: true, fast: true }; fu.vx = 760; window.SH = {}; window.sc3 = __scene(1); for (let k = 0; k < 60; k++) { C.t = 3000 + k * 16.7; campFeelDraw(sc3, SH, fu, spf, C); }`);
  const kFighter = J('SH.fxs.k');
  g.run(`campCockpitGive(C, 'hand'); window.uc = C.carrier; uc.x = 0; uc.y = 0; uc.rot = 0; uc.vx = 300; uc.vy = 0; window.spc = { displayWidth: 100, visible: true }; C.nav = { on: true, fast: true }; window.SI = {}; window.sc4 = __scene(1); for (let k = 0; k < 60; k++) { C.t = 5000 + k * 16.7; uc.vx = 300; campFeelDraw(sc4, SI, uc, spc, C); }`);
  check('the map\'s Fast burn is the cruiser\'s: with a fighter flown it lights no streaks on him (a fast fighter and the cruiser on its burn), and with the cruiser flown it does', kFighter === 0 && J('SI.fxs.k') > 0.3, [kFighter, J('SI.fxs.k')]);
  g.run(`C.nav = null; campCockpitTake(C); C.boost.th = 1; C.boost.fx = 0.2; C.cockpit.boost.th = 0.5; C.cockpit.boost.fx = 0.9;`);
  check('the flames: the fighter\'s own store while he holds the stick, the cruiser\'s own for the cruiser he left (campFlameState with the ship asked about), the one he flies when no ship is named', near(J('campFlameState(C, C.by[C.cockpit.id]).boost'), 0.9) && near(J('campFlameState(C, C.carrier).boost'), 0.2) && near(J('campFlameState(C).boost'), 0.9) && near(J('campFlameState(C, C.carrier).th'), 1));
  g.run(`campCockpitGive(C, 'hand');`);
  check('after the hand-back both are the cruiser\'s', near(J('campFlameState(C).boost'), 0.2) && near(J('campFlameState(C, C.carrier).boost'), 0.2));
}

console.log('C. the camera');
{
  g.run(`
    window.__camScene = () => { const lerp = { x: 0.12, y: 0.12, set(a, b) { lerp.x = a; lerp.y = b; } }; const cz = { base: 1, out: 1, cur: 1, anchor: null };
      return { _cz: cz, cameras: { main: { zoom: 1, _follow: {}, lerp } }, camp: { boost: { on: false }, cockpit: null }, game: { loop: { delta: 16.7 } }, dead: false, leaving: false }; };
    window.__run = (s, frames, boosting) => { for (let k = 0; k < frames; k++) { s.camp.boost.on = !!boosting; campFeelCamera(s); s._cz.out = s.cameras.main.zoom = s._cz.base; } };
    CAMP.flags.cockpit = true; CAMP.flags.feel = true; CAMPZOOM.view.cockpit = 3; window.cs = __camScene();
  `);
  check('the table\'s number is 3 times closer: the start zoom (0.335) times 3 is 1.0, the Long Haul\'s own view', J('CAMPZOOM.view.cockpit') === 3 && near(J('campZoomDefault() * CAMPZOOM.view.cockpit'), 1.0, 0.01), J('campZoomDefault()'));
  g.run(`__run(cs, 120, false);`);
  check('before he takes the stick the view is the plain one: the base zoom is 1, the lerp 0.12, the share 0', J('cs._cz.base') === 1 && J('cs.cameras.main.lerp.x') === 0.12 && J('cs.feel.cz') === 0);
  g.run(`cs.camp.cockpit = { id: 'x', boost: { on: false } }; __run(cs, 15, false);`);
  const mid = J('cs._cz.base');
  g.run(`__run(cs, 120, false);`);
  check('he takes the stick: the view eases in (a quarter second in, it is part of the way, and stops short of the end), and two seconds on it is exactly 3 times closer', mid > 1.2 && mid < 2.8 && J('cs._cz.base') === 3 && J('cs.feel.cz') === 1, [mid, J('cs._cz.base')]);
  g.run(`cs.camp.cockpit = null; __run(cs, 12, false);`);
  const back = J('cs._cz.base');
  g.run(`__run(cs, 150, false);`);
  check('he hands it back (or the fighter is lost): it eases out and lands on exactly 1 again, with nothing left on the camera', back > 1.2 && back < 3 && J('cs._cz.base') === 1 && J('cs.feel.cz') === 0 && J('cs.cameras.main.lerp.x') === 0.12, back);
  g.run(`cs.camp.cockpit = { id: 'x', boost: { on: false } }; CAMPZOOM.view.cockpit = 2; __run(cs, 200, false);`);
  const two = J('cs._cz.base');
  g.run(`CAMPZOOM.view.cockpit = 1; __run(cs, 5, false);`);
  check('the number is live: at 2 the view is twice as close, at 1 (the slider\'s least) it is not closer at all, with no jump (it is read every frame)', two === 2 && J('cs._cz.base') === 1, two);
  g.run(`CAMPZOOM.view.cockpit = 3; __run(cs, 200, false);`);
  g.run(`CAMP.flags.feel = false; cs.camp.cockpit = null; __run(cs, 200, false); cs.camp.cockpit = { id: 'x', boost: { on: false } }; __run(cs, 200, false);`);
  check('with the feel off the closer view is still his (it is the cockpit\'s, not the feel\'s)', J('cs._cz.base') === 3);
  g.run(`CAMP.flags.feel = true; window.cs2 = __camScene(); cs2.camp.cockpit = { id: 'x', boost: { on: false } }; cs2._cz.anchor = { wx: 0, wy: 0, sx: 0, sy: 0 }; __run(cs2, 120, false);`);
  check('a dragged view (a zoom about a point) is not moved by it, a dead cruiser or a leaving scene neither', J('cs2._cz.base') === 1 && (g.run(`window.cs3 = __camScene(); cs3.camp.cockpit = { id: 'x', boost: { on: false } }; cs3.dead = true; __run(cs3, 120, false);`), J('cs3._cz.base') === 1));
  g.run(`CAMP.flags.cockpit = false; window.cs4 = __camScene(); cs4.camp.cockpit = { id: 'x', boost: { on: false } }; __run(cs4, 120, false); CAMP.flags.cockpit = true;`);
  check('with the cockpit switch off nothing changes even if a state is there', J('cs4._cz.base') === 1);
  g.run(`window.cs5 = __camScene(); cs5.camp.cockpit = { id: 'x', boost: { on: true } }; __run(cs5, 200, true);`);
  check('boosting in the fighter multiplies the boost\'s slight zoom-out into the closer view (3 times 0.9), and the lerp is the boost\'s 0.07', near(J('cs5._cz.base'), 2.7, 0.01) && near(J('cs5.cameras.main.lerp.x'), 0.07, 0.003), J('cs5._cz.base'));
  g.run(`window.cs6 = __camScene(); cs6.camp.cockpit = { id: 'x', boost: { on: false } }; cs6._cz.base = 0.6; for (let k = 0; k < 60; k++) campFeelCamera(cs6);`);
  check('when something else has moved the base zoom the cockpit waits like the rest of the feel: it never writes over another\'s value', J('cs6._cz.base') === 0.6);
}

console.log('D. the frame: the ship he flies has the feel, the cruiser he left its own flames');
{
  g.run(`__mk(); campCockpitTake(C); window.fu = C.by[C.cockpit.id]; window.cu = C.carrier; fu.x = 800; fu.y = 100; fu.rot = 0; fu.vx = 400; fu.vy = 0; cu.vx = 120; cu.vy = 0; cu.rot = 0;
    C.t = 3000; C.cockpit.boost.th = 1; C.cockpit.boost.fx = 0; C.boost.th = 1; C.boost.fx = 0;
    window.S = __scene(1); C.ships.forEach(u => { S.sp[u.id] = { displayWidth: u === cu ? 100 : u === fu ? 22 : 30, visible: true }; });`);
  const frame = (k) => g.run(`for (let i = 0; i < ${k}; i++) { C.t += 16.7; fu.x += 6; cu.x += 2; slookFxFrame(S); }`);
  frame(20);
  const fx = () => J('S.hud.slfx'), vis = key => J(`(S.hud.slfx.${key} || []).filter(i => i.vis).length`);
  check('feel on, the fighter flown: the feel is drawn on HIM (two ribbons, one for each engine of its picture) and not on the cruiser; his plain flames are not shown', J('S.hud.slfx.feelId') === J('fu.id') && J('S.hud.slfx.feelR.rib.length') === 2 && J('S.hud.slfx.feelR.rib.every(r => r.length > 3)') && vis('eyeFlames') === 0);
  check('the cruiser he left has its own two plain flames lit (the autopilot\'s engines are not dark), and no plain trail while they are drawn', vis('flames') === 2 && J('(S.hud.slfx.trails[cu.id] || { vis: false }).vis') === false);
  const L = J('S.hud.slfx.feelG.calls.filter(c => c[0] === "tri").length');
  check('the flames of the fighter are the layers of the feel (glow, plume, core, for both engines)', L === 6, L);
  g.run(`campCockpitGive(C, 'hand'); fu.vx = 400;`); frame(20);
  check('handed back: the feel is on the cruiser again (two ribbons, its own history), its plain flames are hidden, and the fighter\'s are gone from the screen', J('S.hud.slfx.feelId') === J('cu.id') && J('S.hud.slfx.feelR.rib.length') === 2 && vis('flames') === 0 && vis('eyeFlames') === 0);
  g.run(`campCockpitTake(C, fu.id); C.cockpit.boost.th = 1; CAMP.flags.feel = false;`); frame(5);
  check('feel off, the fighter flown: the plain look draws HIS two flames (at his own nozzles, in the pool of his own) and the cruiser\'s two besides, nothing of the feel is shown', vis('eyeFlames') === 2 && vis('flames') === 2 && J('S.hud.slfx.feelG.vis') === false);
  const ef = J('S.hud.slfx.eyeFlames.map(i => [i.x, i.y])'), fw = J('S.sp[fu.id].displayWidth');
  check('and those flames are at the fighter\'s nozzles (8.4 px behind it, 1.5 px each side), not at the cruiser\'s table scaled down', ef.length === 2 && ef.every(p => near(p[0], J('fu.x') - 0.38 * fw, 0.01)) && near(Math.abs(ef[0][1] - ef[1][1]), 0.14 * fw, 0.01), JSON.stringify(ef));
  g.run(`campCockpitGive(C, 'hand');`); frame(3);
  check('feel off and handed back: his plain flames are hidden again, the cruiser\'s are shown', vis('eyeFlames') === 0 && vis('flames') === 2);
  g.run(`CAMP.flags.feel = true; campCockpitTake(C, fu.id); C.cockpit.boost.th = 1;`); frame(5); g.run(`fu.hp = 0; C.events.length = 0;`); frame(3);
  check('the fighter lost: nothing of his is left on the screen (the history is dropped with the ship), the feel is back on the cruiser', vis('eyeFlames') === 0 && J('S.hud.slfx.feelId') === J('cu.id'));
}

console.log('E. the puffs of a small ship');
{
  g.run(`window.PF = (z, sk) => { const F = campFxNew(); const u = { x: 0, y: 0, rot: 0, vx: 0, vy: 0, hp: 50, maxHp: 50 }; for (let k = 0; k < 40; k++) { u.rot += 3 * 0.0167; campFxEmitPuffs(F, u, { turn: 1 }, 22, k * 16.7, 16.7, z, sk); } return F.puffs.map(p => p.r0); };`);
  const plain = J('PF()'), floor = J('PF(1, 1)'), big = J('PF(1, 2)'), far = J('PF(0.2, 1)');
  check('with no zoom and no ship look the puffs are what they were (2 percent of the length, up to twice that on a hard turn)', plain.length > 0 && plain.every(r => r <= 22 * 0.02 * 2 + 1e-9 && r >= 22 * 0.02 - 1e-9));
  check('a 22 px ship\'s puffs are never under a pixel on the screen (r 1 at zoom 1, 5 at zoom 0.2), and its own look makes them bigger (twice at the same turn)', floor.every(r => r >= 1 - 1e-9) && far.every(r => r >= 5 - 1e-9) && Math.max(...big) > Math.max(...floor) && Math.max(...big) <= 22 * 0.02 * 2 * 2 + 1e-9);
  check('the cruiser is untouched by the floor at its own sizes (a 100 px hull: 2 px, over the pixel at zoom 1)', (g.run(`window.PC = (() => { const F = campFxNew(); const u = { x: 0, y: 0, rot: 0, vx: 0, vy: 0, hp: 50, maxHp: 50 }; for (let k = 0; k < 40; k++) { u.rot += 3 * 0.0167; campFxEmitPuffs(F, u, { turn: 1 }, 100, k * 16.7, 16.7, 1, 1); } return F.puffs.map(p => p.r0); })();`), J('PC.every(r => r >= 100 * 0.02 - 1e-9 && r <= 100 * 0.02 * 2 + 1e-9)')));
}

console.log('F. the slider and the files');
{
  const row = J(`CAMP_TUNE.rows.find(r => r.id === 'cockpitzoom')`);
  check('the zoom has a live row in the tuning panel (the view group, CAMPZOOM view.cockpit, 1 to 5, felt at once) and a word for it', row && row.root === 'CAMPZOOM' && row.path === 'view.cockpit' && row.group === 'view' && row.when === 'now' && row.min === 1 && row.max === 5 && J(`uiText('camp.ui.tune.row.cockpitzoom')`) === 'Cockpit zoom');
  g.run(`campTuneResetAll(); campTuneSet('cockpitzoom', 2);`);
  check('the row changes the number the camera reads (and resets to 3)', J('CAMPZOOM.view.cockpit') === 2 && J('campFeelCockpitK(1)') === 2 && (g.run(`campTuneResetAll();`), J('CAMPZOOM.view.cockpit') === 3 && near(J('campFeelCockpitK(1)'), 3) && near(J('campFeelCockpitK(0.5)'), Math.sqrt(3)) && J('campFeelCockpitK(0)') === 1));
  check('the fighter\'s look, the stick and the closer view are the Campaign\'s own: no Math.random in the files, the Long Haul\'s camera and ship files are not named by code here, and no gold, amber or pink in the look', !/Math\.random/.test(code('src/campfeel.js')) && !/Math\.random/.test(code('src/campfeelfx.js')) && !/\b(shipsFrame|shipsFlame|shipsOne|camzoomFrame|camzoomCompose|camzoomBase)\s*\(/.test(code('src/campfeel.js')) && !/0x(ffc857|ffa83a|ffd37a|ff6fa8|ff4d6d|ffa040)/i.test(code('src/campfeel.js') + code('src/campfeelfx.js')));
  check('the pictures take their ship from campFeelShip, the stick from campFeelInput, the look from campFeelLook: nothing in them names the cruiser as the ship he flies', /campFeelInput\(C\)/.test(src('src/campfeelfx.js')) && /campFeelLook\(u\)/.test(src('src/campfeel.js')) && !/C\.input/.test(code('src/campfeelfx.js').replace(/campFeelInput\(C\) : C\.input \|\| \{\}/, '')));
}

if (failed) { console.log(`\nFAILED ${failed} of ${n}`); process.exit(1); }
console.log(`\nCAMP COCKPIT FEEL PASS (${n} checks)`);

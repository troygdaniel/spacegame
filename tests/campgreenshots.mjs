// smoke: in the Campaign the Earth side's shots (the cruiser's turrets and the three pilots) are green, a texture of their own; the pirates stay amber, the aliens red, the patrols cyan; the Long Haul keeps its own bullet (plain Node, no Chrome)
// Card space-game-fleet-lasers-green (ORCH). The picture is the scene's (src/campaignscene.js: CAMP_SHOT, campShotTextures, the bullet line of sync()); what a shot IS (its team) is the sim's (src/campaign.js: campBullet).
//   A. who fires green: a turret's shot and a pilot's shot are team earth, and nobody else's is
//   B. the colours: CAMP_SHOT has a green of its own (the wing's green of the Tab map), clear of the cyan, the amber and the red
//   C. the scene: the Earth team gets 'shot-earth' (made once, 14 by 4, with the other two), no amber tint on the turrets' shots, the beam keeps its tint, the other teams as they were
//   D. the Long Haul and the Tab map: the game's own 'bullet' (boot.js) and the map's wing green are as they were
// Run: node tests/campgreenshots.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 160) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(); belt(g);
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };

// ---------- A. who fires green ----------
console.log('A. who fires green');
{
  // the cruiser holds fire at a still raider east of it for 2 s: every bullet in the air is a turret's; the shots seen are collected as they leave
  g.run(`window.__seen = (setup) => { const C = campNew(11, [], { seed: 1 }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier }; const c = C.carrier; c.x = 0; c.y = 0; c.rot = 0; c.vx = 0; c.vy = 0; C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(cv => { cv.started = true; }); C.motherSpawn = 1e12;
    const out = setup(C); const seen = []; for (let i = 0; i < 120; i++) { C.input.fire = true; if (out.hold) out.hold(); campStep(C, 1 / 30); C.events.length = 0; C.bullets.forEach(b => { if (seen.indexOf(b) < 0) seen.push(b); }); } return seen.map(b => ({ team: b.team, pd: !!b.pd, beam: !!b.beam, fac: b.fac || '' })); };`);
  const turret = J(`__seen(C => { const t = campSpawn(C, 'raider', 300, 0); t.hp = t.maxHp = 1e6; t.vmax = 0; t.accel = 0; t.nextShot = 1e12; t.fixed = true; return { hold: () => { t.x = 300; t.y = 0; t.vx = 0; t.vy = 0; t.nextShot = 1e12; } }; })`);
  check('the cruiser\'s turret shots are team earth and pd (what the scene draws green)', turret.length >= 5 && turret.every(b => b.team === 'earth' && b.pd), JSON.stringify(turret.slice(0, 3)));
  const wing = J(`(() => { const C = campNew(11, [], { seed: 1 }); const f = C.ships.find(u => u.team === 'earth' && u.kind !== 'carrier' && u.kind !== 'convoy' && u.kind !== 'hauler'); if (!f) return null; const sh = campBullet; const seen = []; campBullet = function (C2, from, rot, speed, dmg, life, team, ahead, extra) { const b = sh.apply(null, arguments); if (from.id === f.id) seen.push({ team: b.team, pd: !!b.pd, beam: !!b.beam, fac: b.fac || '' }); return b; }; const t = campSpawn(C, 'raider', f.x + 260, f.y); t.hp = t.maxHp = 1e6; t.vmax = 0; t.accel = 0; t.nextShot = 1e12; t.fixed = true; f.hold = true; for (let i = 0; i < 150 && seen.length < 3; i++) { f.x = f.x; t.x = f.x + 260; t.y = f.y; t.vx = t.vy = 0; t.nextShot = 1e12; campStep(C, 1 / 30); C.events.length = 0; } campBullet = sh; return seen; })()`);
  check('a pilot\'s shots are team earth, no pd (the scene draws them green too)', Array.isArray(wing) && wing.length >= 1 && wing.every(b => b.team === 'earth' && !b.pd && b.fac === ''), JSON.stringify(wing));
  const src1 = src('src/campaign.js');
  check('only two places fire as the Earth team in the sim: the turrets (pd) and the wing\'s gun (campBullet(..., \'earth\', ...) twice in src/campaign.js)', (src1.match(/campBullet\([^\n]*'earth'/g) || []).length === 2);
  check('the pirates, the patrols and the aliens fire as their own sides (alien, neutral): nothing else shoots as earth', ['src/camppirates.js', 'src/camprival.js'].every(f => !/campBullet\([^\n]*'earth'/.test(src(f))) && (src1.match(/campBullet\([^\n]*'alien'/g) || []).length >= 4);
}

// ---------- B. the colours ----------
console.log('B. the colours');
{
  const col = J('CAMP_SHOT'), e = hsv(col.earth), p = hsv(col.pirate), nt = hsv(col.neutral);
  check('CAMP_SHOT has a green of its own: earth', typeof col.earth === 'number' && Object.keys(col).sort().join() === 'earth,neutral,pirate', JSON.stringify(col));
  check('it is green: hue 110 to 160, bright and clear of grey', e.h >= 110 && e.h <= 160 && e.s > 0.5 && e.v > 0.8, JSON.stringify(e));
  check('it is clear of the patrol\'s cyan (25 degrees of hue or more) and of the pirate\'s amber (hue far from 25 to 45)', nt.h - e.h >= 25 && Math.abs(p.h - e.h) > 60, JSON.stringify({ e, nt, p }));
  check('the pirates stay amber, the patrols cyan (card space-game-l1-pirate-shot-colour)', col.pirate === 0xffa83a && col.neutral === 0x7fe9ff);
  check('it is the wing\'s green of the Tab map, so the picture and the map agree', col.earth === J('CAMPMAP.color.wing'));
}

// ---------- C. the scene ----------
console.log('C. the scene');
{
  const sc = src('src/campaignscene.js');
  check('the scene picks the Earth side\'s texture by team: shot-earth; the other three as they were', /setTexture\(b\.team === 'earth' \? 'shot-earth' : b\.team === 'neutral' \? 'shot-neutral' : b\.fac === 'pirate' \? 'shot-pirate' : 'ebullet'\)/.test(sc));
  check('no amber tint on a turret shot (it would turn the green); the beam tech keeps its cyan tint; a plain shot is cleared', !/b\.pd\) im\.setTint\(0xffd37a\)/.test(sc) && /if \(b\.beam\) im\.setTint\(0x7fe9ff\); else im\.clearTint\(\);/.test(sc));
  const tex = J(`(() => { const made = {}; const sc = { textures: { exists: k => !!made[k] }, make: { graphics: () => { let fill = 0; const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = { w, h, fill }; } : n === 'fillStyle' ? c => { fill = c; return g; } : () => g }); return g; } } }; campShotTextures(sc); campShotTextures(sc); return made })()`);
  check('campShotTextures makes shot-earth in the green, 14 by 4, once, beside shot-pirate and shot-neutral', tex['shot-earth'] && tex['shot-earth'].w === 14 && tex['shot-earth'].h === 4 && tex['shot-earth'].fill === J('CAMP_SHOT.earth') && Object.keys(tex).sort().join() === 'shot-earth,shot-neutral,shot-pirate', JSON.stringify(tex));
}

// ---------- D. the Long Haul and the map ----------
console.log('D. the Long Haul and the map');
{
  const boot = src('src/boot.js'), sp = src('src/space.js'), fire = src('src/campmapfire.js');
  check('the game\'s own bullet is as it was (pale yellow 0xfff1a8, 14 by 4) and the Long Haul still fires it: boot.js unchanged, space.js\' group keyed \'bullet\'', /mk\('bullet', 14, 4, g => \{ g\.fillStyle\(0xfff1a8, 1\)/.test(boot) && /defaultKey: 'bullet', maxSize: 60/.test(sp));
  check('the Long Haul has no word of the new texture (shot-earth lives in the Campaign scene only)', !/shot-earth/.test(boot) && !/shot-earth/.test(sp) && !/shot-earth/.test(src('src/surface.js')) && !/shot-earth/.test(src('src/traffic.js')));
  check('the Tab map already draws the wing\'s shots in its green (K.wing) and the beam in cyan: not changed', /b\.team === 'earth' \? \(b\.beam \? K\.beam : K\.wing\)/.test(fire));
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nAll ${n} checks passed`);
process.exit(failed ? 1 : 0);

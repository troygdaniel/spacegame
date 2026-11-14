// The proof set in markdown (card space-game-m4-proof, docs/MODDING.md sections 8 and 10): the raider and drone, the rescue call, JUNO and
// nine ship part tiers (shields, weapons, engine) live in content/*.md, and the code tables in enemies.js, missions.js, shop.js, data_parts.js
// and hud.js read them through the adapters in src/contenttables.js. Each case runs the real game in headless Chrome from a throwaway COPY of this
// folder with its own content.generated.js, then reads the tables the game plays from:
//   A  the shipped pack          the game plays on what the files say
//   B  an empty pack             the game plays on the code's own tables (the defaults)
//      A equals B, field by field: each file applied over its default changes nothing (the two tables must never drift)
//   C  a copy with edited files  exactly what each edited line says changes, and nothing else (and the Title says MODDED)
//   D  wrong files               a part in the wrong slot, a call of another kind and so on are refused with a message; the tables stay as they were
// Run: node tests/contentproof.mjs     (four games, one Chrome at a time; about a minute)
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deepStrictEqual } from 'node:assert';
import { build } from '../tools/build-content.mjs';
import { launch, sleep } from './cdp.mjs';
import { copyGame, ROOT } from './gamecopy.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const same = (name, a, b) => { let ok = true, detail = ''; try { deepStrictEqual(a, b); } catch (e) { ok = false; detail = String(e.message).split('\n').slice(0, 14).join(' | ').slice(0, 900); } check(name, ok, detail); };

// everything the proof set reaches, read from the running game. G is put back as it was.
const SNAP = `(() => {
  const keep = { mission: G.mission, missionId: G.missionId, progress: G.missionProgress, credits: G.credits, parts: Object.assign({}, activeShip().parts) };
  const plain = o => JSON.parse(JSON.stringify(o));
  const out = { ships: { raider: plain(PIRATES.raider), drone: plain(PIRATES.drone), gunship: plain(PIRATES.gunship) } };
  const m = MISSIONS.find(x => x.id === 'rescue');
  G.missionId = 'rescue'; G.missionProgress = 0;
  out.mission = {
    title: m.title, where: m.where, reward: m.reward, count: m.count === undefined ? null : m.count, offer: m.offer, deathMsg: m.deathMsg,
    line: ['accepted', 'rescued', 'failed'].map(st => m.line(st)), progress: ['accepted', 'rescued'].map(st => { G.mission = st; return m.progress(); }),
    steps: HUD_MISSIONS.rescue.steps.map(t => typeof t === 'function' ? t() : t),
    hud: ['accepted', 'rescued'].map(st => { G.mission = st; const h = hudMission({}, 'Space'); return { cur: h.cur, next: h.next, steps: h.steps.map(x => x.text + '/' + x.state) }; })
  };
  const j = NPCS.find(x => x.id === 'juno'), react = [];
  ['none', 'accepted', 'failed'].forEach(ms => [0, 1].forEach(arm => [0, 900].forEach(cr => { G.mission = ms; activeShip().parts.shields = arm; G.credits = cr; react.push(j.react()); })));
  out.npc = { name: j.name, role: j.role, color: j.color, css: j.css, x: j.x, y: j.y, face: j.face, voice: j.voice, persona: j.persona, lines: j.lines.slice(), sprite: j.sprite === undefined ? null : j.sprite, react };
  const rec = t => ({ model: 'wren', parts: { shields: t, weapons: t, engine: t, tank: t, cargo: t } }), tiers = [0, 1, 2, 3];
  const stats = {};
  ['vmax', 'boost', 'range', 'tank', 'hold', 'shieldMax', 'shieldRegen', 'shieldDelay', 'fireDelay', 'damage', 'boostTank', 'boostRegen'].forEach(nm => { stats[nm] = tiers.map(t => shipStat(nm, rec(t))); });
  const fit = tiers.map(t => { const r = activeShip(), was = Object.assign({}, r.parts); Object.assign(r.parts, { weapons: t, engine: t }); const v = { fire: fireDelay(), boost: boostEnergy(), top: boostMax() }; Object.assign(r.parts, was); return v; });
  out.parts = { parts: plain(PARTS), stats, fit };
  G.mission = keep.mission; G.missionId = keep.missionId; G.missionProgress = keep.progress; G.credits = keep.credits;
  Object.assign(activeShip().parts, keep.parts);
  return JSON.stringify(out);
})()`;

// dock with the colonist aboard and see what the Station scene pays
async function payout(t) {
  await t.ev(`(() => { G.mission = 'rescued'; G.missionId = 'rescue'; window.__c0 = G.credits; game.scene.stop('Title'); game.scene.start('Station', { arrive: true }); })()`);
  await t.waitFor(`game.scene.isActive('Station')`, 15000, 'Station active');
  await sleep(300);
  return t.ev(`G.credits - window.__c0`);
}

async function play(root) { // open the copy at Title; what the loader said, the tables, what docking pays
  const t = await launch('', root);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'Title active');
    await sleep(500);
    const loader = JSON.parse(await t.ev(`JSON.stringify({ errors: CONTENT_ERRORS.map(e => e.level + '|' + e.path + '|' + e.message), state: CONTENT_STATE })`));
    const snap = JSON.parse(await t.ev(SNAP));
    const pay = await payout(t);
    return { loader, snap, pay, errors: t.errors.slice() };
  } finally { await t.close(); }
}

const tmp = [];
const mkdir = tag => { const d = mkdtempSync(join(tmpdir(), `longhaul-${tag}-${process.pid}-`)); tmp.push(d); return d; };
const gameWith = (contentDir, core) => { // a game copy whose content.generated.js is built from contentDir
  const g = copyGame('proof'); tmp.push(g);
  const made = build({ dir: contentDir, prefix: 'content/', out: join(g, 'content.generated.js'), write: true, core });
  return { dir: g, made };
};
const realCore = /\bcore:\s*"([0-9a-f]+)"/.exec(readFileSync(join(ROOT, 'content.generated.js'), 'utf8'))[1];

// the edits for case C: [file, [[old text, new text]]]; each old text must occur once
const EDITS = [
  ['ships/raider.md', [['hp: 20', 'hp: 22'], ['bounty: 45', 'bounty: 47'], ['radar: #ff6b8a', 'radar: green'], ['shot: [550, 950]', 'shot: [500, 900]'], ['strafe: yes', 'strafe: no']]],
  ['ships/drone.md', [['fireRange: 650', 'fireRange: 700']]],
  ['missions/rescue.md', [['reward: 500', 'reward: 650'], ['title: Rescue call', 'title: Rescue run'],
    ['active: Rescue the colonist on Kepler-4b', 'active: Bring them home from Kepler-4b for {reward} cr'],
    ['bring them back alive.', 'bring them back alive. Done: {progress}.'],
    ['- Escort them to your ship\n- Dock at Halcyon Station', '- Dock and collect {reward} cr'],
    ['Mission failed.', 'Mission lost.']]],
  ['npcs/juno.md', [['color: amber', 'color: cyan'], ['x: 255', 'x: 260'], ['- Welcome to the Drift.', '- Welcome aboard the Drift.'],
    ['| upgrade:shields | Nice shielding on that ship.', '| upgrade:shields | Shiny shielding on that ship.'], ['Manner: warm,', 'Manner: cheerful,']]],
  ['parts/shields-1.md', [['price: 300', 'price: 310'], ['points: 25', 'points: 30'], ['name: LIGHT SHIELD', 'name: LITE SHIELD']]],
  ['parts/weapons-1.md', [['delay: 100', 'delay: 90']]],
  ['parts/engine-1.md', [['speedPct: 8', 'speedPct: 10'], ['jump: 1', 'jump: 2'], ['boostAdd: 200', 'boostAdd: 210'], ['boostTank: 130', 'boostTank: 140']]],
  ['parts/engine-2.md', [['name: TWIN NOZZLES', 'name: TWIN NOZZLES MK2']]]
];

try {
  // ---- A: the shipped pack, B: nothing at all ----
  console.log('A: the shipped pack');
  const A = await play(ROOT);
  check('the loader applied the twenty-seven files (proof set, eight systems, six stations), no problems, not MODDED', A.loader.errors.length === 0 && A.loader.state.applied.length === 27 && A.loader.state.modded === false, JSON.stringify(A.loader));
  check('no console errors', A.errors.length === 0, A.errors.join(' | '));

  console.log('B: an empty pack (the code\'s own tables)');
  const empty = mkdir('empty'); mkdirSync(join(empty, 'content'));
  const B = await play(gameWith(join(empty, 'content')).dir);
  check('the loader applied nothing and listed no problems', B.loader.state.applied.length === 0 && B.loader.errors.length === 0, JSON.stringify(B.loader));
  check('no console errors', B.errors.length === 0, B.errors.join(' | '));

  console.log('the files over their defaults change nothing');
  same('the pirates: raider, drone and gunship (every number, the radar colour, the shot window)', A.snap.ships, B.snap.ships);
  same('the rescue call: title, place, reward, offer, the three board lines, both progress texts, the failure line, the checklist', A.snap.mission, B.snap.mission);
  same('JUNO: look, place, voice, persona, her three lines and every reaction in 12 situations', A.snap.npc, B.snap.npc);
  same('the parts: every name, short form, text, price and number of the five slots, and what a Wren gets from them at tiers 0 to 3', A.snap.parts, B.snap.parts);
  check('docking with the colonist pays the same, 500 cr', A.pay === 500 && B.pay === 500, A.pay + ' / ' + B.pay);
  check('and the defaults really are what the game has always had', B.snap.mission.reward === 500 && B.snap.ships.raider.hp === 20 && B.snap.parts.stats.fireDelay.join() === '160,100,70,50' && B.snap.parts.stats.boost.join() === '800,1000,1150,1300' && B.snap.parts.stats.shieldMax.join() === '0,25,50,85' && B.snap.parts.stats.vmax.join() === '480,518,557,600');

  // ---- C: edit the files, change exactly that ----
  console.log('C: a copy of the game with edited files');
  const pack = mkdir('edited'); cpSync(join(ROOT, 'content'), join(pack, 'content'), { recursive: true });
  for (const [rel, pairs] of EDITS) {
    const f = join(pack, 'content', rel); let s = readFileSync(f, 'utf8');
    for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(rel + ': "' + a + '" must occur exactly once'); s = s.replace(a, () => b); }
    writeFileSync(f, s);
  }
  writeFileSync(join(pack, 'content/parts/tank-1.md'), '---\ntype: part\nslot: tank\ntier: 1\nname: EXTRA TANK\nfuelMult: 1.3\n---\nfuel capacity x1.3\n');
  writeFileSync(join(pack, 'content/parts/cargo-1.md'), '---\ntype: part\nslot: cargo\ntier: 1\nname: EXTRA HOLD\nholdPlus: 5\n---\nhold +5 ore\n');
  const cg = gameWith(join(pack, 'content'), realCore);
  check('the edited pack builds with no problems', cg.made.result.errors.length === 0, JSON.stringify(cg.made.result.errors));
  const C = await play(cg.dir);
  check('the loader applied the twenty-nine files (the proof set, a tank and a hold part, eight systems, six stations) and the Title would say MODDED', C.loader.errors.length === 0 && C.loader.state.applied.length === 29 && C.loader.state.modded === true, JSON.stringify(C.loader));
  check('no console errors', C.errors.length === 0, C.errors.join(' | '));
  const want = JSON.parse(JSON.stringify(A.snap)); // what A says, with exactly the edited lines changed
  Object.assign(want.ships.raider, { hp: 22, bounty: 47, radar: 0x6dff9c, shot: [500, 900], strafe: false });
  want.ships.drone.range = 700;
  Object.assign(want.mission, {
    title: 'Rescue run', reward: 650, steps: ['Take the rescue call', 'Find the colonist', 'Dock and collect 650 cr'],
    progress: ['Find the colonist on Kepler-4b and\nbring them back alive. Done: 0.', want.mission.progress[1]],
    line: ['Bring them home from Kepler-4b for 650 cr', want.mission.line[1], want.mission.line[2]], deathMsg: 'Ship destroyed. The colonist was lost. Mission lost.'
  });
  want.mission.hud = [ // three steps now: the checklist never points past the last, and the hint still follows the code's own step number
    { cur: 1, next: A.snap.mission.hud[0].next, steps: ['Take the rescue call/done', 'Find the colonist/cur', 'Dock and collect 650 cr/todo'] },
    { cur: 2, next: A.snap.mission.hud[1].next, steps: ['Take the rescue call/done', 'Find the colonist/done', 'Dock and collect 650 cr/cur'] }];
  Object.assign(want.npc, { color: 0x38e1ff, css: '#38e1ff', x: 260, persona: A.snap.npc.persona.replace('Manner: warm,', 'Manner: cheerful,') });
  want.npc.lines[0] = want.npc.lines[0].replace('Welcome to the Drift.', 'Welcome aboard the Drift.');
  want.npc.react = want.npc.react.map(r => r && r.replace('Nice shielding', 'Shiny shielding'));
  const wp = want.parts, P = wp.parts; // the parts: tier 1 of shields, weapons and engine edited, tier 2 of the engine renamed, a tank and a hold part added
  P.shields.prices[0] = 310; P.shields.pts[1] = 30; P.shields.tiers[0] = 'LITE SHIELD'; P.weapons.delay[1] = 90;
  Object.assign(P.engine, { speed: [1, 1.1, 1.16, 1.25], range: [0, 2, 2, 3], boost: [0, 210, 350, 500], tank: [100, 140, 165, 200] }); P.engine.tiers[1] = 'TWIN NOZZLES MK2';
  P.tank.mul[1] = 1.3; P.tank.descs[0] = 'fuel capacity x1.3'; P.cargo.add[1] = 5; P.cargo.descs[0] = 'hold +5 ore';
  Object.assign(wp.stats.vmax, { 1: Math.round(480 * 1.1) }); wp.stats.boost[1] = 800 + 210; wp.stats.range[1] = 8 + 2; wp.stats.tank[1] = Math.round(40 * 1.3); wp.stats.hold[1] = 10 + 5;
  wp.stats.shieldMax[1] = 30; wp.stats.fireDelay[1] = 90; wp.stats.boostTank[1] = 140;
  wp.fit[1] = { fire: 90, boost: { max: 140, regen: 24 }, top: 1010 };
  same('the pirates changed exactly as the raider and drone files say', C.snap.ships, want.ships);
  same('the rescue call changed exactly as its file says (title, reward, board line with {reward}, progress with {progress}, a shorter checklist, failure line)', C.snap.mission, want.mission);
  same('JUNO changed exactly as her file says (colour, place, first line, one reaction, persona)', C.snap.npc, want.npc);
  same('the parts changed exactly as the part files say (a price, shield points, a name, the fire delay, the engine speed, jump, boost and tank, a fuel tank and a hold)', C.snap.parts, want.parts);
  check('docking with the colonist pays the edited reward, 650 cr', C.pay === 650, String(C.pay));

  // ---- D: files that disagree with the code are refused, the tables stay ----
  console.log('D: files that disagree with the code');
  const wrong = mkdir('wrong'), put = (rel, text) => { const f = join(wrong, 'content', rel); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
  put('parts/shields-1.md', '---\ntype: part\nslot: engine\ntier: 1\nname: LIGHT SHIELD\nprice: 1\npoints: 99\n---\nWrong slot.\n');
  put('parts/weapons-2.md', '---\ntype: part\nslot: weapons\ntier: 1\nname: RAPID FIRE II\nprice: 1\ndelay: 20\n---\nTier does not match the file name.\n');
  put('parts/engine-4.md', '---\ntype: part\nslot: engine\ntier: 3\nname: BOOSTED\nprice: 1\n---\nThere is no fourth tier.\n');
  put('parts/booster-1.md', '---\ntype: part\nslot: engine\ntier: 1\nname: BOOSTER\nprice: 1\n---\nThe old v1 name is not a slot.\n');
  put('missions/escort.md', '---\ntype: mission\nkind: patrol\ntitle: Not an escort\nreward: 1\n---\nWrong kind.\n');
  put('missions/courier-1.md', '---\ntype: mission\nkind: courier\ntitle: New call\nreward: 100\n---\nA call the game does not have yet.\n');
  put('ships/gunship.md', '---\ntype: ship\nname: Gunship\nside: player\nhp: 1\n---\nA pirate cannot be a player ship.\n');
  put('ships/kite.md', '---\ntype: ship\nname: Kite\nhull: 70\n---\nNo pirate called kite.\n');
  put('npcs/nobody.md', '---\ntype: npc\nname: NOBODY\n---\n## Lines\n- Hello.\n');
  const D = await play(gameWith(join(wrong, 'content')).dir);
  check('the game boots and plays, with no console errors', D.errors.length === 0, D.errors.join(' | '));
  check('nothing was applied and every file was refused', D.loader.state.applied.length === 0 && D.loader.state.skipped === 9, JSON.stringify(D.loader.state));
  const said = D.loader.errors.join('\n');
  check('the wrong slot is explained', /shields-1\.md\|could not be applied \(slot is "engine" but the file is called shields-1, so it must be the shields slot\)\. Kept the built-in values\./.test(said), said);
  check('the wrong tier is explained', /weapons-2\.md\|could not be applied \(tier is 1 but the file is called weapons-2, so it must be tier 2\)/.test(said));
  check('a fourth tier and the old v1 name (booster) are refused as parts the game does not have', /engine-4\.md\|the game has no built-in part called "engine-4" and cannot add new ones/.test(said) && /booster-1\.md\|the game has no built-in part called "booster-1"/.test(said));
  check('a call of another kind is explained', /escort\.md\|could not be applied \(kind is "patrol" but the file is called escort, so its kind must be escort\)/.test(said));
  check('a call the game does not have yet is refused', /courier-1\.md\|the game has no built-in mission called "courier-1" and cannot add new ones/.test(said));
  check('a player ship cannot replace a pirate', /gunship\.md\|could not be applied \(side is "player" but gunship is a pirate ship\)/.test(said));
  check('a ship with no row, and a character with no row, are refused', /kite\.md\|the game has no built-in ship called "kite"/.test(said) && /nobody\.md\|the game has no built-in npc called "nobody"/.test(said));
  same('every table is exactly the default', D.snap, B.snap);
  check('docking pays the default 500 cr', D.pay === 500, String(D.pay));
} catch (e) { check('the proof test ran: ' + e.message, false); } finally {
  tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
}

console.log(failed ? `\nCONTENT PROOF FAIL: ${failed} of ${n} checks failed` : `\nCONTENT PROOF PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;

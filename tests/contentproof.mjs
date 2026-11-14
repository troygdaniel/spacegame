// The proof set in markdown (card space-game-m4-proof, docs/MODDING.md sections 8 and 10): the raider and drone, the rescue call, JUNO and
// the six upgrade tiers (armor, rapid, booster) live in content/*.md, and the code tables in enemies.js, missions.js, shop.js and hud.js
// read them through the adapters in src/contenttables.js. Each case runs the real game in headless Chrome from a throwaway COPY of this
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
  const keep = { mission: G.mission, missionId: G.missionId, progress: G.missionProgress, credits: G.credits, armor: G.upgrades.armor, rapid: G.upgrades.rapid, booster: G.upgrades.booster };
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
  ['none', 'accepted', 'failed'].forEach(ms => [0, 1].forEach(arm => [0, 900].forEach(cr => { G.mission = ms; G.upgrades.armor = arm; G.credits = cr; react.push(j.react()); })));
  out.npc = { name: j.name, role: j.role, color: j.color, css: j.css, x: j.x, y: j.y, face: j.face, voice: j.voice, persona: j.persona, lines: j.lines.slice(), sprite: j.sprite === undefined ? null : j.sprite, react };
  const rec = t => ({ model: 'wren', parts: { engine: t, shields: t, weapons: t, tank: 0, cargo: 0 } }), per = f => [0, 1, 2].map(f);
  out.parts = {
    upgrades: plain(UPGRADES), fx: plain(UPGRADE_FX),
    fireDelay: per(t => { G.upgrades.rapid = t; return fireDelay(); }), boost: per(t => { G.upgrades.booster = t; return boostEnergy(); }),
    hull: per(t => shipStat('hull', rec(t))), boostMax: per(t => shipStat('boost', rec(t)))
  };
  G.mission = keep.mission; G.missionId = keep.missionId; G.missionProgress = keep.progress; G.credits = keep.credits;
  G.upgrades.armor = keep.armor; G.upgrades.rapid = keep.rapid; G.upgrades.booster = keep.booster;
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
    ['| upgrade:armor | Nice plating on that ship.', '| upgrade:armor | Shiny plating on that ship.'], ['Manner: warm,', 'Manner: cheerful,']]],
  ['parts/armor-1.md', [['price: 300', 'price: 310'], ['hullPlus: 20', 'hullPlus: 25']]],
  ['parts/rapid-1.md', [['delay: 100', 'delay: 90']]],
  ['parts/booster-1.md', [['boostTank: 130', 'boostTank: 140'], ['boostAdd: 200', 'boostAdd: 210']]],
  ['parts/booster-2.md', [['name: BOOSTER', 'name: BOOSTER MK2']]]
];

try {
  // ---- A: the shipped pack, B: nothing at all ----
  console.log('A: the shipped pack');
  const A = await play(ROOT);
  check('the loader applied the ten files of the proof set, no problems, not MODDED', A.loader.errors.length === 0 && A.loader.state.applied.length === 10 && A.loader.state.modded === false, JSON.stringify(A.loader));
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
  same('the upgrades: names, texts, prices, fire delay, boost tank and refill, plating and boost speed on a Wren at tiers 0, 1, 2', A.snap.parts, B.snap.parts);
  check('docking with the colonist pays the same, 500 cr', A.pay === 500 && B.pay === 500, A.pay + ' / ' + B.pay);
  check('and the defaults really are what the game has always had', B.snap.mission.reward === 500 && B.snap.ships.raider.hp === 20 && B.snap.parts.fireDelay.join() === '160,100,70' && B.snap.parts.boostMax.join() === '800,1000,1150' && B.snap.parts.hull.join() === '100,120,140');

  // ---- C: edit the files, change exactly that ----
  console.log('C: a copy of the game with edited files');
  const pack = mkdir('edited'); cpSync(join(ROOT, 'content'), join(pack, 'content'), { recursive: true });
  for (const [rel, pairs] of EDITS) {
    const f = join(pack, 'content', rel); let s = readFileSync(f, 'utf8');
    for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(rel + ': "' + a + '" must occur exactly once'); s = s.replace(a, () => b); }
    writeFileSync(f, s);
  }
  const cg = gameWith(join(pack, 'content'), realCore);
  check('the edited pack builds with no problems', cg.made.result.errors.length === 0, JSON.stringify(cg.made.result.errors));
  const C = await play(cg.dir);
  check('the loader applied the ten files and the Title would say MODDED', C.loader.errors.length === 0 && C.loader.state.applied.length === 10 && C.loader.state.modded === true, JSON.stringify(C.loader));
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
  want.npc.react = want.npc.react.map(r => r && r.replace('Nice plating', 'Shiny plating'));
  want.parts.upgrades[0].prices[0] = 310; want.parts.upgrades[2].name = 'BOOSTER MK2';
  Object.assign(want.parts.fx, { hull: [0, 25, 40, 60], delay: [160, 90, 70], boostTank: [100, 140, 165], boostAdd: [0, 210, 350, 350] });
  Object.assign(want.parts, { fireDelay: [160, 90, 70], hull: [100, 125, 140], boostMax: [800, 1010, 1150], boost: [{ max: 100, regen: 17 }, { max: 140, regen: 24 }, { max: 165, regen: 32 }] });
  same('the pirates changed exactly as the raider and drone files say', C.snap.ships, want.ships);
  same('the rescue call changed exactly as its file says (title, reward, board line with {reward}, progress with {progress}, a shorter checklist, failure line)', C.snap.mission, want.mission);
  same('JUNO changed exactly as her file says (colour, place, first line, one reaction, persona)', C.snap.npc, want.npc);
  same('the upgrades changed exactly as the part files say (price, plating, fire delay, boost tank and speed, a name)', C.snap.parts, want.parts);
  check('docking with the colonist pays the edited reward, 650 cr', C.pay === 650, String(C.pay));

  // ---- D: files that disagree with the code are refused, the tables stay ----
  console.log('D: files that disagree with the code');
  const wrong = mkdir('wrong'), put = (rel, text) => { const f = join(wrong, 'content', rel); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };
  put('parts/armor-1.md', '---\ntype: part\nslot: engine\ntier: 1\nname: ARMOR PLATING\nprice: 1\nhullPlus: 99\n---\nWrong slot.\n');
  put('parts/rapid-2.md', '---\ntype: part\nslot: weapons\ntier: 1\nname: RAPID FIRE\nprice: 1\ndelay: 20\n---\nTier does not match the file name.\n');
  put('parts/booster-3.md', '---\ntype: part\nslot: engine\ntier: 3\nname: BOOSTER\nprice: 1\n---\nThere is no third booster tier on sale.\n');
  put('missions/escort.md', '---\ntype: mission\nkind: patrol\ntitle: Not an escort\nreward: 1\n---\nWrong kind.\n');
  put('missions/courier-1.md', '---\ntype: mission\nkind: courier\ntitle: New call\nreward: 100\n---\nA call the game does not have yet.\n');
  put('ships/gunship.md', '---\ntype: ship\nname: Gunship\nside: player\nhp: 1\n---\nA pirate cannot be a player ship.\n');
  put('ships/kite.md', '---\ntype: ship\nname: Kite\nhull: 70\n---\nNo pirate called kite.\n');
  put('npcs/nobody.md', '---\ntype: npc\nname: NOBODY\n---\n## Lines\n- Hello.\n');
  const D = await play(gameWith(join(wrong, 'content')).dir);
  check('the game boots and plays, with no console errors', D.errors.length === 0, D.errors.join(' | '));
  check('nothing was applied and every file was refused', D.loader.state.applied.length === 0 && D.loader.state.skipped === 8, JSON.stringify(D.loader.state));
  const said = D.loader.errors.join('\n');
  check('the wrong slot is explained', /armor-1\.md\|could not be applied \(slot is "engine" but armor goes in the shields slot\)\. Kept the built-in values\./.test(said), said);
  check('the wrong tier is explained', /rapid-2\.md\|could not be applied \(tier is 1 but the file is called rapid-2, so it must be tier 2\)/.test(said));
  check('a tier that is not on sale is refused as a part the game does not have', /booster-3\.md\|the game has no built-in part called "booster-3" and cannot add new ones/.test(said));
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

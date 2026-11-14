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
  const keep = { mission: G.mission, missionId: G.missionId, progress: G.missionProgress, credits: G.credits, patrols: G.patrolsDone, parts: Object.assign({}, activeShip().parts) };
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
  const call = id => { // a call's words and numbers, as the board, the objective line, the progress view and the checklist show them
    const c = MISSIONS.find(x => x.id === id), res = { title: c.title, where: c.where, reward: c.reward, count: c.count === undefined ? null : c.count, offer: c.offer, deathMsg: c.deathMsg };
    G.missionId = id;
    res.views = [[0, 'accepted'], [3, 'accepted'], [120, 'accepted'], [0, 'failed']].map(([pr, st]) => { G.missionProgress = pr; G.mission = st;
      return { line: c.line(st), progress: st === 'accepted' ? c.progress() : null, steps: HUD_MISSIONS[id].steps.map(t => typeof t === 'function' ? t() : t) }; });
    res.unlock = [0, 1, 2].map(n => { G.patrolsDone = n; return c.unlock ? !!c.unlock() : null; });
    return res;
  };
  out.calls = { escort: call('escort'), patrol: call('patrol'), bounty: call('bounty') };
  // the bar's six characters: look, place, voice, persona, lines, when they are in the bar and what each says in 2304 situations
  // (mission state and id, the three part slots, credits, hull, patrols done, kills and calls finished); a line is its index in texts
  const base = { ms: 'none', mid: null, sh: 0, wp: 0, en: 0, cr: 0, hp: 100, pd: 0, k: 0 }, states = [];
  ['none', 'accepted', 'failed'].forEach(ms => [null, 'rescue', 'patrol', 'bounty'].forEach(mid => [0, 1, 2].forEach(sh => [0, 1].forEach(wp => [0, 1].forEach(en => [0, 900].forEach(cr =>
    [100, 40].forEach(hp => [0, 1].forEach(pd => [0, 12].forEach(k => states.push({ ms, mid, sh, wp, en, cr, hp, pd, k }))))))))));
  const setSt = st => { G.mission = st.ms; G.missionId = st.mid; Object.assign(activeShip().parts, { shields: st.sh, weapons: st.wp, engine: st.en }); G.credits = st.cr; G.hull = G.maxHull * st.hp / 100; G.patrolsDone = st.pd; G.stats.drones = st.k; G.stats.missions = st.pd; };
  const kept = { hull: G.hull, drones: G.stats.drones, missions: G.stats.missions };
  const probes = {}, npcs = {};
  NPCS.forEach(n => {
    const texts = [], at = r => { if (r === null || r === undefined) return -1; let i = texts.indexOf(r); if (i < 0) i = texts.push(r) - 1; return i; };
    const matrix = states.map(st => { setSt(st); return at(n.react()); }).join(',');
    const here = [0, 1].map(m => { setSt(Object.assign({}, base, { pd: m })); return n.when ? !!n.when() : null; });
    npcs[n.id] = { name: n.name, role: n.role, color: n.color, css: n.css, x: n.x, y: n.y, face: n.face, voice: n.voice, persona: n.persona, lines: n.lines.slice(), sprite: n.sprite === undefined ? null : n.sprite, here, texts, matrix };
  });
  const probe = (id, over) => { setSt(Object.assign({}, base, over)); const r = NPCS.find(x => x.id === id).react(); return r === undefined ? null : r; };
  probes.sablePatrol = probe('sable', { pd: 1 }); probes.mossHurt = probe('moss', { hp: 40 }); probes.sableKills = probe('sable', { k: 12 });
  out.npcs = npcs; out.probes = probes;
  G.missionId = 'patrol'; G.missionProgress = 2;
  out.ui = { help: plain(HELP), tips: plain(SCENE_TIPS), raw: plain(UI_TEXT), said: Object.keys(UI_TEXT).map(k => uiText(k, { reward: 500, name: 'Wreck' })) };
  out.station = { name: sysBody('station').name, ore: ORE_PRICE, repair: REPAIR_PRICE };
  out.poi = { sites: Object.keys(SYSTEMS).map(k => plain((SYSTEMS[k].bodies || []).filter(b => b.type === 'poi'))), signals: plain(SIGNAL_TYPES) };
  const rec = t => ({ model: 'wren', parts: { shields: t, weapons: t, engine: t, tank: t, cargo: t } }), tiers = [0, 1, 2, 3];
  const stats = {};
  ['vmax', 'boost', 'range', 'tank', 'hold', 'shieldMax', 'shieldRegen', 'shieldDelay', 'fireDelay', 'damage', 'boostTank', 'boostRegen'].forEach(nm => { stats[nm] = tiers.map(t => shipStat(nm, rec(t))); });
  const fit = tiers.map(t => { const r = activeShip(), was = Object.assign({}, r.parts); Object.assign(r.parts, { weapons: t, engine: t }); const v = { fire: fireDelay(), boost: boostEnergy(), top: boostMax() }; Object.assign(r.parts, was); return v; });
  out.parts = { parts: plain(PARTS), stats, fit };
  G.mission = keep.mission; G.missionId = keep.missionId; G.missionProgress = keep.progress; G.credits = keep.credits; G.patrolsDone = keep.patrols;
  Object.assign(activeShip().parts, keep.parts);
  G.hull = kept.hull; G.stats.drones = kept.drones; G.stats.missions = kept.missions;
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
  ['missions/escort.md', [['reward: 400', 'reward: 450'], ['Stay with her.', 'Stick with her.']]],
  ['missions/patrol.md', [['count: 5', 'count: 6']]],
  ['missions/bounty.md', [['reward: 1200', 'reward: 1500'], ['unlock: patrols>=1', 'unlock: patrols>=2']]],
  ['missions/rescue.md', [['reward: 500', 'reward: 650'], ['title: Rescue call', 'title: Rescue run'],
    ['active: Rescue the colonist on Kepler-4b', 'active: Bring them home from Kepler-4b for {reward} cr'],
    ['bring them back alive.', 'bring them back alive. Done: {progress}.'],
    ['- Escort them to your ship\n- Dock at Halcyon Station', '- Dock and collect {reward} cr'],
    ['Mission failed.', 'Mission lost.']]],
  ['text/ui.md', [['| help.station.1 | W A S D   walk (the arrow keys work too) |', '| help.station.1 | W A S D / arrows   move |'], ['| toast.docked | Docked. |', '| toast.docked | Docked. Welcome back. |'],
    ['| toast.delivered | Colonist delivered safely. +{reward} cr |', '| toast.delivered | Colonist delivered safely. +{reward} cr and thanks |'], ['| tips.ship | Look your ship over,', '| tips.ship | Check your ship over,']]],
  ['stations/halcyon-station.md', [['name: Halcyon Station', 'name: Halcyon Hub'], ['repair: 0.5', 'repair: 0.75'], ['ore: 20', 'ore: 25']]],
  ['poi/wreck-nw.md', [['credits: 120', 'credits: 130'], ['Strongbox recovered.', 'Strongbox pried open.']]],
  ['poi/wreck-s.md', [['guard: 2', 'guard: 3'], ['name: Cargo hulk', 'name: Cargo hulk, guarded']]],
  ['poi/signal-beacon.md', [['pays: [100, 200]', 'pays: [110, 210]']]],
  ['poi/signal-wreck.md', [['hullChance: 0.4', 'hullChance: 0.5']]],
  ['npcs/tamsin.md', [['x: 668', 'x: 670'], ['Those drones around Kepler-4b', 'Those drones circling Kepler-4b'], ['You took the Kepler call?', 'You took the Kepler run?']]],
  ['npcs/sable.md', [['patrols>=1 and !mission-id:bounty', 'patrols>=2 and !mission-id:bounty']]],
  ['npcs/moss.md', [['| hull<50 |', '| hull<30 |']]],
  ['npcs/ida.md', [['color: pink', 'color: amber']]],
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
  check('the loader applied the thirty files of the shipped set, no problems, not MODDED', A.loader.errors.length === 0 && A.loader.state.applied.length === 30 && A.loader.state.modded === false, JSON.stringify(A.loader));
  check('no console errors', A.errors.length === 0, A.errors.join(' | '));

  console.log('B: an empty pack (the code\'s own tables)');
  const empty = mkdir('empty'); mkdirSync(join(empty, 'content'));
  const B = await play(gameWith(join(empty, 'content')).dir);
  check('the loader applied nothing and listed no problems', B.loader.state.applied.length === 0 && B.loader.errors.length === 0, JSON.stringify(B.loader));
  check('no console errors', B.errors.length === 0, B.errors.join(' | '));

  console.log('the files over their defaults change nothing');
  same('the pirates: raider, drone and gunship (every number, the radar colour, the shot window)', A.snap.ships, B.snap.ships);
  same('the rescue call: title, place, reward, offer, the three board lines, both progress texts, the failure line, the checklist', A.snap.mission, B.snap.mission);
  same('the other calls: escort, patrol and bounty (title, place, reward, count, offer, objective lines, progress, checklist, the bounty unlock)', A.snap.calls, B.snap.calls);
  same('the six characters: look, place, voice, persona, lines, when they are in the bar, and what each says in 2304 situations', A.snap.npcs, B.snap.npcs);
  same('the interface words: every help line, scene tip and toast, as the game says them', A.snap.ui, B.snap.ui);
  check('and a toast says its numbers: the delivery pays 500 and the patrol toast counts 2 of 5', A.snap.ui.said.includes('Colonist delivered safely. +500 cr') && A.snap.ui.said.includes('Wanted pirate down  2 of 5'), JSON.stringify(A.snap.ui.said.slice(0, 6)));
  same('the dock: the station name, the ore price and the repair price', A.snap.station, B.snap.station);
  check('and they are the prices the game has always had: 20 an ore, half a credit a point of hull', B.snap.station.ore === 20 && B.snap.station.repair === 0.5 && B.snap.station.name === 'Halcyon Station', JSON.stringify(B.snap.station));
  same('the salvage sites and the two kinds of random signal (names, notes, payouts, hull, guards, chances)', A.snap.poi, B.snap.poi);
  same('three spot checks of the reaction rules', A.snap.probes, B.snap.probes);
  check('and the spot checks are what the rules say (a finished patrol, a hurt hull, twelve kills)', /finished a patrol/.test(A.snap.probes.sablePatrol) && /hanging on by habit/.test(A.snap.probes.mossHurt) && /12 pirates on your tally/.test(A.snap.probes.sableKills), JSON.stringify(A.snap.probes));
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
  check('the loader applied the thirty-two files (the shipped set and a tank and a hold part) and the Title would say MODDED', C.loader.errors.length === 0 && C.loader.state.applied.length === 32 && C.loader.state.modded === true, JSON.stringify(C.loader));
  check('no console errors', C.errors.length === 0, C.errors.join(' | '));
  const want = JSON.parse(JSON.stringify(A.snap)); // what A says, with exactly the edited lines changed
  Object.assign(want.ships.raider, { hp: 22, bounty: 47, radar: 0x6dff9c, shot: [500, 900], strafe: false });
  want.ships.drone.range = 700;
  const mapStr = (o, f) => JSON.parse(JSON.stringify(o), (k, v) => typeof v === 'string' ? f(v) : v);
  const wc = want.calls;
  wc.escort.reward = 450; wc.escort = mapStr(wc.escort, t => t.replace('Stay with her.', 'Stick with her.')); wc.escort.reward = 450;
  wc.patrol = mapStr(wc.patrol, t => t.replace(/ of 5/g, ' of 6').replace(/\/5$/, '/6')); wc.patrol.count = 6;
  wc.bounty = mapStr(wc.bounty, t => t.replace('1200', '1500')); wc.bounty.reward = 1500; wc.bounty.unlock = [false, false, true];
  Object.assign(want.mission, {
    title: 'Rescue run', reward: 650, steps: ['Take the rescue call', 'Find the colonist', 'Dock and collect 650 cr'],
    progress: ['Find the colonist on Kepler-4b and\nbring them back alive. Done: 0.', want.mission.progress[1]],
    line: ['Bring them home from Kepler-4b for 650 cr', want.mission.line[1], want.mission.line[2]], deathMsg: 'Ship destroyed. The colonist was lost. Mission lost.'
  });
  want.mission.hud = [ // three steps now: the checklist never points past the last, and the hint still follows the code's own step number
    { cur: 1, next: A.snap.mission.hud[0].next, steps: ['Take the rescue call/done', 'Find the colonist/cur', 'Dock and collect 650 cr/todo'] },
    { cur: 2, next: A.snap.mission.hud[1].next, steps: ['Take the rescue call/done', 'Find the colonist/done', 'Dock and collect 650 cr/cur'] }];
  const wj = want.npcs.juno;
  Object.assign(wj, { color: 0x38e1ff, css: '#38e1ff', x: 260, persona: wj.persona.replace('Manner: warm,', 'Manner: cheerful,') });
  wj.lines[0] = wj.lines[0].replace('Welcome to the Drift.', 'Welcome aboard the Drift.');
  wj.texts = wj.texts.map(r => r.replace('Nice shielding', 'Shiny shielding'));
  const wt = want.npcs.tamsin; wt.x = 670; wt.lines[0] = wt.lines[0].replace('drones around', 'drones circling'); wt.texts = wt.texts.map(r => r.replace('Kepler call', 'Kepler run'));
  const wu = want.ui; // the interface words: four cells edited
  wu.help.Station[0] = 'W A S D / arrows   move'; wu.raw['toast.docked'] = 'Docked. Welcome back.'; wu.raw['toast.delivered'] = 'Colonist delivered safely. +{reward} cr and thanks';
  wu.tips.Ship = wu.tips.Ship.replace('Look your ship over,', 'Check your ship over,');
  wu.said = wu.said.map(t => t === 'Docked.' ? 'Docked. Welcome back.' : t === 'Colonist delivered safely. +500 cr' ? 'Colonist delivered safely. +500 cr and thanks' : t === 'Wanted pirate down  2 of 5' ? 'Wanted pirate down  2 of 6' : t); // the patrol file says count 6 in this copy
  want.station = { name: 'Halcyon Hub', ore: 25, repair: 0.75 };
  const wp0 = want.poi.sites[0]; // the fixed sites of Halcyon, in the order of the system data
  const site = id => wp0.find(b => b.id === id);
  site('wreck-nw').credits = 130; site('wreck-nw').note = 'Strongbox pried open.'; site('wreck-s').guard = 3; site('wreck-s').name = 'Cargo hulk, guarded';
  want.poi.signals.find(t => t.kind === 'beacon').credits = [110, 210]; want.poi.signals.find(t => t.kind === 'wreck').hullChance = 0.5;
  const wi = want.npcs.ida; wi.color = 0xffb454; // label stays: only the body colour was edited
  const wp = want.parts, P = wp.parts; // the parts: tier 1 of shields, weapons and engine edited, tier 2 of the engine renamed, a tank and a hold part added
  P.shields.prices[0] = 310; P.shields.pts[1] = 30; P.shields.tiers[0] = 'LITE SHIELD'; P.weapons.delay[1] = 90;
  Object.assign(P.engine, { speed: [1, 1.1, 1.16, 1.25], range: [0, 2, 2, 3], boost: [0, 210, 350, 500], tank: [100, 140, 165, 200] }); P.engine.tiers[1] = 'TWIN NOZZLES MK2';
  P.tank.mul[1] = 1.3; P.tank.descs[0] = 'fuel capacity x1.3'; P.cargo.add[1] = 5; P.cargo.descs[0] = 'hold +5 ore';
  Object.assign(wp.stats.vmax, { 1: Math.round(480 * 1.1) }); wp.stats.boost[1] = 800 + 210; wp.stats.range[1] = 8 + 2; wp.stats.tank[1] = Math.round(40 * 1.3); wp.stats.hold[1] = 10 + 5;
  wp.stats.shieldMax[1] = 30; wp.stats.fireDelay[1] = 90; wp.stats.boostTank[1] = 140;
  wp.fit[1] = { fire: 90, boost: { max: 140, regen: 24 }, top: 1010 };
  same('the pirates changed exactly as the raider and drone files say', C.snap.ships, want.ships);
  same('the rescue call changed exactly as its file says (title, reward, board line with {reward}, progress with {progress}, a shorter checklist, failure line)', C.snap.mission, want.mission);
  same('the other calls changed exactly as their files say (a reward, a line of progress, the patrol count in every line and in the checklist, the bounty reward in its offer, and when it unlocks)', C.snap.calls, want.calls);
  check('the rules edited in the files really changed what two characters say (a patrol rule that now needs two, a hurt hull at 30 percent)', C.snap.probes.sablePatrol === null && C.snap.probes.mossHurt === null && C.snap.probes.sableKills === A.snap.probes.sableKills, JSON.stringify(C.snap.probes));
  same('the dock changed exactly as its file says (the name, 25 an ore, 0.75 a point of hull)', C.snap.station, want.station);
  same('the interface words changed exactly as ui.md says (a help line, two toasts with their numbers, a tip)', C.snap.ui, want.ui);
  same('the salvage sites and signals changed exactly as their files say (a payout, a note, a guard count and name, a signal range and a chance)', C.snap.poi, want.poi);
  same('the characters changed exactly as their files say (JUNO: colour, place, a line, a reaction, persona; TAMSIN: place, a line, a reaction; IDA: body colour), the rest as before', Object.assign({}, C.snap.npcs, { sable: A.snap.npcs.sable, moss: A.snap.npcs.moss }), Object.assign({}, want.npcs, { sable: A.snap.npcs.sable, moss: A.snap.npcs.moss }));
  check('SABLE and MOSS now answer differently (their conditions were edited)', C.snap.npcs.sable.matrix !== A.snap.npcs.sable.matrix && C.snap.npcs.moss.matrix !== A.snap.npcs.moss.matrix);
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
  put('text/extra.md', '---\ntype: text\n---\n## Strings\n| key | text |\n|---|---|\n| toast.docked | Fine. |\n| help.stationn.1 | A typo in a key refuses the whole file. |\n');
  put('stations/halcyon-station.md', '---\ntype: station\nname: Halcyon Station\nsystem: kestrel\nrepair: 9\nore: 99\n---\n');
  put('stations/outpost.md', '---\ntype: station\nname: Outpost\nsystem: halcyon\n---\n');
  put('npcs/nobody.md', '---\ntype: npc\nname: NOBODY\n---\n## Lines\n- Hello.\n');
  const D = await play(gameWith(join(wrong, 'content')).dir);
  check('the game boots and plays, with no console errors', D.errors.length === 0, D.errors.join(' | '));
  check('nothing was applied and every file was refused', D.loader.state.applied.length === 0 && D.loader.state.skipped === 12, JSON.stringify(D.loader.state));
  const said = D.loader.errors.join('\n');
  check('the wrong slot is explained', /shields-1\.md\|could not be applied \(slot is "engine" but the file is called shields-1, so it must be the shields slot\)\. Kept the built-in values\./.test(said), said);
  check('the wrong tier is explained', /weapons-2\.md\|could not be applied \(tier is 1 but the file is called weapons-2, so it must be tier 2\)/.test(said));
  check('a fourth tier and the old v1 name (booster) are refused as parts the game does not have', /engine-4\.md\|the game has no built-in part called "engine-4" and cannot add new ones/.test(said) && /booster-1\.md\|the game has no built-in part called "booster-1"/.test(said));
  check('a call of another kind is explained', /escort\.md\|could not be applied \(kind is "patrol" but the file is called escort, so its kind must be escort\)/.test(said));
  check('a call the game does not have yet is refused', /courier-1\.md\|the game has no built-in mission called "courier-1" and cannot add new ones/.test(said));
  check('a player ship cannot replace a pirate', /gunship\.md\|could not be applied \(side is "player" but gunship is a pirate ship\)/.test(said));
  check('a ship with no row, and a character with no row, are refused', /kite\.md\|the game has no built-in ship called "kite"/.test(said) && /nobody\.md\|the game has no built-in npc called "nobody"/.test(said));
  check('a text file with one key the game does not read is refused whole, with a hint', /extra\.md\|could not be applied \(the key "help\.stationn\.1" is not a string the game reads\. Did you mean "help\.station\.1"\?\)/.test(said), said);
  check('a station in the wrong system is refused, and so is a station the game has no dock for', /halcyon-station\.md\|could not be applied \(system is "kestrel" but halcyon-station is in halcyon\)/.test(said) && /outpost\.md\|the game has no built-in station called "outpost"/.test(said), said);
  same('every table is exactly the default', D.snap, B.snap);
  check('docking pays the default 500 cr', D.pay === 500, String(D.pay));
} catch (e) { check('the proof test ran: ' + e.message, false); } finally {
  tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
}

console.log(failed ? `\nCONTENT PROOF FAIL: ${failed} of ${n} checks failed` : `\nCONTENT PROOF PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;

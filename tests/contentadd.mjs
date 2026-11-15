// Adding new things from markdown (card space-game-m9-add-new, docs/MODDING.md section 12): a file with an id the code does not know
// becomes a new voice line, bar character, mission, or ship. Each case runs the real game in headless Chrome from a throwaway COPY of this
// folder whose content.generated.js is built from a small pack made here, then reads what the game plays from. Types so far: voice, ship, mission, npc.
// Run: node tests/contentadd.mjs     (one game per case, one Chrome at a time)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build } from '../tools/build-content.mjs';
import { launch, sleep } from './cdp.mjs';
import { copyGame, ROOT } from './gamecopy.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };

const tmp = [];
const realCore = /\bcore:\s*"([0-9a-f]+)"/.exec(readFileSync(join(ROOT, 'content.generated.js'), 'utf8'))[1]; // the shipped pack's hash: a game with other files reads as MODDED
// a game copy whose content.generated.js is built from `files` ({ 'voice/x.md': text }) and nothing else
function gameWith(files) {
  const pack = mkdtempSync(join(tmpdir(), `longhaul-add-pack-${process.pid}-`)); tmp.push(pack);
  Object.keys(files).forEach(f => { mkdirSync(dirname(join(pack, f)), { recursive: true }); writeFileSync(join(pack, f), files[f]); });
  const g = copyGame('add'); tmp.push(g);
  build({ dir: pack, prefix: 'content/', out: join(g, 'content.generated.js'), write: true, core: realCore });
  return g;
}
// open the copy at Title; fn(t, ev) runs against the game; the page's console errors are checked at the end
async function play(files, fn) {
  const t = await launch('', gameWith(files));
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'Title active');
    await sleep(400);
    const ev = async e => JSON.parse(await t.ev(`JSON.stringify((${e}))`));
    await fn(t, ev);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}
const LOADER = `({ applied: CONTENT_STATE.applied.slice(), modded: ContentLib.apply(CONTENT, {}).modded, errors: CONTENT_ERRORS.map(e => e.path + ' | ' + e.message) })`;

try {
  // ---------- voice ----------
  console.log('voice: lines for an event');
  const voice = {
    'voice/hull-quips.md': '---\ntype: voice\nevent: hull-low\n---\n## Lines\n- Hull is singing a sad song.\n- Hull integrity is a suggestion now.\n',
    'voice/my-launch.md': '---\ntype: voice\nevent: launch-clear\nreplace: yes\n---\n## Lines\n- Off we go, {ship}.\n',
    'voice/constructor.md': '---\ntype: voice\nevent: docked\n---\n## Lines\n- Home again.\n',
    'voice/bad-event.md': '---\ntype: voice\nevent: warp-core\n---\n## Lines\n- Never said.\n',
    'voice/no-lines.md': '---\ntype: voice\nevent: fuel-low\n---\n',
    'voice/money.md': '---\ntype: voice\nevent: credits-earned\n---\n## Lines\n- Nice haul, you now hold {credits}.\n'
  };
  await play(voice, async (t, ev) => {
    const L = await ev(LOADER);
    check('the three good files are added and the bad two are not', ['voice:hull-quips', 'voice:my-launch', 'voice:constructor', 'voice:money'].every(k => L.applied.includes(k)) && !L.applied.some(k => /bad-event|no-lines/.test(k)), JSON.stringify(L.applied));
    check('the bad event is refused with its file and the list of events', L.errors.some(e => /bad-event\.md/.test(e) && /warp-core/.test(e)), JSON.stringify(L.errors));
    check('a file with no lines is refused with its name', L.errors.some(e => /no-lines\.md/.test(e)), JSON.stringify(L.errors));
    check('the pack reads as MODDED', L.modded === true);
    const draws = await ev(`(() => { const out = { hull: [], launch: [], dock: [], money: [], plain: [], runs: 0 }; let last = null;
      for (let i = 0; i < 300; i++) { const l = voiceLine('hull-low', 'Warning. Hull integrity critical.'); out.hull.push(l); if (l === last) out.runs++; last = l; }
      for (let i = 0; i < 40; i++) out.launch.push(voiceLine('launch-clear', 'Launch clear.'));
      for (let i = 0; i < 40; i++) out.dock.push(voiceLine('docked', 'Docking complete.'));
      G.credits = 777; for (let i = 0; i < 40; i++) out.money.push(voiceLine('credits-earned', 'Payment received.'));
      for (let i = 0; i < 6; i++) out.plain.push(voiceLine('fuel-low', 'Warning. Fuel reserves low.'));
      return out; })()`);
    const uniq = a => [...new Set(a)].sort();
    check('hull-low: the built-in line and both added lines are all said', JSON.stringify(uniq(draws.hull)) === JSON.stringify(['Hull integrity is a suggestion now.', 'Hull is singing a sad song.', 'Warning. Hull integrity critical.'].sort()), JSON.stringify(uniq(draws.hull)));
    check('the ship never says the same line twice in a row', draws.runs === 0, 'repeats: ' + draws.runs);
    check('replace: yes drops the built-in launch line and fills {ship}', uniq(draws.launch).length === 1 && /^Off we go, .+\.$/.test(draws.launch[0]) && !/\{/.test(draws.launch[0]), JSON.stringify(uniq(draws.launch)));
    check('a file called constructor works (ids never become object keys)', uniq(draws.dock).includes('Home again.') && uniq(draws.dock).includes('Docking complete.'), JSON.stringify(uniq(draws.dock)));
    check('{credits} is filled from the game', uniq(draws.money).some(l => l === 'Nice haul, you now hold 777.'), JSON.stringify(uniq(draws.money)));
    check('an event with no added line says the built-in one', uniq(draws.plain).join() === 'Warning. Fuel reserves low.', JSON.stringify(uniq(draws.plain)));
    const again = await ev(`(() => { const before = VOICE_ADDED.size; ContentLib.apply(CONTENT, CONTENT_TABLES); return [before, VOICE_ADDED.size]; })()`);
    check('applying the pack again does not add the lines twice', again[0] === again[1] && again[0] === 4, JSON.stringify(again));
  });

  console.log('voice: a pack may add at most 40 files');
  const many = {};
  for (let i = 1; i <= 42; i++) many['voice/line-' + String(i).padStart(2, '0') + '.md'] = `---\ntype: voice\nevent: docked\n---\n## Lines\n- Line number ${i}.\n`;
  await play(many, async (t, ev) => {
    const L = await ev(LOADER);
    check('40 are added and the other two are refused with the limit named', L.applied.filter(k => k.startsWith('voice:')).length === 40 && L.errors.filter(e => /at most 40 voice files/.test(e)).length === 2, JSON.stringify([L.applied.length, L.errors.length, L.errors[0]]));
  });

  // ---------- ships ----------
  console.log('ship: a new player ship');
  const ships = {
    'ships/mule.md': '---\ntype: ship\nname: Mule\nrole: freight tug\nart: ox\nhull: 150\ncargo: 30\ntank: 55\nrange: 9\nprice: 7000\n---\nA tug that hauls more than it should.\n\n## Hangar line\nSlow, loud, and never empty.\n',
    'ships/shorty.md': '---\ntype: ship\nname: Shorty\n---\n',
    'ships/kite.md': '---\ntype: ship\nname: Kite Mk2\nhull: 99\n---\n',
    'ships/warbird.md': '---\ntype: ship\nname: Warbird\nside: pirate\n---\n',
    'ships/bad-art.md': '---\ntype: ship\nname: Bad Art\nart: raider\n---\n',
    'ships/gift.md': '---\ntype: ship\nname: Gift\nprice: 0\n---\n',
    'ships/raider.md': '---\ntype: ship\nname: Raider\nside: pirate\nhp: 21\n---\n'
  };
  await play(ships, async (t, ev) => {
    const L = await ev(LOADER);
    check('mule and shorty are added; the five wrong files are not', L.applied.includes('ship:mule') && L.applied.includes('ship:shorty') && !L.applied.some(k => /kite|warbird|bad-art|gift/.test(k)), JSON.stringify(L.applied));
    check('a pirate file is still a change to that pirate (raider hp 21)', L.applied.includes('ship:raider') && (await ev('PIRATES.raider.hp')) === 21);
    const why = re => L.errors.some(e => re.test(e));
    check('kite is refused: it is one of the six built-in ships', why(/kite\.md.*one of the six built-in ships/), JSON.stringify(L.errors));
    check('a new pirate is refused and says why', why(/warbird\.md.*new pirate ships cannot be added/), JSON.stringify(L.errors));
    check('art: raider is refused and the choices are listed', why(/bad-art\.md.*wren, kite, ox, talon, pathfinder, bastion/), JSON.stringify(L.errors));
    check('price 0 is refused', why(/gift\.md.*price is 0/), JSON.stringify(L.errors));
    const m = await ev('SHIP_MODELS.mule'), sh = await ev('SHIP_MODELS.shorty'), w = await ev('SHIP_MODELS.wren');
    check('mule: the numbers the file gives, the rest the Wren\'s', m.hull === 150 && m.cargo === 30 && m.tank === 55 && m.range === 9 && m.price === 7000 && m.speed === w.speed && m.boost === w.boost && m.guns === w.guns && m.side === 'player' && m.art === 'ox', JSON.stringify(m));
    check('shorty has only a name: the Wren\'s numbers, price 5000, art wren', sh.hull === w.hull && sh.speed === w.speed && sh.price === 5000 && sh.art === 'wren', JSON.stringify(sh));
    check('mule keeps its text for the hangar', m.desc === 'A tug that hauls more than it should.' && m.line === 'Slow, loud, and never empty.', JSON.stringify([m.desc, m.line]));
    check('the hangar says whose hull it borrows: Mule, (Ox hull)', (await ev('SHIP_LOOK.mule.name')) === 'Mule' && /freight tug \(Ox hull\)/.test(await ev('SHIP_LOOK.mule.role')));
    check('the built-in ships are as they were: the Ox and the Wren', (await ev('SHIP_MODELS.ox.hull')) === 170 && (await ev('SHIP_LOOK.ox.name')) === 'Ox' && (await ev('Object.keys(SHIP_MODELS).length')) === 8);
    const yard = await ev(`stationYard(homeDock())`);
    check('Halcyon\'s yard sells the Kite and then the two new ships', yard.join() === 'kite,mule,shorty', yard.join());
    const bought = await ev(`(() => { G.credits = 7000; const r = fleetBuy('mule', true); return { ok: r.ok, credits: G.credits, flying: r.flying, hull: G.hull, maxHull: G.maxHull, hold: holdCap(), vmax: shipStat('vmax'), tank: fuelTank(), model: activeShip().model, name: activeShip().name, look: shipActiveModel() }; })()`);
    check('buying the Mule: 7000 credits, you fly it, the hull is 150, the hold 30, the tank 55', bought.ok && bought.credits === 0 && bought.flying && bought.maxHull === 150 && bought.hold === 30 && bought.tank === 55 && bought.model === 'mule' && bought.name === 'Mule', JSON.stringify(bought));
    check('it flies with the Ox hull art', bought.look === 'mule' && (await ev('SHIP_LOOK[shipActiveModel()].draw === SHIP_LOOK.ox.draw')) === true);
    await ev(`(() => { game.scene.stop('Title'); game.scene.start('Ship'); return 1; })()`);
    await t.waitFor(`game.scene.isActive('Ship')`, 15000, 'Ship bay active'); await sleep(900);
    check('the Ship bay shows the new ship: its name, with the borrowed hull in the label', (await ev(`(() => { const out = []; const walk = o => { if (o.visible === false) return; if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('Ship').children.list.forEach(walk); return out.join('|'); })()`)).toUpperCase().includes('MULE'));
    await t.shot('contentadd-bay');
    const run = await ev(`(() => { try { game.scene.stop('Ship'); game.scene.start('Space', { from: 'station' }); return 'started'; } catch (e) { return 'ERR ' + e.message; } })()`);
    await t.waitFor(`game.scene.isActive('Space')`, 15000, 'Space active'); await sleep(600);
    check('the game starts Space with the new ship', run === 'started' && (await ev('game.scene.isActive("Space")')) === true);
    const again = await ev(`(() => { const a = Object.keys(SHIP_MODELS).length, y = stationYard(homeDock()).join(); ContentLib.apply(CONTENT, CONTENT_TABLES); return [a, Object.keys(SHIP_MODELS).length, y, stationYard(homeDock()).join()]; })()`);
    check('applying the pack again adds nothing twice', again[0] === again[1] && again[2] === again[3], JSON.stringify(again));
  });

  console.log('ship: a pack may add at most 6 ships');
  const fleet = {};
  for (let i = 1; i <= 8; i++) fleet['ships/tug-' + i + '.md'] = `---\ntype: ship\nname: Tug ${i}\n---\n`;
  await play(fleet, async (t, ev) => {
    const L = await ev(LOADER);
    check('6 are added and 2 are refused with the limit named', L.applied.filter(k => k.startsWith('ship:')).length === 6 && L.errors.filter(e => /at most 6 ships/.test(e)).length === 2, JSON.stringify([L.applied.length, L.errors]));
  });

  // ---------- missions ----------
  console.log('mission: new calls of the built-in kinds');
  const missions = {
    'missions/convoy-patrol.md': '---\ntype: mission\nkind: patrol\ntitle: Convoy patrol\nwhere: The outer ring\nreward: 800\ncount: 3\n---\nThree pirates are shadowing a convoy.\nClear them for {reward} cr.\n\n## Board line\nactive: Convoy: {progress} of {count} pirates down\nfailed: The convoy was left alone\n\n## Steps\n- Take the convoy call\n- Launch\n- Pirates down {progress}/{count}\n',
    'missions/rescue-two.md': '---\ntype: mission\nkind: rescue\ntitle: Second pod\nwhere: Kepler-4b\nreward: 700\n---\nAnother pod went down on the same planet.\n',
    'missions/escort-run.md': '---\ntype: mission\nkind: escort\ntitle: Escort run\nreward: 350\n---\n',
    'missions/big-game.md': '---\ntype: mission\nkind: bounty\ntitle: Big game\nreward: 2000\nunlock: patrols>=2\n---\nA second look at the Reaver.\n',
    'missions/zzz-over-the-cap.md': '---\ntype: mission\nkind: patrol\ntitle: One too many\nreward: 1\n---\n',
    'missions/courier-run.md': '---\ntype: mission\nkind: courier\ntitle: Courier run\nreward: 100\n---\n',
    'missions/no-reward.md': '---\ntype: mission\nkind: patrol\ntitle: No reward\n---\n'
  };
  await play(missions, async (t, ev) => {
    const L = await ev(LOADER);
    const mine = ['convoy-patrol', 'rescue-two', 'escort-run', 'big-game'].map(k => 'mission:' + k);
    check('four calls are added', mine.every(k => L.applied.includes(k)), JSON.stringify(L.applied));
    check('a courier call is refused and the kinds the game plays are named', L.errors.some(e => /courier-run\.md.*patrol|courier-run\.md.*courier/.test(e) && /rescue, escort, patrol, bounty/.test(e)), JSON.stringify(L.errors));
    check('a call with no reward is refused with its file', L.errors.some(e => /no-reward\.md.*reward is required/.test(e)), JSON.stringify(L.errors));
    check('the fifth is refused with the limit named', L.errors.some(e => /zzz-over-the-cap\.md.*at most 4 calls/.test(e)) || L.errors.some(e => /zzz-over-the-cap\.md/.test(e) && /at most 4/.test(e)), JSON.stringify(L.errors));
    const rows = await ev(`MISSIONS.map(m => [m.id, missionKind(m), m.key, m.title, m.reward, m.count === undefined ? null : m.count, !!m.unlock])`);
    check('the board has the four built-in calls then the four new ones, each with its own key', JSON.stringify(rows.map(r => r.slice(0, 3))) === JSON.stringify([['rescue', 'rescue', '1'], ['escort', 'escort', '2'], ['patrol', 'patrol', '3'], ['bounty', 'bounty', '4'], ['big-game', 'bounty', '5'], ['convoy-patrol', 'patrol', '6'], ['escort-run', 'escort', '7'], ['rescue-two', 'rescue', '8']]), JSON.stringify(rows));
    check('titles, pay and count are the files\'', rows[5][3] === 'Convoy patrol' && rows[5][4] === 800 && rows[5][5] === 3 && rows[7][4] === 700 && rows[6][4] === 350, JSON.stringify(rows));
    check('only the call with an unlock rule is locked: the built-in bounty and Big game', rows[3][6] === true && rows[4][6] === true && rows[5][6] === false && rows[6][6] === false && rows[7][6] === false);
    const off = await ev(`(() => { G.patrolsDone = 0; const a = missionsOffered().map(m => m.id); G.patrolsDone = 2; const b = missionsOffered().map(m => m.id); G.patrolsDone = 0; return [a, b]; })()`);
    check('Big game is offered only after two patrols', !off[0].includes('big-game') && off[1].includes('big-game') && off[0].length === 6, JSON.stringify(off));
    const words = await ev(`(() => { const m = MISSIONS.find(x => x.id === 'convoy-patrol'); G.missionId = 'convoy-patrol'; G.mission = 'accepted'; G.missionProgress = 1; const o = [m.offer, m.line('accepted'), m.line('failed'), m.progress(), HUD_MISSIONS['convoy-patrol'].steps.map(t => typeof t === 'function' ? t() : t)]; G.mission = 'none'; G.missionId = null; return o; })()`);
    check('the briefing says {reward} for this call, the board line and the steps count to 3', words[0] === 'Three pirates are shadowing a convoy.\nClear them for 800 cr.' && words[1] === 'Convoy: 1 of 3 pirates down' && words[2] === 'The convoy was left alone' && words[4][2] === 'Pirates down 1/3', JSON.stringify(words));
    check('a text the file leaves out is the kind\'s own, rebuilt for this call: the progress counts to 3', /Wanted pirates destroyed: 1 of 3\./.test(words[3]), JSON.stringify(words[3]));
    const kinds = await ev(`(() => { const r = {}; MISSIONS.forEach(m => { G.mission = 'accepted'; G.missionId = m.id; r[m.id] = ['rescue', 'escort', 'patrol', 'bounty'].filter(k => missionActive(k)); }); G.mission = 'none'; G.missionId = null; return r; })()`);
    check('a call is active as its own kind and its own id, never as another kind', JSON.stringify(kinds['convoy-patrol']) === '["patrol"]' && JSON.stringify(kinds['rescue-two']) === '["rescue"]' && JSON.stringify(kinds['patrol']) === '["patrol"]' && JSON.stringify(kinds['escort-run']) === '["escort"]', JSON.stringify(kinds));
    const keep = await ev(`(() => { const a = MISSIONS.length; ContentLib.apply(CONTENT, CONTENT_TABLES); return [a, MISSIONS.length]; })()`);
    check('applying the pack again adds nothing twice', keep[0] === keep[1] && keep[0] === 8, JSON.stringify(keep));

    // play the convoy patrol: three wanted pirates, the third pays 800
    await ev(`(() => { G.mission = 'accepted'; G.missionId = 'convoy-patrol'; G.missionProgress = 0; G.patrolsDone = 0; G.credits = 0; game.scene.stop('Title'); game.scene.start('Space', { from: 'station' }); return 1; })()`);
    await t.waitFor(`game.scene.isActive('Space')`, 15000, 'Space active'); await sleep(900);
    const wanted = await ev(`(() => { const sp = game.scene.getScene('Space'); return sp.enemies.getChildren().filter(e => e.wanted).length; })()`);
    check('the convoy patrol puts exactly 3 wanted pirates on the approach', wanted === 3, String(wanted));
    const kills = await ev(`(() => { const sp = game.scene.getScene('Space'), out = []; for (let i = 0; i < 3; i++) { missionKill(sp, { wanted: true }); out.push([G.missionProgress, G.mission, G.credits, G.patrolsDone]); } return out; })()`);
    check('three kills: 1, 2, then done: paid 800, no mission, one patrol counted', JSON.stringify(kills) === JSON.stringify([[1, 'accepted', 0, 0], [2, 'accepted', 0, 0], [0, 'none', 800, 1]]), JSON.stringify(kills));
    // dock with the second pod's colonist aboard: the station pays that call's 700
    await ev(`(() => { G.mission = 'rescued'; G.missionId = 'rescue-two'; window.__c0 = G.credits; game.scene.stop('Space'); game.scene.start('Station', { arrive: true }); return 1; })()`);
    await t.waitFor(`game.scene.isActive('Station')`, 15000, 'Station active'); await sleep(500);
    check('docking with the second pod\'s colonist pays 700, not the first call\'s 500', (await ev('G.credits - window.__c0')) === 700);
    // the board: six calls offered, four cards at a time
    await ev(`(() => { G.mission = 'none'; G.missionId = null; G.patrolsDone = 0; game.scene.getScene('Station').openPanel(); return 1; })()`);
    await sleep(500);
    const shownText = () => ev(`(() => { const out = []; const walk = o => { if (o.visible === false) return; if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('Station').panelBox.list.forEach(walk); return out.join('|'); })()`);
    const first = await shownText();
    check('the board shows four cards (Rescue call to Convoy patrol) and says "CALLS 1-4 OF 6 >"', /CALLS 1-4 OF 6\s+>/.test(first) && /RESCUE CALL/.test(first) && /CONVOY PATROL/.test(first) && !/ESCORT RUN/.test(first), first.slice(0, 300));
    await t.shot('contentadd-board-1');
    await ev(`(() => { const st = game.scene.getScene('Station'); for (let i = 0; i < 5; i++) st.boardKeys({ key: 'ArrowRight' }); return 1; })()`);
    await sleep(300);
    const last = await shownText();
    check('five steps right scrolls the window: "< CALLS 3-6 OF 6" with Convoy patrol and Escort run on it', /<\s+CALLS 3-6 OF 6/.test(last) && /CONVOY PATROL/.test(last) && /ESCORT RUN/.test(last) && !/RESCUE CALL/.test(last), last.slice(0, 300));
    await t.shot('contentadd-board-2');
    await ev(`(() => { const st = game.scene.getScene('Station'); st.boardKeys({ key: '8' }); return 1; })()`);
    check('the number key 8 picks Rescue two', (await ev('G.missionId')) === 'rescue-two');
  });

  console.log('mission: a save that names a call from a pack that is gone');
  await play({}, async (t, ev) => {
    const r = await ev(`(() => { try { applySave({ v: 2, mission: 'accepted', missionId: 'convoy-patrol', missionProgress: 2, active: 0, fleet: [{ uid: 1, model: 'mule', name: 'Mule', hull: 100, maxHull: 100, fuel: 40, ore: 0, parts: {}, at: homeDock() }] }); return { mission: G.mission, id: G.missionId, model: activeShip().model, look: shipActiveModel(), stat: shipStat('vmax'), hull: G.maxHull }; } catch (e) { return 'ERR ' + e.message; } })()`);
    check('no mission, the Mule flies as a Wren (a ship the game does not know), no error', r && r.mission === 'none' && r.id === null && r.look === 'wren' && r.stat === 480, JSON.stringify(r));
  });

  // ---------- NPCs ----------
  console.log('npc: new characters in the bar');
  const npcs = {
    'npcs/ada.md': '---\ntype: npc\nname: ADA\nrole: dockhand\ncolor: green\nx: 300\ny: 540\nvoice: aura-asteria-en\nappears: mission:none\n---\n## Lines\n- Mind the cables.\n- The Wren came in smoking last week.\n\n## Reactions\n| when | line |\n|---|---|\n| credits>=100 | Flush today. Buy the pilot a drink. |\n| mission:accepted | Good luck out there, {ship}. |\n\n## Persona\nWho: Ada, dockhand.\nManner: brisk.\nKnows: cables.\nWants: a quiet shift.\nWill not: lend tools.\n',
    'npcs/boris.md': '---\ntype: npc\nname: BORIS\n---\n## Lines\n- I have no spot picked. I stand where there is room.\n',
    'npcs/stacked.md': '---\ntype: npc\nname: STACKED\ncolor: pink\nx: 255\ny: 652\n---\n## Lines\n- I asked for JUNO\'s spot.\n',
    'npcs/in-door.md': '---\ntype: npc\nname: DOORMAN\nx: 460\ny: 430\n---\n## Lines\n- I wanted the doorway.\n',
    'npcs/far-away.md': '---\ntype: npc\nname: FAR\nx: 7000\ny: 7000\n---\n## Lines\n- I asked for the far side of the map.\n',
    'npcs/extra.md': '---\ntype: npc\nname: EXTRA\ncolor: gold\n---\n## Lines\n- Room for one more.\n',
    'npcs/mute.md': '---\ntype: npc\nname: MUTE\n---\n',
    'npcs/zzz-seventh.md': '---\ntype: npc\nname: SEVENTH\n---\n## Lines\n- One too many.\n'
  };
  await play(npcs, async (t, ev) => {
    const L = await ev(LOADER);
    check('six characters are added', ['ada', 'boris', 'extra', 'stacked', 'in-door', 'far-away'].every(k => L.applied.includes('npc:' + k)), JSON.stringify(L.applied));
    check('a character with no lines is refused with its file', L.errors.some(e => /mute\.md.*at least one line/.test(e)), JSON.stringify(L.errors));
    check('the seventh is refused with the limit named', L.errors.some(e => /zzz-seventh\.md/.test(e) && /at most 6 characters/.test(e)) && !L.applied.includes('npc:zzz-seventh'), JSON.stringify(L.errors));
    const rows = await ev(`NPCS.map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, css: n.css, sprite: n.sprite || null, look: !!n.look, lines: n.lines.length, persona: !!n.persona, added: !!n.added }))`);
    check('the bar has the six built-in characters and the new ones after them', rows.slice(0, 6).map(r => r.id).join() === 'juno,tamsin,dex,moss,sable,ida' && rows.filter(r => r.added).length === 6, rows.map(r => r.id).join());
    const added = rows.filter(r => r.added);
    check('nobody stands closer than 48 px to anybody else', rows.every((a, i) => rows.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= 48)), JSON.stringify(rows.map(r => [r.id, r.x, r.y])));
    check('everybody stands on the floor of the bar, outside the doorway lane and the counter and tables', added.every(r => r.x >= 52 && r.x <= 828 && r.y >= 470 && r.y <= 646 && !(r.x > 376 && r.x < 544 && r.y < 540) && !(r.x > 60 && r.x < 450 && r.y > 566 && r.y < 652) && !(r.x > 568 && r.x < 672 && r.y > 468 && r.y < 572) && !(r.x > 148 && r.x < 252 && r.y > 448 && r.y < 552)), JSON.stringify(added.map(r => [r.id, r.x, r.y])));
    const ada = rows.find(r => r.id === 'ada');
    check('Ada stands where she asked (300, 540: a free spot) and is green', ada.x === 300 && ada.y === 540 && ada.css === '#6dff9c', JSON.stringify(ada));
    check('a character with a spot taken stands near it, not on it: STACKED asked for JUNO\'s', (() => { const a = rows.find(r => r.id === 'stacked'), j = rows[0]; const d = Math.hypot(a.x - j.x, a.y - j.y); return d >= 48 && d < 200; })());
    check('every new character has a body of their own (a look and a texture name) and a default cyan when no colour is given', added.every(r => r.look && /^mod-/.test(r.sprite)) && rows.find(r => r.id === 'boris').css === '#38e1ff');
    const talk = await ev(`(() => { const n = NPCS.find(x => x.id === 'ada'); G.credits = 0; G.mission = 'none'; const a = n.react(); G.credits = 150; const b = n.react(); G.mission = 'accepted'; G.credits = 0; const c = n.react(); G.mission = 'none'; return { a, b, c, when: n.when(), persona: chatPersona(n), boris: chatPersona(NPCS.find(x => x.id === 'boris')), voice: n.voice }; })()`);
    check('reactions read the game: nothing, then "Flush today", then (mission accepted) the character is not in the bar', talk.a === null && talk.b === 'Flush today. Buy the pilot a drink.' && talk.when === true, JSON.stringify(talk));
    check('the persona is the file\'s, and a character without one gets the plain card', /Who: Ada/.test(talk.persona) && /BORIS, a regular on Halcyon Station/.test(talk.boris) && talk.voice === 'aura-asteria-en', JSON.stringify([talk.persona, talk.boris]));
    // build the bar for real
    await ev(`(() => { G.mission = 'none'; game.scene.stop('Title'); game.scene.start('Station', { arrive: false }); return 1; })()`);
    await t.waitFor(`game.scene.isActive('Station')`, 15000, 'Station active'); await sleep(900);
    const bar = await ev(`(() => { const st = game.scene.getScene('Station'); return { sprites: st.npcSprites.length, spots: st.spots.filter(s => /^Talk to/.test(s.prompt || '')).length, textures: NPCS.filter(n => n.look).map(n => game.textures.exists('in-' + n.sprite + '0') && game.textures.exists('in-' + n.sprite + '1')), visible: st.npcSprites.map(s => s.visible).filter(Boolean).length }; })()`);
    check('the Station scene makes a sprite for every character (the six, the keeper of the other bars and the six added) and every added body has its two stride textures', bar.sprites === 13 && bar.textures.every(Boolean) && bar.textures.length === 6, JSON.stringify(bar));
    const speak = await ev(`(() => { const st = game.scene.getScene('Station'); const i = NPCS.findIndex(n => n.id === 'ada'); talkTo(st, i); return { talk: !!st.talk, name: st.talkName.text, text: st.talkText.text.slice(0, 40) }; })()`);
    check('E on Ada opens the talk box with her name', speak.talk && /ADA/.test(speak.name), JSON.stringify(speak));
    await t.shot('contentadd-bar');
    await ev(`(() => { G.mission = 'accepted'; G.missionId = 'rescue'; game.scene.getScene('Station').scene.restart({ arrive: false }); return 1; })()`);
    await sleep(900);
    check('Ada is in the bar only while no call is under way (appears: mission:none)', (await ev(`(() => { const st = game.scene.getScene('Station'); const i = NPCS.findIndex(n => n.id === 'ada'); return st.npcSprites[i].visible; })()`)) === false);
  });
} catch (e) { console.error('  FAIL ' + (e && e.stack || e)); failed++; } finally {
  tmp.forEach(d => { try { rmSync(d, { recursive: true, force: true }); } catch (e) { /* tmp */ } });
}

console.log(failed ? `\nCONTENT ADD FAIL (${failed} of ${n} checks)` : `\nCONTENT ADD PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

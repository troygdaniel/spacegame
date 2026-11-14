// Adding new things from markdown (card space-game-m9-add-new, docs/MODDING.md section 12): a file with an id the code does not know
// becomes a new voice line, bar character, mission, or ship. Each case runs the real game in headless Chrome from a throwaway COPY of this
// folder whose content.generated.js is built from a small pack made here, then reads what the game plays from. Types so far: voice, ship.
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
} catch (e) { console.error('  FAIL ' + (e && e.stack || e)); failed++; } finally {
  tmp.forEach(d => { try { rmSync(d, { recursive: true, force: true }); } catch (e) { /* tmp */ } });
}

console.log(failed ? `\nCONTENT ADD FAIL (${failed} of ${n} checks)` : `\nCONTENT ADD PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

// smoke: how to travel (card space-game-travel-clarity): every star in the ship's jump range is charted at once (named, pickable, saved), the map says what a "?" is, and one line says G opens the map until a jump is made
// How a new player finds the other places (card space-game-travel-clarity). Troy played it and found one other place on the galaxy map: a new game knew Halcyon and Kestrel, so Brass Reach and
// The Hollow, both inside the jump range, were "?" dots that could not be picked, and nothing said that G opens the map. Now:
//   part 1 (plain Node, tests/nodegame.mjs): galaxyChart() (src/galaxymap.js) puts every star within the jump range of the system you are in into G.known, once, and returns the ones it added: the starter
//     at Halcyon charts Brass Reach and The Hollow and not Meridian (9.3 ly); a Pathfinder (18 ly) charts all but the Roost (18.4); from Kestrel the starter charts Meridian (6.5); the save carries them;
//     travelHint() (src/guide.js) says it only in flight, after the rescue guide, before a first jump, and not once hidden or in deep space.
//   part 2 (one Chrome): a new game in space, the way a player starts: the hint line shows, G opens a map that names the four stars of the starter's range, the "?" ones are Meridian, Lethe and the Roost,
//     the legend says what a "?" is, Brass Reach can be picked and says JUMP READY, and once the map has been opened the hint line is gone.
// Run: node tests/travel.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { chromePool, sleep } from './cdp.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); if (!cond) failed++; };

// ---- part 1: the rules, in Node ----
{
  console.log('A. the starter at Halcyon');
  const t = nodeGame();
  check('a new game knows Halcyon and Kestrel (the start list is unchanged)', (await t.ev('G.known.join()')) === 'halcyon,kestrel');
  const added = await t.ev('galaxyChart().map(s => s.id)');
  check('charting adds Brass Reach (7.5 ly) and The Hollow (7.9 ly), the two inside the 8 ly range', JSON.stringify(added) === '["brass","hollow"]', JSON.stringify(added));
  check('Meridian (9.3 ly), Lethe, Ember and the Roost stay unknown', (await t.ev('G.known.join()')) === 'halcyon,kestrel,brass,hollow');
  check('charting twice adds nothing the second time', (await t.ev('galaxyChart().length')) === 0);
  check('every star in range can be jumped to: the card says ok for Brass Reach and The Hollow', (await t.ev(`['brass', 'hollow'].map(id => galaxyJump(galaxyFind('halcyon'), galaxyFind(id)).ok).join()`)) === 'true,true');
  check('the save carries them (the snapshot lists the known stars)', (await t.ev('snapshot().known.join()')) === 'halcyon,kestrel,brass,hollow');

  console.log('B. a longer range, and another system');
  const e = nodeGame();
  await e.ev("(() => { activeShip().model = 'pathfinder'; return 1; })()");
  check('a Pathfinder has an 18 ly range', (await e.ev("shipStat('range')")) === 18);
  const far = await e.ev('galaxyChart().map(s => s.id)');
  check('it charts everything but the Roost (18.4 ly from Halcyon)', JSON.stringify(far.sort()) === JSON.stringify(['brass', 'ember', 'hollow', 'lethe', 'meridian']), JSON.stringify(far));
  const k = nodeGame();
  await k.ev("(() => { G.system = 'kestrel'; return 1; })()");
  const fromK = await k.ev('galaxyChart().map(s => s.id)');
  check('from Kestrel the starter charts Meridian (6.5 ly) and Halcyon is already known; not the Roost (12.2 ly)', fromK.includes('meridian') && !fromK.includes('roost') && !fromK.includes('halcyon'), JSON.stringify(fromK));
  const j = nodeGame();
  check('arriving by jump (enterSystem) then charting: Kestrel is where you are, so Meridian is charted and Brass Reach is not (13.7 ly from Kestrel)', await j.ev("(() => { enterSystem('kestrel', 'halcyon'); const a = galaxyChart().map(s => s.id); return a.includes('meridian') && !a.includes('brass') && G.known.includes('meridian') && !G.known.includes('brass'); })()"));
  check('a game with no system under G.system charts nothing and does not throw', await j.ev("(() => { G.system = 'nowhere'; return galaxyChart().length === 0; })()"));

  console.log('C. the line that says G opens the map');
  const h = nodeGame();
  const hint = o => h.ev(`(() => { G.guideDone = ${o.done !== false}; G.jumps = ${o.jumps || 0}; G.deep = ${o.deep ? '{}' : 'null'}; TRAVEL.off = ${!!o.off}; return travelHint({ scene: { key: '${o.scene || 'Space'}' }, dead: ${!!o.dead}, cruising: ${!!o.cruising} }); })()`);
  check('in flight, rescue guide done, no jump yet: the line says G opens the galaxy map', /^Other stars to visit: G opens the galaxy map/.test(await hint({})), await hint({}));
  check('not while the rescue guide is still running (it has its own line)', (await hint({ done: false })) === '');
  check('not once a jump has been made', (await hint({ jumps: 1 })) === '');
  check('not in the station, not in cruise, not when dead, not in deep space', (await hint({ scene: 'Station' })) === '' && (await hint({ cruising: true })) === '' && (await hint({ dead: true })) === '' && (await hint({ deep: true })) === '');
  check('not once it was hidden or the map was opened (TRAVEL.off)', (await hint({ off: true })) === '');
  check('no console errors in Node', t.errors.length + e.errors.length + k.errors.length + j.errors.length + h.errors.length === 0, [...t.errors, ...e.errors, ...k.errors, ...j.errors, ...h.errors].join(' | '));
}

// ---- part 2: a new player in space, in Chrome ----
const pool = chromePool();
{
  const t = await pool.open('#space');   // the dev hash: a new game in Space that neither loads nor overwrites a save
  const key = async k => {
    const [vk, code, key] = { G: [71, 'KeyG', 'g'], ESC: [27, 'Escape', 'Escape'] }[k];
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key }); await sleep(90);
    await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key }); await sleep(300);
  };
  const GM = "game.scene.getScene('Galaxy')", SP = "game.scene.getScene('Space')";
  const texts = () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${GM}.children.list.forEach(walk); return out.join('|'); })()`);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 30000, 'space');
    await sleep(1200);

    console.log('D. the line in flight');
    check('a new game is at Halcyon knowing Halcyon and Kestrel, with no jump made', (await t.ev('G.system + ":" + G.known.join() + ":" + G.jumps')) === 'halcyon:halcyon,kestrel:0');
    check('during the rescue guide the guide\'s own line shows, not the travel line', !/galaxy map/.test(await t.ev(`${SP}._gh.text`)));
    await t.ev('(G.guideDone = true, 1)'); await sleep(700);
    check('with the guide done the line says G opens the galaxy map, and it can be hidden with H', /G opens the galaxy map. Pick one, press Enter to jump/.test(await t.ev(`${SP}._gh.text`)) && await t.ev(`${SP}._gh.visible && ${SP}._gk.visible && ${SP}._gk.text`) === 'H  hide tips');
    await t.shot('travel-1-hint');

    console.log('E. G opens a map with every star in range');
    await key('G'); await sleep(1200);
    check('the galaxy map is open over the flight', await t.ev("game.scene.isActive('Galaxy')"));
    check('it names Halcyon, Kestrel, Brass Reach and The Hollow', JSON.stringify(await t.ev(`${GM}.known.map(s => s.id)`)) === '["halcyon","kestrel","brass","hollow"]');
    check('the "?" dots are Meridian, Lethe and the Roost, all out of range', JSON.stringify((await t.ev(`${GM}.dim.map(s => s.id)`)).sort()) === '["lethe","meridian","roost"]');
    const s1 = await texts();
    check('the map says what a "?" is: beyond your range', /\?\|beyond your range/.test(s1), s1.slice(s1.indexOf('in range of your ship'), s1.indexOf('in range of your ship') + 80));
    check('the stars named are on the map by name', ['HALCYON', 'KESTREL', 'BRASS REACH', 'THE HOLLOW'].every(w => s1.includes(w)));
    check('and they are saved: a game saved now knows the four', (await t.ev('snapshot().known.join()')) === 'halcyon,kestrel,brass,hollow');
    await t.ev(`${GM}.pick('brass')`); await sleep(200);
    const s2 = await texts();
    check('Brass Reach can be picked (it was a "?" before) and the card says JUMP READY, press Enter', await t.ev(`${GM}.sel`) === 'brass' && s2.includes('BRASS REACH') && s2.includes('JUMP READY') && s2.includes('Press Enter to jump.'));
    await t.shot('travel-2-map');
    await key('ESC'); await sleep(700);
    check('closing the map gives the flight back', !(await t.ev("game.scene.isActive('Galaxy')")) && !(await t.ev(`${SP}.scene.isPaused()`)));
    check('and the travel line is gone for good now the map has been opened', (await t.ev(`${SP}._gh.text`)) === '' && (await t.ev('TRAVEL.off')) === true);
    check('no console errors in the browser', t.errors.length === 0, t.errors.join(' | '));
  } finally { await pool.close(); }
}

console.log(failed ? `\n${failed} FAILED` : '\nall travel checks passed');
process.exit(failed ? 1 : 0);

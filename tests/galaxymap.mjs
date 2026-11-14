// The galaxy map overlay (src/galaxymap.js, card space-game-u-b2-galaxy-map; docs/UNIVERSE.md 4.3 and 9). Real key presses over DevTools, real time.
// Checks: it opens with the test hash #galaxy, and with G (card u-b4: read only in the station); the eight systems of the stub against the design table; known stars drawn,
// unknown ones near a known one as "?" and not pickable; the card for the pick (distance, fuel cost, time, pump, danger, what is there) and its
// verdict (jump ready, out of range by so many ly, short by so many units); a courier reaches further; galaxyJump agrees with jumpCheck of src/fuel.js
// where both know the systems; the arrow keys, Tab and a click choose; Enter calls onJump only for a jump the ship can make, and does nothing without one;
// Esc closes. Screenshots: tests/out/galaxy-*.png. Run: node tests/galaxymap.mjs   (exit code 1 on any failure). One Chrome at a time, closed at the end.
import { chromePool, sleep } from './cdp.mjs';

let failed = 0;
const pool = chromePool(); // every case shares one Chrome (one turn at the test lock), each starting on a clean profile (tests/cdp.mjs goto)
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };
const KEYS = { A: [65, 'KeyA', 'a'], D: [68, 'KeyD', 'd'], W: [87, 'KeyW', 'w'], S: [83, 'KeyS', 's'], G: [71, 'KeyG', 'g'], ENTER: [13, 'Enter', 'Enter'], ESC: [27, 'Escape', 'Escape'], TAB: [9, 'Tab', 'Tab'],
  LEFT: [37, 'ArrowLeft', 'ArrowLeft'], RIGHT: [39, 'ArrowRight', 'ArrowRight'], UP: [38, 'ArrowUp', 'ArrowUp'], DOWN: [40, 'ArrowDown', 'ArrowDown'], H: [72, 'KeyH', 'h'] };
const mk = t => async (k, hold = 90) => { // the harness's own key table is short, so this sends the key itself
  const [vk, code, key] = KEYS[k];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key }); await sleep(hold);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key }); await sleep(260);
};
const GM = "game.scene.getScene('Galaxy')";
const texts = t => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${GM}.children.list.forEach(walk); return out.join('|'); })()`);

// ---- part 1: the map itself, from the test hash ----
{
  const t = await pool.open('#galaxy');
  const press = mk(t);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Galaxy'))", 20000, 'galaxy map');
    await sleep(900);

    console.log('A. the eight of the design table');
    const sys = await t.ev('galaxySystems().map(s => [s.id, s.kind, s.ly[0], s.ly[1], s.danger, s.pump, s.station])');
    const want = [['halcyon', 'home', 20, 22, 1, 8, true], ['kestrel', 'outpost', 25.5, 19, 1, 7, true], ['meridian', 'trade', 29, 24.5, 1, 9, true], ['brass', 'mining', 14, 26.5, 2, 6, true],
      ['hollow', 'wild', 13.5, 17.5, 2, 0, false], ['lethe', 'graveyard', 7.5, 30, 2, 0, false], ['ember', 'volcanic', 34, 31, 3, 7, true], ['roost', 'nest', 37, 15, 5, 15, true]];
    check('eight systems with the design table\'s places, dangers and pumps', JSON.stringify(sys) === JSON.stringify(want), JSON.stringify(sys).slice(0, 120));
    const ly = (a, b) => t.ev(`Math.round(galaxyLy(galaxyFind('${a}'), galaxyFind('${b}')) * 10) / 10`);
    check('the distances in the design table: Halcyon to Kestrel 6.3, to Meridian 9.3, to Brass 7.5, to the Hollow 7.9; Kestrel to Meridian 6.5; Meridian to Ember 8.2; Kestrel to the Roost 12.2',
      [await ly('halcyon', 'kestrel'), await ly('halcyon', 'meridian'), await ly('halcyon', 'brass'), await ly('halcyon', 'hollow'), await ly('kestrel', 'meridian'), await ly('meridian', 'ember'), await ly('kestrel', 'roost')].join() === '6.3,9.3,7.5,7.9,6.5,8.2,12.2');

    console.log('B. it opens from the hash, and shows what is known');
    check('the scene is up from the hash, nothing was saved by it', await t.ev("game.scene.isActive('Galaxy') && !game.scene.isActive('Title') && DEV_HASH === true"));
    const s1 = await texts(t);
    ['GALAXY', 'HALCYON', 'KESTREL', 'MERIDIAN', 'BRASS REACH', 'THE HOLLOW', 'YOU', 'HOME', 'PIRATE NEST', 'in range of your ship', 'your jump range'].forEach(w => check('shows ' + w, s1.includes(w)));
    check('three unknown stars within reach of a known one show as "?" (Lethe, Ember, the Roost), and are not named', (s1.match(/\?/g) || []).length === 3 && !s1.includes('LETHE') && !s1.includes('EMBER') && !s1.includes('ROOST'));
    check('the tag says where you are, your range and your fuel', s1.includes('YOU  HALCYON   RANGE 8 LY   FUEL 40 / 40'), s1.slice(s1.indexOf('YOU  '), s1.indexOf('YOU  ') + 50));
    await t.ev(`${GM}.pick('lethe')`);
    check('an unknown star cannot be picked', await t.ev(`${GM}.sel`) === 'kestrel');

    console.log('C. the card for the nearest star');
    check('Kestrel is picked first: the nearest known star', await t.ev(`${GM}.sel`) === 'kestrel');
    const c1 = await texts(t);
    ['KESTREL', 'FRONTIER OUTPOST', 'DISTANCE', '6.3 ly', 'FUEL COST', '6.3 units', 'YOU HAVE', '40 / 40', 'TIME', '10 s', 'FUEL PUMP', '7 cr a unit', 'DANGER', 'LOW', 'JUMP READY', 'Jumps start from space: launch, then press G.']
      .forEach(w => check('card shows ' + w, c1.includes(w)));
    check('and the pick is ok', await t.ev(`${GM}.verdict`) === 'ok');
    await t.shot('galaxy-1-default');

    console.log('D. out of range, and short of fuel');
    await t.ev(`${GM}.pick('meridian')`);
    const c2 = await texts(t);
    check('Meridian is 9.3 ly: out of range by 1.3 ly for the starter, and it says what to do', c2.includes('OUT OF RANGE BY 1.3 LY') && c2.includes('You reach 8 ly') && c2.includes('TRADE HUB') && await t.ev(`${GM}.verdict`) === 'range', c2.slice(c2.indexOf('OUT OF')));
    await t.shot('galaxy-2-out-of-range');
    await t.ev("(() => { G.fleet[G.active].fuel = 3; return 1; })()");
    await t.ev(`${GM}.scene.restart({ from: null })`); await sleep(1200);
    await t.ev(`${GM}.pick('kestrel')`);
    const c3 = await texts(t);
    check('with 3 units left the jump to Kestrel is short by 3.3 and says to use the pump here', c3.includes('SHORT BY 3.3 UNITS') && c3.includes('Fill up at the pump here first') && c3.includes('3 / 40') && await t.ev(`${GM}.verdict`) === 'fuel', c3.slice(c3.indexOf('SHORT')));
    check('the tag shows the low tank', (await texts(t)).includes('FUEL 3 / 40'));
    await t.shot('galaxy-3-short-fuel');
    await t.ev("(() => { G.fleet[G.active].fuel = 40; return 1; })()");

    console.log('E. no pump, danger, and a ship that reaches further');
    await t.ev(`${GM}.scene.restart({ from: null })`); await sleep(1200);
    await t.ev(`${GM}.pick('hollow')`);
    const c4 = await texts(t);
    check('the Hollow has no pump, moderate danger, and says to bring fuel home', c4.includes('FUEL PUMP') && c4.includes('none') && c4.includes('MODERATE') && c4.includes('bring fuel home') && c4.includes('7.9 ly') && c4.includes('7.9 units'));
    await t.ev("(() => { G.fleet[G.active].model = 'kite'; G.fleet[G.active].name = 'Kite'; G.fleet[G.active].fuel = shipStat('tank'); return 1; })()");
    await t.ev(`${GM}.scene.restart({ from: null })`); await sleep(1200);
    check('a Kite reaches 14 ly: the tag says so', (await texts(t)).includes('RANGE 14 LY'));
    await t.ev(`${GM}.pick('meridian')`);
    const c5 = await texts(t);
    check('Meridian is in range for a Kite and costs 9.3 ly x 0.6 = 5.6 units', c5.includes('JUMP READY') && c5.includes('5.6 units') && await t.ev(`${GM}.verdict`) === 'ok', c5.slice(c5.indexOf('FUEL COST'), c5.indexOf('FUEL COST') + 40));
    await t.shot('galaxy-4-courier');
    await t.ev("(() => { G.fleet[G.active].model = 'wren'; G.fleet[G.active].name = 'Wren'; G.fleet[G.active].fuel = 40; return 1; })()");

    console.log('F. galaxyJump agrees with jumpCheck of the fuel rules');
    await t.ev("(() => { SYSTEMS.kestrel = { id: 'kestrel', name: 'Kestrel', kind: 'outpost', ly: [25.5, 19], danger: 1, bodies: [{ id: 'kestrel-outpost', type: 'station', name: 'Kestrel Outpost', x: 3000, y: 3000, dock: { fuel: 7 } }] }; return 1; })()");
    const same = await t.ev(`(() => { const a = galaxyJump(galaxyFind('halcyon'), galaxyFind('kestrel')), b = jumpCheck('halcyon', 'kestrel'); return a.ok === b.ok && a.cost === b.cost && Math.abs(a.ly - b.ly) < 1e-9 && a.why === b.why; })()`);
    check('same answer for Halcyon to Kestrel', same === true);
    check('once a system exists in SYSTEMS the map takes it from there (its pump price and name)', await t.ev("(() => { SYSTEMS.kestrel.name = 'Kestrel Prime'; SYSTEMS.kestrel.bodies[0].dock.fuel = 11; const s = galaxyFind('kestrel'); return s.name === 'Kestrel Prime' && s.pump === 11; })()"));
    await t.ev('delete SYSTEMS.kestrel');

    console.log('G. choosing: keys and clicks');
    await t.ev(`${GM}.scene.restart({ from: null })`); await sleep(1200);
    await t.ev(`${GM}.pick('halcyon')`);
    check('Halcyon says you are here and shows your range and fuel', (await texts(t)).includes('YOU ARE HERE') && (await texts(t)).includes('JUMP RANGE') && await t.ev(`${GM}.verdict`) === 'here');
    await t.ev(`${GM}.pick('kestrel')`);
    await press('RIGHT');
    check('right from Kestrel goes to Meridian, the nearest star that way', await t.ev(`${GM}.sel`) === 'meridian');
    await press('LEFT'); await press('LEFT');
    check('left twice from Meridian goes back past Kestrel to Halcyon', await t.ev(`${GM}.sel`) === 'halcyon');
    await t.ev(`${GM}.pick('brass')`); await press('UP');
    check('up from Brass Reach goes to the Hollow, the star straight above', await t.ev(`${GM}.sel`) === 'hollow');
    await t.ev(`${GM}.pick('halcyon')`); await press('DOWN');
    check('down from Halcyon goes to Brass Reach', await t.ev(`${GM}.sel`) === 'brass');
    await press('TAB');
    check('Tab goes to the next star by distance', await t.ev(`${GM}.sel`) !== 'hollow');
    // a click on a star's place picks it
    const p = await t.ev(`(() => { const n = ${GM}.nodes.brass, r = game.canvas.getBoundingClientRect(), k = r.width / 1280; return { x: r.left + (640 + n.x) * k, y: r.top + (360 + n.y) * k }; })()`);
    await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await sleep(300);
    check('a click on Brass Reach picks it', await t.ev(`${GM}.sel`) === 'brass', await t.ev(`${GM}.sel`));

    console.log('H. Enter');
    await t.ev(`${GM}.pick('kestrel')`);
    await press('ENTER');
    check('with no onJump Enter does nothing and the scene stays', await t.ev(`game.scene.isActive('Galaxy')`) === true);
    await t.ev("(() => { window.__jumped = null; return 1; })()");
    await t.ev(`${GM}.scene.restart({ from: null, onJump: (id, j) => { window.__jumped = id + ':' + j.cost; } })`); await sleep(1200);
    await t.ev(`${GM}.pick('kestrel')`); await press('ENTER');
    check('with onJump, Enter on a star the ship can reach calls it with the star and the check', await t.ev('window.__jumped') === 'kestrel:6.3');
    await t.ev("(() => { window.__jumped = null; return 1; })()");
    await t.ev(`${GM}.pick('meridian')`); await press('ENTER');
    check('but not for a star out of range', await t.ev('window.__jumped') === null);
    await t.ev(`${GM}.pick('halcyon')`); await press('ENTER');
    check('nor for the star you are at', await t.ev('window.__jumped') === null);
    check('the hint line offers Jump only when there is an onJump', (await texts(t)).includes('Jump'));

    console.log('I. Esc');
    await press('ESC');
    await t.waitFor("game.scene.isActive('Title') && !game.scene.isActive('Galaxy')", 8000, 'title');
    check('Esc closes the map (the test hash has nothing to go back to, so the title)', await t.ev("game.scene.isActive('Title')"));
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 2: G opens it in the station, read only ----
{
  const t = await pool.open('#station');
  const press = mk(t);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await sleep(600);
    console.log('J. G opens it, read only, in the station (card u-b4); Tab and H do not');
    for (const k of ['TAB', 'H']) { await press(k); await sleep(200); if (await t.ev("game.scene.isActive('Overlay')")) await press(k); }
    check('Tab and H in the station never open the galaxy map', await t.ev("!game.scene.isActive('Galaxy')"));
    await press('G'); await sleep(700);
    check('G in the station opens it, with no onJump: it only shows', await t.ev("game.scene.isActive('Galaxy') && !game.scene.getScene('Galaxy').onJump"));
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

await pool.close();
console.log(failed ? `GALAXY MAP FAIL (${failed})` : 'GALAXY MAP PASS');
process.exit(failed ? 1 : 0);

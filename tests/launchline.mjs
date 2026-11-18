// smoke: the launch banner names where the current call sends you and which way that is, or nothing: not Kepler-4b on every launch (plain Node, no Chrome)
// The banner a launch from the station shows (spaceLaunchLine in src/space.js; card space-game-bug-escort-launch-banner). It said
// "Launch clear. Kepler-4b is to the north-east." on every launch in Halcyon, whatever the call: on an escort that sent the player the
// wrong way. The line is worked out from the game state, so it runs here with a stand-in scene.
// Run: node tests/launchline.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  // a stand-in Space scene the moment the banner is shown: the ship on the pad beside the station, the call's own ships not in space yet (no s.mx)
  function __launch() { const st = sysBody('station'), pl = sysBody('planet'); return { scene: { key: 'Space' }, ship: { x: st.x + 250, y: st.y }, station: { x: st.x, y: st.y }, planet: pl ? { x: pl.x, y: pl.y } : { x: -60000, y: -60000 }, planetR: pl ? pl.r : 0, cr: { target: null } }; }
  function __call(id, state) { G.missionId = id; G.mission = state || 'accepted'; G.missionProgress = 0; }
  // which way a body is from the pad, worked out here and not by the game: the screen's y grows downward, so north is up
  function __way(b) { const s = __launch(), a = Math.atan2(b.y - s.ship.y, b.x - s.ship.x) * 180 / Math.PI; return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(a / 45) % 8) + 8) % 8]; }
`);
const planet = J(`sysBody('planet').name`), gate = J(`sysBody('gate').name`), station = J(`sysBody('station').name`);
const wayPlanet = J(`__way(sysBody('planet'))`), wayGate = J(`__way(sysBody('gate'))`);

g.run(`__call('escort')`);
let line = J(`spaceLaunchLine(__launch())`);
check('an escort: the banner does not send you to Kepler-4b', !/Kepler-4b/.test(line), line);
check('an escort: it names where the MULE is bound and which way that is', line === `Launch clear. ${gate} is to the ${wayGate}.`, line);
g.run(`__call('rescue')`);
line = J(`spaceLaunchLine(__launch())`);
check('the rescue: it names the planet and the way it really lies from the pad', line === `Launch clear. ${planet} is to the ${wayPlanet}.`, line);
g.run(`G.mission = 'none'; G.missionId = null;`);
line = J(`spaceLaunchLine(__launch())`);
check('no call: only "Launch clear."', line === 'Launch clear.', line);
g.run(`__call('rescue', 'done')`);
check('a call that is finished: only "Launch clear."', J(`spaceLaunchLine(__launch())`) === 'Launch clear.');
for (const id of J(`MISSIONS.map(m => m.id)`)) {
  g.run(`__call('${id}')`);
  line = J(`spaceLaunchLine(__launch())`);
  check(`call ${id}: a line that starts "Launch clear." and never names the station you just left`, /^Launch clear\./.test(line) && !line.includes(station) && !/undefined|null|NaN/.test(line), line);
}
check('the eight ways: east, south-east, south, south-west, west, north-west, north, north-east (north is up the screen)', J(`[[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => spaceCompass(x, y))`).join() === 'east,south-east,south,south-west,west,north-west,north,north-east');
g.run(`G.mission = 'none'; G.missionId = null;`);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `LAUNCHLINE FAIL (${failed} of ${n})` : `LAUNCHLINE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

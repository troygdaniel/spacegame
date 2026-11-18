// smoke: the first-run tip in flight names what the amber arrow points at: the rescue's planet, the escort's freighter, a picked nav target (plain Node, no Chrome)
// The standing tip of src/guide.js (card space-game-critic-tips, docs/CRITIC.md 5). It said "Follow the amber arrow to Kepler-4b" on any
// accepted call: during an escort, and with the gate picked in the nav list, while the arrow pointed somewhere else. guideHint is worked out
// from the game state, so it runs here with a stand-in scene: the tip must name the same thing hudObjective (src/hud.js) puts the arrow on.
// Run: node tests/guidetips.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  // a stand-in Space scene at Halcyon: the station at the origin, the planet 6000 px west, the ship where the test puts it
  function __space(x, y, o) {
    const st = sysBody('station'), pl = sysBody('planet');
    return Object.assign({ scene: { key: 'Space' }, ship: { x, y }, station: { x: st.x, y: st.y }, planet: { x: pl.x, y: pl.y }, planetR: pl.r || 300, cr: { target: null }, mx: {} }, o || {});
  }
  // the tip, and the name the amber arrow has for the same state
  function __tip(s) { const o = hudObjective(s, 'Space'); return { tip: guideHint(s), arrow: o ? o.name : null }; }
  function __call(id, state) { G.missionId = id; G.mission = state || 'accepted'; G.missionProgress = 0; }
`);
const planet = J(`sysBody('planet').name`), station = J(`sysBody('station').name`), gate = J(`sysBody('gate').name`);
const far = `sysBody('planet').x + 3000, sysBody('planet').y`;

// ---- the rescue: as it always read ----
g.run(`__call('rescue')`);
let r = J(`__tip(__space(${far}))`);
check('rescue, far from the planet: the old line, with the planet\'s name', r.tip === `W thrusts, A and D turn, Space fires. Follow the amber arrow to ${planet}.` && r.arrow === planet.toUpperCase(), JSON.stringify(r));
r = J(`__tip(__space(sysBody('planet').x + 200, sysBody('planet').y))`);
check('rescue, close to the planet: slow down and land there', r.tip === `Hold S to slow down, then press L to land on ${planet}.`, r.tip);
check('the planet is named from the system, not written into the tip', J(`guideHint.toString().includes('Kepler')`) === false);

// ---- an escort: the arrow is on the freighter, then on the gate ----
g.run(`__call('escort')`);
r = J(`__tip(__space(${far}, { mx: { freighter: { x: 500, y: 500, active: true } } }))`);
check('escort: the tip names the freighter the arrow is on, not the planet', r.arrow === 'FREIGHTER MULE' && r.tip.endsWith('Follow the amber arrow: FREIGHTER MULE.') && !r.tip.includes(planet), JSON.stringify(r));
r = J(`__tip(__space(sysBody('planet').x + 200, sysBody('planet').y, { mx: { freighter: { x: 500, y: 500, active: true } } }))`);
check('escort, passing close to the planet: it does not say to land', !/land/.test(r.tip) && r.tip.includes('FREIGHTER MULE'), r.tip);
r = J(`__tip(__space(${far}, { mx: { freighter: null } }))`);
check('escort with the freighter gone: the arrow and the tip are on the gate', r.arrow === gate.toUpperCase() && r.tip.includes(gate.toUpperCase()), JSON.stringify(r));

// ---- every call that has an arrow in this system: the tip carries the arrow's own name ----
const ids = J(`MISSIONS.map(m => m.id)`);
let agree = 0, seen = 0; const bad = [];
for (const id of ids) {
  g.run(`__call('${id}')`);
  r = J(`(() => { try { return __tip(__space(${far}, { mx: { freighter: { x: 500, y: 500, active: true } } })); } catch (e) { return { err: String(e.message) }; } })()`);
  if (r.err || !r.arrow) continue; // a call whose goal is in another system has no arrow here (and its space code may need a real scene)
  seen++;
  if (r.tip.toUpperCase().includes(r.arrow)) agree++; else bad.push(id + ': ' + r.tip + ' / ' + r.arrow);
}
check(`for every call with an arrow here (${seen} of ${ids.length}), the tip names what the arrow names`, seen >= 3 && agree === seen, bad.join(' | '));

// ---- a target picked in the nav list wins the arrow, and the tip follows ----
g.run(`__call('rescue')`);
r = J(`__tip(__space(${far}, { cr: { target: sysBody('gate') } }))`);
check('rescue with the gate picked in the nav list: arrow and tip both on the gate', r.arrow === gate.toUpperCase() && r.tip.endsWith('Follow the amber arrow: ' + gate.toUpperCase() + '.') && !r.tip.includes(planet), JSON.stringify(r));
r = J(`__tip(__space(sysBody('planet').x + 200, sysBody('planet').y, { cr: { target: sysBody('gate') } }))`);
check('and near the planet it does not say to land while the arrow is on the gate', !/land/.test(r.tip), r.tip);
r = J(`__tip(__space(${far}, { cr: { target: sysBody('planet') } }))`);
check('rescue with its own planet picked: the rescue line as usual', r.tip.endsWith(`Follow the amber arrow to ${planet}.`), r.tip);
g.run(`__call(null, 'none')`);
r = J(`__tip(__space(${far}, { cr: { target: sysBody('gate') } }))`);
check('no call, the gate picked: the tip says the arrow is on the picked target', r.tip === 'The amber arrow is on the target you picked: ' + gate.toUpperCase() + '.' && r.arrow === gate.toUpperCase(), JSON.stringify(r));
r = J(`__tip(__space(${far}))`);
check('no call, nothing picked: dock at the station of this system', r.tip === `No rescue yet. Follow the arrow to ${station} and press L to dock.` && r.arrow === station.toUpperCase(), JSON.stringify(r));

// ---- the way home and the other scenes are as they were ----
g.run(`__call('rescue', 'rescued')`);
check('colonist aboard, far out: follow the arrow home', J(`guideHint(__space(${far}))`) === 'Colonist aboard. Follow the amber arrow home to the station.');
check('colonist aboard, at the station: slow down and dock', J(`guideHint(__space(sysBody('station').x + 100, sysBody('station').y))`) === 'Hold S to slow down, then press L to dock.');
check('a dead ship has no tip', J(`(() => { const s = __space(${far}); s.dead = true; return guideHint(s); })()`) === '');
g.run(`__call(null, 'none')`);
check('the station and the surface tips are unchanged', J(`guideHint({ scene: { key: 'Station' } })`) === 'Walk left to the MISSIONS terminal and press E.' && J(`guideHint({ scene: { key: 'Surface' }, col: { state: 'waiting' } })`).startsWith('Walk east to the crashed pod'));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `GUIDE TIPS FAIL (${failed} of ${n})` : `GUIDE TIPS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;

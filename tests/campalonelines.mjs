// smoke: 1.3's two voiced rear-raid lines play only when the raid really goes for the last hauler (card space-game-13-alone-lines-guarded; Troy, 26 Nov 2026: yes): "Pirates on the last hauler. She is alone back there." and "More of them, on the last hauler again." (plain Node, no Chrome)
// The lines are a wave row's `say`. With the guard rule (card space-game-fighter-job-13) a fighter of yours within 500 px of her makes the raid go elsewhere, so the line would be untrue: it is no longer said when the wave spawns (src/campaign.js) but
// when a pirate of the raid has picked the hauler the row names (src/camppirates.js campPirateAI), once. Not reworded, not re-recorded: the same two keys.
// Run: node tests/campalonelines.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`{
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 2 }); C.god = true; C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); for (let i = 0; i < 40 * 30; i++) campStep(C, 1 / 30); C.ships = C.ships.filter(u => u.team !== 'alien' && u.kind !== 'fighter'); C.events.length = 0; window.HL = ['h1', 'h2', 'h3'].map(id => C.by['freighter-' + id]); return C; };
  window.__fighter = (dx, dy) => { const f = campSpawn(C, 'fighter', HL[2].x + dx, HL[2].y + dy); f.team = 'earth'; f.docked = false; return f; };
  window.__raider = (wave, prey) => { const u = campSpawn(C, 'skiff', HL[2].x - 300, HL[2].y + 100); u.wave = wave; u.prey = prey || 'haulers'; u.hitBy = null; return u; };
}`);


g.run(`{ window.__says = (key) => C.events.filter(e => e.type === 'say' && e.key === key).length; window.__ai = (u, k) => { for (let i = 0; i < k; i++) campPirateAI(C, u, 1 / 30); }; }`);

const rows = J(`(() => { __new(); return C.L.waves.map(w => [w.along || null, w.guard || null, w.say || null]).filter(r => r[0]); })()`);
check('1.3\'s two rear raids carry guard 500 along h3 and the two voiced keys, unchanged', JSON.stringify(rows) === JSON.stringify([['h3', 500, 'camp.say.l1p.rear'], ['h3', 500, 'camp.say.l1p.again']]), JSON.stringify(rows));

const free = J(`(() => { __new(); C.waves[2].started = true; const u = __raider(2); __ai(u, 3); const once = __says('camp.say.l1p.rear'); __ai(u, 30); return { once, later: __says('camp.say.l1p.rear'), told: !!C.waves[2].told, goal: u.id && campPirateTarget(C, u).id }; })()`);
check('nobody guards her: a pirate of the first rear raid has picked her, and the line is said, once (not again 30 steps later)', free.once === 1 && free.later === 1 && free.told === true && free.goal === 'freighter-h3', JSON.stringify(free));

const guarded = J(`(() => { __new(); C.waves[2].started = true; const f = __fighter(200, 0); const u = __raider(2); __ai(u, 30); return { says: __says('camp.say.l1p.rear'), told: !!C.waves[2].told, target: campPirateTarget(C, u).id }; })()`);
check('a fighter of yours 200 px from her: the raid goes elsewhere and the line is NOT said (it would be untrue)', guarded.says === 0 && guarded.told === false && guarded.target !== 'freighter-h3', JSON.stringify(guarded));

const later = J(`(() => { __new(); C.waves[2].started = true; const f = __fighter(200, 0); const u = __raider(2); __ai(u, 10); const during = __says('camp.say.l1p.rear'); f.hp = 0; __ai(u, 10); const after = __says('camp.say.l1p.rear'); __ai(u, 30); return { during, after, again: __says('camp.say.l1p.rear') }; })()`);
check('the fighter leaves and the raid comes on her: the line is said then, once', later.during === 0 && later.after === 1 && later.again === 1, JSON.stringify(later));

const again = J(`(() => { __new(); C.waves[4].started = true; const u = __raider(4); __ai(u, 3); const free = __says('camp.say.l1p.again'); __new(); C.waves[4].started = true; __fighter(100, 100); const v = __raider(4); __ai(v, 30); return { free, guarded: __says('camp.say.l1p.again'), other: __says('camp.say.l1p.rear') }; })()`);
check('the second rear raid says "again" on the same rules: said when she is alone, silent when a fighter is by her, and it never says the first one\'s line', again.free === 1 && again.guarded === 0 && again.other === 0, JSON.stringify(again));

const other = J(`(() => { __new(); C.waves[0].started = true; const u = __raider(0); __ai(u, 10); return { told: !!C.waves[0].told, rear: __says('camp.say.l1p.rear'), again: __says('camp.say.l1p.again') }; })()`);
check('a wave with no guard row (the probe at the front, wave 1) is not touched: it never sets told and says no rear line', other.told === false && other.rear === 0 && other.again === 0, JSON.stringify(other));

const spawn = J(`(() => { __new(); const w = C.L.waves[2]; w.on = { t: 0 }; C.waves[2].started = false; C.events.length = 0; campStep(C, 1 / 30); return { started: C.waves[2].started, saidAtSpawn: __says('camp.say.l1p.rear') }; })()`);
check('the wave spawning does not say the line by itself (the first step of the raid: started, line not yet said unless a pirate has already picked her)', spawn.started === true && spawn.saidAtSpawn <= 1, JSON.stringify(spawn));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP ALONE LINES OK (${n} checks)`);
process.exit(failed ? 1 : 0);

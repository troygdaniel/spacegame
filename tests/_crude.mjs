// smoke: the Campaign's game in plain numbers (src/campaign.js): the tuning table, the five orders, plain words as orders, whole battles flown in Node, techs, the save (plain Node, no Chrome)
// Card space-game-campaign-mvp (docs/CAMPAIGN.md). The scene (src/campaignscene.js) only draws what these numbers say, so the rules are tested here, not in a browser.
//   A. the table: levels, waves, convoys, techs, and every text the game reads for them is in content/text/ui.md
//   B. the orders: launch one ship every 600 ms, attack, escort, guard, recall, and what each refuses to do and says
//   C. plain words as orders (campIntent) and what an order names (campFind)
//   D. whole battles: doing nothing loses; a sensible player wins within a few minutes on every seed; the same seed flies the same
//   E. the numbers: carrier speed and hull, Earth's shield, the techs, the repair field
//   F. the save: the level and the techs, apart from the Long Haul save; Long Haul is not touched
//   H. the scene's keys on a stand-in (cards one-list-keys and keys2-cruiser): S opens the cruiser list (a numbered list: its digits do its rows), Esc closes it, Q W [ ] are who and the order and the target; one list at a time,
//      hidden until asked for; Up and Down move the highlight, Enter gives the row (on a part's row: opens that part), Left goes back onto that row, Esc or the list's key closes it; no order has a key of its own (a digit and a
//      letter that is no key do nothing in flight), a row that can never be used in the mission is not in its list, the ship coasts while a list is open
// Run: node tests/campaign.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g, 1); // the old Level 1, the belt, as level 1: this suite was written for it and pins its missions (card space-game-l1-rim-missions; the rim run is tests/camprim.mjs)
g.run('campBlinkSet(true)'); // card space-game-keys7-trim: the warp blink (its row and its tech) is switched off in the game; this suite is about it, so it switches it on
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__esc = (C, who, all) => { const t = campFind(C, who || 'convoy'), cv = t && t.kind === 'convoy' ? C.by[t.id] : campNearest(campConvoys(C), C.carrier); return cv ? campWingOrder(C, all ? 'fighters' : 'yellow', 'escort', cv.id, 'bot') : { ok: false }; }; // the escort of the old wing is the yellow squad now (two ships; card space-game-cut-escorts)
  window.__atk = (C, arg) => { ['red', 'green'].forEach(k => campWingOrder(C, k, 'attack', arg === 'mothership' ? 'mother' : null, 'bot')); }; // the attack of the old wing: the red and green squads (six ships)
  window.__new = (techs, seed, god) => { window.C = campNew("home", techs || [], { seed: seed == null ? 1 : seed, god: !!god }); return C.id; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) { campStep(C, 1 / 30); } };
  window.__play = (seed, techs, script, secs) => {
    window.C = campNew("home", techs || [], { seed });
    for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; }
    return { result: C.result, why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), shield: Math.round(C.shield), earth: Math.round(C.earth.shield), kills: C.kills, delivered: C.delivered, lost: C.lost, aliens: campAliens(C).length };
  };
  window.__smart = (C, s) => {
    if (s > 1 && s < 1.05) campOrder(C, 'launch');
    if (s > 9 && s < 9.05) __esc(C, 'mars convoy');
    if (s > 12 && Math.round(s * 30) % 150 === 0) __atk(C, C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
    const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
    if (a) { const want = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = campDist(a, c) > 380 ? 1 : 0; C.input.fire = campDist(a, c) < 520; }
    else { C.input.thrust = 0; C.input.fire = false; C.input.turn = 0; }
  };
`);
g.run(`
    window.__new2 = (level, techs, seed, mi, trip) => { window.C = campNew(level, techs || [], { seed: seed == null ? 1 : seed, mission: mi | 0 }); if (!trip) C.arrivedAt = 0; return !!C; }; // trip: the cruiser has to fly to the mission's place first (section Q); else it is taken as there already
    window.__mbot = (C, s) => {            // a plain player of any mission: launches, attacks every 5 s, escorts the haulers, flies the cruiser at what the mission asks (a point, a cache, the relic, the haulers) and at what comes near, and fires
      const L = C.L, c = C.carrier;
      if (L.place && C.arrivedAt == null) { if (!C.nav || !C.nav.on) { const gp = campNavGoal(C); if (gp) campNavGo(C, gp, true); } return; } // the trip first: the map's Fast click, flown by the autopilot
      s = C.arrivedAt == null ? s : s - C.arrivedAt / 1000; // the plan runs from the arrival (the wing stays aboard on the trip)
      if (s > 1 && s < 1.05) campOrder(C, 'launch');
      if (s > 12 && Math.round(s * 30) % 150 === 0 && !L.convoys.length) __atk(C, C.ships.some(u => u.kind === 'mother') ? 'mothership' : ''); // an escort mission is flown by escorting, the pilots staying with the haulers (card space-game-three-pilots); the others by the attack
      if (L.convoys.length && Math.round(s * 30) % 90 === 0 && campConvoys(C).length) __esc(C, 'hauler', true);
      const al = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c)), near = al[0], fight = near && campDist(near, c) < 900;
      const first = campObjectives(C).find(o => !o.done) || {}, byDist = list => list.sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      let goal = null;
      if (first.type === 'scan') goal = byDist(C.scan.filter(p => !p.got)); else if (first.type === 'caches') goal = byDist(C.caches.filter(k => !k.got)); else if (first.type === 'relic') goal = C.relic;
      else if (first.type === 'deliver') goal = byDist(campConvoys(C).slice()) || { x: 1000, y: -500 }; else if (first.type === 'hold') goal = C.earth; else goal = near;
      const tgt = fight ? near : (goal || near);
      if (tgt) {
        const want = Math.atan2(tgt.y - c.y, tgt.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)), dist = campDist(tgt, c), stand = fight ? 420 : (goal === C.relic || (goal && goal.got === false) ? 40 : 250);
        C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = dist > stand ? 1 : 0;
        const w2 = near ? Math.atan2(near.y - c.y, near.x - c.x) : 0, d2 = Math.atan2(Math.sin(w2 - c.rot), Math.cos(w2 - c.rot)); C.input.fire = !!near && Math.abs(d2) < 0.22 && campDist(near, c) < 800;
      } else { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; }
    };
    window.__mplay = (level, mi, seed, script, secs, techs) => { const C = window.C = campNew(level, techs || [], { seed, mission: mi }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result || 'time', w: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), score: C.score ? C.score.score : 0 }; };
  `);
const sets = { old: `CAMP.carrier.mounts = [[30, -7], [30, 7], [10, -20], [10, 20], [-6, -20], [-6, 20], [-22, -20], [-22, 20]]; CAMP.bay.mouth = [21, 19.5];`, new: ``, sham: `CAMP.carrier.mounts.forEach(m => { m[0] += 0.3; })` };
const arm = process.argv[2], start = process.argv[3] === 'real' ? 'true' : 'false';
g.run(sets[arm]); g.run(`CAMP.bay.startOut = ${start}`);
const chainTechs = l => JSON.parse(g.run(`JSON.stringify([1, 2].filter(n => n < ${l}).map(n => campTechChoices(n)[0]))`));
const res = {};
for (const [l, m] of [[1, 0], [1, 1], [1, 2]]) { res[l + '.' + (m + 1)] = []; for (let sd = 1; sd <= 32; sd++) res[l + '.' + (m + 1)].push(JSON.parse(g.run(`JSON.stringify(__mplay(${l}, ${m}, ${sd}, __mbot, 400, ${JSON.stringify(chainTechs(l))}))`))); }
console.log(JSON.stringify(res));

// The Campaign's levels 2 and 3 as whole-level rows, the way they were before the missions (card space-game-campaign-missions): kept for the tests that fly a whole level in one battle.
// A test runs this, then points a slot at one: CAMP.levels[2] = CAMP.levels.legacy2 (and CAMP.levels[1] = CAMP.levels.home for the Earth level). The rows are made from the real rows at the time of the
// call (so the places, with the bodies the Sol card adds to them, the warp and the world lines are the real ones) with the whole battle laid over them: no missions, the old win rule.
CAMP.levels.legacy2 = Object.assign({}, CAMP.levels[2], { missions: null, win: 'relic',
  caches: [[-2800, 2000], [-600, 3200], [200, -1800]], relic: { place: 'proxima', radius: 240, hold: 8, caches: 2, clear: 650 },
  guards: [{ kind: 'gunship', at: [1700, 400] }, { kind: 'gunship', at: [700, 1300] }, { kind: 'drone', at: [1500, 1300] }, { kind: 'drone', at: [500, 300] }, { kind: 'drone', at: [1900, 900] }],
  convoys: [], waves: [{ at: 25, early: 10, from: [-5600, 600], ships: { raider: 3, drone: 2 }, goal: 'carrier', say: 'camp.say.l2wave1' }, { at: 75, early: 12, from: [4500, -2500], ships: { drone: 3, gunship: 1 }, goal: 'carrier', say: 'camp.say.l2wave2' }] });
CAMP.levels.legacy3 = Object.assign({}, CAMP.levels[3], { missions: null, win: 'towers',
  towers: [{ place: 'home', r: 1000, n: 8, phase: 0.2 }, { place: 'home', r: 1500, n: 4, phase: 0.7, hp: 260 }],
  convoys: [], waves: [{ at: 15, early: 8, from: [-3500, 1800], ships: { raider: 4, drone: 2 }, goal: 'carrier', say: 'camp.say.l3wave1' }, { at: 70, early: 12, from: [2800, -2800], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave2' }, { at: 120, early: 14, from: [-2500, -3000], ships: { raider: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave3' }] });

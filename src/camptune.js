// ---------- Campaign: the tuning panel's numbers and switches (card space-game-tuning-panel; Troy, 22 Nov 2026) ----------
// Troy tunes the Campaign by feel: most of his asks are "change this number" or "turn this off". The tuning panel (src/camptunedraw.js; the N key, in flight and in the ready room) lists the
// numbers and the switches of this file's table, changes them LIVE, and keeps them in this browser. This file is the rule of it, pure (no Phaser): the table, the overrides, and the text
// block "Copy my settings" puts on the clipboard so an agent can bake the values in as the new defaults (tools/apply-tuning.mjs reads it and prints the CAMP changes it means).
//
//   THE ROWS (CAMP_TUNE.rows): { id, kind, group, label (camp.ui.tune.row.<id>), when, ... }
//     kind 'num' (the default): { root: 'CAMP' | 'CAMPZOOM' | 'CAMPSTRAY' | 'CAMPMINER', path: 'carrier.speed', min, max, step, unit }: a number of that table (a path may go through a list by its place: 'levels.1.missions.0.waves.2.ships.tboat'). An array with `of: 2` is a row of numbers by power pips: the row shows the
//         value at pip 2 (the default setting) and every pip of the array is scaled with it, so the shape of the curve stays.
//     kind 'flag': { flag: 'distress' }: a switch of CAMP.flags (src/campaign.js), one place that the missions and the systems read (campFlag).
//     when: 'now' the change is felt at once; 'next' from the next mission start (the number is copied into a ship or a rock when the mission is made).
//   THE OVERRIDES (CAMP_TUNE.state.over): { id: value } for the rows that differ from the default. The default is what CAMP held the first time anything here was asked (the snapshot).
//   campTuneRow(id) / campTuneRows(group)   the rows
//   campTuneDefault(id) / campTuneValue(id) the default and the value now (a number, or true or false for a switch)
//   campTuneSet(id, v) / campTuneStep(id, dir, big) / campTuneReset(id) / campTuneResetAll()   change one: clamped to the row's range and rounded to its step; a value that is the default is no override
//   campTuneActive() / campTuneCount()      is any override on; how many
//   campTuneText() / campTuneParse(text)    the block "Copy my settings" writes (only the changed rows) and its reading again (the tool's)
//   campTuneLoadOnce() / campTuneSave()     the browser's localStorage: read once per page by the Campaign and the ready room, written at every change. NEVER read by a bot, a node test or a boot script:
//                                           only a scene calls campTuneLoadOnce, and a browser driven by automation (navigator.webdriver) is refused (campTuneBlocked), which also keeps it from saving
// Scores and ranks earned while any override is on are not kept (campTuneKeepScore, used by the Campaign scene's debrief).
const CAMP_TUNE = {
  store: 'longhaul.campaign.tuning',      // the localStorage key: { v: 1, over: { id: value } }
  ver: 1,
  bigStep: 10,                            // Shift with Left or Right: this many steps at once
  groups: ['feel', 'cockpit', 'ship', 'guns', 'wing', 'foes', 'time', 'view', 'ore', 'systems'],   // the panel's headings, in order (camp.ui.tune.group.<id>)
  rows: [
    // the cruiser's feel (card space-game-cruiser-feel-sliders; Troy, 26 Nov 2026: he wants to dial the way it flies in, by feel, before anyone guesses numbers): five numbers, each read by the flight every frame, so each is felt at once; the live strip (src/camptunedraw.js) shows these five as sliders over the running battle
    { id: 'cruiserspeed', group: 'feel', root: 'CAMP', path: 'carrier.speed', min: 60, max: 600, step: 10, unit: 'px/s', when: 'now', holds: 'boostspeed' },   // the top speed (campCarrier: k.speed)
    { id: 'cruiseraccel', group: 'feel', root: 'CAMP', path: 'carrier.accel', min: 170, max: 900, step: 10, unit: 'px/s a second', when: 'now' },               // the thrust (k.accel)
    { id: 'cruiserturn', group: 'feel', root: 'CAMP', path: 'carrier.turn', min: 0.3, max: 4, step: 0.1, unit: 'rad/s', when: 'now' },                           // the turn (k.turn)
    { id: 'boostspeed', group: 'feel', root: 'CAMP', path: 'boost.speed', derive: 'boostspeed', min: 210, max: 1000, step: 10, unit: 'px/s', when: 'now' },       // the boost's top speed in px/s: what the table holds is a multiple of the top speed (CAMP.boost.speed, 1.57: 210 to about 330); the row shows the product and keeps it when the top speed moves
    { id: 'startview', group: 'feel', root: 'CAMPZOOM', path: 'view.startOver', derive: 'startview', min: 0.2, max: 1, step: 0.005, unit: 'x', when: 'now' },       // the zoom a flight starts at and Backspace goes back to (0.335 today: six presses of minus); the table's startOver is 0 (the presses) until a value is put in it
    // THE FLOWN FIGHTER (card space-game-fly-fighter-l3; Troy, 26 Nov 2026: he will fly a pilot's fighter with the C key, src/campcockpit.js, the table CAMP.cockpit): the Wren's flight numbers, the hull, the guns and the rate as multiples of the pilot's own, and the cruiser's turrets while he is away.
    // The flight numbers, the multipliers of the guns and the turrets are read every tick of a flown fighter, so they are felt at once; hpK is read when the stick is taken (the next C). The switch is CAMP.flags.cockpit: off, nothing of this runs.
    { id: 'cockpitflag', kind: 'flag', group: 'cockpit', flag: 'cockpit', when: 'now' },
    { id: 'cockpitspeed', group: 'cockpit', root: 'CAMP', path: 'cockpit.speed', min: 100, max: 900, step: 10, unit: 'px/s', when: 'now' },
    { id: 'cockpitboost', group: 'cockpit', root: 'CAMP', path: 'cockpit.boost', min: 100, max: 1600, step: 10, unit: 'px/s', when: 'now' },
    { id: 'cockpitaccel', group: 'cockpit', root: 'CAMP', path: 'cockpit.accel', min: 100, max: 1600, step: 10, unit: 'px/s2', when: 'now' },
    { id: 'cockpitturn', group: 'cockpit', root: 'CAMP', path: 'cockpit.turn', min: 0.5, max: 8, step: 0.1, unit: 'rad/s', when: 'now' },
    { id: 'cockpitstore', group: 'cockpit', root: 'CAMP', path: 'cockpit.store.max', min: 10, max: 400, step: 10, unit: 'units', when: 'now' },
    { id: 'cockpitdrain', group: 'cockpit', root: 'CAMP', path: 'cockpit.store.drain', min: 1, max: 100, step: 1, unit: '/s', when: 'now' },
    { id: 'cockpitregen', group: 'cockpit', root: 'CAMP', path: 'cockpit.store.regen', min: 1, max: 100, step: 1, unit: '/s', when: 'now' },
    { id: 'cockpithull', group: 'cockpit', root: 'CAMP', path: 'cockpit.hpK', min: 0.5, max: 8, step: 0.25, unit: 'x', when: 'now' },
    { id: 'cockpitdamage', group: 'cockpit', root: 'CAMP', path: 'cockpit.damageK', min: 0.25, max: 8, step: 0.25, unit: 'x', when: 'now' },
    { id: 'cockpitrate', group: 'cockpit', root: 'CAMP', path: 'cockpit.rateK', min: 0.25, max: 8, step: 0.25, unit: 'x', when: 'now' },
    { id: 'cockpitturrets', group: 'cockpit', root: 'CAMP', path: 'cockpit.turrets', derive: 'cockpitturrets', min: 0, max: 1, step: 1, unit: '', when: 'now' },
    // the cruiser
    { id: 'shieldsize', group: 'ship', root: 'CAMP', path: 'carrier.shield', min: 30, max: 600, step: 10, unit: 'points', when: 'now' },
    { id: 'shieldmend', group: 'ship', root: 'CAMP', path: 'power.shields.regen', of: 2, min: 0, max: 30, step: 0.5, unit: 'a second', when: 'now' },
    { id: 'emergencyore', group: 'ship', root: 'CAMP', path: 'emergency.ore', min: 0, max: 400, step: 5, unit: 'ore', when: 'now' },                // card space-game-keys2-cruiser: what Emergency shields costs
    { id: 'emergencycool', group: 'ship', root: 'CAMP', path: 'emergency.cooldown', min: 0, max: 120000, step: 1000, unit: 'ms', when: 'now' },       // and how long before it can be given again
    // the guns: the turrets, the missiles, the charge the turrets draw
    { id: 'turretdamage', group: 'guns', root: 'CAMP', path: 'carrier.pd', min: 1, max: 40, step: 1, unit: '', when: 'now' },
    { id: 'turretdelay', group: 'guns', root: 'CAMP', path: 'carrier.pdDelay', min: 100, max: 2000, step: 50, unit: 'ms', when: 'now' },
    { id: 'sensorrange', group: 'guns', root: 'CAMP', path: 'sensor.range', min: 0, max: 20000, step: 500, unit: 'px', when: 'now' },
    { id: 'turretreach', group: 'guns', root: 'CAMP', path: 'carrier.pdRange', min: 150, max: 1500, step: 50, unit: 'px', when: 'now' },
    { id: 'missilecount', group: 'guns', root: 'CAMP', path: 'missile.magazine', min: 0, max: 12, step: 1, unit: '', when: 'next' },
    { id: 'missilereload', group: 'guns', root: 'CAMP', path: 'missile.reload', min: 2000, max: 60000, step: 1000, unit: 'ms', when: 'now' },    // the BUILD time of a missile now (card space-game-missiles-cost-ore)
    { id: 'missilecost', group: 'guns', root: 'CAMP', path: 'missile.cost', min: 0, max: 100, step: 5, unit: 'ore', when: 'now' },               // what a missile costs to build; 0: free
    { id: 'lasertank', group: 'guns', root: 'CAMP', path: 'tank.max', min: 20, max: 400, step: 10, unit: '', when: 'now' },
    { id: 'laserrefill', group: 'guns', root: 'CAMP', path: 'tank.refill', of: 2, min: 1, max: 40, step: 1, unit: 'a second', when: 'now' },
    // the wing and the ships you escort
    { id: 'fighterhull', group: 'wing', root: 'CAMP', path: 'fighter.hp', min: 6, max: 200, step: 2, unit: '', when: 'next' },
    { id: 'fighterdamage', group: 'wing', root: 'CAMP', path: 'fighter.damage', min: 1, max: 40, step: 1, unit: '', when: 'now' },
    { id: 'pilotleash', group: 'wing', root: 'CAMP', path: 'flight.leash', min: 0, max: 10000, step: 250, unit: 'px', when: 'now' },        // card space-game-pilot-chase-leash: how far from what it guards a pilot follows a runner before it breaks off and comes back (0: no leash, as it was)
    { id: 'repairbelow', group: 'wing', root: 'CAMP', path: 'repair.below', min: 0.05, max: 0.9, step: 0.05, unit: '', when: 'now' },     // card space-game-keys2-orders: the hull a pilot breaks off at and returns home by itself
    { id: 'repairtime', group: 'wing', root: 'CAMP', path: 'repair.time', min: 2, max: 90, step: 2, unit: 's', when: 'now' },                  // and the seconds its mend takes before it comes back out whole
    { id: 'convoyspeed', group: 'wing', root: 'CAMP', path: 'convoy.speedScale', min: 0.3, max: 3, step: 0.05, unit: 'x', when: 'next' },
    // what the radio tells you (card space-game-stray-n-rows: the numbers of src/campstray.js and src/campminer.js; each is read every tick, so a change is felt at once)
    { id: 'strayfar', group: 'wing', root: 'CAMPSTRAY', path: 'far', min: 300, max: 6000, step: 100, unit: 'px', when: 'now' },            // how far the nearest ship you escort is before the radio says you are left behind (1500 px is 150 km on the HUD)
    { id: 'straygrace', group: 'wing', root: 'CAMPSTRAY', path: 'grace', min: 0, max: 30, step: 1, unit: 's', when: 'now' },              // how long she must have been that far before the first warning
    { id: 'strayagain', group: 'wing', root: 'CAMPSTRAY', path: 'again', min: 5, max: 120, step: 5, unit: 's', when: 'now' },             // and how long before it says so again while it lasts
    { id: 'minergone', group: 'wing', root: 'CAMPMINER', path: 'gone', min: 300, max: 3000, step: 100, unit: 'px', when: 'now' },         // the miner's call of mission 1.1: how far from the cruiser a pilot is to count as away
    { id: 'minernear', group: 'wing', root: 'CAMPMINER', path: 'near', min: 300, max: 3000, step: 100, unit: 'px', when: 'now' },         // and how near the miner he must be to count as away at him
    { id: 'minerwait', group: 'wing', root: 'CAMPMINER', path: 'wait', min: 0, max: 10, step: 0.5, unit: 's', when: 'now' },              // how long the price line waits after the first pilot is seen away (so three sent together are counted together)
    { id: 'haulgap', group: 'wing', root: 'CAMP', path: 'l13.gapFar', min: 300, max: 4000, step: 100, unit: 'px', when: 'now' },                // card space-game-13-radio-lines: how far the last hauler may be behind the next one before the radio says so (the haulers leave 12 s apart: 744 px)
    // the enemy
    { id: 'baittboats', group: 'foes', root: 'CAMP', path: 'levels.1.missions.0.waves.2.ships.tboat', min: 0, max: 8, step: 1, unit: 'ships', when: 'now' },  // the THIRD wave of mission 1.1 (the bait: it goes for the transport ten seconds after the miner's call): its torpedo boats. The wave reads its ships when it comes, so a change is felt unless it has come
    { id: 'baitskiffs', group: 'foes', root: 'CAMP', path: 'levels.1.missions.0.waves.2.ships.skiff', min: 0, max: 8, step: 1, unit: 'ships', when: 'now' },  // and its skiffs
    { id: 'contactdrones', group: 'foes', root: 'CAMP', path: 'levels.1.missions.2.waves.5.ships.drone', min: 0, max: 6, step: 1, unit: 'ships', when: 'now' },     // the drones of FIRST CONTACT in 1.3 (card space-game-13-all-haulers-savable; the wave reads it when it comes, so a change is felt if the wave has not come yet)
    { id: 'contactgunships', group: 'foes', root: 'CAMP', path: 'levels.1.missions.2.waves.5.ships.gunship', min: 0, max: 6, step: 1, unit: 'ships', when: 'now' }, // and its gunships, the ships that killed the lead hauler
    { id: 'enemyhull', group: 'foes', root: 'CAMP', path: 'alien.hpScale', min: 0.2, max: 5, step: 0.1, unit: 'x', when: 'next' },
    { id: 'enemydamage', group: 'foes', root: 'CAMP', path: 'alien.damageScale', min: 0.2, max: 5, step: 0.1, unit: 'x', when: 'next' },
    // time
    { id: 'pace', group: 'time', root: 'CAMP', path: 'pace.scale', min: 0.4, max: 1.6, step: 0.05, unit: 'x', when: 'next' },
    { id: 'fightpace', group: 'time', root: 'CAMP', path: 'pace.fight', min: 0.25, max: 1, step: 0.05, unit: 'x', when: 'now' },     // how fast the small ships fly and fire while a foe is near (card space-game-slower-fights); 1 is as fast as they travel
    { id: 'targetrestart', group: 'foes', root: 'CAMP', path: 'target.restart', min: 500, max: 10000, step: 500, unit: 'ms', when: 'now' }, // how long a pause with no press of ] is before the next press starts again from the nearest hostile (card space-game-keys4-onekey)
    { id: 'marktime', group: 'time', root: 'CAMP', path: 'mark.show', min: 500, max: 10000, step: 500, unit: 'ms', when: 'now' },   // how long the squares on the pilots and on the target held stay before they fade (card space-game-pilot-squares-fade)
    { id: 'peekhold', group: 'time', root: 'CAMP', path: 'peek.hold', min: 0, max: 10000, step: 250, unit: 'ms', when: 'now' },       // card space-game-pick-peek: how long the camera stays on a picked ship that was off the screen
    { id: 'peekglide', group: 'time', root: 'CAMP', path: 'peek.glide', min: 100, max: 2000, step: 50, unit: 'ms', when: 'now' },     // and how long each glide takes, out and back
    { id: 'peekzoom', group: 'time', root: 'CAMP', path: 'peek.zoom', min: 0.2, max: 1.6, step: 0.05, unit: 'x', when: 'now' },       // the least zoom a peek is made at (a readable ship)
    { id: 'wavetime', group: 'time', root: 'CAMP', path: 'time.waves', min: 0.25, max: 3, step: 0.05, unit: 'x', when: 'now' },
    { id: 'startzoom', group: 'time', root: 'CAMPZOOM', path: 'view.startPresses', min: 0, max: 12, step: 1, unit: 'presses', when: 'next' },
    // the ships on the screen (card space-game-ships-bigger): the least size a ship is drawn at when the view is out, a fighter's in px and the capital ships' as a multiple of it; only the picture, nothing in the fight
    { id: 'leastfighter', group: 'view', root: 'CAMPZOOM', path: 'view.leastSmall', min: 4, max: 60, step: 1, unit: 'px', when: 'now' },     // a fighter's least length on the screen (22 px long at close zoom); the ships between it and the cruiser grow in proportion
    { id: 'leastclass', group: 'view', root: 'CAMPZOOM', path: 'view.leastClass', min: 1, max: 8, step: 0.25, unit: 'x', when: 'now' },    // the cruiser's and every capital ship's least size as a multiple of a fighter's (card space-game-ships-bigger-proportions: at least 3, so the cruiser still reads as the big ship); 1 keeps no proportion
    { id: 'cockpitzoom', group: 'view', root: 'CAMPZOOM', path: 'view.cockpit', min: 1, max: 5, step: 0.1, unit: 'x', when: 'now' },                              // how many times closer the view is while he flies a pilot's fighter (card space-game-fly-fighter-l2; 3 is the Long Haul's own 1.0 from the start zoom; 1 is no change)
    { id: 'sayhold', group: 'view', root: 'CAMP', path: 'sayhold.ms', min: 0, max: 15000, step: 500, unit: 'ms', when: 'now' },             // card space-game-price-line-held: how long a kept radio line (the miner's call, the price of answering it, the stray ship's warning) stays up before another radio line may replace it; 0: none is kept
    // the ore
    { id: 'orerock', group: 'ore', root: 'CAMP', path: 'ore.rock', min: 5, max: 100, step: 5, unit: 'ore', when: 'next' },
    { id: 'miningrate', group: 'ore', root: 'CAMP', path: 'laser.dps', min: 1, max: 60, step: 1, unit: 'a second', when: 'now' },
    { id: 'repairprice', group: 'ore', root: 'CAMP', path: 'mend.hullOre', min: 5, max: 400, step: 5, unit: 'ore a hull', when: 'now' },          // card space-game-repair-with-ore: the cruiser's whole hull, mended in space (the dock takes half)
    { id: 'wardprice', group: 'ore', root: 'CAMP', path: 'mend.wardPoint', min: 0, max: 2, step: 0.05, unit: 'ore a point', when: 'now' },     // a ship you protect
    { id: 'fightermend', group: 'ore', root: 'CAMP', path: 'repair.ore', min: 0, max: 50, step: 1, unit: 'ore', when: 'now' },                  // a landed fighter's mend (none: twice the time)
    // the switches (each turns a whole system off, as if it were not in the mission; autofire turns one on)
    { id: 'distress', kind: 'flag', group: 'systems', flag: 'distress', when: 'next' },
    { id: 'tboats', kind: 'flag', group: 'systems', flag: 'tboats', when: 'next' },
    { id: 'rival', kind: 'flag', group: 'systems', flag: 'rival', when: 'next' },
    { id: 'repair', kind: 'flag', group: 'systems', flag: 'repair', when: 'now' },
    { id: 'convoyorders', kind: 'flag', group: 'systems', flag: 'convoyorders', when: 'now' },
    { id: 'autofire', kind: 'flag', group: 'systems', flag: 'autofire', when: 'now' },
    { id: 'laser', kind: 'flag', group: 'systems', flag: 'laser', when: 'now' },
    { id: 'hints', kind: 'flag', group: 'systems', flag: 'hints', when: 'now' },
    { id: 'pagedigit', kind: 'flag', group: 'systems', flag: 'pagedigit', when: 'now' } // card space-game-page-hud-3: the digit instead of the initial inside the page HUD's rings
  ],
  state: { over: {}, snap: null, loaded: false }
};

const campTuneRow = id => CAMP_TUNE.rows.find(r => r.id === id) || null;
const campTuneRows = group => CAMP_TUNE.rows.filter(r => !group || r.group === group);
const campTuneIsFlag = row => !!row && row.kind === 'flag';

// where a row's number lives: its table and path
function campTuneRoot(name) { // the tables a row can live in: the Campaign's own (src/campaign.js), the flight view's zoom (src/campzoom.js), the radio's two rules' numbers (src/campstray.js, src/campminer.js: card space-game-stray-n-rows)
  if (name === 'CAMPZOOM') return typeof CAMPZOOM === 'object' ? CAMPZOOM : null;
  if (name === 'CAMPSTRAY') return typeof CAMPSTRAY === 'object' ? CAMPSTRAY : null;
  if (name === 'CAMPMINER') return typeof CAMPMINER === 'object' ? CAMPMINER : null;
  return typeof CAMP === 'object' ? CAMP : null;
}
function campTuneSlot(row) { // { obj, key } of the row's number (the parent object and its key), or null when the table has no such place
  if (!row) return null;
  if (campTuneIsFlag(row)) { const C = campTuneRoot('CAMP'); return C && C.flags ? { obj: C.flags, key: row.flag } : null; }
  let obj = campTuneRoot(row.root); const parts = row.path.split('.');
  for (let i = 0; i < parts.length - 1 && obj; i++) obj = obj[parts[i]];
  return obj ? { obj, key: parts[parts.length - 1] } : null;
}
const campTuneDec = row => { const s = String(row.step || 1), i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
const campTuneRound = (row, v) => +(+v).toFixed(campTuneDec(row) + 3);

// the derived rows (card space-game-cruiser-feel-sliders): a row whose number is not what the table holds. read(): the number the row shows now; put(v, snap): write it into the table (the snapshot's own v, when v is the default and nothing it depends on has moved, puts the table's own number back exactly, so a reset is exact and nothing is rounded into the shipped table).
//   boostspeed  the boost's top speed in px/s: CAMP.boost.speed is a multiple of the top speed (1.57: 210 to about 330), so the row shows the product, and writing it divides by the top speed. The top speed's row holds it (holds: 'boostspeed'): when the top speed moves, the boost's px/s stays what it was.
//   startview   the flight's start zoom: the table's view.startOver is 0 (use the presses: six of them, 0.335) or the zoom wanted (src/campzoom.js campZoomDefault)
const CAMP_TUNE_DERIVE = {
  boostspeed: {
    read: () => CAMP.boost.speed * CAMP.carrier.speed,
    put: (v, s) => { const spd = CAMP.carrier.speed, d = CAMP_TUNE.state.snap && CAMP_TUNE.state.snap.cruiserspeed; CAMP.boost.speed = Math.abs(v - s.v) < 1e-6 && d && Math.abs(spd - d.v) < 1e-9 ? s.raw : v / spd; }
  },
  cockpitturrets: { // the cruiser's turrets while the player is in a fighter (CAMP.cockpit.turrets is 'auto' or 'off', a word): the row shows 1 for 'auto' and 0 for 'off' (card space-game-fly-fighter-l3)
    read: () => (CAMP.cockpit.turrets === 'auto' ? 1 : 0),
    put: (v, s) => { CAMP.cockpit.turrets = v >= 0.5 ? 'auto' : 'off'; }
  },
  startview: {
    read: () => (typeof campZoomDefault === 'function' ? campZoomDefault() : 0),
    put: (v, s) => { CAMPZOOM.view.startOver = Math.abs(v - s.v) < 1e-6 ? (s.raw || 0) : v; }
  }
};

// the snapshot: what the table held before any override went in, taken once (so every default is the table's own, whatever a mod or a test did to it before)
function campTuneSnap() {
  const S = CAMP_TUNE.state; if (S.snap) return S.snap;
  S.snap = {};
  CAMP_TUNE.rows.forEach(row => {
    const sl = campTuneSlot(row); if (!sl) return;
    const v = sl.obj[sl.key];
    if (row.derive) S.snap[row.id] = { v: CAMP_TUNE_DERIVE[row.derive].read(), arr: null, raw: v };   // a derived row: the number it shows is worked out from the table (the default is that number at the start), and the table's own number is kept to put back exactly
    else if (campTuneIsFlag(row)) S.snap[row.id] = { v: v === true, arr: null };
    else if (row.of != null && Array.isArray(v)) S.snap[row.id] = { v: v[row.of], arr: v.slice() };
    else S.snap[row.id] = { v, arr: null };
  });
  return S.snap;
}
function campTuneDefault(id) { const s = campTuneSnap()[id]; return s ? s.v : undefined; }
function campTuneValue(id) { const o = CAMP_TUNE.state.over; return Object.prototype.hasOwnProperty.call(o, id) ? o[id] : campTuneDefault(id); }
const campTuneChanged = id => Object.prototype.hasOwnProperty.call(CAMP_TUNE.state.over, id);
const campTuneCount = () => Object.keys(CAMP_TUNE.state.over).length;
const campTuneActive = () => campTuneCount() > 0;

// put a value into the live table (a scaled array: every pip moves with the one the row shows)
function campTunePut(row, v) {
  const sl = campTuneSlot(row), s = campTuneSnap()[row.id]; if (!sl || !s) return false;
  if (campTuneIsFlag(row)) { sl.obj[sl.key] = !!v; return true; }
  if (row.derive) { CAMP_TUNE_DERIVE[row.derive].put(v, s); return true; }
  if (s.arr) { const base = s.arr[row.of]; sl.obj[sl.key] = s.arr.map((x, i) => i === row.of ? v : base ? campTuneRound(row, x * v / base) : x); return true; }
  sl.obj[sl.key] = v; return true;
}
function campTuneClamp(row, v) {
  if (campTuneIsFlag(row)) return !!v;
  v = Number(v); if (!isFinite(v)) return campTuneDefault(row.id);
  return campTuneRound(row, Math.max(row.min, Math.min(row.max, Math.round(v / row.step) * row.step)));
}
const campTuneSame = (row, a, b) => campTuneIsFlag(row) ? !!a === !!b : Math.abs(a - b) < (row.derive ? row.step / 2 : 1e-9); // (a derived row's default is worked out, 329.7 for 330: a value within half a step of it is the default)

function campTuneSet(id, v) {
  const row = campTuneRow(id); if (!row || !campTuneSnap()[id]) return null;
  const val = campTuneClamp(row, v), d = campTuneDefault(id);
  const same = campTuneSame(row, val, d);
  if (same) delete CAMP_TUNE.state.over[id]; else CAMP_TUNE.state.over[id] = val;
  campTunePut(row, same ? d : val);
  if (row.holds) { const h = campTuneRow(row.holds); if (h) campTunePut(h, campTuneValue(h.id)); } // the top speed moved: the boost's px/s stays what it was
  campTuneSave();
  return same ? campTuneRound(row, d) : val;
}
function campTuneStep(id, dir, big) {
  const row = campTuneRow(id); if (!row) return null;
  if (campTuneIsFlag(row)) return campTuneSet(id, !campTuneValue(id));
  return campTuneSet(id, campTuneValue(id) + dir * row.step * (big ? CAMP_TUNE.bigStep : 1));
}
const campTuneReset = id => { const row = campTuneRow(id); return row ? campTuneSet(id, campTuneDefault(id)) : null; };
function campTuneResetAll() { Object.keys(CAMP_TUNE.state.over).forEach(id => campTuneReset(id)); return campTuneCount(); }
function campTuneApply() { // the overrides into the table: the plain rows first, then every derived row (the boost's px/s depends on the top speed, whichever was set first)
  Object.keys(CAMP_TUNE.state.over).forEach(id => { const row = campTuneRow(id); if (row && !row.derive) campTunePut(row, CAMP_TUNE.state.over[id]); });
  CAMP_TUNE.rows.filter(r => r.derive && campTuneSnap()[r.id]).forEach(r => campTunePut(r, campTuneValue(r.id)));
}
function campTuneRestore() { campTuneSnap(); CAMP_TUNE.rows.forEach(row => campTunePut(row, campTuneDefault(row.id))); } // every row back to the table's own (the overrides are kept: campTuneApply puts them in again)

// how a value reads on the panel: the number in the row's step, with its unit; a switch is ON or OFF
function campTuneFmt(row, v) {
  if (campTuneIsFlag(row)) return uiText(v ? 'camp.ui.tune.on' : 'camp.ui.tune.off');
  const n = (+v).toFixed(campTuneDec(row));
  return row.unit ? n + ' ' + row.unit : n;
}
const campTuneLabel = row => uiText('camp.ui.tune.row.' + row.id);
const campTuneWhen = row => uiText('camp.ui.tune.when.' + (row.when || 'now'));

// the cruiser's feel as text (card space-game-cruiser-feel-sliders): the five numbers in one line, as the panel and the live strip show them, so Troy can read them back; nothing leaves the page
//   campTuneFeelRows()   the five rows, in order; campTuneFeelText()   "Top speed 210 px/s · Thrust 340 · Turn 2.2 rad/s · Boost 330 px/s · Start zoom 0.335"
const campTuneFeelRows = () => campTuneRows('feel');
function campTuneFeelText() {
  const n = id => { const r = campTuneRow(id); return r ? (+campTuneValue(id)).toFixed(campTuneDec(r)) : ''; };
  return uiText('camp.ui.tune.feel.line', { speed: n('cruiserspeed'), accel: n('cruiseraccel'), turn: n('cruiserturn'), boost: n('boostspeed'), zoom: n('startview') });
}

// ----- the browser's storage -----
// A browser a program drives (a boot script, a screenshot tool: navigator.webdriver) has no overrides and keeps none. Node has no localStorage here at all unless a test gives one.
function campTuneBlocked() { try { return typeof navigator === 'object' && !!navigator && navigator.webdriver === true; } catch (e) { return true; } }
function campTuneSave() {
  try {
    if (campTuneBlocked() || typeof localStorage === 'undefined') return false;
    if (!campTuneCount()) localStorage.removeItem(CAMP_TUNE.store); else localStorage.setItem(CAMP_TUNE.store, JSON.stringify({ v: CAMP_TUNE.ver, over: CAMP_TUNE.state.over }));
    return true;
  } catch (e) { return false; }
}
function campTuneLoad() { // read the saved overrides and put them in; an id this build does not know is dropped, a value is clamped to its row
  let n = 0;
  try {
    if (campTuneBlocked() || typeof localStorage === 'undefined') return 0;
    const raw = localStorage.getItem(CAMP_TUNE.store); if (!raw) return 0;
    const j = JSON.parse(raw), over = j && j.v === CAMP_TUNE.ver && j.over && typeof j.over === 'object' ? j.over : {};
    campTuneSnap();
    Object.keys(over).forEach(id => { const row = campTuneRow(id); if (!row || !campTuneSnap()[id]) return; const val = campTuneClamp(row, over[id]); if (!campTuneSame(row, val, campTuneDefault(id))) { CAMP_TUNE.state.over[id] = val; campTunePut(row, val); n++; } });
    if (n) campTuneApply();
  } catch (e) { return 0; }
  return n;
}
function campTuneLoadOnce() { if (!CAMP_TUNE.state.loaded) { CAMP_TUNE.state.loaded = true; campTuneLoad(); } return campTuneCount(); }

// ----- Copy my settings -----
// One line a changed row: "<id> = <value>   # <words>, default <default>". Only the changed rows; nothing changed is an empty block (the panel says so). The id and the value are what the tool reads.
const CAMP_TUNE_HEAD = 'LONG HAUL TUNING v1';
function campTuneText() {
  const rows = CAMP_TUNE.rows.filter(r => campTuneChanged(r.id));
  if (!rows.length) return '';
  const val = (row, v) => campTuneIsFlag(row) ? (v ? 'on' : 'off') : String(campTuneRound(row, v));
  return [CAMP_TUNE_HEAD].concat(rows.map(r => r.id + ' = ' + val(r, campTuneValue(r.id)) + '   # ' + campTuneLabel(r) + ', default ' + val(r, campTuneDefault(r.id)))).join('\n') + '\n';
}
function campTuneParse(text) { // the block back: { rows: [{ id, value }], bad: [the lines that were not understood] }; the head, blank lines and # comments are skipped
  const out = { rows: [], bad: [] };
  String(text || '').split(/\r?\n/).forEach(line => {
    const t = line.replace(/#.*$/, '').trim(); if (!t || t === CAMP_TUNE_HEAD) return;
    const m = /^([a-z][a-z0-9]*)\s*=\s*(on|off|true|false|-?\d+(?:\.\d+)?)$/i.exec(t); const row = m && campTuneRow(m[1]);
    if (!row) { out.bad.push(line.trim()); return; }
    const w = m[2].toLowerCase(), flag = w === 'on' || w === 'true';
    if (campTuneIsFlag(row) !== (flag || w === 'off' || w === 'false')) { out.bad.push(line.trim()); return; }
    out.rows.push({ id: row.id, value: campTuneIsFlag(row) ? flag : Number(w) });
  });
  return out;
}

// the debrief's score: a mission flown with any override on is a zero-score run for the save (the level still moves on; the best scores and the rank, which are sums of them, do not). The words say so.
const campTuneKeepScore = tuned => !tuned;

// ---------- the panel's model (pure: the drawing is src/camptunedraw.js) ----------
// The list: two action rows (Copy my settings, Reset everything), then each group's heading and rows. A heading is never the highlight. P: { cur, top, msg }.
//   campTuneItems(P)                the list, in order: { kind: 'copy' | 'reset' | 'live' | 'head' | 'row', group?, row? } ('live' only while P.live: the panel was opened in a flight)
//   campTunePanelNew()              a fresh panel model (the highlight on the first row)
//   campTunePanelKey(P, code, shift)  a key in the open panel -> { used: true, close, changed, action: '' | 'copy' | 'reset' | 'live', text, say } (every key is the panel's while it is open; the battle waits)
const CAMP_TUNE_VIEW = { show: 15 };        // how many lines of the list are on the screen at once; a longer list scrolls with the highlight
function campTuneItems(P) {
  const it = [{ kind: 'copy' }, { kind: 'reset' }];
  if (P && P.live) it.push({ kind: 'live' });                // in a flight only: the sliders over the running battle (src/camptunedraw.js campTuneLiveOpen)
  CAMP_TUNE.groups.forEach(g => { const rows = campTuneRows(g); if (!rows.length) return; it.push({ kind: 'head', group: g }); rows.forEach(r => it.push({ kind: 'row', row: r })); });
  return it;
}
const campTunePanelNew = () => ({ cur: 0, top: 0, msg: '' });
function campTuneKeepSeen(P, items) { // the highlight stays on the screen: the window starts at or above it (and a row's heading comes into view with it)
  const show = CAMP_TUNE_VIEW.show;
  let want = P.cur; if (items[want - 1] && items[want - 1].kind === 'head') want--;
  if (want < P.top) P.top = want;
  if (P.cur >= P.top + show) P.top = P.cur - show + 1;
  P.top = Math.max(0, Math.min(P.top, Math.max(0, items.length - show)));
}
function campTunePanelKey(P, code, shift) {
  const items = campTuneItems(P), res = { used: true, close: false, changed: false, action: '', text: '', say: '' };
  if (P.cur >= items.length || items[P.cur].kind === 'head') P.cur = items.findIndex(x => x.kind !== 'head');
  const cur = items[P.cur];
  const move = d => { let i = P.cur; do { i = (i + d + items.length) % items.length; } while (items[i].kind === 'head'); P.cur = i; P.msg = ''; };
  if (campKeyIs('tune', code) || code === 'Escape') res.close = true;
  else if (code === 'ArrowUp') move(-1);
  else if (code === 'ArrowDown') move(1);
  else if (code === 'ArrowLeft' || code === 'ArrowRight') { if (cur.kind === 'row') { campTuneStep(cur.row.id, code === 'ArrowRight' ? 1 : -1, !!shift); res.changed = true; P.msg = ''; } }
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    if (cur.kind === 'copy') { res.action = 'copy'; res.text = campTuneText(); P.msg = res.text ? 'copied' : 'nothing'; }
    else if (cur.kind === 'reset') { const n = campTuneCount(); campTuneResetAll(); res.action = 'reset'; res.changed = n > 0; P.msg = n ? 'reset' : 'nothing'; }
    else if (cur.kind === 'live') { res.action = 'live'; res.close = true; }                    // the panel closes and the strip comes up over the battle, which runs
    else if (cur.kind === 'row' && campTuneIsFlag(cur.row)) { campTuneStep(cur.row.id, 1, false); res.changed = true; P.msg = ''; }
  } else if (code === 'Backspace' || code === 'Delete') { if (cur.kind === 'row' && campTuneChanged(cur.row.id)) { campTuneReset(cur.row.id); res.changed = true; P.msg = ''; } }
  campTuneKeepSeen(P, items);
  return res;
}

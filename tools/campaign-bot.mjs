// Bot players for the Campaign, flown in the logic sim (plain Node, no Chrome): how long a level takes, how often it is won, and why it is lost.
// Card space-game-night-gameplay (docs/night/gameplay.md). It reads the game (src/campaign.js) and changes nothing in it.
//   node tools/campaign-bot.mjs                      the whole table: levels 1 to 3, every bot, seeds 1 to 12
//   node tools/campaign-bot.mjs --level 1 --seeds 20 --bots plain,carrier --skill steady
//   node tools/campaign-bot.mjs --power 4,1,1        (IGNORED while CAMP.power.on is false, which it is since card space-game-power-removed: the pips are off) the ship's systems for every run: weapons, shields, engines, 6 pips (default 2,2,2: every factor 1, the shield mending at its base rate)
//   node tools/campaign-bot.mjs --tech beam          start with these techs (a level's table row says which a player would have)
//   node tools/campaign-bot.mjs --old               level 1 with the numbers it had before the easier level 1 (Earth's shield 300 and the rest): what Troy's first tries were played on
//   node tools/campaign-bot.mjs --set alien.hpScale=2 --set alien.damageScale=2   what if: change numbers of the table (CAMP.<path> = a number) for this run only
//   node tools/campaign-bot.mjs --keys               every order the bot gives goes through the game's own KEYS (the order lists of src/camppanel.js: the list's key, Down to the row, Enter; the target picked first; Enter for a missile), not straight to the sim: proof that the keys alone win
//   node tools/campaign-bot.mjs --json               the numbers, not the table
// A bot is a way of playing: when it launches, whether it escorts, how often it attacks, whether it recalls its wounded, and the carrier's aim (skill: sharp,
// steady, rough). The carrier flies at the alien nearest Earth (or nearest itself on a level with no Earth) and fires; that is the "plain strategy" of tests/campaign.mjs.
// Per run it keeps: the result and the seconds, the carrier's hull, Earth's shield and where its damage came from (by the kind of the ship that fired), the carrier's
// damage by kind, the wave starts, the seconds with no alien alive (waiting), the ships lost.
import { writeFileSync } from 'node:fs';
import { nodeGame } from '../tests/nodegame.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] || '').startsWith('--') || i + 1 >= process.argv.length ? true : process.argv[i + 1]; };
const LEVELS = String(arg('level', '1,2,3')).split(',').map(Number);
const MISSION = arg('mission', null);                        // --mission 2: only mission 2 of each level (the missions of a level are flown one by one, card space-game-campaign-missions); without it every mission of the level is flown
const SEEDS = Number(arg('seeds', 12));
const SKILL = String(arg('skill', 'steady'));
const TECH = arg('tech', null);
const POWER = arg('power', null) === null ? null : String(arg('power')).split(',').map(Number); // --power 4,1,1: the ship's systems for every run (weapons, shields, engines; card space-game-campaign-systems); none: 2,2,2, today's numbers
const MAXSEC = Number(arg('max', 420));
const PACE = String(arg('pace', 'brisk'));                     // --pace calm|normal|brisk (or a number): the battle pace (card space-game-campaign-pace); brisk is 0.85 of the table's numbers since card space-game-command-slowtime (Calm 0.6, Normal 0.72, Brisk 0.85); --pace 1 is the table as it was. The bots step the sim themselves, so command time (the map or a call open, or two seconds after a fleet key: src/campslow.js, the scene's frame) never touches them: they need no teaching for it
const RANK = String(arg('rank', 'auto'));                     // --rank 0..5: the pilot's rank (src/campranks.js); auto: the rank a player of ordinary scores would have on reaching that mission (1,400 a mission flown before it)

// the ways of playing. launchAt/attackFrom/attackEvery are seconds into the level; escort: the seconds each convoy is named (level 1); cycle: recall the wing when the fighters
// are on average under this share of their hit points, launch again when they have landed; defend: fly at the alien nearest Earth, not nearest the carrier
const BOTS = {
  idle: { name: 'idle', idle: true },
  carrier: { name: 'carrier', launch: false },                                                                  // flies and shoots, never launches
  guard: { name: 'guard', launchAt: 1 },                                                                        // launches; the wing only guards the carrier
  noescort: { name: 'noescort', launchAt: 1, attackFrom: 12, attackEvery: 5 },                                    // launches and attacks, never escorts
  plain: { name: 'plain', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5 },                             // the test's sensible player: escorts Mars, attacks every 5 s
  both: { name: 'both', launchAt: 1, escort: [9, 56], attackFrom: 12, attackEvery: 5 },                          // escorts the second convoy too
  cycle: { name: 'cycle', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cycle: 0.45 },                // plain, and it recalls the wounded wing and launches again
  defend: { name: 'defend', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, defend: true },              // plain, flying at what is nearest Earth
  late: { name: 'late', launchAt: 30, escort: [40], attackFrom: 40, attackEvery: 20 },                            // a slow player: launches at 30 s, attacks every 20 s
  missile: { name: 'missile', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, missiles: true },         // plain, and it presses F whenever a big ship is in reach
  tuck: { name: 'tuck', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, tuck: true },                    // plain, and the convoy orders (card space-game-convoy-orders): when a hostile comes within 1,600 px of an escorted ship the cruiser goes to it and the ships tuck in under its shield; when the sky is clear they carry on
  mguard: { name: 'mguard', launchAt: 1, missiles: true },                                                       // launches (the wing only guards) and fires missiles
  troy: { name: 'troy', launchAt: 45, escort: [81], sit: true, noroute: true },                                                   // Troy's first try (play log 20 Nov): launches at 45 s, escorts at 81 s, never attacks, the carrier stays at the base and shoots what comes close
  troyh: { name: 'troyh', launchAt: 45, escort: [81], sit: true, reactive: 3, noroute: true },                                      // troy, and when the first real damage comes (Earth under 90 percent, or the hull under 80) it reads a hint 3 s later: launch if need be, attack every 5 s, fly out
  strong: { name: 'strong', launchAt: 1, escort: [9, 56], attackFrom: 12, attackEvery: 5, missiles: true, cycle: 0.45, skill: 'sharp' }, // a strong player (card space-game-wrapup-difficulty): escorts both convoys, missiles on every big ship, recalls and relaunches the hurt wing, and flies sharp
  mcarrier: { name: 'mcarrier', launch: false, missiles: true },
  plains: { name: 'plains', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: true },                  // plain, and it sends the Red squad to the miner of 1.1 when the radio says pirates are on him (an ordinary squad order)
  plainm: { name: 'plainm', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, mineAll: true },          // plain, and the wing keeps mining while any rock is left, goal met or not (a player who wants the cash: 1.2 in the real game, card space-game-tune-l1-notes)
  plainu: { name: 'plainu', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, noroute: true },            // plain, and it never scouts the fork: the default lane (what a player who ignores the new tools meets; card space-game-fleet-command-tune)
  plaini: { name: 'plaini', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: 'ignore' },              // plain, but the miner's call of 1.1 is ignored: no pilot is sent at the pirates on him
  plaing: { name: 'plaing', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: 'guard' },               // plain, and at the miner's call of 1.1 one pilot (Kara) is sent to guard the miner
  plaigk: { name: 'plaigk', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: 'guardkeys' },           // plain, and at the miner's call of 1.1 one pilot (Kara) is sent to guard the miner THROUGH THE KEYS a player presses: W, 2, E, the miner's digit, Enter (card space-game-11-e-reaches-miner)
  plaina: { name: 'plaina', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: 'all' },                 // plain, and at the miner's call all three pilots are sent at the pirates on him
  plainr: { name: 'plainr', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, rear: true },               // plain, and when the last hauler leaves one pilot (Kara) is posted on it to guard it (card space-game-13-all-haulers-savable): a player who sends a pilot to the rear
  thinks: { name: 'thinks', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: true, tuck: 'torp' },   // a player who directs the fleet: helps the miner and uses the convoy orders (and scouts the fork)
  thinku: { name: 'thinku', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, help: true, tuck: 'torp', noroute: true }, // the same on the default lane
  // THE COCKPIT BOTS (card space-game-fly-fighter-l3; Troy, 26 Nov 2026: he will fly a pilot's fighter with the C key, src/campcockpit.js). Each is `plain` (the cruiser flown the plain way, standing for a Q order the cruiser keeps flying, and its turrets on their own while
  // the stick is away) plus a player in a fighter: `ace` takes the stick at 1 s (as soon as Wedge is out) and flies it through C.cockpit.input, the same five fields a human's keys write, with a human's limits (cockReact: 200 ms between what it sees and what its hands
  // do; a firing cone; boost only on a long chase; the sharp, steady and rough skills are its aim); `sit` takes the stick and does nothing (the fighter hangs where it was taken): what the cruiser and the other five pilots do alone. ace1 and sit's other
  // column change one number each: hpK 1 (the fighter's own hull, not double), turrets 'off' (the cruiser's turrets silent while he is away). All of them need CAMP.flags.cockpit, which the run turns on and puts back (the other bots never see it).
  ace: { name: 'ace', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cockpit: 'ace' },
  ace1: { name: 'ace1', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cockpit: 'ace', hpK: 1 },
  sit: { name: 'sit', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cockpit: 'sit' },
  sitoff: { name: 'sitoff', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cockpit: 'sit', turrets: 'off' },
  sitm: { name: 'sitm', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cockpit: 'sitm' }                // sit, beside a miner (card space-game-b10-c11-12-miner-guard): the stick taken, flown to the nearest neutral miner and parked there, no gun; only a mission with miners (1.2) means anything
};
const SKILLS = { sharp: { gain: 3, thr: 0.15, noise: 0 }, steady: { gain: 2, thr: 0.22, noise: 0.1 }, rough: { gain: 1.5, thr: 0.3, noise: 0.2 } };

const KEYLEASH = Number(arg('leash', 3000));                  // --leash N: with --keys, the pilots are sent only at a threat this near the cruiser (px) and called back from a chase past it (card space-game-12-keys-lose-miners)
const OLD = process.argv.includes('--old');
const SETS = process.argv.map((a, i) => a === '--set' ? process.argv[i + 1] : null).filter(Boolean); // --set alien.hpScale=2 --set alien.damageScale=2: change the table before the run (what-if)
const g = nodeGame();
g.run(`window.__KEYS = ${process.argv.includes('--keys')}`); g.run(`window.KEYLEASH = ${KEYLEASH}`); // --keys: the orders are given with the keys a player has (see ord below)
g.run(`window.__PACE = ${isNaN(Number(PACE)) ? JSON.stringify(PACE) : Number(PACE)}`); // the battle pace of every battle of this run
g.run(`window.__RANK = ${JSON.stringify(RANK)}`); // the pilot's rank for every battle of this run
if (OLD) g.run(`(() => { CAMP.earth.shield = 300; CAMP.earth.regen = 0; CAMP.mother.hp = 900; CAMP.mother.damage = 12; CAMP.mother.holdAt = 1600; CAMP.mother.spawnEvery = 8000; CAMP.mother.spawnMax = 6; CAMP.levels[1].waves[2].ships.raider = 3; })()`); // the numbers before the easier level 1
g.run(`(() => {
  const kindOf = id => String(id || '').split('-')[0];
  window.__M = null;
  const hurt0 = campHurt;
  campHurt = function (C, u, dmg, byId) {
    const M = window.__M;
    if (M && u.kind === 'carrier' && u.hp > 0 && !C.result && !C.god) { const d = dmg * (campHas(C, 'shield') ? CAMP.tech.shield.taken : 1); const k = kindOf(byId); M.hitC[k] = (M.hitC[k] || 0) + d; }
    if (M && u.kind === 'carrier' && u.hp > 0 && !C.result && !C.god && C.cockpit) M.awayHit += dmg * (campHas(C, 'shield') ? CAMP.tech.shield.taken : 1); // the cruiser's damage while the stick is away (what the player in a fighter lets it take)
    const was = u.kind === 'freighter' && u.hp > 0, alive = u.team === 'alien' && u.hp > 0, hp0 = u.hp, r0 = hurt0.apply(null, arguments);
    if (M && alive && C.cockpit && C.cockpit.id === byId) { M.cockHits++; M.cockDmg += Math.max(0, hp0 - Math.max(0, u.hp)); } // the flown fighter's gun: the hits it landed on a hostile and the hit points they took off it (card space-game-fly-fighter-aim-help: the hit rate and the damage a second, before and after the auto-target)
    if (M && alive) M.alienDmg += Math.max(0, hp0 - Math.max(0, u.hp)); // every hit point taken off a hostile, by anyone (the cruiser's turrets, the wing, the fighter flown): the whole the fighter's share is of (card space-game-b12-c11-12-sweep-rules)
    if (M && alive && u.hp <= 0 && M.cockIds[byId]) M.cockKills++; // an alien killed by the fighter the player flies (its id is the shot's from)
    if (M && was && u.hp <= 0) M.dead.push((u.cid || u.id) + '@' + Math.round(C.t / 1000) + ':' + kindOf(byId)); // which convoy ship was lost, and when (card space-game-13-all-haulers-savable)
    return r0;
  };
  const clampi = v => Math.max(-1, Math.min(1, v));
  // --keys: an order as a player gives it. The row is found in the key table (campKeyVia), its list is opened with the list's own key, Down goes to the row, Enter gives it (src/camppanel.js campPanelKey);
  // "attack that one" is the target picked first (what [ ] and the backslash do) and then the order key W to each pilot; a missile is Enter with no list open. What has no row or key (a lane: the map's; recall: the strip's) stays an order.
  const give = (C, rowId) => { const list = campKeyVia(rowId), rows = list ? campPanelList(C, list.id) : [], i = rows.findIndex(r => r.id === rowId); if (i < 0) return { ok: false, say: 'no such row here: ' + rowId }; const P = campPanelNew(); campPanelKey(P, C, list.code, 0); const nrows = rows.length, downs = ((i - P.at) % nrows + nrows) % nrows; window.__KEYN = (window.__KEYN | 0) + 1; if (list.numbers) { let r = campPanelKey(P, C, 'Digit' + (i + 1), 0); if (P.pick) { window.__KEYN++; r = campPanelKey(P, C, 'Digit1', 0); } return r; } /* the S list is the digits' (card space-game-s-list-numbers) */ for (let k = 0; k < downs; k++) campPanelKey(P, C, 'ArrowDown', 0); let r = campPanelKey(P, C, 'Enter', 0); if (P.pick) { window.__KEYN++; r = campPanelKey(P, C, 'Enter', 0); } return r; }; // (a row that needs a target opens a sub-list when there are several to choose from, src/camppick.js: the bot takes the top one, as a player who has no better idea does)
  const aim = (C, id) => { if (id) C.tgt = id; else campTgtClear(C); };
  // an order to ONE pilot with the keys (card space-game-bracket-select-orders): W steps who till it is the pilot's squad (card space-game-keys3-select: Q W pick who), then the order key (E: attack the enemy picked, guard the friendly picked, form up with none); the selection is let go after
  const pilotKey = (C, sq, key) => { const P = campPanelNew(); C.sel = ''; window.__KEYN = (window.__KEYN | 0) + 1; campPanelKey(P, C, campKeyCodes('who')[0], 0); campPanelKey(P, C, 'Digit' + (['red', 'green', 'yellow'].indexOf(sq) + 1), 0); /* W opens the fleet pick, its digit picks the pilot (card space-game-keys5-qwe) */ const r = C.sel === 'pilot:' + sq ? campPanelKey(P, C, key, 0) : { ok: false, ran: false, say: 'no such pilot out: ' + sq }; C.sel = ''; return r; };
  const ROW = {}; // (no whole-wing order is a row of a list now: the cruiser list's Mine ore row is OFF since card space-game-orders-f5-q-cruiser-only; the bots mine through the wing order itself, below); Launch is the order key to each pilot in the bay (card space-game-delete-off-lists: the all-squads list is deleted), Recall is the strip's (there is no recall key: the pilots stay out)
  // the wing is split as a player splits it (card space-game-cut-escorts: there is no escort ship): the Yellow squad (two ships) is the escort, going to the convoy; Red and Green (six) are the fighters that Attack goes to
  // while the pirates of the miner's call live, the pilots an answer sent to him stay on it: the bot's attack order every few seconds leaves them be ('guard': Kara; 'all': everyone; 'ignore': nobody goes, and
  // the attack order is not given at those pirates at all). callHeld is the groups held now; callOnly is true while the only pirates alive are the call's
  let callHeld = {}, callOnly = false;
  const callTick = (C, B) => { callHeld = {}; callOnly = false; const w = C.L.waves.findIndex(x => x.beat === 'distress'); if (w < 0 || typeof B.help !== 'string' || !C.waves[w].started) return;
    const foes = campAliens(C), mine = foes.filter(u => u.wave === w); if (!mine.length) return; callOnly = mine.length === foes.length;
    if (B.help === 'guard' || B.help === 'guardkeys') callHeld = { green: 1 }; else if (B.help === 'all') callHeld = { red: 1, green: 1, yellow: 1 }; };
  // the answer to the miner's call of 1.1 (card l1-miner-choice): help: true sends Wedge at the pirates (as it always did), 'guard' sends one pilot (Kara) to fly beside the miner, 'all' sends all three at the pirates
  const minerAnswer = (C, how, foe) => { const w = C.L.waves.find(x => x.beat === 'distress'), m = w && C.ships.find(u => u.team === 'neutral' && u.hp > 0 && u.tid === w.victim);
    if (how === 'ignore' || how === 'guard' || how === 'guardkeys') campWingOrder(C, null, 'guard', null, 'bot'); // the pilots form up on the cruiser (the bot's standing attack order would send them at anything seen): nobody goes, or only the one sent next
    if (how === 'ignore') return null;
    if (how === 'guardkeys') { // the keys of a player (card space-game-11-e-reaches-miner): W then 2 picks Kara and closes, E opens the friends pick and E then the miner's number picks him and closes, Enter sends the pilot picked to guard the friend picked
      const n = m ? ((campFriNumbered(C).find(e => e.id === m.id)) || {}).number : 0; if (!n) return null;
      const P = campPanelNew(), K = c => campPanelKey(P, C, c, 0); K('KeyW'); K('Digit2'); K('KeyE'); K('Digit' + n); return K('Enter');
    }
    return how === 'guard' && m ? campWingOrder(C, 'green', 'guard', m.id, 'bot') : how === 'all' ? campWingOrder(C, null, 'attack', foe.id, 'bot') : campWingOrder(C, 'red', 'attack', foe.id, 'bot'); };
  const wingEscort = (C, arg) => { const t = campFind(C, arg), cv = t && t.kind === 'convoy' ? C.by[t.id] : campNearest(campConvoys(C), C.carrier); return cv ? campWingOrder(C, 'yellow', 'escort', cv.id, 'bot') : campOrder(C, 'escort', arg); };
  const wingAttack = (C, arg) => { let r = null; ['red', 'green'].filter(k => !callHeld[k]).forEach(k => { const x = campWingOrder(C, k, 'attack', arg === 'mothership' ? 'mother' : null, 'bot'); if (x.ok || !r) r = x; }); if (!r) return { ok: false }; /* every squad it orders is held at the miner's call */ return r.ok || campWing(C, 'fighter').length === 0 ? r : campOrder(C, 'attack', arg); };
  const ord = (C, name, arg) => {
    if (!window.__KEYS) return name === 'escort' ? wingEscort(C, arg) : name === 'attack' ? wingAttack(C, arg) : campOrder(C, name, arg);
    if (name === 'escort') return wingEscort(C, arg); // the escort of the old wing is the Yellow squad now (card space-game-cut-escorts: no escort ship): the one squad that goes to the convoy while Red and Green fight; no key sends ONE squad to a convoy (the lists of the squads went, card space-game-bracket-select-orders), so this is the wing order
    if (name === 'launch') { ['red', 'green', 'yellow'].forEach(k => pilotKey(C, k, campKeyCodes('order')[0])); return { ok: true, say: '' }; } // the order key (E) to a pilot in the bay launches it (nothing picked: form up on the cruiser)
    if (name === 'mine') return campWingOrder(C, 'fighters', 'mine', null, 'key'); // the whole wing mines (the order the Q list's Mine ore row gave: campPanelRun 'wing')
    if (ROW[name]) return give(C, ROW[name]);
    if (name === 'reload') return campPanelKey(campPanelNew(), C, 'KeyR', 0); // R builds the rack (card space-game-missiles-cost-ore): a key, not a row of a list
    if (name === 'convoy') return give(C, arg === 'tuck in' ? 'ctuck' : arg === 'carry on' ? 'ccarry' : arg === 'run for it' ? 'crun' : 'chold');
    if (name === 'attack' || name === 'missiles') { const m = arg === 'mothership' ? C.ships.find(u => u.kind === 'mother' && u.hp > 0) : null;
      if (name === 'attack' && !m) { // the nearest threat (\), unless it is out of reach: a player does not send the pilots 10 km after a pirate that has broken off, and calls them back (X clears, E with nothing picked forms up) when they are out past that (card space-game-12-keys-lose-miners: the key bots chased runners 10 to 17 km from Ceres while the next raid killed the miners)
        const t0 = campTgtList(C)[0], far = u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) > window.KEYLEASH;
        if (!t0 || far(t0)) { if (!campWing(C, 'fighter').some(far) && !C.tgt) return { ok: false }; campTgtClear(C); return (pilotKey(C, 'red', campKeyCodes('order')[0]), pilotKey(C, 'green', campKeyCodes('order')[0])); }
        campTgtNearest(C);
      } else aim(C, m ? m.id : ''); return name === 'attack' ? (pilotKey(C, 'red', campKeyCodes('order')[0]), pilotKey(C, 'green', campKeyCodes('order')[0])) : campPanelKey(campPanelNew(), C, campKeyCodes('missile')[0], 0); }
    return campOrder(C, name, arg);
  };
  window.__botStep = (C, s, B, sk, st) => {
    if (B.idle) return; // (an idle player gives no order)
    callTick(C, B);
    if (B.rear) { const last = C.L.convoys.length - 1, rr = last >= 0 && C.convoys[last] && C.convoys[last].started ? C.by['freighter-' + C.L.convoys[last].id] : null; if (rr && rr.hp > 0) { if (!st.rearPost) { st.rearPost = true; campWingOrder(C, 'green', 'guard', rr.id, 'bot'); } callHeld.green = 1; } } // the pilot posted on the rear ship stays there: the attack order leaves Kara be
    if (B.help && !st.helped && C.beats && !C.beats.thanked) { const w = C.L.waves.findIndex(x => x.beat === 'distress'), foes = w >= 0 && C.waves[w] && C.waves[w].started ? C.ships.filter(u => u.team === 'alien' && u.hp > 0 && u.wave === w) : []; if (foes.length) { st.helped = true; minerAnswer(C, B.help, foes[0]); } } // the miner is under attack (the radio says so, one plain line): a player who reads it sends the Red squad at the pirates on him, an ordinary squad order
    if (C.arrivedAt == null) return; // the trip first, with the wing aboard (a Fast burn needs it: card space-game-campaign-fast-board); the plan runs from the arrival, as a player's does
    s -= C.arrivedAt / 1000;
    if (B.reactive != null && st.react == null && ((C.earth && C.earth.shield <= C.earth.max * 0.9) || C.carrier.hp <= C.carrier.maxHp * 0.8)) st.react = s + B.reactive;
    if (st.react != null && s >= st.react) { B = Object.assign({}, B, { sit: false, launchAt: st.launched ? B.launchAt : 0, attackFrom: 0, attackEvery: 5 }); st.sitOff = true; }
    if (B.launch !== false && B.launchAt != null && !st.launched && s >= B.launchAt) { st.launched = true; ord(C, 'launch'); }
    (B.escort || []).forEach((at, i) => { if (!st['e' + i] && s >= at && campConvoys(C).length) { st['e' + i] = true; ord(C, 'escort', 'convoy'); } }); // the wing goes to the nearest convoy ship (the transport, the haulers)
    const mineOpen = (campObjectives(C).some(o => !o.done && o.type === 'ore') || (B.mineAll && C.rocks.some(r => r.hp > 0))) && !B.nomine, fight = campAliens(C).some(u => !u.hold);
    if (B.launch !== false && st.launched && mineOpen && !st.mining && !fight && s >= (st.mineAt || 0)) { if (ord(C, 'mine').ok) st.mining = true; else st.mineAt = s + 1; } // while the mission asks for ore the wing mines, and goes to the fight only when one comes (then mines again) // a mission that asks for ore: the wing mines (E then 1)
    if (B.cycle && st.launched) {
      if (st.landAt && s >= st.landAt) { st.landAt = 0; ord(C, 'launch'); st.nextAtk = s + 2; (B.escort || []).forEach((at, i) => { if (s >= at) st['e' + i] = false; }); } // the squad that escorts goes back to the convoy once it is out again
      const fs = campWing(C, 'fighter');
      if (!st.landAt && fs.length >= 3 && Math.round(s * 30) % 60 === 0 && fs.reduce((a, u) => a + u.hp / u.maxHp, 0) / fs.length < B.cycle && C.carrier.hp > 0) { ord(C, 'recall'); st.landAt = s + 14; st.recalls = (st.recalls || 0) + 1; }
    }
    if (B.tuck && typeof campConvoyShips === 'function' && Math.round(s * 30) % 15 === 0) { // the convoy orders: tuck in while a hostile is near an escorted ship, carry on when it is clear
      const big = x => B.tuck !== 'torp' || x.kind === 'tboat' || x.kind === 'lancer' || x.kind === 'pirateleader'; // tuck: 'torp': only against the boats and the leader, the threats a tucked ship is safe from (the skiffs of a distress call are the fighters' to deal with, and the cruiser goes to the miner)
      const cs = campConvoyShips(C), threat = cs.some(f => campAliens(C).some(a => big(a) && !a.hold && campDist(a, f) < 1600)), clear = !cs.some(f => campAliens(C).some(a => big(a) && !a.hold && campDist(a, f) < 2600));
      if (threat && !st.tuck) { st.tuck = true; ord(C, 'convoy', 'tuck in'); } else if (clear && st.tuck) { st.tuck = false; ord(C, 'convoy', 'carry on'); }
    }
    if (B.missiles && !fight && !campObjectives(C).some(o => !o.done && o.type === 'ore') && Math.round(s * 30) % 90 === 0 && typeof campMissileState === 'function' && campMissileState(C).state === 'ready') ord(C, 'reload'); /* (not while the mission asks for ore in the store: 1.2's goal is 450, and every missile built is 20 ore of it; the key bots spent the store on racks and timed out: card space-game-12-keys-lose-miners) */ // missiles cost ore (card space-game-missiles-cost-ore): in a calm moment the rack is built up, as a player does (R); at zero the ship builds one by itself
    if (B.missiles && Math.round(s * 30) % 21 === 0 && typeof campOrder === 'function') ord(C, 'missiles', C.ships.some(u => u.kind === 'mother' && u.hp > 0) ? 'mothership' : '');
    if (B.attackEvery && st.launched && s >= B.attackFrom && !st.landAt && Math.round(s * 30) % Math.round(B.attackEvery * 30) === 0 && (!mineOpen || fight) && !(callOnly && typeof B.help === 'string')) {
      const boat = typeof campTorpedoBoats === 'function' ? campTorpedoBoats(C).filter(u => !u.running).sort((p, q) => campDist(p, C.carrier) - campDist(q, C.carrier))[0] : null; // torpedo boats (card space-game-torpedo-boats): the plain answer is to send the fighters at the nearest boat that still has a torpedo, before anything else
      if (boat) { if (window.__KEYS) { aim(C, boat.id); pilotKey(C, 'red', campKeyCodes('order')[0]); pilotKey(C, 'green', campKeyCodes('order')[0]); } else ['red', 'green'].forEach(k => campWingOrder(C, k, 'attack', boat.id)); } else ord(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
      const left = campAliens(C).filter(u => !u.hold); if (left.length && left.every(u => u.running)) { const run = left.sort((p, q) => campDist(p, C.carrier) - campDist(q, C.carrier))[0]; campWingOrder(C, null, 'attack', run.id, 'bot'); } // all that is left is a pirate running with its hull gone: the wing is sent at it by name, as a player picks it (the pilots start out now, and a runner kept out of the wing's own sight: card space-game-keys-orders)
      st.mining = false;
    }
  };
  window.__fly = (C, B, sk, st) => {
    if (B.idle) return;
    const c = C.carrier, al = campAliens(C).filter(u => !u.hold);
    let a = null;
    if (al.length) { const ref = (B.defend || C.earth) && C.earth ? C.earth : c; a = al.slice().sort((p, q) => campDist(p, ref) - campDist(q, ref))[0]; if (!B.defend) a = al.slice().sort((p, q) => campDist(p, c) - campDist(q, c))[0]; }
    if (st.sitOff) B = Object.assign({}, B, { sit: false });
    if (B.sit && a && campDist(a, c) > 900) a = null; // a carrier that stays where it is and fights only what comes close
    if (B.sit && !a) { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; return; }
    const L = C.L; let goal = a;
    if (L.place && C.arrivedAt == null) { if (campNavOut(C)) { if (!st.tripHome) { st.tripHome = true; campWingOrder(C, null, 'recall', null, 'bot'); } return; } /* the pilots start out (card space-game-keys-orders): they come home first, a Fast burn needs the wing aboard */ if (!C.nav || !C.nav.on) { const gp = campNavGoal(C); if (gp) campNavGo(C, gp, true); } return; } // the trip to the mission's place first: the map's Fast click, which the autopilot flies (it sets the input itself)
    if (L.objectives) { // a mission: fly at what its first open objective asks (a point to scan, a cache, the relic, the haulers), and at what comes near
      const first = campObjectives(C).find(o => !o.done) || {}, byD = list => list.sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      if (first.type === 'scan') goal = byD(C.scan.filter(p => !p.got)) || goal; else if (first.type === 'caches') goal = byD(C.caches.filter(k => !k.got)) || goal; else if (first.type === 'relic') goal = C.relic;
      else if (first.type === 'deliver') goal = byD(campConvoys(C).slice()) || goal || { x: 1000, y: -500 }; else if (first.type === 'hold') goal = C.earth || goal;
      else if (first.type === 'ore') goal = byD(C.rocks.filter(r => r.hp > 0)) || goal; // mine: fly to the nearest rock (the carrier's lasers cut it; the wing mines too)
      else if (first.type === 'kill' && !goal && (first.what === 'guards' || first.what === 'wave:all')) goal = byD(C.ships.filter(u => u.team === 'alien' && u.hp > 0 && (first.what === 'guards' ? u.guard : u.wave != null))) || goal; // guards, and the groups a cache or a dead guard calls, wait where they are: no clock brings a fight to a cruiser that sits (card space-game-b7-level2), so the bot flies at the nearest of them, as a player would
      else if (first.type === 'kill' && !goal) goal = byD(C.rocks.filter(r => r.hp > 0)) || goal; // wait for the raid at the rocks, not in the open
      else if (first.type === 'cashin') { // sell the store: fly to the market outpost and dock (campDock refuses with an alien near: the fight comes first)
        const o = campOutposts(C.level).find(x => x.market); if (o) { goal = { x: o.x, y: o.y, got: false }; if (campOutpostNear(C) && !campAliens(C).length) { campDock(C, o.id); campUndock(C); } }
      }
      if (a && campDist(a, c) < 900) goal = a;
    } else if (C.level === 2) { const k = C.caches.filter(k => !k.got).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; goal = C.cachesGot < L.relic.caches && k ? k : C.relic; if (a && campDist(a, c) < 700) goal = a; }
    else if (C.level === 3) { const near = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; goal = near; a = near; }
    if (st.tuck && typeof campConvoyShips === 'function') { const f = campConvoyShips(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; if (f) goal = f; } // tucked in: the cruiser goes to the escorted ship and stays by it, firing at what is in reach
    if (!goal) { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; return; }
    st.err = (st.err || 0) * 0.97 + (C.rng() - 0.5) * sk.noise * 0.25;
    const want = Math.atan2(goal.y - c.y, goal.x - c.x) + st.err, d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)), dist = campDist(goal, c);
    C.input.turn = clampi(d * sk.gain);
    const turrets = typeof campReach === 'function', reach = turrets ? campReach(C) : 800 * (campHas(C, 'beam') ? 1.5 : 1); // the turrets (6-GEN) fire in every direction, to 500 px from the edge of the target; the old main gun fired along the nose to about 800
    const hold = st.tuck && goal && goal.kind === 'freighter' ? 70 : goal === C.relic ? 60 : (goal && goal.got === false ? 40 : (a && goal === a ? (turrets ? reach * 0.6 : 420) : 300));
    C.input.thrust = dist > hold ? 1 : 0;
    const tgt = a || goal, w2 = Math.atan2(tgt.y - c.y, tgt.x - c.x) + st.err, d2 = Math.atan2(Math.sin(w2 - c.rot), Math.cos(w2 - c.rot));
    C.input.blink = !!(campHas(C, 'blink') && dist > 2200 && Math.abs(d) < 0.25 && C.t - C.blinkAt >= campBlinkCooldown(C));
    C.input.fire = !!a && (turrets ? campDist(a, c) - a.r < reach : Math.abs(d2) < sk.thr && campDist(a, c) < reach); // Space held while an alien is in reach
    if (turrets && (C.torpedoes || []).some(t => !t.dead && campDist(t, c) - t.r < reach)) C.input.fire = true; // and while a torpedo is: the turrets shoot it down (card space-game-torpedo-boats)
  };
  // THE PLAYER IN A FIGHTER (card space-game-fly-fighter-l3). campCockpitTake / campCockpitGive / campEye / C.cockpit.input are src/campcockpit.js (card space-game-fly-fighter-l1); a bot writes the five fields (turn -1 to 1, thrust 0 to 1, brake, boost, fire)
  // a human's keys write, and nothing else of the fighter. 'ace' decides every tick but its hands do what it decided cockReact ticks ago (200 ms: a human's reaction), so it never turns before it has seen the foe turn.
  const COCK = { react: 6, takeAt: 1, wait: 10, lowHull: 0.3, back: 0.8, home: 320, chase: 800, fire: 1.5, lead: { sharp: 1, steady: 0.6, rough: 0.3 } }; // react: ticks (30 a second); wait: seconds after a lost fighter before another is taken; lowHull: hand it back under this share of the hull; back: take one again over this share; home: the px from the cruiser it waits at; chase: boost only past this many px; fire: the gun's reach in multiples of the pilots' (CAMP.fighter.range)
  window.__cockpit = (C, B, sk, st, M) => {
    if (!B.cockpit || typeof campCockpitTake !== 'function' || C.result) return;
    const s = C.t / 1000, K = st.ck = st.ck || { q: [], err: 0, hold: 0 };
    if (C.cockpit) {
      const u = campEye(C), inp = C.cockpit.input; M.cockSec += 1 / 30; M.cockIds[C.cockpit.id] = 1;
      if (B.cockpit === 'sitm') { // sits BESIDE a miner (card space-game-b10-c11-12-miner-guard: the page's one-minute test of chunk 11): flies to the nearest neutral miner, brakes beside him, never fires and never leaves
        const m = C.ships.filter(x => x.kind === 'miner' && x.team === 'neutral' && x.hp > 0).sort((p, q) => campDist(p, u) - campDist(q, u))[0], now = { turn: 0, thrust: 0, brake: false, boost: false, fire: false };
        if (m) { const dist = campDist(m, u), d = Math.atan2(Math.sin(Math.atan2(m.y - u.y, m.x - u.x) - u.rot), Math.cos(Math.atan2(m.y - u.y, m.x - u.x) - u.rot)); now.turn = clampi(d * sk.gain); now.thrust = dist > 150 && Math.abs(d) < 1.3 ? 1 : 0; now.brake = dist < 100; now.boost = dist > COCK.chase && Math.abs(d) < 0.35; }
        Object.assign(inp, now); C.input.fire = false; return;
      }
      if (B.cockpit === 'sit') { Object.assign(inp, { turn: 0, thrust: 0, brake: false, boost: false, fire: false }); C.input.fire = false; return; }
      C.input.fire = false; // Space is the fighter's gun now (the cruiser's turrets are CAMP.cockpit.turrets' to fire)
      if (u.hp < u.maxHp * COCK.lowHull) { M.cockBacks++; campCockpitGive(C, 'hand'); K.hold = s + COCK.wait; K.q.length = 0; return; } // a human hands a hurt one back
      const F = CAMP.fighter, c = C.carrier, foes = campAliens(C).filter(a => !a.hold && a.hp > 0 && !a.docked), reach = F.range * COCK.fire;
      let a = null, best = 1e9; foes.forEach(x => { const d = campDist(x, u); if (d < best) { best = d; a = x; } });
      if (a && campDist(a, c) > 3200) a = null; // not far out past the cruiser
      let goal = a, lead = 0;
      if (a) lead = COCK.lead[sk.name] != null ? COCK.lead[sk.name] : 0.6; else goal = { x: c.x, y: c.y };
      K.err = K.err * 0.97 + (C.rng() - 0.5) * sk.noise * 0.25;
      const sp = Math.max(1, F.bullet * (C.shot || 1)), t = a ? Math.min(1.2, campDist(a, u) / sp) * lead : 0;
      const gx = goal.x + (a ? (a.vx || 0) * t : 0), gy = goal.y + (a ? (a.vy || 0) * t : 0), dist = Math.hypot(gx - u.x, gy - u.y);
      const want = Math.atan2(gy - u.y, gx - u.x) + K.err, d = Math.atan2(Math.sin(want - u.rot), Math.cos(want - u.rot));
      const now = { turn: clampi(d * sk.gain), thrust: 0, brake: false, boost: false, fire: false };
      if (a) { now.thrust = dist > 260 && Math.abs(d) < 1.3 ? 1 : 0; now.brake = dist < 150; now.boost = dist > COCK.chase && Math.abs(d) < 0.35; now.fire = dist < reach && Math.abs(d) < sk.thr; }
      else { now.thrust = dist > COCK.home && Math.abs(d) < 1.3 ? 1 : 0; now.brake = dist < COCK.home * 0.6; now.boost = dist > COCK.chase * 1.5 && Math.abs(d) < 0.35; }
      K.q.push(now); if (K.q.length > COCK.react) Object.assign(inp, K.q.shift()); else Object.assign(inp, { turn: 0, thrust: 0, brake: false, boost: false, fire: false }); // (what its hands do is what it decided a moment ago)
      return;
    }
    if (s < COCK.takeAt || s < K.hold) return;
    const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked && !u.cockpit);
    if (B.cockpit === 'ace' && K.hold && !fs.some(u => u.hp >= u.maxHp * COCK.back)) return; // wait for a fit one
    if (campCockpitTake(C)) { M.cockTakes++; K.q.length = 0; }
  };
  window.__run1 = (level, seed, techs, B, sk, maxSec, mission) => {
    const rank = window.__RANK === 'auto' ? campRankAt(((level - 1) * 3 + (mission | 0)) * 1400) : Number(window.__RANK) | 0; // the ranks card: the wing of the rank
    const C = window.C = campNew(level, techs, { seed, mission: mission | 0, rank, power: ${JSON.stringify(POWER)}, pace: window.__PACE });
    const M = window.__M = { hitC: {}, drainE: {}, dead: [], waves: [], clear: [], idle: 0, first: null, minHull: 1e9, recalls: 0, earthSum: 0, cockSec: 0, cockKills: 0, cockDeaths: 0, cockTakes: 0, cockBacks: 0, cockHurt: 0, awayHit: 0, cockIds: {}, cockShots: 0, cockHits: 0, cockDmg: 0, alienDmg: 0, cockFire: 0 };
    const ck0 = B.cockpit && typeof campCockpitTake === 'function' ? { on: CAMP.flags.cockpit, hpK: CAMP.cockpit.hpK, turrets: CAMP.cockpit.turrets } : null; // the table as it was: a cockpit bot sets its own and puts it back
    if (ck0) { CAMP.flags.cockpit = true; if (B.hpK != null) CAMP.cockpit.hpK = B.hpK; if (B.turrets) CAMP.cockpit.turrets = B.turrets; }
    const st = {}, total = maxSec * 30, hull0 = C.carrier.hp;
    let wavesSeen = 0, started = false, prevAl = 0; const fr = {}; // fr: the hull each convoy ship had at most and at least (what the raiders did to the convoys: card space-game-b10-c15-tune-11)
    for (let i = 0; i < total && !C.result; i++) {
      const s = i / 30; if (i % 5 === 0) for (const u of C.ships) if (u.hp > 0 && typeof u.id === 'string' && u.id.indexOf('freighter-') === 0) { const f = fr[u.id] || (fr[u.id] = { max: u.maxHp || u.hp, min: u.hp }); if (u.hp < f.min) f.min = u.hp; }
      __botStep(C, s, B, sk, st); __fly(C, B, sk, st); __cockpit(C, B, sk, st, M);
      // where Earth's damage will come from this step: the alien shots that cross the planet
      const E = C.earth, before = E ? E.shield : 0, hits = [];
      if (E) C.bullets.forEach(b => { if (!b.dead && b.team === 'alien' && b.life > 34 && campSegHit(b.x, b.y, b.x + b.vx / 30, b.y + b.vy / 30, E.x, E.y, E.r)) hits.push(kindOf(b.from)); });
      const fl = ck0 && C.cockpit ? C.by[C.cockpit.id] : null, fhp = fl ? fl.hp / (fl.maxHp || 1) : 0; // the flown fighter's hull, as a share of its full hull (handing the stick back rescales hp and maxHp together: the share stays): what it loses in a step is what hit it (card space-game-b10-c1-lead-shots)
      campStep(C, 1 / 30); if (fl && !fl.docked && fl.hp / (fl.maxHp || 1) < fhp - 1e-9) M.cockHurt += fhp - Math.max(0, fl.hp) / (fl.maxHp || 1); // (a fighter that docks has its hull set to 0: that is not a hit)
      if (ck0) C.events.forEach(e => { if (e.type === 'cockpit' && e.stage === 'give' && e.why === 'dead') M.cockDeaths++; if (e.type === 'wingshot' && C.cockpit && C.cockpit.id === e.id) M.cockShots++; }); if (ck0 && C.cockpit && C.cockpit.input.fire) M.cockFire += 1 / 30; C.events.length = 0; // (the flown gun's shots and the seconds Space was held: card space-game-fly-fighter-aim-help)
      if (E && E.shield < before) { const per = (before - E.shield) / Math.max(1, hits.length); hits.forEach(k => { M.drainE[k] = (M.drainE[k] || 0) + per; }); if (hits.length === 0) M.drainE.other = (M.drainE.other || 0) + (before - E.shield); }
      const w = C.waves.filter(x => x.started).length; if (w > wavesSeen) { wavesSeen = w; M.waves.push(Math.round(C.t / 1000)); started = true; }
      const al = campAliens(C).filter(u => !u.hold).length;
      if (started && al === 0) M.idle += 1 / 30;
      if (prevAl > 0 && al === 0 && started) M.clear.push(Math.round(C.t / 1000));
      prevAl = al;
      if (M.first == null && campAliens(C).some(u => !u.hold && campDist(u, C.carrier) < 800)) M.first = Math.round(C.t / 1000);
      if (C.carrier.hp < M.minHull) M.minHull = C.carrier.hp;
    }
    M.recalls = st.recalls || 0;
    if (ck0) { CAMP.flags.cockpit = ck0.on; CAMP.cockpit.hpK = ck0.hpK; CAMP.cockpit.turrets = ck0.turrets; if (C.cockpit) campCockpitGive(C, 'result'); }
    const r = { level, seed, result: C.result || 'timeout', why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), hull0: Math.round(hull0), minHull: Math.round(M.minHull), earth: C.earth ? Math.round(C.earth.shield) : null,
      cockSec: Math.round(M.cockSec), cockShots: M.cockShots, cockHits: M.cockHits, cockDmg: Math.round(M.cockDmg), alienDmg: Math.round(M.alienDmg), cockFire: Math.round(M.cockFire * 10) / 10, cockKills: M.cockKills, cockDeaths: M.cockDeaths, cockTakes: M.cockTakes, cockBacks: M.cockBacks, cockHurt: Math.round(M.cockHurt * 1000) / 1000, awayTaken: Math.round(M.awayHit),
      kills: C.kills, delivered: C.delivered, score: C.score ? Math.round(C.score.score || 0) : 0, bonus: (typeof campBonuses === 'function' ? campBonuses(C).filter(b => b.ok).map(b => b.id) : []).join('+'), ore: Math.round(C.ore), oreBest: Math.round(C.oreBest || 0), sold: Math.round(C.sold || 0), convoyLost: C.lost, convoyDead: M.dead.join('+'), shipsLost: C.lostShips, mended: C.mended | 0, // mended: the fighters that landed hurt and went out whole (src/camprepair.js: every bot gets the repair, there is nothing to teach it)
      torp: Object.assign({ launched: 0, shot: 0, hit: 0 }, C.torpStat || {}), // the torpedoes of the run: launched, shot down, gone off on a ship (card space-game-fighter-job-11)
      caches: C.cachesGot, towers: C.ships.filter(u => u.kind === 'tower').length, waves: M.waves, idle: Math.round(M.idle), first: M.first, recalls: M.recalls,
      hitC: Object.fromEntries(Object.entries(M.hitC).map(([k, v]) => [k, Math.round(v)])), drainE: Object.fromEntries(Object.entries(M.drainE).map(([k, v]) => [k, Math.round(v * 10) / 10])), orders: Object.assign({}, C.orders), calls: ((C.call && C.call.log) || []).map(l => l.id + ':' + l.pick + ':' + l.way) };
    { const ks = Object.keys(fr); r.convHurt = ks.length ? Math.round(ks.reduce((a, k) => a + (fr[k].max - fr[k].min), 0) / ks.reduce((a, k) => a + fr[k].max, 0) * 1000) / 1000 : 0; r.convDead = C.lost | 0; }
    window.__M = null; return r;
  };
})()`);

SETS.forEach(kv => { const [k, v] = kv.split('='); if (!/^[A-Za-z0-9_.\[\]]+$/.test(k) || isNaN(Number(v))) throw new Error('--set path=number: ' + kv); g.run(`CAMP.${k} = ${Number(v)}`); });

export function techsFor(level, override) {
  if (override && override !== true) return String(override).split(',').filter(Boolean);
  return JSON.parse(g.run(`JSON.stringify([1, 2].filter(n => n < ${level}).map(n => campTechChoices(n)[0]))`)); // the first tech each earlier level offers, as the address does
}
export function setPace(p) { g.run(`window.__PACE = ${typeof p === 'number' ? p : JSON.stringify(p)}`); } // the battle pace of the runs that follow (a test uses it; the CLI has --pace)
export const botGame = g; // the game the bots fly in (a script that wants to look inside a run)
export function run(level, seed, botName, skill, techs, maxSec = MAXSEC, mission = 0) {
  const B = BOTS[botName], sk = SKILLS[B.skill || skill]; // a bot may bring its own skill
  return JSON.parse(g.run(`JSON.stringify(__run1(${level}, ${seed}, ${JSON.stringify(techs)}, ${JSON.stringify(B)}, ${JSON.stringify(sk)}, ${maxSec}, ${mission | 0}))`));
}
const med = a => { const s = a.filter(x => x != null).sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const pct = (a, f) => Math.round(a.filter(f).length / Math.max(1, a.length) * 100);
export function summarise(rs) {
  const won = rs.filter(r => r.result === 'won'), lost = rs.filter(r => r.result === 'lost');
  const why = {}; lost.forEach(r => { why[r.why] = (why[r.why] || 0) + 1; });
  const sum = (key) => { const o = {}; rs.forEach(r => Object.entries(r[key] || {}).forEach(([k, v]) => { o[k] = (o[k] || 0) + v; })); Object.keys(o).forEach(k => { o[k] = Math.round(o[k] / rs.length); }); return o; };
  return { n: rs.length, won: pct(rs, r => r.result === 'won'), lost: pct(rs, r => r.result === 'lost'), timeout: pct(rs, r => r.result === 'timeout'), tWin: med(won.map(r => r.t)), tAll: med(rs.map(r => r.t)),
    hull: med(rs.map(r => r.hull)), taken: med(rs.map(r => Object.values(r.hitC || {}).reduce((a, b) => a + b, 0))), // taken: the damage the carrier was dealt in all (its shield, 150 from the ore card, takes it before the hull does, so hull is 600 until the shield is gone)
 minHull: med(rs.map(r => r.minHull)), earth: med(rs.map(r => r.earth)), kills: med(rs.map(r => r.kills)), shipsLost: med(rs.map(r => r.shipsLost)), mended: med(rs.map(r => r.mended)), delivered: med(rs.map(r => r.delivered)), allHome: pct(rs, r => r.convoyLost === 0 && r.result === 'won'), idle: med(rs.map(r => r.idle)),
    shotRuns: pct(rs, r => (r.cockDeaths || 0) > 0), // the share of the runs (percent) in which the flown fighter was shot down at least once (card space-game-chunk4-fighter-shot-down: the ace used to be shot down in none)
    gun: ['cockShots', 'cockHits', 'cockDmg', 'cockFire', 'cockSec'].reduce((o, k) => { o[k] = rs.reduce((a, r) => a + (r[k] || 0), 0); return o; }, {}), // the flown gun over all the seeds (card space-game-fly-fighter-aim-help): shots, hits, hit points taken off hostiles, seconds Space was held, seconds in the cockpit
    dmgShare: (() => { const m = med(rs.filter(r => r.alienDmg > 0).map(r => (r.cockDmg || 0) / r.alienDmg)); return m == null ? null : Math.round(m * 1000) / 10; })(), // the flown fighter's share of the damage dealt to hostiles, percent, median a run (rule 5: card space-game-b12-c11-12-sweep-rules): its hit points taken off them over everybody's; plain has none
    cockSec: med(rs.map(r => r.cockSec)), cockKills: med(rs.map(r => r.cockKills)), cockDeaths: Math.round(rs.reduce((a, r) => a + (r.cockDeaths || 0), 0) / Math.max(1, rs.length) * 100) / 100, awayTaken: med(rs.map(r => r.awayTaken)), convHurt: Math.round(med(rs.map(r => r.convHurt || 0)) * 100), cockHurt: Math.round(med(rs.map(r => r.cockHurt || 0)) * 100), cockBacks: Math.round(rs.reduce((a, r) => a + (r.cockBacks || 0), 0) / Math.max(1, rs.length) * 100) / 100, // hurt: the median share of ONE full hull of the flown fighter lost in a run, percent (it can pass 100: a hull mended or a second fighter); backs: the hand-backs for a low hull a run. The cockpit bots' columns (card space-game-fly-fighter-l3): seconds in the cockpit, its kills, its deaths a run, the cruiser's damage while he was away
    torp: ['launched', 'shot', 'hit'].reduce((o, k) => { o[k] = Math.round(rs.reduce((a, r) => a + ((r.torp && r.torp[k]) || 0), 0) / Math.max(1, rs.length) * 10) / 10; return o; }, {}), // the torpedoes a seed has, on average: launched, shot down, gone off on a ship
    why, hitC: sum('hitC'), drainE: sum('drainE'), waves: rs[0] && rs[0].waves };
}

if (process.argv[1] && process.argv[1].endsWith('campaign-bot.mjs') && !process.argv.includes('--cockpit')) {
  const botList = String(arg('bots', Object.keys(BOTS).join(','))).split(',');
  const out = {};
  const missionsOf = level => MISSION ? [Number(MISSION) - 1] : Array.from({ length: g.run(`campMissions(${level}).length`) }, (_, i) => i);
  const keys = [];
  for (const level of LEVELS) {
    const techs = techsFor(level, TECH);
    for (const m of missionsOf(level)) {
      const key = level + '.' + (m + 1); keys.push([key, level, m]); out[key] = {};
      for (const b of botList) {
        const rs = []; for (let seed = 1; seed <= SEEDS; seed++) rs.push(run(level, seed, b, SKILL, techs, MAXSEC, m));
        if (arg('runs', false)) rs.forEach(r => console.error(`run ${key} ${b} seed ${r.seed}: ${r.result} ${r.t}s delivered ${r.delivered} convoyLost ${r.convoyLost} (${r.convoyDead || '-'}) bonus ${r.bonus || '-'}`)); // --runs: one line per run on stderr (card space-game-13-all-haulers-savable: the haulers home, one by one)
        out[key][b] = summarise(rs);
      }
    }
  }
  if (process.argv.includes('--keys')) out.keys = { orders: Number(g.run('window.__KEYN | 0')) }; // how many orders went through the lists' keys
  if (arg('json', false)) console.log(JSON.stringify(out, null, 1));
  else for (const [key, level] of keys) {
    console.log(`\nLevel ${key} (mission ${key.split('.')[1]})  skill ${SKILL}  techs [${techsFor(level, TECH).join(',')}]  ${SEEDS} seeds`);
    console.log('bot       won%  lost%  t(win)  hull  taken  earth  kills  shipsLost  deliv  idle  lost because');
    for (const b of botList) { const s = out[key][b]; console.log(b.padEnd(9), String(s.won).padStart(4), String(s.lost).padStart(6), String(s.tWin == null ? '-' : s.tWin).padStart(7), String(s.hull).padStart(5), String(s.taken).padStart(6), String(s.earth == null ? '-' : s.earth).padStart(6), String(s.kills).padStart(6), String(s.shipsLost).padStart(10), String(s.delivered).padStart(6), String(s.idle).padStart(5), ' ' + JSON.stringify(s.why)); }
  }
}

// THE COCKPIT SWEEP AND ITS PASS RULE (card space-game-fly-fighter-l3; the rule is 2-GEN's proposal in the scope report of card space-game-fly-fighter-scope, for Troy to agree before anything is retuned)
//   node tools/campaign-bot.mjs --cockpit [--seeds 32] [--skills sharp,steady,rough] [--level 1] [--mission 2] [--set cockpit.damageK=2] [--json] [--save sweep.json]
//   For every mission and skill: plain, ace (hull x CAMP.cockpit.hpK, 2 to start), ace1 (hpK 1: the comparison column), sit (turrets 'auto') and sitoff (turrets 'off'), the same seeds, the same cruiser. THE RULE, per mission and skill:
//     1. ace is not faster than plain by more than 15 percent: its median win time is at least 85 percent of plain's;
//     2. ace does not take less cruiser damage than plain by more than 30 percent: its median is at least 70 percent of plain's;
//     3. sit (turrets auto), a pilot taken out of the wing who then does nothing, may cost a little but not much: where plain wins at least 90 percent of the seeds, sit wins at least plain's rate less 10 points (card space-game-b12-c11-12-sweep-rules, Troy, 27 Nov 2026: it was less 3 points, one seed in 32).
//     4. (a fight: plain's median kills at least 5) the flown fighter is really hit: it loses a median of at least 15 percent of a hull a run (card space-game-b10-c15-tune-11, Troy, 27 Nov 2026; it was "shot down in 5 to 50 percent of the runs", which a bot that hands the stick back under 30 percent cannot meet): never hit fails ("safe and changes little"), and so does shot down in more than half the runs (shredded);
//     5. (a fight) the flown fighter's share of the DAMAGE dealt to hostiles (its hit points taken off them over everybody's, median a run) is at least 15 percent (about a seventh): a fighter that does little fails (card space-game-b12-c11-12-sweep-rules, Troy, 27 Nov 2026: it counted the fighter's own kills, at least a quarter of plain's, but at sharp skill the turrets land the last hit on what the fighter started).
//   A rule's number is judged only where plain's own number is big enough to mean something (win time over 20 s, damage over 30): under that it is 'n/a' (no verdict), and the raw numbers stay in the table.
export const COCKPIT_RULE = { faster: 0.85, softer: 0.7, sitSlack: 10, sitFrom: 90, minTime: 20, minTaken: 30, minFight: 5, hurtMin: 15, shotMax: 50, dmgShare: 15 }; // (4 and 5, card space-game-chunk15-sweep-rule, brief 8 decision 12; rule 4 re-made by card space-game-b10-c15-tune-11, Troy, 27 Nov 2026: minFight is the kills of plain's run that make it a fight to speak of; hurtMin the median share of ONE full hull of the flown fighter lost in a run, percent; shotMax the share of runs, percent, in which it is shot down, above which it is shredded; sitSlack the points of win rate a hands-off run may be worse than plain's (was 3; card space-game-b12-c11-12-sweep-rules); dmgShare the share, percent, of all the damage dealt to hostiles that the flown fighter itself must deal (rule 5 counted a quarter of plain's KILLS until that card))
export function cockpitVerdict(p, a, s) { // p, a, s: the summaries of plain, ace and sit (turrets auto) for one mission at one skill (summarise's shape)
  const R = COCKPIT_RULE, v = { time: 'n/a', taken: 'n/a', sit: 'n/a', hurt: 'n/a', dmg: 'n/a' };
  if (p.tWin != null && a.tWin != null && p.tWin >= R.minTime) v.time = a.tWin >= p.tWin * R.faster ? 'pass' : 'FAIL';
  if (p.taken != null && a.taken != null && p.taken >= R.minTaken) v.taken = a.taken >= p.taken * R.softer ? 'pass' : 'FAIL';
  if (p.won >= R.sitFrom) v.sit = s.won >= p.won - R.sitSlack ? 'pass' : 'FAIL';
  if (p.kills != null && p.kills >= R.minFight && a.cockHurt != null) v.hurt = a.cockHurt >= R.hurtMin && !(a.shotRuns > R.shotMax) ? 'pass' : 'FAIL'; // 4. in a fight, the flown fighter is really hit: it loses a median of at least 15 percent of a hull a run (it was "shot down in 5 to 50 percent of the runs" until card space-game-b10-c15-tune-11: a bot that hands the stick back under 30 percent cannot be shot down by shots of 2 percent); "safe and changes little" fails, and so does a fighter shot down in more than half the runs (shredded)
  if (p.kills != null && p.kills >= R.minFight && a.dmgShare != null) v.dmg = a.dmgShare >= R.dmgShare ? 'pass' : 'FAIL'; // 5. and the fighter itself deals a fair share of the damage (median a run, at least 15 percent of what is dealt to hostiles): a fighter that does little fails. (A fight is still plain's median kills of at least 5; the kills themselves are no longer counted: the turrets land the last hit)
  v.ok = !Object.values(v).includes('FAIL'); return v;
}
if (process.argv[1] && process.argv[1].endsWith('campaign-bot.mjs') && process.argv.includes('--cockpit')) {
  if (JSON.parse(g.run("typeof campCockpitTake === 'function'")) !== true) { console.log('src/campcockpit.js is not in this game yet (card space-game-fly-fighter-l1): nothing to sweep'); process.exit(2); }
  const skills = String(arg('skills', 'sharp,steady,rough')).split(','), botList = String(arg('cbots', 'plain,ace,ace1,sit,sitoff')).split(','); // --cbots plain,ace: only those (the rule then has nothing to judge; the numbers do)
  const out = {}, tab = [];
  const missionsOf = level => MISSION ? [Number(MISSION) - 1] : Array.from({ length: g.run(`campMissions(${level}).length`) }, (_, i) => i);
  for (const level of LEVELS) {
    const techs = techsFor(level, TECH);
    for (const m of missionsOf(level)) for (const skill of skills) {
      const key = level + '.' + (m + 1) + ' ' + skill, S = {}; out[key] = S;
      for (const b of botList) { const rs = []; for (let seed = 1; seed <= SEEDS; seed++) rs.push(run(level, seed, b, skill, techs, MAXSEC, m)); S[b] = summarise(rs); }
      S.verdict = S.plain && S.ace && S.sit ? cockpitVerdict(S.plain, S.ace, S.sit) : { time: 'n/a', taken: 'n/a', sit: 'n/a', ok: true }; tab.push(key);
    }
  }
  if (arg('save', false) && arg('save') !== true) writeFileSync(String(arg('save')), JSON.stringify(out, null, 1)); // --save FILE: the numbers too, whatever is printed
  if (arg('json', false)) console.log(JSON.stringify(out, null, 1));
  else {
    console.log(`\nTHE COCKPIT SWEEP  ${SEEDS} seeds a mission, pace ${PACE}, cockpit table ${g.run('JSON.stringify({ hpK: CAMP.cockpit.hpK, damageK: CAMP.cockpit.damageK, rateK: CAMP.cockpit.rateK, turrets: CAMP.cockpit.turrets })')}${SETS.length ? ', set ' + SETS.join(' ') : ''}`);
    console.log('mission skill    bot     won%  t(win)  taken  cruiser-away  cockpit-s  kills  dmg%  deaths  shot%  hurt%  backs  conv%   rule: time  taken  sit  hurt  dmg');
    for (const key of tab) {
      const S = out[key], [mk, skill] = key.split(' ');
      botList.forEach((b, i) => { const x = S[b], c = b === 'plain' ? ['-', '-', '-', '-', '-', '-', '-', '-'] : [x.awayTaken, x.cockSec, x.cockKills, x.dmgShare == null ? '-' : x.dmgShare, x.cockDeaths, x.shotRuns, x.cockHurt, x.cockBacks], v = S.verdict;
        console.log((i ? '' : mk).padEnd(8), (i ? '' : skill).padEnd(8), b.padEnd(7), String(x.won).padStart(4), String(x.tWin == null ? '-' : x.tWin).padStart(7), String(x.taken).padStart(6), String(c[0]).padStart(13), String(c[1]).padStart(10), String(c[2]).padStart(6), String(c[3]).padStart(6), String(c[4]).padStart(7), String(c[5]).padStart(6), String(c[6]).padStart(6), String(c[7]).padStart(6), String(x.convHurt).padStart(6), b === 'ace' ? `   ${v.time.padStart(10)} ${v.taken.padStart(6)} ${v.sit.padStart(4)} ${String(v.hurt).padStart(5)} ${String(v.dmg).padStart(5)}   ${v.ok ? 'PASS' : 'FAIL'}` : ''); });
    }
    const fails = tab.filter(k => !out[k].verdict.ok);
    console.log(`\n${tab.length - fails.length} of ${tab.length} mission-skills pass the rule${fails.length ? '; fail: ' + fails.join(', ') : ''}`);
  }
}

// smoke: the Campaign's ship systems: power to weapons, shields and engines, 6 pips, 2/2/2 is the base setting; the direct keys J K L ; and the POWER list (I) give the same orders (plain Node, no Chrome)
// Card space-game-campaign-systems (Troy: manage my ship's resources and systems, energy, shields, engine, like X-Wing; the design lines are docs/CAMPAIGN.md "Ship systems"). The whole thing is plain numbers in
// src/campaign.js, one table CAMP.power by pips 0 to 4. Checks:
//   A  the table: every effect is 1 at 2 pips (the shield mends at its base rate there: card space-game-shield-auto), runs the right way with the pips, and zero pips is weak but never dead
//   B  the default is today's numbers EXACTLY: a seeded battle of level 1 and one of level 3 (eight aliens put on the carrier, the turrets, the wing, a missile, the blink), flown by the same script, ends in the very state it ended in before this card (pinned below, taken from main b721fe3: the missions, the hub and the outposts merged);
//      an explicit 2/2/2 is the same battle
//   C  the budget rule: 6 pips, 0 to 4 each, one moves at a time from the system with the most (or a chosen one); balance is 2/2/2
//   D  each effect: the turrets' interval and the missile reload (weapons); the shield cap and regeneration (shields); speed, thrust, turn, the Fast burn and the blink's recharge (engines)
//   E  emergency shields: 1/4/1 for 10 s, then back; locked meanwhile; ready again 40 s after it started
//   F  the save: the setting is in the Campaign's save and is how a level starts; a bad one is the default; the emergency is never saved
//   G  the words: the orders say short lines, the strip and the voice understand "power to shields", "balance power" and "emergency shields"; low shields and low engines are said, and the radio calls them
//   J  the keys (cards one-list-keys and list-shortcuts): J K L ; are direct keys of CAMP_KEYS, the same with a list open or not; the power is a list as well (I opens POWER directly; it is a part of the ship list, P): its rows shields,
//      engines, weapons and balance give the same orders as the keys and leave the list open, and its fifth row is Emergency shields (I, Down to it, Enter), which closes it
//   H  the wiring: the scene saves the setting and draws the three power bars (beside the gauges: src/camphud.js)
// Run: node tests/campsystems.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g, 1); // the old Level 1, the belt, as level 1: this suite was written for it and pins its missions (card space-game-l1-rim-missions; the rim run is tests/camprim.mjs)
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.message); } };
const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const NEW = (pips, extra) => `(window.C = campNew(1, ${extra || '[]'}, { seed: 3${pips ? ', power: ' + JSON.stringify(pips) : ''} }), window.C)`;
g.run(`window.__go = (sec, fn) => { const n = Math.round(sec * 30); for (let i = 0; i < n && !C.result; i++) { if (fn) fn(i); campStep(C, 1 / 30); C.events.length = 0; } };`);

sec('A', () => {
  const P = J('CAMP.power');
  check('A  CAMP.power is the one table: a budget of 6 pips, 4 at most in a system, 2 / 2 / 2 to start', P && P.budget === 6 && P.max === 4 && JSON.stringify(P.start) === '[2,2,2]');
  const rows = { delay: P.weapons.delay, reload: P.weapons.reload, cap: P.shields.cap, regen: P.shields.regen, speed: P.engines.speed, accel: P.engines.accel, turn: P.engines.turn, blink: P.engines.blink };
  check('A  every effect has a value for 0, 1, 2, 3 and 4 pips', Object.values(rows).every(r => Array.isArray(r) && r.length === 5 && r.every(Number.isFinite)));
  check('A  at 2 pips every effect is a multiplier of 1, and the shield mends at a slow base rate (none at 0 pips: card space-game-shield-auto)', ['delay', 'reload', 'cap', 'speed', 'accel', 'turn', 'blink'].every(k => rows[k][2] === 1) && rows.regen[0] === 0 && rows.regen[2] > 0 && rows.regen[2] <= 4);
  const inc = a => a.every((v, i) => i === 0 || v >= a[i - 1]), dec = a => a.every((v, i) => i === 0 || v <= a[i - 1]);
  check('A  more pips is better: shorter intervals, reloads and recharges, a bigger cap, more regeneration, speed, thrust and turn', dec(rows.delay) && dec(rows.reload) && dec(rows.blink) && inc(rows.cap) && inc(rows.regen) && inc(rows.speed) && inc(rows.accel) && inc(rows.turn));
  check('A  and strictly different at 0, 1, 3 and 4 pips from 2 (a pip always matters), the shields\' regeneration too: none at 0, slow at 2, fast at 4', ['delay', 'reload', 'cap', 'speed', 'accel', 'turn', 'blink'].every(k => [0, 1, 3, 4].every(i => rows[k][i] !== 1)) && [0, 1, 2, 3, 4].every(i => i === 0 || rows.regen[i] > rows.regen[i - 1]) && rows.regen[4] >= 3 * rows.regen[2]);
  check('A  zero pips is weak, never dead: the turrets still fire, the shield is not nothing, the carrier still moves (every factor is above 0 and a time is at most 2 times)', rows.delay[0] <= 2 && rows.reload[0] <= 2 && rows.blink[0] <= 2 && rows.cap[0] >= 0.25 && rows.speed[0] >= 0.5 && rows.accel[0] >= 0.5 && rows.turn[0] >= 0.5);
  check('A  the emergency is data too: 4 pips to shields, 10 s, a 40 s cooldown', P.emergency.shields === 4 && P.emergency.ms === 10000 && P.emergency.cooldown === 40000);
});

sec('B', () => {
  // re-pinned by card space-game-fighter-flight (22 Nov 2026): the guarding wing flies in a formation beside the cruiser, not on a circle round it, so this seeded fight falls differently: level 1 ends with 52 turret shots where it had 26, level 3 with 137 where it had 40 and one ship more alive (a gunship that stays out of the guard's 700 px is left to the turrets for a minute; the wing strafes the drones, the gunships and the others in runs now, card space-game-fighter-flight). Nothing else moved (hull, position, kills, missiles). Earlier: re-pinned by card space-game-shield-auto (21 Nov 2026): the shield mends by itself at 2 pips now, so it ends whole (150) where it ended at 136 and 113.6; nothing else in the fight moved (hull, position, kills, missiles, turrets are the pins of before). Earlier, by card space-game-fighter-dogfights: the wing's fighters and the raiders now dogfight, so this seeded fight ends in another state than main b721fe3's. What the pin proves is unchanged: an explicit default is the same battle, and nothing else moves it. Level 3 is taken again by card space-game-fighter-repair (a fighter under 30 percent hull lands and is mended, so the wing kills the eight sooner: 40 turret shots where there were 98); level 1 is unchanged.
  const GOLD = {"l1":{"t":120000,"x":-9809.020067,"y":2569.733087,"vx":0.014763,"vy":0.012298,"rot":3.292307,"hp":600,"shield":150,"kills":8,"missiles":5,"reloadAt":134967,"shots":52,"blinkAt":50033.333333334114,"aliens":0,"ships":9,"turretAt":[120390.166,120478.758,120566.542,120655.123,120040.933,120131.702,120228.194,120303.698]},"l3":{"t":120000,"x":-16939.020067,"y":6039.733087,"vx":0.014763,"vy":0.012298,"rot":3.292307,"hp":600,"shield":150,"kills":8,"missiles":5,"reloadAt":134967,"shots":137,"blinkAt":50033.333333334114,"aliens":0,"ships":6,"turretAt":[120390.166,120478.758,120566.542,120655.123,120040.933,120131.702,120228.194,120303.698]}};
  const run = (lvl, power) => { const opt = power ? ', power: ' + JSON.stringify(power) : ''; return J(`(() => {
    const C = campNew(${lvl}, ['blink'], { seed: 7${opt} }); let shots = 0;
    for (let i = 0; i < 30 * 120 && !C.result; i++) {
      const s = i / 30;
      C.input.thrust = (s % 20 < 12) ? 1 : 0; C.input.turn = Math.sin(s / 3) * 0.6; C.input.fire = s > 8; C.input.brake = (s % 20 > 17);
      if (i === 10) { for (let k = 0; k < 8; k++) { const ang = k / 8 * 6.283, u = campSpawn(C, ['raider', 'drone', 'gunship', 'raider'][k % 4], C.carrier.x + Math.cos(ang) * 700, C.carrier.y + Math.sin(ang) * 700); if (u) u.goal = 'carrier'; } } // a fight whatever the level's own waves wait for
      if (i === 30) campOrder(C, 'launch', '', 'key'); if (i === 60 * 30 / 2) campOrder(C, 'attack', '', 'key'); if (i % 600 === 599) campFire(C, campNearest(campAliens(C), C.carrier)); if (i === 1500) C.input.blink = true;
      campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'turret') shots++; }); C.events.length = 0;
    }
    const c = C.carrier; return { t: Math.round(C.t), x: +c.x.toFixed(6), y: +c.y.toFixed(6), vx: +c.vx.toFixed(6), vy: +c.vy.toFixed(6), rot: +c.rot.toFixed(6), hp: +c.hp.toFixed(4), shield: +C.shield.toFixed(4), kills: C.kills, missiles: C.missiles, reloadAt: Math.round(C.reloadAt), shots, blinkAt: C.blinkAt, aliens: campAliens(C).length, ships: C.ships.length, turretAt: C.turrets.map(t => +t.at.toFixed(3)) };
  })()`); };
  [1, 3].forEach(l => {
    const a = run(l), b = run(l, [2, 2, 2]);
    check(`B  level ${l}: a battle of 120 s at the default ends in the very state it ended in before this card (carrier, shield, kills, missiles, turrets)`, JSON.stringify(a) === JSON.stringify(GOLD['l' + l]), JSON.stringify(a));
    check(`B  level ${l}: an explicit 2 / 2 / 2 is the same battle`, JSON.stringify(b) === JSON.stringify(a));
  });
  check('B  a different setting is a different battle (the table is read: 4 weapons, 1 shields, 1 engines is not the default)', JSON.stringify(run(1, [4, 1, 1])) !== JSON.stringify(GOLD.l1));
});

sec('C', () => {
  g.run(NEW());
  const p = () => J('C.power.p'), sum = () => p().reduce((a, b) => a + b, 0);
  check('C  a new battle starts at 2 / 2 / 2 (6 pips)', JSON.stringify(p()) === '[2,2,2]' && sum() === 6);
  let r = J("campOrder(C, 'power', 'shields', 'key')");
  check('C  "power to shields" takes a pip from the system with the most; a tie goes to weapons first (3 / ... : weapons 1)', r.ok === true && JSON.stringify(p()) === '[1,3,2]', JSON.stringify([r, p()]));
  r = J("campOrder(C, 'power', 'weapons', 'key')");
  check('C  then "power to weapons" takes from the most (shields 3): back to 2 / 2 / 2', r.ok === true && JSON.stringify(p()) === '[2,2,2]', JSON.stringify(p()));
  r = J("campOrder(C, 'power', 'engines:weapons', 'key')");
  check('C  a chosen source: "engines from weapons" takes it from weapons', r.ok === true && JSON.stringify(p()) === '[1,2,3]', JSON.stringify(p()));
  g.run("campOrder(C, 'power', 'shields', 'key'); campOrder(C, 'power', 'shields', 'key'); campOrder(C, 'power', 'shields', 'key')");
  r = J("campOrder(C, 'power', 'shields', 'key')");
  check('C  a system at 4 refuses with a plain line and nothing moves', r.ok === false && r.code === 'powermax' && J('Math.max(...C.power.p)') === 4 && sum() === 6, JSON.stringify([r, p()]));
  g.run("campOrder(C, 'balance', '', 'key')");
  check('C  balance is 2 / 2 / 2 at once', JSON.stringify(p()) === '[2,2,2]');
  g.run("campOrder(C, 'power', 'weapons:shields', 'key'); campOrder(C, 'power', 'weapons:shields', 'key')"); // weapons 4, shields 0
  r = J("campOrder(C, 'power', 'engines:shields', 'key')");
  check('C  taking from a system with nothing left refuses ("no power left to take")', r.ok === false && r.code === 'powernone' && sum() === 6, JSON.stringify([r, p()]));
  const bad = J(`(() => { let worst = 0; for (let i = 0; i < 600; i++) { const names = ['weapons', 'shields', 'engines'], a = names[(i * 7) % 3], b = names[(i * 5 + 1) % 3]; campOrder(C, 'power', (i % 4 === 0 ? a + ':' + b : a), 'key'); if (i % 97 === 0) campOrder(C, 'balance', '', 'key'); const s = C.power.p.reduce((x, y) => x + y, 0); if (s !== 6 || C.power.p.some(v => v < 0 || v > 4 || v !== Math.floor(v))) worst++; } return worst; })()`);
  check('C  six hundred shifts in every order: always 6 pips in all, never below 0 or above 4, always whole', bad === 0, bad);
  check('C  an unknown system is refused with a plain line', J("campOrder(C, 'power', 'lasers', 'key')").ok === false && J("campOrder(C, 'power', '', 'key')").ok === false);
  check('C  a dry check (what the strip does first) says what it would do and changes nothing', (() => { g.run("campOrder(C, 'balance', '', 'key')"); const r2 = J("campCheck(C, 'power', 'shields')"); return r2.ok === true && JSON.stringify(p()) === '[2,2,2]'; })());
});

sec('D', () => {
  const D = J('CAMP.power');
  const mk = (w, s, e, techs) => g.run(NEW([w, s, e], techs));
  // WEAPONS: the turrets' interval and the missile reload (the others: shields 2, engines 4 - w, so the budget is 6)
  [0, 1, 2, 3, 4].forEach(w => {
    mk(w, 2, 4 - w); g.run('__go(20)');
    const slot = J('C.turrets[0].slot'), base = J('C.turrets[0].base');
    check(`D  weapons at ${w} pips: a turret's slots are ${700 * D.weapons.delay[w]} ms apart (${w === 2 ? "today's 700" : D.weapons.delay[w] + ' times today\'s'}), ${slot} slots in 20 s`, slot > 5 && close(base, slot * 700 * D.weapons.delay[w], 1e-6), JSON.stringify([slot, base]));
  });
  [0, 1, 2, 3, 4].forEach(w => {
    mk(w, 2, 4 - w); g.run('C.missiles = 3; C.reloadAt = 0; __go(0.034)');
    const at = J('C.reloadAt'), t0 = J('C.t');
    check(`D  weapons at ${w} pips: a missile is back after ${15000 * D.weapons.reload[w] / 1000} s`, at > 0 && Math.abs((at - t0) - 15000 * D.weapons.reload[w]) <= 1, JSON.stringify([at, t0]));
  });
  // SHIELDS: the cap and the regeneration (weapons 2, engines 4 - s)
  [0, 1, 2, 3, 4].forEach(sp => { mk(2, sp, 4 - sp); check(`D  shields at ${sp} pips: the cap is ${150 * D.shields.cap[sp]} points`, close(J('campShieldMax(C)'), 150 * D.shields.cap[sp])); });
  mk(2, 2, 2); g.run("C.shield = 150; campOrder(C, 'power', 'engines:shields', 'key'); __go(0.2)");
  check('D  a smaller cap takes the shield down to it (150 down to 112.5 at 1 pip)', close(J('C.shield'), 112.5) && JSON.stringify(J('C.power.p')) === '[2,1,3]', JSON.stringify([J('C.shield'), J('C.power.p')]));
  g.run("campOrder(C, 'power', 'shields:engines', 'key'); campOrder(C, 'power', 'shields:engines', 'key'); __go(0.2)");
  check('D  a bigger cap does not fill it by itself (112.5 stays, then it mends from there)', J('C.shield') >= 112.5 && J('C.shield') < 150 && close(J('campShieldMax(C)'), 187.5), J('C.shield'));
  [2, 3, 4].forEach(sp => {
    mk(sp === 4 ? 1 : 2, sp, sp === 4 ? 1 : 4 - sp + 0); if (sp === 3) mk(1, 3, 2);
    g.run('C.shield = 50; C.shieldHitAt = C.t; __go(2.9)');
    const held = J('C.shield'); g.run('__go(10.2)');
    const gained = J('C.shield') - held, want = D.shields.regen[sp] * 10.1;
    check(`D  shields at ${sp} pips: no mending within 3 s of a hit, then ${D.shields.regen[sp]} points a second (gained ${gained.toFixed(1)} in 10 s)`, close(held, 50, 0.01) && Math.abs(gained - want) <= D.shields.regen[sp] * 0.3 + 0.01, JSON.stringify([held, gained, want]));
  });
  mk(2, 2, 2); g.run('C.shield = 10; C.shieldHitAt = -1e9; __go(60)');
  check('D  at 2 pips the shield mends by itself, at the base rate and to its cap (10 in 60 s: 3 a second takes it to 150)', close(J('C.shield'), 150, 0.01), J('C.shield'));
  mk(2, 0, 4); g.run('C.shield = 10; C.shieldHitAt = -1e9; __go(60)');
  check('D  at 0 pips it does not mend at all (the shield\'s cap is 75 and it stays at 10)', close(J('C.shield'), 10), J('C.shield'));
  mk(1, 4, 1); g.run('C.shield = 140; C.shieldHitAt = -1e9; __go(60)');
  check('D  mending stops at the cap (4 pips: 225)', close(J('C.shield'), 225, 0.01), J('C.shield'));
  mk(2, 3, 1); g.run('C.shield = 0; C.ore = 200');
  const cost0 = J('C.ore'), rr = J("campOrder(C, 'recharge', '', 'key')");
  check('D  the old ore recharge is gone: the order only says the shield mends by itself, and takes no ore and changes no shield', rr.ok === false && rr.code === 'shieldauto' && rr.say === 'Shields mend on their own. More pips on shields mend faster.' && close(J('C.shield'), 0) && J('C.ore') === cost0 && J('C.orders.recharge') === null, JSON.stringify([rr, J('C.shield'), J('C.ore')]));
  // ENGINES (weapons 4 - e, shields 2)
  const speedAt = (e, nav) => { mk(4 - e, 2, e); g.run(`${nav ? 'C.nav = { on: true, fast: true, burn: 2 };' : ''} C.input.thrust = 1; for (let i = 0; i < 900; i++) campCarrier(C, 1 / 30)`); return J('Math.hypot(C.carrier.vx, C.carrier.vy)'); };
  [0, 1, 2, 3, 4].forEach(e => { const a = speedAt(e, false), b = speedAt(e, true); check(`D  engines at ${e} pips: top speed ${210 * D.engines.speed[e]} px/s, and the Fast burn twice that`, close(a, 210 * D.engines.speed[e], 0.01) && close(b, 420 * D.engines.speed[e], 0.05), a + ' ' + b); });
  const kick = e => { mk(4 - e, 2, e); g.run('C.input.thrust = 1; for (let i = 0; i < 15; i++) campCarrier(C, 1 / 30)'); return J('Math.hypot(C.carrier.vx, C.carrier.vy)'); };
  const base = kick(2);
  [0, 1, 3, 4].forEach(e => check(`D  engines at ${e} pips: thrust is ${D.engines.accel[e]} times today's`, close(kick(e) / base, D.engines.accel[e], 1e-6), kick(e) / base));
  const turned = e => { mk(4 - e, 2, e); g.run('C.carrier.rot = 0; C.input.turn = 1; for (let i = 0; i < 30; i++) campCarrier(C, 1 / 30)'); return J('C.carrier.rot'); };
  [0, 1, 3, 4].forEach(e => check(`D  engines at ${e} pips: the nose turns ${D.engines.turn[e]} times as fast`, close(turned(e) / turned(2), D.engines.turn[e], 1e-9)));
  [0, 1, 2, 3, 4].forEach(e => {
    mk(4 - e, 2, e, "['blink']"); g.run('C.input.blink = true; campCarrier(C, 1 / 30)');
    const at = J('C.blinkAt'), cd = 20000 * D.engines.blink[e];
    g.run(`C.t = ${at} + ${cd} - 100; C.input.blink = true; campCarrier(C, 1 / 30)`); const early = J('C.blinkAt') === at;
    g.run(`C.t = ${at} + ${cd} + 100; C.input.blink = true; campCarrier(C, 1 / 30)`); const late = J('C.blinkAt') !== at;
    check(`D  engines at ${e} pips: the warp blink is ready again after ${cd / 1000} s (not before, then at once)`, early && late);
  });
  mk(3, 2, 1); check('D  the blink\'s recharge is one function the HUD reads too (campBlinkCooldown: 25 s at 1 pip)', close(J('campBlinkCooldown(C)'), 25000));
  mk(2, 2, 2); const eta2 = J('campNavEta(C, 6000, false)'); mk(0, 2, 4);
  check('D  the autopilot and the map\'s flight time read the engines (campNavEta is shorter at 4 pips)', J('campNavEta(C, 6000, false)') < eta2, eta2);
});

sec('E', () => {
  g.run(NEW([3, 2, 1])); g.run('__go(30)');
  const t0 = J('C.t'), r = J("campOrder(C, 'emergency', '', 'key')");
  check('E  emergency shields: all four pips to shields (weapons 1, engines 1), the setting kept', r.ok === true && JSON.stringify(J('C.power.p')) === '[1,4,1]' && JSON.stringify(J('C.power.base')) === '[3,2,1]', JSON.stringify([r, J('C.power')]));
  const locked = J("campOrder(C, 'power', 'weapons', 'key')");
  check('E  while it runs the pips are locked: a shift is refused with a plain line', locked.ok === false && locked.code === 'locked' && JSON.stringify(J('C.power.p')) === '[1,4,1]', JSON.stringify(locked));
  g.run('__go(9.8)');
  check('E  it is still on at 9.8 s', JSON.stringify(J('C.power.p')) === '[1,4,1]');
  g.run('__go(0.5)');
  check('E  at 10 s it is over: back to what it was (3 / 2 / 1)', JSON.stringify(J('C.power.p')) === '[3,2,1]');
  const cool = J("campOrder(C, 'emergency', '', 'key')");
  check('E  a second one is refused while it cools down (40 s after the first started) and says how long', cool.ok === false && cool.code === 'cooling' && /\d/.test(cool.say), JSON.stringify(cool));
  g.run('__go(29)');
  check('E  at 39.3 s since it started it is still cooling', J("campOrder(C, 'emergency', '', 'key')").ok === false);
  g.run('__go(1.2)');
  check('E  at 40.5 s it is ready again, and it can be pressed and works', J("campOrder(C, 'emergency', '', 'key')").ok === true && JSON.stringify(J('C.power.p')) === '[1,4,1]');
  g.run('campOrder(C, "balance", "", "key")');
  check('E  balance is refused while it runs', J('campOrder(C, "balance", "", "key")').ok === false);
  g.run(NEW([4, 1, 1])); g.run('C.power.base = [4,1,1]; campOrder(C, "emergency", "", "key"); __go(11)');
  check('E  from 4 / 1 / 1 it goes to 1 / 4 / 1 and comes back to 4 / 1 / 1', JSON.stringify(J('C.power.p')) === '[4,1,1]');
  check('E  the dry check says whether it is ready and changes nothing', (g.run(NEW([2, 2, 2])), J("campCheck(C, 'emergency', '')").ok === true && JSON.stringify(J('C.power.p')) === '[2,2,2]'));
  check('E  a new battle is never in an emergency, whatever the last one was', (g.run(NEW([2, 2, 2])), J('C.power.until || 0') === 0 && J('C.power.at') <= -1e8));
  const cdp = J('CAMP.power.emergency'); check('E  the figures are the table\'s', cdp.cooldown === 40000 && cdp.ms === 10000);
});

sec('F', () => {
  g.run("localStorage.removeItem('longhaul.campaign.power')");
  check('F  with nothing saved the setting is 2 / 2 / 2', JSON.stringify(J('campPowerLoad()')) === '[2,2,2]');
  g.run("campPowerSave([3, 2, 1])");
  check('F  the setting is saved (in this browser, under its own key beside the campaign\'s) and read back', JSON.stringify(J('campPowerLoad()')) === '[3,2,1]' && store.get('longhaul.campaign.power') === '[3,2,1]');
  [[5, 1, 0], [4, 4, -2], [2, 2, 1], [1, 1, 1], '3,2,1', null, [2, 2], [2.5, 2, 1.5], ['a', 2, 4], [7, 0, -1], {}].forEach(b => {
    store.set('longhaul.campaign.power', JSON.stringify(b)); g.run('0');
    check(`F  a bad setting ${JSON.stringify(b)} is 2 / 2 / 2`, JSON.stringify(J('campPowerLoad()')) === '[2,2,2]');
  });
  store.set('longhaul.campaign.power', '{not json'); check('F  a broken save is 2 / 2 / 2 and does not throw', JSON.stringify(J('campPowerLoad()')) === '[2,2,2]');
  g.run("campPowerSave([3, 2, 1]); campPowerSave([9, 9, 9]); campPowerSave('x')");
  check('F  a bad setting is never saved over a good one', JSON.stringify(J('campPowerLoad()')) === '[3,2,1]');
  check('F  the campaign\'s own progress save is untouched (no power in it: a save from before this card still loads)', !('power' in J('campProgressLoad()')));
  check('F  a battle starts at the setting it is given (opts.power), and at 2 / 2 / 2 when that is not one', JSON.stringify((g.run(NEW([1, 2, 3])), J('C.power.p'))) === '[1,2,3]' && JSON.stringify((g.run(NEW([9, 9, 9])), J('C.power.p'))) === '[2,2,2]' && JSON.stringify((g.run(NEW([1, 2, 3])), J('C.power.base'))) === '[1,2,3]');
  check('F  and it starts with a full shield for that setting (225 at 4 pips, 75 at 0)', (g.run(NEW([1, 4, 1])), close(J('C.shield'), 225)) && (g.run(NEW([3, 0, 3])), close(J('C.shield'), 75)) && (g.run(NEW([2, 2, 2])), close(J('C.shield'), 150)));
  g.run(NEW([3, 2, 1])); g.run("__go(1); campOrder(C, 'emergency', '', 'key'); __go(2)");
  check('F  the emergency is never the setting: while it runs the setting (base) is still 3 / 2 / 1, and that is what the scene saves', JSON.stringify(J('C.power.base')) === '[3,2,1]' && JSON.stringify(J('C.power.p')) === '[1,4,1]');
});

sec('G', () => {
  g.run(NEW([2, 2, 2]));
  const say = [['power', 'weapons'], ['power', 'shields'], ['power', 'engines'], ['balance', ''], ['emergency', '']].map(([a, b]) => { g.run("campOrder(C, 'balance', '', 'key'); C.power.until = 0; C.power.at = -1e9"); const r = J(`campOrder(C, ${JSON.stringify(a)}, ${JSON.stringify(b)}, 'key')`); return r.say; });
  check('G  each order answers in a short line (12 words or fewer)', say.every(t => t && words(t) <= 12), JSON.stringify(say));
  check('G  the lines are: "Power to weapons.", "Power to shields.", "Power to engines.", "Power balanced.", "Emergency shields!"', JSON.stringify(say) === JSON.stringify(['Power to weapons.', 'Power to shields.', 'Power to engines.', 'Power balanced.', 'Emergency shields!']), JSON.stringify(say));
  const file = read('content/text/campaign-power.md');
  const rows = file.split('\n').map(l => /^\|\s*([\w.]+)\s*\|\s*(.*?)\s*\|\s*$/.exec(l)).filter(m => m && m[1] !== 'key' && !/^-+$/.test(m[1])).map(m => [m[1], m[2]]);
  check('G  the words are in content/text/campaign-power.md, a file of their own (ui.md is full), equal to the code table, 12 words or fewer', rows.length >= 14 && rows.every(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) === t && words(t) <= 12), rows.length);
  const intent = t => J(`campIntent(${JSON.stringify(t)})`);
  check('G  the strip and the voice: "power to shields", "more power to the engines", "power to weapons from engines"', JSON.stringify(intent('power to shields')) === '{"act":"fleet_power","arg":"shields"}' && JSON.stringify(intent('more power to the engines')) === '{"act":"fleet_power","arg":"engines"}' && JSON.stringify(intent('power to weapons from engines')) === '{"act":"fleet_power","arg":"weapons:engines"}', JSON.stringify([intent('power to shields'), intent('more power to the engines')]));
  check('G  "balance power" and "emergency shields" are acts of their own', JSON.stringify(intent('balance power')) === '{"act":"fleet_balance","arg":""}' && JSON.stringify(intent('emergency shields')) === '{"act":"fleet_emergency","arg":""}' && JSON.stringify(intent('balance the power')) === '{"act":"fleet_balance","arg":""}', JSON.stringify([intent('balance power'), intent('emergency shields')]));
  check('G  "recharge the shields" is not the power\'s: it still reaches the old recharge order (fleet_recharge), which now only says the shield mends by itself', JSON.stringify(intent('recharge the shields')).includes('fleet_recharge') && JSON.stringify(intent('power up the shields')).includes('fleet_recharge'));
  const sc = read('src/shipcomputer.js');
  check('G  the computer\'s closed list names the three acts, and it runs them (scFleet)', /fleet_power/.test(sc) && /fleet_balance/.test(sc) && /fleet_emergency/.test(sc) && /fleet_power: \(s, arg\) => scFleet\(s, 'power', arg\)/.test(sc) && /fleet_emergency: \(s, arg\) => scFleet\(s, 'emergency', arg\)/.test(sc));
  // low shields, low engines
  g.run(NEW([2, 2, 2])); g.run('C.shield = 60; C.events.length = 0; __go(0.1)');
  g.run(NEW([2, 2, 2])); g.run('C.shield = 40; window.__ev = []; for (let i = 0; i < 6; i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; }');
  check('G  shields under 30 percent of the cap: the computer says so once ("Shields are low, pilot.")', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.shieldlow').length") === 1 && J('uiText("camp.say.shieldlow")') === 'Shields are low, pilot.');
  g.run('window.__ev.length = 0; C.shield = 100; for (let i = 0; i < 3; i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; } C.shield = 30; for (let i = 0; i < 3; i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; }');
  check('G  it says it again only after the shield has been up (over 60 percent) and gone low again', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.shieldlow').length") === 1);
  g.run(NEW([2, 2, 2])); g.run("window.__ev = []; campOrder(C, 'power', 'weapons:engines', 'key'); campOrder(C, 'power', 'weapons:engines', 'key'); for (let i = 0; i < 4; i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; }");
  check('G  engines at 0 pips: the computer says so once ("Engines are at minimum power.")', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.enginelow').length") === 1 && JSON.stringify(J('C.power.p')) === '[4,2,0]', JSON.stringify(J('C.power.p')));
  const ch = J('[CHATTER.says["camp.say.shieldlow"], CHATTER.says["camp.say.enginelow"]]');
  check('G  the wing\'s radio calls both (a "shields" and an "engines" call, with lines of their own)', JSON.stringify(ch) === '["shields","engines"]' && ['shields', 'engines'].every(e => J(`!!CHATTER.events.${e}`) && J(`uiText('camp.chat.${e}.1')`) !== `camp.chat.${e}.1`));
});

sec('J', () => {
  const T = J("CAMP_PANELS.panels.find(p => p.id === 'power')"), PK = J("['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id])");
  check('J  the power is four direct keys (card one-list-keys; there is no SYSTEMS panel): shields J, engines K, weapons L, balance ;, each with its system, and the gauges read the same keys (CAMP_GAUGE.keys); and it is a list again (card list-shortcuts): POWER, the key I, a part of the ship list, whose first four rows are the same four orders in the same order, each left open after it (`stay`); no other list has a row that gives the power or the balance order', PK.map(k => k.k).join('') === 'JKL;' && PK.map(k => k.codes.join('+') + ':' + k.sys).join() === 'KeyJ:shields,KeyK:engines,KeyL:weapons,Semicolon:balance' && !J("CAMP_PANELS.panels.some(p => p.id === 'systems')") && [T.key, T.code, T.parent, T.side].join() === 'I,KeyI,ship,right' && T.rows.slice(0, 4).map(r => r.id).join() === PK.map(k => k.sys).join() && T.rows.slice(0, 4).map(r => r.order + ':' + (r.arg || '') + ':' + r.stay).join() === 'power:shields:1,power:engines:1,power:weapons:1,balance::1' && J("CAMP_PANELS.panels.filter(p => p.rows.some(r => r.order === 'power' || r.order === 'balance')).map(p => p.id).join()") === 'power' && J("CAMP_PANELS.panels.find(p => p.id === 'ship').rows.some(r => r.open === 'power')") && J('Object.keys(CAMP_GAUGE.keys).join()') === 'KeyJ,KeyK,KeyL,Semicolon', JSON.stringify(PK));
  const E1 = T.rows.filter(r => r.order === 'emergency');
  check('J  emergency shields is the one power order with no direct key: the fifth and last row of the power list (I), an order the game has, with no key of its own and no `stay` (taken, it closes the list); I and U are lists\' keys, not direct keys of CAMP_KEYS', E1.length === 1 && E1[0].id === 'emergency' && T.rows.indexOf(E1[0]) === 4 && T.rows.length === 5 && E1[0].label === 'Emergency shields' && !('k' in E1[0]) && !('code' in E1[0]) && !E1[0].stay && T.key === 'I' && J("campKeyVia('emergency').id") === 'power' && J("campKeyVar('viaemergency')") === 'I' && J("CAMP_PANELS.panels.filter(p => p.rows.some(r => r.order === 'emergency')).length") === 1 && J("Object.keys(CAMP_KEYS).every(k => CAMP_KEYS[k].codes.indexOf('KeyU') < 0 && CAMP_KEYS[k].codes.indexOf('KeyI') < 0)") && J("campCheck(campNew(1, [], { seed: 1 }), 'emergency', '').ok") === true, JSON.stringify(E1));
  g.run(NEW([2, 2, 2])); g.run("window.__P = campPanelNew()");
  const key = (c, t) => J(`campPanelKey(__P, C, ${JSON.stringify(c)}, ${t || 0})`);
  // give a row as the pilot does: the key of the list the row is in (campKeyVia: every list of the ship's side has a key of its own), Down to the row, Enter (the answer of the Enter comes back); with that list open already, from its top row
  const pick = (row, t) => { const id = J(`campKeyVia(${JSON.stringify(row)}).id`), i = J(`campPanelList(C, ${JSON.stringify(id)}).findIndex(r => r.id === ${JSON.stringify(row)})`); if (J('campPanelOpen(__P)') !== id) key(J(`CAMP_PANELS.panels.find(p => p.id === ${JSON.stringify(id)}).code`), t); else g.run('__P.at = 0; __P.top = 0'); for (let k = 0; k < i; k++) key('ArrowDown', t); return key('Enter', t); };
  let r = key('KeyJ', 0);
  check('J  the key J is "power to shields" at once, with no list to open: the pips move (1 / 3 / 2), and the answer is in words', r.used === true && r.ran === true && r.ok === true && r.say === 'Power to shields.' && r.row === 'shields' && r.open === '' && JSON.stringify(J('C.power.p')) === '[1,3,2]', JSON.stringify([r, J('C.power.p')]));
  const erow = () => J("campPanelRows(C, 'power')").find(x => x.id === 'emergency');
  const rw = J("campPanelRows(C, 'power')"), sw = J("campPanelRows(C, 'ship')");
  check('J  the power list\'s rows show what the gauges\' bars show, each with its direct key (J, K, L; the pips are the row\'s own bar, its gauge\'s twin: 3, 2, 1, the row\'s `pip` says which system) and what the pips do; the ship list has no power order of its own, only the Power row that opens the part (it shows I and the three pips); the emergency row shows its length, long and short', rw.map(x => x.id).join() === 'shields,engines,weapons,balance,emergency' && rw.slice(0, 4).map(x => x.short).join('|') === 'J|K|L|;   1 / 3 / 2' && rw.map(x => x.pip).join() === '1,2,0,-1,-1' && /^3 pips: shield \d+, mends [\d.]+\/s$/.test(rw[0].state) && /^2 pips: speed x1\.00$/.test(rw[1].state) && /^1 pip: turrets x[\d.]+$/.test(rw[2].state) && rw[3].state === 'now 1 / 3 / 2' && rw.every(x => x.ok && !x.more) && !sw.some(x => ['shields', 'engines', 'weapons', 'balance', 'emergency'].includes(x.id)) && sw.find(x => x.id === 'gpower').key === 'I' && sw.find(x => x.id === 'gpower').more === true && sw.find(x => x.id === 'gpower').short === '1 / 3 / 2' && sw.find(x => x.id === 'gpower').state === 'weapons 1, shields 3, engines 2' && erow().ok === true && erow().state === '10 s of shields, then back' && erow().short === '10 s' && J('campGauges(C).map(d => d.key + d.pips).join()') === 'J3,K2,L1', JSON.stringify(rw) + J('campGauges(C).map(d => d.key + d.pips).join()'));
  r = key('KeyL', 10); const l1 = JSON.stringify(J('C.power.p'));
  check('J  L is the weapons, K the engines, ; the balance back to 2 / 2 / 2, each as the orders always did', r.row === 'weapons' && r.ran && key('KeyK', 20).row === 'engines' && key('Semicolon', 30).row === 'balance' && JSON.stringify(J('C.power.p')) === '[2,2,2]' && l1.length > 0, l1 + ' ' + JSON.stringify(J('C.power.p')));
  key('KeyQ', 35); const inList = [key('KeyJ', 36), J('campPanelOpen(__P)'), JSON.stringify(J('C.power.p'))]; key('KeyQ', 37);
  check('J  one key, one meaning: with the fleet list open J is still "power to shields" (the list stays open, its highlight does not move)', inList[0].ran && inList[0].ok && inList[0].row === 'shields' && inList[1] === 'fleet' && inList[2] === '[1,3,2]' && J('campPanelOpen(__P)') === '', JSON.stringify(inList));
  // the two paths: the direct keys on one battle, the rows of the power list on another, the same orders in the same order
  g.run(NEW([2, 2, 2]));
  const seq = ['shields', 'weapons', 'engines', 'balance', 'engines', 'engines', 'engines'];
  const byKey = seq.map((id, n) => { const x = key(J(`CAMP_KEYS.${id}.codes[0]`), 100 + n); return [x.used, x.ran, x.ok, x.say, x.row, x.fleet, JSON.stringify(J('C.power.p')), JSON.stringify(J('C.power.base'))].join('|'); }), keyOrders = J('[C.orders.power, C.orders.balance]').join(), keyOpen = J('campPanelOpen(__P)');
  g.run(NEW([2, 2, 2]));
  const opened = key('KeyI', 200), stays = [];
  const byRow = seq.map((id, n) => { const i = J(`campPanelList(C, 'power').findIndex(r => r.id === ${JSON.stringify(id)})`); for (let k = 0; k < 6 && J('__P.at') !== i; k++) key('ArrowDown', 200 + n); const x = key('Enter', 200 + n); stays.push(x.open === 'power' && J('campPanelOpen(__P)') === 'power' && J('__P.at') === i); return [x.used, x.ran, x.ok, x.say, x.row, x.fleet, JSON.stringify(J('C.power.p')), JSON.stringify(J('C.power.base'))].join('|'); }), rowOrders = J('[C.orders.power, C.orders.balance]').join();
  check('J  the two paths give the same orders: shields, weapons, engines, balance and three times engines as J L K ; K K K and as rows of the power list (I, Down to the row, Enter) answer the same every time (the words, taken or refused, the row), leave the same pips and the same kept setting, and count the same orders; the seventh, at 4 pips, is refused the same', opened.used && !opened.ran && opened.open === 'power' && byKey.length === 7 && byKey.join('\n') === byRow.join('\n') && /^true\|true\|true\|Power to shields\.\|shields\|false\|\[1,3,2\]/.test(byRow[0]) && /\|\[2,2,2\]\|\[2,2,2\]$/.test(byRow[3]) && /^true\|true\|false\|That system is at full power\.\|engines\|false\|/.test(byRow[6]) && keyOrders === rowOrders && keyOrders === '5,1', JSON.stringify([byKey, byRow, keyOrders, rowOrders]));
  check('J  a power row leaves the list open, on its row, after every one of them (taken or refused: a pip is given again and again), where the direct keys open nothing; Left then goes back to the ship list with the highlight on its Power row, and Esc (the list was opened by a row) goes back to the ship list, the next Esc closes it', stays.length === 7 && stays.every(Boolean) && keyOpen === '' && (() => { const b = key('ArrowLeft', 210), at = J('__P.at'), want = J(`campPanelList(C, 'ship').findIndex(r => r.open === 'power')`), into = key('Enter', 211), e = key('Escape', 212), e2 = key('Escape', 213); return b.used && !b.ran && b.open === 'ship' && at === want && into.used && !into.ran && into.open === 'power' && e.used && e.open === 'ship' && e2.used && e2.open === ''; })(), JSON.stringify(stays));
  g.run(NEW([2, 2, 2]));
  g.run("campOrder(C, 'power', 'shields', 'key'); campOrder(C, 'power', 'shields', 'key')");
  const full = key('KeyJ', 40);
  check('J  a system at 4 pips: its key is refused in the order\'s words ("That system is at full power.") and nothing moves; the few words for it are still the table\'s ("at full power", "at full")', full.used && full.ran && full.ok === false && full.row === 'shields' && full.say === 'That system is at full power.' && JSON.stringify(J('C.power.p')) === '[1,4,1]' && J('CAMP_PANELS.why.powermax') === 'at full power' && J('CAMP_PANELS.shortWhy.powermax') === 'at full' && (r0 => r0.ok === false && r0.state === 'at full power' && r0.short === 'at full')(J("campPanelRows(C, 'power').find(x => x.id === 'shields')")), JSON.stringify([full, J('C.power.p'), J("campPanelRows(C, 'power')[0]")]));
  g.run(NEW([2, 2, 2]));
  const eg = pick('emergency', 50);
  check('J  I, Down to Emergency shields, Enter: the shields get 4 pips (1 / 4 / 1), the order is taken and the list closes', eg.used && eg.ran && eg.ok && eg.row === 'emergency' && eg.open === '' && eg.fleet === false && JSON.stringify(J('C.power.p')) === '[1,4,1]', JSON.stringify([eg, J('C.power.p')]));
  g.run("__go(1)");
  const em = erow(), held = ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'].map(c => key(c, 60)), heldRows = J("campPanelRows(C, 'power')");
  check('J  in an emergency every row of the power list and every power key say the power is held: the rows greyed ("running: the power is held", "held"), each key refused, the pips still 1 / 4 / 1', em.ok === false && em.state === 'running: the power is held' && em.short === 'held' && heldRows.length === 5 && heldRows.every(x => x.ok === false && x.state === 'running: the power is held' && x.short === 'held') && held.every(x => x.used && x.ran && x.ok === false && x.say === held[0].say && x.say.length > 0) && JSON.stringify(J('C.power.p')) === '[1,4,1]', JSON.stringify([em, held[0]]));
  const again = pick('emergency', 70);
  check('J  and giving the row again is refused: the list stays open on it, with its reason said', again.ran && again.ok === false && again.row === 'emergency' && again.open === 'power' && again.say.length > 0 && J('campPanelOpen(__P)') === 'power', JSON.stringify(again));
  key('Escape', 71);
  g.run("__go(10)");
  const cool = erow();
  check('J  after it, the emergency row counts down: "ready in 29 s" (40 s from its start), and the power keys work again', cool.ok === false && /^ready in \d+ s$/.test(cool.state) && /^\d+ s$/.test(cool.short) && key('KeyJ', 80).ok === true, JSON.stringify(cool));
  check('J  the key line says every list with a key, the left hand\'s then the right hand\'s, and the power list is I: "Q Fleet  W All  E Red  R Green  T Yellow    P Ship  O Autopilot  I Power  U Dock"', J('campPanelKeyLine()') === 'Q Fleet  W All  E Red  R Green  T Yellow    P Ship  O Autopilot  I Power  U Dock' && J('campPanelKeyLine()') === J("['left', 'right'].map(s => CAMP_PANELS.panels.filter(p => p.side === s && p.key).map(p => p.key + ' ' + p.tab).join('  ')).join('    ')"));
});

sec('H', () => {
  check('H  the power list\'s emergency row, while it cools, says the seconds ("28 s"), not the template "{s} s" (the short why filled only the ore cases)', (() => { const r = J(`(() => { const C = campNew(1, [], { seed: 1 }); campOrder(C, 'emergency', '', 'key'); C.power.until = 0; C.power.p = C.power.base.slice(); C.t = 12000; return campPanelRows(C, 'power').find(x => x.id === 'emergency').short; })()`); return r === '28 s'; })());
  const sc = read('src/campaignscene.js');
  check('H  the scene starts a battle at the saved setting and saves a change of it (campPowerLoad / campPowerSave of C.power.base: the setting, never the emergency)', /power: campPowerLoad\(\)/.test(sc) && /campPowerSave\(C\.power\.base\)/.test(sc));
  check('H  the HUD draws a bar of power segments beside each of the three gauges (SHIELDS, SPEED, LASERS) from the live pips (C.power.p), which replaced the small W S E pips (card space-game-systems-gauges, tests/campgauges.mjs)', /C\.power\.p/.test(sc) && /campGaugesPaint\(/.test(sc) && /pips: P\.p\[1\]/.test(read('src/camphud.js')) && !/'W'/.test(sc));
  check('H  the blink\'s READY and seconds on the HUD read the engines\' recharge (campBlinkCooldown)', /campBlinkCooldown\(/.test(sc));
  check('H  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
});
console.log(failed ? `CAMP SYSTEMS FAIL (${failed} of ${n})` : `CAMP SYSTEMS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

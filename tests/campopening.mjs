// smoke: the opening of an escort mission: Fly to the goal works from the first second (the goal is the transport at her berth), and a cruiser left behind is told so on the radio (plain Node, no Chrome)
// Found by flying mission 1.1 in a browser (24 Nov 2026): "Fly to the goal" given in the first seconds was refused ("There is no goal to fly to yet"), the cruiser sat at Luna, the transport flew off and was lost
// 940 km away at 3:02, and the only sign was a small label at the screen's edge. The rules: src/campnav.js (campNavBerth, the goal of a deliver mission) and src/campstray.js.
//   A. the goal before the transport leaves, and the trip that follows her
//   B. the radio line for a cruiser left behind: when, how often, and when not
//   C. the words: curt, with the key and the row from the key table; the stale words about squads and fighter counts are gone
// Run: node tests/campopening.mjs   (exit code 1 on a failed check)
process.argv.length = 2; // the bot tool reads its options from the command line: none
const bot = await import('../tools/campaign-bot.mjs');
const g = typeof bot.botGame === 'function' ? bot.botGame() : bot.botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
// a flight of mission m of level 1 for secs seconds; fly: give "Fly to the goal" at second 0. -> { goal0, find, nav, d (px to the nearest convoy ship), says: [[second, key, vars]] }
const fly = (m, secs, flyAt0, extra = '') => J(`(() => { const C = campNew(1, [], { mission: ${m}, seed: 1 }), out = { goal0: campNavGoal(C), started: C.convoys.map(c => c.started) };
  const f = campNavFind(C, 'the objective'); out.find = f.row ? f.row.id : f.code; if (${flyAt0} && f.row) out.flew = campNavFly(C, f.row, false).ok;
  out.says = []; for (let i = 0; i < 60 * ${secs} && !C.result; i++) { ${extra} campTick(C, 1 / 60); C.events.splice(0).forEach(e => { if (e.type === 'say' || e.type === 'nav') out.says.push([Math.round(C.t / 1000), e.key, e.vars || {}]); }); }
  const cs = campConvoys(C); out.nav = C.nav ? C.nav.id : ''; out.d = cs.length ? Math.round(Math.min.apply(null, cs.map(u => campDist(u, C.carrier)))) : -1; out.result = C.result ? C.result.kind || C.result : ''; return out; })()`);

console.log('A. the goal before the transport leaves');
{
  const a = fly(0, 60, true);
  check('at second 0 of 1.1 no transport is out, and the goal is the transport all the same: her id, at Luna', a.started.join() === 'false' && a.goal0 && a.goal0.id === 'convoy:freighter-t1' && a.goal0.kind === 'convoy' && a.goal0.name === 'Transport convoy', JSON.stringify(a.goal0));
  check('"Fly to the goal" finds it and the order is taken (it was refused: "no goal yet")', a.find === 'goal' && a.flew === true, a.find);
  check('the trip is not dropped as lost while she waits, and a minute on the cruiser is flying beside her (under 400 px)', a.nav === 'convoy:freighter-t1' && a.d >= 0 && a.d < 400 && !a.says.some(s => s[1] === 'camp.nav.lost'), a.nav + ' ' + a.d);
  check('the cruiser that keeps station is never told she was left behind', !a.says.some(s => s[1] === 'camp.say.stray'), JSON.stringify(a.says));
  const h = fly(2, 3, true);
  check('1.3 the same: before the first hauler leaves the goal is Hauler 1 at Ceres, and the order is taken', h.goal0 && h.goal0.id === 'convoy:freighter-h1' && h.flew === true, JSON.stringify(h.goal0));
  const w = J(`(() => { const C = campNew(1, [], { mission: 0, seed: 1 }); for (let i = 0; i < 600; i++) campTick(C, 1 / 60); return [campNavBerth(C), campNavGoal(C).id]; })()`);
  check('once she is out nothing is waiting: the goal is the ship herself', w[0] === null && w[1] === 'convoy:freighter-t1', JSON.stringify(w));
  check('a mission with no convoy has nothing waiting (1.2)', J(`campNavBerth(campNew(1, [], { mission: 1, seed: 1 }))`) === null);
}

console.log('B. the cruiser left behind');
{
  const K = J('CAMPSTRAY');
  const b = fly(0, 100, false), st = b.says.filter(s => s[1] === 'camp.say.stray');
  check('the numbers: further than 1,500 px, after 4 s of it, again every 25 s', K.far === 1500 && K.grace === 4 && K.again === 25, JSON.stringify(K));
  check('a cruiser that sits at Luna is told within 40 s of the transport leaving (54 px/s: 1,500 px in 28 s, and 4 s of grace)', st.length >= 2 && st[0][0] >= 28 && st[0][0] <= 40, JSON.stringify(st.map(s => s[0])));
  check('and again about every 25 s while it lasts, with the distance growing', st.length >= 3 && st.slice(1).every((s, i) => s[0] - st[i][0] >= 24 && s[0] - st[i][0] <= 27) && +st[1][2].km > +st[0][2].km, JSON.stringify(st.map(s => [s[0], s[2].km])));
  check('the line names the ship and how far, in the HUD\'s km', st[0][2].name === 'Transport' && +st[0][2].km >= 150, JSON.stringify(st[0][2]));
  const c = fly(0, 100, false, `if (i === 60 * 45) campNavFly(C, campNavFind(C, 'the objective').row, false);`), sc = c.says.filter(s => s[1] === 'camp.say.stray');
  check('flying to her stops it: no line after the order, though she is still far for a while', sc.length >= 1 && sc.every(s => s[0] <= 45), JSON.stringify(sc.map(s => s[0])));
  check('not in a mission with no convoy to deliver (1.2), and not when the mission is over', J(`campStrayFar(campNew(1, [], { mission: 1, seed: 1 }))`) === 0 && J(`(() => { const C = campNew(1, [], { mission: 0, seed: 1 }); for (let i = 0; i < 3000; i++) campTick(C, 1 / 60); const far = campStrayFar(C) > 0; C.result = { kind: 'lost' }; return [far, campStrayFar(C)]; })()`).join() === 'true,0');
}

console.log('C. the words');
{
  const T = J(`['camp.say.stray', 'camp.m.1.1.b2', 'camp.ui.promoted', 'camp.bf.ready.bay'].map(k => uiText(k, { name: 'Transport', km: '152', f: 8, fighters: 9 }))`);
  check('the line has the list\'s key and the row\'s words from the key table, and is curt (12 words or fewer)', T[0].indexOf(J(`campKeyVar('viagoal')`)) > 0 && T[0].indexOf(J(`campKeyVar('rowgoal')`)) > 0 && T[0].split(/\s+/).length <= 12 && !/[{}]/.test(T[0]), T[0]);
  check('the briefing of 1.1 no longer sends a squad ahead (squads and scouting are gone)', !/squad|ahead/i.test(T[1]), T[1]);
  check('the win card and the briefing no longer count fighters beside three named pilots', !/fighters? strong|\d/.test(T[2]) && !/fighters|\d/.test(T[3]) && /Wedge, Kara, Apollo/.test(T[3]), T[2] + ' / ' + T[3]);
}
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);

// smoke: the mission won card shows the kills the player made himself in a fighter he flew (card space-game-b10-c14-won-kills; BRIEF 10 chunk 14, docs/chunks.html: "The won card shows your own kills in the fighter as a fourth number") (plain Node, no Chrome)
// src/campaign.js campKill (C.ownKills: a kill whose last shot was the flown fighter's) and campScore (flown, ownKills), src/scrcards.js scrWonModel (the stat "Your kills", only when he took the stick), content/text/scrownkills.md (shown only).
// Run: node tests/scrownkills.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); CAMP.flags.cockpit = true; for (let i = 0; i < 60; i++) campStep(C, 1 / 30); C.events.length = 0; C.t = Math.max(C.t, 61000); return C; };
  window.__P = () => ({ results: {}, techs: [], bonus: {}, found: [], ore: 0, credits: 0, level: 1, revealed: false });
  window.__stats = m => { const out = []; (function w(x) { if (!x) return; if (x.k === 'stat') out.push(x.label + '=' + x.value); (x.kids || []).forEach(w); })(m); return out; };
  window.__victim = (C) => { const a = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 900); a.hold = true; a.hp = a.maxHp = 5; return a; };
`);

const a = J(`(() => { __new(); const sc = campScore(C), m = scrWonModel(C, __P(), { sc, title: 'x' }); return { flown: sc.flown, own: sc.ownKills, stats: __stats(m) }; })()`);
check('never took the stick: the card has no "Your kills" and the score says not flown', a.flown === false && a.own === 0 && a.stats.join() === 'Time=1:01,Hull=100%,Ships lost=0', JSON.stringify(a));

const b = J(`(() => { __new(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); const sc = campScore(C), m = scrWonModel(C, __P(), { sc, title: 'x' }); return { flown: sc.flown, own: sc.ownKills, stats: __stats(m) }; })()`);
check('took the stick and killed nothing: "Your kills=0" is the fourth number, after Ships lost', b.flown === true && b.own === 0 && b.stats.join() === 'Time=1:01,Hull=100%,Ships lost=0,Your kills=0', JSON.stringify(b));

const c = J(`(() => { __new(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); const k0 = C.kills; const v = __victim(C); campHurt(C, v, 100, f.id); const w = __victim(C); campHurt(C, w, 100, C.carrier.id); const other = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && u !== f); const x = __victim(C); campHurt(C, x, 100, other.id); const sc = campScore(C); return { kills: C.kills - k0, own: sc.ownKills, stats: __stats(scrWonModel(C, __P(), { sc, title: 'x' })) }; })()`);
check('three aliens die: one to the fighter he flies, one to the cruiser, one to a wing pilot: the game counts three kills and he made ONE himself', c.kills === 3 && c.own === 1 && c.stats[c.stats.length - 1] === 'Your kills=1', JSON.stringify(c));

const d = J(`(() => { __new(); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); const v = __victim(C); campHurt(C, v, 100, f.id); campCockpitGive(C, 'hand'); const w = __victim(C); campHurt(C, w, 100, f.id); const sc = campScore(C); return { own: sc.ownKills, flown: sc.flown, stats: __stats(scrWonModel(C, __P(), { sc, title: 'x' })).slice(-1)[0] }; })()`);
check('the stick given back: a kill by the same pilot afterwards is the wing\'s, not his; he still flew, so the number stays, at 1', d.own === 1 && d.flown === true && d.stats === 'Your kills=1', JSON.stringify(d));

const e = J(`(() => { const md = uiText('scr.card.ownkills'); return { word: md, spoken: VOICEPACK_FAMILIES.some(r => r.re.test('scr.card.ownkills') && !r.why) }; })()`);
check('the word reads "Your kills" from the table and is shown only (no spoken family)', e.word === 'Your kills' && e.spoken === false, JSON.stringify(e));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nSCR OWN KILLS OK (${n} checks)`);
process.exit(failed ? 1 : 0);

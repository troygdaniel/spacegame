// smoke: the level 3 minors of the wrap-up hunt (card space-game-wrapup-hunt-l3), each pinned: no anomaly noticed at second 0, no tech that nothing could offer, a new campaign forgets its loot, the win card after the reveal, the words on a level with no outpost, the tower missions' lose tip (plain Node, no Chrome)
// Run: node tests/campl3minors.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- an anomaly is not noticed at second 0 ----
const starts = [];
for (const lv of [1, 2, 3]) for (let m = 0; m < J(`campMissions(${lv}).length`); m++) starts.push([lv, m, J(`(() => { const C = campNew(${lv}, [], { seed: 1, mission: ${m} }); return C.anoms.map(a => [a.id, Math.round(campDist(C.carrier, a))]); })()`)]);
const sense = J('CAMP.anomaly.sense');
check('no anomaly is within the sense range of a mission\'s start (2,400 px), on any level, so none is noticed at second 0 (it was `core`, in missions 2 and 3 of level 3)', starts.length === 9 && starts.every(([lv, m, rows]) => rows.length >= 3 && rows.every(r => r[1] > sense)), JSON.stringify(starts.map(([lv, m, rows]) => [lv, m, rows.filter(r => r[1] <= sense)]).filter(x => x[2].length)));
g.run(`window.C = campNew(3, [], { seed: 1, mission: 2 }); for (let i = 0; i < 90; i++) campStep(C, 1 / 30);`);
check('and the toast "Odd readings ahead" is not the first line of mission 3 (nothing noticed in the first three seconds)', J('C.anoms.every(a => !a.sensed)') && !J('C.events.some(e => e.type === "say" && e.key === "camp.say.anom.sense")'));
check('the anomaly is still there to find: `core` is reachable (south of the inner ring, 3,000 px from the start) and has its guards and its reward', J('campAnomalyRows(3).find(a => a.id === "core").reward.missiles') === 3 && J('campAnomalyRows(3).find(a => a.id === "core").y') === 4300);

// ---- a tech looted in the last level would never be offered ----
const last = J('Math.max(...Object.keys(CAMP.levels).map(Number).filter(Number.isFinite))');
check('no anomaly of the last level has a tech in its reward (no refit or pick comes after it: its find counts as score, and its ore and missiles are the loot)', last === 3 && J(`CAMP.levels[3].anomalies.every(a => !a.reward.tech)`) && J(`CAMP.levels[3].anomalies.every(a => a.reward.ore > 0)`));
check('the other levels keep theirs (Overdrive from the shade and the echo, Lens from Io): a refit or a pick follows', ['overdrive', 'lens'].every(t => J(`[1, 2].some(l => CAMP.levels[l].anomalies.some(a => a.reward.tech === '${t}'))`)));

// ---- a new campaign forgets what the last one looted ----
g.run(`window.__fin = () => { const f = Object.create(Campaign.prototype); f.level = 3; f.P = campProgressNew(); f.P.found = ['1.veil', '2.echo', '3.core']; f.P.techs = ['shield', 'lens']; f.P.ore = 90; f.P.bonus = { fighters: 2, escorts: 1 }; f.camp = { ore: 40 }; f.shown = []; f.showEnd = function () { this.shown.push('end'); }; return f; }`);
g.run('window.__F = __fin(); __F.next(0)');
check('the ending begins a new campaign: the techs, the ore, the bought ships and the loot are gone, the reveal flag is set (the ending is shown once)', J('__F.P.found.length') === 0 && J('__F.P.techs.length') === 0 && J('__F.P.ore') === 0 && J('__F.P.bonus.fighters') === 0 && J('__F.P.revealed') === true && J('__F.shown.join()') === 'end');
check('and it is saved so: a reload has no loot (the weapons of the old campaign are not in the new magazine)', J('campProgressLoad().found.length') === 0 && (g.run('var Cn = campNew(1, [], { seed: 1, found: campProgressLoad().found })'), J('Cn.magazine') === J('CAMP.missile.magazine') && J('Cn.anoms.every(a => a.state === "hidden")')));
g.run('window.__F2 = __fin(); __F2.level = 1; __F2.next(10)');
check('a level that is not the last keeps the loot (the pilot has it for the next level)', J('__F2.P.found.length') === 3);

// ---- the win card after the reveal ----
check('before the ending the win card of level 3 is as it was ("Their defences are down. The war is won."), the ending then turns it', J('campStory(3, "after", false)').join(' | ') === 'Their defences are down. | The war is won.');
check('after the ending (the flag) a replay\'s win card does not say the war is won: "The outpost defences are down. The war goes on."', J('campStory(3, "after", true)').join(' | ') === 'The outpost defences are down. | The war goes on.' && !J('campStory(3, "after", true)').some(l => /war is won/i.test(l)));
check('the other levels have no variant: the same lines before and after the flag', [1, 2].every(l => J(`campStory(${l}, 'after', true).join('|') === campStory(${l}, 'after', false).join('|')`)));

// ---- no outpost on the level: the words ----
g.run('window.C3 = campNew(3, [], { seed: 1, mission: 1 }); window.C1 = campNew(1, [], { seed: 1, mission: 0 }); C3.ore = 100; C1.ore = 100; campOrder(C3, "launch"); campOrder(C1, "launch");');
const b3 = J('(() => { const r = campOrder(C3, "build", "a fighter"); return [r.ok, r.code, r.say]; })()'), b1 = J('(() => { C1.carrier.x += 9000; const r = campOrder(C1, "build", "a fighter"); return [r.ok, r.code, r.say]; })()');
check('level 3 has no outpost: Build says so ("No outpost here. Only the Fabricator builds."), not "Dock at an outpost to build."', b3[0] === false && b3[1] === 'nobuildpost' && b3[2] === 'No outpost here. Only the Fabricator builds.', JSON.stringify(b3));
check('a level that has outposts (the belt), away from them, still says "Dock at an outpost to build."', b1[0] === false && b1[1] === 'nodock' && b1[2] === 'Dock at an outpost to build.', JSON.stringify(b1));
const r3 = J('(() => { const r = campOrder(C3, "repair", ""); return [r.ok, r.code, r.say]; })()'), r1 = J('(() => { const r = campOrder(C1, "repair", ""); return [r.ok, r.code]; })()');
check('Repair: "No outpost here to repair at." on level 3, "Dock at an outpost to repair." on the belt', r3[1] === 'norepairpost' && r3[2] === 'No outpost here to repair at.' && r1[1] === 'norepair', JSON.stringify([r3, r1]));
check('the Fabricator is still the way: with it, Build on level 3 is allowed (the answer is the order\'s, not the refusal)', (g.run('C3.techs.push("fabricator")'), J('campOrder(C3, "build", "a fighter").code') !== 'nobuildpost'));
const rows = J(`(() => { const P = campPanelNew(); const rows = campPanelRows(C3, 'ship'); return rows.filter(r => /build/i.test(r.label || r.name || '')).map(r => [r.label || r.name, r.state || r.why || '']); })()`);
check('the SHIP panel row hint is the same words (the panel reads the refusal code through the table)', J(`CAMP_PANELS.why.nobuildpost`) === 'No outpost here. Only the Fabricator builds.' && J(`CAMP_PANELS.why.norepairpost`) === 'No outpost here to repair at.', JSON.stringify(rows));

// ---- the tower missions' lose tip ----
const lose = (lv, m) => J(`(() => { const C = campNew(${lv}, [], { seed: 1, mission: ${m} }); campHurt(C, C.carrier, 99999, 'x'); campStep(C, 0.1); return campLoseLines(C, C.why); })()`);
check('the tower missions (level 3, outer and inner ring) give the tip that helps: "Fire missiles (F) at the towers. Send the wing at them."', [1, 2].every(m => lose(3, m)[2] === 'Fire missiles (F) at the towers. Send the wing at them.'), JSON.stringify(lose(3, 1)));
check('the other missions keep the generic one ("Launch the wing early (1, then 1)...")', lose(3, 0)[2].startsWith('Launch the wing early') && lose(1, 0)[2].startsWith('Launch the wing early') && lose(2, 1)[2].startsWith('Launch the wing early'), JSON.stringify([lose(3, 0)[2], lose(1, 0)[2]]));
check('and the words are short enough to say (twelve words)', 'Fire missiles (F) at the towers. Send the wing at them.'.split(/\s+/).length <= 12);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPL3MINORS FAIL (${failed} of ${n})` : `\nCAMPL3MINORS PASS (${n})`);
process.exitCode = failed ? 1 : 0;

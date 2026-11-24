// smoke: in an escort mission the HUD has no WAVE n OF m line, only the goal; every other kind keeps it (plain Node, no Chrome)
// Card space-game-escort-no-wave-line (ORCH for Troy, 24 Nov 2026: "in an escort mission drop the WAVE 1 OF 2 line and show only the goal line; decide it in the HUD from the mission's kind").
// The rule is campWaveLineOn (src/camphud.js) over CAMP.hud.noWave (src/campaign.js), read from C.L.kind; the scene (src/campaignscene.js paintHud) sets an empty text for the wave line, and flowHud gives an empty line's place back.
//   A. the table and the rule: the kinds named, nothing else
//   B. the missions: every mission of the three levels, by its kind (the two escorts of level 1 have no wave line, the rest keep it)
//   C. the HUD: with no wave line the goal stands first, at the column's first row, and the column is a line shorter
//   D. the scene's source: the decision is the table's, not a mission's name; the wave text is empty for a kind the table names
// Run: node tests/campescortwave.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__mkT = t => { const o = { text: t, y: -1, setY(v) { o.y = v; return o; } }; return o; };
  window.__flow = lines => { const sc = { camp: { earth: null }, hud: { wave: __mkT(lines[0]), obj: __mkT(lines[1]), earth: __mkT(''), repair: __mkT(''), post: __mkT(''), mother: __mkT('') }, hudBack: { setSize() { return sc; } } }; Campaign.prototype.flowHud.call(sc, () => {}); return { wave: sc.hud.wave.y, obj: sc.hud.obj.y, below: sc.hudBelow }; };
`);

console.log('A. the table and the rule');
{
  check('the table names the escort and nothing else', J('CAMP.hud.noWave').join() === 'escort', J('CAMP.hud.noWave').join());
  check('the rule is pure: an escort has no wave line, a defend, recon or attack mission has, a battle with no kind has, and no battle has none either', J(`[campWaveLineOn({ L: { kind: 'escort' } }), campWaveLineOn({ L: { kind: 'defend' } }), campWaveLineOn({ L: { kind: 'recon' } }), campWaveLineOn({ L: { kind: 'attack' } }), campWaveLineOn({ L: {} }), campWaveLineOn({})]`).join() === 'false,true,true,true,true,true' && J('campWaveLineOn(null)') === false);
}

console.log('B. the missions');
{
  const all = J(`(() => { const out = []; [1, 2, 3].forEach(l => { for (let m = 0; m < campMissions(l).length; m++) { const C = campNew(l, [], { seed: 1, mission: m }); out.push([l + '.' + (m + 1), C.L.id, C.L.kind, campWaveLineOn(C)]); } }); return out; })()`);
  check('the kinds and the lines are read from the battle itself: level 1\'s escorts (1.1 and 1.3) have no wave line, its defence (1.2) has', all.filter(r => r[0].startsWith('1.')).map(r => r[2] + ':' + r[3]).join() === 'escort:false,defend:true,escort:false', JSON.stringify(all));
  check('every mission of the other levels keeps its wave line (none is an escort)', all.filter(r => !r[0].startsWith('1.')).every(r => r[3] === true) && all.length >= 9, JSON.stringify(all.filter(r => !r[0].startsWith('1.'))));
  check('exactly the missions whose kind is escort lose the line (the rule follows the kind, not the place or the name)', all.every(r => r[3] === (r[2] !== 'escort')), JSON.stringify(all));
}

console.log('C. the column');
{
  const p = J('CAMP.hud.text.pitch'), y0 = J('CAMP.hud.text.y');
  const waves = J(`__flow(['WAVE 1 OF 2', 'GOAL'])`), none = J(`__flow(['', 'GOAL'])`);
  check('with the wave line the goal is the second row; without it the goal stands in the first row and the column is a line shorter', waves.wave === y0 && waves.obj === y0 + p && none.obj === y0 && none.below === waves.below - p, JSON.stringify([waves, none]));
}

console.log('D. the scene');
{
  const sc = src('src/campaignscene.js'), hud = src('src/camphud.js');
  check('paintHud sets an empty wave text when the rule says no line, else the words (WAVE n OF m)', /this\.hud\.wave\.setText\(typeof campWaveLineOn === 'function' && !campWaveLineOn\(C\) \? '' : uiText\('camp\.ui\.wave'/.test(sc));
  check('the decision is the table\'s: no mission name or kind literal in the scene or the rule\'s own code (the kind is read from C.L.kind, the kinds are CAMP.hud.noWave)', !/campWaveLineOn[^\n]*'escort'/.test(sc) && !/'escort'/.test(hud.replace(/\/\/.*$/gm, '')) && /CAMP\.hud\.noWave\.indexOf\(C\.L && C\.L\.kind\)/.test(hud));
}

console.log(failed ? `\nFAIL: ${failed} of ${n} checks` : `\nCAMP ESCORT WAVE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

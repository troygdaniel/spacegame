// smoke: the player's ship is the cruiser in every word the game says (the refit overlay, the lost card, the form up toast, the radio, the tech lines), and the Sound page does not say M mutes (plain Node, no Chrome)
// Card space-game-stale-words-mute-carrier (from the browser batch of 25 Nov 2026). M fires a missile in the Campaign now and mute lives in Settings > Sound, so that page names its button; and "carrier" is the word of the old name of the ship.
//   A. the Sound page          B. no word of content/text says "carrier"          C. the places the batch found          D. typed words: "cruiser" names the ship as "carrier" did
// Run: node tests/campcruiserwords.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g); // the old Level 1 as a fixture level, as tests/campwing.mjs flies on it
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

console.log('A. the Sound page');
{
  const t = J(`uiText('music.use')`);
  check('the sentence under the Music row no longer says M mutes: it names the Sound button', !/\bM\b/.test(t) && /Sound button mutes all/.test(t), t);
  check('and the page has that button: its label is "Sound: ON" / "Sound: MUTED" (src/settings.js)', /'Sound: MUTED' : 'Sound: ON'/.test(src('src/settings.js')));
  check('the words are the same in content/text/ui.md and in the code\'s default (src/contenttables.js)', src('content/text/ui.md').includes('| music.use | ' + t + ' |') && src('src/contenttables.js').includes("'music.use': '" + t + "'"));
}

console.log('B. no word says "carrier"');
{
  const all = J(`Object.keys(UI_TEXT).filter(k => /carrier/i.test(String(UI_TEXT[k])))`);
  check('no string of content/text (UI_TEXT, ' + J('Object.keys(UI_TEXT).length') + ' of them) says "carrier": the ship is the cruiser', all.length === 0, all.join(' '));
  const sc = src('src/shipcomputer.js');
  check('the ship computer\'s words (src/shipcomputer.js: how the Campaign is played, and the refusal with no Campaign) say cruiser', sc.includes('You command the Earth cruiser') && sc.includes('flies the cruiser there by itself') && sc.includes('No cruiser here, pilot.') && !/Earth carrier|flies the carrier there|No carrier here/.test(sc));
}

console.log('C. the places the batch found');
{
  const get = k => J(`uiText(${JSON.stringify(k)}, { hull: 12, max: 20, group: 'Red', from: 1, to: 2, viablink: 'F', dist: 1500, secs: 20, reach: 300, rate: 2 })`);
  check('the lost card says "The cruiser is lost."', get('camp.lose.carrier') === 'The cruiser is lost.', get('camp.lose.carrier'));
  const rows = ['shield', 'blink', 'plating', 'repair', 'overdrive'].map(x => get('camp.room.tech.' + x));
  check('the refit overlay: all five tech rows say cruiser', rows.every(t => /cruiser/i.test(t)), JSON.stringify(rows));
  g.run(`window.C = campNew(11, [], { seed: 2, god: true, mission: 1 }); C.arrivedAt = 0; C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); campOrder(C, 'launch'); for (let i = 0; i < 300; i++) { campStep(C, 1 / 30); C.events.length = 0; }`);
  const toast = J(`campWingOrder(C, 'fighters', 'guard', null, 'test').say`);
  check('the form up toast (all pilots, guard the cruiser) says "guard the cruiser."', /guard the cruiser\.$/.test(toast), toast);
  const name = J(`campWingShipName(C, C.carrier)`);
  check('the name the strip gives the player\'s ship as a target is "the cruiser"', name === 'the cruiser', name);
  const rest = ['camp.say.recall', 'camp.say.wing.recall', 'camp.say.hullhalf', 'camp.say.hulllow', 'camp.map.carrier', 'camp.ui.hull', 'camp.win.result', 'camp.tech.overdrive.text', 'camp.chat.home.2', 'title.camp.sub', 'title.camp.sub.r', 'camp.bf.2.3.w1', 'camp.bf.3.2.w2', 'camp.bf.3.3.w3'].map(get);
  check('the radio, the hull gauge, the map, the win card, the tech line, the chatter, the title and the briefings say cruiser (any case)', rest.every(t => /cruiser/i.test(t)), JSON.stringify(rest));
}

console.log('D. typed words');
{
  const I = t => J(`campIntent(${JSON.stringify(t)})`);
  const gd = I('guard the cruiser'), rc = I('return to the cruiser'), old = I('guard the carrier');
  check('"guard the cruiser" is the guard of the ship, as "guard the carrier" is', !!gd && gd.act === 'fleet_guard' && !!old && old.act === 'fleet_guard', JSON.stringify([gd, old]));
  check('"return to the cruiser" recalls, as "return to the carrier" does', !!rc && rc.act === 'fleet_recall', JSON.stringify(rc));
  const f = J(`campFind(C, 'the cruiser')`), f2 = J(`campFind(C, 'the carrier')`);
  check('the cruiser is found as the ship by either word', !!f && f.kind === 'carrier' && !!f2 && f2.kind === 'carrier', JSON.stringify([f, f2]));
}
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);

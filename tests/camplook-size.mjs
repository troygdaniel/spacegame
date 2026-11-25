// smoke: the carrier and the fighters are another 30 percent smaller (drawn and hit circle) from one table, CAMP.size; mounts, launch mouth and landing distance sit on the smaller hull (plain Node, no Chrome)
// Card space-game-campaign-look (Troy): "the cruiser and the fighters (and the small escorts) another 30 percent smaller than now, drawn size and hit circles together, nothing else changed". The numbers are in ONE
// place, CAMP.size (src/campaign.js: len = the drawn length in px, hit = the hit circle's radius); the scene scales each picture to its length (CAMP_LOOK in src/campaignscene.js). The other rows that depend on the size
// of the hull follow it: the eight turret mounts lie on the hull, a launched ship appears at the mouth of a hangar pod (CAMP.bay.mouth), a recalled one lands just outside the hull (CAMP.bay.dockAt).
// Run: node tests/camplook-size.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { readFileSync } from 'node:fs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const size = J('CAMP.size');
check('one table: CAMP.size has a drawn length and a hit circle for the carrier and a fighter (the escort is gone: card space-game-cut-escorts)', ['carrier', 'fighter'].every(k => size[k] && size[k].len > 0 && size[k].hit > 0) && !size.escort, JSON.stringify(size));
check('another 30 percent smaller than before: 98 px (was 140), 22 (was 31), 28 (was 40) drawn; hit circles 25 (was 36), 6 (was 8), 7 (was 10)',
  [[98, 140, 25, 36], [22, 31, 6, 8]].every(([len, was, hit, hwas], i) => { const r = size[['carrier', 'fighter'][i]]; return r.len === len && r.hit === hit && Math.abs(len / was - 0.7) < 0.02 && Math.abs(hit / hwas - 0.7) < 0.2; }));
check('the hit circle is about half the drawn half-length, as it always was (carrier 25 of 49, fighter 6 of 11)', ['carrier', 'fighter'].every(k => Math.abs(size[k].hit / (size[k].len / 2) - 0.5) < 0.06));
check('the ships in the game take their hit circle from the table (a ship in a fight is as big as it says)', J(`(() => { const C = campNew(1, [], { seed: 1 }); return C.carrier.r === CAMP.size.carrier.hit && campSpawn(C, 'fighter', 0, 0).r === CAMP.size.fighter.hit && campSpawn(C, 'escort', 0, 0) === null; })()`));
check('and the numbers are not written a second time: no radius row for them in CAMP, no scale number in CAMP_LOOK (the scale is the table length over the picture width)',
  J('CAMP.carrier.radius') === null && J('CAMP.fighter.radius') === null && J('CAMP.escort') === null && ['carrier', 'fighter'].every(k => Math.abs(J(`CAMP_LOOK.${k}.scale * CAMP_LOOK.${k}.w - CAMP.size.${k}.len`)) < 1e-9) && /CAMP\.size\[kind\]\.len/.test(src('src/campcruiser.js')) && ['carrier', 'fighter'].every(k => new RegExp("campArtLook\\('" + k + "'").test(src('src/campaignscene.js'))));

// the hull as drawn: its length is the table's, its width the picture's height over its width
const look = J('CAMP_LOOK.carrier'), len = size.carrier.len, wid = len * (look.h || look.w * 0.7) / look.w;
check('the carrier picture is as long as CAMP.size.carrier.len', Math.abs(look.scale * look.w - len) < 1e-9, look.scale.toFixed(4) + ' x ' + look.w);
const mounts = J('CAMP.carrier.mounts');
check('eight turret mounts, every one on the hull (inside its drawn length and width)', mounts.length === 8 && mounts.every(([x, y]) => Math.abs(x) <= len / 2 && Math.abs(y) <= wid / 2), JSON.stringify(mounts) + ' in ' + len + ' x ' + wid.toFixed(0));
check('they are spread along the hull: from near the bow to well aft of the middle, none on top of another (each 8 px or more from the next: the two front ones moved back to x 2 on the flat-cut hull, card space-game-ship-look-default-on, so the gap to the pod\'s second pair is 8, over twice a mount\'s base radius of 3.2)',
  Math.max(...mounts.map(m => m[0])) >= len * 0.25 && Math.min(...mounts.map(m => m[0])) <= -len * 0.2 && mounts.every((a, i) => mounts.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[1] - b[1]) >= 8)));

// the bay: a launched ship appears at the mouth, one side and then the other
const mouth = J('CAMP.bay.mouth');
check('the mouth of the hangar is on the hull: inside its length and width', Math.abs(mouth[0]) <= len / 2 && Math.abs(mouth[1]) <= wid / 2, JSON.stringify(mouth));
const out = J(`(() => { const C = campNew(1, [], { seed: 1 }), c = C.carrier; c.rot = 0.7; campOrder(C, 'launch', '', 'key'); const seen = []; for (let i = 0; i < 90 && seen.length < 3; i++) { campStep(C, 1 / 30); C.events.filter(e => e.type === 'launch').forEach(e => { const u = C.ships.find(s => s.id === e.id); const dx = u.x - c.x, dy = u.y - c.y, cs = Math.cos(-c.rot), sn = Math.sin(-c.rot); seen.push([dx * cs - dy * sn, dx * sn + dy * cs]); }); C.events.length = 0; } return seen; })()`);
check('the first three ships leave from the mouth, alternating sides (the carrier was turned 0.7 rad, so it is the carrier\'s frame that counts)', out.length === 3 && out.every(([x, y], i) => Math.abs(x - mouth[0]) < 8 && Math.abs(Math.abs(y) - mouth[1]) < 8 && Math.sign(y) === (i % 2 ? 1 : -1)), JSON.stringify(out.map(p => p.map(Math.round))));
const dock = J('CAMP.bay.dockAt');
check('a recalled ship lands just outside the hull: not inside it, not far from it (dockAt 63 px from the centre of a hull 98 px long)', dock >= len / 2 + 5 && dock <= len / 2 + 25, String(dock));

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

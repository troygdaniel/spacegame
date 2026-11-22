// smoke: seeing hostiles from afar: the sensor range, who is seen, the radio's first call, the edge arrows and the tuning row (plain Node, no Chrome)
// Card space-game-see-hostiles-earlier (Troy, 22 Nov 2026: "see hostiles earlier so I can send squads to meet them"). src/campsight.js is the rule (CAMP.sensor in src/campaign.js is the table); the drawing is
// src/campsightscene.js (a stand-in scene here: the picture was looked at in Chrome once).
//   A. seen: within the range, in a scout's circle, the always-seen kinds, the cruiser's own side; range 0
//   B. what goes through it: the target keys' list, the nav list's enemy rows, the map's marks (and the sim's own list does not: a hostile out of sight still flies)
//   C. the groups: hostiles near each other are one; the compass words
//   D. the radio's first call: once, after the delay, how many and which way and how far, the kinds when somebody is near enough to tell, one call for a few seconds' worth, none for the dead
//   E. the marks and the edge arrows: a group off the screen gets one at the edge, a group on the screen none, the newest blinks
//   F. the scene half draws them, the radar pulses, nothing behind a card
//   G. the tuning row, the words, the voice pack's rule, the scripts and the scene's calls
// Run: node tests/campsight.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__mk = () => { const C = campNew('home', [], { seed: 4 }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.carrier.x = 0; C.carrier.y = 0; window.C = C; return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  window.__says = () => C.events.filter(e => e.type === 'say').map(e => e.key + ' ' + JSON.stringify(e.vars));
  // a stand-in scene: texts that remember what was set on them, graphics that remember the calls, a camera on the cruiser
  window.__scene = (zoom, extra) => {
    const calls = [], texts = [], mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, width: 100, height: 16 }; ['setOrigin', 'setScrollFactor', 'setDepth', 'setAlpha'].forEach(k => { o[k] = () => o; }); o.setText = s => { o.text = s; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; texts.push(o); return o; };
    const mkG = () => new Proxy({}, { get: (t, k) => k === 'calls' ? calls : (...a) => { calls.push([String(k)].concat(a.map(x => typeof x === 'number' ? Math.round(x * 100) / 100 : typeof x === 'object' ? 'obj' : x))); return mkG.self; } });
    mkG.self = mkG();
    const c = C.carrier;
    return Object.assign({ calls, texts, camp: C, mode: 'play', hud: {}, cameras: { main: { zoom, scrollX: c.x - W / 2, scrollY: c.y - H / 2 } }, add: { graphics: () => mkG.self, text: () => mkT() } }, extra || {});
  };
`);

console.log('A. seen');
{
  g.run('__mk()');
  const R = J('CAMP.sensor.range');
  check('the table has the range, the always-seen kinds, the group size, the delay, the identification range, the mark time, the arrows and the pause', J('(() => { const K = CAMP.sensor; return typeof K.range === "number" && K.range > 0 && Array.isArray(K.always) && K.group > 0 && K.delay >= 0 && K.idNear > 0 && K.mark > 0 && K.arrows > 0 && K.sayEvery > 0; })()'));
  check('the range is 9000 px: 21 s of the fastest raider\'s flight (430 px/s), more of a slower one', R === 9000 && R / 430 > 20 && R / 430 < 22, R);
  check('a hostile inside the range is seen, one beyond it is not', J('(() => { const a = __foe("raider", 8900, 0), b = __foe("raider", 0, -9100); return campSeen(C, a) === true && campSeen(C, b) === false; })()'));
  check('the mothership and the towers are always seen, as they were before the sensors had a range', J('(() => { const m = __foe("mother", 30000, 0), t = __foe("tower", -30000, 0); return campSeen(C, m) && campSeen(C, t); })()'));
  check('a ship of your own side is always seen', J('(() => { const e = campSpawn(C, "escort", 40000, 0); return campSeen(C, e); })()'));
  check('a hostile inside the circle of a scout that is out is seen however far it is from the cruiser', J(`(() => {
    const far = __foe("raider", 14000, 0), e = campSpawn(C, "escort", 13000, 0); e.scout = { phase: 'station' };
    const near = campSeen(C, far), sensors = campSensors(C).length; e.hp = 0; const gone = campSeen(C, far);
    return near === true && sensors === 1 && gone === false;
  })()`));
  check('a hostile just outside the scout\'s circle is not', J(`(() => { __mk(); const far = __foe("raider", 14000, 0), e = campSpawn(C, "escort", 14000 - CAMP.scout.sense - 50, 0); e.scout = { phase: 'station' }; return campSeen(C, far) === false; })()`));
  check('with the range at 0 only the always-seen kinds are seen (the tuning row\'s lowest value)', J(`(() => { __mk(); const a = __foe("raider", 100, 0), t = __foe("tower", 100, 100); const was = CAMP.sensor.range; CAMP.sensor.range = 0; const r = campSeen(C, a) === false && campSeen(C, t) === true; CAMP.sensor.range = was; return r; })()`));
  check('the range is read at the moment (the tuning panel changes it live)', J(`(() => { __mk(); const a = __foe("raider", 5000, 0); const was = CAMP.sensor.range; CAMP.sensor.range = 4000; const r1 = campSeen(C, a); CAMP.sensor.range = 6000; const r2 = campSeen(C, a); CAMP.sensor.range = was; return r1 === false && r2 === true; })()`));
}

console.log('B. what goes through it');
{
  g.run('__mk()');
  g.run('window.__near = __foe("raider", 3000, 0); window.__far = __foe("drone", 12000, 0); window.__mo = __foe("mother", 30000, 0)');
  check('the target keys\' list holds what is seen, nearest first, and not what is out of sight', J('campTgtList(C).map(u => u.id)') .join() === J('[__near.id, __mo.id]').join(), J('campTgtList(C).map(u => u.id)'));
  check('S, D and A cannot pick a hostile out of sight', J('(() => { const a = campTgtNearest(C); const b = campTgtStep(C, 1); const c2 = campTgtStep(C, -1); return a.id === __near.id && b.id !== __far.id && c2.id !== __far.id; })()'));
  check('the nav list has an enemy row for what is seen and none for what is not', J('(() => { const ids = campNavRows(C).filter(r => r.group === "enemies").map(r => r.ref); return ids.indexOf(__near.id) >= 0 && ids.indexOf(__far.id) < 0 && ids.indexOf(__mo.id) >= 0; })()'));
  check('the map has a mark for what is seen and none for what is not', J('(() => { const ids = campMapMarks(C).map(m => m.id); return ids.indexOf(__near.id) >= 0 && ids.indexOf(__far.id) < 0; })()'));
  check('the sim\'s own list of hostiles still holds it: it flies and it fires, it is only not on the instruments', J('campAliens(C).some(u => u.id === __far.id)'));
  check('the turrets still reach what is near, seen or not: nothing of the sim reads campSeen (src/campaign.js, src/campdogfight.js, src/camppirates.js)', !/campSeen/.test(src('src/campaign.js')) && !/campSeen/.test(src('src/campdogfight.js')) && !/campSeen/.test(src('src/camppirates.js')));
  check('it comes into the list when it comes into range', J('(() => { __far.x = C.carrier.x + 8000; return campTgtList(C).some(u => u.id === __far.id) && campNavRows(C).some(r => r.ref === __far.id); })()'));
}

console.log('C. the groups');
{
  g.run('__mk()');
  g.run('window.__a1 = __foe("raider", 4000, 0); window.__a2 = __foe("raider", 4300, 200); window.__a3 = __foe("drone", 4600, -100); window.__b1 = __foe("gunship", -6000, 3000); window.__mo = __foe("mother", 8000, 8000)');
  const gs = J('campSightGroups(C, true)');
  check('hostiles near each other are one group, far apart ones are two, nearest the carrier first', gs.length === 2 && gs[0].n === 3 && gs[1].n === 1 && gs[0].dist < gs[1].dist, JSON.stringify(gs.map(q => [q.n, Math.round(q.dist)])));
  check('a group says its kinds, its middle and its ships', gs[0].kinds.raider === 2 && gs[0].kinds.drone === 1 && Math.abs(gs[0].x - 4300) < 1 && gs[0].ids.length === 3);
  check('the mothership is no group: it is a mark of the mission, not a contact', !gs.some(q => q.ids.some(id => /mother/.test(id))));
  check('only the seen make groups (seenOnly), all of them otherwise', J('(() => { __b1.x = C.carrier.x - 20000; return campSightGroups(C, true).length === 1 && campSightGroups(C, false).length === 2; })()'));
  const dirs = J(`[[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(v => campSightDir(v[0] * 100, v[1] * 100))`);
  check('the compass: east is right, north is up the screen, and the eight points between', dirs.join() === 'east,south-east,south,south-west,west,north-west,north,north-east', dirs.join());
}

console.log('D. the radio\'s first call');
{
  g.run('__mk()');
  g.run('window.__a1 = __foe("raider", 5000, 0); window.__a2 = __foe("raider", 5200, 100); window.__a3 = __foe("drone", 5400, -50)');
  g.run('C.t = 100000; campSightStep(C)');
  check('the first sight is not called at once: the wave\'s own line is said first', J('__says().length') === 0);
  g.run('C.t = 100000 + CAMP.sensor.delay + 10; campSightStep(C)');
  const s1 = J('__says()');
  check('after the delay one call: how many, which way, how far (no scout or escort near: no kinds)', s1.length === 1 && /^camp\.say\.sight /.test(s1[0]) && s1[0].indexOf('3 hostiles') > 0 && s1[0].indexOf('"dir":"east"') > 0 && s1[0].indexOf('"km":"') > 0, s1.join(' | '));
  check('the words fill from the text table: "Contact, east: 3 hostiles, 520 km."', J('uiText("camp.say.sight", C.events.find(e => e.type === "say").vars)') === 'Contact, east: 3 hostiles, 520 km.', J('uiText("camp.say.sight", C.events.find(e => e.type === "say").vars)'));
  g.run('C.events.length = 0; C.t += 5000; campSightStep(C)');
  check('the same hostiles are not called twice', J('__says().length') === 0);
  // a second group, with an escort near: the kinds are named
  g.run('window.__e = campSpawn(C, "escort", C.carrier.x - 6000, C.carrier.y - 200); __e.vx = __e.vy = 0; window.__b1 = __foe("raider", -7000, 0); window.__b2 = __foe("raider", -7100, 0); window.__b3 = __foe("gunship", -7200, 0); C.t += 5000; campSightStep(C); C.t += CAMP.sensor.delay + 10; campSightStep(C)');
  const s2 = J('__says()');
  check('with an escort of yours near the group the call names the kinds, the most first: "2 Raiders, 1 Gunship"', s2.length === 1 && s2[0].indexOf('2 Raiders, 1 Gunship') > 0 && s2[0].indexOf('"dir":"west"') > 0, s2.join(' | '));
  g.run('C.events.length = 0; __mk(); window.__s = campSpawn(C, "escort", C.carrier.x + 9000, C.carrier.y); __s.scout = { phase: "station" }; __s.vx = __s.vy = 0; window.__c1 = __foe("skiff", 11000, 0); C.t = 200000; campSightStep(C); C.t += CAMP.sensor.delay + 10; campSightStep(C)');
  const s3 = J('__says()');
  check('a scout out sees a group 11,000 px off (beyond the cruiser\'s range) and names it too: "1 Skiff"', s3.length === 1 && s3[0].indexOf('1 Skiff') > 0 && s3[0].indexOf('"dir":"east"') > 0, s3.join(' | '));
  g.run('C.events.length = 0; __mk(); window.__d1 = __foe("raider", 4000, 0); C.t = 300000; campSightStep(C); __d1.hp = 0; C.t += CAMP.sensor.delay + 10; campSightStep(C)');
  check('a group that is dead before the call is due is not called', J('__says().length') === 0);
  g.run('C.events.length = 0; __mk(); window.__f1 = __foe("raider", 4000, 0); window.__f2 = __foe("raider", -4000, 0); C.t = 400000; campSightStep(C); C.t += CAMP.sensor.delay + 10; campSightStep(C)');
  const s4 = J('__says()');
  check('two groups in sight in the same few seconds are one call at a time: the second waits CAMP.sensor.sayEvery s for its turn', s4.length === 1, s4.join(' | '));
  g.run('C.events.length = 0; C.t += CAMP.sensor.sayEvery * 1000 + 100; campSightStep(C)');
  check('and is called when its turn comes', J('__says().length') === 1);
  g.run('C.events.length = 0; __mk(); window.__g1 = __foe("raider", 12000, 0); C.t = 500000; campSightStep(C); C.t += 20000; campSightStep(C)');
  check('a hostile out of sight is not called', J('__says().length') === 0);
  g.run('__g1.x = C.carrier.x + 8000; C.t += 100; campSightStep(C); C.t += CAMP.sensor.delay + 10; campSightStep(C)');
  check('and is called the moment it comes into range', J('__says().length') === 1);
  check('the state is plain data (seen, pending, saidAt): it is in no other state of the battle', J('(() => { const S = C.sight; return typeof S.seen === "object" && Array.isArray(S.pending) && typeof S.saidAt === "number"; })()'));
}

console.log('E. the marks and the edge arrows');
{
  g.run('__mk()');
  g.run('window.__a1 = __foe("raider", 5000, 0); window.__a2 = __foe("raider", 5200, 100); window.__b1 = __foe("drone", 0, -3000); C.t = 100000; campSightStep(C)');
  const sc = { x: 0 - 640, y: 0 - 360 }; // the camera on the cruiser at (0, 0)
  g.run('window.__arr = (z) => campSightArrows(C, { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2 }, W, H, z)');
  let ar = J('__arr(1)');
  check('a group that is off the screen gets an arrow at the edge, pointing at it (east: the right edge, angle 0)', ar.length === 2 && ar.some(a => a.x > 1200 && Math.abs(a.angle) < 0.2 && a.n === 2), JSON.stringify(ar));
  check('the group to the north gets one near the top, pointing up, and clear of every rectangle of the HUD (the arrow keeps out of the plates, as the goal\'s does)', ar.some(a => a.n === 1 && a.y < 200 && a.angle < -0.8 && a.angle > -2.4 && !J('CAMP.nav.arrow.keep').some(r => a.x >= r[0] && a.x <= r[2] && a.y >= r[1] && a.y <= r[3])), JSON.stringify(ar));
  check('each arrow says how many, what and how far', ar.every(a => typeof a.what === 'string' && a.what.length > 0 && a.dist > 2900 && a.dist < 5200), JSON.stringify(ar.map(a => [a.what, Math.round(a.dist)])));
  ar = J('__arr(0.335)');
  check('zoomed out to where they are on the screen there is no arrow for them (the first at 5000 px: 1675 px of screen from the middle is still off; the north one at 3000 px: 1005 px, off)', ar.length === 2);
  ar = J('__arr(0.05)');
  check('zoomed out far enough that they are on the screen (and clear of the HUD\'s plates), no arrow: they are seen as they are', ar.length === 0, JSON.stringify(ar));
  check('one that is on the screen but under the HUD\'s top plate (the north group at 0.1: 60 px from the top) keeps its arrow, as the goal\'s does', J('__arr(0.1)').length === 1);
  check('a group just seen blinks (fresh); one seen long ago does not', J('__arr(1)').every(a => a.fresh === true) && J('(() => { C.t += CAMP.sensor.mark + 100; return __arr(1).every(a => a.fresh === false); })()'));
  g.run('C.t = 100000');
  const mk = J('campSightMarks(C)');
  check('the marks are the groups seen in the last CAMP.sensor.mark ms, with their age 0 to 1', mk.length === 2 && mk.every(m => m.age >= 0 && m.age < 0.1), JSON.stringify(mk));
  g.run('C.t += CAMP.sensor.mark + 100');
  check('and none after', J('campSightMarks(C).length') === 0);
  g.run('__mk(); for (let i = 0; i < 7; i++) __foe("raider", 5000 * Math.cos(i), 5000 * Math.sin(i)).vx = 0; C.t = 1000');
  check('at most CAMP.sensor.arrows arrows at once', J('campSightArrows(C, { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2 }, W, H, 1).length') <= 4);
  g.run('__mk(); window.__w1 = __foe("raider", 5000, 0); C.t = 1000; __w1.x = C.carrier.x + 500; __w1.y = C.carrier.y');
  check('a group on the screen (500 px off at zoom 1) has none', J('__arr(1).length') === 0);
}

console.log('F. the scene half');
{
  g.run('__mk(); window.__a1 = __foe("raider", 5000, 0); window.__a2 = __foe("raider", 5200, 100); C.t = 100000; campSightStep(C)');
  g.run('window.__S = __scene(1); campSightSync(__S)');
  const shown = J('__S.texts.filter(t => t.vis).map(t => t.text)');
  check('an edge arrow has its label: "2 hostiles  510 km" (the text table\'s camp.sight.arrow)', shown.length === 1 && /^2 hostiles {2}\d+ km$/.test(shown[0]), shown.join('|'));
  check('the graphics drew a triangle for it', J('__S.calls.filter(c => c[0] === "fillPoints").length') === 1);
  check('and a ring on the radar where the group is (just seen: the pulse)', J('__S.calls.some(c => c[0] === "strokeCircle")') );
  g.run('C.t = 100000 + CAMP.sensor.mark + 500; __S.calls.length = 0; campSightSync(__S)');
  check('after the mark time the ring is gone and the arrow stays', J('__S.calls.filter(c => c[0] === "strokeCircle").length') === 0 && J('__S.calls.filter(c => c[0] === "fillPoints").length') === 1);
  g.run('__S.mode = "map"; __S.calls.length = 0; campSightSync(__S)');
  check('on the map (not in flight) nothing is drawn and the label is hidden', J('__S.calls.filter(c => c[0] === "fillPoints" || c[0] === "strokeCircle").length') === 0 && J('__S.texts.filter(t => t.vis).length') === 0);
  g.run('__S.mode = "play"; __S.hudHides = () => true; __S.calls.length = 0; campSightSync(__S)');
  check('behind a result card nothing is drawn', J('__S.calls.filter(c => c[0] === "fillPoints" || c[0] === "strokeCircle").length') === 0 && J('__S.texts.filter(t => t.vis).length') === 0);
  g.run('__S.hudHides = null; C.t = 100000; campSightSync(__S)');
  check('the graphics and the texts are kept in scene.hud (a scene that starts again has its own)', J('!!(__S.hud.sight && __S.hud.sight.g && Array.isArray(__S.hud.sight.t))'));
  g.run('__S = __scene(0.05); __S.calls.length = 0; campSightSync(__S)');
  check('zoomed out so far that the group is on the screen: no arrow', J('__S.calls.filter(c => c[0] === "fillPoints").length') === 0);
}

console.log('G. the row, the words, the scripts and the scene\'s calls');
{
  check('the tuning panel has the row: CAMP.sensor.range, felt at once, from 0 up to 20,000 px', J('(() => { const r = campTuneRow("sensorrange"); return !!r && r.root === "CAMP" && r.path === "sensor.range" && r.when === "now" && r.min === 0 && r.max === 20000; })()'));
  check('the row changes the range live and puts it back', J('(() => { const was = CAMP.sensor.range; campTuneSet("sensorrange", 4000); const a = CAMP.sensor.range; campTuneResetAll(); return a === 4000 && CAMP.sensor.range === was; })()'));
  check('the row has its label in the text table', J('uiText("camp.ui.tune.row.sensorrange")') === 'Sensor range (hostiles seen)');
  check('every key the sensors use is in the text table: the call, the arrow, the counts, the kinds and the eight compass points', J(`['camp.say.sight', 'camp.sight.arrow', 'camp.sight.hostile.one', 'camp.sight.hostile.many', 'camp.sight.kind.one', 'camp.sight.kind.many'].concat(['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'].map(d => 'camp.sight.dir.' + d)).every(k => uiText(k) !== k)`));
  check('the words are in their own file, content/text/campsight.md', /camp\.say\.sight \|/.test(src('content/text/campsight.md')) && !/camp\.say\.sight/.test(src('content/text/campaign.md')));
  check('the voice pack: the call is spoken (a camp.say line), the fragments are only shown', J('(() => { const a = voicePackFamily("camp.say.sight"), b = voicePackFamily("camp.sight.arrow"), c = voicePackFamily("camp.sight.dir.east"); return !!a && !!a.spoken && !!b && !!b.why && !!c && !!c.why; })()'));
  const html = src('index.html'), i1 = html.indexOf('src/campsight.js'), i2 = html.indexOf('src/campsightscene.js'), i3 = html.indexOf('src/campaignscene.js');
  check('both files are registered in index.html, the scene half before the Campaign scene', i1 > 0 && i2 > 0 && i2 < i3);
  check('the sim ticks it (campTick) after the warnings', /campWarn\(C\);\s*\n\s*if \(typeof campSightStep === 'function'\) campSightStep\(C\);/.test(src('src/campaign.js')));
  const sc = src('src/campaignscene.js');
  check('the Campaign scene calls campSightSync every frame, next to the far marks', /campFarSync\(this\);\s*\n\s*if \(typeof campSightSync === 'function'\) campSightSync\(this\);/.test(sc));
  check('the radar draws only the hostiles that are seen', /u\.team === 'alien' && typeof campSeen === 'function' && !campSeen\(C, u\)\)\) return; dot\(u, campDotColor\(u\)/.test(sc));
  check('the sensors keep no state in the scene object (scene instances are reused on a restart)', !/this\.sight\b/.test(sc) && !/scene\.sight\b/.test(src('src/campsightscene.js')));
  check('the rule file is pure: no Phaser, no scene', !/Phaser|scene\./.test(src('src/campsight.js').replace(/^\/\/.*$/gm, '')));
}

console.log(failed ? `\nCAMPAIGN SIGHT FAIL: ${failed} of ${n} checks failed` : `\nCAMPAIGN SIGHT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

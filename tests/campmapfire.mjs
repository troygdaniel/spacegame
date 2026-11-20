// smoke: the Campaign's Tab map shows the fight: volleys, guns, mining beams, enemy fire, missiles, rings and flashes, in a bounded pool that never allocates per frame (plain Node, no Chrome)
// Card space-game-campaign-map-lasers (Troy: the Tab map is great; it would be good to see lasers firing on it as well). src/campmapfire.js is the whole decision and the drawing calls, on a
// stand-in Graphics that only records; the Phaser scene hands it the battle events it already reads, only while the map is open. Checks:
//   A  an event makes a mark: the carrier's turret volley, a boom (a ring, bigger for a big ship), a missile's blast, a hit or a shield hit (a flash); what is not a mark (and what is drawn from state)
//   B  the pool is bounded: a thousand volleys never grow it, and the slots are reused (the same objects), the oldest goes first
//   C  a mark has a life: it fades in over about 150 ms, fades out, and is freed
//   D  drawn from state each frame: the guns' and enemy bullets (friend and foe colours), missiles (a dot and a short trail), mining beams (a steady line from the miner to the rock)
//   E  thin and inside: no line is fatter than 2 px, a line is cut to the map's frame, one fully outside draws nothing; the number of bullets drawn is capped
//   F  no allocation per frame: the painting code has no array, object, closure or new in it
//   G  the wiring: the script is in index.html, the map makes the pool when it opens and paints it after the marks, the scene gives it events only while the map is open
// Run: node tests/campmapfire.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.message); } };

// a Campaign in plain numbers, and a Graphics that only records what is drawn
g.run(`
  window.__C = { t: 5000, by: { a1: { id: 'a1', team: 'alien', kind: 'drone', x: 400, y: 0 }, f1: { id: 'f1', team: 'earth', kind: 'fighter', x: 100, y: 0 }, carrier: { id: 'carrier', team: 'earth', kind: 'carrier', x: 0, y: 0 } },
    bullets: [], rockets: [], rocks: [{ id: 'r1', x: 300, y: 300, r: 40, hp: 5 }], lasers: [] };
  window.__F = { x: 100, y: 100, w: 800, h: 500 };
  window.__fit = { s: 0.2, cx: 0, cy: 0 };
  window.__calls = [];
  window.__G = { lineStyle(w, c, a) { __calls.push({ op: 'lineStyle', w, c, a }); return this; }, lineBetween(x0, y0, x1, y1) { __calls.push({ op: 'line', x0, y0, x1, y1 }); return this; },
    strokeCircle(x, y, r) { __calls.push({ op: 'ring', x, y, r }); return this; }, fillStyle(c, a) { __calls.push({ op: 'fillStyle', c, a }); return this; }, fillCircle(x, y, r) { __calls.push({ op: 'dot', x, y, r }); return this; } };
`);
const calls = () => J('__calls');
const reset = () => g.run('__calls.length = 0');
const paint = now => J(`(__calls.length = 0, campFirePaint(__P, __C, __G, __F, __fit, ${now}), __calls.length)`);

sec('A', () => {
  g.run('window.__P = campFireNew()');
  const hear = e => J(`campFireHear(__P, __C, ${JSON.stringify(e)}, 1000)`);
  const on = () => J('__P.slots.filter(s => s.on).length');
  check('A  the carrier\'s turret volley is a mark: a line from the turret to its target', hear({ type: 'turret', i: 0, x: 0, y: 0, aim: 0, tx: 300, ty: 40 }) === true && on() === 1 && J('__P.slots.find(s => s.on).kind') === 'volley' && J('__P.slots.find(s => s.on).x1') === 300);
  g.run('window.__P = campFireNew()');
  check('A  a boom is a ring, bigger for a big ship, in the colour of its side', hear({ type: 'boom', x: 10, y: 10, big: false, kind: 'drone' }) === true && hear({ type: 'boom', x: 20, y: 20, big: true, kind: 'carrier' }) === true
    && J('__P.slots.filter(s => s.on && s.kind === "ring").length') === 2 && J('__P.slots.filter(s => s.on)[1].r') > J('__P.slots.filter(s => s.on)[0].r') && J('__P.slots.filter(s => s.on)[0].color') !== J('__P.slots.filter(s => s.on)[1].color'));
  g.run('window.__P = campFireNew()');
  check('A  a missile\'s blast is a ring of its own size', hear({ type: 'mboom', x: 5, y: 5, r: 120 }) === true && J('__P.slots.find(s => s.on).kind') === 'ring' && J('__P.slots.find(s => s.on).r') === 120);
  g.run('window.__P = campFireNew()');
  check('A  a hit on a wing ship and one on an alien are flashes in two colours; a shield hit is a flash', hear({ type: 'hit', id: 'f1', x: 1, y: 1 }) === true && hear({ type: 'hit', id: 'a1', x: 2, y: 2 }) === true && hear({ type: 'shieldhit', x: 3, y: 3 }) === true
    && J('__P.slots.filter(s => s.on && s.kind === "flash").length') === 3 && J('__P.slots.filter(s => s.on)[0].color') !== J('__P.slots.filter(s => s.on)[1].color'));
  g.run('window.__P = campFireNew()');
  const none = ['say', 'launch', 'dock', 'ore', 'nav', 'end', 'missile', 'mfizzle', 'blink', 'recharge', 'built', 'cache', 'arrive', 'alarm'].filter(t => hear({ type: t, x: 1, y: 1 }) !== false);
  check('A  the events that are not a mark make none', none.length === 0, none.join(','));
  check('A  a mining laser event is not a mark either (the steady beam is drawn from C.lasers)', hear({ type: 'laser', src: 'turret', x: 0, y: 0, tx: 5, ty: 5 }) === false && on() === 0);
  check('A  an event with nothing in it, or no pool, makes no mark and does not fail', J('(campFireHear(__P, __C, null, 0), campFireHear(null, __C, { type: "boom" }, 0), campFireHear(__P, null, { type: "hit", id: "x" }, 0))') === false);
});

sec('B', () => {
  g.run('window.__P = campFireNew(); window.__first = __P.slots[0]; window.__arr = __P.slots;');
  check('B  the pool has CAMPFIRE.pool slots from the start', J('__P.slots.length') === J('CAMPFIRE.pool') && J('CAMPFIRE.pool') >= 32 && J('CAMPFIRE.pool') <= 256);
  g.run('for (let i = 0; i < 1000; i++) campFireHear(__P, __C, { type: "turret", i: i % 8, x: i, y: 0, aim: 0, tx: i + 50, ty: 0 }, 1000 + i);');
  check('B  a thousand volleys do not grow it, and the slots are the same objects as before (reused, not made)', J('__P.slots.length') === J('CAMPFIRE.pool') && g.run('__P.slots === __arr && __P.slots[0] === __first') === true);
  check('B  the oldest marks went first: the pool holds the newest ones', J('Math.min(...__P.slots.map(s => s.t0))') >= 1000 + 1000 - J('CAMPFIRE.pool'));
  check('B  at most the pool is alive at once', J('__P.slots.filter(s => s.on).length') <= J('CAMPFIRE.pool'));
});

sec('C', () => {
  const a = (age, life, fi) => J(`campFireAlpha(${age}, ${life}, ${fi})`);
  check('C  a mark is not there at its birth, is full by its fade-in (150 ms), and gone at the end of its life', a(0, 320, 150) === 0 && a(150, 320, 150) >= 0.99 && a(320, 320, 150) === 0 && a(400, 320, 150) === 0);
  check('C  it rises, then falls: never above 1, never below 0', [0, 30, 75, 120, 150, 200, 260, 310].every(t => a(t, 320, 150) >= 0 && a(t, 320, 150) <= 1) && a(60, 320, 150) < a(120, 320, 150) && a(300, 320, 150) < a(200, 320, 150));
  check('C  the fade-in is about 150 ms', J('CAMPFIRE.fadeIn') >= 120 && J('CAMPFIRE.fadeIn') <= 180);
  g.run('window.__P = campFireNew(); campFireHear(__P, __C, { type: "turret", x: 0, y: 0, tx: 400, ty: 0 }, 0)');
  const alive = paint(200);
  const gone = paint(5000);
  check('C  a volley is drawn while it lives', alive > 0, alive);
  check('C  after its life it is not drawn and its slot is free again', gone === 0 && J('__P.slots.filter(s => s.on).length') === 0);
});

sec('D', () => {
  g.run('window.__P = campFireNew(); __C.lasers = []; __C.rockets = []; __C.bullets = []');
  const W = J('CAMPMAP.color.wing'), R = J('CAMPMAP.color.alien');
  g.run(`__C.bullets = [ { x: 100, y: 50, vx: 600, vy: 0, team: 'earth', rot: 0 }, { x: 120, y: 60, vx: 600, vy: 0, team: 'earth', rot: 0 }, { x: 300, y: 80, vx: -400, vy: 0, team: 'alien', rot: 3.1 }, { x: 320, y: 90, vx: -400, vy: 0, team: 'alien', rot: 3.1 },
    { x: 150, y: 150, vx: 700, vy: 0, team: 'earth', rot: 0, pd: true }, { x: 99999, y: 99999, vx: 1, vy: 0, team: 'alien', rot: 0 } ]`);
  paint(0);
  let c = calls(); const lines = c.filter(x => x.op === 'line'), styles = c.filter(x => x.op === 'lineStyle');
  check('D  the guns\' and the enemy\'s bullets are short lines (two of each; the turret shots are the volleys\' and the one out of the frame draw none)', lines.length === 4, lines.length);
  check('D  friend and foe colours: the wing\'s in its green, the enemy\'s in red', styles.filter(s => s.c === W).length >= 1 && styles.filter(s => s.c === R).length >= 1);
  check('D  a bullet\'s line is short: a few pixels, never a long streak', lines.every(l => Math.hypot(l.x1 - l.x0, l.y1 - l.y0) <= 16 && Math.hypot(l.x1 - l.x0, l.y1 - l.y0) >= 2));
  g.run(`__C.bullets = []; __C.rockets = [ { id: 'm1', x: 200, y: 100, vx: 500, vy: 0, rot: 0 } ]`); paint(0); c = calls();
  check('D  a missile is a dot with a short trail', c.filter(x => x.op === 'dot').length === 1 && c.filter(x => x.op === 'line').length === 1);
  g.run(`__C.rockets = []; __C.lasers = [ { from: 'carrier', to: 'r1', kind: 'rock', since: 4900 }, { from: 'carrier', to: 'a1', kind: 'alien', since: 4900 } ]`); paint(0); c = calls();
  const ls = c.filter(x => x.op === 'line');
  check('D  a mining laser is a steady line from the ship to the rock (the carrier\'s pulses at an alien are the volleys\')', ls.length === 1 && Math.abs(ls[0].x0 - (100 + 400 + 0)) < 1 && Math.abs(ls[0].x1 - (100 + 400 + 300 * 0.2)) < 1, JSON.stringify(ls));
  g.run(`__C.lasers = [ { from: 'carrier', to: 'r1', kind: 'rock', since: 5000 - 40 } ]`); paint(0); const a1 = calls().filter(x => x.op === 'lineStyle').map(x => x.a);
  g.run(`__C.lasers = [ { from: 'carrier', to: 'r1', kind: 'rock', since: 5000 - 400 } ]`); paint(0); const a2 = calls().filter(x => x.op === 'lineStyle').map(x => x.a);
  check('D  a beam that has just begun is fainter than one that has been on for a while (it fades in)', Math.max(...a1) < Math.max(...a2) && Math.max(...a2) >= 0.9, JSON.stringify([a1, a2]));
  g.run(`__C.lasers = [ { from: 'gone', to: 'r1', kind: 'rock', since: 4000 }, { from: 'carrier', to: 'nowhere', kind: 'rock', since: 4000 } ]`);
  check('D  a beam whose ship or rock is gone draws nothing and does not fail', paint(0) === 0);
});

sec('E', () => {
  g.run('window.__P = campFireNew(); __C.lasers = []; __C.rockets = []; __C.bullets = []');
  g.run(`campFireHear(__P, __C, { type: 'turret', x: 0, y: 0, tx: 400, ty: 0 }, 0); campFireHear(__P, __C, { type: 'boom', x: 100, y: 0, big: true, kind: 'mother' }, 0); campFireHear(__P, __C, { type: 'hit', id: 'a1', x: 400, y: 0 }, 0);
    __C.bullets = [ { x: 100, y: 50, vx: 600, vy: 0, team: 'earth', rot: 0 } ]; __C.rockets = [ { id: 'm1', x: 200, y: 100, vx: 500, vy: 0, rot: 0 } ]; __C.lasers = [ { from: 'carrier', to: 'r1', kind: 'rock', since: 0 } ];`);
  paint(200); const c = calls();
  check('E  no line is fatter than 2 px (a thin map, never fat)', c.filter(x => x.op === 'lineStyle').every(x => x.w > 0 && x.w <= 2), JSON.stringify(c.filter(x => x.op === 'lineStyle').map(x => x.w)));
  check('E  every ring is small (a brief ring, never a disc over the map)', c.filter(x => x.op === 'ring').every(x => x.r <= 30));
  const F = J('__F'), inside = (x, y) => x >= F.x - 0.01 && x <= F.x + F.w + 0.01 && y >= F.y - 0.01 && y <= F.y + F.h + 0.01;
  check('E  everything drawn is inside the map\'s frame', c.filter(x => x.op === 'line').every(l => inside(l.x0, l.y0) && inside(l.x1, l.y1)) && c.filter(x => x.op === 'dot' || x.op === 'ring').every(d => inside(d.x, d.y)));
  g.run('window.__P = campFireNew(); __C.lasers = []; __C.rockets = []; __C.bullets = []; campFireHear(__P, __C, { type: "turret", x: 0, y: 0, tx: 40000, ty: 0 }, 0)'); paint(200);
  const cut = calls().filter(x => x.op === 'line');
  check('E  a volley that runs off the map is cut at the frame, not drawn past it', cut.length === 1 && cut[0].x1 <= F.x + F.w + 0.01 && cut[0].x1 > F.x + F.w - 2, JSON.stringify(cut));
  g.run('window.__P = campFireNew(); campFireHear(__P, __C, { type: "turret", x: 90000, y: 90000, tx: 90500, ty: 90000 }, 0)');
  check('E  a volley wholly outside the frame draws nothing', paint(200) === 0);
  g.run('window.__P = campFireNew(); __C.bullets = []; for (let i = 0; i < 1000; i++) __C.bullets.push({ x: i % 400, y: (i * 7) % 300, vx: 500, vy: 0, team: i % 2 ? "alien" : "earth", rot: 0 });');
  paint(0);
  check('E  a thousand bullets in the air draw no more than the cap', calls().filter(x => x.op === 'line').length <= J('CAMPFIRE.bullets') && J('CAMPFIRE.bullets') <= 200);
  check('E  no pool (the map has not made one): nothing drawn, no error', J('(__calls.length = 0, campFirePaint(null, __C, __G, __F, __fit, 0))') === 0);
});

sec('F', () => {
  const src = read('src/campmapfire.js');
  const body = name => { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = src.indexOf('{', i); const k = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(k, j + 1); };
  const per = ['campFirePaint', 'cfLine', 'cfClip', 'cfX', 'cfY', 'campFireAlpha'].map(f => [f, body(f)]);
  const bad = per.filter(([, b]) => !b || /\.map\(|\.filter\(|\.forEach\(|\.find\(|=>|\bnew\b|Object\.assign|\.slice\(|\.concat\(|\.push\(|\bfunction\b|=\s*\{|\(\s*\{|=\s*\[|\(\s*\[|return \[|return \{/.test(b)).map(([f]) => f);
  check('F  the painting code (campFirePaint, cfLine, cfClip, cfX, cfY, campFireAlpha) has no array, object, closure, new or iterator call: nothing is allocated per frame', bad.length === 0, bad.join(','));
  const hear = body('campFireHear');
  check('F  an event reuses a slot of the pool: campFireHear makes no object either', hear.length > 0 && !/\bnew\b|Object\.assign|\.push\(|=\s*\{|=\s*\[/.test(hear.replace(/return false;/g, '')));
});

sec('G', () => {
  check('G  src/campmapfire.js is a script of index.html, after the map\'s own', /<script src="src\/campmapdraw\.js"><\/script>[\s\S]*<script src="src\/campmapfire\.js"><\/script>/.test(read('index.html')));
  const d = read('src/campmapdraw.js');
  check('G  the map makes the pool when it opens (mp.fire) and paints it after the marks', /mp\.fire = campFireNew\(\)/.test(d) && d.indexOf('campFirePaint(') > d.indexOf('const marks = campMapMarks') && d.indexOf('campFirePaint(') < d.indexOf('// ---- navigate'));
  const sc = read('src/campaignscene.js');
  check('G  the scene gives the pool the battle events only while the map is open', /this\.mp[^\n]*campFireHear\(|campFireHear\([^\n]*\n?[^\n]*this\.mp/.test(sc) && /campFireHear\(this\.mp\.fire, this\.camp, e/.test(sc));
  check('G  the map is not painted when it is closed: campFirePaint is only called from campMapPaint, which returns with no map', /function campMapPaint\(s, time\) \{\n  const mp = s\.mp; if \(!mp\) return;/.test(d));
  check('G  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
});
console.log(failed ? `CAMP MAP FIRE FAIL (${failed} of ${n})` : `CAMP MAP FIRE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);

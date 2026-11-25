// How often does a missile fired with the missile key hit? (card space-game-missiles-miss, Troy, 24 Nov 2026: "missiles fired with M often miss")
// A node-only measurement, no Chrome: one enemy of a kind is put at a range from the carrier, the missile key is pressed (the target either picked
// first, or none picked so the key picks the nearest), and the battle runs 12 s. A HIT is a missile that went off within its blast of the target and
// hurt it; a MISS is anything else (it flew on, ran out of fuel, went off on another ship, or was not fired at all). The enemy keeps its own AI.
//   node tools/missile-hitrate.mjs                         this checkout
//   node tools/missile-hitrate.mjs --root /path/to/tree    another tree (git archive of an older tag): the same questions, the key read from its table
//   node tools/missile-hitrate.mjs --n 12 --json
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(arg('root', resolve(here, '..')));
const N = +arg('n', 10), KINDS = (arg('kinds', 'skiff,raider,drone,cutter,gunship,brute,tower,mother')).split(','), RANGES = (arg('ranges', '600,1200,1800,2300')).split(',').map(Number), JSON_OUT = args.includes('--json');
const { nodeGame } = await import(pathToFileURL(ROOT + '/tests/nodegame.mjs').href);
const g = nodeGame({ root: ROOT, store: new Map() });
g.run(`window.__trial = (kind, range, mode, seed) => {
  const C = campNew('home', [], { seed, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); campOrder(C, 'launch');
  for (let i = 0; i < 150; i++) campStep(C, 1 / 30);
  C.ships = C.ships.filter(u => u.team !== 'alien' && u.kind !== 'fighter'); C.bullets.length = 0; // the pilots and the turrets do not help: only the missile hurts it
  const a = (seed * 2.399) % 6.283, t = campSpawn(C, kind, C.carrier.x + Math.cos(a) * range, C.carrier.y + Math.sin(a) * range);
  if (!t) return null;
  const hp0 = t.hp; C.missiles = 6; C.nextRocket = 0; C.events.length = 0; const P = campPanelNew();
  if (mode === 'picked') C.tgt = t.id;
  const r = campPanelKey(P, C, campKeyCodes('missile')[0], 100000);
  const fired = C.rockets.length > 0; if (!fired) return { fired: false, hit: false, say: r.say || '' };
  let hit = false, boom = false, fizzle = false, tt = 0;
  for (let i = 0; i < 360 && !boom && !fizzle; i++) {
    campStep(C, 1 / 30); tt = (i + 1) / 30;
    C.events.forEach(e => { if (e.type === 'mboom') { boom = true; if (Math.hypot(e.x - t.x, e.y - t.y) <= e.r + t.r) hit = true; } if (e.type === 'mfizzle') fizzle = true; }); C.events.length = 0;
  }
  return { fired: true, hit: hit && (t.hp < hp0 || t.hp <= 0), boom, fizzle, tt, say: r.say || '', picked: C.tgt === t.id };
};`);
const rows = [];
for (const mode of ['picked', 'auto']) for (const kind of KINDS) for (const range of RANGES) {
  let fired = 0, hit = 0, n = 0, tsum = 0, say = '';
  for (let s = 1; s <= N; s++) { const r = g.run(`JSON.stringify(__trial(${JSON.stringify(kind)}, ${range}, ${JSON.stringify(mode)}, ${s}))`); const o = JSON.parse(r); if (!o) { n = -1; break; } n++; if (o.fired) fired++; if (o.hit) { hit++; tsum += o.tt; } if (!o.fired && o.say) say = o.say; }
  if (n < 0) continue;
  rows.push({ mode, kind, range, n, fired, hit, rate: fired ? +(hit / n).toFixed(2) : 0, secs: hit ? +(tsum / hit).toFixed(1) : 0, say });
}
if (JSON_OUT) console.log(JSON.stringify(rows));
else {
  console.log('missile hit rate: ' + ROOT + '  (' + N + ' shots per row; hit = the missile went off at the target and hurt it; fired = the key fired one)');
  console.log('mode    kind      ' + RANGES.map(r => String(r).padStart(9)).join(''));
  for (const mode of ['picked', 'auto']) for (const kind of KINDS) { const rr = rows.filter(r => r.mode === mode && r.kind === kind); if (!rr.length) continue; console.log(mode.padEnd(8) + kind.padEnd(10) + RANGES.map(R => { const r = rr.find(x => x.range === R); return r ? (Math.round(r.hit / r.n * 100) + '%/' + Math.round(r.fired / r.n * 100)).padStart(9) : ''.padStart(9); }).join('')); }
  console.log('(each cell: hits % / fired %)');
}

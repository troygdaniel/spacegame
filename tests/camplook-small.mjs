// smoke: the fighters and escorts are drawn as small grey and bronze ships to match the cruiser (src/campcruiser.js): muted, no neon, inside their picture, nothing red (the aliens are red), a pale canopy or a lit window to say "ours" (plain Node, no Chrome)
// Card space-game-campaign-look: "fighters and escorts: matching muted colours, still easy to tell from aliens in a crowd". The drawings are run on a recording stand-in for the Phaser Graphics; what they LOOK like in a crowd is for the pictures
// (tools/campshots.mjs, the melee) and the blind critic (docs/CRITIC.md).
// Run: node tests/camplook-small.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`window.__rec = fn => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => (...a) => { ops.push([name].concat(a)); return gfx; } }); window[fn](gfx); return ops; };`);
const H = J('CAMP_HULL'), A = J('CAMP_ART');
const hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };
const palette = new Set([...H.steel, ...H.bronze, H.dark, H.edge, H.window, H.glass, H.bay, H.engine, H.hot, 0xffffff]);

[['fighter', 'campFighterDraw', 'a fighter'], ['escort', 'campEscortDraw', 'an escort']].forEach(([kind, fn, what]) => {
  console.log(what);
  const ops = J(`__rec('${fn}')`), [W, Ht] = J(`campArtSize('${kind}')`), a = A[kind], k = a.k;
  check(what + ': it draws only with fills, plain lines and paths', [...new Set(ops.map(o => o[0]))].every(n => ['fillStyle', 'lineStyle', 'fillRect', 'fillCircle', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath', 'lineBetween'].includes(n)));
  check(what + ': the picture is its length plus a margin each side, k times the units', W === Math.round((a.len + 2 * a.pad) * k) && Ht === Math.round((2 * a.half + 2 * a.pad) * k), W + ' x ' + Ht);
  const out = []; ops.forEach(([n, ...p]) => { const inside = (x, y) => x >= -0.5 && y >= -0.5 && x <= W + 0.5 && y <= Ht + 0.5; if (n === 'fillRect' && !(inside(p[0], p[1]) && inside(p[0] + p[2], p[1] + p[3]))) out.push([n, ...p]); if (n === 'fillCircle' && !(inside(p[0] - p[2], p[1] - p[2]) && inside(p[0] + p[2], p[1] + p[2]))) out.push([n, ...p]); if ((n === 'moveTo' || n === 'lineTo') && !inside(p[0], p[1])) out.push([n, ...p]); if (n === 'lineBetween' && !(inside(p[0], p[1]) && inside(p[2], p[3]))) out.push([n, ...p]); });
  check(what + ': every mark lies inside the picture', out.length === 0, out.length + ' outside, first ' + JSON.stringify(out[0]));
  const used = new Set(); ops.forEach(([n, x, y]) => { if (n === 'fillStyle') used.add(x); if (n === 'lineStyle') used.add(y); });
  check(what + ': only the colours of the palette (CAMP_HULL)', [...used].every(c => palette.has(c)), [...used].filter(c => !palette.has(c)).map(c => c.toString(16)).join(' '));
  check(what + ': nothing red or pink (the aliens are): no colour of it has a hue from 330 to 15 degrees with saturation over 0.3, and nothing cyan or blue (hue 160 to 260, saturation over 0.25)', [...used].every(c => { const x = hsv(c); return !((x.h >= 330 || x.h <= 15) && x.s > 0.3) && !(x.h >= 160 && x.h <= 260 && x.s > 0.25); }));
  const lines = ops.filter(o => o[0] === 'lineStyle').map(o => o[1] / k);
  check(what + ': no thick edge: every line under 1 unit wide, and every outline is the dark edge colour', lines.every(w => w <= 1) && ops.every((o, i) => o[0] !== 'strokePath' || (() => { for (let j = i - 1; j >= 0; j--) if (ops[j][0] === 'lineStyle') return ops[j][2] === H.edge; return false; })()));
  let fc = 0, fa = 1; const halos = []; ops.forEach(([n, a, b, r]) => { if (n === 'fillStyle') { fc = a; fa = b === undefined ? 1 : b; } if (n === 'fillCircle' && r > 1.5 * k) halos.push({ c: fc, a: fa }); });
  check(what + ': a faint glow only: every circle over 1.5 units is a halo (alpha 0.15 or less) in the pale light colour or the engine colour, five at most (the lights and the two engines)', halos.length >= 3 && halos.length <= 5 && halos.every(h => h.a <= 0.15 && (h.c === H.glass || h.c === H.engine)), JSON.stringify(halos.map(h => h.c.toString(16) + '/' + h.a)));
  check(what + ': what says "ours": the pale canopy (fighter) or the lit window (escort) is drawn', used.has(kind === 'fighter' ? H.glass : H.window));
  const look = J(`campArtLook('${kind === 'fighter' ? 'fighter' : 'escort'}', '${kind}')`);
  check(what + ': the scene scales it to the table length: hull ' + a.len + ' px (CAMP.size.' + kind + '.len)', Math.abs(look.scale * look.w - J(`CAMP.size.${kind}.len`)) < 1e-9 && look.w === a.len * k && look.art === kind, JSON.stringify(look));
  const hit = J(`CAMP.size.${kind}.hit`);
  check(what + ': the hit circle (' + hit + ' px) is inside the drawn ship: about half its half-length, and well inside the width over the wings', hit <= a.len / 2 * 0.62 && hit < a.half, hit + ' of ' + a.len / 2);
});
check('the cruiser, the fighter and the escort are all in the scene\'s look table as the Campaign\'s own pictures', ['carrier', 'fighter', 'escort'].every(kind => J(`CAMP_LOOK.${kind}.art`) !== null));
const tex = J(`(() => { const made = {}; const sc = { textures: { exists: k => !!made[k] }, make: { graphics: () => { const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = [w, h]; } : () => g }); return g; } } }; return ['cruiser', 'fighter', 'escort'].map(k => [campShipTexture(sc, k), made['camp-' + k]]); })()`);
check('campShipTexture makes each under its own key (camp-cruiser, camp-fighter, camp-escort) at the size campArtSize says', tex.every(([key, size], i) => key === 'camp-' + ['cruiser', 'fighter', 'escort'][i] && size && size[0] === J(`campArtSize('${['cruiser', 'fighter', 'escort'][i]}')`)[0]), JSON.stringify(tex));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);

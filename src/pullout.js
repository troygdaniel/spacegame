// ---------- The pull-out: pirates drag a ship out of the tunnel (docs/UNIVERSE.md 5.2; card u-e2) ----------
// The whole thing, in the order the player lives it:
//   roll        jump.js asks pullRoll(from, to) the moment a jump goes: 2% + 1% x the higher danger of the two systems (3% between two quiet ones, 7% when
//               one is a nest). A hit gives { at, danger }: how far along the tunnel it happens (40 to 70%) and how big the ambush is
//   tunnel      the Hyper scene (src/hyperspace.js) gets it as `pull`: at that point the tunnel flickers, an alarm sounds, the rings collapse, and the
//               scene hands over to Space with { from: 'pullout', deep }
//   deep space  the Space scene reads G.deep (src/universe.js: deepSystem) as the current system: an empty one, 16000 px, a dark tint, no station or planet, no
//               timed pirates; deepSetup() places 3 to 5 pirates ahead of the ship (3 at danger 1 to 2, 4 at 3 to 4, 5 at 5), all of them engaged at once.
//               No docking (nothing to dock at), no cruise (cruise.js) and no jump (jump.js): the drive is spent
//   win         the last pirate dies: "Clear", a few seconds to pick up the salvage, then deepResume() starts the Hyper scene again for the time that was left
//               (secs, frac0), with the same destination, and the arrival is the ordinary one. The fuel was burned when the jump went and is not refunded
//   lose        the usual insurance flow (space.js die): you wake at the last station you docked at, G.system is the system that station is in
//   nests       a system of kind 'nest' (or one with `entry: n`) has pirates waiting where you come out of the tunnel: entrySetup()
// Not saved: G.deep lives only while the Space scene shows deep space. A page closed in deep space reloads docked at the last station (the fuel is gone).
// The test hash index.html#pullout plays the whole thing without waiting for a 3% roll (src/boot.js).
const PULL = {
  base: 0.02, perDanger: 0.01,   // the chance per jump: base + perDanger x max(danger of the two systems)
  at: [0.4, 0.7],                // how far along the tunnel (a fraction of its time) the rings collapse
  size: [3, 5],                  // pirates in deep space: smallest and largest
  gap: [1100, 1500],             // px between the ship and each pirate when deep space opens
  resumeMs: 4000,                // after the last pirate: time to pick up salvage before the tunnel re-forms
  minLeft: 3,                    // seconds of tunnel that are always left to resume (a collapse at 70% of a 6 s tunnel leaves 1.8)
  nest: 3,                       // pirates waiting at the entry point of a nest
  rnd: Math.random               // the dice; tests swap it
};

const pullDangerOf = id => (SYSTEMS[id] && SYSTEMS[id].danger) || 1;
const pullDanger = (a, b) => Math.max(pullDangerOf(a), pullDangerOf(b));
const pullChance = (a, b) => PULL.base + PULL.perDanger * pullDanger(a, b);
const pullPirates = danger => Phaser.Math.Clamp(PULL.size[0] + Math.floor((danger - 1) / 2), PULL.size[0], PULL.size[1]);

// the roll for one jump: null for a clean tunnel, or { at, danger }
function pullRoll(from, to) {
  if (PULL.rnd() >= pullChance(from, to)) return null;
  return { at: PULL.at[0] + (PULL.at[1] - PULL.at[0]) * PULL.rnd(), danger: pullDanger(from, to) };
}

// what the Hyper scene hands to deep space: everything deepResume() needs to start the tunnel again where it left off
function pullRecord(d, pull, dur) {
  return {
    danger: pull.danger, at: pull.at, left: Math.max(PULL.minLeft, dur * (1 - pull.at)), // seconds of tunnel still to run
    dest: d.dest, ly: d.ly, fuel: d.fuel, tank: d.tank, demo: !!d.demo, next: d.next || 'Space', nextData: d.nextData || null
  };
}

// pirates placed round a point, all engaged at once (d.ambush: not held back by the launch grace or the first-wave cap, as in cruise interdiction)
function pullAmbush(s, cx, cy, facing, n, danger, spread) {
  const w = pirateTable({ danger }).weights, ship = s.ship, out = [];
  for (let i = 0; i < n; i++) {
    const a = facing + (i - (n - 1) / 2) * spread + (PULL.rnd() - 0.5) * 0.25, r = PULL.gap[0] + (PULL.gap[1] - PULL.gap[0]) * PULL.rnd();
    const x = Phaser.Math.Clamp(cx + Math.cos(a) * r, 200, s.WS - 200), y = Phaser.Math.Clamp(cy + Math.sin(a) * r, 200, s.WS - 200);
    const d = spawnPirate(s, x, y, pickPirateType(w, PULL.rnd())); // src/enemies.js
    d.ambush = true; d.rotation = Math.atan2(ship.y - y, ship.x - x);
    out.push(d);
  }
  return out;
}

// space.js calls this once in create(): deep space opens, or a nest's entry pirates are placed
function deepSetup(s) {
  const dp = G.deep;
  if (!dp) { entrySetup(s); return; }
  s.deep = { won: false, n: 0 };
  s.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x14000a, 0.4).setScrollFactor(0).setDepth(-7); // the dark tint, over the far stars
  s.deep.n = pullAmbush(s, s.ship.x, s.ship.y, s.ship.rotation, pullPirates(dp.danger), dp.danger, 0.7).length;
  toast(s, 'Pulled out of hyperspace: ' + s.deep.n + ' pirates. Clear them and the tunnel re-forms.', '#ff4d6d');
  s.cameras.main.shake(400, 0.007);
}
// a nest (or any system with `entry`) has pirates waiting at the entry point
function entrySetup(s) {
  const sys = sysDef(), n = sys.entry != null ? sys.entry | 0 : sys.kind === 'nest' ? PULL.nest : 0;
  if (!s.jumped || n <= 0) return;
  pullAmbush(s, s.ship.x, s.ship.y, s.ship.rotation, n, sys.danger | 0 || 1, 0.5);
}

// once a frame in space (space.js): the last pirate gone starts the countdown back into the tunnel
function deepFrame(s) {
  const dp = G.deep, d = s.deep;
  if (!dp || !d || d.won || s.dead || s.leaving || s.enemies.countActive() > 0) return;
  d.won = true;
  toast(s, 'Clear. The tunnel re-forms in ' + Math.round(PULL.resumeMs / 1000) + ' s.', '#6dff9c'); sfx('chime');
  s.time.delayedCall(PULL.resumeMs, () => deepResume(s));
}
function deepResume(s) {
  const dp = G.deep;
  if (!dp || s.dead || s.leaving) return;
  go(s, 'Hyper', { dest: dp.dest, ly: dp.ly, fuel: dp.fuel, tank: dp.tank, secs: dp.left, frac0: dp.at, demo: dp.demo, next: dp.next, nextData: dp.nextData });
}

// what boot.js passes for #pullout: a demo tunnel of 6.3 ly that is pulled out at 50% with the danger-3 ambush (hyperDemo is src/hyperspace.js)
function pulloutDemo() { return Object.assign(hyperDemo(), { pull: { at: 0.5, danger: 3 } }); }

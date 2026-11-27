// ---------- The cruiser SLOWLY MENDS the fighter you fly (card space-game-b12-c8-cruiser-mends-slow; BRIEF 12 chunk 8; Troy, 27 Nov 2026: yes, but slow so it is not overpowered) ----------
// While the player flies a pilot's fighter (src/campcockpit.js, C key) and it is within CAMP.mend.range (700 px) of the living cruiser, the cruiser mends its hull by CAMP.cockpit.mend percent of the flown hull a second
// (2.5: a whole hull takes 40 s, so a hurt fighter goes back to the cruiser for most of a minute; it is not a heal in the middle of a fight). It is free (no ore: the ore is for the mends you order, src/campmend.js) and it
// stops the moment the fighter is full, out of range, or the stick is handed back (a fighter handed back goes to the bay as it always did: src/camprepair.js). 0 turns it off: the fighter is exactly the one of before.
// The tell is quiet: a thin pale-blue tether from the cruiser to the fighter while it mends, no words and no sound. C.cockpit.mending is the share of the hull mended in the last step (0: not mending), for the scene and the tests.
// The rate is the N panel's slider (group cockpit, row cockpitmend). Pure: no Phaser, except the scene's half at the bottom. tests/campcockpitmend.mjs.
//   campCockpitMendRate(C)        percent of the flown hull a second now: the table's number when a fighter is flown and the cruiser lives, else 0
//   campCockpitMendNear(C)        the flown fighter if it is hurt and within range of the cruiser, else null
//   campCockpitMendTick(C, dt)    once a step from campCockpitStep: gives the hull its share; sets C.cockpit.mending
//   campCockpitMendSync(scene)    the scene half: the pale-blue tether, called by campaignscene every frame
const CAMP_COCKPIT_MENDDRAW = { line: 1.5, alpha: 0.55, pulse: 0.2, color: 0x9fe9ff, depth: 3 }; // the tether's line on the SCREEN (px), its alpha, how much the alpha breathes (a slow pulse, none under reduced motion), the colour of the mend's other words (the REPAIR line), under the ships (4 and 5)

const campCockpitMendRate = C => {
  const S = C && C.cockpit, r = +CAMP.cockpit.mend || 0;
  return S && r > 0 && C.carrier && C.carrier.hp > 0 && !C.result ? r : 0;
};

function campCockpitMendNear(C) {
  const S = C && C.cockpit, u = S && C.by ? C.by[S.id] : null;
  if (!u || u.hp <= 0 || !(u.maxHp - u.hp > 0.01) || !C.carrier || C.carrier.hp <= 0) return null;
  return campDist(u, C.carrier) <= CAMP.mend.range ? u : null;
}

function campCockpitMendTick(C, dt) {
  const S = C && C.cockpit; if (!S) return;
  const r = campCockpitMendRate(C), u = r > 0 ? campCockpitMendNear(C) : null;
  if (!u) { S.mending = 0; return; }
  const give = Math.min(u.maxHp - u.hp, u.maxHp * r / 100 * dt);
  u.hp += give; S.mending = give / u.maxHp;
}

// the scene's half: one thin pale-blue line from the cruiser to the fighter while it mends. It breathes slowly (alpha) so it reads as a flow, and holds still under reduced motion. Only while a fighter is flown.
function campCockpitMendSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, V = scene.hud; if (!C || !cam || !V) return;
  const S = scene.mode === 'play' && !scene.mp && C.cockpit && C.cockpit.mending > 0 ? C.cockpit : null, u = S && C.by ? C.by[S.id] : null;
  let g = V.mendTether; if (!S || !u || !C.carrier) { if (g && g.visible) { g.clear(); g.setVisible(false); } return; }
  if (!g || (g.active === false && !g.scene)) g = V.mendTether = scene.add.graphics().setDepth(CAMP_COCKPIT_MENDDRAW.depth);
  const K = CAMP_COCKPIT_MENDDRAW, z = cam.zoom > 0 ? cam.zoom : 1, still = typeof campCamReduced === 'function' && campCamReduced();
  const a = K.alpha * (still ? 1 : 1 - K.pulse + K.pulse * Math.sin((C.t || 0) / 1000 * 2.4));
  g.clear(); g.setVisible(true);
  g.lineStyle(K.line / z, K.color, Math.max(0.2, a)).lineBetween(C.carrier.x, C.carrier.y, u.x, u.y);
}

// ---------- The jump: G opens the galaxy map, Enter charges, the tunnel carries you, the ship comes out in another system (docs/UNIVERSE.md 2.3; card u-b4) ----------
// The whole trip, in the order the player lives it:
//   G            in space the galaxy map (src/galaxymap.js) opens over the paused flight; docked it opens read-only: you plan from the bar, you do not leave from it
//   Enter        on a star the ship can reach: the map closes and the CHARGE starts: a ring fills round the ship for 4 s, the camera creeps in
//   cancel       Esc, S (brake) or any hit empties the ring and costs nothing
//   locked       no charge starts inside 2000 px of a station or planet ("too close to the mass: fly clear") or with a hostile within 1500 px ("hostiles near")
//   complete     the fuel is burned NOW (a pull-out later does not refund it), the Hyper scene (src/hyperspace.js) opens OVER the frozen flight (no cut, no fade to
//                black) and plays the tunnel for ly x 1.6 s, then the Space scene starts again under a white flash with { from: 'jump', to, origin }: enterSystem() in src/universe.js picks the system, the entry point and the calm
//   F            in a system with no pump and a nearly empty tank: call the fuel ranger (src/fuel.js): 45 s, 10 units (more for a heavy ship), three times the home price
//   space.js     calls jumpFrame(this, dt) first thing in update() and jumpCancel(this, 'hit') when the ship is hurt; meta.js asks jumpEscape(game) before it opens the pause menu
//   tests        tests/jump.mjs runs it all on a stepped clock; JUMP.charge is the knob
const JUMP = { charge: 4000, lockMass: 2000, lockHostile: 1500, zoom: 1.1, ring: 52 }; // ms, px, px, camera zoom at the end of the charge, ring radius
const JUMPST = { closedAt: 0 }; // performance.now() when the galaxy map last closed (galaxymap.js): G closes it too, and must not open it again in the same keypress
const JUMP_WHY = { // what the toast says when a charge ends early
  brake: 'Jump cancelled: you braked.', esc: 'Jump cancelled.', hit: 'Jump cancelled: the ship was hit.', map: 'Jump cancelled.'
};

// why the ship cannot start a charge right now, as the words the player reads, or null when it can
function jumpLock(s) {
  if (!s || s.dead || s.leaving || s.cruising || G.deep) return 'not now';
  const near = sysBodies().find(b => (b.type === 'station' || b.type === 'planet') && Math.hypot(b.x - s.ship.x, b.y - s.ship.y) < JUMP.lockMass);
  if (near) return 'Too close to the mass: fly clear of ' + near.name + ' to jump.';
  const hostile = s.enemies.getChildren().some(e => e.active && Math.hypot(e.x - s.ship.x, e.y - s.ship.y) < JUMP.lockHostile);
  return hostile ? 'Hostiles near: no jump.' : null;
}

// G: the galaxy map over the scene you are in (Space: it can jump; Station: it only shows). The scene waits underneath until the map closes.
function jumpMapOpen(game) {
  if (game.scene.isActive('Galaxy') || game.scene.isActive('Pause') || game.scene.isActive('Overlay') || performance.now() - JUMPST.closedAt < 250) return false;
  const s = game.scene.getScenes(true).find(sc => sc.scene.key === 'Space' || sc.scene.key === 'Station');
  if (!s || s.leaving || s.dead || s.panel || s.talk || s.cruising || (s.cr && s.cr.navOpen) || s.jmp) return false; // a terminal, the nav list, a charge or a fade is up: G waits
  if (G.deep) { toast(s, 'The jump drive is spent. Clear the pirates and the tunnel re-forms.', '#ffb454'); return false; } // deep space after a pull-out (src/pullout.js)
  const key = s.scene.key;
  s.scene.pause();
  game.scene.run('Galaxy', { from: key, onJump: key === 'Space' ? (id, j) => jumpPick(s, id, j) : null });
  return true;
}
// Enter on a star in the map: close it, give the flight back, then charge unless something is in the way
function jumpPick(s, id, j) {
  const game = s.game;
  game.scene.stop('Galaxy'); s.scene.resume('Space');
  const dest = galaxyFind(id);
  if (!Object.prototype.hasOwnProperty.call(SYSTEMS, id)) { toast(s, 'No route charted to ' + (dest ? dest.name : id) + ' yet.', '#ffb454'); beep(180, 0.12, 'square', 0.03); return false; } // on the map, but the game has no system to arrive in (card u-b5 authors them)
  const why = jumpLock(s);
  if (why) { toast(s, why, '#ffb454'); beep(180, 0.12, 'square', 0.03); return false; }
  jumpStart(s, id, j);
  return true;
}
function jumpStart(s, id, j) {
  const dest = galaxyFind(id); // src/galaxymap.js: the system's row, from SYSTEMS or the stub
  s.jmp = { to: id, name: dest ? dest.name : id, ly: j.ly, cost: j.cost, t: 0, g: s.add.graphics().setDepth(6), label: s.add.text(0, 0, '', uiFont(13, '#9fe9ff', { fontStyle: 'bold' })).setOrigin(0.5).setDepth(6), beepAt: 0 };
  s.cameras.main.zoomTo(JUMP.zoom, JUMP.charge, 'Sine.easeIn', true);
  toast(s, 'Charging the jump to ' + s.jmp.name + '. S or Esc cancels.', '#9fe9ff');
}

// space.js calls this once in create(): the key for the fuel ranger and its line of text (a fixed text low on the screen, hidden unless it has something to say)
function jumpSetup(s) {
  s.jmp = null;
  s.jk = s.input.keyboard.addKeys('F');
  s.rangerTxt = s.add.text(W / 2, H - 86, '', uiFont(15, '#ffd37a', { fontStyle: 'bold' })).setOrigin(0.5).setScrollFactor(0).setDepth(100);
}
// the fuel ranger (src/fuel.js): F calls it when this system has no pump and the tank is nearly dry; it comes 45 s later with 10 units, or what this ship's cheapest jump out needs when that is more (rangerUnits)
function rangerFrame(s) {
  const now = performance.now(), arrived = rangerTick(now);
  if (arrived) { toast(s, 'The fuel ranger is here: +' + fmtFuelUnits(arrived.units) + ' units' + (arrived.cost ? ', -' + arrived.cost + ' cr.' : ', no charge: you are out of credits.'), '#6dff9c'); sfx('chime'); }
  if (G.deep) { s.rangerTxt.setText(''); return; } // deep space after a pull-out: no ranger comes for you here, and F means nothing
  let line = '';
  if (FUELST.rangerAt) line = 'FUEL RANGER ARRIVES IN ' + Math.ceil(Math.max(0, FUELST.rangerAt - now) / 1000) + ' S';
  else if (!fuelSystemHasPump(G.system) && fuelHave() < rangerUnits()) { const q = rangerQuote(); line = 'F  CALL THE FUEL RANGER  (' + fmtFuelUnits(q.units) + ' UNITS, ' + q.cost + ' CR, 45 S)'; }
  s.rangerTxt.setText(line);
  if (s.jk && Phaser.Input.Keyboard.JustDown(s.jk.F)) {
    const r = rangerCall(now);
    if (r.ok) toast(s, 'Fuel ranger called: ' + Math.round(r.eta / 1000) + ' s out, ' + fmtFuelUnits(r.units) + ' units for ' + r.cost + ' cr.', '#9fe9ff');
    else toast(s, r.why === 'called' ? 'The ranger is already on the way.' : r.why === 'pump' ? 'There is a pump here: dock and fill up.' : 'You still hold ' + fmtFuelUnits(fuelHave()) + ' units: the ranger comes for an almost empty tank.', '#ffd37a');
  }
}
const fmtFuelUnits = v => String(Math.round(v * 10) / 10);

// once a frame in space (space.js): the ring fills, then the jump goes
function jumpFrame(s, dt) {
  rangerFrame(s);
  const j = s.jmp; if (!j) return;
  if (s.dead || s.leaving) { jumpCancel(s); return; }
  if (s.k.S.isDown || s.k.DOWN.isDown) { jumpCancel(s, 'brake'); return; }
  j.t += dt;
  const k = Math.min(1, j.t / JUMP.charge), g = j.g, x = s.ship.x, y = s.ship.y;
  g.clear();
  g.lineStyle(2, CYAN, 0.25); g.strokeCircle(x, y, JUMP.ring);
  g.lineStyle(4, k > 0.85 ? 0xffffff : CYAN, 0.95); g.beginPath(); g.arc(x, y, JUMP.ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
  g.fillStyle(CYAN, 0.05 + 0.1 * k); g.fillCircle(x, y, JUMP.ring * (0.4 + 0.6 * k));
  j.label.setPosition(x, y - JUMP.ring - 16).setText('JUMP  ' + j.name.toUpperCase() + '  ' + Math.max(0, (JUMP.charge - j.t) / 1000).toFixed(1));
  if (j.t >= j.beepAt) { j.beepAt = j.t + 260; beep(260 + 700 * k, 0.1, 'sine', 0.025, 40); } // the whine climbs
  if (j.t >= JUMP.charge) jumpGo(s);
}
function jumpCancel(s, why) {
  const j = s.jmp; if (!j) return;
  s.jmp = null; j.g.destroy(); j.label.destroy();
  s.cameras.main.zoomTo(1, 250, 'Sine.easeOut', true);
  if (why && JUMP_WHY[why]) { toast(s, JUMP_WHY[why], '#ffd37a'); beep(220, 0.14, 'sawtooth', 0.03, -80); }
}
// the charge is done: the fuel goes now, the tunnel takes over
function jumpGo(s) {
  const j = s.jmp, rec = activeShip(), from = G.system;
  s.jmp = null; j.g.destroy(); j.label.destroy(); // the camera stays at the charge's zoom: the tunnel opens over this very picture (src/hyperspace.js hyperEnter)
  fuelBurn(j.cost, rec); // src/fuel.js
  missionLeaveSpace(s); // src/missions.js: an escort that is left behind fails
  missionLeaveSystem(s, from); // a call played in the system you are leaving fails with it (a courier or haul is carried out of one)
  const pull = pullRoll(from, j.to); // src/pullout.js: usually null; 2 to 7% of jumps are pulled out of the tunnel
  hyperEnter(s, { dest: j.name.toUpperCase(), ly: j.ly, fuel: j.cost, tank: fuelTank(rec), next: 'Space', nextData: { from: 'jump', to: j.to, origin: from }, pull }); // no cut: the tunnel comes in over the flight
}
// meta.js asks before it opens the pause menu: Esc during a charge cancels the charge and nothing else
function jumpEscape(game) {
  const s = game.scene.getScenes(true).find(sc => sc.scene.key === 'Space');
  if (!s || !s.jmp) return false;
  jumpCancel(s, 'esc'); return true;
}

// G on the keyboard, once, for the whole game (main.js installs it like installMeta and installMap)
function installJump(game) {
  window.addEventListener('keydown', e => {
    if (e.repeat || e.code !== 'KeyG' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return; // typing in a box (the NPC chat, the key paste)
    jumpMapOpen(game);
  });
}

// ---------- The jump: G opens the galaxy map, Enter charges, the tunnel carries you, the ship comes out in another system (docs/UNIVERSE.md 2.3; card u-b4) ----------
// The whole trip, in the order the player lives it:
//   G            in space the galaxy map (src/galaxymap.js) opens over the paused flight; docked it opens read-only: you plan from the bar, you do not leave from it
//   Enter        on a star the ship can reach: the map closes and the CHARGE starts: a ring fills round the ship for 4 s, the camera creeps in
//   cancel       Esc, S (brake) or any hit empties the ring and costs nothing
//   locked       no charge starts with a hostile within 1500 px ("hostiles near"). That is the only lock: you may jump from anywhere in space, right beside
//                a station or a planet included (Troy, 17 Nov 2026, card space-game-jump-from-anywhere: there used to be a 2000 px mass limit to fly clear of first)
//   complete     the fuel is burned NOW (a pull-out later does not refund it), the Hyper scene (src/hyperspace.js) opens OVER the frozen flight (no cut, no fade to
//                black) and plays the tunnel for ly x 1.6 s, then the Space scene starts again under a white flash with { from: 'jump', to, origin }: enterSystem() in src/universe.js picks the system, the entry point and the calm
//   F            in a system with no pump and a nearly empty tank: call the fuel ranger (src/fuel.js): 45 s, 10 units (more for a heavy ship), three times the home price
//   space.js     calls jumpFrame(this, dt) first thing in update() and jumpCancel(this, 'hit') when the ship is hurt; meta.js asks jumpEscape(game) before it opens the pause menu
//   tests        tests/jump.mjs runs it all on a stepped clock; JUMP.charge is the knob
const JUMP = { charge: 4000, lockHostile: 1500, zoom: 1.1, ring: 52 }; // ms, px, camera zoom at the end of the charge, ring radius
const JUMPST = { closedAt: 0 }; // performance.now() when the galaxy map last closed (galaxymap.js): G closes it too, and must not open it again in the same keypress
const JUMP_WHY = { // what the toast says when a charge ends early
  brake: 'Jump cancelled: you braked.', esc: 'Jump cancelled.', hit: 'Jump cancelled: the ship was hit.', map: 'Jump cancelled.'
};

// Can a ship go from one system to another and come home (card space-game-bug-runs-out-of-jump-range)? Pure: it reads only the galaxy's
// light years and which systems have a fuel pump. range: ly of one jump; tank: fuel units; perLy: fuel a light year.
// It looks for a chain of jumps, each inside the range, fewest jumps first, and flies it there and back the same way on a tank that is full at
// the start and filled again in every system with a pump: a system with none (the Hollow, Lethe) means the fuel home comes along.
// Returns { ok, hops: [system ids after `from`], ly } or { ok: false, why: 'range' | 'fuel', hops }.
function jumpReach(from, to, range, tank, perLy) {
  if (!SYSTEMS[from] || !SYSTEMS[to] || !SYSTEMS[from].ly || !SYSTEMS[to].ly) return { ok: false, why: 'range', hops: [] };
  if (from === to) return { ok: true, hops: [], ly: 0 };
  const ids = Object.keys(SYSTEMS).filter(id => SYSTEMS[id].ly), ly = (a, b) => Math.hypot(SYSTEMS[a].ly[0] - SYSTEMS[b].ly[0], SYSTEMS[a].ly[1] - SYSTEMS[b].ly[1]);
  const paths = [], queue = [[from]];
  while (queue.length && paths.length < 24) {
    const p = queue.shift(), last = p[p.length - 1];
    if (last === to) { paths.push(p.slice(1)); continue; }
    if (p.length > 5) continue; // five jumps is across the whole map
    ids.forEach(n => { if (!p.includes(n) && ly(last, n) <= range + 1e-9) queue.push(p.concat(n)); });
  }
  if (!paths.length) return { ok: false, why: 'range', hops: [] };
  const pump = id => (typeof fuelSystemHasPump === 'function' ? fuelSystemHasPump(id) : true);
  const fuelOk = path => {
    const seq = [from].concat(path, path.slice(0, -1).reverse(), [from]); let have = tank;
    for (let i = 0; i + 1 < seq.length; i++) { const need = ly(seq[i], seq[i + 1]) * perLy; if (need > have + 1e-9) return false; have -= need; if (pump(seq[i + 1])) have = tank; }
    return true;
  };
  const good = paths.find(fuelOk);
  if (!good) return { ok: false, why: 'fuel', hops: paths[0] };
  let total = 0, here = from; good.forEach(h => { total += ly(here, h); here = h; });
  return { ok: true, hops: good, ly: total };
}

// ---------- The route plotter (card space-game-route-plotter) ----------
// jumpRoute(from, to, range, tank, perLy, have) plans ONE trip, one way, with the ship's numbers: the chain of jumps with the fewest jumps (then the fewest light years),
// each inside the range, flown on `have` fuel (default a full tank) that is filled again at every system with a pump. Pure: it reads only the galaxy's light years and
// which systems have a pump (the same facts as jumpReach, which answers the round trip a call's board needs). Returns
//   { ok: true, hops: [{ id, ly, fuel, fill }], ly, fuel }   fill: true = fill up in the system you leave before this jump (the tank would not make it otherwise)
//   { ok: false, why: 'range', hops: [{ id, ly }], bottleneck, over }   no chain of jumps is within the range; hops is the chain with the shortest longest-jump (the way
//                                  that would work with a bigger range), bottleneck the longest jump on it in ly, over how much more than the range that is
//   { ok: false, why: 'fuel', hops: [{ id, ly }], needTank }           there is a chain in range, but no pump is near enough to fly it: needTank is the smallest tank that would
//   { ok: false, why: 'none', hops: [] }                               a system the game has no place for
const ROUTE = { maxHops: 6, maxPaths: 600 }; // six jumps is across the whole map; the caps keep a big galaxy cheap
function jumpRoute(from, to, range, tank, perLy, have) {
  const known = id => SYSTEMS[id] && SYSTEMS[id].ly;
  if (!known(from) || !known(to)) return { ok: false, why: 'none', hops: [] };
  if (from === to) return { ok: true, hops: [], ly: 0, fuel: 0 };
  have = have === undefined || have === null ? tank : have;
  const ids = Object.keys(SYSTEMS).filter(known), ly = (a, b) => Math.hypot(SYSTEMS[a].ly[0] - SYSTEMS[b].ly[0], SYSTEMS[a].ly[1] - SYSTEMS[b].ly[1]);
  const pump = id => (typeof fuelSystemHasPump === 'function' ? fuelSystemHasPump(id) : true);
  const link = (r, a, b) => ly(a, b) <= r + 1e-9;
  // the chains with `depth` jumps, every one inside the range (depth first, capped)
  const chains = (r, depth) => {
    const out = [];
    const walk = path => {
      if (out.length >= ROUTE.maxPaths) return;
      const last = path[path.length - 1];
      if (path.length - 1 === depth) { if (last === to) out.push(path.slice(1)); return; }
      if (last === to) return; // reached early: that is a shorter chain
      ids.forEach(n => { if (!path.includes(n) && link(r, last, n)) walk(path.concat(n)); });
    };
    walk([from]);
    return out;
  };
  // the plan of one chain on this tank, or null when the tank cannot fly it
  const plan = path => {
    let fuel = have, prev = from, total = 0, burn = 0; const hops = [];
    for (const id of path) {
      const d = ly(prev, id), need = d * perLy; let fill = false;
      if (need > fuel + 1e-9 && pump(prev)) { fuel = tank; fill = true; }
      if (need > fuel + 1e-9) return null;
      fuel -= need; burn += need; total += d; hops.push({ id, ly: d, fuel: need, fill }); prev = id;
    }
    return { hops, ly: total, fuel: burn };
  };
  let anyInRange = null;
  for (let depth = 1; depth <= ROUTE.maxHops; depth++) {
    const all = chains(range, depth);
    if (all.length && !anyInRange) anyInRange = all;
    let best = null;
    all.forEach(path => { const p = plan(path); if (p && (!best || p.ly < best.ly - 1e-9)) best = p; });
    if (best) return Object.assign({ ok: true }, best);
  }
  const legs = path => { let prev = from; return path.map(id => { const d = ly(prev, id); prev = id; return { id, ly: d }; }); };
  if (anyInRange) { // a chain exists, but the tank cannot fly it: the smallest tank that could is the longest stretch between two pumps, over the best chain
    let need = Infinity;
    anyInRange.forEach(path => {
      let prev = from, stretch = 0, worst = 0;
      path.forEach(id => { stretch += ly(prev, id) * perLy; worst = Math.max(worst, stretch); if (pump(id)) stretch = 0; prev = id; });
      need = Math.min(need, worst);
    });
    return { ok: false, why: 'fuel', hops: legs(anyInRange[0]), needTank: Math.ceil(need * 10) / 10 };
  }
  // no chain in range: the smallest range that would make one (the longest jump of the best chain)
  const lens = []; ids.forEach((a, i) => ids.slice(i + 1).forEach(b => lens.push(ly(a, b)))); lens.sort((x, y) => x - y);
  for (const r of lens) {
    for (let depth = 1; depth <= ROUTE.maxHops; depth++) {
      const all = chains(r, depth);
      if (all.length) { const path = all.sort((x, y) => legs(x).reduce((t, h) => t + h.ly, 0) - legs(y).reduce((t, h) => t + h.ly, 0))[0], hops = legs(path), bottleneck = Math.max(...hops.map(h => h.ly)); return { ok: false, why: 'range', hops, bottleneck, over: Math.max(0, bottleneck - range) }; }
    }
  }
  return { ok: false, why: 'range', hops: [], bottleneck: Infinity, over: Infinity }; // the map has no way there at all
}

// why the ship cannot start a charge right now, as the words the player reads, or null when it can
function jumpLock(s) {
  if (!s || s.dead || s.leaving || s.cruising || G.deep) return 'not now';
  const hostile = s.enemies.getChildren().some(e => e.active && Math.hypot(e.x - s.ship.x, e.y - s.ship.y) < JUMP.lockHostile);
  return hostile ? 'Hostiles near: no jump.' : null;
}

// G: the galaxy map over the scene you are in (Space: it can jump; Station: it only shows). The scene waits underneath until the map closes.
function jumpMapOpen(game, sel) { // sel: the star the card opens on (the job's, from the navigation panel); else the job's star, else the nearest
  if (game.scene.isActive('Galaxy') || game.scene.isActive('Pause') || game.scene.isActive('Overlay') || performance.now() - JUMPST.closedAt < 250) return false;
  const s = game.scene.getScenes(true).find(sc => sc.scene.key === 'Space' || sc.scene.key === 'Station');
  if (!s || s.leaving || s.dead || s.panel || s.talk || s.cruising || (s.cr && s.cr.navOpen) || s.jmp) return false; // a terminal, the nav list, a charge or a fade is up: G waits
  if (G.deep) { toast(s, 'The jump drive is spent. Clear the pirates and the tunnel re-forms.', '#ffb454'); return false; } // deep space after a pull-out (src/pullout.js)
  const key = s.scene.key;
  s.scene.pause();
  game.scene.run('Galaxy', { from: key, sel: sel || null, onJump: key === 'Space' ? (id, j) => jumpPick(s, id, j) : null });
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

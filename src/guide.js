// ---------- First-run guide hints, run stats, and the "You made it" ending card ----------
// Scenes call guideTick(this) once per frame; Station counts missions, Space counts drone kills (G.stats).
// meta.js saves this state through guideSnapshot / guideRestore / guideReset.
const GOAL = 2000; // total credits earned (spending does not lower it)

Object.assign(G, { earned: 0, guideDone: false, endingSeen: false, stats: { drones: 0, missions: 0, time: 0 }, hints: { off: false, seen: {}, docks: 0, sold: 0, map: 0 } });

function guideSnapshot() {
  return {
    earned: Math.floor(G.earned), guideDone: !!G.guideDone, endingSeen: !!G.endingSeen,
    stats: { drones: G.stats.drones | 0, missions: G.stats.missions | 0, time: Math.floor(G.stats.time / 10000) * 10000 }, // time to 10 s: autosave then writes every 10 s, not every second
    hints: { off: !!G.hints.off, seen: Object.assign({}, G.hints.seen), docks: G.hints.docks | 0, sold: G.hints.sold | 0, map: G.hints.map | 0 } // the next steps below
  };
}

function guideRestore(s) { // s = the parsed save
  const num = v => (Number.isFinite(v) ? Math.max(0, v) : 0), t = s.stats || {};
  G.earned = num(s.earned); G.endingSeen = s.endingSeen === true;
  G.stats = { drones: num(t.drones), missions: num(t.missions), time: num(t.time) };
  // a save from before the guide existed: someone who already has credits, gear or a mission has played
  G.guideDone = typeof s.guideDone === 'boolean' ? s.guideDone
    : (s.credits > 0 || (s.mission && s.mission !== 'none') || Object.values(s.upgrades || {}).some(Boolean));
  hintsRestore(s);
}

function guideReset() {
  G.earned = 0; G.guideDone = false; G.endingSeen = false; G.stats = { drones: 0, missions: 0, time: 0 };
  G.hints = { off: false, seen: {}, docks: 0, sold: 0, map: 0 }; LADDER.id = ''; // the next steps start over with a new game
}

// The keys of the first flight: this tip stands INSTEAD of the key line (space.js hides the line under it), so it is where a new player learns that a click can fly the ship
// (card space-game-key-line: Troy's first log had 224 presses of A and D and the mouse never turned the ship; Z turns flight assist on, and with it on a click flies there).
const GUIDE_FIRST = 'W thrusts, A and D turn, Space fires. Z: click to fly there.';
// ---------- the hint for right now, worked out from the game state (so it always matches what is on screen) ----------
function guideHint(s) {
  const key = s.scene.key, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  if (key === 'Station') {
    if (s.talk || s.shopOpen) return '';
    if (s.panel) return s.canAccept ? 'Press E to accept the call, or Esc to close.' : ''; // any call: it said "the rescue" with a courier run chosen (first look)
    // the station menu does the walking now (card space-game-station-menu): the tip names the row and its key
    const row = k => { const r = s.menu && s.menu.rows && s.menu.rows.find(x => x.key === k && !x.off); return r ? ' (press ' + r.n + ')' : ''; };
    if (G.mission === 'accepted') return 'Rescue accepted. Pick Your ship in the station menu' + row('ship') + ' to board.';
    return 'Pick Missions in the station menu, bottom right' + row('missions') + '.';
  }
  if (key === 'Space' && s.ship && s.planet && s.station) {
    if (s.dead) return '';
    // the tip names what the amber arrow points at (card space-game-critic-tips, docs/CRITIC.md 5): it named the rescue's planet on an escort and with
    // the gate picked in the nav list. The arrow is the nav target if there is one, else the mission's (src/hud.js hudObjective asks the same two).
    const nav = s.cr && s.cr.target, goal = nav || (typeof missionTarget === 'function' ? missionTarget(s) : null);
    const rescue = typeof missionActive === 'function' ? missionActive('rescue') : G.mission === 'accepted'; // the call that ends with a landing
    if (G.mission === 'accepted') {
      const pl = typeof sysBody === 'function' && sysBody('planet'), planet = pl ? pl.name : 'the planet';
      if (rescue && (!nav || nav.name === planet)) { // the rescue, the arrow on its planet
        return dist(s.ship, s.planet) < s.planetR + 320
          ? 'Hold S to slow down, then press L to land on ' + planet + '.'
          : GUIDE_FIRST + ' Follow the amber arrow to ' + planet + '.';
      }
      return goal ? GUIDE_FIRST + ' Follow the amber arrow: ' + guideName(goal.name) + '.'
        : GUIDE_FIRST + ' Your call is in the MISSION list, top left.'; // a goal in another system has no arrow
    }
    const home = typeof sysBody === 'function' && sysBody('station');
    if (nav && !(home && nav.name === home.name)) return 'The amber arrow is on the target you picked: ' + guideName(nav.name) + '.';
    if (G.mission === 'rescued') {
      return dist(s.ship, s.station) < 640
        ? 'Hold S to slow down, then press L to dock.'
        : 'Colonist aboard. Follow the amber arrow home to the station.';
    }
    return 'No rescue yet. Follow the arrow to ' + (home ? home.name : 'a station') + ' and press L to dock.';
  }
  if (key === 'Surface') {
    const c = s.col;
    if (c && c.state === 'waiting') return 'Walk east to the crashed pod and press E at the colonist. Click to shoot crawlers.';
    if (c && c.state === 'following') return 'Lead the colonist back to your ship and press E at the pad.';
    return 'Walk back to your ship and press E at the pad.';
  }
  return '';
}

// a name as the amber marker writes it on the screen (src/hud.js): FREIGHTER MULE, PERSEUS GATE, so the tip and the marker can be matched at a glance
const guideName = name => String(name || 'your objective').toUpperCase();

// Where the tip sits (card space-game-critic-tips, docs/CRITIC.md 9 and 16). In flight and on the surface: low in the middle, as before, and the
// "H hide tips" line under it has the same dark backing now (it was dim grey text straight on the ground, and a rock under it ate it).
// In the station the middle of the floor is the bar, the rug and the people at SABLE's corner, so there the tip is one row on the south wall
// (the 48 px band under the floor, left of Tab map and H help), a size smaller, with the hide line beside it instead of under it.
function guidePlace(s) {
  const st = s.scene.key === 'Station';
  if (s._gst !== st) { s._gst = st; s._gh.setFontSize(st ? 16 : 18).setPadding(st ? 12 : 14, st ? 5 : 8); }
  if (st) {
    const y = H - 25, total = s._gh.width + 8 + s._gk.width, x0 = Math.max(150, Math.min(W / 2 - total / 2, 1020 - total)); // clear of the frame's left corner and of Tab map
    s._gh.setOrigin(0, 0.5).setPosition(x0, y); s._gk.setOrigin(0, 0.5).setPosition(x0 + s._gh.width + 8, y);
  } else {
    s._gh.setOrigin(0.5).setPosition(W / 2, H - 112); s._gk.setOrigin(0.5).setPosition(W / 2, H - 112 + s._gh.height / 2 + 13);
  }
}

// How to travel (card space-game-travel-clarity): the rescue hints above end with the first rescue, and nothing after them said that G opens the galaxy map, so a player
// who had not found it could not tell there was anywhere to go. In flight, with the rescue guide done and no jump made yet, one line says it; H hides it, and so does
// opening the map (src/galaxymap.js sets TRAVEL.off). Not saved: a new visit with no jump made says it once more, a made jump (G.jumps) ends it for good.
const TRAVEL = { off: false, text: 'Other stars to visit: G opens the galaxy map. Pick one, press Enter to jump.' };
function travelHint(s) { return !TRAVEL.off && G.guideDone && !(G.jumps | 0) && s.scene.key === 'Space' && !s.dead && !s.cruising && !G.deep ? TRAVEL.text : ''; }

// ---------- The next steps (card space-game-first-ten-minutes) ----------
// Troy played 13 minutes and never jumped or traded. The rescue guide above ends at the first finished call and the travel line goes once the map has been looked at,
// so a player who took patrol calls, or looked at the map and left, was told nothing more. These are the hints after that, worked out from what the player has and has
// not done: one line each, with its key, said once (G.hints.seen, saved) for HINT_MS, then never again. H while one is up hides it and the rest (G.hints.off, saved).
// The first-run guide and the travel line come first; a step waits until neither is up, and one scene visit says at most one.
// What the player has done is counted from the frames the scenes give (hintsWatch), so no other file calls in: a dock is the Space scene followed by the Station, ore was
// sold when the hold was full on the last frame of flight and is empty on the dock, the map is opened when src/galaxymap.js says so (guideMapOpened).
// Trade here is ore, courier and haul calls, and parts: there is no buying low and selling high.
const HINT_MS = 14000, HINT_DOCK_AFTER = 180000; // how long a step stays up; flight time with no dock before the dock step
const LADDER = { id: '', until: 0 }; // the step that is up (not saved: a reload says nothing more of it, it is in G.hints.seen)
const hintRow = (s, k) => { const r = s.menu && s.menu.rows && s.menu.rows.find(x => x.key === k && !x.off); return r ? r.n : ''; }; // the number key of a station menu row
const hintParts = () => Object.values(G.upgrades || {}).some(Boolean); // a part bought
const HINT_STEPS = [ // in this order, the first one for this scene that has not been said and whose test holds
  { id: 'dock', scene: 'Space', when: () => !G.hints.docks && G.stats.time >= HINT_DOCK_AFTER },
  { id: 'jump', scene: 'Space', when: () => G.stats.missions >= 1 && !!G.hints.map && !(G.jumps | 0) },
  { id: 'ore', scene: 'Space', when: () => G.hints.docks >= 1 && G.stats.missions >= 1 && !G.hints.sold && !(G.ore | 0) },
  { id: 'shop', scene: 'Station', when: s => G.hints.docks >= 2 && !G.hints.sold && !hintParts() && !!hintRow(s, 'shop') },
  { id: 'calls', scene: 'Station', when: s => G.hints.docks >= 2 && !G.hints.sold && !!hintRow(s, 'missions') }
];
let hintKey = null, hintOre = 0;
function hintsWatch(s) { // once a frame, before the hints are chosen
  const key = s.scene.key, h = G.hints;
  if (key === 'Space') hintOre = G.ore | 0;
  else if (key === 'Station' && hintKey === 'Space') { h.docks++; if (hintOre > 0 && !(G.ore | 0)) h.sold++; hintOre = 0; }
  hintKey = key;
}
function guideMapOpened() { if (typeof TRAVEL !== 'undefined') TRAVEL.off = true; G.hints.map = 1; } // src/galaxymap.js: the map has been looked at
function hintsRestore(s) { // a save from before the steps: nothing is known of what was done, so a save with a finished call has docked at least twice
  const h = s.hints || {}, num = v => (Number.isFinite(v) ? Math.max(0, v) : 0), seen = {};
  Object.keys(h.seen || {}).forEach(k => { if (HINT_STEPS.some(x => x.id === k) && h.seen[k]) seen[k] = 1; });
  G.hints = { off: h.off === true, seen, docks: s.hints ? num(h.docks) : ((s.stats && s.stats.missions) >= 1 ? 2 : 0), sold: num(h.sold), map: h.map ? 1 : 0 };
  LADDER.id = '';
}
// the words of the step that is up (content/text/ui.md, hint.<id>); {shop} and {missions} are the number keys of those rows of the station menu
const hintText = (s, st) => uiText('hint.' + st.id, { shop: hintRow(s, 'shop'), missions: hintRow(s, 'missions') });
// the step for this scene right now, or ''. A step is chosen once: it is marked said the moment it comes up, and it stays up for HINT_MS of play
function hintLadder(s) {
  const h = G.hints, key = s.scene.key, now = G.stats.time;
  if (h.off || G.deep || s.dead || s.cruising || s.jmp) return '';
  if (LADDER.id) {
    const st = HINT_STEPS.find(x => x.id === LADDER.id);
    if (st && st.scene === key && now < LADDER.until) return s.talk || s.shopOpen || s.panel ? '' : hintText(s, st); // a panel owns the screen: the step waits behind it
    LADDER.id = ''; s._lhDone = true; // it ran its time, or the scene changed under it
  }
  if (s._lhDone || s.talk || s.shopOpen || s.panel) return '';
  const st = HINT_STEPS.find(x => x.scene === key && !h.seen[x.id] && x.when(s));
  if (!st) return '';
  h.seen[st.id] = 1; LADDER.id = st.id; LADDER.until = now + HINT_MS;
  return hintText(s, st);
}

function guideUI(s) { // the hint text lives in each scene; rebuilt after a scene restart
  if (s._gh && s._gh.active) return;
  const base = { fontFamily: 'monospace' };
  s._gh = s.add.text(W / 2, H - 112, '', Object.assign({ fontSize: '18px', color: '#ffd37a', backgroundColor: '#07101ce6', padding: { x: 14, y: 8 }, align: 'center' }, base))
    .setOrigin(0.5).setScrollFactor(0).setDepth(210).setVisible(false);
  s._gk = s.add.text(W / 2, H - 84, 'H  hide tips', Object.assign({ fontSize: '12px', color: '#9fc4dc', backgroundColor: '#07101ce6', padding: { x: 10, y: 4 } }, base))
    .setOrigin(0.5).setScrollFactor(0).setDepth(210).setVisible(false);
  s._gH = s.input.keyboard.addKey('H');
  s._gtext = ''; s._gst = undefined;
}

let seenCredits = null, goalToasted = false;

// once per frame from each scene's update
function guideTick(s) {
  G.stats.time += Math.min(s.game.loop.delta, 250);
  if (seenCredits !== null && G.credits > seenCredits) G.earned += G.credits - seenCredits;
  seenCredits = G.credits;

  const key = s.scene.key;
  if (!G.guideDone && G.stats.missions >= 1) { // first full run finished: say goodbye once, never show again
    G.guideDone = true; s._gfinal = s.time.now + 8000;
  }
  guideUI(s);
  hintsWatch(s);
  const hDown = !!(s._gH && Phaser.Input.Keyboard.JustDown(s._gH)); // JustDown takes the press: read it once
  if (hDown && !G.guideDone) { G.guideDone = true; toast(s, 'Tips hidden.', '#9fe9ff'); }
  else if (hDown && travelHint(s)) { TRAVEL.off = true; toast(s, 'Tip hidden. G opens the galaxy map any time.', '#9fe9ff'); }
  else if (hDown && LADDER.id && s._gtext) { G.hints.off = true; LADDER.id = ''; toast(s, 'Tips off. H opens the help page.', '#9fe9ff'); } // a next step was up: this and the rest go
  let text = '';
  if (s._gfinal && s.time.now < s._gfinal) text = 'Rescue paid. Now earn ' + GOAL + ' credits: more rescues, drone kills, gear at the shop.';
  else if (!G.guideDone && !s.leaving) text = guideHint(s);
  else if (!s.leaving) text = travelHint(s) || hintLadder(s);
  if (text !== s._gtext) {
    s._gtext = text;
    s._gkOn = !!text && (!G.guideDone || text === TRAVEL.text || !!LADDER.id); // (the H cap: the new Long Haul's page panel reads it, src/lhpagehud.js)
    s._gh.setText(text).setVisible(!!text).setAlpha(0); s._gk.setVisible(s._gkOn);
    if (text) s.tweens.add({ targets: s._gh, alpha: 1, duration: 180 });
    guidePlace(s);
  }
  if (typeof cmdstripUp === 'function') { // the command strip (src/cmdstrip.js) is where the tip sits: it steps aside while the strip is up, and says itself again after
    const away = cmdstripUp();
    if (away) { s._gh.setVisible(false); s._gk.setVisible(false); } else if (s._gaway) s._gtext = null;
    s._gaway = away;
  }
  if (typeof lhPageHudOwnsTips === 'function' && lhPageHudOwnsTips(s)) { s._gh.setVisible(false); s._gk.setVisible(false); } // ?longhaul=new: the page draws the tip and its H cap (src/lhpagehud.js), the canvas leaves its text out

  if (G.earned >= GOAL && !G.endingSeen) {
    if (key === 'Station') { if (!s.leaving && !s.panel && !s.talk) showEnding(s); }
    else if (!goalToasted) { goalToasted = true; toast(s, GOAL + ' credits earned! Dock at the station to see how you did.', '#6dff9c'); }
  }
}

// ---------- the ending card (its own scene, added the first time it is needed) ----------
function showEnding(s) {
  const gm = s.game.scene;
  if (!gm.getScene('Ending')) gm.add('Ending', Ending, false);
  beep(660, 0.3, 'triangle', 0.05, 440);
  s.scene.pause(); gm.run('Ending', { from: s.scene.key });
}

function clock(ms) {
  const t = Math.floor(ms / 1000);
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}

class Ending extends Phaser.Scene {
  constructor() { super('Ending'); }
  init(d) { this.from = (d && d.from) || 'Station'; this.born = performance.now(); }
  create() {
    const cx = W / 2, cy = H / 2, mono = (size, color) => ({ fontFamily: 'monospace', fontSize: size + 'px', color });
    this.add.rectangle(cx, cy, W, H, 0x02050c, 0.8).setInteractive(); // swallows clicks
    const ui = panel(this, { w: 600, h: 460, title: 'LONG HAUL  -  RESULTS', color: AMBER, depth: 0 }); // the shared panel style (src/ui.js)
    ui.setHints([['Enter', 'Continue']]); ui.tagText.setText('ENDING');
    this.add.text(cx, cy - 148, 'YOU MADE IT', mono(40, '#ffb454')).setOrigin(0.5);
    this.add.text(cx, cy - 100, GOAL + ' credits earned  -  you can keep playing', mono(16, '#9fe9ff')).setOrigin(0.5);
    const rows = [
      ['DRONES DESTROYED', G.stats.drones], ['MISSIONS DONE', G.stats.missions],
      ['TIME PLAYED', clock(G.stats.time)], ['CREDITS EARNED', Math.floor(G.earned)]
    ];
    rows.forEach(([name, val], i) => {
      const y = cy - 50 + i * 38;
      this.add.text(cx - 220, y, name, mono(20, '#cfefff')).setOrigin(0, 0.5);
      this.add.text(cx + 220, y, String(val), mono(20, '#6dff9c')).setOrigin(1, 0.5);
      this.add.rectangle(cx, y + 19, 440, 1, CYAN, 0.25);
    });
    const btn = this.add.rectangle(cx, cy + 150, 240, 50, 0x0d2a3f).setStrokeStyle(2, CYAN, 1).setInteractive({ useHandCursor: true });
    this.add.text(cx, cy + 150, 'CONTINUE', mono(22, '#38e1ff')).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x14405e)).on('pointerout', () => btn.setFillStyle(0x0d2a3f));
    btn.on('pointerdown', () => this.finish());
    this.k = this.input.keyboard.addKeys('ENTER,SPACE');
  }
  finish() {
    G.endingSeen = true; beep(520, 0.15, 'triangle', 0.05, 300);
    this.scene.stop(); this.scene.resume(this.from);
  }
  update() {
    const JD = Phaser.Input.Keyboard.JustDown;
    if ((JD(this.k.ENTER) || JD(this.k.SPACE)) && performance.now() - this.born > 500) this.finish();
  }
}

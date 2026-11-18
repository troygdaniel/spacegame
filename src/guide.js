// ---------- First-run guide hints, run stats, and the "You made it" ending card ----------
// Scenes call guideTick(this) once per frame; Station counts missions, Space counts drone kills (G.stats).
// meta.js saves this state through guideSnapshot / guideRestore / guideReset.
const GOAL = 2000; // total credits earned (spending does not lower it)

Object.assign(G, { earned: 0, guideDone: false, endingSeen: false, stats: { drones: 0, missions: 0, time: 0 } });

function guideSnapshot() {
  return {
    earned: Math.floor(G.earned), guideDone: !!G.guideDone, endingSeen: !!G.endingSeen,
    stats: { drones: G.stats.drones | 0, missions: G.stats.missions | 0, time: Math.floor(G.stats.time / 10000) * 10000 } // time to 10 s: autosave then writes every 10 s, not every second
  };
}

function guideRestore(s) { // s = the parsed save
  const num = v => (Number.isFinite(v) ? Math.max(0, v) : 0), t = s.stats || {};
  G.earned = num(s.earned); G.endingSeen = s.endingSeen === true;
  G.stats = { drones: num(t.drones), missions: num(t.missions), time: num(t.time) };
  // a save from before the guide existed: someone who already has credits, gear or a mission has played
  G.guideDone = typeof s.guideDone === 'boolean' ? s.guideDone
    : (s.credits > 0 || (s.mission && s.mission !== 'none') || Object.values(s.upgrades || {}).some(Boolean));
}

function guideReset() {
  G.earned = 0; G.guideDone = false; G.endingSeen = false; G.stats = { drones: 0, missions: 0, time: 0 };
}

// ---------- the hint for right now, worked out from the game state (so it always matches what is on screen) ----------
function guideHint(s) {
  const key = s.scene.key, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  if (key === 'Station') {
    if (s.talk || s.shopOpen) return '';
    if (s.panel) return s.canAccept ? 'Press E to accept the rescue, or Esc to close.' : '';
    if (G.mission === 'accepted') return 'Rescue accepted. Go right to the hangar and press E at YOUR SHIP.';
    return 'Walk left to the MISSIONS terminal and press E.';
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
          : 'W thrusts, A and D turn, Space fires. Follow the amber arrow to ' + planet + '.';
      }
      return goal ? 'W thrusts, A and D turn, Space fires. Follow the amber arrow: ' + guideName(goal.name) + '.'
        : 'W thrusts, A and D turn, Space fires. Your call is in the MISSION list, top left.'; // a goal in another system has no arrow
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
  if (!G.guideDone && s._gH && Phaser.Input.Keyboard.JustDown(s._gH)) { G.guideDone = true; toast(s, 'Tips hidden.', '#9fe9ff'); }
  else if (s._gH && Phaser.Input.Keyboard.JustDown(s._gH) && travelHint(s)) { TRAVEL.off = true; toast(s, 'Tip hidden. G opens the galaxy map any time.', '#9fe9ff'); }
  let text = '';
  if (s._gfinal && s.time.now < s._gfinal) text = 'Rescue paid. Now earn ' + GOAL + ' credits: more rescues, drone kills, gear at the shop.';
  else if (!G.guideDone && !s.leaving) text = guideHint(s);
  else if (!s.leaving) text = travelHint(s);
  if (text !== s._gtext) {
    s._gtext = text;
    s._gh.setText(text).setVisible(!!text).setAlpha(0); s._gk.setVisible(!!text && (!G.guideDone || text === TRAVEL.text));
    if (text) s.tweens.add({ targets: s._gh, alpha: 1, duration: 180 });
    guidePlace(s);
  }

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

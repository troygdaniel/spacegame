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
  const key = s.scene.key, dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  if (key === 'Station') {
    if (s.talk || s.shopOpen) return '';
    if (s.panel) return s.canAccept ? 'Press E to accept the rescue, or Esc to close.' : '';
    if (G.mission === 'accepted') return 'Rescue accepted. Go right to the hangar and press E at YOUR SHIP.';
    return 'Walk left to the MISSIONS terminal and press E.';
  }
  if (key === 'Space' && s.ship && s.planet && s.station) {
    if (s.dead) return '';
    if (G.mission === 'accepted') {
      return dist(s.ship, s.planet) < s.planetR + 320
        ? 'Hold S to slow down, then press L to land on Kepler-4b.'
        : 'W thrusts, A and D turn, Space fires. Follow the amber arrow to Kepler-4b.';
    }
    if (G.mission === 'rescued') {
      return dist(s.ship, s.station) < 640
        ? 'Hold S to slow down, then press L to dock.'
        : 'Colonist aboard. Follow the amber arrow home to the station.';
    }
    return 'No rescue yet. Follow the arrow to Halcyon Station and press L to dock.';
  }
  if (key === 'Surface') {
    const c = s.col;
    if (c && c.state === 'waiting') return 'Walk east to the crashed pod and press E at the colonist. Click to shoot crawlers.';
    if (c && c.state === 'following') return 'Lead the colonist back to your ship and press E at the pad.';
    return 'Walk back to your ship and press E at the pad.';
  }
  return '';
}

function guideUI(s) { // the hint text lives in each scene; rebuilt after a scene restart
  if (s._gh && s._gh.active) return;
  const base = { fontFamily: 'monospace' };
  s._gh = s.add.text(W / 2, H - 112, '', Object.assign({ fontSize: '18px', color: '#ffd37a', backgroundColor: '#07101ce6', padding: { x: 14, y: 8 }, align: 'center' }, base))
    .setOrigin(0.5).setScrollFactor(0).setDepth(210).setVisible(false);
  s._gk = s.add.text(W / 2, H - 84, 'H  hide tips', Object.assign({ fontSize: '12px', color: '#5b7a92' }, base))
    .setOrigin(0.5).setScrollFactor(0).setDepth(210).setVisible(false);
  s._gH = s.input.keyboard.addKey('H');
  s._gtext = '';
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
  let text = '';
  if (s._gfinal && s.time.now < s._gfinal) text = 'Rescue paid. Now earn ' + GOAL + ' credits: more rescues, drone kills, gear at the shop.';
  else if (!G.guideDone && !s.leaving) text = guideHint(s);
  if (text !== s._gtext) {
    s._gtext = text;
    s._gh.setText(text).setVisible(!!text).setAlpha(0); s._gk.setVisible(!!text && !G.guideDone);
    if (text) s.tweens.add({ targets: s._gh, alpha: 1, duration: 180 });
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
    this.add.rectangle(cx, cy, 600, 430, 0x07101c, 0.97).setStrokeStyle(2, AMBER, 1);
    this.add.text(cx, cy - 165, 'YOU MADE IT', mono(40, '#ffb454')).setOrigin(0.5);
    this.add.text(cx, cy - 115, GOAL + ' credits earned on the Long Haul', mono(18, '#9fe9ff')).setOrigin(0.5);
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
    this.add.text(cx, cy + 190, 'Enter or click   You can keep playing', mono(13, '#5b7a92')).setOrigin(0.5);
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

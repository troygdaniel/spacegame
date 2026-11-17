// ---------- Gun lock: lock a pirate and the cannons engage it by themselves (card space-game-gun-lock) ----------
// For the flight assist (src/assist.js): with the assist on you give orders and the ship carries them out, so the guns need an order too.
//   B        lock a target. A ring closes on it while the lock builds (GUNLOCK.time); then the cannons fire at it by themselves whenever it
//            is in range and inside their arc (GUNLOCK.arc either side of the nose), leading it, at the weapons part's own rate and damage.
//   B again  the lock moves to the next pirate further out; after the furthest one it is dropped.
// Who gets locked first: the pirate the assist order is about (assistSet(mode, pirate), as the overview list and a click do), else the nearest.
// The lock is dropped when the target is destroyed, gets further than GUNLOCK.keep, or the assist is switched off. With the assist off
// nothing here runs: no key, no ring, no shot. Space still fires by hand at any time, and both share one fire clock (s.nextFire), so a
// lock never adds shots: it pulls the trigger for you.
//
// The Autotarget part (src/autotarget.js) keeps its meaning: it turns a shot YOU fire toward the nearest pirate. The lock is the other
// half: you choose who, and the guns keep at it. Fitted, the part makes the lock better: it builds faster (GUNLOCK.timePart, and
// GUNLOCK.timeLead from the tier that leads) and reaches as far as the part does when that is further than GUNLOCK.range.
//
// THE INTERFACE (for a HUD or another file; nothing here needs an edit to space.js, assist.js or hud.js):
//   gunlockState()        { on, name, locking: 0 to 1, locked, firing, why: '' | 'range' | 'arc', dist }   on: there is a lock or one is building
//   gunlockTarget()       the sprite that is locked or being locked, or null
//   gunlockSet(target)    lock this pirate (as B does); gunlockSet(null) drops the lock. Returns true when taken.
//   GUNLOCK.readout = false   hides this file's own one-line readout
// How it runs: the game's 'poststep' event (after the scenes' update, before the draw) calls gunlockFrame for the Space scene the assist
// knows (ASSIST.s). The rules are the pure functions gunlockTime, gunlockNext and gunlockSolve; tests/gunlock.mjs runs them in plain Node.
const GUNLOCK = {
  key: 'B', readout: true,
  time: 1400, timePart: 900, timeLead: 600, // ms to build a lock: no Autotarget part, the part fitted, the part at a tier that leads
  range: 600,                               // px the locked guns fire at (the part's reach when that is further; never past how far a shot flies)
  arc: 0.9,                                 // rad either side of the nose the cannons can turn
  reach: 1100, keep: 1500,                  // px: how far away a pirate can be locked, and how far before the lock is lost
  s: null, target: null, since: 0, locked: false, firing: false, why: '', g: null, read: null, k: null, readAt: 0
};

// ---- the rules: pure ----

function gunlockTime(aimRange, aimLead) { return aimLead ? GUNLOCK.timeLead : aimRange > 0 ? GUNLOCK.timePart : GUNLOCK.time; }
function gunlockRange(aimRange) { return Math.min(Math.max(GUNLOCK.range, aimRange || 0), SHOT_SPEED * SHOT_LIFE / 1000 - 30); }

// who B locks. list: the live pirates [{ x, y }], me: the ship, cur: the one locked now (or null), prefer: the assist order's target (or null).
// With no lock: prefer when it is a pirate in reach, else the nearest. With a lock: the next one further out, and null after the furthest.
function gunlockNext(list, me, cur, prefer) {
  const d = t => Math.hypot(t.x - me.x, t.y - me.y);
  const near = list.filter(t => d(t) <= GUNLOCK.reach).sort((a, b) => d(a) - d(b));
  if (!cur || !near.includes(cur)) return prefer && near.includes(prefer) ? prefer : near[0] || null;
  return near[near.indexOf(cur) + 1] || null;
}

// may the cannons fire at it now, and along which heading? me: { x, y, rot } of the ship; tgt: { x, y, vx, vy }; range in px.
// Answers { fire, rot, why }: why is 'range' or 'arc' when they may not. The shot leaves the nose (24 px ahead) and leads the target.
function gunlockSolve(me, tgt, range) {
  const mx = me.x + Math.cos(me.rot) * 24, my = me.y + Math.sin(me.rot) * 24;
  if (Math.hypot(tgt.x - me.x, tgt.y - me.y) > range) return { fire: false, rot: me.rot, why: 'range' };
  const hit = aimLeadPoint(tgt.x - mx, tgt.y - my, tgt.vx || 0, tgt.vy || 0);
  const rot = hit ? Math.atan2(hit.y, hit.x) : Math.atan2(tgt.y - my, tgt.x - mx);
  const off = Math.atan2(Math.sin(rot - me.rot), Math.cos(rot - me.rot));
  if (Math.abs(off) > GUNLOCK.arc) return { fire: false, rot, why: 'arc' };
  return { fire: true, rot, why: '' };
}

// ---- the scene side ----

function gunlockName(t) { const d = t && t.def; return ((d && (d.name || d.key)) || 'pirate').toUpperCase(); }
function gunlockTarget() { return GUNLOCK.target; }
function gunlockPirates(s) { return s.enemies ? s.enemies.getChildren().filter(d => d.active) : []; }

function gunlockState() {
  const L = GUNLOCK, s = L.s, t = L.target;
  if (!s || !t) return { on: false, name: '', locking: 0, locked: false, firing: false, why: '', dist: 0 };
  const need = gunlockTime(shipStat('aimRange'), shipStat('aimLead'));
  return { on: true, name: gunlockName(t), locking: L.locked ? 1 : Math.max(0, Math.min(1, (s.time.now - L.since) / need)), locked: L.locked, firing: L.firing, why: L.why,
    dist: Math.hypot(t.x - s.ship.x, t.y - s.ship.y) };
}

function gunlockDrop(s, why) {
  const L = GUNLOCK, had = L.target;
  L.target = null; L.locked = false; L.firing = false; L.why = ''; L.readAt = 0;
  if (!had || !s) return;
  if (why === 'lost') { toast(s, 'Lock lost: too far.', '#ffd37a'); sfx('empty'); }
  else if (why === 'key') { toast(s, 'Lock dropped.', '#9fe9ff'); sfx('tick'); }
  // 'dead' (the kill says its own line) and 'quiet' (assist off, a dock, a death, a jump) say nothing
}

function gunlockSet(target) {
  const L = GUNLOCK, s = L.s;
  if (!target) { gunlockDrop(s, 'quiet'); return true; }
  if (!s || !ASSIST.on || s.dead || s.leaving || target.active === false) return false;
  L.target = target; L.since = s.time.now; L.locked = false; L.firing = false; L.why = ''; L.readAt = 0;
  sfx('tick');
  return true;
}

// B: the next target, or none
function gunlockKey(s) {
  const L = GUNLOCK, list = gunlockPirates(s), order = s.as && s.as.mode ? s.as.target : null;
  const next = gunlockNext(list, s.ship, L.target, order);
  if (next) { gunlockSet(next); return; }
  if (L.target) gunlockDrop(s, 'key'); else { toast(s, 'Nothing to lock in reach.', '#ffd37a'); sfx('empty'); }
}

function gunlockSetup(s) {
  const L = GUNLOCK;
  L.s = s; L.target = null; L.locked = false; L.firing = false; L.why = ''; L.readAt = 0;
  L.k = s.input.keyboard.addKey(L.key);
  L.g = s.add.graphics().setDepth(7);
  L.read = s.add.text(W / 2, 178, '', { fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffb454' }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setStroke('#02060d', 4).setVisible(false);
  s.events.once('shutdown', () => { if (L.s === s) { L.s = null; L.target = null; L.locked = false; } });
}

// one frame: the key, the lock building, the lock lost, the shot, the ring and the readout
function gunlockFrame(s, time) {
  const L = GUNLOCK;
  if (L.g) L.g.clear();
  const down = L.k && L.k._justDown; if (down) L.k._justDown = false; // what Phaser's JustDown does
  if (!ASSIST.on || s.dead || s.leaving || s.cruising || s.jmp) { if (L.target) gunlockDrop(s, 'quiet'); if (L.read) L.read.setVisible(false); return; }
  if (down && !(s.cr && s.cr.navOpen)) gunlockKey(s);
  const t = L.target, ship = s.ship;
  if (t) {
    const dist = Math.hypot(t.x - ship.x, t.y - ship.y);
    if (t.active === false) gunlockDrop(s, 'dead');
    else if (dist > GUNLOCK.keep) gunlockDrop(s, 'lost');
    else {
      if (!L.locked && time - L.since >= gunlockTime(shipStat('aimRange'), shipStat('aimLead'))) { L.locked = true; L.readAt = 0; sfx('chime'); }
      L.firing = false; L.why = '';
      if (L.locked) {
        const v = t.body && t.body.velocity ? t.body.velocity : { x: 0, y: 0 };
        const sol = gunlockSolve({ x: ship.x, y: ship.y, rot: ship.rotation }, { x: t.x, y: t.y, vx: v.x, vy: v.y }, gunlockRange(shipStat('aimRange')));
        L.why = sol.why; L.firing = sol.fire;
        if (sol.fire && time >= (s.lockUntil || 0) && time > s.nextFire) { // the same clock, rate and damage as a shot fired by hand (space.js)
          s.nextFire = time + fireDelay();
          const shot = s.shoot(s.pb, ship.x + Math.cos(ship.rotation) * 24, ship.y + Math.sin(ship.rotation) * 24, sol.rot, SHOT_SPEED, time);
          if (shot) shot.dmg = shipStat('damage');
          sfx('laser'); feelShot(s, ship.x + Math.cos(ship.rotation) * 26, ship.y + Math.sin(ship.rotation) * 26, sol.rot);
        }
      }
    }
  }
  gunlockDraw(s, time);
}

// the ring: it closes on the target while the lock builds, then sits on it with four ticks (bright while the guns bear, dim while they cannot)
function gunlockDraw(s, time) {
  const L = GUNLOCK, t = L.target, st = gunlockState();
  if (L.g && t) {
    const g = L.g, r = Math.max(22, (t.displayWidth || 36) / 2 + 12);
    if (!st.locked) {
      g.lineStyle(2, 0xffb454, 0.9); g.strokeCircle(t.x, t.y, r + (1 - st.locking) * 70);
      g.lineStyle(1, 0xffb454, 0.35); g.strokeCircle(t.x, t.y, r);
    } else {
      g.lineStyle(3, 0xff4d6d, st.firing ? 1 : 0.45); g.strokeCircle(t.x, t.y, r);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + time / 600; g.lineBetween(t.x + Math.cos(a) * (r - 6), t.y + Math.sin(a) * (r - 6), t.x + Math.cos(a) * (r + 8), t.y + Math.sin(a) * (r + 8)); }
    }
  }
  if (!L.read) return;
  const show = GUNLOCK.readout;
  L.read.setVisible(show);
  if (!show || time < L.readAt) return;
  L.readAt = time + 200;
  L.read.setText(!st.on ? (gunlockPirates(s).some(d => Math.hypot(d.x - s.ship.x, d.y - s.ship.y) <= GUNLOCK.reach) ? GUNLOCK.key + ' lock target' : '')
    : !st.locked ? 'LOCKING  ' + st.name + '  ' + Math.round(st.locking * 100) + '%'
    : 'LOCKED  ' + st.name + '   ' + (st.firing ? 'GUNS FIRING' : st.why === 'range' ? 'OUT OF RANGE' : 'OUT OF ARC') + '   ' + GUNLOCK.key + ' next');
}

// the hook: once the page has made the game, every frame after the scenes have updated
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('load', () => {
  if (typeof game === 'undefined' || !game || !game.events) return;
  game.events.on('poststep', () => {
    const s = ASSIST.s; if (!s || !s.sys || !s.sys.isActive()) return;
    if (GUNLOCK.s !== s) gunlockSetup(s);
    gunlockFrame(s, s.time.now);
  });
});

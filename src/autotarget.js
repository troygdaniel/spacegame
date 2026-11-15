// ---------- Autotarget: the sixth part (card space-game-cannon-autotarget) ----------
// With the part fitted (src/data_parts.js PARTS.aim, tiers 1 to 3) the guns turn to the nearest raider within the part's reach whenever you
// fire: a reticle sits on that raider, and from tier 2 the shot leads a moving one. Nothing fires by itself: Space or a click still
// does, and it still costs the weapons part's rate. R switches the part off and on (G.aimOff, saved), and with it off the guns fire
// along the nose as before. The reach (450, 650, 850 px) never passes how far a shot flies (SHOT_LIFE * SHOT_SPEED), so a locked raider is
// always one a shot can reach.
// What it reads: s.enemies (every raider, wanted pirate and the Reaver: never the police or a freighter, which are in other groups),
// shipStat('aimRange') and shipStat('aimLead') (src/fleet.js). What space.js does: aimUpdate every frame, aimAngle when it fires, aimToggle on R.

const SHOT_SPEED = 950, SHOT_LIFE = 900;   // the player's shot, as src/space.js fires it: px a second, ms it lives

const aimFitted = () => shipStat('aimRange') > 0;
const aimActive = () => aimFitted() && !G.aimOff;

// the raider the guns would turn to: the nearest live one within reach of the ship, or null
function aimPick(s, ship) {
  if (!aimActive() || !s.enemies) return null;
  const reach = shipStat('aimRange'); let best = null, bd = reach * reach;
  s.enemies.getChildren().forEach(d => {
    if (!d.active) return;
    const dx = d.x - ship.x, dy = d.y - ship.y, q = dx * dx + dy * dy;
    if (q < bd) { bd = q; best = d; }
  });
  return best;
}

// where to point so a shot fired from (x, y) meets a target moving at (vx, vy): the smallest time t > 0 with |P + V t| = SHOT_SPEED t, kept to the
// shot's life. Returns { x, y } of the meeting point, or null when no shot can catch it (then the caller aims at the target itself).
function aimLeadPoint(px, py, vx, vy) {
  const a = vx * vx + vy * vy - SHOT_SPEED * SHOT_SPEED, b = 2 * (px * vx + py * vy), c = px * px + py * py;
  let t = null;
  if (Math.abs(a) < 1e-6) { if (Math.abs(b) > 1e-6 && -c / b > 0) t = -c / b; }
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) { const r = Math.sqrt(disc), t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a); t = [t1, t2].filter(x => x > 0).sort((m, n) => m - n)[0] ?? null; }
  }
  return t !== null && t * 1000 <= SHOT_LIFE ? { x: px + vx * t, y: py + vy * t } : null;
}

// the heading to fire along from the nose of the ship: toward the raider (ahead of it from tier 2), or the ship's own heading
function aimAngle(s, ship) {
  const d = aimPick(s, ship); if (!d) return ship.rotation;
  const mx = ship.x + Math.cos(ship.rotation) * 24, my = ship.y + Math.sin(ship.rotation) * 24, v = d.body && d.body.velocity ? d.body.velocity : { x: 0, y: 0 };
  const hit = shipStat('aimLead') ? aimLeadPoint(d.x - mx, d.y - my, v.x, v.y) : null;
  return hit ? Math.atan2(hit.y, hit.x) : Math.atan2(d.y - my, d.x - mx);
}

// the reticle, every frame: four corner brackets round the raider and, from tier 2, a small cross where the shot will meet it
function aimUpdate(s, ship, off) {
  if (!s.aimG || !s.aimG.scene) s.aimG = s.add.graphics().setDepth(7);   // a scene that starts again is the same object with its old display list gone: the layer is made again
  const g = s.aimG; g.clear();
  const d = off ? null : aimPick(s, ship); s.aimTarget = d;
  if (!d) return;
  const r = Math.max(18, (d.displayWidth || 36) / 2 + 8), k = r * 0.45, t = s.time.now, pulse = 0.75 + 0.25 * Math.sin(t / 140);
  g.lineStyle(2, 0xff4d6d, pulse);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
    g.beginPath(); g.moveTo(d.x + sx * r, d.y + sy * (r - k)); g.lineTo(d.x + sx * r, d.y + sy * r); g.lineTo(d.x + sx * (r - k), d.y + sy * r); g.strokePath();
  });
  if (shipStat('aimLead')) {
    const mx = ship.x + Math.cos(ship.rotation) * 24, my = ship.y + Math.sin(ship.rotation) * 24, v = d.body && d.body.velocity ? d.body.velocity : { x: 0, y: 0 };
    const hit = aimLeadPoint(d.x - mx, d.y - my, v.x, v.y);
    if (hit) { const x = mx + hit.x, y = my + hit.y; g.lineStyle(2, 0xffb454, 0.9); g.lineBetween(x - 6, y, x + 6, y); g.lineBetween(x, y - 6, x, y + 6); }
  }
}

// R: switch the part off and on (nothing happens, and nothing is said, while none is fitted)
function aimToggle(s) {
  if (!aimFitted()) return;
  G.aimOff = !G.aimOff; sfx('click'); toast(s, G.aimOff ? 'Autotarget off  (R)' : 'Autotarget on  (R)', G.aimOff ? '#ffd37a' : '#9fe9ff');
}

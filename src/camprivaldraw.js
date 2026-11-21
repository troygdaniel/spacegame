// ---------- Campaign: what the rival ship looks like on the screen (card space-game-rival-duel; src/camprival.js is the rules) ----------
// The scene (src/campaignscene.js) asks for three things: campRivalHud (the name, the shield and hull bars and the phase's warning, at the top, where the mothership's bar is), campRivalWorld (round the ship: a bubble
// for its shield, a ring that closes in on it while it charges, the line of fire at you, its own small bars) and campRivalEvent (the sounds and the shake of the broadside, the ram and the shield dropping).
// The sim says what is true (campRivalState); this file only draws it. A test with a stand-in scene (tests/camprival.mjs H) holds the shapes it draws.
// The colours: the pirates' ochre for the hull, cyan for the shield (as the cruiser's), amber and ember for a charge, a pale blue when the shield is down. Never red (the aliens') or green (yours).
const CAMP_RIVAL_DRAW = {
  hud: { x: W / 2 - 150, w: 300, shieldY: 24, hullY: 38, nameY: 4, phaseY: 53 }, // above the toast, which opens at about y 75
  color: { hull: 0xe8b84a, hullLow: 0xe8873a, shield: 0x7fe9ff, down: 0x6a8aa8, charge: 0xffa83a, warn: 0xffd9a0, line: 0xff8a3a },
  bubble: { grow: 20, alpha: [0.22, 0.4], hit: 0.95, hitMs: 160 },              // the shield bubble: px beyond the hull, how solid (empty, full), how solid on a hit and for how long
  ring: { from: 120, to: 34, w: 3, spin: 2.4 },                                  // the charge ring: it closes from `from` px to `to` px as the charge runs out
  fire: { alpha: [0.1, 0.55], reach: 1100, w: 2 },                               // the line of fire at the cruiser while it charges: how solid (start, end), how far, how thick
  bars: { w: 64, h: 4, gap: 3, up: 18 }                                          // the small bars over the ship
};
const campRivalLive = C => C.ships.filter(u => u.rival && u.hp > 0);

function campRivalHud(scene, g, bar) {
  const C = scene.camp, D = CAMP_RIVAL_DRAW, H = D.hud;
  if (!scene.hud.rivalName) { // made the first time (in `hud`, so a result card hides them with the rest)
    const t = (x, y, size, color) => scene.add.text(x, y, '', uiFont(size, color, { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    scene.hud.rivalName = t(H.x, H.nameY, 14, '#ffd37a'); scene.hud.rivalPhase = t(W / 2, H.phaseY, 16, '#ffa83a').setOrigin(0.5, 0);
  }
  const u = campRivalLive(C)[0];
  if (!u) { scene.hud.rivalName.setText(''); scene.hud.rivalPhase.setText(''); return null; }
  const s = campRivalState(C, u);
  scene.hud.rivalName.setText(s.name.toUpperCase());
  bar(H.x, H.shieldY, H.w, s.down ? 0 : s.shield, s.down ? D.color.down : D.color.shield);
  bar(H.x, H.hullY, H.w, s.hull, s.hull > 0.3 ? D.color.hull : D.color.hullLow);
  const words = { charge: 'camp.ui.rival.charge', down: 'camp.ui.rival.down', ram: 'camp.ui.rival.ram', run: 'camp.ui.rival.run' }[s.phase], blink = s.phase === 'charge' && s.frac > 0.6 && Math.sin(C.t / 90) > 0;
  scene.hud.rivalPhase.setText(words ? uiText(words) : '').setColor(s.phase === 'down' ? '#9fd0ff' : '#ffa83a').setAlpha(blink ? 0.35 : 1);
  return s;
}

function campRivalWorld(scene) {
  const C = scene.camp, D = CAMP_RIVAL_DRAW;
  if (!scene.rivalG || !scene.rivalG.scene) scene.rivalG = scene.add.graphics().setDepth(7); // a scene that starts again (a retry, the next mission) destroys its layers: the old one has no scene
  const g = scene.rivalG; g.clear();
  campRivalLive(C).forEach(u => {
    const s = campRivalState(C, u), R = u.rival, car = C.carrier;
    if (s.shield > 0 && !s.down) { // the shield bubble: more solid the more shield is left, bright for a moment on a hit
      const hit = C.t - R.hitAt < D.bubble.hitMs, a = hit ? D.bubble.hit : D.bubble.alpha[0] + (D.bubble.alpha[1] - D.bubble.alpha[0]) * s.shield;
      g.lineStyle(2, D.color.shield, a).strokeCircle(u.x, u.y, u.r + D.bubble.grow);
    }
    if (s.phase === 'charge') { // the ring closes in; the line of fire at the cruiser grows solid
      const rr = D.ring.from + (D.ring.to - D.ring.from) * s.frac, a0 = C.t / 1000 * D.ring.spin;
      g.lineStyle(D.ring.w, D.color.charge, 0.5 + 0.5 * s.frac).strokeCircle(u.x, u.y, rr);
      for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; g.lineStyle(D.ring.w + 1, D.color.warn, 0.9).lineBetween(u.x + Math.cos(a) * (rr - 8), u.y + Math.sin(a) * (rr - 8), u.x + Math.cos(a) * (rr + 8), u.y + Math.sin(a) * (rr + 8)); } // four ticks that turn with it
      if (car && car.hp > 0) { const b = Math.atan2(car.y - u.y, car.x - u.x), L = Math.min(D.fire.reach, Math.hypot(car.x - u.x, car.y - u.y)); g.lineStyle(D.fire.w, D.color.line, D.fire.alpha[0] + (D.fire.alpha[1] - D.fire.alpha[0]) * s.frac).lineBetween(u.x, u.y, u.x + Math.cos(b) * L, u.y + Math.sin(b) * L); }
    }
    if (s.phase === 'ram') g.lineStyle(3, D.color.charge, 0.7).strokeCircle(u.x, u.y, u.r + 10); // the ram: a hot ring round the hull
    const x = u.x - D.bars.w / 2, y = u.y - u.r - D.bars.up; // its own small bars, over it: shield (cyan, grey-blue when down) and hull
    g.fillStyle(0x04101c, 0.8).fillRect(x - 1, y - 1, D.bars.w + 2, D.bars.h * 2 + D.bars.gap + 2);
    g.fillStyle(s.down ? D.color.down : D.color.shield, 1).fillRect(x, y, D.bars.w * (s.down ? 0 : s.shield), D.bars.h);
    g.fillStyle(s.hull > 0.3 ? D.color.hull : D.color.hullLow, 1).fillRect(x, y + D.bars.h + D.bars.gap, D.bars.w * s.hull, D.bars.h);
  });
}

function campRivalEvent(scene, e) { // the sounds and the shake of what the rival does; the lines are the sim's own (an event 'say')
  if (e.stage === 'charge') { beep(180, 0.5, 'sawtooth', 0.05, 420); } // a rising warning
  else if (e.stage === 'broadside') { scene.boom.explode(30, e.x, e.y); scene.battleSound('blast', 'blastBig'); scene.cameras.main.shake(200, 0.005); }
  else if (e.stage === 'down') beep(520, 0.25, 'triangle', 0.05, -380); // the shield falling away
  else if (e.stage === 'ram') beep(140, 0.45, 'square', 0.05, 160);
  else if (e.stage === 'ramhit') { scene.boom.explode(18, e.x, e.y); scene.battleSound('hull', 'hullHit'); scene.cameras.main.shake(260, 0.012); }
  else if (e.stage === 'appear') beep(300, 0.18, 'square', 0.05, 0);
}

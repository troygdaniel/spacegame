// ---------- Boot: draw every texture with shapes ----------
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const mk = (key, w, h, fn) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      fn(g); g.generateTexture(key, w, h); g.destroy();
    };
    // every ship texture keeps its original size; the glow is a few translucent discs drawn inside the same canvas
    const halo = (g, x, y, color, radii, a) => radii.forEach((r, i) => { g.fillStyle(color, a * (i + 1)); g.fillCircle(x, y, r); });
    mk('ship', 44, 30, g => {
      halo(g, 24, 15, CYAN, [13, 9, 6], 0.05);                 // cockpit glow
      halo(g, 8, 15, AMBER, [8, 5, 3], 0.12);                  // engine glow at the tail
      g.fillStyle(0x0b2236, 1); g.lineStyle(2, CYAN, 1);
      g.beginPath(); g.moveTo(42, 15); g.lineTo(3, 3); g.lineTo(12, 15); g.lineTo(3, 27); g.closePath();
      g.fillPath(); g.strokePath();
      g.fillStyle(0x15405f, 1);                                // lighter fuselage
      g.beginPath(); g.moveTo(38, 15); g.lineTo(14, 11); g.lineTo(11, 15); g.lineTo(14, 19); g.closePath(); g.fillPath();
      g.lineStyle(1, CYAN, 0.55); g.lineBetween(14, 11, 38, 15); g.lineBetween(14, 19, 38, 15);
      g.fillStyle(AMBER, 1); g.fillCircle(4, 4, 1.8); g.fillCircle(4, 26, 1.8); g.fillRect(8, 13, 4, 4); // wing tips and engine
      g.fillStyle(CYAN, 1); g.fillCircle(24, 15, 3); g.fillStyle(0xffffff, 1); g.fillCircle(24.5, 15, 1.2);
    });
    mk('drone', 34, 34, g => {
      halo(g, 17, 17, RED, [15, 11, 7], 0.05);
      g.fillStyle(0x2a0b14, 1); g.lineStyle(2, RED, 1);
      g.beginPath(); g.moveTo(32, 17); g.lineTo(17, 3); g.lineTo(2, 17); g.lineTo(17, 31); g.closePath();
      g.fillPath(); g.strokePath();
      g.lineStyle(1, RED, 0.5);
      g.beginPath(); g.moveTo(27, 17); g.lineTo(17, 8); g.lineTo(8, 17); g.lineTo(17, 26); g.closePath(); g.strokePath();
      g.lineBetween(17, 3, 17, 31);
      g.fillStyle(RED, 1); g.fillCircle(17, 5, 2); g.fillCircle(17, 29, 2);
      g.fillCircle(24, 17, 4); g.fillStyle(0xffffff, 1); g.fillCircle(24.5, 17, 1.5);
    });
    mk('raider', 30, 22, g => { // pirate raider: a thin fast dart (enemies.js)
      halo(g, 15, 11, RED, [11, 8, 5], 0.05);
      g.fillStyle(0x2a0b14, 1); g.lineStyle(2, 0xff6b8a, 1);
      g.beginPath(); g.moveTo(29, 11); g.lineTo(4, 3); g.lineTo(9, 11); g.lineTo(4, 19); g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(0xff6b8a, 1); g.fillCircle(19, 11, 2.5); g.fillStyle(0xffffff, 1); g.fillCircle(19.5, 11, 1);
    });
    mk('gunship', 48, 40, g => { // pirate gunship: a wide orange hull with two gun pods (enemies.js)
      const OR = 0xff8c3a;
      halo(g, 24, 20, OR, [21, 15, 9], 0.05);
      g.fillStyle(0x2e1608, 1); g.lineStyle(2, OR, 1);
      g.beginPath(); g.moveTo(46, 20); g.lineTo(30, 4); g.lineTo(6, 8); g.lineTo(2, 20); g.lineTo(6, 32); g.lineTo(30, 36); g.closePath();
      g.fillPath(); g.strokePath();
      g.fillStyle(0x4a2410, 1); g.fillRect(14, 2, 18, 7); g.fillRect(14, 31, 18, 7);
      g.lineStyle(1, OR, 0.9); g.strokeRect(14, 2, 18, 7); g.strokeRect(14, 31, 18, 7);
      g.fillStyle(OR, 1); g.fillRect(31, 3, 7, 4); g.fillRect(31, 33, 7, 4); // gun muzzles
      g.fillCircle(34, 20, 5); g.fillStyle(0xffffff, 1); g.fillCircle(35, 20, 1.8);
    });
    mk('pod', 18, 18, g => { // salvage pod a dead pirate leaves behind (enemies.js)
      g.fillStyle(0x3a2a0c, 1); g.lineStyle(2, AMBER, 1);
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = 9 + Math.cos(a) * 7.5, y = 9 + Math.sin(a) * 7.5; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(0xfff1a8, 1); g.fillCircle(9, 9, 2.5);
    });
    mk('reaver', 96, 76, g => { // the bounty boss (missions.js): a broad dark warship with four gun pods and a red eye
      const RR = 0xff2a4a;
      halo(g, 48, 38, RR, [40, 30, 20], 0.05);
      g.fillStyle(0x1c0810, 1); g.lineStyle(3, RR, 1);
      g.beginPath(); g.moveTo(94, 38); g.lineTo(66, 6); g.lineTo(18, 12); g.lineTo(3, 38); g.lineTo(18, 64); g.lineTo(66, 70); g.closePath();
      g.fillPath(); g.strokePath();
      g.lineStyle(1, RR, 0.5); g.lineBetween(18, 12, 66, 38); g.lineBetween(18, 64, 66, 38); g.lineBetween(3, 38, 66, 38);
      [[26, 3], [50, 1], [26, 65], [50, 67]].forEach(([x, y]) => { g.fillStyle(0x3a0f1a, 1); g.fillRect(x, y, 18, 8); g.lineStyle(1, RR, 0.9); g.strokeRect(x, y, 18, 8); g.fillStyle(RR, 1); g.fillRect(x + 16, y + 2, 6, 4); });
      g.fillStyle(RR, 1); g.fillCircle(68, 38, 8); g.fillStyle(0xffffff, 1); g.fillCircle(70, 38, 3);
      g.fillStyle(AMBER, 0.9); g.fillRect(4, 30, 6, 16); // engine glow at the tail
    });
    mk('freighter', 64, 28, g => { // the escort mission's MULE
      g.fillStyle(0x2a2210, 1); g.lineStyle(2, AMBER, 1);
      g.fillRoundedRect(2, 4, 60, 20, 4); g.strokeRoundedRect(2, 4, 60, 20, 4);
      g.fillStyle(0x0b2236, 1); g.fillRect(8, 9, 28, 10); g.fillStyle(AMBER, 1); g.fillRect(52, 11, 6, 6);
    });
    mk('civilian', 64, 28, g => { // same shape as the MULE but a pale hull, so each civilian's tint shows as a clear colour
      g.fillStyle(0xc4d0e0, 1); g.lineStyle(2, 0xffffff, 0.9);
      g.fillRoundedRect(2, 4, 60, 20, 4); g.strokeRoundedRect(2, 4, 60, 20, 4);
      g.lineStyle(2, 0x6a7a90, 0.9); [16, 26, 36].forEach(x => g.lineBetween(x, 6, x, 22));
      g.fillStyle(0x1a2a40, 1); g.fillRect(46, 9, 12, 10);
      g.fillStyle(0xffffff, 1); g.fillRect(2, 10, 5, 8);
    });
    mk('police', 44, 30, g => { // a Halcyon patrol ship: blue and white
      halo(g, 22, 15, 0x3a8dff, [14, 10, 6], 0.05);
      g.fillStyle(0x0d1c34, 1); g.lineStyle(2, 0x3a8dff, 1);
      g.beginPath(); g.moveTo(42, 15); g.lineTo(3, 3); g.lineTo(12, 15); g.lineTo(3, 27); g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(0xdfefff, 1); g.beginPath(); g.moveTo(38, 15); g.lineTo(15, 11); g.lineTo(12, 15); g.lineTo(15, 19); g.closePath(); g.fillPath();
      g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(8, 15, 30, 15);
      g.fillStyle(0x9fd0ff, 1); g.fillRect(8, 13, 4, 4);
      g.fillStyle(0x3a8dff, 1); g.fillCircle(24, 15, 3); g.fillStyle(0xffffff, 1); g.fillCircle(24.5, 15, 1.2);
    });
    mk('bullet', 14, 4, g => { g.fillStyle(0xfff1a8, 1); g.fillRect(0, 0, 14, 4); });
    mk('ebullet', 14, 4, g => { g.fillStyle(RED, 1); g.fillRect(0, 0, 14, 4); });
    mk('spark', 6, 6, g => { g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 3); });
    worldArt(this); // src/art_world.js: nebula and star layers, the planet, rocks, ore, surface art
    mk('station', 440, 440, g => {
      for (let i = 0; i < 6; i++) { g.lineStyle(4, CYAN, 0.05); g.strokeCircle(220, 220, 200 + i * 3); } // outer glow
      halo(g, 220, 220, CYAN, [74, 62, 52], 0.03);                                                        // hub glow
      g.lineStyle(14, 0x1d3b5c, 1); g.strokeCircle(220, 220, 190);
      g.lineStyle(3, 0x2a6a9a, 0.8); g.strokeCircle(220, 220, 190);
      g.lineStyle(3, CYAN, 0.9); g.strokeCircle(220, 220, 198); g.strokeCircle(220, 220, 182);
      g.lineStyle(10, 0x1d3b5c, 1);
      g.lineBetween(220, 30, 220, 410); g.lineBetween(30, 220, 410, 220);
      g.lineStyle(2, 0x2a6a9a, 0.8); g.lineBetween(220, 30, 220, 410); g.lineBetween(30, 220, 410, 220);
      g.fillStyle(0x0b2236, 1); g.fillCircle(220, 220, 46);
      g.lineStyle(3, CYAN, 1); g.strokeCircle(220, 220, 46);
      g.lineStyle(2, AMBER, 0.5); g.strokeCircle(220, 220, 30);
      g.fillStyle(CYAN, 0.9); g.fillCircle(220, 220, 9); g.fillStyle(0xffffff, 1); g.fillCircle(220, 220, 3);
      halo(g, 419, 220, AMBER, [26, 20, 14], 0.04);                                                       // dock bay glow
      g.fillStyle(AMBER, 1); g.fillRect(404, 200, 30, 40);
      g.fillStyle(0xfff1a8, 1); g.fillRect(404, 217, 30, 6);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, col = i % 2 ? AMBER : CYAN, x = 220 + Math.cos(a) * 190, y = 220 + Math.sin(a) * 190;
        g.fillStyle(col, 0.18); g.fillCircle(x, y, 8); g.fillStyle(col, 1); g.fillCircle(x, y, 4);
      }
    });
    mk('walker', 22, 22, g => {
      g.fillStyle(0x0b2236, 1); g.lineStyle(2, CYAN, 1); g.fillCircle(10, 11, 8); g.strokeCircle(10, 11, 8);
      g.fillStyle(CYAN, 1); g.fillRect(15, 9, 7, 4);
    });
    mk('tile', 40, 40, g => {
      g.fillStyle(0x0a1424, 1); g.fillRect(0, 0, 40, 40); g.lineStyle(1, 0x14263d, 1); g.strokeRect(0, 0, 40, 40);
    });
    // dev shortcut: index.html#space or #surface jumps straight to that scene with the rescue accepted;
    // #escort and #patrol start in space with that mission accepted
    const hash = location.hash.slice(1);
    const quick = { space: 'rescue', surface: 'rescue', escort: 'escort', patrol: 'patrol', bounty: 'bounty' }[hash];
    if (quick) { G.mission = 'accepted'; G.missionId = quick; }
    // no hash: the title screen first; #station jumps straight to the station
    this.scene.start(hash === 'surface' ? 'Surface' : quick ? 'Space' : hash === 'station' ? 'Station' : 'Title');
  }
}

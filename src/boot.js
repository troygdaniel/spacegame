// ---------- Boot: draw every texture with shapes ----------
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const mk = (key, w, h, fn) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      fn(g); g.generateTexture(key, w, h); g.destroy();
    };
    // ships (player with its upgrade tiers, pirates, the Reaver, freighter, civilian, police) are drawn in src/ships.js
    shipsTextures(this);
    const halo = (g, x, y, color, radii, a) => radii.forEach((r, i) => { g.fillStyle(color, a * (i + 1)); g.fillCircle(x, y, r); });
    mk('pod', 18, 18, g => { // salvage pod a dead pirate leaves behind (enemies.js)
      g.fillStyle(0x3a2a0c, 1); g.lineStyle(2, AMBER, 1);
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = 9 + Math.cos(a) * 7.5, y = 9 + Math.sin(a) * 7.5; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(0xfff1a8, 1); g.fillCircle(9, 9, 2.5);
    });
    mk('asteroid', 64, 64, g => { // a lumpy grey boulder; scaled for small, medium and large
      const pts = []; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = Phaser.Math.Between(21, 29); pts.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r]); }
      g.fillStyle(0x4a4452, 1); g.lineStyle(2, 0x8a809c, 1);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(0x363040, 1); g.fillCircle(24, 38, 6); g.fillCircle(41, 24, 4.5); g.fillCircle(40, 42, 3.5);
      g.fillStyle(0x6a6078, 0.8); g.fillCircle(26, 22, 7);
      g.lineStyle(1, 0xffb454, 0.35); g.lineBetween(30, 30, 40, 36); g.lineBetween(36, 33, 44, 33); // a faint ore vein
    });
    mk('ore', 16, 16, g => { // a glowing ore chunk
      halo(g, 8, 8, AMBER, [8, 6, 4], 0.07);
      g.fillStyle(0xffb454, 1); g.beginPath(); g.moveTo(8, 2); g.lineTo(13, 8); g.lineTo(8, 14); g.lineTo(3, 8); g.closePath(); g.fillPath();
      g.fillStyle(0xfff1a8, 1); g.fillCircle(7, 7, 2);
    });
    mk('bullet', 14, 4, g => { g.fillStyle(0xfff1a8, 1); g.fillRect(0, 0, 14, 4); });
    mk('ebullet', 14, 4, g => { g.fillStyle(RED, 1); g.fillRect(0, 0, 14, 4); });
    mk('spark', 6, 6, g => { g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 3); });
    // stars2 is a plain star layer; stars1 also carries the nebula, so it is bigger (1024) and drawn to tile
    const stars = (key, n, maxR) => mk(key, 512, 512, g => {
      for (let i = 0; i < n; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.9));
        g.fillCircle(Phaser.Math.Between(2, 509), Phaser.Math.Between(2, 509), Phaser.Math.FloatBetween(0.5, maxR));
      }
    });
    stars('stars2', 40, 1.9);
    const NB = 1024;
    mk('stars1', NB, NB, g => {
      [[200, 260, 300, 0x4a2a8a], [720, 180, 260, 0x1d4a8a], [860, 760, 340, 0x1a5a6a], [330, 800, 280, 0x7a2a5a], [560, 520, 200, 0x2a3a8a]]
        .forEach(([bx, by, br, col]) => {
          // a blob is stacked translucent discs, big and faint first, then smaller and denser, drifting off-centre
          const discs = [];
          for (let i = 0; i < 28; i++) {
            const f = 1 - i / 28;
            discs.push([Phaser.Math.Between(-45, 45) * (1 - f), Phaser.Math.Between(-45, 45) * (1 - f), br * f]);
          }
          for (const ox of [-NB, 0, NB]) for (const oy of [-NB, 0, NB]) { // repeated at the edges so the tile has no seam
            discs.forEach(([dx, dy, r]) => { g.fillStyle(col, 0.016); g.fillCircle(bx + ox + dx, by + oy + dy, r); });
          }
        });
      for (let i = 0; i < 360; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.9));
        g.fillCircle(Phaser.Math.Between(2, NB - 3), Phaser.Math.Between(2, NB - 3), Phaser.Math.FloatBetween(0.5, 1.1));
      }
    });
    mk('planet', 640, 640, g => {
      const C = 320, R = 304; // the sphere is a little smaller than the canvas so the atmosphere glow fits
      for (let i = 0; i < 8; i++) { g.fillStyle(AMBER, 0.04); g.fillCircle(C, C, R + 16 - i * 2); }
      const dark = Phaser.Display.Color.ValueToColor(0x4a2018), light = Phaser.Display.Color.ValueToColor(0xc9744a), N = 18;
      for (let i = 0; i <= N; i++) { // lit from the upper left: discs shifted toward the light, getting lighter and smaller
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(dark, light, N, i), k = i * 5;
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1); g.fillCircle(C - k, C - k, R - 1.5 * k);
      }
      const cols = [0x5a2a22, 0x944a30, 0xb25a35, 0x3a1d1d, 0xc9744a];
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 230, r = Phaser.Math.Between(14, 60);
        g.fillStyle(cols[i % cols.length], 0.4); g.fillCircle(C + Math.cos(a) * d, C + Math.sin(a) * d, r);
      }
      for (let i = 0; i < 14; i++) { // night side: dark arcs along the lower right edge
        g.lineStyle(90 - i * 6, 0x000000, 0.06);
        g.beginPath(); g.arc(C, C, R - (90 - i * 6) / 2, Phaser.Math.DegToRad(-35 + i * 2), Phaser.Math.DegToRad(125 - i * 2)); g.strokePath();
      }
      g.lineStyle(4, 0xffd9a0, 0.45); g.beginPath(); g.arc(C, C, R - 2, Phaser.Math.DegToRad(185), Phaser.Math.DegToRad(265)); g.strokePath();
      g.lineStyle(3, AMBER, 0.55); g.strokeCircle(C, C, R + 1);
    });
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
    mk('colonist', 22, 22, g => {
      g.fillStyle(0x3a2306, 1); g.lineStyle(2, AMBER, 1); g.fillCircle(11, 11, 8); g.strokeCircle(11, 11, 8);
      g.fillStyle(AMBER, 1); g.fillCircle(11, 11, 3);
    });
    mk('crawler', 30, 30, g => {
      halo(g, 15, 15, GREEN, [15, 12, 9], 0.04);
      g.lineStyle(2, GREEN, 1);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.lineBetween(15 + Math.cos(a) * 8, 15 + Math.sin(a) * 8, 15 + Math.cos(a) * 14, 15 + Math.sin(a) * 14);
      }
      g.fillStyle(0x0f2a17, 1); g.fillCircle(15, 15, 10); g.strokeCircle(15, 15, 10);
      g.lineStyle(1, GREEN, 0.4); g.strokeCircle(15, 15, 5);
      g.fillStyle(GREEN, 0.25); g.fillCircle(19, 12, 4); g.fillCircle(19, 18, 4);
      g.fillStyle(GREEN, 1); g.fillCircle(19, 12, 2); g.fillCircle(19, 18, 2);
    });
    mk('rock', 56, 56, g => {
      g.fillStyle(0x2a2530, 1); g.lineStyle(2, 0x4a4455, 1); g.fillCircle(28, 28, 26); g.strokeCircle(28, 28, 26);
      g.fillStyle(0x38303f, 1); g.fillCircle(22, 22, 10);
    });
    mk('tile', 40, 40, g => {
      g.fillStyle(0x0a1424, 1); g.fillRect(0, 0, 40, 40); g.lineStyle(1, 0x14263d, 1); g.strokeRect(0, 0, 40, 40);
    });
    mk('ground', 128, 128, g => {
      g.fillStyle(0x2a1612, 1); g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 40; i++) {
        g.fillStyle(Math.random() < 0.5 ? 0x341b15 : 0x20110d, 1);
        g.fillCircle(Phaser.Math.Between(0, 127), Phaser.Math.Between(0, 127), Phaser.Math.Between(2, 7));
      }
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

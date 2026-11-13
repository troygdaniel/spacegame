// ---------- Boot: draw every texture with shapes ----------
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const mk = (key, w, h, fn) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      fn(g); g.generateTexture(key, w, h); g.destroy();
    };
    mk('ship', 44, 30, g => {
      g.fillStyle(0x0b2236, 1); g.lineStyle(2, CYAN, 1);
      g.beginPath(); g.moveTo(42, 15); g.lineTo(3, 3); g.lineTo(12, 15); g.lineTo(3, 27); g.closePath();
      g.fillPath(); g.strokePath(); g.fillStyle(CYAN, 1); g.fillCircle(22, 15, 3);
    });
    mk('drone', 34, 34, g => {
      g.fillStyle(0x2a0b14, 1); g.lineStyle(2, RED, 1);
      g.beginPath(); g.moveTo(32, 17); g.lineTo(17, 3); g.lineTo(2, 17); g.lineTo(17, 31); g.closePath();
      g.fillPath(); g.strokePath(); g.fillStyle(RED, 1); g.fillCircle(24, 17, 4);
    });
    mk('bullet', 14, 4, g => { g.fillStyle(0xfff1a8, 1); g.fillRect(0, 0, 14, 4); });
    mk('ebullet', 14, 4, g => { g.fillStyle(RED, 1); g.fillRect(0, 0, 14, 4); });
    mk('spark', 6, 6, g => { g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 3); });
    const stars = (key, n, maxR) => mk(key, 512, 512, g => {
      for (let i = 0; i < n; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.9));
        g.fillCircle(Phaser.Math.Between(2, 509), Phaser.Math.Between(2, 509), Phaser.Math.FloatBetween(0.5, maxR));
      }
    });
    stars('stars1', 90, 1.1); stars('stars2', 40, 1.9);
    mk('planet', 640, 640, g => {
      g.fillStyle(0x7a3b2a, 1); g.fillCircle(320, 320, 316);
      const cols = [0x5a2a22, 0x944a30, 0xb25a35, 0x3a1d1d, 0xc9744a];
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 230, r = Phaser.Math.Between(14, 60);
        g.fillStyle(cols[i % cols.length], 0.55); g.fillCircle(320 + Math.cos(a) * d, 320 + Math.sin(a) * d, r);
      }
      g.lineStyle(5, AMBER, 0.45); g.strokeCircle(320, 320, 316);
    });
    mk('station', 440, 440, g => {
      g.lineStyle(14, 0x1d3b5c, 1); g.strokeCircle(220, 220, 190);
      g.lineStyle(3, CYAN, 0.9); g.strokeCircle(220, 220, 198); g.strokeCircle(220, 220, 182);
      g.lineStyle(10, 0x1d3b5c, 1);
      g.lineBetween(220, 30, 220, 410); g.lineBetween(30, 220, 410, 220);
      g.fillStyle(0x0b2236, 1); g.fillCircle(220, 220, 46);
      g.lineStyle(3, CYAN, 1); g.strokeCircle(220, 220, 46);
      g.fillStyle(AMBER, 1); g.fillRect(404, 200, 30, 40);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        g.fillStyle(i % 2 ? AMBER : CYAN, 1); g.fillCircle(220 + Math.cos(a) * 190, 220 + Math.sin(a) * 190, 4);
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
      g.lineStyle(2, GREEN, 1);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.lineBetween(15 + Math.cos(a) * 8, 15 + Math.sin(a) * 8, 15 + Math.cos(a) * 14, 15 + Math.sin(a) * 14);
      }
      g.fillStyle(0x0f2a17, 1); g.fillCircle(15, 15, 10); g.strokeCircle(15, 15, 10);
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
    // dev shortcut: index.html#space or #surface jumps straight to that scene with the mission accepted
    const hash = location.hash.slice(1);
    if (hash === 'space' || hash === 'surface') G.mission = 'accepted';
    this.scene.start(hash === 'space' ? 'Space' : hash === 'surface' ? 'Surface' : 'Station');
  }
}

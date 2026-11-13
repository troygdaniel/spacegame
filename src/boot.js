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
    mk('bullet', 14, 4, g => { g.fillStyle(0xfff1a8, 1); g.fillRect(0, 0, 14, 4); });
    mk('ebullet', 14, 4, g => { g.fillStyle(RED, 1); g.fillRect(0, 0, 14, 4); });
    mk('spark', 6, 6, g => { g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 3); });
    worldArt(this); // src/art_world.js: nebula and star layers, the planet, rocks, ore, surface art
    stationArt(this); // src/stationart.js: Halcyon Station, its ring, hub, shade and lane, Kestrel Outpost, glow dots
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

// ---------- Boot: draw every texture with shapes ----------

// ---- content in markdown (docs/MODDING.md section 5) ----
// contentApply() runs once, first thing in Boot.create, before any scene. It takes the entries of content.generated.js
// (made by tools/build-content.mjs), checks them again (src/content.js, ContentLib.apply) and merges the valid fields over the
// built-in tables by id. It never throws and never stops the game: the worst a broken pack can do is leave the built-in
// values in place and fill CONTENT_ERRORS. Behaviour is unchanged until a table registers itself in CONTENT_TABLES (card m4).
//   CONTENT_TABLES  type -> { has(id), get(id, field), apply(id, data, isNew), canAdd }; one adapter per table moved to markdown
//   CONTENT_ERRORS  every problem found, { level: 'error' | 'warn', path, line, field, message }; the Title chip (card m2b) reads it
//   CONTENT_STATE   { loaded, hash, core, modded, files, applied, skipped }: what happened; applied lists the 'type:id' that changed something;
//                   modded is true when the entries differ from the shipped core pack (the MODDED tag on the Title screen, src/contentui.js)
const CONTENT_TABLES = {};
const CONTENT_ERRORS = [];
const CONTENT_STATE = { loaded: false, hash: '', core: '', modded: false, files: 0, applied: [], skipped: 0 };
function contentApply() {
  let r;
  try {
    // ContentLib is src/content.js; CONTENT is content.generated.js (either missing means: play on the built-in values)
    if (typeof ContentLib === 'undefined') r = { loaded: false, hash: '', files: 0, applied: [], skipped: 0, errors: [{ level: 'error', path: 'src/content.js', line: 0, field: '', message: 'src/content.js did not load, so content was not read. Playing on the built-in values.' }] };
    else r = ContentLib.apply(typeof CONTENT === 'undefined' ? null : CONTENT, CONTENT_TABLES);
  } catch (e) {
    r = { loaded: false, hash: '', files: 0, applied: [], skipped: 0, errors: [{ level: 'error', path: 'content', line: 0, field: '', message: 'content could not be read (' + String(e && e.message || e).slice(0, 100) + '). Playing on the built-in values.' }] };
  }
  CONTENT_ERRORS.length = 0; r.errors.forEach(e => CONTENT_ERRORS.push(e));
  Object.assign(CONTENT_STATE, { loaded: r.loaded, hash: r.hash, core: r.core || '', modded: !!r.modded, files: r.files, applied: r.applied, skipped: r.skipped });
  if (typeof modsApply === 'function' && typeof ContentLib !== 'undefined') modsApply(); // src/mods.js: the packs the player turned on, laid over the core pack
  if (typeof worldSync === 'function') worldSync(); // src/contenttables.js: the systems the files and the packs describe are the ones the game flies
  if (typeof caYardsSync === 'function') caYardsSync(); // src/contentadd.js: a pack's ships go back into the yards worldSync may have rebuilt
  CONTENT_ERRORS.forEach(e => { try { console.warn('[content] ' + (typeof ContentLib !== 'undefined' ? ContentLib.formatError(e) : e.path + ': ' + e.message)); } catch (x) { /* a warning is optional */ } });
}

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    contentApply(); // before anything else reads a table
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
    // #hyper or #hyper<ly> opens the hyperspace tunnel demo (hyperspace.js), the only way into that scene for now
    const hy = /^hyper(\d{1,2})?$/.exec(hash);
    if (hy) { this.scene.start('Hyper', hyperDemo(hy[1])); return; }
    // #pullout plays a hyperspace jump that is pulled out at 50% (pullout.js): the tunnel, deep space with its pirates, then the rest of the tunnel
    if (hash === 'pullout') { this.scene.start('Hyper', pulloutDemo()); return; }
    // #galaxy opens the galaxy map (galaxymap.js) with five systems known: it lands dark, so this hash is the only way in until card u-b4 wires the G key
    if (hash === 'galaxy') { this.scene.start('Galaxy', galaxyDemo()); return; }
    // no hash: the title screen first; #station jumps straight to the station
    this.scene.start(hash === 'surface' ? 'Surface' : quick ? 'Space' : hash === 'station' ? 'Station' : 'Title');
  }
}

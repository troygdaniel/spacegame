// ---------- Meta layer: pause menu, save and load, mute, controls help ----------
// Hooks in from outside the scenes: loadGame() runs before the game boots, installMeta(game) after.
// Esc and M are caught on the window, so station.js, space.js and surface.js need no edits.

const SAVE_KEY = 'longhaul.save.v1';
const GAMEPLAY = ['Station', 'Space', 'Surface'];
const SCREENS = GAMEPLAY.concat('Ship'); // where Tab, H and M work too. The Ship scene (shipmode.js) uses Esc itself, so it is not in GAMEPLAY
const DEV_HASH = /^#(space|surface|escort|patrol|hyper\d{0,2})$/.test(location.hash); // dev jumps neither load nor overwrite a save
let lastSaved = '';

const HELP = {
  Station: [
    'W A S D / arrows   walk',
    'E   use the terminal, repair bay or ship',
    'Esc   close a terminal, or pause',
    'M   mute sound'
  ],
  Ship: [
    'Enter or Space   launch',
    'Esc   back to the station',
    'Tab   sector map',
    'M   mute sound'
  ],
  Space: [
    'A D / left right   turn',
    'W / up   thrust        S / down   brake',
    'Shift   boost with thrust (energy: inner ring)',
    'Q / E   dash left or right (cooldown)',
    'Space or mouse   fire',
    'L   dock or land (fly slowly, close in)',
    'Esc   pause        M   mute sound'
  ],
  Surface: [
    'W A S D / arrows   walk',
    'Mouse   aim        click   fire',
    'E   talk to the colonist, board at the pad',
    'Esc   pause        M   mute sound'
  ]
};

// ---------- save and load (localStorage is optional: every call is wrapped) ----------
function snapshot() {
  return {
    v: 1, credits: Math.floor(G.credits), hull: Math.round(G.hull), maxHull: Math.round(G.maxHull), mission: G.mission,
    missionId: G.missionId || null, missionProgress: Math.floor(G.missionProgress || 0), // missions.js: which call, kills so far
    patrolsDone: G.patrolsDone | 0, // missions.js: unlocks the bounty call
    upgrades: Object.assign({}, G.upgrades), ore: G.ore | 0, // ore in the hold (asteroids.js)
    volume: Math.round(G.volume * 10) / 10, muted: !!G.muted,
    ...guideSnapshot(), // first-run guide, run stats, ending card (guide.js)
    ...poiSnapshot() // salvage sites found and salvaged (poi.js)
  };
}

function saveGame(force) {
  if (DEV_HASH) return;
  const s = JSON.stringify(snapshot());
  if (!force && s === lastSaved) return;
  try { localStorage.setItem(SAVE_KEY, s); lastSaved = s; } catch (e) { /* storage is optional */ }
}

function maxTier(key) { // the highest tier the shop sells for this upgrade (2 if shop.js is missing)
  const u = typeof UPGRADES !== 'undefined' && UPGRADES.find(x => x.key === key);
  return u ? u.prices.length : 2;
}

function loadGame() {
  if (DEV_HASH) return false;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (Number.isFinite(s.credits)) G.credits = Math.max(0, Math.floor(s.credits));
    if (s.upgrades && typeof s.upgrades === 'object') {
      // G.upgrades[key] is a tier 0..max (shop.js). An old save may hold true/false: true is tier 1.
      Object.keys(G.upgrades).forEach(k => {
        const t = s.upgrades[k] === true ? 1 : Math.floor(Number(s.upgrades[k]));
        G.upgrades[k] = Number.isFinite(t) ? Math.min(maxTier(k), Math.max(0, t)) : 0;
      });
    }
    // max hull is 100 + 20 per armor tier; a saved value is kept if it fits, else it comes from the armor tier
    const hullCap = 100 + 20 * maxTier('armor');
    G.maxHull = Number.isFinite(s.maxHull) ? Math.min(hullCap, Math.max(100, s.maxHull)) : 100 + 20 * G.upgrades.armor;
    if (Number.isFinite(s.hull)) G.hull = Math.min(G.maxHull, Math.max(1, s.hull));
    if (['none', 'accepted', 'rescued', 'failed'].includes(s.mission)) G.mission = s.mission;
    if (G.mission === 'rescued') G.mission = 'accepted'; // you always wake up at the station, colonist or not
    // which call it is (missions.js). A save from before missions.js has no id: back then the only call was the rescue.
    const ids = typeof MISSIONS !== 'undefined' ? MISSIONS.map(m => m.id) : ['rescue'];
    G.missionId = ids.includes(s.missionId) ? s.missionId : (s.missionId === undefined && G.mission !== 'none' ? 'rescue' : null);
    G.missionProgress = Number.isFinite(s.missionProgress) ? Math.max(0, Math.floor(s.missionProgress)) : 0;
    if (!G.missionId && G.mission !== 'none') { G.mission = 'none'; G.missionProgress = 0; } // unknown call: no mission
    G.patrolsDone = Number.isFinite(s.patrolsDone) ? Math.max(0, Math.floor(s.patrolsDone)) : 0;
    if (Number.isFinite(s.volume)) G.volume = Math.min(1, Math.max(0, s.volume));
    if (typeof s.muted === 'boolean') G.muted = s.muted;
    G.ore = Number.isFinite(s.ore) ? Math.min(ORE_CAP, Math.max(0, Math.floor(s.ore))) : 0; // asteroids.js
    guideRestore(s); // guide.js: tips done, stats, ending seen
    poiRestore(s); // poi.js: salvage sites found and salvaged
    lastSaved = JSON.stringify(snapshot());
    return true;
  } catch (e) { return false; }
}

function clearSave() {
  lastSaved = '';
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage is optional */ }
}

function newGameState() {
  G.credits = 0; G.maxHull = 100; G.hull = 100; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.patrolsDone = 0;
  Object.keys(G.upgrades).forEach(k => { G.upgrades[k] = 0; });
  G.ore = 0; guideReset(); // guide.js: tips and stats start over
  poiReset(); // poi.js: every site can be salvaged again
}

// ---------- window hooks ----------
function openPause(game) {
  if (game.scene.isActive('Pause')) return;
  const s = game.scene.getScenes(true).find(sc => GAMEPLAY.includes(sc.scene.key));
  if (!s || s.leaving || s.dead || s.panel) return; // fading out, wrecked, or a terminal is open (Esc closes that)
  saveGame();
  s.scene.pause();
  game.scene.run('Pause', { from: s.scene.key });
}

function toggleMute(game) {
  G.muted = !G.muted;
  saveGame();
  if (game.scene.isActive('Pause')) return; // the menu shows it
  const s = game.scene.getScenes(true).find(sc => SCREENS.includes(sc.scene.key));
  if (s) toast(s, G.muted ? 'Sound muted  (M)' : 'Sound on  (M)', '#9fe9ff');
  if (!G.muted) beep(660, 0.08, 'triangle', 0.05);
}

function installMeta(game) {
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Escape') openPause(game);
    else if (e.code === 'KeyM') toggleMute(game);
  });
  setInterval(() => saveGame(), 1000); // credits, hull, mission or volume changed: save within a second
  window.addEventListener('pagehide', () => saveGame());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
}

// ---------- the Pause scene ----------
class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  init(d) {
    this.from = (d && d.from) || 'Station';
    this.view = 'menu'; this.sel = 0; this.confirmNew = false;
    this.born = performance.now(); this.viewAt = this.born;
  }
  create() {
    const cx = W / 2, cy = H / 2;
    this.add.rectangle(cx, cy, W, H, 0x02050c, 0.72).setInteractive(); // swallows clicks
    this.ui = panel(this, { w: 560, h: 470, title: 'PAUSED  -  AUTOSAVE ON', depth: 0 }); // the shared panel style (src/ui.js)
    crTag(this, this.ui, G.credits); // src/ui.js: coin and gold N CR (the game is paused, so it cannot change here)
    this.title = this.ui.titleText;
    this.rows = []; this.zones = [];
    for (let i = 0; i < 7; i++) {
      const y = cy - 126 + i * 44;
      this.rows.push(this.add.text(cx, y, '', { fontFamily: 'monospace', fontSize: '22px', color: '#9fe9ff' }).setOrigin(0.5));
      const z = this.add.rectangle(cx, y, 480, 40, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { if (this.view === 'menu') this.sel = i; });
      z.on('pointerdown', p => { if (this.view === 'menu') { this.sel = i; this.activate(i, p.x); } });
      this.zones.push(z);
    }
    this.help = this.add.text(cx, cy - 10, '', {
      fontFamily: 'monospace', fontSize: '19px', color: '#cfefff', align: 'left', lineSpacing: 12
    }).setOrigin(0.5).setVisible(false);
    this.input.on('pointerdown', () => { if (this.view === 'controls' && performance.now() - this.viewAt > 250) this.setView('menu'); });
    this.k = this.input.keyboard.addKeys('W,A,S,D,E,ENTER,SPACE,ESC,UP,DOWN,LEFT,RIGHT');
    this.refresh();
  }

  setView(v) { this.view = v; this.viewAt = performance.now(); this.confirmNew = false; this.refresh(); }

  rowText(i) {
    const pct = Math.round(G.volume * 100) + '%';
    if (i === 0) return 'Resume';
    if (i === 1) return 'Restart from station';
    if (i === 2) return 'Controls help';
    if (i === 3) return 'Volume   <  ' + pct.padStart(4) + '  >';
    if (i === 4) return G.muted ? 'Sound    MUTED  (M)' : 'Sound    ON  (M)';
    if (i === 5) return 'Ship voice   ' + voiceStatus(); // src/voice.js: optional, needs the player's own Deepgram key
    return this.confirmNew ? 'Select again to erase the save' : 'New game';
  }

  refresh() {
    const menu = this.view === 'menu';
    this.title.setText(menu ? 'PAUSED  -  AUTOSAVE ON' : 'CONTROLS  -  ' + this.from.toUpperCase());
    this.rows.forEach((r, i) => {
      r.setVisible(menu).setText((i === this.sel ? '> ' : '  ') + this.rowText(i))
        .setColor(i === this.sel ? (i === 6 && this.confirmNew ? '#ff4d6d' : '#ffd37a') : '#9fe9ff');
      this.zones[i].input.enabled = menu;
    });
    this.help.setVisible(!menu).setText((HELP[this.from] || HELP.Station).join('\n'));
    this.ui.setHints(menu ? [['↑↓', 'Choose'], ['Enter', 'Select'], ['←→', 'Volume'], ['Esc', 'Resume']] : [['Esc', 'Back']]);
  }

  adjustVolume(dir) {
    G.volume = Math.min(1, Math.max(0, Math.round((G.volume + dir * 0.1) * 10) / 10));
    if (G.volume > 0 && G.muted) G.muted = false;
    saveGame(); beep(660, 0.08, 'triangle', 0.05);
  }

  resume() {
    const sc = this.scene.get(this.from); // clear a stale Esc flag so a terminal does not close the moment it opens
    if (sc && sc.k && sc.k.ESC) Phaser.Input.Keyboard.JustDown(sc.k.ESC);
    this.scene.stop(); this.scene.resume(this.from);
  }

  toStation() {
    this.scene.stop(this.from);
    this.scene.start('Station', { arrive: false });
  }

  activate(i, px) {
    if (i !== 6) this.confirmNew = false;
    if (i === 0) this.resume();
    else if (i === 1) {
      if (G.mission === 'rescued') G.mission = 'accepted'; // the colonist stays behind; the call is still open
      saveGame(); this.toStation();
    } else if (i === 2) this.setView('controls');
    else if (i === 3) this.adjustVolume(px !== undefined && px < W / 2 ? -1 : 1);
    else if (i === 4) { G.muted = !G.muted; saveGame(); if (!G.muted) beep(660, 0.08, 'triangle', 0.05); }
    else if (i === 5) voiceOpenSetup(this);
    else if (i === 6) {
      if (!this.confirmNew) { this.confirmNew = true; return; }
      clearSave(); newGameState(); saveGame(true); this.toStation();
    }
  }

  update() {
    const JD = Phaser.Input.Keyboard.JustDown, k = this.k;
    const esc = JD(k.ESC); // always consume it: the Esc that opened this menu may still be flagged
    if (esc && performance.now() - this.born > 200) {
      if (this.view === 'controls') this.setView('menu'); else { this.resume(); return; }
    }
    if (this.view === 'controls') {
      if (JD(k.ENTER) || JD(k.SPACE) || JD(k.E)) this.setView('menu');
    } else {
      if (JD(k.UP) || JD(k.W)) { this.sel = (this.sel + 6) % 7; this.confirmNew = false; }
      if (JD(k.DOWN) || JD(k.S)) { this.sel = (this.sel + 1) % 7; this.confirmNew = false; }
      if (this.sel === 3) {
        if (JD(k.LEFT) || JD(k.A)) this.adjustVolume(-1);
        if (JD(k.RIGHT) || JD(k.D)) this.adjustVolume(1);
      }
      if (JD(k.ENTER) || JD(k.SPACE) || JD(k.E)) this.activate(this.sel);
    }
    if (this.scene.isActive()) this.refresh();
  }
}

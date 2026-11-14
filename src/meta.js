// ---------- Meta layer: pause menu, save and load, mute, controls help ----------
// Hooks in from outside the scenes: loadGame() runs before the game boots, installMeta(game) after.
// Esc and M are caught on the window, so station.js, space.js and surface.js need no edits.

const SAVE_KEY = 'longhaul.save.v2';     // docs/UNIVERSE.md 8.2
const SAVE_KEY_V1 = 'longhaul.save.v1';  // read when v2 is missing; never written, never deleted
const GAMEPLAY = ['Station', 'Space', 'Surface'];
const SCREENS = GAMEPLAY.concat('Ship'); // where Tab, H and M work too. The Ship scene (shipmode.js) uses Esc itself, so it is not in GAMEPLAY
const DEV_HASH = /^#(space|surface|escort|patrol|hyper\d{0,2}|galaxy)$/.test(location.hash); // dev jumps neither load nor overwrite a save
let lastSaved = '';

const HELP = {
  Station: [
    'W A S D / arrows   walk',
    'E   use the terminal, repair bay or ship',
    'Esc   close a terminal, or pause',
    'J   journal: who you have met',
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

// the fleet records, the ship stats and the G accessors over the active ship are in src/fleet.js (card u-a3)
// the stars a new game already knows (docs/UNIVERSE.md 4.3: the nearest ones): the home system and Kestrel, 6.3 ly away, so the first jump is there to be made
const START_KNOWN = ['halcyon', 'kestrel'];
G.lastDock = homeDock(); G.known = START_KNOWN.slice(); G.jumps = 0; G.charted = [];

// ---------- save and load (localStorage is optional: every call is wrapped) ----------
// Save v2 (docs/UNIVERSE.md 8.2). The v1 key is only ever read, and only when v2 is missing; it is never written or deleted,
// so going back to an older build loses nothing. The first save after loading a v1 file writes v2.
function shipSnapshot(r) {
  const parts = {}; SHIPREC.slots.forEach(k => { parts[k] = r.parts[k] | 0; });
  return { uid: r.uid | 0, model: r.model, name: r.name, at: r.at, hull: Math.round(r.hull), fuel: Math.round(r.fuel * 10) / 10, ore: r.ore | 0, parts };
}

function snapshot() {
  return {
    v: 2, credits: Math.floor(G.credits), mission: G.mission,
    missionId: G.missionId || null, missionProgress: Math.floor(G.missionProgress || 0), // missions.js: which call, kills so far
    patrolsDone: G.patrolsDone | 0, // missions.js: unlocks the bounty call
    system: G.system, lastDock: G.lastDock, jumps: G.jumps | 0, known: G.known.slice(), charted: G.charted.slice(),
    active: G.active, fleet: G.fleet.map(shipSnapshot), // hull, fuel, ore and parts live per ship
    volume: Math.round(G.volume * 10) / 10, muted: !!G.muted,
    ...guideSnapshot(), // first-run guide, run stats, ending card (guide.js)
    ...poiSnapshot(), // salvage sites found and salvaged (poi.js)
    ...chatSnapshot() // NPC chat memory: who you met, what they think of you, the Journal (chat.js); never the key
  };
}

function saveGame(force) {
  if (DEV_HASH) return;
  const s = JSON.stringify(snapshot());
  if (!force && s === lastSaved) return;
  try { localStorage.setItem(SAVE_KEY, s); lastSaved = s; } catch (e) { /* storage is optional */ }
}

function slotCap(slot) { return PARTS[slot] ? PARTS[slot].prices.length : 3; } // the highest tier of a part slot (src/data_parts.js)

// A v1 save, turned into the v2 shape so one loader reads both (section 8.3): one Wren with the old upgrades as parts,
// its tank full, the ore from the hold, parked at the station. Everything else (credits, mission, patrols, volume, muted,
// poi, guide, stats) already has the same name and is copied across as it is.
function v1ToV2(s) {
  const up = s.upgrades && typeof s.upgrades === 'object' ? s.upgrades : {}, parts = {};
  SHIPREC.slots.forEach(k => { parts[k] = 0; });
  Object.keys(SHIPREC.oldKeys).forEach(old => { // an old save may hold true/false for a tier: true is tier 1
    const t = up[old] === true ? 1 : Math.floor(Number(up[old]));
    parts[SHIPREC.oldKeys[old]] = Number.isFinite(t) ? Math.min(2, Math.max(0, t)) : 0; // the v1 shop sold tiers 1 and 2
  });
  const maxHull = SHIPREC.hull; // armor plating used to add 20 hull a tier; shields (points of their own) replace that, and the hull is capped below
  const out = Object.assign({}, s, {
    v: 2, system: 'halcyon', lastDock: homeDock(), jumps: 0, known: START_KNOWN.slice(), charted: [], active: 0,
    fleet: [{ uid: 1, model: 'wren', name: 'Wren', at: homeDock(), hull: s.hull, maxHull, fuel: SHIPREC.fuel, ore: s.ore, parts }]
  });
  ['hull', 'maxHull', 'ore'].forEach(k => { delete out[k]; }); // now per ship (upgrades stays: guideRestore reads it for saves from before the guide)
  return out;
}

// one fleet record from a save; anything missing or unknown becomes the Wren's value, the rest is kept
function shipFromSave(r, at) {
  r = r && typeof r === 'object' ? r : {};
  const rec = newShip('wren', at), p = r.parts && typeof r.parts === 'object' ? r.parts : {};
  rec.uid = Number.isInteger(r.uid) && r.uid > 0 ? r.uid : 0; // made unique by the caller
  rec.model = modelKnown(r.model) ? r.model : 'wren';
  rec.name = typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, SHIPREC.name) : 'Wren';
  if (typeof r.at === 'string' && r.at) rec.at = r.at;
  SHIPREC.slots.forEach(k => {
    const t = p[k] === true ? 1 : Math.floor(Number(p[k]));
    rec.parts[k] = Number.isFinite(t) ? Math.min(slotCap(k), shipMaxTier(rec.model, k), Math.max(0, t)) : 0; // never above what the hull can fit
  });
  rec.maxHull = shipStat('hull', rec); // the model's hull: no part adds to it any more (an old save's 120 or 140 comes down to this)
  rec.hull = Number.isFinite(r.hull) ? Math.min(rec.maxHull, Math.max(1, r.hull)) : rec.maxHull;
  rec.fuel = Number.isFinite(r.fuel) ? Math.min(200, Math.max(0, r.fuel)) : SHIPREC.fuel;
  rec.ore = Number.isFinite(r.ore) ? Math.min(holdCap(rec), Math.max(0, Math.floor(r.ore))) : 0; // the hold: asteroids.js and the cargo part
  return rec;
}

function applySave(s) {
  if (Number.isFinite(s.credits)) G.credits = Math.max(0, Math.floor(s.credits));
  // You always wake docked at lastDock, so the system is the one that station is in. A station or system this build does
  // not know (a later version's) falls back to Halcyon, and the rest of the save is kept.
  const dockSys = Object.keys(SYSTEMS).find(id => sysBodies('station', id).some(b => b.id === s.lastDock));
  G.system = dockSys || (SYSTEMS[s.system] ? s.system : 'halcyon');
  G.lastDock = dockSys ? s.lastDock : (sysBodies('station', G.system)[0] || { id: homeDock() }).id;
  const strs = a => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && x))] : [];
  G.known = strs(s.known); START_KNOWN.slice().reverse().forEach(id => { if (!G.known.includes(id)) G.known.unshift(id); }); // the start stars are always known, first
  G.charted = strs(s.charted);
  G.jumps = Number.isFinite(s.jumps) ? Math.max(0, Math.floor(s.jumps)) : 0;

  G.fleet = (Array.isArray(s.fleet) ? s.fleet.slice(0, SHIPREC.max) : []).map(r => shipFromSave(r, G.lastDock));
  if (!G.fleet.length) G.fleet = [newShip('wren', G.lastDock)];
  const seen = new Set(); let next = 1 + Math.max(0, ...G.fleet.map(r => r.uid));
  G.fleet.forEach(r => { if (!r.uid || seen.has(r.uid)) r.uid = next++; seen.add(r.uid); });
  G.active = Number.isInteger(s.active) && s.active >= 0 && s.active < G.fleet.length ? s.active : 0;
  fleetSync(); // the ship you fly is at the station you wake in (src/fleet.js)

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
  guideRestore(s); // guide.js: tips done, stats, ending seen
  poiRestore(s); // poi.js: salvage sites found and salvaged (after G.system: the sites are the current system's)
  chatRestore(s); // chat.js: NPC chat memory, every string clamped on the way in
}

function loadGame() {
  if (DEV_HASH) return false;
  try {
    let raw = localStorage.getItem(SAVE_KEY), s;
    if (raw) s = JSON.parse(raw);                                   // v2 (or a later version, read the same way)
    else if ((raw = localStorage.getItem(SAVE_KEY_V1))) s = v1ToV2(JSON.parse(raw)); // only v1 exists: migrate, never touch it
    if (!s || typeof s !== 'object') return false;
    applySave(s);
    lastSaved = JSON.stringify(snapshot());
    return true;
  } catch (e) { return false; }
}

function clearSave() { // erases the v2 save. The v1 key stays untouched: new game writes a fresh v2 save straight after, so it is never read again
  lastSaved = '';
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage is optional */ }
}

function newGameState() {
  G.credits = 0; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.patrolsDone = 0;
  G.system = 'halcyon'; G.lastDock = homeDock(); G.known = START_KNOWN.slice(); G.charted = []; G.jumps = 0;
  G.fleet = [newShip()]; G.active = 0; // hull, hold and parts are per ship: a new Wren starts them all over
  guideReset(); // guide.js: tips and stats start over
  poiReset(); // poi.js: every site can be salvaged again
  chatReset(); // chat.js: the characters forget you (the chat key stays: it belongs to the browser, not the save)
}

// ---------- window hooks ----------
function openPause(game) {
  if (game.scene.isActive('Pause')) return;
  if (typeof jumpEscape === 'function' && jumpEscape(game)) return; // src/jump.js: Esc during a charge cancels the charge
  if (typeof JUMPST !== 'undefined' && performance.now() - JUMPST.closedAt < 250) return; // the Esc that has just closed the galaxy map must not also open the pause menu
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
    this.ui = panel(this, { w: 560, h: 520, title: 'PAUSED  -  AUTOSAVE ON', depth: 0 }); // the shared panel style (src/ui.js)
    crTag(this, this.ui, G.credits); // src/ui.js: coin and gold N CR (the game is paused, so it cannot change here)
    this.title = this.ui.titleText;
    this.rows = []; this.zones = [];
    for (let i = 0; i < 9; i++) {
      const y = cy - 160 + i * 40;
      this.rows.push(this.add.text(cx, y, '', { fontFamily: 'monospace', fontSize: '22px', color: '#9fe9ff' }).setOrigin(0.5));
      const z = this.add.rectangle(cx, y, 480, 38, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { if (this.view === 'menu') this.sel = i; });
      z.on('pointerdown', p => { if (this.view === 'menu') { this.sel = i; this.activate(i, p.x); } });
      this.zones.push(z);
    }
    this.help = this.add.text(cx, cy - 10, '', {
      fontFamily: 'monospace', fontSize: '19px', color: '#cfefff', align: 'left', lineSpacing: 12
    }).setOrigin(0.5).setVisible(false);
    this.input.on('pointerdown', () => { if (this.view === 'controls' && performance.now() - this.viewAt > 250) this.setView('menu'); });
    this.k = this.input.keyboard.addKeys('W,A,S,D,E,ENTER,SPACE,ESC,UP,DOWN,LEFT,RIGHT');
    this.events.on('resume', () => { this.born = performance.now(); }); // back from the Journal or a key setup: their Esc must not also resume the game
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
    if (i === 6) return 'NPC chat   ' + chatStatus(); // src/chat.js: optional, needs the player's own OpenAI or Anthropic key
    if (i === 7) return 'Journal   (J in the station)'; // src/journal.js: who you have met and what you learned
    return this.confirmNew ? 'Select again to erase the save' : 'New game';
  }

  refresh() {
    const menu = this.view === 'menu';
    this.title.setText(menu ? 'PAUSED  -  AUTOSAVE ON' : 'CONTROLS  -  ' + this.from.toUpperCase());
    this.rows.forEach((r, i) => {
      r.setVisible(menu).setText((i === this.sel ? '> ' : '  ') + this.rowText(i))
        .setColor(i === this.sel ? (i === 8 && this.confirmNew ? '#ff4d6d' : '#ffd37a') : '#9fe9ff');
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
    if (i !== 8) this.confirmNew = false;
    if (i === 0) this.resume();
    else if (i === 1) {
      if (G.mission === 'rescued') G.mission = 'accepted'; // the colonist stays behind; the call is still open
      saveGame(); this.toStation();
    } else if (i === 2) this.setView('controls');
    else if (i === 3) this.adjustVolume(px !== undefined && px < W / 2 ? -1 : 1);
    else if (i === 4) { G.muted = !G.muted; saveGame(); if (!G.muted) beep(660, 0.08, 'triangle', 0.05); }
    else if (i === 5) voiceOpenSetup(this);
    else if (i === 6) chatOpenSetup(this);
    else if (i === 7) journalOpen(this);
    else if (i === 8) {
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
      if (JD(k.UP) || JD(k.W)) { this.sel = (this.sel + 8) % 9; this.confirmNew = false; }
      if (JD(k.DOWN) || JD(k.S)) { this.sel = (this.sel + 1) % 9; this.confirmNew = false; }
      if (this.sel === 3) {
        if (JD(k.LEFT) || JD(k.A)) this.adjustVolume(-1);
        if (JD(k.RIGHT) || JD(k.D)) this.adjustVolume(1);
      }
      if (JD(k.ENTER) || JD(k.SPACE) || JD(k.E)) this.activate(this.sel);
    }
    if (this.scene.isActive()) this.refresh();
  }
}

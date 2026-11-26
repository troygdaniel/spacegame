// ---------- The Campaign scene: reads the keys, steps src/campaign.js, draws what its numbers say (docs/CAMPAIGN.md) ----------
// The only Phaser in the mode. Every rule, number and word comes from src/campaign.js (the tuning table CAMP, the sim, uiText for the text), so this
// file draws and listens and decides nothing about the game. It is not run by a test in plain Node (a scene is Phaser's): tests/campaign.mjs runs the sim.
//   K on the title opens it (campaignStart); Enter begins a level; the arrow keys fly, Space (held) makes the eight turrets fire, Enter fires a homing missile at the target (the magazine is C.missiles);
//   there is no other gun: the turrets aim themselves at the nearest alien in reach, always, and fire only while Space is held; the scene draws them, their reach and their flash (syncRockets)
//   S puts the view back on the cruiser and opens the cruiser list (it fades when untouched; card space-game-keys2-cruiser; its digits do its rows: src/camppanel.js; the fleet, ship, power, autopilot and all-squads lists are deleted: card space-game-delete-off-lists); / types an order and . speaks one (the strip and the ship computer, src/shipcomputer.js, find this scene);
//   Esc pauses (this scene's own pause, not Long Haul's: the Long Haul save is not touched here); after a win the story, the tech pick (1 2 3), then the next level.
// Mode: 'intro' (the story before) -> 'play' <-> 'pause' -> 'won' (story after) -> 'pick' (one of three techs, when the level offers any) -> next level, or after the last level 'end' (back to the title);
// or 'lost' (Enter tries again).
// this.camp is the game (campNew); this.panel is true while a card is up, which keeps the command strip from opening over it.

// what each ship is drawn as: a texture (art: a ship picture of the Campaign's own, src/campcruiser.js; model: a ship model of src/shipmodels.js; else a texture of the game) and its scale
const CAMP_LOOK = {
  // the carrier and the ships it launches: how big they are is CAMP.size (the drawn length and the hit circle, one table); the scale is that length over the picture's own width w (h is its height)
  carrier: campArtLook('carrier', 'cruiser'), fighter: campArtLook('fighter', 'fighter'), // the pictures are the Campaign's own (src/campcruiser.js)
  freighter: { tex: 'freighter', scale: 1 },
  skiff: campArtLook('skiff', 'skiff'), cutter: campArtLook('cutter', 'cutter'), brute: campArtLook('brute', 'brute'), // the pirates (card space-game-l1-pirates-traffic): scavenged rust and ochre, pictures of their own (src/camppirateart.js), not the aliens' red
  pirateleader: campArtLook('pirateleader', 'pirateleader'), // the rival ship: the cruiser's size, a picture of its own (src/camppirateart.js)
  tboat: campArtLook('tboat', 'tboat'), lancer: campArtLook('lancer', 'lancer'), // the torpedo boats (card space-game-torpedo-art): the pirates' rust tube with the warhead showing, the aliens' violet spear (src/camppirateart.js)
  patrol: campArtLook('patrol', 'patrol'), miner: campArtLook('miner', 'miner'), // the neutral ships: a pale police hull with a teal stripe, an industrial miner
  raider: { tex: 'raider', scale: 1 }, drone: { tex: 'drone', scale: 1 }, gunship: { tex: 'gunship', scale: 1 }, mother: { tex: 'reaver', scale: 2.6, tint: 0xc9a0ff }, tower: { tex: 'gunship', scale: 1.6, tint: 0xff9a3a }
};
const CAMP_SHOT = { pirate: 0xffa83a, neutral: 0x7fe9ff, earth: 0x6dff9c }; // the colour of a pirate's shot (amber: not the aliens' red), of a neutral patrol's (cyan) and of the Earth side's (green: the cruiser's turrets and the three pilots; the wing's green of the Tab map, CAMPMAP.color.wing), as the textures 'shot-pirate', 'shot-neutral' and 'shot-earth' (campShotTextures); an alien's stays the game's red 'ebullet', and the Long Haul keeps its own 'bullet'
function campShotTextures(scene) { // made once, 14 by 4 like the game's own bullet
  Object.keys(CAMP_SHOT).forEach(k => { const key = 'shot-' + k; if (scene.textures.exists(key)) return; const g = scene.make.graphics({ x: 0, y: 0, add: false }); g.fillStyle(CAMP_SHOT[k], 1); g.fillRect(0, 0, 14, 4); g.generateTexture(key, 14, 4); g.destroy(); });
}
const CAMP_REACH = { w: 2, alpha: 0.4, rest: 0.33, up: 80, down: 320, color: 0xffd37a }; // the ring that shows how far the point guns reach (CAMP.carrier.pdRange): its line width, how solid it is while the turrets fire (it was 1 px at 0.16, too faint to find: 6-GEN and 8-GEN), the share of that it rests at (the cloud brief 3, decision 3: about a third), the ms it takes to come up when the fire key is pressed and to go back when it is let go, its colour
// how bright the reach ring is now, 0 (resting) to 1 (the turrets are firing: the fire key is held, or the autofire switch is on): it comes up quickly and goes back slowly, by the clock of the scene (a stand-in without one reads performance.now)
function campReachGlow(s, C) {
  const R = CAMP_REACH, now = s.time && typeof s.time.now === 'number' ? s.time.now : (typeof performance !== 'undefined' ? performance.now() : 0), dt = Math.max(0, Math.min(200, now - (s.reachAt === undefined ? now : s.reachAt)));
  s.reachAt = now;
  const want = campFiring(C) ? 1 : 0, k = s.reachK || 0;
  return (s.reachK = k + (want - k) * (1 - Math.exp(-dt / (want > k ? R.up : R.down))));
}
const CAMP_MOUNT = { base: 3.2, dot: 1.7, hot: 2.8, aim: [7, 11], width: [1.5, 2.2], flash: 10, flashScale: 0.9, stub: [6.5, 0x9aa0a8] }; // a turret mount, drawn on the hull (it is a third smaller since the carrier is): its dark base, its amber dot (and the dot while it fires), the length of the barrel at rest and on a shot, the barrel's width at rest and on a shot, and how far in front of the mount the muzzle flash is and how big (it was 1.3 on the 140 px carrier and hid the bow of the 98 px one), and the steel barrel a mount with nothing to shoot at points along the carrier's heading (its length and colour: without it a mount was a lit dot and read as a window, the blind critic)
const CAMP_BLIP = { gap: 70, flash: 90 }; // a turret's shot: at most one sound (sfx('turret', its number), src/audio.js) in gap ms of the battle's clock; the muzzle flash lasts flash ms
const CAMP_SND = { blast: 45, hull: 90, shield: 90, earth: 250, wing: 55, far: 1600, min: 0.1 }; // the least gap, in ms of the battle's clock, between two sounds of one kind (a kill, a hull hit, a shield hit, a shot on Earth), so a busy fight does not pile them up
// the pause (card space-game-paused-big; Troy, 23 Nov 2026: "show the word PAUSED much more obviously: a large word on a highlighted band across the middle, the scene dimmed behind"): showPause hands showCard
// its words with band true and drawPauseBand draws them. veil: how dark the battle goes; lift: the band's middle is this far above the screen's middle; bandH, word (the letters' size), space (between them);
// gap: the panel under the band starts this far below it and ends this far above the foot; panelW, size (the help's letters), wrap, lineSpacing: the help in the panel; pad: the panel's top margin; hintRoom: the foot line's room
const CAMP_PAUSE = { veil: 0.72, lift: 40, bandH: 106, bandAlpha: 0.94, edge: 2, word: 75, space: 12, gap: 14, panelW: 980, size: 17, wrap: 920, lineSpacing: 6, pad: 12, hintRoom: 44 };
const CAMP_ADDR = { used: false }; // the address (?campaign=N, src/title.js) opens the Campaign once per page load: coming back to the title from it must not open it again

// (every start of the ready room passes {}: Phaser starts a scene with the data of its LAST start when it is given none, and the last may have been a dock's, with a battle that is long over in it)
function campaignStart(s, level) { // the title's K: the ready room (src/camphubscene.js) of the mission the save says is next; a level asked for by number goes straight to that level, as the tune kit does
  if (!level) { go(s, 'CampHub', {}); return; }
  let n = level; while (n > 1 && !CAMP.levels[n]) n--;
  go(s, 'Campaign', { level: n });
}

const campShipK = (s, id) => { const sp = s && s.sp && s.sp[id]; return sp && sp._k > 1 ? sp._k : 1; }; // how many times the far view draws a ship's picture up (its least size, src/campzoom.js; 1 at a zoom where it is big enough): what is drawn ON the hull (the cruiser's turret mounts and bay lights) is carried out with it, so it stays where the picture's own turrets and bays are (card space-game-ships-bigger)
// a tech as the pick and the refit cards list it (card space-game-ready-room-simple): its name and what it changes in plain words with the numbers (src/camphub.js campHubTechChange), else the tech's own sentence
const campTechLine = (id, P) => uiText('camp.tech.' + id + '.name') + '  -  ' + ((typeof campHubTechChange === 'function' && campHubTechChange(id, P)) || uiText('camp.tech.' + id + '.text')); // P: the pilot's progress, for the numbers that depend on what he has

// THE STORY CARD IS GONE in the new look (piece b of the new screens, card space-game-screens-b-briefing; Troy, 25 Nov 2026): Launch starts the flight, and the level's opening lines (camp.l<N>.before.*, the words of the old story card) are said on the
// radio instead, in order, about four seconds apart and before anything else of the flight: each is offered to the radio's hold (src/campsayhold.js) as a kept line, so a line that is up is never overwritten and none is dropped; spaced like this
// the voice (a queue of two, six seconds: src/voice.js) says each in full. Only a level started from the ready room (via 'hub'), and not a replay: the others keep the card.
const CAMP_OPENERS = { first: 900, gap: 4500 }; // ms from the start of the flight to the first line, and between the lines
function campOpeners(sc) { // the number of lines that will be said
  const lines = typeof campStory === 'function' ? campStory(sc.level, 'before', !!(sc.P && sc.P.revealed)) : []; if (!lines.length || !sc.time || typeof sc.time.delayedCall !== 'function') return 0;
  lines.forEach((l, i) => sc.time.delayedCall(CAMP_OPENERS.first + i * CAMP_OPENERS.gap, () => { if (!sc.leaving && sc.camp && !sc.camp.result && typeof sc.radioShow === 'function') sc.radioShow(campSayOffer(sc.sayR || (sc.sayR = campSayNew()), (sc.time && sc.time.now) || 0, { text: l, keep: true })); }));
  return lines.length;
}
// the new look of the cards (src/scrcards.js, src/scrcardsdraw.js; piece a of the new screens, behind CAMP.flags.screens): true when the card was drawn as page panels, false when the old card is to be drawn (the switch is off, or there is no page to draw on).
// A function and not a method, and the switch asked first: a stand-in scene of a test, which has only the card functions it needs, is not touched while the switch is off
function campNewCard(s, model, veil) {
  if (typeof scrOn !== 'function' || !scrOn() || typeof scrCardShow !== 'function') return false;
  Campaign.prototype.cardPrep.call(s); return scrCardShow(s, model(), veil);
}
class Campaign extends Phaser.Scene {
  constructor() { super('Campaign'); }
  init(d) { // d: { level, techs (instead of the saved ones: the address's), via, seed, god }
    d = d || {}; this.d0 = d; this.warped = !!d.warped; // the start's own data, for the warp cinematic to hand back (src/campwarp.js)
    this.level = d.level || 1; this.via = d.via || 'menu'; this.opts = { seed: d.seed, god: !!d.god, via: this.via };
    this.P = campProgressLoad(); if (Array.isArray(d.techs)) this.P.techs = d.techs.filter(t => CAMP.tech[t]);
    this.mi = d.mission != null ? d.mission | 0 : (this.P.level === this.level ? this.P.mission | 0 : 0); if (this.mi >= campMissions(this.level).length) this.mi = 0; // the mission of the level to fly: the one asked for, else the next the save has
    this.opts.mission = this.mi;
    this.replay = !!d.replay && (!!(this.P.results && this.P.results[campResultKey(this.level, this.mi)]) || (typeof campHubFlyable === 'function' && campHubFlyable(this.P).some(r => r.level === this.level && r.i === this.mi))); // a mission flown AGAIN from the ready room (card space-game-campaign-replay): only one that has a result, or one SKIPPED (card space-game-replay-reselect-bug: before the next, no result: its first win is kept as its result); its story and progress do not move
    this.resume = !this.replay && this.via !== 'retry' && (this.P.levelDone | 0) === this.level && this.P.level === this.level && this.mi === campMissions(this.level).length - 1; // the level was won and the tab closed at the pick: the launch shows the level's story and the pick again, not a battle
    campReveal(!!this.P.revealed); // after the ending has been seen, level 3 is called the outpost (SPOILER, src/campaign.js)
    this.leaving = false; this.panel = false; this.mode = 'intro'; this.card = null; this.mp = null; this.shown = {}; this.sayR = campSayNew();
  }
  create() {
    if (typeof campWarpDue === 'function' && campWarpDue(this)) return; // a level that warps in starts with the warp cinematic, which comes back here with warped: true (src/campwarp.js)
    const dark = this.warped ? 255 : 0; this.cameras.main.fadeIn(300, dark, dark, dark); // out of the warp's white flash, else out of black
    if (typeof campWorldOn === 'function' && campWorldOn() && typeof campWorldBackdrop === 'function') campWorldBackdrop(this); else spaceBackdrop(this, true); // the new world look's backdrop (near black, white stars, two faint slate clouds: card space-game-world-w1-backdrop) or today's
    campShotTextures(this); // the pirates', the neutrals' and the Earth side's shots
    this.boom = fxBoom(this);
    if (typeof campTuneLoadOnce === 'function') campTuneLoadOnce(); // the tuning panel's overrides (src/camptune.js) go into the CAMP table before the battle is made: a page reads them once; a bot or a test never does
    this.pickZoom = null; // the zoom a target sub-list took and the one to give back (src/camppickdraw.js)
    this.peek = null; this.selPeek = null; // the peek at a picked ship that was off the screen, and the ships picked the frame before (src/campselzoom.js)
    this.tuned = false; // a mission flown with any override on is a tuned run: its score and rank are not kept (update sets it)
    this.camp = this.makeCamp();
    this.sp = {}; this.bsp = []; this.bayAt = { launch: -1e9, land: -1e9 }; // the battle clock of the last launch and the last landing: the bays of the cruiser stay lit a moment after each (campBayLight)
    const pl = campPlaces(this.level); this.farObjs = {}; this.farAt = 0; Object.keys(pl).forEach(id => { if (!pl[id].hidden && !pl[id].far) this.drawPlace(pl[id], id); }); // the far bodies of the system (Sol's planets) are made when the carrier comes near (syncFar)
    this.osp = {}; this.rsp = {}; this.beams = []; // the ore lying about (chunks and wrecks), one sprite each; the rocks of the belt, one each; the beams on this frame
    this.beamG = this.add.graphics().setDepth(3.5); // the cracks and the beams
    this.csp = this.camp.caches.map(k => (typeof campWorldCacheImage === 'function' && campWorldCacheImage(this, k)) || this.add.image(k.x, k.y, 'pod').setScale(1.8).setDepth(3).setTint(0xffd37a)); // resource caches (level 2): gold pods that go when collected (the world look: a gold diamond in a thin gold ring, src/campworldobjects.js)
    this.anomG = this.add.graphics().setDepth(1.5); // the haze of the anomalies and the decloaked caches (src/campanomalydraw.js)
    this.squadG = this.add.graphics().setDepth(4.5); // the square marks on the fighters of a squad in focus (cards space-game-fighter-squads, space-game-friendly-display)
    this.relicG = this.add.graphics().setDepth(2); // the relic's ring (level 2), and how far the hold has got
    this.cachel = this.camp.caches.map(k => label(this, k.x, k.y + 34, uiText('camp.nav.cachelabel'), '#ffd37a', 12)); // a word under each cache: gold pods were easy to miss (docs/night/graphics.md finding 3)
    if (this.camp.relic) this.relicLabel = label(this, this.camp.relic.x, this.camp.relic.y - this.camp.L.relic.radius - 24, uiText('camp.nav.relicmark'), typeof campWorldOn === 'function' && campWorldOn() ? '#e9b872' : '#7fe9ff', 14); // gold with the world look on: the relic is the goal
    this.sync();
    this.cameras.main.startFollow(this.sp[this.camp.carrier.id], true, 0.12, 0.12);
    this.k = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,SPACE,SHIFT'); // SHIFT: the cruiser's boost (src/campboost.js)
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hudBack = this.add.rectangle(W / 2 - CAMP.hud.plate.w / 2, CAMP.hud.text.y - 6, CAMP.hud.plate.w, CAMP.hud.plate.min, 0x02060d, 0.4).setOrigin(0, 0).setScrollFactor(0).setDepth(99); // a dim plate under the HUD column at the top centre (it was at the top left until card space-game-layout-hud): a bright planet (Ceres at the start of 1.2) drawn through the white objective line and the bay line made them hard to read (card space-game-l1-mine-goal, docs/night/hunt-l1-rim.md D)
    this.keysBack = this.add.rectangle(W / 2, H - 35, W, 26, 0x02060d, 0.75).setScrollFactor(0).setDepth(99); // a thin strip under the bottom key line: a ship or a rock drawn through 'Tab Map  H Keys' was hard to read (card space-game-campaign-panels-ui)
    const t = (x, y, size, color) => this.add.text(x, y, '', uiFont(size, color, { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    const mid = (y, size, color) => t(CAMP.hud.text.x, y, size, color).setOrigin(0.5, 0); // the lines of the HUD column stand at the top centre (CAMP.hud.text), each centred on x; flowHud puts each one where the lines above it end (card space-game-layout-hud: wave, goal, Earth, repair and outpost lines moved from the top left, which is the cruiser's corner now; the three gauges and the ore line are gone)
    this.hudBelow = CAMP.hud.text.y + 2 * CAMP.hud.text.pitch; // where the column ends: the mothership's name and bar and the rival's bars stand under it (flowHud keeps it)
    this.hud = { earth: mid(14, 14, '#9fe9ff'), wave: mid(6, 14, '#ffd37a'), mother: t(W / 2 - 150, this.hudBelow, 14, '#ff9ec0'),
      obj: mid(28, 14, '#ffffff'), post: mid(102, 14, '#ffb454'), arrow: t(0, 0, 13, '#ffd37a').setOrigin(0.5), keys: this.add.text(CAMP.corner.edge - CAMP.corner.ink, H - 44, campKeyLine(), uiFont(14, '#9fbdd1', { stroke: '#02060d', strokeThickness: 4 })).setScrollFactor(0).setDepth(100) };
    this.gaugeAnim = campGaugeAnimNew(this.camp.power.p); this.gaugeAt = performance.now(); // the bars' animation of the power pips (src/camphud.js; only with CAMP_POWER on, and nothing draws them now: the three gauges are gone, card space-game-layout-hud, and the power list is deleted)
    this.msp = null; // the missiles in flight, the turrets' ring and mounts: made on the first frame (syncRockets), new for each battle (the old bottom-left count text was the flag)
    if (typeof campCruiserHudMake === 'function') Object.assign(this.hud, campCruiserHudMake(this, uiFont)); // the cruiser's status at the top left, over the Q CRUISER title: SHIELD and HULL bars and the ORE line (src/campcruiserhud.js; card space-game-layout-cruiser): five texts in the HUD, so a result card hides them with the rest
    this.powerKey = this.camp.power.base.join(); // the setting as it was saved: a change of it is saved when it is made (update)
    this.hud.repair = mid(80, 14, '#9fe9ff'); // the fighters being mended in the bay (card space-game-fighter-repair): "REPAIR 2  7 s"
    this.radio = chatterNew(); this.orderSeen = Object.assign({}, this.camp.orders); this.chatUntil = 0; // the wing's radio (src/campchatter.js): its state, the orders seen so far, when its line goes
    this.hud.chat = this.add.text(CAMP.corner.edge - CAMP.corner.ink, H - CAMP.corner.radio, '', uiFont(15, '#ffd37a', { stroke: '#02060d', strokeThickness: 3, wordWrap: { width: 330 } })).setOrigin(0, 1).setScrollFactor(0).setDepth(101).setAlpha(0); // bottom left, above the key line and growing upward (placed each frame by chatterSpot, src/campchatter.js: it was drawn over the corner's title, card space-game-talk-over-fleet-corner)
    this.input.keyboard.on('keydown', e => this.onKey(e));
    if (typeof campPanelsInstall === 'function') campPanelsInstall(this); // the order lists: the cruiser list (S), hidden until asked for (src/camppanel.js, src/campanelsdraw.js)
    if (typeof campPanelHold === 'function' && this.pn) campPanelHold(this.pn, (this.time && this.time.now) || 0); // a battle begins on the press that launched it (the briefing's Enter or click): it fires nothing for CAMP.card.lock ms
    if (typeof campFocusInstall === 'function') campFocusInstall(this); // F glides the camera to the selected ship and follows it (src/campfocus.js)
    if (typeof campDragInstall === 'function') campDragInstall(this); // press and drag pans the flight view and the map, with a RECENTRE mark and the way back (src/campdrag.js)
    if (typeof campMapInstall === 'function') campMapInstall(this); // Tab: the map of the level, over the battle, which goes on behind it (src/campmap.js, src/campmapdraw.js)
    this.events.once('shutdown', () => { if (typeof stopBeamHum === 'function') stopBeamHum(); });
 // no hum left behind when the level ends or the title comes
    if (typeof camzoomSetup === 'function') { // the Long Haul's own camera zoom (src/camzoom.js): the world on one camera, the HUD, panels and strip on another that never scales; + - = 0 and the wheel zoom the world (src/campzoom.js)
      this.fillUi = true; // this scene can take the window's shape (src/fillwindow.js): its HUD objects follow the HUD camera's scroll (src/camzoom.js camzoomSort)
      this.lhZoom = CAMZOOM.want; if (typeof campZoomRange === 'function') campZoomRange(true, typeof campZoomFloor === 'function' ? campZoomFloor(this.level, this.mi) : 0); CAMZOOM.want = campZoomStart(); camzoomSetup(this); if (typeof fillSync === 'function') fillSync(this); // the view goes out to 0.2 here, or to where this mission's route fits on a long one (campZoomRange, campZoomFloor; the Long Haul's 0.4 is put back below) // every flight starts at the zoom six presses of - reach (campZoomStart); the Long Haul's own is put back when this scene is left
      this.events.once('shutdown', () => { CAMZOOM.want = this.lhZoom; if (typeof campZoomRange === 'function') campZoomRange(false); });
    }
    if (typeof campPlaceLabelsInstall === 'function') campPlaceLabelsInstall(this); // the two labels of a place keep clear of each other at every zoom (src/campplacelabels.js); after the zoom, which scales the labels, on the same event
    if (typeof slookFxInstall === 'function') slookFxInstall(this); // the new ship look's engine trails and kills, once a frame after the ships' sprites are in place (src/shiplookfx.js; they draw only with the switch on)
    if (this.resume) { this.mdone = true; this.showWon(true); } else this.showIntro();
  }
  get camzoomHold() { return !!this.mp; } // with the map open the wheel is the map's (camzoomCanWheel, src/camzoom.js)
  beam(e, ms) { if (!this.beams) this.beams = []; this.beams.push({ x: e.x, y: e.y, tx: e.tx, ty: e.ty, mine: e.type === 'laser', until: performance.now() + ms }); } // mine: a laser at a rock (the mining laser); a turret's shot at an alien is the other beam (the world look draws them in two colours) // (the beam hum is the sound card's: it reads C.lasers)
  makeCamp() { // a new battle of this level: arrived by the chain (or a retry), the ore and the extra ships of the refit come with the cruiser; a level started by itself (an address, a skip) has its own
    const carried = this.P.level === this.level || this.replay === true; // a replay flies with the pilot's CURRENT ore, extra ships, techs and rank, whatever level it is of
    this.P.promo = null; // the promotion of the last debrief is told once
    return campNew(this.level, this.P.techs, Object.assign({}, this.opts, { found: this.P.found, rank: typeof campRank === 'function' ? campRank(this.P).i : 0, power: campPowerLoad(), pace: CAMP.pace.start, credits: this.P.credits }, carried ? { ore: this.P.ore, bonus: this.P.bonus } : {})); // (the credits are the pilot's, like the rank: they come with every battle, so a win never writes them over with less) // the rank (src/campranks.js) fills the bay and lifts the wing limit; found: the cloaked caches looted so far (their weapons stay with the pilot); the wing's stance is the pilot's: it comes with every battle
  }
  drawPlace(p, id) { // returns what it made, so a far place can be taken down again (syncFar); id: the place's key in campPlaces
    const r = p.r || 60, made = [], D = typeof campWorldOn === 'function' && campWorldOn() && typeof campDiscTexture === 'function' ? campDiscTexture(this, p, id) : null; // the world look (card space-game-world-w2-planets): a flat disc in the world's own tones, no tint, no glow (src/campworlddisc.js); Long Haul's planet and star painters are not used
    const im = D ? this.add.image(p.x, p.y, D.key).setScale(r / D.R).setDepth(1) : p.kind === 'star' && typeof starTexture === 'function'
      ? this.add.image(p.x, p.y, starTexture(this, p.star || 'G')).setScale(r / 48).setDepth(1).setBlendMode(Phaser.BlendModes.ADD) // a star: the corona and the hot core (src/art_world.js), its disc r px across
      : this.add.image(p.x, p.y, planetTexture(this, p.kind || 'rock', p.seed || 1)).setScale(r / 300).setDepth(1); if (p.tint && !D) im.setTint(p.tint); // the place's own colour (CAMP.places tint): Mars is not grey like Luna
    const nm = label(this, p.x, p.y - r - 36, String(p.name).toUpperCase(), '#ffb454', 16), pb = p.base ? label(this, p.x + 70, p.y - 100, String(p.base).toUpperCase(), '#38e1ff', 13) : null; made.push(im, nm); (this.placeLabels = this.placeLabels || []).push(nm); // (the page HUD hides the labels of the places and draws a pill: src/camppagehud.js)
    (this.placeSets = this.placeSets || []).push({ p, nm, pb, im, r, base: im.scaleX }); // the pair's places follow the labels' scale, so that they never stand on each other (src/campplacelabels.js); (im, r, base: the picture of the world, its radius and its own scale: syncWorldLeast draws it up when the view is out)
    if (p.base) { const ST = D && typeof campStationTexture === 'function' ? campStationTexture(this, p) : null; made.push(this.add.image(p.x + 70, p.y - 60, ST ? ST.key : 'station').setScale(ST ? CAMPSTATION.world / ST.R : 0.16).setDepth(2), pb); this.placeLabels.push(pb); } // the world look (card space-game-world-w3-stations): a flat-cut steel ring or hexagon (src/campworldstation.js), the same place and about the same size as Long Haul's station picture
    return made;
  }
  syncWorldLeast() { // a world keeps a size you can see when the view is out (src/campzoom.js campZoomWorldScale): its picture is drawn up so its radius is not under CAMPZOOM.view.worldLeast px on the screen; the flat discs of the world look and the old pictures alike
    const z = this.cameras && this.cameras.main && this.cameras.main.zoom > 0 ? this.cameras.main.zoom : 1; if (typeof campZoomWorldScale !== 'function') return;
    (this.placeSets || []).forEach(e => { const im = e.im; if (!im || im.active === false || !(e.base > 0)) return; const k = campZoomWorldScale(z, e.r); if (im._wk !== k) { im._wk = k; im.setScale(e.base * k); } });
  }
  // the far bodies of the system (CAMP.world, src/campsol.js): a picture only while the carrier is within CAMP.world.draw px of the edge of it, a few times a second
  syncFar(time) {
    if (!this.farObjs || time < this.farAt) return; this.farAt = time + 250;
    const pl = campPlaces(this.level), c = this.camp.carrier, near = CAMP.world.draw;
    Object.keys(pl).forEach(id => {
      const p = pl[id]; if (!p.far || p.hidden) return;
      const d = Math.hypot(p.x - c.x, p.y - c.y) - (p.r || 60) * (p.kind === 'star' ? 3 : 1), on = this.farObjs[id];
      if (d < near && !on) this.farObjs[id] = this.drawPlace(p, id);
      else if (d > near * 1.4 && on) { on.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); delete this.farObjs[id]; }
    });
  }

  // ----- the cards: the story, the pick, the end -----
  cardPrep() {
    this.hideCard(); if (typeof campMapClose === 'function') campMapClose(this); // a card (the story, the end) comes up over the map: the map goes
    (this.toasts || []).forEach(o => { if (o && o.t && o.t.destroy) { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); } }); this.toasts = []; // and the toast of the moment before (it floats above a card and ran through the debrief's title)
    if (typeof campPanelsClose === 'function') campPanelsClose(this); // and a panel
  }
  showCard(title, lines, hint, tall, band) {
    Campaign.prototype.cardPrep.call(this); // (by name: a stand-in scene of a test has the card functions it needs and not this one)
    if (band) { this.drawPauseBand(title, lines, hint); return; } // the pause is not a card but a band (below)
    const o = [], cx = W / 2, cy = H / 2 - 20, style = uiFont(20, '#e8f6ff', { align: 'center', wordWrap: { width: 720 }, lineSpacing: 4 }), text = lines.join('\n\n');
    // the card is as tall as its words: the refit with the three techs (two lines each) was 376 px of text in a 380 px card, so the title sat on its first line and the hint on its last, and with the looted techs
    // (up to six choices) it ran off the screen. A throwaway text says how tall they are (130 px is the title above and the hint below); past the screen the type steps down to fit.
    let h = tall || 300, fit = 1; const probe = this.add.text(-9999, -9999, text, style), bodyH = probe.height || 0; probe.destroy();
    if (bodyH + 130 > h) { h = Math.min(bodyH + 130, H - 40); fit = Math.min(1, (h - 130) / bodyH); }
    o.push(this.add.rectangle(W / 2, H / 2, W, H, 0x02060d, 0.5)); // a veil over the battle and its gauges, so the card is the one thing to read (the blind critic: HUD and planet labels showed through the card)
    o.push(this.add.rectangle(cx, cy, 800, h, 0x04101c, 1).setStrokeStyle(2, CYAN, 0.85));
    o.push(this.add.text(cx, cy - h / 2 + 34, title, uiFont(24, '#38e1ff', { letterSpacing: 3 })).setOrigin(0.5));
    const body = this.add.text(cx, cy + 6, text, style).setOrigin(0.5); if (fit < 1) body.setScale(fit); o.push(body);
    o.push(this.add.text(cx, cy + h / 2 - 30, hint, uiFont(16, '#ffd37a')).setOrigin(0.5));
    o.forEach(x => x.setScrollFactor(0).setDepth(200));
    this.card = o; this.panel = true;
  }
  // the pause: the battle dimmed, a lit band across the middle of the screen with the word large on it (dark letters on the cyan: the strongest contrast the HUD has), and the help in a dark panel under the band with the
  // way back at its foot. The help steps down to fit the panel as the cards' words do (the debug line makes it a line longer).
  drawPauseBand(title, lines, hint) {
    const P = CAMP_PAUSE, cx = W / 2, by = H / 2 - P.lift, o = [], panelTop = by + P.bandH / 2 + P.gap, panelBot = H - P.gap, text = lines.join('\n');
    const style = uiFont(P.size, '#e8f6ff', { align: 'center', wordWrap: { width: P.wrap }, lineSpacing: P.lineSpacing });
    const probe = this.add.text(-9999, -9999, text, style), bodyH = probe.height || 0; probe.destroy();
    const room = panelBot - panelTop - P.hintRoom - P.pad, fit = bodyH > room ? room / bodyH : 1;
    o.push(this.add.rectangle(W / 2, H / 2, W, H, 0x02060d, P.veil));                                                                    // the veil: the battle and its gauges go dark
    o.push(this.add.rectangle(cx, by, W, P.bandH, CYAN, P.bandAlpha));                                                                  // the band, the whole width of the screen
    o.push(this.add.rectangle(cx, by - P.bandH / 2, W, P.edge, 0xe8f6ff, 1), this.add.rectangle(cx, by + P.bandH / 2, W, P.edge, 0xe8f6ff, 1)); // a pale line along each edge
    o.push(this.add.text(cx + P.space / 2, by, title, uiFont(P.word, '#03111c', { fontStyle: 'bold', letterSpacing: P.space })).setOrigin(0.5)); // the word (the letter spacing trails the last letter: half of it is put back)
    o.push(this.add.rectangle(cx, (panelTop + panelBot) / 2, P.panelW, panelBot - panelTop, 0x04101c, 0.96).setStrokeStyle(2, CYAN, 0.6));
    const body = this.add.text(cx, panelTop + P.pad, text, style).setOrigin(0.5, 0); if (fit < 1) body.setScale(fit); o.push(body);
    o.push(this.add.text(cx, panelBot - P.hintRoom / 2, hint, uiFont(16, '#ffd37a')).setOrigin(0.5));
    o.forEach(x => x.setScrollFactor(0).setDepth(200));
    this.card = o; this.panel = true;
  }
  hideCard() { if (this.card) { this.card.forEach(x => x.destroy()); if (typeof campPanelHold === 'function' && this.pn) campPanelHold(this.pn, (this.time && this.time.now) || 0); } this.card = null; this.panel = false; } // a card closing holds the missile key for CAMP.card.lock ms (campPanelHold: the Enter that closed it is not also a missile)
  flash(id) { const sp = this.sp[id]; if (!sp) return; sp.setTint(0xff8a8a); this.time.delayedCall(90, () => { if (sp.active !== false) sp.clearTint(); }); } // the hull took a hit: the carrier blinks red for 90 ms (the blind critic: nothing but a red bar said so)
  say(lines) { if (typeof shipcompSay === 'function') lines.forEach(l => { if (l) shipcompSay(l); }); } // the ship's voice, as much as Settings > Sound allows: each line on its own, because Short speaks only the first sentence or two of what it is given and one joined text lost the line that says what to do (docs/night/ux.md 1)
  // a mission: the BRIEFING (its title, the objectives in plain words, the bonus objectives), the flight, the DEBRIEF (what it earned). A row with no objectives (an old-style level) has neither.
  showBrief() {
    const M = this.camp.L; if (!M.objectives) { this.hideCard(); this.mode = 'play'; return; }
    const n = M.mission + 1, k = 'camp.m.' + this.level + '.' + n + '.', lines = [uiText(k + 'b1'), uiText(k + 'b2')].filter(x => !/^camp\./.test(x)), bonus = (M.bonus || []).map(b => '+' + CAMP.score.bonus + '  ' + this.bonusText(b));
    this.mode = 'brief';
    const tr = typeof campTravel === 'function' ? campTravel(this.level, M.mission) : null, pl = M.place && campPlaces(this.level)[M.place];
    const where = !pl ? [] : [tr ? uiText('camp.ui.briefplace', { name: pl.name, km: tr.km, secs: tr.secs }) : uiText('camp.ui.briefhere', { name: pl.name })]; // the place of the mission, how far, how long by Fast
    this.showCard(uiText('camp.ui.mission', { n, of: M.missions, title: uiText(k + 'title') }), where.concat(lines, bonus.length ? [uiText('camp.ui.bonushead')].concat(bonus) : []), uiText('camp.ui.briefgo'), 330);
    this.say(lines);
  }
  bonusText(b) { return campHubBonusText(b); } // the same words as the ready room's board (src/camphub.js)
  showDebrief(sc) {
    const M = this.camp.L, k = 'camp.m.' + this.level + '.' + (M.mission + 1) + '.', clock = t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    const R0 = this.replay === true && this.tuned !== true ? this.replayRes : null, R = R0 && !R0.first ? R0 : null, // (the first win of a skipped mission is a debrief as any other: there is no best to compare with)
       num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (campNewCard(this, () => scrWonModel(this.camp, this.P, { sc, title: uiText(k + 'title'), replay: R, tuned: this.tuned === true, mdone: this.mdone }))) { this.mode = 'debrief'; this.say([uiText('camp.ui.score', { score: sc.score })]); return; } // the new look (src/scrcards.js): the same facts as numbers and ticks; the voice says the score as ever
    const scoreLine = uiText('camp.ui.score', { score: sc.score }), lines = [R ? scoreLine + '\n' + uiText('camp.ui.replayscore', { now: num(R.now), old: num(R.old) }) + ' ' + (R.improved || R.first ? uiText('camp.ui.replaybest', { best: num(R.best) }) : uiText('camp.ui.replaykept', { best: num(R.best) })) : scoreLine].concat(sc.bonuses.map(b => b.ok ? uiText('camp.ui.bonusmet', { pts: b.points, text: this.bonusText(b) }) : uiText('camp.ui.bonusmiss', { text: this.bonusText(b) })), [uiText('camp.ui.debriefstats', { time: clock(sc.t), hull: sc.hullLeft, lost: sc.shipsLost })], sc.haulersLost > 0 ? [uiText('camp.ui.debriefhaulers', { n: sc.haulersLost, pts: sc.haulerLost })] : []); // a replay says so, and the old best against this run
    const dk = M.dock && campPlaces(this.level)[M.dock]; if (dk && dk.outpost) lines.push(uiText('camp.ui.outpost', { outpost: dk.outpost, name: dk.name })); // the debrief is at the outpost of the mission's dock
    if (this.tuned === true) lines.push(uiText('camp.ui.tune.notkept')); // a tuned run keeps no score and no rank (the tuning panel)
    else if (typeof campRankLine === 'function') { const r = campRankLine(this.P, sc); if (r) lines.push(r); } // the ranks card's: a rank for the score, when it is there
    this.mode = 'debrief'; this.showCard(uiText(R ? 'camp.ui.replay' : 'camp.ui.debrief', { title: uiText(k + 'title') }), lines, uiText(this.mdone ? 'camp.ui.next' : 'camp.ui.debriefnext'), R ? 380 : 330);
    this.say([scoreLine]); // the voice says the score; the replay's comparison is for reading
  }
  missionWon() { // a mission won: its result is kept and the ore comes with the cruiser; the debrief, then the next mission, or after the last one the level's story and the refit
    const C = this.camp; if (!C.L.objectives) { this.showWon(); return; }
    const sc = this.tuned === true ? Object.assign({}, C.score, { score: 0, bonuses: [] }) : C.score; // a tuned run (the tuning panel): the level moves on, the best scores and the rank, which are sums of them, do not (src/camptune.js)
    if (this.replay === true) { // a replay (card space-game-campaign-replay; strict: a stand-in scene in a test answers any property): the best is kept, the ore comes with the cruiser as ever, a better best can still promote, and the level and the next mission stay where they are (no story, no refit, no pick)
      const was0 = typeof campRank === 'function' ? campRank(this.P).i : 0; this.replayRes = campReplayDone(this.P, this.level, this.mi, sc); this.mdone = false; campCarryOut(this.P, C);
      this.P.promo = typeof campRankPromoted === 'function' ? campRankPromoted(was0, this.P) : null; campProgressSave(this.P); this.showDebrief(C.score); return;
    }
    const was = typeof campRank === 'function' ? campRank(this.P).i : 0, r = campMissionDone(this.P, this.level, this.mi, sc); this.mdone = r.levelDone;
    campCarryOut(this.P, C); // the ore left in the store comes with the cruiser, and the credits of its sales, whole (card space-game-credits-apart-from-ore: they were one number, cut to the store at the next load)
    this.P.promo = typeof campRankPromoted === 'function' ? campRankPromoted(was, this.P) : null; // the debrief says it (campRankLine)
    campProgressSave(this.P); // the result is kept: the ready room (src/camphub.js) and the next mission read it from the save (these were a trailing comment's, once: tests/campranks.mjs holds them)
    this.showDebrief(C.score);
  }
  // docking: the ready room (src/camphubscene.js) opens over the battle, which is paused under it; its rows are the dock's (src/campdock.js). Undocking (Launch, Undock, Esc or T there) goes back to the flight
  openDock(id) {
    const C = this.camp, o = C && typeof campOutposts === 'function' ? campOutposts(C.level).find(x => x.id === id) : null; if (!o || this.docked || !this.scene || !this.scene.launch) return;
    this.docked = true; if (this.mp) campMapClose(this); if (typeof campPanelsClose === 'function') campPanelsClose(this);
    const d = { dock: id, camp: C, P: this.P, rows: CAMP_DOCK.rows.slice(), at: 'repair', station: { name: o.name }, onLaunch: h => this.undock(h), onLeave: h => this.undock(h) };
    this.scene.pause(); this.scene.launch('CampHub', d);
  }
  undock(hub) { campUndock(this.camp); this.docked = false; if (hub && hub.scene) hub.scene.stop(); this.scene.resume(); toast(this, uiText('camp.say.undock'), '#9fe9ff'); }
  nextMission() { go(this, 'CampHub', {}); } // after a debrief: the ready room (src/camphubscene.js), where the next mission's board, briefing and refit are and Launch flies it (no warp: only a level's first mission warps)
  afterIntro() { if (this.via === 'hub') { this.hideCard(); this.mode = 'play'; } else this.showBrief(); } // a mission launched from the ready room was briefed there: it goes straight to the flight
  showIntro() {
    if (this.replay === true || this.mi > 0) { this.afterIntro(); return; } // a replay has no story told again; a later mission of the level: straight to its briefing (read in the ready room already, when it was launched from there)
    if (this.via === 'hub' && typeof scrOn === 'function' && scrOn() && campOpeners(this) > 0) { this.afterIntro(); return; } // the new look: no card, the lines are on the radio (campOpeners)
    this.mode = 'intro'; const lines = campStory(this.level, 'before', !!(this.P && this.P.revealed));
    this.showCard(uiText('camp.ui.level', { n: this.level, name: CAMP.levels[this.level].name }), lines, uiText('camp.ui.begin'));
    this.say(lines);
  }
  showWon(resumed) {
    this.mode = 'won'; const lines = campStory(this.level, 'after', !!(this.P && this.P.revealed));
    if (campNewCard(this, () => scrLevelWonModel(this.camp, this.P, this.level, resumed))) { this.say(lines); return; } // the new look: Level N won with four numbers; the level's closing lines are still said, and the first is the card's caption
    const res = typeof campWinLine === 'function' && !resumed ? campWinLine(this.camp) : ''; // src/campwin.js: how it went, for reading
    this.showCard(uiText('camp.ui.won', { n: this.level }), res ? lines.concat([res]) : lines, uiText('camp.ui.next')); this.say(lines);
  }
  showPick() {
    this.mode = 'pick'; this.choices = campTechChoices(this.level, this.P); this.pickCur = 0; // the first technology is lit when the card opens (card space-game-refit-card-stuck: nothing said that a key was needed)
    Campaign.prototype.paintPick.call(this); // (by name: a stand-in scene of a test has the card functions it needs and not this one)
  }
  paintPick() {
    const cur = this.pickCur | 0;
    if (campNewCard(this, () => scrPickModel({ choices: this.choices, P: this.P, cur }))) return;
    this.showCard(uiText('camp.ui.pick'), this.choices.map((id, i) => (cur === i ? '> ' : '   ') + (i + 1) + '   ' + campTechLine(id, this.P)), uiText('camp.ui.pickhint'), 340); // the lit one has a >, and the foot says what the keys do
  }
  // the Earth refit after the belt: one of the three techs (pick again before Enter), and ore buys extra fighters for the next level (the workshop's prices)
  showRefit() {
    this.mode = 'refit'; this.choices = campTechChoices(this.level, this.P); this.refit = { pick: this.choices[0] || null, cur: 0, last: 0, f: 0, w: campCarryOut({}, this.camp) }; this.paintRefit(); // cur: the lit choice (a technology, or the fighter row after them), the first technology when the card opens: Enter takes what is lit (card space-game-refit-card-stuck) // w: the ore and the credits the cruiser came home with; the refit spends credits first (campSpend)
  }
  paintRefit() {
    const R = this.refit, B = CAMP.refit;
    const n = this.choices.length, cur = R.cur == null ? Math.max(0, this.choices.indexOf(R.pick)) : R.cur, onF = cur >= n;
    if (campNewCard(this, () => scrRefitModel({ choices: this.choices, pick: R.pick, cur, f: R.f, w: R.w, P: this.P }))) return; // the new look: one panel, a tile a technology with its digit, the fighter row, the lit one bright and the keys under it; the keys are refitKey's
    const lines = [uiText('camp.ui.refitore', { ore: R.w.ore, credits: R.w.credits, xf: R.f }), uiText('camp.ui.refitpick', { keys: this.choices.map((id, i) => i < 3 ? i + 1 : i + 3).join('  ') })]
      .concat(this.choices.map((id, i) => (cur === i ? '> ' : '  ') + (i < 3 ? i + 1 : i + 3) + '   ' + campTechLine(id, this.P) + (cur === i ? '   <' : '')), [(onF ? '> ' : '  ') + uiText('camp.ui.refitbuy', { fc: B.fighterCost })]);
    this.showCard(uiText('camp.ui.refit'), lines, onF ? uiText('camp.ui.refithintf') : uiText('camp.ui.refithint', { name: uiText('camp.tech.' + (this.choices[cur] || R.pick) + '.name') }), 380); // the foot always says what Enter does
  }
  refitKey(c) {
    const R = this.refit, B = CAMP.refit, i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit6: 3, Digit7: 4, Digit8: 5 }[c], n = this.choices.length; // 4 buys a ship, so what was looted from the cloaked caches (src/campanomaly.js) is chosen with 6, 7 and 8
    if (R.cur == null) R.cur = Math.max(0, this.choices.indexOf(R.pick)); const onF = R.cur >= n, enter = c === 'Enter' || c === 'NumpadEnter', buy = () => { if (R.f < CAMP.refit.most && campSpend(R.w, B.fighterCost)) { R.f++; return true; } return false; };
    const lit = k => { R.cur = k; R.last = k; R.pick = this.choices[k]; }; // the lit technology is the chosen one
    if (i !== undefined && this.choices[i]) lit(i); // 1 2 3 (6 7 8) light a technology directly, as ever; Enter takes it
    else if (c === 'Digit4') { if (!buy()) return; }
    else if (c === 'ArrowLeft' && n && !onF) lit((R.cur + n - 1) % n); // the arrows move the light: Left and Right along the technologies, Down to the fighter row, Up back
    else if (c === 'ArrowRight' && n && !onF) lit((R.cur + 1) % n);
    else if (c === 'ArrowDown' && !onF) { R.last = R.cur; R.cur = n; }
    else if (c === 'ArrowUp' && onF && n) lit(Math.min(n - 1, R.last | 0));
    else if (enter && onF) { if (!buy()) return; } // on the fighter row Enter buys one (the light stays)
    else if (enter && this.choices[R.cur]) { campPick(this.P, this.choices[R.cur]); this.P.bonus = { fighters: R.f }; this.hideCard(); this.next(R.w); return; } // Enter takes the lit technology
    else return;
    this.paintRefit();
  }
  pickKey(c) { // the plain pick after the later levels: one of the level's techs, or what was looted from a cloaked cache, with 1 to 6 (no ships are bought on this card)
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[c], n = this.choices.length, take = id => { campPick(this.P, id); this.hideCard(); this.next(); };
    if (i !== undefined && this.choices[i]) take(this.choices[i]); // a digit takes that one at once, as ever
    else if (c === 'ArrowLeft' && n) { this.pickCur = ((this.pickCur | 0) + n - 1) % n; Campaign.prototype.paintPick.call(this); } // the arrows move the light, Enter takes the lit one (card space-game-refit-card-stuck)
    else if (c === 'ArrowRight' && n) { this.pickCur = ((this.pickCur | 0) + 1) % n; Campaign.prototype.paintPick.call(this); }
    else if ((c === 'Enter' || c === 'NumpadEnter') && this.choices[this.pickCur | 0]) take(this.choices[this.pickCur | 0]);
  }
  anomalyEvent(e) { // the cloaked caches (src/campanomaly.js): noticed (a soft ping), decloaked (the cloak breaks: a flash and a shock), looted (a rise; what is kept is saved at once)
    if (e.stage === 'sense') beep(880, 0.08, 'sine', 0.035, 240);
    else if (e.stage === 'reveal') { this.cameras.main.flash(260, 190, 150, 255); this.cameras.main.shake(260, 0.004); this.boom.explode(34, e.x, e.y); sfx('shieldUp'); }
    else if (e.stage === 'done') { this.boom.explode(18, e.x, e.y); beep(660, 0.1, 'triangle', 0.05, 200); beep(990, 0.14, 'triangle', 0.05, 340); this.P.found = this.P.found || []; if (this.P.found.indexOf(e.key) < 0) this.P.found.push(e.key); campProgressSave(this.P); }
  }
  showLost(why) {
    this.mode = 'lost'; const lines = typeof campLoseLines === 'function' ? campLoseLines(this.camp, why) : [uiText('camp.lose.' + why)]; // src/camplose.js: what happened, how far, one thing to try
    const ms = !!(this.camp && this.camp.L && this.camp.L.objectives);
    if (campNewCard(this, () => scrLostModel(this.camp, why, { mission: ms, level: this.level }))) { this.say([lines[0]].concat(lines.slice(2))); return; } // the new look: the cause, two numbers, the tip with its keys as chips; the cause and the tip are said as ever
    this.showCard(ms ? uiText('camp.ui.lostmission', { title: uiText('camp.m.' + this.level + '.' + (this.camp.L.mission + 1) + '.title') }) : uiText('camp.ui.lost', { n: this.level }), lines, uiText(ms ? 'camp.ui.retrymission' : 'camp.ui.retry')); this.say([lines[0]].concat(lines.slice(2))); // the numbers are for reading: the cause and the tip are said
  }
  showPause() {
    this.mode = 'pause'; const C = this.camp, ms = !!(C && C.L && C.L.objectives);
    if (campNewCard(this, () => scrPauseModel(C, { mission: ms, debug: typeof campDebugOn === 'function' && campDebugOn() && typeof campDebugLine === 'function' ? campDebugLine(C) : '' }), CAMP_PAUSE.veil)) return;
    this.showCard(uiText('camp.ui.pausetitle'), [uiText('camp.ui.pausegoal', { goal: campObjective(this.camp) }), uiText('camp.ui.pausemap'), uiText('camp.ui.pausepanels')].concat([uiText('camp.ui.pausehelp')], (this.camp && this.camp.L && this.camp.L.objectives) ? [uiText('camp.ui.pauseretry')] : [], typeof campDebugOn === 'function' && campDebugOn() && typeof campDebugLine === 'function' ? [campDebugLine(this.camp)] : []), uiText('camp.ui.paused'), (this.camp && this.camp.L && this.camp.L.objectives) ? 428 : 398, true); } // the band (card space-game-paused-big: PAUSED large across the middle; the height only keeps the old card's room for the tests); the goal first (docs/night/ux.md 7), then the map and the help lines, then campDebugLine: the tune kit's one short line of its keys
  next(w) { // after the story (and the pick, or the refit): the next level, or after the last one the end, with a new campaign waiting. w: the ore and the credits that are left to carry (the refit spent some), { ore, credits }
    const last = !CAMP.levels[this.level + 1]; this.P.levelDone = 0; // the story and the pick are done: the level is over
    this.P.level = last ? 1 : Math.max(this.P.level, this.level + 1); if (last) { this.P.techs = []; this.P.found = []; this.P.ore = 0; this.P.credits = 0; this.P.bonus = { fighters: 0 }; this.P.revealed = true; } // a new campaign: the techs and the loot of the last one are gone with the ore and the ships (the rank is the pilot's career and stays) // the ending is about to show: from now on a replay says the outpost (SPOILER)
    else { if (w) { this.P.ore = w.ore; this.P.credits = w.credits; } else campCarryOut(this.P, this.camp); if (!CAMP.levels[this.level].refit) this.P.bonus = { fighters: 0 }; } // the extras of a refit are for the level after it; a level that had none carries only ore
    campProgressSave(this.P);
    if (!last) { go(this, 'CampHub', {}); return; } // the next level begins in its ready room: Launch flies its first mission (and the warp, if it has one)
    this.showEnd();
  }
  // SPOILER (card space-game-campaign-outpost-reveal): the ending turns. Level 3 was an outpost, not their home, and the war is not over; the data points to a star, drawn small and far on the card. Spoken line by line
  showEnd() {
    this.mode = 'end'; campReveal(true); const lines = campEnding(), R = CAMP.levels[3].reveal || {};
    if (campNewCard(this, () => scrEndModel(lines, R.star))) { this.say(lines); return; } // the new look: the three lines large, the star a CSS glow
    this.showCard(uiText('camp.ui.title'), lines, uiText('camp.ui.end'), 300);
    const x = W / 2 + 320, y = H / 2 - 100, sg = this.add.graphics().setScrollFactor(0).setDepth(201); // the distant star, up in the corner of the card: a glow, a point, a faint cross
    sg.fillStyle(0xffe29a, 0.12).fillCircle(x, y, 26); sg.fillStyle(0xffe29a, 0.3).fillCircle(x, y, 12); sg.fillStyle(0xfff6d6, 1).fillCircle(x, y, 3.2);
    sg.lineStyle(1, 0xffe29a, 0.45); sg.lineBetween(x - 34, y, x + 34, y); sg.lineBetween(x, y - 34, x, y + 34);
    const tx = this.add.text(x, y + 44, String(R.star || '').toUpperCase(), uiFont(13, '#ffe29a', { letterSpacing: 2 })).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    if (this.card && this.card.push) this.card.push(sg, tx); // hideCard takes them down with the card
    this.say(lines);
  }

  // ----- keys -----
  onKey(e) {
    const zk = typeof campZoomKey === 'function' ? campZoomKey(e.code) : null;
    if (zk && !this.leaving && this.mode === 'play') { campZoomPress(this, zk, e.repeat); if (!zk.reset || e.repeat || this.mp) return; } // S (the reset) puts the view back on the cruiser and goes ON to open the cruiser list (card space-game-keys2-cruiser); the other zoom keys are done here // + - = 0: the zoom of the view, or of the map when it is open (src/campzoom.js); a held key repeats, so this is read before the repeat guard
    if (this.leaving) return;
    if (typeof campTuneIsOpen === 'function' && campTuneIsOpen(this)) { if (campTuneKey(this, e) === 'close' && typeof this.closeTune === 'function') this.closeTune(); return; } // the tuning panel (src/camptunedraw.js) takes every key while it is open, a held arrow too
    const c = e.code, C = this.camp;
    if (e.repeat && !(this.mode === 'play' && (c === 'ArrowUp' || c === 'ArrowDown') && this.pn && typeof campPanelOwnsArrows === 'function' && campPanelOwnsArrows(this.pn))) return; // a held key is one press, but for Up and Down in an open list that has the arrows (not the numbered Q list: it has the digits): the highlight keeps moving
    if (typeof campKeysIsOpen === 'function' && campKeysIsOpen(this)) { if (c === 'KeyH' || c === 'Escape') this.closeKeys(); return; } // the H page of every key (src/campkeys.js) has the keys while it is open
    if (this.mode === 'play' && typeof campCornerKey === 'function') campCornerKey(C, c); // a key of a corner panel opens its details (src/campcorner.js: Q W FLEET, and the keys of the corners other cards add)
    if (this.mode === 'intro') { if (c === 'Enter') { this.hideCard(); this.afterIntro(); } return; }
    if (this.mode === 'brief') { if (c === 'Enter') { this.hideCard(); this.mode = 'play'; } return; }
    if (this.mode === 'debrief') { if (c === 'Enter') { this.hideCard(); if (this.mdone) this.showWon(); else this.nextMission(); } return; }
    if (this.mode === 'won') { if (c === 'Enter') { if (CAMP.levels[this.level].refit) this.showRefit(); else if (campTechChoices(this.level).length) this.showPick(); else this.next(); } return; }
    if (this.mode === 'refit') { this.refitKey(c); return; }
    if (this.mode === 'end') { if (c === 'Enter' || c === 'KeyT') go(this, 'Title'); return; }
    if (this.mode === 'pick') { this.pickKey(c); return; }
    if (this.mode === 'lost') { if (c === 'Enter') go(this, 'Campaign', { level: this.level, mission: this.mi, techs: this.P.techs, via: 'retry', replay: this.replay === true }); else if (c === 'KeyT') go(this, 'Title'); return; } // a lost mission is flown again; the level is not lost
    if (this.mode === 'pause') { if (c === 'Escape') { this.hideCard(); this.mode = 'play'; } else if (c === 'KeyT') go(this, 'Title'); else if (c === 'KeyH') this.openKeys(); else if (campKeyIs('settings', c) && typeof settingsOpen === 'function') settingsOpen(this, 'sound'); else if (campKeyIs('restart', c) && (this.camp && this.camp.L && this.camp.L.objectives)) go(this, 'Campaign', { level: this.level, mission: this.mi, techs: this.P.techs, via: 'retry', replay: this.replay === true }); return; } // Backspace (CAMP_KEYS restart; it was R, which is the missile rack in play): restart the mission (the level is kept; a replay is flown again as a replay); H: every key
    if (campKeyCodes('help').indexOf(c) >= 0) { this.openKeys(); return; } // H: every key, on one page
    if (campKeyIs('tune', c)) { if (typeof campTuneLiveIsOpen === 'function' && campTuneLiveIsOpen(this)) { campTuneLiveClose(this); return; } if (typeof this.openTune === 'function') this.openTune(); return; } // N: closes the live sliders when they are up (card space-game-cruiser-feel-sliders), else the tuning panel (src/camptunedraw.js), over the battle, which waits
    const typing = typeof document !== 'undefined' && !!document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName); // a word typed into the strip is not a key
    if (campKeyIs('reload', c) && (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey)) return; // R with a modifier is the browser's (Shift+R: the dev reload); plain R builds missiles (card space-game-missiles-cost-ore)
    if ((typeof this.pn !== 'object' || typeof this.pn.lit !== 'object') && typeof campPanelNew === 'function') this.pn = campPanelNew(); // made in create (campPanelsInstall); a stand-in scene in a test has none, and answers any property
    const listOpen = typeof campPanelOpen === 'function' && !!campPanelOpen(this.pn);
    if (campKeyCodes('pause').indexOf(c) >= 0) { if (listOpen) campPanelKey(this.pn, C, c, (this.time && this.time.now) || 0); else if (this.mp) campMapClose(this); else this.showPause(); return; } // Esc goes back ONE step in the lists (a target sub-list to its list, a list a part's row opened to Q or P, a list its own key opened closes: src/camppanel.js), then closes the map; it pauses only when nothing is open
    if (this.mp && typeof campMapKey === 'function' && campMapKey(this, c, e.shiftKey)) return; // the open map has the arrows and Enter: Up and Down step the marks, Left and Right the groups, Enter flies there, X clears the trip (src/campmapdraw.js)
    if (this.mp && !typing && (CAMP_PANELS.panels.some(p => p.code && p.code === c) || campKeyIs('missile', c) || campKeyIs('order', c))) { if (campKeyIs('missile', c) || campKeyIs('order', c)) return; campMapClose(this); } // a list's key over the map: the map closes and the list opens; Enter is never the order, nor M a missile, over the map
    if (!typing && campKeyIs('focus', c)) { const pk = typeof campPeekBreak === 'function' && campPeekBreak(this); if (typeof campFocusPress === 'function') campFocusPress(this); if (pk && typeof campPeekHome === 'function') campPeekHome(this); return; } // F: the camera to the selected ship (a sub-list's candidate, a squad's leader, the target), or back to the cruiser with none (src/campfocus.js); it works with a list open and the ship flies on
    const now = (this.time && this.time.now) || 0, pr = !typing && typeof campPanelKey === 'function' ? campPanelKey(this.pn, C, c, now) : { used: false }; // the lists and the direct keys (src/camppanel.js): Q W E R and P O U open a list (Up, Down, Enter in it), A D S X the target, J K L ; the power, Enter a missile
    if (pr.ok && !pr.open && pr.fleet && pr.digit && /^who/.test(String(pr.row || '')) && typeof campCornerShut === 'function') campCornerShut(C, 'fleet'); // W then a digit takes the pick and closes its menu at once, as Q then a digit closes the cruiser list (card space-game-page-hud-2); W alone steps and keeps it open
    if (pr.ran) { toast(this, pr.say, pr.ok ? '#9fe9ff' : '#ffb454'); if (pr.ok && pr.row === 'balance' && this.gaugeAnim) this.gaugeAnim.flash = this.gaugeAnim.flash.map(() => 1); } // the balance key flashes all three bars, even when the power was even already
    if (pr.used) return;
    if (typeof campDebugKey === 'function') { // the tune kit (src/campdebug.js): ' skip, 6 win, 7 lose, ` god mode; none is a key you fly by
      const id = campDebugKey(c); if (!id) return;
      const r = campDebugRun(C, this.P, id); if (r && r.say) toast(this, r.say, '#ffd37a');
      if (r && r.go) go(this, 'Campaign', { level: r.go.level, techs: r.go.techs, via: 'skip' });
    }
  }

  // a click on a ship in the flight view (card space-game-click-target; src/campdrag.js calls it, src/campclick.js has the rules): left holds an enemy or a ship you protect, or picks a pilot; right does that and gives the order, the order key's own
  shipClick(px, py, button) {
    const C = this.camp; if (!C || this.mode !== 'play' || this.mp || this.leaving || typeof campClickAct !== 'function') return false;
    if (typeof campPanelOpen === 'function' && campPanelOpen(this.pn)) return false; // a list is open: the keys are its, and a click does not reach under it
    if (typeof campPanelHeld === 'function' && campPanelHeld(this.pn, (this.time && this.time.now) || 0)) return false; // a card has just closed: the click that closed it does nothing in the flight view (campPanelHold)
    const cam = this.cameras.main, w = campClickWorld(cam, px, py), r = campClickAct(this.pn, C, campClickHit(C, w.x, w.y, cam.zoom), button, (this.time && this.time.now) || 0);
    if (r.ran) toast(this, r.say, r.ok ? '#9fe9ff' : '#ffb454'); // the order's answer, as the key's toast
    return !!r.used;
  }

  // the H page of every key (src/campkeys.js): from the battle it waits for the page (the pause card's own mode), from the pause card it comes up over it
  openKeys() {
    if (typeof campPanelsClose === 'function') campPanelsClose(this);
    if (typeof campKeysOpen !== 'function' || (typeof document !== 'undefined' && document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) return; // not while a word is typed into the strip
    if (this.mode === 'play') { this.mode = 'pause'; this.keysPaused = true; }
    campKeysOpen(this);
  }
  closeKeys() { campKeysClose(this); if (this.keysPaused) { this.keysPaused = false; this.mode = 'play'; } }
  openTune() { // the tuning panel: the lists and the map close, the battle waits (the pause card's own mode), and the panel comes up
    if (typeof campTuneOpen !== 'function' || this.mode !== 'play' || (typeof document !== 'undefined' && document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) return; // not while a word is typed into the strip
    if (typeof campPanelsClose === 'function') campPanelsClose(this);
    if (this.mp && typeof campMapClose === 'function') campMapClose(this);
    if (campTuneOpen(this)) { this.mode = 'pause'; this.tunePaused = true; } // the mode waits only when the panel is up
  }
  closeTune() { campTuneClose(this); if (this.tunePaused) { this.tunePaused = false; this.mode = 'play'; } }

  // a turret fires (src/campaign.js says each shot with an event of its own): a flash at its muzzle, and its pew (src/audio.js, SFX.turret), never more than one in CAMP_BLIP.gap ms of the battle's clock, so eight turrets rattle and do not pile up into noise
  turretFlash(e) {
    const C = this.camp, B = CAMP_BLIP, f = this.add.image(e.x + Math.cos(e.aim) * CAMP_MOUNT.flash, e.y + Math.sin(e.aim) * CAMP_MOUNT.flash, 'ember').setBlendMode('ADD').setTint(typeof slookGunTone === 'function' ? slookGunTone(0xffe9a0) : 0xffe9a0).setScale(CAMP_MOUNT.flashScale).setDepth(7);
    this.tweens.add({ targets: f, alpha: 0, scale: CAMP_MOUNT.flashScale * 0.4, duration: B.flash, onComplete: () => f.destroy() });
    if (!(C.t - this.blipAt < B.gap) && !campHas(C, 'beam')) { this.blipAt = C.t; sfx('turret', e.i); } // with the Beam turrets the hum is the sound (src/audio.js beamHum), not a pew a shot
  }
  wingShot(e) { // a fighter's shot: a quieter, farther pew, softer the farther the ship is from the carrier (CAMP_SND.far px and it is gone), at most one in CAMP_SND.wing ms
    const c = this.camp.carrier, near = 1 - Math.hypot(e.x - c.x, e.y - c.y) / CAMP_SND.far; if (near >= CAMP_SND.min) this.battleSound('wing', 'wingShot', near);
  }
  battleSound(kind, name, arg) { // one of the battle's sounds, no more often than CAMP_SND[kind] ms of the battle's clock
    if (!Object.prototype.hasOwnProperty.call(this, 'sndAt')) this.sndAt = {};
    if (this.camp.t - (this.sndAt[kind] === undefined ? -1e9 : this.sndAt[kind]) < CAMP_SND[kind]) return;
    this.sndAt[kind] = this.camp.t; sfx(name, arg);
  }

  // ----- each frame -----
  update(time, dt) {
    if (typeof fillSync === 'function') fillSync(this); // the flight takes the window's shape while its switch is on (src/fillwindow.js): it asks every frame, and the window is given back by itself when no scene asks any more (a scene of the Long Haul)
    spaceBackdropTick(this);
    if (typeof campFocusFrame === 'function') campFocusFrame(this, dt); // the camera on the ship that is watched, the label, the cruiser's arrow (src/campfocus.js)
    if (typeof campDragFrame === 'function') campDragFrame(this, dt, campDragFlying(this)); // the view dragged off the cruiser: the way back (a flying key held, the battle over), and its mark
    if (typeof campTuneMark === 'function') campTuneMark(this); // the TUNED mark, while any override is on (src/camptunedraw.js)
    if (this.mode === 'play' && this.tuned === false && typeof campTuneActive === 'function' && campTuneActive()) this.tuned = true; // a frame of battle with an override on makes the whole run a tuned one: its score and rank are not kept
    if (typeof campPanelsPaint === 'function') campPanelsPaint(this, this.time.now); // the open list, if one is, and the target's line (src/campanelsdraw.js)
    const C = this.camp;
    if (this.mode === 'play' && !C.result) {
      const k = this.k, inp = C.input;
      // the autopilot (src/campnav.js, card space-game-campaign-navigate): while the map is open the arrows are the list's, not the wheel's; with it closed any of them takes the wheel back
      const typing = typeof document !== 'undefined' && !!document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName); // the strip's own box: the letters typed there are not the wheel
      const listed = (this.pn && typeof campPanelOwnsArrows === 'function' && campPanelOwnsArrows(this.pn)); // an open list that has the arrows (card one-list-keys): the ship coasts. The Q list does not (card space-game-s-list-numbers: it is the digits'): with it open the arrows fly
      const wheel = !this.mp && !listed && !typing && [k.UP, k.DOWN, k.LEFT, k.RIGHT].some(x => x && x.isDown); // the arrows fly (Up thrust, Left and Right turn, Down brake)
      if (wheel && C.nav && typeof campNavClear === 'function') campNavClear(C, 'key'); // a steering key gives up the trip
      if (!(C.nav && C.nav.on)) {
        if (this.mp || listed) { inp.turn = 0; inp.thrust = 0; inp.brake = false; inp.boost = false; }
        else {
          inp.turn = (k.RIGHT.isDown ? 1 : 0) - (k.LEFT.isDown ? 1 : 0);
          inp.thrust = k.UP.isDown ? 1 : 0; inp.brake = k.DOWN.isDown;
          inp.boost = !typing && !!k.SHIFT && k.SHIFT.isDown; // Shift with thrust is the boost (the key table's `boost`)
        }
      }
      inp.fire = k.SPACE.isDown;
      if (this.sayR && this.sayR.wait.length) this.radioShow(campSayDue(this.sayR, this.time.now)); // the radio lines that waited for a kept line's hold are shown now (src/campsayhold.js)
      campStep(C, Math.min(dt, 100) / 1000);
      if (typeof campNudge === 'function') { const nd = campNudge(C, this.shown); if (nd) toast(this, nd, '#9fe9ff'); } // the first-minute hints, once each (src/campnudge.js)
      { const pk = C.power ? C.power.base.join() : ''; if (this.powerKey !== undefined && pk !== this.powerKey) { this.powerKey = pk; campPowerSave(C.power.base); } } // the setting is kept for the next battle the moment it is changed (the base, never an emergency's pips)
      const now = performance.now(); // the wing's radio: the orders carried out since the last look make a call; the call that is due is said when nothing else is (src/campchatter.js)
      chatterOrderDiff(this.orderSeen, C.orders).forEach(ev => chatterPush(this.radio, ev, now)); this.orderSeen = Object.assign({}, C.orders);
      const line = chatterTick(this.radio, now, typeof voiceSpeaking === 'function' && voiceSpeaking()); if (line) this.chatShow(line, now);
    }
    const bs = this.mode === 'play' ? campBeamState(C) : null; beamHum(bs ? bs.level : 0, bs ? bs.rise : 0); // the beam hum (src/audio.js): the Beam turrets firing, or a laser on a rock
    if (this.hud.chat) { const left = this.chatUntil - performance.now(); this.hud.chat.setAlpha(this.mode === 'play' && left > 0 ? Math.min(1, left / 500) : 0); } // the line fades; a card, the pause and the map hide it
    C.events.splice(0).forEach(e => this.onEvent(e));
    this.syncFar(time); this.syncRockets(Math.min(dt, 100)); this.syncBay(); if (typeof campRivalWorld === 'function') campRivalWorld(this); // (src/camprivaldraw.js)
    if (typeof campConvoySync === 'function') campConvoySync(this); // the shield bubble and the links of the ships that are tucked in (src/campconvoyscene.js)
    if (typeof campFarSync === 'function') campFarSync(this);
    if (typeof campSightSync === 'function') campSightSync(this); // the edge arrows of the hostiles that are off the screen and the pulse of a group just seen (src/campsightscene.js) // the names of the places and the escorted ships when the view is out so far that the world's labels are specks (src/campfarscene.js)
    if (typeof campTgtPaint === 'function') campTgtPaint(this); // the brackets round the enemy [ ] \ picked, the pilot Q W picked and the friendly O P picked (src/camptargetdraw.js)
    if (typeof campSelPeek === 'function') campSelPeek(this); // a ship newly picked (a key or a click) that is off the screen starts a peek: the camera glides to it, holds, glides back; one on the screen moves nothing (src/campselzoom.js)
    if (typeof campPeekFrame === 'function') campPeekFrame(this, dt); // the glide out, the hold and the glide back, by time
    if (typeof scrCardSync === 'function') scrCardSync(this); // a card of the new look (src/scrcardsdraw.js) follows the canvas and hides under the H page and the tuning panel
    if (typeof campPageHudSync === 'function') campPageHudSync(this, this.time.now); // the page HUD, when its switch is on (src/camppagehud.js); before the corners, which open under its panel
    if (typeof campPickPaint === 'function') campPickPaint(this); // the candidate a target sub-list is on, shown in the flight view (and the zoom out to it; src/camppickdraw.js)
    if (typeof campTcornerLook === 'function') campTcornerLook(this.pn, this.time.now); // what the target corners read besides the game: the panels' state (the ship an order's list is on) and the clock (src/camptcorner.js)
    if (typeof campCornerSync === 'function') campCornerSync(this, this.time.now); // the corner panels: the four stacked at the top, Q CRUISER and W FLEET at the left, ] HOSTILES and [ FRIENDLIES at the right (and the ones other cards add): the title and the selection stay, the details open on use and fade (src/campcorner.js, src/campcornerscene.js)
    if (typeof campTcornerSync === 'function') campTcornerSync(this, this.time.now); // the ship's picture in the details of [ ] HOSTILES and O P FRIENDLIES (src/camptcornerscene.js)
    if (this.hud.chat && typeof chatterSpot === 'function') { const sp = chatterSpot(C, typeof campBoxDx === 'function' ? campBoxDx(this, true) : 0); this.hud.chat.setPosition(sp.x, sp.bottom); } // the radio line stands just above the FLEET corner (or its open details), after the corner is drawn (src/campchatter.js chatterSpot)
    if (typeof campTorpedoSync === 'function') campTorpedoSync(this, Math.min(dt, 100)); // the torpedoes and the boats that arm (src/camptorpedoscene.js)
    this.sync(); if (this.hudHides()) this.hudShow(false); else { this.hudShow(true); this.paintHud(); } // a result card (won, lost, the debrief, the refit, the ending) has the screen to itself: no goal line, arrow or radar under it
    if (typeof campChargeSync === 'function') campChargeSync(this); // the health bars of the ships you protect, over them (src/campchargescene.js), once their sprites are in place
    if (typeof campShieldHitPaint === 'function') campShieldHitPaint(this, this.time.now); // the shield's arcs, after the sprites are in place and the health numbers (src/campshieldhit.js)
    if (this.mp) campMapPaint(this, time);
  }
  arrowKeep() { return CAMP.nav.arrow.keep; } // the places the edge arrow's label keeps out of: the table's (the target display's corner is one of them: its box, campTdispBox, is inside it)
  hudHides() { return ['won', 'lost', 'debrief', 'refit', 'pick', 'end'].indexOf(this.mode) >= 0; } // the modes of a result card
  hudShow(on) { // the HUD's texts: off behind a result card, back when it goes; the arrow's own label is set by paintHud, so it is only hidden here
    if (this.hudOn === on) return; this.hudOn = on;
    if (!on && this.hudG) this.hudG.clear();
    Object.keys(this.hud || {}).forEach(k => { const t = this.hud[k]; if (t && t.setVisible && (!on || k !== 'arrow')) t.setVisible(on); });
    if (this.keysBack && this.keysBack.setVisible) this.keysBack.setVisible(on);
    if (this.hudBack && this.hudBack.setVisible) this.hudBack.setVisible(on);
  }
  radioShow(lines) { lines.forEach(l => { toast(this, l.text, '#9fe9ff', l.keep ? CAMP.sayhold.ms : 0); this.say([l.text]); }); } // the toast and the voice together; a kept line stays CAMP.sayhold.ms
  chatShow(line, now) { chatterPlay(line); const t = this.hud.chat; if (!t) return; t.setText(line.call + ': ' + line.text); this.chatUntil = now + CHATTER.show; } // said in the pilot's voice (prio 0), shown with his callsign
  onEvent(e) {
    if (this.mp) campFireHear(this.mp.fire, this.camp, e, performance.now()); // the Tab map shows the fight too: its marks come from the events, only while it is open (src/campmapfire.js)
    chatterHear(this, e); // the wing's radio hears every sim event (src/campchatter.js)
    if (e.type === 'say') this.radioShow(campSayOffer(this.sayR || (this.sayR = campSayNew()), (this.time && this.time.now) || 0, { text: uiText(e.key, e.vars), keep: campSayKeep(e.key) })); // a radio line: shown at once, or after the kept line that is up (src/campsayhold.js)
    else if (e.type === 'boost') { if (e.stage === 'dry' && typeof sfx === 'function') sfx('empty'); } // the store ran dry: the boost is locked until a quarter is back (the Long Haul's own dry click)
    else if (e.type === 'nav') { toast(this, uiText(e.key, e.vars), '#7fe9ff'); if (e.key === 'camp.nav.go' || e.key === 'camp.nav.arrived') beep(e.key === 'camp.nav.go' ? 520 : 660, 0.07, 'triangle', 0.04, 160); } // the autopilot's own lines (src/campnav.js)
    else if (e.type === 'wingshot') this.wingShot(e);
    else if (e.type === 'rival') campRivalEvent(this, e); // a rival's phases: the warning, the broadside, the ram (src/camprivaldraw.js)
    else if (e.type === 'turret') { this.turretFlash(e); if (e.tx !== undefined) this.beam(e, 120); } // a turret shot at an alien is the same laser: a beam flash
    else if (e.type === 'laser') this.beam(e, e.src === 'turret' ? 220 : 90);
    else if (e.type === 'rockbreak') { this.boom.explode(16, e.x, e.y); beep(520, 0.09, 'triangle', 0.04, 260); }
    else if (e.type === 'boom') { if (!(typeof slookKill === 'function' && slookKill(this, e.x, e.y, e.big ? SLOOKFX.kill.big : 1))) this.boom.explode(e.big ? 90 : 26, e.x, e.y); this.battleSound('blast', e.big ? 'blastBig' : 'blastSmall'); if (e.kind === 'carrier') this.cameras.main.shake(400, 0.01); }
    else if (e.type === 'hit') { if (e.id === this.camp.carrier.id) { this.cameras.main.shake(90, 0.003); this.flash(e.id); if (e.hull) this.battleSound('hull', 'hullHit'); } if (!(typeof campShieldHitSkip === 'function' && campShieldHitSkip(this, e))) this.boom.explode(3, e.x, e.y); }
    else if (e.type === 'earthhit') { this.boom.explode(6, e.x, e.y); this.battleSound('earth', 'earthHit'); }
    else if (e.type === 'docked') this.openDock(e.id); // the carrier is in an outpost's bay: the ready room opens over the paused battle (src/campdock.js)
    else if (e.type === 'mend') { beep(660, 0.1, 'triangle', 0.04, 220); }
    else if (e.type === 'launch' || e.type === 'dock') { this.bayAt[e.type === 'launch' ? 'launch' : 'land'] = this.camp.t; beep(e.type === 'launch' ? 560 : 420, 0.07, 'triangle', 0.04, 160); }
    else if (e.type === 'alarm') { sfx('siren'); this.cameras.main.flash(300, 255, 60, 60); this.cameras.main.shake(300, 0.004); } // the ambush: out of the dark
    else if (e.type === 'blink') { this.boom.explode(30, e.x, e.y); sfx('shieldUp'); }
    else if (e.type === 'anomaly') this.anomalyEvent(e);
    else if (e.type === 'power') beep(540, 0.06, 'triangle', 0.04, 120); // a pip moved (the ship's systems, src/campaign.js; only with CAMP.power.on): a blip
    else if (e.type === 'missile') sfx('missileLaunch');
    else if (e.type === 'mboom') { if (!(typeof slookKill === 'function' && slookKill(this, e.x, e.y, SLOOKFX.kill.blast, e.r))) this.boom.explode(44, e.x, e.y); sfx('missileBlast'); }
    else if (e.type === 'mfizzle') { this.boom.explode(6, e.x, e.y); sfx('missileFizzle'); }
    else if (e.type === 'torpedo' || e.type === 'tboom') { if (typeof campTorpedoEvent === 'function') campTorpedoEvent(this, e); } // a torpedo boat arms, a torpedo is away, goes off, is shot down (src/camptorpedoscene.js)
    else if (e.type === 'convoy') { if (typeof campConvoyEvent === 'function') campConvoyEvent(this, e); } // an order for the escorted ships, a hit taken for one (src/campconvoyscene.js)
    else if (e.type === 'ore') beep(900, 0.05, 'triangle', 0.035, 200);
    else if (e.type === 'shieldhit' && e.x === this.camp.carrier.x) { this.cameras.main.shake(60, 0.002); this.battleSound('shield', 'shieldHit'); if (typeof campShieldHitEvent === 'function') campShieldHitEvent(this, e); } // (the world look's arc on the side that was hit, src/campshieldhit.js)
    else if (e.type === 'end') { if (e.result === 'won') this.time.delayedCall(1800, () => this.missionWon()); else this.time.delayedCall(1200, () => this.showLost(e.why)); }
  }

  // the sprites follow the numbers: one per ship, one per shot, made when first seen and destroyed when the ship is gone
  texOf(kind) {
    const look = CAMP_LOOK[kind] || CAMP_LOOK.drone;
    const key = look.art ? campShipTexture(this, look.art) : look.model && typeof shipPreviewTexture === 'function' ? shipPreviewTexture(this, look.model) : look.tex;
    return this.textures.exists(key) ? key : 'ship';
  }
  squadMarks() { // the friend's square marker (the target's own, campTgtCorners in src/camptargetdraw.js, in the friend's green) on the fighters of the squad(s) in focus, the same size on the screen at every zoom, so the player sees who an order goes to; the fighters themselves are all drawn alike, and with no squad in focus there is no mark (card space-game-friendly-display: the squad's coloured rings, cards space-game-squad-rings and space-game-squad-tint before it, are gone). In focus: the squad whose row the Q list is on, whose list is open (W: all three) or that was just given an order from its key (E, R, T: campSquadsShown, src/campwing.js). The pilot A or D picked has its bracket from campTgtPaint already, so it is not marked twice
    const sg = this.squadG; if (!sg) return;
    const C = this.camp, z = this.cameras && this.cameras.main && this.cameras.main.zoom > 0 ? this.cameras.main.zoom : 1;
    const lit = this.pn && typeof campSquadsShown === 'function' ? campSquadsShown(this.pn, C, (this.time && this.time.now) || 0) : []; // (the squads' rings: src/campwing.js campSquadsShown)
    sg.clear();
    if (!lit.length) return;
    const sel = typeof campSelNow === 'function' ? campSelNow(C) : null, al = campTgtPulse(), sl = typeof slookOn === 'function' && slookOn() && typeof slookPickMark === 'function'; // (sl: the new ship look: the bright ring in place of the square, src/shiplookmarks.js) the pilot picked has its square from campTgtPaint, so it is not marked twice (with All pilots picked, campTgtPaint marks the three: a squad in focus, which no list brings now, would be drawn over the same square)
    C.ships.forEach(u => { if (u.hp > 0 && u.team === 'earth' && u.squad && lit.indexOf(u.squad) >= 0 && !(sel && sel.unit === u)) { if (sl) slookPickMark(sg, u, CAMPTGT.friend, z, al, campTgtDrawn(this, u), this); else campTgtCorners(sg, u, CAMPTGT.friend, z, al, campTgtDrawn(this, u)); } });
  }
  sync() {
    const C = this.camp, seen = {}, F = typeof slookFrame === 'function' ? slookFrame(this) : null; // F: the new ship look's state for this frame, asked once for all the ships (src/shiplookdraw.js)
    C.ships.forEach(u => {
      let sp = this.sp[u.id];
      if (!sp) { const look = CAMP_LOOK[u.kind] || CAMP_LOOK.drone; sp = this.sp[u.id] = this.add.image(u.x, u.y, this.texOf(u.kind)).setScale(look.scale).setDepth(u.kind === 'carrier' ? 5 : u.team === 'earth' ? 4 : 3); if (look.tint) sp.setTint(look.tint); }
      sp.setPosition(u.x, u.y).setRotation(u.rot); seen[u.id] = true;
      if (typeof slookSync === 'function') slookSync(this, u, sp, F); // the new ship look (src/shiplookdraw.js): its texture and base scale while the switch is on, today's picture when it is off
      if (typeof campZoomShipScale === 'function' && this.cameras && this.cameras.main && sp.width) { const look = CAMP_LOOK[u.kind] || CAMP_LOOK.drone, k = campZoomShipScale(this.cameras.main.zoom, typeof campZoomHull === 'function' ? campZoomHull(u.kind, sp.width * (sp._ls || look.scale)) : sp.width * (sp._ls || look.scale)); if (sp._k !== k) { sp._k = k; sp.setScale((sp._ls || look.scale) * k); } } // zoomed far out a ship is drawn no smaller than its least size (CAMPZOOM.view.leastSmall and leastBig, src/campzoom.js; the hull's length, campZoomHull)
    });
    Object.keys(this.sp).forEach(id => { if (!seen[id]) { this.sp[id].destroy(); delete this.sp[id]; } });
    this.syncWorldLeast();
    this.squadMarks();
    this.camp.caches.forEach((k, i) => { this.csp[i].setVisible(!k.got); if (this.cachel && this.cachel[i]) this.cachel[i].setVisible(!k.got); });
    if (!this.osp) this.osp = {}; const seenOre = {}; // (made in create; a stand-in scene in a test has none)
    C.pickups.forEach(o => { // rocks are asteroids, a wreck's ore glows; a wreck blinks in its last seconds
      let im = this.osp[o.id];
      if (!im) { im = this.osp[o.id] = o.kind === 'rock' ? this.add.image(o.x, o.y, (typeof slookRockKey === 'function' && slookRockKey(this, o.id)) || ['asteroid', 'asteroid2', 'asteroid3'][parseInt(String(o.id).split('-')[1], 10) % 3]).setDepth(2).setRotation(o.x) : (typeof campWorldOreImage === 'function' && campWorldOreImage(this, o)) || this.add.image(o.x, o.y, 'ore').setDepth(3).setBlendMode('ADD').setScale(1.4); } // ore: three pale shards with the world look on
      if (o.kind === 'wreck') im.setAlpha(C.t - o.born > CAMP.ore.wreckLife - 6000 && Math.sin(C.t / 90) < 0 ? 0.3 : 1);
      seenOre[o.id] = true;
    });
    Object.keys(this.osp).forEach(id => { if (!seenOre[id]) { this.osp[id].destroy(); delete this.osp[id]; } });
    // the rocks of the belt: asteroids that glow where a laser is on them, redden and crack as they are cut (a broken one is gone: its chunk of ore lies there), with the beams on top
    if (!this.rsp) this.rsp = {}; const seenRock = {}, now = C.t, bg = this.beamG; if (bg) bg.clear();
    C.rocks.forEach(r => {
      let im = this.rsp[r.id];
      if (!im) im = this.rsp[r.id] = this.add.image(r.x, r.y, (typeof slookRockKey === 'function' && slookRockKey(this, r.id)) || ['asteroid', 'asteroid2', 'asteroid3'][parseInt(String(r.id).split('-')[1], 10) % 3]).setDepth(2).setRotation(r.x).setScale(r.r * 2.4 / 64);
      const cut = Math.max(0, Math.min(1, 1 - r.hp / r.maxHp)), hot = now - r.cutAt < 160;
      im.setTint(hot ? 0xfff0b0 : cut > 0 ? (0xff << 16) | (Math.round(255 - 90 * cut) << 8) | Math.round(255 - 160 * cut) : 0xffffff).setRotation(r.x + (hot ? Math.sin(now / 25) * 0.04 : 0)); seenRock[r.id] = true;
      if (bg && cut > 0) { const n = 1 + Math.floor(cut * 4); bg.lineStyle(1.5, 0x2a1408, 0.9); for (let i = 0; i < n; i++) { const a = (parseInt(String(r.id).split('-')[1], 10) * 1.7 + i * 2.1), l = r.r * (0.5 + 0.5 * cut); bg.lineBetween(r.x + Math.cos(a) * 2, r.y + Math.sin(a) * 2, r.x + Math.cos(a) * l, r.y + Math.sin(a) * l + (i % 2 ? 3 : -3)); } } // the cracks
    });
    Object.keys(this.rsp).forEach(id => { if (!seenRock[id]) { this.rsp[id].destroy(); delete this.rsp[id]; } });
    if (bg && this.beams) { this.beams = this.beams.filter(b => b.until > performance.now()); this.beams.forEach(b => { // a beam: a soft wide line, a bright core, a hot spot where it lands. The same for a rock and an alien
      if (typeof campWorldBeamDraw === 'function' && typeof campWorldOn === 'function' && campWorldOn()) return campWorldBeamDraw(bg, b, campWorldZoom(this)); // the world look: one thin line and a dot, pale blue at a rock, mint at an alien (src/campworldobjects.js)
      bg.lineStyle(7, 0x7fe9ff, 0.22).lineBetween(b.x, b.y, b.tx, b.ty); bg.lineStyle(2.5, 0xe8fbff, 0.95).lineBetween(b.x, b.y, b.tx, b.ty); bg.fillStyle(0xbff6ff, 0.8).fillCircle(b.tx, b.ty, 5); }); }
    if (this.anomG && typeof campAnomDraw === 'function') { this.anomG.clear(); if (typeof campWorldAnomDraw === 'function' && typeof campWorldOn === 'function' && campWorldOn()) campWorldAnomDraw(this.anomG, C, this.cameras.main.worldView, performance.now(), campWorldZoom(this)); else campAnomDraw(this.anomG, C, this.cameras.main.worldView, performance.now()); } // the world look: a white dashed ring and an empty diamond, a gold cache once found
    const rg = this.relicG, R = C.relic, L = C.L;
    rg.clear();
    if (R && typeof campWorldRelicDraw === 'function' && typeof campWorldOn === 'function' && campWorldOn()) campWorldRelicDraw(rg, R, L, campWorldZoom(this)); // the world look: a gold hexagon, a dim ring, the hold as a gold arc
    else if (R) { rg.lineStyle(2, 0x7fe9ff, 0.45).strokeCircle(R.x, R.y, L.relic.radius); if (R.hold > 0) { rg.lineStyle(6, 0x7fe9ff, 0.95).beginPath().arc(R.x, R.y, L.relic.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * R.hold / L.relic.hold).strokePath(); } }
    if (typeof campWorldScanSync === 'function') campWorldScanSync(this); // the world look: the scan points of the level as dashed gold rings with a solid arc for the part scanned (src/campworldobjects.js)
    if (typeof campDockMarkSync === 'function') campDockMarkSync(this); // the world look: a dashed gold ring round the market station while selling ore is the goal (src/campworldstation.js)
    while (this.bsp.length < C.bullets.length) this.bsp.push(this.add.image(0, 0, 'bullet').setDepth(4));
    this.bsp.forEach((im, i) => {
      const b = C.bullets[i]; if (!b) { im.setVisible(false); return; }
      const kb = typeof campZoomShotScale === 'function' && this.cameras && this.cameras.main ? campZoomShotScale(this.cameras.main.zoom) : 1; // thicker when the view is far out (src/campzoom.js)
      im.setVisible(true).setPosition(b.x, b.y).setRotation(b.rot).setTexture((typeof slookShotKey === 'function' && slookShotKey(b)) || (b.team === 'earth' ? 'shot-earth' : b.team === 'neutral' ? 'shot-neutral' : b.fac === 'pirate' ? 'shot-pirate' : 'ebullet')).setScale((b.beam ? 3 : b.pd ? 0.9 : 1) * kb, (b.beam ? 1.2 : 1) * kb);
      if (b.beam) im.setTint(0x7fe9ff); else im.clearTint(); // the Earth side's shots (turrets and pilots) are green as they are, no tint; the beam tech's keep their cyan tint (on the green, a teal), long and go through
    });
  }
  // the bays of the cruiser: dimly lit in the picture, and bright while the wing leaves (the launch tubes, at the front of the pods) and while it comes home (the landing bays, at the back): the order to launch or recall can be seen on the ship
  syncBay() {
    const C = this.camp, c = C.carrier, B = CAMP_BAY;
    if (!this.bayG || (this.bayG.active === false && !this.bayG.scene)) { this.bayG = this.add.graphics().setDepth(5.2); this.bayGlow = this.add.graphics().setDepth(5.3).setBlendMode('ADD'); }
    const g = this.bayG, h = this.bayGlow; g.clear(); h.clear();
    const csp = this.sp && this.sp[c.id]; if (csp && csp._fz === true) return; // out far (a sign, or the cruiser's small picture): no lit bay boxes (they and their glow blew up)
    if (!this.bayAt) this.bayAt = { launch: -1e9, land: -1e9 };
    const L = campBayLight(C, this.bayAt), bays = typeof slookOn === 'function' && slookOn() ? slookBays() : campArtBays('cruiser'), cs = Math.cos(c.rot), sn = Math.sin(c.rot), d = bays.half[0], w = bays.half[1];
    const kc = campShipK(this, c.id); // the picture drawn up by the far view: the boxes and the halo go out with it (card space-game-ships-bigger)
    const pos = ([x, y]) => [c.x + cs * x * kc - sn * y * kc, c.y + sn * x * kc + cs * y * kc];
    const quad = (x, y, x1, x2, y1, y2) => [[x + x1, y + y1], [x + x2, y + y1], [x + x2, y + y2], [x + x1, y + y2]].map(([a, b]) => [c.x + cs * a * kc - sn * b * kc, c.y + sn * a * kc + cs * b * kc]); // a box in the carrier's frame, turned with it
    [['launch', bays.launch, -d, 0], ['land', bays.land, 0, d]].forEach(([k, at, x1, x2]) => {
      const lv = L[k]; if (lv <= 0) return;
      at.forEach(([x, y]) => {
        const q = quad(x, y, x1, x2, -w, w), m = quad(x, y, x1, x2, -w * 0.45, w * 0.45);
        g.fillStyle(B.color, B.slot * lv).fillPoints(q.map(([a, b]) => ({ x: a, y: b })), true); g.fillStyle(B.core, B.slot * lv).fillPoints(m.map(([a, b]) => ({ x: a, y: b })), true);
        const [gx, gy] = pos([x + (k === 'launch' ? 1 : -1), y]); B.halo.forEach(([r, a]) => h.fillStyle(B.color, a * lv).fillCircle(gx, gy, r * kc));
      });
    });
  }
  // the missiles in flight (a body, a flame and a trail of smoke) and the turrets (a faint ring of how far they reach, four mounts that flash when one fires)
  syncRockets(ms) {
    const C = this.camp, c = C.carrier, k = CAMP.missile, seen = {}, play = this.mode === 'play';
    if (!this.msp) { // made the first time: the missiles in flight, the turrets' reach ring and mounts (the magazine count is the status block's now: src/campcruiserhud.js, card space-game-missiles-cost-ore)
      this.msp = {}; this.reachG = this.add.graphics().setDepth(2); this.mountG = this.add.graphics().setDepth(6);
    }
    C.rockets.forEach(m => {
      if (typeof slookRocket === 'function' && slookRocket(this, m, seen)) return; // the new ship look's dart and tail (src/shiplookfx.js, card space-game-ship-look-c-fire-trails): with the switch on it draws the missile
      const ux = Math.cos(m.rot), uy = Math.sin(m.rot);
      let r = this.msp[m.id];
      if (!r) r = this.msp[m.id] = { body: this.add.rectangle(m.x, m.y, 16, 5, 0xfff1d0).setDepth(5), flame: this.add.image(m.x, m.y, 'ember').setBlendMode('ADD').setTint(0xffa040).setScale(1.6).setDepth(5), puff: 0 };
      r.body.setPosition(m.x, m.y).setRotation(m.rot); r.flame.setPosition(m.x - ux * 11, m.y - uy * 11); seen[m.id] = true;
      r.puff -= ms;
      if (play && r.puff <= 0) { // smoke: a soft puff every 40 ms that grows and fades
        r.puff = 40; const p = this.add.image(m.x - ux * 10, m.y - uy * 10, 'smoke').setScale(0.22).setTint(0xb8c2cc).setAlpha(0.55).setDepth(4);
        this.tweens.add({ targets: p, alpha: 0, scale: 0.8, duration: 700, onComplete: () => p.destroy() });
      }
    });
    Object.keys(this.msp).forEach(id => { if (!seen[id]) { this.msp[id].body.destroy(); this.msp[id].flame.destroy(); delete this.msp[id]; } });
    const g = this.reachG, mg = this.mountG, tone = typeof slookGunTone === 'function' ? slookGunTone : c => c; g.clear(); mg.clear(); // tone: the new look's blue for the reach ring and the mounts' gold (src/shiplookfx.js), as it was with the switch off
    if (c.hp > 0) {
      const csp = this.sp && this.sp[c.id], sign = !!csp && csp._fz === true; // out far (src/shiplookglyph.js; the cruiser is its small picture, cards space-game-far-zoom-ugly and -cruiser-picture): no turrets, no bays, no resting ring (a dark base a dozen times its size under every mount was mud)
      g.lineStyle(CAMP_REACH.w, tone(CAMP_REACH.color), CAMP_REACH.alpha * ((sign ? 0 : CAMP_REACH.rest) + (1 - (sign ? 0 : CAMP_REACH.rest)) * campReachGlow(this, C))).strokeCircle(c.x, c.y, campReach(C)); // how far a turret reaches (the beam tech reaches further); a sign shows it only while Space is held
      const kc = campShipK(this, c.id); // the picture drawn up by the far view (card space-game-ships-bigger): the mounts sit where the picture's turrets are, and are drawn as much bigger
      if (!sign) C.turrets.forEach(tu => { // the eight turrets, where the sim put them (carried out with the picture): a dark base and an amber dot; a barrel toward the alien each has picked (it aims even when Space is not held); a bright flash and a longer barrel on the shot
        const hot = C.t - tu.shotAt < 120, tx = c.x + (tu.x - c.x) * kc, ty = c.y + (tu.y - c.y) * kc;
        const M = CAMP_MOUNT;
        mg.fillStyle(0x04101c, 0.9).fillCircle(tx, ty, M.base * kc); mg.fillStyle(hot ? 0xffffff : tone(0xffd37a), 1).fillCircle(tx, ty, (hot ? M.hot : M.dot) * kc);
        if (!tu.target) mg.lineStyle(M.width[0] * kc, M.stub[1], 0.95).lineBetween(tx, ty, tx + Math.cos(c.rot) * M.stub[0] * kc, ty + Math.sin(c.rot) * M.stub[0] * kc); // nothing in reach: a steel barrel along the heading, so the mount reads as a gun and not as a lit window
        if (tu.target) mg.lineStyle((hot ? M.width[1] : M.width[0]) * kc, hot ? tone(0xffe9a0) : tone(0xffd37a), hot ? 0.95 : 0.7).lineBetween(tx, ty, tx + Math.cos(tu.aim) * (hot ? M.aim[1] : M.aim[0]) * kc, ty + Math.sin(tu.aim) * (hot ? M.aim[1] : M.aim[0]) * kc);
      });
    }
  }
  // the lines of text at the top centre (CAMP.hud.text, src/camphud.js campHudFlow), the wave and the goal first: a line with nothing to say gives its place back, so the ones that have something stand together; Earth's bar goes under its line. this.hudBelow is where the column ends (the mothership and the rival stand under it)
  flowHud(bar) {
    const C = this.camp, H = this.hud, ids = ['wave', 'obj', 'earth', 'repair', 'post'];
    if (typeof campHudFlow !== 'function') return;
    const gh = this.pageHudStack > 0, stack = gh ? this.pageHudStack - campPageHudSafeTop() : 0, top = gh ? stack + CAMP.hud.pageGap : 0; // a goal panel of the page HUD is up (pageHudStack, src/camppagehud.js): it has the wave and goal lines: they take no place in the column, and what is left of it starts under that panel (card space-game-goal-panel-hides-text)
    const items = ids.map(id => ({ id, show: !!(H[id] && H[id].text) && H[id].visible !== false && !(gh && (id === 'wave' || id === 'obj')), h: id === 'earth' ? 12 : 0 })), F = campHudFlow(items, top);
    if (gh && !items.some(i => i.show)) F.bottom = stack; // nothing left in the column: it ends where the panel does, as it did
    ids.forEach(id => { if (H[id] && H[id].setY && F.ys[id] !== undefined) H[id].setY(F.ys[id]); });
    if (C.earth && F.ys.earth !== undefined) bar(W / 2 - 110, F.ys.earth + 18, 220, C.earth.shield / C.earth.max, 0x38e1ff);
    this.hudBelow = F.bottom;
    if (H.mother && H.mother.setY) H.mother.setY(F.bottom + 2);
    if (this.hudStackBottom) this.hudStack = this.hudStackBottom(F.bottom); // (a stand-in scene in a test has none) where everything at the top centre ends: a toast starts under it (toastTop)
    if (this.hudBack && this.hudBack.setSize) this.hudBack.setSize(CAMP.hud.plate.w, Math.max(CAMP.hud.plate.min, F.bottom + CAMP.hud.plate.pad - (CAMP.hud.text.y - 6))); // the dim plate under the column follows its length
  }
  // where everything stacked at the top centre ends: the column (col), the mothership's name and bar 2 and 20 px under it (the bar is 12 high), or the rival's bars and its phase line under it (src/camprivaldraw.js)
  hudStackBottom(col) {
    const H = this.hud || {}, D = typeof CAMP_RIVAL_DRAW === 'object' ? CAMP_RIVAL_DRAW.hud : null; let b = col;
    if (H.mother && H.mother.text && this.pageHudOn !== true) b = Math.max(b, col + 20 + 12); // (the mothership's bar is in the hostiles panel while the page HUD is up)
    if (D && H.rivalName && H.rivalName.text) b = Math.max(b, col + 2 + D.hullY + 12, H.rivalPhase && H.rivalPhase.text ? col + 2 + D.phaseY + 20 : 0);
    return this.pageHudStack > 0 ? Math.max(b, this.pageHudStack - campPageHudSafeTop()) : Math.max(b, 0); // (the page HUD's goal panel at the top centre ends here at the lowest: src/camppagehud.js; its end is measured from the canvas's top, the column from the safe area's)
  }
  // the y a toast starts at (src/common.js toast and toastKeep): just under whatever is stacked at the top centre, CAMP.hud.toastGap px below it, short column or tall (cards space-game-toast-over-topcentre and space-game-toast-gap: the band's own top, 86, was a floor that left a toast 60 px under a one-line column). Before the first frame there is no stack yet: the band's top
  toastTop() { return this.mp && Array.isArray(this.mp.objs) ? campMapFrameOf(this.mp).y + CAMPMAP.toastIn : this.hudStack ? Math.ceil(this.hudStack + CAMP.hud.toastGap) : TOAST.top; } // the Tab map open: just inside the top of its frame, under the map's title (card space-game-map-title-and-labels)
  toastPanel(msg, color, hold) { return typeof campPageHudToast === 'function' && campPageHudToast(this, msg, color, hold); } // the page HUD's radio panel takes the message when it is up (src/common.js toast asks first; src/camppagehud.js; card space-game-b3-c-radio-panel)
  // the goal's arrow and the lines of text (the gauges are gone: card space-game-layout-hud; the radar that was in the bottom right corner is the target display now: src/camptdispscene.js)
  paintHud() {
    const C = this.camp, g = this.hudG, c = C.carrier, bar = (x, y, w, f, color) => { g.fillStyle(0x04101c, 0.8).fillRect(x, y, w, 12); g.fillStyle(color, 1).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, f))), 10); g.lineStyle(1, 0x38e1ff, 0.5).strokeRect(x, y, w, 12); };
    g.clear();
    if (this.gaugeAnim) { const nowMs = performance.now(); campGaugeAnim(this.gaugeAnim, C.power.p, Math.min(100, nowMs - (this.gaugeAt || nowMs))); this.gaugeAt = nowMs; } // the bars of the power list's rows ease to the pips (src/campanelsdraw.js)
    if (typeof campCruiserHudPaint === 'function') campCruiserHudPaint(g, this.hud, C); // the plate, the shield and hull bars and the ore line at the top left (src/campcruiserhud.js)
    if (typeof campRivalHud === 'function') campRivalHud(this, g, bar); // a rival ship's name, shield and hull and the warning of its phase (src/camprivaldraw.js)
    const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0);
    if (m && this.pageHudOn !== true) bar(W / 2 - 150, (this.hudBelow || 0) + 20, 300, m.hp / m.maxHp, 0xc9a0ff); // under the column of lines: the name 2 px under it, the bar under the name
    const waves = C.L.waves;
    this.hud.earth.setText(C.earth ? uiText('camp.ui.earth') + '  ' + Math.round(C.earth.shield / C.earth.max * 100) + '%' : ''); this.hud.obj.setText(campObjective(C));
    const wc = typeof campWaveCount === 'function' ? campWaveCount(C) : { n: C.waves.filter(w => w.started).length, total: waves.length }; // the waves that can come on the lane she flies (src/camproute.js)
    this.hud.wave.setText(typeof campWaveLineOn === 'function' && !campWaveLineOn(C) ? '' : uiText('camp.ui.wave', { n: wc.n, total: wc.total })); // no wave line in an escort mission (CAMP.hud.noWave: the goal line stands first)
    this.hud.mother.setText(m ? uiText('camp.ui.mother') : '');
    if (this.hud.repair) { const rp = campRepairState(C); this.hud.repair.setText(rp.n ? uiText('camp.ui.repair', { n: rp.n, s: rp.next }) : ''); } // (a stand-in scene in a test may have no repair text)
    // an arrow at the edge of the screen pointing at the goal with its distance (src/campnav.js; docs/night/graphics.md finding 3); the autopilot's readout under the goal line is gone with its line (card space-game-hud-topleft-trim)
    if (this.hud.post) { // the outposts: where to retreat when the hull is low and no ship is left, else a hint when one is in range (src/campoutpost.js)
      const rt = typeof campRetreat === 'function' ? campRetreat(C) : null, nr = !rt && typeof campDockHint === 'function' ? campDockHint(C) : '';
      this.hud.post.setText(rt ? rt.line : nr).setColor(rt ? '#ff9ec0' : '#ffb454');
    }
    if (this.flowHud) this.flowHud(bar); // (a stand-in scene in a test has none) the lines under the gauges, each where the lines above it end (and Earth's bar under its line)
    if (typeof toastKeep === 'function' && this.toastTop) toastKeep(this, this.toastTop()); // a toast that is up follows the column's end
    if (this.hud.arrow) {
      const cam = this.cameras && this.cameras.main, ar0 = cam && typeof campNavArrow === 'function' && !this.mp ? fillAsk(campNavArrow, C, cam, cam.zoom) : null, ar = ar0 && ((ar0.ref && typeof campPageHudHasPill === 'function' && campPageHudHasPill(this, ar0.ref)) || (ar0.kind === 'alien' && typeof campPageHudHasFoePill === 'function' && campPageHudHasFoePill(this))) ? null : ar0; // a stand-in scene in a test has no camera; ar: no arrow for a ship you protect that has its pill at the edge of the page (card space-game-page-hud-friend-edge-pill), none for the nearest hostile while the hostiles' pill is up (card space-game-edge-pills-position)
      if (!ar) this.hud.arrow.setVisible(false);
      else {
        this.hud.arrow.setVisible(true).setText(uiText('camp.nav.arrow', { name: ar.name, km: campNavKm(ar.dist) }));
        const want = (px, py, an) => ({ x: px - Math.cos(an) * 64, y: py - Math.sin(an) * 28 }), aw = this.hud.arrow.width || 160, ah = this.hud.arrow.height || 18; // the label stands back from the arrow, a little off its line
        const sp = typeof campEdgeSpread === 'function' ? fillSpread([{ x: ar.x, y: ar.y, angle: ar.angle, w: aw, h: ah, want }], { keep: this.arrowKeep(), W, H, m: CAMP.nav.arrow.margin, tri: 13, boxes: this.hud.sight && this.hud.sight.boxes ? this.hud.sight.boxes : [] })[0] : null; // slid along the edge off the hostiles' and friends' arrows (src/campedgespread.js; card space-game-edge-labels-overlap)
        const a = sp ? sp.angle : ar.angle, ax = sp ? sp.x : ar.x, ay = sp ? sp.y : ar.y, tri = [{ x: ax + Math.cos(a) * 13, y: ay + Math.sin(a) * 13 }, { x: ax + Math.cos(a + 2.5) * 10, y: ay + Math.sin(a + 2.5) * 10 }, { x: ax + Math.cos(a - 2.5) * 10, y: ay + Math.sin(a - 2.5) * 10 }];
        g.fillStyle(0xffd37a, 0.95).fillPoints(tri, true); g.lineStyle(1, 0x02060d, 1).strokePoints(tri, true);
        const lp = sp ? { x: sp.lx, y: sp.ly } : typeof campNavLabelAt === 'function' ? campNavLabelAt(ar.x - Math.cos(a) * 64, ar.y - Math.sin(a) * 28, aw, ah, this.arrowKeep(), W, H) : { x: Math.max(80, Math.min(W - 80, ar.x - Math.cos(a) * 64)), y: Math.max(14, Math.min(H - 14, ar.y - Math.sin(a) * 28)) };
        this.hud.arrow.setPosition(lp.x, lp.y); // the label keeps out of the target display, the gauges, the message band and the key line, and off the other arrows
      }
    }
  }
}

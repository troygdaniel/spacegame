// ---------- Station: walk around, take the mission, board the ship ----------
let REPAIR_PRICE = 0.5; // credits a point of hull at a repair bay that names no price of its own, which is Halcyon's (content/stations/halcyon-station.md can change it)
// what the dock you are at charges a point of hull: its own dock.repair (src/data_systems.js: 0.75 at the Roost, which gouges), or REPAIR_PRICE where the dock names none
function repairPrice(station) { const d = stationDock(station); return d && d.repair > 0 ? d.repair : REPAIR_PRICE; } // stationDock: src/data_parts.js
// the door fee of a dock that takes one (dock.fee: 50 at the Roost): paid when you dock, never more than all you have, so nobody is locked out of a station for being poor
function dockFee(s) {
  const d = stationDock(), fee = d && d.fee > 0 ? d.fee : 0; if (!fee) return;
  const pay = Math.min(fee, G.credits | 0); G.credits -= pay;
  toast(s, pay < fee ? 'Docking fee: ' + pay + ' cr, all you had.' : 'Docking fee  -' + pay + ' cr', '#ffb454');
}
// ---------- quick go: a number key puts you next to a lounge spot (card space-game-lounge-quick-go) ----------
// The stops in key order; a station numbers only the ones it has, so the Roost's keys still run 1, 2, 3 with no gap.
const LOUNGE_STOPS = [['bar', 'BAR'], ['missions', 'MISSIONS'], ['pump', 'FUEL'], ['shop', 'SHOP'], ['repair', 'REPAIR'], ['ship', 'SHIP']];
const LOUNGE_BAR = { x: 255, y: 582 }; // in front of the counter (shop.js: its top edge is y 596), facing whoever tends it
// spots: Station.spots; look: stationLook(). Gives [{ n: '1', key, name, x, y, face, cx, cy }]: where you stand (within E reach of the spot,
// clear of its desk), which way you look, and where the key cap sits on the floor plan.
function loungeStops(spots, look) {
  const out = [], put = (key, name, x, y, tx, ty, cx, cy) => out.push({ n: String(out.length + 1), key, name, x, y, face: Math.atan2(ty - y, tx - x), cx, cy });
  LOUNGE_STOPS.forEach(([key, name]) => {
    if (key === 'bar') {
      if (!(look && look.terminals && look.terminals.bar)) return; // stores, not a bar: nothing to go to
      const bk = spots.find(sp => sp.npc !== undefined && typeof NPCS !== 'undefined' && NPCS[sp.npc] && NPCS[sp.npc].role === 'bartender'); // src/shop.js: Juno at Halcyon, the barkeep elsewhere
      const x = bk ? bk.x : LOUNGE_BAR.x;
      return put(key, name, x, LOUNGE_BAR.y, x, bk ? bk.y : LOUNGE_BAR.y + 70, x - 56, LOUNGE_BAR.y - 4);
    }
    const sp = spots.find(q => q.key === key); if (!sp) return;
    if (key === 'ship') put(key, name, sp.x - 62, sp.y + 34, sp.x, sp.y, sp.x - 62, sp.y + 72);
    else put(key, name, sp.x, sp.y + 44, sp.x, sp.y, sp.x - 66, sp.y); // a desk is 100 by 44 around its spot: stand at its front, the cap to its left
  });
  return out;
}
// The name of each desk (card space-game-critic-station-read, docs/CRITIC.md 17): the names were 11 px glow text straight on the kiosk art,
// and the screens, the wires and the hologram crossed them. Now each is a plate on the front of the desk: a dark, solid backing with a rim in
// the desk's colour and bold 13 px letters, above the art (the screens are at depth 2.2, the plates at 4.6) and under the player and the key
// caps. One place draws them all, for the desks of this file and for the ones src/shop.js and src/fuel.js add to s.spots; the small label
// those two still make is taken away here, so a name is written once.
const STATION_PLATE = { size: 13, h: 20, padX: 9, dy: 12, depth: 4.6, back: 0x02101c, backAlpha: 0.94 };
function stationPlates(s) {
  const P = STATION_PLATE;
  s.plates = s.spots.filter(sp => sp.key !== 'ship' && sp.npc === undefined && sp.text).map(sp => {
    (s._wl || []).filter(t => t.active && t.text === sp.text && Math.abs(t.x - sp.x) < 6 && Math.abs(t.y - sp.y) < 30).forEach(t => t.destroy()); // the old small nameplate
    const col = Phaser.Display.Color.HexStringToColor(sp.color).color;
    const t = s.add.text(0, 0, sp.text, { fontFamily: 'monospace', fontSize: P.size + 'px', fontStyle: 'bold', color: '#f2fbff' }).setOrigin(0.5);
    const w = Math.ceil(t.width) + P.padX * 2, g = s.add.graphics();
    g.fillStyle(P.back, P.backAlpha); g.fillRoundedRect(-w / 2, -P.h / 2, w, P.h, 4);
    g.lineStyle(1.5, col, 1); g.strokeRoundedRect(-w / 2, -P.h / 2, w, P.h, 4);
    g.fillStyle(col, 1); g.fillRect(-w / 2 + 3, -P.h / 2 + 4, 2, P.h - 8); // a tab in the desk's colour, as the HUD panels have
    const c = s.add.container(sp.x, sp.y + P.dy, [g, t]).setDepth(P.depth);
    c.pw = w; c.key = sp.key; c.label = t;
    return c;
  });
  return s.plates;
}

// ---------- the station menu: pick a place and it opens (card space-game-station-menu) ----------
// Troy, on the number keys: better, but odd; he wants a menu. So when you dock a menu is on the screen: Bar, Missions, Fuel, Shop, Repair, Your
// ship. Picking a row stands you at that spot AND opens what it offers in the same press (the bar talk, the mission board, the pump, the shop,
// the repair, the ship bay); closing that brings the menu back. Nobody has to walk or press E. The lounge stays the living backdrop and walking
// still works: N hands the keys back to your feet, N again takes them for the menu.
// One menu idiom with the navigation panel in space (src/navpanel.js, card space-game-nav-panel): the same panel (dark glass, 322 px wide, 22 px
// rows, a title with its key on the right, an amber bar on the chosen row, one amber line at the foot that names the next key), the same keys
// (W S or the arrows choose, Enter picks, a click on a row does what Enter does, N opens and closes).
// The number keys of the lounge quick-go are this menu's keys now: a number picks its row and opens it. The numbers still come from loungeStops,
// so a dock without a desk keeps keys with no gap, and its missing rows are listed dim, with the reason, and no key.
// It sits low on the right, over the crates of the hangar: every desk, every stop you are stood at and the bar stay in view.
const STATION_MENU = {
  x: W - 24 - 322, y: 478, w: 322, row: 22,
  name: { bar: 'Bar', missions: 'Missions', pump: 'Fuel', shop: 'Shop', repair: 'Repair', ship: 'Your ship' },
  note: { bar: 'talk', missions: 'mission board', pump: 'buy fuel', shop: 'upgrades', repair: 'mend the hull', ship: 'ship bay, launch' },
  does: { bar: 'talk at the bar', missions: 'open the mission board', pump: 'open the fuel pump', shop: 'open the upgrade shop', repair: 'repair the hull', ship: 'board your ship' },
  why: { bar: 'no bar here', missions: 'no mission board here', pump: 'no pump here', shop: 'no shop here', repair: 'no repair bay here' }
};
// the rows, in the order of LOUNGE_STOPS: [{ key, name, n, off, why, note }]. n is the number key ('' on a row this station does not have).
// st (optional) is what the notes read: { hull, maxHull, price, keeper }.
function stationMenuRows(spots, look, st) {
  const M = STATION_MENU, stops = loungeStops(spots, look);
  return LOUNGE_STOPS.map(([key]) => {
    const stop = stops.find(q => q.key === key), row = { key, name: M.name[key], n: stop ? stop.n : '', off: !stop, why: stop ? '' : M.why[key] || 'not here', note: stop ? M.note[key] : M.why[key] || 'not here' };
    if (stop && st && key === 'repair') { const missing = Math.max(0, (st.maxHull || 0) - (st.hull || 0)); row.note = missing > 0 ? Math.ceil(missing * (st.price || 0)) + ' cr' : 'hull is whole'; }
    if (stop && st && key === 'bar' && st.keeper) row.note = 'talk to ' + st.keeper;
    return row;
  });
}
// the amber line at the foot: what Enter does on the chosen row, or why it does nothing
function stationMenuHint(row, keys) {
  if (!keys) return 'N  menu keys   ' + 'number or click picks';
  if (!row) return '';
  return row.off ? row.name + ': ' + row.why + '.' : 'Enter  ' + STATION_MENU.does[row.key];
}
// the row a key or a click means: by number key ('3'), by row key ('repair') or by place in the list (2)
function stationMenuFind(rows, what) {
  return typeof what === 'number' ? rows[what] || null : rows.find(r => (r.n && r.n === String(what)) || r.key === what) || null;
}

class Station extends Phaser.Scene {
  constructor() { super('Station'); }
  init(d) { this.arrive = !!(d && d.arrive); }
  create() {
    this.leaving = false; this.panel = false;
    const look = this.look = stationLook(G.lastDock); // src/stationlook.js: this station's name, accent colour, which desks stand in the hall, and what the bar says
    shipRefresh(this); // src/ships.js: the hangar ship shows the upgrade tiers you own
    this.cameras.main.fadeIn(300, 0, 0, 0);
    interiorTextures(this); // src/interior.js: the floor, walls, props, lights and people are drawn there
    this.shipImg = this.add.image(1090, 360, 'ship').setScale(shipFitScale(3)); // src/shipmodels.js: the active model, 168 px wide on the pad
    label(this, 1090, 432, 'YOUR SHIP', '#9fe9ff');

    this.walls = [];
    const wall = (x, y, w, h) => { const r = rectWall(this, x, y, w, h); this.walls.push(r); return r; };
    wall(0, 0, W, IN_NORTH); wall(0, H - IN_SOUTH, W, IN_SOUTH); wall(0, 0, 20, H); wall(W - 20, 0, 20, H); // the top and bottom walls are thicker: interior.js draws them face-on
    wall(860, IN_NORTH, 20, 280 - IN_NORTH); wall(860, 440, 20, 260 - (IN_SOUTH - 20));
    wall(20, 420, 380, 20); wall(520, 420, 340, 20);
    [[500, 100], [540, 100], [760, 320]].forEach(([x, y]) => {
      const c = this.add.rectangle(x, y, 40, 40, 0x3a2a14).setStrokeStyle(2, AMBER, 0.8);
      this.physics.add.existing(c, true); this.walls.push(c);
    });

    // interactables: [x, y, label, key]
    this.spots = [
      look.terminals.missions && { x: 200, y: 200, text: 'MISSIONS', key: 'missions', color: look.accentCss, dy: 74 },
      look.terminals.repair && { x: 640, y: 200, text: 'REPAIR BAY', key: 'repair', color: '#6dff9c', dy: 74 },
      { x: 1090, y: 360, text: 'YOUR SHIP', key: 'ship', color: '#ffb454', dy: 76 }
    ].filter(Boolean);
    this.spots.filter(sp => sp.key !== 'ship').forEach(sp => {
      const r = rectWall(this, sp.x - 50, sp.y - 22, 100, 44, 0x0d2a3f, sp.key === 'repair' ? GREEN : look.accent);
      this.walls.push(r);
    });

    // the lower deck is the bar (src/shop.js) and the hangar gets the upgrade shop terminal
    buildBar(this); buildShop(this); buildPump(this); // src/fuel.js: the fuel pump terminal, where the station has one

    interiorBuild(this); // lights, signs, hologram desks, patrons and wanderers (src/interior.js)
    stationPlates(this); // every desk's name on a plate the machine art cannot cross (below)

    this.player = this.physics.add.sprite(960, 400, 'in-pilot0').setCollideWorldBounds(true).setDepth(5);
    this.player.body.setCircle(9, 7, 7);
    this.walls.forEach(w => this.physics.add.collider(this.player, w));
    this.k = this.input.keyboard.addKeys('W,A,S,D,E,ESC,UP,DOWN,LEFT,RIGHT');

    this.prompt = floatPrompt(this, this.player); // key cap above whatever you can use (src/ui.js)
    // quick go: a key cap beside every spot, and the hint says the keys (walking still works)
    const stops = loungeStops(this.spots, look);
    this.goCaps = stops.map(st => keyCap(this, st.n, AMBER).setPosition(st.cx, st.cy).setDepth(6)); // src/ui.js
    this.goHint = this.add.text(24, H - IN_SOUTH - 28, (stops.length > 1 ? '1-' + stops.length : '1') + ' pick from the menu   N menu or walk   E interact', { fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92' }).setDepth(100);
    this.input.keyboard.on('keydown', e => { if (!e.repeat && /^[1-9]$/.test(e.key)) this.menuPick(e.key); }); // a number picks its row of the station menu: go there and open it
    this.menuSetup();

    this.ui = panel(this, { w: 1160, h: 480, title: 'MISSION BOARD  -  ' + look.name.toUpperCase(), dim: true }); // src/ui.js; 1160 wide: four cards side by side are 1106 px (openPanel: GAP 280, CW 266), and at 900 the outer two hung 100 px out of the panel each side (first look, docs/FIRSTLOOK.md)
    this.panelBox = this.ui.box.setVisible(false); this.boardObjs = [];

    if (this.arrive && G.mission === 'rescued') {
      const pay = callReward(missionDef() || MISSIONS.find(m => m.id === 'rescue') || { reward: REWARD }); // the rescue call you took: its reward (content/missions/*.md) times the pay of the system
      G.credits += pay; G.mission = 'none'; G.stats.missions++;
      toast(this, uiText('toast.delivered', { reward: pay }), '#6dff9c'); sfx('chime');
    } else if (this.arrive) {
      toast(this, uiText('toast.docked'), '#9fe9ff');
    }
    if (this.arrive) dockFee(this); // the door fee, if the dock has one
    if (this.arrive) missionDock(this); // missions.js: a courier or haul bound for this station is paid
    if (this.arrive) sellOre(this); // asteroids.js: ore in the hold is sold on docking
    if (this.arrive) bountyDock(this); // enemies.js: what this flight's pirate kills paid
    if (this.arrive) feelArrive(this); // feel.js: a short settle-in zoom after docking
  }

  // The mission board: offer cards you pick between, then E accepts. Offers come from MISSIONS in src/missions.js.
  // 1-3 or the arrow keys choose a call, E accepts it, X drops the one under way, Esc closes.
  openPanel() {
    this.panel = true; this.panelBox.setVisible(true); this.canAccept = false; this.prompt.setText('');
    const posted = missionsOffered(); // src/missions.js: the calls this station's dock posts
    if (!posted.length && !(G.mission === 'accepted' || G.mission === 'rescued')) return this.openEmptyBoard();
    const busy = () => G.mission === 'accepted' || G.mission === 'rescued';
    const RISK = { rescue: ['MEDIUM', 2, '#ffb454'], escort: ['HIGH', 3, '#ff4d6d'], patrol: ['MEDIUM', 2, '#ffb454'], bounty: ['EXTREME', 3, '#ff2a4a'],
      courier: ['LOW', 1, '#6dff9c'], haul: ['LOW', 1, '#6dff9c'], salvage: ['MEDIUM', 2, '#ffb454'], survey: ['MEDIUM', 2, '#ffb454'] };
    const taken = new Set(posted.filter(m => m.key).map(m => m.key)); let nextKey = 1;
    const freeKey = () => { while (taken.has(String(nextKey))) nextKey++; return nextKey < 10 ? String(nextKey++) : ''; }; // a call with no key of its own (a run, a site) takes the first number nobody on this board has
    const OFFERS = posted.map(m => Object.assign(Object.create(m), { key: m.key || freeKey() }));
    // four cards fit side by side; a pack that adds more calls than that scrolls: the window of four follows the call you choose
    const VIS = 4, SHOWN = Math.min(OFFERS.length, VIS), GAP = Math.min(288, Math.floor(1120 / SHOWN)), CW = Math.min(270, GAP - 14);
    let start = 0;
    const clear = () => { this.boardObjs.forEach(o => o.destroy()); this.boardObjs = []; };
    const add = o => { this.panelBox.add(o); this.boardObjs.push(o); return o; };
    const txt = (x, y, str, size, color, o = {}) => add(this.add.text(x, y, str, uiFont(size, color, o.style)).setOrigin(o.ox === undefined ? 0 : o.ox, o.oy === undefined ? 0.5 : o.oy));
    const risk = m => RISK[missionKind(m)] || ['UNKNOWN', 1, '#9fe9ff'];
    let sel = 0;

    const card = (m, i, cx, cy, w, h, selected) => {
      const g = add(this.add.graphics());
      g.fillStyle(selected ? 0x10283d : 0x0a1b2c, 1); g.fillRect(cx - w / 2, cy - h / 2, w, h);
      g.lineStyle(selected ? 3 : 1, selected ? AMBER : CYAN, selected ? 1 : 0.5); g.strokeRect(cx - w / 2, cy - h / 2, w, h);
      if (selected) { g.fillStyle(AMBER, 1); g.fillRect(cx - w / 2, cy - h / 2, w, 4); }
      const L = cx - w / 2 + 16, cap = keyCap(this, m.key, selected ? AMBER : CYAN); cap.setPosition(L + cap.kw / 2, cy - h / 2 + 30); add(cap);
      const reach = missionReach(m); // a call the ship you fly cannot reach is dimmed and says so (src/missions.js; the line that says what would reach it is under BRIEFING)
      txt(L + cap.kw + 10, cy - h / 2 + 30, m.title.toUpperCase(), 17, !reach.ok ? '#5b7a92' : selected ? '#ffd37a' : '#9fe9ff', { style: { fontStyle: 'bold' } });
      txt(L, cy - h / 2 + 58, m.where, 13, reach.ok ? '#8fb4c9' : '#5b7a92');
      if (!reach.ok) txt(L, cy - h / 2 + 74, reach.why === 'fuel' ? 'NOT ENOUGH TANK' : 'OUT OF JUMP RANGE', 11, '#ffb454', { style: { fontStyle: 'bold' } });
      txt(L, cy - h / 2 + 90, 'REWARD', 11, '#5b7a92'); txt(L, cy - h / 2 + 112, callReward(m) + ' cr', 28, '#ffb454', { style: { fontStyle: 'bold' } });
      const r = risk(m);
      txt(L, cy - h / 2 + 144, 'RISK', 11, '#5b7a92');
      const pg = add(pips(this, L, cy - h / 2 + 157, r[1], 3, Phaser.Display.Color.HexStringToColor(r[2]).color));
      txt(L + 58, cy - h / 2 + 161, r[0], 13, r[2], { style: { fontStyle: 'bold' } });
      txt(L, cy - h / 2 + 178, m.offer.split('\n')[0], 13, '#cfefff', { oy: 0, style: { wordWrap: { width: w - 32 }, lineSpacing: 2 } });
      return add(this.add.rectangle(cx, cy, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    };

    const render = () => {
      clear(); crTag(this, this.ui, G.credits); // src/ui.js: coin and gold N CR
      if (busy()) {
        const m = missionDef(), r = risk(m), cy = -70;
        this.ui.titleText.setText('MISSION BOARD  -  UNDER WAY');
        const g = add(this.add.graphics());
        g.fillStyle(0x10283d, 1); g.fillRect(-300, cy - 110, 600, 220); g.lineStyle(3, AMBER, 1); g.strokeRect(-300, cy - 110, 600, 220);
        g.fillStyle(AMBER, 1); g.fillRect(-300, cy - 110, 600, 4);
        txt(-276, cy - 78, m.title.toUpperCase(), 22, '#ffd37a', { style: { fontStyle: 'bold' } });
        txt(276, cy - 78, 'IN PROGRESS', 15, '#6dff9c', { ox: 1 });
        txt(-276, cy - 44, m.where, 14, '#8fb4c9');
        txt(-276, cy - 8, m.progress(), 17, '#e8f6ff', { oy: 0, style: { lineSpacing: 6 } });
        txt(-276, cy + 84, 'PAYS ' + callReward(m) + ' cr', 16, '#ffb454', { style: { fontStyle: 'bold' } });
        this.ui.setHints([['X', 'Drop the mission'], ['Esc', 'Close']]); return;
      }
      this.ui.titleText.setText('MISSION BOARD  -  ' + this.look.name.toUpperCase());
      OFFERS.slice(start, start + VIS).forEach((m, k) => {
        const i = start + k, z = card(m, i, (k - (SHOWN - 1) / 2) * GAP, -75, CW, 220, i === sel);
        z.on('pointerdown', () => { if (sel === i) acceptSel(); else choose(i); });
      });
      if (OFFERS.length > VIS) txt(420, 52, (start > 0 ? '<  ' : '') + 'CALLS ' + (start + 1) + '-' + (start + SHOWN) + ' OF ' + OFFERS.length + (start + VIS < OFFERS.length ? '  >' : ''), 11, '#5b7a92', { ox: 1 });
      txt(-420, 52, 'BRIEFING', 11, '#5b7a92');
      { const reach = missionReach(OFFERS[sel]); if (!reach.ok) txt(-340, 52, reach.line, 12, '#ffb454'); } // why E does nothing on this one, and what would reach it
      txt(-420, 66, OFFERS[sel].offer, 14, '#cfefff', { oy: 0, style: { lineSpacing: 4 } });
      this.ui.setHints([['E', 'Accept'], OFFERS.length > VIS ? ['< >', 'Choose'] : ['1-' + OFFERS.length, 'Choose'], ['Esc', 'Close']]);
    };
    const choose = (i, quiet) => {
      sel = Phaser.Math.Wrap(i, 0, OFFERS.length); pickMission(OFFERS[sel].id); this.canAccept = missionCanAccept(OFFERS[sel]); // src/missions.js: not a call this ship cannot fly to and back
      if (sel < start) start = sel; else if (sel >= start + VIS) start = sel - VIS + 1;
      if (!quiet) beep(600, 0.05, 'square', 0.02);
      render();
    };
    const acceptSel = () => { // same as pressing E in update()
      if (!this.canAccept) return;
      G.mission = 'accepted'; missionAccepted(); this.closePanel(); beep(520, 0.15, 'triangle', 0.05, 300); // missions.js: a haul loads its freight
      toast(this, uiText('toast.accepted'));
    };

    const kb = this.input.keyboard;
    if (this.boardKeys) kb.off('keydown', this.boardKeys);
    this.boardKeys = e => {
      if (!this.panel) { kb.off('keydown', this.boardKeys); this.boardKeys = null; return; }
      const key = e.key.toLowerCase();
      if (busy()) {
        if (key === 'x') {
          abandonMission(); this.closePanel(); beep(200, 0.2, 'sawtooth', 0.04, -100);
          toast(this, uiText('toast.dropped'), '#ffd37a');
        }
        return;
      }
      const i = OFFERS.findIndex(x => x.key === key);
      if (i >= 0) choose(i);
      else if (key === 'arrowright') choose(sel + 1);
      else if (key === 'arrowleft') choose(sel - 1);
    };
    kb.on('keydown', this.boardKeys);
    if (busy()) render(); else choose(Math.max(0, OFFERS.findIndex(m => m.id === G.missionId)), true);
  }
  // A station whose dock posts no calls (the Roost): the desk says so
  openEmptyBoard() {
    const name = fleetStationName(G.lastDock); // src/fleet.js
    this.ui.titleText.setText('MISSION BOARD  -  ' + name.toUpperCase());
    crTag(this, this.ui, G.credits); // src/ui.js
    const o = this.add.text(0, -70, 'No calls are posted at ' + name + ' yet.\nThe board at Halcyon Station has work.', uiFont(18, '#cfefff', { align: 'center', lineSpacing: 8 })).setOrigin(0.5);
    this.panelBox.add(o); this.boardObjs.push(o);
    this.ui.setHints([['Esc', 'Close']]);
  }
  // Quick go: stand next to stop n at once. Not while a terminal, the shop, the pump or a chat owns the keys (their number keys mean something else).
  quickGo(n) {
    if (this.leaving || this.panel || this.shopOpen || this.pumpOpen || this.chat) return false;
    const el = typeof document !== 'undefined' && document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return false; // typing in a field
    const st = loungeStops(this.spots, this.look).find(q => q.n === String(n)); if (!st) return false;
    if (this.talk) hideTalk(this); // src/shop.js
    this.player.body.reset(st.x, st.y); this.player.rotation = st.face;
    beep(700, 0.06, 'square', 0.02);
    return true;
  }
  // ---- the station menu (the list and the idea: stationMenuRows above) ----
  menuSetup() {
    const M = STATION_MENU, n = LOUNGE_STOPS.length, h = 30 + M.row * n + 30, m = this.menu = { keys: true, sel: 0, rows: [], lines: [], parts: [], shown: true, at: 0, pending: null };
    const fix = o => { o.setScrollFactor(0); m.parts.push(o); return o; };
    const font = (size, color, bold) => ({ fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal' });
    m.bg = fix(this.add.rectangle(M.x, M.y, M.w, h, 0x04101c, 0.86).setOrigin(0, 0).setStrokeStyle(1, 0x2a6f8f, 0.9).setDepth(100));
    m.bg.setInteractive(); m.bg.on('pointerdown', (p, x, y, e) => { if (e && e.stopPropagation) e.stopPropagation(); });
    m.title = fix(this.add.text(M.x + 10, M.y + 15, this.look.name.toUpperCase(), font(13, '#9fe9ff', true)).setOrigin(0, 0.5).setDepth(101));
    m.key = fix(this.add.text(M.x + M.w - 10, M.y + 15, '', font(12, '#5b7a92')).setOrigin(1, 0.5).setDepth(101));
    m.hl = fix(this.add.rectangle(M.x + 3, M.y + 30, M.w - 6, M.row, 0xffb454, 0.16).setOrigin(0, 0).setStrokeStyle(1, 0xffb454, 0.7).setDepth(100.5));
    for (let i = 0; i < n; i++) {
      const y = M.y + 30 + M.row * i + M.row / 2;
      const cap = fix(this.add.text(M.x + 18, y, '', font(12, '#02101c', true)).setOrigin(0.5).setDepth(101.2));
      const capBg = fix(this.add.rectangle(M.x + 18, y, 18, 16, 0xffb454, 1).setDepth(101));
      const name = fix(this.add.text(M.x + 36, y, '', font(14, '#cfefff')).setOrigin(0, 0.5).setDepth(101));
      const note = fix(this.add.text(M.x + M.w - 10, y, '', font(13, '#9fe9ff')).setOrigin(1, 0.5).setDepth(101));
      const zone = fix(this.add.rectangle(M.x + 3, y - M.row / 2, M.w - 6, M.row, 0x000000, 0.001).setOrigin(0, 0).setDepth(101.5));
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p, x, yy, e) => { if (e && e.stopPropagation) e.stopPropagation(); if (this.menu.shown) this.menuPick(i); }); // a click on a row is Enter on that row
      zone.on('pointerover', () => { if (this.menu.shown) { this.menu.sel = i; this.menu.at = 0; } });
      m.lines.push({ cap, capBg, name, note, zone });
    }
    m.foot = fix(this.add.text(M.x + 10, M.y + h - 15, '', font(12, '#ffd37a')).setOrigin(0, 0.5).setDepth(101));
    m.k = this.input.keyboard.addKeys('N,ENTER');
    this.menuDraw();
  }
  // what the notes of the rows read: the hull and what mending it costs here, and who tends the bar
  menuState() {
    const bk = this.spots.find(sp => sp.npc !== undefined && typeof NPCS !== 'undefined' && NPCS[sp.npc] && NPCS[sp.npc].role === 'bartender');
    return { hull: G.hull, maxHull: G.maxHull, price: repairPrice(), keeper: bk ? NPCS[bk.npc].name : '' };
  }
  menuDraw() {
    const m = this.menu, M = STATION_MENU; if (!m) return;
    const rows = m.rows = stationMenuRows(this.spots, this.look, this.menuState());
    m.sel = Math.max(0, Math.min(m.sel, rows.length - 1));
    m.parts.forEach(o => o.setVisible(m.shown));
    if (!m.shown) return;
    m.bg.setAlpha(m.keys ? 1 : 0.7);
    m.key.setText(m.keys ? 'N  walk' : 'N  menu');
    m.hl.setY(M.y + 30 + M.row * m.sel).setVisible(m.keys);
    rows.forEach((r, i) => {
      const l = m.lines[i], on = m.keys && i === m.sel;
      l.cap.setText(r.n).setVisible(!r.off); l.capBg.setVisible(!r.off).setAlpha(m.keys ? 1 : 0.75);
      l.name.setText((on ? '> ' : '') + r.name).setColor(r.off ? '#5b7a92' : on ? '#ffffff' : '#cfefff');
      l.note.setText(r.note).setColor(r.off ? '#5b7a92' : '#9fe9ff');
    });
    m.foot.setText(stationMenuHint(rows[m.sel], m.keys));
  }
  // pick a row: by its number key ('3'), its key ('repair') or its place (2, a click). You are stood at the spot now; what it offers opens on the
  // next frame (menuFrame), so the key that picked it is not read a second time by the board or the shop it opens.
  menuPick(what) {
    const m = this.menu; if (!m || this.leaving || this.panel || this.shopOpen || this.pumpOpen || this.chat) return false;
    const row = stationMenuFind(m.rows, what); if (!row) return false;
    m.sel = m.rows.indexOf(row); m.at = 0;
    if (row.off) { toast(this, row.name + ': ' + row.why + '.', '#ffd37a'); sfx('empty'); return false; }
    if (!this.quickGo(row.n)) return false;
    m.pending = row.key; m.keys = true; // the menu has the keys again when what you opened is closed
    return true;
  }
  // open what a spot offers, as E at it does
  menuOpen(key) {
    if (key === 'missions') this.openPanel();
    else if (key === 'pump') openPump(this); // src/fuel.js
    else if (key === 'shop') openShop(this); // src/shop.js
    else if (key === 'repair') this.repairHull();
    else if (key === 'ship') { sfx('dock'); go(this, 'Ship'); } // src/shipmode.js
    else if (key === 'bar') {
      const bk = this.spots.find(sp => sp.npc !== undefined && NPCS[sp.npc] && NPCS[sp.npc].role === 'bartender');
      if (bk) talkTo(this, bk.npc); else toast(this, 'Nobody is tending the bar just now.', '#9fe9ff'); // src/shop.js
    }
  }
  // once a frame, before the walking: true while the menu has the keyboard (no walking then)
  menuFrame() {
    const m = this.menu, JD = Phaser.Input.Keyboard.JustDown, k = this.k; if (!m) return false;
    const shown = !(this.leaving || this.panel || this.shopOpen || this.pumpOpen || this.chat);
    if (shown !== m.shown) { m.shown = shown; m.at = 0; }
    if (!shown) { if (m.at !== -1) { m.at = -1; this.menuDraw(); } return false; }
    if (m.pending) { const key = m.pending; m.pending = null; this.menuOpen(key); m.at = 0; return true; }
    if (JD(m.k.N)) { m.keys = !m.keys; m.at = 0; beep(700, 0.05, 'square', 0.02); }
    if (m.keys) {
      const n = m.rows.length || 1;
      if (JD(k.W) || JD(k.UP)) { m.sel = (m.sel + n - 1) % n; m.at = 0; beep(820, 0.03, 'square', 0.015); }
      if (JD(k.S) || JD(k.DOWN)) { m.sel = (m.sel + 1) % n; m.at = 0; beep(820, 0.03, 'square', 0.015); }
      if (JD(m.k.ENTER)) this.menuPick(m.sel);
    }
    if (this.time.now >= m.at) { m.at = this.time.now + 400; this.menuDraw(); } // the notes (the repair price, who tends the bar) follow the game
    return m.keys;
  }
  // the repair bay: half a credit a point at Halcyon (repairPrice); too poor for a full repair and it mends as much as you can pay for
  repairHull() {
    const missing = G.maxHull - G.hull, price = repairPrice(), cost = Math.ceil(missing * price);
    if (missing <= 0) toast(this, 'Hull is already perfect.', '#9fe9ff');
    else if (G.credits <= 0) toast(this, 'Repair costs ' + cost + ' cr. You have 0.', '#ff4d6d');
    else {
      const pay = Math.min(cost, G.credits);
      G.credits -= pay; G.hull = pay < cost ? Math.min(G.maxHull, G.hull + Math.floor(pay / price)) : G.maxHull;
      beep(400, 0.2, 'triangle', 0.05, 300); toast(this, (pay < cost ? 'Partly repaired' : 'Hull repaired') + ' (-' + pay + ' cr).', '#6dff9c');
    }
  }
  closePanel() { this.panel = false; this.panelBox.setVisible(false); this.boardObjs.forEach(o => o.destroy()); this.boardObjs = []; }

  update() {
    guideTick(this); interiorTick(this, this.time.now);
    const JD = Phaser.Input.Keyboard.JustDown, k = this.k;
    hudTick(this); // src/hud.js
    if (pumpFrame(this)) { this.menuFrame(); return; } // src/fuel.js: the fuel pump panel is open (menuFrame: the station menu is put away meanwhile)
    if (shopFrame(this)) { this.menuFrame(); return; } // upgrade shop panel is open, or a chat
    if (this.panel) {
      this.player.setVelocity(0, 0);
      if (JD(k.ESC)) this.closePanel();
      if (this.canAccept && JD(k.E)) {
        G.mission = 'accepted'; missionAccepted(); this.closePanel(); beep(520, 0.15, 'triangle', 0.05, 300);
        toast(this, uiText('toast.accepted'));
      }
      this.menuFrame();
      return;
    }
    const menu = this.menuFrame(); // the station menu: while it has the keys W and S choose a row, so nobody walks
    const dx = menu ? 0 : (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = menu ? 0 : (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(210);
    this.player.setVelocity(v.x, v.y);
    if (dx || dy) this.player.rotation = Math.atan2(dy, dx);

    let near = null, nearD = 90;
    this.spots.forEach(sp => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y);
      if (d < nearD) { near = sp; nearD = d; }
    });
    if (near) this.prompt.at(near.x, near.y - (near.dy || 56));
    this.prompt.setText(near && !this.talk ? 'E  ' + (near.prompt || { missions: 'Check the mission board', repair: 'Repair hull', ship: 'Board your ship' }[near.key]) : '');
    if (near && JD(k.E) && !spotInteract(this, near)) {
      if (near.key === 'missions') this.openPanel();
      else if (near.key === 'pump') openPump(this);
      else if (near.key === 'repair') this.repairHull();
      else if (near.key === 'ship') { sfx('dock'); go(this, 'Ship'); } // src/shipmode.js: look the ship over, then Launch (Enter)
    }
  }
}

// ---------- The hangar terminal: the panel at the bottom left of the Ship bay (docs/UNIVERSE.md 6.3 and 9; card u-d4) ----------
// The Ship bay (src/shipmode.js) is the hangar terminal's home. This file adds the panel under the stage with three tabs and the rules for
// what the stage shows. It only draws and chooses: the work (buy, sell, switch, rename, transfer) is src/fleet.js, which answers
// { ok, msg } and which every button here calls as it is.
//   FLEET     up to six berths, one card per ship (a picture, its name, its hull or where it is parked). A or D, the arrows or a click
//             selects; the stage and the status panel show the selected ship. R renames it, S sells it (a second S confirms).
//   YARD      the ships this station sells (stationYard in fleet.js); the stage shows the hull bare, the status panel bars of what it gives
//             against the best of the six, with a tick where the ship you fly stands.
//   CONTROLS  the key list the bay always had.
// The big amber button does what Enter does for the ship in view: LAUNCH (the ship you fly), BOARD (a ship parked here: switch to it),
// MOVE HERE (a ship parked elsewhere: pay to bring it) or BUY (a yard ship: a second Enter confirms). Buying never changes the ship you fly:
// the new one is parked and you board it. Selling and buying both take a second press, never within 350 ms of the first (a double tap)
// and never after 4 s.
// State on the scene: tab, selUid (the ship selected in FLEET), selModel (the one in YARD), view (what the stage shows), armed (a sale
// or a purchase waiting for its second press), noteHold (a message for 5 s), typing (the name box is open).

const HANGAR = {
  x: 415, y: 606, w: 770, h: 188,                // the panel
  slot: { w: 116, h: 82, gap: 9.2, top: -46 },   // six berths in a row, measured from the panel's centre
  actY: 63,                                      // the row of actions under them
  confirmMs: 4000, confirmMin: 350
};
const HANGAR_TABS = [['fleet', 'F', 'FLEET'], ['yard', 'Y', 'YARD'], ['keys', 'C', 'CONTROLS']];
const HANGAR_UI = { tab: null }; // the tab you left open, kept while the page lives (it is not saved)
const hgClip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '.' : String(s));
const hgHullColor = f => (f > 0.6 ? GREEN : f > 0.3 ? AMBER : RED);

Object.assign(ShipBay.prototype, {
  // ---- what is in view ----
  hangarFirst() { // called first thing in create(): the tab and the selection, and so the first view
    this.tab = HANGAR_UI.tab || (G.fleet.length > 1 ? 'fleet' : 'keys');
    this.selUid = activeShip().uid; this.selModel = this.yardList()[0] || null;
    this.armed = null; this.noteHold = null; this.typing = false; this.nameEl = null;
    return this.tabView();
  },
  yardList() { return stationYard(G.lastDock).slice(0, SHIPREC.max); },
  tabView() {
    if (this.tab === 'yard' && this.selModel) return { kind: 'yard', model: this.selModel };
    return { kind: 'fleet', rec: this.tab === 'fleet' ? (G.fleet.find(r => r.uid === this.selUid) || activeShip()) : activeShip() };
  },
  // the stage, the status panel and the panel below follow the selection
  hangarRefresh() {
    this.view = this.tabView();
    this.bayStage(); this.bayCallouts(); this.baySubtitle(); this.bayStatusView(24);
    [this.callLayer, this.statusBox].forEach(o => { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 160 }); });
    this.hangarApply();
  },

  // ---- the panel ----
  hangarBuild() {
    const { x, y, w, h } = HANGAR, ui = panel(this, { x, y, w, h, title: '', depth: 20, foot: false }), box = ui.box;
    this.hUI = ui; this.hBox = box;
    this.tabs = {}; this.tabLine = this.add.graphics(); box.add(this.tabLine);
    let tx = -w / 2 + 36; // the tabs sit in the title band, after the amber marker
    HANGAR_TABS.forEach(([id, key, name]) => {
      const cap = keyCap(this, key, CYAN), lab = this.add.text(0, 0, name, uiFont(16, '#5b7a92', { letterSpacing: 2 })).setOrigin(0, 0.5);
      cap.setPosition(tx + cap.kw / 2, -h / 2 + 20); lab.setPosition(tx + cap.kw + 8, -h / 2 + 20);
      box.add([cap, lab]);
      const x0 = tx - 6, x1 = lab.x + lab.width + 8;
      const z = this.add.rectangle((x0 + x1) / 2, -h / 2 + 20, x1 - x0, 34, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => this.hangarTab(id)); box.add(z);
      this.tabs[id] = { lab, x0, x1 }; tx = x1 + 16;
    });
    this.keysBox = this.add.container(0, 0); box.add(this.keysBox); this.bayControls(this.keysBox, w);
    this.slotBox = this.add.container(0, 0); box.add(this.slotBox);
    this.actBox = this.add.container(0, 0); box.add(this.actBox);
    this.noteText = this.add.text(w / 2 - 16, HANGAR.actY, '', uiFont(12, '#8fb4c9', { align: 'right', wordWrap: { width: 250 } })).setOrigin(1, 0.5); box.add(this.noteText);
    this.fadeSet.push(box);
    this.input.on('pointerdown', () => { if (this.typing) this.hangarRenameDone(false); }); // a click anywhere else leaves the name box
  },

  // draw everything that depends on the tab and the selection
  hangarApply() {
    const t = this.tab, o = this.tabs[t], keys = t === 'keys';
    Object.keys(this.tabs).forEach(id => this.tabs[id].lab.setColor(id === t ? '#ffb454' : '#5b7a92'));
    this.tabLine.clear(); this.tabLine.fillStyle(AMBER, 1); this.tabLine.fillRect(o.x0, -HANGAR.h / 2 + 35, o.x1 - o.x0, 2);
    this.keysBox.setVisible(keys); this.slotBox.setVisible(!keys); this.actBox.setVisible(!keys && !this.typing); this.noteText.setVisible(!keys && !this.typing);
    this.hUI.tagText.setText(t === 'fleet' ? G.fleet.length + ' / ' + SHIPREC.max + ' BERTHS' : t === 'yard' ? 'YARD  -  ' + bayWhere(G.lastDock) : 'IN FLIGHT');
    this.hangarSlots(); this.hangarActions(); this.hangarNoteDraw(); this.hangarPrimaryApply();
  },

  // a berth's picture: its own texture, so the ship you fly can be redrawn without touching it
  slotArt(rec) {
    const model = bayModel(rec.model);
    return { model, key: shipPreviewTexture(this, model, { plating: rec.parts.shields | 0, guns: rec.parts.weapons | 0, engine: rec.parts.engine | 0 }) };
  },

  hangarSlots() {
    const box = this.slotBox, S = HANGAR.slot, yard = this.tab === 'yard', items = yard ? this.yardList() : G.fleet, cy = S.top + S.h / 2;
    box.removeAll(true);
    const dash = (g, x, y, w, h) => { // an empty berth is a dashed outline
      g.lineStyle(1, CYAN, 0.25);
      for (let d = 0; d < w; d += 12) { g.lineBetween(x + d, y, x + Math.min(d + 6, w), y); g.lineBetween(x + d, y + h, x + Math.min(d + 6, w), y + h); }
      for (let d = 0; d < h; d += 12) { g.lineBetween(x, y + d, x, y + Math.min(d + 6, h)); g.lineBetween(x + w, y + d, x + w, y + Math.min(d + 6, h)); }
    };
    for (let i = 0; i < 6; i++) {
      const it = items[i]; if (!it && yard) break;
      const sx = -HANGAR.w / 2 + 14 + S.w / 2 + i * (S.w + S.gap), x0 = sx - S.w / 2, y0 = cy - S.h / 2, g = this.add.graphics(); box.add(g);
      if (!it) { dash(g, x0, y0, S.w, S.h); this.text(box, sx, cy, 'EMPTY BERTH', 10, '#3d5a70', { ox: 0.5 }); continue; }
      const sel = yard ? it === this.selModel : it.uid === this.view.rec.uid;
      g.fillStyle(sel ? 0x0e2c44 : 0x0a1b2c, 0.92); g.fillRoundedRect(x0, y0, S.w, S.h, 8);
      g.lineStyle(1, 0x2a5f80, 0.7); g.strokeRoundedRect(x0, y0, S.w, S.h, 8);
      if (sel) hudGlowPath(g, [[x0, y0], [x0 + S.w, y0], [x0 + S.w, y0 + S.h], [x0, y0 + S.h]], CYAN, 0.95, true, 2);
      let art, name, sub, subColor, away = false;
      if (yard) {
        art = { model: it, key: shipPreviewTexture(this, it, { plating: 0, guns: 0, engine: 0 }) };
        const price = SHIP_MODELS[it].price;
        name = SHIP_MODELS[it].name; sub = hudFmt(price) + ' CR'; subColor = G.credits >= price ? '#ffd37a' : '#ff4d6d';
      } else {
        art = this.slotArt(it); away = it !== activeShip() && it.at !== G.lastDock;
        const f = it.maxHull ? it.hull / it.maxHull : 1;
        name = it.name; sub = away ? bayWhere(it.at) : 'HULL ' + Math.round(f * 100) + '%'; subColor = away ? '#ffb454' : hudCss(hgHullColor(f));
      }
      const L = SHIP_LOOK[art.model], k = Math.min(76 / L.w, 34 / L.h);
      box.add(this.add.image(sx, cy - 15, art.key).setScale(k).setAlpha(away ? 0.5 : 1));
      this.text(box, sx, cy + 14, hgClip(name, 15), 11, sel ? '#ffffff' : '#cfefff', { ox: 0.5, style: { fontStyle: 'bold' } });
      this.text(box, sx, cy + 29, hgClip(sub, 15), 10, subColor, { ox: 0.5 });
      if (!yard && it === activeShip()) { // the ship you fly wears a green flag
        g.fillStyle(GREEN, 1); g.fillTriangle(x0 + 8, y0 + 6, x0 + 8, y0 + 14, x0 + 14, y0 + 10);
        this.text(box, x0 + 18, y0 + 10, 'FLYING', 9, '#6dff9c', { style: { fontStyle: 'bold', letterSpacing: 1 } });
      }
      const z = this.add.rectangle(sx, cy, S.w, S.h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => this.hangarPick(i)); box.add(z);
    }
  },

  // the row under the berths: what the keys do here, each one clickable
  hangarActions() {
    const box = this.actBox, y = HANGAR.actY; box.removeAll(true);
    if (this.tab === 'keys') return;
    let x = -HANGAR.w / 2 + 18;
    const chip = (key, text, fn, color = CYAN, tcol = '#9fe9ff') => {
      const cap = keyCap(this, key, color), lab = this.add.text(0, 0, text, uiFont(13, tcol)).setOrigin(0, 0.5);
      cap.setPosition(x + cap.kw / 2, y); lab.setPosition(x + cap.kw + (text ? 6 : 0), y); box.add([cap, lab]);
      const x1 = lab.x + lab.width + 4;
      if (fn) { const z = this.add.rectangle((x - 4 + x1) / 2, y, x1 - x + 4, 26, 0x000000, 0.001).setInteractive({ useHandCursor: true }); z.on('pointerdown', fn); box.add(z); }
      x = x1 + 16;
    };
    chip('A', '', () => this.hangarStep(-1)); x -= 12; chip('D', 'Choose', () => this.hangarStep(1));
    const v = this.view; if (v.kind !== 'fleet') return;
    chip('R', 'Rename', () => this.hangarRename());
    const rec = v.rec;
    if (rec !== activeShip() && rec.at === G.lastDock) {
      const sure = this.armed && this.armed.kind === 'sell' && this.armed.id === rec.uid, total = fleetSellValue(rec).total;
      chip('S', sure ? 'Sure? ' + hudFmt(total) + ' CR' : 'Sell ' + hudFmt(total) + ' CR', () => this.hangarSell(), sure ? RED : CYAN, sure ? '#ff4d6d' : '#9fe9ff');
    }
  },

  // the line at the right of the row: what a message says, or what a sale or purchase is waiting for, or what the ship in view is doing
  hangarNoteDraw() {
    const a = this.armed, v = this.view; let n;
    if (a && a.kind === 'sell') { const r = G.fleet.find(q => q.uid === a.id); n = { msg: 'Sell ' + (r ? r.name : 'it') + '? S again to confirm.', color: '#ff4d6d' }; }
    else if (a && a.kind === 'buy') n = { msg: 'Buy the ' + SHIP_MODELS[a.id].name + '? Enter again to confirm.', color: '#ffb454' };
    else if (this.noteHold) n = this.noteHold;
    else if (v.kind === 'yard') n = { msg: 'Parks here when bought. You keep flying ' + activeShip().name + '.', color: '#8fb4c9' };
    else if (this.tab === 'yard') n = { msg: 'This yard sells no ships.', color: '#8fb4c9' };
    else {
      const rec = v.rec;
      if (rec === activeShip()) n = { msg: 'The ship you fly. Its hold goes where it goes.', color: '#8fb4c9' };
      else if (rec.at === G.lastDock) n = { msg: 'Parked here. Enter boards it; its hold stays with it.', color: '#8fb4c9' };
      else {
        const cost = fleetTransferCost(rec.at, G.lastDock), ly = fleetLy(rec.at, G.lastDock), name = fleetStationName(rec.at);
        n = { msg: cost === null ? 'Parked at ' + name + ', out of reach.' : 'Parked at ' + name + ', ' + ly.toFixed(1) + ' ly. Move it here for ' + hudFmt(cost) + ' CR.', color: '#8fb4c9' };
      }
    }
    this.noteText.setText(n.msg).setColor(n.color);
  },
  hangarNote(msg, color = '#ffd37a', ms = 5000) { this.noteHold = { msg, color, until: performance.now() + ms }; this.hangarNoteDraw(); },
  hangarTick() { // from update(): a message runs out, a confirmation nobody gave runs out
    if (this.armed && performance.now() - this.armed.at > HANGAR.confirmMs) this.hangarDisarm();
    if (this.noteHold && performance.now() > this.noteHold.until) { this.noteHold = null; this.hangarNoteDraw(); }
  },

  // ---- the amber button ----
  // what Enter does for the ship in view: { id, verb, label, sub, ok, advice }
  hangarPrimaryInfo() {
    const v = this.view;
    if (v.kind === 'yard') {
      const m = SHIP_MODELS[v.model], armed = this.armed && this.armed.kind === 'buy' && this.armed.id === v.model, adv = 'The new ship is parked here, bare and fuelled. You keep flying this one.';
      if (G.fleet.length >= SHIPREC.max) return { id: 'buy', verb: 'Buy', label: 'BUY', sub: 'HANGAR FULL', ok: false, advice: 'The hangar holds ' + SHIPREC.max + ' ships. Sell one first (tab F).' };
      if (G.credits < m.price) return { id: 'buy', verb: 'Buy', label: 'BUY', sub: 'NEED ' + hudFmt(m.price - G.credits) + ' MORE CR', ok: false, advice: adv };
      return { id: 'buy', verb: 'Buy', label: 'BUY', sub: armed ? 'ENTER AGAIN TO CONFIRM' : m.name.toUpperCase() + '  -  ' + hudFmt(m.price) + ' CR', ok: true, hot: armed, advice: adv };
    }
    const rec = v.rec;
    if (rec === activeShip()) return { id: 'launch', verb: 'Launch', label: 'LAUNCH', sub: '', ok: true };
    if (rec.at === G.lastDock) return { id: 'board', verb: 'Board', label: 'BOARD', sub: rec.name.toUpperCase(), ok: true, advice: 'Switch ships. Each ship keeps its own hold; your mission and credits come with you.' };
    const cost = fleetTransferCost(rec.at, G.lastDock);
    if (cost === null) return { id: 'move', verb: 'Move here', label: 'MOVE HERE', sub: 'OUT OF REACH', ok: false, advice: 'This ship is parked somewhere we cannot reach.' };
    const ok = G.credits >= cost;
    return { id: 'move', verb: 'Move here', label: 'MOVE HERE', sub: ok ? hudFmt(cost) + ' CR  -  ' + fleetLy(rec.at, G.lastDock).toFixed(1) + ' LY' : 'NEED ' + hudFmt(cost - G.credits) + ' MORE CR', ok, advice: 'It is in this hangar the moment you pay.' };
  },
  hangarPrimaryApply() {
    const p = this.hangarPrimaryInfo(), two = !!p.sub;
    this.pLabel.setText(p.label).setFontSize(two ? 28 : 34).setY(two ? -10 : 0).setColor(p.ok ? '#ffb454' : '#8a6f4a');
    this.pSub.setText(p.sub).setColor(!p.ok ? '#ff4d6d' : p.hot ? '#ffffff' : '#ffd37a').setY(two ? 22 : 24);
    const [msg, col] = p.id === 'launch' ? this.launchAdvice() : [p.advice, '#9fe9ff'];
    this.advice = msg; this.advText.setText(msg).setColor(col);
    if (this.hintVerb !== p.verb) this.bayHints(p.verb);
  },
  // Enter, Space or a click on the button. Space never buys.
  primary(viaEnter = true) {
    if (this.leaving || this.typing || performance.now() < this.ignoreUntil) return;
    const v = this.view, p = this.hangarPrimaryInfo(); this.crPrev = G.credits;
    if (p.id === 'launch') return this.launch();
    if (p.id === 'board') return this.hangarDone(fleetSwitch(v.rec.uid), 'board');
    if (p.id === 'move') return this.hangarDone(fleetTransfer(v.rec.uid), 'move');
    if (!p.ok) return this.hangarDone(fleetBuy(v.model, false), 'buy'); // it fails, and says why
    if (!viaEnter) return;
    if (!this.armed || this.armed.kind !== 'buy' || this.armed.id !== v.model) return this.hangarArm('buy', v.model);
    if (performance.now() - this.armed.at < HANGAR.confirmMin) return;
    this.hangarDone(fleetBuy(v.model, false), 'buy');
  },
  // what happened: a refusal says why, a success is drawn again
  hangarDone(res, what) {
    this.armed = null;
    if (!res.ok) { sfx('empty'); this.hangarApply(); this.hangarNote(res.msg, '#ff4d6d'); return false; }
    const rec = res.ship; let msg;
    if (what === 'board') { shipRefresh(this); this.selUid = rec.uid; msg = 'Now flying ' + rec.name + '.'; sfx('dock'); }
    else if (what === 'move') { this.selUid = rec.uid; msg = rec.name + ' is here. -' + hudFmt(res.cost) + ' CR.'; sfx('chime'); }
    else if (what === 'buy') { this.tab = 'fleet'; HANGAR_UI.tab = 'fleet'; this.selUid = rec.uid; msg = 'Bought ' + rec.name + '. Parked here: board it to fly.'; sfx('chime'); }
    else if (what === 'sell') { this.selUid = activeShip().uid; msg = 'Sold ' + rec.name + ' for ' + hudFmt(res.got) + ' CR.'; sfx('chime'); }
    this.noteHold = null; this.hangarRefresh(); this.hangarNote(msg, '#6dff9c');
    return true;
  },

  // ---- keys and clicks ----
  hangarKey(code) {
    const tab = { KeyF: 'fleet', KeyY: 'yard', KeyC: 'keys' }[code];
    if (tab) this.hangarTab(tab);
    else if (code === 'KeyA' || code === 'ArrowLeft') this.hangarStep(-1);
    else if (code === 'KeyD' || code === 'ArrowRight') this.hangarStep(1);
    else if (code === 'KeyR') this.hangarRename();
    else if (code === 'KeyS') this.hangarSell();
  },
  hangarTab(t) {
    if (this.typing) this.hangarRenameDone(false);
    if (t === this.tab || !this.tabs[t]) return;
    this.armed = null; this.noteHold = null; this.tab = t; HANGAR_UI.tab = t;
    if (t === 'yard' && !this.yardList().includes(this.selModel)) this.selModel = this.yardList()[0] || null;
    beep(520, 0.03, 'square', 0.02); this.hangarRefresh();
  },
  hangarStep(d) {
    if (this.tab === 'keys') this.hangarTab('fleet'); // A or D from the controls goes to the fleet first
    const yard = this.tab === 'yard', items = yard ? this.yardList() : G.fleet;
    if (items.length < 2) return;
    const cur = yard ? items.indexOf(this.selModel) : items.findIndex(r => r.uid === this.selUid);
    this.hangarPick((Math.max(cur, 0) + d + items.length) % items.length);
  },
  hangarPick(i) {
    if (this.typing) this.hangarRenameDone(false);
    const yard = this.tab === 'yard', it = (yard ? this.yardList() : G.fleet)[i]; if (!it) return;
    this.armed = null; this.noteHold = null;
    if (yard) this.selModel = it; else this.selUid = it.uid;
    beep(520, 0.03, 'square', 0.02); this.hangarRefresh();
  },
  hangarArm(kind, id) { this.armed = { kind, id, at: performance.now() }; sfx('tick'); this.hangarApply(); },
  hangarDisarm() { if (!this.armed) return; this.armed = null; this.hangarApply(); },

  // S: sell the ship in view (a ship parked here that you are not flying); the second S confirms
  hangarSell() {
    const v = this.view; if (v.kind !== 'fleet' || this.tab !== 'fleet') return;
    const rec = v.rec;
    if (rec === activeShip()) { sfx('empty'); return this.hangarNote('You are flying ' + rec.name + '. Board another ship to sell it.', '#ff4d6d'); }
    if (rec.at !== G.lastDock) { sfx('empty'); return this.hangarNote(rec.name + ' is parked at ' + fleetStationName(rec.at) + '. Move it here to sell it.', '#ff4d6d'); }
    if (!this.armed || this.armed.kind !== 'sell' || this.armed.id !== rec.uid) return this.hangarArm('sell', rec.uid);
    if (performance.now() - this.armed.at < HANGAR.confirmMin) return;
    this.crPrev = G.credits; this.hangarDone(fleetSell(rec.uid), 'sell');
  },

  // R: type a new name into a real text box laid over the action row (src/chat.js; the keys never reach the game or the M and Esc hooks)
  hangarRename() {
    const v = this.view; if (v.kind !== 'fleet' || this.tab !== 'fleet' || this.typing) return;
    this.armed = null; this.typing = true; this.renameUid = v.rec.uid;
    const el = this.nameEl = chatMakeInput('text', 'ship name', SHIPREC.name, () => this.hangarRenameDone(true), () => this.hangarRenameDone(false));
    el.value = v.rec.name;
    const x0 = HANGAR.x - HANGAR.w / 2 + 84, w = HANGAR.w - 84 - 200;
    chatPlaceInput(this.game, el, x0 - W / 2, HANGAR.y + HANGAR.actY - 15 - H / 2, w, 30);
    this.nameHint = this.text(this.hBox, -HANGAR.w / 2 + 18, HANGAR.actY, 'NAME', 11, '#5b7a92', { style: { letterSpacing: 2 } });
    this.nameKeys = this.text(this.hBox, HANGAR.w / 2 - 16, HANGAR.actY, 'Enter saves  -  Esc cancels', 12, '#8fb4c9', { ox: 1 });
    this.actBox.setVisible(false); this.noteText.setVisible(false);
    el.focus(); el.select();
  },
  hangarRenameDone(save) {
    const el = this.nameEl; if (!el) return;
    const uid = this.renameUid, value = el.value; this.hangarCloseInput();
    let note = null;
    if (save) { const r = fleetRename(uid, value); note = r.ok ? ['Renamed to ' + r.name + '.', '#6dff9c'] : [r.msg, '#ff4d6d']; }
    this.hangarRefresh();
    if (note) this.hangarNote(note[0], note[1]);
  },
  hangarCloseInput() {
    const el = this.nameEl; this.nameEl = null; this.typing = false;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    [this.nameHint, this.nameKeys].forEach(o => { if (o && o.active) o.destroy(); }); this.nameHint = this.nameKeys = null;
    if (this.actBox && this.actBox.active) { this.actBox.setVisible(this.tab !== 'keys'); this.noteText.setVisible(this.tab !== 'keys'); }
  },
  hangarClose() { this.hangarCloseInput(); } // the scene is going away (shutdown, launch): the text box must not outlive it
});

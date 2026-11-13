// ---------- Bar + upgrade shop: dialogue lists, prices, and the station pieces that use them ----------
// Edit the lines and prices here. Keep each NPC line to two sentences.
const NPCS = [
  {
    name: 'JUNO', role: 'bartender', color: AMBER, css: '#ffb454', x: 255, y: 652,
    lines: [
      'Welcome to the Drift. The drinks are synthetic, but the gossip is genuine.',
      'Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late.',
      'The repair bay on the main deck charges half a credit a point of hull. It is the only honest price on this station.'
    ],
    react: () => G.mission === 'failed' ? 'Heard you lost the colonist out there. It happens to every pilot once, so sit, drink, and go again.'
      : G.upgrades.armor ? 'Nice plating on that ship. Try not to scratch my doorframe.'
      : G.credits >= 800 ? 'You are carrying a lot of credits. The hangar shop would love to meet them.' : null
  },
  {
    name: 'TAMSIN', role: 'ex-freighter pilot', color: RED, css: '#ff4d6d', x: 668, y: 520,
    lines: [
      'Those drones around Kepler-4b used to be survey rigs. Somebody rewired them to shoot first and never ask.',
      'Word is the drones answer to a pirate captain out past the rim. Nobody I know has seen the captain and lived to tell it.',
      'Drones turn slowly. Keep circling and they never line up a shot.'
    ],
    react: () => G.mission === 'accepted' ? 'You took the Kepler call? Six drones ring that planet, so come in from the side and take them one at a time.'
      : G.upgrades.rapid ? 'That is a rapid-fire rig on your ship. Faster rounds mean the drones drop before they finish turning.' : null
  },
  {
    name: 'DEX', role: 'survey tech', color: GREEN, css: '#6dff9c', x: 140, y: 490,
    lines: [
      'I charted Kepler-4b last year. Red dust, thin air, and crawlers that hunt by heat.',
      'That survey pod is still pinging its beacon. Whoever takes the call has to be quick and quiet.',
      'Halcyon was a mining relay before the ore ran out. Now it is mostly mercenaries, mechanics and me.'
    ],
    react: () => G.mission === 'accepted' ? 'You took the rescue? Find the pod, keep the colonist close, and get them back to the ship. Crawlers hunt by heat, and a walking colonist is warm.'
      : G.upgrades.booster ? 'Is that a booster on your ship? You can outrun the drones now, if you keep your nerve.' : null
  }
];
const NPC_IDX = NPCS.map(() => 0);    // which generic line each NPC says next; survives launching and docking
const NPC_REACT = NPCS.map(() => ''); // the last reaction line each NPC said, so it is not repeated until the situation changes

// G.upgrades[key] is the tier owned: 0, 1 or 2. prices[t] buys tier t + 1.
const UPGRADES = [
  { key: 'armor', name: 'ARMOR PLATING', descs: ['+20 max hull', '+20 more max hull'], prices: [300, 500] },
  { key: 'rapid', name: 'RAPID FIRE', descs: ['faster guns', 'even faster guns'], prices: [400, 600] },
  { key: 'booster', name: 'BOOSTER', descs: ['longer boost, higher speed', 'longest boost, top speed'], prices: [350, 550] }
];
const TIER_NAME = ['', '', ' II'];
function fireDelay() { return [160, 100, 70][G.upgrades.rapid | 0]; }       // ms between shots
function boostMax() { return [800, 1000, 1150][G.upgrades.booster | 0]; }  // top speed while boosting
function boostEnergy() { const t = G.upgrades.booster | 0; return { max: [100, 130, 165][t], regen: [17, 24, 32][t] }; } // boost tank (4 s at tier 0) and refill per second (src/boost.js)

function ownedLine() {
  const have = UPGRADES.filter(u => G.upgrades[u.key]).map(u => u.name + TIER_NAME[G.upgrades[u.key]]);
  return 'UPGRADES  ' + (have.length ? have.join('  ') : 'none  (shop is in the hangar)');
}

// ---------- scene pieces (called from Station.create) ----------
function buildBar(s) {
  s.talk = null; s.npcSprites = [];
  const wall = (x, y, w, h, fill, stroke) => { const r = rectWall(s, x, y, w, h, fill, stroke); s.walls.push(r); return r; };

  // the lower deck becomes THE DRIFT: warm floor, doorway posts, signs
  s.add.rectangle(440, 570, 840, 260, 0x2a1608, 0.4);
  [404, 516].forEach(x => s.add.rectangle(x, 430, 8, 30, AMBER, 0.95).setDepth(1));
  label(s, 460, 400, 'THE DRIFT  BAR', '#ffb454', 16).setDepth(1);
  label(s, 460, 468, '~ THE DRIFT ~', '#ffb454', 14).setAlpha(0.8);

  // counter, bottles, stools, two tables
  wall(90, 596, 330, 26, 0x3a2208, AMBER);
  for (let i = 0; i < 6; i++) s.add.rectangle(120 + i * 52, 604, 8, 14, [AMBER, CYAN, GREEN][i % 3]).setDepth(1).setAlpha(0.9);
  for (let i = 0; i < 5; i++) s.add.circle(130 + i * 70, 570, 9, 0x2a1b0c).setStrokeStyle(2, AMBER, 0.8);
  wall(598, 498, 44, 44, 0x3a2208, AMBER);
  wall(178, 478, 44, 44, 0x3a2208, AMBER);

  // NPCs: solid, face you when you talk to them
  NPCS.forEach((n, i) => {
    const sp = s.add.image(n.x, n.y, 'walker').setTint(n.color).setDepth(4);
    s.physics.add.existing(sp, true); s.walls.push(sp);
    s.tweens.add({ targets: sp, scale: 1.08, yoyo: true, repeat: -1, duration: 1100 + i * 250 });
    label(s, n.x, n.y - 24, n.name, n.css, 12).setDepth(4);
    s.npcSprites.push(sp);
    s.spots.push({ x: n.x, y: n.y, text: n.name, key: 'npc' + i, npc: i, prompt: 'Talk to ' + n.name, color: n.css });
  });

  // dialogue box at the bottom: speaker in the title bar, typewriter text (src/ui.js)
  s.talkUI = panel(s, { w: 900, h: 130, y: H - 85, depth: 120, color: AMBER, foot: false });
  s.talkBox = s.talkUI.box.setVisible(false);
  s.talkName = s.talkUI.titleText;
  s.talkText = s.add.text(-420, -10, '', uiFont(18, '#e8f6ff', { wordWrap: { width: 840 }, lineSpacing: 4 })).setOrigin(0, 0);
  s.talkBox.add(s.talkText);
  layoutHints(s, s.talkBox, [['E', 'Next'], ['Esc', 'Close']], 48).forEach(o => { o.x += 320; });
}

function buildShop(s) {
  s.shopOpen = false;
  s.shopKeys = s.input.keyboard.addKeys('ONE,TWO,THREE,ESC');

  // terminal in the hangar
  const r = rectWall(s, 950, 148, 100, 44, 0x0d2a3f, AMBER); s.walls.push(r);
  label(s, 1000, 128, 'UPGRADE SHOP', '#ffb454');
  s.spots.push({ x: 1000, y: 170, text: 'UPGRADE SHOP', key: 'shop', prompt: 'Open the upgrade shop', color: '#ffb454', dy: 74 });

  s.shopUI = panel(s, { w: 900, h: 420, title: 'UPGRADE SHOP  -  HANGAR', color: AMBER, dim: true, depth: 160 });
  s.shopBox = s.shopUI.box.setVisible(false); s.shopObjs = [];
  s.shopMsgText = s.add.text(0, 100, '', uiFont(16, '#ffd37a')).setOrigin(0.5);
  s.shopBox.add(s.shopMsgText);
  s.shopUI.setHints([['1-3', 'Buy'], ['Esc', 'Close']]);
}

// the little shape on each tile: shield, chevrons, flame
function upgradeIcon(g, key, x, y, color) {
  g.lineStyle(3, color, 1);
  if (key === 'armor') { g.beginPath(); g.moveTo(x - 14, y - 14); g.lineTo(x + 14, y - 14); g.lineTo(x + 14, y + 2); g.lineTo(x, y + 16); g.lineTo(x - 14, y + 2); g.closePath(); g.strokePath(); }
  else if (key === 'rapid') { [-12, 0, 12].forEach(dx => { g.beginPath(); g.moveTo(x + dx - 6, y - 12); g.lineTo(x + dx + 4, y); g.lineTo(x + dx - 6, y + 12); g.strokePath(); }); }
  else { g.beginPath(); g.moveTo(x - 14, y + 14); g.lineTo(x, y - 16); g.lineTo(x + 14, y + 14); g.closePath(); g.strokePath(); g.fillStyle(color, 0.6); g.fillTriangle(x - 7, y + 14, x, y - 2, x + 7, y + 14); }
}

function refreshShop(s) {
  s.shopObjs.forEach(o => o.destroy()); s.shopObjs = [];
  s.shopUI.tagText.setText('CREDITS ' + G.credits);
  const add = o => { s.shopBox.add(o); s.shopObjs.push(o); return o; };
  const txt = (x, y, str, size, color, style) => add(s.add.text(x, y, str, uiFont(size, color, style)).setOrigin(0, 0.5));
  UPGRADES.forEach((u, i) => {
    const t = G.upgrades[u.key] | 0, maxed = t >= u.prices.length, price = maxed ? 0 : u.prices[t], can = !maxed && G.credits >= price;
    const cx = (i - 1) * 288, cy = -30, w = 270, h = 210, L = cx - w / 2 + 16;
    const edge = maxed ? GREEN : can ? AMBER : 0x3a5a78, dim = !maxed && !can;
    const g = add(s.add.graphics());
    g.fillStyle(0x0a1b2c, 1); g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.lineStyle(can ? 2 : 1, edge, can ? 1 : 0.7); g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    if (can) { g.fillStyle(AMBER, 1); g.fillRect(cx - w / 2, cy - h / 2, w, 4); }
    const cap = keyCap(s, String(i + 1), can ? AMBER : CYAN); cap.setPosition(L + cap.kw / 2, cy - h / 2 + 28); add(cap);
    upgradeIcon(g, u.key, cx + w / 2 - 38, cy - h / 2 + 34, maxed ? GREEN : can ? AMBER : 0x5b7a92);
    txt(L, cy - h / 2 + 62, u.name + TIER_NAME[maxed ? t : t + 1], 16, maxed ? '#6dff9c' : dim ? '#6b8296' : '#ffd37a', { fontStyle: 'bold' });
    txt(L, cy - h / 2 + 90, 'TIER', 11, '#5b7a92');
    add(pips(s, L + 38, cy - h / 2 + 86, t, u.prices.length, GREEN));
    txt(L, cy - h / 2 + 118, maxed ? 'Fully upgraded' : u.descs[t], 14, dim ? '#6b8296' : '#cfefff');
    if (maxed) txt(L, cy - h / 2 + 168, 'MAXED', 24, '#6dff9c', { fontStyle: 'bold' });
    else {
      txt(L, cy - h / 2 + 160, price + ' cr', 28, can ? '#ffb454' : '#ff4d6d', { fontStyle: 'bold' });
      if (!can) txt(L, cy - h / 2 + 190, 'Need ' + (price - G.credits) + ' more', 12, '#ff4d6d');
    }
    if (dim) { g.fillStyle(0x05070f, 0.4); g.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2); } // greyed out
    const z = add(s.add.rectangle(cx, cy, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => buyUpgrade(s, i));
  });
}

function openShop(s) {
  hideTalk(s); s.prompt.setText(''); s.shopOpen = true; s.panel = true; s.shopBox.setVisible(true); // s.panel: the pause menu ignores Esc while a terminal is open
  s.shopMsgText.setText('Pick an upgrade. Fitted instantly.').setColor('#ffd37a');
  refreshShop(s); beep(480, 0.08, 'triangle', 0.03, 200);
}
function closeShop(s) { s.shopOpen = false; s.panel = false; s.shopBox.setVisible(false); s.shopObjs.forEach(o => o.destroy()); s.shopObjs = []; }

function buyUpgrade(s, i) {
  const u = UPGRADES[i], t = G.upgrades[u.key] | 0, say = (m, c) => s.shopMsgText.setText(m).setColor(c);
  if (t >= u.prices.length) { say(u.name + ' is fully upgraded.', '#9fe9ff'); beep(260, 0.08, 'square', 0.02); return; }
  const price = u.prices[t];
  if (G.credits < price) { say('Need ' + (price - G.credits) + ' more credits for ' + u.name + TIER_NAME[t + 1] + '.', '#ff4d6d'); beep(140, 0.15, 'sawtooth', 0.04, -40); }
  else {
    G.credits -= price; G.upgrades[u.key] = t + 1;
    if (u.key === 'armor') { G.maxHull += 20; G.hull += 20; }
    say(u.name + TIER_NAME[t + 1] + ' installed (-' + price + ' cr).', '#6dff9c'); sfx('chime');
    shipRefresh(s); // src/ships.js: the hangar ship shows the new plating, barrels or nozzles at once
  }
  refreshShop(s);
}

function talkTo(s, i) {
  const n = NPCS[i];
  if (s.talk && s.talk.i === i && s.talk.tw && !s.talk.tw.done) { s.talk.tw.skip(); s.talk.until = s.time.now + 9000; return; } // E while typing shows the whole line
  const r = n.react ? n.react() : null;
  let line;
  if (r && r !== NPC_REACT[i]) { line = r; NPC_REACT[i] = r; }   // new situation: comment on it once
  else { line = n.lines[NPC_IDX[i] % n.lines.length]; NPC_IDX[i]++; }
  s.talkName.setText(n.name + '  -  ' + n.role).setColor(n.css);
  s.talkUI.box.setVisible(true);
  s.talk = { i, until: s.time.now + 9000, tw: typewrite(s, s.talkText, '"' + line + '"', 75) };
}
function hideTalk(s) { if (s.talk && s.talk.tw) s.talk.tw.stop(); s.talk = null; s.talkBox.setVisible(false); }

// E on a spot: true when the bar or shop handled it, false to let station.js carry on
function spotInteract(s, sp) {
  if (sp.key === 'shop') { openShop(s); return true; }
  if (sp.npc !== undefined) { talkTo(s, sp.npc); return true; }
  return false;
}

// once per frame from Station.update; true = the shop panel owns this frame
function shopFrame(s) {
  const JD = Phaser.Input.Keyboard.JustDown, k = s.shopKeys;
  if (s.shopOpen) {
    s.player.setVelocity(0, 0);
    if (JD(k.ESC)) closeShop(s);
    else if (JD(k.ONE)) buyUpgrade(s, 0);
    else if (JD(k.TWO)) buyUpgrade(s, 1);
    else if (JD(k.THREE)) buyUpgrade(s, 2);
    return true;
  }
  if (s.panel) { if (s.talk) hideTalk(s); return false; } // the mission panel owns the frame
  if (s.talk) {
    const sp = s.npcSprites[s.talk.i];
    sp.rotation = Phaser.Math.Angle.Between(sp.x, sp.y, s.player.x, s.player.y);
    if (Phaser.Math.Distance.Between(sp.x, sp.y, s.player.x, s.player.y) > 130 || s.time.now > s.talk.until || JD(k.ESC)) hideTalk(s);
  }
  return false;
}

// ---------- Bar + upgrade shop: dialogue lists, prices, and the station pieces that use them ----------
// Edit the lines and prices here. Keep each NPC line to two sentences.
const NPCS = [
  {
    name: 'JUNO', role: 'bartender', color: AMBER, css: '#ffb454', x: 255, y: 652,
    lines: [
      'Welcome to the Drift. The drinks are synthetic, but the gossip is genuine.',
      'Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late.',
      'The repair bay on the main deck charges two credits a point of hull. It is the only honest price on this station.'
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
  { key: 'booster', name: 'BOOSTER', descs: ['higher boost speed', 'even higher boost'], prices: [350, 550] }
];
const TIER_NAME = ['', '', ' II'];
function fireDelay() { return [160, 100, 70][G.upgrades.rapid | 0]; }       // ms between shots
function boostMax() { return [800, 1000, 1150][G.upgrades.booster | 0]; }  // top speed while boosting

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

  // dialogue bubble
  s.talkBox = s.add.container(W / 2, H - 150).setDepth(120).setVisible(false);
  s.talkBg = s.add.rectangle(0, 0, 880, 100, 0x07101c, 0.95).setStrokeStyle(2, AMBER, 1);
  s.talkName = s.add.text(-420, -42, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffb454' });
  s.talkText = s.add.text(-420, -18, '', {
    fontFamily: 'monospace', fontSize: '18px', color: '#e8f6ff', wordWrap: { width: 840 }, lineSpacing: 4
  });
  const more = s.add.text(420, 34, '[E] more', { fontFamily: 'monospace', fontSize: '12px', color: '#5b7a92' }).setOrigin(1, 0);
  s.talkBox.add([s.talkBg, s.talkName, s.talkText, more]);
}

function buildShop(s) {
  s.shopOpen = false;
  s.shopKeys = s.input.keyboard.addKeys('ONE,TWO,THREE,ESC');
  s.hud3 = hudText(s, 24, 70, '#6dff9c');

  // terminal in the hangar
  const r = rectWall(s, 950, 148, 100, 44, 0x0d2a3f, AMBER); s.walls.push(r);
  label(s, 1000, 128, 'UPGRADE SHOP', '#ffb454');
  s.spots.push({ x: 1000, y: 170, text: 'UPGRADE SHOP', key: 'shop', prompt: 'Open the upgrade shop', color: '#ffb454' });

  s.shopBox = s.add.container(W / 2, H / 2).setDepth(160).setVisible(false);
  const bg = s.add.rectangle(0, 0, 620, 340, 0x07101c, 0.96).setStrokeStyle(2, AMBER, 1);
  const mono = (size, color) => ({ fontFamily: 'monospace', fontSize: size + 'px', color, align: 'center' });
  s.shopHead = s.add.text(0, -130, '', mono(18, '#9fe9ff')).setOrigin(0.5);
  s.shopRows = UPGRADES.map((u, i) => s.add.text(0, -55 + i * 40, '', mono(18, '#cfefff')).setOrigin(0.5));
  s.shopMsgText = s.add.text(0, 80, '', mono(16, '#ffd37a')).setOrigin(0.5);
  const foot = s.add.text(0, 135, '[1-3] Buy      [Esc] Close', mono(16, '#5b7a92')).setOrigin(0.5);
  s.shopBox.add([bg, s.shopHead, ...s.shopRows, s.shopMsgText, foot]);
}

function refreshShop(s) {
  s.shopHead.setText('UPGRADE SHOP  -  HANGAR\nCREDITS ' + G.credits);
  UPGRADES.forEach((u, i) => {
    const t = G.upgrades[u.key] | 0, maxed = t >= u.prices.length;
    const name = u.name + TIER_NAME[maxed ? t : t + 1];
    s.shopRows[i].setText('[' + (i + 1) + '] ' + name.padEnd(18) + (maxed ? 'MAXED' : u.descs[t].padEnd(19) + u.prices[t] + ' cr'));
    s.shopRows[i].setColor(maxed ? '#6dff9c' : G.credits >= u.prices[t] ? '#e8f6ff' : '#6b8296');
  });
}

function openShop(s) {
  hideTalk(s); s.shopOpen = true; s.panel = true; s.shopBox.setVisible(true); // s.panel: the pause menu ignores Esc while a terminal is open
  s.shopMsgText.setText('Pick an upgrade. Fitted instantly.').setColor('#ffd37a');
  refreshShop(s); beep(480, 0.08, 'triangle', 0.03, 200);
}
function closeShop(s) { s.shopOpen = false; s.panel = false; s.shopBox.setVisible(false); }

function buyUpgrade(s, i) {
  const u = UPGRADES[i], t = G.upgrades[u.key] | 0, say = (m, c) => s.shopMsgText.setText(m).setColor(c);
  if (t >= u.prices.length) { say(u.name + ' is fully upgraded.', '#9fe9ff'); beep(260, 0.08, 'square', 0.02); return; }
  const price = u.prices[t];
  if (G.credits < price) { say('Need ' + (price - G.credits) + ' more credits for ' + u.name + TIER_NAME[t + 1] + '.', '#ff4d6d'); beep(140, 0.15, 'sawtooth', 0.04, -40); }
  else {
    G.credits -= price; G.upgrades[u.key] = t + 1;
    if (u.key === 'armor') { G.maxHull += 20; G.hull += 20; }
    say(u.name + TIER_NAME[t + 1] + ' installed (-' + price + ' cr).', '#6dff9c'); beep(660, 0.2, 'triangle', 0.05, 440);
  }
  refreshShop(s);
}

function talkTo(s, i) {
  const n = NPCS[i], r = n.react ? n.react() : null;
  let line;
  if (r && r !== NPC_REACT[i]) { line = r; NPC_REACT[i] = r; }   // new situation: comment on it once
  else { line = n.lines[NPC_IDX[i] % n.lines.length]; NPC_IDX[i]++; }
  s.talk = { i, until: s.time.now + 9000 };
  s.talkName.setText(n.name + '  -  ' + n.role).setColor(n.css);
  s.talkText.setText('"' + line + '"');
  s.talkBg.setStrokeStyle(2, n.color, 1);
  s.talkBox.setVisible(true);
  beep(520 + i * 70, 0.05, 'triangle', 0.02);
}
function hideTalk(s) { s.talk = null; s.talkBox.setVisible(false); }

// E on a spot: true when the bar or shop handled it, false to let station.js carry on
function spotInteract(s, sp) {
  if (sp.key === 'shop') { openShop(s); return true; }
  if (sp.npc !== undefined) { talkTo(s, sp.npc); return true; }
  return false;
}

// once per frame from Station.update; true = the shop panel owns this frame
function shopFrame(s) {
  s.hud3.setText(ownedLine());
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

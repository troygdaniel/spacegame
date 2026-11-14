// ---------- Bar + upgrade shop: dialogue lists, prices, and the station pieces that use them ----------
// Edit the lines and prices here. Keep each NPC line to two sentences (at most 240 characters).
// Each row: id, name, role, css colour, x, y, face (radians, 0 = looking east), lines (the scripted talk), react (a comment on the
// player's situation, or null), voice (the Aura voice name for src/voice.js), persona (the card the NPC chat reads, docs/NPC-CHAT.md 3.1:
// five labelled parts, Who, Manner, Knows, Wants, Will not, 600 characters at most) and optionally when (the row is in the bar only while it
// returns true) and sprite (the texture name in src/interior.js without 'in-' and the stride digit, when it is not the lower-case name).
const NPCS = [
  {
    id: 'juno', voice: 'aura-luna-en', name: 'JUNO', role: 'bartender', color: AMBER, css: '#ffb454', x: 255, y: 652, face: -Math.PI / 2,
    lines: [
      'Welcome to the Drift. The drinks are synthetic, but the gossip is genuine.',
      'Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late.',
      'The repair bay on the main deck charges half a credit a point of hull. It is the only honest price on this station.'
    ],
    react: () => G.mission === 'failed' ? 'Heard you lost the colonist out there. It happens to every pilot once, so sit, drink, and go again.'
      : G.upgrades.armor ? 'Nice plating on that ship. Try not to scratch my doorframe.'
      : G.credits >= 800 ? 'You are carrying a lot of credits. The hangar shop would love to meet them.' : null,
    persona: "Who: Juno, forty, has run the Drift for nine years; the bar is the one warm room on Halcyon.\nManner: warm, dry, short sentences, calls everyone \"pilot\" until she likes them, then by name.\nKnows: station gossip, who owes whom, the repair bay's prices, that pirates never come inside the police ring.\nWants: regulars who come back alive; a story she has not heard.\nWill not: talk about her sister on the mining crews, or badmouth the police where they can hear."
  },
  {
    id: 'tamsin', voice: 'aura-athena-en', name: 'TAMSIN', role: 'ex-freighter pilot', color: RED, css: '#ff4d6d', x: 668, y: 520, face: Math.PI,
    lines: [
      'Those drones around Kepler-4b used to be survey rigs. Somebody rewired them to shoot first and never ask.',
      'Word is the drones answer to a pirate captain out past the rim. Nobody I know has seen the captain and lived to tell it.',
      'Drones turn slowly. Keep circling and they never line up a shot.'
    ],
    react: () => G.mission === 'accepted' ? 'You took the Kepler call? Six drones ring that planet, so come in from the side and take them one at a time.'
      : G.upgrades.rapid ? 'That is a rapid-fire rig on your ship. Faster rounds mean the drones drop before they finish turning.' : null,
    persona: "Who: Tamsin, fifty, flew freighters for twenty years until pirates took her ship out by the rim.\nManner: blunt, proud, short answers; warms up slowly and never says thanks out loud.\nKnows: how drones turn slowly and circle, where the gunships hold, the MULE's runs to the Perseus gate, who got out alive.\nWants: a pilot who finishes what they start; a ship of her own again, someday.\nWill not: talk about the crew she lost, or admit she misses flying."
  },
  {
    id: 'dex', voice: 'aura-orion-en', name: 'DEX', role: 'survey tech', color: GREEN, css: '#6dff9c', x: 140, y: 490, face: 0,
    lines: [
      'I charted Kepler-4b last year. Red dust, thin air, and crawlers that hunt by heat.',
      'That survey pod is still pinging its beacon. Whoever takes the call has to be quick and quiet.',
      'Halcyon was a mining relay before the ore ran out. Now it is mostly mercenaries, mechanics and me.'
    ],
    react: () => G.mission === 'accepted' ? 'You took the rescue? Find the pod, keep the colonist close, and get them back to the ship. Crawlers hunt by heat, and a walking colonist is warm.'
      : G.upgrades.booster ? 'Is that a booster on your ship? You can outrun the drones now, if you keep your nerve.' : null,
    persona: "Who: Dex, thirty, the survey tech who charted Kepler-4b and has not slept properly since.\nManner: nervous, precise, answers in measurements, then apologises for rambling.\nKnows: Kepler-4b's red dust, thin air and heat-hunting crawlers, the survey pod's beacon, the salvage sites, Halcyon's mining past.\nWants: someone to bring the survey data home safely; one night without a crawler in his dreams.\nWill not: guess when he can measure, or go back down to the surface."
  },
  { // the repair bay mechanic, off shift, on a stool at the counter
    id: 'moss', voice: 'aura-arcas-en', name: 'MOSS', role: 'repair bay mechanic, off shift', color: CYAN, css: '#38e1ff', x: 340, y: 570, face: Math.PI / 2,
    lines: [
      'I am off shift, so you get half my attention and none of my tools. The repair bay charges half a credit a point of hull, and I stand by that price.',
      'Armor plating adds twenty hull a tier, and it is the cheapest way to survive a mistake. Pilots buy guns first and plating after their first bad day.',
      'A booster does not make you faster so much as harder to hit. Boost, dash, and let the drones guess.'
    ],
    react: () => G.hull < G.maxHull * 0.5 ? 'That hull is hanging on by habit. The repair bay is two doors up, and I will not charge extra for the lecture.'
      : G.upgrades.armor >= 2 ? 'Reinforced plating, nice. It costs the same to patch, but it is easier to like.'
      : G.credits >= 800 && !G.upgrades.booster ? 'You are carrying enough credits for a booster and a bad idea. Buy the booster.'
      : G.upgrades.rapid ? 'Rapid fire, nice. The guns are the easy part. Keep the hull to match.'
      : G.mission === 'accepted' ? 'You have a call open, so I will keep this short. Check your hull before you go, not after.' : null,
    persona: "Who: Moss, fifties, runs the repair bay and is off shift, with grease still under the nails.\nManner: tired, kind, practical; says what a part costs before what it does; dry jokes at their own expense.\nKnows: hull damage, what armor plating, rapid fire and boosters really do, the shop prices, the bay's half a credit a point.\nWants: pilots who come back with all their hull; one full night's sleep.\nWill not: lie about what a repair costs, or touch a ship that is not theirs without asking."
  },
  { // the retired bounty hunter, alone in the east corner with a view of the door
    id: 'sable', voice: 'aura-stella-en', name: 'SABLE', role: 'retired bounty hunter', color: 0xc08cff, css: '#c08cff', x: 790, y: 600, face: -2.64,
    lines: [
      'Raiders are fast and thin, so do not chase them. Let them come to you.',
      'Gunships hold out by Kepler-4b and fire in threes. Stay off their nose and they are only slow.',
      'The Reaver pays twelve hundred, and it has two escorts. Do not go until you can take a gunship alone.'
    ],
    react: () => G.mission === 'accepted' && G.missionId === 'patrol' ? 'Five marked pirates on the approach. Take them one at a time.'
      : G.mission === 'accepted' && G.missionId === 'bounty' ? 'You took the Reaver. Watch for the flash before it rams. Then get out of the way.'
      : G.patrolsDone > 0 && G.missionId !== 'bounty' ? 'You finished a patrol, so they opened the Reaver bounty. Think about it twice.'
      : (G.stats.drones | 0) >= 10 ? 'You have ' + (G.stats.drones | 0) + ' pirates on your tally already. Count them if you like. Just do not start enjoying it.' : null,
    persona: "Who: Sable, forties, a retired bounty hunter who still reads every room like a target list.\nManner: quiet, watchful, short sentences, long pauses; never raises her voice.\nKnows: pirate habits, how raiders strafe and gunships fire in threes, what the Reaver and the bounties pay, how the police ring works.\nWants: to see someone else take the Reaver and live; to finish her drink in peace.\nWill not: say how she retired, or who her last bounty was."
  },
  { // the colonist you rescued: in the bar once the first rescue has been paid (the station counts it on docking)
    id: 'ida', voice: 'aura-hera-en', name: 'IDA KETTER', sprite: 'ida', role: 'rescued colonist', color: 0xff4fd8, css: '#ff9ad8', x: 236, y: 500, face: Math.PI,
    when: () => (G.stats.missions | 0) >= 1,
    lines: [
      'You came all the way down for me. I still have not found the right way to say thank you.',
      'On the ground the crawlers feel like a second wind. You hear them before you see them, and then they are everywhere.',
      'The thin air makes everything sound far away. When I closed my eyes in the pod I could still hear the beacon.'
    ],
    react: () => G.mission === 'failed' ? 'I heard the last call did not go well. Take it from someone who was on the other end: keep going back.'
      : G.mission === 'accepted' && G.missionId === 'rescue' ? 'Another pod? Tell them to keep the beacon on and the door shut. That is what saved me.'
      : G.mission === 'accepted' ? 'You are heading out again already? Please come back. I would like to hear how it goes.' : null,
    persona: "Who: Ida Ketter, a colonist rescued from a survey pod on Kepler-4b, shaken but safe on Halcyon.\nManner: grateful, curious, a little shaky; asks the player questions back and thanks them too often.\nKnows: the surface from the ground: the red dust, the thin air, crawlers hunting by heat, the pod's beacon, the long wait.\nWants: to thank the pilot who came for her; to know who else is still out there.\nWill not: blame anyone for the crash, or go back down to the planet."
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
function boostMax() { return shipStat('boost'); }  // top speed while boosting: the model's, plus the booster tiers (src/fleet.js)
function boostEnergy() { const t = G.upgrades.booster | 0; return { max: [100, 130, 165][t], regen: [17, 24, 32][t] }; } // boost tank (4 s at tier 0) and refill per second (src/boost.js)

function ownedLine() {
  const have = UPGRADES.filter(u => G.upgrades[u.key]).map(u => u.name + TIER_NAME[G.upgrades[u.key]]);
  return 'UPGRADES  ' + (have.length ? have.join('  ') : 'none  (shop is in the hangar)');
}

// ---------- scene pieces (called from Station.create) ----------
function buildBar(s) {
  interiorTextures(s); s.talk = null; s.npcSprites = []; s.npcLabels = []; s.npcSpots = []; s.npcHere = [];
  const wall = (x, y, w, h, fill, stroke) => { const r = rectWall(s, x, y, w, h, fill, stroke); s.walls.push(r); return r; };

  // the bar's look (floor, counter, stools, signs) is drawn in src/interior.js; this keeps only the solid boxes
  // counter and two tables (solid)
  wall(90, 596, 330, 26, 0x3a2208, AMBER);
  wall(598, 498, 44, 44, 0x3a2208, AMBER);
  wall(178, 478, 44, 44, 0x3a2208, AMBER);

  // NPCs: solid, face you when you talk to them
  NPCS.forEach((n, i) => {
    const sp = s.add.image(n.x, n.y, 'in-' + (n.sprite || n.name.toLowerCase()) + '0').setRotation(n.face || 0).setDepth(4);
    s.physics.add.existing(sp, true); s.walls.push(sp);
    s.tweens.add({ targets: sp, scale: 1.08, yoyo: true, repeat: -1, duration: 1100 + i * 250 });
    s.npcLabels.push(label(s, n.x, n.y - 24, n.name, n.css, 12).setDepth(4));
    s.npcSprites.push(sp);
    s.npcSpots.push({ x: n.x, y: n.y, text: n.name, key: 'npc' + i, npc: i, prompt: 'Talk to ' + n.name, color: n.css });
  });
  barSync(s); // who is in the bar right now

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
  label(s, 1000, 186, 'UPGRADE SHOP', '#ffb454', 11);
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

function refreshShop(s, bought) {
  s.shopObjs.forEach(o => o.destroy()); s.shopObjs = [];
  crTag(s, s.shopUI, G.credits, bought); // src/ui.js: coin and gold N CR; after a purchase it pops and floats -N
  const add = o => { s.shopBox.add(o); s.shopObjs.push(o); return o; };
  const txt = (x, y, str, size, color, style) => add(s.add.text(x, y, str, uiFont(size, color, style)).setOrigin(0, 0.5));
  UPGRADES.forEach((u, i) => {
    const t = G.upgrades[u.key] | 0, maxed = t >= u.prices.length, price = maxed ? 0 : u.prices[t], can = !maxed && G.credits >= price;
    const cx = (i - 1) * 288, cy = -30, w = 270, h = 210, L = cx - w / 2 + 16;
    const edge = maxed ? GREEN : can ? AMBER : 0x3a5a78, dim = !maxed && !can;
    const g = add(s.add.graphics());
    hudPanel(g, cx - w / 2, cy - h / 2, w, h, 14, 1, edge); // src/hud.js: the HUD's glass card; amber and glowing when you can buy it, green when maxed, dim otherwise
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
  refreshShop(s, true);
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

// Who is in the bar: a row with a when() is there only while it returns true (IDA, once the first rescue is paid). Called every frame
// from shopFrame, so she shows up the moment the station counts the rescue on docking, with no change to Station.create.
function barSync(s) {
  NPCS.forEach((n, i) => {
    const here = !n.when || !!n.when();
    if (s.npcHere[i] === here) return;
    s.npcHere[i] = here;
    const sp = s.npcSprites[i], at = s.spots.indexOf(s.npcSpots[i]);
    sp.setVisible(here); sp.body.enable = here; s.npcLabels[i].setVisible(here);
    if (here && at < 0) s.spots.push(s.npcSpots[i]); else if (!here && at >= 0) s.spots.splice(at, 1);
    if (!here && s.talk && s.talk.i === i) hideTalk(s);
  });
}

// E on a spot: true when the bar or shop handled it, false to let station.js carry on
function spotInteract(s, sp) {
  if (sp.key === 'shop') { openShop(s); return true; }
  if (sp.npc !== undefined) { talkTo(s, sp.npc); return true; }
  return false;
}

// once per frame from Station.update; true = the shop panel owns this frame
function shopFrame(s) {
  const JD = Phaser.Input.Keyboard.JustDown, k = s.shopKeys;
  barSync(s);
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

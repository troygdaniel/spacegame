// ---------- Bar + upgrade shop: dialogue lists, prices, and the station pieces that use them ----------
// Edit the lines and prices here. Keep each NPC line to two sentences (at most 240 characters).
// Each row: id, name, role, css colour, x, y, face (radians, 0 = looking east), lines (the scripted talk), react (a comment on the
// player's situation, or null), voice (the Aura voice name for src/voice.js), persona (the card the NPC chat reads, docs/NPC-CHAT.md 3.1:
// five labelled parts, Who, Manner, Knows, Wants, Will not, 600 characters at most) and optionally when (the row is in the bar only while it
// returns true) and sprite (the texture name in src/interior.js without 'in-' and the stride digit, when it is not the lower-case name).
// station says where a character stands (card u-e5): a dock id, '*' for the keeper of any bar but Halcyon's, and nothing for Halcyon Station, where the six below stand.
const NPCS = [
  {
    id: 'juno', voice: 'aura-luna-en', name: 'JUNO', role: 'bartender', color: AMBER, css: '#ffb454', x: 255, y: 652, face: -Math.PI / 2,
    lines: [
      'Welcome to the Drift. Synthetic drinks, genuine gossip.',
      'Halcyon turns every three minutes. A sliding drink means you are late.',
      'The repair bay charges half a credit a point. Honest price.'
    ],
    react: () => G.mission === 'failed' ? 'Lost the colonist? Happens to every pilot once. Drink, go again.'
      : partTier('shields') ? 'Nice shielding on that ship. Try not to scratch my doorframe.'
      : G.credits >= 800 ? 'Lots of credits on you. The hangar shop would love them.' : null,
    persona: "Who: Juno, forty, has run the Drift for nine years; the bar is the one warm room on Halcyon.\nManner: warm, dry, short sentences, calls everyone \"pilot\" until she likes them, then by name.\nKnows: station gossip, who owes whom, the repair bay's prices, that pirates never come inside the police ring.\nWants: regulars who come back alive; a story she has not heard.\nWill not: talk about her sister on the mining crews, or badmouth the police where they can hear."
  },
  {
    id: 'tamsin', voice: 'aura-athena-en', name: 'TAMSIN', role: 'ex-freighter pilot', color: RED, css: '#ff4d6d', x: 668, y: 520, face: Math.PI,
    lines: [
      'The Kepler-4b drones were survey rigs. Somebody rewired them to shoot.',
      'The drones answer to a captain past the rim. No witness lived.',
      'Drones turn slowly. Keep circling and they never line up a shot.'
    ],
    react: () => G.mission === 'accepted' ? 'Six drones ring Kepler. Come in from the side, one by one.'
      : partTier('weapons') ? 'Rapid fire: the drones drop before they finish turning.' : null,
    persona: "Who: Tamsin, fifty, flew freighters for twenty years until pirates took her ship out by the rim.\nManner: blunt, proud, short answers; warms up slowly and never says thanks out loud.\nKnows: how drones turn slowly and circle, where the gunships hold, the MULE's runs to the Perseus gate, who got out alive.\nWants: a pilot who finishes what they start; a ship of her own again, someday.\nWill not: talk about the crew she lost, or admit she misses flying."
  },
  {
    id: 'dex', voice: 'aura-orion-en', name: 'DEX', role: 'survey tech', color: GREEN, css: '#6dff9c', x: 140, y: 490, face: 0,
    lines: [
      'Kepler-4b: red dust, thin air, and crawlers that hunt by heat.',
      'The survey pod still pings its beacon. Be quick and quiet.',
      'Halcyon was a mining relay. Now it is mercenaries, mechanics and me.'
    ],
    react: () => G.mission === 'accepted' ? 'Find the pod, keep the colonist close. Crawlers hunt by heat.'
      : partTier('engine') ? 'A booster. Now you can outrun the drones.' : null,
    persona: "Who: Dex, thirty, the survey tech who charted Kepler-4b and has not slept properly since.\nManner: nervous, precise, answers in measurements, then apologises for rambling.\nKnows: Kepler-4b's red dust, thin air and heat-hunting crawlers, the survey pod's beacon, the salvage sites, Halcyon's mining past.\nWants: someone to bring the survey data home safely; one night without a crawler in his dreams.\nWill not: guess when he can measure, or go back down to the surface."
  },
  { // the repair bay mechanic, off shift, on a stool at the counter
    id: 'moss', voice: 'aura-arcas-en', name: 'MOSS', role: 'repair bay mechanic, off shift', color: CYAN, css: '#38e1ff', x: 340, y: 570, face: Math.PI / 2,
    lines: [
      'Off shift. The repair bay charges half a credit a point.',
      'Shields soak the first hits and recharge. Pilots buy them late.',
      'A booster makes you harder to hit, not faster.'
    ],
    react: () => G.hull < G.maxHull * 0.5 ? 'That hull hangs on by habit. Repair bay: two doors up.'
      : partTier('shields') >= 2 ? 'Proper shields. You will need the hull patched less.'
      : G.credits >= 800 && !partTier('engine') ? 'Enough credits for a booster and a bad idea. Buy the booster.'
      : partTier('weapons') ? 'Rapid fire, nice. Keep the hull to match.'
      : G.mission === 'accepted' ? 'Check your hull before you go, not after.' : null,
    persona: "Who: Moss, fifties, runs the repair bay and is off shift, with grease still under the nails.\nManner: tired, kind, practical; says what a part costs before what it does; dry jokes at their own expense.\nKnows: hull damage, what shields, rapid fire and engines really do, the shop prices, the bay's half a credit a point.\nWants: pilots who come back with all their hull; one full night's sleep.\nWill not: lie about what a repair costs, or touch a ship that is not theirs without asking."
  },
  { // the retired bounty hunter, alone in the east corner with a view of the door
    id: 'sable', voice: 'aura-stella-en', name: 'SABLE', role: 'retired bounty hunter', color: 0xc08cff, css: '#c08cff', x: 790, y: 600, face: -2.64,
    lines: [
      'Raiders are fast and thin. Do not chase; let them come.',
      'Gunships near Kepler-4b fire in threes. Stay off their nose.',
      'The Reaver pays twelve hundred, with two escorts. Beat a gunship first.'
    ],
    react: () => G.mission === 'accepted' && G.missionId === 'patrol' ? 'Five marked pirates on the approach. Take them one at a time.'
      : G.mission === 'accepted' && G.missionId === 'bounty' ? 'The Reaver: watch for the flash before it rams, then move.'
      : G.patrolsDone > 0 && G.missionId !== 'bounty' ? 'Patrol done, so the Reaver bounty opened. Think twice.'
      : (G.stats.drones | 0) >= 10 ? (G.stats.drones | 0) + ' pirates down. Count them if you like. Do not enjoy it.' : null,
    persona: "Who: Sable, forties, a retired bounty hunter who still reads every room like a target list.\nManner: quiet, watchful, short sentences, long pauses; never raises her voice.\nKnows: pirate habits, how raiders strafe and gunships fire in threes, what the Reaver and the bounties pay, how the police ring works.\nWants: to see someone else take the Reaver and live; to finish her drink in peace.\nWill not: say how she retired, or who her last bounty was."
  },
  { // the colonist you rescued: in the bar once the first rescue has been paid (the station counts it on docking)
    id: 'ida', voice: 'aura-hera-en', name: 'IDA KETTER', sprite: 'ida', role: 'rescued colonist', color: 0xff4fd8, css: '#ff9ad8', x: 236, y: 500, face: Math.PI,
    when: () => (G.stats.missions | 0) >= 1,
    lines: [
      'You came down for me. Thank you.',
      'You hear the crawlers before you see them. Then they are everywhere.',
      'Thin air makes everything sound far away. I still hear the beacon.'
    ],
    react: () => G.mission === 'failed' ? 'The call failed? I was on the other end. Keep going back.'
      : G.mission === 'accepted' && G.missionId === 'rescue' ? 'Another pod? Tell them: beacon on, door shut. That saved me.'
      : G.mission === 'accepted' ? 'Heading out again? Please come back and tell me how it goes.' : null,
    persona: "Who: Ida Ketter, a colonist rescued from a survey pod on Kepler-4b, shaken but safe on Halcyon.\nManner: grateful, curious, a little shaky; asks the player questions back and thanks them too often.\nKnows: the surface from the ground: the red dust, the thin air, crawlers hunting by heat, the pod's beacon, the long wait.\nWants: to thank the pilot who came for her; to know who else is still out there.\nWill not: blame anyone for the crash, or go back down to the planet."
  },
  { // the keeper of every other bar (Meridian, Brass, Ember, the Roost): she says what the station's file says (its Bar lines, src/stationlook.js), a line at a time
    id: 'barkeep', station: '*', voice: 'aura-asteria-en', name: 'BARKEEP', sprite: 'barkeep', role: 'bartender', color: AMBER, css: '#ffb454', x: 330, y: 652, face: -Math.PI / 2,
    get lines() { const l = stationLook(G.lastDock).barLines; return l.length ? l : ['Quiet tonight, pilot.']; },
    react: () => null,
    persona: "Who: the keeper of this station's bar, who has poured for every kind of pilot and remembers the tabs.\nManner: dry, brief, civil to anyone who pays; says less than she knows.\nKnows: the gossip of this station and its system, the repair bay, who owes whom, which crews are in port.\nWants: a quiet shift and pilots who settle up.\nWill not: take sides in a fight, or talk about who owns the station."
  }
];
const NPC_IDX = NPCS.map(() => 0);    // which generic line each NPC says next; survives launching and docking
const NPC_REACT = NPCS.map(() => ''); // the last reaction line each NPC said, so it is not repeated until the situation changes

// The five parts (shields, weapons, engine, tank, cargo) are in src/data_parts.js and the tier fitted in a slot is partTier(slot)
// (src/fleet.js). What the rest of the game asks the shop file for:
function fireDelay() { return shipStat('fireDelay'); }   // ms between shots
function boostMax() { return shipStat('boost'); }        // top speed while boosting: the model's, plus the engine tier (src/fleet.js)
function boostEnergy() { return { max: shipStat('boostTank'), regen: shipStat('boostRegen') }; } // boost tank and refill a second (src/boost.js)

function ownedLine() {
  const have = PART_ORDER.filter(k => partTier(k)).map(k => PARTS[k].name + PART_TIER_NAME[partTier(k)]);
  return 'UPGRADES  ' + (have.length ? have.join('  ') : 'none  (shop is in the hangar)');
}

// ---------- scene pieces (called from Station.create) ----------
function buildBar(s) {
  interiorTextures(s); s.talk = null; s.npcSprites = []; s.npcLabels = []; s.npcSpots = []; s.npcHere = [];
  const wall = (x, y, w, h, fill, stroke) => { const r = rectWall(s, x, y, w, h, fill, stroke); s.walls.push(r); return r; };

  // the bar's look (floor, counter, stools, signs) is drawn in src/interior.js; this keeps only the solid boxes
  // counter and two tables (solid)
  if (s.look.terminals.bar) { // a dock without a bar has crates there instead (src/interior.js IN_HALL)
    wall(90, 596, 330, 26, 0x3a2208, AMBER);
    wall(598, 498, 44, 44, 0x3a2208, AMBER);
    wall(178, 478, 44, 44, 0x3a2208, AMBER);
  }

  // NPCs: solid, face you when you talk to them
  NPCS.forEach((n, i) => {
    const sp = s.add.image(n.x, n.y, 'in-' + (n.sprite || n.name.toLowerCase()) + '0').setRotation(n.face || 0).setDepth(4);
    s.physics.add.existing(sp, true); s.walls.push(sp);
    s.tweens.add({ targets: sp, scale: 1.08, yoyo: true, repeat: -1, duration: 1100 + i * 250 });
    s.npcLabels.push(label(s, n.x, n.y - 24, n.name, n.css, 12).setDepth(4));
    s.npcSprites.push(sp);
    s.npcSpots.push({ x: n.x, y: n.y, text: n.name, key: 'npc' + i, npc: i, get prompt() { return 'Talk to ' + n.name + chatPromptSuffix(); }, color: n.css }); // chat.js adds "(T to chat)" when a chat key is set
  });
  barSync(s); // who is in the bar right now
  chatBarInstall(s); // src/chat.js: the free-text chat box, T near a character who is here (only with the player's own key)

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
  s.shopKeys = s.input.keyboard.addKeys('ONE,TWO,THREE,FOUR,FIVE,SIX,ESC');

  // terminal in the hangar (a dock that sells no part has none)
  if (s.look.terminals.shop) {
    const r = rectWall(s, 950, 148, 100, 44, 0x0d2a3f, AMBER); s.walls.push(r);
    label(s, 1000, 186, 'UPGRADE SHOP', '#ffb454', 11);
    s.spots.push({ x: 1000, y: 170, text: 'UPGRADE SHOP', key: 'shop', prompt: 'Open the upgrade shop', color: '#ffb454', dy: 74 });
  }

  s.shopUI = panel(s, { w: 1200, h: 440, title: 'UPGRADE SHOP  -  HANGAR', color: AMBER, dim: true, depth: 160 });
  s.shopBox = s.shopUI.box.setVisible(false); s.shopObjs = [];
  s.shopMsgText = s.add.text(0, 136, '', uiFont(16, '#ffd37a')).setOrigin(0.5);
  s.shopBox.add(s.shopMsgText);
  s.shopUI.setHints([['1-6', 'Buy'], ['Esc', 'Close']]);
}

// the little shape on each tile: shield, chevrons, flame, tank, crate, crosshair
function upgradeIcon(g, key, x, y, color) {
  g.lineStyle(3, color, 1);
  if (key === 'shields') { g.beginPath(); g.moveTo(x - 14, y - 14); g.lineTo(x + 14, y - 14); g.lineTo(x + 14, y + 2); g.lineTo(x, y + 16); g.lineTo(x - 14, y + 2); g.closePath(); g.strokePath(); }
  else if (key === 'weapons') { [-12, 0, 12].forEach(dx => { g.beginPath(); g.moveTo(x + dx - 6, y - 12); g.lineTo(x + dx + 4, y); g.lineTo(x + dx - 6, y + 12); g.strokePath(); }); }
  else if (key === 'engine') { g.beginPath(); g.moveTo(x - 14, y + 14); g.lineTo(x, y - 16); g.lineTo(x + 14, y + 14); g.closePath(); g.strokePath(); g.fillStyle(color, 0.6); g.fillTriangle(x - 7, y + 14, x, y - 2, x + 7, y + 14); }
  else if (key === 'tank') { g.strokeRoundedRect(x - 10, y - 16, 20, 32, 6); g.fillStyle(color, 0.6); g.fillRoundedRect(x - 8, y + 2, 16, 12, 4); g.lineBetween(x - 10, y - 5, x + 10, y - 5); }
  else if (key === 'aim') { g.strokeCircle(x, y, 13); g.lineBetween(x - 19, y, x - 6, y); g.lineBetween(x + 6, y, x + 19, y); g.lineBetween(x, y - 19, x, y - 6); g.lineBetween(x, y + 6, x, y + 19); }
  else { g.strokeRect(x - 15, y - 12, 30, 24); g.lineBetween(x - 15, y - 12, x + 15, y + 12); g.lineBetween(x + 15, y - 12, x - 15, y + 12); g.fillStyle(color, 0.35); g.fillRect(x - 15, y - 12, 30, 5); }
}

// what one card says about one slot of the ship you fly: its next tier, what it costs here, and why you cannot buy it if you cannot
function partState(slot) {
  const rec = activeShip(), t = rec.parts[slot] | 0, fit = shipMaxTier(rec.model, slot), stock = partStockCap(slot);
  if (t >= 3) return { t, kind: 'maxed' };
  if (t >= fit) return { t, kind: 'fit', fit };                           // this hull cannot take a bigger one
  if (t >= stock) return { t, kind: 'stock' };                            // this station does not sell it
  return { t, kind: 'buy', price: partPrice(slot, t + 1, rec.model) };
}

function refreshShop(s, bought) {
  s.shopObjs.forEach(o => o.destroy()); s.shopObjs = [];
  crTag(s, s.shopUI, G.credits, bought); // src/ui.js: coin and gold N CR; after a purchase it pops and floats -N
  const add = o => { s.shopBox.add(o); s.shopObjs.push(o); return o; };
  const txt = (x, y, str, size, color, style) => add(s.add.text(x, y, str, uiFont(size, color, style)).setOrigin(0, 0.5));
  const ship = activeShip();
  PART_ORDER.forEach((slot, i) => {
    const P = PARTS[slot], st = partState(slot), t = st.t, buy = st.kind === 'buy', can = buy && G.credits >= st.price, done = st.kind === 'maxed' || st.kind === 'fit';
    const cx = (i - (PART_ORDER.length - 1) / 2) * 194, cy = -30, w = 188, h = 230, L = cx - w / 2 + 14, T = cy - h / 2;
    const edge = done ? GREEN : can ? AMBER : 0x3a5a78, dim = !done && !can;
    const g = add(s.add.graphics());
    hudPanel(g, cx - w / 2, T, w, h, 14, 1, edge); // src/hud.js: the HUD's glass card; amber and glowing when you can buy it, green when there is nothing more to buy, dim otherwise
    const cap = keyCap(s, String(i + 1), can ? AMBER : CYAN); cap.setPosition(L + cap.kw / 2, T + 26); add(cap);
    upgradeIcon(g, slot, cx + w / 2 - 34, T + 32, done ? GREEN : can ? AMBER : 0x5b7a92);
    txt(L, T + 62, P.name + PART_TIER_NAME[done ? t : t + 1], 14, done ? '#6dff9c' : dim ? '#6b8296' : '#ffd37a', { fontStyle: 'bold' });
    txt(L, T + 86, 'TIER', 11, '#5b7a92');
    add(pips(s, L + 38, T + 82, t, 3, GREEN));
    const di = done ? Math.max(0, t - 1) : t, desc = add(s.add.text(L, T + 104, typeof lhPartWords === 'function' ? lhPartWords(slot, di, P.descs[di]) : P.descs[di], uiFont(13, dim ? '#6b8296' : '#cfefff', { wordWrap: { width: w - 28 }, lineSpacing: 2 })).setOrigin(0, 0));
    if (st.kind === 'maxed') txt(L, T + 188, 'MAXED', 24, '#6dff9c', { fontStyle: 'bold' });
    else if (st.kind === 'fit') { txt(L, T + 180, 'FULL FIT', 22, '#6dff9c', { fontStyle: 'bold' }); txt(L, T + 206, 'a ' + shipModel(ship.model).name + ' takes no more', 11, '#6dff9c'); }
    else if (st.kind === 'stock') { txt(L, T + 180, 'NOT SOLD HERE', 17, '#ffd37a', { fontStyle: 'bold' }); txt(L, T + 206, 'a bigger station sells it', 12, '#ffd37a'); }
    else {
      txt(L, T + 186, st.price + ' cr', 26, can ? '#ffb454' : '#ff4d6d', { fontStyle: 'bold' });
      if (!can) txt(L, T + 212, 'Need ' + (st.price - G.credits) + ' more', 12, '#ff4d6d');
    }
    if (dim) { g.fillStyle(0x05070f, 0.4); g.fillRect(cx - w / 2 + 1, T + 1, w - 2, h - 2); } // greyed out
    const z = add(s.add.rectangle(cx, cy, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => buyUpgrade(s, i));
  });
}

function openShop(s) {
  hideTalk(s); s.prompt.setText(''); s.shopOpen = true; s.panel = true; s.shopBox.setVisible(true); // s.panel: the pause menu ignores Esc while a terminal is open
  s.shopMsgText.setText('Pick a part for your ' + shipModel(activeShip().model).name + '. Fitted instantly.').setColor('#ffd37a');
  refreshShop(s); sfx('click');
}
function closeShop(s) { s.shopOpen = false; s.panel = false; s.shopBox.setVisible(false); s.shopObjs.forEach(o => o.destroy()); s.shopObjs = []; }

function buyUpgrade(s, i) {
  const slot = PART_ORDER[i], P = PARTS[slot], rec = activeShip(), say = (m, c) => s.shopMsgText.setText(m).setColor(c), st = partState(slot), t = st.t;
  if (st.kind === 'maxed') { say(P.name + ' is fully upgraded.', '#9fe9ff'); beep(260, 0.08, 'square', 0.02); return; }
  if (st.kind === 'fit') { say('A ' + shipModel(rec.model).name + ' cannot take a bigger ' + P.name.toLowerCase() + '.', '#9fe9ff'); beep(260, 0.08, 'square', 0.02); return; }
  if (st.kind === 'stock') { say('This station does not sell ' + P.name + PART_TIER_NAME[t + 1] + '. A bigger one does.', '#ffd37a'); beep(260, 0.08, 'square', 0.02); return; }
  if (G.credits < st.price) { say('Need ' + (st.price - G.credits) + ' more credits for ' + P.name + PART_TIER_NAME[t + 1] + '.', '#ff4d6d'); beep(140, 0.15, 'sawtooth', 0.04, -40); }
  else {
    G.credits -= st.price; rec.parts[slot] = t + 1;
    say(P.name + PART_TIER_NAME[t + 1] + ' installed (-' + st.price + ' cr).', '#6dff9c'); sfx('buy');
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
  chatMet(n, line); // src/chat.js: the Journal counts the meeting and keeps the line, key or no key
  s.talkName.setText(n.name + '  -  ' + n.role).setColor(n.css);
  s.talkUI.box.setVisible(true);
  s.talk = { i, until: s.time.now + 9000, tw: typewrite(s, s.talkText, '"' + line + '"', 75) };
}
function hideTalk(s) { if (s.talk && s.talk.tw) s.talk.tw.stop(); s.talk = null; s.talkBox.setVisible(false); }

// Who is in the bar: a row with a when() is there only while it returns true (IDA, once the first rescue is paid). Called every frame
// from shopFrame, so she shows up the moment the station counts the rescue on docking, with no change to Station.create.
// the station's look decides who can be here at all (src/stationlook.js): no bar, nobody; Halcyon, its six; another dock, its keeper
function npcHere(n) {
  const look = stationLook(G.lastDock);
  return look.terminals.bar && (n.station === '*' ? !look.home : (n.station || homeDock()) === look.id) && (!n.when || !!n.when());
}
function barSync(s) {
  NPCS.forEach((n, i) => {
    const here = npcHere(n);
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
  if (chatFrame(s)) return true; // src/chat.js: a conversation is open (or T just opened one); it owns the frame
  barSync(s);
  if (s.shopOpen) {
    s.player.setVelocity(0, 0);
    if (JD(k.ESC)) closeShop(s);
    else ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((n, i) => { if (JD(k[n]) && s.shopOpen) buyUpgrade(s, i); });
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

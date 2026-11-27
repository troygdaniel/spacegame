// ---------- The keys page (H) in the new look of the screens (landing E of the new screens; card space-game-screens-e-keys-settings) ----------
// Troy approved the new look of the screens (25 Nov 2026; the mock is docs/screens-mock.html, section "Keys page (H)"): ONE page panel with THREE groups (Fly and fire, Fleet, Cruiser), a chip and two or three words a row, in place of the
// seven headings and about 360 words of today. It is still GENERATED FROM THE KEY TABLE: every chip is the cap of an entry of CAMP_KEYS (src/data_controls.js), never a letter written here, so a key that moves moves on this page. Behind the switch
// CAMP.flags.screens (src/screens.js scrOn): with it off, src/campkeys.js draws the page it always drew. The page the ready room opens (its own groups, campKeysPage(CAMPKEYS.room)) has no design in the mock: it gets the same panel with the
// table's own groups and words as they are.
//   SCRKEYS                       the three groups: each row is its word (scr.keys.r.<id>) and the ids of the table entries whose caps it shows (an id with @ is a list's key: campKeyList)
//   scrKeysCap(id)                the cap of an id of that table: CAMP_KEYS[id].k, or the key of a list (campKeyList(id).key); '' when the table has no such key now
//   scrKeysModel(ids)             PURE: { title, close: chip, groups: [{ id, title, rows: [{ chips: [{ id, k }], t }] }] }: the Campaign's three groups (ids: not given), or the ready room's: the table's own groups with the screens off, the four groups of SCRROOM (the room, the missions, the briefing, the refit) with them on
//   scrKeysChipOk(chip)           is a chip of the model the table's: every id of its role resolves and the caps, put together, are chip.k (tests/scrkeys.mjs holds every chip of the page to this)
//   scrKeysOpen(s, ids), scrKeysClose(s)   the page on a Phaser scene: a veil that takes the clicks (the game under it is not clicked) and the panel of the host (src/scrhost.js); campKeysOpen and campKeysClose call them when the switch is on
const SCRKEYS = {
  groups: [
    { id: 'fly', rows: [['fly', ['fly']], ['fire', ['fire']], ['boost', ['boost']], ['missile', ['missile']], ['reload', ['reload']], ['zoom', ['zoomout', 'zoomin']]] }, // Shift (the boost) is here, with the rest of what flies the ship and in the bottom key row's own order (card space-game-chunk1-c-on-key-row; it was the Cruiser group's last row)
    { id: 'fleet', rows: [['who', ['who']], ['friend', ['friendlies']], ['enemy', ['hostiles']], ['near', ['near']], ['order', ['order']], ['look', ['focus']]] },
    { id: 'cruiser', rows: [['list', ['@cruiser']], ['map', ['map']], ['esc', ['pause']], ['tune', ['tune']]] }
  ],
  veil: 0.55, depth: 300                       // how dark the canvas goes behind the panel, and over what (the old page's depth: over the cards, the map and the lists)
};
// THE PAGE THE READY ROOM OPENS with the new screens on (card space-game-ready-room-keys-page-words; Troy, 26 Nov 2026: the arrows only choose, Enter opens or goes on): its own four groups, one for each screen of the room that H is pressed on (the room itself, the mission pick, the
// briefing, the refit), a chip a key and a few words a row. Every chip is a role of the menu key table (src/data_controls.js, read through scrKey) or an entry of CAMP_KEYS, never a letter written here: a key that moves moves on this page. With the screens off the page keeps the table's own
// groups (camp.keys.roomtitle, the 'readyroom' group of CONTROLS).  Each row is [its word id (scr.keys.<group letter>.<id>, or the id of an existing row), the ids of the keys it shows].
const SCRROOM = [
  { id: 'ready', rows: [['rr.choose', ['left', 'right']], ['rr.card', ['up', 'down']], ['rr.jump', ['d1', 'd2', 'd3']], ['rr.enter', ['pick']], ['rr.launch', ['launch']], ['rr.title', ['close', 'title']], ['r.tune', ['tune']]] },
  { id: 'pick', rows: [['rp.choose', ['up', 'down', 'left', 'right']], ['rp.enter', ['pick']], ['rp.replay', ['open']], ['rp.clear', ['clear']], ['rp.back', ['close']]] },
  { id: 'brief', rows: [['rb.step', ['left', 'right']], ['rb.launch', ['pick', 'launch']], ['rb.zoom', ['zoomout', 'zoomin', 'zoomreset']], ['rb.map', ['briefmap']], ['rb.back', ['close']]] },
  { id: 'refit', rows: [['rf.choose', ['up', 'down', 'left', 'right']], ['rf.buy', ['pick', 'buy']], ['rf.undo', ['giveback']], ['rf.back', ['close']]] }
];

function scrKeysCap(id) {
  if (typeof id !== 'string' || !id) return '';
  if (id.charAt(0) === '@') { const L = typeof campKeyList === 'function' ? campKeyList(id.slice(1)) : null; return L && L.key ? String(L.key) : ''; }
  const e = typeof CAMP_KEYS === 'object' && CAMP_KEYS ? CAMP_KEYS[id] : null; if (e && e.k) return String(e.k);
  const r = typeof scrKey === 'function' ? scrKey(id) : null; return r && r.k ? String(r.k) : ''; // a role of the menu key table (src/data_controls.js, read through scrKey in src/screens.js): the ready room's page uses them
}
function scrKeysChip(ids) { // the chip of a row: the caps of its entries put together ('- =' for the two zoom keys); null when the table has none of them
  const caps = ids.map(scrKeysCap).filter(Boolean); return caps.length ? { id: ids.join('+'), k: caps.join(' ') } : null;
}
function scrKeysChipOk(chip) {
  if (!chip || typeof chip.id !== 'string' || typeof chip.k !== 'string') return false;
  const ids = chip.id.split('+'); return ids.length > 0 && ids.every(i => !!scrKeysCap(i)) && ids.map(scrKeysCap).join(' ') === chip.k;
}
function scrKeysModel(ids) {
  const room = Array.isArray(ids), groups = [];
  if (!room) {
    SCRKEYS.groups.forEach(g => {
      const rows = g.rows.map(([w, caps]) => { const c = scrKeysChip(caps); return c ? { chips: [c], t: uiText('scr.keys.r.' + w) } : null; }).filter(Boolean); // a key the table has not (the cruiser list when its panel is off) has no row
      if (g.id === 'fly' && typeof campCockpitOn === 'function' && campCockpitOn()) { const cc = scrKeysChip(['cockpit']); if (cc) rows.push({ chips: [cc], t: uiText('scr.keys.r.cockpit') }); } // C takes a pilot's stick (card space-game-fly-fighter-l1-scene): its line is on the page only while the switch is on
      if (rows.length) groups.push({ id: g.id, title: uiText('scr.keys.g.' + g.id), rows });
    });
    if (typeof CAMP_DEBUG !== 'undefined' && CAMP_DEBUG.keys && CAMP_DEBUG.keys.length && typeof campDebugOn === 'function' && campDebugOn()) { // the tune kit (?debug=1): its keys are listed from its own table, as on the old page
      groups.push({ id: 'debug', title: uiText('camp.keys.debug'), rows: CAMP_DEBUG.keys.map(r => ({ chips: [{ id: 'debug:' + r.key, k: r.key }], t: r.text.charAt(0).toUpperCase() + r.text.slice(1) })) });
    }
  } else if (typeof scrOn === 'function' && scrOn()) { // the ready room's page with the new screens: the four groups of SCRROOM (a key the table has not has no row)
    SCRROOM.forEach(g => {
      const rows = g.rows.map(([w, keys]) => { const chips = keys.map(k => scrKeysChip([k])).filter(Boolean); return chips.length ? { chips, t: uiText('scr.keys.' + w) } : null; }).filter(Boolean);
      if (rows.length) groups.push({ id: g.id, title: uiText('scr.keys.g.' + g.id), rows });
    });
  } else {
    (typeof campKeysPage === 'function' ? campKeysPage(ids) : []).forEach((g, i) => groups.push({ id: 'room' + i, title: g.title, rows: g.rows.map(r => ({ chips: r.caps.map(k => ({ id: 'table:' + k, k })), t: r.t })) }));
  }
  const help = scrChip('help');
  return { title: uiText(room ? 'camp.keys.roomtitle' : 'scr.keys.title'), close: help, closeWord: uiText('scr.keys.close'), groups };
}

// ---- the page on a scene (the DOM half: src/scrhost.js's elements, the style in src/scrset.css) ----
function scrKeysOpen(s, ids) {
  if (!s || !s.add || typeof scrHostMount !== 'function') return false;
  const R = scrHostMount(s); if (!R) return false; // no canvas or no document: the page of today is drawn
  const M = scrKeysModel(ids), el = scrHostEl(R, 'div', 'sc-p sc-abs sc-keys');
  const head = scrHostEl(R, 'div', 'sc-r sc-sp sc-keyhead', el); scrHostSet(scrHostEl(R, 'span', 'sc-t2', head), 'text', M.title);
  const hr = scrHostEl(R, 'div', 'sc-r', head); if (M.close) scrHostChip(R, hr, M.close); scrHostSet(scrHostEl(R, 'span', 'sc-lab', hr), 'text', M.closeWord);
  const cols = scrHostEl(R, 'div', 'sc-cols' + (ids ? ' two' : ''), el);
  M.groups.forEach(g => {
    const col = scrHostEl(R, 'div', 'sc-c sc-g', cols); scrHostSet(scrHostEl(R, 'span', 'sc-lab sc-gold', col), 'text', g.title);
    g.rows.forEach(r => { const row = scrHostEl(R, 'div', 'sc-r', col); r.chips.forEach(c => scrHostChip(R, row, c)); scrHostSet(scrHostEl(R, 'span', 'sc-sm', row), 'text', r.t); });
  });
  const veil = s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, SCRKEYS.veil).setScrollFactor(0).setDepth(SCRKEYS.depth).setInteractive(); // takes the clicks: the game under the page is not clicked
  s.ck = { objs: [veil], open: true, scr: el };
  return true;
}
function scrKeysClose(s) {
  const el = s && s.ck && s.ck.scr; if (!el) return false;
  if (el.parentNode) el.parentNode.removeChild(el);
  const R = s.scrHost; if (R && R.root && !R.root.firstChild) scrHostDrop(s); // the host goes with its last panel
  return true;
}

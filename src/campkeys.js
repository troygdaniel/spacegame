// ---------- Campaign: the H page of every key (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// Troy plays the Campaign with the keyboard and could not see all of its keys listed: the bottom key line fits a few. Long Haul has an H page built from the one table of src/data_controls.js;
// the Campaign has one now, built from the same table: the CAMPAIGN group, under the headings of each row's sub, and the debug keys of src/campdebug.js after them. H opens it, H or Esc closes it;
// it is on the pause card (H lists every key), on the Campaign's panel of the title screen, and the bottom key line ends "H Keys". A key bound in the Campaign and missing from the table fails
// tests/controlshelp.mjs, so the page cannot fall behind again. While it is open the battle waits (the scene is paused as it is for the pause card).
//   campKeysPage()                    pure: [{ title, rows: [{ caps: ['W', 'A'], t }] }]: the PANELS group, then the CAMPAIGN group, of the table, then the debug keys
//   campKeysLayout(groups)            pure: two columns of whole groups, the split that makes the longer column shortest: { cols: [[group, ...], [group, ...]], lines: [n, n] }
//   campKeysOpen(s) / campKeysClose(s) / campKeysToggle(s)    the drawing, on any scene with the usual add (the Campaign, the title); s.ck is the open page
//   campKeysKey(s, code)              a key while the page is open: H and Esc close it; true when the page took the key (it takes every one: the game waits behind it)
// The numbers are CAMPKEYS; the words are camp.keys.* in content/text/campkeys.md.
const CAMPKEYS = {
  panel: { x: 70, y: 35, w: 1140, h: 650 },      // the glass panel: the sector map's own size and place
  colX: [104, 660], colW: 500,                   // left edge and width of the two columns
  top: 104, pitch: 17, head: 26, gap: 12,        // first line's y, a line's pitch (19, then 18, until the SYSTEMS panel's five rows made a column 643 px deep), the room a heading takes, the room between two groups
  capsW: 126, size: 14, bottom: 630,             // the space the key caps take at the left of a line, the size of the words, the lowest y a column may reach (the footer is at 650)
  depth: 300,                                    // over the cards (200), the map (150 to 156) and the panels (160)
  groups: ['panels', 'campaign'],                // the groups of the table (src/data_controls.js) the Campaign's page lists, in this order: the two panels first
  room: ['readyroom']                            // the page H opens in the ready room (src/camphubscene.js): its own keys
};

function campKeysPage(ids) { // ids: the groups of the table to list (the ready room passes CAMPKEYS.room); else the Campaign's
  const out = [], room = Array.isArray(ids);
  (room ? ids : CAMPKEYS.groups).forEach(id => {
    const g = typeof controlsGroup === 'function' ? controlsGroup(id) : null;
    (g ? g.rows : []).forEach(r => {
      let grp = out[out.length - 1]; if (!grp || grp.title !== (r.sub || '')) { grp = { title: r.sub || '', rows: [] }; out.push(grp); }
      grp.rows.push({ caps: r.k.slice(), t: r.t });
    });
  });
  if (!room && typeof CAMP_DEBUG !== 'undefined' && CAMP_DEBUG.keys && CAMP_DEBUG.keys.length) { // the tune kit's keys have their own table (src/campdebug.js): they are listed from it, so a new one is on the page
    out.push({ title: uiText('camp.keys.debug'), rows: CAMP_DEBUG.keys.map(r => ({ caps: [r.key], t: r.text.charAt(0).toUpperCase() + r.text.slice(1) })) });
  }
  return out;
}

// the groups kept whole, in their order within each column, in two columns: the assignment that gives the shortest longer column (a heading counts one line); of those, the one that keeps the groups
// in one run (the fewest changes of column down the list), so the page reads left column first and then the right
function campKeysLayout(groups) {
  const size = g => g.rows.length + 1, n = groups.length;
  let best = null;
  for (let mask = 0; mask < (1 << n); mask++) {
    const col = [0, 0]; let swaps = 0;
    groups.forEach((g, i) => { const c = (mask >> i) & 1; col[c] += size(g); if (i && c !== ((mask >> (i - 1)) & 1)) swaps++; });
    const m = Math.max(col[0], col[1]);
    if (!best || m < best.m || (m === best.m && swaps < best.swaps)) best = { m, swaps, mask };
  }
  const cols = [[], []]; groups.forEach((g, i) => cols[(best.mask >> i) & 1].push(g));
  return { cols, lines: cols.map(c => c.reduce((k, g) => k + size(g), 0)) };
}
// the lowest y a column reaches, from the numbers above: tests/campanelsdraw.mjs checks every column of the page against CAMPKEYS.bottom
function campKeysHeight(col) { const K = CAMPKEYS; return K.top + col.reduce((y, g) => y + K.head + g.rows.length * K.pitch + K.gap, 0) - K.gap; }

function campKeysOpen(s, ids) { // ids: the groups to list (the ready room's); the Campaign and the title list its own
  if (!s || campKeysIsOpen(s) || !s.add) return false;
  const K = CAMPKEYS, P = K.panel, objs = [], put = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); objs.push(o); return o; };
  put(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.88).setInteractive(), 0);       // a veil that takes the clicks: the game under it is not clicked
  const g = put(s.add.graphics(), 1); hudPanel(g, P.x, P.y, P.w, P.h, 20, 0.97, CYAN);
  const room = Array.isArray(ids); // the ready room's page has its own heading and footer (nothing is waiting behind it)
  put(s.add.text(K.colX[0], 46, uiText(room ? 'camp.keys.roomtitle' : 'camp.keys.title'), uiFont(24, '#38e1ff', { letterSpacing: 2 })), 2);
  put(s.add.text(K.colX[0], 640, uiText(room ? 'camp.keys.roomfooter' : 'camp.keys.footer'), uiFont(14, '#5b7a92')), 2);
  if (typeof campPaceNow === 'function') put(s.add.text(K.colX[1] + K.colW, 640, uiText('camp.keys.pace', { pace: campPaceNow().name }), uiFont(14, '#ffd37a')).setOrigin(1, 0), 2); // the battle pace, and its key (src/campace.js)
  const L = campKeysLayout(campKeysPage(ids));
  L.cols.forEach((col, c) => {
    let y = K.top;
    col.forEach(grp => {
      put(s.add.text(K.colX[c], y, grp.title, uiFont(13, '#ffb454', { letterSpacing: 2 })), 2); y += K.head;
      grp.rows.forEach(r => {
        let x = K.colX[c];
        r.caps.forEach(k => { const cap = keyCap(s, k, AMBER); cap.setPosition(x + cap.kw / 2, y + 10); put(cap, 3); x += cap.kw + 4; });
        put(s.add.text(K.colX[c] + K.capsW, y, r.t, uiFont(K.size, '#cfefff')), 2);
        y += K.pitch;
      });
      y += K.gap;
    });
  });
  s.ck = { objs, open: true };
  return true;
}
// open means the page this file drew: a stand-in scene in a test answers any property, so the flag is compared to true
const campKeysIsOpen = s => !!s && !!s.ck && s.ck.open === true;
function campKeysClose(s) {
  if (!campKeysIsOpen(s)) return false;
  s.ck.objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone with the scene */ } });
  s.ck = null; return true;
}
function campKeysToggle(s) { return campKeysIsOpen(s) ? campKeysClose(s) : campKeysOpen(s); }
// a key while the page is open: H or Esc closes it; every other key is the page's too (nothing under it moves)
function campKeysKey(s, code) {
  if (!campKeysIsOpen(s)) return false;
  if (code === 'KeyH' || code === 'Escape') campKeysClose(s);
  return true;
}

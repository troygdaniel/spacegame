// ---------- Campaign: the corner panels, the rule and the registry (card space-game-layout-fleet; Troy, 24 Nov 2026, agreed bite by bite from his screenshot) ----------
// FOUR CORNERS, each a small title that never leaves, starting with its keys as plain key-cap chips (no arrows, like the E chip), STACKED at the top (card space-game-keys5-corners; Troy, 24 Nov 2026: "move the bottom panels to the top, one row under another"):
// the left stack is Q CRUISER then W FLEET (under the SHIELD and HULL bars), the right stack ] HOSTILES then [ FRIENDLIES (under the ORE and MISSILES block); nothing is in the bottom corners. Left is what Troy commands, right is everything else.
// The details open DOWNWARD: while the row above has details open the row under it slides down by their height (campCornerSlide) and back as they fade, and only one corner of a side has its details open at a time (the one opened last). The details under a title open when its keys are used and fade after a few seconds (CAMP.corner.show, then CAMP.corner.fade); the title stays. The current selection
// is written beside the title and never fades. The panel is drawn by src/campcornerscene.js (campCornerSync); every number is CAMP.corner in src/campaign.js. This file is pure (no Phaser).
//
//   A CORNER is registered once, at the foot of the file that knows what it shows:
//     campCornerAdd({ id: 'fleet',                   its name (CAMP.corner.at has the four places by 'at')
//                     at: 'bl',                      'tl' | 'bl' | 'tr' | 'br': which corner
//                     keys: ['who'],                   the chips, in order: an id of CAMP_KEYS (its cap is CAMP_KEYS[id].k, and those keys open the details), or { cap: 'S', codes: ['KeyS'] } for a key that is not in the table
//                     title: 'camp.corner.fleet',    the words of the title (src/contenttables.js, content/text/campcorner.md has the four); or C => key when the title changes with the game (NO HOSTILES: card space-game-layout-targets)
//                     selection: C => 'Kara',        the text written beside the title, never fades ('' for none)
//                     rows: C => [item, ...],        the details, asked for only while they are open (see the items below)
//                     hit: (C, mem) => bool,         optional: true when the details should come back by themselves for CAMP.corner.hit ms (FLEET: a pilot was hit). mem is the corner's own {} (per mission), to remember what it saw last
//                     list: 'fleet',                 optional: the id of an order list (CAMP_PANELS) that this corner draws as its details (the fleet pick, W and a digit): src/campanelsdraw.js does not draw that list itself
//                     block: C => bool,              optional: true when the details must stay shut now (FLEET while the cruiser list is open: one at a time on a side)
//                     line: C => [segment, ...] })   optional (card space-game-fleet-sentence): the title row as a LINE that never fades, instead of the chip, the title and the selection: { key: 'who' } a key-cap chip from the table (ok: false greys it), { text, ink, bold, size, fit } words (fit: cut short with an ellipsis to fit the room; the words after it keep theirs). FLEET reads Q Kara  W Attack Raider 9
//   THE ITEMS rows(C) returns, from the top of the details down:
//     { kind: 'bar', name, num, share, color, sel }  a name at the left, its number at the right and a bar under it (share 0..1, color a number like 0x6dff9c, sel true: the name is lit)
//     { kind: 'text', text, ink }                    a line of text (ink '#9fbdd1' by default)
//     { kind: 'key', cap, label, ok }                a key chip and its word, bright when ok and grey when not (the order key line: E Attack)
//   THE CALLS
//     campCornerOpen(C, id, ms)   THE REOPEN HOOK: open the details of a corner now for ms (CAMP.corner.show when omitted), then they fade. Anything can call it
//     campCornerKey(C, code)      a key was pressed: opens every corner that has this key (the scene's onKey calls it for each key in play, so a corner needs nothing more than its keys)
//     campCornerNow(C, id)        what the scene draws now: { id, at, chips: ['Q', 'W'], title, selection, items (empty when closed), open (0..1) }
//     campCornerGeom(pos, itemsH, dx, dy)   the two rectangles { title, det } of a corner (det is null with no items); dx moves both sideways (out of an open list's way), dy down (the row under open details: campCornerSlide)
//     campCornerSlide(id, Ns, ext)   how far down the second row of a stack sits now: the height of the first row's details (Ns: { id: campCornerNow } of the frame) times how open they are; ext { h, k }: a list the first row has that this file does not know (the cruiser list), its height and strength
//     campCornerItemsH(items)     the height of the items
//     campCornerLineLayout(segs, T0, measure)   where a line's chips and words stand: { chips: [{ x, cap, ok }], words: [{ x, text, ink, bold, size }] } (measure(text, segment) gives a width in px)
//     campCornerFit(text, room, width)   the text cut short with an ellipsis until width(text) is at most room px (the selection beside a title: card space-game-layout-align)
const CAMP_CORNERS = []; // the registered corners, in the order they were added
const CAMP_CORNER_SHIFT = {}; // pos -> px: a corner's row (and what hangs under it) is moved down this far: the page HUD (src/camppagehud.js, card space-game-page-hud) puts a panel where the rows were, and the lists and details open under it
const CAMP_CORNER_STATE = new WeakMap(); // C -> { open: { id: { at, ms } }, mem: { id: {} } }: a new C (the next mission) starts with every corner closed
function campCornerAdd(def) { const i = CAMP_CORNERS.findIndex(d => d.id === def.id); if (i >= 0) CAMP_CORNERS[i] = def; else CAMP_CORNERS.push(def); return def; }
// a corner that is one HALF of a row (part 'a': the first CAMP.corner.split px; part 'b': the rest, less CAMP.corner.splitGap): [x offset, width] in the row; null for a corner that has the whole row. Its details are as wide as the whole row
const campCornerSpan = d => { const K = CAMP.corner; return d && d.part === 'a' ? [0, K.split] : d && d.part === 'b' ? [K.split + K.splitGap, K.w - K.split - K.splitGap] : null; };
const campCornerDef = id => CAMP_CORNERS.find(d => d.id === id) || null;
const campCornerDrawsList = id => !!id && CAMP_CORNERS.some(d => d.list === id); // an order list that a corner draws as its details (src/campanelsdraw.js leaves it out)
const campCornerClock = C => +(C && C.t) || 0; // (a stand-in in a test may have no clock: 0)
function campCornerState(C) { let st = CAMP_CORNER_STATE.get(C); if (!st) { st = { open: {}, mem: {} }; CAMP_CORNER_STATE.set(C, st); } return st; }
function campCornerOpen(C, id, ms) { if (!C || typeof C !== 'object') return; campCornerState(C).open[id] = { at: campCornerClock(C), ms: ms > 0 ? ms : CAMP.corner.show }; }
function campCornerShut(C, id) { if (C && typeof C === 'object') delete campCornerState(C).open[id]; } // the details close at once (card space-game-page-hud-2: W then a digit; the title row and the selection stay)
const campCornerKeyList = d => (d.keys || []).map(k => typeof k === 'string' ? { cap: (CAMP_KEYS[k] && CAMP_KEYS[k].k) || '', codes: campKeyCodes(k) } : { cap: String(k.cap || ''), codes: k.codes || [] });
function campCornerKey(C, code) { CAMP_CORNERS.forEach(d => { if (campCornerKeyList(d).some(k => k.codes.indexOf(code) >= 0)) campCornerOpen(C, d.id); }); } // a key of a corner was used: its details open
function campCornerStrength(C, id) { // 0..1: full for the time it was opened for, then a fade, then none
  const o = campCornerState(C).open[id]; if (!o) return 0; const K = CAMP.corner, age = campCornerClock(C) - o.at;
  if (age < 0) return 0; return age < o.ms ? 1 : age < o.ms + K.fade ? 1 - (age - o.ms) / K.fade : 0;
}
// the strength the details have NOW: its own, unless the corner is shut (d.block) or another corner of the same side was opened later (one at a time on a side: the last one to open keeps the room)
const campCornerBoxHidden = d => !!d && typeof campPageHudHides === 'function' && campPageHudHides('box:' + d.id); // the page HUD has a corner's details box (the friendlies' picture: card space-game-page-hud-3, its rings replace it): the canvas draws none
function campCornerShown(C, d) {
  const s0 = campCornerStrength(C, d.id); if (!(s0 > 0) || (d.block && d.block(C)) || campCornerBoxHidden(d)) return 0;
  const st = campCornerState(C), me = st.open[d.id], side = d.at.charAt(1);
  for (let i = 0; i < CAMP_CORNERS.length; i++) {
    const o = CAMP_CORNERS[i]; if (o.id === d.id || o.at.charAt(1) !== side || !(campCornerStrength(C, o.id) > 0) || (o.block && o.block(C)) || campCornerBoxHidden(o)) continue;
    const w = st.open[o.id]; if (w.at > me.at || (w.at === me.at && i < CAMP_CORNERS.indexOf(d))) return 0;
  }
  return s0;
}
// how far down a row sits: the second row of the left stack (bl under tl) slides down by the first row's details (their frame and the gap) while they are open, and back as they fade; Ns: the frame's campCornerNow of every corner; ext: { h, k } for what hangs under the first row that this file does not know (the cruiser list)
function campCornerSlide(id, Ns, ext) {
  const d = campCornerDef(id), first = d ? ({ bl: 'tl' })[d.at] : '', fs = first ? CAMP_CORNERS.filter(x => x.at === first) : []; if (!fs.length) return 0;
  const K = CAMP.corner; let dy = 0;
  fs.forEach(f => { const N = Ns && Ns[f.id]; if (N && N.items && N.items.length) dy = Math.max(dy, (campCornerItemsH(N.items) + K.pad * 2 + K.gap) * N.open); }); // (the row above may be two halves: the one with details open slides this row)
  if (ext && ext.h > 0 && ext.k > 0) dy = Math.max(dy, ext.h * ext.k);
  return dy;
}
const campCornerKind = it => it.kind || (it.share !== undefined ? 'bar' : 'text');
const campCornerItemsH = items => (items || []).reduce((h, it) => h + (CAMP.corner.item[campCornerKind(it)] || CAMP.corner.item.text), 0);
function campCornerGeom(pos, itemsH, dx, dy, span) { // the title row and the details' frame: the row sits at the corner, the details open away from the screen's edge (all four open downward since card space-game-keys5-corners); dy: the row is slid down (the row above has its details open)
  const K = CAMP.corner, a = K.at[pos], x = a.x + (dx || 0), th = K.title.h, ty = (a.dir < 0 ? a.y - th : a.y) + (dy || 0) + (CAMP_CORNER_SHIFT[pos] || 0), dh = itemsH > 0 ? itemsH + K.pad * 2 : 0;
  return { title: { x: x + (span ? span[0] : 0), y: ty, w: span ? span[1] : K.w, h: th }, det: dh ? { x, y: a.dir < 0 ? ty - K.gap - dh : ty + th + K.gap, w: K.w, h: dh } : null };
}
function campCornerFit(text, room, width) { // text cut short with an ellipsis until width(text) fits room (width: a function giving a text's width in px); a text that fits is returned as it is
  const t = String(text || ''); if (width(t) <= room) return t;
  for (let n = t.length - 1; n > 0; n--) { const c = t.slice(0, n).replace(/\s+$/, '') + '\u2026'; if (width(c) <= room) return c; }
  return '\u2026';
}
const campCornerCap = k => { if (k && typeof k === 'object') return String(k.cap || ''); const v = typeof CAMP_KEYS === 'object' && CAMP_KEYS[k] ? CAMP_KEYS[k].k : ''; return Array.isArray(v) ? String(v[0] || '') : String(v || ''); }; // a segment's key: an id of the table, or { cap }
function campCornerLineLayout(segs, T0, measure) {
  if (segs && segs.alt) { // a line with a SHORTER form (segs.alt): used when the long one does not fit the room (the pilots' names, then only their digits)
    const T = CAMP.corner.title, room = T0.w - T.pad * 2, w = a => a.reduce((s, g) => s + (g.key ? T.chipW : measure(String(g.text || ''), g)) + T.gap, 0) - T.gap;
    if (w(segs) > room) segs = segs.alt;
  } // left to right from the frame's inner edge: a chip, a gap, a word, a gap; the word marked fit is cut short to the room left (to the inner right edge, less the segments after it)
  const T = CAMP.corner.title, right = T0.x + T0.w - T.pad, chips = [], words = []; let x = T0.x + T.pad;
  (segs || []).forEach((sg, i) => {
    if (sg.key) { chips.push({ x, cap: campCornerCap(sg.key), ok: sg.ok !== false }); x += T.chipW + T.gap; return; }
    const rest = (segs || []).slice(i + 1).reduce((w, s2) => w + (s2.key ? T.chipW : measure(String(s2.text || ''), s2)) + T.gap, 0), text = sg.fit ? campCornerFit(sg.text, right - x - rest, t => measure(t, sg)) : String(sg.text || '');
    words.push({ x, text, ink: sg.ink || '#ffffff', bold: !!sg.bold, size: sg.size || 14 }); x += measure(text, sg) + T.gap;
  });
  return { chips, words };
}
function campCornerNow(C, id) {
  const d = campCornerDef(id); if (!d || !C) return null;
  const st = campCornerState(C); if (d.hit && d.hit(C, st.mem[id] || (st.mem[id] = {}))) campCornerOpen(C, id, CAMP.corner.hit); // it was hit: the details come back for a while
  const open = campCornerShown(C, d);
  return { id, at: d.at, rowHidden: typeof campPageHudHides === 'function' && campPageHudHides(d.id), span: campCornerSpan(d), chips: campCornerKeyList(d).map(k => k.cap), title: uiText(typeof d.title === 'function' ? d.title(C) : d.title), selection: d.selection ? String(d.selection(C) || '') : '', line: d.line ? d.line(C) || null : null, items: open > 0 && d.rows ? d.rows(C) || [] : [], open };
}
// ---- FLEET, the second half of the row at 78 (cards space-game-layout-fleet, space-game-fleet-sentence, space-game-keys5-corners and space-game-keys6-layout): the W chip and the pilots, one line that never fades; the details are the fleet pick ----
// the fleet's half of the row (card space-game-keys6-layout; Troy, 24 Nov 2026: "Q CRUISER and W with the pilots on ONE row (W 1 Wedge 2 Kara 3 Apollo 4 All; if too tight at 320 px show W 1 2 3 4 and the names when W is pressed)"): the W chip, then each stop of the fleet pick with its digit, the picked one lit (All pilots: every digit lit), a pilot who is lost grey;
// the long form has the names, and its .alt the digits alone (campCornerLineLayout takes it when the names do not fit the room). The order sentence that was here (who, the order chip, the order and the target) is gone: no chip but R and the corners' own keys (card space-game-keys6-layout)
function campFleetLine(C) {
  const rows = typeof campPanelList === 'function' && typeof campPanelDef === 'function' && campPanelDef('fleet') ? campPanelList(C, 'fleet').filter(r => r.who) : [], stops = typeof campSelList === 'function' ? campSelList(C) : [], now = typeof campSelNow === 'function' ? campSelNow(C) : null;
  const part = (r, i) => { const e = stops.find(x => x.id === r.who), all = r.who === 'all', lost = !all && !e, on = !!now && (now.id === r.who || now.kind === 'all'); return { n: String(i + 1), name: all ? uiText('camp.corner.allshort') : e ? e.name : campSelPilotName(null, String(r.who).replace(CAMP_SELPILOT, '')), ink: lost ? '#4d5f70' : on ? '#ffffff' : '#8fa6b8' }; }; // (All pilots lights every digit, 1 2 3 4: card space-game-w4-all-lit; a pilot who is lost keeps his darker look)
  const ps = rows.map(part), line = [{ key: 'who' }].concat(ps.map(p => ({ text: p.n + ' ' + p.name, ink: p.ink, size: 13 })));
  line.alt = [{ key: 'who' }].concat(ps.map(p => ({ text: p.n, ink: p.ink, size: 13 })));
  return line;
}
// the panel that is open now, '' for none; null when the scene has not said (a test): the digits are then taken as working
function campCornerPanelId() {
  const P = typeof CAMP_TCORNER_SEEN !== 'undefined' ? CAMP_TCORNER_SEEN.P : null;
  return P && typeof campPanelOpen === 'function' ? (campPanelOpen(P) || '') : null;
}
// the details: the rows of the fleet pick (CAMP_PANELS 'fleet', src/data_controls.js; digit 1 to 5 does a row) as the corner shows them: a digit chip, the pilot's name and call sign with a hull bar (a pilot in the bay or lost says so),
// All pilots, Form up on me. A chip is grey when its digit does nothing now (the pick is not open: W opens it) or the row cannot be done. The pick is no list of its own on the screen: these ARE its rows
function campFleetRows(C) {
  if (typeof campPanelDef !== 'function' || typeof campPanelRows !== 'function' || !campPanelDef('fleet')) return [];
  const rows = campPanelList(C, 'fleet'), view = campPanelRows(C, 'fleet'), stops = typeof campSelList === 'function' ? campSelList(C) : [], pid = campCornerPanelId(), live = pid === null || pid === 'fleet', now = typeof campSelNow === 'function' ? campSelNow(C) : null;
  return view.map((r, i) => {
    const row = rows[i] || {}, cap = String(i + 1), picked = !!now && !!row.who && (now.id === row.who || now.kind === 'all'), capOk = (live || picked) && r.ok !== false; // card space-game-esc-all-pilots (Troy, 24 Nov 2026: the digits went dark after W then Esc): a digit is lit while the pick is open, AND whenever it is who takes the next order (open or closed): All pilots lights all four, one pilot lights his digit; a lost pilot stays grey
    if (row.who && row.who !== 'all') { // a pilot: the name with the hull bar under it
      const e = stops.find(x => x.id === row.who), u = e && e.unit, up = !!u && u.hp > 0 && !u.gone, h = up ? campTdispHull(u) : null;
      return { kind: 'bar', id: r.id, cap, capOk, name: r.label, num: h ? h.now + ' / ' + h.max : uiText(e ? 'camp.corner.bay' : 'camp.corner.lost'), share: h ? h.share : 0, color: h ? CAMP.charge.color[campChargeBand(h.share)] : 0x16293d, sel: !!r.marked, ok: r.ok !== false };
    }
    return { kind: 'key', id: r.id, cap, capOk, label: r.label, ok: r.ok !== false, sel: !!r.marked }; // All pilots, Form up on me: the chip and the words
  });
}
campCornerAdd({
  id: 'fleet', at: 'tl', part: 'b', keys: ['who'], title: 'camp.corner.fleet', line: campFleetLine, list: 'fleet',
  selection: C => { const f = typeof campSelNow === 'function' ? campSelNow(C) : null; return f ? (f.kind === 'pilot' ? (f.label || f.name) : uiText('camp.sel.all')) : ''; },
  rows: campFleetRows,
  block: C => { const id = campCornerPanelId(), def = id && typeof campPanelDef === 'function' ? campPanelDef(id) : null; return !!def && id !== 'fleet' && def.side === 'left'; }, // the cruiser list (and the parts it opens) is open: it has the room under the row above
  hit: (C, mem) => { let hit = false; (typeof campSelList === 'function' ? campSelList(C) : []).forEach(e => { const u = e.unit; if (!u) return; if (mem[u.id] !== undefined && u.hp < mem[u.id] - 1e-6) hit = true; mem[u.id] = u.hp; }); return hit; } // a pilot's hull went down since the last look
});

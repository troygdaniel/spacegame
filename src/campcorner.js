// ---------- Campaign: the corner panels, the rule and the registry (card space-game-layout-fleet; Troy, 24 Nov 2026, agreed bite by bite from his screenshot) ----------
// FOUR CORNERS, each a small title that never leaves, starting with its keys as plain key-cap chips (no arrows, like the E chip): top left Q CRUISER, bottom left Q W FLEET, top right [ ] HOSTILES, bottom right O P FRIENDLIES.
// Left is what Troy commands, right is everything else. The details under a title open when its keys are used and fade after a few seconds (CAMP.corner.show, then CAMP.corner.fade); the title stays. The current selection
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
//                     line: C => [segment, ...] })   optional (card space-game-fleet-sentence): the title row as a LINE that never fades, instead of the chip, the title and the selection: { key: 'who' } a key-cap chip from the table (ok: false greys it), { text, ink, bold, size, fit } words (fit: cut short with an ellipsis to fit the room; the words after it keep theirs). FLEET reads Q Kara  W Attack Raider 9
//   THE ITEMS rows(C) returns, from the top of the details down:
//     { kind: 'bar', name, num, share, color, sel }  a name at the left, its number at the right and a bar under it (share 0..1, color a number like 0x6dff9c, sel true: the name is lit)
//     { kind: 'text', text, ink }                    a line of text (ink '#9fbdd1' by default)
//     { kind: 'key', cap, label, ok }                a key chip and its word, bright when ok and grey when not (the order key line: E Attack)
//   THE CALLS
//     campCornerOpen(C, id, ms)   THE REOPEN HOOK: open the details of a corner now for ms (CAMP.corner.show when omitted), then they fade. Anything can call it
//     campCornerKey(C, code)      a key was pressed: opens every corner that has this key (the scene's onKey calls it for each key in play, so a corner needs nothing more than its keys)
//     campCornerNow(C, id)        what the scene draws now: { id, at, chips: ['Q', 'W'], title, selection, items (empty when closed), open (0..1) }
//     campCornerGeom(pos, itemsH, dx)   the two rectangles { title, det } of a corner (det is null with no items); dx moves both sideways (out of an open list's way)
//     campCornerItemsH(items)     the height of the items
//     campCornerLineLayout(segs, T0, measure)   where a line's chips and words stand: { chips: [{ x, cap, ok }], words: [{ x, text, ink, bold, size }] } (measure(text, segment) gives a width in px)
//     campCornerFit(text, room, width)   the text cut short with an ellipsis until width(text) is at most room px (the selection beside a title: card space-game-layout-align)
const CAMP_CORNERS = []; // the registered corners, in the order they were added
const CAMP_CORNER_STATE = new WeakMap(); // C -> { open: { id: { at, ms } }, mem: { id: {} } }: a new C (the next mission) starts with every corner closed
function campCornerAdd(def) { const i = CAMP_CORNERS.findIndex(d => d.id === def.id); if (i >= 0) CAMP_CORNERS[i] = def; else CAMP_CORNERS.push(def); return def; }
const campCornerDef = id => CAMP_CORNERS.find(d => d.id === id) || null;
const campCornerClock = C => +(C && C.t) || 0; // (a stand-in in a test may have no clock: 0)
function campCornerState(C) { let st = CAMP_CORNER_STATE.get(C); if (!st) { st = { open: {}, mem: {} }; CAMP_CORNER_STATE.set(C, st); } return st; }
function campCornerOpen(C, id, ms) { if (!C || typeof C !== 'object') return; campCornerState(C).open[id] = { at: campCornerClock(C), ms: ms > 0 ? ms : CAMP.corner.show }; }
const campCornerKeyList = d => (d.keys || []).map(k => typeof k === 'string' ? { cap: (CAMP_KEYS[k] && CAMP_KEYS[k].k) || '', codes: campKeyCodes(k) } : { cap: String(k.cap || ''), codes: k.codes || [] });
function campCornerKey(C, code) { CAMP_CORNERS.forEach(d => { if (campCornerKeyList(d).some(k => k.codes.indexOf(code) >= 0)) campCornerOpen(C, d.id); }); } // a key of a corner was used: its details open
function campCornerStrength(C, id) { // 0..1: full for the time it was opened for, then a fade, then none
  const o = campCornerState(C).open[id]; if (!o) return 0; const K = CAMP.corner, age = campCornerClock(C) - o.at;
  if (age < 0) return 0; return age < o.ms ? 1 : age < o.ms + K.fade ? 1 - (age - o.ms) / K.fade : 0;
}
const campCornerKind = it => it.kind || (it.share !== undefined ? 'bar' : 'text');
const campCornerItemsH = items => (items || []).reduce((h, it) => h + (CAMP.corner.item[campCornerKind(it)] || CAMP.corner.item.text), 0);
function campCornerGeom(pos, itemsH, dx) { // the title row and the details' frame: the row sits at the corner, the details open away from the screen's edge
  const K = CAMP.corner, a = K.at[pos], x = a.x + (dx || 0), th = K.title.h, ty = a.dir < 0 ? a.y - th : a.y, dh = itemsH > 0 ? itemsH + K.pad * 2 : 0;
  return { title: { x, y: ty, w: K.w, h: th }, det: dh ? { x, y: a.dir < 0 ? ty - K.gap - dh : ty + th + K.gap, w: K.w, h: dh } : null };
}
function campCornerFit(text, room, width) { // text cut short with an ellipsis until width(text) fits room (width: a function giving a text's width in px); a text that fits is returned as it is
  const t = String(text || ''); if (width(t) <= room) return t;
  for (let n = t.length - 1; n > 0; n--) { const c = t.slice(0, n).replace(/\s+$/, '') + '\u2026'; if (width(c) <= room) return c; }
  return '\u2026';
}
const campCornerCap = k => { if (k && typeof k === 'object') return String(k.cap || ''); const v = typeof CAMP_KEYS === 'object' && CAMP_KEYS[k] ? CAMP_KEYS[k].k : ''; return Array.isArray(v) ? String(v[0] || '') : String(v || ''); }; // a segment's key: an id of the table, or { cap }
function campCornerLineLayout(segs, T0, measure) { // left to right from the frame's inner edge: a chip, a gap, a word, a gap; the word marked fit is cut short to the room left (to the inner right edge, less the segments after it)
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
  const open = campCornerStrength(C, id);
  return { id, at: d.at, chips: campCornerKeyList(d).map(k => k.cap), title: uiText(typeof d.title === 'function' ? d.title(C) : d.title), selection: d.selection ? String(d.selection(C) || '') : '', line: d.line ? d.line(C) || null : null, items: open > 0 && d.rows ? d.rows(C) || [] : [], open };
}
// ---- FLEET, bottom left (card space-game-layout-fleet, then space-game-fleet-sentence): the selection is All pilots or the one pilot; the details are the pilots' names and hull bars, and they come back for 4 s when a pilot is hit ----
// the FLEET row as one line (card space-game-fleet-sentence; Troy, 24 Nov 2026: "the order has no permanent home: make the Q FLEET corner read as one line that never fades: who, the W chip, the order and the target"): Q Kara  W Attack Raider 9, Q All pilots  W Guard Transport, W Form up with nothing held;
// the W part is grey, and says why, when the order cannot be given (W Attack, no pilot out). The target held is the one corner that holds it; the order and its reason are campTdispOrder's dry run.
function campFleetLine(C) {
  const f = typeof campSelNow === 'function' ? campSelNow(C) : null, who = f ? (f.kind === 'pilot' ? f.name : uiText('camp.sel.all')) : '';
  const h = typeof campHeldNow === 'function' ? campHeldNow(C) : null, verb = h && h.kind === 'hostile' ? 'attack' : 'guard', ord = typeof campTdispOrder === 'function' ? campTdispOrder(C, verb) : { ok: true, code: '', label: '' };
  const word = h ? uiText('camp.corner.' + verb, { name: h.name }) : uiText('camp.corner.formup');
  const why = ord.ok ? '' : uiText('camp.corner.why.' + ({ nofighters: 1, launching: 1, nofoe: 1, over: 1 }[ord.code] ? ord.code : 'else')), what = h ? ord.label : uiText('camp.corner.formup'); // blocked: the order's word alone and the reason (the target is in its own corner)
  return [{ key: 'who' }, { text: who, ink: '#ffffff', bold: true, size: 14 }, { key: 'order', ok: ord.ok }, ord.ok ? { text: word, ink: '#e8f6ff', size: 13, fit: true } : { text: uiText('camp.corner.blocked', { what, why }), ink: '#7f95a8', size: 13, fit: true }];
}
campCornerAdd({
  id: 'fleet', at: 'bl', keys: ['who'], title: 'camp.corner.fleet', line: campFleetLine,
  selection: C => { const f = typeof campSelNow === 'function' ? campSelNow(C) : null; return f ? (f.kind === 'pilot' ? f.name : uiText('camp.sel.all')) : ''; },
  rows: C => (typeof campSelList === 'function' ? campSelList(C) : []).filter(e => e.kind === 'pilot').map(e => {
    const u = e.unit, lit = C.sel === e.id || !C.sel || C.sel === 'all', live = u && u.hp > 0 && !u.gone;
    if (!live) return { kind: 'bar', id: e.id, name: e.name, num: uiText('camp.corner.bay'), share: 0, color: 0x16293d, sel: lit };
    const h = campTdispHull(u); return { kind: 'bar', id: e.id, name: e.name, num: h.now + ' / ' + h.max, share: h.share, color: CAMP.charge.color[campChargeBand(h.share)], sel: lit };
  }),
  hit: (C, mem) => { let hit = false; (typeof campSelList === 'function' ? campSelList(C) : []).forEach(e => { const u = e.unit; if (!u) return; if (mem[u.id] !== undefined && u.hp < mem[u.id] - 1e-6) hit = true; mem[u.id] = u.hp; }); return hit; } // a pilot's hull went down since the last look
});

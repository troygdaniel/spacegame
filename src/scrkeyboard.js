// ---------- The keys page's keyboard: a drawn keyboard with the keys of the page lit, each group in its own colour (docs/screens-flow.html step 8) ----------
// Troy, 27 Nov 2026: "would be good to have a keyboard shown, to make it easy to understand how the mappings are meant ... the key locations ... like some video games show ... with the letters
// highlighted". The keys page (src/scrkeys.js) lists what each key does; this picture shows WHERE they are: the left hand's cluster (Q W E R, Tab, Shift, Z C), the right hand's (the arrows,
// Enter, ] \), Space under the thumb. A key is lit in the colour of its group, and the group's heading has a dot of the same colour. No words: a cap is what is printed on the key.
// The pure half (no page): the layout table and the model. The drawing is scrKeyboardDraw, on the screens' host (src/scrhost.js); the style is in src/scrset.css. Nothing here takes a key or a click.
//   SCRKB.rows                 the main block, five rows of [code, cap, width in key units]; every row is 15 units wide. Esc sits where the 60% boards put it (left of 1)
//   SCRKB.arrows               the arrow cluster, two rows of three (an empty code is a gap)
//   SCRKB.tones                the colour of a group of the page by its id (the flight page's three groups; any other group is 'blue')
//   scrKeyboardCodes(id, all)  the KeyboardEvent.code values of an entry of the page: '@cruiser' is a list's key (campKeyList), else a key of CAMP_KEYS, else a role of the menu key table
//                              (scrKey). all: every code the board has (both Shifts, the four arrows); else the first only (a role's WASD twin is not lit: the chip shows the arrow)
//   scrKeyboardModel(groups)   groups: [{ id, tone, codes: [...] }] in the page's order -> { rows: [[{ code, cap, w, tone }]], arrows: [[...]], lit: n }; a key two groups use takes the first group's colour
//   scrKeyboardDraw(R, parent, B)  the elements: .sc-kb > .sc-kbm (rows .sc-kbr of keys .sc-kk) and .sc-kba (the arrows); a lit key has the class t-<tone>; a key's cap is its data-cap, drawn by the style, so the picture adds no word to the page
const SCRKB = {
  rows: [
    [['Escape', 'Esc', 1], ['Digit1', '1', 1], ['Digit2', '2', 1], ['Digit3', '3', 1], ['Digit4', '4', 1], ['Digit5', '5', 1], ['Digit6', '6', 1], ['Digit7', '7', 1], ['Digit8', '8', 1], ['Digit9', '9', 1], ['Digit0', '0', 1], ['Minus', '-', 1], ['Equal', '=', 1], ['Backspace', 'Backspace', 2]],
    [['Tab', 'Tab', 1.5], ['KeyQ', 'Q', 1], ['KeyW', 'W', 1], ['KeyE', 'E', 1], ['KeyR', 'R', 1], ['KeyT', 'T', 1], ['KeyY', 'Y', 1], ['KeyU', 'U', 1], ['KeyI', 'I', 1], ['KeyO', 'O', 1], ['KeyP', 'P', 1], ['BracketLeft', '[', 1], ['BracketRight', ']', 1], ['Backslash', '\\', 1.5]],
    [['CapsLock', '', 1.75], ['KeyA', 'A', 1], ['KeyS', 'S', 1], ['KeyD', 'D', 1], ['KeyF', 'F', 1], ['KeyG', 'G', 1], ['KeyH', 'H', 1], ['KeyJ', 'J', 1], ['KeyK', 'K', 1], ['KeyL', 'L', 1], ['Semicolon', ';', 1], ['Quote', '\'', 1], ['Enter', 'Enter', 2.25]],
    [['ShiftLeft', 'Shift', 2.25], ['KeyZ', 'Z', 1], ['KeyX', 'X', 1], ['KeyC', 'C', 1], ['KeyV', 'V', 1], ['KeyB', 'B', 1], ['KeyN', 'N', 1], ['KeyM', 'M', 1], ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1], ['ShiftRight', 'Shift', 2.75]],
    [['ControlLeft', '', 1.25], ['MetaLeft', '', 1.25], ['AltLeft', '', 1.25], ['Space', 'Space', 6.25], ['AltRight', '', 1.25], ['MetaRight', '', 1.25], ['ContextMenu', '', 1.25], ['ControlRight', '', 1.25]]
  ],
  arrows: [[['', '', 1], ['ArrowUp', '↑', 1], ['', '', 1]], [['ArrowLeft', '←', 1], ['ArrowDown', '↓', 1], ['ArrowRight', '→', 1]]],
  tones: { fly: 'blue', fleet: 'gold', cruiser: 'good' },   // the flight page's groups: the ship, the pilots, the cruiser's own
  other: 'blue',                                            // any other group (a screen of the ready room)
  maxGroups: 3                                              // the picture is for a page of three groups or fewer: a fourth (the tune kit's, ?debug=1) takes the room it stands in
};
const scrKeyboardTone = id => Object.prototype.hasOwnProperty.call(SCRKB.tones, id) ? SCRKB.tones[id] : SCRKB.other;
const scrKeyboardHas = code => SCRKB.rows.concat(SCRKB.arrows).some(r => r.some(k => k[0] === code));
function scrKeyboardCodes(id, all) {
  if (typeof id !== 'string' || !id) return [];
  let codes = [];
  if (id.charAt(0) === '@') { const L = typeof campKeyList === 'function' ? campKeyList(id.slice(1)) : null; codes = L && L.code ? [L.code] : []; }
  else { const e = typeof CAMP_KEYS === 'object' && CAMP_KEYS ? CAMP_KEYS[id] : null, r = e && e.codes ? e : (typeof scrKey === 'function' ? scrKey(id) : null); codes = r && r.codes ? r.codes.slice() : []; }
  codes = codes.filter(scrKeyboardHas);
  return all ? codes : codes.slice(0, 1);
}
function scrKeyboardModel(groups) {
  const tone = {}; let lit = 0;
  (groups || []).forEach(g => (g.codes || []).forEach(c => { if (!tone[c] && scrKeyboardHas(c)) { tone[c] = g.tone || SCRKB.other; lit++; } }));
  const key = k => ({ code: k[0], cap: k[1], w: k[2], tone: tone[k[0]] || '' });
  return { rows: SCRKB.rows.map(r => r.map(key)), arrows: SCRKB.arrows.map(r => r.map(key)), lit };
}
function scrKeyboardDraw(R, parent, B) {
  if (!R || !B || typeof scrHostEl !== 'function') return null;
  const el = scrHostEl, set = scrHostSet, box = el(R, 'div', 'sc-kb', parent), main = el(R, 'div', 'sc-kbm', box), arr = el(R, 'div', 'sc-kba', box);
  const row = (into, keys) => { const r = el(R, 'div', 'sc-kbr', into); keys.forEach(k => {
    const e = el(R, 'span', 'sc-kk' + (k.code ? '' : ' gap') + (k.cap.length > 1 ? ' sm' : '') + (k.tone ? ' t-' + k.tone : ''), r); set(e, 'flexGrow', String(k.w)); if (k.cap) e.setAttribute('data-cap', k.cap); if (k.code) e.setAttribute('data-code', k.code); }); }; // the cap is drawn by the style (attr(data-cap)), not as text: the page's words stay the rows' words
  B.rows.forEach(r => row(main, r)); B.arrows.forEach(r => row(arr, r));
  return box;
}

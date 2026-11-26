// ---------- Campaign: the tuning panel, drawn (card space-game-tuning-panel; Troy, 22 Nov 2026) ----------
// N opens it, in flight and in the ready room; the battle waits while it is open (the scene is paused as it is for the H page). Up and Down move, Left and Right change a number or flip a switch
// (Shift: ten steps), Backspace puts the highlighted row back to its default, Enter on the top rows copies the settings or resets everything, N or Esc closes. The rules and the list are
// src/camptune.js (pure); this file is the drawing and the clipboard. A small TUNED mark sits on the screen whenever any override is on (campTuneMark).
//   campTuneOpen(s) / campTuneClose(s) / campTuneIsOpen(s)   s is any scene with the usual add (the Campaign, the ready room); s.tp is the open panel
//   campTuneKey(s, e)      a key (the DOM event) while the panel is open: 'close' when it closed, else true (the panel takes every key: nothing under it moves)
//   campTunePaint(s)       redraw the rows from the model (every key does)
//   campTuneMark(s)        the TUNED mark: made and kept up to date, called each frame by the scene
//   campTuneCopy(text)     the clipboard: true when it was asked
const CAMPTUNE_LOOK = {
  panel: { x: 170, y: 36, w: 940, h: 648 },
  titleY: 54, subY: 90, top: 128, pitch: 28,                     // the heading, its line under it, the first row's y, a row's pitch
  nameX: 214, valueX: 660, defX: 686, whenX: 1070,               // the name's left, the value's right edge, the default's left, the tag's right edge
  hiX: 192, hiW: 896, hiH: 26,                                    // the highlight bar
  noteY: 556, feelY: 580, keysY: 614,                             // the message line, the five numbers of the cruiser's feel as text (card space-game-cruiser-feel-sliders) and the key lines under the list
  depth: 320,                                                      // over the H page (300), the cards (200) and the map (150 to 156)
  markX: 372, markY: 22                                            // the TUNED mark: from the right edge of the screen (its right end is 10 px left of the gauges' block, which is at the top right since card space-game-power-presets: x 908 on a 1280 screen), and its top
};

const campTuneIsOpen = s => !!s && !!s.tp && s.tp.open === true;

function campTuneCopy(text) {
  try {
    if (typeof navigator === 'object' && navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { const p = navigator.clipboard.writeText(text); if (p && typeof p.catch === 'function') p.catch(() => {}); return true; }
    if (typeof document === 'object' && document && typeof document.createElement === 'function') { // an older page: a hidden box, selected and copied
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      const ok = document.execCommand && document.execCommand('copy'); document.body.removeChild(t); return !!ok;
    }
  } catch (e) { /* no clipboard: the panel says so */ }
  return false;
}

function campTuneOpen(s) {
  if (!s || campTuneIsOpen(s) || !s.add) return false;
  const L = CAMPTUNE_LOOK, P = L.panel, objs = [], put = (o, d) => { o.setScrollFactor(0).setDepth(L.depth + (d || 0)); objs.push(o); return o; };
  put(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.88).setInteractive(), 0);                // a veil that takes the clicks: the game under it is not clicked
  const g = put(s.add.graphics(), 1); hudPanel(g, P.x, P.y, P.w, P.h, 20, 0.97, CYAN);
  put(s.add.text(L.nameX, L.titleY, uiText('camp.ui.tune.title'), uiFont(24, '#38e1ff', { letterSpacing: 2 })), 2);
  put(s.add.text(L.nameX, L.subY, uiText('camp.ui.tune.sub'), uiFont(14, '#9fbdd1')), 2);
  const hi = put(s.add.rectangle(L.hiX + L.hiW / 2, 0, L.hiW, L.hiH, 0x38e1ff, 0.16), 1), bar = put(s.add.rectangle(L.hiX + 2, 0, 4, L.hiH, 0xffb454, 1), 1);
  const lines = [];
  for (let i = 0; i < CAMP_TUNE_VIEW.show; i++) {
    const y = L.top + i * L.pitch;
    lines.push({
      head: put(s.add.text(L.nameX, y + 5, '', uiFont(13, '#ffb454', { letterSpacing: 2 })), 2),
      name: put(s.add.text(L.nameX, y, '', uiFont(16, '#cfefff')), 2),
      val: put(s.add.text(L.valueX, y, '', uiFont(16, '#ffffff')).setOrigin(1, 0), 2),
      def: put(s.add.text(L.defX, y + 2, '', uiFont(13, '#5b7a92')), 2),
      when: put(s.add.text(L.whenX, y + 2, '', uiFont(13, '#7fa6bd')).setOrigin(1, 0), 2)
    });
  }
  const arrows = put(s.add.graphics(), 2);
  const note = put(s.add.text(L.nameX, L.noteY, '', uiFont(15, '#ffd37a')), 2), feel = put(s.add.text(L.nameX, L.feelY, '', uiFont(15, '#9fe9ff')), 2);
  put(s.add.text(L.nameX, L.keysY, uiText('camp.ui.tune.keys1'), uiFont(14, '#9fbdd1')), 2);
  put(s.add.text(L.nameX, L.keysY + 22, uiText('camp.ui.tune.keys2'), uiFont(14, '#5b7a92')), 2);
  s.tp = { open: true, objs, hi, bar, lines, arrows, note, feel, model: campTunePanelNew() };
  s.tp.model.live = !!s.camp;                                                                  // in a flight, the panel has a row that opens the live sliders over the battle
  campTunePaint(s);
  return true;
}

function campTunePaint(s) {
  if (!campTuneIsOpen(s)) return;
  const T = s.tp, M = T.model, L = CAMPTUNE_LOOK, items = campTuneItems(M), n = campTuneCount();
  campTuneKeepSeen(M, items);
  T.hi.setVisible(false); T.bar.setVisible(false);
  T.lines.forEach((ln, i) => {
    const it = items[M.top + i], y = L.top + i * L.pitch;
    ['head', 'name', 'val', 'def', 'when'].forEach(k => ln[k].setText(''));
    if (!it) return;
    if (it.kind === 'head') { ln.head.setText(uiText('camp.ui.tune.group.' + it.group).toUpperCase()); return; }
    if (M.top + i === M.cur) { T.hi.setPosition(L.hiX + L.hiW / 2, y + L.hiH / 2).setVisible(true); T.bar.setPosition(L.hiX + 2, y + L.hiH / 2).setVisible(true); }
    if (it.kind === 'copy') { ln.name.setText(uiText('camp.ui.tune.copy')).setColor('#ffd37a'); ln.val.setText(uiText(n ? 'camp.ui.tune.changed' : 'camp.ui.tune.nochange', { n })).setColor(n ? '#ffffff' : '#5b7a92'); return; }
    if (it.kind === 'reset') { ln.name.setText(uiText('camp.ui.tune.reset')).setColor('#ffd37a'); return; }
    if (it.kind === 'live') { ln.name.setText(uiText('camp.ui.tune.live')).setColor('#ffd37a'); ln.val.setText(uiText('camp.ui.tune.live.note')).setColor('#9fe9ff'); return; }
    const r = it.row, ch = campTuneChanged(r.id);
    ln.name.setText(campTuneLabel(r)).setColor('#cfefff');
    ln.val.setText(campTuneFmt(r, campTuneValue(r.id))).setColor(ch ? '#ffb454' : '#ffffff');
    ln.def.setText(ch ? uiText('camp.ui.tune.default', { v: campTuneFmt(r, campTuneDefault(r.id)) }) : '');
    ln.when.setText(campTuneWhen(r));
  });
  T.arrows.clear(); T.arrows.fillStyle(0x7fa6bd, 0.9);
  if (M.top > 0) T.arrows.fillTriangle(L.panel.x + L.panel.w - 40, L.top - 12, L.panel.x + L.panel.w - 30, L.top - 12, L.panel.x + L.panel.w - 35, L.top - 20);
  if (M.top + CAMP_TUNE_VIEW.show < items.length) { const y = L.top + CAMP_TUNE_VIEW.show * L.pitch + 6; T.arrows.fillTriangle(L.panel.x + L.panel.w - 40, y, L.panel.x + L.panel.w - 30, y, L.panel.x + L.panel.w - 35, y + 8); }
  T.note.setText(M.msg ? uiText('camp.ui.tune.msg.' + M.msg, { n }) : '');
  T.feel.setText(campTuneFeelText());                                                          // the five numbers of the cruiser's feel, always on the panel, as text
}

function campTuneClose(s) {
  if (!campTuneIsOpen(s)) return false;
  s.tp.objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone with the scene */ } });
  s.tp = null; return true;
}

// a key while the panel is open. The scene calls this first of all: the panel takes every key, and a held Up, Down, Left or Right repeats (the number runs).
function campTuneKey(s, e) {
  if (!campTuneIsOpen(s)) return false;
  if (e.repeat && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) < 0) return true;
  if (e.preventDefault && (e.code === 'Backspace' || e.code === 'Tab' || e.code === 'Space' || e.code.indexOf('Arrow') === 0)) e.preventDefault();
  const z0 = campTuneValue('startview'), r = campTunePanelKey(s.tp.model, e.code, !!e.shiftKey);
  if (campTuneValue('startview') !== z0) campTuneApplyView(s);                                // the start zoom moved: the flight goes there at once
  if (r.action === 'live') { campTuneClose(s); campTuneLiveOpen(s); return 'close'; }         // the scene lets the battle run again (closeTune); the strip comes up over it
  if (r.action === 'copy') { const ok = r.text ? campTuneCopy(r.text) : true; if (r.text && !ok) s.tp.model.msg = 'noclip'; }
  if (typeof sfx === 'function') { try { sfx(r.close ? 'tick' : r.action === 'copy' && s.tp.model.msg === 'copied' ? 'chime' : 'tick'); } catch (er) { /* no sound */ } }
  if (r.close) { campTuneClose(s); return 'close'; }
  campTunePaint(s);
  return true;
}

// the TUNED mark: a small amber line at the top right of the screen, beside the radar, whenever any override is on
function campTuneMark(s) {
  if (!s || !s.add) return;
  const n = campTuneCount();
  if (!s.tuneMark) { if (!n) return; s.tuneMark = s.add.text(W - CAMPTUNE_LOOK.markX, CAMPTUNE_LOOK.markY, '', uiFont(14, '#ffb454', { stroke: '#02060d', strokeThickness: 3 })).setOrigin(1, 0).setScrollFactor(0).setDepth(101); s.tuneMarkN = -1; }
  if (s.tuneMarkN !== n) { s.tuneMarkN = n; s.tuneMark.setText(n ? uiText('camp.ui.tune.mark', { n }) : ''); }
}

// ---------- the live strip (card space-game-cruiser-feel-sliders; Troy, 26 Nov 2026) ----------
// Troy dials the cruiser's feel in while he flies. The N panel stops the battle; this strip does not: a real slider for each row of the group 'feel' (top speed, thrust, turn, the boost's top speed,
// the start zoom), over the running battle at the right of the screen. Dragging one puts its number into the table at once (campTuneSet: the flight reads all five every frame), and the strip
// shows its value and its default; Reset puts the five back to the shipped numbers; the line under them is the five numbers as text (campTuneFeelText) for Troy to read back. A slider lets go of the keyboard the
// moment the pointer is released (blur), so the arrow keys fly again at once; N or the Close button closes the strip. Kept in this browser as every override is (campTuneSave); nothing goes to the
// clipboard or out of the page. The strip is DOM (real sliders); its rules are at the end of src/camppagehud.css.
//   campTuneLiveOpen(s, doc) / campTuneLiveClose(s) / campTuneLiveIsOpen(s)   s: the Campaign scene (s.tl is the open strip); doc: the page's document (tests give a stand-in)
//   campTuneLiveSync(s)    the sliders, their words and the line from the table (every change does this)
//   campTuneApplyView(s)   the flight's zoom goes to the start zoom now (the start zoom row moved)
const campTuneLiveIsOpen = s => !!s && !!s.tl && s.tl.open === true;

function campTuneApplyView(s) { // the start zoom changed in a flight: the view is wanted at the new start zoom now, as Backspace would put it
  if (s && s.camp && typeof CAMZOOM === 'object' && typeof campZoomDefault === 'function') CAMZOOM.want = campZoomDefault();
}

function campTuneLiveOpen(s, doc) {
  doc = doc || (typeof document === 'object' ? document : null);
  if (!s || campTuneLiveIsOpen(s) || !doc || !doc.body) return false;
  const el = (tag, cls, parent) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
  const on = (e, ev, f) => { if (e.addEventListener) e.addEventListener(ev, f); };
  const root = el('div', 'ct-live', doc.body), rows = [];
  el('div', 'ct-h', root).textContent = uiText('camp.ui.tune.live.title');
  campTuneFeelRows().forEach(r => {
    const row = el('div', 'ct-r', root), head = el('div', 'ct-t', row), name = el('span', 'ct-n', head), val = el('b', 'ct-v', head), inp = el('input', 'ct-s', row), def = el('i', 'ct-d', row);
    inp.type = 'range'; inp.min = String(r.min); inp.max = String(r.max); inp.step = String(r.step);
    name.textContent = campTuneLabel(r);
    on(inp, 'input', () => { const was = campTuneValue('startview'); campTuneSet(r.id, +inp.value); if (campTuneValue('startview') !== was) campTuneApplyView(s); campTuneLiveSync(s); });
    on(inp, 'change', () => { if (inp.blur) inp.blur(); });                                // let go of the keyboard: the arrow keys fly again
    on(inp, 'pointerup', () => { if (inp.blur) inp.blur(); });
    on(inp, 'keydown', e => { if (e && e.stopPropagation) e.stopPropagation(); });         // a slider with the focus takes its own keys, not the ship's
    rows.push({ id: r.id, row, val, inp, def });
  });
  const line = el('div', 'ct-l', root), foot = el('div', 'ct-f', root), reset = el('button', 'ct-b', foot), close = el('button', 'ct-b', foot);
  reset.textContent = uiText('camp.ui.tune.live.reset'); close.textContent = uiText('camp.ui.tune.live.close');
  on(reset, 'click', () => { const was = campTuneValue('startview'); campTuneFeelRows().forEach(r => campTuneReset(r.id)); if (campTuneValue('startview') !== was) campTuneApplyView(s); campTuneLiveSync(s); if (reset.blur) reset.blur(); });
  on(close, 'click', () => campTuneLiveClose(s));
  s.tl = { open: true, doc, root, rows, line };
  if (s.events && s.events.once) s.events.once('shutdown', () => campTuneLiveClose(s));    // gone with the scene
  campTuneLiveSync(s);
  return true;
}

function campTuneLiveSync(s) {
  if (!campTuneLiveIsOpen(s)) return false;
  const T = s.tl;
  T.rows.forEach(o => {
    const r = campTuneRow(o.id), v = campTuneValue(o.id), ch = campTuneChanged(o.id);
    const sv = campTuneClamp(r, v);                                                          // the slider sits on its own step (the boost's default, 329.7, is 330 on it; the browser would put it there)
    if (+o.inp.value !== sv) o.inp.value = String(sv);
    o.val.textContent = campTuneFmt(r, v);
    o.def.textContent = uiText('camp.ui.tune.default', { v: campTuneFmt(r, campTuneDefault(o.id)) });
    o.row.className = 'ct-r' + (ch ? ' chg' : '');
  });
  T.line.textContent = campTuneFeelText();
  return true;
}

function campTuneLiveClose(s) {
  if (!campTuneLiveIsOpen(s)) return false;
  const T = s.tl; s.tl = null; T.open = false;
  try { if (T.root.parentNode) T.root.parentNode.removeChild(T.root); } catch (e) { /* gone with the page */ }
  return true;
}

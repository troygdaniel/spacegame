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
  noteY: 566, keysY: 606,                                         // the message line and the key lines under the list
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
  const note = put(s.add.text(L.nameX, L.noteY, '', uiFont(15, '#ffd37a')), 2);
  put(s.add.text(L.nameX, L.keysY, uiText('camp.ui.tune.keys1'), uiFont(14, '#9fbdd1')), 2);
  put(s.add.text(L.nameX, L.keysY + 22, uiText('camp.ui.tune.keys2'), uiFont(14, '#5b7a92')), 2);
  s.tp = { open: true, objs, hi, bar, lines, arrows, note, model: campTunePanelNew() };
  campTunePaint(s);
  return true;
}

function campTunePaint(s) {
  if (!campTuneIsOpen(s)) return;
  const T = s.tp, M = T.model, L = CAMPTUNE_LOOK, items = campTuneItems(), n = campTuneCount();
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
  const r = campTunePanelKey(s.tp.model, e.code, !!e.shiftKey);
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

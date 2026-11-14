// ---------- Content on the Title screen: a problems chip, its panel and the MODDED tag (docs/MODDING.md 5.2) ----------
// Title.create calls contentTitleUi(this) once. It reads CONTENT_ERRORS and CONTENT_STATE (boot.js) and draws nothing at all
// when the content pack has no problems and is the shipped core pack, so a normal player never sees any of it.
//   chip   amber, bottom left: "[P] CONTENT: 3 PROBLEMS"; a click or P opens the panel
//   tag    cyan, bottom right: "MODDED", when the loaded content is not the shipped core pack (CONTENT_STATE.modded); opens the panel too
//   panel  the first 8 problems in plain words, then "and N more, see the browser console"; Esc, P, Enter or a click outside closes it
// The game starts regardless of any of this; while the panel is open no key or click starts the game.
// Returns { chip, tag, isOpen(), open(), close(), handleKey(e) }; Title routes its key presses through handleKey first.

const CONTENT_UI = { rows: 8, width: 880, textMax: 220 };

function contentLine(e) { // one problem as a plain line: file, line, what is wrong, what the game did
  const s = typeof ContentLib !== 'undefined' ? ContentLib.formatError(e) : (e.path || 'content') + ': ' + e.message;
  return s.length > CONTENT_UI.textMax ? s.slice(0, CONTENT_UI.textMax - 3) + '...' : s;
}

function contentTitleUi(s) {
  const errs = CONTENT_ERRORS, n = errs.length, st = CONTENT_STATE, modded = !!st.modded;
  const ui = {
    chip: null, tag: null, panel: null,
    isOpen() { return !!(this.panel && this.panel.box.visible); },
    open() { if (!this.panel) this.panel = contentPanel(s, this); this.panel.box.setVisible(true); },
    close() { if (this.panel) this.panel.box.setVisible(false); },
    handleKey(e) { // true when the key was ours (the game must not start)
      if (this.isOpen()) { if (['Escape', 'KeyP', 'Enter', 'Space'].includes(e.code)) this.close(); return true; }
      if (e.code === 'KeyP' && (n || modded)) { this.open(); return true; }
      return false;
    }
  };
  if (!n && !modded) return ui;

  // a small glass chip with a cap and a label; the whole thing is one click target
  const mk = (right, x, y, label, color, css, cap) => {
    const t = s.add.text(0, 0, label, uiFont(13, css, { fontStyle: 'bold', letterSpacing: 1 })).setOrigin(0, 0.5);
    const kc = cap ? keyCap(s, cap, color) : null;
    const w = Math.ceil(t.width) + 30 + (kc ? kc.kw + 8 : 0), h = 30, left = right ? x - w : x;
    const g = s.add.graphics(); hudPanel(g, left, y, w, h, 8, 0.92, color);
    let tx = left + 15;
    if (kc) { kc.setPosition(tx + kc.kw / 2, y + h / 2); tx += kc.kw + 8; }
    t.setPosition(tx, y + h / 2);
    const zone = s.add.zone(left + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => ui.open());
    zone.on('pointerover', () => g.setAlpha(1)); zone.on('pointerout', () => g.setAlpha(0.8)); g.setAlpha(0.8);
    g.setDepth(20); t.setDepth(21); zone.setDepth(22); if (kc) kc.setDepth(21); // the glass first, the words and the cap on top of it
    return { g, t, zone, w };
  };
  const y = H - 76;
  if (n) ui.chip = mk(false, 28, y, 'CONTENT: ' + n + (n === 1 ? ' PROBLEM' : ' PROBLEMS'), AMBER, '#ffd37a', 'P');
  if (modded) ui.tag = mk(true, W - 28, y, 'MODDED', CYAN, '#9fe9ff', n ? null : 'P');
  return ui;
}

// the panel: what is wrong, in the HUD glass of ui.js; texts are measured first so the panel is as tall as it needs to be
function contentPanel(s, ui) {
  const errs = CONTENT_ERRORS, n = errs.length, st = CONTENT_STATE, W_ = CONTENT_UI.width, lw = W_ - 96, color = n ? AMBER : CYAN;
  const items = []; let y = 0;
  const put = (str, size, col, gap, o = {}) => {
    const t = s.add.text(0, 0, str, uiFont(size, col, Object.assign({ wordWrap: { width: lw }, lineSpacing: 3 }, o.style))).setOrigin(0, 0);
    items.push({ t, y, mark: o.mark }); y += t.height + gap; return t;
  };

  // which pack is this
  if (!st.loaded) put('PACK   content.generated.js could not be read, so the game plays on its built-in values.', 14, '#ffd37a', 8);
  else if (st.modded) {
    put('PACK   MODDED: this game is not running the shipped core pack.', 14, '#9fe9ff', 2, { style: { fontStyle: 'bold' } });
    put('content ' + (st.hash || '?') + ', shipped ' + (st.core || '?') + '. Please say so in a bug report.', 13, '#5b7a92', 8);
  } else put('PACK   the shipped core pack (' + (st.hash || '?') + ').', 14, '#9fe9ff', 8);
  if (n) put('The game started anyway. What is listed here was ignored and the built-in value is used instead.', 13, '#cfefff', 12);

  // the first problems, as many as fit (8 at most)
  const top = y, room = 330; let shown = 0;
  for (let i = 0; i < Math.min(CONTENT_UI.rows, n); i++) {
    const e = errs[i], t = s.add.text(0, 0, contentLine(e), uiFont(13, e.level === 'warn' ? '#9fe9ff' : '#ffd37a', { wordWrap: { width: lw }, lineSpacing: 3 })).setOrigin(0, 0);
    if (i > 0 && y - top + t.height > room) { t.destroy(); break; }
    items.push({ t, y, mark: e.level === 'warn' ? CYAN : AMBER }); y += t.height + 9; shown++;
  }
  if (n > shown) put('and ' + (n - shown) + ' more, see the browser console.', 13, '#5b7a92', 10);
  if (n) put('To fix: edit the file named above, run  node tools/build-content.mjs  and reload the page.', 13, '#5b7a92', 0);

  const h = Math.min(680, 40 + 22 + y + 22 + 44), ui2 = panel(s, { w: W_, h, title: 'CONTENT', dim: true, depth: 150, color });
  ui2.tagText.setText(n ? n + (n === 1 ? ' PROBLEM' : ' PROBLEMS') : 'MODDED').setColor(n ? '#ffb454' : '#38e1ff');
  const box = ui2.box, g = s.add.graphics(); box.add(g);
  items.forEach(({ t, y: ty, mark }) => {
    const px = -W_ / 2 + 48, py = -h / 2 + 40 + 22 + ty;
    t.setPosition(px, py); box.add(t);
    if (mark) { g.fillStyle(mark, 1); g.fillRect(-W_ / 2 + 30, py + 4, 6, 6); }
  });
  ui2.setHints([['Esc', 'Back to the title']]);
  const dim = box.list[0]; if (dim && dim.on) dim.on('pointerdown', () => ui.close()); // a click outside the panel closes it
  return ui2;
}

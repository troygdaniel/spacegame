// ---------- UI kit: one panel style for every window, key caps, typewriter text, floating prompts ----------
// panel() frames the mission board, shop, pause menu and ending card; keyCap() draws the [E] / [Esc] badges;
// typewrite() types NPC lines; floatPrompt() replaces the bottom text strip with a key cap above what you can use.
const UI_BG = 0x07101c;
const uiFont = (size, color = '#cfefff', extra = {}) => Object.assign({ fontFamily: 'monospace', fontSize: size + 'px', color }, extra);

// a small key-cap badge, centred on (0, 0); .kw is its width
function keyCap(s, key, color = CYAN) {
  const t = s.add.text(0, 0, key, uiFont(13, '#02101c', { fontStyle: 'bold' })).setOrigin(0.5);
  const w = Math.max(24, Math.ceil(t.width) + 14), h = 22, g = s.add.graphics();
  g.fillStyle(0x000000, 0.45); g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 5); // the cap's lower edge
  g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h - 1, 5);
  const c = s.add.container(0, 0, [g, t]); c.kw = w; // not .w: Phaser uses .w for the transform's 4th coordinate, and setPosition() resets it
  return c;
}

// a centred row of [key] label pairs; the first pair is the main action (amber), the rest are cyan
function layoutHints(s, parent, list, y) {
  const items = list.map(([key, text], i) => {
    const cap = keyCap(s, key, i === 0 ? AMBER : CYAN), lab = s.add.text(0, 0, text, uiFont(14, '#9fe9ff')).setOrigin(0, 0.5);
    return { cap, lab, w: cap.kw + 7 + lab.width };
  });
  const total = items.reduce((a, it) => a + it.w, 0) + 26 * Math.max(0, items.length - 1);
  let x = -total / 2; const made = [];
  items.forEach(it => {
    it.cap.setPosition(x + it.cap.kw / 2, y); it.lab.setPosition(x + it.cap.kw + 7, y);
    parent.add([it.cap, it.lab]); made.push(it.cap, it.lab); x += it.w + 26;
  });
  return made;
}

// o: { w, h, title, x, y, depth, color, dim, foot }   returns { box, titleText, tagText, setHints(list), setVisible(v) }
// Content goes into box (a container centred on the panel), so (0, 0) is the middle of the panel.
function panel(s, o) {
  const w = o.w, h = o.h, c = o.color || CYAN;
  const box = s.add.container(o.x !== undefined ? o.x : W / 2, o.y !== undefined ? o.y : H / 2).setDepth(o.depth !== undefined ? o.depth : 150).setScrollFactor(0);
  const parts = [];
  if (o.dim) parts.push(s.add.rectangle(0, 0, W * 2, H * 2, 0x02050c, 0.55).setInteractive()); // dims the game and swallows clicks
  const g = s.add.graphics();
  g.fillStyle(UI_BG, 0.97); g.fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle(0x0d2a3f, 1); g.fillRect(-w / 2, -h / 2, w, 40);
  g.lineStyle(1, c, 0.4); g.lineBetween(-w / 2, -h / 2 + 40, w / 2, -h / 2 + 40);
  if (o.foot !== false) g.lineBetween(-w / 2, h / 2 - 44, w / 2, h / 2 - 44); // footer line above the key hints (foot: false leaves it out)
  g.lineStyle(2, c, 1); g.strokeRect(-w / 2, -h / 2, w, h);
  g.lineStyle(3, AMBER, 1); // amber corner brackets
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const x = sx * w / 2, y = sy * h / 2; g.lineBetween(x, y, x - sx * 18, y); g.lineBetween(x, y, x, y - sy * 18);
  });
  const title = s.add.text(-w / 2 + 18, -h / 2 + 20, o.title || '', uiFont(18, '#38e1ff')).setOrigin(0, 0.5);
  const tag = s.add.text(w / 2 - 18, -h / 2 + 20, '', uiFont(16, '#ffb454')).setOrigin(1, 0.5);
  box.add([...parts, g, title, tag]);
  return {
    box, w, h, titleText: title, tagText: tag, hintObjs: [], hintKey: '',
    setHints(list) { // cheap to call every frame: only rebuilds when the list changes
      const key = JSON.stringify(list);
      if (key === this.hintKey) return this;
      this.hintKey = key; this.hintObjs.forEach(x => x.destroy());
      this.hintObjs = layoutHints(s, box, list, h / 2 - 22); return this;
    },
    setVisible(v) { box.setVisible(v); return this; }
  };
}

// small filled/empty squares, e.g. upgrade tiers or risk; returns the Graphics (add it to a container)
function pips(s, x, y, n, of, color) {
  const g = s.add.graphics();
  for (let i = 0; i < of; i++) {
    g.fillStyle(i < n ? color : 0x1d3b5c, 1); g.fillRect(x + i * 15, y, 11, 8);
    if (i >= n) { g.lineStyle(1, color, 0.4); g.strokeRect(x + i * 15, y, 11, 8); }
  }
  return g;
}

// Types full into a Text a few characters per frame. Returns { done, skip() }; skip() shows it all at once.
function typewrite(s, textObj, full, cps = 70) {
  if (textObj._tw) textObj._tw.stop();
  let i = 0; textObj.setText('');
  const api = { done: false, skip() { if (!api.done) { api.stop(); textObj.setText(full); } }, stop() { api.done = true; ev.remove(false); } };
  const ev = s.time.addEvent({
    delay: 1000 / cps, loop: true, callback: () => {
      i = Math.min(full.length, i + 1); textObj.setText(full.slice(0, i));
      if (i % 3 === 0 && full[i - 1] !== ' ') beep(900 + (i % 5) * 40, 0.012, 'square', 0.004);
      if (i >= full.length) api.stop();
    }
  });
  textObj._tw = api;
  return api;
}

// Stands in for the old bottom-of-screen prompt Text: same setText('E  Do the thing') call, and .text still holds the string.
// The prompt shows a key cap plus the action in a small pill above the anchor sprite, or above at(x, y) when that was set.
function floatPrompt(s, anchor) {
  const box = s.add.container(0, 0).setDepth(120).setScrollFactor(0).setVisible(false);
  const api = {
    text: '', box, anchor, offsetY: -52, x: null, y: null, parts: [], pw: 0,
    at(x, y) { this.x = x; this.y = y; return this; },
    setVisible(v) { box.setVisible(v); return this; },
    setText(msg) {
      msg = msg || '';
      if (msg !== this.text) {
        this.text = msg; this.parts.forEach(p => p.destroy()); this.parts = [];
        if (msg) {
          const m = /^(\S{1,5})\s{2,}(.+)$/.exec(msg); // 'E  Talk to Juno' = key cap + action; anything else is a plain note
          const lab = s.add.text(0, 0, m ? m[2] : msg, uiFont(16, '#ffffff')).setOrigin(0, 0.5);
          const cap = m ? keyCap(s, m[1], AMBER) : null, capW = cap ? cap.kw + 8 : 0;
          const w = capW + lab.width + 26, h = 34, g = s.add.graphics();
          g.fillStyle(0x04101c, 0.92); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
          g.lineStyle(1, CYAN, 0.8); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
          lab.setPosition(-w / 2 + 13 + capW, 0);
          if (cap) cap.setPosition(-w / 2 + 13 + cap.kw / 2, 0);
          this.parts = cap ? [g, cap, lab] : [g, lab]; box.add(this.parts); this.pw = w;
        }
      }
      box.setVisible(!!msg);
      if (!msg) return this;
      let px, py;
      if (this.x !== null) { px = this.x; py = this.y; }
      else { const a = this.anchor, cam = s.cameras.main; px = a.x - cam.scrollX; py = a.y - cam.scrollY + this.offsetY; }
      px = Phaser.Math.Clamp(px, this.pw / 2 + 10, W - this.pw / 2 - 10);
      box.setPosition(px, py + Math.sin(s.time.now / 260) * 2.5); // a gentle bob
      return this;
    }
  };
  return api;
}

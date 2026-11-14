// ---------- The Journal: who you have met in the Drift bar, what they think of you, what you learned (docs/NPC-CHAT.md sections 4 and 5) ----------
// J in the station, or the Journal row in Pause, opens a panel over the paused scene; J or Esc closes it. It reads G.chat, which the memory card
// (space-game-npc-chat-memory) fills; until then there is nobody in it and it shows the empty state. It works with no key and never touches the network.
//   G.chat = { v, player: { name, notes }, npcs: { <id>: { met, chats, mood, notes, last } }, journal: [ { t, npc, fact } ] }   (npcs keeps meeting order)
// Everything read from G.chat is cleaned and clamped here too, so a hand-edited save cannot put anything odd on screen. Drawn as Phaser text only.

const JOURNAL_MOODS = { wary: ['WARY', 0xffd37a], neutral: ['NEUTRAL', 0x8fb4c9], warm: ['WARM', 0xffb454], fond: ['FOND', 0xff9ad8], cross: ['CROSS', 0xff4d6d] };
const JOURNAL_MAX = { name: 24, notes: 400, last: 160, fact: 120, people: 12, facts: 40 };

const jClean = (s, max) => typeof chatPlain === 'function' ? chatPlain(s, max) : String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064]/g, '').slice(0, max);
function journalEmpty() { return { v: 1, player: { name: '', notes: '' }, npcs: {}, journal: [] }; }
function journalChat() { const c = G.chat; return c && typeof c === 'object' ? c : journalEmpty(); }
function journalForget() { // the key is not here: it lives in the browser's own storage (src/chat.js) and stays
  if (typeof chatForget === 'function') chatForget(); else G.chat = journalEmpty();
  if (typeof saveGame === 'function') saveGame();
}

// the rows of the left column: YOU, then everyone met in meeting order. Each: { id, you, name, role, css, color, voice, mood, met, notes, last, facts }
function journalRows() {
  const c = journalChat(), p = c.player && typeof c.player === 'object' ? c.player : {}, list = Array.isArray(c.journal) ? c.journal.slice(-JOURNAL_MAX.facts) : [];
  const people = [], npcs = c.npcs && typeof c.npcs === 'object' ? c.npcs : {};
  Object.keys(npcs).slice(0, JOURNAL_MAX.people).forEach(id => {
    const rec = npcs[id]; if (!rec || typeof rec !== 'object') return;
    const row = typeof NPCS !== 'undefined' ? NPCS.find(n => n.id === id) : null;
    const mood = JOURNAL_MOODS[rec.mood] ? rec.mood : 'neutral';
    people.push({
      id, name: row ? row.name : jClean(id, JOURNAL_MAX.name).toUpperCase(), role: row ? row.role : '', css: row ? row.css : '#9fe9ff', color: row ? row.color : CYAN,
      voice: !!(row && row.voice), mood, met: Math.max(0, Math.min(9999, rec.met | 0)), notes: jClean(rec.notes, JOURNAL_MAX.notes), last: jClean(rec.last, JOURNAL_MAX.last),
      facts: list.filter(f => f && f.npc === id).map(f => jClean(f.fact, JOURNAL_MAX.fact)).filter(Boolean)
    });
  });
  const name = jClean(p.name, JOURNAL_MAX.name), notes = jClean(p.notes, JOURNAL_MAX.notes);
  if (!people.length && !name && !notes) return [];
  return [{ id: 'you', you: true, name: 'YOU', role: name || 'unnamed pilot', named: !!name, css: '#38e1ff', color: CYAN, notes }].concat(people);
}

function journalOpen(scene) { // scene: the scene to pause and come back to (Station, or Pause)
  if (scene.scene.manager.isActive('Journal')) return;
  scene.scene.pause(); scene.scene.launch('Journal', { from: scene.scene.key });
}

class Journal extends Phaser.Scene {
  constructor() { super('Journal'); }
  init(d) { this.from = (d && d.from) || 'Station'; this.sel = 0; this.armed = 0; this.closing = false; this.born = performance.now(); this.said = ''; }

  create() {
    this.rows = journalRows();
    this.ui = panel(this, { w: 900, h: 520, title: 'JOURNAL', dim: true, depth: 0 }); // src/ui.js: the same glass window as the mission board and the shop
    this.ui.setHints([['↑↓', 'Choose'], ['X', 'Forget everything'], ['J', 'Close']]);
    this.dyn = [];
    this.k = this.input.keyboard.addKeys('UP,DOWN,W,S,X,ESC');
    this.render();
  }

  pick(i) { if (!this.rows.length) return; const n = Phaser.Math.Wrap(i, 0, this.rows.length); if (n !== this.sel) { this.sel = n; beep(600, 0.04, 'square', 0.015); this.render(); } }

  // everything but the window frame is drawn again whenever something changes: it is a few dozen objects
  render() {
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    const box = this.ui.box, add = o => { box.add(o); this.dyn.push(o); return o; };
    const txt = (x, y, s, size, color, o = {}) => add(this.add.text(x, y, s, uiFont(size, color, o.style)).setOrigin(o.ox === undefined ? 0 : o.ox, o.oy === undefined ? 0.5 : o.oy));
    const g = add(this.add.graphics());
    const rows = this.rows, met = rows.filter(r => !r.you).length;
    this.ui.tagText.setText(met === 1 ? '1 PERSON MET' : met + ' PEOPLE MET');

    if (!rows.length) { // the empty state
      g.lineStyle(2, CYAN, 0.5); g.strokeRoundedRect(-34, -88, 68, 44, 10); g.fillStyle(CYAN, 0.12); g.fillRoundedRect(-34, -88, 68, 44, 10);
      g.fillStyle(CYAN, 0.5); g.fillTriangle(-14, -44, -4, -44, -18, -32);
      [-14, 0, 14].forEach(dx => { g.fillStyle(CYAN, 0.8); g.fillCircle(dx, -66, 3.5); });
      txt(0, -6, 'Nobody yet.', 26, '#9fe9ff', { ox: 0.5, style: { fontStyle: 'bold' } });
      txt(0, 28, 'Talk to someone in the Drift (E).', 16, '#8fb4c9', { ox: 0.5 });
    } else this.drawBody(g, add, txt);
    this.drawFoot(g, add, txt);
  }

  drawBody(g, add, txt) {
    const rows = this.rows, sel = rows[this.sel];
    // the divider between the two columns
    g.lineStyle(1, CYAN, 0.3); g.lineBetween(-160, -210, -160, 170);
    // left: one row each
    rows.forEach((r, i) => {
      const cy = -186 + i * 46, on = i === this.sel, col = r.color;
      if (on) { g.fillStyle(col, 0.13); g.fillRect(-432, cy - 21, 266, 42); g.fillStyle(AMBER, 1); g.fillRect(-432, cy - 21, 3, 42); }
      g.fillStyle(col, on ? 0.95 : 0.55); g.fillRect(-424, cy - 14, 3, 28);
      txt(-414, cy - 9, r.name, 16, on ? r.css : this.dim(r.css), { style: { fontStyle: 'bold' } });
      txt(-414, cy + 10, r.role, 11, on ? '#8fb4c9' : '#5b7a92');
      if (!r.you) {
        const m = JOURNAL_MOODS[r.mood][1];
        g.fillStyle(m, 0.2); hudDisc(g, -184, cy - 9, 9); g.fillStyle(m, 1); hudDisc(g, -184, cy - 9, 4.5);
        txt(-174, cy + 10, 'met ' + r.met, 11, on ? '#cfefff' : '#5b7a92', { ox: 1 });
        if (r.voice) this.speaker(g, -206, cy - 9, on ? 0x9fe9ff : 0x5b7a92); // a small speaker: they have a voice
      }
      const z = add(this.add.rectangle(-299, cy, 266, 42, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
      z.on('pointerdown', () => this.pick(i));
    });
    // right: the picked one
    const L = -142, W2 = 570;
    txt(L, -196, sel.you ? (sel.named ? sel.role.toUpperCase() : 'YOU') : sel.name, 24, sel.css, { style: { fontStyle: 'bold' } });
    if (sel.you) {
      txt(L, -168, sel.named ? 'you' : 'unnamed pilot. Tell someone your name.', 13, '#8fb4c9');
    } else {
      const m = JOURNAL_MOODS[sel.mood];
      const sub = txt(L, -168, sel.role + '   ', 13, '#8fb4c9');
      g.fillStyle(m[1], 1); hudDisc(g, L + sub.width + 6, -168, 4.5);
      txt(L + sub.width + 16, -168, m[0] + '   met ' + sel.met + (sel.met === 1 ? ' time' : ' times'), 13, hudCss(m[1]));
    }
    const sec = (y, label) => txt(L, y, label, 11, '#5b7a92', { style: { letterSpacing: 2 } });
    const body = (y, s, empty) => txt(L, y, s || empty, 14, s ? '#cfefff' : '#4d6579', { oy: 0, style: { wordWrap: { width: W2 }, lineSpacing: 4 } });
    if (sel.you) {
      sec(-136, 'WHAT THEY HAVE LEARNED ABOUT YOU'); body(-118, sel.notes, 'Nothing yet. Chat with someone and they will remember you.');
      sec(-24, 'ON THE STATION RECORD');
      const s = G.stats || {}, lines = ['Rescues paid  ' + (s.missions | 0), 'Pirates destroyed  ' + (s.drones | 0), 'Patrols finished  ' + (G.patrolsDone | 0)];
      lines.forEach((l, i) => txt(L, 0 + i * 22, l, 14, '#cfefff'));
    } else {
      sec(-136, 'WHAT THEY THINK OF YOU'); body(-118, sel.notes, 'No opinion yet. They will have one once you talk.');
      sec(-34, 'LAST TIME'); body(-16, sel.last ? '"' + sel.last + '"' : '', 'You have not really talked yet.');
      sec(34, 'WHAT YOU LEARNED');
      const facts = sel.facts.slice(-5).reverse();
      if (!facts.length) txt(L, 56, 'Nothing yet. What they tell you is written down here.', 14, '#4d6579', { oy: 0 });
      facts.forEach((f, i) => { g.fillStyle(AMBER, 0.9); g.fillRect(L, 62 + i * 22, 4, 4); txt(L + 12, 58 + i * 22, f, 13, '#cfefff', { oy: 0, style: { wordWrap: { width: W2 - 12 } } }); });
      if (sel.facts.length > 5) txt(L + 12, 58 + 5 * 22 - 2, '+ ' + (sel.facts.length - 5) + ' more', 12, '#5b7a92', { oy: 0 });
    }
  }

  drawFoot(g, add, txt) {
    g.lineStyle(1, CYAN, 0.3); g.lineBetween(-430, 176, 430, 176);
    const st = typeof chatStatus === 'function' ? chatStatus() : 'NO KEY', prov = typeof chatProvider === 'function' && typeof CHAT_PROVIDERS !== 'undefined' && CHAT_PROVIDERS[chatProvider()] ? CHAT_PROVIDERS[chatProvider()].name : '';
    const msg = st === 'ON' ? 'Chat ON (' + prov + ')' : st === 'KEY REJECTED' ? 'Chat off: the key was rejected. Pause > NPC chat' : st === 'OFF' ? 'Chat off. Pause > NPC chat' : 'Chat off: no key. Pause > NPC chat';
    g.fillStyle(st === 'ON' ? GREEN : 0x5b7a92, 1); hudDisc(g, -424, 196, 4.5);
    txt(-412, 196, msg, 13, st === 'ON' ? '#6dff9c' : '#8fb4c9');
    // Forget everything: a second press erases
    const armed = !!this.armed, w = 232, x = 314, y = 196, col = armed ? RED : 0x3a5a78;
    g.fillStyle(armed ? 0x2a0a12 : 0x0a1b2c, 1); g.fillRect(x - w / 2, y - 14, w, 28); g.lineStyle(armed ? 2 : 1, col, 1); g.strokeRect(x - w / 2, y - 14, w, 28);
    txt(x, y, this.said ? this.said : armed ? 'PRESS AGAIN TO ERASE' : 'FORGET EVERYTHING', 13, armed ? '#ff4d6d' : '#9fe9ff', { ox: 0.5, style: { fontStyle: 'bold', letterSpacing: 1 } });
    const z = add(this.add.rectangle(x, y, w, 28, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => this.forget());
  }

  // the first press arms it for four seconds, the second one clears everything the game has learned (the key stays: it is not in the save)
  forget() {
    if (this.closing) return;
    if (!this.armed) { this.armed = performance.now() + 4000; this.said = ''; beep(300, 0.1, 'sawtooth', 0.02); this.render(); return; }
    journalForget(); this.armed = 0; this.rows = journalRows(); this.sel = 0; this.said = 'FORGOTTEN';
    beep(220, 0.2, 'triangle', 0.03, -80); this.render();
  }

  dim(css) { const c = Phaser.Display.Color.HexStringToColor(css); return Phaser.Display.Color.RGBToString(Math.round(c.r * 0.72), Math.round(c.g * 0.72), Math.round(c.b * 0.72), 0, '#'); }
  speaker(g, x, y, col) { // a little loudspeaker: a box, a cone, two waves
    g.fillStyle(col, 1); g.fillRect(x - 5, y - 2, 3, 4); g.fillTriangle(x - 2, y - 2, x + 2, y - 5, x + 2, y + 5); g.fillTriangle(x - 2, y - 2, x - 2, y + 2, x + 2, y + 5);
    g.lineStyle(1.2, col, 0.9); g.beginPath(); g.arc(x + 2, y, 4, -0.9, 0.9); g.strokePath(); g.beginPath(); g.arc(x + 2, y, 7, -0.9, 0.9); g.strokePath();
  }

  close() {
    if (this.closing) return; this.closing = true;
    const sc = this.scene.get(this.from); // keys released while the Journal was open are never seen: clear them so nothing sticks
    if (sc && sc.input && sc.input.keyboard) sc.input.keyboard.resetKeys();
    this.scene.stop(); this.scene.resume(this.from);
  }

  update() {
    const JD = Phaser.Input.Keyboard.JustDown, k = this.k;
    const esc = JD(k.ESC); // always consume it: the Esc that closed something just before may still be flagged
    if (esc && performance.now() - this.born > 200) { this.close(); return; }
    if (JD(k.UP) || JD(k.W)) this.pick(this.sel - 1);
    if (JD(k.DOWN) || JD(k.S)) this.pick(this.sel + 1);
    if (JD(k.X)) this.forget();
    if (this.armed && performance.now() > this.armed) { this.armed = 0; this.render(); } // not confirmed in time: it disarms
  }
}

// J opens and closes it. Called once from main.js. In the station only (not while a terminal, the shop or a talk is open), or from Pause.
function installJournal(game) {
  window.addEventListener('keydown', e => {
    if (e.repeat || e.code !== 'KeyJ' || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; // typing in a field (the key setup, a chat line)
    if (game.scene.isActive('Journal')) { game.scene.getScene('Journal').close(); return; }
    const s = game.scene.getScenes(true).find(sc => sc.scene.key === 'Station');
    if (!s || s.leaving || s.panel || s.talk || s.shopOpen) return;
    journalOpen(s);
  });
}

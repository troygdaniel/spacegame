// ---------- Mod packs: folders of content laid over the shipped game, turned on in the Mods screen (docs/MODDING.md 13) ----------
// A pack is a folder like content/ (missions/, npcs/, ...) with an optional _pack.md label. It comes from one of two places:
//   built   a folder in mods/, written into mods.generated.js by node tools/build-content.mjs (the global MODS), checked on its own
//   picked  a folder the player chose in the Mods screen (an <input webkitdirectory>), read and checked here by the same src/content.js
//           parser, then kept in this browser (localStorage) so it does not have to be picked again: no Node, no server
// Packs are OFF until the player turns them on (the example pack ships off, so the shipped game is the shipped game). The ones that are on
// are laid over the core pack in name order, so a later name wins where two say the same thing. The adapters of src/contenttables.js
// change the built-in row in place, so a pack's change needs a restart to take effect AND to come off: the screen says so and offers it.
// Everything a pack says is checked again here, field by field (ContentLib.apply), whoever wrote it, so a hand-edited or tampered
// pack, built or picked, can only be refused, never break the game. The game starts regardless.
// Called from contentApply() in boot.js (modsApply) and from the Title screen (the O key opens the Mods screen: ModsSetup).

const MODS_ON_KEY = 'longhaul.mods.on', MODS_PICKED_KEY = 'longhaul.mods.picked';
const MODS_STATE = { boot: '' }; // what was on and picked when the game started, to tell the player when a restart is needed

const modsHas = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const modsGet = key => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const modsPut = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } };

// the names of the packs the player turned on (anything that is not a pack name is dropped)
function modsOnList() {
  const v = modsGet(MODS_ON_KEY), L = ContentLib.LIMITS;
  return Array.isArray(v) ? v.filter(n => ContentLib.packName(n)).slice(0, L.packs) : [];
}
// the packs the player picked, as kept in this browser: only the shape is checked here, ContentLib.apply checks every entry
function modsPickedList() {
  const v = modsGet(MODS_PICKED_KEY), L = ContentLib.LIMITS;
  if (!Array.isArray(v)) return [];
  return v.filter(p => p && typeof p === 'object' && ContentLib.packName(p.name) && Array.isArray(p.entries) && p.entries.length <= L.files).slice(0, L.packs).map(p => modsPack(p, 'picked'));
}
// one pack as the game and the screen use it: only strings and arrays, whatever was stored
const modsPack = (p, source) => ({
  name: p.name, title: typeof p.title === 'string' ? p.title.slice(0, 40) : '', author: typeof p.author === 'string' ? p.author.slice(0, 40) : '', about: typeof p.about === 'string' ? p.about.slice(0, 200) : '',
  files: +p.files > 0 ? +p.files | 0 : 0, hash: typeof p.hash === 'string' ? p.hash.slice(0, 16) : '', entries: Array.isArray(p.entries) ? p.entries : [], errors: Array.isArray(p.errors) ? p.errors : [], source
});
// every pack there is, in name order: the built ones, then the picked ones (a picked pack with the name of a built one replaces it)
function modsAvailable() {
  const by = new Map(), L = ContentLib.LIMITS;
  const built = typeof MODS !== 'undefined' && MODS && Array.isArray(MODS.packs) ? MODS.packs : [];
  built.forEach(p => { if (p && typeof p === 'object' && ContentLib.packName(p.name)) by.set(p.name, modsPack(p, 'built')); });
  modsPickedList().forEach(p => by.set(p.name, p));
  return [...by.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, L.packs);
}
const modsSignature = () => JSON.stringify([modsOnList().slice().sort(), modsPickedList().map(p => p.name + ':' + p.hash)]);

// lay the packs that are on over the core pack. Never throws.
function modsApply() {
  try {
    const on = new Set(modsOnList()), packs = modsAvailable(), list = [];
    MODS_STATE.boot = modsSignature();
    // folders of mods/ that were not packs: the build said so, and it is shown whether or not any pack is on
    (typeof MODS !== 'undefined' && MODS && Array.isArray(MODS.errors) ? MODS.errors : []).slice(0, 20).forEach(e => {
      if (e && typeof e.message === 'string') CONTENT_ERRORS.push({ level: e.level === 'warn' ? 'warn' : 'error', path: String(e.path || 'mods').slice(0, 200), line: 0, field: '', message: String(e.message).slice(0, 300) });
    });
    packs.forEach(p => {
      const row = { name: p.name, title: p.title, author: p.author, about: p.about, source: p.source, files: p.files, problems: p.errors.length, on: on.has(p.name), applied: 0, skipped: 0 };
      list.push(row);
      if (!row.on) return;
      const r = ContentLib.apply({ entries: p.entries, hash: p.hash, files: p.files, errors: p.errors }, CONTENT_TABLES);
      row.applied = r.applied.length; row.skipped = r.skipped;
      // errors name the pack: its files already carry mods/<name>/ in their path; what has none (the pack as a whole) gets it too
      r.errors.forEach(e => { if (e.path === 'content.generated.js') e.path = 'mods/' + p.name; e.pack = p.name; CONTENT_ERRORS.push(e); });
    });
    CONTENT_STATE.packs = list;
    if (list.some(r => r.on)) CONTENT_STATE.modded = true; // the Title says MODDED whenever a pack is on
  } catch (e) {
    CONTENT_ERRORS.push({ level: 'error', path: 'mods', line: 0, field: '', message: 'the mod packs could not be read (' + String(e && e.message || e).slice(0, 100) + '). Playing without them.' });
  }
}

// ---------- turning packs on and off, picking and removing a folder ----------
function modsSetOn(name, on) {
  const cur = modsOnList().filter(n => n !== name);
  if (on) cur.push(name);
  return modsPut(MODS_ON_KEY, cur);
}
function modsRemovePicked(name) {
  const rest = modsPickedList().filter(p => p.name !== name);
  modsPut(MODS_PICKED_KEY, rest.map(modsKeep));
  modsSetOn(name, false);
}
const modsKeep = p => ({ name: p.name, title: p.title, author: p.author, about: p.about, files: p.files, hash: p.hash, entries: p.entries, errors: p.errors });

// something the core pack or the game defines, so a picked pack may refer to it (a station, a system) without a file of its own
function modsKnown(ref, id) {
  try {
    if (typeof CONTENT !== 'undefined' && CONTENT && Array.isArray(CONTENT.entries) && CONTENT.entries.some(e => e && e.type === ref && e.id === id)) return true;
    if (ref === 'system') return modsHas(SYSTEMS, id);
    if (ref === 'station') return !!ctStationRow(id);
    const t = CONTENT_TABLES[ref];
    return !!(t && t.has && t.has(id));
  } catch (e) { return false; }
}

// A folder the player picked: files = the File objects of an <input webkitdirectory> (each has webkitRelativePath 'folder/missions/rescue.md').
// Reads the markdown with the same parser as the build, keeps the pack in this browser and turns it on. Returns { ok, name, message }.
// Reading is bounded before it starts: at most L.files + 1 files, none over the file limit is read at all (the pack gets that problem instead).
async function modsPickFiles(files) {
  const L = ContentLib.LIMITS;
  try {
    const all = Array.from(files || []).filter(f => f && typeof f.name === 'string');
    if (!all.length) return { ok: false, message: 'That folder has no files in it.' };
    const rel = f => String(f.webkitRelativePath || f.name).replace(/\\/g, '/');
    const root = rel(all[0]).split('/')[0], slug = root.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^[^a-z]+/, '').slice(0, 40);
    if (!ContentLib.packName(slug)) return { ok: false, message: 'The folder name "' + root.slice(0, 30) + '" cannot be a pack name. Rename it with lower-case letters, digits and dashes, starting with a letter.' };
    const name = slug, prefix = 'mods/' + name + '/', extra = [], keep = [];
    for (const f of all) {
      const parts = rel(f).split('/').slice(1); // inside the folder
      if (!parts.length || parts.some(s => !s || (s[0] === '_' && parts.join('/') !== '_pack.md') || s[0] === '.') || !/\.md$/i.test(parts[parts.length - 1])) continue;
      if (keep.length > L.files) break;
      const path = prefix + parts.join('/');
      if (f.size > L.fileBytes) { extra.push({ level: 'error', path, line: 0, field: '', message: 'the file is ' + Math.ceil(f.size / 1024) + ' KB but the limit is ' + L.fileBytes / 1024 + ' KB. Skipped the file.' }); continue; }
      keep.push({ path, text: await f.text() });
    }
    if (!keep.length && !extra.length) return { ok: false, message: 'That folder has no .md files in it. A pack has folders like missions/ and npcs/ with .md files.' };
    const pack = ContentLib.loadPack(name, keep, { known: modsKnown });
    extra.forEach(e => pack.errors.push(e));
    if (JSON.stringify(pack).length > L.packBytes) return { ok: false, message: 'That pack is too big to keep in this browser (the limit is ' + Math.round(L.packBytes / 1024) + ' KB).' };
    const rest = modsPickedList().filter(p => p.name !== name), built = (typeof MODS !== 'undefined' && MODS && Array.isArray(MODS.packs) ? MODS.packs : []).filter(p => p && p.name !== name);
    if (rest.length + built.length + 1 > L.packs) return { ok: false, message: 'There are already ' + L.packs + ' packs. Remove one first.' };
    if (!modsPut(MODS_PICKED_KEY, rest.map(modsKeep).concat([modsKeep(pack)]))) return { ok: false, message: 'This browser would not keep the pack (its storage is full or switched off).' };
    modsSetOn(name, true);
    const bad = pack.errors.length;
    return { ok: true, name, message: 'Picked "' + name + '": ' + pack.files + (pack.files === 1 ? ' file, ' : ' files, ') + (bad ? bad + (bad === 1 ? ' problem' : ' problems') : 'no problems') + '. It is on: restart to apply.' };
  } catch (e) {
    return { ok: false, message: 'That folder could not be read (' + String(e && e.message || e).slice(0, 80) + ').' };
  }
}

// ---------- the Mods screen (Title, key O) ----------
class ModsSetup extends Phaser.Scene {
  constructor() { super('ModsSetup'); }
  init(d) { this.from = (d && d.from) || 'Title'; this.closing = false; this.note = ''; this.noteColor = '#9fe9ff'; }
  create() {
    const w = 900, h = 600;
    this.ui = panel(this, { w, h, title: 'MODS  -  OPTIONAL', dim: true, depth: 0 });
    const box = this.ui.box;
    this.add_ = o => { box.add(o); return o; };
    const intro = this.add.text(-w / 2 + 40, -h / 2 + 58, 'A pack is a folder of text files that changes what the game says and pays. Packs are off until you turn them on. A change applies when the game restarts.', uiFont(15, '#cfefff', { wordWrap: { width: w - 80 }, lineSpacing: 4 }));
    this.add_(intro);
    this.rowObjs = [];
    this.status = this.add_(this.add.text(0, 134, '', uiFont(15, '#9fe9ff', { wordWrap: { width: w - 80 }, align: 'center' })).setOrigin(0.5, 0));
    const btn = (label, x, fn) => {
      const bw = 250, bg = this.add_(this.add.rectangle(x, 210, bw, 40, 0x0a1b2c, 1).setStrokeStyle(2, CYAN, 0.9).setInteractive({ useHandCursor: true }));
      const t = this.add_(this.add.text(x, 210, label, uiFont(16, '#9fe9ff')).setOrigin(0.5));
      bg.on('pointerover', () => bg.setFillStyle(0x10283d)); bg.on('pointerout', () => bg.setFillStyle(0x0a1b2c)); bg.on('pointerdown', fn);
      return { bg, t };
    };
    this.pickBtn = btn('Pick a folder', -150, () => this.pick());
    this.restartBtn = btn('Restart to apply', 150, () => this.restart());
    this.ui.setHints([['1-6', 'Turn a pack on or off'], ['F', 'Pick a folder'], ['R', 'Restart'], ['Esc', 'Back']]);

    // the folder picker: a real <input webkitdirectory>, kept in the page so a test (or a screen reader) can find it
    const el = this.el = document.createElement('input');
    el.type = 'file'; el.multiple = true; el.setAttribute('webkitdirectory', ''); el.setAttribute('data-mods-picker', '1'); el.style.display = 'none';
    el.addEventListener('change', () => { const f = Array.from(el.files || []); el.value = ''; this.picked(f); });
    document.body.appendChild(el);
    this.events.once('shutdown', () => this.dropInput());
    this.k = this.input.keyboard.addKeys('ESC,F,R,ONE,TWO,THREE,FOUR,FIVE,SIX');
    this.born = performance.now();
    this.refresh();
  }
  // the rows: one pack each, six at most on the screen
  refresh() {
    this.rowObjs.forEach(o => o.destroy()); this.rowObjs = [];
    const packs = modsAvailable(), on = new Set(modsOnList()), box = this.ui.box, w = this.ui.w;
    const shown = packs.slice(0, 6), y0 = -170;
    this.shown = shown;
    shown.forEach((p, i) => {
      const y = y0 + i * 52, isOn = on.has(p.name), add = o => { this.rowObjs.push(o); box.add(o); return o; };
      const g = add(this.add.graphics());
      g.lineStyle(2, isOn ? 0x6dff9c : 0x5b7a92, 1); g.strokeRect(-w / 2 + 40, y - 13, 26, 26);
      if (isOn) { g.fillStyle(0x6dff9c, 1); g.fillRect(-w / 2 + 46, y - 7, 14, 14); }
      add(this.add.text(-w / 2 + 80, y - 17, (i + 1) + '  ' + p.name + (p.title ? '   ' + p.title : ''), uiFont(17, isOn ? '#6dff9c' : '#9fe9ff', { fontStyle: 'bold' })));
      add(this.add.text(-w / 2 + 80, y + 4, (t => (t.length > 100 ? t.slice(0, 98).replace(/[ ,.]+$/, '') + '..' : t))(p.about || (p.author ? 'by ' + p.author : '')), uiFont(13, '#5b7a92')));
      const bad = p.errors.length;
      add(this.add.text(w / 2 - (p.source === 'picked' ? 130 : 40), y - 9, p.files + (p.files === 1 ? ' file' : ' files') + '   ' + (bad ? bad + (bad === 1 ? ' problem' : ' problems') : 'no problems') + '   ' + (p.source === 'picked' ? 'picked here' : 'from mods/'),
        uiFont(13, bad ? '#ffd37a' : '#5b7a92')).setOrigin(1, 0));
      const hit = add(this.add.zone(-w / 2 + 40 + 330, y, 700, 44).setInteractive({ useHandCursor: true }));
      hit.on('pointerdown', () => this.toggle(i));
      if (p.source === 'picked') {
        const rb = add(this.add.rectangle(w / 2 - 80, y, 84, 28, 0x2a0b14, 1).setStrokeStyle(1, 0xff4d6d, 0.9).setInteractive({ useHandCursor: true }));
        add(this.add.text(w / 2 - 80, y, 'REMOVE', uiFont(12, '#ff8da1')).setOrigin(0.5));
        rb.on('pointerdown', () => { modsRemovePicked(p.name); this.say('Removed "' + p.name + '" from this browser.'); this.refresh(); });
      }
    });
    if (!shown.length) this.rowObjs.push(this.add_(this.add.text(0, -120, 'No packs yet. Pick a folder, or put one in the mods/ folder and run node tools/build-content.mjs.', uiFont(16, '#5b7a92', { wordWrap: { width: w - 120 }, align: 'center' })).setOrigin(0.5)));
    if (packs.length > shown.length) this.rowObjs.push(this.add_(this.add.text(0, y0 + 6 * 52 - 22, 'and ' + (packs.length - shown.length) + ' more packs (remove one to see them)', uiFont(13, '#5b7a92')).setOrigin(0.5, 0)));
    const changed = modsSignature() !== MODS_STATE.boot;
    this.restartBtn.bg.setAlpha(changed ? 1 : 0.35); this.restartBtn.t.setAlpha(changed ? 1 : 0.35);
    this.ui.tagText.setText(on.size + (on.size === 1 ? ' PACK ON' : ' PACKS ON')).setColor(on.size ? '#6dff9c' : '#ffb454');
    this.status.setText(this.note || (changed ? 'Something changed. Restart to apply it.' : 'Nothing to restart.')).setColor(this.note ? this.noteColor : (changed ? '#ffd37a' : '#5b7a92'));
  }
  say(msg, color) { this.note = msg; this.noteColor = color || '#9fe9ff'; }
  toggle(i) {
    const p = this.shown && this.shown[i]; if (!p) return;
    const on = !modsOnList().includes(p.name);
    modsSetOn(p.name, on); this.say(''); this.refresh();
  }
  pick() { try { this.el.click(); } catch (e) { this.say('This browser cannot open a folder picker.', '#ff4d6d'); this.refresh(); } }
  async picked(files) {
    this.say('Reading the folder...', '#ffd37a'); this.refresh();
    const r = await modsPickFiles(files);
    if (!this.scene.isActive()) return;
    this.say(r.message, r.ok ? '#6dff9c' : '#ff4d6d'); this.refresh();
  }
  restart() { if (modsSignature() === MODS_STATE.boot) return; try { location.reload(); } catch (e) { this.say('Close the page and open it again.', '#ffd37a'); this.refresh(); } }
  dropInput() { if (this.el) { this.el.remove(); this.el = null; } }
  close() {
    if (this.closing) return; this.closing = true; this.dropInput();
    const from = this.from, back = this.scene.get(from);
    if (back && back.k && back.k.ESC) Phaser.Input.Keyboard.JustDown(back.k.ESC);
    this.scene.stop(); this.scene.resume(from);
  }
  update() {
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.k.ESC) && performance.now() - this.born > 200) { this.close(); return; }
    if (JD(this.k.F)) this.pick();
    if (JD(this.k.R)) this.restart();
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((n, i) => { if (JD(this.k[n])) this.toggle(i); });
  }
}

function modsOpenSetup(scene) { // scene: the scene to pause and come back to (Title)
  if (scene.scene.manager.isActive('ModsSetup')) return;
  scene.scene.pause(); scene.scene.launch('ModsSetup', { from: scene.scene.key });
}

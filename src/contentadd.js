// ---------- Adding new things from markdown (card space-game-m9-add-new, docs/MODDING.md section 12) ----------
// src/contenttables.js lets a file CHANGE what the game already has. This file lets a file ADD something the game does not have yet: a voice
// line, a character for the bar, a call on the mission board, a ship for sale. Each type keeps to the same promises:
//   - a file with an id the code does not know becomes a new row, built from the file and from safe defaults; a field the file leaves out
//     is filled in from those defaults, so a short file is enough
//   - a new row is checked before it is put in (all or nothing: a file that cannot become a whole row adds nothing) and is counted:
//     CA_MAX is how many of each type a pack may add, and the rest are refused with a message that says so
//   - it never takes the place of a built-in row: an id the code already has is a change to that row, as before
//   - nothing here throws out of an adapter into the game: ContentLib.apply (src/content.js) catches it and reports it with the file's name
// The adapters are the ones registered in contenttables.js, wrapped here, so everything that file does for a change stays as it was.
// The types, in the order of the file:
//   voice    lines the ship computer says for an event (VOICE_ADDED in src/voice.js)
const CA_MAX = { voice: 40 };
const caHas = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ---- voice: lines for an event ----
// A voice file is not a row of a table: its id (the file name) only keeps one file's lines apart from another's, so applying the same file twice
// replaces its lines instead of adding them again.
const CA_VOICE = {
  canAdd: true,
  has: id => VOICE_ADDED.has(id),
  get: () => undefined,
  apply: (id, data) => {
    if (!Array.isArray(data.lines) || !data.lines.length) throw new Error('a voice file needs a Lines list with at least one line');
    if (!VOICE_ADDED.has(id) && VOICE_ADDED.size >= CA_MAX.voice) throw new Error('a pack may add at most ' + CA_MAX.voice + ' voice files and there are that many already');
    VOICE_ADDED.set(id, { event: data.event, lines: data.lines.slice(), replace: data.replace === true });
  }
};
CONTENT_TABLES.voice = CA_VOICE;

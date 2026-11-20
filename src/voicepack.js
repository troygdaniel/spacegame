// ---------- The voice pack: the lines that repeat, recorded once (card space-game-voice-pack; Troy, 20 Nov 2026) ----------
// "Should we record the voice lines that repeat to reduce costs? Yes." The ship's voice (Deepgram Aura, the player's own key) used to call Deepgram for every line it had not said this session. A fixed line (the ship computer's,
// the wing's radio, the story, the briefings) says the same words every time, so tools/voicepack.mjs renders each once into an mp3 under voicepack/ and src/voice.js plays it from there: a repeated line costs nothing,
// the game speaks its fixed lines with NO key (whoever takes the game needs no key for them), and only a line that is not in the pack (free text, a character's reply, a line with a number or a name in it) is a Deepgram call.
// This file is the PURE half: the hash that names a line, the index, the lookup, and the CATALOGUE, the list of every fixed line the game can speak. No Phaser, no page, no network: tests/voicepack.mjs runs it in Node
// and the tool imports the same functions through tests/nodegame.mjs, so the game and the tool can never disagree about a name.
//   voicePackId(text, voice)           the name of a line: <voice>-<hash of voice and text>; the file is <name>.mp3 in voicepack/, the entry of the index has the same name
//   voicePackSetIndex(index)           the index (voicepack/index.json) as read: { v: 1, lines: { <name>: { text, voice, bytes, source } } }; false for anything else (a bad file is no pack)
//   voicePackFind(text, voice)         { id, voice, entry } when that exact line (text and voice) is in the pack, else null
//   voicePackPick(text, voice)         what the game plays for a line: the pack's, or null; a ship line the player has no key for falls back to the pack's own voice (athena)
//   voicePackLoad(fetchFn)             read voicepack/index.json once (the game does it at start; a missing or bad file is "no pack" and the game is as before)
//   voicePackStatus()                  'none' | 'loading' | 'empty' (an index with no line) | 'ready' (at least one recorded line)
//   voicePackCatalogue(opts)           { lines: [{ id, text, voice, source, key }], skipped: [{ source, key, text, why }], live: [{ where, why }] }: the fixed lines to record, the lines that are NOT (with the reason),
//                                       and the places that speak free text; opts.voices: the ship voices to record (default the ship's own, athena)
//   voicePackSource(src)               a card adds its own source: { id, voice: 'ship' | 'pilots' | an Aura name, lines: () => [text] } or { ..., keys: () => [UI_TEXT keys] }; the text is read when the tool runs, so a changed line is a new name
const VOICEPACK = { dir: 'voicepack', index: null, state: 'none', cache: new Map(), cacheMax: 64, version: 1, max: 6000, ship: 'aura-athena-en' }; // cache: decoded lines kept for the session (the pack's own, apart from the ship's 40); ship: the voice a player with no key and another choice hears

// the name of a line. A hash of the voice and the exact words (cyrb53: 53 bits, the same in the browser and in Node, no crypto needed), behind the voice's short name so the folder reads
function voicePackHash(s, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
const voicePackShort = voice => String(voice).replace(/^aura-(?:2-)?/, '').replace(/-en$/, '');
const voicePackId = (text, voice) => voicePackShort(voice) + '-' + voicePackHash(String(voice) + '|' + String(text));
const voicePackFile = id => id + '.mp3';

// ---- the index ----
function voicePackSetIndex(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== VOICEPACK.version || !raw.lines || typeof raw.lines !== 'object') return false;
  const ids = Object.keys(raw.lines); if (ids.length > VOICEPACK.max) return false;
  const m = new Map();
  ids.forEach(id => { const e = raw.lines[id]; if (/^[a-z0-9-]{3,60}$/.test(id) && e && typeof e.text === 'string' && typeof e.voice === 'string' && voicePackId(e.text, e.voice) === id) m.set(id, { text: e.text, voice: e.voice, bytes: e.bytes | 0, source: String(e.source || '') }); }); // an entry whose name is not its own hash is dropped: a hand edit cannot make a line say another
  VOICEPACK.index = m; VOICEPACK.state = m.size ? 'ready' : 'empty'; return true; // an index with no line in it is a pack with nothing recorded yet: the game is exactly as before
}
function voicePackFind(text, voice) {
  if (!VOICEPACK.index || typeof text !== 'string' || typeof voice !== 'string') return null;
  const id = voicePackId(text, voice), entry = VOICEPACK.index.get(id);
  return entry && entry.text === text && entry.voice === voice ? { id, voice, entry } : null;
}
// what the game plays: the line in the voice it is asked in; a ship line (the voice is the ship's) without a key falls back to the pack's own ship voice, so a player who has no key and picked another voice still hears the recorded lines
function voicePackPick(text, voice, shipVoice, hasKey) {
  const hit = voicePackFind(text, voice);
  if (hit) return hit;
  if (!hasKey && shipVoice && voice === shipVoice && voice !== VOICEPACK.ship) return voicePackFind(text, VOICEPACK.ship);
  return null;
}
const voicePackStatus = () => VOICEPACK.state;
async function voicePackLoad(fetchFn) {
  if (VOICEPACK.state !== 'none') return VOICEPACK.state === 'ready';
  const f = fetchFn || (typeof fetch === 'function' ? fetch : null); if (!f) return false;
  VOICEPACK.state = 'loading';
  try {
    const res = await f(VOICEPACK.dir + '/index.json');
    if (!res || !res.ok) { if (VOICEPACK.state === 'loading') VOICEPACK.state = 'none'; return false; }
    const raw = await res.json();
    if (VOICEPACK.state !== 'loading') return VOICEPACK.state === 'ready'; // an index was set meanwhile (a test's, a reload): the later word stands
    const ok = voicePackSetIndex(raw);
    if (!ok) VOICEPACK.state = 'none';
    return ok;
  } catch (e) { VOICEPACK.state = 'none'; return false; }
}

// ---- the catalogue: every fixed line the game can speak ----
// A line is FIXED when it has no {placeholder}: the same words every time. The tool records those. A line with a number or a name in it is either EXPANDED (a finite set of values the game's own data names: the outposts, the warp
// destinations) or kept LIVE (spoken through Deepgram when the player has a key), and the catalogue says which and why. Where the game speaks free text (a model's answer, a character's reply) there is nothing to record: `live`.
const vpHasVar = t => /\{[a-z0-9_]+\}/i.test(t);
const vpKeys = re => (typeof UI_TEXT === 'object' ? Object.keys(UI_TEXT) : []).filter(k => re.test(k)).sort();
const vpText = k => String(UI_TEXT[k]);
// the places of the game's own data that give a name or a number to a line: finite, so the line can be recorded for each
function vpOutposts() { const names = [], places = []; if (typeof campOutposts === 'function' && typeof CAMP === 'object') Object.keys(CAMP.levels).forEach(lv => campOutposts(lv).forEach(o => { if (names.indexOf(o.name) < 0) names.push(o.name); if (places.indexOf(o.place) < 0) places.push(o.place); })); return { names, places }; }
function vpWarps() { const out = []; if (typeof CAMP === 'object') Object.keys(CAMP.levels).forEach(lv => { const w = CAMP.levels[lv].warp; if (w && w.dest) out.push({ dest: w.dest || '', ly: w.ly || '' }); }); return out; }
// the convoys' names (a level's own and its missions': the haulers, Mars, Eros ...), the most caches of a level, and the scan points of each mission: what the sim says in the words of camp.say.convoy, .cache, .scanned
function vpConvoyNames() {
  const out = []; if (typeof CAMP !== 'object') return out;
  const add = (L, cv) => { const pl = (L.places || CAMP.places || {}), n = cv.name || (pl[cv.to] && pl[cv.to].name); if (n && out.indexOf(String(n)) < 0) out.push(String(n)); const d = pl[cv.to] && pl[cv.to].name; if (d && out.indexOf(String(d)) < 0) out.push(String(d)); };
  Object.keys(CAMP.levels).forEach(lv => { const L = CAMP.levels[lv]; (L.convoys || []).forEach(cv => add(L, cv)); (L.missions || []).forEach(m => (m.convoys || []).forEach(cv => add(L, cv))); });
  return out;
}
const vpRange = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
function vpCaches() { let max = 0; if (typeof CAMP === 'object') Object.keys(CAMP.levels).forEach(lv => { const L = CAMP.levels[lv]; max = Math.max(max, (L.caches || []).length); (L.missions || []).forEach(m => { max = Math.max(max, (m.caches || []).length); }); }); return max; }
function vpScans() { const out = []; if (typeof CAMP === 'object') Object.keys(CAMP.levels).forEach(lv => (CAMP.levels[lv].missions || []).forEach(m => (m.objectives || []).forEach(o => { if (o.type === 'scan') vpRange(1, o.points.length).forEach(n => { if (!out.some(x => x.n === n && x.of === o.points.length)) out.push({ n, of: o.points.length }); }); }))); return out; }
// lines with a name or a number that the game's own tables enumerate: key -> the sets of values (each a { var: value } object) to fill them with
const VOICEPACK_EXPAND = {
  'camp.say.dock': () => vpOutposts().names.map(name => ({ name })),
  'camp.say.retreatnear': () => vpOutposts().places.map(name => ({ name })),
  'camp.no.hotdock': () => vpOutposts().names.map(name => ({ name })),
  'camp.say.build': () => ['fighter', 'escort'].reduce((acc, k) => acc.concat(vpRange(1, (typeof CAMP === 'object' ? CAMP.build.most : 5)).map(n => ({ n, kind: n === 1 ? k : k + 's' }))), []), // "Building 3 fighters."
  'camp.say.built': () => ['fighter', 'escort'].map(kind => ({ kind })),
  'camp.say.convoy': () => vpConvoyNames().map(name => ({ name })), 'camp.say.convoylost': () => vpConvoyNames().map(name => ({ name })), 'camp.say.delivered': () => vpConvoyNames().map(name => ({ name })),
  'camp.say.escort': () => vpConvoyNames().map(name => ({ name })), 'camp.say.hauler': () => vpConvoyNames().map(name => ({ name })),
  'camp.say.cache': () => vpRange(1, vpCaches()).map(n => ({ n })),
  'camp.say.scanned': () => vpScans(),
  'camp.warp.l2': () => vpWarps(),
  'camp.warp.l3': () => vpWarps()
};
const vpFill = (t, vars) => String(t).replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
const VOICEPACK_SOURCES = [];
function voicePackSource(src) { if (src && src.id && (typeof src.lines === 'function' || typeof src.keys === 'function')) { const i = VOICEPACK_SOURCES.findIndex(s => s.id === src.id); if (i >= 0) VOICEPACK_SOURCES[i] = src; else VOICEPACK_SOURCES.push(src); } return VOICEPACK_SOURCES.length; }
// the sources the game has: where each one is spoken (the call that says it) and what its lines are. A key list is read from UI_TEXT at run time, so a new line in a content file is in the catalogue the next time the tool runs
voicePackSource({ id: 'events', voice: 'ship', lines: () => { const out = []; const walk = o => Object.keys(o).forEach(k => typeof o[k] === 'string' ? out.push(o[k]) : walk(o[k])); if (typeof VOICE_LINES === 'object') walk(VOICE_LINES); return out; } }); // src/voice.js VOICE_LINES: launch, hull, hostile, docked, touchdown, the four accepted calls, failed, lost, ending, fuel, the test line
voicePackSource({ id: 'campaign.say', voice: 'ship', keys: () => vpKeys(/^camp\.say\./) }); // the ship computer's lines on a sim event (campSay) and an order's answer
voicePackSource({ id: 'campaign.no', voice: 'ship', keys: () => vpKeys(/^camp\.no\./) }); // the refusals the strip and the voice answer with
voicePackSource({ id: 'campaign.story', voice: 'ship', keys: () => vpKeys(/^camp\.l\d+\.(before|after)\.\d+$/) }); // the story before and after each level, said at the cards
voicePackSource({ id: 'campaign.brief', voice: 'ship', keys: () => vpKeys(/^camp\.m\.\d+\.\d+\.b[12]$/) }); // a mission's briefing, said when it is shown
voicePackSource({ id: 'campaign.warp', voice: 'ship', keys: () => vpKeys(/^camp\.warp\.l\d+$/) }); // the warp cinematic's lines (two have a destination and a distance: expanded for each warp)
voicePackSource({ id: 'campaign.chatter', voice: 'pilots', lines: null, keys: () => (typeof CHATTER === 'object' ? Object.keys(CHATTER.events) : []).reduce((a, ev) => a.concat(vpKeys(new RegExp('^camp\\.chat\\.' + ev + '\\.\\d+$'))), []) }); // the wing's radio: any pilot may say any line, so each is recorded in each pilot's voice
// the places that speak free or computed words: nothing to record, and why (the catalogue lists them so the reason is written down, and a test checks the list against the code)
const VOICEPACK_LIVE = [
  { where: 'the ship computer\'s answers (src/shipcomputer.js, src/cmdstrip.js)', why: 'free text from the model: it is never the same twice' },
  { where: 'a bar character\'s reply (src/chat.js)', why: 'free text, in the character\'s own voice' },
  { where: 'credits received (src/voice.js voicePoll)', why: 'a number in the line: "Mission complete. 400 credits received."' },
  { where: 'a call accepted (src/voice.js voicePoll)', why: 'a mission\'s title in the line: "Call accepted: <title>."' },
  { where: 'the debrief score (src/campaignscene.js showDebrief)', why: 'the score is a number' },
  { where: 'the lose card (src/camplose.js)', why: 'how far and what to try: numbers and the level\'s own facts' },
  { where: 'a line with a distance, a count or an amount (camp.say, camp.no with {km}, {n}, {pts}, {ore}, {s}, {need}, {have})', why: 'a number in the line: kept live unless the game\'s tables enumerate it (VOICEPACK_EXPAND)' }
];

function voicePackCatalogue(opts) {
  opts = opts || {};
  const ship = (Array.isArray(opts.voices) && opts.voices.length ? opts.voices : [VOICEPACK.ship]), pilots = typeof CHATTER === 'object' ? CHATTER.pilots.map(p => p[1]) : [];
  const lines = [], skipped = [], seen = new Set();
  const put = (source, key, text, voice) => { const t = String(text); if (!t.trim()) return; const id = voicePackId(t, voice); if (seen.has(id)) return; seen.add(id); lines.push({ id, text: t, voice, source, key }); };
  VOICEPACK_SOURCES.forEach(src => {
    const voices = src.voice === 'pilots' ? pilots : src.voice === 'ship' ? ship : [src.voice];
    const items = src.lines ? src.lines().map(t => ({ key: '', text: t })) : src.keys().map(k => ({ key: k, text: vpText(k) }));
    items.forEach(it => {
      if (!vpHasVar(it.text)) { voices.forEach(v => put(src.id, it.key, it.text, v)); return; }
      const ex = it.key && VOICEPACK_EXPAND[it.key] ? VOICEPACK_EXPAND[it.key]() : null;
      if (ex && ex.length) { ex.forEach(vars => { const filled = vpFill(it.text, vars); if (!vpHasVar(filled)) voices.forEach(v => put(src.id, it.key, filled, v)); }); return; }
      skipped.push({ source: src.id, key: it.key, text: it.text, why: 'has ' + (it.text.match(/\{[a-z0-9_]+\}/gi) || []).join(' ') + ' in it (a number or a name the game\'s tables do not list): kept live' });
    });
  });
  lines.sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : a.id < b.id ? -1 : 1));
  return { lines, skipped, live: VOICEPACK_LIVE.slice() };
}
// the plan against an index (the tool's and the test's): what is recorded, what is to record, and what in the index is no line of the catalogue any more
function voicePackPlan(cat, rawIndex) {
  const have = rawIndex && rawIndex.lines && typeof rawIndex.lines === 'object' ? rawIndex.lines : {}, ids = new Set(cat.lines.map(l => l.id));
  const todo = cat.lines.filter(l => !(have[l.id] && have[l.id].text === l.text && have[l.id].voice === l.voice)), done = cat.lines.length - todo.length;
  const stale = Object.keys(have).filter(id => !ids.has(id));
  return { total: cat.lines.length, done, todo, stale, chars: todo.reduce((a, l) => a + l.text.length, 0), allChars: cat.lines.reduce((a, l) => a + l.text.length, 0) };
}

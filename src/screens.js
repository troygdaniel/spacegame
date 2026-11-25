// ---------- The new screens, the pure half: the switch, the key chips, the word budget, the ring and meter models (landing F of the new screens; card space-game-screens-f-foundation) ----------
// Troy approved a new look for the screens around the flight (25 Nov 2026; the mock is docs/screens-mock.html, the plan is the scope report on card space-game-screens-scope): panels in the page HUD's look with far fewer words,
// for the title, the ready room, the refit, the rank, the mission pick, the briefing, the won, lost and pause cards, the keys page and Settings. This file is what every one of them shares, with no Phaser and no page (tests/screens.mjs
// runs it in plain Node); src/scrhost.js is the DOM half (the root over the canvas, the elements) and src/screens.css its style. Landing F changes no screen: nothing draws from them until the pieces after it land.
//   scrOn()                  is the new look of the screens on: the flag CAMP.flags.screens (off by default; Settings > CONTENT flips it from any scene, scrSet) or ?screens=1 in the address, unless ?screens=0 (the tests' way)
//   scrSet(on)               the Settings row's: the flag and the browser's memory of it (localStorage longhaul.screens);  scrLoad(): the memory read back at the start (it runs when this file loads)
//   scrKey(id)               a ROLE of the table of src/data_controls.js (CAMP_SCREEN_KEYS) as { id, k, codes, on }, resolved to CAMP_KEYS where it is one of those keys; null for a role the table does not have
//   scrChipInTable(chip)     is a chip one the table has (its role is an entry and its cap is the table's: what the test of each screen asks of every chip it shows)
//   scrChip(id)              what a key chip shows for a role: { id, k } (null for an unknown role: a screen never draws a chip the table does not have);  scrChips(ids): the list;  scrKeysOf(screen): the roles a screen takes
//   scrWords(x)              how many words and numbers a text (or a model's texts, nested in lists and objects) shows, as the mock counts them;  SCR_BUDGET: each screen's words today and in the mock; scrWordsMax(screen): the most a screen's model may show
//   scrRing(frac, o)         a ring's model: { v (0 to 100), tone, text };  scrMeter(frac, o): { pct, tone };  scrPill(text, ok): { text, ok }; the tones are the HUD's: good above 60 percent, warn to 30, foe under
const SCR = {
  addr: 'screens',                                       // the address's name for the switch: ?screens=1 is on whatever the flag says, ?screens=0 is off
  store: 'longhaul.screens',                             // the browser's memory of the Settings row ('1' or '0'; kept apart from the save, like the volume)
  memo: { s: null, v: null },                            // the page's address, read again only when it changed (the switch is asked many times)
  screens: ['title', 'ready', 'refit', 'earthrefit', 'rank', 'pick', 'brief', 'story', 'won', 'lvlwon', 'lost', 'pause', 'keys', 'settings', 'setkeys', 'setlisten', 'setcontrols', 'setflight', 'setcontent', 'setreset', 'tech', 'end'], // the screens the key table names: the mock's sections (round two added the level-won card, the Earth refit and the six other Settings tabs; 'settings' is its Sound tab); story is removed by the new look, kept so its keys can be tested till then
  tones: { low: 0.6, crit: 0.3 },                        // a ring or meter: good above low, warn down to crit, foe under (the page HUD's: CAMP_PAGEHUD.low and .crit)
  slack: { k: 1.25, add: 6 }                             // a screen's word budget: the mock's count times k plus add
};
// the number of words and numbers each screen shows, today and in the mock's recommended version (docs/screens-mock.html: today's from its own table, the new counted from the version's markup by the same rule as scrWords; the story card has none: it goes, its one line is the ready room's)
const SCR_BUDGET = {
  title: { today: 72, mock: 28 }, ready: { today: 92, mock: 45 }, refit: { today: 167, mock: 23 }, rank: { today: 163, mock: 29 }, pick: { today: 282, mock: 61 }, brief: { today: 192, mock: 43 },
  story: { today: 55, mock: 0 }, won: { today: 68, mock: 35 }, lost: { today: 39, mock: 21 }, pause: { today: 84, mock: 16 }, keys: { today: 360, mock: 62 }, settings: { today: 227, mock: 40 },
  lvlwon: { today: 55, mock: 28 }, earthrefit: { today: 56, mock: 35 }, setkeys: { today: 272, mock: 80 }, setlisten: { today: 205, mock: 41 }, setcontrols: { today: 162, mock: 64 }, setflight: { today: 101, mock: 43 }, setcontent: { today: 41, mock: 19 }, setreset: { today: 147, mock: 50 } // round two of the mock (the tabs' counts include the seven tab names)
};

// ---- the switch ----
function scrAddrVal(search) { // the value of ?screens in the address, lower case: null when it is not there, '' for a bare ?screens (the last one counts); the page's own address is read again only when it changed
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = SCR.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === SCR.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const scrAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(scrAddrVal(search)) >= 0;   // ?screens, =1, =on, =true, =yes: on whatever the flag says
const scrAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(scrAddrVal(search)) >= 0;      // ?screens=0, =off, =false, =no: off whatever the flag says (the tests' way back to the screens of today)
const scrOn = () => !scrAddrOff() && ((typeof campFlag === 'function' && campFlag('screens')) || scrAddrOn());
function scrSet(on) { // Settings > CONTENT's row: the flag, and the browser remembers it (every try/catch: the page may have no storage)
  if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.screens = !!on;
  try { if (typeof localStorage !== 'undefined' && localStorage) localStorage.setItem(SCR.store, on ? '1' : '0'); } catch (e) { /* no storage: the flag still moved */ }
  return !!on;
}
function scrLoad() { // the memory read back: '1' turns the flag on, '0' leaves it off; nothing stored leaves the table's value
  try { const v = typeof localStorage !== 'undefined' && localStorage ? localStorage.getItem(SCR.store) : null; if (v === '1' || v === '0') { if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.screens = v === '1'; return v === '1'; } } catch (e) { /* no storage */ }
  return typeof CAMP === 'object' && CAMP && CAMP.flags ? !!CAMP.flags.screens : false;
}

// ---- the key chips: read from the key table, never written in a screen ----
function scrKey(id) {
  const e = typeof CAMP_SCREEN_KEYS === 'object' && CAMP_SCREEN_KEYS ? CAMP_SCREEN_KEYS[id] : null; if (!e) return null;
  const b = e.same ? (typeof CAMP_KEYS === 'object' && CAMP_KEYS ? CAMP_KEYS[e.same] : null) : e; if (!b || !b.k) return null; // a role of a key that has no cap now (the voice, the pips when they are off) has no chip
  return { id, k: b.k, codes: (b.codes || []).slice(), on: (e.on || []).slice() };
}
const scrChipInTable = chip => { const k = chip && typeof chip === 'object' ? scrKey(chip.id) : null; return !!k && k.k === chip.k; };   // a chip a screen shows is an entry of the table: its role is there and its cap is the table's (tests/screens.mjs holds every screen's chips to this)
const scrChip = id => { const k = scrKey(id); return k ? { id, k: k.k } : null; };
const scrChips = ids => (ids || []).map(scrChip).filter(Boolean);
const scrKeysOf = screen => typeof CAMP_SCREEN_KEYS === 'object' && CAMP_SCREEN_KEYS ? Object.keys(CAMP_SCREEN_KEYS).filter(id => (CAMP_SCREEN_KEYS[id].on || []).indexOf(screen) >= 0 && scrKey(id)) : [];

// ---- the word budget ----
function scrWords(x) { // a text, or a list or object of texts, as the number of words and numbers it shows (a tag is not a word; a word is what the white space cuts)
  if (x == null) return 0;
  if (typeof x === 'number') return 1;
  if (typeof x === 'string') return x.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (Array.isArray(x)) return x.reduce((a, v) => a + scrWords(v), 0);
  if (typeof x === 'object') return Object.keys(x).reduce((a, k) => a + scrWords(x[k]), 0);
  return 0;
}
const scrWordsMax = screen => { const b = SCR_BUDGET[screen]; return b ? Math.ceil(b.mock * SCR.slack.k) + SCR.slack.add : Infinity; };   // a screen with no mock (the tech pick, the end card) has no budget until its piece sets one
const scrWithin = (screen, x) => scrWords(x) <= scrWordsMax(screen);

// ---- the models of a ring, a meter and a pill (pure: src/scrhost.js draws them) ----
const scrClamp = v => Math.max(0, Math.min(1, +v || 0));
const scrTone = frac => frac > SCR.tones.low ? 'good' : frac > SCR.tones.crit ? 'warn' : 'foe';
const scrRing = (frac, o) => { const f = scrClamp(frac); o = o || {}; return { v: Math.round(f * 100), tone: o.tone || scrTone(f), text: o.text == null ? '' : String(o.text) }; };
const scrMeter = (frac, o) => { const f = scrClamp(frac); o = o || {}; return { pct: Math.round(f * 1000) / 10, tone: o.tone || scrTone(f) }; };
const scrPill = (text, ok) => ({ text: String(text == null ? '' : text), ok: ok === undefined || ok === null ? null : !!ok }); // ok: true a tick, false a dash, null none

scrLoad(); // the Settings row's memory, read when the page starts

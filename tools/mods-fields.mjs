#!/usr/bin/env node
// Prints the field reference of docs/MODS.md from the schema in src/content.js, so the guide cannot disagree with what the game accepts.
//   node tools/mods-fields.mjs             print the reference (markdown) to the terminal
//   node tools/mods-fields.mjs --write     put it into docs/MODS.md, between the two marker lines (everything else in the file is yours)
//   node tools/mods-fields.mjs --check     exit 1 if docs/MODS.md is not what --write would make, or a note names a field the schema lacks
// What comes from the schema: the types, folders, field names, what each takes (range, choices, length), which are required, the
// sections, the placeholders, the colours, the conditions and the limits. What is written by hand (NOTES below): one plain-words meaning
// for the common fields. A field with no note just has an empty cell, and --check fails if a note is for a field that is gone.
// Needs Node 22+, no packages.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = createRequire(import.meta.url)('../src/content.js');
export const START = '<!-- fields:start (written by node tools/mods-fields.mjs --write: do not edit between these lines) -->';
export const END = '<!-- fields:end -->';

// what the game reads today, in the order a modder wants them (systems are flown from their files since card space-game-systems-from-markdown)
const ORDER = ['mission', 'npc', 'ship', 'part', 'poi', 'station', 'text', 'system', 'voice'];

// one plain-words meaning for the common fields (the schema has the types and ranges, not the meaning)
export const NOTES = {
  ship: {
    name: 'what the ship is called', role: 'a few words: what it is for', side: 'player or pirate', art: 'the built-in picture it is drawn with', trim: 'accent colour', color: 'main colour',
    hull: 'hit points of a player ship', speed: 'speed in px a second (a player ship: top speed)', boost: 'top speed while boosting, px a second', accel: 'thrust, px a second squared', turn: 'turn rate, a multiplier',
    tank: 'fuel units the tank holds', fuelPerLy: 'fuel one light year costs', range: 'jump range, light years', cargo: 'the hold, in ore units', guns: 'how many guns', sensor: 'radar and find range, a multiplier',
    price: 'credits', yard: 'the stations that sell it',
    hp: 'a pirate\'s hit points', max: 'a pirate\'s top speed, px a second', engage: 'how far away it starts hunting you, px', hold: 'the distance it keeps from you, px', fireRange: 'how far it shoots, px',
    shot: 'the shortest and longest wait between shots, ms', bullet: 'bullet speed, px a second', dmg: 'damage a shot', spread: 'extra shots in a fan', strafe: 'circles you instead of closing in', ram: 'damage when it rams you',
    bounty: 'credits a kill pays', credits: 'the older kill figure, used when there is no bounty', radar: 'the colour of its blip', aim: 'how well it aims, 0 to 1'
  },
  mission: {
    kind: 'what the call does: the code decides, the file only says which', title: 'its name on the board', where: 'where it happens, as the board says it', reward: 'credits paid',
    count: 'how many (a patrol counts pirates)', unlock: 'a condition: the board shows the call once it holds', system: 'the system it belongs to'
  },
  npc: { name: 'what they are called', role: 'what they do', color: 'their colour', label: 'the colour of the name above them, when it is not color', appears: 'a condition: they are in the bar only while it holds', station: 'the station they stand in', x: 'where they stand, px from the left', y: 'where they stand, px from the top', face: 'which way they look, radians (0 is east)', voice: 'a Deepgram Aura voice name (docs/VOICE.md)' },
  part: {
    slot: 'which of the six slots', tier: '1 to 3', name: 'the tier\'s name in the shop', brief: 'a short form for tight places', price: 'credits, for the starting ship, the Wren (the other ships scale it)',
    points: 'shields: points that take hits before the hull', regen: 'shields: points a second once it recharges; engine: boost refill', delay: 'shields: ms without a hit before it recharges; weapons: ms between shots', damage: 'weapons: damage a shot',
    speedPct: 'engine: percent more top speed', jump: 'engine: light years more jump range', boostAdd: 'engine: px a second more boost speed', boostTank: 'engine: the boost tank', boostRegen: 'engine: how fast it refills',
    fuelMult: 'tank: the tank times this', holdPlus: 'cargo: ore units more'
  },
  system: { name: 'its name', kind: 'what kind of place', ly: 'galaxy map position [x, y], light years', size: 'world size, px', danger: '0 to 5: how many pirates', traffic: '0 to 3: how busy', seed: 'the random seed',
    starType: 'the star: O, B, A, F, G, K or M (the sun you can fly to, and the tint of the sky)', starX: 'where the star is, px', starY: 'where the star is, px',
    pirateMax: 'its own pirate table: at most this many at once', pirateEvery: 'its own pirate table: one new pirate every this many ms' },
  poi: {
    kind: 'wreck or beacon; it must match the site', name: 'what it is called on the radar',
    credits: 'a fixed site: what it pays', hull: 'hull it repairs', guard: 'a fixed site: how many pirates guard it',
    pays: 'a random signal: what it pays, [least, most]', guardChance: 'a random signal: how often pirates guard it, 0 to 1', hullChance: 'a random signal: how often it repairs the hull, 0 to 1'
  },
  station: { name: 'its name', system: 'the system it is in', accent: 'its colour (not read yet)', fuel: 'credits a unit of fuel at its pump (none: no pump)', repair: 'credits a point of hull at the repair bay', ore: 'credits an ore pays when you dock',
    yard: 'the ships it sells, by id', partMult: 'the price of its parts times this', fee: 'credits it takes at the door', salvageMult: 'what a salvage is worth here, times the usual' },
  voice: { event: 'which moment the lines are for' },
  text: {}
};

const range = d => (d.min !== undefined ? ' from ' + d.min + ' to ' + d.max : '');
const code = s => '`' + s + '`';
// what a field takes, in words (mirrors parseValue in src/content.js)
export function takes(d) {
  switch (d.t) {
    case 'text': return 'text, up to ' + d.max + ' characters';
    case 'int': return 'whole number' + range(d);
    case 'num': return 'number' + range(d);
    case 'bool': return 'yes or no';
    case 'color': return 'a colour (see Colours)';
    case 'cond': return 'a condition (see Conditions)';
    case 'textkey': return 'a key: a-z, 0-9, dots and dashes';
    case 'id': return d.ref ? 'the id of a ' + d.ref : 'an id: a-z, 0-9, dashes';
    case 'pick': return 'one of: ' + d.of.map(code).join(', ');
    case 'list': {
      const kind = d.of === 'id' ? 'ids of ' + (d.ref || 'things') + 's' : d.of === 'int' ? 'whole numbers' + range(d) : d.of === 'num' ? 'numbers' + range(d) : d.of + 's';
      return 'list in square brackets' + (d.len ? ', exactly ' + d.len : '') + ': ' + kind;
    }
    default: return d.t;
  }
}
const shape = s => ({
  text: 'text, up to ' + s.max + ' characters',
  list: 'a list, one `- item` a line, each up to ' + s.max + ' characters',
  kv: 'one `key: text` line each for ' + (s.keys || []).map(code).join(', ') + '; up to ' + s.max + ' characters',
  table: 'a table: ' + Object.entries(s.cols || {}).map(([k, v]) => code(k) + (s.required && s.required.includes(k) ? '*' : '') + ' (' + takes(v) + ')').join('; ')
})[s.t] || s.t;

export function reference() {
  const S = C.SCHEMA, L = C.LIMITS, out = [];
  const missing = ORDER.filter(t => !S[t]), extra = Object.keys(S).filter(t => !ORDER.includes(t));
  if (missing.length || extra.length) throw new Error('mods-fields: the schema types changed (missing ' + missing.join() + '; new ' + extra.join() + '): update ORDER');
  out.push('Fields marked * are required. "Takes" is what the file may say; a value outside it is an error, never a silent change.\n');
  out.push('**Colours:** ' + Object.entries(C.COLORS).map(([k, v]) => code(k) + ' ' + v).join(', ') + ', or any `#rrggbb`.\n');
  // an entry may carry a gloss in brackets: 'hull<N (percent of the hull)' -> `hull<N` (percent of the hull)
  const cond = c => { const m = /^(.*?) \((.*)\)$/.exec(c); return m ? code(m[1]) + ' (' + m[2] + ')' : code(c); };
  out.push('**Conditions** (for `unlock:`, `appears:` and a `when` column; the whole list, a mod cannot add one): ' + C.CONDITIONS.map(cond).join(', ') + '. ID, SLOT and N are what you fill in; up to four joined by ` and ` all have to hold.\n');
  out.push('**Limits:** a file up to ' + L.fileBytes + ' bytes; up to ' + L.files + ' files; a text field up to ' + L.text + ' characters, a line up to ' + L.line + ', a persona up to ' + L.persona + ', a description up to ' + L.desc +
    '; a list up to ' + L.list + ' items; a table up to ' + L.rows + ' rows. Ids are a-z, 0-9 and dashes, starting with a letter, at most 40 characters.\n');
  for (const type of ORDER) {
    const sc = S[type];
    out.push('#### ' + code(type) + '  (folder ' + code('content/' + sc.folder + '/') + ')\n');
    out.push(sc.placeholders === '*' ? 'Text may use any `{placeholder}` the game knows.\n' : sc.placeholders.length ? 'Placeholders in its text: ' + sc.placeholders.map(p => code('{' + p + '}')).join(', ') + '.\n' : 'No placeholders.\n');
    out.push('| Field | Takes | Meaning |\n|---|---|---|');
    const fields = Object.entries(sc.fields);
    if (!fields.length) out.push('| (none) | | the file is only its table |');
    for (const [name, d] of fields) out.push('| ' + code(name) + (d.req ? '*' : '') + ' | ' + takes(d) + ' | ' + ((NOTES[type] || {})[name] || '') + ' |');
    const secs = Object.values(sc.sections || {});
    if (secs.length) {
      out.push('\nUnder `##` headings (the text before the first heading is the description, up to ' + L.desc + ' characters):\n');
      out.push('| Heading | Holds |\n|---|---|');
      for (const s of secs) out.push('| `## ' + s.heading + '` | ' + shape(s) + ' |');
    }
    out.push('');
  }
  return out.join('\n');
}

// a note for a field the schema no longer has is a stale note
export function staleNotes() {
  const bad = [];
  for (const [type, notes] of Object.entries(NOTES)) for (const f of Object.keys(notes)) if (!C.SCHEMA[type] || !(f in C.SCHEMA[type].fields)) bad.push(type + '.' + f);
  return bad;
}

// docs/MODS.md with the reference spliced between the markers (null if the markers are not there)
export function spliced(doc) {
  const a = doc.indexOf(START), b = doc.indexOf(END);
  if (a < 0 || b < a) return null;
  return doc.slice(0, a + START.length) + '\n\n' + reference() + '\n' + doc.slice(b);
}

function main() {
  const arg = process.argv[2], file = join(ROOT, 'docs', 'MODS.md');
  if (!arg) { console.log(reference()); return; }
  if (arg !== '--write' && arg !== '--check') { console.error('usage: node tools/mods-fields.mjs [--write | --check]'); process.exit(2); }
  const stale = staleNotes();
  if (stale.length) { console.error('mods-fields: notes for fields the schema does not have: ' + stale.join(', ') + '. Remove them from NOTES.'); process.exit(1); }
  const doc = readFileSync(file, 'utf8'), next = spliced(doc);
  if (next === null) { console.error('mods-fields: docs/MODS.md has no marker lines. Put these two lines where the reference goes:\n' + START + '\n' + END); process.exit(1); }
  if (arg === '--write') { if (next !== doc) writeFileSync(file, next); console.log(next === doc ? 'docs/MODS.md: the reference is already current' : 'docs/MODS.md: the reference was rewritten from src/content.js'); return; }
  if (next !== doc) { console.error('docs/MODS.md: the field reference is out of date with src/content.js. Run: node tools/mods-fields.mjs --write'); process.exit(1); }
  console.log('docs/MODS.md: the field reference is current with src/content.js');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();

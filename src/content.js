// ---------- Content in markdown: parser, schema, validator (docs/MODDING.md) ----------
// A content file is markdown with front matter: key: value lines between two --- lines, then ## sections made of text, a
// list (- item) or a pipe table. The SCHEMA below decides every type and range, so a file never has to guess.
// This file has no Phaser and no DOM: the game loads it with a script tag (global ContentLib) and tools/build-content.mjs
// and tests/content.mjs load it with require(). It never throws on bad input; it returns errors as data.
//
//   ContentLib.parse(path, text)                 -> { path, fields, desc, sections, errors, fatal }
//   ContentLib.validate(parsed, opts)            -> { path, type, id, data, errors }   data is null when the file is skipped
//   ContentLib.loadAll([{ path, text }], opts)   -> { entries, errors, hash, files }
//   ContentLib.formatError(e)                    -> one plain-words line
// opts.defaultFor(type, id, field) -> the built-in value, so a message can say "Kept the built-in value 70" (the game passes it)
// opts.known(type, id) -> true when the code already defines that id (a reference to it is fine)
// opts.strictRefs -> a reference to an unknown id is an error, not a warning
(function (root) {
  'use strict';

  const LIMITS = { fileBytes: 32768, files: 400, text: 400, line: 240, persona: 600, desc: 600, list: 60, rows: 200 };
  const COLORS = { cyan: '#38e1ff', amber: '#ffb454', red: '#ff4d6d', green: '#6dff9c', gold: '#ffd24a', white: '#ffffff', pink: '#ff4fd8' };
  const ID_RE = /^[a-z][a-z0-9-]{0,39}$/;
  const KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;
  // control characters, zero-width characters and bidi overrides never reach the game's text
  const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
  const clean = s => String(s).replace(/\t/g, ' ').replace(BAD_CHARS, '');

  // the whole list of conditions a reaction line or an unlock rule may carry (docs/MODDING.md 3.4)
  const CONDITIONS = [
    'always', 'mission:none', 'mission:accepted', 'mission:rescued', 'mission:failed', 'mission-id:ID', 'credits>=N', 'credits<N',
    'upgrade:SLOT', 'patrols>=N', 'system:ID', 'ship:ID'
  ];
  const COND_RES = [
    /^always$/, /^mission:(none|accepted|rescued|failed)$/, /^mission-id:[a-z][a-z0-9-]{0,39}$/, /^credits>=\d{1,9}$/, /^credits<\d{1,9}$/,
    /^upgrade:[a-z][a-z0-9-]{0,39}$/, /^patrols>=\d{1,4}$/, /^system:[a-z][a-z0-9-]{0,39}$/, /^ship:[a-z][a-z0-9-]{0,39}$/
  ];

  // ---------- the schema ----------
  const T = (max, req) => ({ t: 'text', max: max || LIMITS.text, req });
  const I = (min, max, req) => ({ t: 'int', min, max, req });
  const N = (min, max, req) => ({ t: 'num', min, max, req });
  const P = (of, req) => ({ t: 'pick', of, req });
  const R = (ref, req) => ({ t: 'id', ref, req });
  const L = (of, extra) => Object.assign({ t: 'list', of }, extra);
  const COLOR = { t: 'color' }, BOOL = { t: 'bool' }, COND = { t: 'cond' };
  const PH = ['reward', 'count', 'progress', 'station', 'system', 'credits', 'ship']; // placeholders the game can fill
  const SHIP_ART = ['ship', 'raider', 'drone', 'gunship', 'reaver', 'freighter', 'civilian', 'police', 'wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion']; // the built-in textures; grows when new ship art lands
  const SLOTS = ['engine', 'shields', 'weapons', 'tank', 'cargo'];
  const VOICE_EVENTS = ['launch-clear', 'hull-low', 'pirates-detected', 'docked', 'mission-accepted', 'credits-earned', 'fuel-low']; // docs/VOICE.md grows this list

  const SCHEMA = {
    ship: {
      folder: 'ships', placeholders: [],
      fields: {
        name: T(40, true), role: T(60), side: P(['player', 'pirate']), art: P(SHIP_ART), trim: COLOR, color: COLOR,
        // player ships: hull, speed (top speed), boost, accel, turn (a multiplier), tank, fuelPerLy, range (jump range in ly), cargo (the hold), guns, sensor
        hull: I(10, 1000), speed: I(50, 2000), boost: I(50, 3000), accel: I(50, 3000), turn: N(0.001, 3),
        tank: I(1, 300), fuelPerLy: N(0.1, 5), range: N(1, 60), cargo: I(0, 200), guns: I(1, 6), sensor: N(0.5, 4), price: I(0, 1000000),
        yard: L('id', { ref: 'station' }),
        // pirate ships keep the names of PIRATES in enemies.js: hp, speed, max, turn, engage, hold (stand-off distance), aim, shot, bullet, dmg, spread, strafe,
        // ram, bounty, credits, radar; fireRange is its shooting range in px (PIRATES.range: a ship's own range is the jump range)
        hp: I(1, 5000), max: I(50, 2000), engage: I(100, 3000), hold: I(0, 3000), fireRange: I(100, 3000), shot: L('int', { len: 2, min: 50, max: 10000 }),
        bullet: I(50, 2000), dmg: I(1, 200), spread: I(0, 9), bounty: I(0, 100000), credits: I(0, 100000), ram: I(0, 200), aim: N(0, 1), strafe: BOOL, radar: COLOR
      },
      sections: { hangarLine: { heading: 'Hangar line', t: 'text', max: 240 } }
    },
    part: {
      folder: 'parts', placeholders: [],
      fields: {
        slot: P(SLOTS, true), tier: I(1, 3, true), name: T(40, true), key: T(20), price: I(0, 1000000),
        speedPct: N(0, 100), jump: N(0, 20), boostTank: I(0, 500), boostRegen: I(0, 200), hullPlus: I(0, 500), points: I(0, 500), regen: N(0, 100),
        delay: I(20, 1000), damage: I(1, 100), fuelMult: N(1, 5), holdPlus: I(0, 100)
      },
      sections: {}
    },
    system: {
      folder: 'systems', placeholders: [],
      fields: {
        name: T(40, true), kind: P(['home', 'outpost', 'trade', 'mining', 'wild', 'graveyard', 'nest'], true), ly: L('num', { len: 2, min: -1000, max: 1000 }),
        size: I(4000, 200000), danger: I(0, 5), traffic: I(0, 3), seed: I(0, 2147483647),
        starType: P(['O', 'B', 'A', 'F', 'G', 'K', 'M']), starX: I(0, 200000), starY: I(0, 200000)
      },
      sections: {
        bodies: {
          heading: 'Bodies', t: 'table', required: ['id', 'type', 'x', 'y'],
          cols: {
            id: { t: 'id' }, type: P(['station', 'planet', 'belt', 'poi', 'star'], true), name: T(40), x: I(0, 200000), y: I(0, 200000),
            art: T(30), r: I(10, 5000), rocks: I(0, 200), landable: BOOL, kind: P(['wreck', 'beacon']), credits: I(0, 100000)
          }
        }
      }
    },
    station: {
      folder: 'stations', placeholders: PH,
      fields: { name: T(40, true), system: R('system', true), accent: COLOR, fuel: N(0, 100), repair: N(0, 5), ore: N(0, 200) },
      sections: {
        welcome: { heading: 'Welcome', t: 'text', max: 400 },
        shop: { heading: 'Shop', t: 'table', required: ['item', 'price'], cols: { item: T(40, true), price: I(0, 1000000, true) } },
        services: { heading: 'Services', t: 'list', max: 60 },
        bar: { heading: 'Bar', t: 'list', max: LIMITS.line }
      }
    },
    mission: {
      folder: 'missions', placeholders: PH,
      fields: {
        kind: P(['rescue', 'escort', 'patrol', 'bounty', 'courier', 'haul', 'salvage', 'survey'], true), title: T(40, true), where: T(60),
        reward: I(0, 1000000, true), count: I(1, 50), unlock: COND, system: R('system')
      },
      sections: {
        offer: { heading: 'Offer', t: 'text', max: 600 },
        boardLine: { heading: 'Board line', t: 'kv', keys: ['active', 'rescued', 'failed'], max: LIMITS.line },
        progress: { heading: 'Progress', t: 'text', max: 400 },
        steps: { heading: 'Steps', t: 'list', max: 80 },
        failure: { heading: 'Failure', t: 'text', max: 240 }
      }
    },
    npc: {
      folder: 'npcs', placeholders: PH,
      fields: { name: T(24, true), role: T(40), color: COLOR, station: R('station'), x: I(0, 8000), y: I(0, 8000), face: N(-6.3, 6.3), voice: T(40) },
      sections: {
        lines: { heading: 'Lines', t: 'list', max: LIMITS.line },
        reactions: { heading: 'Reactions', t: 'table', required: ['when', 'line'], cols: { when: { t: 'cond', req: true }, line: T(LIMITS.line, true) } },
        persona: { heading: 'Persona', t: 'text', max: LIMITS.persona }
      }
    },
    voice: {
      folder: 'voice', placeholders: PH,
      fields: { event: P(VOICE_EVENTS, true) },
      sections: { lines: { heading: 'Lines', t: 'list', max: LIMITS.line } }
    },
    text: {
      folder: 'text', placeholders: '*',
      fields: {},
      sections: { strings: { heading: 'Strings', t: 'table', required: ['key', 'text'], cols: { key: { t: 'textkey', req: true }, text: T(LIMITS.text, true) } } }
    }
  };
  const FOLDERS = {};
  Object.keys(SCHEMA).forEach(t => { FOLDERS[SCHEMA[t].folder] = t; });

  // ---------- small helpers ----------
  function levenshtein(a, b) {
    const m = a.length, n = b.length; let prev = []; for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  // the closest word within 2 edits (1 edit for words of 3 letters or fewer), or null
  function suggest(word, list) {
    const w = String(word).toLowerCase(); let best = null, bd = 99;
    list.forEach(c => { const d = levenshtein(w, String(c).toLowerCase()); if (d < bd) { bd = d; best = c; } });
    return best !== null && bd <= (w.length <= 3 ? 1 : 2) ? best : null;
  }
  const quote = s => '"' + s + '"';
  const err = (list, level, path, line, field, message) => list.push({ level, path, line: line || 0, field: field || '', message: message.replace(/\?\./g, '?') }); // never "?."
  function formatError(e) { return (e.level === 'warn' ? '(warning) ' : '') + e.path + (e.line ? ', line ' + e.line : '') + ': ' + e.message; }
  function hashOf(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }

  // ---------- parse: text in, front matter fields and sections out, never throws ----------
  function parse(path, text) {
    const out = { path, fields: [], desc: [], sections: [], errors: [], fatal: false };
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
    let i = 0;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length || lines[i].trim() !== '---') {
      err(out.errors, 'error', path, i >= lines.length ? 1 : i + 1, '', 'the file must start with a line of three dashes (---) that opens the front matter. Skipped the file.');
      out.fatal = true; return out;
    }
    const open = i + 1; i++;
    let closed = false;
    for (; i < lines.length; i++) {
      const raw = lines[i], t = raw.trim();
      if (t === '---') { closed = true; i++; break; }
      if (t === '' || t[0] === '#') continue;
      const m = /^([^:]+?)\s*:\s*([\s\S]*)$/.exec(t);
      if (!m || !KEY_RE.test(m[1])) { err(out.errors, 'error', path, i + 1, '', 'this line is not "key: value". Ignored.'); continue; }
      out.fields.push({ key: m[1], raw: m[2], line: i + 1 });
    }
    if (!closed) {
      err(out.errors, 'error', path, open, '', 'the front matter is never closed: add a line of three dashes (---) after the last field. Skipped the file.');
      out.fatal = true; return out;
    }
    let cur = null;
    for (; i < lines.length; i++) {
      const raw = lines[i], t = raw.trim();
      if (/^<!--.*-->$/.test(t)) continue; // a one-line html comment is ignored
      const h = /^##\s+(\S[\s\S]*?)\s*$/.exec(raw);
      if (h) { cur = { heading: h[1], line: i + 1, lines: [] }; out.sections.push(cur); continue; }
      (cur ? cur.lines : out.desc).push({ n: i + 1, s: raw });
    }
    return out;
  }

  // ---------- value checks ----------
  // one value against its spec: returns { v } or { bad: 'why' }
  function parseValue(spec, raw) {
    let s = clean(raw).trim();
    if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) s = s.slice(1, -1).trim();
    const range = (lo, hi) => (lo !== undefined ? ' from ' + lo + ' to ' + hi : '');
    switch (spec.t) {
      case 'textkey':
        if (!/^[a-z][a-z0-9.-]{0,60}$/.test(s)) return { bad: 'is ' + quote(s) + ' but must be a key: a-z, 0-9, dots and dashes, starting with a letter' };
        return { v: s };
      case 'text':
        if (s === '') return { bad: 'is empty' };
        if (s.length > spec.max) return { bad: 'is ' + s.length + ' characters but the limit is ' + spec.max };
        return { v: s };
      case 'int':
        if (!/^-?\d+$/.test(s)) return { bad: 'is ' + quote(s) + ' but must be a whole number' + range(spec.min, spec.max) };
        { const v = parseInt(s, 10); if (v < spec.min || v > spec.max) return { bad: 'is ' + v + ' but must be a whole number' + range(spec.min, spec.max) }; return { v }; }
      case 'num':
        if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return { bad: 'is ' + quote(s) + ' but must be a number' + range(spec.min, spec.max) };
        { const v = parseFloat(s); if (v < spec.min || v > spec.max) return { bad: 'is ' + v + ' but must be a number' + range(spec.min, spec.max) }; return { v }; }
      case 'bool': {
        const b = s.toLowerCase();
        if (b === 'yes' || b === 'true') return { v: true };
        if (b === 'no' || b === 'false') return { v: false };
        return { bad: 'is ' + quote(s) + ' but must be yes or no' };
      }
      case 'color': {
        const c = s.toLowerCase();
        if (COLORS[c]) return { v: COLORS[c] };
        if (/^#[0-9a-f]{6}$/.test(c)) return { v: c };
        return { bad: 'is ' + quote(s) + ' but must be a color like #ffb454 or one of: ' + Object.keys(COLORS).join(', ') };
      }
      case 'pick': {
        const hit = spec.of.find(o => o.toLowerCase() === s.toLowerCase());
        if (hit) return { v: hit };
        const sg = suggest(s, spec.of);
        return { bad: 'is ' + quote(s) + ' but must be one of: ' + spec.of.join(', ') + (sg ? '. Did you mean ' + quote(sg) + '?' : '') };
      }
      case 'id':
        if (!ID_RE.test(s)) return { bad: 'is ' + quote(s) + ' but must be an id: a-z, 0-9 and dashes, starting with a letter' };
        return { v: s };
      case 'cond':
        if (!COND_RES.some(r => r.test(s))) return { bad: 'is ' + quote(s) + ' but is not a known condition. Known: ' + CONDITIONS.join(', ') };
        return { v: s };
      case 'list': {
        const m = /^\[(.*)\]$/.exec(s);
        if (!m) return { bad: 'must be a list in square brackets, like [a, b]' };
        const parts = m[1].trim() === '' ? [] : m[1].split(',').map(x => x.trim());
        if (parts.length > LIMITS.list) return { bad: 'has ' + parts.length + ' items but the limit is ' + LIMITS.list };
        if (spec.len && parts.length !== spec.len) return { bad: 'must have exactly ' + spec.len + ' items, like [a, b]' };
        const item = spec.of === 'num' ? { t: 'num', min: spec.min, max: spec.max } : spec.of === 'int' ? { t: 'int', min: spec.min, max: spec.max } : { t: spec.of };
        const vs = [];
        for (const p of parts) { const r = parseValue(item, p); if (r.bad) return { bad: 'has an item that ' + r.bad }; vs.push(r.v); }
        return { v: vs };
      }
    }
    return { bad: 'has an unknown type' };
  }

  // "{name}" placeholders: only the ones this type fills; a typo gets a hint
  function badPlaceholder(text, allowed) {
    if (allowed === '*') return null;
    const re = /\{([A-Za-z][A-Za-z0-9]*)\}/g; let m;
    while ((m = re.exec(text))) {
      if (!allowed.includes(m[1])) {
        const sg = suggest(m[1], allowed);
        return quote('{' + m[1] + '}') + ' is not a known placeholder here' + (allowed.length ? '. ' + (sg ? 'Did you mean {' + sg + '}?' : 'Known: ' + allowed.map(a => '{' + a + '}').join(', ')) : ' (this type has none)');
      }
    }
    return null;
  }

  // ---------- validate one parsed file ----------
  function validate(parsed, opts) {
    opts = opts || {};
    const path = parsed.path, errors = parsed.errors.slice();
    const res = { path, type: null, id: null, data: null, errors };
    if (parsed.fatal) return res;
    const skip = msg => { err(errors, 'error', path, 0, '', msg + ' Skipped the file.'); return res; };

    // the folder and the file name decide where it belongs and what it is called
    const segs = String(path).split('/'), folder = segs.find(s => FOLDERS[s]);
    if (!folder) return skip('this file is not inside a known content folder (' + Object.keys(FOLDERS).join(', ') + ').');
    const fileId = segs[segs.length - 1].replace(/\.md$/i, '');
    if (!ID_RE.test(fileId)) return skip('the file name ' + quote(segs[segs.length - 1]) + ' is not a valid id: use a-z, 0-9 and dashes, starting with a letter, 40 characters at most.');

    const tf = parsed.fields.find(f => f.key === 'type');
    if (!tf) return skip('the front matter needs a type: line (' + Object.keys(SCHEMA).join(', ') + ').');
    const typeName = (parseValue({ t: 'text', max: 20 }, tf.raw).v || '').toLowerCase();
    const schema = SCHEMA[typeName];
    if (!schema) {
      const sg = suggest(typeName, Object.keys(SCHEMA));
      err(errors, 'error', path, tf.line, 'type', 'type is ' + quote(typeName) + ' but must be one of: ' + Object.keys(SCHEMA).join(', ') + (sg ? '. Did you mean ' + quote(sg) + '?' : '') + ' Skipped the file.');
      return res;
    }
    if (FOLDERS[folder] !== typeName) { err(errors, 'error', path, tf.line, 'type', 'type is ' + quote(typeName) + ' but this folder takes ' + quote(FOLDERS[folder]) + '. Skipped the file.'); return res; }
    res.type = typeName; res.id = fileId;
    const idf = parsed.fields.find(f => f.key === 'id');
    if (idf && parseValue({ t: 'text', max: 40 }, idf.raw).v !== fileId) err(errors, 'error', path, idf.line, 'id', 'id is ' + quote(idf.raw) + ' but the file name says ' + quote(fileId) + '. Used the file name.');

    const keep = field => { const d = opts.defaultFor && opts.defaultFor(typeName, fileId, field); return d !== undefined && d !== null ? ' Kept the built-in value ' + (typeof d === 'object' ? JSON.stringify(d) : d) + '.' : ' Ignored.'; };
    const data = {}, seen = Object.create(null);
    const names = Object.keys(schema.fields);
    let missing = false;

    parsed.fields.forEach(f => {
      if (f.key === 'type' || f.key === 'id') return;
      const spec = schema.fields[f.key];
      if (!spec) {
        const sg = suggest(f.key, names);
        err(errors, 'error', path, f.line, f.key, 'unknown field ' + quote(f.key) + '.' + (sg ? ' Did you mean ' + quote(sg) + '?' : '') + ' Ignored.');
        return;
      }
      if (seen[f.key]) { err(errors, 'error', path, f.line, f.key, f.key + ' appears twice (lines ' + seen[f.key] + ' and ' + f.line + '). Used the first.'); return; }
      seen[f.key] = f.line;
      const r = parseValue(spec, f.raw);
      let bad = r.bad ? f.key + ' ' + r.bad : null;
      if (!bad && spec.t === 'text') { const ph = badPlaceholder(r.v, schema.placeholders); if (ph) bad = f.key + ': ' + ph; }
      if (bad) { err(errors, 'error', path, f.line, f.key, bad + '.' + (spec.req ? ' Skipped the file.' : keep(f.key))); if (spec.req) missing = true; return; }
      data[f.key] = r.v;
    });
    names.forEach(n => { if (schema.fields[n].req && data[n] === undefined && !seen[n]) { err(errors, 'error', path, 0, n, n + ' is required but missing. Skipped the file.'); missing = true; } });
    if (missing) return res;

    // the text before the first ## heading is the description
    const descText = textBlock(parsed.desc), descFirst = (parsed.desc.find(l => l.s.trim() !== '') || { n: 0 }).n;
    if (descText) {
      if (descText.length > LIMITS.desc) err(errors, 'error', path, descFirst, 'description', 'the description is ' + descText.length + ' characters but the limit is ' + LIMITS.desc + '. Ignored.');
      else { const ph = badPlaceholder(descText, schema.placeholders); if (ph) err(errors, 'error', path, descFirst, 'description', 'the description: ' + ph + '. Ignored.'); else data.description = descText; }
    }

    // sections
    const secNames = Object.keys(schema.sections).map(k => schema.sections[k].heading);
    const got = Object.create(null);
    parsed.sections.forEach(sec => {
      const key = Object.keys(schema.sections).find(k => schema.sections[k].heading.toLowerCase() === sec.heading.toLowerCase());
      if (!key) {
        const sg = suggest(sec.heading, secNames);
        err(errors, 'error', path, sec.line, '', 'unknown section ' + quote('## ' + sec.heading) + '.' + (secNames.length ? (sg ? ' Did you mean ' + quote('## ' + sg) + '?' : ' This type has: ' + secNames.join(', ') + '.') : ' This type has no sections.') + ' Ignored.');
        return;
      }
      if (got[key]) { err(errors, 'error', path, sec.line, '', quote('## ' + sec.heading) + ' appears twice. Used the first.'); return; }
      got[key] = true;
      const v = readSection(schema.sections[key], sec, schema, path, errors);
      if (v !== undefined) data[key] = v;
    });

    res.data = data;
    return res;
  }

  // the lines of a text block: blank line = new paragraph, a single newline stays a line break
  function textBlock(lines) {
    const out = []; let blank = false;
    lines.forEach(l => {
      const s = clean(l.s).replace(/\s+$/, '');
      if (s.trim() === '') { blank = out.length > 0; return; }
      if (blank) out.push(''); blank = false; out.push(s.trim());
    });
    return out.join('\n');
  }

  function readSection(spec, sec, schema, path, errors) {
    const lines = sec.lines, ph = s => badPlaceholder(s, schema.placeholders);
    if (spec.t === 'text') {
      const s = textBlock(lines);
      if (!s) return undefined;
      if (s.length > spec.max) { err(errors, 'error', path, sec.line, '', quote('## ' + sec.heading) + ' is ' + s.length + ' characters but the limit is ' + spec.max + '. Ignored.'); return undefined; }
      const p = ph(s); if (p) { err(errors, 'error', path, sec.line, '', 'in the ' + quote('## ' + sec.heading) + ' section, ' + p + '. Ignored.'); return undefined; }
      return s;
    }
    if (spec.t === 'list' || spec.t === 'kv') {
      const items = spec.t === 'list' ? [] : {};
      let count = 0;
      for (const l of lines) {
        const t = clean(l.s).trim();
        if (t === '') continue;
        let body = t;
        const dash = /^[-*]\s+([\s\S]*)$/.exec(t);
        if (dash) body = dash[1].trim();
        else if (spec.t === 'list') { err(errors, 'error', path, l.n, '', 'this line is not a list item: start it with "- ". Ignored.'); continue; }
        if (spec.t === 'kv') {
          const m = /^([A-Za-z][A-Za-z0-9]*)\s*:\s*([\s\S]+)$/.exec(body);
          if (!m) { err(errors, 'error', path, l.n, '', 'this line is not "key: text". Ignored.'); continue; }
          if (!spec.keys.includes(m[1])) { const sg = suggest(m[1], spec.keys); err(errors, 'error', path, l.n, '', 'unknown key ' + quote(m[1]) + '.' + (sg ? ' Did you mean ' + quote(sg) + '?' : ' Known: ' + spec.keys.join(', ') + '.') + ' Ignored.'); continue; }
          if (Object.prototype.hasOwnProperty.call(items, m[1])) { err(errors, 'error', path, l.n, '', quote(m[1]) + ' appears twice. Used the first.'); continue; }
          body = m[2].trim();
          if (body.length > spec.max) { err(errors, 'error', path, l.n, '', 'this line is ' + body.length + ' characters but the limit is ' + spec.max + '. Ignored.'); continue; }
          const p = ph(body); if (p) { err(errors, 'error', path, l.n, '', p + '. Ignored.'); continue; }
          items[m[1]] = body; count++;
          continue;
        }
        if (body === '') continue;
        if (body.length > spec.max) { err(errors, 'error', path, l.n, '', 'this item is ' + body.length + ' characters but the limit is ' + spec.max + '. Ignored.'); continue; }
        const p = ph(body); if (p) { err(errors, 'error', path, l.n, '', p + '. Ignored.'); continue; }
        if (count >= LIMITS.list) { err(errors, 'error', path, l.n, '', 'more than ' + LIMITS.list + ' items; the rest are ignored.'); break; }
        items.push(body); count++;
      }
      return count ? items : undefined;
    }
    if (spec.t === 'table') return readTable(spec, sec, schema, path, errors);
    return undefined;
  }

  // a pipe table: header, separator, rows; every cell is checked against its column
  function splitRow(s) {
    let t = s.trim();
    if (t[0] === '|') t = t.slice(1);
    if (t.length && t[t.length - 1] === '|' && t[t.length - 2] !== '\\') t = t.slice(0, -1);
    const cells = []; let cur = '';
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '\\' && t[i + 1] === '|') { cur += '|'; i++; } else if (t[i] === '|') { cells.push(cur.trim()); cur = ''; } else cur += t[i];
    }
    cells.push(cur.trim());
    return cells;
  }
  function readTable(spec, sec, schema, path, errors) {
    const rows = sec.lines.filter(l => l.s.trim() !== '');
    if (!rows.length) return undefined;
    const head = splitRow(clean(rows[0].s)), colNames = Object.keys(spec.cols);
    const cols = head.map(h => { if (colNames.includes(h)) return h; const sg = suggest(h, colNames); err(errors, 'error', path, rows[0].n, '', 'unknown column ' + quote(h) + '.' + (sg ? ' Did you mean ' + quote(sg) + '?' : ' Known: ' + colNames.join(', ') + '.') + ' Ignored.'); return null; });
    if (new Set(cols.filter(Boolean)).size !== cols.filter(Boolean).length) { err(errors, 'error', path, rows[0].n, '', 'a column appears twice in the table header. Ignored the table.'); return undefined; }
    const missing = (spec.required || []).filter(c => !cols.includes(c));
    if (missing.length) { err(errors, 'error', path, rows[0].n, '', 'the table needs the column' + (missing.length > 1 ? 's' : '') + ' ' + missing.join(', ') + '. Ignored the table.'); return undefined; }
    let start = 1;
    if (rows[1] && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(rows[1].s.trim())) start = 2;
    else err(errors, 'error', path, rows[0].n, '', 'the table header needs a line of dashes under it, like |---|---|.');
    const out = [];
    for (let r = start; r < rows.length; r++) {
      const row = rows[r], cells = splitRow(clean(row.s));
      if (out.length >= LIMITS.rows) { err(errors, 'error', path, row.n, '', 'more than ' + LIMITS.rows + ' rows; the rest are ignored.'); break; }
      if (cells.length !== cols.length) { err(errors, 'error', path, row.n, '', 'this row has ' + cells.length + (cells.length === 1 ? ' cell' : ' cells') + ' but the header has ' + cols.length + '. Ignored the row.'); continue; }
      const obj = {}; let dead = false;
      cols.forEach((c, i) => {
        if (!c || dead) return;
        const cs = spec.cols[c];
        if (cells[i] === '') { if (cs.req || (spec.required || []).includes(c)) { err(errors, 'error', path, row.n, c, c + ' is empty but required. Ignored the row.'); dead = true; } return; }
        const v = parseValue(cs, cells[i]);
        if (v.bad) { err(errors, 'error', path, row.n, c, c + ' ' + v.bad + '.' + ((cs.req || (spec.required || []).includes(c)) ? ' Ignored the row.' : ' Ignored.')); if (cs.req || (spec.required || []).includes(c)) dead = true; return; }
        if (cs.t === 'text') { const p = badPlaceholder(v.v, schema.placeholders); if (p) { err(errors, 'error', path, row.n, c, c + ': ' + p + '. Ignored the row.'); dead = true; return; } }
        obj[c] = v.v;
      });
      if (!dead) out.push(obj);
    }
    return out.length ? out : undefined;
  }

  // ---------- load a whole pack ----------
  // files: [{ path, text }]. Names starting with _ or . (in any folder) are ignored, so are files that are not .md.
  function loadAll(files, opts) {
    opts = opts || {};
    const errors = [], entries = [], registry = new Map(), byKey = new Map();
    let list = files.filter(f => f && typeof f.path === 'string' && /\.md$/i.test(f.path) && !f.path.split('/').some(s => s[0] === '_' || s[0] === '.'));
    list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    if (list.length > LIMITS.files) { err(errors, 'error', list[LIMITS.files].path, 0, '', 'more than ' + LIMITS.files + ' content files; the rest are ignored.'); list = list.slice(0, LIMITS.files); }
    const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    list.forEach(f => {
      const text = String(f.text), bytes = enc ? enc.encode(text).length : text.length;
      if (bytes > LIMITS.fileBytes) { err(errors, 'error', f.path, 0, '', 'the file is ' + Math.ceil(bytes / 1024) + ' KB but the limit is ' + LIMITS.fileBytes / 1024 + ' KB. Skipped the file.'); return; }
      const res = validate(parse(f.path, text), opts);
      res.errors.forEach(e => errors.push(e));
      if (!res.data) return;
      const k = res.type + ':' + res.id;
      if (byKey.has(k)) {
        err(errors, 'warn', f.path, 0, '', 'there are two ' + res.type + ' files called ' + quote(res.id) + ' (' + byKey.get(k).path + ' and this one). Used this one.');
        entries.splice(entries.indexOf(byKey.get(k)), 1);
      }
      const entry = { type: res.type, id: res.id, path: f.path, data: res.data };
      byKey.set(k, entry); entries.push(entry); registry.set(k, true);
    });
    // references to other files
    entries.forEach(en => {
      const schema = SCHEMA[en.type];
      Object.keys(schema.fields).forEach(fn => {
        const spec = schema.fields[fn], ref = spec.ref, v = en.data[fn];
        if (!ref || v === undefined) return;
        (Array.isArray(v) ? v : [v]).forEach(id => {
          if (registry.has(ref + ':' + id) || (opts.known && opts.known(ref, id))) return;
          err(errors, opts.strictRefs ? 'error' : 'warn', en.path, 0, fn, fn + ' refers to the ' + ref + ' ' + quote(id) + ', but there is no file for it (' + SCHEMA[ref].folder + '/' + id + '.md).');
        });
      });
    });
    entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const hash = hashOf(JSON.stringify(entries.map(e => [e.type, e.id, e.data])));
    return { entries, errors, hash, files: list.length };
  }

  const api = { LIMITS, SCHEMA, CONDITIONS, COLORS, FOLDERS, parse, validate, loadAll, formatError, suggest, levenshtein, hashOf };
  if (typeof module === 'object' && module && module.exports) module.exports = api; else root.ContentLib = api;
})(typeof self !== 'undefined' ? self : this);

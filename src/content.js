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
//   ContentLib.checkEntry(entry, opts)           -> { data, errors }   the browser's second look at an entry of content.generated.js
//   ContentLib.apply(CONTENT, tables, opts)      -> { errors, applied, skipped, ... }   merge the entries over the game's built-in tables
// opts.defaultFor(type, id, field) -> the built-in value, so a message can say "Kept the built-in value 70" (the game passes it)
// opts.known(type, id) -> true when the code already defines that id (a reference to it is fine)
// opts.strictRefs -> a reference to an unknown id is an error, not a warning
(function (root) {
  'use strict';

  const LIMITS = { fileBytes: 32768, files: 400, text: 400, line: 240, persona: 600, desc: 600, list: 60, rows: 200, packs: 12, packBytes: 1500000 };
  const COLORS = { cyan: '#38e1ff', amber: '#ffb454', red: '#ff4d6d', green: '#6dff9c', gold: '#ffd24a', white: '#ffffff', pink: '#ff4fd8' };
  const ID_RE = /^[a-z][a-z0-9-]{0,39}$/;
  const KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;
  // control characters, zero-width characters and bidi overrides never reach the game's text
  const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
  const clean = s => String(s).replace(/\t/g, ' ').replace(BAD_CHARS, '');

  // the whole list of conditions a reaction line or an unlock rule may carry (docs/MODDING.md 3.4)
  const CONDITIONS = [
    'always', 'mission:none', 'mission:accepted', 'mission:rescued', 'mission:failed', 'mission-id:ID', 'credits>=N', 'credits<N',
    'upgrade:SLOT', 'upgrade:SLOT>=N', 'hull<N (percent of the hull)', 'kills>=N', 'missions>=N', 'patrols>=N', 'system:ID', 'ship:ID',
    '!CONDITION (not)', 'CONDITION and CONDITION (all hold)'
  ];
  const COND_RES = [
    /^always$/, /^mission:(none|accepted|rescued|failed)$/, /^mission-id:[a-z][a-z0-9-]{0,39}$/, /^credits>=\d{1,9}$/, /^credits<\d{1,9}$/,
    /^upgrade:[a-z][a-z0-9-]{0,39}$/, /^upgrade:[a-z][a-z0-9-]{0,39}>=[1-3]$/, /^hull<\d{1,3}$/, /^kills>=\d{1,6}$/, /^missions>=\d{1,4}$/,
    /^patrols>=\d{1,4}$/, /^system:[a-z][a-z0-9-]{0,39}$/, /^ship:[a-z][a-z0-9-]{0,39}$/
  ];
  // a condition is one of the above, with ! in front for "not", or up to four of them joined by " and " (all must hold)
  const condOk = c => { const parts = String(c).split(' and '); return parts.length <= 4 && parts.every(p => COND_RES.some(r => r.test(p.replace(/^!/, '')))); };

  // ---------- the schema ----------
  const T = (max, req) => ({ t: 'text', max: max || LIMITS.text, req });
  const I = (min, max, req) => ({ t: 'int', min, max, req });
  const N = (min, max, req) => ({ t: 'num', min, max, req });
  const P = (of, req) => ({ t: 'pick', of, req });
  const R = (ref, req) => ({ t: 'id', ref, req });
  const L = (of, extra) => Object.assign({ t: 'list', of }, extra);
  const COLOR = { t: 'color' }, BOOL = { t: 'bool' }, COND = { t: 'cond' };
  const PH = ['reward', 'count', 'progress', 'station', 'system', 'credits', 'ship', 'kills']; // placeholders the game can fill
  const PH_MISSION = PH.concat('hull'); // a mission may also say {hull}: the percent of hull the bounty target has left
  const SHIP_ART = ['ship', 'raider', 'drone', 'gunship', 'reaver', 'freighter', 'civilian', 'police', 'wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion']; // the built-in textures; grows when new ship art lands
  const SLOTS = ['engine', 'shields', 'weapons', 'tank', 'cargo', 'aim'];
  // star systems (docs/MODDING.md 6.3): what a body is, and the names the code's own tables use for them (src/data_systems.js, art_world.js, stationart.js)
  const BODY_TYPES = ['station', 'planet', 'belt', 'poi', 'scenery', 'gate'];
  const PLANET_KINDS = ['rock', 'ice', 'gas', 'lava', 'ringed'];   // art_world.js planetTexture
  const SITE_KINDS = ['wreck', 'beacon'];                         // poi.js
  const STATION_LOOKS = ['hub', 'foundry', 'nest', 'derelict'];   // stationart.js STATION_LOOKS (a station or a dead one)
  const BODY_ART = ['station', 'outpost', 'planet'].concat(STATION_LOOKS); // the textures a body is drawn with (boot.js, stationart.js)
  const PIRATE_IDS = ['raider', 'drone', 'gunship'];              // the pirate ships a system may weight
  // one Bodies row against its type: the columns that type needs and the kind that fits it. The message is a whole sentence; the row is ignored.
  // where a body is (card space-game-orbit-fields-in-files): its own x and y, or, when they are left empty, its orbit: `orbit` units from the sun (the
  // middle of the system when it has no sun) at `angle` degrees round it, clockwise from north (0 north, 90 east, 180 south: the minimap is north up).
  // sys: the system's own fields (starX, starY, size). null when the row gives neither. src/data_systems.js sysPlace is the same sum for the game.
  const bodyPlace = (o, sys) => {
    if (o.x !== undefined && o.y !== undefined) return { x: o.x, y: o.y };
    if (o.orbit === undefined) return null;
    const f = sys || {}, star = f.starX !== undefined && f.starY !== undefined, cx = star ? f.starX : (f.size || 0) / 2, cy = star ? f.starY : (f.size || 0) / 2, a = (o.angle || 0) * Math.PI / 180;
    return { x: Math.round(cx + Math.sin(a) * o.orbit), y: Math.round(cy - Math.cos(a) * o.orbit) };
  };
  const bodyPlaceProblem = o => {
    if ((o.x === undefined) !== (o.y === undefined)) return 'the row has ' + (o.x === undefined ? 'y but no x' : 'x but no y') + ': give both, or leave both empty and give an orbit';
    if (o.x === undefined && o.orbit === undefined) return 'the row says where the body is in neither way: give x and y, or an orbit (how far from the sun) and an angle (0 north, 90 east)';
    return null;
  };
  const bodyRowProblem = o => {
    const where = bodyPlaceProblem(o); if (where) return where;
    const need = (...c) => { const m = c.filter(k => o[k] === undefined); return m.length ? 'a ' + o.type + ' needs ' + m.join(' and ') + ' (docs/MODDING.md 6.3)' : null; };
    switch (o.type) {
      case 'station': return null; // a station's name, prices and words are its own file's (stations/<id>.md)
      case 'planet':
        if (o.kind !== undefined && !PLANET_KINDS.includes(o.kind)) return 'a planet\'s kind is ' + o.kind + ' but must be one of: ' + PLANET_KINDS.join(', ');
        if (o.kind === undefined && o.art !== 'planet') return 'a planet needs a kind (' + PLANET_KINDS.join(', ') + '), or art planet for the built-in one';
        return need('r');
      case 'belt': return need('r', 'rocks');
      case 'poi':
        if (o.kind === undefined || !SITE_KINDS.includes(o.kind)) return 'a poi needs a kind: ' + SITE_KINDS.join(' or ');
        return null;
      case 'scenery': return need('name') || (o.art === undefined && o.look === undefined ? 'a scenery body needs an art or a look' : null);
      case 'gate': return need('r');
      default: return null;
    }
  };
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
      // one file a tier, named <slot>-<tier> (shields-1 ... cargo-3): name is the tier's name in the shop, brief a short form for tight places,
      // the text under the front matter the shop's one-line description, then the numbers that tier brings (src/data_parts.js PARTS):
      // shields points, regen (points a second) and delay (ms without a hit before it recharges); weapons delay (ms between shots) and damage;
      // engine speedPct (+% top speed), jump (+ly), boostAdd (+px/s boost speed), boostTank and boostRegen; tank fuelMult; cargo holdPlus
      fields: {
        slot: P(SLOTS, true), tier: I(1, 3, true), name: T(40, true), brief: T(40), key: T(20), price: I(0, 1000000),
        points: I(0, 500), regen: N(0, 100), delay: I(20, 10000), damage: I(1, 100),
        speedPct: N(0, 100), jump: N(0, 20), boostAdd: I(0, 2000), boostTank: I(0, 500), boostRegen: I(0, 200),
        fuelMult: N(1, 5), holdPlus: I(0, 100), range: I(0, 855)   // range: the autotarget's reach in px, no more than a shot flies (src/autotarget.js)
      },
      sections: {}
    },
    system: {
      folder: 'systems', placeholders: [],
      fields: {
        name: T(40, true), kind: P(['home', 'outpost', 'trade', 'mining', 'volcanic', 'wild', 'graveyard', 'nest'], true), ly: L('num', { len: 2, min: -1000, max: 1000 }),
        size: I(4000, 200000), danger: I(0, 5), traffic: I(0, 3), pay: N(0.1, 5), seed: I(0, 2147483647),
        starType: P(['O', 'B', 'A', 'F', 'G', 'K', 'M']), starX: I(0, 200000), starY: I(0, 200000),
        pirateMax: I(1, 40), pirateEvery: I(1000, 600000) // a system's own pirate spawn table (enemies.js pirateTable): at most this many, one every this many ms; the weights are the Pirates section
      },
      sections: {
        bodies: {
          heading: 'Bodies', t: 'table', required: ['id', 'type'], rowCheck: bodyRowProblem, // x and y, or orbit and angle: bodyPlaceProblem says which is missing
          // art is the texture a body is drawn with; a planet is a kind (and a seed: the same kind and seed is the same planet on every boot) or art planet (Kepler-4b);
          // look is the station look of a dead station (scenery); labelDy moves the name label (pixels, negative is above); a site that has its own file in poi/ is paid from that file
          cols: {
            id: { t: 'id' }, type: P(BODY_TYPES, true), name: T(40), x: I(0, 200000), y: I(0, 200000), orbit: N(0, 200000), angle: N(-360, 360),
            art: P(BODY_ART), r: I(10, 5000), rocks: I(0, 200), landable: BOOL, kind: P(PLANET_KINDS.concat(SITE_KINDS)), seed: I(0, 2147483647),
            look: P(STATION_LOOKS), labelDy: I(-3000, 3000), credits: I(0, 100000), hull: I(0, 100), guard: I(0, 6), note: T(160)
          }
        },
        pirates: { heading: 'Pirates', t: 'table', required: ['kind', 'weight'], cols: { kind: P(PIRATE_IDS, true), weight: N(0, 1, true) } }
      }
    },
    station: {
      folder: 'stations', placeholders: PH,
      // fuel, repair and ore are the prices (src/fuel.js, station.js, asteroids.js); yard the ship models it sells (data_ships.js ids); partMult the price factor of its parts;
      // fee what it takes at the door; salvageMult how many times the usual a salvage pays here. The Parts section says which slots it sells and to which tier.
      fields: { name: T(40, true), system: R('system', true), accent: COLOR, fuel: N(0, 100), repair: N(0, 5), ore: N(0, 200), yard: L('id', { ref: 'ship' }), missions: L('id'), partMult: N(0.1, 5), fee: I(0, 100000), salvageMult: N(1, 5) },
      sections: {
        parts: { heading: 'Parts', t: 'table', required: ['slot', 'tier'], cols: { slot: P(SLOTS, true), tier: I(1, 3, true) } },
        welcome: { heading: 'Welcome', t: 'text', max: 400 },
        shop: { heading: 'Shop', t: 'table', required: ['item', 'price'], cols: { item: T(40, true), price: I(0, 1000000, true) } },
        services: { heading: 'Services', t: 'list', max: 60 },
        bar: { heading: 'Bar', t: 'list', max: LIMITS.line }
      }
    },
    mission: {
      folder: 'missions', placeholders: PH_MISSION,
      fields: {
        site: T(40), here: T(80), // a site call (kind salvage or survey; card space-game-site-calls-from-files): the id of the site in the call's system, and what to do there
        kind: P(['rescue', 'escort', 'patrol', 'bounty', 'courier', 'haul', 'salvage', 'survey'], true), title: T(40, true), where: T(60),
        reward: I(0, 1000000, true), count: I(1, 50), unlock: COND, system: R('system')
      },
      sections: {
        offer: { heading: 'Offer', t: 'text', max: 600 },
        boardLine: { heading: 'Board line', t: 'kv', keys: ['active', 'rescued', 'failed'], max: LIMITS.line },
        progress: { heading: 'Progress', t: 'text', max: 400 },
        progressRescued: { heading: 'Progress rescued', t: 'text', max: 400 }, // the progress text once the colonist is aboard (rescue calls)
        steps: { heading: 'Steps', t: 'list', max: 80 },
        failure: { heading: 'Failure', t: 'text', max: 240 }
      }
    },
    npc: {
      folder: 'npcs', placeholders: PH,
      fields: { name: T(24, true), role: T(40), color: COLOR, label: COLOR, appears: COND, station: R('station'), x: I(0, 8000), y: I(0, 8000), face: N(-6.3, 6.3), voice: T(40) },
      sections: {
        lines: { heading: 'Lines', t: 'list', max: LIMITS.line },
        reactions: { heading: 'Reactions', t: 'table', required: ['when', 'line'], cols: { when: { t: 'cond', req: true }, line: T(LIMITS.line, true) } },
        persona: { heading: 'Persona', t: 'text', max: LIMITS.persona }
      }
    },
    voice: {
      folder: 'voice', placeholders: PH,
      fields: { event: P(VOICE_EVENTS, true), replace: BOOL }, // replace: yes drops the built-in line for that event, so only the file's lines are said
      sections: { lines: { heading: 'Lines', t: 'list', max: LIMITS.line } }
    },
    text: {
      folder: 'text', placeholders: '*',
      fields: {},
      sections: { strings: { heading: 'Strings', t: 'table', required: ['key', 'text'], cols: { key: { t: 'textkey', req: true }, text: T(LIMITS.text, true) } } }
    },
    poi: { // salvage sites and random signals (src/poi.js): a fixed site's name, note and payout, and the kinds of signal that turn up
      folder: 'poi', placeholders: [],
      fields: {
        kind: P(['wreck', 'beacon'], true), name: T(40, true),
        credits: I(0, 100000), hull: I(0, 100), guard: I(0, 6),     // a fixed site (wreck-nw, beacon-e ...): what it pays, the hull it repairs, the pirates that guard it
        pays: L('int', { len: 2, min: 0, max: 100000 }), guardChance: N(0, 1), hullChance: N(0, 1) // a random signal (signal-beacon, signal-wreck): what it pays as [min, max], how often it is guarded, how often it repairs
      },
      sections: {} // the text under the front matter is the line shown when you salvage it
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
        if (!condOk(s)) return { bad: 'is ' + quote(s) + ' but is not a known condition. Known: ' + CONDITIONS.join(', ') };
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
      if (!dead && spec.rowCheck) { const bad = spec.rowCheck(obj); if (bad) { err(errors, 'error', path, row.n, '', bad + '. Ignored the row.'); dead = true; } }
      if (!dead) out.push(obj);
    }
    return out.length ? out : undefined;
  }

  // ---------- load a whole pack ----------
  // files: [{ path, text }]. Names starting with _ or . (in any folder) are ignored, so are files that are not .md.
  // the files of one world agree with each other (docs/MODDING.md 6.3, 6.4): a body id is used once in a system, a station row has its file and the
  // file says the same system, a site that has its own poi file is paid from it. A body id used twice drops the second row (an error); the rest are warnings.
  function worldChecks(entries, registry, opts, errors) {
    const at = (en, field, msg, level) => err(errors, level || 'warn', en.path, 0, field, msg);
    const rowsOf = en => (Array.isArray(en.data.bodies) ? en.data.bodies : []);
    entries.filter(en => en.type === 'system').forEach(en => {
      const seen = Object.create(null), keep = [];
      rowsOf(en).forEach(b => {
        if (seen[b.id]) { at(en, 'bodies', 'the body ' + quote(b.id) + ' is in the Bodies table twice. Ignored the second row.', 'error'); return; }
        // a body placed by its orbit must land inside the system's square, or nothing could fly to it
        if (b.x === undefined && b.orbit !== undefined) {
          const p = bodyPlace(b, en.data), size = en.data.size;
          if (p.x < 0 || p.y < 0 || (size !== undefined && (p.x > size || p.y > size))) { at(en, 'bodies', 'the body ' + quote(b.id) + ' with orbit ' + b.orbit + ' at angle ' + (b.angle || 0) + ' would be at x ' + p.x + ', y ' + p.y + ', outside the system' + (size !== undefined ? ' (size ' + size + ')' : '') + '. Ignored the row.', 'error'); return; }
        } else if (b.orbit !== undefined || b.angle !== undefined) at(en, 'bodies', 'the body ' + quote(b.id) + ' has x and y, so its ' + (b.orbit !== undefined && b.angle !== undefined ? 'orbit and angle are' : b.orbit !== undefined ? 'orbit is' : 'angle is') + ' ignored.');
        seen[b.id] = true; keep.push(b);
      });
      if (keep.length !== rowsOf(en).length) en.data.bodies = keep;
      keep.forEach(b => {
        if (b.type === 'station') {
          const st = entries.find(e => e.type === 'station' && e.id === b.id);
          if (!st) { if (!(opts.known && opts.known('station', b.id))) at(en, 'bodies', 'the station ' + quote(b.id) + ' has a row here but no file (stations/' + b.id + '.md).'); return; }
          if (st.data.system !== undefined && st.data.system !== en.id) at(st, 'system', 'system is ' + quote(st.data.system) + ' but ' + SCHEMA.system.folder + '/' + en.id + '.md has a station row for ' + quote(b.id) + '. The row is the one the game would place.');
          if (b.name !== undefined && st.data.name !== undefined && b.name !== st.data.name) at(st, 'name', 'name is ' + quote(st.data.name) + ' but the Bodies row in ' + en.path + ' calls it ' + quote(b.name) + '. The station file wins.');
        } else if (b.type === 'poi') {
          const pf = entries.find(e => e.type === 'poi' && e.id === b.id);
          if (!pf) return;
          const dup = ['name', 'credits', 'hull', 'guard', 'note'].filter(k => b[k] !== undefined);
          if (dup.length) at(en, 'bodies', 'the site ' + quote(b.id) + ' has its own file (' + pf.path + '), which pays it; the row says where, so ' + dup.join(', ') + ' in the row ' + (dup.length > 1 ? 'are' : 'is') + ' ignored.');
          if (pf.data.kind !== undefined && b.kind !== undefined && pf.data.kind !== b.kind) at(en, 'bodies', 'the site ' + quote(b.id) + ' is a ' + b.kind + ' here but a ' + pf.data.kind + ' in ' + pf.path + '.');
        }
      });
    });
    entries.filter(en => en.type === 'station' && en.data.system !== undefined).forEach(en => {
      const sys = entries.find(e => e.type === 'system' && e.id === en.data.system);
      if (sys && !rowsOf(sys).some(b => b.type === 'station' && b.id === en.id)) at(en, 'system', 'its system ' + quote(sys.id) + ' (' + sys.path + ') has no station row ' + quote(en.id) + ' in its Bodies table, so nothing places this dock.');
    });
  }

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
    worldChecks(entries, registry, opts, errors);
    entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const hash = hashOf(JSON.stringify(entries.map(e => [e.type, e.id, e.data])));
    return { entries, errors, hash, files: list.length };
  }

  // ---------- the second look: check an entry of content.generated.js, then merge it (docs/MODDING.md 5.1) ----------
  // The build already validated every file, but the browser does not take its word for it: a stale or hand-edited
  // content.generated.js is checked again here, field by field, against the same schema. A bad field is dropped (the built-in
  // value stays); a bad entry is skipped. Nothing here throws, whatever it is given.
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const itemSpec = spec => (spec.of === 'num' ? { t: 'num', min: spec.min, max: spec.max } : spec.of === 'int' ? { t: 'int', min: spec.min, max: spec.max } : { t: spec.of });

  // one typed value (already parsed by the build) against its spec: { v } or { bad: 'is ... but must be ...' }
  function checkValue(spec, v) {
    switch (spec.t) {
      case 'int': case 'num': return typeof v === 'number' && isFinite(v) ? parseValue(spec, String(v)) : { bad: 'is not a number' };
      case 'bool': return typeof v === 'boolean' ? { v } : { bad: 'is not yes or no' };
      case 'text':
        if (typeof v !== 'string') return { bad: 'is not text' };
        if (v === '') return { bad: 'is empty' };
        if (v.length > spec.max) return { bad: 'is ' + v.length + ' characters but the limit is ' + spec.max };
        if (clean(v) !== v) return { bad: 'has control characters in it' };
        return { v };
      case 'list': {
        if (!Array.isArray(v)) return { bad: 'is not a list' };
        if (v.length > LIMITS.list) return { bad: 'has ' + v.length + ' items but the limit is ' + LIMITS.list };
        if (spec.len && v.length !== spec.len) return { bad: 'must have exactly ' + spec.len + ' items' };
        const item = itemSpec(spec), out = [];
        for (const x of v) { const r = checkValue(item, x); if (r.bad) return { bad: 'has an item that ' + r.bad }; out.push(r.v); }
        return { v: out };
      }
      default: return typeof v === 'string' ? parseValue(spec, v) : { bad: 'is not text' }; // textkey, color, pick, id, cond
    }
  }

  // one ## section (text, list, key: text lines or table) -> { v } or null when nothing in it is usable; problems go to say(msg)
  function checkSection(spec, v, schema, say) {
    const ph = s => badPlaceholder(s, schema.placeholders);
    const line = (s, max) => {
      if (typeof s !== 'string' || s === '') return 'is not text';
      if (s.length > max) return 'is ' + s.length + ' characters but the limit is ' + max;
      if (clean(s) !== s) return 'has control characters in it';
      return ph(s);
    };
    if (spec.t === 'text') { const b = line(v, spec.max); if (b) { say(b); return null; } return { v }; }
    if (spec.t === 'list') {
      if (!Array.isArray(v)) { say('is not a list'); return null; }
      const out = [];
      v.forEach((s, i) => { if (i >= LIMITS.list) return; const b = line(s, spec.max); if (b) say('item ' + (i + 1) + ' ' + b); else out.push(s); });
      if (v.length > LIMITS.list) say('has more than ' + LIMITS.list + ' items; the rest are ignored');
      return out.length ? { v: out } : null;
    }
    if (spec.t === 'kv') {
      if (!isObj(v)) { say('is not a set of key: text lines'); return null; }
      const out = {}; let n = 0;
      Object.keys(v).forEach(k => {
        if (!spec.keys.includes(k)) { say('has the unknown key ' + quote(k)); return; }
        const b = line(v[k], spec.max); if (b) say(quote(k) + ' ' + b); else { out[k] = v[k]; n++; }
      });
      return n ? { v: out } : null;
    }
    if (spec.t === 'table') {
      if (!Array.isArray(v)) { say('is not a table'); return null; }
      const out = [];
      v.forEach((row, i) => {
        if (i >= LIMITS.rows) return;
        if (!isObj(row)) { say('row ' + (i + 1) + ' is not a row'); return; }
        const o = {}; let dead = false;
        Object.keys(row).forEach(c => {
          if (!hasOwn(spec.cols, c)) { say('row ' + (i + 1) + ' has the unknown column ' + quote(c)); return; }
          const cs = spec.cols[c], r = checkValue(cs, row[c]);
          if (r.bad) { say('row ' + (i + 1) + ' ' + c + ' ' + r.bad); if (cs.req || (spec.required || []).includes(c)) dead = true; return; }
          if (cs.t === 'text') { const b = ph(r.v); if (b) { say('row ' + (i + 1) + ' ' + c + ': ' + b); dead = true; return; } }
          o[c] = r.v;
        });
        (spec.required || []).forEach(c => { if (o[c] === undefined) dead = true; });
        if (!dead && spec.rowCheck) { const bad = spec.rowCheck(o); if (bad) { say('row ' + (i + 1) + ': ' + bad); dead = true; } }
        if (dead) say('row ' + (i + 1) + ' is skipped'); else out.push(o);
      });
      if (v.length > LIMITS.rows) say('has more than ' + LIMITS.rows + ' rows; the rest are ignored');
      return out.length ? { v: out } : null;
    }
    say('has an unknown type'); return null;
  }

  // entry: { type, id, path, data } from CONTENT.entries -> { data, errors }; data is null when the whole entry is skipped.
  // opts.defaultFor(type, id, field) -> the built-in value, for the "Kept the built-in value" part of a message.
  function checkEntry(entry, opts) {
    opts = opts || {};
    const errors = [], res = { data: null, errors };
    const path = isObj(entry) && typeof entry.path === 'string' ? clean(entry.path).slice(0, 200) : 'content.generated.js';
    const fail = (field, msg) => err(errors, 'error', path, 0, field, msg);
    if (!isObj(entry) || typeof entry.type !== 'string' || typeof entry.id !== 'string' || !isObj(entry.data)) { fail('', 'this entry of content.generated.js is not a content entry. Skipped it.'); return res; }
    if (!hasOwn(SCHEMA, entry.type)) { fail('type', 'type is ' + quote(clean(entry.type).slice(0, 30)) + ' but must be one of: ' + Object.keys(SCHEMA).join(', ') + '. Skipped the file.'); return res; }
    if (!ID_RE.test(entry.id)) { fail('id', 'the id ' + quote(clean(entry.id).slice(0, 50)) + ' must be a-z, 0-9 and dashes, starting with a letter, 40 characters at most. Skipped the file.'); return res; }
    const schema = SCHEMA[entry.type], src = entry.data, data = {};
    const keep = field => { const d = opts.defaultFor && opts.defaultFor(entry.type, entry.id, field); return d !== undefined && d !== null ? ' Kept the built-in value ' + (typeof d === 'object' ? JSON.stringify(d) : d) + '.' : ' Ignored.'; };
    let missing = false;
    Object.keys(src).forEach(k => {
      if (k === 'description') {
        const b = typeof src[k] === 'string' && src[k].length <= LIMITS.desc && clean(src[k]) === src[k] ? badPlaceholder(src[k], schema.placeholders) : 'is not usable text (at most ' + LIMITS.desc + ' characters)';
        if (b) fail(k, 'the description ' + b + '. Ignored.'); else data[k] = src[k];
      } else if (hasOwn(schema.fields, k)) {
        const spec = schema.fields[k], r = checkValue(spec, src[k]);
        let bad = r.bad ? k + ' ' + r.bad : null;
        if (!bad && spec.t === 'text') { const b = badPlaceholder(r.v, schema.placeholders); if (b) bad = k + ': ' + b; }
        if (bad) { fail(k, bad + '.' + (spec.req ? ' Skipped the file.' : keep(k))); if (spec.req) missing = true; } else data[k] = r.v;
      } else if (hasOwn(schema.sections, k)) {
        const sg = [], r = checkSection(schema.sections[k], src[k], schema, m => sg.push(m));
        sg.forEach(m => fail(k, 'the section ' + quote('## ' + schema.sections[k].heading) + ' ' + m + '. Ignored.'));
        if (r) data[k] = r.v;
      } else {
        const sg = suggest(k, Object.keys(schema.fields));
        fail(k, 'unknown field ' + quote(clean(k).slice(0, 30)) + '.' + (sg ? ' Did you mean ' + quote(sg) + '?' : '') + ' Ignored.');
      }
    });
    Object.keys(schema.fields).forEach(n => { if (schema.fields[n].req && data[n] === undefined && !missing) { fail(n, n + ' is required but missing. Skipped the file.'); missing = true; } });
    if (missing) return res;
    res.data = data;
    return res;
  }

  // content: the CONTENT object of content.generated.js (or anything, or nothing); tables: type -> a small adapter the game
  // registers for each table it has moved to markdown:
  //   { has(id) -> the code defines this id, get(id, field) -> its built-in value, apply(id, data, isNew), canAdd: true when a new id may be added }
  // A type with no adapter is reported once per file and left alone. Returns { loaded, hash, core, actual, modded, files, applied: ['ship:raider'], skipped, errors }.
  function apply(content, tables, opts) {
    opts = opts || {}; tables = isObj(tables) ? tables : {};
    const out = { loaded: false, hash: '', core: '', actual: '', modded: false, files: 0, applied: [], skipped: 0, errors: [] };
    const say = (level, path, field, msg) => err(out.errors, level, path, 0, field, msg);
    try {
      if (!isObj(content) || !Array.isArray(content.entries)) {
        say('error', 'content.generated.js', '', 'content.generated.js is missing: run node tools/build-content.mjs. Playing on the built-in values.');
        return out;
      }
      out.loaded = true;
      // the hash of what is really in the entries (the file carries none: a header that changed with the content made every merge conflict)
      try { out.actual = hashOf(JSON.stringify(content.entries.map(e => (isObj(e) ? [e.type, e.id, e.data] : e)))); } catch (e) { out.actual = ''; }
      out.hash = out.actual;
      try { out.files = +content.files > 0 ? +content.files | 0 : new Set(content.entries.map(e => (isObj(e) ? String(e.path || '') : ''))).size; } catch (e) { out.files = 0; }
      // MODDED: core is "sealed" in the shipped pack as committed (docs/SMOKE.md 2); a build of edited content writes the shipped
      // pack's hash there instead, and the entries then differ from it. An old file with a hex core is read the same way.
      out.core = String(content.core || '').slice(0, 16);
      out.modded = !!out.core && out.core !== 'sealed' && out.actual !== out.core;
      // what the build found
      (Array.isArray(content.errors) ? content.errors : []).slice(0, 500).forEach(e => {
        if (!isObj(e) || typeof e.message !== 'string') return;
        out.errors.push({ level: e.level === 'warn' ? 'warn' : 'error', path: clean(String(e.path || 'content')).slice(0, 200), line: +e.line > 0 ? +e.line | 0 : 0, field: clean(String(e.field || '')).slice(0, 40), message: clean(e.message).slice(0, 500) });
      });
      // one entry per type and id: when two files share one, the later path wins and both are named
      let list = content.entries;
      if (list.length > LIMITS.files) { say('error', 'content.generated.js', '', 'more than ' + LIMITS.files + ' entries; the rest are ignored.'); list = list.slice(0, LIMITS.files); }
      const byKey = new Map();
      list.forEach(en => {
        if (!isObj(en) || typeof en.type !== 'string' || typeof en.id !== 'string') { out.skipped++; say('error', 'content.generated.js', '', 'an entry is not a content entry. Skipped it.'); return; }
        const k = en.type + ':' + en.id, old = byKey.get(k);
        if (old) { say('warn', String(en.path || ''), '', 'there are two ' + clean(en.type).slice(0, 20) + ' files called ' + quote(clean(en.id).slice(0, 40)) + ' (' + clean(String(old.path || '')).slice(0, 100) + ' and this one). Used the later.'); if (String(en.path || '') < String(old.path || '')) return; }
        byKey.set(k, en);
      });
      byKey.forEach(en => {
        const table = hasOwn(tables, en.type) && isObj(tables[en.type]) ? tables[en.type] : null;
        const chk = checkEntry(en, { defaultFor: (t, id, f) => { try { return table && table.get ? table.get(id, f) : undefined; } catch (e) { return undefined; } } });
        chk.errors.forEach(e => out.errors.push(e));
        const path = clean(String(en.path || 'content')).slice(0, 200);
        if (!chk.data) { out.skipped++; return; }
        if (!table) { say('warn', path, '', 'this version of the game does not read ' + SCHEMA[en.type].folder + ' yet. Ignored the file.'); out.skipped++; return; }
        let known = true; // what the table said about the id: a row the game had before this file, or one this file adds
        try {
          known = !!table.has(en.id);
          if (!known && !table.canAdd) { say('error', path, '', 'the game has no built-in ' + en.type + ' called ' + quote(en.id) + ' and cannot add new ones. Skipped the file.'); out.skipped++; return; }
          table.apply(en.id, chk.data, !known);
          out.applied.push(en.type + ':' + en.id);
        } catch (e) {
          say('error', path, '', 'could not be applied (' + clean(String(e && e.message || e)).slice(0, 220) + '). ' + (known ? 'Kept the built-in values.' : 'Skipped the file.')); out.skipped++;
        }
      });
    } catch (e) {
      say('error', 'content.generated.js', '', 'could not be read (' + clean(String(e && e.message || e)).slice(0, 100) + '). Playing on the built-in values.');
    }
    return out;
  }

  // ---------- packs (docs/MODDING.md 13): a folder of files laid over the core pack ----------
  // a pack's name is its folder's name: lower-case letters, digits and dashes, starting with a letter
  const packName = n => typeof n === 'string' && ID_RE.test(n);
  // the optional _pack.md of a pack: title, author and about, each one line between two --- lines. Never throws; what is missing is empty.
  function packInfo(text) {
    const info = { title: '', author: '', about: '' };
    try {
      const m = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(String(text));
      if (!m) return info;
      const max = { title: 40, author: 40, about: 200 };
      m[1].split(/\r?\n/).forEach(line => {
        const kv = /^([a-z]+):[ \t]*(.*)$/.exec(line.trim());
        if (kv && Object.prototype.hasOwnProperty.call(max, kv[1])) info[kv[1]] = clean(kv[2]).trim().slice(0, max[kv[1]]);
      });
    } catch (e) { /* an unreadable _pack.md is just no info */ }
    return info;
  }
  // one pack from its files: [{ path: 'mods/<name>/missions/rescue.md', text }, ...], read like any content, with the problems named by that path
  function loadPack(name, files, opts) {
    const info = packInfo((files.find(f => f && f.path === 'mods/' + name + '/_pack.md') || {}).text || '');
    const r = loadAll(files, opts);
    return { name, title: info.title, author: info.author, about: info.about, files: r.files, hash: r.hash, entries: r.entries, errors: r.errors };
  }

  const api = { bodyPlace, LIMITS, SCHEMA, CONDITIONS, COLORS, FOLDERS, parse, validate, loadAll, formatError, suggest, levenshtein, hashOf, checkEntry, apply, packName, packInfo, loadPack };
  if (typeof module === 'object' && module && module.exports) module.exports = api; else root.ContentLib = api;
})(typeof self !== 'undefined' ? self : this);

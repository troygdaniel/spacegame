// ---------- Content tables: where the markdown meets the game's built-in tables (docs/MODDING.md 5.1 and 8) ----------
// boot.js's contentApply() hands every entry of content.generated.js to the adapter for its type (CONTENT_TABLES, below). An adapter
// changes the built-in row IN PLACE and only the fields the file sets, so a reference to the row (e.def === PIRATES.drone) still
// holds and a field a file leaves out keeps its built-in value. A file that disagrees with the code (a part in the wrong slot, a call
// of another kind) is refused with a message and the row stays as it was: apply() throws, ContentLib.apply reports it.
// The proof set that is read today, one table each (cards m4, m5 add the rest):
//   ship     the pirates in enemies.js PIRATES (raider, drone, gunship): the numbers and the radar colour
//   mission  the rows of MISSIONS in missions.js (rescue today): title, where, reward, count, the board text, progress, steps, failure line
//   npc      the characters of the bar in shop.js NPCS (juno today): look and place, lines, reactions, persona
//   part     the upgrade tiers of UPGRADES in shop.js (armor-1, armor-2, rapid-1 ... booster-2): name, text, price and the tier's numbers
// tests/contentproof.mjs pins that each file under content/ applied over its default changes nothing, and that editing one changes
// exactly what the file says.
const CT_HAS = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const CT_ORIG = new Map(); // the code's own function for a row, kept the first time a file replaces it (so applying twice never wraps a wrapper)
const ctOrig = (row, name) => { const k = row, m = CT_ORIG.get(k) || {}; if (!CT_ORIG.has(k)) CT_ORIG.set(k, m); if (!(name in m)) m[name] = row[name]; return m[name]; };
const ctHex = css => parseInt(String(css).slice(1), 16);                  // '#ffb454' -> 0xffb454
const ctCss = n => '#' + (n >>> 0).toString(16).padStart(6, '0');         // 0xffb454 -> '#ffb454'

// the {placeholders} a text may use (src/content.js PH), filled from the game as it is when the text is shown
function contentVars() {
  const safe = f => { try { const v = f(); return v === undefined || v === null ? '' : v; } catch (e) { return ''; } };
  const m = safe(() => missionDef());
  return {
    reward: safe(() => m ? m.reward : ''), count: safe(() => m && m.count ? m.count : ''), progress: safe(() => G.missionProgress | 0),
    credits: safe(() => G.credits | 0), ship: safe(() => activeShip().name), system: safe(() => sysDef().name),
    station: safe(() => (sysBody('station') || {}).name)
  };
}
function contentFill(text, extra) {
  const v = Object.assign(contentVars(), extra || {});
  return String(text).replace(/\{([a-z]+)\}/g, (all, k) => CT_HAS(v, k) ? String(v[k]) : all);
}

// the closed list of conditions a reaction line or an unlock rule may carry (docs/MODDING.md 3.4); anything unreadable is false
function contentWhen(cond) {
  try {
    const c = String(cond); let m;
    if (c === 'always') return true;
    if ((m = /^mission:(none|accepted|rescued|failed)$/.exec(c))) return G.mission === m[1];
    if ((m = /^mission-id:(.+)$/.exec(c))) return G.missionId === m[1];
    if ((m = /^credits>=(\d+)$/.exec(c))) return G.credits >= +m[1];
    if ((m = /^credits<(\d+)$/.exec(c))) return G.credits < +m[1];
    if ((m = /^upgrade:(.+)$/.exec(c))) { const k = m[1], t = CT_HAS(G.upgrades, k) ? G.upgrades[k] : activeShip().parts[k]; return (t | 0) > 0; } // an old key (armor) or a slot (shields)
    if ((m = /^patrols>=(\d+)$/.exec(c))) return (G.patrolsDone | 0) >= +m[1];
    if ((m = /^system:(.+)$/.exec(c))) return G.system === m[1];
    if ((m = /^ship:(.+)$/.exec(c))) return activeShip().model === m[1];
  } catch (e) { /* a condition that cannot be read is false */ }
  return false;
}

// ---- ship: the pirates ----
// content field -> PIRATES field, where the names differ. fireRange is the pirate's shooting range (a ship's own "range" is the jump range).
// name, role, side and the description are read and checked but nothing shows them yet (the hangar and the journal will)
const CT_SHIP_COPY = ['hp', 'speed', 'max', 'turn', 'engage', 'hold', 'aim', 'bullet', 'dmg', 'spread', 'ram', 'bounty', 'credits', 'strafe'];
const CT_SHIP = {
  canAdd: false,
  has: id => CT_HAS(PIRATES, id),
  get: (id, f) => { const d = PIRATES[id]; if (!d) return undefined; return f === 'fireRange' ? d.range : f === 'art' ? d.tex : f === 'radar' ? ctCss(d.radar) : d[f]; },
  apply: (id, data) => {
    const d = PIRATES[id];
    if (data.side !== undefined && data.side !== 'pirate') throw new Error('side is "' + data.side + '" but ' + id + ' is a pirate ship');
    CT_SHIP_COPY.forEach(k => { if (data[k] !== undefined) d[k] = data[k]; });
    if (data.shot !== undefined) d.shot = data.shot.slice();
    if (data.fireRange !== undefined) d.range = data.fireRange;
    if (data.radar !== undefined) d.radar = ctHex(data.radar);
    if (data.art !== undefined) d.tex = data.art;
  }
};

// ---- mission: the calls on the board ----
const CT_MISSION = {
  canAdd: false,
  has: id => MISSIONS.some(m => m.id === id),
  get: (id, f) => { const m = MISSIONS.find(x => x.id === id); return m ? m[f] : undefined; },
  apply: (id, data) => {
    const m = MISSIONS.find(x => x.id === id);
    if (data.kind !== undefined && data.kind !== id) throw new Error('kind is "' + data.kind + '" but the file is called ' + id + ', so its kind must be ' + id);
    ['title', 'where', 'reward', 'count'].forEach(k => { if (data[k] !== undefined) m[k] = data[k]; });
    // the board text and the failure line read as plain properties, so they are live getters (a text may hold {credits} or {progress})
    const live = (prop, text) => { if (text !== undefined) Object.defineProperty(m, prop, { get: () => contentFill(text), configurable: true, enumerable: true }); };
    live('offer', data.offer !== undefined ? data.offer : data.description);
    live('deathMsg', data.failure);
    if (data.boardLine) {
      const line0 = ctOrig(m, 'line'), bl = data.boardLine;
      m.line = st => { const t = st === 'rescued' ? bl.rescued : st === 'failed' ? bl.failed : bl.active; return t === undefined ? line0(st) : contentFill(t); };
    }
    if (data.progress !== undefined || data.progressRescued !== undefined) {
      const progress0 = ctOrig(m, 'progress');
      m.progress = () => { const t = G.mission === 'rescued' ? data.progressRescued : data.progress; return t === undefined ? progress0() : contentFill(t); };
    }
    if (data.steps && typeof HUD_MISSIONS !== 'undefined' && HUD_MISSIONS[id]) HUD_MISSIONS[id].steps = data.steps.map(t => /\{/.test(t) ? () => contentFill(t) : t);
  }
};

// ---- npc: the bar's characters ----
const CT_NPC = {
  canAdd: false,
  has: id => NPCS.some(n => n.id === id),
  get: (id, f) => { const n = NPCS.find(x => x.id === id); return n ? (f === 'color' ? n.css : n[f]) : undefined; },
  apply: (id, data) => {
    const n = NPCS.find(x => x.id === id);
    if (data.name !== undefined && data.name !== n.name && !n.sprite) n.sprite = n.name.toLowerCase(); // the bar's art is looked up by the old name
    ['name', 'role', 'voice', 'x', 'y', 'face', 'persona'].forEach(k => { if (data[k] !== undefined) n[k] = data[k]; });
    if (data.color !== undefined) { n.css = data.color; n.color = ctHex(data.color); }
    if (data.lines !== undefined) n.lines.splice(0, n.lines.length, ...data.lines);
    if (data.reactions !== undefined) { // the first row whose condition holds is what they say; none, and they say nothing
      const rows = data.reactions.map(r => ({ when: r.when, line: r.line }));
      n.react = () => { const r = rows.find(x => contentWhen(x.when)); return r ? contentFill(r.line) : null; };
    }
  }
};

// ---- part: the upgrade tiers ----
// one file a tier: armor-1, armor-2, rapid-1 ... The upgrade is the key, the tier is the number. The v1 keys sit in these slots (fleet.js SHIPREC.oldKeys).
// What each fitted tier gives: armor hullPlus (the max hull it adds in all), rapid delay (ms between shots), booster boostTank, boostRegen, boostAdd.
const CT_PART_FX = { armor: [['hullPlus', 'hull']], rapid: [['delay', 'delay']], booster: [['boostTank', 'boostTank'], ['boostRegen', 'boostRegen'], ['boostAdd', 'boostAdd']] };
function ctPart(id) { // 'armor-2' -> { u: the UPGRADES row, tier: 2 }, or null
  const m = /^([a-z]+)-([1-9])$/.exec(id), u = m && UPGRADES.find(x => x.key === m[1]);
  return u && +m[2] <= u.prices.length ? { u, tier: +m[2] } : null;
}
const CT_PART = {
  canAdd: false,
  has: id => !!ctPart(id),
  get: (id, f) => {
    const p = ctPart(id); if (!p) return undefined;
    const fx = (CT_PART_FX[p.u.key] || []).find(x => x[0] === f);
    return f === 'name' ? p.u.name : f === 'price' ? p.u.prices[p.tier - 1] : f === 'description' ? p.u.descs[p.tier - 1] : f === 'tier' ? p.tier : f === 'key' ? p.u.key
      : f === 'slot' ? SHIPREC.oldKeys[p.u.key] : fx ? UPGRADE_FX[fx[1]][p.tier] : undefined;
  },
  apply: (id, data) => {
    const p = ctPart(id), slot = SHIPREC.oldKeys[p.u.key];
    if (data.slot !== slot) throw new Error('slot is "' + data.slot + '" but ' + p.u.key + ' goes in the ' + slot + ' slot');
    if (data.tier !== p.tier) throw new Error('tier is ' + data.tier + ' but the file is called ' + id + ', so it must be tier ' + p.tier);
    if (data.key !== undefined && data.key !== p.u.key) throw new Error('key is "' + data.key + '" but the file is called ' + id);
    if (data.name !== undefined) p.u.name = data.name;
    if (data.price !== undefined) p.u.prices[p.tier - 1] = data.price;
    if (data.description !== undefined) p.u.descs[p.tier - 1] = data.description;
    (CT_PART_FX[p.u.key] || []).forEach(([field, fx]) => { if (data[field] !== undefined) UPGRADE_FX[fx][p.tier] = data[field]; });
  }
};

CONTENT_TABLES.ship = CT_SHIP;
CONTENT_TABLES.mission = CT_MISSION;
CONTENT_TABLES.npc = CT_NPC;
CONTENT_TABLES.part = CT_PART;

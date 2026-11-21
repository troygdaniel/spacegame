// ---------- Campaign: wing orders with groups and explicit targets (card space-game-campaign-wing-targets; Troy: command the fleet from the map) ----------
// The sim side of commanding the fleet from the map. An order names a GROUP, a VERB and a TARGET: campWingOrder(C, group, verb, target, how). Plain numbers and strings, no Phaser; tests/campwing.mjs runs it in Node.
//   groups   three built-in ones in CAMP.wing.groups: 'fighters', 'escorts' (the escorts, and the scouts they send out) and 'all'. A group is DATA: { name, kinds: ['fighter', ...] } or { name, ships: [ids] }, so numbered
//            groups drop in later: C.groups[id] = { name, ships } is read before the table (nothing builds them yet: bench idea 1, with ranks). A group left out is the verb's own (today's orders: Attack the fighters,
//            Escort the escorts, Guard and Recall everyone).
//   targets  a target is one of: an enemy (a ship of theirs), a friend (one of ours), a convoy, a place, a point { x, y }, a pickup (ore lying about), a cache (a resource cache), an anomaly (one that is noticed), a rock.
//            Give it as an entity id ('raider-3', 'freighter-h1', 'carrier', 'rock-4', 'chunk-9'), a nav row of the map (campNavRows: 'place:vesta', 'cache:0', 'anom:veil', 'scan:1', 'mother', 'tower:tower-3'),
//            a point { x, y }, a { kind, id } of these, or words ("mars", "the mothership", "the anomaly"). null is no target: the verb's own default (Attack: the nearest alien, Guard: the carrier, Escort: the nearest convoy).
//   verbs    CAMP.wing.verbs: which kinds of target a verb takes, the group it addresses when none is named, and how it ends. Pairs that are not in the table are refused with a plain line.
//   campWingOrder(C, group, verb, target, how, dry)  the one entry point (the five old orders go through it too): { ok, code, say, group, verb, target, n } or { ok: false, code, say }
//   campWingCheck(C, group, verb, target)            the same answer, and nothing done (the ship computer asks first)
//   campWingCancel(C, group, how)                    the group's orders are dropped: its ships go back to guarding the carrier (not home: that is Recall)
//   campWingState(C)                                 what the map draws: [{ id, name, n, order, mixed, target, center, ships, line }] one per group that has ships
//   campWingVerbs(C, target)                         the verbs that take this target, for the map's order menu;  campWingSmart(C, target)  the one a right-click does
//   campWingTarget(C, spec) / campWingLive(C, tg)    the words, id, row or point -> { kind, id, name, x, y, r, ref }; the same target with its position now (a ship moves)
//   campWingText(C, text, dry)                       the strip and the voice: "fighters at the mothership", "escorts to Mars", "all guard Ceres", "escorts scout the anomaly" (the order 'wing' of campDo)

// ---- groups ----
const CAMPWING_GROUP_WORDS = { fighter: 'fighters', fighters: 'fighters', escort: 'escorts', escorts: 'escorts', scout: 'escorts', scouts: 'escorts', all: 'all', everyone: 'all', everybody: 'all', wing: 'all', fleet: 'all', squadron: 'all', ships: 'all' };
// the group's id for a word or an id; '' for none; null for one that does not exist
function campWingGroupId(C, group) {
  if (group == null || group === '') return '';
  const g = String(group).toLowerCase().trim();
  if (C && C.groups && C.groups[g]) return g;
  if (Object.prototype.hasOwnProperty.call(CAMP.wing.groups, g)) return g;
  return CAMPWING_GROUP_WORDS[g] || null;
}
const campWingGroupSpec = (C, id) => (C && C.groups && C.groups[id]) || CAMP.wing.groups[id] || null;
const campWingGroupName = (C, id) => { const s = campWingGroupSpec(C, id); return s ? String(s.name) : String(id); };
// the ships of a group that are out now. free: the scouts that are out on their task are left to it (every verb but Recall and Scout)
function campWingShips(C, id, free) {
  const sp = campWingGroupSpec(C, id); if (!sp) return [];
  return C.ships.filter(u => u.team === 'earth' && u.hp > 0 && (u.kind === 'fighter' || u.kind === 'escort') && (sp.ships ? sp.ships.indexOf(u.id) >= 0 : (sp.kinds || []).indexOf(u.kind) >= 0) && !(free && u.scout));
}

// ---- targets ----
const campWingKindOf = u => u.team === 'alien' ? 'enemy' : u.kind === 'freighter' ? 'convoy' : 'friend';
const CAMPWING_KIND_WORDS = { enemy: 'an enemy', friend: 'one of ours', convoy: 'a convoy', place: 'a place', point: 'a point', pickup: 'ore', cache: 'a cache', anomaly: 'an anomaly', rock: 'a rock' };
function campWingShipName(C, u) {
  if (u.kind === 'mother') return 'the mothership';
  if (u.kind === 'carrier') return 'the carrier';
  if (u.kind === 'freighter') return typeof campConvoyName === 'function' ? campConvoyName(u) + ' convoy' : 'the convoy';
  return (u.team === 'alien' ? 'the ' : 'our ') + u.kind;
}
const campWingShipTarget = (C, u) => ({ kind: campWingKindOf(u), id: u.id, name: campWingShipName(C, u), x: u.x, y: u.y, r: u.r || 0, ref: u.id });
function campWingPlaceTarget(C, id) {
  const p = campPlaces(C.level)[id]; if (!p || p.hidden) return null;
  return { kind: 'place', id: 'place:' + id, name: String(p.name), x: p.x, y: p.y, r: p.r || 60, ref: 'place:' + id };
}
function campWingAnomalyTarget(C, a) { return a && (a.state === 'hidden' ? a.sensed : a.state === 'revealed') ? { kind: 'anomaly', id: 'anom:' + a.id, name: a.state === 'hidden' ? 'the anomaly' : 'the alien cache', x: a.x, y: a.y, r: 0, ref: 'anom:' + a.id } : null; }
// by the id strings of the game and of the map's list; null when it names nothing now
function campWingById(C, s) {
  let m;
  if (C.by[s] && C.by[s].hp > 0) return campWingShipTarget(C, C.by[s]);
  if (s === 'carrier') return campWingShipTarget(C, C.carrier);
  if ((m = /^place:(.+)$/.exec(s))) return campWingPlaceTarget(C, m[1]);
  if ((m = /^convoy:(.+)$/.exec(s))) return C.by[m[1]] && C.by[m[1]].hp > 0 ? campWingShipTarget(C, C.by[m[1]]) : null;
  if ((m = /^tower:(.+)$/.exec(s))) return C.by[m[1]] && C.by[m[1]].hp > 0 ? campWingShipTarget(C, C.by[m[1]]) : null;
  if (s === 'mother' || s === 'mothership') { const mo = C.ships.find(u => u.kind === 'mother' && u.hp > 0); return mo ? campWingShipTarget(C, mo) : null; }
  if ((m = /^cache:(\d+)$/.exec(s))) { const k = C.caches[+m[1]]; return k && !k.got ? { kind: 'cache', id: s, name: 'the cache', x: k.x, y: k.y, r: 0, ref: s } : null; }
  if ((m = /^anom:(.+)$/.exec(s))) return campWingAnomalyTarget(C, (C.anoms || []).find(a => a.id === m[1]));
  if ((m = /^scan:(\d+)$/.exec(s))) { const p = (C.scan || [])[+m[1]]; return p && !p.got ? { kind: 'point', id: s, name: 'the scan point', x: p.x, y: p.y, r: p.r || 0, ref: s } : null; }
  if (s === 'relic') return C.relic ? { kind: 'point', id: 'relic', name: 'the relic', x: C.relic.x, y: C.relic.y, r: 0, ref: 'relic' } : null;
  if (/^rock-/.test(s)) { const r = C.rocks.find(o => o.id === s && o.hp > 0); return r ? { kind: 'rock', id: s, name: 'the rock', x: r.x, y: r.y, r: r.r || 0, ref: s } : null; }
  if (/^(?:chunk|wreck)-/.test(s)) { const p = C.pickups.find(o => o.id === s); return p ? { kind: 'pickup', id: s, name: 'the ore', x: p.x, y: p.y, r: 0, ref: s } : null; }
  return null;
}
// by words: "mars", "the mothership", "the anomaly", "that cache", "the nearest ore"
function campWingByWords(C, text) {
  const q = String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); if (!q) return null;
  const near = (list, f) => list.filter(f).sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier))[0] || null;
  if (/\b(?:anomal(?:y|ies)|shimmer|cloaked)\b/.test(q)) { const a = near((C.anoms || []).filter(x => campWingAnomalyTarget(C, x)), () => true); return campWingAnomalyTarget(C, a); }
  if (/\b(?:ore|chunks?|wrecks?|salvage|loot)\b/.test(q)) { const p = near(C.pickups, () => true); return p ? campWingById(C, p.id) : null; }
  if (/\b(?:cache|caches|supplies|pods?)\b/.test(q) && !/\bconvoy\b/.test(q)) { const i = C.caches.map((k, n) => [k, n]).filter(x => !x[0].got).sort((a, b) => campDist(a[0], C.carrier) - campDist(b[0], C.carrier))[0]; return i ? campWingById(C, 'cache:' + i[1]) : null; }
  if (/\b(?:rock|rocks|asteroid|asteroids)\b/.test(q)) { const r = near(C.rocks, o => o.hp > 0); return r ? campWingById(C, r.id) : null; }
  if (/\b(?:gunship|raider|drone|tower|enemy|alien|bandit|pirate)s?\b/.test(q)) { const kind = (/\b(gunship|raider|drone|tower)/.exec(q) || [])[1]; const e = near(C.ships, u => u.team === 'alien' && u.hp > 0 && (!kind || u.kind === kind)); return e ? campWingShipTarget(C, e) : null; }
  const t = typeof campFind === 'function' ? campFind(C, text) : null;
  if (!t) return null;
  if (t.kind === 'mother') return campWingById(C, 'mother');
  if (t.kind === 'carrier') return campWingById(C, 'carrier');
  if (t.kind === 'convoy') return campWingById(C, t.id);
  if (t.kind === 'place') return campWingPlaceTarget(C, t.id);
  return null;
}
// the target of anything the caller may hold: null for none given, false for one given that names nothing now
function campWingTarget(C, spec) {
  if (spec == null || spec === '') return null;
  let r = null;
  if (typeof spec === 'string') r = campWingById(C, spec) || (/^[a-z]+[-:][a-z0-9:_-]+$/.test(spec) ? null : campWingByWords(C, spec)); // an id that names nothing is not words ("rock-999" is not "the nearest rock")
  else if (typeof spec === 'object') {
    if (typeof spec.id === 'string' && (r = campWingById(C, spec.id))) { /* an id or a nav row */ }
    else if (typeof spec.ref === 'string' && (r = campWingById(C, spec.ref))) { /* a target of this file, handed back */ }
    else if (Number.isFinite(spec.x) && Number.isFinite(spec.y) && (!spec.kind || spec.kind === 'point' || !spec.id)) r = { kind: 'point', id: 'point', name: spec.name ? String(spec.name) : 'that point', x: spec.x, y: spec.y, r: spec.r || 0, ref: '' };
  }
  return r || false;
}
// the same target now: a ship has moved, ore has been taken; null when it is gone
function campWingLive(C, tg) {
  if (!tg) return null;
  if (tg.kind === 'point' && !tg.ref) return tg;
  const r = campWingById(C, tg.ref || tg.id || ''); return r || (tg.kind === 'point' && Number.isFinite(tg.x) ? tg : null);
}

// ---- the verbs and what they do ----
// the order a verb puts on a ship; the AI is campWingAI in src/campaign.js. tg: the target, or null for the verb's own default
const CAMPWING_ORDER = {
  attack: (C, u, tg) => ({ type: 'attack', target: tg ? tg.id : '' }),
  escort: (C, u, tg, i) => ({ type: 'escort', target: tg.id, slot: i }),
  guard: (C, u, tg) => ({ type: 'guard', at: !tg || tg.id === C.carrier.id ? { kind: 'carrier' } : tg.kind === 'place' ? { kind: 'place', id: tg.id.slice(6) } : tg.kind === 'point' ? { kind: 'point', x: tg.x, y: tg.y } : { kind: tg.kind, id: tg.id } }),
  hold: (C, u, tg) => ({ type: 'hold', at: { x: tg.x, y: tg.y } }),
  fetch: (C, u, tg) => ({ type: 'fetch' }),
  mine: (C, u, tg) => ({ type: 'mine', target: tg ? tg.id : '' }),
  recall: () => ({ type: 'recall' })
};
const campWingNo = (code, vars) => ({ ok: false, code, say: uiText('camp.no.' + code, vars) });
function campWingPlural(n, one, many) { return n === 1 ? one : many; }

function campWingOrder(C, group, verb, target, how, dry) {
  if (!C || C.result) return campNo('over');
  const V = CAMP.wing.verbs[verb]; if (!V) return campNo('what');
  const gid = campWingGroupId(C, group); if (gid === null) return campWingNo('wnogroup');
  const id = gid || V.group, ships = campWingShips(C, id, verb !== 'recall' && verb !== 'scout');
  const empty = { fighters: 'nofighters', escorts: 'noescorts', all: 'nowing' }[id] || 'nowing';
  if (!ships.length && verb !== 'scout') return campNo(C.launchQ.length ? 'launching' : empty);
  const tg = campWingTarget(C, target);
  if (tg === false) return campWingNo('wnotarget');
  const gname = campWingGroupName(C, id);
  if (verb === 'recall') {
    if (dry) return campYes('recall');
    ships.forEach(u => { u.order = { type: 'recall' }; u.move = null; }); C.orders.recall++;
    if (id !== 'escorts') (C.repairs || []).forEach(r => { r.stay = true; }); // a fighter still being mended stays aboard when it is whole (src/camprepair.js)
    return campWingDone(C, id, verb, null, ships, how, 'recall');
  }
  if (tg && V.kinds.indexOf(tg.kind) < 0) return campWingNo('wbadpair', { group: gname, verb, what: CAMPWING_KIND_WORDS[tg.kind] || tg.kind });
  if (!tg && V.need) return campWingNo('wneed', { verb });
  if (verb === 'scout') { // the scouts' own order (card space-game-campaign-scouts): the nearest free escort flies to the place, reads it and comes home
    if (typeof campScoutDo !== 'function') return campWingNo('wnoscout');
    const r = campScoutDo(C, { x: tg.x, y: tg.y, name: tg.name }, dry);
    if (r && r.ok && !dry) { C.events.push({ type: 'wingorder', group: id, verb, target: { kind: tg.kind, id: tg.id, name: tg.name }, n: 1, how: how || '' }); }
    return r;
  }
  let say = 'wing.' + verb, vars = { group: gname, name: tg ? tg.name : '' }, tgo = tg;
  if (verb === 'attack') {
    if (tg && C.by[tg.id] && C.by[tg.id].kind === 'mother') say = id === V.group ? 'attackmother' : 'wing.attack'; // today's words for today's order, the generic ones for any other group
    else if (!tg) say = id === V.group ? 'attack' : 'wing.attacknear';
  } else if (verb === 'escort') {
    if (!tg) {
      if (!C.L.convoys.length) { // no convoys in this level: Escort keeps the escorts close to the carrier
        if (dry) return campYes('escortcarrier');
        ships.forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; }); C.orders.escort++;
        return campWingDone(C, id, verb, null, ships, how, 'escortcarrier');
      }
      const cv = campNearest(campConvoys(C), C.carrier); if (!cv) return campNo('noconvoy');
      tgo = campWingShipTarget(C, cv); say = id === V.group ? 'escort' : say; vars = { name: campConvoyName(cv), group: gname };
    } else if (tg.kind === 'convoy' && id === V.group) { say = 'escort'; vars = { name: campConvoyName(C.by[tg.id]), group: gname }; }
  } else if (verb === 'guard') {
    if (!tg || tg.id === C.carrier.id) { say = id === V.group ? 'guard' : 'wing.guardcarrier'; }
    else if (id === V.group && (tg.kind === 'place' || tg.kind === 'convoy')) say = 'guard';
  } else if (verb === 'fetch') {
    if (!tg) { // nothing named: the nearest ore lying about, else the nearest cache
      const p = campNearest(C.pickups, C.carrier), k = C.caches.map((q, n) => [q, n]).filter(x => !x[0].got).sort((a, b) => campDist(a[0], C.carrier) - campDist(b[0], C.carrier))[0];
      tgo = p ? campWingById(C, p.id) : k ? campWingById(C, 'cache:' + k[1]) : null; if (!tgo) return campWingNo('wnothing');
      vars = { group: gname, name: tgo.name };
    }
  } else if (verb === 'mine') {
    if (!C.pickups.length && !C.rocks.some(r => r.hp > 0)) return campNo('noore');
    say = tg ? 'wing.mine' : 'mine';
  }
  if (dry) return campYes(say, vars);
  ships.forEach((u, i) => { u.order = CAMPWING_ORDER[verb](C, u, tgo, i); if (tgo) u.order.tg = { kind: tgo.kind, id: tgo.id, ref: tgo.ref, name: tgo.name, x: tgo.x, y: tgo.y }; u.move = null; });
  C.orders[verb] = (C.orders[verb] | 0) + 1;
  return campWingDone(C, id, verb, tgo, ships, how, say, vars);
}
function campWingDone(C, id, verb, tg, ships, how, code, vars) {
  C.events.push({ type: 'wingorder', group: id, verb, target: tg ? { kind: tg.kind, id: tg.id, name: tg.name } : null, n: ships.length, how: how || '' });
  const r = campYes(code, vars || { group: campWingGroupName(C, id), name: tg ? tg.name : '' });
  r.group = id; r.verb = verb; r.target = tg; r.n = ships.length; return r;
}
const campWingCheck = (C, group, verb, target) => campWingOrder(C, group, verb, target, 'check', true);

// the group's orders are dropped: its ships go back to guarding the carrier
function campWingCancel(C, group, how, dry) {
  if (!C || C.result) return campNo('over');
  const gid = campWingGroupId(C, group); if (gid === null) return campWingNo('wnogroup');
  const id = gid || 'all', ships = campWingShips(C, id, true);
  if (!ships.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
  if (dry) return campYes('wing.cancel', { group: campWingGroupName(C, id), name: '' });
  ships.forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; });
  C.events.push({ type: 'wingorder', group: id, verb: 'cancel', target: null, n: ships.length, how: how || '' });
  const r = campYes('wing.cancel', { group: campWingGroupName(C, id), name: '' }); r.group = id; r.verb = 'cancel'; r.n = ships.length; return r;
}

// ---- what the map draws ----
const campWingOrderKey = u => { const o = u.order || { type: 'guard', at: { kind: 'carrier' } }; return o.type + '|' + (o.tg ? o.tg.id : o.target || (o.at && o.at.id) || (o.at && o.at.kind) || ''); };
function campWingState(C) {
  const out = [], ids = Object.keys(CAMP.wing.groups).concat(Object.keys(C.groups || {}));
  ids.forEach(id => {
    const ships = campWingShips(C, id, false); if (!ships.length) return;
    const count = {}; ships.forEach(u => { const k = campWingOrderKey(u); count[k] = (count[k] || 0) + 1; });
    const keys = Object.keys(count).sort((a, b) => count[b] - count[a]), best = keys[0], lead = ships.find(u => campWingOrderKey(u) === best), o = lead.order || { type: 'guard', at: { kind: 'carrier' } };
    const cx = ships.reduce((a, u) => a + u.x, 0) / ships.length, cy = ships.reduce((a, u) => a + u.y, 0) / ships.length;
    let target = null;
    if (o.type === 'recall') target = campWingShipTarget(C, C.carrier);
    else if (o.tg) target = campWingLive(C, o.tg);
    else if (o.type === 'attack' && o.target) { const u = C.by[o.target]; target = u && u.hp > 0 ? campWingShipTarget(C, u) : null; }
    else if (o.type === 'escort' && o.target) { const u = C.by[o.target]; target = u && u.hp > 0 ? campWingShipTarget(C, u) : null; }
    else if (o.type === 'guard' && o.at && o.at.kind === 'place') target = campWingPlaceTarget(C, o.at.id);
    else if (o.type === 'hold' && o.at) target = { kind: 'point', id: 'point', name: 'that point', x: o.at.x, y: o.at.y, r: 0, ref: '' };
    out.push({ id, name: campWingGroupName(C, id), n: ships.length, order: o.type, mixed: keys.length > 1, stance: C.stance || 'free', target, center: { x: cx, y: cy },
      ships: ships.map(u => ({ id: u.id, kind: u.kind, x: u.x, y: u.y, scout: !!u.scout })), line: target ? { from: { x: cx, y: cy }, to: { x: target.x, y: target.y } } : null });
  });
  return out;
}
// the verbs that take this target (the map's order menu), and the one a right-click does
function campWingVerbs(C, target) {
  const tg = campWingTarget(C, target); if (!tg) return [];
  return Object.keys(CAMP.wing.verbs).filter(v => CAMP.wing.verbs[v].kinds.indexOf(tg.kind) >= 0 && (v !== 'scout' || typeof campScoutDo === 'function'));
}
function campWingSmart(C, target) {
  const tg = campWingTarget(C, target); if (!tg) return '';
  const v = CAMP.wing.smart[tg.kind]; return v && campWingVerbs(C, tg).indexOf(v) >= 0 ? v : (campWingVerbs(C, tg)[0] || '');
}

// ---- the strip and the voice ----
// "fighters at the mothership", "escorts to Mars", "all guard Ceres", "escorts scout the anomaly", "fighters hold at Ceres", "cancel the fighters"
const CAMPWING_VERB_WORDS = { attack: 'attack', engage: 'attack', hit: 'attack', strike: 'attack', guard: 'guard', defend: 'guard', protect: 'guard', escort: 'escort', cover: 'escort', scout: 'scout', recon: 'scout', reconnoitre: 'scout', fetch: 'fetch', get: 'fetch', collect: 'fetch', grab: 'fetch', retrieve: 'fetch', hold: 'hold', mine: 'mine', recall: 'recall' };
function campWingParse(text) {
  const q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:the |our )/, '');
  const mc = /^(?:cancel|stop|stand down|release|clear)\s+(?:the |our )?(fighters?|escorts?|scouts?|all|everyone|everybody|wing|fleet|squadron|ships)\b/.exec(q); if (mc) return { group: CAMPWING_GROUP_WORDS[mc[1]], verb: 'cancel', target: '' };
  let m = /^(fighters?|escorts?|scouts?|all|everyone|everybody|wing|fleet|squadron|ships)\b\s*(.*)$/.exec(q); if (!m) return null;
  const group = CAMPWING_GROUP_WORDS[m[1]]; let rest = m[2].replace(/^(?:to |should |must |please )/, '');
  let verb = '', mv = /^(attack|engage|hit|strike|guard|defend|protect|escort|cover|scout|recon|reconnoitre|fetch|get|collect|grab|retrieve|hold|mine|recall)\b\s*(.*)$/.exec(rest);
  if (mv) { verb = CAMPWING_VERB_WORDS[mv[1]]; rest = mv[2]; }
  rest = rest.replace(/^(?:at|to|on|over|for|near|beside|around|in)\b\s*/, '').replace(/^(?:the |that |our )/, '').trim();
  return { group, verb, target: rest };
}
function campWingText(C, text, dry) {
  const p = typeof text === 'object' && text ? text : campWingParse(text);
  if (!p) return campWingNo('wnogroup');
  if (p.verb === 'cancel' || (!p.verb && /^(?:cancel|stand down|stand by|carry on)$/.test(p.target || ''))) return campWingCancel(C, p.group, 'strip', dry);
  if (p.verb === 'recall') return campWingOrder(C, p.group, 'recall', null, 'strip', dry);
  const tg = p.target ? campWingTarget(C, p.target) : null;
  if (p.target && tg === false) return campWingNo('wnotarget');
  const verb = p.verb || (tg ? campWingSmart(C, tg) : '');
  if (!verb) return campWingNo(tg ? 'wbadpair' : 'wneed', { group: campWingGroupName(C, p.group), verb: p.verb || 'order', what: tg ? CAMPWING_KIND_WORDS[tg.kind] : '' });
  return campWingOrder(C, p.group, verb, tg || null, 'strip', dry);
}

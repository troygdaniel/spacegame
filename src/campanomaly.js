// ---------- Campaign: the anomalies (card space-game-campaign-anomalies; Troy, 20 Nov 2026) ----------
// Off the missions' routes there are spots where space looks odd and warped, like the Predator's cloak: CLOAKED ENEMY CACHES, a store of weapons and a tech lab of the aliens. The cloak fools the sensors
// (no contact, no name) but not the eye: it shows as a shimmer. Nothing is known about it until the carrier comes: it is noticed at CAMP.anomaly.sense (a mark on the radar and the map, "Anomaly" in the
// nav list, one line from the ship), and visited at CAMP.anomaly.visit for CAMP.anomaly.hold seconds it DECLOAKS: the shimmer drops, the cache is shown, the cloaked guards come out round it and attack.
// When the guards are dead the reward is given, once: ore (as chunks lying on the cache for any ship to pick up), a heavier weapon (more missiles in the magazine, a heavier turret), and a tech item that is
// offered at the Earth refit as one more choice. What was looted is saved (P.found: '<level>.<id>') and does not come back; the weapons stay with the pilot. The pure half (no Phaser, no page;
// tests/campanomaly.mjs runs it in Node); src/campaignscene.js draws the haze and the cache, src/campmap.js the marks, src/campnav.js the list.
// The table is CAMP.levels[n].anomalies in src/campaign.js (a row: id, at [x, y] or place + off, r, hides (words: a weapons store, a tech lab), guards { kind: n }, reward { ore, missiles, turret, tech }, bonus
// objectives of the missions name an anomaly by id: { id, type: 'anomaly', anomaly: '<id>' }); the numbers are CAMP.anomaly.
//   campAnomalyRows(level)    the level's rows with their places worked out: [{ id, key, x, y, r, hides, guards, reward }]
//   campAnomNew(C, found)     at campNew: C.anoms (one state each: hidden, revealed, done, or old when it was looted in an earlier flight), C.found (the keys), the loot of the old ones applied
//   campAnomalies(C, dt)      once a tick: notice, visit, decloak, the guards, the reward
//   campAnomUpgrades(found)   { missiles, turret, techs } of the keys looted so far: what stays with the pilot
//   campAnomSense(C)          how far the carrier notices one (the lens tech doubles it)
//   campAnomFound(C, id)      true when the anomaly has been decloaked (this flight) or was looted before: what the bonus objective asks
//   campAnomMarks(C)          what the map and the radar show: [{ id, x, y, r, state, shown, name }] for every anomaly that is noticed and not looted
//   campAnomTechs(found, picked)  the tech items looted and not yet picked: the Earth refit's extra choices

function campAnomalyRows(level) {
  const L = CAMP.levels[level], pl = campPlaces(level), out = [];
  ((L && L.anomalies) || []).forEach(a => {
    let x = a.at ? a.at[0] : 0, y = a.at ? a.at[1] : 0;
    if (a.place) { const p = pl[a.place]; if (!p) return; x = p.x + (a.off ? a.off[0] : 0); y = p.y + (a.off ? a.off[1] : 0); }
    out.push({ id: a.id, key: level + '.' + a.id, x, y, r: a.r || CAMP.anomaly.size, hides: a.hides || 'cache', guards: a.guards || {}, reward: a.reward || {} });
  });
  return out;
}

function campAnomUpgrades(found) {
  const out = { missiles: 0, turret: 1, techs: [] }, list = Array.isArray(found) ? found : [];
  Object.keys(CAMP.levels).forEach(lv => campAnomalyRows(lv).forEach(a => {
    if (list.indexOf(a.key) < 0) return;
    out.missiles += a.reward.missiles | 0; if (a.reward.turret) out.turret *= 1 + a.reward.turret; if (a.reward.tech && CAMP.tech[a.reward.tech]) out.techs.push(a.reward.tech);
  }));
  return out;
}

function campAnomApply(C, up) { // the weapons of the loot: the magazine holds more (never past `max`), the turrets hit harder
  C.magazine = Math.min(CAMP.missile.max, CAMP.missile.magazine + up.missiles);
  C.turretMul = up.turret;
}

function campAnomNew(C, found) {
  const list = Array.isArray(found) ? found.filter(k => typeof k === 'string').slice(0, 99) : [];
  C.found = list.slice();
  C.anoms = campAnomalyRows(C.level).map(a => Object.assign(a, { state: list.indexOf(a.key) >= 0 ? 'old' : 'hidden', sensed: false, hold: 0, clearedAt: 0, ids: [] }));
  const up = campAnomUpgrades(list); campAnomApply(C, up); C.missiles = Math.min(C.magazine, C.missiles + up.missiles); // the extra missiles of the old loot are in the magazine at the start
  C.anomsFound = 0; // looted in this flight
}

const campAnomSense = C => CAMP.anomaly.sense * (campHas(C, 'lens') ? CAMP.tech.lens.sense : 1);
const campAnomFound = (C, id) => (C.anoms || []).some(a => a.id === id && a.state !== 'hidden');

function campAnomalies(C, dt) {
  const K = CAMP.anomaly, c = C.carrier; if (!C.anoms || !c || c.hp <= 0) return;
  C.anoms.forEach(a => {
    if (a.state === 'old' || a.state === 'done') return;
    const d = campDist(c, a);
    if (a.state === 'hidden') {
      if (!a.sensed && d <= campAnomSense(C)) { a.sensed = true; C.events.push({ type: 'anomaly', stage: 'sense', id: a.id, x: a.x, y: a.y }); campSay(C, 'camp.say.anom.sense'); }
      if (d <= K.visit) a.hold += dt; else a.hold = Math.max(0, a.hold - dt);
      if (a.hold >= K.hold) campAnomReveal(C, a);
    } else if (a.state === 'revealed') {
      const alive = a.ids.some(id => C.by[id] && C.by[id].hp > 0);
      if (alive) { a.clearedAt = 0; return; }
      if (!a.clearedAt) a.clearedAt = C.t;
      if (C.t - a.clearedAt >= K.done) campAnomLoot(C, a);
    }
  });
}

function campAnomReveal(C, a) { // the cloak drops: the cache is shown and its guards come out round it, against the carrier
  const K = CAMP.anomaly; a.state = 'revealed'; a.sensed = true; a.hold = 0; a.ids = [];
  const kinds = []; Object.keys(a.guards).forEach(k => { for (let i = 0; i < (a.guards[k] | 0); i++) kinds.push(k); });
  kinds.forEach((k, i) => { const ang = i / Math.max(1, kinds.length) * 2 * Math.PI + a.x * 0.001, u = campSpawn(C, k, a.x + Math.cos(ang) * K.ring, a.y + Math.sin(ang) * K.ring); if (u) { u.anom = a.id; u.goal = 'carrier'; a.ids.push(u.id); } });
  C.events.push({ type: 'anomaly', stage: 'reveal', id: a.id, x: a.x, y: a.y, r: a.r, guards: a.ids.length });
  campSay(C, 'camp.say.anom.reveal', { what: uiText('camp.anom.hides.' + a.hides) });
}

function campAnomLoot(C, a) { // the guards are dead: the reward, once
  const K = CAMP.anomaly, r = a.reward; a.state = 'done'; if (C.found.indexOf(a.key) < 0) C.found.push(a.key); C.anomsFound = (C.anomsFound | 0) + 1;
  if (r.missiles || r.turret) { const up = campAnomUpgrades(C.found); campAnomApply(C, up); if (r.missiles) C.missiles = Math.min(C.magazine, C.missiles + (r.missiles | 0)); }
  const n = Math.ceil((r.ore | 0) / K.chunk);
  for (let i = 0; i < n; i++) { const ang = i / Math.max(1, n) * 2 * Math.PI, rad = 40 + (i % 2) * 30; C.pickups.push({ id: 'chunk-' + (C.nextId++), kind: 'chunk', x: a.x + Math.cos(ang) * rad, y: a.y + Math.sin(ang) * rad, ore: K.chunk, born: C.t }); }
  C.events.push({ type: 'anomaly', stage: 'done', id: a.id, key: a.key, x: a.x, y: a.y, reward: { ore: r.ore | 0, missiles: r.missiles | 0, turret: r.turret || 0, tech: r.tech || '' } });
  const bits = [];
  if (r.missiles) bits.push(uiText('camp.anom.got.missiles', { n: r.missiles }));
  if (r.turret) bits.push(uiText('camp.anom.got.turret', { pct: Math.round(r.turret * 100) }));
  if (r.tech && CAMP.tech[r.tech]) bits.push(uiText('camp.anom.got.tech', { name: uiText('camp.tech.' + r.tech + '.name') }));
  if (r.ore) bits.push(uiText('camp.anom.got.ore', { n: r.ore }));
  campSay(C, 'camp.say.anom.done', { list: bits.join(', ') });
}

// the tech items looted and not yet picked, in the order of the table: the Earth refit offers them as a choice after the level's own
function campAnomTechs(found, picked) { return campAnomUpgrades(found).techs.filter(t => (picked || []).indexOf(t) < 0); }

// what the map and the radar show: an unlabelled warped mark for what is noticed and hidden; the cache, once decloaked, until its guards are dead and it is looted
function campAnomMarks(C) {
  return (C.anoms || []).filter(a => a.sensed && (a.state === 'hidden' || a.state === 'revealed')).map(a => ({ id: a.id, x: a.x, y: a.y, r: a.r, state: a.state, shown: a.state === 'revealed', name: uiText(a.state === 'hidden' ? 'camp.nav.anomaly' : 'camp.nav.anomrev') }));
}

// a line for the ship computer's picture of the battle: what is noticed and how far (nothing when nothing is)
function campAnomLine(C) {
  const m = campAnomMarks(C).filter(a => !a.shown).sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier));
  const r = campAnomMarks(C).filter(a => a.shown).length;
  return (m.length ? ' Anomalies noticed: ' + m.length + ' (odd, warped spots of space: a cloaked alien cache hides in one; the nearest is ' + Math.round(campDist(m[0], C.carrier) / 10) + ' km away; fly there and hold still for ' + CAMP.anomaly.hold + ' seconds to decloak it, the guards come out).' : '') + (r ? ' A decloaked alien cache is open: kill its guards to loot it.' : '');
}

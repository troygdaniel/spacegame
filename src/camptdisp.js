// ---------- Campaign: the target display (card space-game-target-display; Troy, 22 Nov 2026) ----------
// Troy: "the bottom right mini map can go away, to make way to show the target selected": a TARGET DISPLAY like X-Wing's, in the corner the radar had, about its size: a picture of the ship, its name and type, hull and shield
// bars with numbers, how far it is and one line of what it is doing. With nothing selected it is not there. It shows the one TARGET (C.tgt, picked with A D S: a hostile) and, in a friendly colour, a ship you are picking
// in an order's sub-list (to escort, to guard, to help: src/camppick.js): the candidate the highlight is on, or the one an order was just given at for a moment. This file is the rule, with no Phaser and no page
// (tests/camptdisp.mjs and tests/campfdisp.mjs run it in Node); the numbers are CAMP.tdisp in src/campaign.js, the words are content/text/camptdisp.md (camp.tdisp.*), the drawing is src/camptdispscene.js.
//   campTdispSubject(C, P, now)  the ship shown now: { u, side: 'hostile' | 'friend' }, or null. A sub-list's candidate comes first (what the player is deciding on), else the target. P is the panels' state (campPanelNew), now the scene's ms
//   campTdispInfo(C, u, side)    what is drawn: { id, side, kind, name, type, hull: { now, max, share }, shield: { now, max, share } | null, km, doing, key } (key: everything the drawing shows, so it is drawn again only when it changes)
//   campTdispDoing(C, u)         the one line: what the ship is doing, read from the same picks the AIs make (campAlienAI, campPirateTarget, the wing's orders) without moving anything
//   campTdispName(C, u)          the name the lists give it ("Skiff 3", "Hauler 2", "Transport convoy"; a pilot's ship: the pilot's name, "Wedge")
//   campFdispSubject(C)          the ship the FRIEND display shows (card space-game-friendly-display; the bottom LEFT corner, the mirror of the target display): the friend A or D picked (C.sel, campSelUnits in src/camptarget.js), a pilot or a ship you protect, or null; for Q, all three pilots, { u: null, all: [the ships out] }
//   campTdispPostInfo(C, e)      what an outpost shows when it is the target held: its name, "Friendly post", how far; no bars, no picture (the key line is the box's)
//   campTdispOrder(C, verb)      the key line at the foot of the target box (Attack for an enemy, Guard for a friendly): { verb, key, label, ok }: the key from the key table (CAMP_KEYS[verb].k), the word, and ok when the order can be given now (campSelOrder, a dry run: nothing moves)
//   campFdispAllInfo(C, units)   what that display draws for Q (card space-game-q-all-pilots-panel): { name: 'All pilots', rows: [{ id, name, hull }], key }
const campTdispName = u => {
  if (u.kind === 'fighter' && u.team === 'earth' && typeof campPilotName === 'function' && campPilotName(u)) return campPilotName(u); // Wedge, Kara, Apollo (card space-game-three-pilots)
  if (u.kind === 'freighter' || (u.kind === 'miner' && u.team === 'neutral')) return u.kind === 'freighter' && !u.named ? campConvoyName(u) + ' convoy' : (u.kind === 'freighter' ? campConvoyName(u) : (u.cname || campNavUnitName(u))); // as the Escort sub-list names it (campPickEscorts)
  return campNavUnitName(u);
};
const campTdispWho = (C, t) => !t ? '' : t === C.carrier ? uiText('camp.tdisp.who.cruiser') : t === C.earth ? uiText('camp.tdisp.who.earth') : campTdispName(t); // who it is at: the cruiser, Earth or a ship by its name
function campTdispSubject(C, P, now) { // the ONE target box (bottom right): a ship an order's list is on, else the one target held: an enemy ([ ] \\) or a friendly ship or outpost (O P), held: true (card space-game-keys2-panels)
  if (!C || !C.carrier) return null;
  const it = P && typeof campPickShown === 'function' ? campPickShown(P, C, now) : null, u = it && it.what === 'ship' && C.by ? C.by[it.id] : null;
  if (u && u.hp > 0) return { u, side: u.team === 'alien' ? 'hostile' : 'friend' };
  const h = typeof campHeldNow === 'function' ? campHeldNow(C) : null; // the ONE target held: the enemy or the friendly (src/camptarget.js)
  if (!h) return null;
  if (h.post) return { u: null, post: h.post, side: 'friend', held: true };
  return h.unit && h.unit.hp > 0 && !h.unit.gone ? { u: h.unit, side: h.kind === 'hostile' ? 'hostile' : 'friend', held: true } : null;
}
function campFdispSubject(C) {
  if (!C || !C.carrier || typeof campSelUnits !== 'function') return null;
  const u = campSelUnits(C).who; // WHO (A D): one pilot's ship, or All pilots (the default; card space-game-keys-select)
  if (u) return u.hp > 0 && !u.gone ? { u, side: 'friend' } : null;
  const f = typeof campSelNow === 'function' ? campSelNow(C) : null; // All pilots (A D's first stop, Q) (card space-game-q-selects-all): no one ship, the display shows All pilots and a row for each pilot out (card space-game-q-all-pilots-panel)
  return f && f.kind === 'all' ? { u: null, all: (f.units || []).filter(x => x && x.hp > 0 && !x.gone), side: 'friend' } : null;
}
function campTdispPostInfo(C, e) {
  const km = campNavKm(campDist(e, C.carrier)), type = uiText('camp.tdisp.type.post');
  return { id: e.id, side: 'friend', kind: 'post', name: e.name, type, hull: null, shield: null, km, doing: '', key: [e.id, 'post', e.name, km].join('|') };
}
function campTdispOrder(C, verb) {
  const r = typeof campSelOrder === 'function' ? campSelOrder(C, verb, 'key', true) : null, k = typeof CAMP_KEYS === 'object' ? ((CAMP_KEYS.engage || CAMP_KEYS[verb] || {}).k || '') : ''; // E is the one order key (CAMP_KEYS.engage, card space-game-keys2-orders); before that, the verb's own
  return { verb, key: Array.isArray(k) ? String(k[0] || '') : String(k || ''), label: uiText('camp.tdisp.key.' + verb), ok: !!(r && r.ok) };
}
function campFdispAllInfo(C, units) { // what the Q display draws: its title and a row for each pilot out, with the pilot's name and hull; key: everything it shows
  const rows = (units || []).map(u => ({ id: u.id, name: campTdispName(u), hull: campTdispHull(u) }));
  return { id: 'all', side: 'friend', kind: 'all', name: uiText('camp.sel.all'), rows, key: ['all'].concat(rows.map(r => r.id + ':' + r.name + ':' + r.hull.now + '/' + r.hull.max)).join('|') };
}
// the ship a hostile is going for, as the AIs pick it (campAlienAI for an alien, campPirateTarget for a pirate and a torpedo boat); the carrier (or Earth) when nothing nearer is
function campTdispFoe(C, u) {
  if (u.faction === 'pirate' || u.boat) return (typeof campPirateTarget === 'function' ? campPirateTarget(C, u) : null) || C.carrier;
  if (u.hitBy && u.distractedUntil > C.t) { const h = C.by[u.hitBy]; if (h && h.hp > 0) return h; }
  if (u.goal && u.goal.indexOf('convoy:') === 0) { const f = C.by['freighter-' + u.goal.slice(7)]; if (f && f.hp > 0) return f; }
  const near = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, ((u.def && u.def.engage) || 600) * 0.7);
  return near || C.earth || C.carrier;
}
const campTdispPlace = (C, p) => { // the place a ship's road ends at, by name: the nearest place to the point (inside its own size and a little more), else ''
  if (!p || typeof campPlaces !== 'function') return ''; const pl = campPlaces(C.level); let best = '', bd = Infinity;
  Object.keys(pl).forEach(id => { const q = pl[id]; if (!q || q.hidden) return; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && d <= (q.r || 60) + 300) { bd = d; best = String(q.name || id); } });
  return best;
};
function campTdispDoing(C, u) {
  const t = (k, v) => uiText('camp.tdisp.do.' + k, v);
  if (u.team === 'alien') {
    if (u.running) return t('run');
    if (u.hold) return t('hold');
    if (u.rival) return t('rival.' + (u.rival.ph || 'stalk'));
    if (u.kind === 'tower') return t('tower');
    if (u.arming > 0) return t('arm');
    if (u.kind === 'mother') { const near = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, CAMP.mother.range); return near ? t('mother.fire', { who: campTdispWho(C, near) }) : t('mother.close'); }
    if (u.lost) return t('lost');
    return t('attack', { who: campTdispWho(C, campTdispFoe(C, u)) });
  }
  if (u.team === 'neutral') {
    if (u.cord) return t(u.cord === 'run' ? 'run.c' : u.cord === 'hold' ? 'hold.c' : u.cord);
    if (u.kind === 'patrol') return t('patrol');
    if (u.kind === 'miner') return u.phase === 'run' ? t('flee') : u.phase === 'work' ? t('work') : u.phase === 'home' ? t('home') : u.phase === 'dock' ? t('dock') : u.stay ? t('stay') : t('out');
    return t('idle');
  }
  if (u.kind === 'freighter') { // the transport and the haulers
    if (u.cord) return t(u.cord === 'run' ? 'run.c' : u.cord === 'hold' ? 'hold.c' : u.cord);
    const where = campTdispPlace(C, u.dest); return where ? t('road', { where }) : t('road.none');
  }
  if (u.repair) return t('repair'); // a fighter under 30 percent hull flies home to be mended, whatever its order
  const o = u.order || { type: 'guard' }, tg = o.target && C.by[o.target] && C.by[o.target].hp > 0 ? C.by[o.target] : null;
  switch (o.type) {
    case 'attack': return t('attack', { who: tg ? campTdispWho(C, tg) : uiText('camp.tdisp.who.nearest') });
    case 'escort': return t('escort', { who: tg ? campTdispWho(C, tg) : uiText('camp.tdisp.who.cruiser') });
    case 'hold': return t('hold.f');
    case 'mine': return t('mine');
    case 'recall': return t('recall');
    case 'fetch': return t('fetch');
    default: return t('guard');
  }
}
const campTdispHull = u => ({ now: Math.max(0, Math.ceil(u.hp)), max: Math.max(1, Math.round(u.maxHp || u.hp || 1)), share: Math.max(0, Math.min(1, u.hp / (u.maxHp || u.hp || 1))) });
function campTdispShield(C, u) { // the rival has a shield of its own; the cruiser's is C.shield; nothing else shields
  if (u.rival && u.rival.shMax > 0) return { now: Math.max(0, Math.ceil(u.rival.sh)), max: Math.round(u.rival.shMax), share: Math.max(0, Math.min(1, u.rival.sh / u.rival.shMax)) };
  if (u === C.carrier) return { now: Math.max(0, Math.ceil(C.shield)), max: CAMP.carrier.shield, share: Math.max(0, Math.min(1, C.shield / CAMP.carrier.shield)) };
  return null;
}
function campTdispInfo(C, u, side) {
  const hull = campTdispHull(u), shield = campTdispShield(C, u), km = campNavKm(campDist(u, C.carrier)), doing = campTdispDoing(C, u), name = campTdispName(u);
  const sd = u.team === 'alien' ? (u.faction === 'pirate' ? 'pirate' : 'alien') : u.team === 'neutral' ? 'neutral' : 'earth';
  const what = uiText('camp.nav.k.' + (u.kind || '')), type = uiText('camp.tdisp.type', { side: uiText('camp.tdisp.side.' + sd), what: (what.indexOf('camp.nav.k.') === 0 ? String(u.kind || '') : what).toLowerCase() });
  return { id: u.id, side, kind: u.kind, name, type, hull, shield, km, doing, key: [u.id, side, name, hull.now, hull.max, shield ? shield.now + '/' + shield.max : '-', km, doing].join('|') };
}

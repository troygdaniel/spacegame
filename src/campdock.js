// ---------- Campaign: the dock's rows in the ready room (card space-game-campaign-outposts; Troy, 20 Nov 2026) ----------
// Docking at a friendly outpost (src/campoutpost.js) opens the ready room (src/camphubscene.js) with the rows of a dock: BUILD ships, REPAIR the hull, REFIT (the tech, the Fabricator), the mission board and UNDOCK.
// The scene is started by the Campaign scene (campaignscene.js openDock) with { dock: <outpost id>, camp: <the battle>, P: <its progress>, rows, at, station, onLaunch, onLeave }; everything the rows
// do to the battle goes through the same orders the keys and the strip use (campOrder: build, repair), so the rules are in one place. This file only registers the rows in the registries of src/camphub.js
// (CAMP_HUB.note, .act, .rowKey) and src/camphubscene.js (CAMP_HUBS.page, .stops, .face, .run).
const CAMP_DOCK = { rows: ['build', 'repair', 'upgrade', 'board', 'undock'] }; // the rows of a dock's room, in order: a digit picks each (the Campaign's panels: a digit picks)
const campDockC = ctx => (ctx && ctx.camp) || null;
const campDockWing = C => ({ f: C.bay.fighters + campWing(C, 'fighter').length + C.launchQ.filter(k => k === 'fighter').length + campRepairing(C, 'fighter'), e: C.bay.escorts + campWing(C, 'escort').length + C.launchQ.filter(k => k === 'escort').length, q: C.build.queue.length });

CAMP_HUB.note.build = (P, ctx) => { const C = campDockC(ctx); return C ? uiText('camp.hub.note.build', { ore: campFunds(C) }) : ''; };
CAMP_HUB.note.repair = (P, ctx) => { const C = campDockC(ctx); return C ? uiText('camp.hub.note.repair', { pct: Math.round(C.carrier.hp / C.carrier.maxHp * 100) }) : ''; };
CAMP_HUB.note.upgrade = (P, ctx) => { const C = campDockC(ctx); return C && campHas(C, 'fabricator') ? uiText('camp.hub.note.fabbed') : uiText('camp.hub.note.fab', { cost: CAMP.outpost.fabricator }); };
CAMP_HUB.note.undock = (P, ctx) => uiText('camp.hub.note.undock', { name: ctx && ctx.station && ctx.station.name ? ctx.station.name : '' });
CAMP_HUB.act.undock = 'undock';

// BUILD: F a fighter, E an escort, through the order (so the ore, the bay room and the queue are the order's); REPAIR: R mends the hull for ore; REFIT: U fits the Fabricator
CAMP_HUB.rowKey.build = (H, P, code, res, ctx) => {
  const C = campDockC(ctx); if (!C || (code !== 'KeyF' && code !== 'KeyE')) return null;
  const r = campOrder(C, 'build', code === 'KeyF' ? 'fighter' : 'escort', 'key'); res.used = true; res.ok = r.ok; res.say = { text: r.say }; return res;
};
CAMP_HUB.rowKey.repair = (H, P, code, res, ctx) => {
  const C = campDockC(ctx); if (!C || code !== 'KeyR') return null;
  const r = campOrder(C, 'repair', '', 'key'); res.used = true; res.ok = r.ok; res.say = { text: r.say }; return res;
};
CAMP_HUB.rowKey.upgrade = (H, P, code, res, ctx) => {
  const C = campDockC(ctx); if (!C || code !== 'KeyU') return null;
  res.used = true; const cost = CAMP.outpost.fabricator;
  if (campHas(C, 'fabricator')) { res.ok = false; res.say = { key: 'camp.hub.nothing', vars: {} }; return res; }
  if (campFunds(C) < cost) { res.ok = false; res.say = { key: 'camp.hub.upgrade.no', vars: { need: cost, have: campFunds(C) } }; return res; }
  campPay(C, cost); C.techs.push('fabricator'); campPick(P, 'fabricator'); // the battle has it now and the progress keeps it (campPick: once)
  res.ok = true; res.changed = true; res.say = { key: 'camp.hub.upgrade.bought', vars: { ore: campFunds(C) } }; return res;
};

// the pages
CAMP_HUBS.page.build = s => {
  const C = campDockC(s.d); if (!C) return; const w = campDockWing(C), B = CAMP.build; let i = 0;
  s.line(i++, 0, uiText('camp.hub.build.head', { name: s.look.name.toUpperCase() }), '#6dff9c');
  s.line(i++, 0, uiText('camp.hub.build.ore', { ore: campFunds(C) }), '#ffd37a');
  { const ov = typeof campStoreOver === 'function' ? campStoreOver(C) : null; if (ov && ov.over > 0) s.line(i++, 0, uiText('camp.hub.build.over', ov), '#ffb454'); } // more than the store carries on from the mission: this room is where it can still be spent
  s.line(i++, 0, uiText('camp.hub.build.wing', { f: w.f, e: w.e, q: w.q }), '#e8f6ff');
  i++; s.line(i++, 0, uiText('camp.hub.build.keys', { fc: B.fighterCost, ec: B.escortCost }), '#9fe9ff');
  s.line(i++, 0, uiText('camp.hub.build.room', { ft: B.fighterTime, et: B.escortTime }), '#8fb4c9');
  if (s.msg && s.msg.until > s.time.now) s.line(i + 1, 0, s.msg.text, s.msg.ok ? '#6dff9c' : '#ffb454');
};
CAMP_HUBS.page.repair = s => {
  const C = campDockC(s.d); if (!C) return; const c = C.carrier; let i = 0;
  s.line(i++, 0, uiText('camp.hub.repair.head'), '#6dff9c');
  s.line(i++, 0, uiText('camp.hub.repair.hull', { hp: Math.round(c.hp), max: Math.round(c.maxHp) }), '#e8f6ff');
  s.line(i++, 0, uiText('camp.hub.build.ore', { ore: campFunds(C) }), '#ffd37a');
  const r = campCheck(C, 'repair', ''); i++;
  s.line(i++, 0, c.maxHp - c.hp <= 0.5 ? uiText('camp.hub.repair.sound') : uiText('camp.hub.repair.key', { ore: Math.max(5, Math.ceil(CAMP.outpost.repairOre * (c.maxHp - c.hp) / c.maxHp)) }), r.ok ? '#9fe9ff' : '#8fb4c9');
  if (s.msg && s.msg.until > s.time.now) s.line(i + 1, 0, s.msg.text, s.msg.ok ? '#6dff9c' : '#ffb454');
};
CAMP_HUBS.page.upgrade = s => {
  const C = campDockC(s.d); if (!C) return; let i = 0, fab = campHas(C, 'fabricator');
  s.line(i++, 0, uiText('camp.hub.upgrade.head'), '#6dff9c');
  s.line(i++, 0, uiText('camp.hub.upgrade.ore', { ore: campFunds(C) }), '#ffd37a');
  const techs = C.techs.map(t => uiText('camp.tech.' + t + '.name'));
  s.line(i++, 0, techs.length ? uiText('camp.hub.upgrade.have', { list: techs.join(', ') }) : uiText('camp.hub.upgrade.none'), '#e8f6ff');
  i++; s.line(i++, 0, fab ? uiText('camp.hub.upgrade.fitted') : uiText('camp.hub.upgrade.fab', { cost: CAMP.outpost.fabricator }), fab ? '#6dff9c' : '#9fe9ff');
  if (s.msg && s.msg.until > s.time.now) s.line(i + 1, 0, s.msg.text, s.msg.ok ? '#6dff9c' : '#ffb454');
};
CAMP_HUBS.page.undock = s => {
  let i = 0; s.line(i++, 0, uiText('camp.hub.undock.head'), '#ffd37a');
  s.line(i++, 0, uiText('camp.hub.undock.at', { name: s.look.name }), '#e8f6ff'); i++;
  s.line(i++, 0, uiText('camp.hub.undock.line'), '#ffb454');
};
// where the pilot stands: the shipyard at the pad, the repair bay, the refit at the open floor, the way out at the pad
CAMP_HUBS.stops.build = [1028, 394]; CAMP_HUBS.stops.repair = [640, 246]; CAMP_HUBS.stops.upgrade = [336, 312]; CAMP_HUBS.stops.undock = [1028, 394];
CAMP_HUBS.face.build = -0.5; CAMP_HUBS.face.repair = -1.5708; CAMP_HUBS.face.upgrade = -1.5708; CAMP_HUBS.face.undock = -0.5;
CAMP_HUBS.run.undock = s => s.launch(); // an action's doing: a dock's way out is the scene's onLaunch

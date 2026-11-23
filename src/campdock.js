// ---------- Campaign: the dock's rows in the ready room (card space-game-campaign-outposts; Troy, 20 Nov 2026) ----------
// Docking at a friendly outpost (src/campoutpost.js) opens the ready room (src/camphubscene.js) with the rows of a dock: REPAIR the hull at half price, the mission board and UNDOCK. (Until card space-game-repair-with-ore
// there were BUILD and REFIT rows too: nothing builds ships any more, and the Fabricator is gone; a market outpost buys the ore the moment you dock.)
// The scene is started by the Campaign scene (campaignscene.js openDock) with { dock: <outpost id>, camp: <the battle>, P: <its progress>, rows, at, station, onLaunch, onLeave }; everything the rows
// do to the battle goes through the same order the keys and the strip use (campOrder: repair), so the rules are in one place. This file only registers the rows in the registries of src/camphub.js
// (CAMP_HUB.note, .act, .rowKey) and src/camphubscene.js (CAMP_HUBS.page, .stops, .face, .run).
const CAMP_DOCK = { rows: ['repair', 'board', 'undock'] }; // the rows of a dock's room, in order: a digit picks each (the Campaign's panels: a digit picks)
const campDockC = ctx => (ctx && ctx.camp) || null;

CAMP_HUB.note.repair = (P, ctx) => { const C = campDockC(ctx); return C ? uiText('camp.hub.note.repair', { pct: Math.round(C.carrier.hp / C.carrier.maxHp * 100) }) : ''; };
CAMP_HUB.note.undock = (P, ctx) => uiText('camp.hub.note.undock', { name: ctx && ctx.station && ctx.station.name ? ctx.station.name : '' });
CAMP_HUB.act.undock = 'undock';

// REPAIR: R mends the hull for ore (half price here)
CAMP_HUB.rowKey.repair = (H, P, code, res, ctx) => {
  const C = campDockC(ctx); if (!C || code !== 'KeyR') return null;
  const r = campOrder(C, 'repair', '', 'key'); res.used = true; res.ok = r.ok; res.say = { text: r.say }; return res;
};

// the pages
CAMP_HUBS.page.repair = s => {
  const C = campDockC(s.d); if (!C) return; const c = C.carrier; let i = 0;
  s.line(i++, 0, uiText('camp.hub.repair.head'), '#6dff9c');
  s.line(i++, 0, uiText('camp.hub.repair.hull', { hp: Math.round(c.hp), max: Math.round(c.maxHp) }), '#e8f6ff');
  s.line(i++, 0, uiText('camp.hub.repair.ore', { ore: campFunds(C) }), '#ffd37a');
  { const ov = typeof campStoreOver === 'function' ? campStoreOver(C) : null; if (ov && ov.over > 0) s.line(i++, 0, uiText('camp.hub.build.over', ov), '#ffb454'); } // more than the store carries on from the mission: this room is where it can still be spent (card space-game-l1-pacing-bugs)
  const r = campCheck(C, 'repair', ''); i++;
  s.line(i++, 0, c.maxHp - c.hp <= 0.5 ? uiText('camp.hub.repair.sound') : uiText('camp.hub.repair.key', { ore: campMendQuote(C).cost }), r.ok ? '#9fe9ff' : '#8fb4c9');
  if (s.msg && s.msg.until > s.time.now) s.line(i + 1, 0, s.msg.text, s.msg.ok ? '#6dff9c' : '#ffb454');
};
CAMP_HUBS.page.undock = s => {
  let i = 0; s.line(i++, 0, uiText('camp.hub.undock.head'), '#ffd37a');
  s.line(i++, 0, uiText('camp.hub.undock.at', { name: s.look.name }), '#e8f6ff'); i++;
  s.line(i++, 0, uiText('camp.hub.undock.line'), '#ffb454');
};
// where the pilot stands: the repair bay, the way out at the pad
CAMP_HUBS.stops.repair = [640, 246]; CAMP_HUBS.stops.undock = [1028, 394];
CAMP_HUBS.face.repair = -1.5708; CAMP_HUBS.face.undock = -0.5;
CAMP_HUBS.run.undock = s => s.launch(); // an action's doing: a dock's way out is the scene's onLaunch

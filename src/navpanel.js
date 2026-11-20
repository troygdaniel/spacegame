// ---------- Navigation panel: a side menu of where you can go (card space-game-nav-panel) ----------
// The map is for looking; this is for choosing. A panel on the left of the Space view lists every place the ship can travel to, in groups, each
// group nearest first, with the distance and a small icon of what it is:
//   MISSION              what the open call wants: a body here, or the system it is in
//   STATIONS             stations and outposts
//   SUN, PLANETS AND BELTS
//   SIGNALS              salvage sites and signals you have found
//   GATES AND JUMPS      the gate, then every charted system the ship can reach from here (light years, and the fuel the jump burns)
// N opens it with the keys on it: W S (or the arrows) choose, Enter on a place flies there at once (on the station it docks, on the planet you can
// land on it lands: the order takes the ship all the way in; P on the row only flies there; card space-game-hunt-pirates: Enter used to only set the
// destination and a second Enter went, and Troy pressed it 19 times without flying). A jump row keeps its two steps: Enter sets it, Enter again jumps,
// because a jump burns fuel. X clears the destination, N closes. A click on a row does what Enter does. It opens by itself, without taking the keys, when you launch or arrive (you
// have no destination yet) and when the call gives you a new goal; it goes away again after a few seconds. The destination stays pinned at the
// top of the panel's place with its distance while you fly, panel open or not.
//
// It adds no way to travel. Going there is what the game already had: a body is flown to by the autopilot (src/autopilot.js autopilotGo, which
// cruises the middle of a long leg by itself), another system by the jump (src/jump.js jumpStart, behind the same locks and fuel check as the
// galaxy map). The destination of a body is cruise's own target (s.cr.target, src/cruise.js cruisePick), so C, P, the Tab map, the Overview's target row
// and the HUD arrow all agree on it. Places are picked here and by a click in space, nowhere else (tests/onetarget.mjs).
//
// It replaces the N list that src/cruise.js drew. cruise.js still owns the N key and the state other files read (s.cr.navOpen: the list has the
// keyboard; s.cr.list and s.cr.sel: the rows and the chosen one, which P in src/autopilot.js reads), and calls in here:
//   navpanelSetup(s)                 from cruiseSetup
//   navpanelFrame(s, time, keys)     from cruiseFrame, where the old list read its keys: 'nav' while the panel has the keyboard
//   navpanelOpen / navpanelClose / navpanelDraw   behind cruiseNavOpen, cruiseNavClose and cruiseNavDraw
// The pinned line and the timed opening run on the scene's postupdate event, because cruiseFrame returns early while cruising.
// With the Overview list (src/overview.js, B, under the radar): Overview is what is around you in a fight, ships included, by range; this is where
// to go, other systems included. While this panel has the keys Overview lets go of them (it reads s.cr.navOpen).
// tests/navpanel.mjs checks the grouping, the sort and the window in plain Node.
const NAVPANEL = {
  job: 54,      // px: the height of the job line (up to three lines of the next step) above the destination
  x: 24, y: 140, w: 322, row: 22, max: 13, min: 4, // the left side; y is the highest it sits (it goes below the gauges and the mission checklist, src/hud.js); lines shown at most and at least (rows and group headings)
  bottom: 584,  // nothing of it below this: the tips band and the key line are there
  peek: 9000,   // ms it stays up when it opened by itself
  every: 250,   // ms between rebuilds of the list
  groups: [['mission', 'MISSION'], ['stations', 'STATIONS'], ['bodies', 'SUN, PLANETS AND BELTS'], ['signals', 'SIGNALS'], ['gates', 'GATES AND JUMPS']],
  of: { star: 'bodies', station: 'stations', scenery: 'stations', planet: 'bodies', belt: 'bodies', poi: 'signals', gate: 'gates' },
  colors: { station: '#38e1ff', scenery: '#9fb6c8', planet: '#ffb454', belt: '#9fb6c8', poi: '#6dff9c', gate: '#c08cff', jump: '#c08cff', mission: '#ffd37a', off: '#5b7a92' }
};

// ---- the list: pure ----

// bodies: rows of cruiseKnown (id, name, type, look, x, y, r, dist). jumps: [{ id, name, ly, cost, ok, why }] for the systems in reach.
// mission: null, { name, x, y, id? } for a goal in this system, or { system, name, ly } for one in another.
// Returns the rows in the order they are shown: by group (NAVPANEL.groups), nearest first inside a group; in the last group the gate, then the jumps by light years.
function navpanelRows(bodies, jumps, mission) {
  const rows = [];
  (bodies || []).forEach(b => { const group = NAVPANEL.of[b.type]; if (group) rows.push({ kind: 'body', group, id: b.id, name: b.name, type: b.type, look: b.look, x: b.x, y: b.y, r: b.r || 0, dist: b.dist }); });
  (jumps || []).forEach(j => rows.push({ kind: 'jump', group: 'gates', id: j.id, name: j.name, type: 'jump', ly: j.ly, cost: j.cost, ok: !!j.ok, why: j.why || null }));
  if (mission && mission.system) { // a goal in another system: the jump there is the mission's row, or a row that says it is out of reach
    const j = rows.find(r => r.kind === 'jump' && r.id === mission.system);
    if (j) { j.group = 'mission'; j.mission = true; j.goal = mission.goal || null; } // goal: the far star the next jump is on the way to (the galaxy map opens on that, with the whole chain)
    else rows.push({ kind: 'jump', group: 'mission', id: mission.system, name: mission.name, type: 'jump', ly: mission.ly, cost: 0, ok: false, why: 'far', mission: true, say: mission.say || null });
  } else if (mission) { // a goal here: the body it is (same id, or the body it sits on), else a row of its own
    const b = rows.find(r => r.kind === 'body' && (r.id === mission.id || Math.hypot(r.x - mission.x, r.y - mission.y) < 60));
    if (b) { b.group = 'mission'; b.mission = true; }
    else rows.push({ kind: 'body', group: 'mission', id: 'mission', name: mission.name, type: 'mission', x: mission.x, y: mission.y, r: 0, dist: mission.dist || 0, mission: true });
  }
  const order = NAVPANEL.groups.map(g => g[0]), num = r => (r.kind === 'jump' ? 1e9 + r.ly : r.dist);
  return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || num(a) - num(b));
}
// the lines of the panel: a heading before the first row of each group, and when there are more than max, the window that keeps the chosen row in view
// Returns { lines: [{ head: 'STATIONS' } | { row, i }], above, below }: i is the row's place in rows; above and below count the rows out of view.
function navpanelLines(rows, sel, max, groups) { // groups: the headings of another list that uses this (the Campaign's, src/campnav.js); the nav panel's own by default
  const all = []; let last = null, selLine = 0;
  rows.forEach((row, i) => {
    if (row.group !== last) { last = row.group; all.push({ head: ((groups || NAVPANEL.groups).find(g => g[0] === row.group) || [0, ''])[1] }); }
    if (i === sel) selLine = all.length;
    all.push({ row, i });
  });
  let start = Math.max(0, Math.min(selLine - Math.floor(max / 2), all.length - max));
  if (start > 0 && all[start - 1].head && start === selLine) start--; // never cut a heading off its chosen row
  const lines = all.slice(start, start + max), count = l => l.filter(x => x.row).length;
  return { lines, above: count(all.slice(0, start)), below: count(all.slice(start + max)) };
}
// where the panel starts: under whatever the HUD has on the left (its zones: the gauges, the mission checklist open or shut), never above NAVPANEL.y
function navpanelTop(zones) {
  let y = NAVPANEL.y;
  (zones || []).forEach(z => { if (z.x0 <= NAVPANEL.x && z.x1 > NAVPANEL.x && z.y0 < NAVPANEL.y) y = Math.max(y, z.y1 + 6); });
  return y;
}
// how many lines fit between there and the bottom (the pinned line, the title and the foot take 90 px)
function navpanelFit(top, job) { return Math.max(NAVPANEL.min, Math.min(NAVPANEL.max, Math.floor((NAVPANEL.bottom - top - 90 - (job || 0)) / NAVPANEL.row))); } // job: the height of the job line above
function navpanelDist(r) { return r.kind === 'jump' ? (Math.round(r.ly * 10) / 10) + ' ly' : hudFmt(r.dist / 10) + ' km'; }
// how the ship would get to a row: 'here', 'autopilot' (a short leg), 'cruise' (the autopilot cruises the middle), 'jump', or 'no' with row.why
function navpanelHow(r) {
  if (r.kind === 'jump') return r.ok ? 'jump' : 'no';
  const left = r.dist - autopilotStop(r);
  return left <= 60 ? 'here' : left > AUTO.cruiseLeg ? 'cruise' : 'autopilot';
}
// what the bottom line says about the chosen row. order: 'dock' or 'land' when the row can take that order (autopilotOrder), else ''
function navpanelHint(r, isDest, order) {
  if (!r) return 'Nowhere to go from here.';
  const how = navpanelHow(r);
  if (how === 'here' && !order) return 'You are there.';
  if (r.mission && r.kind === 'jump' && !r.say) return 'Enter  open the galaxy map at ' + navpanelStar(r); // the job is in another system: the map shows the way, and what is missing
  if (how === 'no') return r.say || (r.why === 'fuel' ? 'Not enough fuel for this jump.' : r.why === 'far' ? 'Out of jump range: plot it on the galaxy map (G).' : 'No route charted yet.');
  if (!isDest && r.kind === 'jump') return 'Enter  set as destination'; // a jump keeps its two steps; a place goes on the first Enter
  if (order) return 'Enter  ' + order + (how === 'here' ? '' : '   P  fly there only'); // the order takes the ship all the way in; P is the plain travel
  return how === 'jump' ? 'Enter  jump   ' + navpanelFuel(r.cost) + ' fuel' : how === 'cruise' ? 'Enter  go: autopilot and cruise' : 'Enter  go: autopilot';
}
function navpanelStar(r) { return typeof callSysName === 'function' ? callSysName(r.id) : r.name; }
// the job line: the next step of the open call, or '' with no call
function navpanelJob() { const st = typeof missionStep === 'function' ? missionStep() : null; return st ? 'JOB  ' + st.text : ''; }
function navpanelFuel(v) { return String(Math.round(v * 10) / 10); }

// ---- what the scene has ----
function navpanelJumps(s) {
  if (G.deep || typeof galaxyFind !== 'function') return [];
  const here = galaxyFind(G.system); if (!here) return [];
  return galaxySystems().filter(g => g.id !== G.system && G.known.includes(g.id) && Object.prototype.hasOwnProperty.call(SYSTEMS, g.id)).map(g => {
    const j = galaxyJump(here, g);
    return { id: g.id, name: g.name, ly: j.ly, cost: j.cost, ok: j.ok, why: j.why };
  }).filter(j => j.why !== 'range'); // out of range is the galaxy map's business; short of fuel stays, greyed, so you see what a fill-up buys
}
function navpanelMission(s) {
  if (G.mission !== 'accepted' && G.mission !== 'rescued') return null;
  const far = typeof missionFar === 'function' ? missionFar() : null;
  if (far) { // a goal in another system: with a plotted chain the row is the NEXT JUMP of it (one this ship can make), else the goal itself, which says why it cannot (src/missions.js routeCheck)
    const step = typeof missionStep === 'function' ? missionStep() : null;
    if (step && step.kind === 'jump' && step.hop) return { system: step.hop, name: callSysName(step.hop), ly: step.route.hops[0].ly, goal: far.system, hops: step.hops };
    return { system: far.system, name: (far.station ? far.name + ', ' : '') + callSysName(far.system), ly: far.ly, say: step && step.kind === 'blocked' ? step.text : null };
  }
  const t = typeof missionTarget === 'function' ? missionTarget(s) : null;
  return t ? { id: t.id, name: t.name, x: t.x, y: t.y, dist: Math.hypot(t.x - s.ship.x, t.y - s.ship.y) } : null;
}
function navpanelIsDest(s, r) {
  const np = s.np, t = s.cr.target;
  return r.kind === 'jump' ? np.jump === r.id : !!t && (t.id === r.id || (r.id === 'mission' && t.id === 'mission'));
}
// the pinned line: where you are going and how far
function navpanelDest(s) {
  const np = s.np, cr = s.cr, t = cr.target || (s.ap && s.ap.on ? s.ap.target : null);
  if (t) return { name: t.name, text: hudFmt(Math.hypot(t.x - s.ship.x, t.y - s.ship.y) / 10) + ' km', color: NAVPANEL.colors[t.type] || '#9fe9ff' };
  if (np.jump) { const r = (cr.list || []).find(x => x.kind === 'jump' && x.id === np.jump) || np.jumpRow; return r ? { name: r.name, text: navpanelDist(r), color: NAVPANEL.colors.jump } : null; }
  return null;
}

// ---- the scene pieces ----
function navpanelSetup(s) {
  const N = NAVPANEL, cr = s.cr, np = s.np = { shown: false, keys: false, hideAt: 0, at: 0, jump: null, jumpRow: null, first: true, mkey: null, press: false, parts: [], lines: [], pinned: [] };
  const fix = (o, list) => { o.setScrollFactor(0).setVisible(false); (list || np.parts).push(o); return o; };
  const font = (size, color, bold) => ({ fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal' });
  const h = 30 + N.row * N.max + 30, y0 = N.y + 30; // placed for real by navpanelPlace, every draw
  // the job: the next step of the open call in plain words, there whenever you have a call (missionStep, src/missions.js)
  np.jobs = []; np.jobH = 0;
  np.jobBg = fix(s.add.rectangle(N.x, N.y, N.w, N.job, 0x04101c, 0.78).setOrigin(0, 0).setStrokeStyle(1, 0x6dff9c, 0.7).setDepth(100), np.jobs);
  np.jobText = fix(s.add.text(N.x + 10, N.y + 5, '', Object.assign(font(12, '#6dff9c'), { wordWrap: { width: N.w - 20 }, maxLines: 3 })).setOrigin(0, 0).setDepth(101), np.jobs);
  // the pinned destination: there whenever you have one
  np.pinBg = fix(s.add.rectangle(N.x, N.y, N.w, 26, 0x04101c, 0.78).setOrigin(0, 0).setStrokeStyle(1, 0xffb454, 0.8).setDepth(100), np.pinned);
  np.pinName = fix(s.add.text(N.x + 10, N.y + 13, '', font(14, '#ffd37a', true)).setOrigin(0, 0.5).setDepth(101), np.pinned);
  np.pinDist = fix(s.add.text(N.x + N.w - 10, N.y + 13, '', font(14, '#9fe9ff')).setOrigin(1, 0.5).setDepth(101), np.pinned);
  // the list
  np.bg = fix(s.add.rectangle(N.x, y0, N.w, h, 0x04101c, 0.82).setOrigin(0, 0).setStrokeStyle(1, 0x2a6f8f, 0.9).setDepth(100));
  const eat = (p, x, y, e) => { np.press = true; if (e && e.stopPropagation) e.stopPropagation(); }; // a click on the panel is not a click in space
  np.bg.setInteractive(); np.bg.on('pointerdown', eat);
  np.title = fix(s.add.text(N.x + 10, y0 + 15, '', font(13, '#9fe9ff', true)).setOrigin(0, 0.5).setDepth(101));
  np.key = fix(s.add.text(N.x + N.w - 10, y0 + 15, '', font(12, '#5b7a92')).setOrigin(1, 0.5).setDepth(101));
  np.hl = fix(s.add.rectangle(N.x + 3, y0, N.w - 6, N.row, 0xffb454, 0.16).setOrigin(0, 0).setStrokeStyle(1, 0xffb454, 0.7).setDepth(100.5));
  np.g = fix(s.add.graphics().setDepth(101)); // the icons
  for (let i = 0; i < N.max; i++) {
    const y = y0 + 30 + N.row * i + N.row / 2;
    const name = fix(s.add.text(N.x + 34, y, '', font(14, '#cfefff')).setOrigin(0, 0.5).setDepth(101));
    const dist = fix(s.add.text(N.x + N.w - 10, y, '', font(13, '#9fe9ff')).setOrigin(1, 0.5).setDepth(101));
    const zone = fix(s.add.rectangle(N.x + 3, y - N.row / 2, N.w - 6, N.row, 0x000000, 0.001).setOrigin(0, 0).setDepth(101.5));
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p, x, yy, e) => { eat(p, x, yy, e); const l = np.shownLines && np.shownLines[i]; if (l && l.row) navpanelClick(s, l.i); });
    np.lines.push({ name, dist, zone, y });
  }
  np.foot = fix(s.add.text(N.x + 10, y0 + h - 15, '', font(12, '#ffd37a')).setOrigin(0, 0.5).setDepth(101));
  np.more = fix(s.add.text(N.x + N.w - 10, y0 + h - 15, '', font(12, '#5b7a92')).setOrigin(1, 0.5).setDepth(101));
  cr.ui = { box: np.bg, setVisible: v => { if (!v) navpanelHide(s); } }; // what the old list's panel was to the rest of the game: is it up, put it away
  cr.list = []; cr.sel = 0;
  const tick = () => navpanelTick(s);
  s.events.on('postupdate', tick);
  s.events.once('shutdown', () => { s.events.off('postupdate', tick); if (s.np === np) s.np = null; });
}
// put every piece where it belongs for a panel that starts at top and shows n lines
function navpanelPlace(s, top, n) {
  const np = s.np, N = NAVPANEL, job = np.jobH || 0, y0 = top + job + 30, h = 30 + N.row * n + 30; // the job line, when there is one, sits above the destination
  np.top = top; np.placedJob = job;
  np.jobBg.setY(top); np.jobText.setY(top + 5);
  np.pinBg.setY(top + job); np.pinName.setY(top + job + 13); np.pinDist.setY(top + job + 13);
  np.bg.setY(y0).setSize(N.w, h); if (np.bg.input && np.bg.input.hitArea) np.bg.input.hitArea.height = h;
  np.title.setY(y0 + 15); np.key.setY(y0 + 15);
  np.lines.forEach((l, i) => { l.y = y0 + 30 + N.row * i + N.row / 2; l.name.setY(l.y); l.dist.setY(l.y); l.zone.setY(l.y - N.row / 2); });
  np.foot.setY(y0 + h - 15); np.more.setY(y0 + h - 15);
}
function navpanelHide(s) { const np = s.np; if (!np) return; np.shown = false; np.keys = false; np.parts.forEach(o => o.setVisible(false)); }

// rebuild the rows, keeping the chosen row the chosen row
function navpanelBuild(s, pick) {
  const np = s.np, cr = s.cr, was = pick || (cr.list[cr.sel] ? cr.list[cr.sel].kind + ':' + cr.list[cr.sel].id : null);
  const rows = cr.list = navpanelRows(cruiseKnown(s), navpanelJumps(s), navpanelMission(s));
  const at = was ? rows.findIndex(r => r.kind + ':' + r.id === was) : -1;
  cr.sel = at >= 0 ? at : Math.max(0, Math.min(cr.sel, rows.length - 1));
  if (np.jump) np.jumpRow = rows.find(r => r.kind === 'jump' && r.id === np.jump) || np.jumpRow;
}
function navpanelIcon(g, r, x, y, color) {
  const c = Phaser.Display.Color.HexStringToColor(color).color;
  g.lineStyle(1.5, c, 1); g.fillStyle(c, 1);
  if (r.type === 'station') { g.strokeCircle(x, y, 6); g.fillCircle(x, y, 2); }
  else if (r.type === 'scenery') g.strokeRect(x - 5, y - 5, 10, 10);
  else if (r.type === 'star') { g.fillCircle(x, y, 4); for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4; g.lineBetween(x + Math.cos(q) * 6, y + Math.sin(q) * 6, x + Math.cos(q) * 8.5, y + Math.sin(q) * 8.5); } } // a sun: a disc with rays
  else if (r.type === 'planet') g.fillCircle(x, y, 6);
  else if (r.type === 'belt') { g.fillCircle(x - 5, y + 2, 2); g.fillCircle(x, y - 3, 2.5); g.fillCircle(x + 5, y + 3, 1.8); }
  else if (r.type === 'poi') g.strokeTriangle(x, y - 6, x + 6, y + 5, x - 6, y + 5);
  else if (r.type === 'gate') { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.strokePath(); }
  else if (r.type === 'jump') { g.lineBetween(x - 7, y, x + 7, y); g.lineBetween(x, y - 7, x, y + 7); g.lineBetween(x - 3, y - 3, x + 3, y + 3); g.lineBetween(x - 3, y + 3, x + 3, y - 3); }
  else { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fillPath(); } // a mission goal with no body under it
}
function navpanelDraw(s) {
  const np = s.np, cr = s.cr, N = NAVPANEL; if (!np) return;
  navpanelBuild(s);
  if (!np.shown) return;
  const top = navpanelTop(s._hud && s._hud.zones), rows = cr.list, view = navpanelLines(rows, cr.sel, navpanelFit(top, np.jobH)), C = N.colors;
  np.shownLines = view.lines;
  navpanelPlace(s, top, Math.max(1, view.lines.length));
  np.parts.forEach(o => o.setVisible(true));
  np.title.setText('NAVIGATION  -  ' + sysDef().name.toUpperCase()); np.key.setText(np.keys ? 'N close' : 'N choose');
  np.g.clear(); np.hl.setVisible(false);
  np.lines.forEach((l, i) => {
    const v = view.lines[i];
    l.zone.setVisible(!!(v && v.row));
    if (!v) { l.name.setVisible(false); l.dist.setVisible(false); return; }
    if (v.head) { l.name.setText(v.head).setColor('#5b7a92').setFontSize('11px').setX(N.x + 10); l.dist.setVisible(false); return; }
    const r = v.row, dest = navpanelIsDest(s, r), sel = v.i === cr.sel, off = navpanelHow(r) === 'no';
    const color = off ? C.off : r.mission ? C.mission : C[r.type] || '#cfefff';
    navpanelIcon(np.g, r, N.x + 20, l.y, color);
    l.name.setText((dest ? '> ' : '') + r.name).setColor(off ? C.off : sel && np.keys ? '#ffffff' : dest ? '#ffd37a' : '#cfefff').setFontSize('14px').setX(N.x + 34);
    l.dist.setText(navpanelDist(r)).setColor(off ? C.off : '#9fe9ff');
    if (sel) np.hl.setPosition(N.x + 3, l.y - N.row / 2).setVisible(true).setFillStyle(0xffb454, np.keys ? 0.16 : 0.06);
  });
  const r = rows[cr.sel];
  const hint = np.keys ? navpanelHint(r, r ? navpanelIsDest(s, r) : false, navpanelOrder(s, r)) : 'N  choose where to go';
  np.more.setText(view.above || view.below ? (view.above ? '^' + view.above + ' ' : '') + (view.below ? 'v' + view.below : '') : np.keys ? 'X clear' : '');
  np.foot.setText(hudFitSub(hint, N.w - 28 - (+np.more.width || 0), 12)); // one line in the room the tag leaves: the route plotter's sentence ("Needs a 12.2 ly jump: your Wren does 8. The Kite ...") ran out across the screen over the tag (first look; the whole sentence is on the job line and the map)
}

// N: the panel with the keys on it, the destination (or the mission's row, or the first row) chosen
function navpanelOpen(s, peek) {
  const np = s.np, cr = s.cr; if (!np) return;
  np.shown = true; np.keys = !peek; cr.navOpen = !peek; np.at = 0; np.hideAt = s.time.now + NAVPANEL.peek;
  navpanelBuild(s);
  const rows = cr.list, at = rows.findIndex(r => navpanelIsDest(s, r)), m = rows.findIndex(r => r.mission);
  cr.sel = at >= 0 ? at : m >= 0 ? m : 0;
  navpanelDraw(s);
  if (!peek) sfx('tick');
}
function navpanelClose(s) {
  const np = s.np; if (!np) return;
  const was = np.keys; s.cr.navOpen = false; navpanelHide(s);
  if (was) sfx('tick');
}
// Enter, or a click, on row i: make it the destination; on the destination: go there
function navpanelClick(s, i) {
  const cr = s.cr, r = cr.list[i]; if (!r) return;
  cr.sel = i;
  if (r.mission && r.kind === 'jump') { // the job is in another system: Enter does the step, which is the galaxy map with that star chosen (G does the same)
    navpanelClose(s);
    if (typeof jumpMapOpen !== 'function' || !jumpMapOpen(s.game, r.goal || r.id)) { toast(s, 'Not now: the galaxy map opens when you are flying free.', '#ffb454'); sfx('empty'); }
    return;
  }
  if (r.kind !== 'jump') navpanelFly(s, r); // a place: pick it and fly there
  else if (navpanelIsDest(s, r)) navpanelEngage(s, r); else navpanelPick(s, r); // a jump: set it, then Enter jumps
  s.np.at = 0; if (s.np.shown) { s.np.hideAt = s.time.now + NAVPANEL.peek; navpanelDraw(s); }
}
// why the ship cannot fly to this place right now, in the words the pilot gets ('' when it can). r: a row of the panel or of cruiseKnown.
function navpanelFlyWhy(s, r) {
  if (!r || s.dead || s.leaving) return 'Not now.';
  if (G.deep) return 'There is nothing to fly to in deep space.';
  if (s.jmp) return 'A jump is charging: S or Esc cancels it first.';
  if (s.cruising) return 'Cruising already. S cancels.';
  if (!s.ap || !s.cr) return 'The autopilot is not ready.';
  if (navpanelHow(r) === 'here' && !navpanelOrder(s, r)) return 'You are already at ' + r.name + '.';
  return '';
}
// Enter or a click on a place, and the ship's computer's and the Tab map's "fly there": the autopilot takes the ship (the station docks, the planet you can land on
// lands, a long leg cruises). The one confirmation line is the autopilot's own toast; a place that cannot be reached says why in one line. Returns true when it went.
function navpanelFly(s, r) {
  const why = navpanelFlyWhy(s, r);
  if (why) { toast(s, why, '#ffb454'); sfx('empty'); return false; }
  if (s.np) { s.np.jump = null; s.np.jumpRow = null; }
  return navpanelEngage(s, r);
}
// the place nearest a world point within rad px, from the same list the panel is made of (the Tab map's click); null when none
function navpanelNear(rows, x, y, rad) {
  let best = null, bd = rad;
  (rows || []).forEach(b => { const d = Math.hypot(b.x - x, b.y - y); if (d <= bd) { bd = d; best = b; } });
  return best;
}
function navpanelPlaceAt(s, x, y, rad) { return navpanelNear(cruiseKnown(s), x, y, rad); }
function navpanelPick(s, r) {
  const np = s.np, how = navpanelHow(r), no = m => { toast(s, m, '#ffb454'); sfx('empty'); };
  if (how === 'no') return no(navpanelHint(r, false));
  if (r.kind === 'jump') { np.jump = r.id; np.jumpRow = r; s.cr.target = null; toast(s, 'Destination: ' + r.name + ', ' + navpanelDist(r) + '. Enter jumps.', '#ffd37a'); sfx('chime'); return; }
  np.jump = null; np.jumpRow = null;
  cruisePick(s, r); // src/cruise.js: the one target C, P, the Tab map and the HUD arrow share
}
// the order a row can take: 'dock' (this system's station), 'land' (the planet you can land on) or ''
function navpanelOrder(s, r) { return r && r.kind !== 'jump' ? autopilotOrder(r, sysBodies('station'), sysBody('planet'), s.canLand) : ''; }
function navpanelEngage(s, r) {
  const np = s.np, no = m => { toast(s, m, '#ffb454'); sfx('empty'); return false; };
  if (r.kind !== 'jump') { // a body: the autopilot flies it, and cruises the middle of a long leg
    if (s.cruising) return no('Cruising already. S cancels.');
    const went = autopilotGo(s, r, navpanelOrder(s, r)); // the station and the planet you can land on: Dock and Land, all the way in
    if (went) navpanelClose(s);
    return went;
  }
  const here = galaxyFind(G.system), dest = galaxyFind(r.id), j = here && dest ? galaxyJump(here, dest) : null;
  if (!j || !j.ok) return no(navpanelHint(Object.assign({}, r, { ok: false, why: j ? j.why : 'route' }), true));
  const why = jumpLock(s); // src/jump.js: hostiles near, a cruise under way (no mass limit: a jump starts from anywhere)
  if (why) return no(why === 'not now' ? 'Not now: end the cruise first.' : why);
  if (s.ap && s.ap.on) autopilotEnd(s, 'quiet');
  navpanelClose(s); jumpStart(s, r.id, j);
  return true;
}

// The keys. cruiseFrame calls this where the old list read them, with what it has already read: { n, x, enter, up, down }.
function navpanelFrame(s, time, K) {
  const np = s.np, cr = s.cr; if (!np) return '';
  if (np.keys && !cr.navOpen) navpanelHide(s); // put away from outside (P in src/autopilot.js closes the list it flew from)
  if (!np.keys) {
    if (K.n) { navpanelOpen(s, false); return 'nav'; }
    return '';
  }
  if (K.n) { navpanelClose(s); return ''; }
  const rows = cr.list;
  if ((K.up || K.down) && rows.length) { cr.sel = (cr.sel + (K.down ? 1 : rows.length - 1)) % rows.length; sfx('tick'); np.at = 0; }
  if (K.x) { cr.target = null; np.jump = null; np.jumpRow = null; toast(s, 'Destination cleared.', '#9fe9ff'); sfx('tick'); np.at = 0; }
  const r = rows[cr.sel], p = s.ap && s.ap.k && s.ap.k.P;
  if (r && r.kind === 'jump' && p && p._justDown) { p._justDown = false; navpanelEngage(s, r); np.at = 0; } // P on a system: the same as going there (a body's P is the autopilot's own)
  if (K.enter && r) { navpanelClick(s, cr.sel); if (!np.keys) return ''; }
  if (time > np.at) { np.at = time + NAVPANEL.every; navpanelDraw(s); }
  return 'nav';
}
// every frame, cruising or not: the pinned destination, the opening by itself, the going away again
function navpanelTick(s) {
  const np = s.np, cr = s.cr, N = NAVPANEL; if (!np || !cr) return;
  const now = s.time.now, quiet = s.dead || s.leaving || !!s.jmp || !!G.deep;
  if (np.press) { if (s.input.activePointer.isDown) s.nextFire = Math.max(s.nextFire || 0, now + 80); else np.press = false; } // a press on the panel does not fire the guns
  if (quiet) { if (np.shown && !np.keys) navpanelHide(s); np.pinned.forEach(o => o.setVisible(false)); np.jobs.forEach(o => o.setVisible(false)); return; }
  const job = navpanelJob(), jobH = job ? N.job : 0;
  if (job !== np.job) { np.job = job; np.jobText.setText(job); np.at = 0; }
  if (jobH !== np.jobH) { np.jobH = jobH; np.top = null; } // the job line came or went: everything under it moves
  // it opens by itself: once when the flight starts (no destination yet), and when the call's goal changes
  const m = navpanelMission(s), mkey = G.mission + '|' + (G.missionId || '') + '|' + (m ? m.system || m.name : '');
  if (np.first || (mkey !== np.mkey && m)) { if (!np.keys && !s.cruising) navpanelOpen(s, true); np.first = false; }
  np.mkey = mkey;
  if (np.shown && !np.keys) {
    if (now > np.hideAt || s.cruising) navpanelHide(s);
    else if (now > np.at) { np.at = now + N.every; navpanelDraw(s); }
  }
  const d = navpanelDest(s);
  if ((d || job) && !np.shown) { const top = navpanelTop(s._hud && s._hud.zones); if (top !== np.top || np.placedJob !== jobH) navpanelPlace(s, top, 1); } // the checklist opened or shut: the pinned lines move with it
  np.jobs.forEach(o => o.setVisible(!!job));
  np.pinned.forEach(o => o.setVisible(!!d));
  if (d) { np.pinName.setText('> ' + d.name.toUpperCase()).setColor(d.color); np.pinDist.setText(d.text); }
}

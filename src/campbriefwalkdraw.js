// ---------- Campaign: the briefing's walk, the drawing (card space-game-briefing-map-walk; Troy, 22 Nov 2026) ----------
// The Phaser half of src/campbriefwalk.js, which says WHAT happens at each stop. A mission with a walk is briefed on the MAP on all three pages of the big briefing (src/campbriefdraw.js opens it, and hands the keys and the clock here):
// the map fills the window under the heading; the cruiser, the wing and the convoy walk the road from stop to stop; under the map are the dots of the stops (the one you are at is gold), one line of words, and a small strip (the story on page 1,
// the goals and the bonus on page 2, the keys this mission needs and your readiness on page 3). A page plays its stops by itself; Enter or Right goes on, Left goes back, Enter at the last stop launches, L launches, Esc closes, + - and
// Backspace (and the wheel) zoom by hand.
//   campWalkBuild(s)            make the walk's objects once and draw the first stop
//   campWalkKey(s, code, rep)   a key while it is open (campBriefKey hands every key here when the mission has a walk)
//   campWalkTickScene(s, time)  the clock: the room's update calls it, the walk plays on and the map is drawn again
//   campWalkZoomTo(s, z)        the hand zoom
const CAMPWALK_COL = { cruiser: 0xffffff, wing: 0x38e1ff, convoy: 0xffb454, patrol: 0x6dff9c, help: 0xffd37a, threat: 0xff7aa8, goal: 0xffb454 };
const campWalkShow = (t, on) => { if (!t) return; if (typeof t.setVisible === 'function') t.setVisible(on); else t.visible = on; };

function campWalkBuild(s) {
  const bf = s.bf, W = CAMPWALK, F = W.frame, plan = bf.plan, own = (o, d) => { o.setScrollFactor(0).setDepth(d || 134); bf.objs.push(o); return o; };
  bf.wg = own(s.add.graphics(), 136); bf.sig = ''; bf.lastT = null; bf.clock = 0; bf.cap = -1; bf.page = -1;
  const txt = (t, size, color, d, extra) => own(s.add.text(0, 0, t, uiFont(size, color, extra)), d);
  bf.pool = {
    places: bf.Y.places.map(p => ({ p, t: txt(p.name.toUpperCase(), 11, p.star ? '#ffe29a' : '#ffb454', 134).setOrigin(0.5) })), // the names of the places: made once, moved with the map
    marks: plan.steps.flatMap(st => st.marks).filter(m => m.label).map(m => ({ m, t: txt(uiText(m.label), 12, m.kind === 'threat' ? '#ff9ec0' : m.kind === 'help' ? '#ffd37a' : '#ffb454', 137, { fontStyle: 'bold' }).setOrigin(0.5) })),
    zoom: txt('', 12, '#7fe9ff', 137).setOrigin(1, 0),
    cap: txt('', W.cap.size, '#e8f6ff', 134, { wordWrap: { width: F.w } }).setOrigin(0, 0)
  };
  bf.pool.zoom.setPosition(F.x + F.w - 8, F.y + 8);
  bf.pool.cap.setPosition(F.x, W.cap.y);
  // the legend, in the corner of the map: who is who (the shapes are drawn with the others, every frame)
  const hasPatrol = plan.steps.some(st => st.with && st.with.patrol), names = [uiText('camp.bf.you'), uiText('camp.bw.wing'), String(plan.road.cv.name || '').toUpperCase()].concat(hasPatrol ? [uiText('camp.bw.patrol')] : []);
  bf.legend = names.map((n, k) => ({ x: F.x + 16, y: F.y + F.h - 16 - (names.length - 1 - k) * 18, t: txt(n, 11, '#cfefff', 137).setOrigin(0, 0.5) }));
  bf.legend.forEach(l => l.t.setPosition(l.x + 18, l.y));
  campWalkPage(s); campWalkPaint(s);
}

// a page: the heading and the tabs, the strip under the words, the key line
function campWalkPage(s) {
  const bf = s.bf, W = CAMPWALK, st = bf.plan.steps[bf.wk.i], A = { x: W.frame.x, w: W.frame.w };
  bf.screen = st.page; bf.page = st.page;
  campBriefGone(bf.text); campBriefGone(bf.pics); bf.g.clear();
  campBriefPaintHead(s);
  let y = W.strip.y;
  const row = (head, color, text, size, tc) => { campBriefOwn(s, s.add.text(A.x, y + 1, head, uiFont(12, color))); y = campBriefFlow(s, { x: A.x + 86, w: A.w - 86 }, y, text, size, tc) + 2; }; // a heading and its words on the same line, the words wrapping under themselves
  if (st.page === 0) { // why: the story, in one paragraph
    row(uiText('camp.bf.why'), '#38e1ff', bf.story.join(' '), 14, '#e8f6ff');
  } else if (st.page === 1) { // what to do: the goals, then the bonus and what it earns
    row(uiText('camp.bf.goals'), '#38e1ff', bf.steps.goals.map(x => x.text).join('   '), 15, '#e8f6ff');
    if (bf.steps.bonus.length) row(uiText('camp.ui.bonushead'), '#ffd37a', bf.steps.bonus.map(x => '+' + x.points + ' ' + x.text).join('   '), 13, '#ffd37a');
  } else { // how: the keys this mission needs, four to a row, then the readiness
    const cw = Math.floor(W.frame.w / W.strip.cols);
    bf.keysFor.forEach((kr, k) => {
      const x = A.x + (k % W.strip.cols) * cw, yy = y + Math.floor(k / W.strip.cols) * W.strip.row, w = Math.max(34, kr.k.join(' ').length * 9 + 14);
      bf.g.fillStyle(0x0a1c2e, 1).fillRoundedRect(x, yy - 2, w, 24, 5); bf.g.lineStyle(1, CYAN, 0.7).strokeRoundedRect(x, yy - 2, w, 24, 5);
      campBriefOwn(s, s.add.text(x + w / 2, yy + 10, kr.k.join(' '), uiFont(13, '#ffffff', { fontStyle: 'bold' }))).setOrigin(0.5);
      campBriefOwn(s, s.add.text(x + 96, yy + 1, kr.text, uiFont(12, '#e8f6ff', { wordWrap: { width: cw - 104 } })));
    });
    y += Math.ceil(bf.keysFor.length / W.strip.cols) * W.strip.row + 4;
    campBriefFlow(s, A, y, uiText('camp.bf.readiness') + '   ' + bf.ready.lines.join('   ') + (bf.ready.warnings.length ? '   ! ' + bf.ready.warnings.join(' ! ') : ''), 12, bf.ready.warnings.length ? '#ffb454' : '#cfefff');
  }
  campBriefPaintKeys(s);
  campWalkCaption(s);
}
function campWalkCaption(s) { const bf = s.bf; if (bf.cap === bf.wk.i) return; bf.cap = bf.wk.i; bf.pool.cap.setText(bf.plan.steps[bf.wk.i].text); campBriefPaintKeys(s); }

// one frame: the map when the view has moved, and everything that moves
function campWalkPaint(s) {
  const bf = s.bf, plan = bf.plan, wk = bf.wk, F = CAMPWALK.frame, now = campWalkShown(plan, wk), v = now.view, sig = v.s.toFixed(7) + '|' + Math.round(v.cx) + '|' + Math.round(v.cy);
  if (sig !== bf.sig) { bf.sig = sig; campWalkMap(s, v); }
  campWalkLive(s, now);
  bf.pool.zoom.setText(uiText('camp.map.zoom', { pct: Math.round(wk.z * 100) }));
}
// the map under everything: the space, the places and their names, the road
function campWalkMap(s, v) {
  const bf = s.bf, F = CAMPWALK.frame, g = bf.mg, X = (x, y) => campMapPoint(v, F, x, y), inF = p => p.x >= F.x && p.x <= F.x + F.w && p.y >= F.y && p.y <= F.y + F.h, R = bf.plan.road;
  g.clear(); campBriefMapSpace(g, v, F, bf.Y.level);
  hudGlowPath(g, [[F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [F.x, F.y + F.h]], CYAN, 0.85, true, 1.25);
  // the road: from the place the convoy leaves to the place it goes to, dashed and cut to the glass
  const a = X(R.a.x, R.a.y), b = X(R.b.x, R.b.y), d = Math.hypot(b.x - a.x, b.y - a.y) || 1; g.lineStyle(2, 0xffffff, 0.6);
  for (let k = 0; k < d; k += 12) { const q = campMapClip(a.x + (b.x - a.x) * k / d, a.y + (b.y - a.y) * k / d, a.x + (b.x - a.x) * Math.min(d, k + 7) / d, a.y + (b.y - a.y) * Math.min(d, k + 7) / d, F); if (q) g.lineBetween(q[0], q[1], q[2], q[3]); }
  // the places: a disc, the outposts' green frame, and a name where it touches nothing (the road's own ends and the outposts first)
  const items = [], at = [], seen = bf.pool.places.filter(e => { const q = X(e.p.x, e.p.y), r = Math.max(e.p.star ? 7 : 4, e.p.r * v.s); if (!inF(q)) return false; at.push({ q, r }); return true; });
  seen.forEach((e, k) => {
    const { q, r } = at[k], p = e.p;
    g.fillStyle(p.star ? 0xffe29a : 0xb9a37a, 0.85).fillCircle(q.x, q.y, r); g.lineStyle(1, p.star ? 0xffe29a : 0xb9a37a, 0.5).strokeCircle(q.x, q.y, r + 3);
    if (p.outpost) { const m = r + 8; g.lineStyle(2, 0x6dff9c, 0.95).strokeRect(q.x - m, q.y - m, m * 2, m * 2); }
    items.push({ x: q.x, y: q.y, r: r + 4, w: e.t.width, h: e.t.height, side: 'below', rank: p.outpost || p.id === R.cv.from || p.id === R.cv.to ? 0 : 1 });
  });
  const order = items.map((it, k) => k).sort((x, y) => items[x].rank - items[y].rank || x - y), put = mapPlace(order.map(k => items[k]), F), pos = [];
  order.forEach((k, j) => { pos[k] = put[j]; });
  bf.pool.places.forEach(e => campWalkShow(e.t, false));
  seen.forEach((e, k) => { const o = pos[k]; if (o && o.bad > 0 && !items[k].rank) return; campWalkShow(e.t, true); e.t.setPosition(o.x, o.y); }); // a name that would lie over another is left out, unless it is an end of the road or an outpost
}

// the things that move: the marks (a hint where a thing is likely), the party, the other ships, the dots, the legend
function campWalkLive(s, now) {
  const bf = s.bf, plan = bf.plan, wk = bf.wk, W = CAMPWALK, F = W.frame, v = now.view, g = bf.wg, X = (x, y) => campMapPoint(v, F, x, y), R = plan.road, C = CAMPWALK_COL;
  const inF = (p, m) => p.x >= F.x - (m || 0) && p.x <= F.x + F.w + (m || 0) && p.y >= F.y - (m || 0) && p.y <= F.y + F.h + (m || 0), clock = bf.clock, pulse = 0.7 + 0.3 * Math.sin(clock * 4);
  g.clear();
  // the marks: a stop's own bright and pulsing, the stops before it dim
  const labelled = new Set();
  campWalkMarks(plan, wk).forEach(m => {
    const q = X(m.x, m.y), r = Math.max(16, m.r * v.s), a = m.now ? pulse : 0.38, col = C[m.kind] || C.threat;
    if (!inF(q, r)) return;
    if (m.kind === 'goal') { g.lineStyle(3, col, a); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const x = q.x + sx * (r + 6), y = q.y + sy * (r + 6); g.beginPath(); g.moveTo(x, y - sy * 10); g.lineTo(x, y); g.lineTo(x - sx * 10, y); g.strokePath(); }); }
    else { // a ring, dashed for a hint of a danger and solid for a call, cut to the glass
      g.lineStyle(2, col, a); campMapArcs(q.x, q.y, r, F).forEach(pts => { let run = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (m.kind !== 'threat' || Math.floor(run / 9) % 2 === 0) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); run += l; } });
      if (m.kind === 'help') g.fillStyle(col, a).fillPoints([{ x: q.x, y: q.y - 6 }, { x: q.x + 6, y: q.y }, { x: q.x, y: q.y + 6 }, { x: q.x - 6, y: q.y }], true);
    }
    const e = bf.pool.marks.find(k => k.m.step === m.step && k.m.label === m.label && k.m.x === m.x && k.m.y === m.y);
    if (e && m.now) { labelled.add(e); const p = { x: Math.max(F.x + 40, Math.min(F.x + F.w - 40, q.x)), y: Math.max(F.y + 12, Math.min(F.y + F.h - 12, m.kind === 'threat' ? q.y - r - 14 : q.y + r + 14)) }; e.t.setPosition(p.x, p.y); campWalkShow(e.t, true); } // a danger is named over its ring, a call or a goal under it
  });
  bf.pool.marks.forEach(e => { if (!labelled.has(e)) campWalkShow(e.t, false); });
  // the party: the cruiser, the wing round it and the convoy ahead, on the road's heading (a diagram: the offsets are in pixels, whatever the zoom)
  const P = X(now.party.x, now.party.y), ux = R.ux, uy = R.uy, nx = -uy, ny = ux;
  const tri = (x, y, size, col, al) => { g.fillStyle(col, al); g.fillTriangle(x + ux * size, y + uy * size, x - ux * size * 0.8 + nx * size * 0.7, y - uy * size * 0.8 + ny * size * 0.7, x - ux * size * 0.8 - nx * size * 0.7, y - uy * size * 0.8 - ny * size * 0.7); };
  const ship = (x, y, len, wid, col) => { const p = (a, b) => ({ x: x + ux * a + nx * b, y: y + uy * a + ny * b }); g.fillStyle(col, 1).fillPoints([p(len, 0), p(len * 0.4, wid), p(-len, wid), p(-len, -wid), p(len * 0.4, -wid)], true); };
  const out = (p, m) => !inF(p, m || 0);
  const pat = now.with.patrol ? X(now.with.patrol.x, now.with.patrol.y) : null;
  if (pat && !out(pat, 10)) { tri(pat.x + nx * 7, pat.y + ny * 7, 5, C.patrol, 1); tri(pat.x - nx * 7, pat.y - ny * 7, 5, C.patrol, 1); }
  const cvp = { x: P.x + ux * W.form.convoy, y: P.y + uy * W.form.convoy };
  if (!out(cvp, 14)) ship(cvp.x, cvp.y, 11, 4.5, C.convoy);
  [[-W.form.wing, 0], [-W.form.wing * 1.2, W.form.wing * 0.9], [-W.form.wing * 1.2, -W.form.wing * 0.9]].forEach(([a, b]) => { const w = { x: P.x + ux * a + nx * b, y: P.y + uy * a + ny * b }; if (!out(w, 8)) tri(w.x, w.y, 5, C.wing, 1); });
  if (!out(P, 20)) { g.lineStyle(1.5, C.cruiser, now.arrived ? pulse * 0.7 : 0.35).strokeCircle(P.x, P.y, 15); tri(P.x, P.y, 9, C.cruiser, 1); }
  // the legend: the same shapes at rest
  bf.legend.forEach((l, k) => { const x = l.x + 6, y = l.y, sh = [() => tri(x, y, 5, C.cruiser, 1), () => tri(x, y, 4, C.wing, 1), () => ship(x, y, 7, 3.2, C.convoy), () => tri(x, y, 4, C.patrol, 1)][k]; if (sh) sh(); });
  // the dots: one a stop, a wider gap between pages; the stop you are at is gold, the ones behind you filled, the ones to come hollow
  let x = F.x + 4; plan.steps.forEach((st, k) => {
    if (k && plan.steps[k - 1].page !== st.page) x += 12;
    if (k === wk.i) g.fillStyle(0xffd37a, 1).fillCircle(x, W.cap.dots, 5.5); else if (k < wk.i) g.fillStyle(0x38e1ff, 0.9).fillCircle(x, W.cap.dots, 4); else g.lineStyle(1.5, 0x5f8299, 1).strokeCircle(x, W.cap.dots, 4);
    x += 18;
  });
}

// the hand zoom: times the stop's own view, about the middle of the map (Backspace puts it back)
function campWalkZoomTo(s, z) {
  const bf = s.bf; if (!campBriefIsOpen(s) || !bf.plan) return false;
  const zn = Math.max(CAMPWALK.zoom.min, Math.min(CAMPWALK.zoom.max, +z || 1)); if (zn === bf.wk.z) return false;
  bf.wk.z = zn; campWalkPaint(s); return true;
}
// a key while the walk is up: it takes every one (the room under it does not move)
function campWalkKey(s, code, repeat) {
  const bf = s.bf, plan = bf.plan, wk = bf.wk, W = CAMPWALK, zk = typeof campZoomKey === 'function' ? campZoomKey(code) : null;
  if (zk) { campWalkZoomTo(s, zk.reset ? 1 : camzoomKey(wk.z, zk.dir, !!repeat, W.zoom.min, W.zoom.max)); return true; } // + - Backspace: the map's zoom, on every page
  if (repeat) return true; // a held key repeats only for the zoom
  const nav = campWalkNav(plan, wk, code);
  if (nav.act === 'close') { campBriefClose(s); return true; }
  if (nav.act === 'launch') { campBriefClose(s); if (typeof s.launch === 'function') s.launch(); return true; }
  if (nav.i !== wk.i) { campWalkGo(plan, wk, nav.i); campWalkMoved(s); if (typeof sfx === 'function') sfx('tick'); }
  return true;
}
// the stop changed (a key, or the walk by itself): the words, and the page when it is another
function campWalkMoved(s) { const bf = s.bf; if (bf.plan.steps[bf.wk.i].page !== bf.page) campWalkPage(s); else campWalkCaption(s); campWalkPaint(s); }
// the clock: the room's update
function campWalkTickScene(s, time) {
  const bf = s && s.bf; if (!bf || bf.open !== true || !bf.plan) return;
  const dt = bf.lastT == null ? 0 : (time - bf.lastT) / 1000; bf.lastT = time; bf.clock += Math.max(0, Math.min(0.1, dt));
  const was = bf.wk.i; campWalkTick(bf.plan, bf.wk, dt);
  if (bf.wk.i !== was) campWalkMoved(s); else campWalkPaint(s);
}

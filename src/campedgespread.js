// ---------- Campaign: the labels at the screen's edge keep clear of each other (card space-game-edge-labels-overlap; found by flying 1.1: the miner's and the skiffs' labels, ships off the screen on the same side, stood one on the other) ----------
// Pure rule, no Phaser (tests/campedgespread.mjs runs it in Node). Each ship that is off the screen gets an arrow on the border of the screen (campNavEdge, src/campnav.js) and a label behind it (src/campsightscene.js, the goal's in
// src/campaignscene.js). They were each put where they belong with no look at the others, so two ships in the same direction had one arrow and one label on top of the other. This puts them in a line, nearest first: the first keeps
// its place; each next one that would touch an arrow or a label already put is slid ALONG the border, the nearer way first (up or down a side, left or right on the top and bottom), until it touches none, and it points at its ship
// from where it ends. Arrows and labels stay out of the keep rectangles (CAMP.nav.arrow.keep: the corner panels, the message band, the key line) as they did, and on the screen.
//   campEdgeT(x, y, W, H, m)    where a point of the border (inset m px) is along it: 0 to the perimeter, clockwise from the top left
//   campEdgeAt(t, W, H, m)      the point of the border t px along it: { x, y }
//   campEdgeSpread(items, o)    items [{ x, y, angle, tx, ty, w, h, want }] nearest first: the arrow's point on the border, the way it points, where its ship is on the screen (tx, ty: the arrow turns to it from its
//                               new place; none: it keeps its angle) and its label's size (want(px, py, angle) -> { x, y }: where its label would like to be, when it is not the usual place behind the arrow). o { keep, W, H, m, tri, gap, pad, step, boxes }: the keep rectangles, the screen, the border's inset, the arrow's size, the clear space
//                               between an arrow and its label, the space kept round each, the px a slide moves at a time, and rectangles [x0, y0, x1, y1] already taken (the goal's label).
//                               Returns [{ x, y, angle, lx, ly, moved, boxes }] in the same order: the arrow's point, its angle, the label's middle, whether it was slid, and its two rectangles (the arrow's and the label's).
const CAMPEDGE = { tri: 11, gap: 12, pad: 4, step: 6 }; // the arrow's size and the clear space to its label (CAMP_SIGHT's, src/campsightscene.js), the space between two things, and the px a slide moves at a time
function campEdgeT(x, y, W_, H_, m) { // the nearest side of the border: its distance along the border, clockwise from the top left
  const w = W_ - 2 * m, h = H_ - 2 * m, dT = Math.abs(y - m), dR = Math.abs(x - (W_ - m)), dB = Math.abs(y - (H_ - m)), dL = Math.abs(x - m), lo = Math.min(dT, dR, dB, dL);
  const cx = Math.max(m, Math.min(W_ - m, x)), cy = Math.max(m, Math.min(H_ - m, y));
  if (lo === dT) return cx - m;
  if (lo === dR) return w + (cy - m);
  if (lo === dB) return w + h + (W_ - m - cx);
  return 2 * w + h + (H_ - m - cy);
}
function campEdgeAt(t, W_, H_, m) {
  const w = W_ - 2 * m, h = H_ - 2 * m, per = 2 * (w + h); t = ((t % per) + per) % per;
  if (t < w) return { x: m + t, y: m };
  if (t < w + h) return { x: m + w, y: m + t - w };
  if (t < 2 * w + h) return { x: m + w - (t - w - h), y: m + h };
  return { x: m, y: m + h - (t - 2 * w - h) };
}
function campEdgeSpread(items, o) {
  o = o || {}; const W_ = o.W || 1280, H_ = o.H || 720, m = o.m != null ? o.m : 40, K = o.keep || [], tri = o.tri != null ? o.tri : CAMPEDGE.tri, gap = o.gap != null ? o.gap : CAMPEDGE.gap, pad = o.pad != null ? o.pad : CAMPEDGE.pad, step = o.step > 0 ? o.step : CAMPEDGE.step;
  const taken = (o.boxes || []).slice(), out = [], per = 2 * ((W_ - 2 * m) + (H_ - 2 * m));
  const inKeep = (x, y) => K.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
  const meets = (b, r) => b[0] < r[2] + pad && b[2] > r[0] - pad && b[1] < r[3] + pad && b[3] > r[1] - pad;
  const hitsKeep = b => K.some(r => b[0] < r[2] && b[2] > r[0] && b[1] < r[3] && b[3] > r[1]);
  const unit = (it, px, py, ang) => { // the arrow's rectangle and its label's, with the arrow at (px, py) pointing at ang
    const ca = Math.cos(ang), sa = Math.sin(ang), w = it.w || 120, h = it.h || 16, back = tri * 0.8 + gap + Math.abs(ca) * w / 2 + Math.abs(sa) * h / 2, wp = typeof it.want === 'function' ? it.want(px, py, ang) : null, wx = wp ? wp.x : px - ca * back, wy = wp ? wp.y : py - sa * back; // where the label would like to be: back from the arrow by its own half-size along it (or where `want` says: the goal's label has its own rule)
    const lp = typeof campNavLabelAt === 'function' ? campNavLabelAt(wx, wy, w, h, K, W_, H_) : { x: Math.max(w / 2 + 6, Math.min(W_ - w / 2 - 6, wx)), y: Math.max(h / 2 + 6, Math.min(H_ - h / 2 - 6, wy)) };
    return { lx: lp.x, ly: lp.y, a: [px - tri, py - tri, px + tri, py + tri], l: [lp.x - w / 2, lp.y - h / 2, lp.x + w / 2, lp.y + h / 2] };
  };
  items.forEach(it => {
    const t0 = campEdgeT(it.x, it.y, W_, H_, m), turn = (px, py) => it.tx != null && it.ty != null ? Math.atan2(it.ty - py, it.tx - px) : it.angle;
    let pick = null, first = null;
    for (let d = 0; d <= per / 2 && !pick; d += step) {
      for (let s = 0; s < (d ? 2 : 1) && !pick; s++) {
        const p = d ? campEdgeAt(t0 + (s ? -d : d), W_, H_, m) : { x: it.x, y: it.y };
        if (inKeep(p.x, p.y)) continue;
        const ang = d ? turn(p.x, p.y) : it.angle, u = unit(it, p.x, p.y, ang), c = { x: p.x, y: p.y, angle: ang, lx: u.lx, ly: u.ly, moved: d > 0, boxes: [u.a, u.l] };
        if (!first) first = c;
        if (!hitsKeep(u.a) && !hitsKeep(u.l) && !taken.some(r => meets(u.a, r) || meets(u.l, r))) pick = c; // the arrow and its label out of the keep rectangles, and touching nothing put before it
      }
    }
    const c = pick || first || { x: it.x, y: it.y, angle: it.angle, lx: it.x, ly: it.y, moved: false, boxes: [] }; // no room anywhere (a screen full of things): where it was
    c.boxes.forEach(b => taken.push(b)); out.push(c);
  });
  return out;
}

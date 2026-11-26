// ---------- Campaign: stations in the world look, and the docking mark (card space-game-world-w3-stations; piece W3 of the world look; Troy approved it on 25 Nov 2026; the mock is docs/world-look-mock.html, direction 1) ----------
// With the world look on (campWorldOn, src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0 for today's) a station beside a place that has a `base` (the Occator Works at Ceres, the Lunar base) is flat-cut steel, the ships' own recipe:
// a ring with four spokes and a hub (the Works), or a low hexagon with a facet (a base on a moon), steel #8fa3b5 with a darker facet #4c5d70 and, for the ring, the thin dark rim. A place says which with its `station` field
// ('ring' or 'hex', default ring: CAMP.places.luna is 'hex'). Today's picture is Long Haul's own station art (src/stationart.js, texture `station`, glow and cables); that is not read or changed. The names stay as they are: a canvas label,
// or the page pill with the page HUD on.
// The DOCKING MARK: a dashed gold ring round a station, only while docking there is the goal. The rule: the first objective of the mission that is not done yet is a `cashin` (sell ore at a market outpost, mission 1.2); the rings stand round
// the stations of the level's market outposts (campOutposts, `market`) that the scene has drawn (a far place only within CAMP.world.draw). Gold is the colour of a goal (the HUD's: the mock's #e9b872); a dashed ring is a thing not yet done.
// It is drawn as short polylines (src/campcircles.js's way, not Phaser's arc), twelve dashes a ring, only while it is wanted. Pure rule: campDockMarks(C) says where; the scene's one call is campDockMarkSync(scene), each frame.
//   campStationKind(p)             'ring' or 'hex' (a place's `station`, else ring)
//   campStationPaint(ctx, S, kind) paints it on a 2D context of S by S;   campStationTexture(sc, p)  { key, R }: the canvas texture (made once) and the radius of the shape in it: the image is scaled CAMPSTATION.world / R
//   campDockMarks(C)               [{ id, x, y, r }] the rings wanted now (world px), or []
//   campDockMarkDraw(g, marks, zoom) draws them on a cleared Graphics;   campDockMarkSync(scene)  makes the Graphics once, clears or draws it
const CAMPSTATION = {
  size: 256, R: 110,                          // px: a station's canvas, and the radius of its shape in it
  world: 32,                                  // world px: the station's radius on the screen scale of the world (the old picture's ring was about 28 to 35): a station is as wide as it was
  off: { x: 70, y: -60 },                     // world px: where it stands from its place (src/campaignscene.js drawPlace: it always did)
  steel: '#8fa3b5', facet: '#4c5d70', rim: 'rgba(5,8,14,.9)', rimK: 0.03,
  ring: { inner: 0.72, spoke: { from: 0.18, len: 0.56, w: 0.12 }, hub: 0.22 },  // the mock's ring: the annulus from 0.72 to 1 of the radius, four spokes, a hub
  hex: [[0.9, 0], [0.45, 0.5], [-0.45, 0.5], [-0.9, 0], [-0.45, -0.5], [0.45, -0.5]], hexFacet: [[0.4, 0], [0.2, 0.24], [-0.2, 0.24], [-0.4, 0], [-0.2, -0.24], [0.2, -0.24]], // the mock's low hexagon and its facet, shares of the radius
  dock: { color: 0xe9b872, alpha: 0.95, k: 1.5, dashes: 12, fill: 0.64, w: 1.6, wMax: 12, steps: 4 } // the ring: 1.5 times the station's radius, twelve dashes of 0.64 of their share, 1.6 px on the screen (wider in world px as the view zooms out, at most wMax)
};

const campStationKind = p => (p && p.station === 'hex' ? 'hex' : 'ring');

function campStationPaint(ctx, S, kind) {
  const K = CAMPSTATION, R = K.R, poly = (pts, fill) => { ctx.beginPath(); pts.forEach((q, i) => ctx[i ? 'lineTo' : 'moveTo'](q[0] * R, q[1] * R)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  ctx.save(); ctx.translate(S / 2, S / 2);
  if (kind === 'hex') { poly(K.hex, K.steel); poly(K.hexFacet, K.facet); }
  else {
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.arc(0, 0, R * K.ring.inner, 0, 7, true); ctx.fillStyle = K.steel; ctx.fill('evenodd'); // the ring
    ctx.fillStyle = K.facet; for (let j = 0; j < 4; j++) { ctx.rotate(Math.PI / 2); ctx.fillRect(R * K.ring.spoke.from, -R * K.ring.spoke.w / 2, R * K.ring.spoke.len, R * K.ring.spoke.w); } // four spokes
    ctx.beginPath(); ctx.arc(0, 0, R * K.ring.hub, 0, 7); ctx.fillStyle = K.steel; ctx.fill(); // the hub
    ctx.lineWidth = Math.max(1, R * K.rimK); ctx.strokeStyle = K.rim; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); // the thin dark rim
  }
  ctx.restore();
}

function campStationTexture(sc, p) {
  const kind = campStationKind(p), key = 'cstation-' + kind;
  if (!sc.textures.exists(key)) { const S = CAMPSTATION.size, tex = sc.textures.createCanvas(key, S, S); campStationPaint(tex.getContext(), S, kind); tex.refresh(); }
  return { key, R: CAMPSTATION.R };
}

// the rings wanted now: the first objective not done is a cashin, round the station of each market outpost the scene has drawn
function campDockMarks(C) {
  if (!C || C.result || C.docked || !C.L || !C.L.objectives || !C.carrier || typeof campObjectives !== 'function' || typeof campOutposts !== 'function') return [];
  const o = campObjectives(C).find(x => !x.done); if (!o || o.type !== 'cashin') return [];
  const K = CAMPSTATION, pl = campPlaces(C.level), out = [];
  campOutposts(C.level).forEach(op => {
    const p = pl[op.id]; if (!op.market || !p || !p.base) return;
    if (p.far && Math.hypot(p.x - C.carrier.x, p.y - C.carrier.y) - (p.r || 60) >= CAMP.world.draw) return; // a far body is drawn only within CAMP.world.draw (Campaign.syncFar)
    out.push({ id: op.id, x: p.x + K.off.x, y: p.y + K.off.y, r: K.world * K.dock.k });
  });
  return out;
}

function campDockMarkDraw(g, marks, zoom) {
  const D = CAMPSTATION.dock; g.clear(); if (!marks.length) return;
  g.lineStyle(Math.min(D.wMax, D.w / (zoom > 0 ? zoom : 1)), D.color, D.alpha);
  marks.forEach(m => { for (let i = 0; i < D.dashes; i++) { const a0 = i / D.dashes * 2 * Math.PI, span = 2 * Math.PI / D.dashes * D.fill, pts = []; for (let k = 0; k <= D.steps; k++) { const a = a0 + span * k / D.steps; pts.push({ x: m.x + Math.cos(a) * m.r, y: m.y + Math.sin(a) * m.r }); } g.strokePoints(pts, false, false); } });
}

function campDockMarkSync(s) {
  const marks = typeof campWorldOn === 'function' && campWorldOn() && s && s.camp ? campDockMarks(s.camp) : [];
  if (!marks.length) { if (s && s.dockG) s.dockG.clear(); return; }
  if (!s.dockG) s.dockG = s.add.graphics().setDepth(2.2);
  campDockMarkDraw(s.dockG, marks, s.cameras && s.cameras.main ? s.cameras.main.zoom : 1);
}

// ---------- The scene half of the far view (card space-game-zoom-fit-mission; the rules are src/campzoom.js) ----------
// Zoomed out to where a long mission's route fits (CAMPZOOM.view, down to 0.02), a place is a few pixels across and its name, scaled back up as far as it goes, is a speck: under CAMPZOOM.view.markZ the places and the
// escorted ships are drawn as MARKS on the screen instead: a small ring and the name beside it, as large as the HUD's own small lines, at the place the thing is on the screen (campZoomMarks says which). The place the HUD's goal is
// at is amber and the ships are cyan. A mark that is off the screen is not drawn (the goal's arrow at the edge is the HUD's, src/campnav.js); the marks sit under the HUD's plates and lines.
// The scene (src/campaignscene.js) calls campFarSync(scene) every frame. Nothing here decides anything; the graphics and the texts are kept in scene.hud (a scene that starts again has a new one: the old are destroyed with it).
const CAMP_FAR = {
  ring: 6, width: 1.5, font: 12, gap: 8,                      // the goal's ring (px: its radius is the least of a world, CAMPZOOM.view.worldLeast, plus 4) and line, the name's size and its distance from the mark
  face: 'system-ui, -apple-system, "Segoe UI", sans-serif',   // the names are in the page's own typeface (they were the canvas's typewriter font: card space-game-far-zoom-ugly)
  color: { place: 0x9fbdd1, goal: 0xffd37a, convoy: 0x7fe9ff }, // the ring and the diamond; the name is the same colour as text
  text: { place: '#b9c8de', goal: '#ffd37a', convoy: '#7fe9ff' },
  edge: 12, keep: 40                                          // a mark closer than this to the sides and to the top (edge), and to the bottom (keep: the key line's strip), is not drawn
};
// where a mark's name goes (pure): the first of right, left, below and above the mark (rr px clear of its middle, plus gap) where a w by h name touches no ship (obst: circles { x, y, r } on the screen) and no name already put (taken: boxes { x, y, w, h }: top left and size), else the first; { x, y, ox, oy } is the text's place and its origin
function campFarSpot(sx, sy, rr, w, h, gap, obst, taken) {
  const c = [{ x: sx + rr + gap, y: sy, ox: 0, oy: 0.5 }, { x: sx - rr - gap, y: sy, ox: 1, oy: 0.5 }, { x: sx, y: sy + rr + gap, ox: 0.5, oy: 0 }, { x: sx, y: sy - rr - gap, ox: 0.5, oy: 1 }];
  const box = k => ({ x: k.x - k.ox * w, y: k.y - k.oy * h, w, h });
  const hitShip = b => (obst || []).some(o => Math.pow(Math.max(b.x - o.x, 0, o.x - (b.x + b.w)), 2) + Math.pow(Math.max(b.y - o.y, 0, o.y - (b.y + b.h)), 2) < o.r * o.r);
  const hitName = b => (taken || []).some(q => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
  return c.find(k => { const b = box(k); return !hitShip(b) && !hitName(b); }) || c[0];
}
function campFarSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP_FAR; if (!C || !scene.hud || !cam || typeof campZoomMarks !== 'function') return;
  if (!scene.hud.far) scene.hud.far = { g: scene.add.graphics().setScrollFactor(0).setDepth(60), t: [] }; // kept in scene.hud: its objects are destroyed with a scene that ends
  const V = scene.hud.far, g = V.g, z = cam.zoom > 0 ? cam.zoom : 1; g.clear();
  const marks = z < CAMPZOOM.view.markZ && scene.mode === 'play' && !scene.mp ? campZoomMarks(C) : [];
  const least = CAMPZOOM.view.worldLeast || 0, obst = [], taken = [], pic = {}; let n = 0;
  (scene.placeSets || []).forEach(e => { if (e && e.im && e.im.active !== false && e.p) pic[Math.round(e.p.x) + ',' + Math.round(e.p.y)] = 1; }); // the worlds that have a picture on the scene now (a far body has one only while the cruiser is near it, src/campaignscene.js syncFar)
  if (marks.length) Object.keys(scene.sp || {}).forEach(id => { const sp = scene.sp[id]; if (!sp || sp.visible === false || !(sp.displayWidth > 0)) return; obst.push({ x: (sp.x - cam.scrollX - W / 2) * z + W / 2, y: (sp.y - cam.scrollY - H / 2) * z + H / 2, r: Math.max(sp.displayWidth, sp.displayHeight || 0) * z * 0.55 }); }); // the ships' signs: a name keeps clear of them
  marks.forEach(m => {
    const sx = (m.x - cam.scrollX - W / 2) * z + W / 2, sy = (m.y - cam.scrollY - H / 2) * z + H / 2, kind = m.goal ? 'goal' : m.kind;
    if (sx < K.edge || sx > W - K.edge || sy < K.edge || sy > H - K.keep) return;
    const rr = m.kind === 'convoy' ? K.ring : least + 4; // a world is its own disc (drawn up to its least size): its name stands clear of it; the goal has a ring round it; a convoy ship its diamond
    if (m.kind === 'convoy') g.lineStyle(K.width, K.color.convoy, 0.95).strokePoints([{ x: sx, y: sy - K.ring }, { x: sx + K.ring, y: sy }, { x: sx, y: sy + K.ring }, { x: sx - K.ring, y: sy }], true);
    else if (kind === 'goal') g.lineStyle(K.width, K.color.goal, 0.95).strokeCircle(sx, sy, rr);
    if (m.kind === 'place' && !pic[Math.round(m.x) + ',' + Math.round(m.y)]) g.fillStyle(K.color.place, 0.85).fillCircle(sx, sy, least); // a world far from the cruiser has no picture to draw up: its mark is a flat disc of the least size, so a name is never alone
    let t = V.t[n]; if (!t) { t = V.t[n] = scene.add.text(0, 0, '', { fontFamily: K.face, fontSize: K.font + 'px', fontStyle: '600', color: '#ffffff', stroke: '#02060d', strokeThickness: 3 }).setScrollFactor(0).setDepth(61); }
    t.setColor(K.text[kind]); if (t.text !== m.name) t.setText(m.name);
    const at = campFarSpot(sx, sy, rr, t.width || 0, t.height || 0, K.gap, obst, taken); t.setOrigin(at.ox, at.oy).setPosition(at.x, at.y).setVisible(true); taken.push({ x: at.x - at.ox * (t.width || 0), y: at.y - at.oy * (t.height || 0), w: t.width || 0, h: t.height || 0 }); n++;
  });
  for (let i = n; i < V.t.length; i++) V.t[i].setVisible(false);
}

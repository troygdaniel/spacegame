// ---------- The scene half of the far view (card space-game-zoom-fit-mission; the rules are src/campzoom.js) ----------
// Zoomed out to where a long mission's route fits (CAMPZOOM.view, down to 0.02), a place is a few pixels across and its name, scaled back up as far as it goes, is a speck: under CAMPZOOM.view.markZ the places and the
// escorted ships are drawn as MARKS on the screen instead: a small ring and the name beside it, as large as the HUD's own small lines, at the place the thing is on the screen (campZoomMarks says which). The place the HUD's goal is
// at is amber and the ships are cyan. A mark that is off the screen is not drawn (the goal's arrow at the edge is the HUD's, src/campnav.js); the marks sit under the HUD's plates and lines.
// The scene (src/campaignscene.js) calls campFarSync(scene) every frame. Nothing here decides anything; the graphics and the texts are kept in scene.hud (a scene that starts again has a new one: the old are destroyed with it).
const CAMP_FAR = {
  ring: 6, width: 1.5, font: 12, gap: 10,                     // the ring's radius and line (px), the name's size and its distance from the mark
  color: { place: 0x9fbdd1, goal: 0xffd37a, convoy: 0x7fe9ff }, // the ring and the diamond; the name is the same colour as text
  text: { place: '#9fbdd1', goal: '#ffd37a', convoy: '#7fe9ff' },
  edge: 12, keep: 40                                          // a mark closer than this to the sides and to the top (edge), and to the bottom (keep: the key line's strip), is not drawn
};
function campFarSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP_FAR; if (!C || !scene.hud || !cam || typeof campZoomMarks !== 'function') return;
  if (!scene.hud.far) scene.hud.far = { g: scene.add.graphics().setScrollFactor(0).setDepth(60), t: [] }; // kept in scene.hud: its objects are destroyed with a scene that ends
  const V = scene.hud.far, g = V.g, z = cam.zoom > 0 ? cam.zoom : 1; g.clear();
  const marks = z < CAMPZOOM.view.markZ && scene.mode === 'play' && !scene.mp ? campZoomMarks(C) : [];
  let n = 0;
  marks.forEach(m => {
    const sx = (m.x - cam.scrollX - W / 2) * z + W / 2, sy = (m.y - cam.scrollY - H / 2) * z + H / 2, kind = m.goal ? 'goal' : m.kind;
    if (sx < K.edge || sx > W - K.edge || sy < K.edge || sy > H - K.keep) return;
    if (m.kind === 'convoy') g.lineStyle(K.width, K.color.convoy, 0.95).strokePoints([{ x: sx, y: sy - K.ring }, { x: sx + K.ring, y: sy }, { x: sx, y: sy + K.ring }, { x: sx - K.ring, y: sy }], true);
    else g.lineStyle(K.width, K.color[kind], 0.95).strokeCircle(sx, sy, K.ring);
    let t = V.t[n]; if (!t) { t = V.t[n] = scene.add.text(0, 0, '', uiFont(K.font, '#ffffff', { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(61); }
    t.setColor(K.text[kind]); if (t.text !== m.name) t.setText(m.name);
    t.setPosition(sx + K.gap, sy).setVisible(true); n++;
  });
  for (let i = n; i < V.t.length; i++) V.t[i].setVisible(false);
}

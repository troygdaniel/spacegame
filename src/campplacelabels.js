// ---------- Campaign: where the two labels of a place stand (card space-game-12-place-labels-overlap, 9-GEN's browser batch on main 7bd0dda2: at the start of 1.2, page HUD off, CERES and OCCATOR WORKS were drawn one on the other) ----------
// A place with an outpost (Ceres and its Occator Works, Luna and its Lunar base) has two world labels: the place's name (amber, 16 px) over the planet, and the outpost's (cyan, 13 px) over the station beside it (drawPlace in src/campaignscene.js).
// The camera's zoom (src/camzoom.js camzoomLabelScale) draws every world label 1/zoom times its size when it is zoomed out (up to CAMPZOOM.view.labelMax, 6, in the Campaign: the labels keep their size ON THE SCREEN), but the places of the
// labels did not move: at the start zoom (0.335, label scale about 3) a pair that stood 26 px apart in the world, drawn three times as big, was drawn over each other.
// So the pair is placed with the label scale `ls` in the rule below; at scale 1 (the camera at zoom 1 or in) the labels stand where they always stood (the place's own name over the planet at r + 36, the outpost's 40 above the station: Ceres 126 and 100
// above its centre, Luna 81 and 100; a pair that was clear stays clear), and under it the name keeps its place and the outpost's label goes to the nearest place that is clear of it (below it for a big planet, above it for a small one: the order they had).
//   campPlaceLabelAt(r, ls, withBase)   PURE: { name: { x, y }, base: { x, y } | null }, as offsets from the centre of the place, in world px; r the planet's radius, ls the labels' scale (1 and up), withBase: the place has an outpost
//   campPlaceLabelsFit(scene)           puts each pair of the scene (scene.placeSets, made by drawPlace) where the rule says for the scale the zoom gave its labels; only a label that is not where it should be is moved
//   campPlaceLabelsInstall(scene)       the scene calls it once, after camzoomSetup: the fit runs on the scene's postupdate event, after the zoom has scaled the labels (a place drawn later, a far one, is fitted the frame it comes)
// Page HUD on: the labels are hidden (src/camppagehud.js) and its pill says the place and its outpost in one: nothing here changes that; the fit is the same and nothing is seen of it.
const CAMP_PLACELAB = {
  name: 36,    // px above the planet's edge (r + 36) at scale 1: the name label's centre
  station: 60, // px above the place's centre: the station beside it (at x + 70) is drawn there
  base: 40,    // px above the station: the outpost label's centre at scale 1 (100 above the centre)
  baseX: 70,   // px right of the place's centre: the station's and the outpost label's x
  line: 20     // px between the two labels' centres at scale 1 (16 px and 13 px text: their halves are 10 and 8) that the pair keeps at least, in every scale
};
function campPlaceLabelAt(r, ls, withBase) {
  const K = CAMP_PLACELAB, s = ls >= 1 ? ls : 1, radius = r > 0 ? r : 60, nameY = -(radius + K.name * s), at = { name: { x: 0, y: nameY }, base: null };
  if (!withBase) return at;
  const own = -(K.station + K.base * s), need = K.line * s; // the outpost label's own place (over the station), and how far from the name it must be
  let y = own;
  if (Math.abs(own - nameY) < need) y = radius + K.name >= K.station + K.base ? nameY + need : nameY - need; // a big planet's name is the upper one (Ceres): the outpost goes under it; a small one's is the lower (Luna): the outpost stays over it
  at.base = { x: K.baseX, y };
  return at;
}
function campPlaceLabelsFit(scene) {
  const sets = scene && scene.placeSets; if (!sets || !sets.length) return;
  for (let i = sets.length - 1; i >= 0; i--) if (!sets[i].nm || sets[i].nm.active === false) sets.splice(i, 1); // a far place that was taken down
  sets.forEach(S => {
    const ls = S.nm.scaleX > 1 ? S.nm.scaleX : 1, at = campPlaceLabelAt(S.p.r, ls, !!S.pb), put = (o, v) => { if (o && typeof o.setPosition === 'function' && (o.x !== S.p.x + v.x || o.y !== S.p.y + v.y)) o.setPosition(S.p.x + v.x, S.p.y + v.y); };
    put(S.nm, at.name); if (S.pb && at.base) put(S.pb, at.base);
  });
}
function campPlaceLabelsInstall(scene) {
  if (!scene || !scene.events || typeof scene.events.on !== 'function') return;
  const frame = () => campPlaceLabelsFit(scene);
  scene.events.on('postupdate', frame);
  scene.events.once('shutdown', () => { scene.events.off('postupdate', frame); });
}

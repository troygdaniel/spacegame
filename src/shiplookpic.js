// ---------- The new ship look, the target panel's picture and the briefing's pictures (landing E of the ship look; card space-game-ship-look-e-panel-brief) ----------
// Troy, 25 Nov 2026 (decision 8 of the report on card space-game-ship-look-scope: "the HUD's target panel and the briefing use the new shapes in place of today's pictures"; read as the flat-cut outlines, not the signal shapes,
// which at panel size would not tell the kinds apart): with the switch on (slookOn(): CAMP.flags.shiplook, the N panel's row, ?shiplook=) the picture of a ship in the details of [ ] HOSTILES and O P FRIENDLIES
// (src/camptcornerscene.js) and the ships in the pictures of the briefing's goals and bonus (src/campbriefdraw.js) are the SAME textures the ships in the flight view have (src/shiplookdraw.js: look-<kind>-<side>, made once, one
// function for all of them), so a ship is the same ship in the world, in its panel and in its briefing. Today's pictures are used when the switch is off, for a thing that is not a ship (a pod, a rock, ore), and for a kind the look
// table has no row for. The side's colour is baked in, so no tint is put on them (today's squad colour and tints are for today's pictures). Nothing here decides anything.
//   slookPic(scene, kind, u, F)   the new picture of a kind for a panel or a briefing: { key, scale, side } (the texture key; the scale that makes its hull as long as the ship is drawn in the battle; the side it is drawn as) or null for today's.
//                                 u: the ship, when there is one (its side is from the sim, and a ship you protect is amber); none: the kind's usual side (src/shiplook.js slookKindSide). F: the switch asked once for the pass (slookFrame); none: asked now.
//   slookPicSvg(kind, side)       the same picture as markup for the page HUD's panels, which are page elements and have no Phaser (card space-game-page-hud-target-picture): an inline <svg> of the kind's outline, its thin dark rim and its facet, nose UP, in a square box, from the same table the textures are baked from
//                                 (slookPolygon and slookFacetPolygon, slookColor and slookFacet: src/shiplook.js), so it is the same ship; '' for a kind that is not in the table. No image, no web.
function slookPicSvg(kind, side) {
  const k = typeof SLOOK === 'object' && SLOOK ? SLOOK.K[kind] : null; if (!k) return '';
  side = side || slookKindSide(kind);
  const pts = flat => { const o = []; for (let i = 0; i < flat.length; i += 2) o.push(Math.round(flat[i] * 1000) / 1000 + ',' + Math.round(flat[i + 1] * 1000) / 1000); return o.join(' '); };
  return '<svg class="ph-pic" viewBox="-0.58 -0.58 1.16 1.16" aria-hidden="true"><g transform="rotate(-90)">'
    + '<polygon points="' + pts(slookPolygon(kind, 1, 8)) + '" fill="' + slookColor(side) + '" stroke="' + SLOOK.rim.color + '" stroke-width="' + SLOOK.rim.k + '" stroke-linejoin="round"/>'
    + '<polygon points="' + pts(slookFacetPolygon(kind, 1, 8)) + '" fill="' + slookFacet(side, !!k.hot) + '"/></g></svg>';
}
function slookPic(scene, kind, u, F) {
  if (typeof slookOn !== 'function' || typeof slookTexture !== 'function' || !SLOOK.K[kind]) return null;
  F = F || (scene && scene.camp && typeof slookFrame === 'function' ? slookFrame(scene) : { on: slookOn(), prot: null });
  if (!F.on) return null;
  const side = u && F.prot ? slookSide(u, F.prot.has(u.id)) : slookKindSide(kind), key = slookTexture(scene, kind, side);
  return key ? { key, scale: slookScale(kind), side } : null;
}

// ---------- The Campaign's ranks: promotion as you progress, a bigger wing at each (card space-game-campaign-ranks, docs/CAMPAIGN.md "Ranks") ----------
// The ranks are data: CAMP.ranks in src/campaign.js (an id, the points it is held from, the extra fighters it gives). The points are the best scores of the
// missions flown, added up (P.results of the missions card: each result keeps its best score, and a score already counts the objectives, the bonus objectives, the hull and the
// time). Nothing is saved for the rank: it is read from the results, so a mission flown again for a better score can only raise it.
//   campPoints(P)            the points: the sum of the best scores
//   campRankAt(points)       the index of the rank held at that many points
//   campRank(P)              { i, id, name, points, at, fighters }: the rank of the pilot
//   campRankStatus(P)        what the hub (the ready room) shows: { name, n, of, points, next (the points of the next rank, or null at the top), nextName, wing: { fighters } }
//   campRankPromoted(was, P) { from, to } when the rank has gone up since `was` (an index), else null
//   campRankLine(P, sc)      the line of the debrief (the missions card's hook): the promotion, with the wing it brings, or the rank and what the next one needs
// The effect is in campNew (src/campaign.js): opts.rank is the index; its extras fill the bay and lift the wing limit.
function campPoints(P) { let n = 0; Object.keys((P && P.results) || {}).forEach(k => { const r = P.results[k]; if (r && Number.isFinite(r.score)) n += Math.max(0, r.score); }); return n; }
function campRankAt(points) { let at = 0; CAMP.ranks.forEach((r, i) => { if (points >= r.at) at = i; }); return at; }
function campRank(P) {
  const points = campPoints(P), i = campRankAt(points), r = CAMP.ranks[i];
  return { i, id: r.id, name: uiText('camp.rank.' + r.id), points, at: r.at, fighters: r.fighters };
}
// the wing a pilot of this state would fly the next mission with, as strength in fighters' worth (three pilots fly it: card space-game-three-pilots, CAMP.pilotStrength): the wing, the second bay tech, the extras of the refit, and the rank's
function campRankWing(P) {
  const r = CAMP.ranks[campRank(P).i], b = (P && P.bonus) || {}, techs = (P && P.techs) || [];
  return { fighters: CAMP.pilotStrength + (techs.indexOf('bay2') >= 0 ? CAMP.tech.bay2.fighters : 0) + (b.fighters | 0) + r.fighters };
}
function campRankStatus(P) {
  const k = campRank(P), nx = CAMP.ranks[k.i + 1] || null;
  return { name: k.name, n: k.i + 1, of: CAMP.ranks.length, points: k.points, next: nx ? nx.at : null, nextName: nx ? uiText('camp.rank.' + nx.id) : '', wing: campRankWing(P) };
}
function campRankPromoted(was, P) { const now = campRank(P).i; return now > (was | 0) ? { from: was | 0, to: now } : null; }
const campNum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function campRankLine(P, sc) {
  const s = campRankStatus(P);
  if (P && P.promo) { // set by the scene when this mission's score took the pilot up (and cleared when the next mission begins)
    const r = CAMP.ranks[P.promo.to], flavour = uiText('camp.rank.' + r.id + '.promo');
    return uiText('camp.ui.promoted', { name: s.name, fighters: s.wing.fighters }) + (/^camp\./.test(flavour) ? '' : '\n' + flavour);
  }
  return s.next === null ? uiText('camp.ui.ranktop', { name: s.name, points: campNum(s.points) }) : uiText('camp.ui.rank', { name: s.name, points: campNum(s.points), next: s.nextName, at: campNum(s.next) });
}

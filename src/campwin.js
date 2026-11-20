// ---------- Campaign: the result line of the win card (card space-game-night-ux, finding 8; docs/night/ux.md) ----------
// The win card was the two story lines and "Enter continue". Time, the carrier's hull left, the convoys that arrived and the ships lost are what a player has earned and what Troy tunes
// with. campWinLine(C) is one plain line of them, pure (the battle in, a line out); a level with no convoys (2 and 3) leaves them out.
//   campWinLine(C) -> "Won in 3:12. Carrier hull 420 of 600, 2 of 2 convoys delivered, 1 ship lost."      src/campaignscene.js showWon shows it under the story and does not say it aloud
function campWinLine(C) {
  try {
    const L = CAMP.levels[C.level], t = Math.max(0, Math.round(C.t / 1000)), time = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    const vars = { time, hull: Math.round(C.carrier.hp), max: Math.round(C.carrier.maxHp), delivered: C.delivered, convoys: (L.convoys || []).length, lost: C.lostShips };
    return uiText((L.convoys || []).length ? 'camp.win.resultconv' : 'camp.win.result', vars);
  } catch (e) { return ''; }
}
